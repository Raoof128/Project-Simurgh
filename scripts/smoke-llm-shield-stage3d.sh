#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3D smoke: boot server once, run all 3D e2e smokes + the fixture runner.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${SIMURGH_LLM_SHIELD_STAGE3D_PORT:-33049}"
BASE="http://127.0.0.1:$PORT"
LOG="${TMPDIR:-/tmp}/simurgh-llm-shield-stage3d-$PORT.log"
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters" PORT="$PORT" node server.js >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT
for _ in {1..60}; do curl -sf "$BASE/health" >/dev/null 2>&1 && break; sleep 0.25; done
curl -sf "$BASE/health" >/dev/null || {
  echo "server did not start"
  tail -80 "$LOG"
  exit 1
}

node tests/e2e/llm_shield_stage3d_activation_smoke.mjs "$BASE"
node tests/e2e/llm_shield_stage3d_context_smoke.mjs "$BASE"
node tests/e2e/llm_shield_stage3d_tool_gate_smoke.mjs "$BASE"
node tests/e2e/llm_shield_stage3d_output_firewall_smoke.mjs "$BASE"
node tests/e2e/llm_shield_stage3d_risk_smoke.mjs "$BASE"
node tests/e2e/llm_shield_stage3d_fixture_runner.mjs
echo ""
echo "smoke-llm-shield-stage3d: passed"
