// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — §6-A Inversion Census. A (declared_consequence × proven_tier) occupancy grid over an
// audit verdict table, plus the count of inverted cells. Pure projection of already-verified data.
// NON-CLAIM: the census measures disclosure geometry, not report quality — a report with zero
// threshold_crossing claims is not thereby "safer".
import { CONSEQUENCE, TIER } from "../constants.mjs";

export function inversionCensus(claims, verdictTable) {
  const byId = new Map(verdictTable.map((r) => [r.claim_id, r]));
  const grid = {};
  for (const cq of CONSEQUENCE.order) {
    grid[cq] = {};
    for (const t of TIER.order) grid[cq][t] = 0;
  }
  let inverted_cells = 0;
  for (const c of claims) {
    const row = byId.get(c.claim_id);
    grid[c.declared_consequence][row.proven_tier] += 1;
    if (row.inverted) inverted_cells += 1;
  }
  return { grid, inverted_cells, total_claims: claims.length };
}
