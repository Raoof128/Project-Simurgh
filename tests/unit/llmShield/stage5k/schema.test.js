// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — schema (348) + G13 belt + vucCore skeleton. Uses a HAND-BUILT minimal schema-valid
// bundle (the by-construction crux fixture arrives in Task 1.2); every negative arm is a structuredClone
// tamper.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkBundleSchema,
  checkConfigSchema,
} from "../../../../tools/simurgh-attestation/stage5k/core/schema.mjs";
import { vucVerify } from "../../../../tools/simurgh-attestation/stage5k/core/vucCore.mjs";

const D = "sha256:" + "a".repeat(64);
function minBundle() {
  return structuredClone({
    schema_version: "vuc.v1",
    composition_profile: "vpc_and_vrc",
    producer_commitment_statement: {
      universe_commitment_digest: D,
      producer_identity_digest: D,
      producer_key_fingerprint: D,
      commitment_session_id: D,
      policy_profile_id: "vuc-release-v1",
      policy_digest: D,
      sig: "sig",
    },
    universe_commitment: {
      canonicalization_profile: "simurgh.vuc.merkle_set.v1",
      tree_profile: "binary-promoted",
      hash_algorithm: "sha-256",
      leaves: [{ leaf_id: "1", leaf_type: "vpc_section", subject_digest: D, leaf_digest: D }],
      leaf_count: 1,
      universe_root: D,
      universe_commitment_digest: D,
    },
    ordering_anchor: {
      anchor_type: "fixture_sequenced_order_ticket",
      subject_digest: D,
      receipt_digest: D,
      evidence: {},
    },
    finality_anchor: null,
    claimed_finality_state: "pending",
    start_challenges: [],
    review_start_records: [],
    producer_rating_start_record: {
      challenge_digest: D,
      universe_commitment_digest: D,
      producer_identity_digest: D,
      obligation_digest: D,
      sig: "s",
    },
    review_execution_bindings: [],
    producer_execution_binding: {
      ceremony_id: D,
      universe_commitment_digest: D,
      producer_rating_start_record_digest: D,
      producer_identity_digest: D,
      producer_rating_entry_digests: [],
      vrc_public_attestation_digest: D,
      sig: "s",
    },
    vpc_ref: {
      vpc_bundle_digest: D,
      partition_digest: D,
      panel_subject_root: D,
      panel_evidence_root: D,
    },
    vrc_ref: {
      vrc_bundle_digest: D,
      rating_obligation_root: D,
      rating_ledger_root: D,
      contest_layer_root: D,
      public_attestation_digest: D,
    },
    inclusion_proofs: [],
    verification_context: {
      ordering_anchor_evidence_root: D,
      finality_anchor_evidence_root: null,
      pinned_anchor_keys_root: D,
      pinned_checkpoints_root: D,
      upstream_verification_facts_root: D,
      signature_facts_root: D,
      policy_digest: D,
    },
    prior_universe_ref: null,
    omission_claims: [],
    external_registry_anchor: null,
    review_window_binding: null,
    campaign_composition_root: null,
  });
}
function minCfg() {
  return structuredClone({
    key_registry: {},
    vpc_bundle: {},
    vpc_external_config: {},
    vrc_bundle: {},
    vrc_external_config: {},
  });
}

test("a minimal schema-valid bundle + cfg return null", () => {
  assert.equal(checkBundleSchema(minBundle()), null);
  assert.equal(checkConfigSchema(minCfg()), null);
});

const arm = (mut) => {
  const b = minBundle();
  mut(b);
  return checkBundleSchema(b);
};

test("structural tampers each hit 348", () => {
  assert.equal(arm((b) => delete b.universe_commitment).raw, 348);
  assert.equal(arm((b) => (b.universe_commitment.leaves = "x")).raw, 348);
  assert.equal(arm((b) => (b.review_window_binding = "not-a-union")).raw, 348);
  assert.equal(arm((b) => delete b.producer_commitment_statement.commitment_session_id).raw, 348);
  assert.equal(arm((b) => delete b.verification_context.policy_digest).raw, 348);
  assert.equal(arm((b) => (b.prior_universe_ref = { commitment_digest: D })).raw, 348); // missing ordering_receipt_digest
  assert.equal(arm((b) => (b.omission_claims = [{ claim_id: "c1" }])).raw, 348); // missing required fields
});

test("G13 adequacy-vocabulary belt fails closed at schema", () => {
  assert.equal(arm((b) => (b.annotations = { universe_adequate: true })).raw, 348);
  assert.equal(arm((b) => (b.annotations = { exhaustive: "yes" })).raw, 348);
  assert.equal(
    arm((b) => (b.annotations = { note: "fine" })),
    null
  ); // benign annotation OK
});

test("non-canonicalisable bundle returns 348, does not throw", () => {
  const b = minBundle();
  b.bad = 10n; // BigInt — canonicalJson throws; schema must catch → 348
  assert.equal(checkBundleSchema(b).raw, 348);
});

test("vucVerify skeleton: valid → raw 0; schema tamper → 348; cfg undefined → 363", () => {
  assert.equal(vucVerify(minBundle(), minCfg(), {}).raw, 0);
  const b = minBundle();
  delete b.ordering_anchor;
  assert.equal(vucVerify(b, minCfg(), {}).raw, 348);
  assert.equal(vucVerify(minBundle(), undefined, {}).raw, 363);
});
