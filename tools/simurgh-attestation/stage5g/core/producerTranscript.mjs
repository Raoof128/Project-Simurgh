// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC producer attribution + signature (raw 286/287). 286: producer identity/key present, and
// the capture + transcript both bind identityDigest(producer) (closes the identity re-skinning gap; cells
// are covered because the whole ordered cell array is bound by capture_digest at 288). 287: producer
// signature over the transcript content verifies (fingerprint recomputed from the PEM first).
import { CODES } from "../constants.mjs";
import { verifyContent } from "./signatures.mjs";
import { identityDigest } from "./digests.mjs";
import { DOMAIN } from "../constants.mjs";

export function checkProducerTranscript(bundle) {
  const producer = bundle.producer_identity;
  const t = bundle.producer_transcript;
  if (!producer || !producer.public_key_pem || !producer.key_fingerprint || !t?.content) {
    return CODES.VFC_PRODUCER_ATTRIBUTION_MISSING;
  }
  const idDigest = identityDigest(producer, "producer");
  if (bundle.capture.producer_identity_ref !== idDigest)
    return CODES.VFC_PRODUCER_ATTRIBUTION_MISSING;
  if (t.content.producer_identity_digest !== idDigest)
    return CODES.VFC_PRODUCER_ATTRIBUTION_MISSING;
  if (t.content.producer_key_fingerprint !== producer.key_fingerprint)
    return CODES.VFC_PRODUCER_ATTRIBUTION_MISSING;

  let ok = false;
  try {
    ok = verifyContent(producer, DOMAIN.producer_transcript, t.content, t.producer_signature);
  } catch {
    ok = false;
  }
  return ok ? null : CODES.VFC_PRODUCER_SIGNATURE_INVALID;
}
