// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 12: the delta ledger and the ten-clause discharge predicate.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dischargeCell,
  classifyCell,
  validateDeltaSet,
  buildDeltaLedger,
  DISCHARGE_CLAUSES,
  UNPROBED_REASONS,
  INHERITED_CELLS,
  Q0_DISCHARGED_CELLS,
} from "../../../../tools/simurgh-attestation/stage5r/core/deltaLedger.mjs";

/** A cell that satisfies all ten clauses. */
const cell = (over = {}) => ({
  family_admissible: true,
  obligation_in_committed_pair: true,
  member_source_digest_matches: true,
  execution_completed: true,
  deterministic: true,
  schema_valid: true,
  function_id: "5p:a.mjs:f",
  obligation_id: "obl-1",
  restoration_valid: true,
  already_discharged: false,
  verdict: "detected",
  observed_signal: "field-set differs",
  committed_detector_signal: "field-set differs",
  signal_evidence_verified: true,
  class_specific_outcome_matched: true,
  suppression_invariant: true,
  premise_applies: true,
  ...over,
});

test("there are ten clauses, and detection on the member is the last", () => {
  assert.equal(DISCHARGE_CLAUSES.length, 10);
  assert.equal(DISCHARGE_CLAUSES.at(-1), "target_defect_detected_on_this_member");
});

test("all ten holding discharges the cell", () => {
  assert.deepEqual(dischargeCell(cell()), { discharged: true, failed: [] });
});

test("THE DEFECT THIS CLAUSE EXISTS FOR: nine clauses hold and the probe did not detect", () => {
  // A deterministic, schema-valid `not_detected` satisfies clauses 1-9 completely. The family's
  // triad proves the instrument discriminates ONE committed example; it says nothing about this
  // member. Without clause 10, this cell would have been counted.
  const c = cell({ verdict: "not_detected" });
  const r = dischargeCell(c);
  assert.equal(r.discharged, false);
  assert.deepEqual(r.failed, ["target_defect_detected_on_this_member"]);
});

test("each of the first nine clauses falsified in turn keeps the cell undischarged", () => {
  const breakers = {
    family_admissible: { family_admissible: false },
    obligation_in_committed_pair: { obligation_in_committed_pair: false },
    member_source_digest_matches_closure: { member_source_digest_matches: false },
    probe_execution_completed: { execution_completed: false },
    result_deterministic_across_two_runs: { deterministic: false },
    result_schema_valid_exact_keys: { schema_valid: false },
    result_binds_function_id_and_obligation_id: { obligation_id: null },
    restoration_receipt_valid: { restoration_valid: false },
    not_already_discharged: { already_discharged: true },
  };
  for (const [clause, over] of Object.entries(breakers)) {
    const r = dischargeCell(cell(over));
    assert.equal(r.discharged, false, clause);
    assert.ok(r.failed.includes(clause), `${clause} not named; got ${r.failed.join(",")}`);
  }
});

test("clause 10 fails on ANY of its five parts, not merely on the verdict", () => {
  const parts = [
    { observed_signal: "a different signal" },
    { signal_evidence_verified: false },
    { class_specific_outcome_matched: false },
    { suppression_invariant: false },
  ];
  for (const over of parts) {
    const r = dischargeCell(cell(over));
    assert.equal(r.discharged, false, JSON.stringify(over));
    assert.ok(r.failed.includes("target_defect_detected_on_this_member"));
  }
});

// ---- terminal states ---------------------------------------------------------------------------------

test("premise_not_applicable becomes UNPROBED, never discharged", () => {
  const r = classifyCell(cell({ premise_applies: false }));
  assert.equal(r.state, "unprobed");
  assert.equal(r.reason, "premise_not_applicable");
});

test("a cell in an inadmissible family is inadmissible, not unprobed", () => {
  assert.equal(classifyCell(cell({ family_admissible: false })).state, "inadmissible");
});

test("a FREE-TEXT unprobed reason is refused — the vocabulary is closed", () => {
  assert.equal(UNPROBED_REASONS.length, 7);
  assert.throws(
    () => classifyCell(cell({ unprobed_reason: "it was getting late" })),
    /closed vocabulary/
  );
  assert.equal(classifyCell(cell({ unprobed_reason: "detector_timeout" })).state, "unprobed");
});

