// SPDX-License-Identifier: AGPL-3.0-or-later
export const RECEIPT_DOMAIN = "SIMURGH_RECEIPT_V1\0";
export const PACK_DOMAIN = "SIMURGH_EVIDENCE_PACK_V1\0";
export const ZERO_HASH = "0".repeat(64);

export const LIMITS = Object.freeze({
  maxReceiptsPerPack: 1000,
  maxReceiptBytes: 16384,
  maxReplayMaterialBytesPerAction: 32768,
  maxPackBytes: 10485760,
  maxStringLength: 8192,
  maxObservationLogBytes: 1048576,
});

export const FAILURE_REASONS = Object.freeze({
  schemaInvalid: "schema_invalid",
  packHashMismatch: "pack_hash_mismatch",
  packSignatureInvalid: "pack_signature_invalid",
  embeddedKeyMismatch: "embedded_key_mismatch",
  receiptHashMismatch: "receipt_hash_mismatch",
  receiptSignatureInvalid: "receipt_signature_invalid",
  chainBreak: "chain_break",
  merkleRootMismatch: "merkle_root_mismatch",
  observationLogRootMismatch: "observation_log_root_mismatch",
  missingReceiptForObservedAction: "missing_receipt_for_observed_action",
  extraReceiptWithoutObservation: "extra_receipt_without_observation",
  duplicateActionId: "duplicate_action_id",
  nonContiguousStepIndex: "non_contiguous_step_index",
  policyHashMismatch: "policy_hash_mismatch",
  sinkRegistryHashMismatch: "sink_registry_hash_mismatch",
  consequenceLatticeHashMismatch: "consequence_lattice_hash_mismatch",
  resolvedArgsDigestMismatch: "resolved_args_digest_mismatch",
  policyFeaturesDigestMismatch: "policy_features_digest_mismatch",
  taintDigestMismatch: "taint_digest_mismatch",
  contextDigestMismatch: "context_digest_mismatch",
  taintAuthorityMismatch: "taint_authority_mismatch",
  integritySummaryMismatch: "integrity_summary_mismatch",
  replayedDecisionMismatch: "replayed_decision_mismatch",
  replayedReasonCodeMismatch: "replayed_reason_code_mismatch",
  privacyLeakDetected: "privacy_leak_detected",
  sizeLimitExceeded: "size_limit_exceeded",
});
