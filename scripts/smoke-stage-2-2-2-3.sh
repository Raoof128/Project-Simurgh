#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BASE_PORT="${SIMURGH_STAGE22_23_PORT:-33220}"
HARDENED_PORT="${SIMURGH_STAGE22_23_HARDENED_PORT:-33221}"
LOG_DIR="${SIMURGH_STAGE22_23_LOG_DIR:-.simurgh_check_logs/stage22-23-smoke}"
mkdir -p "$LOG_DIR"

BASE_PID=""
HARDENED_PID=""

cleanup() {
  if [[ -n "$BASE_PID" ]]; then
    kill "$BASE_PID" >/dev/null 2>&1 || true
    wait "$BASE_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$HARDENED_PID" ]]; then
    kill "$HARDENED_PID" >/dev/null 2>&1 || true
    wait "$HARDENED_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# shellcheck source=scripts/lib/smoke-server.sh
source "$SCRIPT_DIR/lib/smoke-server.sh"

assert_no_forbidden() {
  local label="$1"
  local file="$2"
  if grep -Eiq "private_key|window_title|process_name|username|home_directory|serial_number|mac_address|screen_pixels|screenshot|webcam|typed_content|paste_content" "$file"; then
    echo "Smoke failed: $label contains privacy-forbidden output" >&2
    grep -Ein "private_key|window_title|process_name|username|home_directory|serial_number|mac_address|screen_pixels|screenshot|webcam|typed_content|paste_content" "$file" >&2 || true
    return 1
  fi
}

echo "Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge"

node --check tests/e2e/stage22_23_smoke.mjs

BASE_LOG="$LOG_DIR/base-server.log"
HARDENED_LOG="$LOG_DIR/hardened-server.log"
: > "$BASE_LOG"
: > "$HARDENED_LOG"

SIMURGH_DEMO_MODE=1 PORT="$BASE_PORT" node server.js > "$BASE_LOG" 2>&1 &
BASE_PID=$!
SIMURGH_DEMO_MODE=1 SIMURGH_REQUIRE_DAEMON=true PORT="$HARDENED_PORT" node server.js > "$HARDENED_LOG" 2>&1 &
HARDENED_PID=$!

wait_for_health "http://127.0.0.1:$BASE_PORT/health" "$BASE_PID" "$BASE_LOG" "base server"
wait_for_health "http://127.0.0.1:$HARDENED_PORT/health" "$HARDENED_PID" "$HARDENED_LOG" "hardened server"

node tests/e2e/stage22_23_smoke.mjs \
  --base-url "http://127.0.0.1:$BASE_PORT" \
  --hardened-base-url "http://127.0.0.1:$HARDENED_PORT"

node tools/privacy-audit.mjs

if [[ "$(uname)" == "Darwin" ]] && command -v swift >/dev/null 2>&1; then
  (
    cd tools/simurgh-daemon-macos
    swift build
    swift test
    swift run SimurghDaemon --help
  ) > "$LOG_DIR/swift-daemon-lifecycle.txt" 2>&1
  assert_no_forbidden "Swift daemon lifecycle" "$LOG_DIR/swift-daemon-lifecycle.txt"
else
  echo "Skipping macOS-only Swift daemon checks on $(uname)."
fi

echo "Stage 2.2/2.3 E2E smoke passed."
