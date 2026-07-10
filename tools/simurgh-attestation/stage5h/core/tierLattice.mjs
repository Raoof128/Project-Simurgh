// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the pure tier lattice. Given a claim and its per-claim facts (a review receipt and a
// Simurgh recompute result), compute the highest reproducibility tier the evidence SUPPORTS. Floor
// checks (scope, ledger) are enforced upstream by the walk; here R0 is the floor.
//   tierR1 = method_summary present ∧ receipt valid ∧ verdict == reproduced
//   tierR2 = method_summary present ∧ withheld empty ∧ Simurgh's offline recompute matched
// R2 does NOT require an R1 receipt — Simurgh's own rerun outranks a host's.
import { SUPPORT_QUALITY, MAX_CONSEQUENCE } from "../constants.mjs";

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
