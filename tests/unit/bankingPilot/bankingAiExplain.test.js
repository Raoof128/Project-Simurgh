// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBankingAiExplanation,
  isAiExplainEnabled,
} from "../../../src/bankingPilot/bankingAiExplain.js";
import { scoreBankingRisk } from "../../../src/bankingPilot/bankingRiskScoring.js";

function recordFor(scenarioMetadata) {
  const risk = scoreBankingRisk(scenarioMetadata);
  return {
    banking_session_id: "bp_test_fixture",
    scenario_metadata: scenarioMetadata,
    risk,
  };
}

test("isAiExplainEnabled reads explicit 'true' only", () => {
  const prev = process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN;
  process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
  assert.equal(isAiExplainEnabled(), true);
  process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "1";
  assert.equal(isAiExplainEnabled(), false);
  delete process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN;
  assert.equal(isAiExplainEnabled(), false);
  if (prev !== undefined) process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = prev;
});

test("happy path returns narrative + enabled receipt", () => {
  const record = recordFor({
    scenario_type: "mock_payment_pause",
    risk_prompt_shown: true,
    user_action: "pause",
  });
  const r = buildBankingAiExplanation(record);
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.equal(typeof r.narrative.plain_english_summary, "string");
  assert.equal(r.receipt.sensitive_payload_sent_to_ai, false);
  assert.equal(r.receipt.network_egress_used, false);
  assert.equal(r.receipt.official_result_unchanged, true);
  assert.match(r.receipt.narrative_hash, /^sha256:[a-f0-9]{64}$/);
});

test("the payload sent onward contains no raw forbidden fields", () => {
  const record = recordFor({
    scenario_type: "mock_confirmation_of_payee",
    mock_cop_result_category: "no_match",
    risk_prompt_shown: true,
    user_action: "request_review",
  });
  const r = buildBankingAiExplanation(record);
  // session id is hashed, never raw
  assert.ok(!JSON.stringify(r).includes("bp_test_fixture"));
});
