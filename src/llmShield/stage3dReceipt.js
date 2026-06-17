// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3D metadata-only safety receipt. Reuses the v1 receipt type with a new
// schema_version "3D" and adds the containment-boundary verdicts (context, tool,
// output, risk). Never carries raw text — hashes and enum codes only. Leaves the
// 3A/3B/3C safetyReceipt.js untouched so the frozen benchmark does not drift.
import { hashReceipt } from "./safetyReceipt.js";

export const RECEIPT_TYPE = "simurgh.llm_safety_receipt.v1";
export const STAGE3D_SCHEMA_VERSION = "3D";

export const hashStage3dReceipt = hashReceipt;

export function buildStage3dReceipt(args) {
  const {
    sessionIdHash,
    runId,
    taskType,
    inputHash,
    normalisedInputHash,
    inputVerdict,
    contextVerdict,
    contextCount = 0,
    contextHashes = [],
    providerCalled,
    scenario,
    toolGateVerdict,
    toolNameHash = null,
    outputFirewallVerdict,
    outputHash,
    riskScore,
    riskVerdict,
    reasonCodes = [],
    auditEntryHash,
    timestamp,
  } = args;

  return {
    type: RECEIPT_TYPE,
    schema_version: STAGE3D_SCHEMA_VERSION,
    session_id_hash: sessionIdHash,
    run_id: runId,
    task_type: taskType,
    input_hash: inputHash,
    normalised_input_hash: normalisedInputHash,
    input_verdict: inputVerdict,
    context_verdict: contextVerdict,
    context_count: contextCount,
    context_hashes: contextHashes,
    provider_called: providerCalled,
    provider_mode: "mock",
    scenario,
    tool_gate_verdict: toolGateVerdict,
    tool_called: false,
    tool_name_hash: toolNameHash,
    output_firewall_verdict: outputFirewallVerdict,
    output_hash: outputHash,
    risk_score: riskScore,
    risk_verdict: riskVerdict,
    reason_codes: reasonCodes,
    source_labels: ["user_input", "context"],
    privacy_mode: "metadata_only",
    network_egress_used: false,
    timestamp,
    audit_entry_hash: auditEntryHash,
  };
}
