#!/usr/bin/env bash
# Stage 3A-alpha LLM Shield smoke gate: boots server, runs the fixture corpus with
# a metrics summary, then runs the two focused smokes.
set -euo pipefail

if [[ -n "${SIMURGH_BASE_URL:-}" ]]; then
  BASE="$SIMURGH_BASE_URL"
else
  PORT="${SIMURGH_LLM_SHIELD_SMOKE_PORT:-33041}"
  BASE="http://127.0.0.1:$PORT"
  LOG="${TMPDIR:-/tmp}/simurgh-llm-shield-smoke-$PORT.log"
  SIMURGH_DEMO_MODE=1 \
  SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters" \
  PORT="$PORT" node server.js >"$LOG" 2>&1 &
  PID=$!
  cleanup() { kill "$PID" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  for _ in {1..60}; do
    if curl -sf "$BASE/health" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  curl -sf "$BASE/health" >/dev/null || { echo "server did not start"; tail -80 "$LOG" || true; exit 1; }
fi

node tests/e2e/llm_shield_fixture_runner.mjs "$BASE"
node tests/e2e/llm_shield_direct_jailbreak_smoke.mjs "$BASE"
node tests/e2e/llm_shield_receipt_verify_smoke.mjs "$BASE"
echo ""
echo "smoke-llm-shield: all gates passed"
