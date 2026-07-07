import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VSN_RAW_CODES,
  VSN_CHECK_ORDER,
  VSN_REASONS_162,
  VSN_REASONS_163,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VSN raw codes 162-172, wrapper last, all level 1", () => {
  assert.equal(VSN_RAW_CODES.VSN_SCHEMA_INVALID, 162);
  assert.equal(VSN_RAW_CODES.VSN_SIGNATURE_INVALID, 163);
  assert.equal(VSN_RAW_CODES.VSN_NORMALISATION_INVALID, 164);
  assert.equal(VSN_RAW_CODES.VSN_SPAN_GEOMETRY_INVALID, 165);
  assert.equal(VSN_RAW_CODES.VSN_BINDING_MISMATCH, 166);
  assert.equal(VSN_RAW_CODES.VSN_EVIDENCE_LOCALITY_VIOLATION, 167);
  assert.equal(VSN_RAW_CODES.VSN_JUDGMENT_BINDING_INVALID, 168);
  assert.equal(VSN_RAW_CODES.VSN_SLOT_RECOMPUTE_MISMATCH, 169);
  assert.equal(VSN_RAW_CODES.VSN_LEAKAGE_DETECTED, 170);
  assert.equal(VSN_RAW_CODES.VSN_PAYLOAD_VIOLATION, 171);
  assert.equal(VSN_RAW_CODES.INTERNAL_FAIL_CLOSED, 172);
  assert.deepEqual([...VSN_CHECK_ORDER], [162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172]);
  for (const raw of VSN_CHECK_ORDER) assert.equal(RUN_LEVEL_BY_RAW[raw], 1);
  assert.ok(VSN_REASONS_162.includes("vsn_schema_invalid"));
  assert.ok(VSN_REASONS_163.includes("vsn_signature_invalid"));
});
