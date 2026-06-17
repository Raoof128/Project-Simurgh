#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3E-core security audit: no-network, live-fail-closed, no-injection boundaries.
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

# Static: 3A/3B/3C and 3D receipts untouched.
grep -q 'simurgh.llm_safety_receipt.v1' src/llmShield/safetyReceipt.js && grep -q '"3C"' src/llmShield/safetyReceipt.js &&
  ok "3A/3B/3C receipt schema preserved" || no "3A/3B/3C receipt schema changed"
grep -q '"3D"' src/llmShield/stage3dReceipt.js && ok "3D receipt schema preserved" || no "3D receipt schema changed"

# Static: no STATIC provider-SDK import and no network primitives under gateway/.
# (Stage 3E-live adds the Anthropic adapter, which uses a guarded DYNAMIC
# import("@anthropic-ai/sdk"); the dedicated 3E-live security audit asserts that
# dynamic import is confined to anthropicProviderAdapter.js. Here we only forbid
# STATIC SDK imports + network calls anywhere under gateway/.)
# Match real imports / network calls, NOT the forbidden-field denylist strings
# (e.g. "openai_api_key" is a rejected field name, not an import).
if grep -RInE "from \"(@anthropic-ai/sdk|openai|node-fetch|axios)\"|node:https?|[^a-z_]fetch\(" src/llmShield/gateway/ >/dev/null; then
  no "gateway module statically imports a network/provider SDK"
else
  ok "no static network/provider SDK imports under gateway/"
fi

# Static: mount order — gateway registered before base router.
GW_LINE=$(grep -n '"/api/llm-shield/gateway"' server.js | head -1 | cut -d: -f1)
BASE_LINE=$(grep -n '"/api/llm-shield", llmShieldRouter' server.js | head -1 | cut -d: -f1)
if [ -n "$GW_LINE" ] && [ -n "$BASE_LINE" ] && [ "$GW_LINE" -lt "$BASE_LINE" ]; then
  ok "gateway router mounted before base router"
else
  no "gateway mount order wrong (gw=$GW_LINE base=$BASE_LINE)"
fi

# Static: recorded fixtures all synthetic + hash-stamped.
if node --input-type=module - <<'NODE'
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { hashPrompt } from "./src/llmShield/promptNormalise.js";
const dirs = ["recorded_fixture", "provider_error", "output_firewall", "tool_request"];
const ROOT = "docs/research/llm-shield/evidence/stage-3e/fixtures";
for (const d of dirs) {
  for (const f of await readdir(join(ROOT, d))) {
    if (!f.endsWith(".json")) continue;
    const fx = JSON.parse(await readFile(join(ROOT, d, f), "utf8"));
    if (fx.provenance !== "synthetic") { console.error("non-synthetic " + f); process.exit(1); }
    if (hashPrompt(fx.synthetic_provider_output) !== fx.provider_output_hash) { console.error("hash mismatch " + f); process.exit(1); }
  }
}
NODE
then ok "recorded fixtures synthetic + hash-stamped"; else no "recorded fixtures provenance/hash invalid"; fi

# Live boundary checks (boot server).
PORT="${SIMURGH_LLM_SHIELD_STAGE3E_AUDIT_PORT:-33056}"
BASE="http://127.0.0.1:$PORT"
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="audit-secret-32-characters-long-xx" PORT="$PORT" node server.js >/tmp/llm-3e-audit.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in {1..60}; do curl -sf "$BASE/health" >/dev/null 2>&1 && break; sleep 0.25; done
S=$(curl -sf -X POST "$BASE/api/llm-shield/gateway/sessions" -H "Content-Type: application/json" -d '{}')
SID=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).session_id))")
TOK=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
post() { curl -s -X POST "$BASE/api/llm-shield/gateway/$SID/run" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" -d "$1"; }

# Stage 3E-live: live is disabled by default (this audit's server runs without the
# live env), so the fail-closed reason is now gateway_live_provider_disabled.
echo "$(post '{"input":"x","provider_mode":"live","provider":"anthropic"}')" | grep -q "gateway_live_provider_disabled" &&
  ok "live fails closed (disabled by default)" || no "live not fail-closed"
echo "$(post '{"input":"x","provider_mode":"mock","api_key":"sk-x"}')" | grep -q "gateway_forbidden_field" &&
  ok "api_key rejected" || no "api_key not rejected"
echo "$(post '{"input":"x","provider_mode":"mock","provider_response_body":"y"}')" | grep -q "gateway_forbidden_field" &&
  ok "provider_response_body rejected" || no "provider_response_body not rejected"
echo "$(post '{"input":"x","provider_mode":"recorded_fixture","provider":"recorded_fixture","case_id":"../x"}')" | grep -q "gateway_fixture_selector_invalid" &&
  ok "path-like fixture selector rejected" || no "path selector not rejected"
echo "$(post '{"input":"x","provider_mode":"mock","provider":"mock","scenario":"tool_escalation"}')" | grep -q '"tool_gate_verdict":"blocked"' &&
  ok "tool escalation blocked" || no "tool escalation not blocked"
echo "$(post '{"input":"x","provider_mode":"mock","provider":"mock","scenario":"policy_leak"}')" | grep -q '"output_firewall_verdict":"blocked"' &&
  ok "output leakage blocked" || no "output leakage not blocked"
echo "$(curl -sf -H "Authorization: Bearer $TOK" "$BASE/api/llm-shield/gateway/$SID/verify")" | grep -q '"valid":true' &&
  ok "audit chain verifies" || no "audit chain failed"

# Docker non-root + dockerignore.
grep -q "^USER node" Dockerfile.gateway && ok "Dockerfile uses non-root USER" || no "Dockerfile not non-root"
grep -q "^.env$" .dockerignore && ok ".dockerignore excludes .env" || no ".dockerignore missing .env"

echo ""
echo "security-audit-llm-shield-stage3e: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
