// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — exit codes (plan Task 2). One meaning per code; wrapper LAST; tier split.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VARL_RAW_CODES,
  VARL_CHECK_ORDER,
  VARL_AUDIT_CODES,
  VARL_PUBLIC_CODES,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("codes 240-254 contiguous, one meaning each, wrapper LAST", () => {
  const vals = Object.values(VARL_RAW_CODES).sort((a, b) => a - b);
  assert.deepEqual(
    vals,
    [240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254]
  );
  assert.equal(new Set(vals).size, vals.length, "no code reused (P0-1 collision guard)");
  assert.equal(VARL_RAW_CODES.INTERNAL_FAIL_CLOSED_VARL, 254);
  assert.equal(Math.max(...vals), 254, "wrapper is the highest");
});

test("check order is 240..253, wrapper 254 excluded", () => {
  assert.deepEqual(
    VARL_CHECK_ORDER,
    [240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253]
  );
  assert.ok(!VARL_CHECK_ORDER.includes(254));
});

test("tier split: public ⊊ audit, excludes ONLY 253", () => {
  assert.deepEqual(VARL_AUDIT_CODES, VARL_CHECK_ORDER);
  const auditOnly = VARL_AUDIT_CODES.filter((c) => !VARL_PUBLIC_CODES.includes(c));
  assert.deepEqual(auditOnly, [253], "253 is the sole audit-only code");
  assert.ok(VARL_PUBLIC_CODES.includes(252), "252 anti-overclaim is public");
});

test("RUN_LEVEL_BY_RAW covers 240-254 at level 1", () => {
  for (let c = 240; c <= 254; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `code ${c}`);
});
