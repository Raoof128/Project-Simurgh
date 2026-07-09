// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — two slip booleans (plan Task 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  thresholdCrossing,
  scoreInversion,
  checkSlips,
} from "../../../../tools/simurgh-attestation/stage5e/core/slip.mjs";

test("thresholdCrossing = evasion < θ ≤ raw (the detection-gap interval)", () => {
  assert.ok(thresholdCrossing("0.9800", "0.0600", "0.5000")); // raw flagged, evasion cleared
  assert.ok(!thresholdCrossing("0.9800", "0.6000", "0.5000")); // both above θ
  assert.ok(!thresholdCrossing("0.4000", "0.0600", "0.5000")); // raw below θ (not baseline-flagged)
});

test("scoreInversion is θ-free: evasion < raw", () => {
  assert.ok(scoreInversion("0.9800", "0.0600"));
  assert.ok(scoreInversion("0.9800", "0.6000")); // inversion even though both above 0.5
  assert.ok(!scoreInversion("0.6000", "0.9800"));
});

function bundle(rawScore, evScore, tc, si) {
  return {
    evasions: [{ base_id: "b1", threshold_crossing: tc, score_inversion: si }],
    score_table: {
      entries: [
        { base_id: "b1", variant: "raw", score: rawScore },
        { base_id: "b1", variant: "evasion", score: evScore },
      ],
    },
  };
}

test("checkSlips: consistent booleans pass", () => {
  assert.equal(checkSlips(bundle("0.9800", "0.0600", true, true), "0.5000"), null);
  // above-threshold inversion: crossing false, inversion true
  assert.equal(checkSlips(bundle("0.9800", "0.6000", false, true), "0.5000"), null);
});

test("checkSlips: 260 when threshold_crossing disagrees", () => {
  assert.equal(checkSlips(bundle("0.9800", "0.0600", false, true), "0.5000"), 260);
});

test("checkSlips: 261 when score_inversion claimed without a real inversion", () => {
  // raw < evasion, but the bundle claims score_inversion=true
  assert.equal(checkSlips(bundle("0.6000", "0.9800", false, true), "0.5000"), 261);
});

test("checkSlips: 260 when score_inversion=false but scores actually invert", () => {
  assert.equal(checkSlips(bundle("0.9800", "0.6000", false, false), "0.5000"), 260);
});
