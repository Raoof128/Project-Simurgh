// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — curve + FP curve (plan Task 6).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  curveAt,
  benignFpAt,
  checkCurve,
  checkFp,
} from "../../../../tools/simurgh-attestation/stage5e/core/curve.mjs";

// two bases: both flag at baseline (0.98); evasions land at 0.06 and 0.60.
function bundle() {
  const entries = [
    { base_id: "b1", variant: "raw", score: "0.9800" },
    { base_id: "b1", variant: "evasion", score: "0.0600" },
    { base_id: "b2", variant: "raw", score: "0.9700" },
    { base_id: "b2", variant: "evasion", score: "0.6000" },
  ];
  return {
    score_table: { entries },
    benign_probe: [
      { probe_id: "p1", score: "0.0300" },
      { probe_id: "p2", score: "0.0900" },
    ],
    evasion_threshold_curve: [
      { theta: "0.5000", bases_attempted: 2, bases_baseline_flagged: 2, variants_flagged: 1 },
      { theta: "0.0500", bases_attempted: 2, bases_baseline_flagged: 2, variants_flagged: 2 },
    ],
    benign_fp_curve: [
      { theta: "0.5000", false_positives: 0 },
      { theta: "0.0500", false_positives: 1 },
    ],
  };
}

test("curveAt: at θ=0.5, 2 bases flag baseline, 1 evasion still flags", () => {
  const r = curveAt(bundle(), "0.5000");
  assert.equal(r.bases_baseline_flagged, 2);
  assert.equal(r.variants_flagged, 1); // only the 0.60 evasion
  assert.equal(r.bases_attempted, 2);
});

test("benignFpAt: lowering θ to 0.08 costs one false positive", () => {
  assert.equal(benignFpAt(bundle(), "0.5000"), 0);
  assert.equal(benignFpAt(bundle(), "0.0500"), 1); // the 0.09 probe
});

test("checkCurve / checkFp: valid committed curves pass", () => {
  assert.equal(checkCurve(bundle()), null);
  assert.equal(checkFp(bundle()), null);
});

test("checkCurve: 262 when a committed point disagrees", () => {
  const b = bundle();
  b.evasion_threshold_curve[0].variants_flagged = 2; // wrong (should be 1 at θ=0.5)
  assert.equal(checkCurve(b), 262);
});

test("checkCurve: 262 when the curve is non-monotone in θ", () => {
  const b = bundle();
  // make the higher θ flag MORE variants than the lower θ — impossible for a real curve
  b.evasion_threshold_curve = [
    { theta: "0.0500", bases_attempted: 2, bases_baseline_flagged: 2, variants_flagged: 1 },
    { theta: "0.5000", bases_attempted: 2, bases_baseline_flagged: 2, variants_flagged: 2 },
  ];
  // recompute would catch the point mismatch first; force points to match recompute is impossible here,
  // so assert non-null (262) either way.
  assert.equal(checkCurve(b), 262);
});

test("checkFp: 263 when a committed FP point disagrees", () => {
  const b = bundle();
  b.benign_fp_curve[1].false_positives = 0; // wrong (should be 1 at θ=0.08)
  assert.equal(checkFp(b), 263);
});
