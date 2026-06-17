// SPDX-License-Identifier: AGPL-3.0-or-later
// The ONLY place the Anthropic SDK is imported, and only dynamically, only after
// liveProviderGuard has approved the call. No tools, no streaming, no auto-retry.
// Raw request/response never logged or returned; output is length-capped.
import { buildAnthropicMessageRequest } from "./anthropicMessageBuild.js";
import { normaliseAnthropicResponse } from "./anthropicResponseNormalise.js";

async function defaultClientFactory(apiKey) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({ apiKey });
}

export async function generateAnthropicOutput({
  model,
  safeInput,
  providerSafeContext,
  apiKey,
  limits,
  signal,
  __clientFactory = defaultClientFactory,
}) {
  const { request, requestShapeHash, modelHash } = buildAnthropicMessageRequest({
    model,
    safeInput,
    providerSafeContext,
    promptCacheEnabled: limits?.promptCacheEnabled === true,
  });
  // Enforce the timeout ourselves when the caller doesn't supply a signal, so
  // SIMURGH_LIVE_TIMEOUT_MS is real, not decorative.
  const controller = signal ? null : new AbortController();
  const activeSignal = signal ?? controller.signal;
  const timer = controller
    ? setTimeout(() => controller.abort(), limits?.timeoutMs ?? 20000)
    : null;
  try {
    const client = await __clientFactory(apiKey);
    const apiResponse = await client.messages.create(request, { signal: activeSignal });
    const raw = normaliseAnthropicResponse(apiResponse);
    if (typeof raw.output_text === "string" && limits?.maxOutputChars)
      raw.output_text = raw.output_text.slice(0, limits.maxOutputChars);
    raw.provider_model_hash = modelHash;
    raw.provider_request_shape_hash = requestShapeHash;
    return raw;
  } catch (e) {
    const aborted = e?.name === "AbortError";
    return {
      provider: "anthropic",
      provider_mode: "live",
      provider_called: true,
      network_egress_used: true,
      provider_response_kind: "error",
      output_text: "",
      tool_request: null,
      usage: { input_tokens_bucket: "unknown", output_tokens_bucket: "unknown" },
      latency_bucket: aborted ? "timeout" : "unknown",
      error_code: aborted ? "gateway_live_timeout" : "gateway_provider_error",
      provider_model_hash: modelHash,
      provider_request_shape_hash: requestShapeHash,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
