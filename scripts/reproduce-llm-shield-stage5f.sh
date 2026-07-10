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

echo "-- 1/8 unit suite (verifier core, codes 268-282)"
node --test tests/unit/llmShield/stage5f/*.test.js >/dev/null
echo "   unit OK"

echo "-- 2/8 exit-code probe hygiene (additive codes 268-282 must not break it)"
node --test tests/unit/llmShield/exitCodeProbeHygiene.test.js >/dev/null
echo "   probe hygiene OK"

echo "-- 3/8 e2e net: K7 all-functions + three tamper suites + JS<->Python<->browser parity"
node --test tests/e2e/llmShield/stage5f/*.test.js >/dev/null
echo "   e2e OK"

echo "-- 4/8 verify committed evidence — public tier (strict) -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier public >/dev/null
echo "   public verify OK"

echo "-- 5/8 verify committed evidence — audit tier (census bijection) -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier audit >/dev/null
echo "   audit verify OK"

echo "-- 5b/8 verify REAL dual-detector capture (PG2 86M + Llama Guard 3 1B) — both tiers -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier public --dir docs/research/llm-shield/evidence/stage-5f/real-capture >/dev/null
node "$S/node/verify-vmp-attestation.mjs" --tier audit --dir docs/research/llm-shield/evidence/stage-5f/real-capture >/dev/null
echo "   real-capture verify OK"

echo "-- 6/8 Lane B two-process/two-key blind recompute ceremony"
node "$S/laneb/run-laneb-recompute-ceremony.mjs" >/dev/null
echo "   Lane B corroborated"

echo "-- 7/8 JS<->Python digest+verdict parity (if python3 present; Node authoritative)"
if command -v python3 >/dev/null 2>&1; then
  python3 "$S/python/vmp_parity.py" >/dev/null
  echo "   Python parity corroborated"
else
  echo "   python3 absent — parity skipped"
fi

echo "-- 8/8 byte-stability: rebuild the evidence pack in place and diff"
node "$S/node/build-vmp-evidence.mjs" >/dev/null
git diff --quiet -- docs/research/llm-shield/evidence/stage-5f "$S/pin.json"
echo "   byte-stable (no diff)"

echo "== Stage 5F VMP reproduce: ALL PASS =="
