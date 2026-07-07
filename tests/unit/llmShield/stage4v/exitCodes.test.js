import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VDP_RAW_CODES,
  VDP_CHECK_ORDER,
  VDP_REASONS_151,
  VDP_REASONS_152,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VDP raw codes are 151-161, frozen, level 1", () => {
  assert.deepEqual(VDP_CHECK_ORDER, [151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161]);
  assert.equal(VDP_RAW_CODES.VDP_COUNTER_CAPSULE_MALFORMED, 151);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_SIGNATURE_INVALID, 152);
  assert.equal(VDP_RAW_CODES.VDP_BINDING_MISMATCH, 153);
  assert.equal(VDP_RAW_CODES.VDP_CONTESTED_SECTION_SET_MISMATCH, 154);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_ITEM_MISMATCH, 155);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_OMITS_EVIDENCE, 156);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_ROOT_MISMATCH, 157);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_EPOCH_MISMATCH, 158);
  assert.equal(VDP_RAW_CODES.VDP_FORBIDDEN_RAW_PAYLOAD, 159);
  assert.equal(VDP_RAW_CODES.VDP_CONFLICT_MAP_MISMATCH, 160);
  assert.equal(VDP_RAW_CODES.INTERNAL_FAIL_CLOSED, 161);
  for (const raw of VDP_CHECK_ORDER) assert.equal(RUN_LEVEL_BY_RAW[raw], 1);
  assert.ok(Object.isFrozen(VDP_RAW_CODES) && Object.isFrozen(VDP_CHECK_ORDER));
  assert.ok(VDP_REASONS_151.includes("vdp_counter_capsule_schema_invalid"));
  assert.ok(VDP_REASONS_152.includes("respondent_signature_invalid"));
});
