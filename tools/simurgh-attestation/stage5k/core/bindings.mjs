// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 355 execution bindings (full history). Each reviewer binding chains to its start and carries
// the EXACT coverage-receipt + rating-entry sets; the producer binding carries FULL producer history.
import { R } from "./result.mjs";
import { domainDigest, artifactDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";

const assignmentDigest = (fp, secs) =>
  artifactDigest({ purpose: "assignment", reviewer_principal_digest: fp, sections: secs });
const noSig = (o) => {
  const c = { ...o };
  delete c.sig;
  return c;
};
const setEq = (a, b) =>
  a.length === b.length && [...a].sort().join(" ") === [...b].sort().join(" ");

export function checkExecutionBindings(ctx) {
  const { bundle, cfg, facts } = ctx;
  const vpc = cfg.vpc_bundle;
  const vrc = cfg.vrc_bundle;

  const receiptDigestByFp = new Map(
    vpc.coverage_receipts.map((c) => [
      c.content.reviewer_principal.key_fingerprint,
      artifactDigest(c.content),
    ])
  );
  const ratingsByFp = new Map();
  for (const e of vrc.reviewer_ratings) {
    const fp = e.content.reviewer_id;
    if (!ratingsByFp.has(fp)) ratingsByFp.set(fp, []);
    ratingsByFp.get(fp).push(e.entry_digest);
  }

  const startByFp = new Map(
    bundle.review_start_records.map((r) => [r.reviewer_principal_digest, r])
  );
  const startRecordDigest = (r) =>
    domainDigest(DOMAINS.review_start_record, {
      challenge_digest: r.challenge_digest,
      universe_commitment_digest: r.universe_commitment_digest,
      reviewer_principal_digest: r.reviewer_principal_digest,
      assignment_digest: r.assignment_digest,
    });

  const seen = new Set();
  for (const b of bundle.review_execution_bindings) {
    const fp = b.reviewer_principal_digest;
    if (seen.has(fp)) return R(355, "duplicate_reviewer_binding", { fp });
    seen.add(fp);
    const start = startByFp.get(fp);
    if (!start) return R(355, "binding_without_start", { fp });
    if (b.review_start_record_digest !== startRecordDigest(start))
      return R(355, "binding_start_mismatch", { fp });
    if (b.assignment_digest !== assignmentDigest(fp, ctx.coverageByFp.get(fp) ?? []))
      return R(355, "binding_assignment_mismatch", { fp });
    if (!setEq(b.coverage_receipt_digests, [receiptDigestByFp.get(fp)]))
      return R(355, "coverage_receipt_set_mismatch", { fp });
    if (!setEq(b.rating_entry_digests, ratingsByFp.get(fp) ?? []))
      return R(355, "rating_entry_set_mismatch", { fp });
    const bd = domainDigest(DOMAINS.review_execution_binding, noSig(b));
    if (!facts.bindingSigValid?.[bd]) return R(355, "reviewer_binding_sig_invalid", { fp });
  }
  for (const fp of ctx.reviewerFps)
    if (!seen.has(fp)) return R(355, "missing_reviewer_binding", { fp });

  const peb = bundle.producer_execution_binding;
  const producerRatings = vrc.producer_ratings.map((p) => p.entry_digest);
  if (!setEq(peb.producer_rating_entry_digests, producerRatings))
    return R(355, "producer_history_mismatch");
  if (peb.vrc_public_attestation_digest !== bundle.vrc_ref?.public_attestation_digest)
    return R(355, "producer_binding_attestation_mismatch");
  if (!facts.producerBindingSigValid) return R(355, "producer_binding_sig_invalid");
  return null;
}
