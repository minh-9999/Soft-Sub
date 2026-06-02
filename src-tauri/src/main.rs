#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;
use softsub_tauri::{
    command_available, find_project_tool, normalize_target_language, normalize_whisper_language,
    whisperx_model_name,
};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
// use tokio::process::Command;

#[derive(Deserialize)]
pub struct RunArgs {
    video_path: String,
    out_dir: String,
    model_path: Option<String>,
    language: Option<String>,
    target_language: Option<String>,
    translate: bool,
}

fn resolve_python() -> Option<String> {
    for cmd in ["python", "py", "python3"] {
        let ok = Command::new(cmd)
            .arg("-c")
            .arg("import sys")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ok {
            return Some(cmd.to_string());
        }
    }
    None
}

#[tauri::command]
async fn run_pipeline(app_handle: tauri::AppHandle, args: RunArgs) -> Result<(), String> {
    let video = PathBuf::from(&args.video_path);
    let out_dir = PathBuf::from(&args.out_dir);

    if !video.exists() {
        return Err("Video file does not exist".into());
    }
    std::fs::create_dir_all(&out_dir).map_err(|e| format!("Cannot create out dir: {}", e))?;

    // helper to run a command and stream logs
    let run_and_stream = |cmd: &mut Command, step_name: &str| -> Result<(), String> {
        let mut child = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn {}: {}", step_name, e))?;

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let name1 = step_name.to_string();
        let name2 = step_name.to_string();

        let app1 = app_handle.clone();
        let h1 = std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                // Emit stdout lines with [OUT] label
                let _ = app1.emit("pipeline-log", format!("[{}][OUT] {}", name1, line));
            }
        });

        let app2 = app_handle.clone();
        let h2 = std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                // transform line to lowercase for easier keyword searching
                let lower_line = line.to_lowercase();

                // simple keyword-based log level detection
                let log_label = if lower_line.contains("error")
                    || lower_line.contains("failed")
                    || lower_line.contains("panic")
                    || lower_line.contains("fatal")
                    || lower_line.contains("invalid")
                {
                    "ERR" // Error log, highlight in red
                } else {
                    "OUT" // Regular output log
                };

                // Emit the log with the detected label
                let _ = app2.emit(
                    "pipeline-log",
                    format!("[{}][{}] {}", name2, log_label, line),
                );
            }
        });

        let status = child
            .wait()
            .map_err(|e| format!("Wait error {}: {}", step_name, e))?;
        let _ = h1.join();
        let _ = h2.join();

        if !status.success() {
            return Err(format!(
                "{} failed with code {:?}",
                step_name,
                status.code()
            ));
        }
        Ok(())
    };

    // Handle non-ASCII paths by copying to a temp location with ASCII path
    let safe_video_path = if args.video_path.is_ascii() {
        args.video_path.clone()
    } else {
        let ext = PathBuf::from(&args.video_path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("mp4")
            .to_string();
        let temp = out_dir.join(format!("input_video.{}", ext));
        std::fs::copy(&args.video_path, &temp).map_err(|e| format!("Cannot copy video: {}", e))?;
        temp.to_string_lossy().to_string()
    };

    // Step 1: extract audio with ffmpeg
    let audio_path = out_dir.join("audio.wav");
    let audio_path_str = audio_path.to_string_lossy();
    let mut cmd1 = Command::new("ffmpeg");
    cmd1.args(&[
        "-loglevel",    // reduce ffmpeg log verbosity
        "repeat+error", // only show repeated lines and errors
        "-y",
        "-i",
        // &args.video_path,
        &safe_video_path,
        "-ac",
        "1",
        "-ar",
        "16000", // whisper.cpp needs 16kHz audio
        "-vn",
        // audio_path.to_str().unwrap(),
        &audio_path_str,
    ]);
    app_handle
        .emit("pipeline-log", "Starting audio extraction")
        .ok();
    run_and_stream(&mut cmd1, "ffmpeg")?;

    // Step 2: run whisper.cpp
    let exe_dir = std::env::current_exe()
        .map_err(|e| format!("Cannot get exe: {}", e))?
        .parent()
        .ok_or("Cannot get exe dir")?
        .to_path_buf();

    let whisper_dir = exe_dir.join("whisper.cpp");
    let whisper_bin = whisper_dir.join("whisper-cli.exe");
    let model_path = args
        .model_path
        .as_deref()
        .filter(|path| !path.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| whisper_dir.join("models").join("ggml-small.bin"));
    let model_path = if model_path.is_absolute() {
        model_path
    } else {
        whisper_dir.join(model_path)
    };

    if !whisper_bin.exists() {
        return Err(format!("whisper-cli not found at {:?}", whisper_bin));
    }

    // build safe strings
    let model_str = model_path.to_string_lossy().to_string();
    let audio_str = audio_path.to_string_lossy().to_string();
    let out_base = out_dir.join("output"); // note: no .txt/.srt extension for -of
    let out_base_str = out_base.to_string_lossy().to_string();

    if !model_path.exists() {
        return Err(format!("Whisper model not found at {}", model_str));
    }

    // validate languages
    let language = normalize_whisper_language(args.language.as_deref())?;
    let target_lang = if args.translate {
        normalize_target_language(args.target_language.as_deref())?
    } else {
        String::new()
    };
    let need_post_translate = args.translate && target_lang != "en";

    // Determine number of threads for whisper.cpp: use all cores minus 2, but at least 1
    let total_cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    let whisper_threads = if total_cores > 2 { total_cores - 2 } else { 1 };
    let threads_str = whisper_threads.to_string();

    let mut cmd2 = Command::new(&whisper_bin);
    cmd2.args([
        "-m",
        // &model,
        &model_str,
        "-f",
        // audio_path.to_str().unwrap(),
        &audio_str,
        // "-l",
        // "auto", // &language,
        // "-otxt",
        // "-osrt",
        // "-of",
        // &out_base_str, // use -of (or --output-file) and pass base name without extension
        // "--no-gpu",
        // "--device",
        // "0",
        "-t", // limit threads for better UI responsiveness, since whisper.cpp can be very CPU intensive
        &threads_str,
    ]);

    cmd2.args(["-l", &language]);

    if args.translate {
        // whisper.cpp --translate only outputs English. For other targets we transcribe/translate
        // to English first, then run tools/translate_srt.py (en -> target).
        if language == "en" {
            // English audio: transcribe as English (no --translate flag).
        } else {
            cmd2.arg("--translate");
        }

        if need_post_translate {
            app_handle
                .emit(
                    "pipeline-log",
                    format!(
                        "[pipeline][OUT] Target language '{}': whisper.cpp produces English, \
                         then subtitle text is translated to '{}'.",
                        target_lang, target_lang
                    ),
                )
                .ok();
        }
    }

    // -osrt writes SRT with millisecond precision (HH:MM:SS,mmm). Do not pass -nt/--no-timestamps.
    // whisper-cli has no --output-timestamps flag; word-level refinement is done by whisperx (step 3).
    cmd2.args(["-otxt", "-osrt", "-of", &out_base_str]);

    app_handle
        .emit(
            "pipeline-log",
            format!("Starting ASR (whisper.cpp, language: {})", language),
        )
        .ok();
    run_and_stream(&mut cmd2, "whisper")?;

    let srt_path = out_dir.join("output.srt");
    if !srt_path.exists() {
        return Err(format!(
            "The Whisper is not producing output.srt at {:?}. \
            Check again: Is the audio valid? Is the model path correct?",
            srt_path
        ));
    }
    let srt_size = std::fs::metadata(&srt_path).map(|m| m.len()).unwrap_or(0);
    if srt_size == 0 {
        return Err(
            "The Whisper creates output.srt, but the file is empty (0 bytes).
                    The audio may be muted, too short, or incorrectly formatted."
                .to_string(),
        );
    }
    app_handle
        .emit(
            "pipeline-log",
            format!("[whisper][OUT] output.srt OK ({} bytes)", srt_size),
        )
        .ok();

    if need_post_translate {
        let script = find_project_tool(&exe_dir, "translate_srt.py").ok_or_else(|| {
            "translate_srt.py not found. Expected tools/translate_srt.py next to the app.".to_string()
        })?;
        let python = resolve_python().ok_or_else(|| {
            "Python is required for non-English translation targets. \
             Install Python and run: pip install -r tools/requirements-translate.txt"
                .to_string()
        })?;
        let script_str = script.to_string_lossy().to_string();
        let srt_str = srt_path.to_string_lossy().to_string();

        app_handle
            .emit(
                "pipeline-log",
                format!(
                    "Starting subtitle translation (en → {})",
                    target_lang
                ),
            )
            .ok();

        let mut cmd_translate = Command::new(&python);
        cmd_translate.args([
            &script_str,
            &srt_str,
            "--source",
            "en",
            "--target",
            &target_lang,
        ]);
        run_and_stream(&mut cmd_translate, "translate")?;

        let translated_size = std::fs::metadata(&srt_path).map(|m| m.len()).unwrap_or(0);
        app_handle
            .emit(
                "pipeline-log",
                format!(
                    "[translate][OUT] output.srt updated ({} bytes)",
                    translated_size
                ),
            )
            .ok();
    }

    // Step 3: alignment with whisperx
    if args.translate {
        app_handle
               .emit(
                   "pipeline-log",
                   "[whisperx] Skipping alignment: Translation mode is active. Preserving translated subtitles."
               )
               .ok();
        app_handle
            .emit("pipeline-log", "Pipeline finished successfully")
            .ok();
        app_handle
            .emit("pipeline-done", out_dir.to_str().unwrap())
            .ok();
        return Ok(());
    }

    if !command_available("whisperx") {
        app_handle
            .emit(
                "pipeline-log",
                "[whisperx][OUT] Skipping alignment: whisperx is not installed. Using whisper.cpp SRT output."
            )
            .ok();
        app_handle
            .emit("pipeline-log", "Pipeline finished successfully")
            .ok();
        app_handle
            .emit("pipeline-done", out_dir.to_str().unwrap())
            .ok();
        return Ok(());
    }

    let out_dir_str = out_dir.to_string_lossy().to_string();
    let whisperx_model = whisperx_model_name(&model_path);
    let mut cmd3 = Command::new("whisperx");

    cmd3.args([
        &audio_str,
        "--model",
        whisperx_model,
        "--output_dir",
        &out_dir_str,
        "--output_format",
        "srt",
        "--device",
        "cpu",
        "--compute_type",
        "int8",
    ]);

    if language != "auto" {
        cmd3.args(["--language", &language]);
    }
    app_handle
        .emit("pipeline-log", "Starting alignment (whisperx)")
        .ok();
    run_and_stream(&mut cmd3, "whisperx")?;

    app_handle
        .emit("pipeline-log", "Pipeline finished successfully")
        .ok();
    app_handle
        .emit("pipeline-done", out_dir.to_str().unwrap())
        .ok();
    Ok(())
}

