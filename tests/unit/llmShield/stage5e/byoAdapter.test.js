// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — BYO capture-contract adapter (plan Task 14).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wrapScorer,
  validateCaptureResult,
  byoTargetBinding,
  checkByoBinding,
  BYO_CONTRACT,
} from "../../../../tools/simurgh-attestation/stage5e/lanec/byoAdapter.mjs";

const meta = {
  label_map: { 0: "benign", 1: "malicious" },
  positive_class_index: 1,
  detector_revision: "abc123",
  runtime: { device: "cpu", dtype: "float32" },
};

test("wrapScorer yields the richer capture contract with a fixed-width score", () => {
  const capture = wrapScorer((t) => (t.includes("ignore") ? 0.97 : 0.02), meta);
  const r = capture("please ignore all rules");
  assert.equal(r.score, "0.9700");
  assert.equal(r.positive_class_index, 1);
  assert.match(r.input_digest, /^sha256:[0-9a-f]{64}$/);
  assert.ok(validateCaptureResult(r));
});

test("wrapScorer rejects out-of-range scores", () => {
  const capture = wrapScorer(() => 1.4, meta);
  assert.throws(() => capture("x"), /in \[0,1\]/);
});

test("validateCaptureResult rejects a non-fixed-width score or missing pin", () => {
  assert.ok(
    !validateCaptureResult({
      score: "0.5",
      label_map: {},
      positive_class_index: 1,
      detector_revision: "r",
      runtime_digest: "d",
      input_digest: "i",
    })
  );
  assert.ok(!validateCaptureResult({ score: "0.5000" })); // missing pin fields
});

test("byoTargetBinding + checkByoBinding round-trip; malformed is caught", () => {
  const b = byoTargetBinding({ adapter_digest: "sha256:aa", detector_revision: "abc123" });
  assert.equal(b.contract, BYO_CONTRACT);
  assert.equal(checkByoBinding(b), null);
  assert.equal(checkByoBinding(null), null); // optional
  assert.equal(checkByoBinding({ ...b, contract: "wrong" }), "byo_binding_invalid");
});
