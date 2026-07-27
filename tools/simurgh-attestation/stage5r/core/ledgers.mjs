// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 23: the finding ledger, the delta ledger, and the four-term disclosure.
//
// TWO RULES GOVERN EVERY NUMBER BELOW, and §6.2 makes them structural rather than aspirational:
// `inherited_cells` is the constant 23 332 with no field able to hold another value, and every
// published figure carries all four terms together so a coverage number cannot travel alone.
//
// THE LEDGER RECORDS FINDINGS AGAINST 5R ITSELF. §7.3 names the gap it is closing: 5Q published
// twelve findings and every one of them named another stage. Its own harness defects — ten drivers
// running on import, a fail-open in its own gate, four false findings — were repaired during the
// campaign and narrated in the closeout, not frozen under signature. That is a defensible choice for
// defects fixed before a freeze and it is also a gap, because a stage's self-criticism living in
// prose while its criticism of others lives under signature is not the same standard applied twice.
//
// 5Q'S OWN `disposition` IS QUOTED, NEVER REPLACED. 5R adds `vpf_disposition` beside it. A successor
// writing its own value into a key its predecessor already signed would be overwriting the record
// while calling it inheritance — the smallest possible version of the move this stage exists to
// forbid.

import { tenths } from "./measurements.mjs";
import { INHERITED_CELLS, Q0_DISCHARGED_CELLS } from "./deltaLedger.mjs";

/** Severities 5R may assign, in increasing strength. */
export const SEVERITIES = Object.freeze(["assurance_only", "claim_narrowing"]);

/** The under-supported denominator, recomputed by G0 and never restated by hand. */
export const UNDER_SUPPORTED_CELLS = 15301;

/** The family universe. A tranche is a schedule; the universe is not. */
export const UNIVERSE_PAIRS = 55;

/**
 * §11.5's four terms, always together.
 *
 * A coverage number that travels without its denominators is the shape every T-class in the threat
 * model eventually takes, so the disclosure emits both triples or neither.
 *
 * @param {{admissible: number, attempted: number, newlyDischarged: number}} input
 * @returns {object}
 */
export function fourTermDisclosure({ admissible, attempted, newlyDischarged }) {
  if (![admissible, attempted, newlyDischarged].every(Number.isInteger)) {
    throw new TypeError("four-term disclosure: every term must be an integer count");
  }
  if (admissible > attempted) {
    throw new Error("four-term disclosure: more families admissible than attempted");
  }
  if (attempted > UNIVERSE_PAIRS) {
    throw new Error("four-term disclosure: more families attempted than the universe holds");
  }
  return {
    families: {
      admissible,
      attempted,
      universe: UNIVERSE_PAIRS,
      text: `${admissible} admissible / ${attempted} attempted / ${UNIVERSE_PAIRS} in the universe`,
    },
    cells: {
      newly_discharged: newlyDischarged,
      under_supported: UNDER_SUPPORTED_CELLS,
      inherited: INHERITED_CELLS,
      text:
        `${newlyDischarged} newly discharged / ${UNDER_SUPPORTED_CELLS} under-supported / ` +
        `${INHERITED_CELLS} inherited`,
    },
    // Integer round-half-up, in tenths of a percent, so no float ever decides a published figure.
    percent_of_under_supported: (tenths(newlyDischarged, UNDER_SUPPORTED_CELLS) / 10).toFixed(1),
    percent_of_inherited: (tenths(newlyDischarged, INHERITED_CELLS) / 10).toFixed(1),
    both_triples_or_neither:
      "A coverage figure may not be published without all four terms. §11.5, and the reason it is a " +
      "rule rather than a habit: every threat class in §1.7 ends in a number that travelled alone.",
  };
}

/**
 * The 55-row family-result census (Ruling 3).
 *
 * Total over the universe by construction: the pairs outside the tranche carry
 * `not_attempted_in_this_tranche`, so an unattempted pair is NAMED rather than absent, and the row
 * count is the census's own check.
 *
 * @param {Array<object>} pairs
 * @returns {object}
 */
