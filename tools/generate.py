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
    ext = ".exe" if platform.system() == "Windows" else ""
    WHISPER_BIN = os.path.join("whisper.cpp", f"whisper-cli{ext}")

    if not os.path.exists(WHISPER_BIN):
        raise RuntimeError(f"Whisper binary not found: {WHISPER_BIN}")

    subprocess.run([WHISPER_BIN, "-f", input_path, "-oj", json_path], check=True)

    # 2. call make_srt.py
    subprocess.run(["python", "tools/make_srt.py", json_path, output_path], check=True)


if __name__ == "__main__":

    main(sys.argv[1], sys.argv[2])
