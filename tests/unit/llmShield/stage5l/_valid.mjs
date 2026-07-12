// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — deterministic valid-bundle fixture for pure-core TDD (stub facts; no real crypto).
// Carries policy CONTENTS + their digests so the binding check (365) can recompute-and-compare.
import {
  artifactDigest,
  commitmentSessionId,
} from "../../../../tools/simurgh-attestation/stage5l/core/digests.mjs";
import {
  verifiedAnchorSetDigest,
  startCapabilityRootDigest,
  releaseCapabilityDigest,
  gateIdentityPolicyDigest,
  ceremonyId,
} from "../../../../tools/simurgh-attestation/stage5l/core/derive.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5l/constants.mjs";

const GATE_FP = "fp:gate";
const TSA_VERIFIER_FP = "fp:tsaverifier";
const NONCE = "issuance-nonce-1";

// Build a valid VTC-Q bundle for a profile ("vtc_core" | "vtc_quorum") + finality ("pending"|"confirmed").
export function validBundle({
  profile = "vtc_core",
  finality = "confirmed",
  reviewWindow,
  trustDomainRegistry,
} = {}) {
  const campaign_id = "vtcq-campaign-1";
  const vuc_root = "sha256:vuc-root";
  const tsa_token_digest = "sha256:tsa-token";
  const ots_proof_digest = "sha256:ots-proof";

  const review_window = reviewWindow ?? {
    window_open_not_before: 2000,
    window_close_after: 9000,
    required_anchor_profile: profile,
  };
  const anchor_policy = {
    network: "bitcoin",
    min_confirmations: 6,
    accepted_checkpoint_witness_keys: ["fp:witness"],
  };
  const quorum_policy = {
    profile,
    threshold: profile === "vtc_quorum" ? 2 : 1,
    required_confirmed_publication: profile === "vtc_quorum",
  };
  const withOts = profile === "vtc_quorum";
  const trust_domain_registry = trustDomainRegistry ?? (withOts ? ["tsa-x", "ots-y"] : ["tsa-x"]);
  const declared_release_surface = [
    { endpoint_id: "reviewer-a", release_ordinal: 0, audience_digest: "sha256:aud-a" },
  ];

  const gate_identity_policy_digest = gateIdentityPolicyDigest(GATE_FP, TSA_VERIFIER_FP);
  const ceremony_contract = {
    review_window_policy_digest: artifactDigest(review_window),
    anchor_policy_digest: artifactDigest(anchor_policy),
    quorum_policy_digest: artifactDigest(quorum_policy),
    trust_domain_registry_digest: artifactDigest(trust_domain_registry),
    declared_release_surface_digest: artifactDigest(declared_release_surface),
    gate_identity_policy_digest,
  };
  const commitmentPayload = {
    ...ceremony_contract,
    schema_version: DOMAINS.bundle,
    campaign_id,
    vuc_root,
  };
  const commitment_session_id = commitmentSessionId(commitmentPayload);

  const anchors = [
    { anchor_type: "rfc3161_tsa", trust_domain: "tsa-x", tsa_token_digest, verifier_result: null },
  ];
  if (withOts) {
    // A genuinely PENDING anchor has no confirming checkpoint yet; a CONFIRMED one carries the witnessed
    // checkpoint (36 confirmations >= min_confirmations 6).
    const checkpoint_evidence =
      finality === "confirmed"
        ? {
            block_hash: "00blk",
            block_height: 957665,
            block_merkle_root: "mroot",
            observed_tip_height: 957700,
            observed_at_epoch_s: 1783836829,
            witness_key_fingerprint: "fp:witness",
            signature: "sig:witness",
          }
        : null;
    anchors.push({
      anchor_type: "bitcoin_ots",
      trust_domain: "ots-y",
      ots_proof_digest,
      declared_finality: finality, // "pending" | "confirmed" — the CLAIM (380 compares vs computed)
      checkpoint_evidence,
      verifier_result: null,
    });
  }
  const validAnchors = anchors; // all valid in the fixture
  const verified_anchor_set_digest = verifiedAnchorSetDigest(validAnchors);
  const checkpoint_evidence_digest =
    withOts && anchors[1].checkpoint_evidence
      ? artifactDigest(anchors[1].checkpoint_evidence)
      : null;

  const start_capability_root_digest = startCapabilityRootDigest({
    commitment_session_id,
    verified_anchor_set_digest,
    gate_public_key_fingerprint: GATE_FP,
    issuance_nonce: NONCE,
  });

  const receiptBinds = {
    commitment_session_id,
    verified_anchor_set_digest,
    checkpoint_evidence_digest,
    quorum_policy_digest: ceremony_contract.quorum_policy_digest,
    declared_release_surface_digest: ceremony_contract.declared_release_surface_digest,
    start_capability_root_digest,
  };
  const review_access_authorisation_receipt = {
    binds: receiptBinds,
    start_capability_root_digest,
    gate_public_key_fingerprint: GATE_FP,
    issuance_nonce: NONCE,
    sig: "sig:gate",
  };
  const receipt_digest = artifactDigest(review_access_authorisation_receipt);

  const declared_releases = declared_release_surface.map((s) => {
    const release_payload_digest = "sha256:payload-" + s.endpoint_id;
    const release_capability_digest = releaseCapabilityDigest({
      start_capability_root_digest,
      endpoint_id: s.endpoint_id,
      release_ordinal: s.release_ordinal,
      audience_digest: s.audience_digest,
      release_payload_digest,
    });
    return {
      endpoint_id: s.endpoint_id,
      release_ordinal: s.release_ordinal,
      audience_digest: s.audience_digest,
      consumption_record: { release_capability_digest, release_payload_digest, sig: "sig:release" },
    };
  });

  const bundle = {
    schema_version: DOMAINS.bundle,
    campaign_id,
    commitment_session_id,
    ceremony_id: ceremonyId({
      commitment_session_id,
      tsa_token_digest,
      ots_proof_digest: withOts ? ots_proof_digest : null,
      receipt_digest,
    }),
    vuc: { universe_commitment_digest: vuc_root },
    ceremony_contract,
    review_window,
    anchor_policy,
    quorum_policy,
    trust_domain_registry,
    declared_release_surface,
    anchors,
    review_access_authorisation_receipt,
    declared_releases,
    projections: null,
    reserved_slots: { campaign_composition_root: null },
    signatures: { sequencer: "sig:seq", gate: "sig:gate", tsa_verifier: "sig:tsaver" },
  };

  const cfg = {
    schema_version: DOMAINS.config,
    profile,
    policy_digest: "sha256:policy",
    accuracy_policy_s: 2,
    tsa_verifier_public_key_fingerprint: TSA_VERIFIER_FP, // pinned out-of-band; 375 recomputes gate identity
  };

  const commitment_digest_hex = commitment_session_id.slice("sha256:".length);
  const facts = {
    vucVerified: true,
    gateSigValid: true,
    receiptSigValid: true,
    releaseSigValid: { "reviewer-a:0": true },
    tsaCrypto: {
      [tsa_token_digest]: {
        parseOk: true,
        canonicalDer: true,
        genTime_s: 1000,
        accuracy_s: 1,
        policyOID: "1.2.3",
        certValidAtGenTime: true,
        ltvOk: true,
        essV2Ok: true,
        cryptoResult: "valid",
        messageImprintHex: commitment_digest_hex,
        attestation: { token_raw_digest: tsa_token_digest },
      },
    },
    otsState: withOts ? { [ots_proof_digest]: "verified_immediate" } : {},
    checkpointWitnessSigValid: withOts ? { [ots_proof_digest]: true } : {},
    otsLeafHex: withOts ? { [ots_proof_digest]: commitment_digest_hex } : {},
    tsaVerifierFingerprint: TSA_VERIFIER_FP,
  };

  return { bundle, cfg, facts, GATE_FP, TSA_VERIFIER_FP, NONCE };
}
