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
node --test tests/unit/llmShield/stage5c/*.test.js >/dev/null
echo "   unit OK"

echo "-- 4/5 JS<->Python parity + browser (WebCrypto Ed25519) + K7 all-functions net"
node --test tests/e2e/llmShield/stage5c/parity.test.js tests/e2e/llmShield/stage5c/k7AllFunctions.test.js >/dev/null
echo "   parity + browser + K7 OK"

echo "-- 5/5 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)"
# `lean` exits 0 on a `sorry` — it is a warning, not an error — so a type-check alone can NEVER
# establish "zero sorry", which this script nevertheless claimed. The SOURCE scan is the
# load-bearing check, it needs no toolchain, and it therefore runs UNCONDITIONALLY: an absent
# `lean` downgrades the type-check to a NAMED SKIP and must never downgrade the scan. Delegated to
# the repo-wide gate so one definition of "escape hatch" (sorry/admit/native_decide/axiom/unsafe/
# implemented_by/partial def) is shared with CI rather than a narrower per-script copy that drifts.
if command -v lean >/dev/null 2>&1; then
  node scripts/check-lean-proofs.mjs --root proofs/stage5c --floor 1
  echo "   lean: type-check + escape-hatch scan OK"
else
  node scripts/check-lean-proofs.mjs --root proofs/stage5c --floor 1 --no-typecheck
  echo "   lean absent: escape-hatch scan OK, TYPE-CHECK SKIPPED (stage-4-lean-proofs.yml gates it)"
fi

echo "== Stage 5C VSB reproduce: ALL PASS =="
