#!/usr/bin/env bash
# Stage 5Q — VSR: stage-wide red team over the sixteen Stage-5 releases.
#
# SCAFFOLD REPRODUCE (plan Task 18.4a). This script verifies everything Q0 has produced up to the
# coverage ledger: the spec freeze, the write surface, the three censuses, the L2 closure, the
# mutation receipts, the finding ledger, the sixteen trays and the four campaigns.
#
# IT PRINTS `SCAFFOLD GATES PASSED`, NEVER `ALL GATES PASSED`. The full reproduce arrives at plan
# Task 20.5 and adds the coverage discharge ledger, the signed attestation, K7-B and prior-stage
# non-disturbance over the attestation. Printing the final banner here would claim coverage of gates
# that do not exist yet — which is the defect class this whole stage is named after.
#
# EVERY GATE IS AN EXPLICIT if/then/else WITH exit 1. NO `cmd && echo OK` chains: under `set -e`
# that pattern fails OPEN, and it cost Stage 5E two undetected failures on the droplet reproduce.
#
# HONEST SCOPE — what this script does NOT reproduce, and why, is printed at the end rather than
# omitted. A reproduce script that silently covers a subset reports the subset as the whole.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then
  NODE="node"
fi
E="docs/research/llm-shield/evidence/stage-5q"
Q="tools/simurgh-attestation/stage5q"

# ------------------------------------------------------------------------------------------------
# Pins. Each is a fact this script refuses to let drift silently.
# ------------------------------------------------------------------------------------------------
FREEZE_DIGEST="da78774b77495459e4889e1c433e1933bb502ac81c9e5c0811e2450af7fdfc74"
FREEZE_BYTES="23804"
CLOSURE_SOURCE_COMMIT="3512d287d2e13ceb31115477acc8b5ff182bc36e"
EXPECTED_MEMBERS="2531"
EXPECTED_TRAYS="16"
EXPECTED_MUTANTS="16"
# A FLOOR, NOT AN EXACT COUNT. L3 is No Erased Finding: a ledger that GROWS is the system working,
# and a ledger that SHRINKS is the failure it names. An exact pin would fail the build every time a
# finding was added, which pressures an author in precisely the wrong direction.
MINIMUM_FINDINGS="12"
# The gate census is a census of OTHER stages' gates. Its problem count is a measured property of
# the repository, pinned so a change in the gate landscape is visible rather than absorbed.
EXPECTED_GATE_PROBLEMS="11"

# The ONE unrepaired §6.1 write-surface violation, pinned BY PATH. Pinning the set rather than the
# count is deliberate: a count lets a second violation hide behind a repaired first one.
#
# `tests/unit/llmShield/stage5p/rawCodeCensus.test.js` — Q0 widened 5P's approved-documentation
# allowlist by two lines so the 5Q spec and plan may cite raw code 474 when stating where 5P's band
# closed. The 5P ruling covers exactly that case (widen the approved list, never weaken the band
# regex), and writing the literal obliquely would be the laundering the ruling forbids. It is still
# a write to a closure member, it is still outside the exhaustive §6.1 surface, and it is NOT
# retroactively legalised by amending §6.1 — L5 forbids exactly that repair. It is named here, in
# the artifact a reviewer runs, and it stays named.
KNOWN_WRITE_SURFACE_EXCEPTIONS="tests/unit/llmShield/stage5p/rawCodeCensus.test.js"

echo "== Stage 5Q VSR reproduce (SCAFFOLD) =="
"$NODE" --version
NODE_MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" != "26" ]; then
  echo "FAIL: byte-stability is claimed under Node 26 only; this is Node $NODE_MAJOR."
  echo "      Install node@26 or point NODE at it. A digest reproduced under another major is a"
  echo "      different measurement wearing the same name."
  exit 1
fi
echo "node 26: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 1. spec freeze (§§2-5, annex-only from here) --"
FREEZE="$("$NODE" -e '
import("./tools/simurgh-attestation/stage5q/core/frozenBlock.mjs").then(async (m) => {
  const { readFileSync } = await import("node:fs");
  const spec = readFileSync(
    "docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md",
    "utf8"
  );
  const r = m.freezeReceipt(spec);
  console.log(`${r.digest} ${r.bytes}`);
});
')"
if [ "$FREEZE" != "$FREEZE_DIGEST $FREEZE_BYTES" ]; then
  echo "FAIL: the frozen block moved."
  echo "      expected: $FREEZE_DIGEST $FREEZE_BYTES"
  echo "      measured: $FREEZE"
  exit 1
