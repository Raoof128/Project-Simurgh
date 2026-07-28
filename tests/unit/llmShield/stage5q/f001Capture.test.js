// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 13 — F001 Q0 evidence capture (spec §14.1).
//
// All three artefacts are EVIDENCE COLLECTION. None is a repair: F001 stays live through Q0,
// because capturing a defect and fixing it in one commit destroys the thing the capture was for —
// afterwards nobody can check that the false green was ever real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  buildArtefacts,
  listLeanFilesSorted,
  namedLeanFiles,
  extractGateStep,
} from "../../../../tools/simurgh-attestation/stage5q/node/captureF001.mjs";

const base = {
  existing: ["proofs/a/A.lean", "proofs/b/B.lean", "proofs/c/C.lean"],
  named: ["proofs/a/A.lean"],
  gateStep: {
    step_name: "Type-check the Stage 4 formal core",
    verbatim: "        run: |\n          lean proofs/a/A.lean",
  },
  gateExit: 0,
  probeResults: [
    { file: "proofs/a/A.lean", exit: 0 },
    { file: "proofs/b/B.lean", exit: 0 },
    { file: "proofs/c/C.lean", exit: 0 },
  ],
};

// ---------------------------------------------------------------------------------------------
// F001-premise — sets, never counts
// ---------------------------------------------------------------------------------------------

test("the premise records BOTH SETS and their difference, not merely a count", () => {
  // "27 of 32" tells a reader a number. The difference tells them WHICH theorems nothing was
  // checking, and only the second is actionable.
  const { premise } = buildArtefacts(base);
  assert.deepEqual(premise.lean_files_on_disk, base.existing);
  assert.deepEqual(premise.lean_files_named_by_workflow, base.named);
  assert.deepEqual(premise.omitted_from_the_gate, ["proofs/b/B.lean", "proofs/c/C.lean"]);
  assert.equal(premise.sets_are_equal, false);
});

test("a file NAMED by the workflow but absent from disk is reported too", () => {
  // The other direction of the same defect: a gate that names a proof nobody has written would
  // pass its own name-list check while proving nothing.
  const { premise } = buildArtefacts({ ...base, named: [...base.named, "proofs/ghost/G.lean"] });
  assert.deepEqual(premise.named_but_absent_from_disk, ["proofs/ghost/G.lean"]);
});

test("equal sets are reported as equal — the premise can say the gate is sound", () => {
  const { premise } = buildArtefacts({ ...base, named: base.existing });
  assert.deepEqual(premise.omitted_from_the_gate, []);
  assert.equal(premise.sets_are_equal, true);
});

// ---------------------------------------------------------------------------------------------
// F001-false-green — the exit status IS the finding
// ---------------------------------------------------------------------------------------------

test("the false-green artefact records the gate's EXIT STATUS", () => {
  // A short list that failed LOUDLY would be a nuisance, not a false green. The artefact must be
  // able to tell those two apart, and only the exit status does that.
  const green = buildArtefacts(base).falseGreen;
  assert.equal(green.gate_exit_status, 0);
  assert.equal(green.gate_exited_successfully, true);

  const loud = buildArtefacts({ ...base, gateExit: 1 }).falseGreen;
  assert.equal(loud.gate_exited_successfully, false, "a failing gate is not a false green");
});

test("an UNOBSERVED exit is null, never zero", () => {
  // Guessing success because nothing was run is the same error F001 is about.
  const artefact = buildArtefacts({ ...base, gateExit: null }).falseGreen;
  assert.equal(artefact.gate_exit_status, null);
  assert.equal(artefact.gate_exited_successfully, false);
});

test("the run scalar is recorded VERBATIM and digested (gauntlet P2-12)", () => {
  // Not an approximation of the file list. "Roughly this command" cannot be re-run by anyone.
  const { falseGreen } = buildArtefacts(base);
  assert.equal(falseGreen.verbatim_run_scalar, base.gateStep.verbatim);
  assert.match(falseGreen.verbatim_digest, /^[0-9a-f]{64}$/);
  assert.equal(falseGreen.step_name, "Type-check the Stage 4 formal core");
});

test("the false-green artefact names the omitted files alongside the green exit", () => {
  const { falseGreen } = buildArtefacts(base);
  assert.deepEqual(falseGreen.omitted_while_green, ["proofs/b/B.lean", "proofs/c/C.lean"]);
  assert.match(falseGreen.claim, /passing without checking them/);
});

// ---------------------------------------------------------------------------------------------
// F001-complete-probe — a per-file result, failures included
// ---------------------------------------------------------------------------------------------

test("the probe records a PER-FILE result, including failures", () => {
  // A probe that records only successes is F001 committed a third time.
  const results = [
    { file: "proofs/a/A.lean", exit: 0 },
    { file: "proofs/b/B.lean", exit: 1 },
    { file: "proofs/c/C.lean", exit: 0 },
  ];
  const { completeProbe } = buildArtefacts({ ...base, probeResults: results });
  assert.equal(completeProbe.attempted, 3);
  assert.deepEqual(completeProbe.failures, ["proofs/b/B.lean"]);
  assert.equal(completeProbe.all_attempted, true);
});

