// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — build a REAL Ed25519-signed vuc_bundle over a synthetic (raw-0) 5J bundle, which itself
// embeds a synthetic (raw-0) 5I bundle — ALL over the ONE lanePanelSpec section source, so
// U_commit = U_vpc = U_vrc by construction. Deterministic keys ⇒ deterministic evidence. The shipped
// 5J builder is used UNCHANGED (Review-v2 rule 9). Lane A is the TEST policy profile (rule 4).
import { buildSignedVrcBundle } from "../../stage5j/node/buildSignedBundle.mjs";
import { ratingLedgerRoot, contestLayerRoot } from "../../stage5j/core/roots.mjs";
import { buildPublicAttestation, attestationDigest } from "../../stage5j/core/attestation.mjs";
import { vrcLaneKeys } from "../../stage5j/node/laneKeys.mjs";
import { signContent } from "../core/signatures.mjs";
import { domainDigest, artifactDigest } from "../core/digests.mjs";
import { leafHash, merkleRoot, buildInclusion, encodeDigest } from "../core/merkle.mjs";
import { projectSection } from "../core/projection.mjs";
import { DOMAINS, POLICY_PROFILES } from "../constants.mjs";
import { vucLaneKeys } from "./laneKeys.mjs";

const H = (o) => artifactDigest(o);
const bySort = (a, b) => (a.leaf_id < b.leaf_id ? -1 : a.leaf_id > b.leaf_id ? 1 : 0);

