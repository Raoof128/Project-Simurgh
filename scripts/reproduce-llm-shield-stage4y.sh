#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4Y VDR — verify-only reproduce (offline, byte-stable, Node 26).
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Stage 4Y VDR reproduce (verify-only) =="
node --version

echo "-- 1/6 public-tier verify (map + attestation only, no bytes)"
node tools/simurgh-attestation/stage4y/node/verify-stage4y-attestation.mjs --tier public

echo "-- 2/6 audit-tier verify (byte recompute + shadow replay)"
node tools/simurgh-attestation/stage4y/node/verify-stage4y-attestation.mjs --tier audit

echo "-- 3/6 byte-stability: rebuild fixtures into a scratch dir and diff"
TMP="$(mktemp -d)"
EVID="docs/research/llm-shield/evidence/stage-4y"
node tools/simurgh-attestation/stage4y/node/build-stage4y-fixtures.mjs >/dev/null
git diff --quiet -- "$EVID" && echo "   byte-stable (no diff)" || { echo "   DRIFT in $EVID"; exit 1; }
rm -rf "$TMP"

echo "-- 4/6 Lane B blind two-process recompute"
node tools/simurgh-attestation/stage4y/laneb/run-laneb-recompute-ceremony.mjs

echo "-- 5/6 JS<->Python parity"
if command -v python3 >/dev/null 2>&1; then
  node --test tests/unit/llmShield/stage4y/parity.test.js >/dev/null
  echo "   parity OK"
else
  echo "   python3 not found — parity skipped"
fi

echo "-- 6/6 K7 all-functions net + browser + Lean"
node --test tests/e2e/llmShield/stage4y/k7AllFunctions.test.js tests/e2e/llmShield/stage4y/browserParity.test.js >/dev/null
echo "   K7 + browser OK"
# `lean` exits 0 on a `sorry` — it is a warning, not an error — so a type-check alone can NEVER
# establish "zero sorry", which this script nevertheless claimed. The SOURCE scan is the
# load-bearing check, it needs no toolchain, and it therefore runs UNCONDITIONALLY: an absent
# `lean` downgrades the type-check to a NAMED SKIP and must never downgrade the scan. Delegated to
# the repo-wide gate so one definition of "escape hatch" (sorry/admit/native_decide/axiom/unsafe/
# implemented_by/partial def) is shared with CI rather than a narrower per-script copy that drifts.
if command -v lean >/dev/null 2>&1; then
  node scripts/check-lean-proofs.mjs --root proofs/stage4y --floor 1
  echo "   lean: type-check + escape-hatch scan OK"
else
  node scripts/check-lean-proofs.mjs --root proofs/stage4y --floor 1 --no-typecheck
  echo "   lean absent: escape-hatch scan OK, TYPE-CHECK SKIPPED (stage-4-lean-proofs.yml gates it)"
fi

echo "== Stage 4Y VDR reproduce: PASS =="
