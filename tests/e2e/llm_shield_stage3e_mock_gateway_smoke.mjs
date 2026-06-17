// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33055";
const api = `${base}/api/llm-shield/gateway`;
function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}
const session = async () => {
  const s = await (
    await fetch(`${api}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  return {
    id: s.session_id,
    token: s.token,
    auth: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
  };
};
const run = async (s, body) =>
  (
    await fetch(`${api}/${s.id}/run`, {
      method: "POST",
      headers: s.auth,
      body: JSON.stringify(body),
    })
  ).json();

{
  const s = await session();
  const r = await run(s, {
    input: "Summarise widgets.",
    provider_mode: "mock",
    provider: "mock",
    scenario: "benign",
  });
  ok(r.gateway_verdict === "accepted", "benign mock must be accepted", r);
  ok(r.receipt?.schema_version === "3E", "must emit 3E receipt", r);
  ok(r.receipt?.network_egress_used === false, "no egress", r);
}
{
  const s = await session();
  const r = await run(s, {
    input: "do it",
    provider_mode: "mock",
    provider: "mock",
    scenario: "tool_escalation",
  });
  ok(r.tool_gate_verdict === "blocked", "tool escalation blocked", r);
  ok(r.receipt?.tool_called === false, "tool never executed", r);
}
{
  const s = await session();
  const r = await run(s, {
    input: "share config",
    provider_mode: "mock",
    provider: "mock",
    scenario: "policy_leak",
  });
  ok(r.output_firewall_verdict === "blocked", "leak blocked", r);
  ok(!JSON.stringify(r).includes("hidden policy assistant"), "raw output not echoed", r);
}
{
  const s = await session();
  const res = await fetch(`${api}/${s.id}/run`, {
    method: "POST",
    headers: s.auth,
    body: JSON.stringify({ input: "x", provider_mode: "mock", api_key: "sk-x" }),
  });
  const r = await res.json();
  ok(r.ok === false && r.error === "gateway_forbidden_field", "api_key must be rejected", r);
}
{
  const s = await session();
  await run(s, { input: "x", provider_mode: "mock", provider: "mock", scenario: "benign" });
  const v = await (
    await fetch(`${api}/${s.id}/verify`, { headers: { Authorization: `Bearer ${s.token}` } })
  ).json();
  ok(v.valid === true, "chain must verify", v);
}
// openapi route is served by the gateway router
{
  const res = await fetch(`${api}/openapi.json`);
  ok(res.status === 200, "openapi route must return 200", { status: res.status });
  const spec = await res.json();
  ok(/^3\.1/.test(spec.openapi), "openapi route must serve a 3.1 contract", spec.openapi);
}
// allowed mock tool: gate permits (never executes), output scanned + exported
{
  const s = await session();
  const r = await run(s, {
    input: "What is 2 plus 2?",
    provider_mode: "recorded_fixture",
    provider: "recorded_fixture",
    case_id: "3e_allowedtool_001",
  });
  ok(r.tool_gate_verdict === "allowed", "allowed mock tool must be permitted", r);
  ok(r.gateway_verdict === "accepted", "allowed-tool benign run must be accepted", r);
  ok(r.receipt?.tool_called === false, "allowed tool still never executed", r);
}
console.log("[PASS] stage3e mock gateway smoke");
