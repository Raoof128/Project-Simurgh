// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure Stage 3R fallback orchestration. The caller injects runAttempt (which runs the
// provider model + containment boundaries and returns that attempt's raw + recomputed
// riskVerdict). The orchestrator owns ONLY the swap decision, the one-hop cap, the
// monotonic trust merge, and the fallback_chain evidence. No I/O, no network here.
import {
  classifyProviderOutcome,
  shouldFallback,
  riskDeltaFor,
  mergeTrustMonotonic,
  applySwapFloor,
} from "./fallbackPolicy.js";

export async function runFallbackOrchestration({ preCheck, config, runAttempt }) {
  const budgetState = { hops: 0, additionalProviderCalls: 0 };
  const attempts = [];
  const fallback_chain = [];

  // ----- primary attempt -----
  const primary = await runAttempt(config.primaryModel, 0);
  const primaryOutcome = classifyProviderOutcome(primary.raw);
  attempts.push({
    model: config.primaryModel,
    outcome: primaryOutcome,
    riskVerdict: primary.riskVerdict,
  });

  const decision = shouldFallback({
    outcome: primaryOutcome,
    preCheck,
    flagEnabled: config.fallbackOnRefusalEnabled === true,
    budgetState,
    budget: config.budget,
  });

  if (!decision.fallback) {
    return {
      attempts,
      finalAttempt: primary,
      fallbackUsed: false,
      trigger: null,
      terminalReason: decision.reason,
      riskDelta: 0,
      finalVerdict: primary.riskVerdict,
      fallback_chain,
    };
  }

  // ----- one fallback hop -----
  budgetState.hops += 1;
  budgetState.additionalProviderCalls += 1;
  const fb = await runAttempt(config.fallbackModel, 1);
  const fbOutcome = classifyProviderOutcome(fb.raw);
  attempts.push({ model: config.fallbackModel, outcome: fbOutcome, riskVerdict: fb.riskVerdict });

  const riskDelta = riskDeltaFor(decision.trigger);
  fallback_chain.push({
    from: config.primaryModel,
    to: config.fallbackModel,
    trigger: decision.trigger,
    refusal_category: primary.refusalMeta?.refusal_category ?? null,
    risk_delta: riskDelta,
    fallback_credit_observed: decision.trigger === "provider_refusal",
    fallback_credit_redeemed: false,
    fallback_credit_token_recorded: false,
  });

  // Monotonic trust: never better than the primary's verdict; a swap floors to >= warning.
  const merged = mergeTrustMonotonic(primary.riskVerdict, fb.riskVerdict);
  const finalVerdict = applySwapFloor(merged);

  // Cap: the fallback attempt is the last hop. If it too failed/refused, terminal.
  const fbFailedOrRefused = fbOutcome !== "available";

  return {
    attempts,
    finalAttempt: fb,
    fallbackUsed: true,
    trigger: decision.trigger,
    terminalReason: fbFailedOrRefused ? "fallback_attempt_failed" : null,
    riskDelta,
    finalVerdict,
    fallback_chain,
  };
}
