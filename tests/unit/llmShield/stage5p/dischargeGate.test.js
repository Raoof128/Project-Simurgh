// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.12 — the Typed Outcome Discharge Gate.
//
// The expectations here are transcribed from the SPEC's frozen §2.12 law, not read off the
// implementation. The law's whole purpose is to make an unexercised typed outcome IMPOSSIBLE to ship
// quietly, so every clause of it is tested by a ledger that violates exactly that clause — a gate
// never shown to reject is not a gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISCHARGE_STATUSES,
  RELEASE_STATUSES,
  DISCHARGE_PHASES,
  validateDischargeLedger,
} from "../../../../tools/simurgh-attestation/stage5p/core/dischargeGate.mjs";

const OUTCOMES = ["alpha_outcome", "beta_outcome"];

const witnessed = (o) => ({
  policy_outcome: o,
  status: "witnessed",
  lane: "A",
  fixture_ids: ["S2.COV.9"],
  expected_check_id: "S2.C1",
  observed_check_id: "S2.C1",
  observed_policy_outcome: o,
  premise_receipt: "ancestor_accepted=true mutation_applied=true",
});

const ledger = (rows, phase = "draft") => ({
  type: "simurgh.vsi.typed_outcome_discharge.v1",
  phase,
  outcomes: rows,
});

const check = (rows, phase) =>
  validateDischargeLedger(ledger(rows, phase), { phase, typedOutcomes: OUTCOMES });

const kinds = (rows, phase) => check(rows, phase).problems.map((p) => p.kind);

// ---- the vocabulary is the spec's, exactly ----------------------------------------------------

test("the status vocabulary matches §2.12 — three release statuses plus development-only pending", () => {
  assert.deepEqual([...RELEASE_STATUSES], ["witnessed", "mechanically_unreachable", "reserved"]);
  assert.deepEqual(
    [...DISCHARGE_STATUSES],
    ["witnessed", "mechanically_unreachable", "reserved", "pending"]
  );
  assert.deepEqual([...DISCHARGE_PHASES], ["draft", "release"]);
});

// ---- PREMISE: a fully discharged ledger passes in BOTH phases ---------------------------------

test("PREMISE: a complete witnessed ledger is clean in draft AND release", () => {
  const rows = OUTCOMES.map(witnessed);
  for (const phase of DISCHARGE_PHASES) {
    const r = check(rows, phase);
    assert.deepEqual(r.problems, [], `PREMISE FAILED in ${phase}: ${JSON.stringify(r.problems)}`);
    assert.equal(r.ok, true);
  }
});

// ---- draft-mode completeness ------------------------------------------------------------------

test("draft rejects an outcome missing from the ledger", () => {
  assert.deepEqual(kinds([witnessed("alpha_outcome")], "draft"), ["outcome_not_discharged"]);
});

test("draft rejects an outcome discharged twice", () => {
  const rows = [...OUTCOMES.map(witnessed), witnessed("alpha_outcome")];
  assert.ok(kinds(rows, "draft").includes("outcome_discharged_more_than_once"));
});

test("an outcome discharged under two DIFFERENT statuses is caught, not silently last-wins", () => {
  const rows = [...OUTCOMES.map(witnessed), { policy_outcome: "alpha_outcome", status: "pending" }];
  const problems = check(rows, "draft").problems;
  const dup = problems.find((p) => p.kind === "outcome_discharged_more_than_once");
  assert.ok(dup, "duplicate gate is vacuous");
  assert.deepEqual([...dup.statuses].sort(), ["pending", "witnessed"]);
});

test("draft rejects a row for an outcome that is not in the frozen taxonomy", () => {
  const rows = [...OUTCOMES.map(witnessed), witnessed("identity_vibes_acceptable")];
  assert.ok(kinds(rows, "draft").includes("unknown_policy_outcome"));
});

test("draft rejects a status outside the vocabulary", () => {
  const rows = [witnessed("alpha_outcome"), { policy_outcome: "beta_outcome", status: "probably" }];
  assert.ok(kinds(rows, "draft").includes("unknown_status"));
});

test("draft accepts pending — it is legal mid-build and is not a discharge", () => {
  const rows = [witnessed("alpha_outcome"), { policy_outcome: "beta_outcome", status: "pending" }];
  const r = check(rows, "draft");
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
  // ...but it must be reported as undischarged rather than counted as done.
  assert.deepEqual(r.pending, ["beta_outcome"]);
  assert.equal(r.counts.witnessed, 1);
  assert.equal(r.counts.pending, 1);
});

