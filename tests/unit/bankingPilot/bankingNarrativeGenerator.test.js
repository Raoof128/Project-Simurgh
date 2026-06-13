// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { generateBankingNarrative } from "../../../src/bankingPilot/bankingNarrativeGenerator.js";

const basePayload = {
  scenario_type: "mock_payment_pause",
  risk_score: 35,
  verdict: "warning",
  manual_review_required: true,
};

test("generator returns the fixed narrative schema", () => {
  const n = generateBankingNarrative(basePayload);
  for (const field of [
    "plain_english_summary",
    "policy_outcome_explanation",
    "privacy_boundary_note",
    "audit_verify_explanation",
    "manual_review_note",
  ]) {
    assert.equal(typeof n[field], "string");
    assert.ok(n[field].length > 0);
  }
  assert.ok(Array.isArray(n.non_claims) && n.non_claims.length > 0);
  assert.equal(n.official_result_unchanged, true);
});

test("generator is deterministic: same input gives byte-identical output", () => {
  const a = JSON.stringify(generateBankingNarrative(basePayload));
  const b = JSON.stringify(generateBankingNarrative(basePayload));
  assert.equal(a, b);
});

test("manual_review_note reflects manual_review_required flag", () => {
  const flagged = generateBankingNarrative({ ...basePayload, manual_review_required: true });
  const clear = generateBankingNarrative({
    ...basePayload,
    verdict: "safe",
    manual_review_required: false,
  });
  assert.notEqual(flagged.manual_review_note, clear.manual_review_note);
});

test("unknown scenario_type falls back without throwing", () => {
  const n = generateBankingNarrative({ verdict: "safe" });
  assert.equal(typeof n.plain_english_summary, "string");
});
