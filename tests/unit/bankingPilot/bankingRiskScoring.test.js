// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreBankingRisk,
  BANKING_RECOMMENDATIONS,
} from "../../../src/bankingPilot/bankingRiskScoring.js";

const FORBIDDEN_CLAIM_WORDS = [
  "Fraud detected",
  "Scam detected",
  "User is victim",
  "User is malicious",
  "Payment is fraudulent",
  "Banking account compromised",
];

test("scoreBankingRisk returns stable thresholds and recommendation wording", () => {
  assert.deepEqual(scoreBankingRisk({ scenario_type: "mock_cdr_consent" }), {
    risk_score: 10,
    verdict: "safe",
    risk_categories: ["consent_integrity"],
    manual_review_required: false,
    manual_review_recommendation: BANKING_RECOMMENDATIONS.safe,
  });

  assert.deepEqual(
    scoreBankingRisk({
      scenario_type: "mock_confirmation_of_payee",
      mock_cop_result_category: "no_match",
      risk_prompt_shown: true,
      user_action: "pause",
    }).verdict,
    "warning"
  );

  assert.deepEqual(
    scoreBankingRisk({
      scenario_type: "remote_access_warning",
      user_selected_context: "caller_requested_remote_access",
      risk_prompt_shown: true,
      user_action: "request_review",
      forbiddenPayloadAttempt: true,
    }).verdict,
    "critical"
  );
});

test("banking risk recommendations never make fraud or scam claims", () => {
  for (const recommendation of Object.values(BANKING_RECOMMENDATIONS)) {
    for (const forbidden of FORBIDDEN_CLAIM_WORDS) {
      assert.equal(
        recommendation.includes(forbidden),
        false,
        `${recommendation} used ${forbidden}`
      );
    }
  }
});
