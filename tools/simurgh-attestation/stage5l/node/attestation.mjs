// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q two-tier attestation. public = ceremony structure (never certifies projections);
// audit = binds the public digest + projection_root + computed state under the SAME context + policy_digest
// (audit ⟹ public). Both signed with Ed25519; deterministic keys ⇒ byte-identical.
import { artifactDigest } from "../core/digests.mjs";
import { computeProjections, computedState, rungFor } from "../core/projections.mjs";
import { makeCtx } from "../core/context.mjs";
import { DOMAINS } from "../constants.mjs";
import { signContent } from "./signatures.mjs";

export function buildPublicAttestation(bundle, cfg, facts, keys) {
  const ctx = makeCtx(bundle, cfg, facts);
  const state = computedState(ctx);
  const body = {
    schema_version: DOMAINS.attestationPublic,
    commitment_session_id: bundle.commitment_session_id,
    campaign_id: bundle.campaign_id,
    profile: ctx.committedProfile,
    computed_state: state,
    rung: rungFor(state),
    finality_substate: ctx.computedFinality ?? null,
    anchor_trust_domains: [...ctx.dedupedDomains].sort(),
    start_capability_root_digest:
      bundle.review_access_authorisation_receipt.start_capability_root_digest,
    policy_digest: cfg.policy_digest,
  };
  const sig = signContent(keys.gate.privatePem, DOMAINS.attestationPublic, body);
  return {
    body,
    digest: artifactDigest(body),
    sig,
    signer_fingerprint: keys.gate.id.key_fingerprint,
  };
}

export function buildAuditAttestation(bundle, cfg, facts, keys) {
  const ctx = makeCtx(bundle, cfg, facts);
  const pub = buildPublicAttestation(bundle, cfg, facts, keys);
  const proj = computeProjections(ctx);
  const body = {
    schema_version: DOMAINS.attestationAudit,
    public_digest: pub.digest, // audit ⟹ public
    commitment_session_id: bundle.commitment_session_id,
    projection_root: proj.projection_root,
    computed_finality: ctx.computedFinality ?? null,
    policy_digest: cfg.policy_digest, // same context + policy_digest
  };
  const sig = signContent(keys.tsaverifier.privatePem, DOMAINS.attestationAudit, body);
  return {
    body,
    digest: artifactDigest(body),
    sig,
    signer_fingerprint: keys.tsaverifier.id.key_fingerprint,
    public_attestation: pub,
  };
}
