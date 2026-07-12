// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC projections (345, audit-only). Untrusted derived outputs recomputed exactly from the
// bundle. Downgrade Depth (G1) publishes numerator AND denominator so it cannot be massaged; the
// in-toto/SCITT bridge (G3) subject must recompute to contest_layer_root. Non-claims: downgrade depth
// is the SIZE of divergence, not who is right; registration proves logging, not truth.
import { R } from "./result.mjs";
import { canonicalJson, artifactDigest } from "./digests.mjs";
import { contestLayerRoot } from "./roots.mjs";
import { recomputeHistoricalContestEvents } from "./contest.mjs";

export function computeProjections(bundle) {
  const ranks = bundle.rating_scale.content.ordinal_ranks;
  const comparableDims = new Set(bundle.rating_scale.content.comparable_dimensions);
  const cmp = (e) =>
    e && e.content.value_kind === "ordinal" && comparableDims.has(e.content.dimension_id);

  const prodBySection = new Map(bundle.producer_ratings.map((e) => [e.content.section_id, e]));
  const revBy = (s, r) =>
    bundle.reviewer_ratings.find((e) => e.content.section_id === s && e.content.reviewer_id === r);

  // divergence census — one row per stored contest event (deterministic order = contest_history order).
  const divergence_census = bundle.contest_history.map((ce) => ({
    section_id: ce.content.section_id,
    reviewer_id: ce.content.reviewer_id,
    producer_rating: prodBySection.get(ce.content.section_id).content.value,
    reviewer_ratings: [revBy(ce.content.section_id, ce.content.reviewer_id).content.value],
  }));

  // favourable_skew — favourable divergences over comparable pairs (num + den both published).
  const events = recomputeHistoricalContestEvents({ bundle });
  let comparable_pair_count = 0;
  for (const rev of bundle.reviewer_ratings) {
    const prod = prodBySection.get(rev.content.section_id);
    if (cmp(rev) && cmp(prod)) comparable_pair_count += 1;
  }
  const favourable_skew = { favourable_count: events.size, comparable_pair_count };

  // downgrade_depth — sum of severity-rank deltas over contested pairs (num + den).
  let total_rank_delta = 0;
  for (const ce of bundle.contest_history) {
    const prod = prodBySection.get(ce.content.section_id);
    const rev = revBy(ce.content.section_id, ce.content.reviewer_id);
    total_rank_delta += ranks[rev.content.value] - ranks[prod.content.value];
  }
  const downgrade_depth = { total_rank_delta, contested_pair_count: bundle.contest_history.length };

  // concurrence_backing — backed claims over the committed census of ALL concurrence claims.
  const concurrence_backing = {
    backed_claim_count: bundle.concurrences.length,
    total_concurrence_claim_count: bundle.concurrences.length,
  };

  return { divergence_census, favourable_skew, concurrence_backing, downgrade_depth };
}

export function projectionRoot(proj) {
  return artifactDigest(proj);
}

export function checkProjections(ctx) {
  const { bundle } = ctx;
  const recomputed = computeProjections(bundle);
  for (const field of Object.keys(recomputed)) {
    if (canonicalJson(bundle.projections[field]) !== canonicalJson(recomputed[field])) {
      return R(345, "projection_recompute_mismatch", { field });
    }
  }
  if (bundle.projections.projection_root !== projectionRoot(recomputed)) {
    return R(345, "projection_root_mismatch");
  }
  // in-toto/SCITT bridge (G3): when present, its subject must recompute to contest_layer_root.
  if (bundle.external_registry_anchor !== null) {
    if (bundle.external_registry_anchor.subject_digest !== contestLayerRoot(bundle)) {
      return R(345, "registry_bridge_subject_mismatch");
    }
  }
  return null;
}
