#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
PORT="${SIMURGH_STAGE3X_PORT:-33220}"
LOG_DIR="${SIMURGH_STAGE3X_LOG_DIR:-.simurgh_check_logs/stage3x-smoke}"
mkdir -p "$LOG_DIR"
SRV_PID=""
cleanup() { [[ -n "$SRV_PID" ]] && {
  kill "$SRV_PID" 2>/dev/null || true
  wait "$SRV_PID" 2>/dev/null || true
}; }
trap cleanup EXIT
# shellcheck source=scripts/lib/smoke-server.sh
source "$SCRIPT_DIR/lib/smoke-server.sh"

echo "LLM Shield 3X public-VCA-timeline smoke"
node --check tools/simurgh-attestation/build-3x-timeline.mjs
boot_server "$PORT" "$LOG_DIR/server.log" "Stage 3X server" -- \
  env SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js
SRV_PID="$BOOTED_PID"

node tools/simurgh-attestation/build-3x-timeline.mjs verify
node tools/simurgh-attestation/build-3x-timeline.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3x-timeline.mjs >/dev/null
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce >/dev/null
node tests/e2e/llm_shield_stage3x_tamper_runner.mjs >/dev/null
echo "stage3x smoke: passed"
