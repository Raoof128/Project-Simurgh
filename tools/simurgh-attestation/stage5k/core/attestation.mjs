// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC split attestations. The PUBLIC object never certifies projections
// (projection_status:"not_verified", no projection_root); the AUDIT object binds the public one by digest
// and adds projection_root + computed_finality_state. audit valid ⟹ public valid, under the same
// verification_context_digest AND policy_digest. The signature is a fact (adapter Ed25519 + verifier pin).
import { artifactDigest } from "./digests.mjs";
import { computeProjections } from "./projections.mjs";
import { VUC_PUBLIC_CHECK_ORDER, VUC_AUDIT_CHECK_ORDER } from "../constants.mjs";

export const vucBundleDigest = (bundle) => artifactDigest(bundle);
export const attestationDigest = (att) => artifactDigest(att);
export const verificationContextDigest = (bundle) => artifactDigest(bundle.verification_context);

// Doc digests (non-claims / limitations / spec / lean) are pinned out of band; finalized when evidence is
// regenerated after the Lean core (Review-v2 rule 19). Provisional placeholders keep Lane A byte-stable.
const DEFAULT_DOC_DIGESTS = Object.freeze({
  non_claims_digest: "sha256:pending-non-claims",
  limitations_digest: "sha256:pending-limitations",
  spec_digest: "sha256:pending-spec",
  lean_source_digest: "sha256:pending-lean",
});

export function buildPublicAttestation(
  bundle,
  verdict_raw,
  verifier_identity,
  docDigests = DEFAULT_DOC_DIGESTS
) {
  return {
    object_type: "simurgh.vuc.public_attestation.v1",
    tier: "public",
    vuc_bundle_digest: vucBundleDigest(bundle),
    verification_context_digest: verificationContextDigest(bundle),
    universe_commitment_digest: bundle.universe_commitment.universe_commitment_digest,
    universe_root: bundle.universe_commitment.universe_root,
    commitment_session_id: bundle.producer_commitment_statement.commitment_session_id,
    ordering_evidence_state: "verified_immediate",
    claimed_finality_state: bundle.claimed_finality_state,
    vpc_bundle_digest: bundle.vpc_ref.vpc_bundle_digest,
    vrc_bundle_digest: bundle.vrc_ref?.vrc_bundle_digest ?? null,
    verdict_raw,
    public_checked_raw_codes: [...VUC_PUBLIC_CHECK_ORDER, 362],
    projection_status: "not_verified",
    policy_digest: bundle.verification_context.policy_digest,
    ...docDigests,
    verifier_key_fingerprint: verifier_identity.key_fingerprint,
  };
}

export function buildAuditAttestation(bundle, publicAtt, verdict_raw, verifier_identity, ctx) {
  return {
    object_type: "simurgh.vuc.audit_attestation.v1",
    tier: "audit",
    public_attestation_digest: attestationDigest(publicAtt),
    vuc_bundle_digest: vucBundleDigest(bundle),
    verification_context_digest: verificationContextDigest(bundle),
    projection_root: computeProjections(ctx).projection_root,
    computed_finality_state: ctx.facts.finalityState,
    policy_digest: bundle.verification_context.policy_digest,
    audit_checked_raw_codes: [...VUC_AUDIT_CHECK_ORDER, 362],
    verifier_key_fingerprint: verifier_identity.key_fingerprint,
  };
}

export function verifyAttestation(att, bundle, cfg, facts, { publicAtt, ctx } = {}) {
  if (att.verifier_key_fingerprint !== cfg.verifier_key_fingerprint)
    return { ok: false, reason: "verifier_not_pinned" };
  if (!facts.attestationSigValid?.[attestationDigest(att)])
    return { ok: false, reason: "attestation_signature_invalid" };

  if (att.tier === "public") {
    if (att.object_type !== "simurgh.vuc.public_attestation.v1")
      return { ok: false, reason: "bad_type" };
    if (att.projection_status !== "not_verified")
      return { ok: false, reason: "public_projection_status" };
    if ("projection_root" in att) return { ok: false, reason: "public_carries_projection_root" };
    if (att.vuc_bundle_digest !== vucBundleDigest(bundle))
      return { ok: false, reason: "bundle_digest_mismatch" };
    if (att.verification_context_digest !== verificationContextDigest(bundle))
      return { ok: false, reason: "context_digest_mismatch" };
    if (att.policy_digest !== bundle.verification_context.policy_digest)
      return { ok: false, reason: "policy_digest_mismatch" };
    return { ok: true };
  }

  // audit — binds public by digest, same context + policy (theorem: audit ⟹ public).
  if (att.object_type !== "simurgh.vuc.audit_attestation.v1")
    return { ok: false, reason: "bad_type" };
  if (!publicAtt || attestationDigest(publicAtt) !== att.public_attestation_digest)
    return { ok: false, reason: "public_attestation_unresolved" };
  const pub = verifyAttestation(publicAtt, bundle, cfg, facts);
  if (!pub.ok) return { ok: false, reason: `public_invalid:${pub.reason}` };
  if (att.verification_context_digest !== publicAtt.verification_context_digest)
    return { ok: false, reason: "audit_context_diverges" };
  if (att.policy_digest !== publicAtt.policy_digest)
    return { ok: false, reason: "audit_policy_diverges" };
  if (ctx && att.projection_root !== computeProjections(ctx).projection_root)
    return { ok: false, reason: "projection_root_mismatch" };
  return { ok: true };
}
