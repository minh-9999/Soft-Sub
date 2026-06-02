#!/usr/bin/env python3
import json
import sys

def seconds(ts):
    return float(ts)

def format_time(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    ms = int((s - int(s)) * 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"

def make_srt(words, max_chars=42, max_duration=4.0):
    subs = []
    cur = []
    cur_start = None
    cur_end = None
    for w in words:
        txt   = w.get('word', '').strip()
        start = w.get('start')
        end   = w.get('end')
        if not txt or start is None or end is None:
            continue  # Skip invalid entries

        start = seconds(start)
        end   = seconds(end)
        if cur_start is None:
            cur_start = start
        cur_end = end
        cur.append(txt)
        if len(" ".join(cur)) > max_chars or (cur_end - cur_start) > max_duration:
            subs.append((cur_start, cur_end, " ".join(cur)))
            cur = []
            cur_start = None
            cur_end = None
    if cur:
        subs.append((cur_start, cur_end, " ".join(cur)))
    return subs

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: make_srt.py word_timestamps.json out.srt")
        sys.exit(1)
    jpath = sys.argv[1]
    out = sys.argv[2]
    data = json.load(open(jpath, 'r', encoding='utf-8'))
    words = data.get('words', [])
    subs = make_srt(words)
    with open(out, 'w', encoding='utf-8') as f:
        for i, (s,e,text) in enumerate(subs,1):
            f.write(f"{i}\n")
            f.write(f"{format_time(s)} --> {format_time(e)}\n")
            f.write(text + "\n\n")
    print(f"Wrote {out}")
