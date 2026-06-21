// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic, source-bound evidence digest for Stage 3S. No I/O — the caller loads
// source files and passes their content/digests. This digest is the ONLY source of truth;
// nothing the model emits ever enters it.
import { sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

export const EVIDENCE_DIGEST_SCHEMA = "simurgh.defensive_narrative.evidence_digest.v1";

// source_inputs[].digest is a FILE-BYTE sha256 (not a canonical-object digest).
export function digestSourceInput(kind, path, content) {
  return { kind, path, digest: sha256Hex(content) };
}

export function buildEvidenceDigest({
  sessionHash,
  sourceInputs,
  audit_chain_valid,
  daemon_proof_counts,
  gateway,
  vca,
  privacy,
}) {
  return {
    type: EVIDENCE_DIGEST_SCHEMA,
    session_hash: sessionHash,
    source_inputs: (sourceInputs ?? []).map((s) => ({
      kind: s.kind,
      path: s.path,
      digest: s.digest,
    })),
    audit_chain_valid: audit_chain_valid === true,
    daemon_proof_counts: {
      valid: daemon_proof_counts?.valid ?? 0,
      missing: daemon_proof_counts?.missing ?? 0,
      replayed: daemon_proof_counts?.replayed ?? 0,
    },
    gateway: {
      fallback_used: gateway?.fallback_used === true,
      fallback_bypass_successes: gateway?.fallback_bypass_successes ?? 0,
      output_firewall_blocks: gateway?.output_firewall_blocks ?? 0,
    },
    vca: {
      attestation_verified: vca?.attestation_verified === true,
      claim_conflicts: vca?.claim_conflicts ?? 0,
    },
    privacy: {
      raw_pixels_captured: privacy?.raw_pixels_captured === true,
      raw_window_titles_captured: privacy?.raw_window_titles_captured === true,
      typed_content_captured: privacy?.typed_content_captured === true,
    },
  };
}

export function resolveDigestRef(digest, dottedRef) {
  if (typeof dottedRef !== "string") return { found: false, value: undefined };
  let cur = digest;
  for (const part of dottedRef.split(".")) {
    if (cur && typeof cur === "object" && Object.hasOwn(cur, part)) cur = cur[part];
    else return { found: false, value: undefined };
  }
  return { found: true, value: cur };
}
