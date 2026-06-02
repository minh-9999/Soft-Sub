# SoftSub

> A cross-platform desktop app that automatically extracts soft subtitles from video files using [whisper.cpp](https://github.com/ggerganov/whisper.cpp), with optional word-level timestamp alignment via [WhisperX](https://github.com/m-bain/whisperX).

---

## Features

- **Automatic audio extraction** — uses `ffmpeg` to strip mono 16 kHz WAV from any video format
- **Speech recognition** — runs `whisper.cpp` locally; no internet connection required
- **Word-level alignment** (optional) — pipes the transcript through `whisperx` for precise per-word timestamps
- **Translation mode** — English via whisper.cpp `--translate`; other targets use English subtitles plus optional Python post-translation (`tools/translate_srt.py`)
- **SRT output** — produces a standard `.srt` subtitle file ready for any media player
- **Multi-language support** — 50+ spoken-language codes for Whisper (including `auto` detection) and **102** translation target languages via Google Translate (`tools/translate_srt.py`)
- **Non-ASCII path handling** — automatically copies video to a safe temp path before processing, so filenames with accents or CJK characters never break the pipeline
- **Adaptive threading** — uses all CPU cores minus 2 to keep the UI responsive during transcription
- **Subtitle viewer** — built-in SRT preview panel after processing completes
- **Theme system** — 17 color themes (One Dark Pro, Dracula, Tokyo Night, Catppuccin, Nord, …) plus custom background image with glassmorphism overlay
- **Sound feedback** — click and success audio cues

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) |
| Backend logic | Rust (stable) |
| Frontend UI | HTML + CSS + Vanilla JS (no framework) |
| Audio extraction | [FFmpeg](https://ffmpeg.org) |
| Speech recognition | [whisper.cpp](https://github.com/ggerganov/whisper.cpp) |
| Alignment (optional) | [WhisperX](https://github.com/m-bain/whisperX) |

---

## Prerequisites

Install the following tools and make sure they are available on your system `PATH`:

| Tool | Required | Notes |
|---|---|---|
| [FFmpeg](https://ffmpeg.org/download.html) | ✅ Yes | `ffmpeg` must be callable from terminal |
| whisper.cpp `whisper-cli` | ✅ Yes | Build from source or use a pre-built binary |
| [WhisperX](https://github.com/m-bain/whisperX) | ⬜ Optional | Required only for word-level alignment |
| Python 3 + `deep-translator` | ⬜ Optional | Required only for Translate mode when target is not English |
| [Node.js](https://nodejs.org) ≥ 18 | ✅ Yes | For build scripts |
| [Rust](https://rustup.rs) stable | ✅ Yes | Tauri backend |

### Verify FFmpeg

```bash
ffmpeg -version
```

### Verify whisper.cpp

Build whisper.cpp from source or download a pre-built binary, then place it at:

```
whisper.cpp/
  whisper-cli.exe        # Windows
  whisper-cli            # Linux / macOS
  models/
    ggml-small.bin       # or any model you prefer
```

> The `whisper.cpp/` folder must sit at the **project root** (same level as `src/` and `src-tauri/`). The build script copies it automatically to the Tauri target directory.

---

## Project Structure

```
SoftSub/
│
├── src/                        # Frontend (HTML + CSS + JS)
│   ├── index.html
│   ├── css/
│   │   └── main.css            # All styles and theme
│   │
variables
│   ├── js/
│   │   ├── tauri.js            # Tauri API bridge
│   │   ├── pipeline.js         # Pipeline state, step UI, SRT
│   │
viewer
│   │   ├── logger.js           # Console log rendering
│   │   └── theme.js            # Theme switching and
│   │
background image
│   ├── assets/
│   │   ├── click.wav
│   │   └── success.wav
│   │
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   └── main.rs             # Commands: run_pipeline, 
│   │
pick_video_file, …
│   ├── benches/
│   │   └── pipeline_bench.rs   # Criterion benchmark 
│   │
(optional)
│   ├── capabilities/
│   │   └── default.json        # Tauri permission manifest
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
│   │
├── scripts/
│   └── copy-whisper.js         # Copies whisper.cpp → Tauri 
│   │
target dir
├── tools/
│   └── make_srt.py             # Standalone SRT builder from 
│   │
JSON word timestamps
├── whisper.cpp/               
│   ├── whisper-cli(.exe)
│   ├── whisper-stream(.exe)
│   ├── ...
│   └── models/
│   │   └── ggml-small.bin
│   │   └── ggml-base.bin
│   │   └── ggml-medium.bin
│   │   └── ggml-large-v3.bin
│   │   └── ...
│   │
├── package.json
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/softsub.git
cd softsub
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Place whisper.cpp

Build [whisper.cpp](https://github.com/ggerganov/whisper.cpp) and copy the binary and at least one model into the `whisper.cpp/` folder at the project root:

```bash
# Example build on Linux/macOS
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
cp build/bin/whisper-cli ../softsub/whisper.cpp/
# Download a model
bash ./models/download-ggml-model.sh small
cp models/ggml-small.bin ../softsub/whisper.cpp/models/
cd ../softsub
```

You can download optimized .bin models manually from the  [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp) Repository

### 4. Run in development mode

```bash
npm run dev
```

This will:
1. Copy `whisper.cpp/` to `src-tauri/target/debug/whisper.cpp/`
2. Launch the Tauri dev window with hot-reload

### 5. Build for production

```bash
npm run build
```

This will:
1. Copy `whisper.cpp/` to `src-tauri/target/release/whisper.cpp/`
2. Compile the Rust backend
3. Bundle the app into `src-tauri/target/release/`

---

## Usage

1. **Select a video file** — click **Browse** next to *Video File* and pick any supported format (`.mp4`, `.mkv`, `.mov`, `.avi`, `.webm`, `.ts`, `.m2ts`, `.mpg`, `.m4v`, `.flv`, `.wmv`, `.3gp`, `.ogv`, `.vob`)
2. **Select an output directory** — where `audio.wav`, `output.srt`, and `output.txt` will be saved
3. **Choose a Whisper model** — select from tiny / base / small / medium / large, or point to a custom `.bin` file
4. **Set language** — pick the source language or leave on `auto` for automatic detection
5. **Enable translation** (optional) — toggle *Translate* to convert speech directly to another language
6. **Click Run Pipeline** — watch the three steps progress in real time:
   - **Step 1** — FFmpeg extracts `audio.wav`
   - **Step 2** — whisper.cpp transcribes speech to `output.srt` / `output.txt`
   - **Step 3** — WhisperX refines word-level timestamps (skipped if not installed or in translation mode)
7. When done, the subtitle viewer opens automatically showing the generated SRT

---

## Pipeline Details

```
Video file
    │
    ▼  ffmpeg -ac 1 -ar 16000 -vn
audio.wav (16 kHz mono)
    │
    ▼  whisper-cli -m <model> -l <lang> -otxt -osrt -of output
output.txt  +  output.srt
    │
    ▼  whisperx --model <name> --output_format srt --device cpu --compute_type int8
audio.srt  (word-level aligned)
```

### Translation mode

| Target language | Behaviour |
|---|---|
| English (`en`) | `whisper-cli -l <source> --translate` — built-in speech-to-English (offline) |
| Other (`vi`, `ja`, `th`, `es`, `ar`, `sw`, … — 102 targets in the UI) | Same whisper step produces **English** SRT, then `tools/translate_srt.py` translates cue text to the target (requires Python + internet; see below) |

**Note:** whisper.cpp cannot translate audio directly to Japanese, Thai, etc. Passing `-l ja` only changes the *transcription* language hint; it does not translate meaning.

When translation mode is active, the WhisperX alignment step is **skipped** to preserve the translated text.

#### Post-translation setup (non-English targets)

```bash
pip install -r tools/requirements-translate.txt
```

Uses [deep-translator](https://github.com/nidhaloff/deep-translator) (Google Translate). No API key is required, but an internet connection is needed during the translate step.

---

## Supported Languages

`auto`, `vi`, `en`, `zh`, `ja`, `ko`, `th`, `id`, `ms`, `tl`, `fr`, `de`, `es`, `pt`, `it`, `nl`, `ru`, `uk`, `pl`, `cs`, `sk`, `sl`, `bg`, `ro`, `hu`, `el`, `tr`, `ar`, `he`, `fa`, `hi`, `bn`, `ur`, `ta`, `te`, `ml`, `mr`, `gu`, `kn`, `pa`, `sw`, `af`, `am`, `ha`, `yo`, `so`, `la`, `sv`, `da`, `fi`, `no`, `is`, `ca`

---

## Configuration

No configuration file is needed. All settings are selected through the UI at runtime. The app remembers the selected color theme between sessions via `localStorage`.

---

## Tools

### `tools/translate_srt.py`

Translates subtitle **text** in an existing `.srt` file while keeping timestamps. Used automatically when Translate mode targets a language other than English.

```bash
python tools/translate_srt.py output.srt --source en --target ja
```

Supported `--target` codes use ISO 639-1-style keys in the app (e.g. `vi`, `ja`, `zh`, `he`, `jv`, `tw` for Chinese Traditional). They map to Google Translate codes inside the script (`zh` → `zh-CN`, `he` → `iw`, `jv` → `jw`, etc.). See `LANG_MAP` in `tools/translate_srt.py` for the full list.

### `tools/make_srt.py`

A standalone Python script that converts a JSON file of word-level timestamps (e.g., from WhisperX) into a `.srt` file with automatic line-length and duration capping.

```bash
python tools/make_srt.py word_timestamps.json output.srt
```

| Option (hardcoded) | Default |
|---|---|
| Max characters per subtitle line | 42 |
| Max duration per subtitle block | 4.0 seconds |

---

## Running Tests

```bash
npm test                 # Rust + JS + Python
npm run test:rust        # unit tests in main.rs + integration in tests/
npm run test:js          # Vitest (src/js/srt-utils.test.js)
npm run test:py          # pytest (tools/tests/)
npm run test:rust:ignored  # ffmpeg / video fixtures (optional)
npm run bench            # Criterion: ffmpeg extract step
```

| Layer | Location | What it covers |
|-------|----------|----------------|
| Rust unit | `src-tauri/src/main.rs` (`#[cfg(test)]`) | `whisperx_model_name`, language normalization, SRT validation, `find_project_tool` |
| Rust integration | `src-tauri/tests/` | `sample.srt` fixture; optional `test_input.mp4` + ffmpeg (`#[ignore]`) |
| JS unit | `src/js/srt-utils.test.js` | `parseSrt`, timestamps, word counts |
| Python unit | `tools/tests/` | `make_srt.py`, `translate_srt.py` parsing |

Place an optional short video at `src-tauri/tests/fixtures/test_input.mp4` for integration and benchmarks (see `tests/fixtures/README.md`).

### Benchmarks

```bash
npm run bench
# or: cd src-tauri && cargo bench
```

Benchmarks use [Criterion.rs](https://bheisler.github.io/criterion.rs/book/) and measure **ffmpeg audio extraction** (step 1). They skip gracefully if `test_input.mp4` is absent.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Failed to spawn ffmpeg: program not found` | FFmpeg not on PATH | Install FFmpeg and restart the app |
| `whisper-cli not found` | whisper.cpp binary missing or wrong location | Place `whisper-cli(.exe)` inside `whisper.cpp/` at project root |
| `Whisper model not found` | Model file missing | Download a `.bin` model and place it in `whisper.cpp/models/` |
| Non-ASCII filename causes error | Path encoding issue | The app auto-copies the file to a safe temp name — ensure output dir is on a writable volume |
| WhisperX step is skipped | WhisperX not installed | Install with `pip install whisperx` or accept the whisper.cpp SRT output |

---

## License

GPLv3 — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) by Georgi Gerganov
- [WhisperX](https://github.com/m-bain/whisperX) by Max Bain
- [Tauri](https://tauri.app) by the Tauri Programme
- [FFmpeg](https://ffmpeg.org) — the Swiss Army knife of multimedia
