// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runFallbackOrchestration } from "../../../../src/llmShield/gateway/fallbackOrchestrator.js";
import { DEFAULT_FALLBACK_BUDGET } from "../../../../src/llmShield/gateway/fallbackPolicy.js";

const cfg = (over = {}) => ({
  fallbackOnRefusalEnabled: false,
  budget: DEFAULT_FALLBACK_BUDGET,
  primaryModel: "claude-fable-5",
  fallbackModel: "claude-opus-4-8",
  ...over,
});
const allowedPre = { inputVerdict: "allowed", contextVerdict: "accepted" };

function scripted(list) {
  let i = 0;
  return async () => list[Math.min(i++, list.length - 1)];
}

test("primary available → no fallback", async () => {
  const r = await runFallbackOrchestration({
    preCheck: allowedPre,
    config: cfg(),
    runAttempt: scripted([{ raw: { provider_response_kind: "text" }, riskVerdict: "accepted" }]),
  });
  assert.equal(r.fallbackUsed, false);
  assert.equal(r.finalVerdict, "accepted");
  assert.equal(r.fallback_chain.length, 0);
});

test("availability failure → one fallback hop; risk floored to warning; chain recorded", async () => {
  const r = await runFallbackOrchestration({
    preCheck: allowedPre,
    config: cfg(),
    runAttempt: scripted([
      { raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "accepted" },
      { raw: { provider_response_kind: "text" }, riskVerdict: "accepted" },
    ]),
  });
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.trigger, "availability");
  assert.equal(r.finalVerdict, "warning"); // clean + swap → ≥ warning
  assert.equal(r.fallback_chain[0].from, "claude-fable-5");
  assert.equal(r.fallback_chain[0].to, "claude-opus-4-8");
  assert.ok(r.riskDelta >= 2);
});

test("refusal + flag OFF → terminal, no swap", async () => {
  const r = await runFallbackOrchestration({
    preCheck: allowedPre,
    config: cfg({ fallbackOnRefusalEnabled: false }),
    runAttempt: scripted([{ raw: { provider_response_kind: "refusal" }, riskVerdict: "accepted", refusalMeta: { refusal_category: "cyber" } }]),
  });
  assert.equal(r.fallbackUsed, false);
  assert.equal(r.terminalReason, "refusal_fallback_disabled");
});

test("refusal + flag ON + pre-check allowed → swap, risk rises, category recorded", async () => {
  const r = await runFallbackOrchestration({
    preCheck: allowedPre,
    config: cfg({ fallbackOnRefusalEnabled: true }),
    runAttempt: scripted([
      { raw: { provider_response_kind: "refusal" }, riskVerdict: "accepted", refusalMeta: { refusal_category: "cyber" } },
      { raw: { provider_response_kind: "text" }, riskVerdict: "accepted" },
    ]),
  });
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.trigger, "provider_refusal");
  assert.equal(r.fallback_chain[0].refusal_category, "cyber");
  assert.equal(r.finalVerdict, "warning");
});

test("ANTI-BYPASS: refusal + flag ON but Simurgh pre-check terminal → no swap", async () => {
  const r = await runFallbackOrchestration({
    preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" },
    config: cfg({ fallbackOnRefusalEnabled: true }),
    runAttempt: scripted([{ raw: { provider_response_kind: "refusal" }, riskVerdict: "blocked" }]),
  });
  assert.equal(r.fallbackUsed, false);
  assert.equal(r.terminalReason, "simurgh_precheck_terminal");
});

test("ANTI-BYPASS (fix #1): AVAILABILITY failure + Simurgh pre-check terminal → no swap", async () => {
  const r = await runFallbackOrchestration({
    preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" },
    config: cfg(),
    runAttempt: scripted([{ raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "blocked" }]),
  });
  assert.equal(r.fallbackUsed, false);
  assert.equal(r.terminalReason, "simurgh_precheck_terminal");
});

test("cap one hop: fallback also fails → terminal, no second hop", async () => {
  let calls = 0;
  const r = await runFallbackOrchestration({
    preCheck: allowedPre,
    config: cfg(),
    runAttempt: async () => {
      calls += 1;
      return { raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "accepted" };
    },
  });
  assert.equal(calls, 2); // primary + exactly one fallback
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.terminalReason, "fallback_attempt_failed");
});

test("trust never improves: warning primary + swap → at least warning", async () => {
  const r = await runFallbackOrchestration({
    preCheck: allowedPre,
    config: cfg(),
    runAttempt: scripted([
      { raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "warning" },
      { raw: { provider_response_kind: "text" }, riskVerdict: "accepted" },
    ]),
  });
  assert.equal(r.finalVerdict, "warning"); // max(prior warning, recomputed accepted, floor warning)
});
