// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U VRTA raw-code registry tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VRTA_RAW_CODES,
  VRTA_CHECK_ORDER,
  VRTA_REASONS_119,
  VRTA_REASONS_120,
  RUN_LEVEL_BY_RAW,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VRTA codes are the contiguous block 119..132", () => {
  const vals = Object.values(VRTA_RAW_CODES).sort((a, b) => a - b);
  assert.deepEqual(
    vals,
    Array.from({ length: 14 }, (_, i) => 119 + i)
  );
});

test("check order is ascending 119..132 and covers every code once", () => {
  assert.deepEqual(
    VRTA_CHECK_ORDER,
    Array.from({ length: 14 }, (_, i) => 119 + i)
  );
});

test("every VRTA code is run-level 1", () => {
  for (const c of VRTA_CHECK_ORDER) assert.equal(RUN_LEVEL_BY_RAW[c], 1);
});

test("named codes match the spec map", () => {
  assert.equal(VRTA_RAW_CODES.VRTA_BUNDLE_MALFORMED, 119);
  assert.equal(VRTA_RAW_CODES.SIGNATURE_INVALID, 120);
  assert.equal(VRTA_RAW_CODES.CHARTER_UNBOUND_ATTACK, 121);
  assert.equal(VRTA_RAW_CODES.NON_MALICE_INVARIANT_VIOLATED, 122);
  assert.equal(VRTA_RAW_CODES.LIVE_LANE_CAP_EXCEEDED, 123);
  assert.equal(VRTA_RAW_CODES.ATTACK_MANIFEST_ROOT_MISMATCH, 124);
  assert.equal(VRTA_RAW_CODES.FINDING_RECORD_MISSING, 125);
  assert.equal(VRTA_RAW_CODES.CORPUS_COUNT_MISMATCH, 126);
  assert.equal(VRTA_RAW_CODES.SELF_REPORT_RECOMPUTE_CONFLICT, 127);
  assert.equal(VRTA_RAW_CODES.OUTCOME_CLASSIFICATION_INVALID, 128);
  assert.equal(VRTA_RAW_CODES.ATTACK_NOT_REPRODUCIBLE, 129);
  assert.equal(VRTA_RAW_CODES.ASR_LEDGER_MISMATCH, 130);
  assert.equal(VRTA_RAW_CODES.SEVERITY_UNDECLARED, 131);
  assert.equal(VRTA_RAW_CODES.INTERNAL_FAIL_CLOSED, 132);
  assert.equal(UNKNOWN_RAW_PROBE, 999);
});

test("VRTA_REASONS_120 covers the signature-invalid species (P1-1)", () => {
  assert.deepEqual(VRTA_REASONS_120, [
    "charter_signature_invalid",
    "finding_signature_invalid",
    "attestation_signature_invalid",
  ]);
  assert.ok(Object.isFrozen(VRTA_REASONS_120));
  assert.equal(VRTA_REASONS_119.length, 5);
});
