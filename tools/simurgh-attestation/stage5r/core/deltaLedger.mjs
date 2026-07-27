// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 12: the delta ledger, and the ten-clause discharge predicate.
//
// §6.2's three guarantees are structural here rather than procedural: `INHERITED_CELLS` is a frozen
// constant and the ledger has no key capable of holding another 5Q-era denominator or numerator, so
// the sentence the ruling forbids cannot be constructed from the data. `cumulative_coverage` is
// always labelled `5R cumulative` and always carries the inherited 6.2% beside it. There is no bare
// `coverage` field.
//
// CLAUSE 10 IS THE ONE THE FIRST NINE DID NOT IMPLY. A probe returning a deterministic, schema-valid
// `not_detected` satisfies clauses 1–9 completely: the family is admissible, the obligation is in the
// committed pair, the digest matches, execution completed, the result is stable and well formed, the
// ids bind, restoration is proven, and nobody discharged it before. None of that says the defect was
// found ON THIS MEMBER. The family's control triad proves the instrument can discriminate one
// committed example; it says nothing about the other 581. Without clause 10, Ruling 1 still permits
// per-cell promotion — the generalisation this whole stage exists to refuse, smuggled back in at the
// smallest possible grain.
//
// A JSON ARRAY IS NOT A SET. Unique, canonically sorted, duplicates refused, every id a member of the
// inherited universe, every id inside its family's committed pair, disjoint across families and
// disjoint from 5Q's discharged set.

import { tenths } from "./measurements.mjs";

/** Frozen by §6.2. There is no key that can hold a different value. */
export const INHERITED_CELLS = 23332;

/** 5Q's published discharge count. It does not move, ever. */
export const Q0_DISCHARGED_CELLS = 1438;

/** The closed vocabulary for a cell that was not probed. Free text is an omission-laundering tunnel. */
export const UNPROBED_REASONS = Object.freeze([
  "unsupported_target_shape",
  "premise_not_applicable",
  "detector_timeout",
  "execution_error",
  "non_deterministic_result",
  "resource_limit",
  "unsafe_to_execute",
]);

/** The four terminal states of a cell in an attempted pair. */
export const CELL_STATES = Object.freeze([
  "discharged",
  "probed_not_discharged",
  "unprobed",
  "inadmissible",
]);

/**
 * Why a cell that WAS probed still did not discharge.
 *
 * `probed_not_discharged` exists because the first three states could not say this truthfully. A
 * member the probe reached and found clean is not `unprobed` — something was probed — and it is not
 * `discharged`, because clause 10 requires the defect to be found ON THIS MEMBER. Routing it through
 * `unprobed: execution_error`, as this module first did, would have published "an error occurred"
 * about 2 406 cells where nothing went wrong at all.
 *
 * The distinction matters more than it looks: it is the difference between "we have not looked" and
 * "we looked and this instrument cannot conclude", and only the second is an honest description of a
 * static probe over a member whose class-specific outcome was never executed.
 */
export const NOT_DISCHARGED_REASONS = Object.freeze([
  "defect_signal_absent",
  "class_outcome_not_demonstrated",
]);

/** The ten clauses, in order. All ten, or the cell is not discharged. */
export const DISCHARGE_CLAUSES = Object.freeze([
  "family_admissible",
  "obligation_in_committed_pair",
  "member_source_digest_matches_closure",
  "probe_execution_completed",
  "result_deterministic_across_two_runs",
  "result_schema_valid_exact_keys",
  "result_binds_function_id_and_obligation_id",
  "restoration_receipt_valid",
  "not_already_discharged",
  "target_defect_detected_on_this_member",
]);

/**
 * Evaluate the discharge predicate for one cell.
 *
 * @param {object} c the cell's observation record
 * @returns {{discharged: boolean, failed: string[]}}
 */
export function dischargeCell(c) {
  const failed = [];
  const check = (id, ok) => {
    if (!ok) failed.push(id);
  };

  check("family_admissible", c?.family_admissible === true);
  check("obligation_in_committed_pair", c?.obligation_in_committed_pair === true);
  check("member_source_digest_matches_closure", c?.member_source_digest_matches === true);
  check("probe_execution_completed", c?.execution_completed === true);
  check("result_deterministic_across_two_runs", c?.deterministic === true);
  check("result_schema_valid_exact_keys", c?.schema_valid === true);
  check(
    "result_binds_function_id_and_obligation_id",
    Boolean(c?.function_id) && Boolean(c?.obligation_id)
  );
  check("restoration_receipt_valid", c?.restoration_valid === true);
  check("not_already_discharged", c?.already_discharged !== true);

  // Clause 10, in its five parts. Every one of them is about THIS member.
  const ten =
    c?.verdict === "detected" &&
    c?.observed_signal === c?.committed_detector_signal &&
    c?.signal_evidence_verified === true &&
    c?.class_specific_outcome_matched === true &&
    c?.suppression_invariant === true &&
    c?.premise_applies === true;
  check("target_defect_detected_on_this_member", ten);

  return { discharged: failed.length === 0, failed };
}

/**
 * Assign a terminal state, refusing the two ways a cell could quietly go missing.
 *
 * `premise_not_applicable` becomes `unprobed`, NEVER `discharged` — a cell whose premise does not
 * apply was not tested, and calling it discharged would count a cell nobody probed.
 *
 * @param {object} c
 * @returns {{state: string, reason?: string, failed?: string[]}}
 */