export function familyResultCensus(pairs) {
  if (pairs.length !== UNIVERSE_PAIRS) {
    throw new Error(
      `family result census: ${pairs.length} rows, and the universe has ${UNIVERSE_PAIRS}`
    );
  }
  const byState = {};
  for (const p of pairs) {
    if (!p.terminal_state)
      throw new Error(`${p.attack_class} × ${p.target_security_role}: no state`);
    byState[p.terminal_state] = (byState[p.terminal_state] ?? 0) + 1;
  }
  return {
    row_count: pairs.length,
    by_terminal_state: Object.fromEntries(
      Object.keys(byState)
        .sort()
        .map((k) => [k, byState[k]])
    ),
    rows: pairs.map((p) => ({
      attack_class: p.attack_class,
      target_security_role: p.target_security_role,
      role_archetype: p.role_archetype,
      inherited_5q_obligation_cells: p.inherited_5q_obligation_cells,
      terminal_state: p.terminal_state,
      probe_family_id: p.probe_family_id,
    })),
  };
}

/**
 * The inherited opening record: 5Q-F013, by digest, with 5R's own field beside 5Q's.
 *
 * @param {{addendum: object, addendumDigest: string}} input
 * @returns {object}
 */
export function inheritedOpeningFinding({ addendum, addendumDigest }) {
  const f = addendum.finding;
  return {
    finding_id: f.finding_id,
    recorded_by: "5r",
    about_stage: f.affected_stage,
    inherited_from: "docs/research/llm-shield/evidence/stage-5q/attestation/closeout-addendum.json",
    inherited_digest: addendumDigest,
    attack_class: f.attack_class,
    severity: f.severity,
    expected_result: f.expected_result,
    observed_result: f.observed_result,
    q0_disposition_quoted: addendum.disposition,
    vpf_disposition:
      "5R IS the lawful outgoing transition. F013's deadlock is a property of 5Q's phase table, and " +
      "5R is not in it: a new stage produces new evidence under its own contract without reopening " +
      "a frozen one.",
    content_is_not_re_derived:
      "Inherited by digest. Not re-worded, not re-classified, not renumbered. 5R adds one field of " +
      "its own and touches nothing else — 5Q's `disposition` is quoted above, never replaced.",
  };
}

/**
 * Build the finding ledger.
 *
 * @param {{opening: object, records: Array<object>, adjudicated: Array<object>, census: object,
 *          disclosure: object}} input
 * @returns {object}
 */
export function buildFindingLedger({ opening, records, adjudicated, census, disclosure }) {
  for (const r of records) {
    if (!SEVERITIES.includes(r.severity)) {
      throw new Error(`${r.finding_id}: severity "${r.severity}" is outside the closed vocabulary`);
    }
    if (!r.about_stage) throw new Error(`${r.finding_id}: no stage named`);
  }
  const ids = [opening.finding_id, ...records.map((r) => r.finding_id)];
  if (new Set(ids).size !== ids.length) throw new Error("finding ledger: duplicate finding_id");

  const againstSelf = records.filter((r) => r.about_stage === "5r");
  return {
    schema: "simurgh.vpf.finding-ledger.v1",
    note:
      "Task 23. The opening record is 5Q-F013, inherited by digest with 5R's vpf_disposition beside " +
      "5Q's own quoted disposition. Everything after it is 5R's, including the records against 5R " +
      "itself: §7.3 exists because 5Q's twelve findings all named another stage while its own " +
      "harness defects were narrated in prose.",
    record_count: 1 + records.length,
    findings_against_self: againstSelf.length,
    opening_finding: opening,
    records,
    adjudicated_candidates: adjudicated,
    family_result_census: census,
    four_term_disclosure: disclosure,
  };
}

/**
 * Cumulative coverage, both figures, in the one relationship §6.1 fixes.
 *
 * @param {number} newlyDischarged
 * @returns {object}
 */
export function cumulativeView(newlyDischarged) {
  const cumulative = Q0_DISCHARGED_CELLS + newlyDischarged;
  return {
    q0_original: `${(tenths(Q0_DISCHARGED_CELLS, INHERITED_CELLS) / 10).toFixed(1)}% (${Q0_DISCHARGED_CELLS} of ${INHERITED_CELLS})`,
    cumulative_5r: `${(tenths(cumulative, INHERITED_CELLS) / 10).toFixed(1)}% (${cumulative} of ${INHERITED_CELLS})`,
    label: "5R cumulative",
    the_two_sentences:
      "Nothing in 5R changes the published 5Q result. The 6.2% stays 6.2% forever. No sentence may " +
      "say that 5Q itself reached the later percentage.",
  };
}
