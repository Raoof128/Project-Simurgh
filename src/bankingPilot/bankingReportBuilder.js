import { verifyChain } from "../audit/hmacChain.js";
import { sanitiseAuditEntry } from "./bankingAudit.js";

export const BANKING_PRIVACY_ASSERTIONS = Object.freeze({
  credential_recorded_by_simurgh: false,
  otp_recorded_by_simurgh: false,
  account_identifier_recorded_by_simurgh: false,
  balance_recorded_by_simurgh: false,
  transaction_amount_recorded_by_simurgh: false,
  payee_recorded_by_simurgh: false,
  payment_reference_recorded_by_simurgh: false,
  transaction_content_recorded_by_simurgh: false,
  screen_capture_recorded_by_simurgh: false,
  webcam_audio_recorded_by_simurgh: false,
  raw_process_or_window_title_recorded_by_simurgh: false,
  remote_access_app_name_recorded_by_simurgh: false,
  banking_payload_recorded_by_simurgh: false,
  sonnet_received_sensitive_payload: false,
});

function chainResult(record) {
  return verifyChain(record.auditChain, record.hmacKey);
}

export function buildBankingReport(record) {
  const { valid } = chainResult(record);
  return {
    schema_version: "2026-06-b1-v1",
    pilot_mode: "banking_shield_phase_a_synthetic",
    phase: "phase_a_synthetic",
    synthetic: true,
    human_participant: false,
    data_source: "synthetic_test_suite",
    banking_session_id: record.banking_session_id,
    consent: {
      accepted: record.accepted,
      withdrawn: record.withdrawn,
      version: record.consent_version,
    },
    session_result: {
      submitted: record.submitted,
      withdrawn: record.withdrawn,
      scenario_type: record.scenario_metadata?.scenario_type ?? null,
    },
    risk: record.risk,
    privacy_contract: {
      ...BANKING_PRIVACY_ASSERTIONS,
      forbidden_fields_rejected: record.forbidden_fields_rejected,
    },
    audit: {
      chain_valid: valid,
      event_count: record.auditChain.entries.length,
    },
  };
}

export function buildBankingAuditExport(record) {
  const { valid, errors } = chainResult(record);
  return {
    schema_version: "2026-06-b1-audit-v1",
    phase: "phase_a_synthetic",
    banking_session_id: record.banking_session_id,
    chain_valid: valid,
    errors,
    entries: record.auditChain.entries.map(sanitiseAuditEntry),
  };
}

export function buildBankingVerifyExport(record) {
  const { valid, errors } = chainResult(record);
  return {
    schema_version: "2026-06-b1-verify-v1",
    phase: "phase_a_synthetic",
    banking_session_id: record.banking_session_id,
    audit_chain_valid: valid,
    event_count: record.auditChain.entries.length,
    errors,
  };
}
