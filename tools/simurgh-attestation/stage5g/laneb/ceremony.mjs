// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC Lane B blind-recompute ceremony (SIDECAR). Process-2 independently recomputes the
// receipt digests + re-verifies the three bundle signatures + the proven rung, then signs a
// blind_recompute_receipt with the CEREMONY key; the EXTERNAL ceremony pin verifies it (a pin does not
// sign). Removing this receipt does NOT invalidate the principal attestation. This is process/key
// separation — NOT institution-independent verification.
import { domainDigest, identityDigest } from "../core/digests.mjs";
import { signContent, verifyContent, fingerprint } from "../core/signatures.mjs";
import { DOMAIN } from "../constants.mjs";
import { evaluateForeignCapture } from "../core/vfcCore.mjs";

const DOMAIN_LANEB = "simurgh.vfc.blind_recompute_receipt.v1\n";

function attestationContent(bundle) {
  const { attestation_signature, ...content } = bundle;
  return content;
}

// Recompute the five acyclic receipt digests from the committed public + audit artifacts.
export function recomputeReceiptContent(bundle, provenRung) {
  const t = bundle.producer_transcript;
  const content = {
    challenge_record_digest: bundle.challenge_receipt?.challenge_record_digest ?? null,
    capture_digest: domainDigest(DOMAIN.capture, bundle.capture),
    producer_transcript_digest: domainDigest(DOMAIN.producer_transcript, t.content),
    producer_identity_digest: identityDigest(bundle.producer_identity, "producer"),
    verifier_identity_digest: identityDigest(bundle.verifier_identity, "verifier"),
    attestation_content_digest: domainDigest(DOMAIN.foreign_capture, attestationContent(bundle)),
    recomputed_proven_rung: provenRung,
  };
  if (bundle.anchor_evidence !== undefined) {
    content.anchor_evidence_digest = domainDigest(DOMAIN.anchor_evidence, bundle.anchor_evidence);
  }
  return content;
}

export function signReceipt(ceremonyPriv, ceremonyPubPem, content) {
  return {
    schema: "simurgh.vfc.blind_recompute_receipt.v1",
    content,
    ceremony_public_key_pem: ceremonyPubPem,
    ceremony_key_fingerprint: fingerprint(ceremonyPubPem),
    signature: signContent(ceremonyPriv, DOMAIN_LANEB, content),
  };
}

// External ceremony pin (fingerprint) verifies the receipt; returns 0 on corroboration, 1 otherwise.
export function verifyReceipt(receipt, pinFingerprint) {
  if (fingerprint(receipt.ceremony_public_key_pem) !== receipt.ceremony_key_fingerprint) return 1;
  if (receipt.ceremony_key_fingerprint !== pinFingerprint) return 1;
  const id = {
    public_key_pem: receipt.ceremony_public_key_pem,
    key_fingerprint: receipt.ceremony_key_fingerprint,
  };
  let ok = false;
  try {
    ok = verifyContent(id, DOMAIN_LANEB, receipt.content, receipt.signature);
  } catch {
    ok = false;
  }
  return ok ? 0 : 1;
}

// The full sidecar ceremony over a committed bundle. `corroborated` means process-2's independent
// recompute agrees with the producer/verifier-signed values in the bundle.
export function runCeremony(bundle, { ceremonyPriv, ceremonyPubPem, pinFingerprint, ctx }) {
  const result = evaluateForeignCapture(bundle, { ...ctx, attestationOnly: true });
  const content = recomputeReceiptContent(bundle, result.proven_rung);
  const t = bundle.producer_transcript.content;
  const corroborated =
    content.capture_digest === t.capture_digest &&
    (bundle.anchor_evidence === undefined ||
      content.anchor_evidence_digest === t.anchor_evidence_digest) &&
    result.record_authentic === true;
  const receipt = signReceipt(ceremonyPriv, ceremonyPubPem, content);
  return { corroborated, receipt, receiptValid: verifyReceipt(receipt, pinFingerprint) === 0 };
}
