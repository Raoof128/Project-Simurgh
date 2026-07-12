// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC split attestations (Task 1.14). Two domain-separated signed objects: the PUBLIC
// object never certifies projections (projection_status:"not_verified", no projection_root); the AUDIT
// object binds the public one by digest and adds projection_root. Theorem 9: audit valid ⟹ public
// valid. The signature is a fact (the node adapter does Ed25519 + the external verifier-key pin).
import { artifactDigest } from "./digests.mjs";
import { ratingLedgerRoot, contestLayerRoot } from "./roots.mjs";
import { projectionRoot, computeProjections } from "./projections.mjs";

const PUBLIC_RANGE = [332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 346];
const AUDIT_RANGE = [332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346];

export const vrcBundleDigest = (bundle) => artifactDigest(bundle);
export const attestationDigest = (att) => artifactDigest(att);

export function buildPublicAttestation(bundle, verdict_raw, verifier_identity) {
  return {
    object_type: "simurgh.vrc.public_attestation.v1",
    tier: "public",
    vpc_bundle_digest: bundle.vpc_ref.vpc_bundle_digest,
    vrc_bundle_digest: vrcBundleDigest(bundle),
    rating_obligation_root: bundle.rating_obligation_root,
    rating_ledger_root: ratingLedgerRoot(bundle),
    contest_layer_root: contestLayerRoot(bundle),
    verdict_raw,
    checked_raw_range: PUBLIC_RANGE,
    projection_status: "not_verified",
    verifier_identity,
  };
}

export function buildAuditAttestation(bundle, publicAtt, verdict_raw, verifier_identity) {
  return {
    object_type: "simurgh.vrc.audit_attestation.v1",
    tier: "audit",
    public_attestation_digest: attestationDigest(publicAtt),
    vrc_bundle_digest: vrcBundleDigest(bundle),
    projection_root: projectionRoot(computeProjections(bundle)),
    verdict_raw,
    checked_raw_range: AUDIT_RANGE,
    verifier_identity,
  };
}

export function verifyAttestation(att, bundle, cfg, facts, { publicAtt } = {}) {
  if (att.verifier_identity?.key_fingerprint !== cfg.verifier_key_pin.key_fingerprint) {
    return { ok: false, reason: "verifier_not_pinned" };
  }
  if (!facts.attestationSigValid?.[attestationDigest(att)]) {
    return { ok: false, reason: "attestation_signature_invalid" };
  }

  if (att.tier === "public") {
    if (att.object_type !== "simurgh.vrc.public_attestation.v1")
      return { ok: false, reason: "bad_type" };
    if (att.projection_status !== "not_verified")
      return { ok: false, reason: "public_projection_status" };
    if ("projection_root" in att) return { ok: false, reason: "public_carries_projection_root" };
    if (att.rating_ledger_root !== ratingLedgerRoot(bundle))
      return { ok: false, reason: "ledger_root_mismatch" };
    if (att.contest_layer_root !== contestLayerRoot(bundle))
      return { ok: false, reason: "contest_root_mismatch" };
    return { ok: true };
  }

  // audit
  if (att.object_type !== "simurgh.vrc.audit_attestation.v1")
    return { ok: false, reason: "bad_type" };
  if (!publicAtt || attestationDigest(publicAtt) !== att.public_attestation_digest) {
    return { ok: false, reason: "public_attestation_unresolved" };
  }
  const pub = verifyAttestation(publicAtt, bundle, cfg, facts); // theorem 9: audit ⟹ public
  if (!pub.ok) return { ok: false, reason: `public_invalid:${pub.reason}` };
  if (att.projection_root !== projectionRoot(computeProjections(bundle))) {
    return { ok: false, reason: "projection_root_mismatch" };
  }
  return { ok: true };
}
