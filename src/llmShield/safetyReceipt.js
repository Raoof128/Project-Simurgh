// SPDX-License-Identifier: AGPL-3.0-or-later
// Metadata-only safety receipt: hashes, verdict, reason codes — never raw text.
// Mirrors bankingAiPrivacyReceipt.js. The receipt attests process, not ground
// truth: "the configured boundary classified/blocked/logged these events".
import crypto from "node:crypto";

export const RECEIPT_TYPE = "simurgh.llm_safety_receipt.v1";
export const RECEIPT_SCHEMA_VERSION = "3C";

export function hashReceipt(receipt) {
  return "sha256:" + crypto.createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
}

function base({ sessionIdHash, runId, inputHash, normalisedInputHash, auditEntryHash, timestamp }) {
  return {
    type: RECEIPT_TYPE,
    schema_version: RECEIPT_SCHEMA_VERSION,
    session_id_hash: sessionIdHash,
    run_id: runId,
    input_hash: inputHash,
    normalised_input_hash: normalisedInputHash,
    source_labels: ["user_input"],
    privacy_mode: "metadata_only",
    network_egress_used: false,
    timestamp,
    audit_entry_hash: auditEntryHash,
  };
}

export function buildSafeReceipt(args) {
  return {
    ...base(args),
    detected_attack_classes: [],
    verdict: "safe",
    model_called: true,
    reason_codes: [],
  };
}

export function buildBlockedReceipt(args) {
  const { reasonCodes = [], detectedAttackClasses = [], signals = [] } = args;
  return {
    ...base(args),
    detected_attack_classes: detectedAttackClasses,
    verdict: "blocked",
    model_called: false,
    reason_codes: reasonCodes,
    signals,
  };
}

export function buildWarningReceipt(args) {
  const { reasonCodes = [], detectedAttackClasses = [], signals = [] } = args;
  return {
    ...base(args),
    detected_attack_classes: detectedAttackClasses,
    verdict: "warning",
    risk_tier: "warning",
    model_called: true,
    reason_codes: reasonCodes,
    signals,
  };
}
