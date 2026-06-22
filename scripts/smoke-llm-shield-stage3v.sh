#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
PORT="${SIMURGH_STAGE3V_PORT:-33190}" # inside the reserved 33000-33999 band
LOG_DIR="${SIMURGH_STAGE3V_LOG_DIR:-.simurgh_check_logs/stage3v-smoke}"
mkdir -p "$LOG_DIR"
SRV_PID=""
cleanup() { [[ -n "$SRV_PID" ]] && {
  kill "$SRV_PID" 2>/dev/null || true
  wait "$SRV_PID" 2>/dev/null || true
}; }
trap cleanup EXIT
# shellcheck source=scripts/lib/smoke-server.sh
source "$SCRIPT_DIR/lib/smoke-server.sh"

echo "LLM Shield 3V-A external-defence attestation smoke"
node --check tests/e2e/llm_shield_stage3v_external_defense_runner.mjs
boot_server "$PORT" "$LOG_DIR/server.log" "Stage 3V server" -- \
  env SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js
SRV_PID="$BOOTED_PID" # health-gates the demo server like sibling smokes; 3V itself is offline

node tests/e2e/llm_shield_stage3v_external_defense_runner.mjs verify
node tests/e2e/llm_shield_stage3v_external_defense_runner.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3v-external-defense.mjs >/dev/null
node tools/simurgh-attestation/verify-stage3v-external-defense.mjs --reproduce >/dev/null
node tests/e2e/llm_shield_stage3v_tamper_runner.mjs >/dev/null
echo "stage3v smoke: passed"
