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
node --test tests/unit/llmShield/stage5d/*.test.js >/dev/null
echo "   unit OK"

echo "-- 4/5 JS<->Python<->browser-realm parity + K7 all-functions net"
node --test tests/e2e/llmShield/stage5d/parity.test.js tests/e2e/llmShield/stage5d/k7AllFunctions.test.js >/dev/null
echo "   parity + K7 OK"

echo "-- 5/5 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)"
# `lean` exits 0 on a `sorry` — it is a warning, not an error — so a type-check alone can NEVER
# establish "zero sorry", which this script nevertheless claimed. The SOURCE scan is the
# load-bearing check, it needs no toolchain, and it therefore runs UNCONDITIONALLY: an absent
# `lean` downgrades the type-check to a NAMED SKIP and must never downgrade the scan. Delegated to
# the repo-wide gate so one definition of "escape hatch" (sorry/admit/native_decide/axiom/unsafe/
# implemented_by/partial def) is shared with CI rather than a narrower per-script copy that drifts.
if command -v lean >/dev/null 2>&1; then
  node scripts/check-lean-proofs.mjs --root proofs/stage5d --floor 1
  echo "   lean: type-check + escape-hatch scan OK"
else
  node scripts/check-lean-proofs.mjs --root proofs/stage5d --floor 1 --no-typecheck
  echo "   lean absent: escape-hatch scan OK, TYPE-CHECK SKIPPED (stage-4-lean-proofs.yml gates it)"
fi

echo "== Stage 5D VARL reproduce: ALL PASS =="
