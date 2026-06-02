#!/usr/bin/env python3
"""Translate subtitle text in an SRT file while preserving timestamps."""

from __future__ import annotations

import argparse
import re
import sys
import time

# Maps app ISO 639-1-style keys to deep-translator / Google Translate codes.
# Keep in sync with src/js/translation-languages.js and normalize_target_language in main.rs.
LANG_MAP = {
    "af": "af",
    "am": "am",
    "ar": "ar",
    "az": "az",
    "be": "be",
    "bg": "bg",
    "bn": "bn",
    "bs": "bs",
    "ca": "ca",
    "cs": "cs",
    "cy": "cy",
    "da": "da",
    "de": "de",
    "el": "el",
    "en": "en",
    "eo": "eo",
    "es": "es",
    "et": "et",
    "eu": "eu",
    "fa": "fa",
    "fi": "fi",
    "fr": "fr",
    "ga": "ga",
    "gl": "gl",
    "gu": "gu",
    "ha": "ha",
    "he": "iw",
    "hi": "hi",
    "hr": "hr",
    "ht": "ht",
    "hu": "hu",
    "hy": "hy",
    "id": "id",
    "ig": "ig",
    "is": "is",
    "it": "it",
    "ja": "ja",
    "jv": "jw",
    "ka": "ka",
    "kk": "kk",
    "km": "km",
    "kn": "kn",
    "ko": "ko",
    "ku": "ku",
    "ky": "ky",
    "la": "la",
    "lg": "lg",
    "lo": "lo",
    "lt": "lt",
    "lv": "lv",
    "mg": "mg",
    "mi": "mi",
    "mk": "mk",
    "ml": "ml",
    "mn": "mn",
    "mr": "mr",
    "ms": "ms",
    "my": "my",
    "ne": "ne",
    "nl": "nl",
    "no": "no",
    "ny": "ny",
    "or": "or",
    "pa": "pa",
    "pl": "pl",
    "ps": "ps",
    "pt": "pt",
    "ro": "ro",
    "ru": "ru",
    "rw": "rw",
    "sd": "sd",
    "si": "si",
    "sk": "sk",
    "sl": "sl",
    "sm": "sm",
    "sn": "sn",
    "so": "so",
    "sq": "sq",
    "sr": "sr",
    "st": "st",
    "su": "su",
    "sv": "sv",
    "sw": "sw",
    "ta": "ta",
    "te": "te",
    "tg": "tg",
    "th": "th",
    "ti": "ti",
    "tk": "tk",
    "tl": "tl",
    "tr": "tr",
    "tt": "tt",
    "tw": "zh-TW",
    "uk": "uk",
    "ur": "ur",
    "uz": "uz",
    "vi": "vi",
    "xh": "xh",
    "yi": "yi",
    "yo": "yo",
    "zh": "zh-CN",
    "zu": "zu",
}

BLOCK_RE = re.compile(r"\r?\n\r?\n")


def parse_srt(content: str) -> list[tuple[str, str, list[str]]]:
    """Return list of (index_line, timestamp_line, text_lines)."""
    blocks: list[tuple[str, str, list[str]]] = []
    for raw in BLOCK_RE.split(content.strip()):
        lines = raw.splitlines()
        if len(lines) < 3:
            continue
        index_line = lines[0].strip()
        timestamp_line = lines[1].strip()
        text_lines = lines[2:]
        blocks.append((index_line, timestamp_line, text_lines))
    return blocks


def format_srt(blocks: list[tuple[str, str, list[str]]]) -> str:
    parts: list[str] = []
    for index_line, timestamp_line, text_lines in blocks:
        parts.append(index_line)
        parts.append(timestamp_line)
        parts.extend(text_lines)
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def translate_texts(texts: list[str], source: str, target: str) -> list[str]:
    try:
        from deep_translator import GoogleTranslator
    except ImportError as exc:
        raise SystemExit(
            "deep-translator is not installed. Run: pip install -r tools/requirements-translate.txt"
        ) from exc

    src = LANG_MAP.get(source, source)
    tgt = LANG_MAP.get(target, target)
    translator = GoogleTranslator(source=src, target=tgt)

    # Translate in batches to reduce HTTP round-trips.
    batch_size = 40
    out: list[str] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            translated = translator.translate_batch(batch)
        except AttributeError:
            translated = [translator.translate(t) for t in batch]
        out.extend(translated)
        if i + batch_size < len(texts):
            time.sleep(0.15)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate SRT cue text.")
    parser.add_argument("srt_path", help="Path to .srt file (updated in place)")
    parser.add_argument(
        "--source", default="en", help="Source language code (default: en)"
    )
    parser.add_argument("--target", required=True, help="Target language code")
    args = parser.parse_args()

    target = args.target.strip().lower()
    source = args.source.strip().lower()
    if target not in LANG_MAP:
        print(f"Unsupported target language: {target}", file=sys.stderr)
        sys.exit(2)
    if source == target:
        print(f"Source and target are both '{target}'; nothing to translate.")
        return

    with open(args.srt_path, encoding="utf-8") as f:
        content = f.read()

    blocks = parse_srt(content)
    if not blocks:
        print("No subtitle blocks found.", file=sys.stderr)
        sys.exit(3)

    payloads = ["\n".join(text_lines) for _, _, text_lines in blocks]
    translated = translate_texts(payloads, source, target)

    new_blocks: list[tuple[str, str, list[str]]] = []
    for (index_line, timestamp_line, _), new_text in zip(blocks, translated):
        new_lines = new_text.splitlines() if new_text else [""]
        new_blocks.append((index_line, timestamp_line, new_lines))

    with open(args.srt_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(format_srt(new_blocks))

    print(f"Translated {len(new_blocks)} cues ({source} -> {target})")


if __name__ == "__main__":
    main()
