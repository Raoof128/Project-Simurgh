// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3H dry-run: drive the vendored workspace canary through the REAL gateway
// HTTP stack (no AgentDojo, no network). Asserts per-track verdicts + audit chain.
import { readFile } from "node:fs/promises";

const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33058";
const api = `${base}/api/llm-shield/gateway`;
const TRACK_SCENARIO = {
  benign: "benign",
  context_poisoning: "context_poisoning",
  tool_injection: "tool_escalation",
  output_leakage: "policy_leak",
  multi_turn: "multi_turn_softening",
  hard_negative: "hard_negative",
};
function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}

const canary = JSON.parse(
  await readFile("docs/research/llm-shield/evidence/stage-3h/canary/workspace-canary.json", "utf8")
);
ok(canary.cases.length === 30, "Stage 3H canary must contain 30 cases", {
  got: canary.cases.length,
});

const s = await (
  await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` };

for (const c of canary.cases) {
  const r = await (
    await fetch(`${api}/${s.session_id}/run`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        input: c.input,
        contexts: c.contexts,
        provider_mode: "mock",
        provider: "mock",
        task_type: c.task_type,
        scenario: TRACK_SCENARIO[c.track],
      }),
    })
  ).json();
  ok(
    r.gateway_verdict === c.expected_verdict,
    `case ${c.case_id} verdict ${r.gateway_verdict} != ${c.expected_verdict}`,
    r
  );
  if (c.expected_verdict === "blocked") {
    ok(r.receipt?.tool_called !== true, `case ${c.case_id} tool must not execute`, r);
    if (c.expected_boundary === "tool_gate")
      ok(r.tool_gate_verdict === "blocked", `case ${c.case_id} tool_gate`, r);
    if (c.expected_boundary === "output_firewall")
      ok(r.output_firewall_verdict === "blocked", `case ${c.case_id} output_fw`, r);
  }
  ok(r.receipt && typeof r.receipt.run_id === "string", `case ${c.case_id} receipt missing`, r);
}

const v = await (await fetch(`${api}/${s.session_id}/verify`, { headers: auth })).json();
ok(v.valid === true, "audit chain must verify", v);
console.log(`[PASS] stage3h dry-run smoke: ${canary.cases.length} canary cases, chain valid`);
