// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC challenge verifier (producer side). The foreign producer verifies the receipt under the
// EXTERNAL verifier pin BEFORE running the detector, so it only ever answers a genuine Simurgh challenge.
import { verifyContent, fingerprint } from "../core/signatures.mjs";
import { domainDigest, identityDigest } from "../core/digests.mjs";
import { DOMAIN } from "../constants.mjs";

export function verifyChallengeReceipt(receipt, verifierIdentity, pin) {
  if (fingerprint(verifierIdentity.public_key_pem) !== pin.verifier_key_fingerprint) return false;
  if (verifierIdentity.identity_subject !== pin.verifier_identity_subject) return false;
  const vidDigest = identityDigest(verifierIdentity, "verifier");
  if (vidDigest !== pin.verifier_identity_digest) return false;
  if (receipt?.content?.verifier_identity_digest !== vidDigest) return false;
  if (domainDigest(DOMAIN.challenge_receipt, receipt.content) !== receipt.challenge_record_digest)
    return false;
  try {
    return verifyContent(
      verifierIdentity,
      DOMAIN.challenge_receipt,
      receipt.content,
      receipt.verifier_signature
    );
  } catch {
    return false;
  }
}
