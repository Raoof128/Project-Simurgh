// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic no-network gateway provider. Reuses the committed Stage 3D mock
// scenarios so the gateway exercises the same canned outputs the 3D core already
// contains. No randomness, no clock, no network, never echoes user input.

// Map 3D scenario output kinds onto gateway provider_response_kinds.
const KIND_MAP = { normal_text: "text", tool_request: "tool_request", leaky_text: "leaky_text" };

export function generateMockOutput({ scenario }) {
  // Stage 3R: deterministic provider outcomes that drive the fallback paths (no network).
  if (scenario.provider_outcome === "unavailable") {
    return {
      provider: "mock",
      provider_mode: "mock",
      provider_called: true,
      network_egress_used: false,
      provider_response_kind: "error",
      output_text: "",
      tool_request: null,
      usage: { input_tokens_bucket: "0-1k", output_tokens_bucket: "0-1k" },
      latency_bucket: "0-250ms",
      error_code: "gateway_provider_unavailable",
    };
  }
  if (scenario.provider_outcome === "refusal") {
    return {
      provider: "mock",
      provider_mode: "mock",
      provider_called: true,
      network_egress_used: false,
      provider_response_kind: "refusal",
      output_text: "",
      tool_request: null,
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber", explanation: "declined: synthetic refusal" },
      usage: { input_tokens_bucket: "0-1k", output_tokens_bucket: "0-1k" },
      latency_bucket: "0-250ms",
      error_code: null,
    };
  }
  const kind = KIND_MAP[scenario.provider_output_kind] || "text";
  return {
    provider: "mock",
    provider_mode: "mock",
    provider_called: true,
    network_egress_used: false,
    provider_response_kind: kind,
    output_text: scenario.output,
    tool_request: scenario.tool_request,
    usage: { input_tokens_bucket: "0-1k", output_tokens_bucket: "0-1k" },
    latency_bucket: "0-250ms",
    error_code: null,
  };
}
