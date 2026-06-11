import test from "node:test";
import assert from "node:assert/strict";
import { createChain, appendEntry } from "../../../src/audit/hmacChain.js";
import {
  buildBankingReport,
  buildBankingAuditExport,
  buildBankingVerifyExport,
  BANKING_PRIVACY_ASSERTIONS,
} from "../../../src/bankingPilot/bankingReportBuilder.js";
import { BANKING_PILOT_EVENTS } from "../../../src/bankingPilot/bankingAudit.js";

function makeRecord() {
  const hmacKey = "test-hmac-key";
  const auditChain = createChain();
  appendEntry(auditChain, hmacKey, BANKING_PILOT_EVENTS.CONSENT_ACCEPTED, {});
  appendEntry(auditChain, hmacKey, BANKING_PILOT_EVENTS.SCENARIO_SUBMITTED, {
    scenario_type: "mock_payment_pause",
  });
  return {
    banking_session_id: "bp_test",
    participant_code_hash: "hmac-sha256:participant",
    phase: "phase_a_synthetic",
    consent_version: "2026-06-b1-v1",
    accepted: true,
    accepted_at: "2026-06-11T00:00:00.000Z",
    withdrawn: false,
    withdrawn_at: null,
    submitted: true,
    submitted_at: "2026-06-11T00:01:00.000Z",
    scenario_metadata: {
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
    },
    risk: {
      risk_score: 35,
      verdict: "warning",
      risk_categories: ["payment_pause_context"],
      manual_review_required: true,
      manual_review_recommendation: "Manual review recommended. No automatic fraud finding.",
    },
    forbidden_fields_rejected: 0,
    auditChain,
    hmacKey,
  };
}

test("buildBankingReport emits all sensitive privacy assertions as false", () => {
  const report = buildBankingReport(makeRecord());
  assert.equal(report.phase, "phase_a_synthetic");
  assert.equal(report.data_source, "synthetic_test_suite");
  assert.equal(report.audit.chain_valid, true);
  for (const [key, value] of Object.entries(BANKING_PRIVACY_ASSERTIONS)) {
    assert.equal(report.privacy_contract[key], value, `${key} was not false`);
  }
});

test("report, audit, and verify exports do not include raw sensitive values", () => {
  const record = makeRecord();
  appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.FORBIDDEN_FIELD_REJECTED, {
    route: "submit",
    reason: "forbidden_banking_field",
    field_name: "otp",
  });

  const serialised = JSON.stringify([
    buildBankingReport(record),
    buildBankingAuditExport(record),
    buildBankingVerifyExport(record),
  ]);

  assert.equal(serialised.includes("VerySecretOtp"), false);
  assert.equal(serialised.includes("MockSensitivePayee"), false);
  assert.equal(serialised.includes("hmacKey"), false);
  assert.equal(serialised.includes(record.hmacKey), false);
});

test("verify export fails after audit tampering", () => {
  const record = makeRecord();
  assert.equal(buildBankingVerifyExport(record).audit_chain_valid, true);
  record.auditChain.entries[1].payload.scenario_type = "tampered";
  assert.equal(buildBankingVerifyExport(record).audit_chain_valid, false);
});
