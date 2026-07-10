#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5G VFC — verify-only reproduce (offline, byte-stable, Node 26). Verifiable Foreign Capture:
# producer/verifier separation rungs. Motto: AnthropicSafe First, then ReviewerSafe.
# FAIL-CLOSED: every gate is its OWN line (never `cmd && echo OK` under set -e — the 5E fail-open lesson).
set -euo pipefail
cd "$(dirname "$0")/.."
S=tools/simurgh-attestation/stage5g

echo "== Stage 5G VFC reproduce (verify-only) =="
node -v

echo "-- 1/8 unit suite (verifier core, codes 283-299)"
node --test tests/unit/llmShield/stage5g/*.test.js >/dev/null
echo "   unit OK"

echo "-- 2/8 exit-code probe hygiene (additive codes 283-299 must not break it)"
node --test tests/unit/llmShield/exitCodeProbeHygiene.test.js >/dev/null
echo "   probe hygiene OK"

echo "-- 3/8 e2e net: K7 all-functions + tamper-family separation + lanes"
node --test tests/e2e/llmShield/stage5g/*.test.js >/dev/null
echo "   e2e OK"

echo "-- 4/8 verify committed evidence — public tier -> raw 0"
node "$S/node/verify-vfc-attestation.mjs" --tier public >/dev/null
echo "   public verify OK"

echo "-- 5/8 verify committed evidence — audit tier (census bijection) -> raw 0"
node "$S/node/verify-vfc-attestation.mjs" --tier audit >/dev/null
echo "   audit verify OK"

echo "-- 5b verify the REAL independent-party foreign capture (verify-only; not rebuildable — foreign key)"
if [ -f docs/research/llm-shield/evidence/stage-5g/real-capture/vfc-attestation.json ]; then
  node "$S/node/verify-vfc-attestation.mjs" --dir docs/research/llm-shield/evidence/stage-5g/real-capture --tier audit >/dev/null
  echo "   real-capture verify OK (raw 0, audit)"
else
  echo "   real-capture absent — skipped"
fi

echo "-- 6/8 Lane B blind-recompute sidecar ceremony corroborates"
node "$S/laneb/run-laneb-recompute-ceremony.mjs" >/dev/null
echo "   lane B OK"

echo "-- 7/8 Python parity (independent digest+rung reimpl) — skipped if no python3"
if command -v python3 >/dev/null 2>&1; then
  python3 "$S/python/vfc_parity.py" >/dev/null
  echo "   python parity OK"
else
  echo "   python3 absent — parity skipped"
fi

echo "-- 8/8 byte-stability: rebuild evidence + git diff must be empty"
node "$S/node/build-vfc-evidence.mjs" >/dev/null
git diff --exit-code -- docs/research/llm-shield/evidence/stage-5g/ "$S/pin.json" "$S/trust-root.json"
echo "   byte-stable OK"

echo "== Stage 5G VFC reproduce: ALL PASS =="
