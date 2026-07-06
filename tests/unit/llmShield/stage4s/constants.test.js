// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S frozen constants gate (4S spec §2, §3). Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";

test("schemas, domains, kinds, sentinel are frozen and exact", () => {
  assert.equal(C.SCHEMAS.HOP_RECEIPT, "simurgh.vdcc_hop_receipt.v1");
  assert.equal(C.SCHEMAS.FANOUT_COMMITMENT, "simurgh.vdcc_fanout_commitment.v1");
  assert.equal(C.SCHEMAS.CROSSING_ARTIFACT, "simurgh.vdcc_crossing_artifact.v1");
  assert.equal(C.SCHEMAS.CHAIN_BUNDLE, "simurgh.vdcc_chain_bundle.v1");
  assert.equal(C.DOMAINS.BUNDLE, "SIMURGH_STAGE4S_BUNDLE_V1");
  assert.equal(C.DOMAINS.RECEIPT, "SIMURGH_STAGE4S_RECEIPT_V1");
  assert.deepEqual(C.CROSSING_KINDS, [
    "tool_execution",
    "export",
    "privilege_expansion",
    "consent_broadening",
    "disclosure_escalation",
    "destructive_mutation",
  ]);
  assert.equal(C.ROOT_SENTINEL, "self");
  for (const o of [C.SCHEMAS, C.DOMAINS, C.CROSSING_KINDS]) assert.ok(Object.isFrozen(o));
});

test("non-claims (7), limitations (5), rails (12) in spec order", () => {
  assert.equal(C.VDCC_NON_CLAIMS.length, 7);
  assert.equal(C.VDCC_NON_CLAIMS[0], "not_an_agent_identity_system");
  assert.equal(C.VDCC_KNOWN_LIMITATIONS.length, 5);
  assert.equal(C.VDCC_KNOWN_LIMITATIONS[3], "incident_capsule_deferred_to_stage_4t");
  assert.equal(C.VDCC_RAILS.length, 12);
  assert.ok(C.VDCC_RAILS.includes("merkle_inclusion_is_presence_not_completeness"));
  assert.ok(
    C.VDCC_RAILS.includes(
      "attenuation_enforcement_is_prior_art_our_claim_is_offline_recomputable_proof"
    )
  );
  for (const a of [C.VDCC_NON_CLAIMS, C.VDCC_KNOWN_LIMITATIONS, C.VDCC_RAILS])
    assert.ok(Object.isFrozen(a));
});