#[tauri::command]
fn read_output_srt(path: String) -> Result<String, String> {
    let output_path = PathBuf::from(path).join("output.srt");
    std::fs::read_to_string(&output_path)
        .map_err(|e| format!("Cannot read {:?}: {}", output_path, e))
}

#[tauri::command]
fn pick_video_file(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter(
            "Video",
            &[
                "mp4", "mkv", "mov", "avi", "webm", "ts", "m2ts", "mpg", "mpeg", "m4v", "flv",
                "wmv", "3gp", "ogv", "vob",
            ],
        )
        .blocking_pick_file()
        .map(|p| p.to_string())
}

#[tauri::command]
fn pick_output_dir(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Set the default window icon for the app (this also ensures it appears in the Taskbar on Windows)
            if let Some(window) = app.get_webview_window("main") {
                // force clone the icon to avoid ownership issues, since Tauri may reuse the same icon reference internally
                let _ = window.set_icon(app.default_window_icon().cloned().unwrap());
            }
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            run_pipeline,
            read_output_srt,
            pick_video_file,
            pick_output_dir
        ])
        .register_asynchronous_uri_scheme_protocol("asset", |_app, request, responder| {
            macro_rules! send_err {
                ($status:expr) => {{
                    responder.respond(
                        tauri::http::Response::builder()
                            .status($status)
                            .body(Vec::new())
                            .unwrap(),
                    );
                    return;
                }};
            }

            /*
            let exe_dir = std::env::current_exe()
                            .unwrap()
                            .parent()
                            .unwrap()
                            .to_path_buf();
            */

            let exe_dir = match std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            {
                Some(d) => d,
                None => send_err!(tauri::http::StatusCode::INTERNAL_SERVER_ERROR),
            };

            // let decoded = urlencoding::decode(request.uri().path()).unwrap();
            let decoded = match urlencoding::decode(request.uri().path()) {
                Ok(d) => d.into_owned(),
                Err(_) => send_err!(tauri::http::StatusCode::BAD_REQUEST),
            };

            let final_path = PathBuf::from(decoded.trim_start_matches('/'));

            // Resolve to canonical path (this also resolves ".." so traversal attacks
            // are already neutralised by canonicalize itself).
            let canonical = match final_path.canonicalize() {
                Ok(p) => p,
                Err(_) => send_err!(tauri::http::StatusCode::NOT_FOUND),
            };

            // Reject directories (never serve a folder listing).
            if canonical.is_dir() {
                send_err!(tauri::http::StatusCode::FORBIDDEN);
            }

            // FIX: The previous check `!canonical.starts_with(&exe_dir)` was too
            // strict — it blocked ANY file that wasn't inside the app's own directory,
            // including images the user explicitly picked from their file system via
            // the native dialog (convertFileSrc → asset:// URL).
            // canonicalize() above already prevents directory-traversal attacks, so
            // the exe_dir restriction is both unnecessary and harmful here.
            // We keep exe_dir in scope in case we need it for other checks later.
            let _ = &exe_dir;

            // Read file and return to Frontend
            match std::fs::read(final_path) {
                Ok(content) => {
                    // let mime_type = tauri::utils::mime_type::MimeType::parse(&content, final_path);
                    let path_str = canonical.to_str().unwrap_or("");
                    let mime_type = tauri::utils::mime_type::MimeType::parse(&content, path_str);

                    responder.respond(
                        tauri::http::Response::builder()
                            .header("content-type", mime_type)
                            .body(content)
                            .unwrap(),
                    );
                }
                Err(_) => responder.respond(
                    tauri::http::Response::builder()
                        .status(tauri::http::StatusCode::NOT_FOUND)
                        .body(Vec::new())
                        .unwrap(),
                ),
            }
        })
        // ---------------------------------------
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// --- TESTS ---
#[cfg(test)]
mod tests {
    use softsub_tauri::{
        find_project_tool, fixtures_dir, normalize_target_language, normalize_whisper_language,
        validate_srt_content, validate_srt_file, whisperx_model_name,
    };
    use std::fs;
    use std::path::PathBuf;

