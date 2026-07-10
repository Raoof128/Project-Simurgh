// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — panel-plan integrity (plan Task 6, raw 271, Laws 3 + 6). The precommit binds a
// domain-separated canonical object digest over five subdigests; roster ⊆ universe; unique IDs.
import { sha256Canon, panelPlanDigest } from "./digests.mjs";

const uniq = (arr) => new Set(arr).size === arr.length;

export function checkPlan(bundle) {
  const pre = bundle?.roster_precommit;
  const roster = bundle?.roster;
  const uni = bundle?.detector_universe;
  if (!pre || !Array.isArray(roster) || roster.length === 0 || !uni) return 271;

  const memberIds = roster.map((m) => m.member_id);
  if (!uniq(memberIds)) return 271;
  if (!Array.isArray(uni.candidates) || uni.candidates.length === 0 || !uniq(uni.candidates))
    return 271;
  // Law 6: roster ⊆ universe.
  const candidateSet = new Set(uni.candidates);
  if (!memberIds.every((id) => candidateSet.has(id))) return 271;

  const roster_digest = sha256Canon(roster);
  const corpus_digest = sha256Canon(bundle.corpus?.cases);
  const applicability_digest = sha256Canon(bundle.applicability_matrix);
  const adapter_manifest_digest = sha256Canon(
    roster.map((m) => ({
      member_id: m.member_id,
      adapter_digest: m.adapter_digest,
      tokenizer_manifest_digest: m.tokenizer_manifest_digest,
      truncation_policy_digest: m.truncation_policy_digest,
    }))
  );
  const universe_digest = sha256Canon(uni.candidates);
  if (uni.universe_digest !== universe_digest) return 271;

  const plan_digest = panelPlanDigest({
    schema: bundle.schema,
    roster_digest,
    corpus_digest,
    applicability_digest,
    adapter_manifest_digest,
    universe_digest,
  });
  if (
    pre.panel_plan_digest !== plan_digest ||
    pre.roster_digest !== roster_digest ||
    pre.corpus_digest !== corpus_digest ||
    pre.applicability_digest !== applicability_digest ||
    pre.adapter_manifest_digest !== adapter_manifest_digest ||
    pre.universe_digest !== universe_digest
  ) {
    return 271;
  }
  return null;
}
