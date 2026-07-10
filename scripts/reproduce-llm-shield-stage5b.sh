#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5B VAR — verify-only reproduce (offline, byte-stable). Grounded on the REAL Llama-3.2-1B
# Lane C capture; the red-team drives the frozen 4V→5A verifiers. Motto: AnthropicSafe First,
# then ReviewerSafe.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Stage 5B VAR reproduce (verify-only) =="
node --version

echo "-- 1/6 public-tier verify (structure + recomputable ASR)"
node tools/simurgh-attestation/stage5b/node/verify-stage5b-attestation.mjs --tier public

echo "-- 2/6 audit-tier verify (re-drives each attack at the frozen verifier)"
node tools/simurgh-attestation/stage5b/node/verify-stage5b-attestation.mjs --tier audit

echo "-- 3/6 byte-stability: rebuild the attestation in place and diff"
EVID="docs/research/llm-shield/evidence/stage-5b"
node tools/simurgh-attestation/stage5b/node/build-stage5b-fixtures.mjs >/dev/null
git diff --quiet -- "$EVID/attestation.json" && echo "   byte-stable (no diff)" || { echo "   DRIFT in $EVID"; exit 1; }

echo "-- 4/6 Lane B blind recompute (sterile cwd, no operator hints)"
node tools/simurgh-attestation/stage5b/laneb/run-laneb-var-ceremony.mjs

echo "-- 5/6 JS<->Python parity (tallies / ASR / floor)"
if command -v python3 >/dev/null 2>&1; then
  node --test tests/e2e/llmShield/stage5b/parity.test.js >/dev/null
  echo "   parity OK"
else
  echo "   python3 absent — skipping parity (Node authoritative)"
fi

echo "-- 6/6 browser-parity (WebCrypto Ed25519 + hash-CSP) + K7 all-functions net + real-capture lock"
node --test tests/e2e/llmShield/stage5b/browserParity.test.js tests/e2e/llmShield/stage5b/k7AllFunctions.test.js tests/e2e/llmShield/stage5b/realCapture.test.js >/dev/null
echo "   browser + K7 + capture OK"

echo "== Stage 5B VAR reproduce: ALL PASS =="