export function classifyCell(c) {
  if (c?.family_admissible !== true) return { state: "inadmissible", reason: "family failed §4.1" };
  if (c?.unprobed_reason) {
    if (!UNPROBED_REASONS.includes(c.unprobed_reason)) {
      throw new Error(
        `unprobed reason "${c.unprobed_reason}" is not in the closed vocabulary: ${UNPROBED_REASONS.join(", ")}`
      );
    }
    return { state: "unprobed", reason: c.unprobed_reason };
  }
  if (c?.premise_applies === false) return { state: "unprobed", reason: "premise_not_applicable" };
  const d = dischargeCell(c);
  if (d.discharged) return { state: "discharged" };

  // The probe reached this member and did not discharge it. Which of the two is true is a fact about
  // the evidence, not a default: a signal that never fired and a signal that fired without the class
  // outcome being demonstrated are different results, and neither is an error.
  if (c?.not_discharged_reason) {
    if (!NOT_DISCHARGED_REASONS.includes(c.not_discharged_reason)) {
      throw new Error(
        `not-discharged reason "${c.not_discharged_reason}" is outside the closed vocabulary: ` +
          NOT_DISCHARGED_REASONS.join(", ")
      );
    }
    return { state: "probed_not_discharged", reason: c.not_discharged_reason, failed: d.failed };
  }
  if (c?.execution_completed !== true || c?.deterministic !== true || c?.schema_valid !== true) {
    return { state: "unprobed", reason: "execution_error", failed: d.failed };
  }
  return {
    state: "probed_not_discharged",
    reason: c?.verdict === "detected" ? "class_outcome_not_demonstrated" : "defect_signal_absent",
    failed: d.failed,
  };
}

/**
 * Validate a delta as a SET, not an array.
 *
 * @param {string[]} ids
 * @param {{universe: Set<string>, pairCells: Set<string>, q0Discharged: Set<string>}} bounds
 * @returns {{ok: boolean, reason?: string}}
 */
export function validateDeltaSet(ids, { universe, pairCells, q0Discharged }) {
  if (!Array.isArray(ids)) return { ok: false, reason: "delta: not an array" };
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) return { ok: false, reason: `delta: duplicate obligation_id ${id}` };
    seen.add(id);
  }
  const sorted = [...ids].sort();
  if (ids.some((id, i) => id !== sorted[i])) {
    return { ok: false, reason: "delta: ids are not in canonical order" };
  }
  for (const id of ids) {
    if (!universe.has(id))
      return { ok: false, reason: `delta: ${id} is not in the inherited universe` };
    if (pairCells && !pairCells.has(id)) {
      return { ok: false, reason: `delta: ${id} lies outside the family's committed pair` };
    }
    if (q0Discharged.has(id)) {
      return { ok: false, reason: `delta: ${id} was already discharged by 5Q (T5)` };
    }
  }
  return { ok: true };
}

/**
 * Build the delta ledger. Both figures stay visible, always, in the same relationship.
 *
 * @param {{newlyDischarged: string[], newFindings: number, unprobedByReason: Record<string, number>}} input
 * @returns {object}
 */
export function buildDeltaLedger({
  newlyDischarged,
  newFindings = 0,
  unprobedByReason = {},
  notDischargedByReason = {},
}) {
  const unique = [...new Set(newlyDischarged)].sort();
  if (unique.length !== newlyDischarged.length) {
    throw new Error("delta ledger: newly_discharged_cells contains duplicates");
  }
  for (const reason of Object.keys(unprobedByReason)) {
    if (!UNPROBED_REASONS.includes(reason)) {
      throw new Error(`delta ledger: unprobed reason "${reason}" is outside the closed vocabulary`);
    }
  }
  for (const reason of Object.keys(notDischargedByReason)) {
    if (!NOT_DISCHARGED_REASONS.includes(reason)) {
      throw new Error(
        `delta ledger: not-discharged reason "${reason}" is outside the closed vocabulary`
      );
    }
  }
  const cumulative = Q0_DISCHARGED_CELLS + unique.length;
  return {
    schema: "simurgh.vpf.delta-ledger.v1",
    inherited_cells: INHERITED_CELLS,
    newly_discharged_cells: unique,
    newly_discharged_count: unique.length,
    new_findings: newFindings,
    still_undischarged_cells: INHERITED_CELLS - cumulative,
    unprobed_by_reason: Object.fromEntries(
      Object.keys(unprobedByReason)
        .sort()
        .map((k) => [k, unprobedByReason[k]])
    ),
    probed_not_discharged_by_reason: Object.fromEntries(
      Object.keys(notDischargedByReason)
        .sort()
        .map((k) => [k, notDischargedByReason[k]])
    ),
    q0_original_coverage_percent: (tenths(Q0_DISCHARGED_CELLS, INHERITED_CELLS) / 10).toFixed(1),
    q0_original_discharged: Q0_DISCHARGED_CELLS,
    cumulative_5r_coverage_percent: (tenths(cumulative, INHERITED_CELLS) / 10).toFixed(1),
    cumulative_5r_discharged: cumulative,
    label: "5R cumulative",
  };
}
