// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC capture-digest check (raw 288). The signed transcript's capture_digest must equal the
// recomputed digest of the WHOLE capture object.
import { CODES } from "../constants.mjs";
import { domainDigest } from "./digests.mjs";
import { DOMAIN } from "../constants.mjs";

export function checkCaptureDigest(bundle) {
  const recomputed = domainDigest(DOMAIN.capture, bundle.capture);
  return recomputed === bundle.producer_transcript.content.capture_digest
    ? null
    : CODES.VFC_CAPTURE_DIGEST_MISMATCH;
}