    // ==========================================
    // 1. TEST for whisperx_model_name function
    // ==========================================
    #[test]
    fn test_whisperx_model_name_valid() {
        // Test for conditions where file name contains expected keywords, regardless of path structure
        assert_eq!(
            whisperx_model_name(&PathBuf::from("C:/models/ggml-tiny.bin")),
            "tiny"
        );
        assert_eq!(
            whisperx_model_name(&PathBuf::from("/home/user/ggml-base.bin")),
            "base"
        );
        assert_eq!(
            whisperx_model_name(&PathBuf::from("ggml-medium.bin")),
            "medium"
        );
        assert_eq!(
            whisperx_model_name(&PathBuf::from("ggml-large-v3.bin")),
            "large-v3"
        );
    }

    #[test]
    fn test_whisperx_model_name_fallback() {
        // Test for conditions where file name is unexpected or path is empty, function must fallback to "small" or "large-v2"
        assert_eq!(
            whisperx_model_name(&PathBuf::from("ggml-large.bin")),
            "large-v2"
        );
        assert_eq!(
            whisperx_model_name(&PathBuf::from("ggml-unknown-model.bin")),
            "small"
        );
        assert_eq!(whisperx_model_name(&PathBuf::from("")), "small");
    }

    // ==========================================
    // 2. TEST for normalize_whisper_language function
    // ==========================================
    #[test]
    fn test_normalize_language_success() {
        // Test for conditions where no language is specified (None) -> should automatically detect Vietnamese ("vi")
        assert_eq!(normalize_whisper_language(None), Ok("vi".to_string()));

        // Test for strings with uppercase letters and leading/trailing whitespace -> should be cleaned and returned in lowercase
        assert_eq!(
            normalize_whisper_language(Some("  VI  ")),
            Ok("vi".to_string())
        );
        assert_eq!(normalize_whisper_language(Some("EN")), Ok("en".to_string()));
        assert_eq!(
            normalize_whisper_language(Some("auto")),
            Ok("auto".to_string())
        );
    }

