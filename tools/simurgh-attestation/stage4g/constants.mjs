// SPDX-License-Identifier: AGPL-3.0-or-later

export const CAMPAIGN_DOMAIN = "SIMURGH_CAMPAIGN_V1\0";
export const CAMPAIGN_RECORD_DOMAIN = "SIMURGH_CAMPAIGN_RECORD_V1\0";

export const STAGE4G_EVIDENCE_DIR =
  "docs/research/llm-shield/evidence/stage-4g-adaptive-red-team-campaign";

export const ATTACK_CLASSES = Object.freeze(["I", "II", "III", "IV"]);
export const VERDICTS = Object.freeze([
  "caught",
  "escaped",
  "out_of_scope",
  "aborted",
  "verifier_failed",
]);
export const RECORD_TYPES = Object.freeze(["EP", "CR", "abort"]);

export const LIMITS = Object.freeze({
  maxCampaignBytes: 2_000_000,
  maxRecordBytes: 200_000,
  maxAttempts: 128,
  maxReasonCodes: 32,
  maxStringLength: 512,
});

export const FAILURE_REASONS = Object.freeze([
  "campaign_signature_invalid",
  "campaign_hash_mismatch",
  "campaign_merkle_root_mismatch",
  "missing_attempt",
  "duplicate_attempt",
  "extra_attempt",
  "record_signature_invalid",
  "record_hash_mismatch",
  "class_mismatch",
  "verdict_mismatch",
  "policy_hash_mismatch",
  "driver_hash_mismatch",
  "attempt_schedule_mismatch",
  "class_ii_verifier_deception_passed",
  "boundary_escape_hidden",
  "network_required_error",
  "provider_required_error",
  "browser_required_error",
  "privacy_leak_detected",
  "oversized_campaign",
  "golden_mismatch",
]);
