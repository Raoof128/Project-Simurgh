// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 21 — the Q0→Q1 transition contract.
//
// Seven conditions, and each must fail INDEPENDENTLY. A gate that fails as a lump tells you
// something broke; a gate that names T4 tells you what to fix. Every test below breaks exactly one
// condition and asserts the other six still hold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  attributeManifest,
  evaluateTransition,
  manifestGaps,
  TRANSITION_CONDITIONS,
  UNCOVERED_STAGES,
  COVERED_BY_OWN_WORKFLOW,
  FROZEN_BLOCK_DIGEST,
} from "../../../../tools/simurgh-attestation/stage5q/core/transition.mjs";

/** A world in which all seven hold. Each test breaks one thing. */
const GREEN = () => ({
  attestation: {
    verified: true,
    roots_recomputed: true,
    root_count: 10,
    inadmissible_classes: [],
  },
  coverage: { member_count: 3, statused: 3, duplicated: 0 },
  ledger: { chain_ok: true, broken_at: null, record_count: 12, q1_record_count: 0 },
  frozenBlockDigest: FROZEN_BLOCK_DIGEST,
  manifestResults: [{ command: "check-e2e.sh", ok: true }],
});

const only = (result, id) => result.conditions.find((c) => c.id === id);
const othersHold = (result, id) => result.conditions.filter((c) => c.id !== id).every((c) => c.ok);

test("all seven hold in the green world, and there are exactly seven", () => {
  const r = evaluateTransition(GREEN());
  assert.equal(TRANSITION_CONDITIONS.length, 7);
  assert.equal(r.conditions.length, 7);
  assert.equal(r.q1_authorised, true);
});

test("T1 fails alone when the attestation does not verify", () => {
  const w = GREEN();
  w.attestation.verified = false;
  const r = evaluateTransition(w);
  assert.equal(only(r, "T1").ok, false);
  assert.ok(othersHold(r, "T1"));
});

test("T1 also fails when the signature verifies but the roots were never recomputed", () => {
  // The whole point. A valid signature over stale claims verifies perfectly and means nothing.
  const w = GREEN();
  w.attestation.roots_recomputed = false;
  const r = evaluateTransition(w);
  assert.equal(only(r, "T1").ok, false);
  assert.match(only(r, "T1").detail, /roots were not recomputed/);
});

test("T2 permits a RECORDED inadmissible class but blocks stage release", () => {
  // Transition is not release (P1-38). Q0 may freeze an incomplete result honestly; the stage does
  // not ship until every required class is admissible.
  const w = GREEN();
  w.attestation.inadmissible_classes = ["R5", "R7"];
  const r = evaluateTransition(w);
  assert.equal(only(r, "T2").ok, true, "recording it is what T2 asks for");
  assert.equal(r.q1_authorised, true);
  assert.equal(r.stage_release_blocked, true);
  assert.match(r.release_blocked_reason, /R5, R7/);
});

test("T2 fails when inadmissibility is CONCEALED rather than recorded", () => {
  const w = GREEN();
  delete w.attestation.inadmissible_classes;
  const r = evaluateTransition(w);
  assert.equal(only(r, "T2").ok, false);
  assert.match(only(r, "T2").detail, /concealed/);
});

test("T3 fails in BOTH directions — unstatused and duplicated are different failures", () => {
  const unstatused = GREEN();
  unstatused.coverage = { member_count: 3, statused: 2, duplicated: 0 };
  const a = evaluateTransition(unstatused);
  assert.equal(only(a, "T3").ok, false);
  assert.match(only(a, "T3").detail, /carry NO status — uncovered, not covered/);
  assert.ok(othersHold(a, "T3"));

  const duplicated = GREEN();
  duplicated.coverage = { member_count: 3, statused: 3, duplicated: 1 };
  const b = evaluateTransition(duplicated);
  assert.equal(only(b, "T3").ok, false);
  assert.match(only(b, "T3").detail, /more than one status/);
});

test("T3 fails over an EMPTY universe — zero members is not 'all members statused'", () => {
  const w = GREEN();
  w.coverage = { member_count: 0, statused: 0, duplicated: 0 };
  const r = evaluateTransition(w);
  assert.equal(only(r, "T3").ok, false, "0 === 0 must not certify a universe with nothing in it");
});

test("T4 fails alone when the chain breaks, and names the record", () => {
  const w = GREEN();
  w.ledger = { chain_ok: false, broken_at: 3, record_count: 12, q1_record_count: 0 };
  const r = evaluateTransition(w);
  assert.equal(only(r, "T4").ok, false);
  assert.match(only(r, "T4").detail, /record 3/);
  assert.ok(othersHold(r, "T4"));
});

test("T5 detects a Q1 record present before the freeze", () => {
  const w = GREEN();
  w.ledger.q1_record_count = 1;
  const r = evaluateTransition(w);
  assert.equal(only(r, "T5").ok, false);
  assert.ok(othersHold(r, "T5"));
});

test("T6 catches an in-place spec edit", () => {
  const w = GREEN();
  w.frozenBlockDigest = "0".repeat(64);
  const r = evaluateTransition(w);
  assert.equal(only(r, "T6").ok, false);
  assert.match(only(r, "T6").detail, /frozen block moved/);
  assert.ok(othersHold(r, "T6"));
});

