// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U dual-signal tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classify,
  verifyFindingReport,
  verifyFindingReproduction,
} from "../../../../tools/simurgh-attestation/stage4u/core/dualSignal.mjs";

test("classify: should-fail attack that returns 0 is a bypass", () => {
  assert.equal(classify(111, 0), "bypass");
  assert.equal(classify(111, 111), "survived");
  assert.equal(classify(0, 0), "survived");
});
test("public tier: matching survived finding is GREEN", () => {
  const f = {
    self_reported_raw: 111,
    verifier_recomputed_raw: 111,
    expected_raw: 111,
    outcome_class: "survived",
  };
  assert.deepEqual(verifyFindingReport(f), { raw: 0, reason: "green" });
});
test("public tier: self-report != recompute -> 127 (no engine needed)", () => {
  const f = {
    self_reported_raw: 0,
    verifier_recomputed_raw: 111,
    expected_raw: 111,
    outcome_class: "survived",
  };
  assert.equal(verifyFindingReport(f).raw, 127);
});
test("public tier: classification not following truth table -> 128 (even when 127 passes)", () => {
  const f = {
    self_reported_raw: 0,
    verifier_recomputed_raw: 0,
    expected_raw: 108,
    outcome_class: "survived",
  };
  assert.equal(verifyFindingReport(f).raw, 128);
});
test("127 masks 128 when both are present (frozen order)", () => {
  const f = {
    self_reported_raw: 5,
    verifier_recomputed_raw: 0,
    expected_raw: 108,
    outcome_class: "survived",
  };
  assert.equal(verifyFindingReport(f).raw, 127);
});
test("audit tier: recorded recompute != fresh engine run -> 129", () => {
  const f = {
    self_reported_raw: 111,
    verifier_recomputed_raw: 111,
    expected_raw: 111,
    outcome_class: "survived",
  };
  assert.equal(verifyFindingReproduction(f, 105).raw, 129);
  assert.deepEqual(verifyFindingReproduction(f, 111), { raw: 0, reason: "green" });
});
test("model_refused is exempt from 127/128, and 129 requires a null fresh run", () => {
  const f = {
    self_reported_raw: null,
    verifier_recomputed_raw: null,
    expected_raw: 111,
    outcome_class: "model_refused",
  };
  assert.deepEqual(verifyFindingReport(f), { raw: 0, reason: "green" });
  assert.deepEqual(verifyFindingReproduction(f, null), { raw: 0, reason: "green" });
  assert.equal(verifyFindingReproduction(f, 111).raw, 129);
});
