#!/bin/bash

set -e

cargo build --release

./target/release/softsub \
  --input tests/fixtures/input/sample.wav \
  --output out.srt

diff tests/fixtures/expected/sample.srt out.srt