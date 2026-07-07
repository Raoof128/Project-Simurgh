// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — raw codes 181–189 (plan Task 1). Wrapper LAST at 189.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VDR_RAW_CODES,
  VDR_CHECK_ORDER,
  VDR_PUBLIC_CODES,
  VDR_AUDIT_CODES,
  VDR_REASONS_183,
  VDR_REASONS_185,
  UNKNOWN_RAW_PROBE,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VDR_RAW_CODES maps the nine names to 181–189, wrapper LAST", () => {
  assert.equal(VDR_RAW_CODES.VDR_SCHEMA_INVALID, 181);
  assert.equal(VDR_RAW_CODES.VDR_SIGNATURE_INVALID, 182);
  assert.equal(VDR_RAW_CODES.VDR_DOCUMENT_BYTES_INVALID, 183);
  assert.equal(VDR_RAW_CODES.VDR_FROZEN_BINDING_MISMATCH, 184);
  assert.equal(VDR_RAW_CODES.VDR_PARTITION_INVALID, 185);
  assert.equal(VDR_RAW_CODES.VDR_RECONCILIATION_MISMATCH, 186);
  assert.equal(VDR_RAW_CODES.VDR_SHADOW_REPLAY_MISMATCH, 187);
  assert.equal(VDR_RAW_CODES.VDR_MAP_RECOMPUTE_MISMATCH, 188);
  // _VDR-suffixed to avoid colliding with VSN's existing INTERNAL_FAIL_CLOSED: 172.
  assert.equal(VDR_RAW_CODES.INTERNAL_FAIL_CLOSED_VDR, 189);
  assert.equal(VDR_RAW_CODES.INTERNAL_FAIL_CLOSED, undefined);
});

test("VDR_CHECK_ORDER is 181→188 (wrapper 189 excluded, applied last)", () => {
  assert.deepEqual([...VDR_CHECK_ORDER], [181, 182, 183, 184, 185, 186, 187, 188]);
  assert.ok(!VDR_CHECK_ORDER.includes(189));
});

test("VDR tier code sets are the machine fact behind the public/audit doctrine", () => {
  assert.deepEqual([...VDR_PUBLIC_CODES], [181, 182, 184, 185]);
  assert.deepEqual([...VDR_AUDIT_CODES], [181, 182, 183, 184, 185, 186, 187, 188]);
  // public ⊂ audit
  for (const c of VDR_PUBLIC_CODES) assert.ok(VDR_AUDIT_CODES.includes(c), `public ${c} in audit`);
});

test("every VDR code 181–189 is run-level 1", () => {
  for (let c = 181; c <= 189; c++) assert.equal(stage4CodeForRawCode(c), 1, `raw ${c}`);
});

test("unknown-code probe hygiene still holds", () => {
  assert.equal(UNKNOWN_RAW_PROBE, 999);
  assert.equal(stage4CodeForRawCode(999), 3);
});

test("VDR_REASONS_183 lists the intrinsic bytes-tier reasons incl. marker + NFC", () => {
  assert.ok(VDR_REASONS_183.includes("not_nfc_normalised"));
  assert.ok(VDR_REASONS_183.includes("undeclared_redaction_marker"));
  assert.ok(VDR_REASONS_183.includes("invalid_utf8"));
  assert.ok(VDR_REASONS_183.includes("manifest_overlap"));
});

test("VDR_REASONS_185 lists the partition-arithmetic reasons incl. shadow arithmetic", () => {
  assert.ok(VDR_REASONS_185.includes("length_not_conserved"));
  assert.ok(VDR_REASONS_185.includes("shadow_arithmetic_broken"));
  assert.ok(VDR_REASONS_185.includes("aggregates_mismatch"));
});
