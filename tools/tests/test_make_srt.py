import json
import sys
from pathlib import Path

# tools/ on path for `import make_srt`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from make_srt import format_time, make_srt  # noqa: E402

FIXTURES = Path(__file__).resolve().parents[2] / "src-tauri" / "tests" / "fixtures"


def test_format_time_zero():
    assert format_time(0.0) == "00:00:00,000"


def test_format_time_with_milliseconds():
    assert format_time(1.5) == "00:00:01,500"


def test_make_srt_splits_words():
    data = json.loads((FIXTURES / "sample_words.json").read_text(encoding="utf-8"))
    subs = make_srt(data["words"], max_chars=80, max_duration=10.0)
    assert len(subs) == 1
    start, end, text = subs[0]
    assert start == 0.0
    assert end == 1.8
    assert "Hello" in text and "fixture" in text


def test_make_srt_respects_max_chars():
    words = [
        {"word": "a", "start": 0.0, "end": 0.1},
        {"word": "b", "start": 0.1, "end": 0.2},
        {"word": "c", "start": 0.2, "end": 0.3},
        {"word": "d", "start": 0.3, "end": 0.4},
    ]
    subs = make_srt(words, max_chars=3, max_duration=10.0)
    assert len(subs) >= 2
