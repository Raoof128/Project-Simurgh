// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure fallback policy for Stage 3R. No I/O, no clock, no network. Every dangerous
// decision lives here so the anti-bypass + monotonic-trust invariants are unit-proven.

export const PROVIDER_OUTCOMES = Object.freeze([
  "available",
  "provider_refusal",
  "unavailable",
  "timeout",
]);

export const DEFAULT_FALLBACK_BUDGET = Object.freeze({
  max_hops: 1,
  timeout_ms: 30000,
  max_additional_provider_calls: 1,
});

const VERDICT_RANK = Object.freeze({ accepted: 0, warning: 1, blocked: 2 });
const RANK_VERDICT = Object.freeze(["accepted", "warning", "blocked"]);

export function classifyProviderOutcome(raw) {
  if (!raw || typeof raw !== "object") return "unavailable";
  if (raw.error_code === "gateway_live_timeout") return "timeout";
  if (raw.error_code) return "unavailable";
  if (raw.provider_response_kind === "refusal") return "provider_refusal";
  return "available";
}

// Fail-closed pre-check: a fallback of ANY kind is forbidden unless Simurgh's own
// pre-check is explicitly non-terminal. Context is binary (accepted|rejected) and
// input must be "allowed"; any other/unknown value is treated as terminal.
export function preCheckNonTerminal({ inputVerdict, contextVerdict }) {
  return inputVerdict === "allowed" && contextVerdict === "accepted";
}

// The refusal anti-bypass gate: refusal fallback only when the flag is on AND the
// pre-check is non-terminal.
export function refusalFallbackAllowed({ inputVerdict, contextVerdict, flagEnabled }) {
  return flagEnabled === true && preCheckNonTerminal({ inputVerdict, contextVerdict });
}

export function withinBudget(budgetState, budget) {
  return (
    (budgetState.hops ?? 0) < budget.max_hops &&
    (budgetState.additionalProviderCalls ?? 0) < budget.max_additional_provider_calls
  );
}

export function shouldFallback({ outcome, preCheck, flagEnabled, budgetState, budget }) {
  if (outcome === "available") return { fallback: false, trigger: null, reason: "primary_available" };
  // Fix #1 — the bypass lock covers EVERY trigger: no fallback after a terminal pre-check.
  if (!preCheckNonTerminal(preCheck))
    return { fallback: false, trigger: null, reason: "simurgh_precheck_terminal" };
  if (outcome === "unavailable" || outcome === "timeout") {
    if (!withinBudget(budgetState, budget))
      return { fallback: false, trigger: null, reason: "budget_exhausted" };
    return { fallback: true, trigger: "availability", reason: "availability_failure" };
  }
  // provider_refusal
  if (!flagEnabled) return { fallback: false, trigger: null, reason: "refusal_fallback_disabled" };
  if (!withinBudget(budgetState, budget))
    return { fallback: false, trigger: null, reason: "budget_exhausted" };
  return { fallback: true, trigger: "provider_refusal", reason: "provider_over_refusal" };
}

export function riskDeltaFor(trigger) {
  return trigger === "provider_refusal" ? 3 : trigger === "availability" ? 2 : 0;
}

export function mergeTrustMonotonic(prior, recomputed) {
  const r = Math.max(VERDICT_RANK[prior] ?? 0, VERDICT_RANK[recomputed] ?? 0);
  return RANK_VERDICT[r];
}

export function applySwapFloor(verdict) {
  return mergeTrustMonotonic(verdict, "warning");
}
