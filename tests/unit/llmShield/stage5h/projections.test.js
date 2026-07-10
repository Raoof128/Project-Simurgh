// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, resign } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { buildVerdictTable } from "../../../../tools/simurgh-attestation/stage5h/core/tierLattice.mjs";
import {
  rightScalingDistance,
  inversionMagnitude,
} from "../../../../tools/simurgh-attestation/stage5h/core/rightScalingDistance.mjs";
import { inversionCensus } from "../../../../tools/simurgh-attestation/stage5h/core/inversionCensus.mjs";
import { disclosureDebt } from "../../../../tools/simurgh-attestation/stage5h/core/disclosureDebt.mjs";

const claimsOf = (fx) => fx.bundle.claim_inventory.content.claims;

test("right-scaling distance 0 on the honest bundle; magnitude 0", () => {
  const fx = validBundle();
  const table = buildVerdictTable(ctxFor(fx));
  const byId = new Map(table.map((r) => [r.claim_id, r]));
  for (const c of claimsOf(fx)) assert.equal(rightScalingDistance(c, byId.get(c.claim_id)), 0);
  assert.equal(inversionMagnitude(claimsOf(fx), table), 0);
});

test("right-scaling distance rises on an inverted claim", () => {
  const fx = validBundle();
  const c = structuredClone(claimsOf(fx)[2]);
  c.declared_consequence = "threshold_crossing"; // proven restricted → warrant contextual
  const table = buildVerdictTable(ctxFor(fx));
  const row = table.find((r) => r.claim_id === c.claim_id);
  assert.equal(rightScalingDistance(c, row), 2); // threshold_crossing(2) - contextual(0)
});

test("inversion census grid + inverted cells; consistency with distance>0", () => {
  const fx = validBundle();
  const table = buildVerdictTable(ctxFor(fx));
  const census = inversionCensus(claimsOf(fx), table);
  assert.equal(census.total_claims, 3);
  assert.equal(census.inverted_cells, 0);
  assert.equal(census.grid.threshold_crossing.controlled, 1); // CBRN
  assert.equal(census.grid.supporting.public, 1); // harmbench
  assert.equal(census.grid.contextual.restricted, 1); // monitoring
  // consistency: inverted_cells === count(distance>0)
  const nDist = claimsOf(fx).filter((c) => {
    const row = table.find((r) => r.claim_id === c.claim_id);
    return rightScalingDistance(c, row) > 0;
  }).length;
  assert.equal(census.inverted_cells, nDist);
});

test("disclosure debt enumerates typed IOUs by tier", () => {
  const fx = validBundle();
  const debt = disclosureDebt(claimsOf(fx));
  assert.equal(debt.total, 2); // CBRN's two withheld
  assert.equal(debt.by_tier.controlled, 2);
  assert.ok(debt.items.every((i) => i.justification_type));
});
