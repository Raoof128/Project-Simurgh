// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — exit codes 225-239 (plan Task 1). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VSB_RAW_CODES,
  VSB_CHECK_ORDER,
  VSB_AUDIT_CODES,
  VSB_PUBLIC_CODES,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VSB_RAW_CODES: 15 codes, 225-239 contiguous, wrapper LAST at 239", () => {
  const vals = Object.values(VSB_RAW_CODES);
  assert.equal(vals.length, 15);
  assert.deepEqual(
    [...vals].sort((a, b) => a - b),
    Array.from({ length: 15 }, (_, i) => 225 + i)
  );
  assert.equal(VSB_RAW_CODES.INTERNAL_FAIL_CLOSED_VSB, 239);
  assert.equal(VSB_RAW_CODES.VSB_SCHEMA_INVALID, 225);
  assert.equal(VSB_RAW_CODES.VSB_KERNEL_BREACH_CLAIMED, 237);
  assert.equal(VSB_RAW_CODES.VSB_LANE_BINDING_INVALID, 238);
});

test("check order = 225..238, wrapper 239 excluded", () => {
  assert.deepEqual(
    VSB_CHECK_ORDER,
    Array.from({ length: 14 }, (_, i) => 225 + i)
  );
  assert.ok(!VSB_CHECK_ORDER.includes(239));
});

test("tier split: audit = 225..238; public excludes ONLY 233; 237 IS public (PF2)", () => {
  assert.deepEqual(
    VSB_AUDIT_CODES,
    Array.from({ length: 14 }, (_, i) => 225 + i)
  );
  // public ⊊ audit
  assert.ok(VSB_PUBLIC_CODES.every((c) => VSB_AUDIT_CODES.includes(c)));
  assert.ok(VSB_PUBLIC_CODES.length < VSB_AUDIT_CODES.length);
  assert.ok(!VSB_PUBLIC_CODES.includes(233), "233 (silent slip) is audit-only");
  assert.ok(VSB_PUBLIC_CODES.includes(237), "237 (kernel-breach overclaim) is PUBLIC");
  // 233 is the ONLY exclusion
  assert.equal(VSB_AUDIT_CODES.length - VSB_PUBLIC_CODES.length, 1);
});

test("every VSB code is RUN_LEVEL_BY_RAW level 1 (golden ripple applied)", () => {
  for (let c = 225; c <= 239; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `raw ${c}`);
});
