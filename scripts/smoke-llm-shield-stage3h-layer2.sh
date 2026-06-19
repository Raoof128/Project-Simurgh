#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="docs/research/llm-shield/evidence/stage-3h-layer2"
SAMPLE="$OUT/sample-manifest.json"
PORT="${SIMURGH_STAGE3H_LAYER2_PORT:-33059}"
BASE="http://127.0.0.1:$PORT"
GATEWAY_BASE="$BASE/api/llm-shield/gateway"
LOG_FILE="${TMPDIR:-/tmp}/simurgh-stage3h-layer2-$PORT.log"

SIMURGH_DEMO_MODE=1 \
  SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters" \
  PORT="$PORT" \
  node server.js >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..60}; do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
curl -fsS "$BASE/health" >/dev/null || {
  echo "server did not start"
  tail -80 "$LOG_FILE"
  exit 1
}

cd tools/agentdojo-simurgh-adapter
SIMURGH_GATEWAY_BASE_URL="$GATEWAY_BASE" \
  .venv/bin/python -m simurgh_agentdojo_adapter.layer2_runner \
  --sample-manifest "../../$SAMPLE" \
  --out "../../$OUT"
cd ../..

node scripts/consistency-audit-llm-shield-stage3h-layer2.mjs
node scripts/privacy-audit-llm-shield-stage3h-layer2.mjs
echo "stage3h-layer2 smoke: passed"
