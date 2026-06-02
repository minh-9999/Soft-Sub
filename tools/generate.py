import os
import subprocess
import platform
import sys


def main(input_path, output_path):
    dir_path = os.path.dirname(output_path)

    if dir_path:
        os.makedirs(dir_path, exist_ok=True)

    base_dir = dir_path or "."
    json_path = os.path.join(base_dir, "temp_words.json")

    # 1. run whisper.cpp
    candidates = [
        os.path.join("whisper.cpp", "whisper-cli.exe"),
        os.path.join("whisper.cpp", "main.exe"),
    ]

    WHISPER_BIN = next((p for p in candidates if os.path.exists(p)), None)

    if not WHISPER_BIN:
        raise RuntimeError(f"Missing whisper binary in whisper.cpp")

    subprocess.run([WHISPER_BIN, "-f", input_path, "-oj", json_path], check=True)

    # 2. call make_srt.py
    subprocess.run(["python", "tools/make_srt.py", json_path, output_path], check=True)


if __name__ == "__main__":

    main(sys.argv[1], sys.argv[2])
