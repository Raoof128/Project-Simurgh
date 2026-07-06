// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CCB_RAW_CODES,
  CCB_REASONS,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("ccb raw codes are 40/41/42 and map to run-level 1", () => {
  assert.equal(CCB_RAW_CODES.CLUSTER_COMMITMENT_MISSING, 40);
  assert.equal(CCB_RAW_CODES.CLUSTER_BUDGET_EXCEEDED, 41);
  assert.equal(CCB_RAW_CODES.CLUSTER_ASSIGNMENT_MISMATCH, 42);
  for (const code of Object.values(CCB_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(code), 1);
  }
});

test("raw 39 stays reserved (unmapped -> fail-closed 3)", () => {
  assert.equal(stage4CodeForRawCode(39), 3);
});

test("unknown codes still fail closed to 3", () => {
  // 43-46 (VXD) and 47-54 (Seismograph) are now mapped to 1; probe with a genuinely-unknown code.
  assert.equal(stage4CodeForRawCode(999), 3);
  assert.equal(stage4CodeForRawCode(-1), 3);
});

test("ccb reasons are frozen and complete", () => {
  assert.deepEqual(CCB_REASONS, [
    "cluster_commitment_missing",
    "cluster_budget_exceeded",
    "cluster_assignment_mismatch",
  ]);
  assert.ok(Object.isFrozen(CCB_REASONS));
});
