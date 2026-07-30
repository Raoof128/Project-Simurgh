// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the five statuses of §3.2 and §3.6, one function each.
//
// NO STATUS IS DERIVABLE FROM ANOTHER, and the functions are written so that the independence is
// structural rather than remembered:
//
//   * a satisfied corroboration status never upgrades `witness_independence_status`;
//   * a met quorum never implies a clean comparison;
//   * a clean comparison never implies that no fork occurred outside the committed set.
//
// Each function takes the whole run context and reads only its own inputs. Passing the full context
// is deliberate: a reviewer can see that `comparisonStatusOf` was HANDED the quorum statuses and
// ignored them, which is a stronger statement than never offering them. Two source-scanning tests
// hold that line, because a promise in a comment is not a mechanism.
//
// EVERY FUNCTION FAILS CLOSED. Absent, malformed and unrecognised inputs resolve to the value that
// claims least — `quorum_incomplete`, `comparison_unavailable`, `unproven`, `not_satisfied`,
// `absent_comparison_unavailable`. None of them ever returns null: §3.6's whole argument is that a
// null field teaches a reader nothing and lets them assume the best.

/** §2.5 */
export const QUORUM_STATUS = Object.freeze(["witnessed_quorum", "quorum_incomplete"]);

/** §2.5, §2.6 */
export const COMPARISON_STATUS = Object.freeze([
  "no_conflict_in_committed_comparison_set",
  "equivocation_detected",
  "comparison_indeterminate",
  "comparison_unavailable",
]);

/**
 * §3.4, §5.1. ONE MEMBER, ON PURPOSE. Every witness this project can currently produce is
 * `same_operator_distinct_key` — we hold every key — so independence is unproven by construction,
 * not by measurement. A second member would be a slot waiting for someone who wants a nicer-looking
 * run to fill it.
 */
export const WITNESS_INDEPENDENCE_STATUS = Object.freeze(["unproven"]);

/** The price of widening the enumeration above, stated as a debt rather than deferred silently. */
export const INDEPENDENCE_DEBT =
  "A stronger value requires an external operator to sign the full witness tuple — not an anchor " +
  "over a digest, and not a third party's self-assertion of independence, which is an input rather " +
  "than evidence (§3.3).";

/** §3.3 */
export const CORROBORATION_STATUS = Object.freeze(["satisfied", "not_satisfied"]);

/** §3.6 */
export const EQUIVOCATION_ARTIFACT_STATUS = Object.freeze([
  "present",
  "absent_same_checkpoint",
  "absent_compatible",
  "absent_comparison_unavailable",
  "absent_comparison_indeterminate",
]);

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * `quorum_status` from a Task 11 tally. A refused tally never reached the arithmetic, so a stale
 * `met` on the returned object must not be read as a quorum the tally explicitly refused.
 *
 * @param {unknown} tallyResult
 * @returns {"witnessed_quorum"|"quorum_incomplete"}
 */
export function quorumStatusOf(tallyResult) {
  if (!isPlainObject(tallyResult)) return "quorum_incomplete";
  if (tallyResult.ok !== true) return "quorum_incomplete";
  return tallyResult.tally?.met === true ? "witnessed_quorum" : "quorum_incomplete";
}

/**
 * `comparison_status`. Reads the relation set and the intake sufficiency, and nothing else — a
 * shortfall in the witness lane can never suppress the producer's own two signatures.
 *
 * @param {unknown} context
 * @returns {string} a member of COMPARISON_STATUS
 */
export function comparisonStatusOf(context) {
  if (!isPlainObject(context)) return "comparison_unavailable";
  const relations = context.relations;
  if (!Array.isArray(relations) || relations.length === 0) return "comparison_unavailable";
  // Sufficiency before cleanliness (§2.8): fewer than two committed views can never reach the
  // strongest green, and this is the blade's own anti-vacuity condition.
  if (context.intake?.sufficient_for_comparison !== true) return "comparison_unavailable";

  if (relations.includes("incompatible")) return "equivocation_detected";
  // Anything not recognised as clean is treated as unknown, never as clean.
  if (relations.some((r) => r !== "same_checkpoint" && r !== "compatible")) {
    return "comparison_indeterminate";
  }
  return "no_conflict_in_committed_comparison_set";
}

/**
 * `witness_independence_status`. Constant today, and the constancy is the claim: §5.1 states that a
 * single operator holding several distinct witness keys is Lane B's normal condition, that such a run
 * may still report a met quorum, and that it must carry independence unproven.
 *
 * @param {unknown} _context the full run context, deliberately unread
 * @returns {"unproven"}
 */
export function witnessIndependenceStatusOf(_context) {
  return "unproven";
}

/**
 * `external_corroboration_status`. Computed here rather than inside Task 8's validator: coupling a
 * status to a validator would turn a Lane C shortfall into a verifier refusal, and Lane C is never
 * CI-gated. None of the two values allocates a raw code, and a test holds that.
 *
 * @param {unknown} context
 * @returns {"satisfied"|"not_satisfied"}
 */
export function externalCorroborationStatusOf(context) {
  if (!isPlainObject(context)) return "not_satisfied";
  const policy = context.policy;
  const anchors = Array.isArray(context.anchors) ? context.anchors : [];
  if (!isPlainObject(policy)) return "not_satisfied";

  const minimum = policy.minimum_distinct_mechanisms;
  const permitted = policy.permitted_ecology_classes;
  const required = policy.required_envelope_digest;
  if (!Number.isInteger(minimum) || minimum < 1) return "not_satisfied";
  if (!Array.isArray(permitted) || permitted.length === 0) return "not_satisfied";
  if (typeof required !== "string" || required.length === 0) return "not_satisfied";

  const allowed = new Set(permitted);
  const mechanisms = new Set();
  for (const a of anchors) {
    if (!isPlainObject(a)) continue;
    // DISTINCT MECHANISMS, not distinct submissions: two tokens from two RFC-3161 vendors are two
    // submissions of one mechanism, and one mechanism failing takes both with it.
    if (!allowed.has(a.external_anchor_class)) continue;
    if (a.covered_envelope_digest !== required) continue;
    if (a.inclusion_verified !== true) continue;
    mechanisms.add(a.external_anchor_class);
  }
  return mechanisms.size >= minimum ? "satisfied" : "not_satisfied";
}

/**
 * `equivocation_artifact_status`. Typed absence: the five variants exist so that "no artifact" can
 * never be read as "no fork existed".
 *
 * @param {unknown} context
 * @returns {string} a member of EQUIVOCATION_ARTIFACT_STATUS
 */
export function equivocationArtifactStatusOf(context) {
  if (!isPlainObject(context)) return "absent_comparison_unavailable";
  const relations = Array.isArray(context.relations) ? context.relations : [];

  switch (context.comparison_status) {
    case "equivocation_detected":
      return "present";
    case "comparison_indeterminate":
      return "absent_comparison_indeterminate";
    case "comparison_unavailable":
      return "absent_comparison_unavailable";
    case "no_conflict_in_committed_comparison_set":
      // Zero relations means zero comparisons; reading that as "one checkpoint" would let an empty
      // set produce the strongest absence variant.
      if (relations.length === 0) return "absent_comparison_unavailable";
      return relations.every((r) => r === "same_checkpoint")
        ? "absent_same_checkpoint"
        : "absent_compatible";
    default:
      // Fail closed to the variant that claims least.
      return "absent_comparison_unavailable";
  }
}
