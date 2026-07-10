#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5H VSD — verify-only reproduce (offline, byte-stable, Node 26). Verifiable Safety-claim
# Disclosure: computed reproducibility tier + right-scaling. Motto: AnthropicSafe First, then
# ReviewerSafe. FAIL-CLOSED: every gate is its OWN line (never `cmd && echo OK` under set -e — 5E).
set -euo pipefail
cd "$(dirname "$0")/.."
S=tools/simurgh-attestation/stage5h
EVID=docs/research/llm-shield/evidence/stage-5h

echo "== Stage 5H VSD reproduce (verify-only) =="
node -v

echo "-- 1/8 unit suite (verifier core, codes 300-315)"
node --test tests/unit/llmShield/stage5h/*.test.js >/dev/null
echo "   unit OK"

echo "-- 2/8 exit-code probe hygiene (additive codes 300-315 must not break it)"
node --test tests/unit/llmShield/exitCodeProbeHygiene.test.js >/dev/null
echo "   probe hygiene OK"

echo "-- 3/8 e2e net: K7 all-functions + family separation + lanes"
node --test tests/e2e/llmShield/stage5h/*.test.js >/dev/null
echo "   e2e OK"

echo "-- 4/8 verify committed evidence — public tier -> raw 0"
node "$S/node/verify-vsd-attestation.mjs" --tier public >/dev/null
echo "   public verify OK"

echo "-- 5/8 verify committed evidence — audit tier (census) -> raw 0"
node "$S/node/verify-vsd-attestation.mjs" --tier audit >/dev/null
echo "   audit verify OK"

echo "-- 5b Lane C fail-closed campaign gate (NOT if-exists-skip)"
node "$S/node/lanec-gate.mjs"
echo "   lane C campaign gate OK"

echo "-- 6/8 Lane B two-process blind review ceremony corroborates"
node "$S/laneb/run-laneb-review-ceremony.mjs" >/dev/null
echo "   lane B OK"

echo "-- 7/8 Python parity (independent digest+lattice reimpl) — skipped if no python3"
if command -v python3 >/dev/null 2>&1; then
  python3 "$S/python/vsd_parity.py" >/dev/null
  echo "   python parity OK"
else
  echo "   python3 absent — skipped"
fi

echo "-- 8/8 byte-stability: rebuild evidence twice + sorted-manifest compare"
node "$S/node/verify-byte-stability.mjs"
echo "   byte-stability OK"

echo "== Stage 5H VSD reproduce: ALL PASS =="
