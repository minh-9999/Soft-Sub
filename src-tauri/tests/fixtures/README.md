# Test fixtures

| File | Purpose |
|------|---------|
| `sample.srt` | Always present — integration tests validate SRT parsing |
| `sample_words.json` | Input for `tools/make_srt.py` unit tests |
| `test_input.mp4` | **Optional** — short video (~5–10 s) for ffmpeg / pipeline benchmarks |

Place `test_input.mp4` here locally (not committed if large). Then run:

```bash
cd src-tauri
cargo test -- --ignored          # integration tests that need ffmpeg + video
cargo bench                      # performance (ffmpeg extract step)
```
