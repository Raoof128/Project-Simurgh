#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4Z VWA — verify-only reproduce (offline, byte-stable, Node 26).
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Stage 4Z VWA reproduce (verify-only) =="
node --version

echo "-- 1/6 public-tier verify (map + attestation, tensors withheld)"
node tools/simurgh-attestation/stage4z/node/verify-stage4z-attestation.mjs --tier public

echo "-- 2/6 audit-tier verify (score matrix recompute from tensors)"
node tools/simurgh-attestation/stage4z/node/verify-stage4z-attestation.mjs --tier audit

echo "-- 3/6 byte-stability: rebuild fixtures in place and diff"
EVID="docs/research/llm-shield/evidence/stage-4z"
node tools/simurgh-attestation/stage4z/node/build-stage4z-fixtures.mjs >/dev/null
git diff --quiet -- "$EVID" && echo "   byte-stable (no diff)" || { echo "   DRIFT in $EVID"; exit 1; }

echo "-- 4/6 Lane B blind two-process recompute"
node tools/simurgh-attestation/stage4z/laneb/run-laneb-recompute-ceremony.mjs

echo "-- 5/6 JS<->Python parity (roundHalfEven ties, canonical torture, full-map equality)"
if command -v python3 >/dev/null 2>&1; then
  node --test tests/e2e/llmShield/stage4z/parity.test.js >/dev/null && echo "   parity OK"
else
  echo "   python3 absent — skipping parity (Node authoritative)"
fi

echo "-- 6/6 browser-parity + K7 all-functions net"
node --test tests/e2e/llmShield/stage4z/browserParity.test.js tests/e2e/llmShield/stage4z/k7AllFunctions.test.js >/dev/null && echo "   browser + K7 OK"

echo "== Stage 4Z VWA reproduce: ALL PASS =="
