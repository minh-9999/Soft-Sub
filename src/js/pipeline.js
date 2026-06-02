// ── pipeline.js — Pipeline state & controls ───────────────────

import {
    countWordsLogically,
    formatClock,
    parseSrt,
    srtTimeToSeconds,
} from "./srt-utils.js";

let ALL_SUBTITLE_SEGMENTS = [];

var unlistenLog = null;
var unlistenDone = null;
var currentStep = null;

const soundClick = new Audio("assets/click.wav"); // Sound for button clicks
const soundSuccess = new Audio("assets/success.wav"); // Sound when done

// ── Step UI ───────────────────────────────────────────────────
function activateStep(stepId)
{
    if (currentStep === stepId) return;
    if (currentStep) setStep(currentStep, "done");
    currentStep = stepId;
    setStep(stepId, "active");
}

function setStep(stepId, state)
{
    const el = document.getElementById("step-" + stepId);
    const badge = document.getElementById("badge-" + stepId);
    if (!el) return;
    el.className = "step " + state;
    const labels = { active: "RUNNING", done: "DONE", error: "ERROR", "": "PENDING" };
    badge.textContent = labels[state] || "PENDING";
}

function setStatus(state, label)
{
    document.getElementById("statusDot").className = "status-dot " + state;
    document.getElementById("statusLabel").textContent = label;
}

// ── File pickers ──────────────────────────────────────────────
async function pickFile(fieldId)
{
    const path = await pickFileDialog();
    if (path) document.getElementById(fieldId).value = path;
}

async function pickDir(fieldId)
{
    const path = await pickDirDialog();
    if (path) document.getElementById(fieldId).value = path;
}

// ── Model select ──────────────────────────────────────────────
function onModelChange()
{
    const sel = document.getElementById("modelSelect");
    document.getElementById("customModelField").style.display = sel.value === "custom" ? "block" : "none";
}

function getModelPath()
{
    const sel = document.getElementById("modelSelect");
    if (sel.value === "custom") return document.getElementById("customModelPath").value || undefined;
    return sel.value;
}

function getLanguage()
{
    const sel = document.getElementById("languageSelect");
    return sel ? sel.value : "vi";
}

function clearSubtitlePreview()
{
    const panel = document.getElementById("previewPanel");
    if (panel) panel.hidden = true;
    const rows = document.getElementById("previewRows");
    if (rows) rows.innerHTML = "";
    const summary = document.getElementById("previewSummary");
    if (summary) summary.textContent = "";
}

function renderSubtitleTable()
{
    const rows = document.getElementById("previewRows");
    if (!rows) return;

    rows.innerHTML = ""; // Clear existing rows

    if (!ALL_SUBTITLE_SEGMENTS || ALL_SUBTITLE_SEGMENTS.length === 0)
    {
        rows.innerHTML = `<tr><td colspan="2" style="text-align:center; opacity:0.5; padding:20px; font-size:14px;">No subtitle data found.</td></tr>`;
        return;
    }

    const maxRowsInput = document.getElementById("maxRowsInput");
    let maxRows = maxRowsInput && maxRowsInput.value ? parseInt(maxRowsInput.value) : ALL_SUBTITLE_SEGMENTS.length;

    if (isNaN(maxRows)) maxRows = 100;

    const visibleSegments = ALL_SUBTITLE_SEGMENTS.slice(0, maxRows);

    for (const segment of visibleSegments)
    {
        const row = document.createElement("tr");
        row.style.borderBottom = "1px solid rgba(255, 255, 255, 0.05)"; // subtle row separator

        const timeCell = document.createElement("td");
        timeCell.className = "preview-time";
        timeCell.style.width = "25%";
        timeCell.style.padding = "12px 8px"; // more padding for better readability
        timeCell.style.fontSize = "14px";
        timeCell.style.color = "#ca6207";
        timeCell.style.verticalAlign = "top"; // align time to top for better multi-line text alignment

        // Prefer the original time format if available, otherwise fall back to
        // formatted seconds
        timeCell.innerText =
            segment.time || `${formatClock(segment.startSeconds)} - ${formatClock(segment.endSeconds)}`;

        const textCell = document.createElement("td");
        textCell.className = "preview-text";
        textCell.style.width = "75%";
        textCell.style.padding = "12px 8px"; // more padding for better readability
        textCell.style.fontSize = "14px";
        textCell.style.lineHeight = "1.4"; // improve line spacing for multi-line subtitles
        textCell.style.color = "#e0e6ed"; // darker text for better contrast
        textCell.textContent = segment.text;
        textCell.style.verticalAlign = "top"; // align text to top for better multi-line text alignment

        row.appendChild(timeCell);
        row.appendChild(textCell);
        rows.appendChild(row);
    }
}