export function buildSignedVucBundle(
  keys = vucLaneKeys(),
  { campaign_nonce = "vuc-lane-a-nonce" } = {}
) {
  // 1. Synthetic 5J bundle (+ its embedded synthetic 5I), all over lanePanelSpec's 8 sections.
  const { bundle: vrc_bundle, cfg: vrc_cfg } = buildSignedVrcBundle(keys.vrc ?? vrcLaneKeys());
  const vpc_bundle = vrc_cfg.vpc_bundle;
  const vpc_external_config = vrc_cfg.vpc_external_config;
  const att = vpc_bundle.attestation.content;
  const partition_digest = att.partition_digest;
  const producer = vpc_bundle.partition.content.producer_principal;
  const sections = vpc_bundle.partition.content.sections;

  // 2. Universe leaves = project EVERY partition section (covered union = all; producer-rated = all).
  const leaves = sections
    .map((s) => {
      const p = projectSection(s, partition_digest);
      return { ...p, leaf_digest: encodeDigest(leafHash(p)) };
    })
    .sort(bySort);
  const leafHashes = leaves.map((l) => leafHash(l));
  const universe_root = encodeDigest(merkleRoot(leafHashes));

  // 3. Policy — Lane A is the TEST profile (fixture order ticket forbidden under release).
  const policy = POLICY_PROFILES.test;
  const policy_digest = H(policy);

  const schema_version = "vuc.v1";
  const composition_profile = "vpc_and_vrc";
  const canonicalization_profile = "simurgh.vuc.merkle_set.v1";
  const tree_profile = "binary-promoted-odd";
  const hash_algorithm = "sha-256";

  const universe_commitment_digest = domainDigest(DOMAINS.commitment, {
    schema_version,
    composition_profile,
    producer_identity_digest: producer.producer_identity_digest,
    canonicalization_profile,
    tree_profile,
    hash_algorithm,
    leaf_count: leaves.length,
    universe_root,
  });

  // 4. Pre-anchor: commitment_session_id (NO ceremony_id yet — cycle-free).
  const commitment_session_id = H({
    purpose: "commitment_session",
    universe_commitment_digest,
    campaign_nonce,
  });
  const pcsContent = {
    universe_commitment_digest,
    producer_identity_digest: producer.producer_identity_digest,
    producer_key_fingerprint: producer.key_fingerprint,
    commitment_session_id,
    policy_profile_id: policy.profile_id,
    policy_digest,
  };
  const producer_commitment_statement = {
    ...pcsContent,
    sig: signContent(keys.producer.privatePem, DOMAINS.producer_commitment, pcsContent),
  };

  // 5. Ordering anchor (fixture-sequenced) — subject = universe_commitment_digest.
  const ordering_receipt_digest = H({
    purpose: "order_ticket",
    universe_commitment_digest,
    campaign_nonce,
  });
  const ordering_anchor = {
    anchor_type: "fixture_sequenced_order_ticket",
    independence_claim: "none_fixture_only",
    subject_digest: universe_commitment_digest,
    receipt_digest: ordering_receipt_digest,
    evidence: { commitment_session_id, sequencer: keys.sequencer.id.key_fingerprint },
  };
  // ceremony_id formed AFTER ordering exists.
  const ceremony_id = H({
    purpose: "ceremony",
    universe_commitment_digest,
    ordering_receipt_digest,
    campaign_nonce,
  });

  // 6. Reviewer principals (C(r)) + their covered sections + assignment digests.
  const cov = vpc_bundle.coverage_receipts.map((c) => ({
    fp: c.content.reviewer_principal.key_fingerprint,
    sections: [...c.content.evaluated_sections].sort(),
    receipt_digest: artifactDigest(c.content),
  }));
  const reviewerKeyByFp = (fp) =>
    keys.reviewers.find((r) => r.id.key_fingerprint === fp) ?? keys.reviewers[0];
  const assignmentDigest = (fp, secs) =>
    H({ purpose: "assignment", reviewer_principal_digest: fp, sections: secs });

  // 7. Sequencer challenge chain (one per reviewer + one producer), then start records.
  let seq = 0;
  let prev = "sha256:" + "0".repeat(64); // genesis prev-link
  const start_challenges = [];
  const review_start_records = [];
  const challengeFor = (role, principal_digest, obligation_digest) => {
    seq += 1;
    const content = {
      ceremony_id,
      universe_commitment_digest,
      ordering_receipt_digest,
      principal_role: role,
      principal_digest,
      obligation_digest,
      challenge_nonce: `n${seq}`,
      sequencer_sequence: seq,
      previous_sequencer_record_digest: prev,
    };
    const challenge = {
      ...content,
      sig: signContent(keys.sequencer.privatePem, DOMAINS.start_challenge, content),
    };
    const challenge_digest = domainDigest(DOMAINS.start_challenge, content);
    prev = challenge_digest;
    start_challenges.push(challenge);
    return challenge_digest;
  };

  for (const { fp, sections: secs } of cov) {
    const assignment_digest = assignmentDigest(fp, secs);
    const challenge_digest = challengeFor("reviewer", fp, assignment_digest);
    const rk = reviewerKeyByFp(fp);
    const content = {
      challenge_digest,
      universe_commitment_digest,
      reviewer_principal_digest: fp,
      assignment_digest,
    };
    review_start_records.push({
      ...content,
      sig: signContent(rk.privatePem, DOMAINS.review_start_record, content),
    });
  }

  // Producer rating start (obligation = the VRC rating_obligation_root).
  const producer_obligation_digest = vrc_bundle.rating_obligation_root;
  const producer_challenge_digest = challengeFor(
    "producer",
    producer.producer_identity_digest,
    producer_obligation_digest
  );
  const prsContent = {
    challenge_digest: producer_challenge_digest,
    universe_commitment_digest,
    producer_identity_digest: producer.producer_identity_digest,
    obligation_digest: producer_obligation_digest,
  };
  const producer_rating_start_record = {
    ...prsContent,
    sig: signContent(keys.producer.privatePem, DOMAINS.producer_rating_start, prsContent),
  };

  // 8. Execution bindings (full history) — reviewer + producer.
  const startRecordDigest = (r) =>
    domainDigest(DOMAINS.review_start_record, {
      challenge_digest: r.challenge_digest,
      universe_commitment_digest: r.universe_commitment_digest,
      reviewer_principal_digest: r.reviewer_principal_digest,
      assignment_digest: r.assignment_digest,
    });
  const review_execution_bindings = cov.map(({ fp, sections: secs, receipt_digest }, i) => {
    const rating_entry_digests = vrc_bundle.reviewer_ratings
      .filter((e) => e.content.reviewer_id === fp)
      .map((e) => e.entry_digest)
      .sort();
    const content = {
      ceremony_id,
      universe_commitment_digest,
      review_start_record_digest: startRecordDigest(review_start_records[i]),
      reviewer_principal_digest: fp,
      assignment_digest: assignmentDigest(fp, secs),
      coverage_receipt_digests: [receipt_digest],
      rating_entry_digests,
    };
    return {
      ...content,
      sig: signContent(reviewerKeyByFp(fp).privatePem, DOMAINS.review_execution_binding, content),
    };
  });

  // Producer execution binding — full producer rating history + the VRC public attestation digest.
  const vrc_public = buildPublicAttestation(
    vrc_bundle,
    0,
    keys.vrc?.verifier?.id ?? vrcLaneKeys().verifier.id
  );
  const vrc_public_attestation_digest = attestationDigest(vrc_public);
  const producer_rating_entry_digests = vrc_bundle.producer_ratings
    .map((p) => p.entry_digest)
    .sort();
  const pebContent = {
    ceremony_id,
    universe_commitment_digest,
    producer_rating_start_record_digest: domainDigest(DOMAINS.producer_rating_start, prsContent),
    producer_identity_digest: producer.producer_identity_digest,
    producer_rating_entry_digests,
    vrc_public_attestation_digest,
  };
  const producer_execution_binding = {
    ...pebContent,
    sig: signContent(keys.producer.privatePem, DOMAINS.producer_execution_binding, pebContent),
  };

  // 9. Inclusion proofs — one per committed leaf (index-fixed).
  const inclusion_proofs = leaves.map((l, idx) => ({
    leaf_id: l.leaf_id,
    ...buildInclusion(leafHashes, idx),
  }));

  // 10. Refs.
  const vpc_ref = {
    vpc_bundle_digest: artifactDigest(vpc_bundle),
    partition_digest,
    panel_subject_root: att.panel_subject_root,
    panel_evidence_root: att.panel_evidence_root,
  };
  const vrc_ref = {
    vrc_bundle_digest: artifactDigest(vrc_bundle),
    rating_obligation_root: vrc_bundle.rating_obligation_root,
    rating_ledger_root: ratingLedgerRoot(vrc_bundle),
    contest_layer_root: contestLayerRoot(vrc_bundle),
    public_attestation_digest: vrc_public_attestation_digest,
  };

  // 11. verification_context (carries policy_digest; roots recomputed by the verifier).
  const verification_context = {
    ordering_anchor_evidence_root: H({ ordering_anchor }),
    finality_anchor_evidence_root: null,
    pinned_anchor_keys_root: H({ sequencer: keys.sequencer.id.key_fingerprint }),
    pinned_checkpoints_root: H({ checkpoints: [] }),
    upstream_verification_facts_root: H({
      vpc: vpc_ref.vpc_bundle_digest,
      vrc: vrc_ref.vrc_bundle_digest,
    }),
    signature_facts_root: H({ verifier: keys.verifier.id.key_fingerprint }),
    policy_digest,
  };

  const universe_commitment = {
    canonicalization_profile,
    tree_profile,
    hash_algorithm,
    leaves,
    leaf_count: leaves.length,
    universe_root,
    universe_commitment_digest,
  };

  const bundle = {
    schema_version,
    composition_profile,
    producer_commitment_statement,
    universe_commitment,
    ordering_anchor,
    finality_anchor: null,
    claimed_finality_state: "pending",
    start_challenges,
    review_start_records,
    producer_rating_start_record,
    review_execution_bindings,
    producer_execution_binding,
    vpc_ref,
    vrc_ref,
    inclusion_proofs,
    verification_context,
    prior_universe_ref: null,
    omission_claims: [],
    external_registry_anchor: null,
    review_window_binding: null,
    campaign_composition_root: null,
  };

  const key_registry = {
    ...vrc_cfg.key_registry,
    [keys.sequencer.id.key_fingerprint]: keys.sequencer.id.public_key_pem,
    [keys.verifier.id.key_fingerprint]: keys.verifier.id.public_key_pem,
    [keys.producer.id.key_fingerprint]: keys.producer.id.public_key_pem,
    ...Object.fromEntries(keys.reviewers.map((r) => [r.id.key_fingerprint, r.id.public_key_pem])),
  };

  const cfg = {
    policy,
    verifier_key_fingerprint: keys.verifier.id.key_fingerprint,
    key_registry,
    vpc_bundle,
    vpc_external_config,
    vrc_bundle,
    vrc_external_config: vrc_cfg,
  };

  return { bundle, cfg, keys };
}
