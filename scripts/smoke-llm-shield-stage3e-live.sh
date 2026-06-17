#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3E-live smoke. The disabled smoke runs against a shared no-live-env server;
# the env-specific live smokes self-boot their own server child. No network: live
# smokes fail closed or skip before any provider call.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${SIMURGH_LLM_SHIELD_STAGE3E_LIVE_PORT:-33057}"
BASE="http://127.0.0.1:$PORT"
LOG="${TMPDIR:-/tmp}/simurgh-llm-shield-stage3e-live-$PORT.log"
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters" PORT="$PORT" node server.js >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT
for _ in {1..60}; do curl -sf "$BASE/health" >/dev/null 2>&1 && break; sleep 0.25; done
curl -sf "$BASE/health" >/dev/null || {
  echo "server did not start"
  tail -80 "$LOG"
  exit 1
}

node tests/e2e/llm_shield_stage3e_live_disabled_smoke.mjs "$BASE"
node tests/e2e/llm_shield_stage3e_live_missing_key_smoke.mjs
node tests/e2e/llm_shield_stage3e_live_context_rejected_smoke.mjs
node tests/e2e/llm_shield_stage3e_live_rate_limit_smoke.mjs
node tests/e2e/llm_shield_stage3e_live_optional_anthropic_smoke.mjs
node tests/e2e/llm_shield_stage3e_live_fixture_runner.mjs --metrics
echo ""
echo "smoke-llm-shield-stage3e-live: passed"
