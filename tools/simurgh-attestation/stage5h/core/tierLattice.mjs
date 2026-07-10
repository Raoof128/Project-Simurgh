// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the pure tier lattice. Given a claim and its per-claim facts (a review receipt and a
// Simurgh recompute result), compute the highest reproducibility tier the evidence SUPPORTS. Floor
// checks (scope, ledger) are enforced upstream by the walk; here R0 is the floor.
//   tierR1 = method_summary present ∧ receipt valid ∧ verdict == reproduced
//   tierR2 = method_summary present ∧ withheld empty ∧ Simurgh's offline recompute matched
// R2 does NOT require an R1 receipt — Simurgh's own rerun outranks a host's.
import { SUPPORT_QUALITY, MAX_CONSEQUENCE, CONSEQUENCE, DOMAIN } from "../constants.mjs";
import { domainDigest } from "./digests.mjs";

export function computeTierFacts(claim, { receiptFact = null, recomputeFact = null } = {}) {
  const hasMethod = claim.method_summary_digest != null;
  const withheldEmpty = (claim.artefact_manifest.withheld || []).length === 0;

  const r1 = hasMethod && receiptFact != null && receiptFact.verdict === "reproduced";
  const r2 = hasMethod && withheldEmpty && recomputeFact != null && recomputeFact.matched === true;

  const proven_tier = r2 ? "public" : r1 ? "controlled" : "restricted";
  return {
    proven_tier,
    support_quality: SUPPORT_QUALITY[proven_tier],
    max_consequence_warranted: MAX_CONSEQUENCE[proven_tier],
  };
}

// The verifier-computed verdict table (pure). Receipts are matched to claims by claim_digest; the
// Simurgh recompute result is matched by claim_id. right_scaling_distance = the reviewer-caught
// "evidential inversion" turned into a signed integer (0 = right-scaled).
export function buildVerdictTable(ctx) {
  const b = ctx.bundle;
  const receiptByClaimDigest = new Map(
    b.review_receipts.map((r) => [r.content.claim_digest, r.content])
  );
  return b.claim_inventory.content.claims.map((c) => {
    const receipt = receiptByClaimDigest.get(domainDigest(DOMAIN.claim, c));
    const receiptFact = receipt ? { verdict: receipt.verdict } : null;
    const rr = ctx.recomputeResult ? ctx.recomputeResult[c.claim_id] : null;
    const recomputeFact = rr ? { matched: rr.matched } : null;
    const facts = computeTierFacts(c, { receiptFact, recomputeFact });
    const dist = Math.max(
      0,
      CONSEQUENCE.index(c.declared_consequence) - CONSEQUENCE.index(facts.max_consequence_warranted)
    );
    return {
      claim_id: c.claim_id,
      proven_tier: facts.proven_tier,
      support_quality: facts.support_quality,
      max_consequence_warranted: facts.max_consequence_warranted,
      inverted: dist > 0,
      right_scaling_distance: dist,
    };
  });
}