    #[test]
    fn test_normalize_language_unsupported() {
        // Test for conditions where an unsupported language code is provided (e.g., "xyz", "vietnam")
        // -> should return an error indicating unsupported language
        assert!(normalize_whisper_language(Some("xyz")).is_err());
        assert!(normalize_whisper_language(Some("vietnam")).is_err());

        // You can check the exact error message format
        let error_result = normalize_whisper_language(Some("abc"));
        assert_eq!(
            error_result,
            Err("Unsupported language code: abc".to_string())
        );
    }

    #[test]
    fn test_normalize_target_language() {
        assert_eq!(normalize_target_language(Some("EN")), Ok("en".to_string()));
        assert_eq!(normalize_target_language(Some("sw")), Ok("sw".to_string()));
        assert_eq!(normalize_target_language(Some("tw")), Ok("tw".to_string()));
        assert!(normalize_target_language(Some("xyz")).is_err());
        assert_eq!(
            normalize_target_language(Some("   ")),
            Ok("vi".to_string())
        );
    }

    // ==========================================
    // 3. TEST validate_srt_content
    // ==========================================
    #[test]
    fn test_validate_srt_content_ok() {
        let sample = fixtures_dir().join("sample.srt");
        let content = fs::read_to_string(&sample).unwrap();
        assert!(validate_srt_content(&content).is_ok());
        assert!(validate_srt_file(&sample).is_ok());
    }

    #[test]
    fn test_validate_srt_content_rejects_empty() {
        assert!(validate_srt_content("").is_err());
        assert!(validate_srt_content("   \n  ").is_err());
    }

    // ==========================================
    // 4. TEST find_project_tool
    // ==========================================
    #[test]
    fn test_find_project_tool_locates_translate_script() {
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let found = find_project_tool(&manifest, "translate_srt.py");
        assert!(found.is_some(), "translate_srt.py should exist under tools/");
        assert!(found.unwrap().ends_with("translate_srt.py"));
    }

    #[test]
    fn test_find_project_tool_missing_returns_none() {
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        assert!(find_project_tool(&manifest, "no_such_tool.py").is_none());
    }
}
