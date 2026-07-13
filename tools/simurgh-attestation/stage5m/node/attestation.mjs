// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — two-tier signed attestation. Public payload binds the structural verdict; audit adds the
// injected facts + the public payload digest (so an auditor recomputes the public tier from the audit one).
// Distinct domains per tier (G-L). Reuses the frozen 5L Ed25519 signer.
import { signContent, verifyContent } from "../../stage5l/node/signatures.mjs";
import { artifactDigest } from "../../stage5l/core/digests.mjs";
import { SIG5M } from "./sigDomains.mjs";

export function buildPublicAttestationPayload(bundle, verdict) {
  const seat = bundle.transparency_log_seat ?? null;
  return {
    stage: "5M-VTC-Quorum",
    schema_version: bundle.schema_version,
    envelope_schema: bundle.envelope_schema,
    quorum_profile: bundle.quorum_profile,
    quorum_rule: bundle.quorum_rule,
    commitment_session_id: bundle.commitment_session_id ?? null,
    pinned_roots_fpr: bundle.pinned_roots_fpr ?? null,
    transparency_log: seat
      ? {
          uuid: seat.uuid ?? null,
          global_log_index: seat.logIndex ?? null,
          shard_leaf_index: seat.inclusionProof?.logIndex ?? null,
          tree_size: seat.inclusionProof?.treeSize ?? null,
        }
      : null,
    raw: verdict.raw,
    detail: verdict.detail ?? verdict.reason ?? null,
    computed_ecology_state: verdict.computed_ecology_state ?? null,
    outcome_class: verdict.outcome_class ?? null,
    ecology_independence_number: verdict.ecology_independence_number ?? null, // plain number, never BigInt
    externally_anchored: verdict.externally_anchored ?? false,
  };
}

export function buildAuditAttestationPayload(bundle, verdict, facts) {
  const pub = buildPublicAttestationPayload(bundle, verdict);
  return { ...pub, injected_facts: facts ?? {}, public_attestation_digest: artifactDigest(pub) };
}

export function signAttestation(privatePem, tier, bundle, verdict, facts) {
  const payload =
    tier === "audit"
      ? buildAuditAttestationPayload(bundle, verdict, facts)
      : buildPublicAttestationPayload(bundle, verdict);
  const domain = tier === "audit" ? SIG5M.audit : SIG5M.public;
  return { tier, payload, sig: signContent(privatePem, domain, payload) };
}

export function verifyAttestation(identity, attestation) {
  const domain = attestation.tier === "audit" ? SIG5M.audit : SIG5M.public;
  try {
    return verifyContent(identity, domain, attestation.payload, attestation.sig);
  } catch {
    return false;
  }
}
