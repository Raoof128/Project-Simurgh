// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §5.1 — the GENERATED typed-outcome discharge ledger.
//
// §2.12 is the frozen law; this is the mutable state it governs. The ledger must be derived from
// EXECUTED verifier behaviour — a row whose premise receipt was written by hand rather than produced
// by running the fixture would be exactly the prose-assertion §2.12 forbids.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDischargeLedger,
  DECLARED_DISCHARGES,
} from "../../../../tools/simurgh-attestation/stage5p/node/typedOutcomeDischarge.mjs";
import { validateDischargeLedger } from "../../../../tools/simurgh-attestation/stage5p/core/dischargeGate.mjs";
import { POLICY_OUTCOMES } from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";

const validate = (ledger, phase) =>
  validateDischargeLedger(ledger, { phase, typedOutcomes: [...POLICY_OUTCOMES] });

test("the ledger carries exactly one row per frozen typed outcome, in the frozen order", () => {
  const l = buildDischargeLedger("draft");
  assert.equal(l.type, "simurgh.vsi.typed_outcome_discharge.v1");
  assert.equal(l.phase, "draft");
  assert.deepEqual(
    l.outcomes.map((r) => r.policy_outcome),
    [...POLICY_OUTCOMES]
  );
});

test("every row is derived from an EXECUTED run — the premise receipt names what actually happened", () => {
  for (const row of buildDischargeLedger("draft").outcomes) {
    if (row.status !== "witnessed") continue;
    assert.equal(row.lane, "A");
    assert.ok(row.fixture_ids.length > 0);
    assert.equal(row.observed_policy_outcome, row.policy_outcome);
    assert.equal(row.observed_check_id, row.expected_check_id);
    // The receipt must carry the executed premise facts, not a description of the fixture.
    assert.match(row.premise_receipt, /ancestor_accepted=true/);
    assert.match(row.premise_receipt, /mutation_applied=true/);
    assert.match(row.premise_receipt, new RegExp(`first_failure=${row.expected_check_id}\\b`));
  }
});

test("the ledger passes its own gate in draft AND in release", () => {
  for (const phase of ["draft", "release"]) {
    const r = validate(buildDischargeLedger(phase), phase);
    assert.deepEqual(r.problems, [], `${phase}: ${JSON.stringify(r.problems, null, 2)}`);
    assert.equal(r.ok, true);
  }
});

test("HONEST STATE: no typed outcome is pending — every one is witnessed by a Lane A fixture", () => {
  const r = validate(buildDischargeLedger("release"), "release");
  assert.deepEqual(r.pending, [], `still pending: ${r.pending.join(", ")}`);
  assert.equal(r.counts.witnessed, POLICY_OUTCOMES.length);
  assert.equal(r.counts.pending, 0);
});

test("byte-stability: two builds serialise identically", () => {
  assert.equal(
    JSON.stringify(buildDischargeLedger("release")),
    JSON.stringify(buildDischargeLedger("release"))
  );
});

// ---- the non-witnessed path is LIVE, not decorative -------------------------------------------

test("a declared reservation flows through the builder instead of being witnessed", () => {
  // PREMISE: nothing is declared today — every outcome earns its row by execution.
  assert.deepEqual(Object.keys(DECLARED_DISCHARGES), []);

  const declared = {
    identity_ephemeral_only: {
      status: "reserved",
      signed_non_claim: "not_proof_of_durable_identity",
      amendment_trigger: "Lane B executes a real keyless ceremony",
      unavailable_in_lanes: ["B", "C2"],
      reason: "no real ceremony has run",
    },
  };
  const l = buildDischargeLedger("release", declared);
  const row = l.outcomes.find((r) => r.policy_outcome === "identity_ephemeral_only");
  assert.equal(row.status, "reserved");
  assert.equal(row.amendment_trigger, "Lane B executes a real keyless ceremony");
  // A declared row must not also carry witness evidence — one hat only.
  assert.equal("fixture_ids" in row, false);
  assert.deepEqual(validate(l, "release").problems, []);
});

test("a declaration that omits its required evidence is caught by the gate, not smuggled through", () => {
  const l = buildDischargeLedger("release", {
    identity_unresolved: { status: "reserved", reason: "we would rather not say" },
  });
  const kinds = validate(l, "release").problems.map((p) => p.kind);
  assert.ok(kinds.includes("reserved_without_non_claim"), JSON.stringify(kinds));
  assert.ok(kinds.includes("reserved_without_amendment_trigger"));
});
