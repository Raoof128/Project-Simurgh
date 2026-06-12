import crypto from "node:crypto";

export function hashNarrative(narrative) {
  return "sha256:" + crypto.createHash("sha256").update(JSON.stringify(narrative)).digest("hex");
}

export function buildEnabledReceipt({ narrative, officialResultUnchanged, claimGuardPassed }) {
  return {
    stage: "B4-A",
    provider: "deterministic_mock",
    ai_privacy_layer_enabled: true,
    input_contract_version: "1.0",
    output_contract_version: "1.0",
    input_firewall_passed: true,
    output_claim_firewall_passed: true,
    sensitive_payload_sent_to_ai: false,
    network_egress_used: false,
    official_result_unchanged: officialResultUnchanged,
    claim_guard_passed: claimGuardPassed,
    privacy_assertions_preserved: true,
    narrative_generated: true,
    narrative_hash: hashNarrative(narrative),
  };
}

export function buildDisabledReceipt(blockedReason) {
  return {
    ai_privacy_layer_enabled: false,
    provider: "deterministic_mock",
    network_egress_used: false,
    sensitive_payload_sent_to_ai: false,
    narrative_generated: false,
    blocked_reason: blockedReason,
  };
}

export function buildFirewallFailedReceipt({ gate, inputFirewallPassed = true }) {
  return {
    stage: "B4-A",
    provider: "deterministic_mock",
    ai_privacy_layer_enabled: true,
    input_contract_version: "1.0",
    output_contract_version: "1.0",
    input_firewall_passed: inputFirewallPassed,
    output_claim_firewall_passed: false,
    sensitive_payload_sent_to_ai: false,
    network_egress_used: false,
    official_result_unchanged: gate !== "official_result",
    claim_guard_passed: gate !== "claim_guard",
    privacy_assertions_preserved: true,
    narrative_generated: false,
    blocked_reason: "firewall_failed",
    failed_gate: gate,
  };
}
