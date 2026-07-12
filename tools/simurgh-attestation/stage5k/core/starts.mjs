// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 353 start census (reviewer (principal,assignment) pairs = C(r), + producer rating start),
// 354 No Post-Hoc Commitment Record (every start bound to verified ordering via a valid sequencer chain).
import { R } from "./result.mjs";
import { domainDigest, artifactDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";

const assignmentDigest = (fp, secs) =>
  artifactDigest({ purpose: "assignment", reviewer_principal_digest: fp, sections: secs });

export function checkStartCensus(ctx) {
  const { bundle, facts } = ctx;
  // Required (reviewer_principal_digest, assignment_digest) pairs from the verified coverage relation.
  const required = new Map(); // fp -> assignment_digest
  for (const fp of ctx.reviewerFps)
    required.set(fp, assignmentDigest(fp, ctx.coverageByFp.get(fp)));

  const seen = new Set();
  for (const r of bundle.review_start_records) {
    const fp = r.reviewer_principal_digest;
    if (!required.has(fp)) return R(353, "orphan_reviewer_start", { fp });
    if (seen.has(fp)) return R(353, "duplicate_reviewer_start", { fp });
    seen.add(fp);
    if (r.assignment_digest !== required.get(fp)) return R(353, "assignment_mismatch", { fp });
    if (!facts.startSigValid?.[r.challenge_digest])
      return R(353, "reviewer_start_sig_invalid", { fp });
  }
  for (const fp of required.keys())
    if (!seen.has(fp)) return R(353, "missing_reviewer_start", { fp });

  // producer rating start present + signed.
  const prs = bundle.producer_rating_start_record;
  if (!prs || prs.producer_identity_digest !== ctx.producerIdentityDigest)
    return R(353, "missing_producer_rating_start");
  if (!facts.producerStartSigValid) return R(353, "producer_start_sig_invalid");
  return null;
}

export function checkPrecedence(ctx) {
  const { bundle, facts } = ctx;
  const commit = bundle.universe_commitment.universe_commitment_digest;
  const receipt = bundle.ordering_anchor?.receipt_digest;
  const nonce = bundle.ordering_anchor?.evidence?.campaign_nonce;
  const ceremonyRecompute = artifactDigest({
    purpose: "ceremony",
    universe_commitment_digest: commit,
    ordering_receipt_digest: receipt,
    campaign_nonce: nonce,
  });

  // Index challenges by recomputed digest; verify the sequencer chain is contiguous + signed.
  const noSig = (o) => {
    const c = { ...o };
    delete c.sig;
    return c;
  };
  const byDigest = new Map();
  const ordered = [...bundle.start_challenges].sort(
    (a, b) => a.sequencer_sequence - b.sequencer_sequence
  );
  let prev = "sha256:" + "0".repeat(64);
  for (const ch of ordered) {
    const cd = domainDigest(DOMAINS.start_challenge, noSig(ch));
    if (!facts.sequencerSigValid?.[cd]) return R(354, "sequencer_sig_invalid");
    if (ch.previous_sequencer_record_digest !== prev) return R(354, "sequencer_chain_broken");
    if (ch.universe_commitment_digest !== commit) return R(354, "challenge_wrong_commitment");
    if (ch.ordering_receipt_digest !== receipt) return R(354, "challenge_wrong_ordering_receipt");
    if (ch.ceremony_id !== ceremonyRecompute) return R(354, "challenge_wrong_ceremony_id");
    byDigest.set(cd, ch);
    prev = cd;
  }

  // Every start (reviewer + producer) must chain to a challenge in the verified chain, for THIS commitment.
  const boundStart = (challenge_digest, role, principal) => {
    const ch = byDigest.get(challenge_digest);
    if (!ch) return R(354, "start_not_bound_to_challenge", { role });
    if (ch.principal_role !== role) return R(354, "challenge_role_mismatch", { role });
    if (ch.principal_digest !== principal) return R(354, "challenge_principal_mismatch", { role });
    return null;
  };
  for (const r of bundle.review_start_records) {
    const e = boundStart(r.challenge_digest, "reviewer", r.reviewer_principal_digest);
    if (e) return e;
  }
  const prs = bundle.producer_rating_start_record;
  return boundStart(prs.challenge_digest, "producer", ctx.producerIdentityDigest);
}
