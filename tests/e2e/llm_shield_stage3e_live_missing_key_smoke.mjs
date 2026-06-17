// SPDX-License-Identifier: AGPL-3.0-or-later
// Live enabled + provider + model, but no ANTHROPIC_API_KEY -> fail closed,
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
  const r = await (
    await fetch(`${api}/${sessionId}/run`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ provider_mode: "live", input: "hi" }),
    })
  ).json();
  ok(
    r.ok === false && r.error === "gateway_provider_key_missing",
    "missing key must fail closed",
    r
  );
  console.log("[PASS] stage3e live missing-key smoke");
} finally {
  stop();
}
