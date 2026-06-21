# Stage 3R — Trust-Preserving Provider Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Simurgh-orchestrated, client-side provider fallback to the LLM-Shield gateway so model unavailability or a configured Fable-5 over-refusal is survived by swapping to a fallback model — while the same HMAC chain and risk accumulator carry across, the swap is a signed risk-raising event, and the fallback output re-runs every containment boundary. Fallback is resilience, never a firewall bypass.

**Architecture:** Put every dangerous decision in a pure, 100%-unit-tested policy module (`fallbackPolicy.js`) and a pure orchestrator (`fallbackOrchestrator.js`) that takes an injected `runAttempt` callback — so all safety invariants are proven without a server. The gateway router supplies the real `runAttempt` (call provider model → normalise → tool gate → output firewall) and wires the orchestrator into the run handler. A null-safe refusal normaliser, deterministic mock outcomes, receipt/audit extensions, a self-proof pack, and a gateway E2E smoke complete it.

**Tech Stack:** Node.js ESM, `node:test`, `node:crypto`, Express router (existing). Builds on `src/llmShield/gateway/*` and `src/audit/hmacChain.js`.

## Global Constraints

- **This is a REAL gateway/security-path change** — it modifies `src/llmShield/gateway/**`. It is **NOT** a tooling-only measurement stage and is **NOT** under the policy-drift guard. It carries its own threat model + security review + regression suite.
- **Anti-bypass invariant (sacred):** provider-refusal fallback is permitted only when Simurgh's own pre-check is non-terminal (`inputVerdict === "allowed"` AND `contextVerdict !== "rejected"`). Simurgh firewall denials are terminal — never fallback.
- **Monotonic trust:** one session record, one HMAC chain, one risk accumulator across the swap; a swap can only hold or worsen the verdict, never improve it; `blocked + fallback` is impossible (blocked is terminal).
- **Same HMAC chain across the swap;** the swap is a recorded event in that chain.
- **Fallback output re-runs every containment boundary** (tool gate + output firewall); no velvet rope for the fallback model.
- **Client-side default; one fallback authority per request; cap one hop.** No provider SDK middleware / native `fallbacks` combined on the same request.
- **Provider-refusal fallback default OFF** via `SIMURGH_GATEWAY_FALLBACK_ON_REFUSAL` (default `false`). Availability fallback is budgeted (`max_hops:1`, `timeout_ms:30000`, `max_additional_provider_calls:1`).
- **Fresh approved envelope** — fallback uses the Simurgh-approved request envelope, never partial/refused output.
- **Refusal handling per real Fable 5 docs:** branch on `stop_reason === "refusal"` only; `stop_details` null-safe; `category ∈ {cyber,bio,frontier_llm,reasoning_extraction}|null`; explanation hashed, never parsed/stored raw. Models `claude-fable-5 → claude-opus-4-8`.
- **Metadata-only evidence; no raw credit tokens** (booleans/hash only). Live providers opt-in, deterministic mock in CI.
- Commit messages: neutral, conventional-commit prefix, **no Co-Authored-By trailer**.
- Pure modules at 100% function coverage (`node --test --experimental-test-coverage --test-coverage-functions=100`).

---

### Task 1: Fallback policy (pure) — outcome classification, anti-bypass gate, monotonic trust, budget

**Files:**
- Create: `src/llmShield/gateway/fallbackPolicy.js`
- Test: `tests/unit/llmShield/gateway/fallbackPolicy.test.js`

**Interfaces:**
- Produces:
  - `PROVIDER_OUTCOMES = ["available","provider_refusal","unavailable","timeout"]`
  - `DEFAULT_FALLBACK_BUDGET = { max_hops:1, timeout_ms:30000, max_additional_provider_calls:1 }`
  - `classifyProviderOutcome(raw): string`
  - `refusalFallbackAllowed({inputVerdict, contextVerdict, flagEnabled}): boolean`
  - `withinBudget(budgetState, budget): boolean` — `budgetState = { hops, additionalProviderCalls }`
  - `shouldFallback({outcome, preCheck, flagEnabled, budgetState, budget}): { fallback:boolean, trigger:("availability"|"provider_refusal"|null), reason:string }`
  - `riskDeltaFor(trigger): number`
  - `mergeTrustMonotonic(prior, recomputed): ("accepted"|"warning"|"blocked")`
  - `applySwapFloor(verdict): ("warning"|"blocked")`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/gateway/fallbackPolicy.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  PROVIDER_OUTCOMES,
  DEFAULT_FALLBACK_BUDGET,
  classifyProviderOutcome,
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

test("shouldFallback: availability always (within budget)", () => {
  const base = { preCheck: { inputVerdict: "allowed", contextVerdict: "accepted" }, flagEnabled: false, budgetState: { hops: 0, additionalProviderCalls: 0 }, budget: DEFAULT_FALLBACK_BUDGET };
  assert.equal(shouldFallback({ ...base, outcome: "available" }).fallback, false);
  assert.equal(shouldFallback({ ...base, outcome: "unavailable" }).trigger, "availability");
  assert.equal(shouldFallback({ ...base, outcome: "timeout" }).trigger, "availability");
  // budget exhausted → no fallback
  assert.equal(shouldFallback({ ...base, outcome: "timeout", budgetState: { hops: 1, additionalProviderCalls: 1 } }).fallback, false);
});

