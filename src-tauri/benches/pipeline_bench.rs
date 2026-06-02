use criterion::{criterion_group, criterion_main, Criterion};
use softsub_tauri::{fixtures_dir, run_ffmpeg_extract_audio};
use std::fs;
use std::path::PathBuf;

fn bench_ffmpeg_extract(c: &mut Criterion) {
    let video = fixtures_dir().join("test_input.mp4");
    if !video.is_file() {
        eprintln!(
            "\n⚠️  Skipping benchmark: place a short video at {:?}\n",
            video
        );
        return;
    }

    let out_dir = fixtures_dir().join("output_bench");
    let _ = fs::remove_dir_all(&out_dir);
    fs::create_dir_all(&out_dir).unwrap();
    let audio = out_dir.join("audio.wav");

    let mut group = c.benchmark_group("SoftSub_Pipeline");
    group.sample_size(10);
    group.bench_function("ffmpeg_extract_audio_16k_mono", |b| {
        b.iter(|| {
            let _ = fs::remove_file(&audio);
            run_ffmpeg_extract_audio(&video, &audio)
                .expect("ffmpeg extract (requires ffmpeg on PATH)");
        });
    });
    group.finish();
}

criterion_group!(benches, bench_ffmpeg_extract);
criterion_main!(benches);