fi
echo "freeze digest $FREEZE_DIGEST ($FREEZE_BYTES bytes): OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 2. §6.1 write surface over the whole branch --"
MERGE_BASE="$(git merge-base main HEAD)"
WS_OUT="$("$NODE" "$Q/node/checkWriteSurface.mjs" --range "$MERGE_BASE..HEAD" 2>&1 || true)"
echo "$WS_OUT" | sed -n '1,2p'
VIOLATIONS="$(echo "$WS_OUT" | grep -c '^  ✗ ' || true)"
if [ "$VIOLATIONS" -gt 0 ]; then
  # Compare the SET, not the count.
  ACTUAL_SET="$(echo "$WS_OUT" | grep '^  ✗ ' | sed 's/^  ✗ //' | sort | tr '\n' ' ' | sed 's/ $//')"
  EXPECTED_SET="$(echo "$KNOWN_WRITE_SURFACE_EXCEPTIONS" | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')"
  if [ "$ACTUAL_SET" != "$EXPECTED_SET" ]; then
    echo "FAIL: the write-surface violation set is not the one this stage declared."
    echo "      declared: $EXPECTED_SET"
    echo "      measured: $ACTUAL_SET"
    exit 1
  fi
  echo "write surface: 1 DECLARED violation, unrepaired and named — $ACTUAL_SET"
else
  echo "write surface: clean"
fi

# ------------------------------------------------------------------------------------------------
echo
echo "-- 3. prior-stage evidence non-disturbance --"
# Q0 may not leave a single byte of another stage's evidence changed. This gate exists because the
# rule was BROKEN: the Task 3 runtime census imported a 5M module with no main guard, the module
# re-ran its ceremony, and it overwrote a published capture (finding 5Q-F003). The file was
# restored; this gate is what makes the next occurrence loud instead of invisible.
DISTURBED="$(git diff --name-only "$MERGE_BASE..HEAD" -- \
  'docs/research/llm-shield/evidence/' ':(exclude)docs/research/llm-shield/evidence/stage-5q/' || true)"
if [ -n "$DISTURBED" ]; then
  echo "FAIL: Q0 changed evidence belonging to another stage:"
  echo "$DISTURBED" | sed 's/^/      ✗ /'
  echo "      Everything in the committed closure is read-only during Q0 (spec §6.1)."
  exit 1
fi
echo "no prior-stage evidence changed by this branch: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 4. unit suite --"
# The TAP reporter, deliberately. The default reporter decorates its totals with ANSI escapes and a
# `ℹ` marker, and a gate that greps decorated output is a gate that stops matching the day the
# renderer changes — silently, and in the direction of not firing.
TEST_OUT="$("$NODE" --test --test-reporter=tap tests/unit/llmShield/stage5q/*.test.js 2>&1 || true)"
echo "$TEST_OUT" | grep -E '^# (tests|pass|fail) ' | sed 's/^/      /' || true
FAILED="$(echo "$TEST_OUT" | grep -E '^# fail ' | awk '{print $3}' || true)"
if [ "${FAILED:-1}" != "0" ]; then
  echo "FAIL: the 5Q unit suite is not green"
  echo "$TEST_OUT" | tail -30
  exit 1
fi
echo "unit suite: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 5. Lean core (7 theorems, zero escapes) --"
if command -v lean >/dev/null 2>&1; then
  if scripts/check-stage5q-proofs.sh; then
    echo "lean core: OK"
  else
    echo "FAIL: proofs/stage5q did not type-check"
    exit 1
  fi
else
  # NOT a pass. The claim is withdrawn for this run and named in the honest-scope block below.
  echo "lean not installed — the Lean gate is UNRUN, not passed (see NOT REPRODUCED, below)"
fi

