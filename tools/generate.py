import os

def main(input_path, output_path):
    dir_path = os.path.dirname(output_path)

    if dir_path:
        os.makedirs(dir_path, exist_ok=True)