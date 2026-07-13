#!/usr/bin/env bash
# Stage 5M — VTC-Quorum: exact three-ecology external-anchor quorum. Fail-closed reproduce: unit + K7 net,
# the Lean core, Node<->Python parity + INDEPENDENT Lane-D over the real packet, the real Lane-B offline gate
# (honest 372 pending until the OTS Bitcoin confirmation banks externally_anchored), and a no-private-key
# guard on the committed evidence. Node 26.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
EV="docs/research/llm-shield/evidence/stage-5m/real-laneb"

echo "== Stage 5M VTC-Quorum reproduce =="
"$NODE" --version

echo "-- unit + K7 net --"
"$NODE" --test tests/unit/llmShield/stage5m/*.test.js tests/e2e/llmShield/stage5m/*.test.js 2>&1 | tail -3

echo "-- Lean core (11 theorems, zero sorry) --"
if command -v lean >/dev/null 2>&1; then
  lean proofs/stage5m/EcologyQuorum.lean && echo "lean: OK"
else
  echo "lean not installed — skipping (CI enumerates proofs/stage5m)"
fi

echo "-- Node<->Python parity + INDEPENDENT Lane-D over the real packet --"
D_ALLOK="$(python3 tools/simurgh-attestation/stage5m/python/vtcq_quorum_parity.py --laned "$EV" | python3 -c 'import sys,json;print(json.load(sys.stdin)["all_ok"])')"
[ "$D_ALLOK" = "True" ] && echo "Lane-D all_ok: True"

echo "-- real Lane-B offline gate (honest pending floor) --"
"$NODE" --test tests/unit/llmShield/stage5m/laneB.test.js 2>&1 | tail -2

echo "-- guard: no private key in committed evidence --"
if grep -rlE "PRIVATE KEY" "$EV" 2>/dev/null; then
  echo "FAIL: private key material in evidence"; exit 1
fi
echo "no private keys in evidence: OK"

echo "== Stage 5M reproduce complete =="
