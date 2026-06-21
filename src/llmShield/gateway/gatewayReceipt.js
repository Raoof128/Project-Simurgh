// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E metadata-only gateway receipt. New type + schema_version "3E"; reuses
// hashReceipt. Leaves safetyReceipt.js and stage3dReceipt.js untouched. Hashes and
// enum codes only — never raw input/context/output/provider body/keys.
import { hashReceipt } from "../safetyReceipt.js";

export const GATEWAY_RECEIPT_TYPE = "simurgh.llm_gateway_receipt.v1";
export const GATEWAY_SCHEMA_VERSION = "3E";
export const hashGatewayReceipt = hashReceipt;

export function buildGatewayReceipt(a) {
  return {
    type: GATEWAY_RECEIPT_TYPE,
    schema_version: GATEWAY_SCHEMA_VERSION,
    session_id_hash: a.sessionIdHash,
    run_id: a.runId,
    task_type: a.taskType,
    input_hash: a.inputHash,
    normalised_input_hash: a.normalisedInputHash,
    context_verdict: a.contextVerdict,
    context_hashes: a.contextHashes ?? [],
    gateway_verdict: a.gatewayVerdict,
    provider_mode: a.providerMode,
    provider: a.provider,
    provider_called: a.providerCalled,
    provider_response_kind: a.providerResponseKind,
    provider_response_hash: a.providerResponseHash,
    network_egress_used: a.networkEgressUsed === true,
    tool_gate_verdict: a.toolGateVerdict,
    tool_called: false,
    tool_name_hash: a.toolNameHash ?? null,
    output_firewall_verdict: a.outputFirewallVerdict,
    output_hash: a.outputHash,
    risk_score: a.riskScore,
    risk_verdict: a.riskVerdict,
    latency_bucket: a.latencyBucket,
    input_token_bucket: a.inputTokenBucket,
    output_token_bucket: a.outputTokenBucket,
    reason_codes: a.reasonCodes ?? [],
    privacy_mode: "metadata_only",
    raw_provider_transcript_recorded: false,
    raw_context_recorded: false,
    raw_tool_args_recorded: false,
    api_key_recorded: false,
    ...(a.live
      ? {
          provider_model_hash: a.live.provider_model_hash ?? null,
          provider_request_shape_hash: a.live.provider_request_shape_hash ?? null,
          live_provider_response_kind: a.live.provider_response_kind ?? null,
          live_context_mode: a.live.live_context_mode ?? "none",
          live_context_sent: a.live.live_context_sent === true,
          raw_provider_transcript_recorded: false,
          provider_request_body_recorded: false,
          provider_response_body_recorded: false,
          api_key_recorded: false,
          provider_side_tools_enabled: false,
          sdk_tool_runner_used: false,
          prompt_cache_enabled: a.live.prompt_cache_enabled === true,
          live_test_required_for_ci: false,
        }
      : {}),
    fallback_used: a.fallbackUsed === true,
    fallback_on_refusal_enabled: a.fallbackOnRefusalEnabled === true,
    fallback_chain: a.fallbackChain ?? [],
    fallback_budget: a.fallbackBudget ?? null,
    fallback_terminal_reason: a.fallbackTerminalReason ?? null,
    timestamp: a.timestamp,
    audit_entry_hash: a.auditEntryHash,
  };
}
