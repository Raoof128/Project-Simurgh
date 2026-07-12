// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 350 anchor subject binding, 351 ordering verified_immediate, 360 finality overclaim. The
// two anchor states are adapter-derived (facts); the pure core reads them.
import { R } from "./result.mjs";

export function checkAnchorSubject(ctx) {
  const a = ctx.bundle.ordering_anchor;
  if (!a || typeof a !== "object") return R(350, "anchor_malformed");
  if (a.subject_digest !== ctx.bundle.universe_commitment.universe_commitment_digest)
    return R(350, "anchor_subject_mismatch");
  return null;
}

export function checkOrdering(ctx) {
  if (ctx.facts.orderingState !== "verified_immediate")
    return R(351, "ordering_not_verified_immediate", { state: ctx.facts.orderingState });
  return null;
}

export function checkFinalityOverclaim(ctx) {
  const claimed = ctx.bundle.claimed_finality_state;
  const computed = ctx.facts.finalityState;
  if (computed === "invalid") return R(360, "finality_evidence_invalid");
  if (claimed === "confirmed" && computed !== "confirmed") return R(360, "finality_overclaim");
  return null; // claimed pending ∧ computed confirmed → may accept
}
