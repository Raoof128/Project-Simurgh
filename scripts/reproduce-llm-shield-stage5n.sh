#!/usr/bin/env bash
# Stage 5N — VTC-Delay: fresh-input-bound dependent-chain finalisation delay, dual-endpoint anchored.
# Fail-closed reproduce: unit + K7 net, the Lean core, the theorem-projection anti-theatre gate,
# Node<->Python parity, deterministic Lane C containment, the committed Lane-C/Lane-D seals, and a
# no-private-key guard on the committed evidence. Node 26.
#
# Every gate is an explicit if/then/else exit 1. NO `cmd && echo "OK"` chains: under `set -e` that pattern
# can report success when the command failed (5E gotcha — it cost two real fail-opens).
#
# Honest scope: this script reproduces everything that does NOT require the external Bitcoin clock.
# The Lane-B ceremony's OTS confirmation banks `externally_anchored` outside this script (see §Lane B).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
EV="docs/research/llm-shield/evidence/stage-5n"

echo "== Stage 5N VTC-Delay reproduce =="
"$NODE" --version

echo "-- unit + K7 all-functions net (full 396-419 band) --"
"$NODE" --test tests/unit/llmShield/stage5n/*.test.js tests/e2e/llmShield/stage5n/*.test.js 2>&1 | tail -3

echo "-- Lean core (13 theorems, zero sorry) --"
if command -v lean >/dev/null 2>&1; then
  if lean proofs/stage5n/VtcDelay.lean; then
    echo "lean: OK"
  else
    echo "FAIL: Lean core did not compile"; exit 1
  fi
  if grep -REn "\bsorry\b|\badmit\b" proofs/stage5n >/dev/null 2>&1; then
    echo "FAIL: sorry/admit present in proofs/stage5n"; exit 1
  fi
  echo "no sorry/admit: OK"
else
  echo "lean not installed — skipping (CI compiles proofs/stage5n and enforces zero sorry)"
fi

echo "-- theorem-projection anti-theatre gate (Lean <-> runtime binding) --"
PROJ="$("$NODE" -e '
import("./tools/simurgh-attestation/stage5n/theoremProjection.mjs").then((m) => {
  const e = m.checkProjection();
  console.log(e.length === 0 ? "OK" : "DRIFT: " + JSON.stringify(e));
});
')"
if [ "$PROJ" != "OK" ]; then
  echo "FAIL: theorem projection drifted from the runtime -> $PROJ"; exit 1
fi
echo "theorem projection bound to runtime: OK"

echo "-- Node<->Python parity on the deterministic surface (independent recompute, not mirroring) --"
PY_VEC="$(python3 tools/simurgh-attestation/stage5n/python/vtc_delay_parity.py)"
NODE_VEC="$("$NODE" -e '
import("./tools/simurgh-attestation/stage5n/core/chain.mjs").then(({ deriveSeed, runChain }) => {
  const seed = deriveSeed({ run_id: "r1", D_in: "a".repeat(64), start_token_digest: "b".repeat(64), delay_policy_digest: "c".repeat(64) });
  const c = runChain(seed, 10, 5);
  console.log(JSON.stringify({ seed, x0: c.x0, terminal: c.terminal_value, cps: c.checkpoints }));
});
')"
# Compare PARSED values: the two runtimes serialise JSON with different whitespace, which is not a
# divergence of the deterministic surface. The digests are what must agree.
if ! NODE_VEC="$NODE_VEC" PY_VEC="$PY_VEC" python3 -c '
import json, os, sys
n = json.loads(os.environ["NODE_VEC"]); p = json.loads(os.environ["PY_VEC"])
if n != p:
    print("  node:  ", json.dumps(n, sort_keys=True)); print("  python:", json.dumps(p, sort_keys=True))
    sys.exit(1)
print("  seed     =", n["seed"]); print("  terminal =", n["terminal"]); print("  checkpoints =", len(n["cps"]))
'; then
  echo "FAIL: Node/Python vector divergence"; exit 1
fi
echo "Node<->Python vectors agree: OK"

echo "-- deterministic Lane C: every frozen mutation contained by a typed non-zero code --"
"$NODE" --test tests/unit/llmShield/stage5n/laneC.test.js 2>&1 | tail -2

echo "-- committed live seals (Lane C honest outcomes + Lane D cross-machine) --"
python3 - <<'PY'
import json, sys, pathlib
ev = pathlib.Path("docs/research/llm-shield/evidence/stage-5n")
adv = json.loads((ev / "real-lanec/lanec-adv-capture.json").read_text())
assert adv["outcome"] == "all_attacks_contained", adv["outcome"]
assert all(a.get("contained") for a in adv["attempts"]), "an attack escaped containment"
fable = json.loads((ev / "real-lanec/lanec-adv-fable5.json").read_text())
assert fable["outcome"] == "model_refused", fable["outcome"]  # sealed honestly, never re-rolled
laned = json.loads((ev / "real-laned/laned-outcome.json").read_text())
assert laned["result"] == "all_machines_byte_identical", laned["result"]
assert laned["machines"] >= 3, laned["machines"]
print(f"Lane C: {len(adv['attempts'])} attacks contained; Fable: model_refused (honest)")
print(f"Lane D: {laned['machines']} machines, {laned['architectures']} -> byte-identical")
PY

echo "-- Lane B (real dual-endpoint ceremony) --"
if [ -d "$EV/real-laneb" ]; then
  "$NODE" --test tests/unit/llmShield/stage5n/laneB.test.js 2>&1 | tail -2
else
  echo "real-laneb/ not frozen in this tree: the ceremony's two OTS proofs bank Bitcoin confirmation"
  echo "on the external chain clock, which no script can accelerate. Everything above is independent"
  echo "of it. This is reported, never skipped silently."
fi

echo "-- guard: no private key in committed evidence --"
if grep -rlE "PRIVATE KEY" "$EV" 2>/dev/null; then
  echo "FAIL: private key material in committed evidence"; exit 1
fi
echo "no private keys in evidence: OK"

echo "== Stage 5N reproduce complete =="
