// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { privacyGate } from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  applyMutation,
  buildCleanTamperContext,
  buildTamperMatrix,
  bumpDigest,
  mutationFamily,
} from "../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs";

function codeMatches(actual, expected) {
  return actual === expected;
}

test("Q6 bumpDigest preserves sha256 digest shape while changing value", () => {
  const original = `sha256:${"a".repeat(64)}`;
  const bumped = bumpDigest(original);
  assert.match(bumped, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(bumped, original);
});

test("Q6 mutation family covers every required single-delta arm", () => {
  assert.deepEqual(
    mutationFamily().map((entry) => entry.arm),
    [
      "sig-byte",
      "merkle-node",
      "binding",
      "policy",
      "premise",
      "lattice-digest",
      "lattice-step",
      "proof-step",
    ]
  );
});

test("Q6 tamper matrix accepts clean twin and rejects every tampered twin", () => {
  const matrix = buildTamperMatrix(buildCleanTamperContext());
  assert.equal(matrix.clean.code, 0);
  assert.equal(matrix.tampered_accepted_count, 0);
  for (const result of matrix.results) {
    assert.equal(result.accepted, false, result.arm);
    assert.equal(codeMatches(result.code, result.expected_code), true, result.arm);
    assert.equal(result.reason, result.expected_reason, result.arm);
  }
});

test("Q6 anti-theatre proof-step arm is step-9 owned", () => {
  const ctx = buildCleanTamperContext();
  const arm = mutationFamily().find((entry) => entry.arm === "proof-step");
  const result = applyMutation(ctx, arm);
  assert.equal(result.diagnosis.code, 26);
  assert.equal(result.diagnosis.reason, "proof_step_missing");
  assert.equal(result.passed_steps.includes(7), true);
});

test("Q6 pure tamper arms are silent under Q7", () => {
  const ctx = buildCleanTamperContext();
  for (const arm of mutationFamily()) {
    const mutated = applyMutation(ctx, arm);
    const q7 = privacyGate(mutated.certificate);
    assert.equal(q7.ok, true, arm.arm);
  }
});

test("Q6 Layer-B semantic arms repair earlier binding before target failure", () => {
  const ctx = buildCleanTamperContext();
  for (const arm of mutationFamily().filter(
    (entry) => entry.layer === "B" && entry.arm !== "binding"
  )) {
    const mutated = applyMutation(ctx, arm);
    assert.notEqual(mutated.diagnosis.code, 25, arm.arm);
    assert.notEqual(mutated.diagnosis.reason, "pack_binding_mismatch", arm.arm);
  }
});
