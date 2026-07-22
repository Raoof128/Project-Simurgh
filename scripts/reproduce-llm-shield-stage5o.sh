#!/usr/bin/env bash
# Stage 5O — VSC: verifiable hidden-universe equality. Fail-closed reproduce covering the unit suite,
# the K7 all-functions net and its 100% export census, the Lean core, cross-runtime parity
# (Node/Python and, when a browser is present, a real headless ceremony), and byte-stability of every
# generator. Node 26.
#
# Every gate is an explicit if/then/else exit 1. NO `cmd && echo "OK"` chains: under `set -e` that
# pattern can report success when the command failed (the 5E gotcha — it cost two real fail-opens).
#
# Honest scope: this script reproduces everything that needs no external clock and no network. The
# browser ceremony SKIPS explicitly when no Chrome is present and never reports a parity PASS in that
# case, because Node's WebCrypto is not evidence about a real browser.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
S5O="tools/simurgh-attestation/stage5o"

echo "== Stage 5O VSC reproduce =="
"$NODE" --version

echo "-- unit suite --"
if "$NODE" --test tests/unit/llmShield/stage5o/*.test.js > /tmp/s5o-unit.log 2>&1; then
  tail -3 /tmp/s5o-unit.log
else
  echo "FAIL: stage5o unit suite"; tail -20 /tmp/s5o-unit.log; exit 1
fi

echo "-- K7 all-functions net + 100% export census --"
if "$NODE" --test tests/e2e/llmShield/stage5o/*.test.js > /tmp/s5o-k7.log 2>&1; then
  tail -3 /tmp/s5o-k7.log
else
  echo "FAIL: K7 all-functions net"; tail -30 /tmp/s5o-k7.log; exit 1
fi

echo "-- Lean core (15 theorems, zero proof escapes) --"
if command -v lean >/dev/null 2>&1; then
  if lean proofs/stage5o/Vsc.lean; then
    echo "lean: type-checks"
  else
    echo "FAIL: Lean core"; exit 1
  fi
  if grep -REn "\bsorry\b|\badmit\b" proofs/stage5o >/dev/null 2>&1; then
    echo "FAIL: proof escape found in proofs/stage5o"; exit 1
  else
    echo "lean: no proof escapes"
  fi
else
  echo "SKIP: lean not installed (the proof is CI-gated by stage-4-lean-proofs.yml)"
fi

echo "-- cross-runtime parity: Node == stdlib Python --"
if python3 "$S5O/python/vsc_parity.py" > /tmp/s5o-py.log 2>&1; then
  tail -1 /tmp/s5o-py.log
else
  echo "FAIL: Python parity"; cat /tmp/s5o-py.log; exit 1
fi

echo "-- real-browser parity ceremony --"
if bash "$S5O/browser/run-browser-parity.sh" > /tmp/s5o-browser.log 2>&1; then
  tail -2 /tmp/s5o-browser.log
else
  echo "FAIL: browser parity"; tail -20 /tmp/s5o-browser.log; exit 1
fi

echo "-- generators byte-stable --"
if "$NODE" "$S5O/parity/emit-vectors.mjs" | cmp -s - "$S5O/parity/section7_parity_vectors.json"; then
  echo "parity vectors: byte-stable"
else
  echo "FAIL: parity vectors drifted"; exit 1
fi
"$NODE" "$S5O/node/measureSection9Censuses.mjs" > /tmp/s5o-c1.json
if "$NODE" "$S5O/node/measureSection9Censuses.mjs" | cmp -s - /tmp/s5o-c1.json; then
  echo "section 9 censuses: byte-stable"
else
  echo "FAIL: section 9 censuses drifted"; exit 1
fi
"$NODE" "$S5O/node/measureProbabilityCompatibility.mjs" > /tmp/s5o-c2.json
if "$NODE" "$S5O/node/measureProbabilityCompatibility.mjs" | cmp -s - /tmp/s5o-c2.json; then
  echo "compatibility proof: byte-stable"
else
  echo "FAIL: compatibility proof drifted"; exit 1
fi

echo "-- exit-ledger: Stage 5O band 420-463, no collision with prior stages --"
if "$NODE" -e '
import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then((E) => {
  const vsc = Object.values(E.VSC_RAW_CODES).filter((c) => c !== 0);
  const prior = Object.keys(E.RUN_LEVEL_BY_RAW).map(Number).filter((n) => n < 420);
  const collide = vsc.filter((c) => prior.includes(c));
  if (collide.length || Math.min(...vsc) !== 420 || Math.max(...vsc) !== 463) process.exit(1);
  console.log("codes " + vsc.length + " in 420-463, zero collisions");
});'; then
  :
else
  echo "FAIL: exit-ledger"; exit 1
fi

echo "== Stage 5O reproduce: PASS =="
