// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC challenge-binding check (raw 290/291). Runs only when the transcript carries a
// challenge_record_digest (presence-driven; absence leaves proven rung 0, handled by the lattice).
// 290 = binding present but incomplete; 291 = present but mismatched against the receipt / committed
// artifacts recomputed from ctx.artifacts (NOT the bundle's copied _ref digests).
import { CODES } from "../constants.mjs";
import { artifactDigest } from "./digests.mjs";

export function checkChallengeBinding(bundle, ctx) {
  const bound = bundle.producer_transcript.content.challenge_record_digest;
  if (bound === undefined) return null; // no binding claimed → rung stays 0, not this check's job

  const receipt = bundle.challenge_receipt;
  if (!receipt) return CODES.VFC_CHALLENGE_UNBOUND; // binding present but no receipt = incomplete (290)
  const rc = receipt.content;
  for (const f of [
    "panel_plan_digest",
    "corpus_digest",
    "detector_snapshot_digest",
    "verifier_identity_digest",
  ]) {
    if (rc?.[f] === undefined) return CODES.VFC_CHALLENGE_UNBOUND; // required committed field missing (290)
  }

  if (bound !== receipt.challenge_record_digest) return CODES.VFC_CHALLENGE_MISMATCH;
  const a = ctx.artifacts;
  if (artifactDigest(a.panelPlan) !== rc.panel_plan_digest) return CODES.VFC_CHALLENGE_MISMATCH;
  if (artifactDigest(a.corpus) !== rc.corpus_digest) return CODES.VFC_CHALLENGE_MISMATCH;
  if (artifactDigest(a.detectorSnapshot) !== rc.detector_snapshot_digest)
    return CODES.VFC_CHALLENGE_MISMATCH;
  return null;
}
