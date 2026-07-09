// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — slipRateCore (plan Task 6; 235/236). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGrid } from "../../../../tools/simurgh-attestation/stage5c/core/gridCore.mjs";
import { MR_IDS_5C } from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";
import {
  slipRates,
  checkSlipRates,
  floorMonotonicity,
  checkFloorMonotonicity,
} from "../../../../tools/simurgh-attestation/stage5c/core/slipRateCore.mjs";

const BASES = [
  {
    base_id: "b_quant",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "40 percent of accounts were leaked",
  },
  {
    base_id: "b_digit",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "leaked 5 files today",
  },
];

test("slipRates: exact integer rational per (mechanism, mr_family); n/a+degenerate excluded", () => {
  const { grid, baseCorpus } = buildGrid(BASES, MR_IDS_5C);
  const rates = slipRates(grid, baseCorpus);
  for (const r of rates) {
    assert.equal(r.slip_rate_den, r.caught + r.slipped);
    assert.ok(Number.isInteger(r.slip_rate_num) && Number.isInteger(r.slip_rate_den));
    assert.equal(r.slip_rate_num, r.slipped);
  }
  // true_semantic_paraphrase slips b_quant → that family has a slip
  const tsp = rates.find((r) => r.mr_family === "true_semantic_paraphrase");
  assert.ok(tsp.slipped >= 1);
});

test("235: a tampered published rate fails closed", () => {
  const { grid, baseCorpus } = buildGrid(BASES, MR_IDS_5C);
  const rates = slipRates(grid, baseCorpus);
  assert.equal(checkSlipRates(grid, baseCorpus, rates), null);
  const bad = rates.map((r) => ({ ...r }));
  bad[0].slip_rate_num += 1;
  assert.equal(checkSlipRates(grid, baseCorpus, bad).raw, 235);
});

test("floorMonotonicity: leakage v2 slip-set ⊆ v1 (holds by construction)", () => {
  const rows = floorMonotonicity(BASES, MR_IDS_5C);
  assert.equal(rows.length, 1); // only leakage has >1 version
  assert.equal(rows[0].mechanism, "leakage");
  assert.equal(rows[0].older_version, "v1");
  assert.equal(rows[0].newer_version, "v2");
  assert.equal(rows[0].newer_slip_subset_of_older, true);
});

test("checkFloorMonotonicity: green → null; a claimed regression → 236 (public)", () => {
  const rows = floorMonotonicity(BASES, MR_IDS_5C);
  assert.equal(checkFloorMonotonicity(rows, { tier: "public" }), null);
  const regressed = rows.map((r) => ({ ...r, newer_slip_subset_of_older: false }));
  assert.equal(checkFloorMonotonicity(regressed, { tier: "public" }).raw, 236);
});

test("checkFloorMonotonicity audit: a dishonest 'true' claim that recompute contradicts → 236", () => {
  // synthesize a row asserting subset for a mechanism where we force a recomputed violation by
  // pretending v1 is the newer (inverted) — the recompute must catch the lie.
  const rows = floorMonotonicity(BASES, MR_IDS_5C).map((r) => ({
    ...r,
    older_version: "v2",
    newer_version: "v1", // inverted: v1 slip-set ⊄ v2 (v1 slips a superset)
  }));
  const r = checkFloorMonotonicity(rows, { tier: "audit", basesWithText: BASES, mrIds: MR_IDS_5C });
  assert.equal(r.raw, 236);
});