# ------------------------------------------------------------------------------------------------
echo
echo "-- 6. static census (Annex A1.4 diagnostic; non-vacuity is the gate) --"
STATIC="$("$NODE" "$Q/node/measureStaticCensus.mjs")"
echo "$STATIC" | sed -n '2,5p' | sed 's/^/      /'
S_MEMBERS="$(echo "$STATIC" | awk '/^  members /{print $3}')"
S_PARSE="$(echo "$STATIC" | awk '/^  parse errors /{print $4}')"
S_DUPES="$(echo "$STATIC" | awk '/^  duplicate ids /{print $4}')"
if [ "$S_MEMBERS" != "$EXPECTED_MEMBERS" ]; then
  echo "FAIL: the static census found $S_MEMBERS members; the committed universe has $EXPECTED_MEMBERS"
  exit 1
fi
if [ "$S_PARSE" != "0" ] || [ "$S_DUPES" != "0" ]; then
  echo "FAIL: census reported $S_PARSE parse error(s) and $S_DUPES duplicate id(s); both must be 0"
  exit 1
fi
# THE VACUITY GUARD. A census with zero resolved call edges satisfies every reachability check it
# is asked, because there is nothing to check. That happened here once and the §2.4 role rule passed
# on an empty graph; the number is a gate now.
EDGES="$(echo "$STATIC" | awk '/^  resolved edges /{print $4}')"
if [ -z "$EDGES" ] || [ "$EDGES" = "0" ]; then
  echo "FAIL: zero resolved call edges. Every reachability check would pass vacuously."
  exit 1
fi
echo "static census: $S_MEMBERS members, $EDGES resolved edges, 0 parse errors, 0 duplicates: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 7. runtime census (IN A SCRATCH WORKTREE, no provider credential) --"
# THE CENSUS IMPORTS EVERY MODULE, AND IMPORTING IS NOT READ-ONLY (finding 5Q-F003). An earlier
# version of this script ran it in place; a closure member with no main guard re-ran its ceremony
# and overwrote Stage 5M's published capture — inside the very script whose job is to prove nothing
# was disturbed. The census now runs against a throwaway checkout, so an import-time write lands in
# a directory that is deleted seconds later.
SCRATCH="$ROOT/.git/5q-reproduce-runtime"
cleanup_scratch() {
  if [ -n "${SCRATCH:-}" ]; then
    git worktree remove --force "$SCRATCH" >/dev/null 2>&1 || true
    rm -rf "$SCRATCH"
  fi
}
trap cleanup_scratch EXIT INT TERM
rm -rf "$SCRATCH"
if ! git worktree add --detach --quiet "$SCRATCH" HEAD; then
  echo "FAIL: could not create the scratch worktree the runtime census requires"
  exit 1
fi
# The census EXITS NON-ZERO when it detects that importing a module wrote to committed evidence —
# which, in the scratch tree, it always will (5Q-F003). Under `set -o pipefail` a plain
# `census | head -5` propagates that 1 and kills the script before it can say why. Captured to a
# file with the status taken explicitly, so a real crash and a detected write stay distinguishable
# instead of both becoming "the script stopped".
CENSUS_LOG="$SCRATCH/../5q-runtime-census.log"
CENSUS_EXIT=0
(cd "$SCRATCH" && SIMURGH_SKIP_DOTENV=1 "$NODE" "$Q/node/measureRuntimeCensus.mjs") \
  >"$CENSUS_LOG" 2>&1 || CENSUS_EXIT=$?
RUNTIME="$(head -5 "$CENSUS_LOG")"
CENSUS_DIRT="$(git -C "$SCRATCH" status --porcelain -- docs/research/llm-shield/evidence/ | sed 's/^...//' || true)"
if [ "$CENSUS_EXIT" != "0" ] && [ -z "$CENSUS_DIRT" ]; then
  echo "FAIL: the runtime census exited $CENSUS_EXIT without an import-time write to explain it"
  tail -20 "$CENSUS_LOG" | sed 's/^/      /'
  rm -f "$CENSUS_LOG"
  exit 1
fi
rm -f "$CENSUS_LOG"
cleanup_scratch
trap - EXIT INT TERM
echo "$RUNTIME" | sed 's/^/      /'
if [ -n "$CENSUS_DIRT" ]; then
  # Reported, not failed: this IS finding 5Q-F003, and a frozen finding reproducing is the system
  # working. It failed the build only when it happened in the primary tree, where it destroys
  # evidence rather than demonstrating a defect.
  echo "      note: the census wrote to committed evidence inside the scratch tree —"
  echo "$CENSUS_DIRT" | sed 's/^/            ✗ /'
  echo "      that is finding 5Q-F003 reproducing, contained by the scratch worktree."
