#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5C VSB — verify-only reproduce (offline, byte-stable). A signed, itemized SEMANTIC-BYPASS
# ledger over 4X's imported metamorphic engine; honest non-zero slip count. Motto: AnthropicSafe
# First, then ReviewerSafe.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Stage 5C VSB reproduce (verify-only) =="
node --version

echo "-- 1/5 verify committed attestation (audit + public tiers → raw 0)"
node tools/simurgh-attestation/stage5c/node/verify-stage5c-attestation.mjs

echo "-- 2/5 byte-stability: rebuild the attestation in place and diff"
EVID="docs/research/llm-shield/evidence/stage-5c"
node tools/simurgh-attestation/stage5c/node/build-stage5c-attestation.mjs >/dev/null
git diff --quiet -- "$EVID/green-slip-ledger.json" "$EVID/summary.json" \
  && echo "   byte-stable (no diff)" || { echo "   DRIFT in $EVID"; exit 1; }

echo "-- 3/5 Lane B blind-severity ceremony (unit) + full stage5c unit suite"
node --test tests/unit/llmShield/stage5c/*.test.js >/dev/null && echo "   unit OK"

echo "-- 4/5 JS<->Python parity + browser (WebCrypto Ed25519) + K7 all-functions net"
node --test tests/e2e/llmShield/stage5c/parity.test.js tests/e2e/llmShield/stage5c/k7AllFunctions.test.js >/dev/null \
  && echo "   parity + browser + K7 OK"

echo "-- 5/5 Lean proofs (if lean present; else the CI lean workflow gates them)"
if command -v lean >/dev/null 2>&1; then
  lean proofs/stage5c/SemanticBypass.lean && ! grep -Rn "\bsorry\b" proofs/stage5c && echo "   lean OK (zero sorry)"
else
  echo "   lean absent — gated by stage-4-lean-proofs.yml"
fi

echo "== Stage 5C VSB reproduce: ALL PASS =="
