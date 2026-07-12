// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC bindings/obligation/topology/scale/signatures (334–341). Extended by Tasks 1.5–1.8.
import { R } from "./result.mjs";
import { ratingObligationRoot } from "./roots.mjs";

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
