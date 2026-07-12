// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — VTC-Quorum exit-code ledger (additive 384-395; frozen order; wrapper 395 outside the spine).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VTCQUORUM_RAW_CODES,
  VTCQUORUM_PUBLIC_CHECK_ORDER,
  VTCQUORUM_AUDIT_CHECK_ORDER,
  VTCQUORUM_AUDIT_ONLY_CODES,
  VTCQUORUM_POLICY_CODES,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VTCQUORUM_RAW_CODES: OK + 384..395, unique, disjoint from 364..383", () => {
  const vals = Object.values(VTCQUORUM_RAW_CODES);
  assert.equal(VTCQUORUM_RAW_CODES.OK, 0);
  const nonZero = vals.filter((v) => v !== 0).sort((a, b) => a - b);
  assert.deepEqual(nonZero, [384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395]);
  assert.equal(new Set(vals).size, vals.length); // unique
  for (const v of nonZero) assert.ok(v >= 384 && v <= 395, `${v} out of additive band`);
});

test("public spine: 11 codes, 394 before 393, wrapper 395 NOT present", () => {
  assert.deepEqual(
    VTCQUORUM_PUBLIC_CHECK_ORDER,
    [384, 385, 386, 387, 388, 389, 390, 391, 392, 394, 393]
  );
  const i394 = VTCQUORUM_PUBLIC_CHECK_ORDER.indexOf(394);
  const i393 = VTCQUORUM_PUBLIC_CHECK_ORDER.indexOf(393);
  assert.ok(i394 < i393, "overclaim (394) must precede honest floor (393)");
  assert.ok(
    !VTCQUORUM_PUBLIC_CHECK_ORDER.includes(395),
    "395 is the outer boundary, not a predicate"
  );
});

test("audit/policy arrays + wrapper", () => {
  // No audit-only or policy codes this stage; audit order == public order.
  assert.deepEqual(VTCQUORUM_AUDIT_ONLY_CODES, []);
  assert.deepEqual(VTCQUORUM_POLICY_CODES, []);
  assert.deepEqual(VTCQUORUM_AUDIT_CHECK_ORDER, VTCQUORUM_PUBLIC_CHECK_ORDER);
  assert.equal(VTCQUORUM_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VTCQUORUM, 395);
});

test("RUN_LEVEL_BY_RAW: every 384..395 is run level 1", () => {
  for (let c = 384; c <= 395; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `raw ${c}`);
});