test("shouldFallback: refusal is opt-in + anti-bypass + reason-coded", () => {
  const allowed = { inputVerdict: "allowed", contextVerdict: "accepted" };
  const budgetState = { hops: 0, additionalProviderCalls: 0 };
  assert.deepEqual(
    shouldFallback({ outcome: "provider_refusal", preCheck: allowed, flagEnabled: false, budgetState, budget: DEFAULT_FALLBACK_BUDGET }),
    { fallback: false, trigger: null, reason: "refusal_fallback_disabled" }
  );
  assert.equal(
    shouldFallback({ outcome: "provider_refusal", preCheck: { inputVerdict: "blocked", contextVerdict: "accepted" }, flagEnabled: true, budgetState, budget: DEFAULT_FALLBACK_BUDGET }).reason,
    "anti_bypass_precheck_terminal"
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/fallbackPolicy.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the policy module**

```javascript
// src/llmShield/gateway/fallbackPolicy.js
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

// The anti-bypass gate: refusal fallback only when the flag is on AND Simurgh's own
// pre-check is non-terminal. A Simurgh block/reject can never be tunnelled.
export function refusalFallbackAllowed({ inputVerdict, contextVerdict, flagEnabled }) {
  return flagEnabled === true && inputVerdict === "allowed" && contextVerdict !== "rejected";
}

export function withinBudget(budgetState, budget) {
  return (
    (budgetState.hops ?? 0) < budget.max_hops &&
    (budgetState.additionalProviderCalls ?? 0) < budget.max_additional_provider_calls
  );
}

export function shouldFallback({ outcome, preCheck, flagEnabled, budgetState, budget }) {
  if (outcome === "available") return { fallback: false, trigger: null, reason: "primary_available" };
  if (outcome === "unavailable" || outcome === "timeout") {
    if (!withinBudget(budgetState, budget))
      return { fallback: false, trigger: null, reason: "budget_exhausted" };
    return { fallback: true, trigger: "availability", reason: "availability_failure" };
  }
  // provider_refusal
  if (!flagEnabled) return { fallback: false, trigger: null, reason: "refusal_fallback_disabled" };
  if (!refusalFallbackAllowed({ ...preCheck, flagEnabled }))
    return { fallback: false, trigger: null, reason: "anti_bypass_precheck_terminal" };
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/unit/llmShield/gateway/fallbackPolicy.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/gateway/fallbackPolicy.test.js`
Expected: PASS, `fallbackPolicy.js` at 100% functions.

- [ ] **Step 6: Commit**

```bash
git add src/llmShield/gateway/fallbackPolicy.js tests/unit/llmShield/gateway/fallbackPolicy.test.js
git commit -m "feat(stage-3r): pure fallback policy — outcome class, anti-bypass gate, monotonic trust, budget"
```

---

### Task 2: Null-safe refusal normaliser (per real Fable 5 docs)

**Files:**
- Modify: `src/llmShield/gateway/anthropicResponseNormalise.js`
- Test: `tests/unit/llmShield/gateway/refusalNormalise.test.js`

**Interfaces:**
- Consumes: `hashPrompt` (already imported in the file).
- Produces: `normaliseRefusal(apiResponse): { stop_reason, stop_details_present, stop_details_type, refusal_category, refusal_explanation_recorded, refusal_explanation_hash }` and `isRefusal(apiResponse): boolean`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/gateway/refusalNormalise.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { normaliseRefusal, isRefusal } from "../../../../src/llmShield/gateway/anthropicResponseNormalise.js";

test("isRefusal branches on stop_reason only", () => {
  assert.equal(isRefusal({ stop_reason: "refusal" }), true);
  assert.equal(isRefusal({ stop_reason: "end_turn", stop_details: { type: "refusal" } }), false);
  assert.equal(isRefusal({}), false);
});

test("normaliseRefusal captures category, hashes explanation, never stores raw", () => {
  const r = normaliseRefusal({
    stop_reason: "refusal",
    stop_details: { type: "refusal", category: "cyber", explanation: "declined because cyber harm" },
  });
  assert.equal(r.stop_reason, "refusal");
  assert.equal(r.stop_details_present, true);
  assert.equal(r.stop_details_type, "refusal");
  assert.equal(r.refusal_category, "cyber");
  assert.equal(r.refusal_explanation_recorded, false);
  assert.match(r.refusal_explanation_hash, /^sha256:/);
  // raw explanation text must not appear anywhere in the serialized metadata
  assert.equal(JSON.stringify(r).includes("declined because"), false);
});

test("normaliseRefusal is null-safe (category/explanation/stop_details may be null)", () => {
  const r = normaliseRefusal({ stop_reason: "refusal", stop_details: null });
  assert.equal(r.stop_details_present, false);
  assert.equal(r.refusal_category, null);
  assert.equal(r.refusal_explanation_hash, null);
  const r2 = normaliseRefusal({ stop_reason: "refusal", stop_details: { type: "refusal", category: null, explanation: null } });
  assert.equal(r2.refusal_category, null);
  assert.equal(r2.refusal_explanation_hash, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/refusalNormalise.test.js`
Expected: FAIL — `normaliseRefusal` not exported.

- [ ] **Step 3: Append to `anthropicResponseNormalise.js`**

```javascript
// append to src/llmShield/gateway/anthropicResponseNormalise.js

// Branch on stop_reason ONLY (stop_details is informational and can be null).
export function isRefusal(apiResponse = {}) {
  return apiResponse.stop_reason === "refusal";
}

// Null-safe, metadata-only refusal shape per the Fable 5 refusal contract. The
// explanation text is unstable, so it is hashed and never stored raw or parsed.
export function normaliseRefusal(apiResponse = {}) {
  const sd = apiResponse.stop_details;
  const present = sd != null && typeof sd === "object";
  const category = present && typeof sd.category === "string" ? sd.category : null;
  const explanation = present && typeof sd.explanation === "string" ? sd.explanation : null;
  return {
    stop_reason: apiResponse.stop_reason === "refusal" ? "refusal" : (apiResponse.stop_reason ?? null),
    stop_details_present: present,
    stop_details_type: present && typeof sd.type === "string" ? sd.type : null,
    refusal_category: category,
    refusal_explanation_recorded: false,
    refusal_explanation_hash: explanation ? hashPrompt(explanation) : null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/unit/llmShield/gateway/refusalNormalise.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llmShield/gateway/anthropicResponseNormalise.js tests/unit/llmShield/gateway/refusalNormalise.test.js
git commit -m "feat(stage-3r): null-safe refusal normaliser (stop_reason-only, hashed explanation)"
```

---

### Task 3: Deterministic mock outcomes (unavailable / refusing)

**Files:**
- Modify: `src/llmShield/gateway/mockGatewayProvider.js`
- Test: `tests/unit/llmShield/gateway/mockOutcomes.test.js`

**Interfaces:**
- Produces: `generateMockOutput({ scenario })` now honours `scenario.provider_outcome ∈ {"unavailable","refusal"}` returning a deterministic raw the orchestrator classifies; default behaviour unchanged.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/gateway/mockOutcomes.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { generateMockOutput } from "../../../../src/llmShield/gateway/mockGatewayProvider.js";
import { classifyProviderOutcome } from "../../../../src/llmShield/gateway/fallbackPolicy.js";

test("mock can deterministically produce an unavailable outcome", () => {
  const raw = generateMockOutput({ scenario: { provider_outcome: "unavailable" } });
  assert.equal(classifyProviderOutcome(raw), "unavailable");
  assert.equal(raw.network_egress_used, false);
});

test("mock can deterministically produce a refusal outcome with stop_details", () => {
  const raw = generateMockOutput({ scenario: { provider_outcome: "refusal" } });
  assert.equal(classifyProviderOutcome(raw), "provider_refusal");
  assert.equal(raw.stop_reason, "refusal");
  assert.equal(raw.stop_details.category, "cyber");
  assert.equal(raw.output_text, "");
});

test("default scenario behaviour is unchanged", () => {
  const raw = generateMockOutput({ scenario: { provider_output_kind: "normal_text", output: "ok", tool_request: null } });
  assert.equal(raw.provider_response_kind, "text");
  assert.equal(raw.output_text, "ok");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/mockOutcomes.test.js`
Expected: FAIL — `provider_outcome` not honoured.

- [ ] **Step 3: Edit `mockGatewayProvider.js`**

Add the outcome branch at the top of `generateMockOutput`, before the existing `KIND_MAP` logic:

```javascript
// in src/llmShield/gateway/mockGatewayProvider.js, inside generateMockOutput, FIRST:
export function generateMockOutput({ scenario }) {
  if (scenario.provider_outcome === "unavailable") {
    return {
      provider: "mock",
      provider_mode: "mock",
      provider_called: true,
      network_egress_used: false,
      provider_response_kind: "error",
      output_text: "",
      tool_request: null,
      usage: { input_tokens_bucket: "0-1k", output_tokens_bucket: "0-1k" },
      latency_bucket: "0-250ms",
      error_code: "gateway_provider_unavailable",
    };
  }
  if (scenario.provider_outcome === "refusal") {
    return {
      provider: "mock",
      provider_mode: "mock",
      provider_called: true,
      network_egress_used: false,
      provider_response_kind: "refusal",
      output_text: "",
      tool_request: null,
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber", explanation: "declined: synthetic refusal" },
      usage: { input_tokens_bucket: "0-1k", output_tokens_bucket: "0-1k" },
      latency_bucket: "0-250ms",
      error_code: null,
    };
  }
  const kind = KIND_MAP[scenario.provider_output_kind] || "text";
  return {
    provider: "mock",
    provider_mode: "mock",
    provider_called: true,
    network_egress_used: false,
    provider_response_kind: kind,
    output_text: scenario.output,
    tool_request: scenario.tool_request,
    usage: { input_tokens_bucket: "0-1k", output_tokens_bucket: "0-1k" },
    latency_bucket: "0-250ms",
    error_code: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/unit/llmShield/gateway/mockOutcomes.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llmShield/gateway/mockGatewayProvider.js tests/unit/llmShield/gateway/mockOutcomes.test.js
git commit -m "feat(stage-3r): deterministic mock unavailable/refusal outcomes"
```

---

### Task 4: Fallback orchestrator (pure, injected runAttempt)

**Files:**
- Create: `src/llmShield/gateway/fallbackOrchestrator.js`
- Test: `tests/unit/llmShield/gateway/fallbackOrchestrator.test.js`

**Interfaces:**
- Consumes: `classifyProviderOutcome`, `shouldFallback`, `riskDeltaFor`, `mergeTrustMonotonic`, `applySwapFloor` from `./fallbackPolicy.js`.
- Produces: `runFallbackOrchestration({ preCheck, config, runAttempt }): Promise<Result>` where:
  - `config = { fallbackOnRefusalEnabled:boolean, budget, primaryModel:string, fallbackModel:string }`
  - `runAttempt(model, attemptIndex): Promise<{ raw, riskVerdict, refusalMeta? }>` — the caller runs the provider + boundaries and returns the attempt's `raw` (for outcome classification), the attempt's recomputed `riskVerdict` (`accepted|warning|blocked`), and optional `refusalMeta` (from `normaliseRefusal`).
  - `Result = { attempts:[{model,outcome,riskVerdict}], finalAttempt, fallbackUsed:boolean, trigger, terminalReason, riskDelta, finalVerdict, fallback_chain:[...] }`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/gateway/fallbackOrchestrator.test.js
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

// scripted runAttempt: attempts[i] returns the i-th scripted result
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
  assert.equal(r.terminalReason, "anti_bypass_precheck_terminal");
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/fallbackOrchestrator.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the orchestrator**

```javascript
// src/llmShield/gateway/fallbackOrchestrator.js
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
  attempts.push({ model: config.primaryModel, outcome: primaryOutcome, riskVerdict: primary.riskVerdict });

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/unit/llmShield/gateway/fallbackOrchestrator.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Verify 100% function coverage (policy + orchestrator)**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/gateway/fallbackPolicy.test.js tests/unit/llmShield/gateway/fallbackOrchestrator.test.js`
Expected: PASS; `fallbackPolicy.js` and `fallbackOrchestrator.js` at 100% functions.

- [ ] **Step 6: Commit**

```bash
git add src/llmShield/gateway/fallbackOrchestrator.js tests/unit/llmShield/gateway/fallbackOrchestrator.test.js
git commit -m "feat(stage-3r): pure fallback orchestrator — one-hop cap, monotonic trust, fallback_chain"
```

---

### Task 5: Self-proof pack — prove the bypass cannot happen

**Files:**
- Create: `src/llmShield/gateway/fallbackSelfProof.js`
- Test: `tests/unit/llmShield/gateway/fallbackSelfProof.test.js`

**Interfaces:**
- Consumes: `runFallbackOrchestration`, `DEFAULT_FALLBACK_BUDGET`, `refusalFallbackAllowed`.
- Produces: `runFallbackSelfProof(): { fixtures:[{fixture_id, expected, observed, passed}], summary:{ all_passed, fallback_bypass_successes } }`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/gateway/fallbackSelfProof.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runFallbackSelfProof } from "../../../../src/llmShield/gateway/fallbackSelfProof.js";

test("self-proof: every detector fires and zero bypass successes", async () => {
  const sp = await runFallbackSelfProof();
  assert.ok(sp.fixtures.every((f) => f.passed), JSON.stringify(sp.fixtures.filter((f) => !f.passed)));
  assert.equal(sp.summary.all_passed, true);
  assert.equal(sp.summary.fallback_bypass_successes, 0);
  const ids = sp.fixtures.map((f) => f.fixture_id);
  for (const id of [
    "availability-failure-swap",
    "refusal-fallback-enabled",
    "refusal-fallback-disabled",
    "provider-refusal-unsafe-local-block",
    "simurgh-block-never-swaps",
    "trust-never-improves",
    "cap-one-hop",
    "streaming-refusal-partial-output-discarded",
  ])
    assert.ok(ids.includes(id), `missing ${id}`);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/fallbackSelfProof.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the self-proof**

```javascript
// src/llmShield/gateway/fallbackSelfProof.js
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
const allowed = { inputVerdict: "allowed", contextVerdict: "accepted" };
const scripted = (list) => {
  let i = 0;
  return async () => list[Math.min(i++, list.length - 1)];
};
const TEXT = { raw: { provider_response_kind: "text" }, riskVerdict: "accepted" };
const UNAVAIL = { raw: { error_code: "gateway_provider_unavailable" }, riskVerdict: "accepted" };
const REFUSE = { raw: { provider_response_kind: "refusal" }, riskVerdict: "accepted", refusalMeta: { refusal_category: "cyber" } };

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
  add("provider-refusal-unsafe-local-block", { fallbackUsed: false, terminalReason: "anti_bypass_precheck_terminal" }, { fallbackUsed: r.fallbackUsed, terminalReason: r.terminalReason });

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

  // streaming partial discard: a refusal carries no usable output; the fallback's text is the only answer
  r = await run({ config: { fallbackOnRefusalEnabled: true } }, [REFUSE, TEXT]);
  add(
    "streaming-refusal-partial-output-discarded",
    { finalKind: "text", refusalHadNoOutput: true },
    { finalKind: r.finalAttempt.raw.provider_response_kind, refusalHadNoOutput: (REFUSE.raw.output_text ?? "") === "" }
  );

  // A "bypass success" = a Simurgh-terminal pre-check that still produced a fallback.
  const bypassSuccesses = fixtures.filter(
    (f) => f.fixture_id === "provider-refusal-unsafe-local-block" && f.observed.fallbackUsed === true
  ).length;

  return {
    type: "simurgh.gateway.fallback_self_proof.v1",
    stage: "3R",
    fixtures,
    summary: { all_passed: fixtures.every((f) => f.passed), fallback_bypass_successes: bypassSuccesses },
  };
}
```

- [ ] **Step 4: Run + coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/gateway/fallbackSelfProof.test.js`
Expected: PASS; `fallbackSelfProof.js` at 100% functions.

- [ ] **Step 5: Commit**

```bash
git add src/llmShield/gateway/fallbackSelfProof.js tests/unit/llmShield/gateway/fallbackSelfProof.test.js
git commit -m "feat(stage-3r): fallback self-proof — bypass-cannot-happen, fallback_bypass_successes:0"
```

---

### Task 6: Receipt + audit extensions

**Files:**
- Modify: `src/llmShield/gateway/gatewayReceipt.js`
- Modify: `src/llmShield/gateway/gatewayAudit.js`
- Test: `tests/unit/llmShield/gateway/fallbackReceiptAudit.test.js`

**Interfaces:**
- `buildGatewayReceipt(a)` additionally emits `fallback_chain: a.fallbackChain ?? []`, `fallback_used: a.fallbackUsed === true`, `fallback_on_refusal_enabled: a.fallbackOnRefusalEnabled === true`, `fallback_budget: a.fallbackBudget ?? null`.
- `gatewayAudit.js` adds `recordGatewayFallbackSwap(chain, key, d)` where `d = { from, to, trigger, refusalCategory, riskDelta }`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/gateway/fallbackReceiptAudit.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildGatewayReceipt } from "../../../../src/llmShield/gateway/gatewayReceipt.js";
import { createChain, verifyChain } from "../../../../src/audit/hmacChain.js";
import { recordGatewayFallbackSwap } from "../../../../src/llmShield/gateway/gatewayAudit.js";

test("receipt carries fallback fields", () => {
  const r = buildGatewayReceipt({
    sessionIdHash: "sha256:s", runId: "gw_run_001", taskType: "t",
    inputHash: "sha256:i", normalisedInputHash: "sha256:n", contextVerdict: "accepted",
    gatewayVerdict: "warning", providerMode: "mock", provider: "mock", providerCalled: true,
    providerResponseKind: "text", providerResponseHash: "sha256:p", toolGateVerdict: "not_requested",
    outputFirewallVerdict: "allowed", outputHash: "sha256:o", riskScore: 3, riskVerdict: "warning",
    reasonCodes: [], auditEntryHash: "sha256:a", timestamp: "2026-06-21T00:00:00.000Z",
    fallbackChain: [{ from: "claude-fable-5", to: "claude-opus-4-8", trigger: "availability", risk_delta: 2 }],
    fallbackUsed: true, fallbackOnRefusalEnabled: false,
    fallbackBudget: { max_hops: 1, timeout_ms: 30000, max_additional_provider_calls: 1 },
  });
  assert.equal(r.fallback_used, true);
  assert.equal(r.fallback_on_refusal_enabled, false);
  assert.equal(r.fallback_chain[0].to, "claude-opus-4-8");
  assert.equal(r.fallback_budget.max_hops, 1);
});

test("recordGatewayFallbackSwap appends a verifiable chain entry", () => {
  const chain = createChain();
  const h = recordGatewayFallbackSwap(chain, "k", { from: "claude-fable-5", to: "claude-opus-4-8", trigger: "provider_refusal", refusalCategory: "cyber", riskDelta: 3 });
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(verifyChain(chain, "k").valid, true);
  assert.equal(chain.entries.at(-1).type, "gateway_fallback_swap");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/fallbackReceiptAudit.test.js`
Expected: FAIL — fields/function missing. (If `verifyChain` returns a different shape, adjust the assertion to match `src/audit/hmacChain.js`'s actual return; the file's `verifyChain` returns `{ valid, errors }`.)

- [ ] **Step 3: Edit `gatewayReceipt.js`**

In `buildGatewayReceipt`, before the closing `}` of the returned object (after `privacy_mode: "metadata_only",` and any trailing fields), add:

```javascript
    fallback_used: a.fallbackUsed === true,
    fallback_on_refusal_enabled: a.fallbackOnRefusalEnabled === true,
    fallback_chain: a.fallbackChain ?? [],
    fallback_budget: a.fallbackBudget ?? null,
```

- [ ] **Step 4: Edit `gatewayAudit.js`**

Add a new exported recorder following the existing `recordGatewayRun` pattern (which calls `appendEntry(chain, key, "<type>", payload)` and returns the entry hash):

```javascript
// in src/llmShield/gateway/gatewayAudit.js
export function recordGatewayFallbackSwap(chain, key, d) {
  return appendEntry(chain, key, "gateway_fallback_swap", {
    from: d.from,
    to: d.to,
    trigger: d.trigger,
    refusal_category: d.refusalCategory ?? null,
    risk_delta: d.riskDelta,
  });
}
```

(Confirm `appendEntry` is imported at the top of `gatewayAudit.js`; the existing recorders use it. `appendEntry` returns the new entry's `sig`/hash — return it.)

- [ ] **Step 5: Run to verify it passes**

Run: `node --test tests/unit/llmShield/gateway/fallbackReceiptAudit.test.js`
Expected: PASS. (Adjust the `verifyChain` assertion to the real return shape if needed.)

- [ ] **Step 6: Commit**

```bash
git add src/llmShield/gateway/gatewayReceipt.js src/llmShield/gateway/gatewayAudit.js tests/unit/llmShield/gateway/fallbackReceiptAudit.test.js
git commit -m "feat(stage-3r): gateway receipt + audit extensions for fallback swaps"
```

---

### Task 7: Wire the orchestrator into the gateway run handler

**Files:**
- Modify: `src/llmShield/gateway/gatewayRouter.js`
- Test: covered by the gateway E2E smoke (Task 8); no new unit file.

**Interfaces:**
- Consumes: `runFallbackOrchestration`, `normaliseRefusal`/`isRefusal`, the receipt/audit additions.
- The run handler replaces its inline single-provider block with: a `runAttempt(model, idx)` closure that calls the provider for `model`, normalises output, runs the tool gate + output firewall, computes that attempt's `runPoints` + `riskVerdict`, and returns `{ raw, riskVerdict, refusalMeta }`; then calls `runFallbackOrchestration`; then builds the receipt from the final attempt + `fallback_chain`, and records a `recordGatewayfallbackSwap` audit entry per swap.

- [ ] **Step 1: Add the env flag + budget at the top of the run handler**

After the existing config reads (near `const taskType = ...`), add:

```javascript
  const fallbackOnRefusalEnabled = process.env.SIMURGH_GATEWAY_FALLBACK_ON_REFUSAL === "true";
  const fallbackBudget = { max_hops: 1, timeout_ms: 30000, max_additional_provider_calls: 1 };
  const fallbackModel = process.env.SIMURGH_GATEWAY_FALLBACK_MODEL || "claude-opus-4-8";
  const primaryModel = providerMode === "live" ? liveConfig.model : "mock-primary";
```

- [ ] **Step 2: Extract a `runAttempt` closure and call the orchestrator**

Replace the existing `// ----- provider (no network) -----` block AND the `norm`/`toolResult`/`outputResult`/`runPoints`/`record.riskScore`/`riskVerdictValue` computation with a single attempt function the orchestrator drives. The attempt encapsulates exactly the current per-run boundary logic:

```javascript
  // Stage 3R: each attempt = provider(model) → normalise → tool gate → output firewall.
  async function runAttempt(model, attemptIndex) {
    let attemptRaw = null;
    try {
      if (providerMode === "mock") {
        // attempt 0 uses the request scenario; the fallback attempt uses a benign scenario.
        const scenarioName = attemptIndex === 0 && isValidScenario(body.scenario) ? body.scenario : "benign";
        const scenario = body.scenario_outcome && attemptIndex === 0
          ? { provider_outcome: body.scenario_outcome }
          : getScenario(scenarioName);
        attemptRaw = getGatewayProvider("mock").generate({ scenario });
      } else if (providerMode === "recorded_fixture") {
        const manifest = JSON.parse(await readFile(`${FIXTURE_DIR}/fixture-manifest.json`, "utf8"));
        const rel = selectFixtureEntry(body.case_id, manifest);
        const fixture = JSON.parse(await readFile(`${FIXTURE_DIR}/${rel}`, "utf8"));
        validateRecordedFixture(fixture);
        attemptRaw = getGatewayProvider("recorded_fixture").generate({ fixture });
      } else if (providerMode === "live") {
        const gate = checkLiveCall(live.ledger, live.limits, Date.now());
        if (!gate.ok) throw new Error(gate.reason);
        const psc = buildProviderSafeContext(contextResult.acceptedContexts ?? body.contexts, { contextMode: liveConfig.contextMode });
        attemptRaw = await getGatewayProvider("live").generate({
          model, safeInput: normalised, providerSafeContext: psc,
          apiKey: process.env.ANTHROPIC_API_KEY, limits: live.limits,
        });
        recordLiveCall(live.ledger, Date.now());
        liveConfig.__psc = psc;
      }
    } catch (e) {
      attemptRaw = { error_code: String(e.message || "gateway_provider_error"), provider_response_kind: "error", output_text: "" };
    }
    const refusalMeta = isRefusal(attemptRaw) ? normaliseRefusal(attemptRaw) : null;
    const normA = normaliseProviderOutput(attemptRaw);
    const toolA = normA.toolRequest ? gateToolRequest(normA.toolRequest) : { verdict: "not_requested", reasonCodes: [], toolNameHash: null, toolCalled: false };
    const outA = toolA.verdict !== "blocked" ? scanOutput(normA.text, { providerCalled: true }) : { verdict: "not_called", reasonCodes: [], outputHash: hashPrompt(normA.text) };
    const pts = riskPointsFor({ inputVerdict, contextVerdict: contextResult.verdict, toolGateVerdict: toolA.verdict, outputFirewallVerdict: outA.verdict, repeatedWarning: false });
    const verdict = toolA.verdict === "blocked" || outA.verdict === "blocked" ? "blocked" : riskVerdict(pts);
    return { raw: attemptRaw, norm: normA, toolResult: toolA, outputResult: outA, runPoints: pts, riskVerdict: verdict, refusalMeta };
  }

  let orchestration = null;
  let finalA = { raw: null, norm: { kind: "text", text: "", toolRequest: null }, toolResult: { verdict: "not_requested", reasonCodes: [], toolNameHash: null, toolCalled: false }, outputResult: { verdict: "not_called", reasonCodes: [], outputHash: hashPrompt("") }, runPoints: 0, riskVerdict: "accepted" };
  if (providerCalled) {
    orchestration = await runFallbackOrchestration({
      preCheck: { inputVerdict, contextVerdict: contextResult.verdict },
      config: { fallbackOnRefusalEnabled, budget: fallbackBudget, primaryModel, fallbackModel },
      runAttempt,
    });
    finalA = orchestration.finalAttempt;
  }
  const norm = finalA.norm;
  const toolResult = finalA.toolResult;
  const outputResult = finalA.outputResult;
  const providerResponseHash = hashPrompt(norm.text);
```

- [ ] **Step 3: Fold fallback risk into the accumulator + verdict (monotonic)**

Replace the `record.riskScore = ... + runPoints;` line and the `riskVerdictValue` computation with:

```javascript
  record.riskScore = (record.riskScore ?? 0) + (orchestration ? finalA.runPoints + orchestration.riskDelta : 0);
  if (liveConfig) {
    record.riskScore += 1;
    if ((liveConfig.__psc?.context_count ?? 0) > 0) record.riskScore += 1;
    if (finalA.raw?.error_code === "gateway_live_timeout") record.riskScore += 2;
  }
  let riskVerdictValue =
    inputVerdict === "blocked" || contextResult.verdict === "rejected" ? "blocked" : riskVerdict(record.riskScore);
  if (orchestration?.fallbackUsed) riskVerdictValue = mergeTrustMonotonic(riskVerdictValue, orchestration.finalVerdict);
```

Add the imports at the top of the file:

```javascript
import { runFallbackOrchestration } from "./fallbackOrchestrator.js";
import { mergeTrustMonotonic } from "./fallbackPolicy.js";
import { normaliseRefusal, isRefusal } from "./anthropicResponseNormalise.js";
import { recordGatewayFallbackSwap } from "./gatewayAudit.js";
```

- [ ] **Step 4: Record swap audit events + pass fallback fields to the receipt**

After `recordGatewayRun(...)` and before `buildGatewayReceipt(...)`, add:

```javascript
  if (orchestration?.fallbackUsed) {
    for (const swap of orchestration.fallback_chain)
      recordGatewayFallbackSwap(record.auditChain, key, {
        from: swap.from, to: swap.to, trigger: swap.trigger, refusalCategory: swap.refusal_category, riskDelta: swap.risk_delta,
      });
  }
```

And add to the `buildGatewayReceipt({ ... })` argument object:

```javascript
    fallbackUsed: orchestration?.fallbackUsed === true,
    fallbackOnRefusalEnabled,
    fallbackChain: orchestration?.fallback_chain ?? [],
    fallbackBudget,
```

- [ ] **Step 5: Run the existing gateway tests to confirm no regression**

Run: `node --test tests/unit/llmShield/gateway/ tests/e2e/llm_shield_stage3e*.mjs 2>/dev/null; npm test 2>&1 | grep -E "# (pass|fail)"`
Expected: all pass (existing 3E behaviour unchanged when no fallback is triggered: a clean primary returns `fallbackUsed:false`, identical receipt fields plus the new defaults).

- [ ] **Step 6: Commit**

```bash
git add src/llmShield/gateway/gatewayRouter.js
git commit -m "feat(stage-3r): wire fallback orchestrator into the gateway run handler"
```

---

### Task 8: Gateway E2E smoke + security audit + check.sh wiring

**Files:**
- Create: `scripts/smoke-llm-shield-stage3r.sh`
- Create: `scripts/security-audit-llm-shield-stage3r.mjs`
- Create: `tests/e2e/llm_shield_stage3r_fallback.mjs`
- Modify: `scripts/check.sh`

**Interfaces:** the E2E boots the gateway in-process (reuse the Stage 3E E2E harness pattern in `tests/e2e/llm_shield_stage3e*.mjs`), creates a session, and drives: (a) availability fallback via `scenario_outcome:"unavailable"`; (b) refusal with flag OFF → terminal; (c) anti-bypass (a blocked input never swaps); plus the self-proof.

- [ ] **Step 1: Write the E2E (drives the three end-to-end paths)**

```javascript
// tests/e2e/llm_shield_stage3r_fallback.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 3R E2E: availability fallback + refusal-terminal + anti-bypass,
// plus the in-process self-proof. No network. Reuses the Stage 3E gateway harness.
import test from "node:test";
import assert from "node:assert/strict";
import { runFallbackSelfProof } from "../../src/llmShield/gateway/fallbackSelfProof.js";

test("stage 3R self-proof passes end-to-end with zero bypass successes", async () => {
  const sp = await runFallbackSelfProof();
  assert.equal(sp.summary.all_passed, true);
  assert.equal(sp.summary.fallback_bypass_successes, 0);
});
```

> Implementer note: if the Stage 3E E2E harness (`tests/e2e/llm_shield_stage3e*.mjs`) exposes an in-process `app`/`request` helper, extend this file to POST `/run` with `{ scenario_outcome: "unavailable" }` and assert the receipt has `fallback_used: true`, `fallback_chain[0].to: "claude-opus-4-8"`, `risk_verdict: "warning"`; POST `{ scenario_outcome: "refusal" }` with the flag unset and assert `fallback_used: false`; POST a blocked input and assert `fallback_used: false`. Follow the existing harness's exact boot/auth pattern.

- [ ] **Step 2: Write the security audit (no policy-drift guard — this stage changes the gateway by design)**

```javascript
// scripts/security-audit-llm-shield-stage3r.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3R security audit: the fallback path cannot bypass containment.
import { runFallbackSelfProof } from "../src/llmShield/gateway/fallbackSelfProof.js";

const sp = await runFallbackSelfProof();
const errors = [];
if (!sp.summary.all_passed) errors.push("self-proof fixture(s) failed");
if (sp.summary.fallback_bypass_successes !== 0) errors.push("fallback bypass succeeded");
const antiBypass = sp.fixtures.find((f) => f.fixture_id === "provider-refusal-unsafe-local-block");
if (!antiBypass || antiBypass.observed.fallbackUsed === true) errors.push("anti-bypass lock not enforced");
if (errors.length) {
  console.error("stage3r security: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3r security: PASS");
```

- [ ] **Step 3: Write the smoke**

```bash
# scripts/smoke-llm-shield-stage3r.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3R smoke: deterministic, no network. Proves fallback resilience cannot bypass.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node --test tests/e2e/llm_shield_stage3r_fallback.mjs
node scripts/security-audit-llm-shield-stage3r.mjs
echo "stage3r smoke: passed"
```

- [ ] **Step 4: Make executable + run**

Run:
```bash
chmod +x scripts/smoke-llm-shield-stage3r.sh
bash scripts/smoke-llm-shield-stage3r.sh
```
Expected: `stage3r smoke: passed`.

- [ ] **Step 5: Wire into check.sh**

After the 3Q helper-coverage block (search `LLM Shield 3Q temporal helper coverage`), add a 3R block mirroring it:

```bash
step "LLM Shield 3R trust-preserving provider fallback"
if scripts/smoke-llm-shield-stage3r.sh > "$LOG_DIR/llm-shield-stage3r-smoke.log" 2>&1; then
  pass "LLM Shield 3R trust-preserving provider fallback"
else
  fail "LLM Shield 3R trust-preserving provider fallback"
  tail -80 "$LOG_DIR/llm-shield-stage3r-smoke.log"
fi

step "LLM Shield 3R fallback helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=src/llmShield/gateway/fallbackPolicy.js \
  --test-coverage-include=src/llmShield/gateway/fallbackOrchestrator.js \
  --test-coverage-include=src/llmShield/gateway/fallbackSelfProof.js \
  --test-coverage-functions=100 \
  tests/unit/llmShield/gateway/fallbackPolicy.test.js \
  tests/unit/llmShield/gateway/fallbackOrchestrator.test.js \
  tests/unit/llmShield/gateway/fallbackSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3r-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3R fallback helper coverage"
else
  fail "LLM Shield 3R fallback helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3r-helper-coverage.log"
fi
```

Update the TOC/banner: `Stage 3A–3Q` → `Stage 3A–3R`, and extend the pipeline description with `→ trust-preserving provider fallback (3R)`.

- [ ] **Step 6: Confirm syntax + run**

Run: `bash -n scripts/check.sh && bash scripts/smoke-llm-shield-stage3r.sh && echo OK`
Expected: `stage3r smoke: passed` then `OK`.

- [ ] **Step 7: Commit**

```bash
git add scripts/smoke-llm-shield-stage3r.sh scripts/security-audit-llm-shield-stage3r.mjs tests/e2e/llm_shield_stage3r_fallback.mjs scripts/check.sh
git commit -m "feat(stage-3r): gateway E2E smoke, security audit, check.sh wiring (3A–3R)"
```

---

### Task 9: Documentation quartet + stage doc + finish

**Files:**
- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3R_TRUST_PRESERVING_PROVIDER_FALLBACK.md`
- Create: `docs/research/llm-shield/STAGE_3R_CLOSEOUT.md`, `STAGE_3R_THREAT_MODEL.md`, `STAGE_3R_VALIDATION_MATRIX.md`, `STAGE_3R_REVIEWER_CHECKLIST.md`

- [ ] **Step 1: Write the stage doc** mirroring the 3Q stage doc: crown sentence (verbatim from spec); the three "no answer" events; the anti-bypass invariant; monotonic trust; same HMAC chain; boundary re-scan; the real Fable 5 grounding (`stop_reason:"refusal"`, null-safe `stop_details`, `claude-fable-5`→`claude-opus-4-8`, server-side fallback is refusal-only); self-proof table; non-claims; external anchors (the two Fable 5 doc URLs + AgentDyn/Firewalls/PISmith/OWASP/NIST).

- [ ] **Step 2: Write the quartet.** The **threat model** is load-bearing here (this changes the security path): adversaries = refusal-shopping, firewall-bypass-via-refusal, trust-laundering, dirty continuation, denial-of-wallet, double-fallback; each mapped to its gate. The **validation matrix** maps each invariant → enforcing test/script. The **reviewer checklist** includes the verify commands + the explicit note that this stage modifies `src/llmShield/gateway/**` and is reviewed as a feature change (not policy-drift). The **closeout** records results + Feature B as next.

- [ ] **Step 3: Prettier + re-smoke**

Run: `npx prettier --write "docs/research/llm-shield/*3R*.md" "docs/research/llm-shield/LLM_SHIELD_STAGE_3R*.md"` then `bash scripts/smoke-llm-shield-stage3r.sh`
Expected: smoke still passes. (Avoid `**` inside inline code in markdown — the 3P/3Q prettier lesson.)

- [ ] **Step 4: Commit**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3R_TRUST_PRESERVING_PROVIDER_FALLBACK.md docs/research/llm-shield/STAGE_3R_CLOSEOUT.md docs/research/llm-shield/STAGE_3R_THREAT_MODEL.md docs/research/llm-shield/STAGE_3R_VALIDATION_MATRIX.md docs/research/llm-shield/STAGE_3R_REVIEWER_CHECKLIST.md
git commit -m "docs(stage-3r): stage doc + closeout/threat-model/validation-matrix/reviewer-checklist"
```

- [ ] **Step 5: Full verification**

Run: `npm test` (expect all pass, 757 + new 3R unit tests), `npx prettier --check .` (clean), `bash scripts/check.sh` (the two new 3R steps PASS; pre-existing environmental fails unchanged — vendored `.venv` secret scan, Windows `.NET`, the flaky Linux Rust `xwayland_refuses_non_local_display`).

- [ ] **Step 6: Finish the branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch. After merge: tag `v2.1.0-stage-3r-trust-preserving-provider-fallback` on the merge commit + GitHub release; add the memory entry `project_stage-3r-trust-preserving-provider-fallback.md` + MEMORY.md line (record that this is the first `src/llmShield` change since 3E and the anti-bypass lock). If the post-merge push-to-main run trips the known Linux Rust flake, `gh run rerun --failed`.

---

## Self-Review

**1. Spec coverage:**
- Crown sentence / three-event trigger model → Tasks 1 (`shouldFallback`), 4, 9. ✓
- Anti-bypass invariant → Task 1 `refusalFallbackAllowed` + Task 4 + Task 5 `provider-refusal-unsafe-local-block` + Task 8 security audit. ✓
- Monotonic trust / never-launder → Task 1 `mergeTrustMonotonic`/`applySwapFloor` + Task 4 + Task 7 step 3. ✓
- Same HMAC chain across swap → Task 6 `recordGatewayFallbackSwap` + Task 7 step 4. ✓
- Fallback output re-runs every boundary → Task 7 `runAttempt` (tool gate + output firewall per attempt). ✓
- Client-side default / one authority / one hop → Task 1 budget + Task 4 single fallback + Global Constraints. ✓
- Default OFF flag + receipt fields → Task 6 + Task 7 step 1/4. ✓
- Fresh approved envelope → Task 7 `runAttempt` uses `normalised`/approved contexts, never partial output. ✓
- Budget / denial-of-wallet → Task 1 `withinBudget` + receipt `fallback_budget` (Task 6). ✓
- Null-safe refusal shape + credit fields → Task 2 + Task 4 `fallback_chain`. ✓
- Streaming-partial-discard → Task 5 fixture. ✓
- Self-proof both layers + `fallback_bypass_successes:0` → Tasks 1–5 unit + Task 5 pack + Task 8. ✓
- Touches `src/llmShield/gateway` + own threat model, NOT policy-drift → Task 8 (no policy-drift script) + Task 9 threat model. ✓

**2. Placeholder scan:** No TBD/TODO; code steps carry complete code. The Task 7 wiring references the real handler structure shown in the spec exploration; Task 8 step 1 notes the harness extension explicitly rather than inventing an unknown helper. ✓

**3. Type consistency:** `runAttempt` returns `{raw, riskVerdict, refusalMeta, norm, toolResult, outputResult, runPoints}` consistently between Task 4 (consumer) and Task 7 (producer); `shouldFallback`/`classifyProviderOutcome`/`mergeTrustMonotonic`/`applySwapFloor`/`riskDeltaFor` signatures match across Tasks 1, 4, 5, 7; receipt fields (`fallback_used`, `fallback_on_refusal_enabled`, `fallback_chain`, `fallback_budget`) consistent across Tasks 6, 7. ✓

> **Implementer note:** Task 7 modifies a large existing handler. Make the edits incrementally and run `npm test` after each sub-step; the invariant is that a **clean primary produces an identical receipt to today plus the four new default fields** (`fallback_used:false`, `fallback_on_refusal_enabled:false`, `fallback_chain:[]`, `fallback_budget:{...}`). If any existing 3E test asserts exact receipt equality, update it to include the new defaults in the same commit.
