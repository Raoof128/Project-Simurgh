// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVerdict } from "../../../../tools/simurgh-attestation/stage5f/core/verdict.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid verdicts -> null", () => {
  assert.equal(checkVerdict(validBundle()), null);
});
test("softmax label inconsistent with lexical threshold compare -> 277", () => {
  const b = validBundle();
  b.cells[0].decision_evidence.label = "benign"; // 0.8123 >= 0.5000 => malicious
  assert.equal(checkVerdict(b), 277);
});
test("softmax score not bound to the positive class index -> 277", () => {
  const b = validBundle();
  b.cells[0].decision_evidence.positive_class_index = 0;
  assert.equal(checkVerdict(b), 277);
});
test("categorical label outside {allow,block} -> 277", () => {
  const b = validBundle();
  const lg = b.cells.find((c) => c.member_id === "llama_guard_4_12b");
  lg.decision_evidence.normalised_label = "maybe";
  assert.equal(checkVerdict(b), 277);
});
