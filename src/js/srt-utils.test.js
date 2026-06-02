import { describe, expect, it } from "vitest";
import {
    countWords,
    countWordsLogically,
    formatClock,
    parseSrt,
    srtTimeToSeconds,
} from "./srt-utils.js";

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:02,500
Hello world

2
00:00:02,500 --> 00:00:05,000
Second line
`;

describe("srtTimeToSeconds", () => {
    it("parses SRT timestamp", () => {
        expect(srtTimeToSeconds("00:00:02,500")).toBeCloseTo(2.5);
        expect(srtTimeToSeconds("01:02:03,000")).toBe(3723);
    });

    it("returns 0 for invalid input", () => {
        expect(srtTimeToSeconds("bad")).toBe(0);
    });
});

describe("formatClock", () => {
    it("formats minutes and seconds", () => {
        expect(formatClock(65)).toBe("1:05");
    });

    it("formats hours when needed", () => {
        expect(formatClock(3661)).toBe("1:01:01");
    });
});

describe("parseSrt", () => {
    it("parses blocks with CRLF", () => {
        const crlf = SAMPLE_SRT.replace(/\n/g, "\r\n");
        const segments = parseSrt(crlf);
        expect(segments).toHaveLength(2);
        expect(segments[0].text).toBe("Hello world");
        expect(segments[0].startSeconds).toBeCloseTo(0);
        expect(segments[1].endSeconds).toBeCloseTo(5);
    });

    it("returns empty array for empty input", () => {
        expect(parseSrt("")).toEqual([]);
        expect(parseSrt(null)).toEqual([]);
    });
});

describe("countWords", () => {
    it("counts space-separated words", () => {
        expect(countWords("  one two   three ")).toBe(3);
    });
});

describe("countWordsLogically", () => {
    it("uses character count for CJK", () => {
        expect(countWordsLogically("你好")).toBe(2);
    });

    it("uses word split for Latin scripts", () => {
        expect(countWordsLogically("Hello, world!")).toBe(2);
    });
});
