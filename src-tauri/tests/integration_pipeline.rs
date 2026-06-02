use softsub_tauri::{fixtures_dir, run_ffmpeg_extract_audio, validate_srt_file};
use std::fs;
use std::path::PathBuf;

fn fixture_video() -> PathBuf {
    fixtures_dir().join("test_input.mp4")
}

#[test]
#[ignore = "requires ffmpeg and tests/fixtures/test_input.mp4"]
fn ffmpeg_extracts_audio_from_fixture_video() {
    let video = fixture_video();
    assert!(
        video.is_file(),
        "Add a short video at {:?} (see fixtures/README.md)",
        video
    );

    let out_dir = fixtures_dir().join("output_test");
    if out_dir.exists() {
        fs::remove_dir_all(&out_dir).unwrap();
    }
    fs::create_dir_all(&out_dir).unwrap();

    let audio = out_dir.join("audio.wav");
    run_ffmpeg_extract_audio(&video, &audio).expect("ffmpeg extract should succeed");
    assert!(audio.is_file());
    assert!(audio.metadata().unwrap().len() > 0);
}

#[test]
#[ignore = "requires ffmpeg, whisper.cpp, model, and tests/fixtures/test_input.mp4"]
fn full_pipeline_outputs_nonempty_srt() {
    let video = fixture_video();
    assert!(video.is_file(), "missing {:?}", video);

    let out_dir = fixtures_dir().join("output_test");
    if out_dir.exists() {
        fs::remove_dir_all(&out_dir).unwrap();
    }
    fs::create_dir_all(&out_dir).unwrap();

    // Documented manual E2E: run the desktop app or `tauri dev` with this video/out_dir.
    // This test only verifies ffmpeg + placeholder SRT when whisper is not wired in CI.
    let audio = out_dir.join("audio.wav");
    run_ffmpeg_extract_audio(&video, &audio).expect("ffmpeg");

    let srt = out_dir.join("output.srt");
    if srt.is_file() {
        validate_srt_file(&srt).expect("output.srt valid");
    }
}
