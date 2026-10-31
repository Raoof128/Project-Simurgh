#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3H smoke: boot server once, run the canary dry-run through the real gateway.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${SIMURGH_LLM_SHIELD_STAGE3H_PORT:-33058}"
BASE="http://127.0.0.1:$PORT"
LOG="${TMPDIR:-/tmp}/simurgh-llm-shield-stage3h-$PORT.log"
# SIMURGH_GATEWAY_EXPORT_GUARD=0: this smoke replays the frozen Stage 3H fixture corpus on one
# gateway session and asserts the frozen router's own verdicts, which never gated on cumulative
# risk. The maintained conductor withholds such exports by default (audit B-2, 31 October 2026).
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters" SIMURGH_GATEWAY_EXPORT_GUARD=0 PORT="$PORT" node server.js >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT
for _ in {1..60}; do curl -sf "$BASE/health" >/dev/null 2>&1 && break; sleep 0.25; done
curl -sf "$BASE/health" >/dev/null || {
  echo "server did not start"
  tail -80 "$LOG"
  exit 1
}
node tests/e2e/llm_shield_stage3h_agentdojo_adapter_smoke.mjs "$BASE"
echo "smoke-llm-shield-stage3h: passed"
