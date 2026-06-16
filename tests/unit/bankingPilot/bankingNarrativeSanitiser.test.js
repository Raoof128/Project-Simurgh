// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildBankingNarrativePayload } from "../../../src/bankingPilot/bankingNarrativeSanitiser.js";

test("buildBankingNarrativePayload emits metadata only", () => {
  const payload = buildBankingNarrativePayload({
    banking_session_id: "bp_test",
    participant_code_hash: "hmac-sha256:abc",
    scenario: {
      scenario_type: "mock_confirmation_of_payee",
      mock_cop_result_category: "close_match",
      user_action: "pause",
      payee_name: "MockSensitivePayee",
      otp: "VerySecretOtp",
    },
    risk: {
      risk_score: 45,
      verdict: "warning",
      risk_categories: ["payment_redirection_context", "risk_prompt_shown"],
      manual_review_required: true,
    },
    privacy_assertions: {
      credential_recorded_by_simurgh: false,
      account_identifier_recorded_by_simurgh: false,
      transaction_content_recorded_by_simurgh: false,
      sonnet_received_sensitive_payload: false,
    },
  });

  assert.deepEqual(Object.keys(payload).sort(), [
    "manual_review_required",
    "privacy_assertions",
    "risk_categories",
    "risk_score",
    "scenario_type",
    "session_id_hash",
    "user_action_category",
    "verdict",
  ]);
  assert.equal(payload.scenario_type, "mock_confirmation_of_payee");
  assert.equal(payload.user_action_category, "pause");
  const serialised = JSON.stringify(payload);
  assert.equal(serialised.includes("MockSensitivePayee"), false);
  assert.equal(serialised.includes("VerySecretOtp"), false);
  assert.equal(serialised.includes("payee_name"), false);
  assert.equal(serialised.includes("otp"), false);
});
