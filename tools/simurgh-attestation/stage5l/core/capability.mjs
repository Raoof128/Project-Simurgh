// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q capability: 373 structural precedence (the start_capability_root is a function of the
// verified anchor set) and 376 child structure + uniqueness + ceremony-binding (replay across a different
// commitment_session_id / start_capability_root lands here).
import { R } from "./result.mjs";
import { startCapabilityRootDigest, releaseCapabilityDigest, releaseSlotId } from "./derive.mjs";

// 373 — start_capability_root_digest must recompute from {commitment_session_id, verified_anchor_set,
// gate fp, issuance_nonce}. Access is impossible without a capability derived from the verified anchors.
export function checkCapabilityDerivation(ctx) {
  const r = ctx.bundle.review_access_authorisation_receipt;
  const recomputed = startCapabilityRootDigest({
    commitment_session_id: ctx.bundle.commitment_session_id,
    verified_anchor_set_digest: ctx.verifiedAnchorSetDigest,
    gate_public_key_fingerprint: r.gate_public_key_fingerprint,
    issuance_nonce: r.issuance_nonce,
  });
  if (recomputed !== r.start_capability_root_digest)
    return R(373, "capability_not_derived_from_anchors");
  return null;
}

// 376 — child structure: each declared release's child recomputes from THIS ceremony's root (a replayed
// child from another ceremony fails here), and release_slot_id is unique.
export function checkCapabilityStructure(ctx) {
  const root = ctx.bundle.review_access_authorisation_receipt.start_capability_root_digest;
  const seenSlots = new Set();
  for (const rel of ctx.bundle.declared_releases) {
    const slot = releaseSlotId(rel.endpoint_id, rel.release_ordinal);
    if (seenSlots.has(slot)) return R(376, "duplicate_release_slot");
    seenSlots.add(slot);
    const cr = rel.consumption_record;
    if (!cr || typeof cr.release_capability_digest !== "string")
      return R(376, "child_capability_malformed");
    const recomputed = releaseCapabilityDigest({
      start_capability_root_digest: root,
      endpoint_id: rel.endpoint_id,
      release_ordinal: rel.release_ordinal,
      audience_digest: rel.audience_digest,
      release_payload_digest: cr.release_payload_digest,
    });
    if (recomputed !== cr.release_capability_digest) return R(376, "child_not_ceremony_bound"); // replay
  }
  return null;
}