function renderSubtitlePreview(outputDir, srtText)
{
    const panel = document.getElementById("previewPanel");
    if (!panel) return;

    // 1. Parse SRT and store in global variable for later use in table rendering
    ALL_SUBTITLE_SEGMENTS = parseSrt(srtText);
    const totalLines = ALL_SUBTITLE_SEGMENTS.length;

    // 2. Update meta information (Keep the original logic)
    document.getElementById("previewFile").textContent = outputDir + "/output.srt";
    document.getElementById("previewSegments").textContent = `${totalLines} segments`;

    const duration = totalLines ? ALL_SUBTITLE_SEGMENTS[totalLines - 1].endSeconds : 0;
    document.getElementById("previewDuration").textContent = formatClock(duration);

    // Logical word count that accounts for different languages, rather than just
    // splitting by whitespace
    let totalWords = 0;
    ALL_SUBTITLE_SEGMENTS.forEach((s) =>
    {
        totalWords += countWordsLogically(s.text || "");
    });
    document.getElementById("previewWords").textContent = `${totalWords} words`;

    const fullText = ALL_SUBTITLE_SEGMENTS.map((s) => s.text || "").join(" ");
    // document.getElementById("previewWords").textContent =
    // `${countWords(fullText)} words`;

    const shortSummary = fullText.length > 280 ? fullText.slice(0, 280).trimEnd() + "..." : fullText;
    document.getElementById("previewSummary").textContent = shortSummary || "No subtitle text found.";

    // 3. Process the row limit notification bar
    const maxRowsInput = document.getElementById("maxRowsInput");
    const limitMessage = document.getElementById("limitMessage");

    if (maxRowsInput && limitMessage)
    {
        if (totalLines > 500)
        {
            maxRowsInput.value = 100; // File is too long, default to showing only
            // 100 rows for performance
            limitMessage.innerHTML = `⚠️ <strong>Large file!</strong> Contains <b>${totalLines}</b> lines. Render limited for performance.`;
            limitMessage.style.color = "#ffb74d";
        }
        else
        {
            maxRowsInput.value = totalLines; // File is short enough, show all lines by default
            limitMessage.innerHTML = `✅ Subtitle loaded successfully with <b>${totalLines}</b> lines.`;
            limitMessage.style.color = "";
        }
    }

    renderSubtitleTable();

    // Show the preview panel (in case it was hidden)
    panel.hidden = false;
}

async function loadSubtitlePreview(outputDir)
{
    try
    {
        const srtText = await tauriInvoke("read_output_srt", { path: outputDir });
        const targetLanguage = document.getElementById("targetLanguageSelect")?.value;

        const previewPanel = document.getElementById("previewPanel");
        if (previewPanel)
        {
            previewPanel.removeAttribute("hidden");
            previewPanel.style.display = "flex";
        }

        renderSubtitlePreview(outputDir, srtText || "");

        const panelRight = document.getElementById("panelRight");
        if (panelRight)
        {
            panelRight.style.gridTemplateRows = "300px auto 1fr";
        }
    }
    catch (e)
    {
        clearSubtitlePreview();
        appendLog("[preview][ERR] " + String(e));
        // console.error(e);
    }
}

