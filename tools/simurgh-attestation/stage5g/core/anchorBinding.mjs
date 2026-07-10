// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC anchor binding (raw 293/294/295). Pure: validates the kernel result + trust config, NOT
// the crypto (the kernel did that). 293 external trust config + root in allowlist; 294 kernel validated;
// 295 the DSSE cross-binding matches the bundle AND the anchor_evidence digest matches the transcript.
import { CODES } from "../constants.mjs";
import { domainDigest, identityDigest } from "./digests.mjs";
import { DOMAIN } from "../constants.mjs";

export function checkAnchorBinding(bundle, ctx) {
  if (!bundle.anchor_evidence) return null; // presence-driven
  const kr = ctx.kernelResult;

  // 293: external trust configuration present + the kernel's root fingerprint is allowlisted.
  if (!Array.isArray(ctx.trustRootAllowlist) || ctx.trustRootAllowlist.length === 0) {
    return CODES.VFC_EXTERNAL_TRUST_CONFIGURATION_INVALID;
  }
  if (!kr || !ctx.trustRootAllowlist.includes(kr.root_fingerprint)) {
    return CODES.VFC_EXTERNAL_TRUST_CONFIGURATION_INVALID;
  }

  // 294: the kernel validated the offline sigstore evidence (cert-signed DSSE + frozen integrated time).
  if (!kr.valid) return CODES.VFC_ANCHOR_EVIDENCE_INVALID;

  // 295: the DSSE statement cross-binds the bundle's actual producer/capture/challenge, and the
  // anchor_evidence digest matches the (producer-signed) transcript.
  const tc = bundle.producer_transcript.content;
  const s = kr.dsse_statement ?? {};
  const bindsBundle =
    s.producer_identity_digest === identityDigest(bundle.producer_identity, "producer") &&
    s.producer_key_fingerprint === bundle.producer_identity.key_fingerprint &&
    s.capture_digest === tc.capture_digest &&
    s.challenge_record_digest === tc.challenge_record_digest;
  if (!bindsBundle) return CODES.VFC_ANCHOR_BINDING_MISMATCH;
  if (domainDigest(DOMAIN.anchor_evidence, bundle.anchor_evidence) !== tc.anchor_evidence_digest) {
    return CODES.VFC_ANCHOR_BINDING_MISMATCH;
  }
  return null;
}
