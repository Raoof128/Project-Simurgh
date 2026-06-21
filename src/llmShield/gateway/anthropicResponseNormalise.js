// SPDX-License-Identifier: AGPL-3.0-or-later
// Convert an Anthropic Messages API response into the gateway `raw` shape that the
// sealed normaliseProviderOutput/tool-gate/output-firewall tail already consumes.
// Tool-use blocks are sanitized to hashed metadata; raw tool input never persists.
import { hashPrompt } from "../promptNormalise.js";

function bucketTokens(n) {
  if (!Number.isFinite(n)) return "unknown";
  return n <= 1000 ? "0-1k" : n <= 4000 ? "1k-4k" : "4k+";
}

export function normaliseAnthropicResponse(apiResponse = {}) {
  const content = Array.isArray(apiResponse.content) ? apiResponse.content : [];
  const usage = {
    input_tokens_bucket: bucketTokens(apiResponse?.usage?.input_tokens),
    output_tokens_bucket: bucketTokens(apiResponse?.usage?.output_tokens),
  };
  const base = {
    provider: "anthropic",
    provider_mode: "live",
    provider_called: true,
    network_egress_used: true,
    output_text: "",
    tool_request: null,
    usage,
    latency_bucket: "250ms-1s",
    error_code: null,
    provider_model_hash: null,
    provider_request_shape_hash: null,
  };

  const toolBlock = content.find((b) => b?.type === "tool_use");
  if (toolBlock) {
    return {
      ...base,
      provider_response_kind: "tool_request",
      tool_request: {
        tool_name: String(toolBlock.name ?? ""),
        tool_class: "unknown",
        args_hash: hashPrompt(JSON.stringify(toolBlock.input ?? {})),
      },
    };
  }

  const text = content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");

  if (text.length === 0)
    return {
      ...base,
      provider_response_kind: "error",
      error_code: "gateway_provider_empty_response",
    };

  const kind = apiResponse.stop_reason === "refusal" ? "refusal" : "text";
  return { ...base, provider_response_kind: kind, output_text: text };
}

// Branch on stop_reason ONLY (stop_details is informational and can be null).
export function isRefusal(apiResponse = {}) {
  return apiResponse.stop_reason === "refusal";
}

// Null-safe, metadata-only refusal shape per the Fable 5 refusal contract. The
// explanation text is unstable, so it is hashed and never stored raw or parsed.
export function normaliseRefusal(apiResponse = {}) {
  const sd = apiResponse.stop_details;
  const present = sd != null && typeof sd === "object";
  const category = present && typeof sd.category === "string" ? sd.category : null;
  const explanation = present && typeof sd.explanation === "string" ? sd.explanation : null;
  return {
    stop_reason: apiResponse.stop_reason === "refusal" ? "refusal" : (apiResponse.stop_reason ?? null),
    stop_details_present: present,
    stop_details_type: present && typeof sd.type === "string" ? sd.type : null,
    refusal_category: category,
    refusal_explanation_recorded: false,
    refusal_explanation_hash: explanation ? hashPrompt(explanation) : null,
  };
}
