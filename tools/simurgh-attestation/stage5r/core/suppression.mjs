// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — forbidden-surrogate suppression (§3.4), and the self-test that keeps it honest.
//
// §3.4: each forbidden surrogate is a signal the ORTHOGONAL FAILURE CONTROL also produces. If the
// detector's decision changes when a surrogate is suppressed, the family is inadmissible — the
// detector was reading the surrogate, not the declared signal.
//
// TWO WAYS THIS GOES WRONG, AND THEY HIDE EACH OTHER:
//
//   N5a  the suppression machinery is a NO-OP. Suppressing changes nothing because nothing ran, so
//        every family looks surrogate-independent and the check reports success forever.
//   N5b  suppression works and admissibility IGNORES it. The verdict changes, the evidence says so,
//        and the family is admitted anyway.
//
// The spec's first draft named only the first. A suppressor that does nothing and a checker that
// ignores what the suppressor found are different defects, and each makes the other invisible: a
// no-op suppressor never produces a changed verdict for the checker to ignore, and a checker that
// ignores the result never notices the suppressor is idle. So both are seeded, and the SELF-TEST
// below is what makes N5a catchable at all — it proves the transforms actually transform.

/** Each forbidden surrogate, with the transform that removes it from an observation. */
export const SURROGATE_TRANSFORMS = Object.freeze({
  "process exit code alone": (o) => ({ ...o, exit_code: 0 }),
  '"an exception was thrown" alone': (o) => ({ ...o, threw: false }),
  '"stderr was non-empty" alone': (o) => ({ ...o, stderr: "" }),
  '"the file did not parse" alone': (o) => ({ ...o, parse_failed: false }),
  '"the run took longer than a threshold" alone': (o) => ({ ...o, elapsed_ms: 0 }),
  '"any string matched a generic error regex"': (o) => ({ ...o, generic_error_match: false }),
});

/** The fields a surrogate lives in, so the self-test knows what should have moved. */
const SURROGATE_FIELD = Object.freeze({
  "process exit code alone": "exit_code",
  '"an exception was thrown" alone': "threw",
  '"stderr was non-empty" alone': "stderr",
  '"the file did not parse" alone': "parse_failed",
  '"the run took longer than a threshold" alone': "elapsed_ms",
  '"any string matched a generic error regex"': "generic_error_match",
});

/**
 * An observation in which every surrogate is loudly present — the shape an orthogonal failure has.
 *
 * @returns {object}
 */
export function loudObservation() {
  return {
    exit_code: 1,
    threw: true,
    stderr: "boom",
    parse_failed: true,
    elapsed_ms: 99999,
    generic_error_match: true,
    declared_signal_present: false,
  };
}

/**
 * Prove the transforms transform. This is what makes N5a detectable: a no-op suppressor passes every
 * downstream check silently, and only a test of the suppressor itself can see it.
 *
 * @returns {{ok: boolean, inert: string[]}}
 */
export function selfTest() {
  const inert = [];
  for (const [surrogate, transform] of Object.entries(SURROGATE_TRANSFORMS)) {
    const before = loudObservation();
    const after = transform(before);
    const field = SURROGATE_FIELD[surrogate];
    if (after[field] === before[field]) inert.push(surrogate);
  }
  return { ok: inert.length === 0, inert };
}

/**
 * Run the detector once per surrogate with that surrogate suppressed, and report whether the verdict
 * ever moved.
 *
 * @param {{observation: object, detector: (o: object) => string}} input
 * @returns {{invariant: boolean, baseline: string, changed: Array<{surrogate: string, verdict: string}>,
 *            self_test_ok: boolean}}
 */
export function suppressionInvariance({ observation, detector }) {
  const self = selfTest();
  const baseline = detector(observation);
  const changed = [];
  for (const [surrogate, transform] of Object.entries(SURROGATE_TRANSFORMS)) {
    const verdict = detector(transform(observation));
    if (verdict !== baseline) changed.push({ surrogate, verdict });
  }

  // ALL SURROGATES AT ONCE, and this case is not optional.
  //
  // Found by this module's own test: a detector that fires on ANY loud failure — exit code OR throw
  // OR stderr OR parse failure — survives every single-surrogate suppression, because suppressing
  // one leaves the others loud and the verdict never moves. One-at-a-time suppression therefore
  // certifies exactly the detector §3.4 exists to catch: the one measuring sadness through a
  // disjunction. Suppressing the whole set at once is what closes it.
  const allSuppressed = Object.values(SURROGATE_TRANSFORMS).reduce((o, t) => t(o), observation);
  const allVerdict = detector(allSuppressed);
  if (allVerdict !== baseline)
    changed.push({ surrogate: "ALL_SURROGATES_AT_ONCE", verdict: allVerdict });
  // A run whose suppressor is inert reports NOT invariant, whatever the verdicts said. An inert
  // suppressor has established nothing, and "established nothing" must never read as "passed".
  return {
    invariant: self.ok && changed.length === 0,
    baseline,
    changed,
    self_test_ok: self.ok,
  };
}
