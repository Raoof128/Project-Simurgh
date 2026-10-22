// SPDX-License-Identifier: AGPL-3.0-or-later
// Retirement holds with legacy enablement and no provider key:
// no network. Boots its own server with the scenario env.
import { startServer, newSession, ok } from "./_live_server.mjs";

const { base, stop } = await startServer({
  SIMURGH_GATEWAY_PROVIDER_MODE: "live",
  SIMURGH_LIVE_PROVIDER_ENABLED: "true",
  SIMURGH_LLM_PROVIDER: "anthropic",
  SIMURGH_LIVE_PROVIDER_MODEL: "claude-x",
  ANTHROPIC_API_KEY: "",
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
  console.log("[PASS] stage3e live missing-key smoke");
} finally {
  stop();
}
