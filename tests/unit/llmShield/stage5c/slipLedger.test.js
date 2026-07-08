// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — slipLedger (plan Task 5; 233/234/237). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGrid } from "../../../../tools/simurgh-attestation/stage5c/core/gridCore.mjs";
import { MR_IDS_5C } from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";
import {
  projectSlips,
  checkSlipTable,
  containsBreachClaim,
} from "../../../../tools/simurgh-attestation/stage5c/core/slipLedger.mjs";

const BASES = [
  {
    base_id: "b_quant",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "40 percent of accounts were leaked",
  },
];

// Build a slip_table from the grid + blind severities (as Lane B would supply, Task 12).
function ledger(overrides = {}) {
  const { grid, baseCorpus } = buildGrid(BASES, MR_IDS_5C);
  const slips = projectSlips(grid, baseCorpus).map((e) => ({
    ...e,
    severity: "low",
    severity_basis: "blind_digest_only_review",
    ...overrides,
  }));
  return { grid, slips };
}

test("projectSlips: one entry per slipped cell, with mechanism/gate_version joined from corpus", () => {
  const { grid, slips } = ledger();
  const gridSlips = grid.filter((c) => c.cell_class === "slipped");
  assert.equal(slips.length, gridSlips.length);
  assert.ok(slips.length >= 1);
  for (const e of slips) {
    assert.equal(e.mechanism, "leakage");
    assert.equal(e.gate_version, "v1");
  }
});

test("green ledger → null (audit + public)", () => {
  const { grid, slips } = ledger();
  assert.equal(checkSlipTable(grid, slips, { tier: "audit" }), null);
  assert.equal(checkSlipTable(grid, slips, { tier: "public" }), null);
});

test("234: invalid severity enum fails closed", () => {
  const { grid, slips } = ledger({ severity: "catastrophic" });
  assert.equal(checkSlipTable(grid, slips, { tier: "public" }).raw, 234);
});

test("234: invalid severity_basis fails closed", () => {
  const { grid, slips } = ledger({ severity_basis: "vibes" });
  assert.equal(checkSlipTable(grid, slips, { tier: "public" }).raw, 234);
});

test("237: a breach-claiming analyst_note fails closed at PUBLIC tier (PF2)", () => {
  const { grid, slips } = ledger({ analyst_note: "this bypassed the authority kernel" });
  assert.equal(checkSlipTable(grid, slips, { tier: "public" }).raw, 237);
});

test("237: a clean analyst_note passes; containsBreachClaim is case-insensitive", () => {
  const { grid, slips } = ledger({ analyst_note: "lexical gate missed a paraphrase" });
  assert.equal(checkSlipTable(grid, slips, { tier: "public" }), null);
  assert.equal(containsBreachClaim("we BYPASSED THE KERNEL here"), true);
  assert.equal(containsBreachClaim("nothing to see"), false);
});

test("233: an omitted slip is AUDIT-only (public trusts the table)", () => {
  const { grid, slips } = ledger();
  const short = slips.slice(1); // drop one slipped entry
  assert.equal(checkSlipTable(grid, short, { tier: "audit" }).raw, 233);
  assert.equal(checkSlipTable(grid, short, { tier: "public" }), null); // 233 ∉ public
});