test("a discharged cell reports state discharged with no reason", () => {
  const r = classifyCell(cell());
  assert.equal(r.state, "discharged");
  assert.equal(r.reason, undefined);
});

// ---- set semantics -------------------------------------------------------------------------------------

const bounds = () => ({
  universe: new Set(["a", "b", "c"]),
  pairCells: new Set(["a", "b", "c"]),
  q0Discharged: new Set(["z"]),
});

test("a canonical, unique, in-bounds delta validates", () => {
  assert.equal(validateDeltaSet(["a", "b"], bounds()).ok, true);
});

test("a DUPLICATE id is refused — an array is not a set", () => {
  const r = validateDeltaSet(["a", "a"], bounds());
  assert.equal(r.ok, false);
  assert.match(r.reason, /duplicate/);
});

test("an UNSORTED delta is refused, so the ledger describes a set rather than a listing", () => {
  const r = validateDeltaSet(["b", "a"], bounds());
  assert.equal(r.ok, false);
  assert.match(r.reason, /canonical order/);
});

test("an id outside the inherited universe is refused", () => {
  assert.match(validateDeltaSet(["q"], bounds()).reason, /not in the inherited universe/);
});

test("an id outside the family's own committed pair is refused", () => {
  const b = bounds();
  b.pairCells = new Set(["a"]);
  assert.match(validateDeltaSet(["a", "b"], b).reason, /outside the family's committed pair/);
});

test("T5: claiming a cell 5Q already discharged is refused", () => {
  const b = bounds();
  b.universe.add("z");
  b.pairCells.add("z");
  assert.match(validateDeltaSet(["z"], b).reason, /already discharged by 5Q/);
});

// ---- the ledger -----------------------------------------------------------------------------------------

test("the inherited denominator is a constant and both figures stay visible together", () => {
  const l = buildDeltaLedger({ newlyDischarged: [] });
  assert.equal(l.inherited_cells, INHERITED_CELLS);
  assert.equal(l.q0_original_coverage_percent, "6.2");
  assert.equal(l.q0_original_discharged, Q0_DISCHARGED_CELLS);
  assert.equal(l.cumulative_5r_coverage_percent, "6.2");
  assert.equal(l.label, "5R cumulative");
  assert.equal("coverage" in l, false, "there is no bare coverage field");
});

test("the cumulative figure moves only with new work, and the arithmetic checks", () => {
  const ids = Array.from({ length: 100 }, (_, i) => `obl-${String(i).padStart(4, "0")}`);
  const l = buildDeltaLedger({ newlyDischarged: ids });
  assert.equal(l.newly_discharged_count, 100);
  assert.equal(l.cumulative_5r_discharged, 1538);
  assert.equal(l.cumulative_5r_coverage_percent, "6.6");
  assert.equal(l.still_undischarged_cells, INHERITED_CELLS - 1538);
  assert.equal(l.q0_original_coverage_percent, "6.2", "5Q's figure is untouched by 5R's work");
});

test("the ledger has no key capable of holding another 5Q-era figure", () => {
  const l = buildDeltaLedger({ newlyDischarged: [] });
  const forbidden = Object.keys(l).filter((k) => /revised|adjusted|restated|corrected/i.test(k));
  assert.deepEqual(forbidden, []);
  // The sentence the ruling forbids cannot be constructed from this data.
  assert.equal(l.q0_original_discharged, 1438);
  assert.equal(l.inherited_cells, 23332);
});

test("duplicates and unknown unprobed reasons are refused at ledger build", () => {
  assert.throws(() => buildDeltaLedger({ newlyDischarged: ["a", "a"] }), /duplicates/);
  assert.throws(
    () => buildDeltaLedger({ newlyDischarged: [], unprobedByReason: { because_friday: 3 } }),
    /closed vocabulary/
  );
});

test("unprobed counts are emitted in a stable order", () => {
  const l = buildDeltaLedger({
    newlyDischarged: [],
    unprobedByReason: { resource_limit: 2, detector_timeout: 1 },
  });
  assert.deepEqual(Object.keys(l.unprobed_by_reason), ["detector_timeout", "resource_limit"]);
});
