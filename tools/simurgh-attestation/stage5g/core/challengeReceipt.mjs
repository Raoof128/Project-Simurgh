// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC challenge-receipt check (raw 285). Runs only when a receipt is present. Verifies the
// verifier signature over the receipt content, recomputes challenge_record_digest, and asserts the
// receipt's verifier_identity_digest matches the top-level verifier identity.
import { CODES } from "../constants.mjs";
import { verifyContent } from "./signatures.mjs";
import { domainDigest, identityDigest } from "./digests.mjs";
import { DOMAIN } from "../constants.mjs";

const R = CODES.VFC_CHALLENGE_RECEIPT_INVALID;

export function checkChallengeReceipt(bundle) {
  const receipt = bundle.challenge_receipt;
  if (!receipt) return null; // presence-driven: no receipt is handled by the rung lattice, not here
  const { content } = receipt;
  if (!content) return R;
  if (domainDigest(DOMAIN.challenge_receipt, content) !== receipt.challenge_record_digest) return R;
  if (content.verifier_identity_digest !== identityDigest(bundle.verifier_identity, "verifier"))
    return R;
  let ok = false;
  try {
    ok = verifyContent(
      bundle.verifier_identity,
      DOMAIN.challenge_receipt,
      content,
      receipt.verifier_signature
    );
  } catch {
    ok = false;
  }
  return ok ? null : R;
}
