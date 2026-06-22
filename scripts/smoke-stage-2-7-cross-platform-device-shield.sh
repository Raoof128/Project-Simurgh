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

# shellcheck source=scripts/lib/smoke-server.sh
source "$SCRIPT_DIR/lib/smoke-server.sh"

echo "Stage 2.7 cross-platform Device Shield smoke"
node --check tests/e2e/stage27_cross_platform_device_shield_smoke.mjs
boot_server "$PORT" "$LOG_FILE" "Stage 2.7 server" -- \
  env SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js
PID="$BOOTED_PID"
node tests/e2e/stage27_cross_platform_device_shield_smoke.mjs "http://127.0.0.1:$PORT"
node tools/privacy-audit.mjs
echo "Stage 2.7 cross-platform Device Shield smoke: pass"
