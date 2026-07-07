import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4v/constants.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

test("schemas, enums, signed lists frozen and complete", () => {
  assert.equal(C.VDP_COUNTER_CAPSULE_SCHEMA, "simurgh.vdp.counter_capsule.v1");
  assert.equal(C.VDP_CONFLICT_MAP_SCHEMA, "simurgh.vdp.conflict_map.v1");
  assert.equal(C.VDP_OUTCOME_SCHEMA, "simurgh.vdp.contest_outcome.v1");
  assert.deepEqual(C.VDP_VERBS, ["agree", "dispute_by_recomputation", "dispute_as_judgment"]);
  assert.deepEqual(C.RESPONDENT_ROLES, ["provider", "deployer", "third_party", "unspecified"]);
  assert.deepEqual(C.VDP_STATUSES, [
    "AGREED",
    "CONFLICT_PROVEN",
    "ABSENCE_REBUTTED",
    "DISPUTE_RECORDED",
    "DISPUTE_FAILED",
  ]);
  assert.deepEqual(C.DISPUTE_FAILED_SUBREASONS, ["recompute_failed", "section_not_contestable"]);
  assert.equal(C.ANCHOR_KEY, "meta/evidence_anchored_at_beat");
  assert.equal(C.ANCHOR_REGIME, "meta");
  assert.equal(C.ANCHOR_SECTION, "evidence_anchored_at_beat");
  assert.equal(C.VDP_NON_CLAIMS.length, 8);
  assert.equal(C.VDP_NON_CLAIMS[7], "not_a_claim_partition_rescore_signals_revise_the_capsule");
  assert.equal(C.VDP_KNOWN_LIMITATIONS.length, 5);
  assert.deepEqual(C.VDP_RESERVED_SLOTS, [
    "surrejoinder_round_deferred",
    "narrative_claim_contest_deferred",
    "risk_report_contest_profile_deferred",
    "fact_group_projection_deferred",
  ]);
  for (const k of ["VDP_NON_CLAIMS", "VDP_KNOWN_LIMITATIONS", "VDP_RAILS", "VDP_RESERVED_SLOTS"])
    assert.ok(Object.isFrozen(C[k]), k);
});

test("reference capsule pin matches the deterministic 4T build (immutability rail)", () => {
  const b = buildGreenBundle().bundle;
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.capsule_root, b.content.capsule_root);
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.attestation_digest, b.attestation_digest);
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.incident_anchor, "stage4s_verdict_108");
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.reference_capsule_not_synthetic, true);
});
