// SPDX-License-Identifier: AGPL-3.0-or-later
// Domain-separated digests (4P spec §5, §6.5–§6.7). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, SCHEMAS, ENTROPY_BITS_BY_KIND } from "../constants.mjs";

const FOUR_P_DOMAINS = new Set(Object.values(DOMAINS));

export function domainDigest(domain, schema, value) {
  if (!FOUR_P_DOMAINS.has(domain)) throw new Error(`unknown_digest_domain: ${domain}`);
  return `sha256:${sha256Hex(canonicalJson({ domain, schema, value }))}`;
}

export function hopReceiptDigest(hop) {
  const { signature, ...unsigned } = hop;
  return domainDigest(DOMAINS.HOP_RECEIPT, SCHEMAS.HOP_RECEIPT, unsigned);
}

// Content-only digest for replay detection (MF2): excludes hop_index and
// previous_receipt_digest so the SAME relay/transform/input/output replayed at a
// different chain position collides here → raw 78 duplicated_hop.
export function hopReplayDigest(hop) {
  return domainDigest(DOMAINS.HOP_REPLAY, SCHEMAS.HOP_RECEIPT, {
    relay_identity_digest: hop.relay_identity_digest,
    transform_digest: hop.transform_digest,
    input_digest: hop.input_digest,
    output_digest: hop.output_digest,
  });
}

export function custodyPathDigest(hopDigests) {
  return domainDigest(DOMAINS.CUSTODY_PATH, SCHEMAS.HOP_RECEIPT, hopDigests);
}

export function windowedEvidenceCommitment({
  stage4n_window_anchor_digest,
  observed_evidence_digest,
}) {
  return domainDigest(DOMAINS.WINDOWED_EVIDENCE, SCHEMAS.CPC_SIGNAL, {
    stage4n_window_anchor_digest,
    observed_evidence_digest,
  });
}

export function surfaceBindingDigest({
  stage4o_manifest_digest,
  stage4o_toolset_digest,
  stage4o_manifest_epoch,
}) {
  return domainDigest(DOMAINS.SURFACE_BINDING, SCHEMAS.ATTESTATION, {
    stage4o_manifest_digest,
    stage4o_toolset_digest,
    stage4o_manifest_epoch,
  });
}

// THE entropy gate (4P spec §6.6): there is no code path to a public match token
// from below-floor evidence. Throws, never returns a digest. Takes the PUBLISHED
// windowed_evidence_commitment (MF1) so the verifier can recompute this digest
// without the private observed_evidence_digest.
export function custodyClassDigest(input) {
  const bits = ENTROPY_BITS_BY_KIND[input.evidence_kind];
  if (bits === undefined) throw new Error(`unknown_evidence_kind: ${input.evidence_kind}`);
  if (bits < input.entropy_floor_bits) throw new Error("entropy_floor_not_met");
  return domainDigest(DOMAINS.CUSTODY_CLASS, SCHEMAS.CPC_SIGNAL, {
    stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
    failure_class: input.failure_class,
    evidence_kind: input.evidence_kind,
    windowed_evidence_commitment: input.windowed_evidence_commitment,
    entropy_floor_bits: input.entropy_floor_bits,
    disclosure_budget_max_signals_per_window: input.disclosure_budget_max_signals_per_window,
  });
}
