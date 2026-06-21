// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 3R self-proof. Drives the real orchestrator with scripted
// attempts to prove each safety invariant — especially that a bypass cannot occur.
import { runFallbackOrchestration } from "./fallbackOrchestrator.js";
import { DEFAULT_FALLBACK_BUDGET, refusalFallbackAllowed } from "./fallbackPolicy.js";

const cfg = (over = {}) => ({
  fallbackOnRefusalEnabled: false,
  budget: DEFAULT_FALLBACK_BUDGET,
  primaryModel: "claude-fable-5",
  fallbackModel: "claude-opus-4-8",
  ...over,
});
const allowed = { inputVerdict: "safe", contextVerdict: "accepted" };
const scripted = (list) => {
  let i = 0;
  return async () => list[Math.min(i++, list.length - 1)];
};
const TEXT = { raw: { provider_response_kind: "text", output_text: "clean fallback answer" }, riskVerdict: "accepted" };
const UNAVAIL = { raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "accepted" };
const REFUSE = { raw: { provider_response_kind: "refusal", output_text: "" }, riskVerdict: "accepted", refusalMeta: { refusal_category: "cyber" } };
// A mid-stream refusal that produced dirty partial text which must NEVER become final.
const PARTIAL = "PARTIAL TEXT THAT MUST NEVER BECOME FINAL";
const REFUSE_PARTIAL = { raw: { provider_response_kind: "refusal", stop_reason: "refusal", output_text: PARTIAL }, riskVerdict: "accepted", refusalMeta: { refusal_category: "cyber" } };

async function run(over, attempts) {
  return runFallbackOrchestration({ preCheck: over.preCheck ?? allowed, config: cfg(over.config), runAttempt: scripted(attempts) });
}

export async function runFallbackSelfProof() {
  const fixtures = [];
  const add = (fixture_id, expected, observed) =>
    fixtures.push({ fixture_id, expected, observed, passed: JSON.stringify(expected) === JSON.stringify(observed) });

  let r = await run({}, [UNAVAIL, TEXT]);
  add("availability-failure-swap", { fallbackUsed: true, trigger: "availability" }, { fallbackUsed: r.fallbackUsed, trigger: r.trigger });

  r = await run({ config: { fallbackOnRefusalEnabled: true } }, [REFUSE, TEXT]);
  add("refusal-fallback-enabled", { fallbackUsed: true, trigger: "provider_refusal" }, { fallbackUsed: r.fallbackUsed, trigger: r.trigger });

  r = await run({ config: { fallbackOnRefusalEnabled: false } }, [REFUSE]);
  add("refusal-fallback-disabled", { fallbackUsed: false, terminalReason: "refusal_fallback_disabled" }, { fallbackUsed: r.fallbackUsed, terminalReason: r.terminalReason });

  r = await run({ preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" }, config: { fallbackOnRefusalEnabled: true } }, [REFUSE]);
  add("provider-refusal-unsafe-local-block", { fallbackUsed: false, terminalReason: "simurgh_precheck_terminal" }, { fallbackUsed: r.fallbackUsed, terminalReason: r.terminalReason });

  // Fix #1: availability failure under a terminal pre-check must ALSO never fall back.
  r = await run({ preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" }, config: {} }, [UNAVAIL]);
  add("availability-failure-unsafe-local-block", { fallbackUsed: false, terminalReason: "simurgh_precheck_terminal" }, { fallbackUsed: r.fallbackUsed, terminalReason: r.terminalReason });

  // simurgh-block-never-swaps: the policy gate itself refuses even with the flag on
  add(
    "simurgh-block-never-swaps",
    { allowed: false },
    { allowed: refusalFallbackAllowed({ inputVerdict: "blocked", contextVerdict: "accepted", flagEnabled: true }) }
  );

  r = await run({}, [{ raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "warning" }, TEXT]);
  add("trust-never-improves", { finalVerdict: "warning" }, { finalVerdict: r.finalVerdict });

  r = await run({}, [UNAVAIL, UNAVAIL, UNAVAIL]);
  add("cap-one-hop", { attempts: 2, terminalReason: "fallback_attempt_failed" }, { attempts: r.attempts.length, terminalReason: r.terminalReason });

  // streaming partial discard: the primary refusal emitted DIRTY partial text; the
  // final answer must be the fallback's text and must NOT contain the partial.
  r = await run({ config: { fallbackOnRefusalEnabled: true } }, [REFUSE_PARTIAL, TEXT]);
  add(
    "streaming-refusal-partial-output-discarded",
    { finalKind: "text", finalContainsPartial: false },
    {
      finalKind: r.finalAttempt.raw.provider_response_kind,
      finalContainsPartial: String(r.finalAttempt.raw.output_text ?? "").includes(PARTIAL),
    }
  );

  // A "bypass success" = ANY Simurgh-terminal pre-check that still produced a fallback.
  const bypassSuccesses = fixtures.filter(
    (f) =>
      (f.fixture_id === "provider-refusal-unsafe-local-block" ||
        f.fixture_id === "availability-failure-unsafe-local-block") &&
      f.observed.fallbackUsed === true
  ).length;

  return {
    type: "simurgh.gateway.fallback_self_proof.v1",
    stage: "3R",
    fixtures,
    summary: { all_passed: fixtures.every((f) => f.passed), fallback_bypass_successes: bypassSuccesses },
  };
}
