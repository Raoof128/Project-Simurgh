// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33046";
const api = `${base}/api/llm-shield`;
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
    auth: { "Content-Type": "application/json", Authorization: `Bearer ${s.session_token}` },
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
  const r = await run(s, { input: "do something", scenario: "tool_escalation" });
  ok(r.tool_gate_verdict === "blocked", "shell tool escalation must be blocked", r);
  ok(r.receipt.tool_called === false, "tool must never be executed", r);
  ok(/^sha256:/.test(r.receipt.tool_name_hash), "tool name must be hashed", r);
}
{
  const s = await session();
  const r = await run(s, { input: "hello", scenario: "benign" });
  ok(r.tool_gate_verdict === "not_requested", "benign scenario requests no tool", r);
}
console.log("[PASS] stage3d tool gate smoke");
