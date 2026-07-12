// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC context factory. Derives S, C(r), reviewer keys, and the producer identity from the
// RE-VERIFIED 5I bundle (the node adapter re-runs the 5I verifier and injects facts.vpc_verdict). All
// derivation here is structural (pure hashing / reads) — never crypto. makeCtx MUST NOT throw on a bad
// upstream: it stores ctx.anchorMismatch (the 5I R_candidate pattern); an unexpected throw is 347.
import { R } from "./result.mjs";
import { artifactDigest } from "./digests.mjs";

export function makeCtx(bundle, cfg, facts) {
  const vpc = cfg.vpc_bundle;
  const att = vpc?.attestation?.content;
  const producer = vpc?.partition?.content?.producer_principal;

  // 333 — the embedded 5I bundle must itself verify raw 0 under the 5I verifier (the adapter's fact),
  // and its committed anchors must equal what this VRC bundle binds to. facts.vpc_verdict === 0 means
  // 5I's own attestation-recompute (329) already validated att.* — so binding to att.* is sound.
  let anchorMismatch = null;
  const fail = (reason) => {
    if (!anchorMismatch) anchorMismatch = R(333, reason);
  };

  if (facts.vpc_verdict !== 0) fail("upstream_unverified");
  else if (!att || !producer) fail("upstream_structure_absent");
  else {
    const ref = bundle.vpc_ref;
    if (
      ref.vpc_bundle_digest !== artifactDigest(att) ||
      ref.panel_subject_root !== att.panel_subject_root ||
      ref.panel_evidence_root !== att.panel_evidence_root ||
      ref.partition_digest !== att.partition_digest
    ) {
      fail("anchor_mismatch");
    }
    const pref = bundle.producer_ref;
    if (
      pref.producer_identity_digest !== producer.producer_identity_digest ||
      pref.producer_key_fingerprint !== producer.key_fingerprint
    ) {
      fail("producer_mismatch");
    }
  }

  // Structural derivations (safe even when anchorMismatch is set — the core returns before using them).
  const sections = vpc?.partition?.content?.sections ?? [];
  const S = new Set(sections.map((s) => (typeof s === "string" ? s : s.section_id)));
  const coverage = new Map(); // reviewer_id → Set(sections)
  const reviewerKeys = new Set();
  for (const c of vpc?.coverage_receipts ?? []) {
    const rid = c.content.reviewer_principal.key_fingerprint;
    reviewerKeys.add(rid);
    coverage.set(rid, new Set(c.content.evaluated_sections));
  }
  // required_reviewer_pairs = {(s,r) : s ∈ C(r)}; required_producer_sections = S.
  const requiredReviewerPairs = new Set();
  for (const [rid, secs] of coverage)
    for (const s of secs) requiredReviewerPairs.add(`${s}:${rid}`);

  return {
    bundle,
    cfg,
    facts,
    anchorMismatch,
    S,
    coverage,
    reviewerKeys,
    requiredReviewerPairs,
    producerIdentityDigest: producer?.producer_identity_digest,
  };
}
