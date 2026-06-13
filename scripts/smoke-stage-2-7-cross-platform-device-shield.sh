#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PORT="${SIMURGH_STAGE27_PORT:-33127}"
LOG_DIR="${SIMURGH_SMOKE_LOG_DIR:-.simurgh_check_logs/stage27-cross-platform}"
LOG_FILE="$LOG_DIR/server.log"
PID=""
mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

cleanup() {
  if [[ -n "$PID" ]]; then
    kill "$PID" >/dev/null 2>&1 || true
    wait "$PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

wait_for_health() {
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
    if curl -s -m 1 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "Stage 2.7 smoke failed: server did not become healthy" >&2
  tail -40 "$LOG_FILE" >&2 || true
  return 1
}

echo "Stage 2.7 cross-platform Device Shield smoke"
node --check tests/e2e/stage27_cross_platform_device_shield_smoke.mjs
SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js > "$LOG_FILE" 2>&1 &
PID=$!
wait_for_health
node tests/e2e/stage27_cross_platform_device_shield_smoke.mjs "http://127.0.0.1:$PORT"
node tools/privacy-audit.mjs
echo "Stage 2.7 cross-platform Device Shield smoke: pass"
