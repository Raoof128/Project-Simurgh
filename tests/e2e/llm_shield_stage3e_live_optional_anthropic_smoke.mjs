// SPDX-License-Identifier: AGPL-3.0-or-later
// Former live-provider entry point. Retirement is unconditional, including opt-in.
// Use a synthetic value; never load a real key or issue a provider request.
import { startServer, newSession, ok } from "./_live_server.mjs";
const { base, stop } = await startServer({
  SIMURGH_RUN_LIVE_PROVIDER_TESTS: "true",
  SIMURGH_LIVE_PROVIDER_ENABLED: "true",
  SIMURGH_GATEWAY_PROVIDER_MODE: "live",
  SIMURGH_LLM_PROVIDER: "anthropic",
  SIMURGH_LIVE_PROVIDER_MODEL: "synthetic-model",
  ANTHROPIC_API_KEY: "synthetic-unused-value",
});
try {
  const { api, sessionId, auth } = await newSession(base);
  const response = await fetch(`${api}/${sessionId}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ provider_mode: "live", input: "hello" }),
  });
  const result = await response.json();
  ok(
    response.status === 410 && result.error === "legacy_live_gateway_retired",
    "even explicit legacy opt-in must remain retired",
    result
  );
  console.log("[PASS] stage3e legacy live opt-in remains retired (no provider call)");
} finally {
  stop();
}
