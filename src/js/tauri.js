// ── tauri.js — Tauri bridge ───────────────────────────────────
// Wraps all Tauri API calls so the rest of the app
// doesn't need to know whether it's running inside Tauri or not.

var isTauri = typeof window.__TAURI__ !== 'undefined';

async function tauriInvoke(cmd, args) {
  if (isTauri) return window.__TAURI__.core.invoke(cmd, args);
  console.log('[mock] invoke', cmd, args);
  if (cmd === 'read_output_srt') return mockOutputSrt();
  simulatePipeline();
}

async function tauriListen(event, cb) {
  if (isTauri) return window.__TAURI__.event.listen(event, e => cb(e.payload));
  return () => {};
}

async function pickFileDialog() {
  if (!isTauri) return null;
  return await window.__TAURI__.dialog.open({
    title: 'Select Video File',
    multiple: false,
    filters: [{ name: 'Video Files', extensions: [
      'mp4','mkv','mov','avi','webm',
      'ts','m2ts','mpg','mpeg','m4v',
      'flv','wmv','3gp','ogv','vob'
    ]}]
  });
}

async function pickDirDialog() {
  if (!isTauri) return null;
  return await window.__TAURI__.dialog.open({
    title: 'Select Output Directory',
    directory: true,
    multiple: false
  });
}

async function pickImageDialog() {
  if (!isTauri) return null;
  return await window.__TAURI__.dialog.open({
    title: 'Select Background Image',
    multiple: false,
    filters: [{ name: 'Images', extensions: ['png','jpg','jpeg','webp','avif'] }]
  });
}

// ── Mock simulation (browser preview only) ────────────────────
function simulatePipeline() {
  const logs = [
    '[ffmpeg][OUT] ffmpeg version 6.0',
    '[ffmpeg][OUT] Input: video.mp4 → audio.wav',
    '[ffmpeg][OUT] Audio extraction complete',
    '[whisper][OUT] Loading model: ggml-small.bin',
    '[whisper][OUT] Transcribing audio…',
    '[whisper][ERR] whisper_print_timings: load time = 312.00 ms',
    '[whisper][OUT] Transcript saved',
    '[whisperx][OUT] Loading wav2vec2 alignment model',
    '[whisperx][OUT] Aligning transcript…',
    '[whisperx][OUT] Alignment complete',
  ];
  let i = 0;
  const iv = setInterval(() => {
    if (i < logs.length) appendLog(logs[i++]);
    else {
      clearInterval(iv);
      onPipelineDone('/tmp/output');
    }
  }, 400);
}


