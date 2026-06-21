// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  PROVIDER_OUTCOMES,
  DEFAULT_FALLBACK_BUDGET,
  classifyProviderOutcome,
  preCheckNonTerminal,
  refusalFallbackAllowed,
  withinBudget,
  shouldFallback,
  riskDeltaFor,
  mergeTrustMonotonic,
  applySwapFloor,
} from "../../../../src/llmShield/gateway/fallbackPolicy.js";

test("classifyProviderOutcome maps raw provider results", () => {
  assert.equal(classifyProviderOutcome(null), "unavailable");
  assert.equal(classifyProviderOutcome({ error_code: "gateway_live_timeout" }), "timeout");
  assert.equal(classifyProviderOutcome({ error_code: "gateway_provider_unavailable" }), "unavailable");
  assert.equal(classifyProviderOutcome({ provider_response_kind: "refusal" }), "provider_refusal");
  assert.equal(classifyProviderOutcome({ provider_response_kind: "text", error_code: null }), "available");
  assert.ok(PROVIDER_OUTCOMES.includes(classifyProviderOutcome({ provider_response_kind: "text" })));
});

test("preCheckNonTerminal is fail-closed (only allowed+accepted)", () => {
  assert.equal(preCheckNonTerminal({ inputVerdict: "allowed", contextVerdict: "accepted" }), true);
  assert.equal(preCheckNonTerminal({ inputVerdict: "blocked", contextVerdict: "accepted" }), false);
  assert.equal(preCheckNonTerminal({ inputVerdict: "allowed", contextVerdict: "rejected" }), false);
  // unknown / undefined values are terminal (fail-closed), never accidentally allowed
  assert.equal(preCheckNonTerminal({ inputVerdict: "warning", contextVerdict: "accepted" }), false);
  assert.equal(preCheckNonTerminal({ inputVerdict: "allowed", contextVerdict: undefined }), false);
  assert.equal(preCheckNonTerminal({ inputVerdict: "allowed", contextVerdict: "unknown" }), false);
});

test("refusalFallbackAllowed is the anti-bypass gate", () => {
  assert.equal(refusalFallbackAllowed({ inputVerdict: "allowed", contextVerdict: "accepted", flagEnabled: true }), true);
  // flag off
  assert.equal(refusalFallbackAllowed({ inputVerdict: "allowed", contextVerdict: "accepted", flagEnabled: false }), false);
  // Simurgh pre-check terminal → never (the bypass lock)
  assert.equal(refusalFallbackAllowed({ inputVerdict: "blocked", contextVerdict: "accepted", flagEnabled: true }), false);
  assert.equal(refusalFallbackAllowed({ inputVerdict: "allowed", contextVerdict: "rejected", flagEnabled: true }), false);
});

test("withinBudget respects hops and call ceilings", () => {
  assert.equal(withinBudget({ hops: 0, additionalProviderCalls: 0 }, DEFAULT_FALLBACK_BUDGET), true);
  assert.equal(withinBudget({ hops: 1, additionalProviderCalls: 1 }, DEFAULT_FALLBACK_BUDGET), false);
});

test("shouldFallback: availability always (within budget, non-terminal pre-check)", () => {
  const base = { preCheck: { inputVerdict: "allowed", contextVerdict: "accepted" }, flagEnabled: false, budgetState: { hops: 0, additionalProviderCalls: 0 }, budget: DEFAULT_FALLBACK_BUDGET };
  assert.equal(shouldFallback({ ...base, outcome: "available" }).fallback, false);
  assert.equal(shouldFallback({ ...base, outcome: "unavailable" }).trigger, "availability");
  assert.equal(shouldFallback({ ...base, outcome: "timeout" }).trigger, "availability");
  // budget exhausted → no fallback
  assert.equal(shouldFallback({ ...base, outcome: "timeout", budgetState: { hops: 1, additionalProviderCalls: 1 } }).fallback, false);
});

test("shouldFallback: a Simurgh-terminal pre-check blocks AVAILABILITY fallback too (fix #1)", () => {
  const blockedPre = { preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" }, flagEnabled: true, budgetState: { hops: 0, additionalProviderCalls: 0 }, budget: DEFAULT_FALLBACK_BUDGET };
  assert.deepEqual(shouldFallback({ ...blockedPre, outcome: "unavailable" }), { fallback: false, trigger: null, reason: "simurgh_precheck_terminal" });
  assert.deepEqual(shouldFallback({ ...blockedPre, outcome: "provider_refusal" }), { fallback: false, trigger: null, reason: "simurgh_precheck_terminal" });
});

test("shouldFallback: refusal is opt-in + anti-bypass + reason-coded", () => {
  const allowed = { inputVerdict: "allowed", contextVerdict: "accepted" };
  const budgetState = { hops: 0, additionalProviderCalls: 0 };
  assert.deepEqual(
    shouldFallback({ outcome: "provider_refusal", preCheck: allowed, flagEnabled: false, budgetState, budget: DEFAULT_FALLBACK_BUDGET }),
    { fallback: false, trigger: null, reason: "refusal_fallback_disabled" }
  );
  // a Simurgh-terminal pre-check trips the top-level lock (covers availability + refusal)
  assert.equal(
    shouldFallback({ outcome: "provider_refusal", preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" }, flagEnabled: true, budgetState, budget: DEFAULT_FALLBACK_BUDGET }).reason,
    "simurgh_precheck_terminal"
  );
  assert.equal(
    shouldFallback({ outcome: "provider_refusal", preCheck: allowed, flagEnabled: true, budgetState, budget: DEFAULT_FALLBACK_BUDGET }).trigger,
    "provider_refusal"
  );
});

test("risk is monotonic; a swap can never improve the verdict; swaps raise risk", () => {
  assert.equal(riskDeltaFor("availability") < riskDeltaFor("provider_refusal"), true);
  assert.equal(mergeTrustMonotonic("accepted", "accepted"), "accepted");
  assert.equal(mergeTrustMonotonic("warning", "accepted"), "warning"); // can't improve
  assert.equal(mergeTrustMonotonic("accepted", "blocked"), "blocked");
  assert.equal(applySwapFloor("accepted"), "warning"); // clean + swap → ≥ warning
  assert.equal(applySwapFloor("blocked"), "blocked");
});
