import test from "node:test";
import assert from "node:assert/strict";
import { createChain, appendEntry, verifyChain } from "../../src/audit/hmacChain.js";
import {
  BANKING_PILOT_EVENTS,
  buildRejectedAttemptAuditPayload,
} from "../../src/bankingPilot/bankingAudit.js";
import { containsForbiddenBankingFieldDeep } from "../../src/bankingPilot/forbiddenBankingFields.js";
import { validateBankingScenarioPayload } from "../../src/bankingPilot/bankingScenarioPolicy.js";
import { buildBankingNarrativePayload } from "../../src/bankingPilot/bankingNarrativeSanitiser.js";

test("security audit: forbidden banking fields are detected recursively", () => {
  const attacks = [
    { account_number: "111111" },
    { nested: { otp: "123456" } },
    { rows: [{ card_number: "4111111111111111" }] },
    { transaction_amount: "99.00" },
    { payee_name: "MockSensitivePayee" },
    { payment_reference: "REF-SECRET" },
    { window_title: "Mock Bank Window" },
    { process_name: "remote-support-app" },
    { remote_app_name: "AnyDesk Example" },
  ];

  for (const attack of attacks) {
    assert.ok(containsForbiddenBankingFieldDeep(attack));
  }
});

test("security audit: rejected attempt audit payload stores field name only", () => {
  const payload = buildRejectedAttemptAuditPayload({
    route: "submit",
    reason: "forbidden_banking_field",
    fieldName: "otp",
  });

  assert.deepEqual(payload, {
    route: "submit",
    reason: "forbidden_banking_field",
    field_name: "otp",
  });
  assert.equal(JSON.stringify(payload).includes("VerySecretOtp"), false);
});

test("security audit: invalid scenario and privacy assertion are rejected", () => {
  assert.equal(
    validateBankingScenarioPayload({ scenario_type: "real_payment" }).reason,
    "invalid_scenario_type"
  );
  assert.equal(
    validateBankingScenarioPayload({
      scenario_type: "mock_ai_agent_finance_action",
      agent_action_type: "payment_draft",
      user_decision: "reject",
      financial_payload_recorded_by_simurgh: true,
    }).reason,
    "invalid_privacy_assertion"
  );
});

test("security audit: Sonnet payload does not carry sensitive fields", () => {
  const payload = buildBankingNarrativePayload({
    banking_session_id: "bp_security",
    scenario: {
      scenario_type: "remote_access_warning",
      user_action: "request_review",
      otp: "VerySecretOtp",
      process_name: "remote-support-app",
    },
    risk: {
      risk_score: 75,
      verdict: "critical",
      risk_categories: ["remote_access_context"],
      manual_review_required: true,
    },
    privacy_assertions: {
      credential_recorded_by_simurgh: false,
      account_identifier_recorded_by_simurgh: false,
      transaction_content_recorded_by_simurgh: false,
    },
  });

  const text = JSON.stringify(payload);
  assert.equal(text.includes("VerySecretOtp"), false);
  assert.equal(text.includes("process_name"), false);
});

test("security audit: tampered HMAC chain fails verification", () => {
  const chain = createChain();
  const key = "security-audit-key";
  appendEntry(chain, key, BANKING_PILOT_EVENTS.CONSENT_ACCEPTED, {});
  appendEntry(chain, key, BANKING_PILOT_EVENTS.SCENARIO_SUBMITTED, {
    scenario_type: "mock_payment_pause",
  });
  assert.equal(verifyChain(chain, key).valid, true);
  chain.entries[1].payload.scenario_type = "tampered";
  assert.equal(verifyChain(chain, key).valid, false);
});
