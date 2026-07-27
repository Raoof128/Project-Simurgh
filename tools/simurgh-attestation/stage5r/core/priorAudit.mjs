// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 21: the audit 5R owes 5Q.
//
// THE QUESTION, AND WHY ITS ANSWER BEING KNOWN IS NOT A PROBLEM.
//
//   Do the six signed 5Q family artefacts, as they stood, satisfy 5R's §4.1 contract?
//
// No, and that was knowable before the code was written: the mandatory triad did not exist when they
// were built. So NO SCORE MOVES ON THIS AUDIT. An earlier draft of the plan made a Frontier score
// conditional on finding one of the six inadmissible — a result guaranteed by construction — which
// is the outcome-shopping this stage exists to catch, committed in the scoring rubric itself.
//
// What is NOT predetermined, and is therefore worth computing rather than asserting, is WHICH of the
// seven conditions fail and which hold. Four of them are properties of the signed data and are
// derived here from it: whether every discharge carries a recomputed premise, whether every
// identifier binds to the inherited closure, how many security roles each family's discharges
// actually spanned, and whether the artefact records restoration at all.
//
// THIS JUDGES A HISTORICAL ARTEFACT AGAINST A LATER CONTRACT, and every record says so in its own
// text. 5Q's six families were admitted under L4's one-mutant-per-class rule and were not defective
// under it. The 1 438 cells 5Q discharged are not retroactively removed — L5 forbids rewriting a
// frozen record — and this audit removes nothing. It records that a discharge 5R inherited would not
// be admissible under the stronger rule, which is a different statement and the only honest one.
//
// A stage whose blade is "one mutant is not enough" that declined to apply the blade to its own
// predecessor would be exempting itself from its own thesis.

import { SEVEN_CONDITIONS } from "./admissibility.mjs";

/** How a condition can stand against an artefact written before the contract existed. */
export const CONDITION_STATES = Object.freeze([
  "holds",
  "absent", // the contract requires an object this artefact does not contain at all
  "not_evaluable", // the object exists, and the signed artefact does not record enough to judge it
]);

/**
 * Refuse a condition list that is not §4.1's seven, in §4.1's order.
 *
 * Exported so it can be tested against a reordering, which is the only way this guard can be shown to
 * work: inside `auditFamily` the list is a literal, and a guard that cannot be made to fire is a
 * comment with parentheses.
 *
 * @param {string[]} ids
 */
export function assertConditionOrder(ids) {
  if (JSON.stringify(ids) !== JSON.stringify([...SEVEN_CONDITIONS])) {
    throw new Error("prior audit: the conditions are not §4.1's seven, in §4.1's order");
  }
}

/** §4.1 admits on `holds` alone. Anything else is a condition that does not hold. */
export function verdictFor(conditions) {
  const failing = conditions.filter((c) => c.state !== "holds").map((c) => c.id);
  return { admissible_under_5r: failing.length === 0, failing_conditions: failing };
}

/**
 * Audit one 5Q family against §4.1, deriving what can be derived from the signed data.
 *
 * @param {{family: object, discharges: Array<object>, roleOf: Map<string,string>,
 *          closureIds: Set<string>, artefactHasRestorationReceipt: boolean}} input
 * @returns {object}
 */
export function auditFamily({
  family,
  discharges,
  roleOf,
  closureIds,
  artefactHasRestorationReceipt,
}) {
  const mine = discharges.filter((d) => d.family_id === family.family_id);
  const withPremise = mine.filter((d) => typeof d.premise_receipt_digest === "string").length;
  const bound = mine.filter(
    (d) => closureIds.has(d.function_id) && typeof d.obligation_id === "string"
  ).length;
  const roles = [...new Set(mine.map((d) => roleOf.get(d.function_id)).filter(Boolean))].sort();

  const conditions = [
    {
      id: "vulnerable_control_detected",
      state: "absent",
      detail:
        "the artefact records one probe per member and no control triad; there is no vulnerable " +
        "control to have been detected",
    },
    {
      id: "safe_control_not_detected",
      state: "absent",
      detail:
        "no safe control exists, so no not-detection can be attributed to its absence of defect",
    },
    {
      id: "orthogonal_failure_not_misclassified",
      state: "absent",
      detail:
        "no orthogonal failure control exists — §1.4's load-bearing one. Without it a probe that " +
        "flags every crash, malformed input or non-zero exit scores a perfect pair and ships",
    },
    {
      id: "premises_recomputed",
      state: mine.length > 0 && withPremise === mine.length ? "holds" : "not_evaluable",
      detail: `${withPremise} of ${mine.length} discharges carry a premise receipt digest`,
    },
    {
      id: "target_role_matches_claimed_applicability",
      state: "not_evaluable",
      detail:
        `the family declares categories (${family.categories.join(", ")}), not a security role, ` +
        `and its discharges span ${roles.length} role(s): ${roles.join(", ")}. A category is not a ` +
        "role, so there is no claimed applicability for an observed role to match",
      roles_spanned: roles,
    },
    {
      id: "results_bind_to_inherited_closure",
      state: mine.length > 0 && bound === mine.length ? "holds" : "not_evaluable",
      detail: `${bound} of ${mine.length} discharges carry a closure function_id and an obligation_id`,
    },
    {
      id: "mutation_restored_proven",
      state: artefactHasRestorationReceipt ? "holds" : "not_evaluable",
      detail: artefactHasRestorationReceipt
        ? "the artefact records a restoration receipt"
        : "this signed artefact records no restoration receipt; 5Q proved a clean worktree in its " +
          "mutation self-proof, which is a different artefact about a different run",
    },
  ];

  // The order is §4.1's, checked rather than assumed — a reordered list would silently rename results.
  assertConditionOrder(conditions.map((c) => c.id));

  return {
    audited_family_id: family.family_id,
    attack_class: family.attack_class,
    declared_categories: family.categories,
    pack_id: family.pack_id,
    intent: family.intent,
    discharges_examined: mine.length,
    roles_spanned: roles,
    question:
      "Does this signed 5Q family artefact, as it stood, satisfy 5R's §4.1 seven-condition contract?",
    judges_a_historical_artefact_against_a_later_contract: true,
    admitted_under: "5Q Law 4, one green→red→green mutation receipt per attack class",
    conditions,
    ...verdictFor(conditions),
    nothing_is_removed:
      "5Q's discharges stand. This records that a discharge 5R inherited would not be admissible " +
      "under the stronger rule; it does not withdraw one.",
  };
}