// ── Run pipeline ──────────────────────────────────────────────
async function runPipeline()
{
    const videoPath = document.getElementById("videoPath").value.trim();
    const outDir = document.getElementById("outDir").value.trim();

    if (!videoPath)
    {
        alert("Please select a video file.");
        return;
    }
    if (!outDir)
    {
        alert("Please select an output directory.");
        return;
    }

    // Read selected language options
    const language = document.getElementById("languageSelect").value;
    const targetLanguage = document.getElementById("targetLanguageSelect").value; // read target language from UI

    const taskMode = document.getElementById("taskModeSelect").value;
    const isTranslate = taskMode === "translate";

    let finalTask = taskMode; // "transcribe" or "translate"
    let finalLang = language; // default to the original language

    // Reset UI
    ["ffmpeg", "whisper", "whisperx"].forEach((s) => setStep(s, ""));
    currentStep = null;
    document.getElementById("doneBanner").classList.remove("show");
    clearSubtitlePreview();

    const btn = document.getElementById("btnRun");
    btn.disabled = true;
    btn.textContent = "⏳ Running…";
    document.getElementById("btnReset").style.display = "none";
    setStatus("running", "RUNNING");

    soundClick.currentTime = 0; // Reset time to 0 so that continuous clicking doesn't cause lag
    soundClick.play().catch((err) => console.log("Music not playing:", err));

    finalLang = language; // always source language
    finalTask = taskMode; // "translate" or "transcribe"
    if (taskMode === "translate") appendLog(`[pipeline] Translate mode: ${language} → ${targetLanguage}`);

    // Subscribe to events
    unlistenLog = await tauriListen("pipeline-log", appendLog);
    unlistenDone = await tauriListen("pipeline-done", onPipelineDone);

    try
    {
        await tauriInvoke("run_pipeline", {
            args: {
                video_path: videoPath,
                out_dir: outDir,
                // model_path: getModelPath(),
                model_path: getModelPath(),
                language: finalLang,
                target_language: targetLanguage,
                translate: isTranslate,
                task: finalTask,
            },
        });
    }
    catch (e)
    {
        appendLog("[ERROR] " + String(e));
        if (currentStep) setStep(currentStep, "error");
        setStatus("error", "ERROR");
        btn.disabled = false;
        btn.textContent = "▶ Run Pipeline";
        document.getElementById("btnReset").style.display = "block";
        if (unlistenLog)
        {
            unlistenLog();
            unlistenLog = null;
        }
        if (unlistenDone)
        {
            unlistenDone();
            unlistenDone = null;
        }
    }
}

// ── Done handler ──────────────────────────────────────────────
async function onPipelineDone(path)
{
    soundSuccess.currentTime = 0;
    soundSuccess.play().catch((err) => console.log("Music failed to play:", err));

    if (currentStep) setStep(currentStep, "done");
    setStatus("done", "DONE");

    const btn = document.getElementById("btnRun");
    btn.disabled = false;
    btn.textContent = "▶ Run Pipeline";
    document.getElementById("btnReset").style.display = "block";

    const donePathEl = document.getElementById("donePath");
    if (donePathEl)
    {
        donePathEl.textContent = "Output: " + path;
        donePathEl.style.fontSize = "14px";
    }

    document.getElementById("doneBanner").classList.add("show");
    await loadSubtitlePreview(path);

    if (unlistenLog)
    {
        unlistenLog();
        unlistenLog = null;
    }
    if (unlistenDone)
    {
        unlistenDone();
        unlistenDone = null;
    }
}

// ── Reset ─────────────────────────────────────────────────────
function resetPipeline()
{
    if (confirm("Are you sure you want to reset? This will clear all logs and preview data."))
    {
        resetAll();
    }
}

function resetAll()
{
    ["ffmpeg", "whisper", "whisperx"].forEach((s) => setStep(s, ""));
    currentStep = null;
    setStatus("", "IDLE");
    clearLogs();
    document.getElementById("doneBanner").classList.remove("show");
    clearSubtitlePreview();
    document.getElementById("btnReset").style.display = "none";
    const btn = document.getElementById("btnRun");
    btn.disabled = false;
    btn.textContent = "▶ Run Pipeline";
}

// Expose handlers for inline HTML onclick (classic scripts stay global)
Object.assign(window, {
    pickFile,
    pickDir,
    onModelChange,
    runPipeline,
    resetPipeline,
    resetAll,
    renderSubtitleTable,
});
