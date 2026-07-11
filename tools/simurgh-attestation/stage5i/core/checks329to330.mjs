// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC audit recompute (329) + policy (330).
import { R } from "./result.mjs";
import { canonicalJson } from "./digests.mjs";
import { panelSubjectRoot, panelEvidenceRoot, trustContextDigest } from "./roots.mjs";
import { coverageDepth, sectionStates } from "./projections.mjs";

// Canonical counted-reviewer census, sorted by fingerprint.
export function countedReviewers(ctx) {
  return [...ctx.R_eligible]
    .map(({ fp }) => ({
      key_fingerprint: fp,
      reviewer_separation_strength: ctx.computedSeparation.get(fp).reviewer_separation_strength,
      host_separation_strength: ctx.computedSeparation.get(fp).host_separation_strength,
      independence_valid: true,
    }))
    .sort((a, b) => (a.key_fingerprint < b.key_fingerprint ? -1 : 1));
}

// The verifier-DERIVED attestation content (what a producer must have declared). Used by the audit
// check and by the node builder.
export function recomputeAttestationContent(ctx) {
  return {
    partition_digest: ctx.partition_digest,
    policy_digest: ctx.cfg.policy_pin.policy_digest,
    panel_subject_root: panelSubjectRoot(ctx),
    panel_evidence_root: panelEvidenceRoot(ctx),
    trust_context_digest: trustContextDigest(ctx),
    counted_reviewers: countedReviewers(ctx),
    coverage_union: ctx.coverage_union,
    coverage_gap: ctx.coverage_gap,
    equality_holds: ctx.coverage_gap.length === 0,
    verdict: ctx.coverage_gap.length === 0 ? "covered" : "gap",
    coverage_depth: coverageDepth(ctx),
    section_states: sectionStates(ctx),
  };
}

// 329 (audit-only) — declared attestation fields (incl. both roots, census, depth, states) == recompute.
export function checkAttestationRecompute(ctx) {
  const declared = ctx.bundle.attestation.content;
  const recomputed = recomputeAttestationContent(ctx);
  for (const k of Object.keys(recomputed)) {
    if (canonicalJson(declared[k]) !== canonicalJson(recomputed[k]))
      return R(329, "attestation_mismatch", { field: k });
  }
  return null;
}

// 330 (policy, BOTH tiers) — min_reviewers, non-trivial partition, distinct hosts, distinct SUBJECT
// affiliation lineage (S6 — not issuer).
export function checkPolicy(ctx, policy) {
  const eligible = ctx.R_eligible ?? ctx.R_candidate;
  if (eligible.length < policy.min_reviewers) return R(330, "min_reviewers");
  if (policy.require_nontrivial_partition) {
    for (const { receipt } of eligible) {
      if (new Set(receipt.content.evaluated_sections).size >= ctx.S.size)
        return R(330, "trivial_partition");
    }
  }
  const hosts = new Set(
    eligible.map(({ receipt }) => receipt.content.review_host_identity_ref.key_fingerprint)
  );
  if (hosts.size < policy.min_distinct_hosts) return R(330, "min_distinct_hosts");
  if (policy.require_distinct_anchor_lineage) {
    const lineages = eligible.map(({ fp }) => ctx.anchorLineageOf(fp));
    if (new Set(lineages).size !== lineages.length)
      return R(330, "shared_subject_affiliation_lineage");
  }
  return null;
}
