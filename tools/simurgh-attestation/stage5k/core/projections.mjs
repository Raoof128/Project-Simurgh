// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 361 audit projections + censuses + in-toto bridge. Recomputes bijection / per-component /
// inclusion-coverage / review-start / regression (G4/G7) / commit-first-margin (G1) / omission (G8, sig-
// validated) censuses and the projection_root, compares to the stored projections. Public tier never runs.
import { R } from "./result.mjs";
import { artifactDigest } from "./digests.mjs";
import { universeSetDigest } from "./projection.mjs";

function computeRegression(ctx) {
  // Compares only against a RE-VERIFIED anchored prior universe supplied in cfg.prior_vuc_bundle.
  const ref = ctx.bundle.prior_universe_ref;
  if (ref === null) return { compared: false, dropped_leaf_ids: [] };
  const prior = ctx.cfg.prior_vuc_bundle;
  if (!prior || artifactDigest(prior) !== ref.vuc_bundle_digest)
    return { compared: false, dropped_leaf_ids: [], error: "prior_bundle_unavailable_or_mismatch" };
  const priorIds = new Set((prior.universe_commitment?.leaves ?? []).map((l) => l.leaf_id));
  const nowIds = new Set(ctx.U_commit.map((l) => l.leaf_id));
  const dropped = [...priorIds].filter((id) => !nowIds.has(id)).sort();
  return { compared: true, dropped_leaf_ids: dropped };
}

export function computeProjections(ctx) {
  const { bundle, facts } = ctx;
  const bijection_census = {
    commit: ctx.setDigest.commit,
    vpc: ctx.setDigest.vpc,
    vrc: ctx.setDigest.vrc,
    equal: ctx.setDigest.commit === ctx.setDigest.vpc && ctx.setDigest.commit === ctx.setDigest.vrc,
  };
  const per_component_universe_state = {
    commit_count: ctx.U_commit.length,
    vpc_count: ctx.U_vpc.length,
    vrc_count: ctx.U_vrc.length,
    commit_set_digest: universeSetDigest(ctx.U_commit),
  };
  const inclusion_coverage = {
    leaf_count: bundle.universe_commitment.leaf_count,
    proof_count: bundle.inclusion_proofs.length,
  };
  const review_start_census = {
    reviewer_starts: bundle.review_start_records.length,
    required: ctx.reviewerFps.length,
  };
  const regression_census = computeRegression(ctx);
  const seqs = bundle.start_challenges.map((c) => c.sequencer_sequence).sort((a, b) => a - b);
  const commit_first_margin = {
    min: seqs.length ? seqs[0] : null,
    max: seqs.length ? seqs[seqs.length - 1] : null,
    count: seqs.length,
  };
  const valid = [];
  const invalid = [];
  for (const oc of bundle.omission_claims ?? [])
    (facts.omissionSigValid?.[oc.claim_id] ? valid : invalid).push(oc.claim_id);
  const omission_claim_census = {
    valid_claim_count: valid.length,
    invalid_claim_count: invalid.length,
    invalid_claim_digests: invalid.sort(),
  };
  const proj = {
    bijection_census,
    per_component_universe_state,
    inclusion_coverage,
    review_start_census,
    regression_census,
    commit_first_margin,
    omission_claim_census,
  };
  return { ...proj, projection_root: artifactDigest(proj) };
}

export function checkProjections(ctx) {
  const recomputed = computeProjections(ctx);
  const stored = ctx.bundle.projections;
  if (!stored || stored.projection_root !== recomputed.projection_root)
    return R(361, "projection_mismatch");

  // G3 in-toto/SCITT bridge — active optional.
  const anchor = ctx.bundle.external_registry_anchor;
  if (anchor !== null) {
    if (!ctx.facts.registryAnchorSigValid) return R(361, "registry_anchor_sig_invalid");
    if (anchor.subject !== ctx.bundle.universe_commitment.universe_commitment_digest)
      return R(361, "registry_anchor_wrong_subject");
  }
  return null;
}
