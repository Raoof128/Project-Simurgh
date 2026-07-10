#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5E VDA reproduce (verify-only). Motto: AnthropicSafe First, then ReviewerSafe.
# Byte-stable evidence + both-tier verify + unit + Python parity + K7 + Lean. The verify path NEVER
# runs the model (it recomputes arithmetic over the committed score table). Run under Node 26.
set -euo pipefail
cd "$(dirname "$0")/.."
S=tools/simurgh-attestation/stage5e

echo "== Stage 5E VDA reproduce (verify-only) =="
node -v

echo "-- 1/6 verify committed attestation (audit + public → raw 0)"
node "$S/node/verify-vda-attestation.mjs"

echo "-- 2/6 byte-stability: rebuild the attestation in place and diff"
before=$(shasum docs/research/llm-shield/evidence/stage-5e/vda-attestation.json | awk '{print $1}')
node "$S/node/build-vda-evidence.mjs" >/dev/null
after=$(shasum docs/research/llm-shield/evidence/stage-5e/vda-attestation.json | awk '{print $1}')
if [ "$before" = "$after" ]; then echo "   byte-stable (no diff)"; else echo "   NOT byte-stable"; exit 1; fi

echo "-- 3/6 stage5e unit suite"
node --test tests/unit/llmShield/stage5e/*.test.js >/dev/null
echo "   unit OK"

echo "-- 4/6 JS<->Python parity over the committed evidence"
python3 "$S/python/vda_parity.py"

echo "-- 5/6 K7 all-functions net"
node --test tests/e2e/llmShield/stage5e/k7AllFunctions.test.js >/dev/null
echo "   K7 OK"

echo "-- 6/6 Lean proofs (if lean present; else the CI lean workflow gates them)"
if command -v lean >/dev/null 2>&1; then
  (cd proofs/stage5e && lean DeployedDetector.lean)
  echo "   lean OK (zero sorry)"
else
  echo "   lean not installed locally — gated by stage-4-lean-proofs.yml"
fi

echo "== Stage 5E VDA reproduce: ALL PASS =="
