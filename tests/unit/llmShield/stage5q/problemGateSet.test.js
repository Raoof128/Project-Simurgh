// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Q1-F002 — the census pin, re-pinned as a SET.
//
// The pin was a count: `EXPECTED_GATE_PROBLEMS="12"`. It went stale the moment Stage 5R added
// seven workflow steps with no committed universe query, and 5Q's reproduce script had been red
// on main ever since — measured, not inferred: 12 problems at v2.52.0, 19 at v2.53.0.
//
// A count is the wrong instrument, and 5Q said so itself about a different ledger: "declared by
// SET, never by COUNT — a count lets a second violation hide behind a repaired first one." Repair
// one problem, introduce another, and the headcount holds at 19 while the landscape moved. That
// is the laundering class the census exists to detect, so the set is the authority here and the
// count is telemetry.

import assert from "node:assert/strict";
import test from "node:test";

import {
  REASON_CODES,
  classifyReason,
  compareProblemSets,
} from "../../../../tools/simurgh-attestation/stage5q/core/problemGateSet.mjs";
import {
  computeProblemSet,
  readPinnedSet,
} from "../../../../tools/simurgh-attestation/stage5q/node/checkProblemGateSet.mjs";

const UNCLASSIFIABLE = "no discovery token and no named artifact — a human must classify this step";
const NO_QUERY =
  "a manually enumerated gate must carry a committed universe_query, or its drift cannot be " +
  "checked and its completeness cannot be claimed";

const entry = (gate_id, reason_code = REASON_CODES.UNCLASSIFIABLE_STEP) => ({
  gate_id,
  reason_code,
});

test("[q1-f002] prose reasons map to stable codes", () => {
  assert.equal(classifyReason(UNCLASSIFIABLE), REASON_CODES.UNCLASSIFIABLE_STEP);
  assert.equal(classifyReason(NO_QUERY), REASON_CODES.MISSING_COMMITTED_UNIVERSE_QUERY);
});

test("[q1-f002] an UNKNOWN reason is refused, never coerced into a known code", () => {
  // Prose is volatile. If the census grows a new defect class, this must stop the gate rather
  // than silently file it under the nearest existing code.
  assert.equal(classifyReason("some new complaint nobody has classified"), null);
});

test("[q1-f002] identical sets pass", () => {
  const pinned = [entry("a.yml::one"), entry("b.yml::two")];
  const r = compareProblemSets({ pinned, actual: [entry("b.yml::two"), entry("a.yml::one")] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.added, []);
  assert.deepEqual(r.removed, []);
});

test("[q1-f002] THE LAUNDERING CASE: one repaired, one introduced, count unchanged", () => {
  // The exact swap a headcount cannot see, and the reason this pin is a set.
  const pinned = [entry("a.yml::one"), entry("b.yml::two")];
  const actual = [entry("a.yml::one"), entry("c.yml::three")];
  const r = compareProblemSets({ pinned, actual });
  assert.equal(r.ok, false, "a swap at constant count passed the set comparison");
  assert.deepEqual(
    r.added.map((e) => e.gate_id),
    ["c.yml::three"]
  );
  assert.deepEqual(
    r.removed.map((e) => e.gate_id),
    ["b.yml::two"]
  );
  assert.equal(r.actual_count, r.pinned_count, "the counts match — which is precisely the point");
});

test("[q1-f002] added and removed are reported INDEPENDENTLY", () => {
  const r = compareProblemSets({
    pinned: [entry("a.yml::one")],
    actual: [entry("a.yml::one"), entry("z.yml::new")],
  });
  assert.equal(r.ok, false);
  assert.equal(r.added.length, 1);
  assert.equal(r.removed.length, 0, "a repaired problem must not be conflated with a new one");
});

test("[q1-f002] the same gate with a CHANGED defect class is added + removed, not ignored", () => {
  const r = compareProblemSets({
    pinned: [entry("a.yml::one", REASON_CODES.UNCLASSIFIABLE_STEP)],
    actual: [entry("a.yml::one", REASON_CODES.MISSING_COMMITTED_UNIVERSE_QUERY)],
  });
  assert.equal(r.ok, false, "a gate whose defect class silently changed was accepted");
  assert.equal(r.added[0].reason_code, REASON_CODES.MISSING_COMMITTED_UNIVERSE_QUERY);
  assert.equal(r.removed[0].reason_code, REASON_CODES.UNCLASSIFIABLE_STEP);
});

test("[q1-f002] a duplicate in the PIN is refused", () => {
  const r = compareProblemSets({
    pinned: [entry("a.yml::one"), entry("a.yml::one")],
    actual: [entry("a.yml::one")],
  });
  assert.equal(r.ok, false);
  assert.equal(r.refusal, "duplicate_in_pin");
});

test("[q1-f002] a duplicate in the COMPUTED census is refused", () => {
  const r = compareProblemSets({
    pinned: [entry("a.yml::one")],
    actual: [entry("a.yml::one"), entry("a.yml::one")],
  });
  assert.equal(r.ok, false);
  assert.equal(r.refusal, "duplicate_in_census");
});

test("[q1-f002] an unsorted pin is refused", () => {
  const r = compareProblemSets({
    pinned: [entry("b.yml::two"), entry("a.yml::one")],
    actual: [entry("a.yml::one"), entry("b.yml::two")],
  });
  assert.equal(r.ok, false);
  assert.equal(r.refusal, "pin_not_sorted");
});

test("[q1-f002] an entry with an unclassified reason code is refused", () => {
  const r = compareProblemSets({
    pinned: [entry("a.yml::one")],
    actual: [{ gate_id: "a.yml::one", reason_code: null }],
  });
  assert.equal(r.ok, false);
  assert.equal(r.refusal, "unknown_reason_class");
});

test("[q1-f002] the committed pin matches the repository as it stands", () => {
  // The live check: the pin file, against the census computed from the real workflows.
  const { pinned, actual, comparison } = liveComparison();
  assert.equal(
    comparison.ok,
    true,
    `census drift — added: ${JSON.stringify(comparison.added)} removed: ${JSON.stringify(comparison.removed)}`
  );
  assert.equal(pinned.length, actual.length);
  assert.ok(pinned.length > 0, "an empty pin would pass vacuously against an empty census");
});

function liveComparison() {
  const actual = computeProblemSet();
  const pinned = readPinnedSet().gate_problems;
  return { pinned, actual, comparison: compareProblemSets({ pinned, actual }) };
}
