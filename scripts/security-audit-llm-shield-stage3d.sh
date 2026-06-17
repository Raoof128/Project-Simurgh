#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3D security audit: additive-activation + no-output-injection boundaries.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PASS=0
FAIL=0
ok() {
  echo "[PASS] $1"
  PASS=$((PASS + 1))
}
no() {
  echo "[FAIL] $1"
  FAIL=$((FAIL + 1))
}

# Static: safetyReceipt.js (3A/3B/3C) is untouched — still v1 + 3C.
if grep -q 'simurgh.llm_safety_receipt.v1' src/llmShield/safetyReceipt.js &&
  grep -q '"3C"' src/llmShield/safetyReceipt.js; then
  ok "3A/3B/3C receipt schema preserved"
else
  no "3A/3B/3C receipt schema changed"
fi

# Static: mock-only modules import no network/provider SDK.
if grep -RInE "anthropic|openai|node:https?|node-fetch|axios" \
  src/llmShield/stage3dMockScenarios.js \
  src/llmShield/toolInvocationGate.js \
  src/llmShield/outputLeakageFirewall.js >/dev/null; then
  no "mock-only module imports a network/provider SDK"
else
  ok "mock-only modules import no network/provider SDK"
fi

PORT="${SIMURGH_LLM_SHIELD_STAGE3D_AUDIT_PORT:-33050}"
BASE="http://127.0.0.1:$PORT"
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="audit-secret-32-characters-long-xx" PORT="$PORT" node server.js >/tmp/llm-3d-audit.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in {1..60}; do curl -sf "$BASE/health" >/dev/null 2>&1 && break; sleep 0.25; done

S=$(curl -sf -X POST "$BASE/api/llm-shield/sessions" -H "Content-Type: application/json" -d '{}')
SID=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).session_id))")
TOK=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).session_token))")
post() { curl -sf -X POST "$BASE/api/llm-shield/$SID/run" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" -d "$1"; }
# Non-failing variant for negative checks that intentionally return HTTP 4xx.
postraw() { curl -s -X POST "$BASE/api/llm-shield/$SID/run" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" -d "$1"; }

# Plain {input} keeps the 3C receipt (no 3D drift).
echo "$(post '{"task_type":"summarise","input":"hello"}')" | grep -q '"schema_version":"3C"' &&
  ok "plain input keeps 3C receipt" || no "plain input drifted to 3D"

# stage3d:true emits a 3D receipt with default benign scenario.
R=$(post '{"input":"hello","stage3d":true}')
if echo "$R" | grep -q '"schema_version":"3D"' && echo "$R" | grep -q '"scenario":"benign"'; then
  ok "stage3d default benign emits 3D receipt"
else
  no "stage3d default benign path wrong"
fi

# HTTP route rejects mock_provider_output (HTTP 400).
echo "$(postraw '{"input":"x","stage3d":true,"mock_provider_output":"leak"}')" | grep -q "mock_provider_output_http_rejected" &&
  ok "HTTP rejects mock_provider_output" || no "HTTP accepted mock_provider_output"

# Unknown scenario rejected (HTTP 400).
echo "$(postraw '{"input":"x","scenario":"nope"}')" | grep -q "scenario_not_allowed" &&
  ok "unknown scenario rejected" || no "unknown scenario accepted"

# Tool escalation blocked, never executed.
echo "$(post '{"input":"x","scenario":"tool_escalation"}')" | grep -q '"tool_gate_verdict":"blocked"' &&
  ok "tool escalation blocked" || no "tool escalation not blocked"

# Output leakage blocked before export.
echo "$(post '{"input":"x","scenario":"policy_leak"}')" | grep -q '"output_firewall_verdict":"blocked"' &&
  ok "output leakage blocked" || no "output leakage not blocked"

# Audit chain verifies after a 3D run.
echo "$(curl -sf -H "Authorization: Bearer $TOK" "$BASE/api/llm-shield/$SID/verify")" | grep -q '"valid":true' &&
  ok "audit chain verifies after 3D runs" || no "audit chain failed"

echo ""
echo "security-audit-llm-shield-stage3d: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
