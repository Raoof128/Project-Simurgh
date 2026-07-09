// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — exit codes (plan Task 2). One meaning per code; wrapper LAST; tier split.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VDA_RAW_CODES,
  VDA_CHECK_ORDER,
  VDA_AUDIT_CODES,
  VDA_PUBLIC_CODES,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("codes 255-267 contiguous, one meaning each, wrapper LAST", () => {
  const vals = Object.values(VDA_RAW_CODES).sort((a, b) => a - b);
  assert.deepEqual(vals, [255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267]);
  assert.equal(new Set(vals).size, vals.length, "no code reused (collision guard)");
  assert.equal(VDA_RAW_CODES.INTERNAL_FAIL_CLOSED_VDA, 267);
  assert.equal(Math.max(...vals), 267, "wrapper is the highest");
});

test("check order is 255..266, wrapper 267 excluded", () => {
  assert.deepEqual(VDA_CHECK_ORDER, [255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266]);
  assert.ok(!VDA_CHECK_ORDER.includes(267));
});

test("tier split: public ⊊ audit, excludes ONLY 266; 264 is public", () => {
  assert.deepEqual(VDA_AUDIT_CODES, VDA_CHECK_ORDER);
  const auditOnly = VDA_AUDIT_CODES.filter((c) => !VDA_PUBLIC_CODES.includes(c));
  assert.deepEqual(auditOnly, [266], "266 is the sole audit-only code");
  assert.ok(VDA_PUBLIC_CODES.includes(264), "264 forbidden-claim/unreviewed is public");
});

test("RUN_LEVEL_BY_RAW covers 255-267 at level 1 (matches the 254 wrapper)", () => {
  for (let c = 255; c <= 267; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `code ${c}`);
});
