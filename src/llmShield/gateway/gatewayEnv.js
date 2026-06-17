// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E-core provider-mode env gate. Fail-closed: default mock, no network.
// `live` is recognised as a contract but ALWAYS rejected in core (no adapter).
import { GATEWAY_PROVIDER_MODES, GATEWAY_PROVIDERS_CORE } from "./providerTypes.js";

export function resolveGatewayEnv(env = process.env) {
  const providerMode = env.SIMURGH_GATEWAY_PROVIDER_MODE || "mock";
  const liveEnabled = env.SIMURGH_LIVE_PROVIDER_ENABLED === "true";
  const provider = env.SIMURGH_LLM_PROVIDER || "mock";
  return {
    provider_mode: providerMode,
    live_provider_enabled: liveEnabled,
    provider,
    // Core never allows egress regardless of flags — no adapter exists.
    network_egress_allowed: false,
  };
}

export function validateProviderSelection({ providerMode, provider }) {
  if (!GATEWAY_PROVIDER_MODES.includes(providerMode)) {
    return { ok: false, reason: "gateway_provider_mode_invalid" };
  }
  if (providerMode === "live") {
    return { ok: false, reason: "gateway_live_provider_not_implemented" };
  }
  if (!GATEWAY_PROVIDERS_CORE.includes(provider)) {
    return { ok: false, reason: "gateway_provider_not_allowed" };
  }
  return { ok: true };
}

// Stage 3E-live: the router uses gatewayEnv as its single env entry point.
// validateProviderSelection still hard-rejects `live` (defence in depth for any
// caller that does not branch); the router branches to evaluateLiveProvider first.
export { evaluateLiveProvider } from "./liveProviderGuard.js";
