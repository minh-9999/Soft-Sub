//! Shared pipeline helpers (unit + integration tests, benchmarks).

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

pub fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
}

pub fn whisperx_model_name(model_path: &PathBuf) -> &str {
    let Some(file_name) = model_path.file_name().and_then(|name| name.to_str()) else {
        return "small";
    };

    if file_name.contains("tiny") {
        "tiny"
    } else if file_name.contains("base") {
        "base"
    } else if file_name.contains("small") {
        "small"
    } else if file_name.contains("medium") {
        "medium"
    } else if file_name.contains("large-v3") {
        "large-v3"
    } else if file_name.contains("large") {
        "large-v2"
    } else {
        "small"
    }
}

pub fn normalize_whisper_language(language: Option<&str>) -> Result<String, String> {
    let language = language.unwrap_or("vi").trim().to_lowercase();
    let language = if language.is_empty() {
        "vi".to_string()
    } else {
        language
    };

    let supported = [
        "auto", "vi", "en", "zh", "ja", "ko", "th", "id", "ms", "tl", "fr", "de", "es", "pt", "it",
        "nl", "ru", "uk", "pl", "cs", "sk", "sl", "bg", "ro", "hu", "el", "tr", "ar", "he", "fa",
        "hi", "bn", "ur", "ta", "te", "ml", "mr", "gu", "kn", "pa", "sw", "af", "am", "ha", "yo",
        "so", "la", "sv", "da", "fi", "no", "is", "ca",
    ];

    if supported.contains(&language.as_str()) {
        Ok(language)
    } else {
        Err(format!("Unsupported language code: {}", language))
    }
}

pub fn normalize_target_language(language: Option<&str>) -> Result<String, String> {
    let language = language.unwrap_or("vi").trim().to_lowercase();
    if language.is_empty() {
        return Ok("vi".to_string());
    }

    let supported = [
        "af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "cs", "cy", "da", "de", "el",
        "en", "eo", "es", "et", "eu", "fa", "fi", "fr", "ga", "gl", "gu", "ha", "he", "hi",
        "hr", "ht", "hu", "hy", "id", "ig", "is", "it", "ja", "jv", "ka", "kk", "km", "kn",
        "ko", "ku", "ky", "la", "lg", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn", "mr",
        "ms", "my", "ne", "nl", "no", "ny", "or", "pa", "pl", "ps", "pt", "ro", "ru", "rw",
        "sd", "si", "sk", "sl", "sm", "sn", "so", "sq", "sr", "st", "su", "sv", "sw", "ta",
        "te", "tg", "th", "ti", "tk", "tl", "tr", "tt", "tw", "uk", "ur", "uz", "vi", "xh",
        "yi", "yo", "zh", "zu",
    ];

    if supported.contains(&language.as_str()) {
        Ok(language)
    } else {
        Err(format!("Unsupported target language code: {}", language))
    }
}

pub fn find_project_tool(exe_dir: &Path, filename: &str) -> Option<PathBuf> {
    let mut dir = Some(exe_dir);
    for _ in 0..6 {
        let candidate = dir?.join("tools").join(filename);
        if candidate.is_file() {
            return Some(candidate);
        }
        dir = dir?.parent();
    }
    None
}

/// Validates minimal SRT structure (index line, timestamp line, text).
pub fn validate_srt_content(content: &str) -> Result<(), String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("SRT file is empty".into());
    }
    if !trimmed.contains("-->") {
        return Err("SRT missing timestamp arrow".into());
    }
    let blocks: Vec<&str> = trimmed.split("\n\n").collect();
    if blocks.is_empty() {
        return Err("SRT has no blocks".into());
    }
    for block in blocks {
        let lines: Vec<&str> = block.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
        if lines.len() < 3 {
            return Err(format!("SRT block too short: {:?}", block));
        }
        if !lines[1].contains("-->") {
            return Err(format!("Invalid timestamp line: {}", lines[1]));
        }
    }
    Ok(())
}

pub fn validate_srt_file(path: &Path) -> Result<(), String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Cannot read {:?}: {}", path, e))?;
    validate_srt_content(&content)
}

/// Step 1 of the pipeline: extract 16 kHz mono WAV (requires `ffmpeg` on PATH).
pub fn run_ffmpeg_extract_audio(video_path: &Path, audio_path: &Path) -> Result<(), String> {
    if !video_path.exists() {
        return Err(format!("Video file does not exist: {:?}", video_path));
    }
    if let Some(parent) = audio_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create output dir: {}", e))?;
    }

    let video_str = video_path
        .to_str()
        .ok_or_else(|| format!("Invalid video path: {:?}", video_path))?;
    let audio_str = audio_path
        .to_str()
        .ok_or_else(|| format!("Invalid audio path: {:?}", audio_path))?;

    let status = Command::new("ffmpeg")
        .args([
            "-loglevel",
            "error",
            "-y",
            "-i",
            video_str,
            "-ac",
            "1",
            "-ar",
            "16000",
            "-vn",
            audio_str,
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .status()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    if !status.success() {
        return Err(format!(
            "ffmpeg failed with code {:?}",
            status.code()
        ));
    }
    if !audio_path.is_file() {
        return Err(format!("ffmpeg did not create {:?}", audio_path));
    }
    Ok(())
}

pub fn command_available(command: &str) -> bool {
    Command::new(command)
        .arg("--help")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok()
}
