import test from "node:test";
import assert from "node:assert/strict";
import {
  VFC_RAW_CODES,
  VFC_PUBLIC_CHECK_ORDER,
  VFC_AUDIT_CHECK_ORDER,
  VFC_AUDIT_ONLY_CODES,
  VFC_POLICY_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VFC raw codes are 283–299, contiguous", () => {
  const vals = Object.values(VFC_RAW_CODES).filter((v) => v !== 0);
  assert.deepEqual(
    vals,
    Array.from({ length: 17 }, (_, i) => 283 + i)
  );
});

test("public order 283–296; audit adds 297; audit-only=[297]; policy=[298]", () => {
  assert.deepEqual(
    VFC_PUBLIC_CHECK_ORDER,
    Array.from({ length: 14 }, (_, i) => 283 + i)
  );
  assert.deepEqual(
    VFC_AUDIT_CHECK_ORDER,
    Array.from({ length: 15 }, (_, i) => 283 + i)
  );
  assert.deepEqual(VFC_AUDIT_ONLY_CODES, [297]);
  assert.deepEqual(VFC_POLICY_CODES, [298]);
});

test("every 283–299 has run level 1", () => {
  for (let c = 283; c <= 299; c++) assert.equal(stage4CodeForRawCode(c), 1);
});

test("headline + boundary codes have their frozen numbers", () => {
  assert.equal(VFC_RAW_CODES.VFC_SCHEMA_INVALID, 283);
  assert.equal(VFC_RAW_CODES.VFC_SEPARATION_OVERCLAIM, 296);
  assert.equal(VFC_RAW_CODES.VFC_POLICY_REJECTED, 298);
  assert.equal(VFC_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VFC, 299);
});
