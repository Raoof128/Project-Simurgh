// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — §6-B Right-Scaling Distance. Per-claim entitlement gap turned into a signed integer:
// max(0, rank(declared_consequence) − rank(max_consequence(proven_tier))). 0 = right-scaled.
// NON-CLAIM: distance 0 ≠ claim true; it measures entitlement alignment, not correctness.
import { CONSEQUENCE } from "../constants.mjs";

export function rightScalingDistance(claim, verdictRow) {
  return Math.max(
    0,
    CONSEQUENCE.index(claim.declared_consequence) -
      CONSEQUENCE.index(verdictRow.max_consequence_warranted)
  );
}

// Report-level inversion magnitude = the sum over all claims.
export function inversionMagnitude(claims, verdictTable) {
  const byId = new Map(verdictTable.map((r) => [r.claim_id, r]));
  return claims.reduce((s, c) => s + rightScalingDistance(c, byId.get(c.claim_id)), 0);
}
