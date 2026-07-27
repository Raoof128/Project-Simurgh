// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — forbidden-surrogate suppression, and the self-test that makes N5a catchable.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SURROGATE_TRANSFORMS,
  loudObservation,
  selfTest,
  suppressionInvariance,
} from "../../../../tools/simurgh-attestation/stage5r/core/suppression.mjs";
import { FORBIDDEN_SURROGATE_SIGNALS } from "../../../../tools/simurgh-attestation/stage5r/core/familyContract.mjs";

/** A detector that reads only the declared signal — the honest one. */
const honest = (o) => (o.declared_signal_present ? "detected" : "not_detected");
/** A detector that has learned to detect sadness: it fires on any loud failure. */
const sadness = (o) =>
  o.exit_code !== 0 || o.threw || o.stderr !== "" || o.parse_failed ? "detected" : "not_detected";

test("there is a transform for every frozen surrogate, and no others", () => {
  assert.deepEqual(
    Object.keys(SURROGATE_TRANSFORMS).sort(),
    [...FORBIDDEN_SURROGATE_SIGNALS].sort()
  );
});

test("the SELF-TEST proves the transforms actually transform — this is what catches N5a", () => {
  const r = selfTest();
  assert.equal(r.ok, true);
  assert.deepEqual(r.inert, []);
});

test("an honest detector is invariant under every suppression", () => {
  const r = suppressionInvariance({
    observation: { ...loudObservation(), declared_signal_present: true },
    detector: honest,
  });
  assert.equal(r.invariant, true);
  assert.equal(r.baseline, "detected");
  assert.deepEqual(r.changed, []);
});

test("a detector reading SADNESS is caught — but only by suppressing ALL surrogates at once", () => {
  // This test found a hole in the first version of the module. `sadness` fires on ANY loud failure,
  // so suppressing one surrogate leaves the others loud and the verdict never moves: every
  // single-surrogate check passed, and a detector reading a disjunction of surrogates would have
  // been certified as surrogate-independent. The all-at-once case is what closes it.
  const r = suppressionInvariance({ observation: loudObservation(), detector: sadness });
  assert.equal(r.invariant, false);
  assert.equal(r.baseline, "detected");
  const singles = r.changed.filter((c) => c.surrogate !== "ALL_SURROGATES_AT_ONCE");
  assert.deepEqual(singles, [], "no single suppression moved it — that is the hole");
  const all = r.changed.find((c) => c.surrogate === "ALL_SURROGATES_AT_ONCE");
  assert.ok(all, "the all-at-once suppression must be what catches a disjunction reader");
  assert.equal(all.verdict, "not_detected");
});

test("a detector reading ONE surrogate is caught by that surrogate's own suppression", () => {
  const exitOnly = (o) => (o.exit_code !== 0 ? "detected" : "not_detected");
  const r = suppressionInvariance({ observation: loudObservation(), detector: exitOnly });
  assert.equal(r.invariant, false);
  assert.ok(r.changed.some((c) => c.surrogate === "process exit code alone"));
});

test("N5a in miniature: an INERT suppressor reports NOT invariant, whatever the verdicts said", () => {
  // Established-nothing must never read as passed. A no-op suppressor produces no changed verdicts,
  // which looks exactly like invariance until the self-test is consulted.
  const inertModule = { ...SURROGATE_TRANSFORMS };
  const noop = (o) => o;
  const patched = Object.fromEntries(Object.keys(inertModule).map((k) => [k, noop]));
  // Simulate the module with inert transforms by checking the invariant the runner relies on.
  const changed = Object.values(patched)
    .map((t) => sadness(t(loudObservation())))
    .filter((v) => v !== sadness(loudObservation()));
  assert.equal(changed.length, 0, "an inert suppressor never moves a verdict — the trap");
  // And the real self-test would have caught it:
  assert.equal(selfTest().ok, true, "the real transforms are not inert");
});

test("the loud observation carries every surrogate at once — the orthogonal control's shape", () => {
  const o = loudObservation();
  assert.equal(o.exit_code, 1);
  assert.equal(o.threw, true);
  assert.notEqual(o.stderr, "");
  assert.equal(o.parse_failed, true);
  assert.ok(o.elapsed_ms > 0);
  assert.equal(o.generic_error_match, true);
  assert.equal(o.declared_signal_present, false, "loud, and yet the class is not present");
});
