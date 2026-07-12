// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q pure derivations. ONE source of truth for the frozen digest constructions (spec §2),
// used by BOTH the ceremony builder and the verifier's recompute-and-compare checks.
import { hDs, artifactDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";

// A valid anchor's canonical record for the capability binding. Only the fields that identify the anchor
// and its proof — never the (untrusted) verifier_result. Sorted deterministically by the verifier.
export function anchorRecord(a) {
  if (a.anchor_type === "rfc3161_tsa") {
    return {
      anchor_type: "rfc3161_tsa",
      trust_domain: a.trust_domain,
      tsa_token_digest: a.tsa_token_digest,
    };
  }
  if (a.anchor_type === "bitcoin_ots") {
    return {
      anchor_type: "bitcoin_ots",
      trust_domain: a.trust_domain,
      ots_proof_digest: a.ots_proof_digest,
    };
  }
  return { anchor_type: a.anchor_type, trust_domain: a.trust_domain };
}

// verified_anchor_set_digest over the SORTED list of valid anchor records (P0-4). Core = [TSA];
// Quorum = [TSA, OTS]. Sorting by canonicalJson keeps it order-independent of the bundle's anchor order.
export function verifiedAnchorSetDigest(validAnchors) {
  const records = validAnchors
    .map(anchorRecord)
    .map((r) => JSON.stringify(r))
    .sort()
    .map((s) => JSON.parse(s));
  return hDs(DOMAINS.verifiedAnchorSet, records);
}

export function startCapabilityRootDigest({
  commitment_session_id,
  verified_anchor_set_digest,
  gate_public_key_fingerprint,
  issuance_nonce,
}) {
  return hDs(DOMAINS.startCapabilityRoot, {
    commitment_session_id,
    verified_anchor_set_digest,
    gate_public_key_fingerprint,
    issuance_nonce,
  });
}

export function releaseCapabilityDigest({
  start_capability_root_digest,
  endpoint_id,
  release_ordinal,
  audience_digest,
  release_payload_digest,
}) {
  return hDs(DOMAINS.releaseCapability, {
    start_capability_root_digest,
    endpoint_id,
    release_ordinal,
    audience_digest,
    release_payload_digest,
  });
}

export function releaseSlotId(endpoint_id, release_ordinal) {
  return hDs(DOMAINS.releaseSlot, { endpoint_id, release_ordinal });
}

export function gateIdentityPolicyDigest(
  gate_public_key_fingerprint,
  tsa_verifier_public_key_fingerprint
) {
  return hDs(DOMAINS.gateIdentity, {
    gate_public_key_fingerprint,
    tsa_verifier_public_key_fingerprint,
  });
}

// ceremony_id is a POST-ORDER display label only (cycle-free rule). Never fed back upstream.
export function ceremonyId({
  commitment_session_id,
  tsa_token_digest,
  ots_proof_digest,
  receipt_digest,
}) {
  return hDs(DOMAINS.ceremonyId, {
    commitment_session_id,
    tsa_token_digest: tsa_token_digest ?? null,
    ots_proof_digest: ots_proof_digest ?? null,
    receipt_digest,
  });
}

export { artifactDigest };
