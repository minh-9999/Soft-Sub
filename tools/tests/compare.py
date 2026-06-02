import difflib
import sys

expected = open(sys.argv[1]).read()
actual = open(sys.argv[2]).read()

score = difflib.SequenceMatcher(None, expected, actual).ratio()

print("score:", score)

if score < 0.95:
    raise SystemExit("REGRESSION DETECTED")