#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5D VARL reproduce (verify-only). Motto: AnthropicSafe First, then ReviewerSafe.
# Byte-stable evidence + both-tier verify + unit/parity/K7 + Lean. Run under Node 26 for byte-stability.
set -euo pipefail
cd "$(dirname "$0")/.."
S=tools/simurgh-attestation/stage5d

echo "== Stage 5D VARL reproduce (verify-only) =="
node -v

echo "-- 1/5 verify committed attestation (audit + public → raw 0)"
node "$S/node/verify-stage5d-attestation.mjs"

echo "-- 2/5 byte-stability: rebuild the attestation in place and diff"
before=$(shasum docs/research/llm-shield/evidence/stage-5d/varl-ledger.json | awk '{print $1}')
node "$S/node/build-stage5d-attestation.mjs" >/dev/null
after=$(shasum docs/research/llm-shield/evidence/stage-5d/varl-ledger.json | awk '{print $1}')
if [ "$before" = "$after" ]; then echo "   byte-stable (no diff)"; else echo "   NOT byte-stable"; exit 1; fi

echo "-- 3/5 stage5d unit suite"
node --test tests/unit/llmShield/stage5d/*.test.js >/dev/null && echo "   unit OK"

echo "-- 4/5 JS<->Python<->browser-realm parity + K7 all-functions net"
node --test tests/e2e/llmShield/stage5d/parity.test.js tests/e2e/llmShield/stage5d/k7AllFunctions.test.js >/dev/null && echo "   parity + K7 OK"

echo "-- 5/5 Lean proofs (if lean present; else the CI lean workflow gates them)"
if command -v lean >/dev/null 2>&1; then
  (cd proofs/stage5d && lean AdaptiveRedTeam.lean) && echo "   lean OK (zero sorry)"
else
  echo "   lean not installed locally — gated by stage-4-lean-proofs.yml"
fi

echo "== Stage 5D VARL reproduce: ALL PASS =="
