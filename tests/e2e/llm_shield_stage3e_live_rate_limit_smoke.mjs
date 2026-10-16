// SPDX-License-Identifier: AGPL-3.0-or-later
// Retirement takes precedence over the historical zero-cap ledger before any
// provider call. No network.
import { startServer, newSession, ok } from "./_live_server.mjs";

const { base, stop } = await startServer({
  SIMURGH_GATEWAY_PROVIDER_MODE: "live",
  SIMURGH_LIVE_PROVIDER_ENABLED: "true",
  SIMURGH_LLM_PROVIDER: "anthropic",
  SIMURGH_LIVE_PROVIDER_MODEL: "claude-x",
  ANTHROPIC_API_KEY: "sk-test",
  SIMURGH_LIVE_MAX_CALLS_PER_SESSION: "0",
});
try {
  const { api, sessionId, auth } = await newSession(base);
  const response = await fetch(`${api}/${sessionId}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ provider_mode: "live", input: "hi" }),
  });
  const r = await response.json();
  ok(
    response.status === 410 && r.error === "legacy_live_gateway_retired",
    "legacy configuration must never re-enable the retired endpoint",
    r
  );
  console.log("[PASS] stage3e live rate-limit smoke");
} finally {
  stop();
}
