// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 8: FROZEN OBJECT 2, the probe-family record.
//
// Frozen §3.1: every probe family is exactly this shape, fields mandatory, and THERE IS NO OPTIONAL
// CONTROL. The three-control triad is the whole stage — two controls look sufficient and are not,
// because a detector that flags every crash, malformed file or non-zero exit can appear brilliant
// while understanding nothing, and it scores a perfect vulnerable/safe pair while doing it.
//
// The schema is EXACT-KEY: an unknown field is refused rather than ignored. A record format that
// silently accepts extra keys is a record format where a later stage can smuggle a second signal in
// beside the declared one, which is §3.3's whole concern wearing a different hat.

/** §3.4's frozen list — each is a signal the ORTHOGONAL FAILURE CONTROL also produces. */
export const FORBIDDEN_SURROGATE_SIGNALS = Object.freeze([
  "process exit code alone",
  '"an exception was thrown" alone',
  '"stderr was non-empty" alone',
  '"the file did not parse" alone',
  '"the run took longer than a threshold" alone',
  '"any string matched a generic error regex"',
]);

/** The eleven 5Q security roles a family may target. */
export const SECURITY_ROLES = Object.freeze([
  "trust_decision",
  "completeness_claim",
  "canonicalisation",
  "code_allocation",
  "evidence_emission",
  "schema_gate",
  "parity_mirror",
  "formal_statement",
  "orchestration",
  "pure_transform",
  "imported_dependency",
]);

/** The sixteen inherited attack classes. */
export const ATTACK_CLASSES = Object.freeze(Array.from({ length: 16 }, (_, i) => `R${i + 1}`));

/** Top-level keys of §3.1's record. Exact — no more, no fewer. */
export const FAMILY_KEYS = Object.freeze([
  "probe_family_id",
  "attack_class",
  "target_security_role",
  "role_archetype",
  "inherited_5q_obligation_cells",
  "vulnerable_control",
  "safe_control",
  "orthogonal_failure_control",
  "detector_signal",
  "forbidden_surrogate_signals",
  "coverage_delta",
]);

const CONTROL_KEYS = Object.freeze({
  vulnerable_control: [
    "premise_receipt",
    "expected_detection",
    "expected_outcome",
    "source_span_bytes",
  ],
  safe_control: ["expected_detection", "source_span_bytes", "exercises_detector_signal_path"],
  orthogonal_failure_control: ["failure_mode", "expected_detection", "source_span_bytes"],
});

/** A real failure, not a no-op: §3.2 requires a genuine throw, non-zero exit or parse error. */
export const ORTHOGONAL_FAILURE_MODES = Object.freeze(["throw", "non_zero_exit", "parse_error"]);

const err = (reason) => ({ ok: false, reason });

function checkExactKeys(obj, expected, label) {
  const got = Object.keys(obj ?? {});
  const missing = expected.filter((k) => !got.includes(k));
  if (missing.length) return err(`${label}: missing key(s) ${missing.join(", ")}`);
  const unknown = got.filter((k) => !expected.includes(k));
  if (unknown.length) return err(`${label}: unknown key(s) ${unknown.join(", ")}`);
  return { ok: true };
}

/**
 * Validate a probe-family record against frozen §3.
 *
 * @param {object} family
 * @returns {{ok: boolean, reason?: string}}
 */
export function validateFamily(family) {
  if (!family || typeof family !== "object") return err("family: not an object");

  const shape = checkExactKeys(family, FAMILY_KEYS, "family");
  if (!shape.ok) return shape;

  for (const control of ["vulnerable_control", "safe_control", "orthogonal_failure_control"]) {
    if (!family[control] || typeof family[control] !== "object") {
      return err(`${control}: absent — there is no optional control (§3.1)`);
    }
    const c = checkExactKeys(family[control], CONTROL_KEYS[control], control);
    if (!c.ok) return c;
  }

  if (!ATTACK_CLASSES.includes(family.attack_class)) {
    return err(`attack_class: ${family.attack_class} is not one of R1..R16`);
  }
  if (!SECURITY_ROLES.includes(family.target_security_role)) {
    return err(`target_security_role: ${family.target_security_role} is not an inherited 5Q role`);
  }

  // §3.3: ONE pre-registered signal. A disjunction is not a choice, it is a post-hoc rationalisation
  // waiting to happen — a family that would pass under signal A and fail under signal B has not
  // chosen which property it is measuring.
  if (typeof family.detector_signal !== "string" || family.detector_signal.trim() === "") {
    return err("detector_signal: must be one named signal");
  }
  if (/\bor\b|\|\||,/.test(family.detector_signal)) {
    return err(
      `detector_signal: "${family.detector_signal}" reads as a disjunction; §3.3 requires one signal`
    );
  }
  if (FORBIDDEN_SURROGATE_SIGNALS.includes(family.detector_signal)) {
    return err(`detector_signal: "${family.detector_signal}" is a forbidden surrogate (§3.4)`);
  }

  if (
    !Array.isArray(family.forbidden_surrogate_signals) ||
    family.forbidden_surrogate_signals.length !== FORBIDDEN_SURROGATE_SIGNALS.length ||
    family.forbidden_surrogate_signals.some((s, i) => s !== FORBIDDEN_SURROGATE_SIGNALS[i])
  ) {
    return err("forbidden_surrogate_signals: must be the frozen §3.4 list, verbatim and in order");
  }

  if (family.vulnerable_control.expected_detection !== true) {
    return err("vulnerable_control: expected_detection must be true (§4.1 condition one)");
  }
  if (family.safe_control.expected_detection !== false) {
    return err("safe_control: expected_detection must be false (§4.1 condition two)");
  }
  if (family.orthogonal_failure_control.expected_detection !== false) {
    return err(
      "orthogonal_failure_control: expected_detection must be false (§4.1 condition three)"
    );
  }
  if (!ORTHOGONAL_FAILURE_MODES.includes(family.orthogonal_failure_control.failure_mode)) {
    return err(
      `orthogonal_failure_control: failure_mode must be a REAL failure ` +
        `(${ORTHOGONAL_FAILURE_MODES.join(", ")}); a no-op control fails the family (§3.2)`
    );
  }
  if (family.safe_control.exercises_detector_signal_path !== true) {
    return err(
      "safe_control: must exercise the detector_signal path — a stub is not-detected for the wrong reason (§4.3)"
    );
  }

  return { ok: true };
}

/** The frozen list, defensively copied so a caller cannot mutate the contract at runtime. */
export function forbiddenSurrogates() {
  return [...FORBIDDEN_SURROGATE_SIGNALS];
}
