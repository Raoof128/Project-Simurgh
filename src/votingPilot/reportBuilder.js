import { verifyChain } from "../audit/hmacChain.js";

export function buildPilotReport(record, options = {}) {
  const { dataSource = "researcher_self_pilot", synthetic = false } = options;
  const { valid } = verifyChain(record._chain, record._hmacKey);
  return {
    schema_version: "2026-05-v1",
    pilot_mode: "mq_persian_society_voting_shadow",
    official_vote_impact: false,
    synthetic,
    data_source: dataSource,
    consent: {
      accepted: record.accepted,
      withdrawn: record.withdrawn,
      version: record.consent_version,
    },
    integrity_tier: record.integrity_tier,
    session_result: {
      completed: record._submitted,
      submitted: record._submitted,
      withdrawn: record.withdrawn,
    },
    privacy_contract: {
      ballot_choice_recorded_by_simurgh: false,
      screen_capture_collected: false,
      webcam_audio_collected: false,
      typed_content_collected: false,
      pasted_content_collected: false,
      forbidden_fields_rejected: record._forbidden_fields_rejected,
    },
    device_integrity: {
      daemon_connected: record._daemon_connected,
      daemon_platform: record._daemon_platform,
      proof_accept_count: 0,
      proof_reject_count: 0,
      replay_rejection_count: 0,
      tamper_rejection_count: 0,
    },
    audit: {
      chain_valid: valid,
      event_count: record._chain.entries.length,
    },
  };
}
