import test from "node:test";
import assert from "node:assert/strict";
import { validateBankingScenarioPayload } from "../../../src/bankingPilot/bankingScenarioPolicy.js";

const VALID_SCOPE_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test("accepts all five valid Phase A synthetic scenarios", () => {
  const validPayloads = [
    {
      scenario_type: "mock_cdr_consent",
      submit_intent: true,
      consent_scope_hash: VALID_SCOPE_HASH,
      consent_duration_category: "one_time",
      withdrawal_option_shown: true,
    },
    {
      scenario_type: "mock_confirmation_of_payee",
      mock_cop_result_category: "match",
      risk_prompt_shown: true,
      user_action: "continue",
    },
    {
      scenario_type: "remote_access_warning",
      user_selected_context: "caller_requested_remote_access",
      risk_prompt_shown: true,
      user_action: "request_review",
    },
    { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause" },
    {
      scenario_type: "mock_ai_agent_finance_action",
      agent_action_type: "payment_draft",
      user_decision: "reject",
      financial_payload_recorded_by_simurgh: false,
    },
  ];

  for (const payload of validPayloads) {
    assert.equal(validateBankingScenarioPayload(payload).ok, true);
  }
});

test("rejects unknown extra fields and invalid categories", () => {
  assert.deepEqual(
    validateBankingScenarioPayload({
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
      note: "extra",
    }),
    {
      ok: false,
      reason: "unknown_field",
      field: "note",
    }
  );

  assert.equal(
    validateBankingScenarioPayload({
      scenario_type: "mock_confirmation_of_payee",
      mock_cop_result_category: "definitely_match",
      risk_prompt_shown: true,
      user_action: "continue",
    }).reason,
    "invalid_category"
  );
});

test("rejects invalid scenario type and weak consent scope hashes", () => {
  assert.equal(
    validateBankingScenarioPayload({ scenario_type: "real_payment" }).reason,
    "invalid_scenario_type"
  );

  for (const consent_scope_hash of [
    "sha256:abc",
    "sha256:E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  ]) {
    assert.equal(
      validateBankingScenarioPayload({
        scenario_type: "mock_cdr_consent",
        submit_intent: true,
        consent_scope_hash,
        consent_duration_category: "one_time",
        withdrawal_option_shown: true,
      }).reason,
      "invalid_consent_scope_hash"
    );
  }
});

test("AI-agent scenario requires financial_payload_recorded_by_simurgh to be false boolean", () => {
  const base = {
    scenario_type: "mock_ai_agent_finance_action",
    agent_action_type: "payment_draft",
    user_decision: "reject",
  };

  assert.equal(
    validateBankingScenarioPayload({
      ...base,
      financial_payload_recorded_by_simurgh: false,
    }).ok,
    true
  );
  assert.equal(
    validateBankingScenarioPayload({
      ...base,
      financial_payload_recorded_by_simurgh: true,
    }).reason,
    "invalid_privacy_assertion"
  );
  assert.equal(
    validateBankingScenarioPayload({
      ...base,
      financial_payload_recorded_by_simurgh: "false",
    }).reason,
    "invalid_privacy_assertion"
  );
  assert.equal(validateBankingScenarioPayload(base).reason, "missing_required_field");
});