test("a file that was NOT ATTEMPTED is named — silence is not a pass", () => {
  const { completeProbe } = buildArtefacts({
    ...base,
    probeResults: [{ file: "proofs/a/A.lean", exit: 0 }],
  });
  assert.equal(completeProbe.all_attempted, false);
  assert.deepEqual(completeProbe.files_not_attempted, ["proofs/b/B.lean", "proofs/c/C.lean"]);
});

test("the probe declares itself OUT OF BAND — it does not repair the gate", () => {
  const { completeProbe } = buildArtefacts(base);
  assert.match(completeProbe.out_of_band, /NOT wired into any shared workflow/);
  assert.match(completeProbe.out_of_band, /erase the evidence/);
});

// ---------------------------------------------------------------------------------------------
// Provenance — the harness may never re-credit discovery
// ---------------------------------------------------------------------------------------------

test("discovered_by is pre_stage_design_review and corroborated_by is the harness", () => {
  for (const artefact of Object.values(buildArtefacts(base))) {
    assert.equal(artefact.discovered_by, "pre_stage_design_review");
    assert.equal(artefact.corroborated_by, "stage5q_q0_attack_pack");
  }
});

test("a capture that tries to set discovered_by to the HARNESS cannot — it is not a parameter", () => {
  // F001 was found by a person reading a workflow file. The harness reproduced it afterwards, which
  // is corroboration. Letting a capture claim discovery would be the reporting analogue of R15,
  // fabricated execution reality, committed against ourselves.
  const attempted = buildArtefacts({ ...base, discovered_by: "stage5q_q0_attack_pack" });
  assert.equal(
    attempted.premise.discovered_by,
    "pre_stage_design_review",
    "the field is fixed in the builder, so there is no argument that can move it"
  );
});

test("buildArtefacts refuses to build a premise without both sets", () => {
  assert.throws(() => buildArtefacts({ ...base, named: null }), /requires both sets/);
  assert.throws(() => buildArtefacts({ ...base, existing: undefined }), /requires both sets/);
});

// ---------------------------------------------------------------------------------------------
// The extractors, against the Q0 CAPTURE — and the live workflow, which Q1 repaired.
//
// These two tests used to read the live workflow, because during Q0 the live workflow WAS the
// evidence. Q1 repaired it, and that changes what each test is entitled to assert:
//
//   the historical claim  is recomputed against `stage-5q-q1/f001-workflow-at-q0.yml`, whose digest must
//                         equal the `claim_digest` the frozen ledger committed. F001 stays
//                         demonstrable forever, including after its own repair.
//   the live workflow     is asserted to be REPAIRED — a separate, opposite claim.
//
// The old tripwire could not have caught this landing. `named.length < existing.length` is
// satisfied by a repaired gate that names zero proofs, so the assertion written to fail loudly
// when the fix arrived would have passed in silence. A one-sided tripwire is a countdown, not an
// invariant: it fires on drift in one direction and cannot see the other.
// ---------------------------------------------------------------------------------------------

const Q0_WORKFLOW = "docs/research/llm-shield/evidence/stage-5q-q1/f001-workflow-at-q0.yml";
const Q0_CLAIM_DIGEST = "0ff612ac48ea0d7fffa5e6db19fa88e22ac19f1b2bf31cdcf292363caf6e6e9b";

test("the Q0 capture is the bytes the frozen ledger pinned, and F001 is reproducible from it", () => {
  const bytes = readFileSync(Q0_WORKFLOW);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    Q0_CLAIM_DIGEST,
    "the Q0 capture does not match F001's committed claim_digest — the evidence has moved"
  );
  const named = namedLeanFiles(bytes.toString("utf8"));
  const omitted = JSON.parse(
    readFileSync(
      "docs/research/llm-shield/evidence/stage-5q/findings/F001/false-green.json",
      "utf8"
    )
  ).omitted_while_green;
  assert.ok(named.length > 0, "the Q0 gate named its proofs by hand — that was the defect");
  for (const path of omitted) {
    assert.ok(!named.includes(path), `${path} was recorded as omitted, yet the Q0 gate named it`);
  }
});

test("the LIVE workflow is repaired: it names no proof and delegates to the gate", () => {
  const workflow = readFileSync(".github/workflows/stage-4-lean-proofs.yml", "utf8");
  assert.deepEqual(
    namedLeanFiles(workflow),
    [],
    "the by-name list has regrown — Q1-F001 repaired the camera, and a list is the photograph"
  );
  assert.match(workflow, /check-lean-proofs\.mjs/, "the live workflow must delegate to the gate");
});

test("the gate step is extractable from the Q0 capture", () => {
  const workflow = readFileSync(Q0_WORKFLOW, "utf8");
  const step = extractGateStep(workflow);
  assert.ok(step, "the step that makes the completeness claim must be locatable");
  assert.match(step.step_name, /Type-check the Stage 4 formal core/);
  assert.ok(step.verbatim.includes("lean"), "and its run scalar must be captured");
});

test("listLeanFilesSorted is deterministic and repo-relative", () => {
  const a = listLeanFilesSorted();
  assert.deepEqual(a, listLeanFilesSorted());
  assert.deepEqual(a, [...a].sort());
  for (const f of a) {
    assert.ok(f.startsWith("proofs/"), `${f} must be repo-relative`);
    assert.ok(!f.includes("\\"), "paths are forward-slashed on every platform");
  }
});