fi
R_MEMBERS="$(echo "$RUNTIME" | awk '/^  runtime members /{print $4}')"
if [ -z "$R_MEMBERS" ] || [ "$R_MEMBERS" -lt 1 ]; then
  echo "FAIL: the runtime census enumerated nothing"
  exit 1
fi
# The failure count is environment-dependent (75 of them are modules that call process.exit() at
# import time when no ANTHROPIC_API_KEY is present) and is therefore REPORTED, never gated.
echo "runtime census: $R_MEMBERS members enumerated: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 8. gate census (other stages' completeness gates) --"
GATE="$("$NODE" "$Q/node/measureGateCensus.mjs" 2>&1)"
echo "$GATE" | sed -n '1,3p' | sed 's/^/      /'
G_PROBLEMS="$(echo "$GATE" | awk '/^  PROBLEMS: /{print $2}')"
if [ "${G_PROBLEMS:-x}" != "$EXPECTED_GATE_PROBLEMS" ]; then
  echo "FAIL: the gate census reports ${G_PROBLEMS:-<none>} problems; this stage pinned $EXPECTED_GATE_PROBLEMS."
  echo "      A change here means the repository's gate landscape moved. Re-review, then re-pin."
  exit 1
fi
echo "gate census: $G_PROBLEMS problems, matching the pin: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 9. L2 closure re-derives from the working tree --"
# The strong form: walk the tree again, re-parse, re-assign roles, rebuild all six roots, and
# require every one to equal what was committed. `--source-commit` is supplied, never read from
# HEAD — a commitment that names the commit containing it is self-referential.
COMMIT_OUT="$("$NODE" "$Q/node/commitClosure.mjs" --source-commit "$CLOSURE_SOURCE_COMMIT")"
ROOT_MISMATCH=0
while read -r name value; do
  [ -z "$name" ] && continue
  COMMITTED="$("$NODE" -e "
    const r = require('./$E/closure/commitment-receipt.json');
    console.log(r.roots['$name'] ?? '<absent>');
  ")"
  if [ "$value" != "$COMMITTED" ]; then
    echo "      ✗ $name"
    echo "          re-derived: $value"
    echo "          committed : $COMMITTED"
    ROOT_MISMATCH=1
  else
    echo "      ✔ $name  $value"
  fi
done <<EOF
closure_member_commitment_digest $(echo "$COMMIT_OUT" | awk '/closure_member_commitment /{print $3}')
release_tag_closure_digest $(echo "$COMMIT_OUT" | awk '/release_tag_closure_digest /{print $3}')
attack_taxonomy_digest $(echo "$COMMIT_OUT" | awk '/attack_taxonomy_digest /{print $3}')
historical_function_closure_digest $(echo "$COMMIT_OUT" | awk '/historical_function_closure /{print $3}')
obligation_matrix_root $(echo "$COMMIT_OUT" | awk '/obligation_matrix_root /{print $3}')
merkle_root $(echo "$COMMIT_OUT" | awk '/merkle_root /{print $3}')
EOF
if [ "$ROOT_MISMATCH" != "0" ]; then
  echo "FAIL: the committed universe does not re-derive. L2 binds results to a closure; if the"
  echo "      closure cannot be rebuilt, nothing bound to it can be checked."
  exit 1
fi
# And the sidecar digests must agree with the receipt, or two files disagree about one root.
for pair in "function-closure:closure_member_commitment_digest" \
            "release-tag-closure:release_tag_closure_digest" \
            "attack-taxonomy:attack_taxonomy_digest"; do
  FILE="${pair%%:*}"
  KEY="${pair##*:}"
  SIDECAR="$(tr -d '\n' < "$E/closure/$FILE.json.digest")"
  RECEIPT="$("$NODE" -e "console.log(require('./$E/closure/commitment-receipt.json').roots['$KEY'])")"
  if [ "$SIDECAR" != "$RECEIPT" ]; then
    echo "FAIL: $FILE.json.digest says $SIDECAR but the receipt says $RECEIPT"
    exit 1
  fi
