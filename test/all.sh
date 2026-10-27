#!/usr/bin/env bash
# Starts the mock servers, runs headless Chrome test pages, prints their reports.
#   test/all.sh                       # offline suite (mock servers only)
#   test/all.sh live 60 "src=URL&src=URL2"   # real stations
cd "$(dirname "$0")/.."
log=$(mktemp)
python3 test/mock-server.py >"$log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null; rm -f "$log"' EXIT
sleep 1
npx --yes esbuild@0.28.2 test/parsers.test.js --bundle --platform=node --log-level=warning | node
if [ $# -gt 0 ]; then
  test/run.sh "$@"
else
  UPSTREAM=http://127.0.0.1:8092 PORT=8093 timeout 150 node proxy/proxy.js >/dev/null &
  for t in proxy:13 playback:24 metadata:14 visualizer:32 iframe:8; do test/run.sh "${t%%:*}" "${t##*:}"; done
fi
grep -v '^mock servers' "$log" | sed 's/^REPORT //'
