// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CERTIFICATE_TYPE,
  CHECKER_VERSION,
  MANIFEST_DOMAIN,
  STAGE4H_EVIDENCE_DIR,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  HARNESS_CODES,
  RAW_VERIFIER_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("Stage 4H constants pin certificate type, checker version, domain, and evidence root", () => {
  assert.equal(CERTIFICATE_TYPE, "simurgh.vca.dfi_certificate.v1");
  assert.equal(CHECKER_VERSION, "4h-v0");
  assert.equal(MANIFEST_DOMAIN, "SIMURGH_STAGE4H_MANIFEST_V1\0");
  assert.equal(STAGE4H_EVIDENCE_DIR, "docs/research/llm-shield/evidence/stage-4h");
});

test("Stage 4H raw verifier codes exclude harness-only code 19", () => {
  assert.equal(RAW_VERIFIER_CODES.OK, 0);
  assert.equal(RAW_VERIFIER_CODES.SCHEMA_INVALID, 20);
  assert.equal(RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH, 22);
  assert.equal(RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, 25);
  assert.equal(RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, 28);
  assert.equal(RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, 29);
  assert.equal(HARNESS_CODES.CLEAN_RUN_FALSELY_REJECTED, 19);
  assert.equal(Object.values(RAW_VERIFIER_CODES).includes(19), false);
});

test("Stage 4H wrapper maps raw and harness codes to Stage 4 run-level codes", () => {
  assert.equal(stage4CodeForRawCode(0), 0);
  assert.equal(stage4CodeForRawCode(19), 1);
  assert.equal(stage4CodeForRawCode(20), 1);
  assert.equal(stage4CodeForRawCode(27), 1);
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
});
