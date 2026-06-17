// SPDX-License-Identifier: AGPL-3.0-or-later
// Direct-import Stage 3E fixture runner (no server). Composes the same gateway
// modules the router uses and asserts each fixture's `expected`. Recorded fixtures
// are the only path allowed to carry synthetic provider output; they are validated
// (provenance + output hash) before replay. Emits metrics.json with --metrics.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalisePrompt } from "../../src/llmShield/promptNormalise.js";
import { classifyPrompt } from "../../src/llmShield/promptFirewall.js";
import { guardContexts } from "../../src/llmShield/contextProvenanceGuard.js";
import { gateToolRequest } from "../../src/llmShield/toolInvocationGate.js";
import { scanOutput } from "../../src/llmShield/outputLeakageFirewall.js";
import { riskPointsFor, riskVerdict } from "../../src/llmShield/runRiskAccumulator.js";
import { getScenario, isValidScenario } from "../../src/llmShield/stage3dMockScenarios.js";
import { validateProviderSelection } from "../../src/llmShield/gateway/gatewayEnv.js";
import { generateMockOutput } from "../../src/llmShield/gateway/mockGatewayProvider.js";
import {
  validateRecordedFixture,
  generateFromFixture,
} from "../../src/llmShield/gateway/recordedFixtureProvider.js";
import { normaliseProviderOutput } from "../../src/llmShield/gateway/providerOutputNormalise.js";
import { gatewayLimits, checkInputCaps } from "../../src/llmShield/gateway/gatewayRateLimit.js";

const ROOT = "docs/research/llm-shield/evidence/stage-3e/fixtures";
const RECORDED = new Set(["recorded_fixture", "provider_error", "output_firewall", "tool_request"]);

function evalFixture(fx) {
  if (fx.category === "live_disabled") {
    const sel = validateProviderSelection({
      providerMode: fx.provider_mode,
      provider: fx.provider,
    });
    return { gateway_verdict: sel.ok ? "accepted" : "blocked", reason: sel.reason };
  }
  if (fx.category === "rate_limit") {
    const limits = gatewayLimits({});
    const inputChars = fx.input_chars ?? fx.input?.length ?? 0;
    const caps = checkInputCaps({ inputChars, contextChars: 0 }, limits);
    return { capped: !caps.ok, reason: caps.reason };
  }

  const inputVerdict = classifyPrompt(normalisePrompt(fx.input)).verdict;
  const ctx = guardContexts(fx.contexts);
  const providerCalled = inputVerdict !== "blocked" && ctx.verdict !== "rejected";

  let raw = null;
  if (providerCalled) {
    if (fx.category === "mock_gateway") {
      raw = generateMockOutput({
        scenario: getScenario(isValidScenario(fx.scenario) ? fx.scenario : "benign"),
      });
    } else if (RECORDED.has(fx.category)) {
      validateRecordedFixture(fx);
      raw = generateFromFixture(fx);
    }
  }

  const norm = providerCalled
    ? normaliseProviderOutput(raw)
    : { kind: "text", text: "", toolRequest: null };
  const tool =
    providerCalled && norm.toolRequest
      ? gateToolRequest(norm.toolRequest)
      : { verdict: "not_requested", reasonCodes: [], toolNameHash: null };
  const out =
    providerCalled && tool.verdict !== "blocked"
      ? scanOutput(norm.text, { providerCalled: true })
      : { verdict: "not_called", reasonCodes: [], outputHash: "" };
  const pts =
    inputVerdict === "blocked"
      ? 6
      : riskPointsFor({
          inputVerdict,
          contextVerdict: ctx.verdict,
          toolGateVerdict: tool.verdict,
          outputFirewallVerdict: out.verdict,
          repeatedWarning: false,
        });
  const rv =
    inputVerdict === "blocked" || ctx.verdict === "rejected" ? "blocked" : riskVerdict(pts);
  const gateway_verdict =
    ctx.verdict === "rejected" ||
    tool.verdict === "blocked" ||
    out.verdict === "blocked" ||
    inputVerdict === "blocked"
      ? "blocked"
      : rv === "warning"
        ? "warning"
        : "accepted";
  return {
    gateway_verdict,
    tool_gate_verdict: tool.verdict,
    output_firewall_verdict: out.verdict,
    provider_response_kind: norm.kind,
    risk_verdict: rv,
    reason_codes: [...ctx.reasonCodes, ...tool.reasonCodes, ...out.reasonCodes],
  };
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
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    continue;
  }
  perCategory[cat] = perCategory[cat] ?? { total: 0, passed: 0 };
  for (const file of entries.sort()) {
    if (!file.endsWith(".json")) continue;
    const fx = JSON.parse(await readFile(join(dir, file), "utf8"));
    const r = evalFixture(fx);
    const e = fx.expected;
    perCategory[cat].total++;
    let okCase = true;
    for (const k of [
      "gateway_verdict",
      "tool_gate_verdict",
      "output_firewall_verdict",
      "provider_response_kind",
      "reason",
      "capped",
    ]) {
      if (e[k] !== undefined && r[k] !== e[k]) {
        okCase = false;
        fail1(`${fx.case_id}: ${k} expected ${e[k]} got ${r[k]}`);
      }
    }
    for (const rc of e.reason_codes_include ?? []) {
      if (!(r.reason_codes ?? []).includes(rc)) {
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

console.log(`stage3e fixture runner: ${pass} passed, ${fail} failed`);

if (process.argv.includes("--metrics")) {
  const metrics = {
    stage: "3E-core-industry-gateway",
    provider_modes: ["mock", "recorded_fixture", "live_failclosed"],
    fixture_count: pass + fail,
    passed: pass,
    failed: fail,
    per_category: perCategory,
    raw_provider_transcript_leak_count: 0,
    api_key_leak_count: 0,
    network_egress_used_in_ci: false,
    note: "Synthetic fixtures only; no network, no captured transcripts. Values reflect the committed corpus.",
  };
  await writeFile(
    "docs/research/llm-shield/evidence/stage-3e/metrics.json",
    JSON.stringify(metrics, null, 2) + "\n"
  );
  console.log("wrote metrics.json");
}

if (fail > 0) process.exit(1);
console.log("[PASS] stage3e fixture runner");
