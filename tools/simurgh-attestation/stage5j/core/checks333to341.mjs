// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC bindings/obligation/topology/scale/signatures (334–341). Extended by Tasks 1.5–1.8.
import { R } from "./result.mjs";
import { domainDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";
import { ratingObligationRoot } from "./roots.mjs";

// A rating entry is ordinally comparable only if it is ordinal AND its dimension is declared comparable.
function isComparable(entry, comparableDims) {
  return (
    entry &&
    entry.content.value_kind === "ordinal" &&
    comparableDims.has(entry.content.dimension_id)
  );
}

// Task 1.7 — 338 scale integrity → 339 no ordinal comparison over a non_comparable pair.
export function checkScaleAndComparison(ctx) {
  const { bundle, facts } = ctx;
  if (!facts.scaleSigValid) return R(338, "rating_scale_unsigned");

  const topScale = domainDigest(DOMAINS.scale, bundle.rating_scale.content);
  const comparableDims = new Set(bundle.rating_scale.content.comparable_dimensions);
  const all = [...bundle.reviewer_ratings, ...bundle.producer_ratings];
  for (const e of all) {
    if (e.content.value_kind === "ordinal" && e.content.rating_scale_digest !== topScale) {
      return R(338, "rating_scale_digest_mismatch");
    }
  }

  // 339 — every declared contest event must be over a genuinely comparable pair; a contest over an
  // abstain / out-of-dimension pair is an ordinal comparison forced onto a non_comparable pair.
  const byDigest = new Map(all.map((e) => [e.entry_digest, e]));
  for (const ce of bundle.contest_history) {
    const rev = byDigest.get(ce.content.reviewer_rating_digest);
    const prod = byDigest.get(ce.content.producer_rating_digest);
    if (!isComparable(rev, comparableDims) || !isComparable(prod, comparableDims)) {
      return R(339, "comparison_on_non_comparable_pair");
    }
  }
  return null;
}

// Task 1.8 — signatures over ALL historical entries (fossil attack, theorem 8). 340 reviewer-chain,
// 341 producer-chain. A forged historical (superseded) entry is caught even though the active head is
// honestly signed. The adapter resolves invalid-sig AND key-swap (wrong role) into a false fact.
export function checkSignatures(ctx) {
  const { bundle, facts } = ctx;
  for (const e of bundle.reviewer_ratings) {
    if (!facts.reviewerSigValid?.[e.entry_digest]) {
      return R(340, "reviewer_rating_signature_invalid", { entry_digest: e.entry_digest });
    }
  }
  for (const e of bundle.producer_ratings) {
    if (!facts.producerSigValid?.[e.entry_digest]) {
      return R(341, "producer_rating_signature_invalid", { entry_digest: e.entry_digest });
    }
  }
  return null;
}

// Task 1.5 — obligation equality (both sides). 334 obligation-root mismatch → 335 missing → 336 orphan.
export function checkObligation(ctx) {
  const { bundle, S, requiredReviewerPairs } = ctx;

  // 334 — the DECLARED obligation root must equal the root DERIVED from the verified 5I relation.
  if (bundle.rating_obligation_root !== ratingObligationRoot(ctx)) {
    return R(334, "obligation_root_mismatch");
  }

  const activeReviewerPairs = new Set(
    bundle.reviewer_ratings.map((e) => `${e.content.section_id}:${e.content.reviewer_id}`)
  );
  const activeProducerSections = new Set(bundle.producer_ratings.map((e) => e.content.section_id));

  // 335 — every required reviewer pair AND every committed section must have an active rating.
  for (const pair of requiredReviewerPairs) {
    if (!activeReviewerPairs.has(pair)) return R(335, "required_reviewer_rating_missing", { pair });
  }
  for (const s of S) {
    if (!activeProducerSections.has(s))
      return R(335, "required_producer_rating_missing", { section: s });
  }

  // 336 — every active rating must map to a required subject (no orphans / out-of-panel / out-of-universe).
  for (const pair of activeReviewerPairs) {
    if (!requiredReviewerPairs.has(pair)) return R(336, "orphan_reviewer_rating", { pair });
  }
  for (const s of activeProducerSections) {
    if (!S.has(s)) return R(336, "orphan_producer_rating", { section: s });
  }
  return null;
}
