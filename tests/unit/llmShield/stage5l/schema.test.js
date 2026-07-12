// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — schema belt 364 + cfg-undefined→364 + skeleton passthrough.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5l/constants.mjs";

function minBundle() {
  return {
    schema_version: DOMAINS.bundle,
    campaign_id: "c1",
    commitment_session_id: "sha256:00",
    ceremony_id: "sha256:00",
    vuc: { universe_commitment_digest: "sha256:vuc" },
    ceremony_contract: {
      review_window_policy_digest: "sha256:w",
      anchor_policy_digest: "sha256:a",
      quorum_policy_digest: "sha256:q",
      trust_domain_registry_digest: "sha256:t",
      declared_release_surface_digest: "sha256:r",
      gate_identity_policy_digest: "sha256:g",
      profile: "vtc_core",
    },
    anchors: [
      {
        anchor_type: "rfc3161_tsa",
        trust_domain: "tsa-x",
        tsa_token_digest: "sha256:tk",
        verifier_result: null,
      },
    ],
    review_access_authorisation_receipt: { binds: {}, start_capability_root_digest: "sha256:cap" },
    declared_releases: [],
    reserved_slots: { campaign_composition_root: null },
    signatures: {},
  };
}
const minCfg = () => ({
  schema_version: DOMAINS.config,
  profile: "vtc_core",
  policy_digest: "sha256:p",
});

test("non-object bundle → 364", () => {
  assert.equal(vtcqVerify(null, minCfg()).raw, 364);
});

test("bundle missing a ceremony_contract digest → 364", () => {
  const b = minBundle();
  delete b.ceremony_contract.gate_identity_policy_digest;
  assert.equal(vtcqVerify(b, minCfg()).raw, 364);
});

test("anchor with a pre-filled verifier_result → 364 (S6)", () => {
  const b = minBundle();
  b.anchors[0].verifier_result = "valid";
  assert.equal(vtcqVerify(b, minCfg()).raw, 364);
});

test("adequacy vocabulary key anywhere → 364 (G13 belt)", () => {
  const b = minBundle();
  b.ceremony_contract.review_adequate = true;
  assert.equal(vtcqVerify(b, minCfg()).raw, 364);
});

test("cfg === undefined → 364, NOT wrapper 383 (P0-7a)", () => {
  assert.equal(vtcqVerify(minBundle(), undefined).raw, 364);
});

test("minimal valid bundle+cfg → not 364 (skeleton passes schema)", () => {
  assert.notEqual(vtcqVerify(minBundle(), minCfg()).raw, 364);
});