done
echo "closure: six roots re-derived, three sidecars agree: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 10. mutation receipts (L4: no attacked_pass without a green->red->green) --"
# KEY=VALUE lines via process.stdout.write, NOT console.log of a value. `console.log(16)` renders
# through util.inspect and can arrive wrapped in ANSI escapes, after which a string comparison
# against "16" fails for a reason that has nothing to do with the measurement.
MUT="$("$NODE" -e "
const j = require('./$E/mutation/receipts.json');
const grg = j.receipts.filter((r) =>
  r.baseline_exit === 0 && r.mutated_exit !== 0 && r.restored_exit === 0 &&
  r.mutation_applied === true && r.mutation_reverted === true
);
const undetected = j.receipts.filter((r) => r.mutated_exit === 0).map((r) => r.mutant_id);
const out = [
  ['attempted', j.mutants_attempted],
  ['receipts', j.receipts.length],
  ['green_red_green', grg.length],
  ['classes_discharged', j.classes_discharged.length],
  ['undetected', undetected.join(',') || '(none)'],
  ['primary_worktree_unchanged', j.primary_worktree_unchanged_by_run],
];
process.stdout.write(out.map(([k, v]) => k + '=' + v).join('\n') + '\n');
")"
echo "$MUT" | sed 's/^/      /'
M_RECEIPTS="$(echo "$MUT" | awk -F= '/^receipts=/{print $2}')"
M_CLEAN="$(echo "$MUT" | awk -F= '/^primary_worktree_unchanged=/{print $2}')"
if [ "$M_RECEIPTS" != "$EXPECTED_MUTANTS" ]; then
  echo "FAIL: $M_RECEIPTS mutation receipts; the taxonomy has $EXPECTED_MUTANTS classes and the"
  echo "      bijection is one mutant per class. A sample cannot discharge a taxonomy."
  exit 1
fi
if [ "$M_CLEAN" != "true" ]; then
  echo "FAIL: the mutation run left the primary worktree changed. A mutation harness that writes"
  echo "      outside its scratch tree has already invalidated the tree it measured."
  exit 1
fi
echo "mutation receipts: $M_RECEIPTS present, primary worktree untouched: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 11. finding ledger (L3: append-only, hash-chained, premises recomputed) --"
LEDGER_OUT="$("$NODE" "$Q/node/buildFindingLedger.mjs")"
echo "$LEDGER_OUT" | sed -n '3,12p' | sed 's/^/      /'
BUILT_DIGEST="$(echo "$LEDGER_OUT" | awk '/^  ledger_digest /{print $3}')"
ON_DISK="$("$NODE" -e "process.stdout.write(String(require('./$E/findings/q0-finding-ledger.json').q0_finding_ledger_digest))")"
DISK_COUNT="$("$NODE" -e "process.stdout.write(String(require('./$E/findings/q0-finding-ledger.json').record_count))")"
if [ "$BUILT_DIGEST" != "$ON_DISK" ]; then
  echo "FAIL: the ledger rebuilt to $BUILT_DIGEST but the committed one is $ON_DISK"
  exit 1
fi
if [ "$DISK_COUNT" -lt "$MINIMUM_FINDINGS" ]; then
  echo "FAIL: the committed ledger holds $DISK_COUNT records; it has held at least $MINIMUM_FINDINGS."
  echo "      L3 is No Erased Finding — a shrinking ledger is the failure it names."
  exit 1
fi
# The chain, recomputed from the committed bytes rather than from the builder's memory.
CHAIN="$("$NODE" -e "
import('./$Q/core/findingLedger.mjs').then((m) => {
  const j = require('./$E/findings/q0-finding-ledger.json');
  const r = m.verifyChain({ records: j.records, head_digest: j.head_digest });
  console.log(r.ok ? 'OK' : 'BROKEN at ' + r.brokenAt + ': ' + r.reason);
});
")"
if [ "$CHAIN" != "OK" ]; then
  echo "FAIL: the committed ledger's chain does not verify — $CHAIN"
  exit 1
