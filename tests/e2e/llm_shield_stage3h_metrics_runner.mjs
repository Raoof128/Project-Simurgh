// SPDX-License-Identifier: AGPL-3.0-or-later
// Drives the canary through the gateway (BASE arg), writes metrics.json + run manifest.
// --verify-only re-reads committed evidence and re-checks invariants without rewriting.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  computeStage3hMetrics,
  assertNoEvidenceLeakage,
} from "./llm_shield_stage3h_metrics_lib.mjs";

const base = process.argv[2] || "http://127.0.0.1:33058";
const verifyOnly = process.argv.includes("--verify-only");
const EV = "docs/research/llm-shield/evidence/stage-3h";
const api = `${base}/api/llm-shield/gateway`;
const TRACK_SCENARIO = {
  benign: "benign",
  context_poisoning: "context_poisoning",
  tool_injection: "tool_escalation",
  output_leakage: "policy_leak",
  multi_turn: "multi_turn_softening",
  hard_negative: "hard_negative",
};
const canary = JSON.parse(await readFile(`${EV}/canary/workspace-canary.json`, "utf8"));
if (canary.cases.length !== 30)
  throw new Error(`canary must contain 30 cases, got ${canary.cases.length}`);

if (verifyOnly) {
  const committed = JSON.parse(await readFile(`${EV}/metrics.json`, "utf8"));
  assertNoEvidenceLeakage(committed);
  if (committed.unauthorised_or_unsafe_tool_execution_rate !== 0)
    throw new Error("invariant drift");
  console.log("stage3h metrics: verify-only OK");
  process.exit(0);
}

const s = await (
  await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` };
const results = [];
for (const c of canary.cases) {
  const t0 = performance.now();
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
  results.push({
    case_id: c.case_id,
    track: c.track,
    expected_class: c.expected_class,
    gateway_verdict: r.gateway_verdict,
    tool_gate_verdict: r.tool_gate_verdict,
    output_firewall_verdict: r.output_firewall_verdict,
    tool_called: r.receipt?.tool_called === true,
    gateway_roundtrip_ms: Math.round(performance.now() - t0),
  });
}
const metrics = computeStage3hMetrics(canary, results);
assertNoEvidenceLeakage(metrics);
await mkdir(EV, { recursive: true });
await writeFile(`${EV}/metrics.json`, JSON.stringify(metrics, null, 2) + "\n");
await writeFile(
  `${EV}/agentdojo-run-manifest.json`,
  JSON.stringify(
    {
      stage: "3H",
      suite: canary.suite,
      mode: "canary_dry_run",
      agentdojo_version_pin: canary.agentdojo_version_pin,
      simurgh_commit: process.env.GIT_COMMIT || "local",
      scorer_modified: false,
      generated_at: new Date().toISOString(),
    },
    null,
    2
  ) + "\n"
);
console.log(`stage3h metrics written: ${results.length} cases`);
