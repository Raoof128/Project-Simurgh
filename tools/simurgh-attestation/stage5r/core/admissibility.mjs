// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 9: FROZEN OBJECT 3, the seven admissibility conditions.
//
// §4.1: a family is admissible ONLY when all seven hold. There is no partial admissibility. Six of
// seven is inadmissible, and the failing condition is published — an inadmissible family is a
// published outcome (§4.5), not a retry.
//
// §4.2 is the blade in mechanical form: admissibility is per (class, role). There is no rule
// promoting it to class-wide, and the absence is structural rather than documentary — nothing in
// this module returns a class-level verdict, so class-wide promotion has nowhere to live.
//
// THE COMPARABILITY BOUND IS EVALUATED WITHOUT DIVISION. `Math.floor(399 / 101)` is 3, so an
// integer-division check would admit a pair whose true ratio is 3.95 — verified before this was
// written, not assumed. Cross-multiplication has no such gap.

/** The seven conditions, in §4.1's order. */
export const SEVEN_CONDITIONS = Object.freeze([
  "vulnerable_control_detected",
  "safe_control_not_detected",
  "orthogonal_failure_not_misclassified",
  "premises_recomputed",
  "target_role_matches_claimed_applicability",
  "results_bind_to_inherited_closure",
  "mutation_restored_proven",
]);

/** §4.3's precommitted bound: a safe control more than 3× its vulnerable twin is another function. */
export const COMPARABILITY_RATIO_BOUND = 3;

/**
 * §4.3's span comparison, by cross-multiplication.
 *
 * @param {number} a span bytes of one control
 * @param {number} b span bytes of the other
 * @returns {{ok: boolean, reason?: string}}
 */
export function spansComparable(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b))
    return { ok: false, reason: "span bytes must be integers" };
  if (a <= 0 || b <= 0)
    return { ok: false, reason: "a zero-length span is not comparable, it is absent" };
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  return max <= COMPARABILITY_RATIO_BOUND * min
    ? { ok: true }
    : { ok: false, reason: `span ratio ${max}:${min} exceeds ${COMPARABILITY_RATIO_BOUND}:1` };
}

/**
 * §4.3's structural comparability of the safe control, mechanically.
 *
 * @param {{vulnerable: object, safe: object}} pair descriptors of the two targets
 * @returns {{ok: boolean, reason?: string}}
 */
export function structurallyComparable({ vulnerable, safe }) {
  if (!vulnerable || !safe) return { ok: false, reason: "both controls are required" };
  if (vulnerable.category !== safe.category) {
    return { ok: false, reason: `category differs: ${vulnerable.category} vs ${safe.category}` };
  }
  if (vulnerable.security_role !== safe.security_role) {
    return {
      ok: false,
      reason: `security_role differs: ${vulnerable.security_role} vs ${safe.security_role}`,
    };
  }
  const sameName = vulnerable.symbol === safe.symbol;
  const sameArity = vulnerable.arity === safe.arity;
  if (!sameName && !sameArity) {
    return { ok: false, reason: "neither the exported symbol nor the call arity matches" };
  }
  if (safe.generated === true || vulnerable.generated === true) {
    return { ok: false, reason: "generated code is refused as a control" };
  }
  const spans = spansComparable(vulnerable.span_bytes, safe.span_bytes);
  if (!spans.ok) return spans;
  if (safe.exercises_detector_signal_path !== true) {
    return {
      ok: false,
      reason:
        "the safe control is a stub: it never reaches the detector_signal path, so it is not-detected for the wrong reason",
    };
  }
  return { ok: true };
}

/**
 * Evaluate all seven conditions. Conjunctive, no partial credit, failing condition named.
 *
 * @param {{family: object, observations: object, closure: Set<string>|Map<string,unknown>}} input
 * @returns {{admissible: boolean, failed: string[], conditions: Array<{id: string, ok: boolean, detail: string}>}}
 */
export function assessFamily({ family, observations, closure }) {
  const has = (id) => (closure instanceof Set ? closure.has(id) : Boolean(closure?.has?.(id)));
  const cond = [];
  const add = (id, ok, detail) => cond.push({ id, ok: Boolean(ok), detail });

  add(
    "vulnerable_control_detected",
    observations?.vulnerable?.verdict === "detected",
    `vulnerable verdict: ${observations?.vulnerable?.verdict ?? "absent"}`
  );
  add(
    "safe_control_not_detected",
    observations?.safe?.verdict === "not_detected",
    `safe verdict: ${observations?.safe?.verdict ?? "absent"}`
  );
  add(
    "orthogonal_failure_not_misclassified",
    observations?.orthogonal?.verdict === "not_detected",
    `orthogonal verdict: ${observations?.orthogonal?.verdict ?? "absent"} (it must fail loudly and still not be called a detection)`
  );

  const premises = ["vulnerable", "safe", "orthogonal"].filter(
    (k) => observations?.[k]?.premise_recomputed !== true
  );
  add(
    "premises_recomputed",
    premises.length === 0,
    premises.length ? `not recomputed: ${premises.join(", ")}` : "all three recomputed at run time"
  );

  const claimedRole = family?.target_security_role;
  const targetRoles = ["vulnerable", "safe", "orthogonal"]
    .map((k) => observations?.[k]?.security_role)
    .filter(Boolean);
  add(
    "target_role_matches_claimed_applicability",
    targetRoles.length === 3 && targetRoles.every((r) => r === claimedRole),
    `claimed ${claimedRole}; observed ${targetRoles.join(", ") || "none"}`
  );

  const ids = ["vulnerable", "safe", "orthogonal"].map((k) => observations?.[k]?.function_id);
  const unbound = ids.filter((id) => !id || !has(id));
  add(
    "results_bind_to_inherited_closure",
    unbound.length === 0,
    unbound.length
      ? `outside the inherited closure: ${unbound.join(", ")}`
      : "all three bind to inherited function_ids"
  );

  const unrestored = ["vulnerable", "safe", "orthogonal"].filter(
    (k) => observations?.[k]?.restoration_proven !== true
  );
  add(
    "mutation_restored_proven",
    unrestored.length === 0,
    unrestored.length
      ? `restoration unproven: ${unrestored.join(", ")}`
      : "digest equality proven per control"
  );

  const failed = cond.filter((c) => !c.ok).map((c) => c.id);
  return { admissible: failed.length === 0, failed, conditions: cond };
}

/**
 * The blade, §4.2: admissibility is a per-(class, role) fact and nothing promotes it.
 *
 * @param {Array<{attack_class: string, target_security_role: string, admissible: boolean}>} verdicts
 * @param {string} attackClass
 * @param {string} role
 * @returns {boolean}
 */
export function admissible(verdicts, attackClass, role) {
  return verdicts.some(
    (v) => v.admissible && v.attack_class === attackClass && v.target_security_role === role
  );
}
