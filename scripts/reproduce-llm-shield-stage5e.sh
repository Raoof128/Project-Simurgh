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

echo "-- 6/6 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)"
# `lean` exits 0 on a `sorry` — it is a warning, not an error — so a type-check alone can NEVER
# establish "zero sorry", which this script nevertheless claimed. The SOURCE scan is the
# load-bearing check, it needs no toolchain, and it therefore runs UNCONDITIONALLY: an absent
# `lean` downgrades the type-check to a NAMED SKIP and must never downgrade the scan. Delegated to
# the repo-wide gate so one definition of "escape hatch" (sorry/admit/native_decide/axiom/unsafe/
# implemented_by/partial def) is shared with CI rather than a narrower per-script copy that drifts.
if command -v lean >/dev/null 2>&1; then
  node scripts/check-lean-proofs.mjs --root proofs/stage5e --floor 1
  echo "   lean: type-check + escape-hatch scan OK"
else
  node scripts/check-lean-proofs.mjs --root proofs/stage5e --floor 1 --no-typecheck
  echo "   lean absent: escape-hatch scan OK, TYPE-CHECK SKIPPED (stage-4-lean-proofs.yml gates it)"
fi

echo "== Stage 5E VDA reproduce: ALL PASS =="
