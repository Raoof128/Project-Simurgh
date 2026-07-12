// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q signed ceremony builder. Produces a REAL Ed25519-signed bundle (deterministic keys ⇒
// byte-identical). The pure-core facts are re-derived from these signatures by the node adapter — the
// bundle carries no booleans. For Lane A the TSA crypto result is a signed tsa_crypto_attestation (the
// tsa-verifier adapter's attestation; Lane B is where a real OpenSSL RFC-3161 run produces it).
import { artifactDigest, commitmentSessionId, commitmentDigestBytes } from "../core/digests.mjs";
import {
  verifiedAnchorSetDigest,
  startCapabilityRootDigest,
  releaseCapabilityDigest,
  gateIdentityPolicyDigest,
  ceremonyId,
} from "../core/derive.mjs";
import { computeProjections } from "../core/projections.mjs";
import { makeCtx } from "../core/context.mjs";
import { DOMAINS } from "../constants.mjs";
import { SIG } from "./sigDomains.mjs";
import { signContent } from "./signatures.mjs";
import { vtcqLaneKeys } from "./laneKeys.mjs";

export function buildSignedVtcqBundle(
  keys = vtcqLaneKeys(),
  { profile = "vtc_quorum", finality = "confirmed" } = {}
) {
  const gateFp = keys.gate.id.key_fingerprint;
  const tsaVerFp = keys.tsaverifier.id.key_fingerprint;
  const NONCE = "vtcq-issuance-nonce";
  const campaign_id = "vtcq-lane-a";
  const vuc_root = "sha256:vuc-root-lane-a";
  const tsa_token_digest = "sha256:tsa-token-lane-a";
  const ots_proof_digest = "sha256:ots-proof-lane-a";
  const withOts = profile === "vtc_quorum";

  const review_window = {
    window_open_not_before: 2000,
    window_close_after: 9000,
    required_anchor_profile: profile,
  };
  const anchor_policy = {
    network: "bitcoin",
    min_confirmations: 6,
    accepted_checkpoint_witness_keys: [tsaVerFp],
  };
  const quorum_policy = {
    profile,
    threshold: withOts ? 2 : 1,
    required_confirmed_publication: withOts,
  };
  const trust_domain_registry = withOts ? ["tsa-x", "ots-y"] : ["tsa-x"];
  const declared_release_surface = [
    { endpoint_id: "reviewer-a", release_ordinal: 0, audience_digest: "sha256:aud-a" },
  ];

  const ceremony_contract = {
    review_window_policy_digest: artifactDigest(review_window),
    anchor_policy_digest: artifactDigest(anchor_policy),
    quorum_policy_digest: artifactDigest(quorum_policy),
    trust_domain_registry_digest: artifactDigest(trust_domain_registry),
    declared_release_surface_digest: artifactDigest(declared_release_surface),
    gate_identity_policy_digest: gateIdentityPolicyDigest(gateFp, tsaVerFp),
  };
  const commitmentPayload = {
    ...ceremony_contract,
    schema_version: DOMAINS.bundle,
    campaign_id,
    vuc_root,
  };
  const commitment_session_id = commitmentSessionId(commitmentPayload);
  const commitment_digest_hex = commitmentDigestBytes(commitmentPayload).toString("hex");

  // TSA crypto attestation, signed by the tsa-verifier (adapter re-verifies + lifts to facts).
  const tsaCryptoBody = {
    token_raw_digest: tsa_token_digest,
    genTime_s: 1000,
    accuracy_s: 1,
    policyOID: "1.2.3",
    certValidAtGenTime: true,
    ltvOk: true,
    essV2Ok: true,
    cryptoResult: "valid",
    messageImprintHex: commitment_digest_hex,
  };
  const anchors = [
    {
      anchor_type: "rfc3161_tsa",
      trust_domain: "tsa-x",
      tsa_token_digest,
      tsa_crypto_attestation: {
        ...tsaCryptoBody,
        sig: signContent(keys.tsaverifier.privatePem, SIG.tsaCrypto, tsaCryptoBody),
      },
      verifier_result: null,
    },
  ];
  if (withOts) {
    const checkpointBody =
      finality === "confirmed"
        ? {
            block_hash: "00blk",
            block_height: 957665,
            block_merkle_root: "mroot",
            observed_tip_height: 957700,
            observed_at_epoch_s: 1783836829,
            witness_key_fingerprint: tsaVerFp,
            ots_leaf_hex: commitment_digest_hex,
          }
        : null;
    anchors.push({
      anchor_type: "bitcoin_ots",
      trust_domain: "ots-y",
      ots_proof_digest,
      declared_finality: finality,
      checkpoint_evidence: checkpointBody
        ? {
            ...checkpointBody,
            signature: signContent(keys.tsaverifier.privatePem, SIG.checkpoint, checkpointBody),
          }
        : null,
      ots_leaf_hex: commitment_digest_hex,
      verifier_result: null,
    });
  }

  const verified_anchor_set_digest = verifiedAnchorSetDigest(anchors);
  const checkpoint_evidence_digest =
    withOts && anchors[1].checkpoint_evidence
      ? artifactDigest(anchors[1].checkpoint_evidence)
      : null;
  const start_capability_root_digest = startCapabilityRootDigest({
    commitment_session_id,
    verified_anchor_set_digest,
    gate_public_key_fingerprint: gateFp,
    issuance_nonce: NONCE,
  });

  const binds = {
    commitment_session_id,
    verified_anchor_set_digest,
    checkpoint_evidence_digest,
    quorum_policy_digest: ceremony_contract.quorum_policy_digest,
    declared_release_surface_digest: ceremony_contract.declared_release_surface_digest,
    start_capability_root_digest,
  };
  const receiptBody = {
    binds,
    start_capability_root_digest,
    gate_public_key_fingerprint: gateFp,
    issuance_nonce: NONCE,
  };
  const review_access_authorisation_receipt = {
    ...receiptBody,
    sig: signContent(keys.gate.privatePem, SIG.receipt, receiptBody),
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
    const crBody = {
      release_capability_digest,
      release_payload_digest,
      endpoint_id: s.endpoint_id,
      release_ordinal: s.release_ordinal,
    };
    return {
      endpoint_id: s.endpoint_id,
      release_ordinal: s.release_ordinal,
      audience_digest: s.audience_digest,
      consumption_record: {
        ...crBody,
        sig: signContent(keys.gate.privatePem, SIG.release, crBody),
      },
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
    signatures: {
      sequencer: signContent(keys.sequencer.privatePem, "simurgh.vtcq.seq.v1", {
        commitment_session_id,
      }),
    },
  };

  const cfg = {
    schema_version: DOMAINS.config,
    profile,
    policy_digest: "sha256:policy-lane-a",
    accuracy_policy_s: 2,
    tsa_verifier_public_key_fingerprint: tsaVerFp,
  };

  return { bundle, cfg, keys };
}

// Attach the (audit-tier) projections computed from adapter facts — done by the evidence builder after
// the adapter derives facts, so projections match the recompute.
export function attachProjections(bundle, cfg, facts) {
  bundle.projections = computeProjections(makeCtx(bundle, cfg, facts));
  return bundle;
}
