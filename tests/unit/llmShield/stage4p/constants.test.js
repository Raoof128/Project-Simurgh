// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VOCA_RAW_CODES,
  VOCA_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  SCHEMAS,
  DOMAINS,
  ENUMS,
  VOCA_NON_CLAIMS,
  ENTROPY_BITS_BY_KIND,
  ENTROPY_FLOOR_BITS,
} from "../../../../tools/simurgh-attestation/stage4p/constants.mjs";

test("voca raw codes 67-79 are frozen and complete", () => {
  assert.deepEqual(VOCA_RAW_CODES, {
    CUSTODY_ENVELOPE_MISSING: 67,
    CUSTODY_SIGNATURE_INVALID: 68,
    CUSTODY_EPOCH_INVALID: 69,
    ENDPOINT_ORIGIN_MISMATCH: 70,
    UNDECLARED_PROXY_HOP: 71,
    MODEL_IDENTITY_MISMATCH: 72,
    ACCOUNT_POOL_AMBIGUITY: 73,
    TRACE_CUSTODY_VIOLATION: 74,
    CUSTODY_SURFACE_REWRITE: 75,
    RELAY_TRANSFORM_UNBOUND: 76,
    CUSTODY_RECEIPT_BINDING_MISMATCH: 77,
    CUSTODY_PATH_LAUNDERING: 78,
    CPC_EMISSION_VIOLATION: 79,
  });
});

test("normative check order is frozen (78 after structural validity, spec §7.1)", () => {
  assert.deepEqual(VOCA_CHECK_ORDER, [67, 68, 69, 78, 70, 71, 72, 73, 74, 75, 76, 77, 79]);
});

test("all 13 codes map to run-level 1; unknown fails closed to 3", () => {
  for (const code of Object.values(VOCA_RAW_CODES)) {
    assert.equal(RUN_LEVEL_BY_RAW[code], 1);
    assert.equal(stage4CodeForRawCode(code), 1);
  }
  assert.equal(stage4CodeForRawCode(80), 3);
});

test("constants: schemas, domains, enums, non-claims frozen", () => {
  assert.equal(SCHEMAS.ENVELOPE, "simurgh.origin_custody_envelope.v1");
  assert.equal(SCHEMAS.HOP_RECEIPT, "simurgh.custody_hop_receipt.v1");
  assert.equal(SCHEMAS.CUSTODY_RECEIPT, "simurgh.custody_receipt.v1");
  assert.equal(SCHEMAS.CPC_SIGNAL, "simurgh.custody_class_signal.v1");
  assert.equal(SCHEMAS.ENFORCEMENT, "simurgh.enforcement_window_commitment.v1");
  assert.equal(SCHEMAS.CONTEST, "simurgh.relay_contest.v1");
  assert.equal(SCHEMAS.DISCLOSURE, "simurgh.vendor_custody_disclosure.v1");
  assert.equal(SCHEMAS.ATTESTATION, "simurgh.voca_attestation.v1");
  for (const d of Object.values(DOMAINS)) assert.ok(d.startsWith("SIMURGH_STAGE4P_"));
  assert.equal(DOMAINS.CUSTODY_CLASS, "SIMURGH_STAGE4P_CUSTODY_CLASS_V1");
  assert.equal(DOMAINS.SURFACE_BINDING, "SIMURGH_STAGE4P_STAGE4O_SURFACE_BINDING_V1");
  assert.equal(VOCA_NON_CLAIMS.length, 16);
  assert.ok(VOCA_NON_CLAIMS.includes("not_model_substitution_oracle"));
  assert.ok(VOCA_NON_CLAIMS.includes("disclosure_budget_is_not_privacy_proof"));
  assert.equal(ENTROPY_BITS_BY_KIND.relay_spki_sha256, 128);
  assert.equal(ENTROPY_BITS_BY_KIND.low_entropy_or_unknown, 0);
  assert.equal(ENTROPY_FLOOR_BITS, 96);
  assert.ok(Object.isFrozen(ENUMS.provider_family));
});
