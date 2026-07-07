import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

test("4W constants: schemas, ruleset, honesty ledger", () => {
  assert.equal(C.VSN_NARRATIVE_SCHEMA, "simurgh.vsn.narrative.v1");
  assert.deepEqual([...C.SPAN_TYPES], ["slot_bound", "judgment", "unverified_prose"]);
  assert.deepEqual([...C.AUTHOR_ROLES], ["operator", "drafting_model_operator_signed"]);
  assert.equal(C.LEAKAGE_RULESET_ID, "vsn.leakage.v1");
  assert.ok(C.LEAKAGE_NUMBER_WORDS.includes("dozen"));
  assert.ok(C.LEAKAGE_QUANTIFIERS.includes("nearly"));
  assert.equal(C.VSN_NON_CLAIMS.length, 10);
  assert.ok(C.VSN_NON_CLAIMS.includes("not_a_claim_that_density_measures_quality"));
  assert.equal(C.VSN_KNOWN_LIMITATIONS.length, 5);
  assert.equal(C.VSN_RESERVED_SLOTS.length, 4);
  assert.ok(C.VSN_RESERVED_SLOTS.includes("semantic_leakage_adversary_deferred"));
  assert.ok(C.VSN_RESERVED_SLOTS.includes("transparency_report_profile_deferred"));
  assert.ok(Object.isFrozen(C.VSN_NON_CLAIMS));
});
