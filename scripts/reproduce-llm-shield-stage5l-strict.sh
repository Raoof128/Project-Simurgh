#!/usr/bin/env bash
# Separately named successor. The historical wrapper and evidence are unchanged.
# Rebuilding may modify evidence: run ONLY in a disposable checkout.
set -euo pipefail
if [[ "${1:-}" != --disposable-checkout || $# != 1 ]]; then
  echo 'Usage: run in a disposable checkout with --disposable-checkout' >&2
  exit 64
fi
if ! command -v lean >/dev/null 2>&1; then
  echo 'INCOMPLETE: Lean is required; no ALL PASS result is available.' >&2
  exit 77
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node --version
for c in core-positive quorum-confirmed-stub; do
  node tools/simurgh-attestation/stage5l/node/verify-vtcq-attestation.mjs \
    "$ROOT/docs/research/llm-shield/evidence/stage-5l/lane-a/$c"
done
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"' EXIT
cp -r docs/research/llm-shield/evidence/stage-5l "$SNAP/before"
node tools/simurgh-attestation/stage5l/node/build-vtcq-evidence.mjs >/dev/null
diff -r "$SNAP/before" docs/research/llm-shield/evidence/stage-5l
echo 'byte-stable: OK'
node --test tests/unit/llmShield/stage5l/*.test.js tests/e2e/llmShield/stage5l/*.test.js 2>&1 | tail -3
(cd proofs/stage5l && lean TemporalQuorum.lean)
echo 'lean: OK'
python3 tools/simurgh-attestation/stage5l/python/vtcq_parity.py >/dev/null
echo 'parity: OK'
echo '== Stage 5L strict successor: ALL PASS =='
