#!/usr/bin/env bash
#
# Stage 5R — verify the Lean core.
#
# WHAT THIS GATE HAS TO SURVIVE, LEARNED FROM TWO PREDECESSORS.
#
#   5Q's gate discovered files and never named one, because a gate that lists its own proofs is the
#   false-green defect one level down. Against an empty directory, though, discovery runs zero
#   invocations and exits 0 — so 5Q added a count floor.
#
#   5P's CI listed proofs BY NAME and went green vacuously when a proof was renamed away.
#
# Neither check alone is enough, and they fail in opposite directions. Discovery alone passes with
# five irrelevant files. Names alone pass with five theorems that each prove `True`. So this gate
# does BOTH, plus two more: every obligation in the manifest must be discharged by a theorem that
# exists in the file the manifest names, and no two proof files may be copies of each other — five
# duplicates of one proof are one obligation wearing five hats.
#
# Enumeration is NUL-delimited throughout, so a newline in a filename cannot miscount or split.

set -euo pipefail

PROOF_DIR="proofs/stage5r"
MANIFEST="$PROOF_DIR/manifest.json"
MIN_PROOFS=5

fail() {
  echo "FAIL: $1"
  exit 1
}

[ -d "$PROOF_DIR" ] || fail "$PROOF_DIR does not exist — a proof gate with nothing to prove is a false green"
[ -f "$MANIFEST" ] || fail "$MANIFEST is missing — the obligations are unstated"

COUNT="$(find "$PROOF_DIR" -name '*.lean' -print0 | grep -zc . || true)"
COUNT="${COUNT:-0}"
[ "$COUNT" -ge "$MIN_PROOFS" ] || fail "$COUNT proof file(s) under $PROOF_DIR, fewer than the $MIN_PROOFS obligations"

# ---- no escape hatches -------------------------------------------------------------------------
# An escape hatch in a proof is the formal analogue of a vacuous gate: it type-checks, it is green,
# and it establishes nothing. `axiom` is included: a proof that assumes its conclusion is not one.
#
# THE SCAN STRIPS COMMENTS FIRST. The first version of this gate failed on the phrase "an empty
# campaign admits nothing", because `admit` is a substring of `admits` inside a docstring. That is
# §6.3's lesson — three 5Q gates matched their own explanatory prose — arriving on schedule in the
# gate written to honour it. Stripping is done by the stage's own tested Lean comment reader, and the
# scan refuses a file that strips to nothing, so the stripping cannot make it vacuous.
node -e '
const { readFileSync, readdirSync } = require("node:fs");
import("./tools/simurgh-attestation/stage5r/core/signals.mjs").then(({ stripNonCode }) => {
  const dir = "proofs/stage5r";
  const escapes = /\bsorry\b|\badmit\b|\bnative_decide\b|^\s*axiom\s|\bunsafe\s|@\[implemented_by|\bpartial\s+def\b/m;
  let bad = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".lean"))) {
    const raw = readFileSync(`${dir}/${f}`, "utf8");
    const code = stripNonCode(raw, "lean");
    if (raw.trim() !== "" && code.trim() === "") {
      console.log(`FAIL: ${f} strips to nothing — the scan would be vacuous`);
      bad++;
      continue;
    }
    const m = escapes.exec(code);
    if (m) {
      console.log(`FAIL: ${f} contains a proof escape: ${m[0].trim()}`);
      bad++;
    }
  }
  process.exit(bad === 0 ? 0 : 1);
});
' || fail "a proof contains an escape hatch"

# ---- no duplicate proofs wearing different names -------------------------------------------------
DUPES="$(find "$PROOF_DIR" -name '*.lean' -exec shasum -a 256 {} \; | awk '{print $1}' | sort | uniq -d | wc -l | tr -d ' ')"
[ "$DUPES" -eq 0 ] || fail "$DUPES proof file(s) are byte-identical copies — one obligation cannot discharge five"

# ---- every manifest obligation is discharged by a theorem that exists -----------------------------
OBLIGATIONS="$(node -e '
const m = require("./proofs/stage5r/manifest.json");
for (const o of m.obligations) console.log([o.id, o.file, o.theorem, ...o.witnesses].join(" "));
')"
[ -n "$OBLIGATIONS" ] || fail "the manifest lists no obligations"

MANIFEST_COUNT=0
while read -r id file thm rest; do
  MANIFEST_COUNT=$((MANIFEST_COUNT + 1))
  target="$PROOF_DIR/$file"
  [ -f "$target" ] || fail "$id: the manifest names $file, which does not exist"
  grep -Eq "^theorem $thm\b|^theorem $thm$" "$target" || fail "$id: $file has no theorem named $thm"
  for w in $rest; do
    grep -Eq "^theorem $w\b|^theorem $w$" "$target" || fail "$id: $file has no witness named $w"
  done
done <<< "$OBLIGATIONS"

[ "$MANIFEST_COUNT" -ge "$MIN_PROOFS" ] || fail "the manifest carries $MANIFEST_COUNT obligations, fewer than $MIN_PROOFS"

# ---- and finally, they must actually check --------------------------------------------------------
find "$PROOF_DIR" -name '*.lean' -print0 | sort -z | xargs -0 -n1 lean

echo "OK: $COUNT proof file(s) verified, $MANIFEST_COUNT obligation(s) discharged by name, 0 escapes, 0 duplicates"
