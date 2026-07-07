// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC exit-code registry. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIC_RAW_CODES,
  VIC_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VIC codes are 133-150, frozen order, level 1, fail-closed last", () => {
  assert.equal(VIC_RAW_CODES.VIC_CAPSULE_MALFORMED, 133);
  assert.equal(VIC_RAW_CODES.VIC_SIGNATURE_INVALID, 134);
  assert.equal(VIC_RAW_CODES.TEMPLATE_DIGEST_MISMATCH, 135);
  assert.equal(VIC_RAW_CODES.TEMPLATE_PARTITION_INCOMPLETE, 136);
  assert.equal(VIC_RAW_CODES.TEMPLATE_SECTION_UNMAPPED, 137);
  assert.equal(VIC_RAW_CODES.EVIDENCE_CENSUS_MISSING_ITEM, 138);
  assert.equal(VIC_RAW_CODES.EVIDENCE_CENSUS_SMUGGLED_ITEM, 139);
  assert.equal(VIC_RAW_CODES.CENSUS_MERKLE_MISMATCH, 140);
  assert.equal(VIC_RAW_CODES.FIELD_UNBACKED, 141);
  assert.equal(VIC_RAW_CODES.FIELD_RECOMPUTE_MISMATCH, 142);
  assert.equal(VIC_RAW_CODES.NOT_DERIVABLE_UNJUSTIFIED, 143);
  assert.equal(VIC_RAW_CODES.REQUIRES_HUMAN_INPUT_UNJUSTIFIED, 144);
  assert.equal(VIC_RAW_CODES.INCIDENT_EPOCH_MISMATCH, 145);
  assert.equal(VIC_RAW_CODES.CROSS_STAGE_REFERENCE_INVALID, 146);
  assert.equal(VIC_RAW_CODES.ATTESTATION_DIGEST_MISMATCH, 147);
  assert.equal(VIC_RAW_CODES.VIEW_INCONSISTENT_WITH_CAPSULE, 148);
  assert.equal(VIC_RAW_CODES.REDACTION_UNDECLARED, 149);
  assert.equal(VIC_RAW_CODES.INTERNAL_FAIL_CLOSED, 150);
  assert.deepEqual(
    VIC_CHECK_ORDER,
    [133, 134, 135, 136, 137, 138, 139, 140, 145, 146, 141, 142, 143, 144, 147, 148, 149, 150]
  );
  for (let c = 133; c <= 150; c += 1) assert.equal(RUN_LEVEL_BY_RAW[c], 1);
  assert.equal(RUN_LEVEL_BY_RAW[UNKNOWN_RAW_PROBE], undefined);
});
