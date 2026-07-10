#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5F VMP — verify-only reproduce (offline, byte-stable, Node 26). Multi-detector panel completeness
# attestation. Motto: AnthropicSafe First, then ReviewerSafe.
# FAIL-CLOSED: every gate is its own line (never `cmd && echo OK` under set -e — the 5E independent-party
# fail-open lesson: a failed non-final element of an && list skips its echo but the script still exits 0).
set -euo pipefail
cd "$(dirname "$0")/.."
S=tools/simurgh-attestation/stage5f

echo "== Stage 5F VMP reproduce (verify-only) =="
node -v

echo "-- 1/5 unit suite (verifier core, codes 268-282)"
node --test tests/unit/llmShield/stage5f/*.test.js >/dev/null
echo "   unit OK"

echo "-- 2/5 exit-code probe hygiene (additive codes 268-282 must not break it)"
node --test tests/unit/llmShield/exitCodeProbeHygiene.test.js >/dev/null
echo "   probe hygiene OK"

echo "-- 3/5 verify committed evidence — public tier (strict) -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier public >/dev/null
echo "   public verify OK"

echo "-- 4/5 verify committed evidence — audit tier (census bijection) -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier audit >/dev/null
echo "   audit verify OK"

echo "-- 5/5 byte-stability: rebuild the evidence pack in place and diff"
node "$S/node/build-vmp-evidence.mjs" >/dev/null
git diff --quiet -- docs/research/llm-shield/evidence/stage-5f "$S/pin.json"
echo "   byte-stable (no diff)"

echo "== Stage 5F VMP reproduce: ALL PASS =="
