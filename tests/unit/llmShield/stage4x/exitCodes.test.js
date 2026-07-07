// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — raw codes 173–180 (plan Task 1). Wrapper LAST at 180.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VLR_RAW_CODES,
  VLR_CHECK_ORDER,
  VLR_REASONS_175,
  UNKNOWN_RAW_PROBE,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VLR_RAW_CODES maps the eight names to 173–180, wrapper LAST", () => {
  assert.equal(VLR_RAW_CODES.VLR_SCHEMA_INVALID, 173);
  assert.equal(VLR_RAW_CODES.VLR_SIGNATURE_INVALID, 174);
  assert.equal(VLR_RAW_CODES.VLR_CORPUS_INVALID, 175);
  assert.equal(VLR_RAW_CODES.VLR_V1_FROZEN_MISMATCH, 176);
  assert.equal(VLR_RAW_CODES.VLR_GATE_RECOMPUTE_MISMATCH, 177);
  assert.equal(VLR_RAW_CODES.VLR_LEDGER_MISMATCH, 178);
  assert.equal(VLR_RAW_CODES.VLR_BOUND_NOT_MONOTONE, 179);
  // _VLR-suffixed to avoid colliding with VSN's existing INTERNAL_FAIL_CLOSED: 172 (P1-4).
  assert.equal(VLR_RAW_CODES.INTERNAL_FAIL_CLOSED_VLR, 180);
  assert.equal(VLR_RAW_CODES.INTERNAL_FAIL_CLOSED, undefined);
});

test("VLR_CHECK_ORDER is 173→179 (wrapper 180 excluded, applied last)", () => {
  assert.deepEqual([...VLR_CHECK_ORDER], [173, 174, 175, 176, 177, 178, 179]);
  assert.ok(!VLR_CHECK_ORDER.includes(180));
});

test("every VLR code 173–180 is run-level 1", () => {
  for (let c = 173; c <= 180; c++) assert.equal(stage4CodeForRawCode(c), 1, `raw ${c}`);
});

test("unknown-code probe hygiene still holds", () => {
  assert.equal(UNKNOWN_RAW_PROBE, 999);
  assert.equal(stage4CodeForRawCode(999), 3);
});

test("VLR_REASONS_175 lists the corpus-well-formedness reasons incl. MR-derivation + coverage", () => {
  assert.ok(VLR_REASONS_175.includes("residue_form_not_mr_derived"));
  assert.ok(VLR_REASONS_175.includes("coverage_witness_incomplete"));
  assert.ok(VLR_REASONS_175.includes("count_mismatch"));
});
