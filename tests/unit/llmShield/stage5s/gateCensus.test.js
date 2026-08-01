// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 32 — the gate census, compared by VALUE.
//
// REVISION 1 CHECKED PRESENCE AND SIX MEANINGLESS STRINGS PASSED (§13, B11). A gate declaring
// `active_phase: "yes"` satisfied every assertion, because the assertion asked whether the field
// existed rather than what it said. Presence checks are how a lifecycle declaration becomes a form
// somebody fills in.
//
// This census compares each gate's complete object field by field against a frozen authority and
// reports drift per field: which gate, which field, from what to what. It also refuses values that
// are present and say nothing — the exact six, by name.

import assert from "node:assert/strict";
import test from "node:test";

import {
  CENSUS_REFUSALS,
  GATE_IDS,
  GATE_LIFECYCLE_AUTHORITY,
  LIFECYCLE_FIELDS,
  checkCensus,
} from "../../../../tools/simurgh-attestation/stage5s/core/gateLifecycle.mjs";

/** The census as the stage declares it — here, the authority itself, checked against itself. */
const census = () => JSON.parse(JSON.stringify(GATE_LIFECYCLE_AUTHORITY));

test("[5s-t32] every gate 5S installs is in the census, as a SET", () => {
  // A gate absent from the census is a gate nobody has to say anything about.
  for (const gate of [
    "G-write-surface",
    "G-lean-proofs",
    "G-claim-gate",
    "G-ci-trigger",
    "G-attestation",
    "G-lane-c-capture",
  ]) {
    assert.ok(GATE_IDS.includes(gate), `${gate} is not in the census`);
  }
});

test("[5s-t32] every gate declares all six lifecycle fields", () => {
  // The standing rule after F002/F004/F005: every stage gate declares its successor behaviour
  // BEFORE freeze.
  for (const gate of GATE_IDS) {
    for (const field of LIFECYCLE_FIELDS) {
      assert.ok(GATE_LIFECYCLE_AUTHORITY[gate][field], `${gate} declares no ${field}`);
    }
  }
  assert.equal(LIFECYCLE_FIELDS.length, 6);
});

test("[5s-t32] the census matches the authority, field by field", () => {
  const result = checkCensus(census());
  assert.equal(result.ok, true, JSON.stringify(result.refusals));
  assert.equal(result.compared, GATE_IDS.length * LIFECYCLE_FIELDS.length);
});

test("[5s-t32] a PRESENT BUT MEANINGLESS value is refused — the revision-1 defect", () => {
  // The six that passed a presence check. Each is refused by name, not by length alone.
  for (const meaningless of ["yes", "no", "n/a", "TBD", "-", "none"]) {
    const c = census();
    c["G-write-surface"].active_phase = meaningless;
    const result = checkCensus(c);
    assert.equal(result.ok, false, `"${meaningless}" passed the census`);
    assert.ok(
      result.refusals.some((r) => r.reason === CENSUS_REFUSALS.FIELD_MEANINGLESS),
      `"${meaningless}" was refused for the wrong reason: ${result.refusals[0]?.reason}`
    );
  }
});

test("[5s-t32] DRIFT is reported per field — which gate, which field, from what to what", () => {
  const c = census();
  c["G-ci-trigger"].next_phase_behaviour =
    "it will widen to every pull request against main, which is convenient";
  const result = checkCensus(c);
  assert.equal(result.ok, false);
  const drift = result.refusals.find((r) => r.reason === CENSUS_REFUSALS.FIELD_DRIFT);
  assert.ok(drift, "drift was not reported");
  assert.equal(drift.gate, "G-ci-trigger");
  assert.equal(drift.field, "next_phase_behaviour");
  assert.match(drift.detail, /declared .*authority says/);
});

test("[5s-t32] a MISSING field is refused, and a missing gate too", () => {
  const missingField = census();
  delete missingField["G-attestation"].anti_vacuity_condition;
  const a = checkCensus(missingField);
  assert.equal(a.ok, false);
  assert.ok(a.refusals.some((r) => r.reason === CENSUS_REFUSALS.FIELD_ABSENT));

  const missingGate = census();
  delete missingGate["G-lane-c-capture"];
  const b = checkCensus(missingGate);
  assert.equal(b.ok, false);
  assert.ok(b.refusals.some((r) => r.reason === CENSUS_REFUSALS.GATE_ABSENT));
});

test("[5s-t32] a gate NOT in the authority is refused — no quiet additions", () => {
  const c = census();
  c["G-invented"] = Object.fromEntries(
    LIFECYCLE_FIELDS.map((f) => [f, "a plausible sentence that is long enough to look real"])
  );
  const result = checkCensus(c);
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === CENSUS_REFUSALS.GATE_UNDECLARED));
});

test("[5s-t32] an EMPTY census is refused, never read as full agreement", () => {
  for (const empty of [{}, null, undefined]) {
    const result = checkCensus(empty);
    assert.equal(result.ok, false, `${JSON.stringify(empty)} passed`);
    assert.equal(result.compared, 0);
  }
});

test("[5s-t32] the CI trigger's successor behaviour names the defect it must not repeat", () => {
  // The one lifecycle field where the wording is load-bearing rather than descriptive: Q1-F005 is
  // named, so a future widening has to argue with a sentence rather than with silence.
  assert.match(
    GATE_LIFECYCLE_AUTHORITY["G-ci-trigger"].next_phase_behaviour,
    /Q1-F005/,
    "the trigger gate does not name the defect it exists to avoid repeating"
  );
});

test("[5s-t32] every anti-vacuity condition says what makes the gate FAIL, not what makes it pass", () => {
  // A gate whose anti-vacuity condition describes success has none.
  for (const gate of GATE_IDS) {
    const condition = GATE_LIFECYCLE_AUTHORITY[gate].anti_vacuity_condition;
    assert.ok(
      /refus|never|fail|must have|not_captured|poison/i.test(condition),
      `${gate}'s anti-vacuity condition describes no failure: ${condition}`
    );
  }
});
