// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — raw codes 190–198 (plan Task 1). Wrapper LAST at 198.
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VWA_RAW_CODES,
  VWA_CHECK_ORDER,
  VWA_PUBLIC_CODES,
  VWA_AUDIT_CODES,
  UNKNOWN_RAW_PROBE,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VWA_RAW_CODES maps the nine names to 190–198, wrapper LAST", () => {
  assert.equal(VWA_RAW_CODES.VWA_SCHEMA_INVALID, 190);
  assert.equal(VWA_RAW_CODES.VWA_SIGNATURE_INVALID, 191);
  assert.equal(VWA_RAW_CODES.VWA_DECLARATION_PRECOMMIT_MISMATCH, 192);
  assert.equal(VWA_RAW_CODES.VWA_CAPTURE_BINDING_MISMATCH, 193);
  assert.equal(VWA_RAW_CODES.VWA_GRID_INVALID, 194);
  assert.equal(VWA_RAW_CODES.VWA_READOUT_RECOMPUTE_MISMATCH, 195);
  assert.equal(VWA_RAW_CODES.VWA_FLAG_AGREEMENT_MISMATCH, 196);
  assert.equal(VWA_RAW_CODES.VWA_SELF_REPORT_CONFLICT, 197);
  // _VWA-suffixed to avoid colliding with VSN's existing INTERNAL_FAIL_CLOSED: 172.
  assert.equal(VWA_RAW_CODES.INTERNAL_FAIL_CLOSED_VWA, 198);
  assert.equal(VWA_RAW_CODES.INTERNAL_FAIL_CLOSED, undefined);
});

test("VWA_CHECK_ORDER is 190→197 (wrapper 198 excluded, applied last)", () => {
  assert.deepEqual([...VWA_CHECK_ORDER], [190, 191, 192, 193, 194, 195, 196, 197]);
  assert.ok(!VWA_CHECK_ORDER.includes(198));
});

test("VWA tier code sets are the machine fact behind the public/audit doctrine", () => {
  // audit-only 195 (readout recompute from tensors) is excluded from public.
  assert.deepEqual([...VWA_PUBLIC_CODES], [190, 191, 192, 193, 194, 196, 197]);
  assert.deepEqual([...VWA_AUDIT_CODES], [190, 191, 192, 193, 194, 195, 196, 197]);
  // public ⊂ audit (mirrors the Lean publicSubsetAudit lock)
  for (const c of VWA_PUBLIC_CODES) assert.ok(VWA_AUDIT_CODES.includes(c), `public ${c} in audit`);
});

test("every VWA code 190–198 is run-level 1", () => {
  for (let c = 190; c <= 198; c++) assert.equal(stage4CodeForRawCode(c), 1, `raw ${c}`);
});

test("unknown-code probe hygiene still holds", () => {
  assert.equal(UNKNOWN_RAW_PROBE, 999);
  assert.equal(stage4CodeForRawCode(999), 3);
});
