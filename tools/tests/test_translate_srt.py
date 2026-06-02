import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from translate_srt import LANG_MAP, format_srt, parse_srt  # noqa: E402

FIXTURES = Path(__file__).resolve().parents[2] / "src-tauri" / "tests" / "fixtures"

SAMPLE = """1
00:00:00,000 --> 00:00:02,000
Hello

2
00:00:02,000 --> 00:00:04,000
World
"""


def test_lang_map_has_common_codes():
    assert LANG_MAP["vi"] == "vi"
    assert LANG_MAP["he"] == "iw"
    assert LANG_MAP["zh"] == "zh-CN"
    assert LANG_MAP["tw"] == "zh-TW"


def test_parse_srt_blocks():
    blocks = parse_srt(SAMPLE)
    assert len(blocks) == 2
    assert blocks[0][0] == "1"
    assert "-->" in blocks[0][1]
    assert blocks[0][2] == ["Hello"]


def test_format_srt_roundtrip():
    blocks = parse_srt(SAMPLE)
    out = format_srt(blocks)
    assert "Hello" in out and "World" in out
    assert out.endswith("\n")


def test_parse_fixture_sample_srt():
    content = (FIXTURES / "sample.srt").read_text(encoding="utf-8")
    blocks = parse_srt(content)
    assert len(blocks) >= 1
    assert any("phụ đề" in "\n".join(t) for _, _, t in blocks)
