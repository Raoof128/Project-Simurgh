// SPDX-License-Identifier: AGPL-3.0-or-later
// Fail-closed live-provider env validation. Never returns the API key — only a
// presence boolean. The single source of truth for whether a live call may proceed.
import { GATEWAY_PROVIDERS_LIVE } from "./providerTypes.js";

const VALID_CONTEXT_MODES = ["none", "minimal_summary"];

export function evaluateLiveProvider(env = process.env) {
  if (env.SIMURGH_LIVE_PROVIDER_ENABLED !== "true")
    return { ok: false, reason: "gateway_live_provider_disabled" };
  const provider = env.SIMURGH_LLM_PROVIDER || "";
  if (!GATEWAY_PROVIDERS_LIVE.includes(provider))
    return { ok: false, reason: "gateway_provider_not_allowed" };
  const model = env.SIMURGH_LIVE_PROVIDER_MODEL || "";
  if (!model) return { ok: false, reason: "gateway_provider_model_missing" };
  if (!env.ANTHROPIC_API_KEY) return { ok: false, reason: "gateway_provider_key_missing" };
  const contextMode = env.SIMURGH_LIVE_CONTEXT_MODE || "minimal_summary";
  if (!VALID_CONTEXT_MODES.includes(contextMode))
    return { ok: false, reason: "gateway_live_context_mode_invalid" };
  return { ok: true, config: { provider, model, contextMode, apiKeyPresent: true } };
}
