// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the two witness taxonomies of spec §3.4.
//
// WHY TWO ENUMERATIONS AND NOT ONE WITH A FLAG. A single enumeration with an `is_anchor` boolean
// would let a tally that forgot to read the flag count an RFC-3161 token as a witness. Two
// enumerations over two roster structures make that sum unrepresentable: there is no value an
// anchor can carry that a witness-class check recognises, so the refusal happens at the type
// boundary, before any policy logic runs.
//
// WHAT EACH CLASS ESTABLISHES (§3.4), and what it does not:
//
//   same_operator_distinct_key       separate keys, separate processes, no shared key custody
//                                    — and NOTHING about independence: we hold every key.
//   distinct_operator_self_asserted  a third party ran it and asserts independence
//                                    — their assertion is our input, not our evidence.
//   unresolved                       nothing. The honest default, and 5P's recorded outcome.

/** Roster identities. Only these may be counted toward `threshold_q`. */
export const WITNESS_OPERATOR_CLASS = Object.freeze([
  "same_operator_distinct_key",
  "distinct_operator_self_asserted",
  "unresolved",
]);

/** Anchor mechanisms. Zero witness weight, by construction — they are not roster identities. */
export const EXTERNAL_ANCHOR_CLASS = Object.freeze(["rfc3161", "rekor", "bitcoin_ots"]);

/**
 * The default a run reports when nothing about the operator has been established. It is deliberately
 * the class that establishes nothing: a default that asserted independence would make silence look
 * like evidence.
 */
export const HONEST_DEFAULT_OPERATOR_CLASS = "unresolved";

const WITNESS = new Set(WITNESS_OPERATOR_CLASS);
const ANCHOR = new Set(EXTERNAL_ANCHOR_CLASS);

/**
 * Which taxonomy a value belongs to, or null. Never guesses: an unrecognised value is a stranger,
 * not a lenient match against the nearest member.
 *
 * @param {unknown} value
 * @returns {"witness_operator"|"external_anchor"|null}
 */
export function classOf(value) {
  if (typeof value !== "string") return null;
  if (WITNESS.has(value)) return "witness_operator";
  if (ANCHOR.has(value)) return "external_anchor";
  return null;
}
