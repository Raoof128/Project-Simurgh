#!/usr/bin/env bash
# Stage 5O §7.3.8 item 4 — run the browser parity page in a real headless browser (offline, no-egress
# CSP) and assert RESULT:PASS. Regenerates parity.html from the portable module + committed vectors.
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
node "$DIR/emit-parity-html.mjs" > "$DIR/parity.html"
CHROME="${SIMURGH_CHROME:-$HOME/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing}"
# A missing browser must report a DISTINCT skip, never an undifferentiated green: the Node-WebCrypto
# parity test is byte-identical evidence for the crypto but is NOT a real-browser execution.
if [ ! -f "$CHROME" ]; then echo "SKIP / BROWSER PARITY NOT EXECUTED (no Chrome-for-Testing; set SIMURGH_CHROME)"; exit 2; fi
OUT=$(timeout 45 "$CHROME" --headless --disable-gpu --no-sandbox --dump-dom \
  "file://$DIR/parity.html" 2>/dev/null | grep -oE 'RESULT:[A-Z]+[^<]*' | head -1)
pkill -f "Google Chrome for Testing" 2>/dev/null
echo "$OUT"
case "$OUT" in RESULT:PASS*) echo "browser parity OK"; exit 0;; *) echo "browser parity FAILED"; exit 1;; esac
