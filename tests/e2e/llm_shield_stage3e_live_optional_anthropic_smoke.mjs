// SPDX-License-Identifier: AGPL-3.0-or-later
// Maintained retirement check. Historical flags cannot reactivate the live HTTP route.
import { startServer, newSession, ok } from "./_live_server.mjs";
const { base, stop } = await startServer({
  SIMURGH_GATEWAY_PROVIDER_MODE: "live",
  SIMURGH_LIVE_PROVIDER_ENABLED: "true",
  SIMURGH_LLM_PROVIDER: "anthropic",
  SIMURGH_LIVE_PROVIDER_MODEL: "claude-x",
  ANTHROPIC_API_KEY: "sk-test",
});
try {
  const { api, sessionId, auth } = await newSession(base);
  const response = await fetch(`${api}/${sessionId}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ provider_mode: "live", input: "hi" }),
  });
  const body = await response.json();
  ok(
    response.status === 410 && body.error === "legacy_live_gateway_retired",
    "retired live contract",
    body
  );
  console.log("[PASS] retired live route: optional_anthropic");
} finally {
  stop();
}
