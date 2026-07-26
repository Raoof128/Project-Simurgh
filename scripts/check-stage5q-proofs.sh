#!/usr/bin/env bash
#
# Stage 5Q — verify every Lean proof under proofs/stage5q.
#
# WHY THE COUNT FLOOR EXISTS
#
# Spec §14.3 specified this gate as:
#
#     find proofs/stage5q -name '*.lean' -print0 | sort -z | xargs -0 -n1 lean
#
# Against an empty directory that runs ZERO invocations and exits 0. A gate asserting "5Q's proofs
# verify" would have reported green because no proof existed — which is exactly F001, the false-green
# defect this stage froze as evidence, reproduced inside the stage built to hunt it.
#
# So: no proofs is a FAILURE, not a pass.
#
# The gate is self-extending by construction. It discovers proofs; it never names one. A 5Q gate
# that listed its own proof files would be F001 one level down.
#
# Enumeration is NUL-delimited throughout, so a newline in a filename cannot miscount or split.

set -euo pipefail

PROOF_DIR="proofs/stage5q"

if [ ! -d "$PROOF_DIR" ]; then
  echo "FAIL: $PROOF_DIR does not exist — a proof gate with nothing to prove is a false green"
  exit 1
fi

# NUL-safe count: grep -zc counts NUL-delimited records, never lines.
COUNT="$(find "$PROOF_DIR" -name '*.lean' -print0 | grep -zc . || true)"
COUNT="${COUNT:-0}"

if [ "$COUNT" -eq 0 ]; then
  echo "FAIL: no proofs under $PROOF_DIR — a proof gate with nothing to prove is a false green"
  exit 1
fi

# Deterministic order, NUL-delimited, one lean invocation per file. xargs propagates a non-zero
# status, and `set -e` turns that into a failing gate.
find "$PROOF_DIR" -name '*.lean' -print0 | sort -z | xargs -0 -n1 lean

echo "OK: $COUNT proof file(s) verified under $PROOF_DIR"