test("T7 NOT RUN is a failure, not a skip", () => {
  // The earlier version of this gate used `cmd || echo "REGRESSED"`, which prints the failure and
  // exits successfully — the fail-open shell shape this stage prohibits everywhere else, written
  // into the gate meant to catch regressions.
  const w = GREEN();
  w.manifestResults = null;
  const r = evaluateTransition(w);
  assert.equal(only(r, "T7").ok, false);
  assert.match(only(r, "T7").detail, /did not run — that is not a pass/);

  const empty = GREEN();
  empty.manifestResults = [];
  assert.equal(only(evaluateTransition(empty), "T7").ok, false, "an empty manifest ran nothing");
});

test("T7 names which command regressed", () => {
  const w = GREEN();
  w.manifestResults = [
    { command: "check-e2e.sh", ok: true },
    { command: "scripts/reproduce-llm-shield-stage5k.sh", ok: false },
  ];
  const r = evaluateTransition(w);
  assert.equal(only(r, "T7").ok, false);
  assert.match(only(r, "T7").detail, /stage5k/);
});

// ------------------------------------------------------------------------------------------------
// The manifest is pinned against reality.
// ------------------------------------------------------------------------------------------------

test("every stage-5 reproduce script is accounted for by SOME gate", () => {
  // A future stage's script landing in none of the three categories is exactly how a
  // non-disturbance check quietly stops covering a stage. This test is what makes the manifest a
  // pin rather than an assumption.
  const allScripts = readdirSync("scripts")
    .filter((f) => /^reproduce-llm-shield-stage5[a-p]\.sh$/.test(f))
    .map((f) => `scripts/${f}`)
    .sort();
  const checkE2e = readFileSync("scripts/check-e2e.sh", "utf8");
  const covered = allScripts.filter((s) => checkE2e.includes(s.replace("scripts/", "")));
  assert.deepEqual(manifestGaps({ allStageScripts: allScripts, coveredByCheckE2e: covered }), []);
});

test("the three coverage categories are DISJOINT — a script is gated by one gate", () => {
  const overlap = UNCOVERED_STAGES.filter((s) => COVERED_BY_OWN_WORKFLOW.includes(s));
  assert.deepEqual(overlap, [], "a stage in two categories has two answers to 'what runs it'");
});

test("the pinned uncovered list matches what check-e2e.sh actually omits", () => {
  const checkE2e = readFileSync("scripts/check-e2e.sh", "utf8");
  const omitted = UNCOVERED_STAGES.filter(
    (s) => !checkE2e.includes(`reproduce-llm-shield-stage${s}.sh`)
  );
  assert.deepEqual(
    omitted.sort(),
    [...UNCOVERED_STAGES].sort(),
    "a stage in the uncovered list IS covered by check-e2e.sh; the pin has drifted"
  );
});

test("Task 21 produces no evidence — the validator is validation only", () => {
  // Everything it reads was frozen by Task 20. A file written here would be evidence produced
  // after the declared endpoint, which is the ghost-producer shape the tail reordering removed.
  const source = readFileSync(
    "tools/simurgh-attestation/stage5q/node/verifyTransition.mjs",
    "utf8"
  );
  assert.equal(/writeFileSync|mkdirSync/.test(source), false, "the validator writes something");
});

// ------------------------------------------------------------------------------------------------
// Attribution — who broke it. Added after T7's first real run found five prior-stage failures that
// 5Q did not cause.
// ------------------------------------------------------------------------------------------------

test("a failure identical at the merge-base is PRE-EXISTING, not a Q0 regression", () => {
  // Reporting an already-broken prior stage as "5Q regressed it" is a false attribution — the
  // reporting analogue of the false findings this stage spent its length refusing to publish.
  const a = attributeManifest(
    [{ command: "check-e2e.sh", ok: false }],
    [{ command: "check-e2e.sh", ok: false }]
  );
  assert.deepEqual(a.pre_existing, ["check-e2e.sh"]);
  assert.deepEqual(a.regressed_by_q0, []);
});

test("a failure that was GREEN at the merge-base is a Q0 regression", () => {
  const a = attributeManifest(
    [{ command: "check-e2e.sh", ok: false }],
    [{ command: "check-e2e.sh", ok: true }]
  );
  assert.deepEqual(a.regressed_by_q0, ["check-e2e.sh"]);
  assert.deepEqual(a.pre_existing, []);
});

test("with NO baseline, a failure is not_compared — never 'not our fault'", () => {
  const a = attributeManifest([{ command: "x", ok: false }], null);
  assert.deepEqual(a.not_compared, ["x"]);
  assert.deepEqual(a.pre_existing, [], "we did not check, so we may not say it pre-existed");
});

test("T7 STILL FAILS on a pre-existing failure — attribution does not weaken the condition", () => {
  // A stage does not get to redefine its own gate when the gate fires. T7 asks whether the manifest
  // is green; attribution asks whether Q0 is why it is not. Both answers, neither substituting.
  const w = GREEN();
  w.manifestResults = [{ command: "check-e2e.sh", ok: false }];
  w.baselineResults = [{ command: "check-e2e.sh", ok: false }];
  const r = evaluateTransition(w);
  assert.equal(only(r, "T7").ok, false, "T7 must still fail");
  assert.match(only(r, "T7").detail, /PRE-EXISTING/);
  assert.equal(r.q1_authorised, false);
  assert.equal(r.q0_disturbed_a_prior_stage, false, "but Q0 did not cause it");
});

test("q0_disturbed_a_prior_stage is null when nothing ran — not false", () => {
  const w = GREEN();
  w.manifestResults = null;
  assert.equal(evaluateTransition(w).q0_disturbed_a_prior_stage, null);
});