fi
echo "finding ledger: $DISK_COUNT records, chain verified from committed bytes: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 12. sixteen stage trays --"
TRAY_REPORT="$("$NODE" --input-type=module -e "
import { readdirSync, readFileSync } from 'node:fs';
import { FORBIDDEN_SUMMARY_TOKENS, CLEAN_TRAY_SUMMARY, UNRUN_TRAY_SUMMARY, POSITIVE_PATH_RESULTS }
  from './$Q/core/tray.mjs';
const dir = '$E/trays';
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const committed = readFileSync('$E/closure/function-closure.json.digest', 'utf8').trim();
const problems = [];
let targets = 0;
for (const f of files) {
  const t = JSON.parse(readFileSync(dir + '/' + f, 'utf8'));
  targets += t.target_function_ids.length;
  if (t.closure_digest !== committed) problems.push(f + ': bound to a different closure');
  const lower = String(t.summary).toLowerCase();
  for (const tok of FORBIDDEN_SUMMARY_TOKENS) {
    if (lower.includes(tok)) problems.push(f + \": summary claims '\" + tok + \"'\");
  }
  const frozenSentence =
    t.summary === CLEAN_TRAY_SUMMARY ||
    t.summary === UNRUN_TRAY_SUMMARY ||
    /^[0-9]+ finding\\(s\\) frozen\\.\$/.test(t.summary);
  if (!frozenSentence) problems.push(f + ': summary is not one of the frozen sentences');
  if (!POSITIVE_PATH_RESULTS.includes(t.positive_path_result?.result)) {
    problems.push(f + ': positive_path_result is not one of the frozen five');
  }
}
const out = [
  ['trays', files.length],
  ['targets', targets],
  ['problems', problems.length],
];
process.stdout.write(out.map(([k, v]) => k + '=' + v).join('\n') + '\n');
for (const p of problems) process.stdout.write('problem=' + p + '\n');
")"
echo "$TRAY_REPORT" | sed 's/^/      /'
T_COUNT="$(echo "$TRAY_REPORT" | awk -F= '/^trays=/{print $2}')"
T_PROBS="$(echo "$TRAY_REPORT" | awk -F= '/^problems=/{print $2}')"
if [ "$T_COUNT" != "$EXPECTED_TRAYS" ]; then
  echo "FAIL: $T_COUNT trays; one per attacked stage means $EXPECTED_TRAYS"
  exit 1
fi
if [ "$T_PROBS" != "0" ]; then
  echo "FAIL: $T_PROBS tray contract problem(s)"
  echo "$TRAY_REPORT"
  exit 1
fi
echo "trays: $T_COUNT, all closure-bound, all summaries within the frozen vocabulary: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 13. campaigns (compositions no single tray sees) --"
for c in head seam historical fable5; do
  if [ ! -f "$E/campaigns/$c.json" ]; then
    echo "FAIL: campaign record $c.json is missing"
    exit 1
  fi
done
CAMPAIGNS="$("$NODE" -e "
const r = (n) => require('./$E/campaigns/' + n + '.json');
const head = r('head'), seam = r('seam'), hist = r('historical'), fable = r('fable5');
const line = (n, o) => \`      \${n.padEnd(11)} \${o}\`;
console.log(line('head', head.summary));
console.log(line('seam', seam.summary));
console.log(line('historical', hist.summary));
console.log(line('fable5', fable.summary));
")"
echo "$CAMPAIGNS"
# §3.3: reproducible and unreproducible historical tags are SEPARATE denominators, never summed.
#
# READ THE PUBLISHED TALLY. The first version of this block re-derived the two counts by filtering
# `records` on a field named `reproducible` — which does not exist. Every record compared as
# `undefined !== false`, and the script printed "16 reproducible, 0 unreproducible": the exact
# inverse of the truth, in the summary line of a reproduce script. The producer already computes
# and publishes `outcome_tally`; a consumer that recomputes it from guessed field names is not
# double-checking the producer, it is inventing a second answer.
HIST="$("$NODE" -e "
const t = require('./$E/campaigns/historical.json').outcome_tally;
if (typeof t?.reproducible_denominator !== 'number' ||
    typeof t?.unreproducible_denominator !== 'number') {
  process.stdout.write('MISSING_TALLY');
} else {
  process.stdout.write(
    t.reproducible_denominator + ' reproducible / ' +
    t.unreproducible_denominator + ' unreproducible'
  );
}
")"
if [ "$HIST" = "MISSING_TALLY" ]; then
  echo "FAIL: the historical campaign publishes no outcome_tally; the two denominators cannot be read"
  exit 1
fi
echo "      historical tags: $HIST  (separate denominators — never summed)"
echo "campaigns: 4 records present: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 14. no private key material in committed 5Q evidence --"
if grep -REl "PRIVATE KEY|BEGIN OPENSSH|sk-ant-|ANTHROPIC_API_KEY=" "$E" >/dev/null 2>&1; then
  echo "FAIL: key material or a credential appears in the committed evidence:"
  grep -REl "PRIVATE KEY|BEGIN OPENSSH|sk-ant-|ANTHROPIC_API_KEY=" "$E" | sed 's/^/      ✗ /'
  exit 1
fi
echo "no key material in $E: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 15. Q0 coverage ledger (L1, bottom-up) --"
COV="$E/coverage/discharge-ledger.json"
if [ ! -f "$COV" ]; then
  echo "FAIL: the coverage ledger is missing"
  exit 1
fi
COV_OUT="$("$NODE" "$Q/node/measureQ0Coverage.mjs")"
echo "$COV_OUT" | sed -n '2,12p' | sed 's/^/      /'
BUILT_COV="$(echo "$COV_OUT" | awk '/^  ledger_digest /{print $3}')"
DISK_COV="$("$NODE" -e "process.stdout.write(String(require('./$COV').ledger_digest))")"
if [ "$BUILT_COV" != "$DISK_COV" ]; then
  echo "FAIL: the coverage ledger rebuilt to $BUILT_COV but the committed one is $DISK_COV"
  exit 1
fi
# L1 IS NOT CERTIFIED, AND THAT IS THE MEASUREMENT. The gate asserts the committed ledger tells the
# truth about itself: if `l1_certified` ever reads true, it must be because cells were attacked, and
# a run that finds it true here while the obligated denominator is untouched is reporting a lie.
CERTIFIED="$("$NODE" -e "process.stdout.write(String(require('./$COV').l1_certified))")"
OBLIG="$("$NODE" -e "const j=require('./$COV');process.stdout.write(j.cells_obligated_discharged+'/'+j.cells_obligated)")"
UNSTATUSED="$("$NODE" -e "process.stdout.write(String(require('./$COV').members_without_status))")"
if [ "$CERTIFIED" = "true" ] && [ "$UNSTATUSED" != "0" ]; then
  echo "FAIL: the ledger certifies L1 while $UNSTATUSED members have no status"
  exit 1
fi
echo "coverage ledger: obligated cells discharged $OBLIG, unstatused members $UNSTATUSED,"
echo "                 L1 certified = $CERTIFIED (rebuilds to the committed digest): OK"

# ------------------------------------------------------------------------------------------------
echo
echo "-- 16. cross-runtime parity (Node core / portable / Python / browser) --"
PARITY="$E/parity/cross-runtime-parity.json"
if [ ! -f "$PARITY" ]; then
  echo "FAIL: the parity receipt is missing"
  exit 1
fi
PAR_EXIT=0
PAR_OUT="$("$NODE" "$Q/node/runCrossRuntimeParity.mjs" 2>&1)" || PAR_EXIT=$?
echo "$PAR_OUT" | sed -n '2,9p' | sed 's/^/      /'
if [ "$PAR_EXIT" != "0" ]; then
  echo "FAIL: a runtime DIVERGED on the deterministic surface"
  echo "$PAR_OUT" | tail -20
  exit 1
fi
# The receipt must be bound to the vector bytes, and it must never claim more than it measured.
PAR_VEC_DIGEST="$("$NODE" -e "process.stdout.write(String(require('./$PARITY').vectors_digest))")"
LIVE_VEC_DIGEST="$("$NODE" -e "
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
process.stdout.write(createHash('sha256').update(readFileSync('$Q/python/parity-vectors.json')).digest('hex'));
")"
if [ "$PAR_VEC_DIGEST" != "$LIVE_VEC_DIGEST" ]; then
  echo "FAIL: the parity receipt describes a different vector set than the one on disk"
  exit 1
fi
THREE="$("$NODE" -e "process.stdout.write(String(require('./$PARITY').three_runtime_parity))")"
BROWSER_RAN="$("$NODE" -e "process.stdout.write(String(require('./$PARITY').runtimes.browser.ran))")"
# A MISSING BROWSER IS NOT A PASS (gauntlet P1-32). The receipt may say `false` — two-runtime parity
# is a true, smaller claim — but it may never say `true` while a runtime went unmeasured.
if [ "$THREE" = "true" ] && [ "$BROWSER_RAN" != "true" ]; then
  echo "FAIL: the receipt claims three-runtime parity while the browser did not run"
  exit 1
fi
if [ "$THREE" = "true" ]; then
  echo "parity: four evaluators agree; three-runtime parity PROVEN: OK"
else
  echo "parity: no divergence, but three-runtime parity is NOT proven (a runtime did not run)"
fi

# ------------------------------------------------------------------------------------------------
echo
echo "-- 17. this script disturbed nothing (re-checked after every gate ran) --"
# Gate 3 checked the branch. This checks THIS RUN: a reproduce script that verifies non-disturbance
# and then disturbs something on its way through is worse than one that never checked, because it
# prints a clean bill over damage it caused. It has happened once already.
AFTER="$(git status --porcelain -- docs/research/llm-shield/evidence/ \
  | sed 's/^...//' | grep -v '^docs/research/llm-shield/evidence/stage-5q/' || true)"
if [ -n "$AFTER" ]; then
  echo "FAIL: running this script changed evidence belonging to another stage:"
  echo "$AFTER" | sed 's/^/      ✗ /'
  echo "      Restore with: git checkout -- <paths>"
  exit 1
fi
echo "prior-stage evidence unchanged by this run: OK"

# ------------------------------------------------------------------------------------------------
echo
echo "================================================================================"
echo "NOT REPRODUCED BY THIS SCRIPT — named rather than omitted"
echo "================================================================================"
cat <<'NOTE'
  Q0 tail, does not exist yet          the K7-A export census (19.7), the signed attestation (20),
                                       K7-B and the reproduction receipt (20.5), transition
                                       validation (21). The full reproduce at 20.5 is the artifact
                                       a reviewer runs; this one is its scaffold and says so in its
                                       banner.

  L1 COVERAGE — NOT CERTIFIED          gate 15 verifies the ledger; it does not certify coverage,
                                       because the ledger does not. 1438 of 23332 obligated cells
                                       are discharged and 2522 of 2531 members derive no status.
                                       The six probe families attack five of the sixteen classes
                                       without needing a positive control; the other eleven need
                                       one, and synthesising a valid input for a function whose
                                       signature nobody recorded is how a vacuous pass is made. So
                                       no member has all of its obligated cells covered, none
                                       reaches attacked_pass, and no attestation may claim coverage
                                       over this.

  16 historical tags                   UNREPRODUCIBLE, 0 reproducible. Every Stage-5 tag's
                                       package-lock.json differs from head, and re-resolving it
                                       would make the result attributable to today's registry
                                       rather than to the tag. The two counts are never summed.

  Lane Fable 5 (live)                  one-run lock, and it is spent. The live containment campaign
                                       requires a provider credential and ran once; run 1 governs.
                                       Its digests are not recoverable by re-running, and the
                                       campaign record says so. Re-running would be outcome
                                       shopping, which incident 5Q-INC-001 is the record of.

  R5 and R7 mutation classes           UNDISCHARGED. M5 and M7 are unkillable by construction: the
                                       guards they remove are redundant with an immediately
                                       following check, so the suite stays green. Recorded rather
                                       than tuned away — a mutant made to die by weakening the
                                       thing it attacks proves nothing.

  5Q-F002 / 5Q-F003                    frozen, NOT repaired. Q0 discovers; Q1 remediates. Repairing
                                       a finding during the phase that discovers it destroys the
                                       premise the finding rests on (L5).
NOTE

echo
echo "SCAFFOLD GATES PASSED"
echo "(This is not ALL GATES PASSED. That banner belongs to the Task 20.5 reproduce, which"
echo " verifies the coverage ledger, the signed attestation and K7-B. None of those exist yet.)"
exit 0
