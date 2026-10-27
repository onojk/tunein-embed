#!/usr/bin/env bash
# Runs a test page in headless Chrome against test/mock-server.py (start that first).
# Usage: test/run.sh playback [seconds] [query-string]
page=${1:-playback}
secs=${2:-25}
profile=$(mktemp -d)
timeout "$secs" google-chrome --headless=new --no-first-run --user-data-dir="$profile" \
  --autoplay-policy=no-user-gesture-required --mute-audio \
  "http://localhost:8090/test/$page.html${3:+?$3}" >/dev/null 2>&1
rm -rf "$profile"
