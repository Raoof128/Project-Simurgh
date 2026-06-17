// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33055";
const api = `${base}/api/llm-shield/gateway`;
function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}
const s = await (
  await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` };
const r = await (
  await fetch(`${api}/${s.session_id}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      input: "do the task",
      provider_mode: "recorded_fixture",
      provider: "recorded_fixture",
      case_id: "3e_tool_001",
    }),
  })
).json();
ok(r.tool_gate_verdict === "blocked", "provider tool-shaped output must be blocked", r);
ok(r.receipt?.tool_called === false, "tool never executed", r);
console.log("[PASS] stage3e tool request smoke");
