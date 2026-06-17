// SPDX-License-Identifier: AGPL-3.0-or-later
// Optional real-Anthropic smoke. Runs ONLY when SIMURGH_RUN_LIVE_PROVIDER_TESTS=true
// and all required live env vars are set; otherwise SKIPs (exit 0). CI never sets
// these, so CI stays key-free and deterministic. Uses a benign prompt only.
const required = [
  "SIMURGH_RUN_LIVE_PROVIDER_TESTS",
  "SIMURGH_LIVE_PROVIDER_ENABLED",
  "SIMURGH_LLM_PROVIDER",
  "SIMURGH_LIVE_PROVIDER_MODEL",
  "ANTHROPIC_API_KEY",
];
const enabled =
  process.env.SIMURGH_RUN_LIVE_PROVIDER_TESTS === "true" && required.every((k) => process.env[k]);
if (!enabled) {
  console.log("SKIP: live provider env not enabled");
  process.exit(0);
}

const { startServer, newSession, ok } = await import("./_live_server.mjs");
// Inherit the live env already present in process.env (set by the caller).
const { base, stop } = await startServer({
  SIMURGH_GATEWAY_PROVIDER_MODE: "live",
});
try {
  const { api, sessionId, auth } = await newSession(base);
  const r = await (
    await fetch(`${api}/${sessionId}/run`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        provider_mode: "live",
        input: "Say hello in one short sentence.",
      }),
    })
  ).json();
  ok(r.provider_called === true, "live provider should be called", r);
  ok(r.receipt && r.receipt.network_egress_used === true, "receipt must record egress", r.receipt);
  ok(
    r.receipt.raw_provider_transcript_recorded === false,
    "no raw transcript may be recorded",
    r.receipt
  );
  ok(r.receipt.api_key_recorded === false, "no api key may be recorded", r.receipt);

  const v = await (await fetch(`${api}/${sessionId}/verify`, { headers: auth })).json();
  ok(v.valid === true, "audit chain must verify", v);

  console.log("[PASS] stage3e live optional anthropic smoke");
} finally {
  stop();
}
