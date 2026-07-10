// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC attestation trust check (raw 284). External pin FIRST, binding all three of
// {verifier_key_fingerprint, verifier_identity_subject, verifier_identity_digest}, then the attestation
// signature. Returns 284 or null; the reason is written to ctx.diag.trust_reason (uniform numeric contract).
import { CODES } from "../constants.mjs";
import { fingerprint, verifyContent } from "./signatures.mjs";
import { identityDigest } from "./digests.mjs";
import { DOMAIN } from "../constants.mjs";

const R = CODES.VFC_ATTESTATION_TRUST_OR_SIGNATURE_INVALID;

export function checkAttestationTrust(bundle, ctx) {
  const pin = ctx?.verifierPin;
  if (!pin) return ((ctx.diag.trust_reason = "external_pin_missing"), R);

  const vid = bundle.verifier_identity;
  const mismatch =
    fingerprint(vid.public_key_pem) !== pin.verifier_key_fingerprint ||
    vid.identity_subject !== pin.verifier_identity_subject ||
    identityDigest(vid, "verifier") !== pin.verifier_identity_digest;
  if (mismatch) return ((ctx.diag.trust_reason = "external_pin_mismatch"), R);

  const { attestation_signature, ...content } = bundle;
  let ok = false;
  try {
    ok = verifyContent(vid, DOMAIN.foreign_capture, content, attestation_signature);
  } catch {
    ok = false;
  }
  if (!ok) return ((ctx.diag.trust_reason = "attestation_signature_invalid"), R);
  return null;
}
