// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — raw codes 199–209 (plan Task 1). Wrapper LAST at 209.
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VNC_RAW_CODES,
  VNC_CHECK_ORDER,
  VNC_PUBLIC_CODES,
  VNC_AUDIT_CODES,
  UNKNOWN_RAW_PROBE,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VNC_RAW_CODES maps the eleven names to 199–209, wrapper LAST", () => {
  assert.equal(VNC_RAW_CODES.VNC_SCHEMA_INVALID, 199);
  assert.equal(VNC_RAW_CODES.VNC_SIGNATURE_INVALID, 200);
  assert.equal(VNC_RAW_CODES.VNC_INPUT_BINDING_MISMATCH, 201);
  assert.equal(VNC_RAW_CODES.VNC_CLAIM_TABLE_PRECOMMIT_MISMATCH, 202);
  assert.equal(VNC_RAW_CODES.VNC_CLASSIFICATION_INVALID, 203);
  assert.equal(VNC_RAW_CODES.VNC_FLAG_COVERAGE_INVALID, 204);
  assert.equal(VNC_RAW_CODES.VNC_VERDICT_RECOMPUTE_MISMATCH, 205);
  assert.equal(VNC_RAW_CODES.VNC_PROVENANCE_MANIFEST_MISMATCH, 206);
  assert.equal(VNC_RAW_CODES.VNC_ADAPTER_CONFORMANCE_FAILED, 207);
  assert.equal(VNC_RAW_CODES.VNC_TALLY_MISMATCH, 208);
  // _VNC-suffixed to avoid colliding with VSN's INTERNAL_FAIL_CLOSED: 172.
  assert.equal(VNC_RAW_CODES.INTERNAL_FAIL_CLOSED_VNC, 209);
  assert.equal(VNC_RAW_CODES.INTERNAL_FAIL_CLOSED, undefined);
});

test("VNC_CHECK_ORDER is 199→208 (wrapper 209 excluded, applied last)", () => {
  assert.deepEqual([...VNC_CHECK_ORDER], [199, 200, 201, 202, 203, 204, 205, 206, 207, 208]);
  assert.ok(!VNC_CHECK_ORDER.includes(209));
});

test("VNC tier code sets are literal and identical (tier depth differs, not the set)", () => {
  const literal = [199, 200, 201, 202, 203, 204, 205, 206, 207, 208];
  assert.deepEqual([...VNC_PUBLIC_CODES], literal);
  assert.deepEqual([...VNC_AUDIT_CODES], literal);
  // public ⊆ audit (mirrors the Lean publicSubsetAudit lock)
  for (const c of VNC_PUBLIC_CODES) assert.ok(VNC_AUDIT_CODES.includes(c), `public ${c} in audit`);
});

test("every VNC code 199–209 is run-level 1", () => {
  for (let c = 199; c <= 209; c++) assert.equal(stage4CodeForRawCode(c), 1, `raw ${c}`);
});

test("unknown-code probe hygiene still holds", () => {
  assert.equal(UNKNOWN_RAW_PROBE, 999);
  assert.equal(stage4CodeForRawCode(999), 3);
});