test("draft rejects a witnessed row that names no fixture, or carries no premise receipt", () => {
  const noFixture = { ...witnessed("beta_outcome"), fixture_ids: [] };
  assert.ok(
    kinds([witnessed("alpha_outcome"), noFixture], "draft").includes("witnessed_without_fixture")
  );
  const noReceipt = { ...witnessed("beta_outcome") };
  delete noReceipt.premise_receipt;
  assert.ok(
    kinds([witnessed("alpha_outcome"), noReceipt], "draft").includes("witnessed_without_premise")
  );
});

// ---- release-mode readiness -------------------------------------------------------------------

test("release rejects pending, which draft allowed — the two phases genuinely differ", () => {
  const rows = [witnessed("alpha_outcome"), { policy_outcome: "beta_outcome", status: "pending" }];
  // PREMISE: draft is quiet on this exact ledger.
  assert.deepEqual(check(rows, "draft").problems, [], "PREMISE FAILED: draft already rejects");
  const r = check(rows, "release");
  assert.deepEqual(
    r.problems.map((p) => p.kind),
    ["pending_is_not_a_release_discharge"]
  );
  assert.equal(r.ok, false);
});

test("release rejects a prose-only mechanically_unreachable", () => {
  const bare = {
    policy_outcome: "beta_outcome",
    status: "mechanically_unreachable",
    justification: "it obviously cannot happen",
  };
  const rows = [witnessed("alpha_outcome"), bare];
  const k = kinds(rows, "release");
  assert.ok(k.includes("unreachable_without_proof"), JSON.stringify(k));
  // The complete form passes.
  const full = {
    policy_outcome: "beta_outcome",
    status: "mechanically_unreachable",
    proof_name: "Vsi.lean::outcomeUnreachable",
    bounded_scope: "Lane A verifier, nine checks, sealed synthetic registry",
    reproducible_result: "lake build stage5p: 0 errors, 0 sorry",
  };
  assert.deepEqual(check([witnessed("alpha_outcome"), full], "release").problems, []);
});

test("release rejects an unsigned or triggerless reserved row", () => {
  const triggerless = {
    policy_outcome: "beta_outcome",
    status: "reserved",
    signed_non_claim: "not_proof_of_x",
    unavailable_in_lanes: ["A"],
    reason: "no real ceremony has run",
  };
  assert.ok(
    kinds([witnessed("alpha_outcome"), triggerless], "release").includes(
      "reserved_without_amendment_trigger"
    )
  );
  const unsigned = { ...triggerless, amendment_trigger: "Lane B executes" };
  delete unsigned.signed_non_claim;
  assert.ok(
    kinds([witnessed("alpha_outcome"), unsigned], "release").includes("reserved_without_non_claim")
  );
  const full = { ...triggerless, amendment_trigger: "Lane B executes" };
  assert.deepEqual(check([witnessed("alpha_outcome"), full], "release").problems, []);
});

test("release rejects a witnessed row whose declared outcome disagrees with the verifier", () => {
  const lying = { ...witnessed("beta_outcome"), observed_policy_outcome: "alpha_outcome" };
  assert.ok(
    kinds([witnessed("alpha_outcome"), lying], "release").includes("verifier_disagrees_with_row")
  );
  const wrongCheck = { ...witnessed("beta_outcome"), observed_check_id: "S2.C9" };
  assert.ok(
    kinds([witnessed("alpha_outcome"), wrongCheck], "release").includes(
      "verifier_disagrees_with_row"
    )
  );
});

// ---- a row may not wear two hats --------------------------------------------------------------

test("a row carrying evidence fields belonging to another status is rejected", () => {
  const twoHats = { ...witnessed("beta_outcome"), amendment_trigger: "Lane B executes" };
  assert.ok(
    kinds([witnessed("alpha_outcome"), twoHats], "draft").includes("row_claims_two_statuses")
  );
});

// ---- the gate itself fails closed --------------------------------------------------------------

test("a malformed ledger or unknown phase is rejected, never silently accepted", () => {
  for (const hostile of [undefined, null, 42, "ledger", [], { outcomes: "nope" }]) {
    const r = validateDischargeLedger(hostile, { phase: "draft", typedOutcomes: OUTCOMES });
    assert.equal(r.ok, false, `hostile ledger accepted: ${JSON.stringify(hostile)}`);
  }
  const r = validateDischargeLedger(ledger(OUTCOMES.map(witnessed)), {
    phase: "whenever",
    typedOutcomes: OUTCOMES,
  });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.kind === "unknown_phase"));
});
