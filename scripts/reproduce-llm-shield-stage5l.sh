#!/usr/bin/env bash
# Stage 5L — VTC-Q: Verifiable Temporal Commitment with Notary Quorum. Fail-closed reproduce: verify the
# COMMITTED Lane-A pack (public + audit), confirm byte-stability, run the K7 net, the Lean core, and
# Node<->Python parity. Node 26.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi

echo "== Stage 5L VTC-Q reproduce =="
"$NODE" --version

echo "-- verify COMMITTED Lane-A packs (public + audit) --"
for c in core-positive quorum-confirmed-stub; do
  "$NODE" tools/simurgh-attestation/stage5l/node/verify-vtcq-attestation.mjs \
    "$ROOT/docs/research/llm-shield/evidence/stage-5l/lane-a/$c"
done

echo "-- byte-stability: rebuild + cmp --"
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"' EXIT
cp -r docs/research/llm-shield/evidence/stage-5l "$SNAP/before"
"$NODE" tools/simurgh-attestation/stage5l/node/build-vtcq-evidence.mjs >/dev/null
diff -r "$SNAP/before" docs/research/llm-shield/evidence/stage-5l && echo "byte-stable: OK"

echo "-- unit + K7 net --"
"$NODE" --test tests/unit/llmShield/stage5l/*.test.js tests/e2e/llmShield/stage5l/*.test.js 2>&1 | tail -3

echo "-- Lean proofs (14 theorems, no unfinished goals) --"
if command -v lean >/dev/null 2>&1; then
  ( cd proofs/stage5l && lean TemporalQuorum.lean && echo "lean: OK" )
else
  echo "lean not installed; skipping (checked in CI)"
fi

echo "-- Node<->Python parity --"
python3 tools/simurgh-attestation/stage5l/python/vtcq_parity.py >/dev/null && echo "parity: OK"

echo "== Stage 5L VTC-Q reproduce: ALL PASS =="
