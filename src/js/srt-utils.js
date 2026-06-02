// Pure SRT/time helpers (unit-tested via Vitest; used by pipeline.js)

export function srtTimeToSeconds(value) {
    const m = value.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!m) return 0;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

export function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseSrt(srtText) {
    if (!srtText) return [];

    const normalizedData = srtText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const blocks = normalizedData.split(/\n\s*\n/);
    const segments = [];

    for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (lines.length < 3) continue;

        const index = lines[0].trim();
        const timeLine = lines[1].trim();
        if (!timeLine.includes("-->")) continue;

        const timeMatch = timeLine.split("-->");
        if (timeMatch.length !== 2) continue;

        const startStr = timeMatch[0].trim();
        const endStr = timeMatch[1].trim();

        const startSeconds = srtTimeToSeconds(startStr);
        const endSeconds = srtTimeToSeconds(endStr);
        const text = lines.slice(2).join(" ").trim();

        if (text) {
            segments.push({
                index,
                text,
                startSeconds,
                endSeconds,
                startTime: startStr,
                endTime: endStr,
                time: `${startStr} - ${endStr}`,
                timestamp: `${startStr} - ${endStr}`,
            });
        }
    }

    return segments;
}

export function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countWordsLogically(text) {
    if (!text) return 0;

    const cleanText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'「」『』、。！？]/g, "").trim();
    if (!cleanText) return 0;

    const hasCJK = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/.test(cleanText);
    if (hasCJK) {
        return cleanText.length;
    }
    return cleanText.split(/\s+/).filter((w) => w.length > 0).length;
}
