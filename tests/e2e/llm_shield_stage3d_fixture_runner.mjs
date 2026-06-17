// SPDX-License-Identifier: AGPL-3.0-or-later
// Direct-import fixture runner: the ONLY path allowed to inject a fixture's
// mock_provider_output (never reachable over HTTP). Composes the same Stage 3D
// modules the router uses and mirrors its risk logic, but feeds the fixture
// output straight into the firewall. Supports single-run fixtures and multi-turn
// fixtures (a `turns[]` array replayed in one session; expected is checked
// against the last turn).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalisePrompt } from "../../src/llmShield/promptNormalise.js";
import { classifyPrompt } from "../../src/llmShield/promptFirewall.js";
import { guardContexts } from "../../src/llmShield/contextProvenanceGuard.js";
import { gateToolRequest } from "../../src/llmShield/toolInvocationGate.js";
import { scanOutput } from "../../src/llmShield/outputLeakageFirewall.js";
import { riskPointsFor, riskVerdict } from "../../src/llmShield/runRiskAccumulator.js";
import { getScenario } from "../../src/llmShield/stage3dMockScenarios.js";

const ROOT = "docs/research/llm-shield/evidence/stage-3d/fixtures";

// Mirrors handleStage3dRun in llmShieldRouter.js (risk weights + escalation).
function evalTurn(turn, session) {
  const normalised = normalisePrompt(turn.input);
  const inputVerdict = classifyPrompt(normalised).verdict;
  const ctx = guardContexts(turn.contexts);
  const providerCalled = inputVerdict !== "blocked" && ctx.verdict !== "rejected";
  const scenario = getScenario(turn.scenario ?? "benign");
  // Fixtures-only: a fixture may override the tool request to exercise the full
  // policy table. The HTTP route only ever uses scenario-driven tool requests.
  const toolReq = turn.tool_request !== undefined ? turn.tool_request : scenario.tool_request;
  const tool = providerCalled
    ? gateToolRequest(toolReq)
    : { verdict: "not_requested", reasonCodes: [], toolNameHash: null, toolCalled: false };
  const outputText = providerCalled ? (turn.mock_provider_output ?? "") : "";
  const out = scanOutput(outputText, { providerCalled });

  const repeatedWarning = (session.warningRunCount ?? 0) > 0 && inputVerdict === "warning";
  const pts =
    inputVerdict === "blocked"
      ? 6
      : riskPointsFor({
          inputVerdict,
          contextVerdict: ctx.verdict,
          toolGateVerdict: tool.verdict,
          outputFirewallVerdict: out.verdict,
          repeatedWarning,
        });
  session.score += pts;
  if (inputVerdict === "warning") session.warningRunCount = (session.warningRunCount ?? 0) + 1;
  const risk =
    inputVerdict === "blocked" || ctx.verdict === "rejected"
      ? "blocked"
      : riskVerdict(session.score);

  return {
    input_verdict: inputVerdict,
    context_verdict: ctx.verdict,
    provider_called: providerCalled,
    tool_gate_verdict: tool.verdict,
    output_firewall_verdict: out.verdict,
    risk_verdict: risk,
    reason_codes: [...ctx.reasonCodes, ...tool.reasonCodes, ...out.reasonCodes],
  };
}

function runFixture(fx) {
  const session = { score: 0, warningRunCount: 0 };
  const turns = fx.turns ?? [
    {
      input: fx.input,
      scenario: fx.scenario,
      contexts: fx.contexts,
      mock_provider_output: fx.mock_provider_output,
      tool_request: fx.tool_request,
    },
  ];
  let last;
  for (const t of turns) last = evalTurn(t, session);
  return last;
}

let pass = 0;
let fail = 0;
const perCategory = {};
const fail1 = (m) => {
  console.error(`[FAIL] ${m}`);
  fail++;
};

for (const cat of (await readdir(ROOT)).sort()) {
  const dir = join(ROOT, cat);
  perCategory[cat] = perCategory[cat] ?? { total: 0, passed: 0 };
  for (const file of (await readdir(dir)).sort()) {
    if (!file.endsWith(".json")) continue;
    const fx = JSON.parse(await readFile(join(dir, file), "utf8"));
    const r = runFixture(fx);
    const e = fx.expected;
    perCategory[cat].total++;
    let okCase = true;
    for (const k of [
      "input_verdict",
      "context_verdict",
      "provider_called",
      "tool_gate_verdict",
      "output_firewall_verdict",
      "risk_verdict",
    ]) {
      if (e[k] !== undefined && r[k] !== e[k]) {
        okCase = false;
        fail1(`${fx.case_id}: ${k} expected ${e[k]} got ${r[k]}`);
      }
    }
    for (const rc of e.reason_codes_include ?? []) {
      if (!r.reason_codes.includes(rc)) {
        okCase = false;
        fail1(`${fx.case_id}: missing reason_code ${rc}`);
      }
    }
    if (okCase) {
      pass++;
      perCategory[cat].passed++;
    }
  }
}

console.log(`stage3d fixture runner: ${pass} passed, ${fail} failed`);

if (process.argv.includes("--metrics")) {
  const metrics = {
    stage: "3D-provenance-containment",
    fixture_count: pass + fail,
    passed: pass,
    failed: fail,
    per_category: perCategory,
    provider_mode: "mock",
    network_egress_used: false,
    note: "Per-category rates are derived from frozen fixtures; values reflect the committed corpus, not population-level performance.",
  };
  await writeFile(
    "docs/research/llm-shield/evidence/stage-3d/metrics.json",
    JSON.stringify(metrics, null, 2) + "\n"
  );
  console.log("wrote metrics.json");
}

if (fail > 0) process.exit(1);
console.log("[PASS] stage3d fixture runner");
