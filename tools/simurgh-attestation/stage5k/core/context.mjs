// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — makeCtx: the shared substrate every check reads. Re-verified 5I + 5J verdicts arrive via
// facts (B11); makeCtx DERIVES U_vpc and U_vrc through the ONE frozen projection over the same verified
// 5I partition (never copied from the bundle). Never throws on bad upstream — it stashes state the checks
// read (e.g. ctx.downstreamMismatch for 352).
import { R } from "./result.mjs";
import { artifactDigest } from "./digests.mjs";
import { projectSection, universeSetDigest } from "./projection.mjs";

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function makeCtx(bundle, cfg, facts = {}) {
  const ctx = { bundle, cfg, facts };

  const vpc = cfg.vpc_bundle;
  const vrc = cfg.vrc_bundle;
  const sections = safe(() => vpc.partition.content.sections, []);
  const partition_digest = safe(() => vpc.attestation.content.partition_digest, null);
  const sectionById = new Map(sections.map((s) => [s.section_id, s]));

  const project = (ids) =>
    ids
      .map((id) => sectionById.get(id))
      .filter(Boolean)
      .map((s) => projectSection(s, partition_digest));

  // U_vpc: the sections VPC actually covered (union of coverage-receipt evaluated_sections).
  const coveredIds = safe(
    () => [...new Set(vpc.coverage_receipts.flatMap((c) => c.content.evaluated_sections))].sort(),
    []
  );
  // U_vrc: the 5J producer-rated sections, resolved through the SAME partition.
  const ratedIds = safe(
    () => [...new Set(vrc.producer_ratings.map((p) => p.content.section_id))].sort(),
    []
  );

  ctx.partition_digest = partition_digest;
  ctx.sectionById = sectionById;
  ctx.U_commit = bundle.universe_commitment.leaves.map((l) => ({
    leaf_id: l.leaf_id,
    leaf_type: l.leaf_type,
    subject_digest: l.subject_digest,
  }));
  ctx.U_vpc = project(coveredIds);
  ctx.U_vrc = project(ratedIds);
  ctx.setDigest = {
    commit: universeSetDigest(ctx.U_commit),
    vpc: universeSetDigest(ctx.U_vpc),
    vrc: universeSetDigest(ctx.U_vrc),
  };

  // 352 — downstream binding: both upstream verdicts 0 AND vpc_ref/vrc_ref match the re-verified bundles.
  ctx.downstreamMismatch = (() => {
    if (facts.vpc_verdict !== 0)
      return R(352, "vpc_unverified", { vpc_verdict: facts.vpc_verdict });
    if (facts.vrc_verdict !== 0)
      return R(352, "vrc_unverified", { vrc_verdict: facts.vrc_verdict });
    const ref = bundle.vpc_ref;
    if (
      ref.vpc_bundle_digest !== artifactDigest(vpc) ||
      ref.partition_digest !== partition_digest ||
      ref.panel_subject_root !== safe(() => vpc.attestation.content.panel_subject_root, null) ||
      ref.panel_evidence_root !== safe(() => vpc.attestation.content.panel_evidence_root, null)
    )
      return R(352, "vpc_ref_mismatch");
    const vref = bundle.vrc_ref;
    if (vref === null) return R(352, "vrc_ref_missing_under_release");
    if (
      vref.vrc_bundle_digest !== artifactDigest(vrc) ||
      vref.rating_obligation_root !== safe(() => vrc.rating_obligation_root, null)
    )
      return R(352, "vrc_ref_mismatch");
    return null;
  })();

  return ctx;
}
