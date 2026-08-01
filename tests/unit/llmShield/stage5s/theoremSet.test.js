// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 26 — the five theorems, pinned as a SET.
//
// A MISSING THEOREM MUST BE A SET DIFFERENCE, NOT A READER'S JOB. Counting theorems would pass while
// one was swapped for another, and reading the file would pass while a name drifted. The five names
// of §4.1 are pinned here and compared against what the proof file actually declares.
//
// AND THE FLOOR MOVES IN THIS TASK, not later (§13, B12). `check-lean-proofs.mjs` goes 38 → 39 in
// the commit that ADDS the proof. Without that, deleting 5S's only proof later returns the
// repository to 38, the count guard stays green, and directory coverage loses a whole directory
// without anything going red.
//
// ZERO ESCAPE HATCHES, AND THE TYPE-CHECKER IS NOT WHAT ENFORCES IT. `lean` exits 0 on a
// `sorry`-closed theorem — that is a warning, not an error, and it is how eleven proofs went
// unchecked in this repository before Q1-F001 was repaired.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const PROOF = "proofs/stage5s/Vwq.lean";
const GATE = "scripts/check-lean-proofs.mjs";
const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";
const WORKFLOW = ".github/workflows/stage-5s-checks.yml";

/**
 * Is a Lean toolchain on PATH?
 *
 * `scripts/check.sh` runs BEFORE the `Install Lean (elan)` step of stage-1-checks.yml, so the two
 * assertions below that shell out to `lean` failed there while passing on any developer machine
 * with a toolchain — two CI failures that no local run reproduced.
 *
 * They SKIP rather than pass when the binary is absent, and the skip is named and counted. The
 * distinction that matters: a skip here is not a hole, because the escape-hatch scan above is
 * source-based and unconditional (it is what actually catches `sorry` — `lean` exits 0 on a
 * sorry-closed theorem), and the type-check itself is separately enforced by CI jobs that DO
 * install the toolchain. The test below asserts that such a job exists, so this skip can never
 * become the only path.
 */
