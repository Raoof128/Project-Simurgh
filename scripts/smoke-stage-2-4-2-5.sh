#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

OPTIONAL_PORT="${SIMURGH_SMOKE_PORT:-33100}"
HARDENED_PORT="${SIMURGH_SMOKE_HARDENED_PORT:-33101}"
DAEMON_PORT="${SIMURGH_SMOKE_DAEMON_PORT:-3031}"
LOG_DIR="${SIMURGH_SMOKE_LOG_DIR:-.simurgh_check_logs/stage24-25-smoke}"
mkdir -p "$LOG_DIR"

OPTIONAL_PID=""
HARDENED_PID=""
DAEMON_PID=""

cleanup() {
  if [[ -n "$DAEMON_PID" ]]; then
    curl -s -m 1 -X POST "http://127.0.0.1:$DAEMON_PORT/shutdown" >/dev/null 2>&1 || true
    kill "$DAEMON_PID" >/dev/null 2>&1 || true
    wait "$DAEMON_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$OPTIONAL_PID" ]]; then
    kill "$OPTIONAL_PID" >/dev/null 2>&1 || true
    wait "$OPTIONAL_PID" >/dev/null 2>&1 || true
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
  if grep -Eiq "private_key|secret|token|window_title|process_name|username|home_directory|serial_number|mac_address|screen_pixels|screenshot|webcam|typed_content|paste_content" "$file"; then
    echo "Smoke failed: $label contains privacy-forbidden output" >&2
    grep -Ein "private_key|secret|token|window_title|process_name|username|home_directory|serial_number|mac_address|screen_pixels|screenshot|webcam|typed_content|paste_content" "$file" >&2 || true
    return 1
  fi
}

echo "Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof"

node --check public/sdk/simurgh-browser-sdk.js
node --check tests/e2e/stage24_25_smoke.mjs
grep -q "simurgh-browser-sdk.js" public/index.html

OPTIONAL_LOG="$LOG_DIR/optional-server.log"
HARDENED_LOG="$LOG_DIR/hardened-server.log"
: > "$OPTIONAL_LOG"
: > "$HARDENED_LOG"

SIMURGH_DEMO_MODE=1 PORT="$OPTIONAL_PORT" node server.js > "$OPTIONAL_LOG" 2>&1 &
OPTIONAL_PID=$!
SIMURGH_DEMO_MODE=1 SIMURGH_REQUIRE_DAEMON=true PORT="$HARDENED_PORT" node server.js > "$HARDENED_LOG" 2>&1 &
HARDENED_PID=$!

wait_for_health "http://127.0.0.1:$OPTIONAL_PORT/health" "$OPTIONAL_PID" "$OPTIONAL_LOG" "daemon-optional server"
wait_for_health "http://127.0.0.1:$HARDENED_PORT/health" "$HARDENED_PID" "$HARDENED_LOG" "daemon-required server"

node tests/e2e/stage24_25_smoke.mjs \
  --base-url "http://127.0.0.1:$OPTIONAL_PORT" \
  --hardened-base-url "http://127.0.0.1:$HARDENED_PORT"

node tools/privacy-audit.mjs
if [[ -d data || -d logs || -d "$LOG_DIR" ]]; then
  GENERATED_HITS=$(grep -RniE "process_name|window_title|username|home_directory|serial_number|mac_address|screen_pixels|screenshot|webcam|typed_content|paste_content" \
    data logs "$LOG_DIR" 2>/dev/null || true)
  if [[ -n "$GENERATED_HITS" ]]; then
    echo "Smoke failed: generated data/log privacy sweep found forbidden local-data terms" >&2
    echo "$GENERATED_HITS" >&2
    exit 1
  fi
fi

if [[ "$(uname)" == "Darwin" ]] && command -v swift >/dev/null 2>&1; then
  echo "Running macOS daemon lifecycle smoke..."
  (
    cd tools/simurgh-daemon-macos
    swift build
    swift test
  )

  DAEMON_LOG="$LOG_DIR/daemon.log"
  : > "$DAEMON_LOG"
  (
    cd tools/simurgh-daemon-macos
    swift run SimurghDaemon start --port "$DAEMON_PORT" --allowed-origin "http://127.0.0.1:$OPTIONAL_PORT"
  ) > "$DAEMON_LOG" 2>&1 &
  DAEMON_PID=$!

  wait_for_health "http://127.0.0.1:$DAEMON_PORT/health" "macOS daemon" "$DAEMON_LOG"
  curl -s -m 2 "http://127.0.0.1:$DAEMON_PORT/status" > "$LOG_DIR/daemon-status.json"
  grep -q '"ok":true' "$LOG_DIR/daemon-status.json"
  grep -q '"platform":"macos"' "$LOG_DIR/daemon-status.json"
  grep -q '"capture_excluded_window_count"' "$LOG_DIR/daemon-status.json"
  assert_no_forbidden "daemon /status" "$LOG_DIR/daemon-status.json"

  (
    cd tools/simurgh-daemon-macos
    swift run SimurghDaemon doctor --port "$DAEMON_PORT" --server-base-url "http://127.0.0.1:$OPTIONAL_PORT"
  ) > "$LOG_DIR/daemon-doctor.txt"
  assert_no_forbidden "daemon doctor" "$LOG_DIR/daemon-doctor.txt"

  grep -qi "development-only" tools/simurgh-daemon-macos/scripts/install-launch-agent.sh
  grep -qi "development-only" tools/simurgh-daemon-macos/scripts/uninstall-launch-agent.sh
  if command -v plutil >/dev/null 2>&1; then
    plutil -lint tools/simurgh-daemon-macos/launchd/dev.raouf.simurgh.daemon.plist >/dev/null
  fi
else
  echo "Skipping macOS-only daemon lifecycle smoke on $(uname)."
fi

echo "Stage 2.4/2.5 E2E smoke passed."