const LEAN_ON_PATH = (() => {
  try {
    execFileSync("lean", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const NO_LEAN = LEAN_ON_PATH
  ? false
  : "lean is not on PATH — enforced by the CI jobs that install elan";

/** The five names of §4.1, pinned. */
const REQUIRED_THEOREMS = Object.freeze([
  "ProducerCannotSelfWitness",
  "QuorumRequiresDistinctEligibleWitnesses",
  "ComparedSameCoordinateConflictYieldsEvidence",
  "QuorumShortfallCannotSuppressEquivocation",
  "CompatibleAncestryCannotYieldEquivocation",
]);

const source = () => readFileSync(PROOF, "utf8");

/** Theorem names the file actually declares, comments stripped. */
function declaredTheorems() {
  const code = source()
    .replace(/\/-[\s\S]*?-\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  return [...code.matchAll(/^theorem\s+([A-Za-z0-9_']+)/gm)].map((m) => m[1]);
}

test("[5s-t26] the five §4.1 names are declared — as a SET, not a count", () => {
  const declared = new Set(declaredTheorems());
  const missing = REQUIRED_THEOREMS.filter((t) => !declared.has(t));
  assert.deepEqual(missing, [], `theorems absent from ${PROOF}: ${missing.join(", ")}`);
});

test("[5s-t26] the pinned five are exactly the SPEC's five, parsed from the spec", () => {
  const spec = readFileSync(SPEC, "utf8");
  const section = spec.slice(spec.indexOf("### 4.1 Five theorems"), spec.indexOf("### 4.2"));
  const fromSpec = [...section.matchAll(/^\| `([A-Za-z]+)`/gm)].map((m) => m[1]);
  assert.equal(fromSpec.length, 5, `the spec names ${fromSpec.length} theorems`);
  assert.deepEqual([...REQUIRED_THEOREMS].sort(), fromSpec.sort());
});

test("[5s-t26] the demoted candidate is NOT quietly present", () => {
  // §4.1 records one demotion rather than dropping it silently:
  // `WitnessReplayCannotChangeCheckpointScope` is not among the five, and replay keeps executable
  // coverage at 494 and 495 instead. If it ever appears here, the record and the file disagree.
  assert.ok(
    !declaredTheorems().includes("WitnessReplayCannotChangeCheckpointScope"),
    "the demoted theorem is present, so §4.1's demotion note is now false"
  );
});

test("[5s-t26] the proof carries ZERO escape hatches in code", () => {
  // Comments are stripped: the file's own header explains why escapes are banned and names all
  // three, and a scan that cannot tell an explanation from a use reddens on the documentation.
  const code = source()
    .replace(/\/-[\s\S]*?-\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (const escape of ["sorry", "admit", "native_decide"]) {
    assert.ok(!code.includes(escape), `the proof uses ${escape}`);
  }
  assert.ok(code.includes("theorem"), "the extracted code is not the proof");
});

test("[5s-t26] the proof TYPE-CHECKS", { skip: NO_LEAN }, () => {
  // Necessary and not sufficient — `lean` exits 0 on a sorry-closed theorem, which is exactly why
  // the escape scan above exists as a separate assertion rather than as a comment.
  const out = execFileSync("lean", [PROOF], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(out.trim(), "", `lean reported: ${out}`);
});

test("[5s-t26] the repo floor was raised to 39 IN this task", () => {
  const gate = readFileSync(GATE, "utf8");
  const floor = /const DEFAULT_FLOOR = (\d+);/.exec(gate);
  assert.ok(floor, "the gate declares no floor");
  assert.equal(Number(floor[1]), 39, "the floor was not raised alongside the proof");
});

test("[5s-t26] the repo-wide gate passes, and counts this directory", { skip: NO_LEAN }, () => {
  const out = execFileSync(process.execPath, [GATE], { encoding: "utf8" });
  assert.match(out, /0 escape hatches/);
  assert.match(out, /all type-check/);
  assert.match(out, /39 Lean proof\(s\)/);
});

test("[5s-t26] the skip above is not a hole — a CI job installs the toolchain AND runs the gate", () => {
  // The one assertion that makes the two skips safe, and it never skips itself. If the workflow
  // stopped installing elan, or stopped running the gate, the type-check would be enforced
  // NOWHERE and every environment would quietly report a skip instead of a failure.
  const wf = readFileSync(WORKFLOW, "utf8");
  assert.match(wf, /elan/, "the workflow installs no Lean toolchain");
  assert.match(wf, /check-lean-proofs\.mjs/, "the workflow never runs the repo-wide proof gate");

  // Order matters as much as presence: installing the toolchain after the gate has already run is
  // exactly the stage-1-checks.yml arrangement that produced the two failures this skip answers.
  //
  // Compare the STEPS, not any mention. The first draft compared raw indexOf and went red on a
  // correct workflow, because `check-lean-proofs.mjs` also appears in the `paths:` trigger near the
  // top of the file — a path filter naming the script is not a step running it.
  const install = wf.indexOf("./elan-init");
  const runsGate = wf.indexOf("run: node scripts/check-lean-proofs.mjs");
  assert.ok(install > 0, "no elan-init step");
  assert.ok(runsGate > 0, "no step RUNS the repo-wide gate");
  assert.ok(
    install < runsGate,
    "the toolchain is installed AFTER the gate runs, which is how this defect arose"
  );

  // And the toolchain is pinned rather than floating, so the gate cannot drift from the proofs.
  assert.equal(
    readFileSync("proofs/stage5s/lean-toolchain", "utf8").trim(),
    "leanprover/lean4:v4.15.0"
  );
});

test("[5s-t26] the proof exhibits BOTH a satisfying and a non-satisfying model", () => {
  // A theorem about a predicate no model satisfies is true and worthless. Both directions must be
  // present, or the file proves things about an empty world.
  const code = source();
  assert.ok(
    /artifactDerivable forkA forkB = true/.test(code),
    "no satisfying model for derivability"
  );
  assert.ok(/= false := by decide/.test(code), "no non-satisfying model anywhere");
  assert.ok(/quorumMet honestPolicy honestStatements = true/.test(code));
  assert.ok(/quorumMet honestPolicy producerStatements = false/.test(code));
});

test("[5s-t26] T4 is stated so it CAN fail — the status takes the statements and ignores them", () => {
  // The design that makes the sharpest theorem non-trivial: `comparisonStatus` accepts the witness
  // statements as a parameter. A version that simply omitted the argument would be true by shape
  // and would prove nothing about the code anybody runs — if a future edit makes the body consult
  // `_ss`, the theorem stops type-checking.
  const code = source();
  assert.match(code, /def comparisonStatus \(a b : Checkpoint\) \(_ss : List Statement\)/);
  assert.match(
    code,
    /theorem QuorumShortfallCannotSuppressEquivocation[\s\S]*?ss ss' : List Statement/
  );
});
