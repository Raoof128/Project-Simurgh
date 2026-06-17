# Stage 3E-core — LLM Shield Industry Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the Stage 3D containment core in a stable, **no-network** HTTP gateway with an explicit provider-mode contract (`mock` + synthetic `recorded_fixture`; `live` fails closed), so external reviewers can test that unsafe consequences are blocked, audited, and receipt-backed — without any network, API key, or transcript-capture surface.

**Architecture:** A new `src/llmShield/gateway/` module set mounted at `/api/llm-shield/gateway/*` (registered **before** the base router). It reuses the existing session/token scheme, HMAC audit chain, and the Stage 3D boundaries (context guard, tool gate, output firewall, risk accumulator) verbatim, and emits a new `schema_version "3E"` gateway receipt. Providers are no-network: `mock` reuses the 3D scenarios; `recorded_fixture` replays synthetic committed fixtures selected by an opaque `case_id` resolved through a manifest; `live` is a fail-closed contract with no adapter.

**Tech Stack:** Node.js ESM, Express, `node:test` + `node:assert/strict`, `node:crypto` HMAC, Prettier, bash/`.mjs` gates, Docker (mock default, non-root), OpenAPI 3.1. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-06-17-stage-3e-core-llm-shield-industry-gateway-design.md`
**Branch:** `stage-3e-core-industry-gateway` (already created).

---

## Conventions (apply to every task)

- Every new `.js`/`.mjs`/`.sh` starts with `// SPDX-License-Identifier: AGPL-3.0-or-later` (`#` form for bash, after shebang).
- Run one unit suite: `node --test tests/unit/llmShield/gateway/<name>.test.js`. All tests: `npm test`.
- Before each task's final commit: `npm run format` then `npx prettier --check .`.
- **Change-protocol (required):** before the first code change read `AGENT.md`, `agent.md`, `CHANGELOG.md`; after each phase append a `Raouf:` entry to `AGENT.md` + `CHANGELOG.md`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Neutral messages.
- **Do NOT modify:** `safetyReceipt.js`, `stage3dReceipt.js`, `promptFirewall.js`, `promptNormalise.js`, `stage3dMockScenarios.js`, `llmShieldRouter.js`. Only `server.js` is touched (mount).

---

## File Structure

**New runtime (`src/llmShield/gateway/`):**
- `gatewayEnv.js` — resolve/validate provider-mode contract; `live` → fail-closed.
- `providerTypes.js` — shared enums/constants (response kinds, modes, providers).
- `providerOutputNormalise.js` — coerce a provider's raw return into `{ kind, text, toolRequest }`.
- `providerRegistry.js` — map provider mode → provider with a `generate()` method.
- `mockGatewayProvider.js` — deterministic, reuses 3D scenarios.
- `recordedFixtureProvider.js` — synthetic fixture replay; `case_id` manifest selector; fail-closed provenance/hash checks.
- `gatewayReceipt.js` — `schema_version "3E"` metadata-only receipt (reuses `hashReceipt`).
- `gatewayAudit.js` — gateway audit events + ordered recorder.
- `gatewayRateLimit.js` — input/context/output caps + timeout (OWASP LLM10).
- `gatewayRouter.js` — routes + run handler composing all of the above + 3D boundaries.

**Modified runtime:** `server.js` (mount gateway router before base router).

**Tests:** one `tests/unit/llmShield/gateway/<module>.test.js` per module; e2e smokes + fixture runner under `tests/e2e/`.

**Scripts:** `scripts/{smoke,security-audit,privacy-audit,docker-smoke}-llm-shield-stage3e.{sh,mjs}` + `check.sh` edit.

**Docs/evidence/container:** `docs/research/llm-shield/{LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY,STAGE_3E_CORE_THREAT_MODEL,STAGE_3E_CORE_VALIDATION_MATRIX,STAGE_3E_CORE_REVIEWER_CHECKLIST,STAGE_3E_CORE_CLOSEOUT}.md`; `docs/research/llm-shield/evidence/stage-3e/**`; `Dockerfile.gateway`, `docker-compose.gateway.yml`, `.dockerignore`.

---

## Shared interface contracts (fixed; referenced across tasks)

```text
// providerTypes.js
GATEWAY_PROVIDER_MODES = ["mock","recorded_fixture","live"]
GATEWAY_PROVIDERS_CORE = ["mock","recorded_fixture"]   // selectable in core
PROVIDER_RESPONSE_KINDS = ["text","tool_request","refusal","error","leaky_text"]

// gatewayEnv.js
resolveGatewayEnv(env=process.env) -> { provider_mode, live_provider_enabled, provider, network_egress_allowed }
validateProviderSelection({ providerMode, provider }) -> { ok:true } | { ok:false, reason }
  // live -> gateway_live_provider_not_implemented; bad mode -> gateway_provider_mode_invalid;
  // bad provider -> gateway_provider_not_allowed

// providerOutputNormalise.js
normaliseProviderOutput(raw) -> { kind, text, toolRequest }   // kind in PROVIDER_RESPONSE_KINDS

// recordedFixtureProvider.js
RECORDED_CASE_ID_RE = /^3e_[a-z_]+_\d{3}$/
selectFixtureEntry(caseId, manifest) -> entry | throws { reason }
validateRecordedFixture(fixture) -> true | throws { reason }
generateFromFixture(fixture) -> rawProviderReturn

// mockGatewayProvider.js
generateMockOutput({ scenario }) -> rawProviderReturn

// providerRegistry.js
getGatewayProvider(providerMode) -> { name, generate }   // throws gateway_provider_mode_invalid otherwise

// rawProviderReturn shape (transient; never persisted raw):
{ provider, provider_mode, provider_called, network_egress_used,
  provider_response_kind, output_text, tool_request, usage, latency_bucket, error_code }

// gatewayReceipt.js
GATEWAY_RECEIPT_TYPE = "simurgh.llm_gateway_receipt.v1"; GATEWAY_SCHEMA_VERSION = "3E"
buildGatewayReceipt(args) -> receipt object (spec §15)
hashGatewayReceipt(receipt) -> "sha256:..."   // re-export of safetyReceipt.hashReceipt

// gatewayAudit.js
GATEWAY_EVENTS (frozen)
recordGatewaySessionCreated(chain, key) -> chain.prevHash
recordGatewayRun(chain, key, decision) -> chain.prevHash
recordGatewayReceiptExported(chain, key, receiptHash) -> void

// gatewayRateLimit.js
gatewayLimits(env=process.env) -> { maxInputChars, maxContextChars, maxOutputChars, timeoutMs,
  maxLiveCallsPerSession, maxLiveCallsPerMinute, maxDailyLiveCalls }
checkInputCaps({ inputChars, contextChars }, limits) -> { ok:true } | { ok:false, reason }
```

`decision` for `recordGatewayRun`:
```text
{ inputVerdict, contextVerdict, providerCalled, providerResponseKind,
  toolGateVerdict, outputFirewallVerdict, riskVerdict, reasonCodes,
  inputHash, normalisedInputHash, contextHashes, toolNameHash,
  providerResponseHash, outputHash }
```

---

# Phase 1 — Change-protocol + env gate

## Task 0: Read change-protocol files, baseline

- [ ] **Step 1: Read protocol files**

Run: `cat AGENT.md agent.md CHANGELOG.md | head -120`
Note the `Raouf:` entry format.

- [ ] **Step 2: Green baseline + branch**

Run: `git branch --show-current && npm test 2>&1 | grep -E "# (tests|pass|fail)"`
Expected: branch `stage-3e-core-industry-gateway`; 520 pass / 0 fail.

## Task 1: `providerTypes.js` + `gatewayEnv.js`

**Files:**
- Create: `src/llmShield/gateway/providerTypes.js`, `src/llmShield/gateway/gatewayEnv.js`
- Test: `tests/unit/llmShield/gateway/gatewayEnv.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/gatewayEnv.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveGatewayEnv, validateProviderSelection } from "../../../../src/llmShield/gateway/gatewayEnv.js";

describe("gatewayEnv", () => {
  test("defaults to mock, no network, live disabled", () => {
    const c = resolveGatewayEnv({});
    assert.equal(c.provider_mode, "mock");
    assert.equal(c.live_provider_enabled, false);
    assert.equal(c.network_egress_allowed, false);
  });

  test("mock and recorded_fixture selections are allowed", () => {
    assert.deepEqual(validateProviderSelection({ providerMode: "mock", provider: "mock" }), { ok: true });
    assert.deepEqual(
      validateProviderSelection({ providerMode: "recorded_fixture", provider: "recorded_fixture" }),
      { ok: true }
    );
  });

  test("live fails closed in core", () => {
    assert.deepEqual(validateProviderSelection({ providerMode: "live", provider: "anthropic" }), {
      ok: false,
      reason: "gateway_live_provider_not_implemented",
    });
  });

  test("unknown mode and unknown provider are rejected", () => {
    assert.equal(validateProviderSelection({ providerMode: "nope", provider: "mock" }).reason, "gateway_provider_mode_invalid");
    assert.equal(validateProviderSelection({ providerMode: "mock", provider: "weird" }).reason, "gateway_provider_not_allowed");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/gatewayEnv.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/providerTypes.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared Stage 3E gateway enums. Kept tiny and frozen so modes/kinds are auditable.
export const GATEWAY_PROVIDER_MODES = Object.freeze(["mock", "recorded_fixture", "live"]);
export const GATEWAY_PROVIDERS_CORE = Object.freeze(["mock", "recorded_fixture"]);
export const PROVIDER_RESPONSE_KINDS = Object.freeze([
  "text",
  "tool_request",
  "refusal",
  "error",
  "leaky_text",
]);
```

```js
// src/llmShield/gateway/gatewayEnv.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E-core provider-mode env gate. Fail-closed: default mock, no network.
// `live` is recognised as a contract but ALWAYS rejected in core (no adapter).
import { GATEWAY_PROVIDER_MODES, GATEWAY_PROVIDERS_CORE } from "./providerTypes.js";

export function resolveGatewayEnv(env = process.env) {
  const providerMode = env.SIMURGH_GATEWAY_PROVIDER_MODE || "mock";
  const liveEnabled = env.SIMURGH_LIVE_PROVIDER_ENABLED === "true";
  const provider = env.SIMURGH_LLM_PROVIDER || "mock";
  return {
    provider_mode: providerMode,
    live_provider_enabled: liveEnabled,
    provider,
    // Core never allows egress regardless of flags — no adapter exists.
    network_egress_allowed: false,
  };
}

export function validateProviderSelection({ providerMode, provider }) {
  if (!GATEWAY_PROVIDER_MODES.includes(providerMode)) {
    return { ok: false, reason: "gateway_provider_mode_invalid" };
  }
  if (providerMode === "live") {
    return { ok: false, reason: "gateway_live_provider_not_implemented" };
  }
  if (!GATEWAY_PROVIDERS_CORE.includes(provider)) {
    return { ok: false, reason: "gateway_provider_not_allowed" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/gatewayEnv.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/providerTypes.js src/llmShield/gateway/gatewayEnv.js tests/unit/llmShield/gateway/gatewayEnv.test.js
git commit -m "feat(llm-shield): Stage 3E gateway env gate (live fails closed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 2 — Provider contract, output normaliser, registry

## Task 2: `providerOutputNormalise.js`

**Files:**
- Create: `src/llmShield/gateway/providerOutputNormalise.js`
- Test: `tests/unit/llmShield/gateway/providerOutputNormalise.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/providerOutputNormalise.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normaliseProviderOutput } from "../../../../src/llmShield/gateway/providerOutputNormalise.js";

describe("providerOutputNormalise", () => {
  test("text output normalises to kind text", () => {
    const r = normaliseProviderOutput({ provider_response_kind: "text", output_text: "hi", tool_request: null });
    assert.deepEqual(r, { kind: "text", text: "hi", toolRequest: null });
  });
  test("tool_request preserved; text coerced to string", () => {
    const r = normaliseProviderOutput({ provider_response_kind: "tool_request", output_text: 5, tool_request: { tool_class: "shell_command" } });
    assert.equal(r.kind, "tool_request");
    assert.equal(r.text, "5");
    assert.deepEqual(r.toolRequest, { tool_class: "shell_command" });
  });
  test("unknown kind falls back to text (fail-safe, never throws)", () => {
    const r = normaliseProviderOutput({ provider_response_kind: "weird", output_text: "x", tool_request: null });
    assert.equal(r.kind, "text");
  });
  test("missing fields normalise to empty text, null tool", () => {
    const r = normaliseProviderOutput({});
    assert.deepEqual(r, { kind: "text", text: "", toolRequest: null });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/providerOutputNormalise.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/providerOutputNormalise.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Coerce a provider's raw return into the minimal boundary shape the gateway acts
// on: { kind, text, toolRequest }. Pure, total (never throws), no IO. The raw text
// stays transient — the caller hashes it and runs the output firewall.
import { PROVIDER_RESPONSE_KINDS } from "./providerTypes.js";

export function normaliseProviderOutput(raw = {}) {
  const k = raw.provider_response_kind;
  const kind = PROVIDER_RESPONSE_KINDS.includes(k) ? k : "text";
  const text = raw.output_text === undefined || raw.output_text === null ? "" : String(raw.output_text);
  const toolRequest =
    raw.tool_request && typeof raw.tool_request === "object" ? raw.tool_request : null;
  return { kind, text, toolRequest };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/providerOutputNormalise.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/providerOutputNormalise.js tests/unit/llmShield/gateway/providerOutputNormalise.test.js
git commit -m "feat(llm-shield): Stage 3E provider output normaliser

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 3 — Providers (mock + recorded_fixture)

## Task 3: `mockGatewayProvider.js`

**Files:**
- Create: `src/llmShield/gateway/mockGatewayProvider.js`
- Test: `tests/unit/llmShield/gateway/mockGatewayProvider.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/mockGatewayProvider.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateMockOutput } from "../../../../src/llmShield/gateway/mockGatewayProvider.js";
import { getScenario } from "../../../../src/llmShield/stage3dMockScenarios.js";

describe("mockGatewayProvider", () => {
  test("benign scenario -> text output, no network, no tool", () => {
    const r = generateMockOutput({ scenario: getScenario("benign") });
    assert.equal(r.provider, "mock");
    assert.equal(r.provider_mode, "mock");
    assert.equal(r.provider_called, true);
    assert.equal(r.network_egress_used, false);
    assert.equal(r.provider_response_kind, "text");
    assert.equal(r.tool_request, null);
  });
  test("tool_escalation scenario -> tool_request kind", () => {
    const r = generateMockOutput({ scenario: getScenario("tool_escalation") });
    assert.equal(r.provider_response_kind, "tool_request");
    assert.equal(r.tool_request.tool_class, "shell_command");
  });
  test("policy_leak scenario -> leaky_text kind", () => {
    const r = generateMockOutput({ scenario: getScenario("policy_leak") });
    assert.equal(r.provider_response_kind, "leaky_text");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/mockGatewayProvider.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/mockGatewayProvider.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic no-network gateway provider. Reuses the committed Stage 3D mock
// scenarios so the gateway exercises the same canned outputs the 3D core already
// contains. No randomness, no clock, no network, never echoes user input.

// Map 3D scenario output kinds onto gateway provider_response_kinds.
const KIND_MAP = { normal_text: "text", tool_request: "tool_request", leaky_text: "leaky_text" };

export function generateMockOutput({ scenario }) {
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

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/mockGatewayProvider.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/mockGatewayProvider.js tests/unit/llmShield/gateway/mockGatewayProvider.test.js
git commit -m "feat(llm-shield): Stage 3E mock gateway provider (reuses 3D scenarios)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 4: `recordedFixtureProvider.js`

**Files:**
- Create: `src/llmShield/gateway/recordedFixtureProvider.js`
- Test: `tests/unit/llmShield/gateway/recordedFixtureProvider.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/recordedFixtureProvider.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  RECORDED_CASE_ID_RE,
  selectFixtureEntry,
  validateRecordedFixture,
  generateFromFixture,
} from "../../../../src/llmShield/gateway/recordedFixtureProvider.js";

const manifest = { "3e_recorded_001": "recorded_fixture/3e_recorded_001.json" };
const goodFixture = {
  case_id: "3e_recorded_001",
  provenance: "synthetic",
  provider_response_kind: "leaky_text",
  synthetic_provider_output: "SYSTEM PROMPT: synthetic marker",
};

describe("recordedFixtureProvider", () => {
  test("case_id pattern accepts opaque ids, rejects paths", () => {
    assert.ok(RECORDED_CASE_ID_RE.test("3e_recorded_001"));
    assert.ok(!RECORDED_CASE_ID_RE.test("../secret"));
    assert.ok(!RECORDED_CASE_ID_RE.test("recorded_fixture/3e_recorded_001.json"));
  });
  test("selectFixtureEntry rejects path-like selectors", () => {
    assert.throws(() => selectFixtureEntry("../x", manifest), /gateway_fixture_selector_invalid/);
  });
  test("selectFixtureEntry rejects unknown case_id", () => {
    assert.throws(() => selectFixtureEntry("3e_recorded_999", manifest), /gateway_fixture_not_found/);
  });
  test("validateRecordedFixture rejects non-synthetic provenance", () => {
    assert.throws(() => validateRecordedFixture({ ...goodFixture, provenance: "real" }), /gateway_fixture_provenance_invalid/);
  });
  test("generateFromFixture returns no-network leaky_text output", () => {
    validateRecordedFixture(goodFixture);
    const r = generateFromFixture(goodFixture);
    assert.equal(r.provider_mode, "recorded_fixture");
    assert.equal(r.network_egress_used, false);
    assert.equal(r.provider_response_kind, "leaky_text");
    assert.equal(r.output_text, "SYSTEM PROMPT: synthetic marker");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/recordedFixtureProvider.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/recordedFixtureProvider.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Synthetic provider-shaped fixture replay (NOT a transcript replay). Selection is
// by opaque case_id resolved through a manifest — never a path. Fixtures must be
// hand-authored synthetic (provenance "synthetic"); anything else fails closed.
// No network, no filesystem in this module (IO is injected by the caller).
import { PROVIDER_RESPONSE_KINDS } from "./providerTypes.js";

export const RECORDED_CASE_ID_RE = /^3e_[a-z_]+_\d{3}$/;

export function selectFixtureEntry(caseId, manifest) {
  if (typeof caseId !== "string" || !RECORDED_CASE_ID_RE.test(caseId)) {
    throw new Error("gateway_fixture_selector_invalid");
  }
  const entry = manifest?.[caseId];
  if (!entry) throw new Error("gateway_fixture_not_found");
  return entry;
}

export function validateRecordedFixture(fixture) {
  if (!fixture || typeof fixture !== "object") throw new Error("gateway_fixture_invalid");
  if (fixture.provenance !== "synthetic") throw new Error("gateway_fixture_provenance_invalid");
  if (!PROVIDER_RESPONSE_KINDS.includes(fixture.provider_response_kind)) {
    throw new Error("gateway_fixture_kind_invalid");
  }
  if (typeof fixture.synthetic_provider_output !== "string") {
    throw new Error("gateway_fixture_output_invalid");
  }
  return true;
}

export function generateFromFixture(fixture) {
  return {
    provider: "recorded_fixture",
    provider_mode: "recorded_fixture",
    provider_called: true,
    network_egress_used: false,
    provider_response_kind: fixture.provider_response_kind,
    output_text: fixture.synthetic_provider_output,
    tool_request: fixture.tool_request ?? null,
    usage: { input_tokens_bucket: "unknown", output_tokens_bucket: "unknown" },
    latency_bucket: "0-250ms",
    error_code: fixture.provider_response_kind === "error" ? "synthetic_provider_error" : null,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/recordedFixtureProvider.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/recordedFixtureProvider.js tests/unit/llmShield/gateway/recordedFixtureProvider.test.js
git commit -m "feat(llm-shield): Stage 3E synthetic recorded-fixture provider (case_id manifest, fail-closed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 5: `providerRegistry.js`

**Files:**
- Create: `src/llmShield/gateway/providerRegistry.js`
- Test: `tests/unit/llmShield/gateway/providerRegistry.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/providerRegistry.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getGatewayProvider } from "../../../../src/llmShield/gateway/providerRegistry.js";

describe("providerRegistry", () => {
  test("mock mode returns the mock provider", () => {
    assert.equal(getGatewayProvider("mock").name, "mock");
  });
  test("recorded_fixture mode returns the recorded provider", () => {
    assert.equal(getGatewayProvider("recorded_fixture").name, "recorded_fixture");
  });
  test("live mode throws (no adapter in core)", () => {
    assert.throws(() => getGatewayProvider("live"), /gateway_live_provider_not_implemented/);
  });
  test("unknown mode throws", () => {
    assert.throws(() => getGatewayProvider("nope"), /gateway_provider_mode_invalid/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/providerRegistry.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/providerRegistry.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Maps a provider mode to a provider with a generate() method. Core ships mock and
// recorded_fixture only; live throws (no adapter) — a second, defence-in-depth
// guard alongside gatewayEnv.validateProviderSelection.
import { generateMockOutput } from "./mockGatewayProvider.js";
import { generateFromFixture } from "./recordedFixtureProvider.js";

export function getGatewayProvider(providerMode) {
  if (providerMode === "mock") {
    return { name: "mock", generate: (args) => generateMockOutput(args) };
  }
  if (providerMode === "recorded_fixture") {
    return { name: "recorded_fixture", generate: (args) => generateFromFixture(args.fixture) };
  }
  if (providerMode === "live") {
    throw new Error("gateway_live_provider_not_implemented");
  }
  throw new Error("gateway_provider_mode_invalid");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/providerRegistry.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/providerRegistry.js tests/unit/llmShield/gateway/providerRegistry.test.js
git commit -m "feat(llm-shield): Stage 3E provider registry (mock + recorded; live throws)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 4 — Gateway receipt + audit events

## Task 6: `gatewayReceipt.js`

**Files:**
- Create: `src/llmShield/gateway/gatewayReceipt.js`
- Test: `tests/unit/llmShield/gateway/gatewayReceipt.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/gatewayReceipt.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GATEWAY_SCHEMA_VERSION, buildGatewayReceipt, hashGatewayReceipt } from "../../../../src/llmShield/gateway/gatewayReceipt.js";

const ARGS = {
  sessionIdHash: "sha256:s", runId: "gw_run_001", taskType: "general_qa",
  inputHash: "sha256:i", normalisedInputHash: "sha256:n",
  contextVerdict: "not_supplied", contextHashes: [],
  gatewayVerdict: "blocked", providerMode: "recorded_fixture", provider: "recorded_fixture",
  providerCalled: true, providerResponseKind: "leaky_text", providerResponseHash: "sha256:p",
  toolGateVerdict: "not_requested", toolNameHash: null,
  outputFirewallVerdict: "blocked", outputHash: "sha256:o",
  riskScore: 5, riskVerdict: "warning", latencyBucket: "0-250ms",
  inputTokenBucket: "0-1k", outputTokenBucket: "unknown",
  reasonCodes: ["output_system_prompt_leakage"], auditEntryHash: "sha256:a", timestamp: "2026-06-17T00:00:00.000Z",
};

describe("gatewayReceipt", () => {
  test("builds a metadata-only 3E gateway receipt", () => {
    const r = buildGatewayReceipt(ARGS);
    assert.equal(r.type, "simurgh.llm_gateway_receipt.v1");
    assert.equal(r.schema_version, "3E");
    assert.equal(GATEWAY_SCHEMA_VERSION, "3E");
    assert.equal(r.network_egress_used, false);
    assert.equal(r.raw_provider_transcript_recorded, false);
    assert.equal(r.api_key_recorded, false);
    assert.equal(r.tool_called, false);
  });
  test("carries no raw-text keys", () => {
    const json = JSON.stringify(buildGatewayReceipt(ARGS));
    for (const k of ['"raw_input"', '"raw_provider_output"', '"provider_response_body"', '"api_key"', '"system_prompt"']) {
      assert.ok(!json.includes(k), `must not contain ${k}`);
    }
  });
  test("hash is deterministic sha256", () => {
    const r = buildGatewayReceipt(ARGS);
    assert.equal(hashGatewayReceipt(r), hashGatewayReceipt(r));
    assert.match(hashGatewayReceipt(r), /^sha256:[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/gatewayReceipt.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/gatewayReceipt.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E metadata-only gateway receipt. New type + schema_version "3E"; reuses
// hashReceipt. Leaves safetyReceipt.js and stage3dReceipt.js untouched. Hashes and
// enum codes only — never raw input/context/output/provider body/keys.
import { hashReceipt } from "../safetyReceipt.js";

export const GATEWAY_RECEIPT_TYPE = "simurgh.llm_gateway_receipt.v1";
export const GATEWAY_SCHEMA_VERSION = "3E";
export const hashGatewayReceipt = hashReceipt;

export function buildGatewayReceipt(a) {
  return {
    type: GATEWAY_RECEIPT_TYPE,
    schema_version: GATEWAY_SCHEMA_VERSION,
    session_id_hash: a.sessionIdHash,
    run_id: a.runId,
    task_type: a.taskType,
    input_hash: a.inputHash,
    normalised_input_hash: a.normalisedInputHash,
    context_verdict: a.contextVerdict,
    context_hashes: a.contextHashes ?? [],
    gateway_verdict: a.gatewayVerdict,
    provider_mode: a.providerMode,
    provider: a.provider,
    provider_called: a.providerCalled,
    provider_response_kind: a.providerResponseKind,
    provider_response_hash: a.providerResponseHash,
    network_egress_used: false,
    tool_gate_verdict: a.toolGateVerdict,
    tool_called: false,
    tool_name_hash: a.toolNameHash ?? null,
    output_firewall_verdict: a.outputFirewallVerdict,
    output_hash: a.outputHash,
    risk_score: a.riskScore,
    risk_verdict: a.riskVerdict,
    latency_bucket: a.latencyBucket,
    input_token_bucket: a.inputTokenBucket,
    output_token_bucket: a.outputTokenBucket,
    reason_codes: a.reasonCodes ?? [],
    privacy_mode: "metadata_only",
    raw_provider_transcript_recorded: false,
    raw_context_recorded: false,
    raw_tool_args_recorded: false,
    api_key_recorded: false,
    timestamp: a.timestamp,
    audit_entry_hash: a.auditEntryHash,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/gatewayReceipt.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/gatewayReceipt.js tests/unit/llmShield/gateway/gatewayReceipt.test.js
git commit -m "feat(llm-shield): Stage 3E metadata-only gateway receipt builder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 7: `gatewayAudit.js`

**Files:**
- Create: `src/llmShield/gateway/gatewayAudit.js`
- Test: `tests/unit/llmShield/gateway/gatewayAudit.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/gatewayAudit.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createChain, verifyChain } from "../../../../src/audit/hmacChain.js";
import { GATEWAY_EVENTS, recordGatewaySessionCreated, recordGatewayRun, recordGatewayReceiptExported } from "../../../../src/llmShield/gateway/gatewayAudit.js";

const base = {
  inputVerdict: "safe", contextVerdict: "not_supplied", providerCalled: true,
  providerResponseKind: "text", toolGateVerdict: "not_requested", outputFirewallVerdict: "accepted",
  riskVerdict: "safe", reasonCodes: [], inputHash: "sha256:i", normalisedInputHash: "sha256:n",
  contextHashes: [], toolNameHash: null, providerResponseHash: "sha256:p", outputHash: "sha256:o",
};

describe("gatewayAudit", () => {
  test("mock accepted run order", () => {
    const key = crypto.randomBytes(32); const chain = createChain();
    recordGatewayRun(chain, key, base);
    assert.deepEqual(chain.entries.map((e) => e.type), [
      GATEWAY_EVENTS.LLM_GATEWAY_REQUEST_ACCEPTED,
      GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CALLED,
      GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_OUTPUT_HASHED,
      GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_ACCEPTED,
      GATEWAY_EVENTS.LLM_GATEWAY_RISK_ACCUMULATED,
    ]);
    assert.equal(verifyChain(chain, key).valid, true);
  });
  test("output-blocked run emits OUTPUT_BLOCKED not ACCEPTED", () => {
    const key = crypto.randomBytes(32); const chain = createChain();
    recordGatewayRun(chain, key, { ...base, outputFirewallVerdict: "blocked", riskVerdict: "warning", reasonCodes: ["output_system_prompt_leakage"] });
    const types = chain.entries.map((e) => e.type);
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_BLOCKED));
    assert.ok(!types.includes(GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_ACCEPTED));
  });
  test("provider-skipped run (live fail-closed) emits CONFIG_REJECTED + SKIPPED", () => {
    const key = crypto.randomBytes(32); const chain = createChain();
    recordGatewayRun(chain, key, { ...base, providerCalled: false, providerConfigRejected: true, reasonCodes: ["gateway_live_provider_not_implemented"] });
    const types = chain.entries.map((e) => e.type);
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CONFIG_REJECTED));
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_SKIPPED));
  });
  test("session created + receipt exported events", () => {
    const key = crypto.randomBytes(32); const chain = createChain();
    recordGatewaySessionCreated(chain, key);
    recordGatewayReceiptExported(chain, key, "sha256:r");
    assert.equal(chain.entries[0].type, GATEWAY_EVENTS.LLM_GATEWAY_SESSION_CREATED);
    assert.equal(chain.entries.at(-1).type, GATEWAY_EVENTS.LLM_GATEWAY_RECEIPT_EXPORTED);
    assert.equal(chain.entries.at(-1).payload.receipt_hash, "sha256:r");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/gatewayAudit.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/gatewayAudit.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E gateway audit events over the shared HMAC chain. Ordered to encode the
// gateway claim (provider skipped on fail-closed; output blocked before export).
// Payloads whitelisted to hashes / verdicts / reason codes — never raw text.
import { appendEntry } from "../../audit/hmacChain.js";

export const GATEWAY_EVENTS = Object.freeze({
  LLM_GATEWAY_SESSION_CREATED: "LLM_GATEWAY_SESSION_CREATED",
  LLM_GATEWAY_REQUEST_ACCEPTED: "LLM_GATEWAY_REQUEST_ACCEPTED",
  LLM_GATEWAY_REQUEST_REJECTED: "LLM_GATEWAY_REQUEST_REJECTED",
  LLM_GATEWAY_PROVIDER_CONFIG_REJECTED: "LLM_GATEWAY_PROVIDER_CONFIG_REJECTED",
  LLM_GATEWAY_PROVIDER_SKIPPED: "LLM_GATEWAY_PROVIDER_SKIPPED",
  LLM_GATEWAY_PROVIDER_CALLED: "LLM_GATEWAY_PROVIDER_CALLED",
  LLM_GATEWAY_PROVIDER_OUTPUT_HASHED: "LLM_GATEWAY_PROVIDER_OUTPUT_HASHED",
  LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED: "LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED",
  LLM_GATEWAY_TOOL_BLOCKED: "LLM_GATEWAY_TOOL_BLOCKED",
  LLM_GATEWAY_OUTPUT_ACCEPTED: "LLM_GATEWAY_OUTPUT_ACCEPTED",
  LLM_GATEWAY_OUTPUT_BLOCKED: "LLM_GATEWAY_OUTPUT_BLOCKED",
  LLM_GATEWAY_RISK_ACCUMULATED: "LLM_GATEWAY_RISK_ACCUMULATED",
  LLM_GATEWAY_RISK_ESCALATED: "LLM_GATEWAY_RISK_ESCALATED",
  LLM_GATEWAY_RECEIPT_EXPORTED: "LLM_GATEWAY_RECEIPT_EXPORTED",
});

export function recordGatewaySessionCreated(chain, key) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_SESSION_CREATED, {});
  return chain.prevHash;
}

export function recordGatewayRun(chain, key, d) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_REQUEST_ACCEPTED, {
    input_verdict: d.inputVerdict,
    input_hash: d.inputHash,
    normalised_input_hash: d.normalisedInputHash,
    context_verdict: d.contextVerdict,
    reason_codes: d.reasonCodes ?? [],
  });

  if (!d.providerCalled) {
    if (d.providerConfigRejected) {
      appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CONFIG_REJECTED, {
        reason_codes: d.reasonCodes ?? [],
      });
    }
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_SKIPPED, {});
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ACCUMULATED, {
      risk_verdict: d.riskVerdict,
    });
    if (d.riskVerdict === "blocked") appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ESCALATED, {});
    return chain.prevHash;
  }

  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CALLED, {
    provider_response_kind: d.providerResponseKind,
  });

  if (d.toolGateVerdict === "blocked") {
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED, {
      tool_name_hash: d.toolNameHash,
    });
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_TOOL_BLOCKED, { reason_codes: d.reasonCodes ?? [] });
  } else {
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_OUTPUT_HASHED, {
      provider_response_hash: d.providerResponseHash,
    });
    if (d.outputFirewallVerdict === "blocked") {
      appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_BLOCKED, { reason_codes: d.reasonCodes ?? [] });
    } else {
      appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_ACCEPTED, {});
    }
  }

  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ACCUMULATED, { risk_verdict: d.riskVerdict });
  if (d.riskVerdict === "blocked") appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ESCALATED, {});
  return chain.prevHash;
}

export function recordGatewayReceiptExported(chain, key, receiptHash) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RECEIPT_EXPORTED, { receipt_hash: receiptHash });
}
```

> Note: the Task-6 test ordering puts OUTPUT_HASHED before OUTPUT_ACCEPTED in the accepted path and omits OUTPUT_HASHED on the tool-blocked path (tool detection precedes output hashing). The tests above assert exactly that.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/gatewayAudit.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/gatewayAudit.js tests/unit/llmShield/gateway/gatewayAudit.test.js
git commit -m "feat(llm-shield): Stage 3E gateway audit events + ordered recorder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 5 — Rate limit + gateway router + server mount

## Task 8: `gatewayRateLimit.js`

**Files:**
- Create: `src/llmShield/gateway/gatewayRateLimit.js`
- Test: `tests/unit/llmShield/gateway/gatewayRateLimit.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/gatewayRateLimit.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { gatewayLimits, checkInputCaps } from "../../../../src/llmShield/gateway/gatewayRateLimit.js";

describe("gatewayRateLimit", () => {
  test("defaults present", () => {
    const l = gatewayLimits({});
    assert.equal(l.maxInputChars, 4000);
    assert.equal(l.maxContextChars, 16000);
    assert.equal(l.timeoutMs, 20000);
  });
  test("input over cap rejected", () => {
    const l = gatewayLimits({});
    assert.deepEqual(checkInputCaps({ inputChars: 5000, contextChars: 0 }, l), { ok: false, reason: "gateway_input_too_large" });
  });
  test("context over cap rejected", () => {
    const l = gatewayLimits({});
    assert.deepEqual(checkInputCaps({ inputChars: 10, contextChars: 20000 }, l), { ok: false, reason: "gateway_context_too_large" });
  });
  test("within caps ok", () => {
    const l = gatewayLimits({});
    assert.deepEqual(checkInputCaps({ inputChars: 10, contextChars: 10 }, l), { ok: true });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/gatewayRateLimit.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// src/llmShield/gateway/gatewayRateLimit.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Denial-of-wallet guards (OWASP LLM10). Char/timeout caps are active in core;
// live-call limits are parsed for forward-compat but inert (no live calls in core).
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function gatewayLimits(env = process.env) {
  return {
    maxInputChars: num(env.SIMURGH_GATEWAY_MAX_INPUT_CHARS, 4000),
    maxContextChars: num(env.SIMURGH_GATEWAY_MAX_CONTEXT_CHARS, 16000),
    maxOutputChars: num(env.SIMURGH_GATEWAY_MAX_OUTPUT_CHARS, 8000),
    timeoutMs: num(env.SIMURGH_GATEWAY_TIMEOUT_MS, 20000),
    maxLiveCallsPerSession: num(env.SIMURGH_GATEWAY_MAX_LIVE_CALLS_PER_SESSION, 20),
    maxLiveCallsPerMinute: num(env.SIMURGH_GATEWAY_MAX_LIVE_CALLS_PER_MINUTE, 5),
    maxDailyLiveCalls: num(env.SIMURGH_GATEWAY_MAX_DAILY_LIVE_CALLS, 200),
  };
}

export function checkInputCaps({ inputChars, contextChars }, limits) {
  if (inputChars > limits.maxInputChars) return { ok: false, reason: "gateway_input_too_large" };
  if (contextChars > limits.maxContextChars) return { ok: false, reason: "gateway_context_too_large" };
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/unit/llmShield/gateway/gatewayRateLimit.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/gatewayRateLimit.js tests/unit/llmShield/gateway/gatewayRateLimit.test.js
git commit -m "feat(llm-shield): Stage 3E denial-of-wallet input/context caps

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 9: `gatewayRouter.js` + server mount (Phases 5 + 6 wired together)

This task builds the full run handler composing env gate → input firewall → context guard → provider → tool gate → output firewall → risk → receipt, plus session/verify routes and the static OpenAPI route. It depends on the OpenAPI file (Task 12) for the `/openapi.json` route; until then that route returns 503 — wired fully in Task 12.

**Files:**
- Create: `src/llmShield/gateway/gatewayRouter.js`
- Modify: `server.js` (mount before base router)
- Test: `tests/e2e/llm_shield_stage3e_mock_gateway_smoke.mjs`, `tests/e2e/llm_shield_stage3e_live_disabled_smoke.mjs`

- [ ] **Step 1: Write the failing e2e smokes**

```js
// tests/e2e/llm_shield_stage3e_mock_gateway_smoke.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33055";
const api = `${base}/api/llm-shield/gateway`;
function ok(c, m, d) { if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m); }
const session = async () => {
  const s = await (await fetch(`${api}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
  return { id: s.session_id, token: s.token, auth: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` } };
};
const run = async (s, body) => (await fetch(`${api}/${s.id}/run`, { method: "POST", headers: s.auth, body: JSON.stringify(body) })).json();

// benign mock run -> accepted, 3E receipt, no egress
{
  const s = await session();
  const r = await run(s, { input: "Summarise widgets.", provider_mode: "mock", provider: "mock", scenario: "benign" });
  ok(r.gateway_verdict === "accepted", "benign mock must be accepted", r);
  ok(r.receipt?.schema_version === "3E", "must emit 3E receipt", r);
  ok(r.receipt?.network_egress_used === false, "no egress", r);
}
// tool_escalation scenario -> tool blocked, never executed
{
  const s = await session();
  const r = await run(s, { input: "do it", provider_mode: "mock", provider: "mock", scenario: "tool_escalation" });
  ok(r.tool_gate_verdict === "blocked", "tool escalation blocked", r);
  ok(r.receipt?.tool_called === false, "tool never executed", r);
}
// policy_leak scenario -> output blocked, raw not echoed
{
  const s = await session();
  const r = await run(s, { input: "share config", provider_mode: "mock", provider: "mock", scenario: "policy_leak" });
  ok(r.output_firewall_verdict === "blocked", "leak blocked", r);
  ok(!JSON.stringify(r).includes("hidden policy assistant"), "raw output not echoed", r);
}
// forbidden field rejected
{
  const s = await session();
  const res = await fetch(`${api}/${s.id}/run`, { method: "POST", headers: s.auth, body: JSON.stringify({ input: "x", provider_mode: "mock", api_key: "sk-x" }) });
  const r = await res.json();
  ok(r.ok === false && r.error === "gateway_forbidden_field", "api_key must be rejected", r);
}
// verify chain
{
  const s = await session();
  await run(s, { input: "x", provider_mode: "mock", provider: "mock", scenario: "benign" });
  const v = await (await fetch(`${api}/${s.id}/verify`, { headers: { Authorization: `Bearer ${s.token}` } })).json();
  ok(v.valid === true, "chain must verify", v);
}
console.log("[PASS] stage3e mock gateway smoke");
```

```js
// tests/e2e/llm_shield_stage3e_live_disabled_smoke.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33055";
const api = `${base}/api/llm-shield/gateway`;
function ok(c, m, d) { if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m); }
const s = await (await fetch(`${api}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` };
const res = await fetch(`${api}/${s.session_id}/run`, { method: "POST", headers: auth, body: JSON.stringify({ input: "x", provider_mode: "live", provider: "anthropic" }) });
const r = await res.json();
ok(r.ok === false && r.error === "gateway_live_provider_not_implemented", "live must fail closed", r);
console.log("[PASS] stage3e live-disabled smoke");
```

- [ ] **Step 2: Boot + run to verify they fail**

Run:
```bash
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters" PORT=33055 node server.js >/tmp/s3e.log 2>&1 &
SRV=$!; sleep 1.5
node tests/e2e/llm_shield_stage3e_mock_gateway_smoke.mjs http://127.0.0.1:33055; kill $SRV
```
Expected: FAIL — gateway routes 404 (not mounted yet).

- [ ] **Step 3: Implement `gatewayRouter.js`**

```js
// src/llmShield/gateway/gatewayRouter.js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E-core gateway. No network. Composes the env gate, the 3A/3C input
// firewall, and the Stage 3D boundaries (context guard, tool gate, output
// firewall, risk accumulator) around a no-network provider, emitting a 3E receipt.
import { Router } from "express";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { createChain, verifyChain } from "../../audit/hmacChain.js";
import { getStore } from "../../storage/memoryStore.js";
import { issueSessionToken, verifySessionToken, extractBearer } from "../../security/sessionToken.js";
import { stagingConfig } from "../../config/env.js";
import { normalisePrompt, hashPrompt } from "../promptNormalise.js";
import { classifyPrompt } from "../promptFirewall.js";
import { guardContexts } from "../contextProvenanceGuard.js";
import { gateToolRequest } from "../toolInvocationGate.js";
import { scanOutput } from "../outputLeakageFirewall.js";
import { riskPointsFor, riskVerdict } from "../runRiskAccumulator.js";
import { getScenario, isValidScenario } from "../stage3dMockScenarios.js";
import { resolveGatewayEnv, validateProviderSelection } from "./gatewayEnv.js";
import { getGatewayProvider } from "./providerRegistry.js";
import { selectFixtureEntry, validateRecordedFixture } from "./recordedFixtureProvider.js";
import { normaliseProviderOutput } from "./providerOutputNormalise.js";
import { buildGatewayReceipt, hashGatewayReceipt } from "./gatewayReceipt.js";
import { recordGatewaySessionCreated, recordGatewayRun, recordGatewayReceiptExported } from "./gatewayAudit.js";
import { gatewayLimits, checkInputCaps } from "./gatewayRateLimit.js";

const router = Router();
const store = getStore("llmShieldGatewaySessions");
const BODY_LIMIT_BYTES = 32 * 1024;
const MAX_SESSIONS = Number(process.env.SIMURGH_GATEWAY_MAX_SESSIONS || 5000);
const FIXTURE_DIR = "docs/research/llm-shield/evidence/stage-3e/fixtures";
const FORBIDDEN_FIELDS = [
  "api_key", "anthropic_api_key", "openai_api_key", "provider_request_body",
  "provider_response_body", "mock_provider_output", "synthetic_provider_output",
  "raw_provider_output", "tool_result", "system_prompt", "developer_prompt",
];

function getSecret() {
  const s = process.env.SIMURGH_LLM_SHIELD_SECRET;
  if (!s) throw new Error("SIMURGH_LLM_SHIELD_SECRET not set");
  return s;
}
const deriveKey = (label) => crypto.createHmac("sha256", getSecret()).update(label).digest();
const tokenKey = () => deriveKey("llm-shield-gateway-token-v1");
const auditKey = () => deriveKey("llm-shield-gateway-audit-v1");

function requireConfig(_req, res, next) {
  if (!process.env.SIMURGH_LLM_SHIELD_SECRET) return res.status(503).json({ ok: false, error: "gateway_not_configured" });
  next();
}
function contentLengthWithinLimit(req, res, next) {
  const len = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(len) && len > BODY_LIMIT_BYTES) return res.status(413).json({ ok: false, error: "payload_too_large" });
  next();
}
function requireToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ ok: false, error: "token_missing" });
  const result = verifySessionToken(token, tokenKey());
  if (!result.valid) return res.status(401).json({ ok: false, error: "token_invalid", reason: result.reason });
  req.gwSessionId = result.sessionId;
  next();
}
function requirePathMatch(req, res, next) {
  if (req.gwSessionId !== req.params.sessionId) return res.status(403).json({ ok: false, error: "forbidden" });
  next();
}

router.use(contentLengthWithinLimit);
router.use(requireConfig);

router.post("/sessions", (_req, res) => {
  if (store.size >= MAX_SESSIONS) return res.status(503).json({ ok: false, error: "gateway_session_capacity_reached" });
  const sessionId = "gw_sess_" + crypto.randomBytes(12).toString("hex");
  const record = { auditChain: createChain(), runCounter: 0, riskScore: 0 };
  recordGatewaySessionCreated(record.auditChain, auditKey());
  store.set(sessionId, record);
  const token = issueSessionToken(sessionId, tokenKey(), stagingConfig.sessionTokenTtlMs);
  res.json({ ok: true, session_id: sessionId, token, privacy_mode: "metadata_only" });
});

router.post("/:sessionId/run", requireToken, requirePathMatch, async (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
  const body = req.body ?? {};
  const key = auditKey();

  for (const f of FORBIDDEN_FIELDS) {
    if (Object.hasOwn(body, f)) return res.status(400).json({ ok: false, error: "gateway_forbidden_field", field: f });
  }

  const providerMode = typeof body.provider_mode === "string" ? body.provider_mode : resolveGatewayEnv().provider_mode;
  const provider = typeof body.provider === "string" ? body.provider : "mock";
  const sel = validateProviderSelection({ providerMode, provider });
  if (!sel.ok) {
    // Record a fail-closed run (provider config rejected) for auditability.
    record.runCounter += 1;
    const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
    return finishConfigRejected(res, record, key, runId, sel.reason);
  }

  if (typeof body.input !== "string" || body.input.length === 0) {
    return res.status(400).json({ ok: false, error: "invalid_input" });
  }

  const limits = gatewayLimits();
  const contextChars = Array.isArray(body.contexts)
    ? body.contexts.reduce((n, c) => n + (typeof c?.content === "string" ? c.content.length : 0), 0)
    : 0;
  const caps = checkInputCaps({ inputChars: body.input.length, contextChars }, limits);
  if (!caps.ok) return res.status(413).json({ ok: false, error: caps.reason });

  const taskType = typeof body.task_type === "string" ? body.task_type : "unknown";
  const rawInput = body.input;
  const normalised = normalisePrompt(rawInput);
  const inputHash = hashPrompt(rawInput);
  const normalisedInputHash = hashPrompt(normalised);
  const inputVerdict = classifyPrompt(normalised).verdict;
  const contextResult = guardContexts(body.contexts);

  const providerCalled = inputVerdict !== "blocked" && contextResult.verdict !== "rejected";

  // ----- provider (no network) -----
  let raw = null;
  if (providerCalled) {
    try {
      if (providerMode === "mock") {
        const scenarioName = isValidScenario(body.scenario) ? body.scenario : "benign";
        raw = getGatewayProvider("mock").generate({ scenario: getScenario(scenarioName) });
      } else {
        // recorded_fixture: select by opaque case_id via manifest, validate, replay synthetic
        const manifest = JSON.parse(await readFile(`${FIXTURE_DIR}/fixture-manifest.json`, "utf8"));
        const rel = selectFixtureEntry(body.case_id, manifest);
        const fixture = JSON.parse(await readFile(`${FIXTURE_DIR}/${rel}`, "utf8"));
        validateRecordedFixture(fixture);
        raw = getGatewayProvider("recorded_fixture").generate({ fixture });
      }
    } catch (e) {
      record.runCounter += 1;
      const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
      return finishConfigRejected(res, record, key, runId, String(e.message || "gateway_provider_error"));
    }
  }

  const norm = providerCalled ? normaliseProviderOutput(raw) : { kind: "text", text: "", toolRequest: null };
  const providerResponseHash = hashPrompt(norm.text);

  // ----- tool gate (provider-side tools off; never executed) -----
  const toolResult = providerCalled && norm.toolRequest
    ? gateToolRequest(norm.toolRequest)
    : { verdict: "not_requested", reasonCodes: [], toolNameHash: null, toolCalled: false };

  // ----- output firewall (only when no tool block) -----
  const outputResult = providerCalled && toolResult.verdict !== "blocked"
    ? scanOutput(norm.text, { providerCalled: true })
    : { verdict: toolResult.verdict === "blocked" ? "not_called" : "not_called", reasonCodes: [], outputHash: providerResponseHash };

  // ----- risk -----
  const runPoints =
    inputVerdict === "blocked"
      ? 6
      : riskPointsFor({
          inputVerdict,
          contextVerdict: contextResult.verdict,
          toolGateVerdict: toolResult.verdict,
          outputFirewallVerdict: outputResult.verdict,
          repeatedWarning: false,
        });
  record.riskScore = (record.riskScore ?? 0) + runPoints;
  const riskVerdictValue =
    inputVerdict === "blocked" || contextResult.verdict === "rejected" ? "blocked" : riskVerdict(record.riskScore);

  const gatewayVerdict =
    contextResult.verdict === "rejected" || toolResult.verdict === "blocked" || outputResult.verdict === "blocked" || inputVerdict === "blocked"
      ? "blocked"
      : riskVerdictValue === "warning"
        ? "warning"
        : "accepted";

  const reasonCodes = [...contextResult.reasonCodes, ...toolResult.reasonCodes, ...outputResult.reasonCodes];

  record.runCounter += 1;
  const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
  const sessionIdHash = hashPrompt(req.params.sessionId);
  const timestamp = new Date().toISOString();

  const auditEntryHash = recordGatewayRun(record.auditChain, key, {
    inputVerdict, contextVerdict: contextResult.verdict, providerCalled,
    providerResponseKind: norm.kind, toolGateVerdict: toolResult.verdict,
    outputFirewallVerdict: outputResult.verdict, riskVerdict: riskVerdictValue,
    reasonCodes, inputHash, normalisedInputHash, contextHashes: contextResult.contextHashes,
    toolNameHash: toolResult.toolNameHash, providerResponseHash, outputHash: outputResult.outputHash,
  });

  const receipt = buildGatewayReceipt({
    sessionIdHash, runId, taskType, inputHash, normalisedInputHash,
    contextVerdict: contextResult.verdict, contextHashes: contextResult.contextHashes,
    gatewayVerdict, providerMode, provider, providerCalled, providerResponseKind: norm.kind,
    providerResponseHash, toolGateVerdict: toolResult.verdict, toolNameHash: toolResult.toolNameHash,
    outputFirewallVerdict: outputResult.verdict, outputHash: outputResult.outputHash,
    riskScore: record.riskScore, riskVerdict: riskVerdictValue,
    latencyBucket: raw?.latency_bucket ?? "0-250ms",
    inputTokenBucket: raw?.usage?.input_tokens_bucket ?? "unknown",
    outputTokenBucket: raw?.usage?.output_tokens_bucket ?? "unknown",
    reasonCodes, auditEntryHash, timestamp,
  });
  recordGatewayReceiptExported(record.auditChain, key, hashGatewayReceipt(receipt));

  const exported = gatewayVerdict === "accepted";
  return res.json({
    ok: exported,
    gateway_verdict: gatewayVerdict,
    provider_called: providerCalled,
    output_exported: exported,
    tool_gate_verdict: toolResult.verdict,
    output_firewall_verdict: outputResult.verdict,
    risk_verdict: riskVerdictValue,
    reason_codes: reasonCodes,
    output_text: exported ? norm.text : undefined,
    receipt,
  });
});

function finishConfigRejected(res, record, key, runId, reason) {
  const sessionIdHash = hashPrompt("config_rejected");
  const timestamp = new Date().toISOString();
  const auditEntryHash = recordGatewayRun(record.auditChain, key, {
    inputVerdict: "safe", contextVerdict: "not_supplied", providerCalled: false,
    providerConfigRejected: true, providerResponseKind: "error",
    toolGateVerdict: "not_requested", outputFirewallVerdict: "not_called",
    riskVerdict: "warning", reasonCodes: [reason], inputHash: hashPrompt(""),
    normalisedInputHash: hashPrompt(""), contextHashes: [], toolNameHash: null,
    providerResponseHash: hashPrompt(""), outputHash: hashPrompt(""),
  });
  const receipt = buildGatewayReceipt({
    sessionIdHash, runId, taskType: "unknown", inputHash: hashPrompt(""), normalisedInputHash: hashPrompt(""),
    contextVerdict: "not_supplied", contextHashes: [], gatewayVerdict: "blocked",
    providerMode: "live", provider: "n/a", providerCalled: false, providerResponseKind: "error",
    providerResponseHash: hashPrompt(""), toolGateVerdict: "not_requested", toolNameHash: null,
    outputFirewallVerdict: "not_called", outputHash: hashPrompt(""), riskScore: record.riskScore ?? 0,
    riskVerdict: "warning", latencyBucket: "0-250ms", inputTokenBucket: "unknown", outputTokenBucket: "unknown",
    reasonCodes: [reason], auditEntryHash, timestamp,
  });
  recordGatewayReceiptExported(record.auditChain, key, hashGatewayReceipt(receipt));
  return res.status(400).json({ ok: false, error: reason, receipt });
}

router.get("/:sessionId/verify", requireToken, requirePathMatch, (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
  const { valid, errors } = verifyChain(record.auditChain, auditKey());
  res.json({ ok: true, valid, head: record.auditChain.prevHash, errors });
});

router.get("/openapi.json", async (_req, res) => {
  try {
    const spec = await readFile("docs/research/llm-shield/evidence/stage-3e/openapi.json", "utf8");
    res.type("application/json").send(spec);
  } catch {
    res.status(503).json({ ok: false, error: "openapi_not_available" });
  }
});

export default router;
```

- [ ] **Step 4: Mount in `server.js` BEFORE the base router**

Add import near the other router imports:
```js
import gatewayRouter from "./src/llmShield/gateway/gatewayRouter.js";
```
Change the mount block so the gateway is registered first:
```js
app.use("/api/llm-shield/gateway", gatewayRouter);
app.use("/api/llm-shield", llmShieldRouter);
```

- [ ] **Step 5: Run smokes + full suite**

Run the boot+smoke block from Step 2 for both smokes (ports 33055), then `npm test`.
Expected: `[PASS] stage3e mock gateway smoke`, `[PASS] stage3e live-disabled smoke`; all unit tests pass.

- [ ] **Step 6: Format + commit**

```bash
npm run format
git add src/llmShield/gateway/gatewayRouter.js server.js tests/e2e/llm_shield_stage3e_mock_gateway_smoke.mjs tests/e2e/llm_shield_stage3e_live_disabled_smoke.mjs
git commit -m "feat(llm-shield): Stage 3E gateway router + server mount (gateway before base)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> Phases 5 and 6 of the spec are implemented together here because the router IS the wiring of the 3D boundaries. The remaining e2e smokes (recorded_fixture, provider_error, output_firewall, tool_request, rate_limit) are added in Task 13 alongside their fixtures.

---

# Phase 8 — OpenAPI artifact

## Task 10: OpenAPI 3.1 contract

**Files:**
- Create: `docs/research/llm-shield/evidence/stage-3e/openapi.json`
- Test: `tests/unit/llmShield/gateway/openapi.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/gateway/openapi.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

describe("stage3e openapi", () => {
  test("valid JSON, 3.1, Bearer scheme, four routes, no keys/payloads", async () => {
    const spec = JSON.parse(await readFile("docs/research/llm-shield/evidence/stage-3e/openapi.json", "utf8"));
    assert.match(spec.openapi, /^3\.1/);
    assert.ok(spec.components.securitySchemes.GatewayBearer);
    assert.equal(spec.components.securitySchemes.GatewayBearer.scheme, "bearer");
    for (const p of ["/api/llm-shield/gateway/sessions", "/api/llm-shield/gateway/{sessionId}/run", "/api/llm-shield/gateway/{sessionId}/verify", "/api/llm-shield/gateway/openapi.json"]) {
      assert.ok(spec.paths[p], `missing path ${p}`);
    }
    const raw = JSON.stringify(spec);
    assert.ok(!/sk-[A-Za-z0-9]{20,}/.test(raw), "no real-looking keys");
    assert.ok(!raw.includes("ignore previous instructions"), "no jailbreak payloads");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/gateway/openapi.test.js`
Expected: FAIL — cannot find file.

- [ ] **Step 3: Write `openapi.json`** (OpenAPI 3.1; mock examples only)

```json
{
  "openapi": "3.1.0",
  "info": { "title": "Simurgh LLM Shield Gateway (Stage 3E-core)", "version": "0.7.0", "description": "No-network provider gateway exposing the Stage 3D containment core. Live mode is a fail-closed contract. Forbidden request fields (rejected): api_key, anthropic_api_key, openai_api_key, provider_request_body, provider_response_body, mock_provider_output, synthetic_provider_output, raw_provider_output, tool_result, system_prompt, developer_prompt." },
  "servers": [{ "url": "http://127.0.0.1:33030" }],
  "components": {
    "securitySchemes": { "GatewayBearer": { "type": "http", "scheme": "bearer" } },
    "schemas": {
      "RunRequest": {
        "type": "object", "required": ["input", "provider_mode"],
        "properties": {
          "task_type": { "type": "string" },
          "input": { "type": "string", "maxLength": 4000 },
          "contexts": { "type": "array", "items": { "type": "object" } },
          "provider_mode": { "type": "string", "enum": ["mock", "recorded_fixture", "live"] },
          "provider": { "type": "string", "enum": ["mock", "recorded_fixture"] },
          "scenario": { "type": "string" },
          "case_id": { "type": "string", "pattern": "^3e_[a-z_]+_\\d{3}$" }
        }
      },
      "GatewayReceipt": { "type": "object", "properties": { "type": { "type": "string" }, "schema_version": { "type": "string", "const": "3E" }, "gateway_verdict": { "type": "string" }, "output_hash": { "type": "string" } } },
      "Error": { "type": "object", "properties": { "ok": { "type": "boolean" }, "error": { "type": "string" } } }
    }
  },
  "security": [{ "GatewayBearer": [] }],
  "paths": {
    "/api/llm-shield/gateway/sessions": { "post": { "summary": "Create gateway session", "responses": { "200": { "description": "session created" } } } },
    "/api/llm-shield/gateway/{sessionId}/run": {
      "post": {
        "summary": "Run a gateway request (mock example)",
        "parameters": [{ "name": "sessionId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RunRequest" }, "example": { "task_type": "general_qa", "input": "Summarise widgets.", "provider_mode": "mock", "provider": "mock", "scenario": "benign" } } } },
        "responses": { "200": { "description": "accepted or blocked metadata-only receipt", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GatewayReceipt" } } } }, "400": { "description": "rejected", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } } }
      }
    },
    "/api/llm-shield/gateway/{sessionId}/verify": { "get": { "summary": "Verify audit chain", "parameters": [{ "name": "sessionId", "in": "path", "required": true, "schema": { "type": "string" } }], "responses": { "200": { "description": "chain validity" } } } },
    "/api/llm-shield/gateway/openapi.json": { "get": { "summary": "This contract", "responses": { "200": { "description": "OpenAPI document" } } } }
  }
}
```

- [ ] **Step 4: Run test + the openapi route**

Run: `node --test tests/unit/llmShield/gateway/openapi.test.js`
Expected: PASS. (The `/openapi.json` route added in Task 9 now serves this file.)

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add docs/research/llm-shield/evidence/stage-3e/openapi.json tests/unit/llmShield/gateway/openapi.test.js
git commit -m "feat(llm-shield): Stage 3E OpenAPI 3.1 contract (Bearer, mock examples only)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 9 — Docker artifact

## Task 11: `Dockerfile.gateway` + compose + dockerignore + docker smoke

**Files:**
- Create: `Dockerfile.gateway`, `docker-compose.gateway.yml`, `.dockerignore`, `scripts/docker-smoke-llm-shield-stage3e.sh`

- [ ] **Step 1: Write `.dockerignore`**

```
node_modules
.git
.env
.env.*
.simurgh_check_logs
coverage
tmp
*.log
```

- [ ] **Step 2: Write `Dockerfile.gateway`** (non-root, mock default)

```dockerfile
# SPDX-License-Identifier: AGPL-3.0-or-later
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production \
    SIMURGH_DEMO_MODE=1 \
    SIMURGH_GATEWAY_PROVIDER_MODE=mock \
    SIMURGH_LIVE_PROVIDER_ENABLED=false \
    SIMURGH_LLM_PROVIDER=mock \
    PORT=33030
# Non-root: node image ships an unprivileged `node` user.
USER node
EXPOSE 33030
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||33030)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
```

- [ ] **Step 3: Write `docker-compose.gateway.yml`**

```yaml
# SPDX-License-Identifier: AGPL-3.0-or-later
services:
  simurgh-gateway:
    build: { context: ., dockerfile: Dockerfile.gateway }
    ports: ["33030:33030"]
    environment:
      SIMURGH_LLM_SHIELD_SECRET: "${SIMURGH_LLM_SHIELD_SECRET:-docker-mock-secret-32-characters-xx}"
      SIMURGH_LIVE_PROVIDER_ENABLED: "false"
      SIMURGH_GATEWAY_PROVIDER_MODE: "mock"
      SIMURGH_LLM_PROVIDER: "mock"
```

- [ ] **Step 4: Write `scripts/docker-smoke-llm-shield-stage3e.sh`** (skips if Docker absent)

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3E docker smoke: build mock-mode image, boot, hit the gateway, assert
# non-root + 3E receipt. Skips gracefully if Docker is unavailable.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "docker-smoke-llm-shield-stage3e: SKIP (docker unavailable)"
  exit 0
fi
IMG=simurgh-gateway-stage3e:smoke
docker build -f Dockerfile.gateway -t "$IMG" . >/tmp/3e-docker-build.log 2>&1
CID=$(docker run -d -p 33060:33030 -e SIMURGH_LLM_SHIELD_SECRET=docker-mock-secret-32-characters-xx "$IMG")
cleanup() { docker rm -f "$CID" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for _ in {1..60}; do curl -sf http://127.0.0.1:33060/health >/dev/null 2>&1 && break; sleep 0.5; done
# non-root assertion
WHO=$(docker exec "$CID" id -u)
[ "$WHO" != "0" ] && echo "[PASS] container runs non-root (uid=$WHO)" || { echo "[FAIL] container runs as root"; exit 1; }
S=$(curl -sf -X POST http://127.0.0.1:33060/api/llm-shield/gateway/sessions -H "Content-Type: application/json" -d '{}')
SID=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).session_id))")
TOK=$(echo "$S" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
R=$(curl -sf -X POST "http://127.0.0.1:33060/api/llm-shield/gateway/$SID/run" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" -d '{"input":"hi","provider_mode":"mock","provider":"mock","scenario":"benign"}')
echo "$R" | grep -q '"schema_version":"3E"' && echo "[PASS] docker mock run emits 3E receipt" || { echo "[FAIL] no 3E receipt"; exit 1; }
echo "docker-smoke-llm-shield-stage3e: passed"
```

- [ ] **Step 5: Run (or confirm skip)**

Run: `chmod +x scripts/docker-smoke-llm-shield-stage3e.sh && bash scripts/docker-smoke-llm-shield-stage3e.sh`
Expected: `passed` if Docker present, else `SKIP (docker unavailable)`.

- [ ] **Step 6: Format + commit**

```bash
npm run format
git add Dockerfile.gateway docker-compose.gateway.yml .dockerignore scripts/docker-smoke-llm-shield-stage3e.sh
git commit -m "feat(llm-shield): Stage 3E non-root Docker (mock default) + docker smoke

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 10 — Fixture corpus + runner + metrics

## Task 12: 70-fixture corpus, manifest, runner, metrics

**Files:**
- Create: `docs/research/llm-shield/evidence/stage-3e/fixtures/<category>/*.json`, `fixture-manifest.json`, `README.md`
- Create: `tests/e2e/llm_shield_stage3e_fixture_runner.mjs`

- [ ] **Step 1: Author canonical fixtures (one per category) + manifest**

Seven categories, fixture id pattern `3e_<prefix>_NNN`:

| Dir | prefix | drives |
| --- | --- | --- |
| `mock_gateway/` | `mock` | mock-mode default path (scenario field) |
| `recorded_fixture/` | `recorded` | synthetic replay (`provenance:"synthetic"`, `synthetic_provider_output`, `provider_response_kind`) |
| `live_disabled/` | `livedisabled` | `provider_mode:"live"` → fail closed |
| `provider_error/` | `error` | recorded fixture with `provider_response_kind:"error"` |
| `output_firewall/` | `output` | recorded leaky_text → blocked |
| `tool_request/` | `tool` | recorded tool_request → blocked |
| `rate_limit/` | `ratelimit` | oversized input → capped |

Canonical recorded fixture (`recorded_fixture/3e_recorded_001.json`):
```json
{ "case_id": "3e_recorded_001", "category": "recorded_fixture", "provenance": "synthetic",
  "provider_mode": "recorded_fixture", "provider": "anthropic_shape",
  "input": "Summarise the safety policy.", "provider_response_kind": "text",
  "synthetic_provider_output": "Here is a safe general summary.",
  "expected": { "gateway_verdict": "accepted", "tool_gate_verdict": "not_requested", "output_firewall_verdict": "accepted", "reason_codes": [] } }
```

`fixture-manifest.json` maps every `case_id` → relative path, e.g.:
```json
{ "3e_recorded_001": "recorded_fixture/3e_recorded_001.json" }
```

(The manifest only needs recorded-mode fixtures resolvable by the provider; mock/live_disabled/rate_limit fixtures are driven by request fields, not `case_id`.)

- [ ] **Step 2: Write `README.md`** explaining: synthetic-only provenance; `case_id` opaque manifest selector (no paths); mock examples; categories table; reproduce commands.

- [ ] **Step 3: Write the fixture runner** (`tests/e2e/llm_shield_stage3e_fixture_runner.mjs`)

The runner boots no server; it composes the same gateway pipeline modules directly (env validate → input firewall → context guard → provider via mode → normalise → tool gate → output firewall → risk) and asserts each fixture's `expected`. For recorded fixtures it reads the committed file; for mock it uses the scenario; for live_disabled it asserts `validateProviderSelection` returns the fail-closed reason; for rate_limit it asserts `checkInputCaps`. Emit `--metrics` to write `metrics.json`. (Full runner code mirrors `llm_shield_stage3d_fixture_runner.mjs`; reuse its structure with the gateway modules.)

Run: `node tests/e2e/llm_shield_stage3e_fixture_runner.mjs`
Expected: all canonical fixtures pass.

- [ ] **Step 4: Expand to 70 (10/category) via a throwaway generator**

Use the proven 3D pattern: a temporary `scripts/_gen_stage3e_fixtures.mjs` that authors `002..010` per category with `expected` computed from the real pipeline and an assertion that each honours its category (recorded leaky → blocked, tool → blocked, error → metadata-only, mock benign → accepted, live_disabled → fail-closed, rate_limit → capped). Run it, validate with the committed runner (`--metrics`), confirm `fixture_count: 70`, then **delete the generator**.

Run: `node tests/e2e/llm_shield_stage3e_fixture_runner.mjs --metrics` → `70 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
rm -f scripts/_gen_stage3e_fixtures.mjs
npm run format
git add docs/research/llm-shield/evidence/stage-3e/ tests/e2e/llm_shield_stage3e_fixture_runner.mjs
git commit -m "test(llm-shield): Stage 3E 70-case synthetic fixture corpus + runner + metrics

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 11 — Gates + check.sh wiring

## Task 13: Remaining e2e smokes + three gate scripts + check.sh

**Files:**
- Create: `tests/e2e/llm_shield_stage3e_{recorded_fixture,provider_error,output_firewall,tool_request,rate_limit}_smoke.mjs`
- Create: `scripts/smoke-llm-shield-stage3e.sh`, `scripts/security-audit-llm-shield-stage3e.sh`, `scripts/privacy-audit-llm-shield-stage3e.mjs`
- Modify: `scripts/check.sh`

- [ ] **Step 1: Write the five remaining e2e smokes**

Each boots via the shared smoke script (Step 2) and asserts one category over HTTP. Example `recorded_fixture` smoke selects `case_id: "3e_recorded_001"`:
```js
// tests/e2e/llm_shield_stage3e_recorded_fixture_smoke.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || "http://127.0.0.1:33055";
const api = `${base}/api/llm-shield/gateway`;
function ok(c, m, d) { if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m); }
const s = await (await fetch(`${api}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` };
const r = await (await fetch(`${api}/${s.session_id}/run`, { method: "POST", headers: auth, body: JSON.stringify({ input: "Summarise the safety policy.", provider_mode: "recorded_fixture", provider: "recorded_fixture", case_id: "3e_recorded_001" }) })).json();
ok(r.receipt?.schema_version === "3E", "recorded fixture must emit 3E receipt", r);
// path-like selector rejected
const bad = await (await fetch(`${api}/${s.session_id}/run`, { method: "POST", headers: auth, body: JSON.stringify({ input: "x", provider_mode: "recorded_fixture", provider: "recorded_fixture", case_id: "../secret" }) })).json();
ok(bad.ok === false && /gateway_fixture_selector_invalid/.test(bad.error), "path selector must be rejected", bad);
console.log("[PASS] stage3e recorded fixture smoke");
```
The `tool_request`, `output_firewall`, `provider_error` smokes select their respective recorded `case_id`s and assert `tool_gate_verdict`/`output_firewall_verdict`/`provider_response_kind`. The `rate_limit` smoke posts an over-cap input and asserts HTTP 413 `gateway_input_too_large`.

- [ ] **Step 2: Write `scripts/smoke-llm-shield-stage3e.sh`** (boot once, run all 3E e2e + fixture runner). Mirror `scripts/smoke-llm-shield-stage3d.sh`, port `33055`, running the seven 3E e2e files + `llm_shield_stage3e_fixture_runner.mjs`. End: `echo "smoke-llm-shield-stage3e: passed"`.

Run: `chmod +x scripts/smoke-llm-shield-stage3e.sh && bash scripts/smoke-llm-shield-stage3e.sh` → `passed`.

- [ ] **Step 3: Write `scripts/security-audit-llm-shield-stage3e.sh`** asserting (boot on port `33056`):
  - `safetyReceipt.js` still `v1`+`3C`; `stage3dReceipt.js` still `3D`.
  - No live adapter file under `src/llmShield/gateway/` (`! ls ...anthropic*` ) and no `@anthropic-ai/sdk` import anywhere under `src/llmShield/gateway/`.
  - `grep -n "gatewayRouter" server.js` appears on a line before `"/api/llm-shield"` base mount (mount-order check via `awk`/line numbers).
  - HTTP: `provider_mode:"live"` → `gateway_live_provider_not_implemented`; `api_key`/`provider_response_body`/`synthetic_provider_output` → `gateway_forbidden_field`; `case_id:"../x"` → `gateway_fixture_selector_invalid`; `tool_escalation` → `tool_gate_verdict:blocked`; `policy_leak` → `output_firewall_verdict:blocked`; verify chain valid.
  - No network imports in `mockGatewayProvider.js`/`recordedFixtureProvider.js` (`! grep -E "anthropic|openai|node:https?|node-fetch|axios"`).
  - Dockerfile has `USER node`; `.dockerignore` contains `.env`.
  - Stage 3B bench no drift (reuse the bench runner) and Stage 3D gates pass.

Run: `chmod +x scripts/security-audit-llm-shield-stage3e.sh && bash scripts/security-audit-llm-shield-stage3e.sh` → `0 failed`.

- [ ] **Step 4: Write `scripts/privacy-audit-llm-shield-stage3e.mjs`** asserting: `metrics.json` + receipt samples contain none of the forbidden keys (`raw_input`, `raw_provider_output`, `provider_request_body`, `provider_response_body`, `api_key`, `authorization`, `x-api-key`, `anthropic_api_key`, `openai_api_key`, `system_prompt`, `developer_prompt`, `tool_args`); every `recorded_fixture/*` fixture has `provenance === "synthetic"`; `gatewayReceipt.js` exposes no raw-text keys. Mirror `privacy-audit-llm-shield-stage3d.mjs`.

Run: `node scripts/privacy-audit-llm-shield-stage3e.mjs` → `passed`.

- [ ] **Step 5: Wire into `scripts/check.sh`** after the 3D steps:
```bash
step "LLM Shield 3E-core gateway smoke"
if scripts/smoke-llm-shield-stage3e.sh > "$LOG_DIR/llm-shield-stage3e-smoke.log" 2>&1; then pass "LLM Shield 3E-core gateway smoke"; else fail "LLM Shield 3E-core gateway smoke"; tail -80 "$LOG_DIR/llm-shield-stage3e-smoke.log"; fi

step "LLM Shield 3E-core security audit"
if scripts/security-audit-llm-shield-stage3e.sh > "$LOG_DIR/llm-shield-stage3e-security-audit.log" 2>&1; then pass "LLM Shield 3E-core security audit"; else fail "LLM Shield 3E-core security audit"; tail -80 "$LOG_DIR/llm-shield-stage3e-security-audit.log"; fi

step "LLM Shield 3E-core privacy audit"
if node scripts/privacy-audit-llm-shield-stage3e.mjs > "$LOG_DIR/llm-shield-stage3e-privacy-audit.log" 2>&1; then pass "LLM Shield 3E-core privacy audit"; else fail "LLM Shield 3E-core privacy audit"; tail -80 "$LOG_DIR/llm-shield-stage3e-privacy-audit.log"; fi

step "LLM Shield 3E-core docker smoke (skips if no docker)"
if bash scripts/docker-smoke-llm-shield-stage3e.sh > "$LOG_DIR/llm-shield-stage3e-docker-smoke.log" 2>&1; then pass "LLM Shield 3E-core docker smoke"; else fail "LLM Shield 3E-core docker smoke"; tail -40 "$LOG_DIR/llm-shield-stage3e-docker-smoke.log"; fi
```

Run: `bash -n scripts/check.sh && echo "syntax OK"`.

- [ ] **Step 6: Format + commit**

```bash
npm run format
git add tests/e2e/llm_shield_stage3e_*.mjs scripts/smoke-llm-shield-stage3e.sh scripts/security-audit-llm-shield-stage3e.sh scripts/privacy-audit-llm-shield-stage3e.mjs scripts/check.sh
git commit -m "test(llm-shield): Stage 3E e2e smokes + smoke/security/privacy gates + check.sh wiring

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 12 — Reviewer docs + closeout

## Task 14: Reviewer docs

**Files:**
- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY.md`, `STAGE_3E_CORE_THREAT_MODEL.md`, `STAGE_3E_CORE_VALIDATION_MATRIX.md`, `STAGE_3E_CORE_REVIEWER_CHECKLIST.md`, `STAGE_3E_CORE_CLOSEOUT.md`

- [ ] **Step 1: Stage narrative** — steel-thread + two verbatim invariants (from spec §steel-thread) + the four-boundary summary + non-claims verbatim (spec §2) + links to spec/plan.
- [ ] **Step 2: Threat model** — spec §4 expanded; in/out scope; trust assumptions; 3E-live deferral.
- [ ] **Step 3: Validation matrix** — area → check → gate (input regression, 3B no drift, receipt non-drift, additive mount, live fail-closed, forbidden-field/selector rejection, context/tool/output/risk, recorded provenance, OpenAPI, Docker non-root, privacy/security/docker gates).
- [ ] **Step 4: Reviewer checklist** — the spec §28 checkbox list.
- [ ] **Step 5: Closeout** — the spec §30 command block + tag `v0.7.0-stage-3e-core-industry-gateway`.
- [ ] **Step 6: Commit**

```bash
npm run format
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY.md docs/research/llm-shield/STAGE_3E_CORE_*.md
git commit -m "docs(llm-shield): Stage 3E-core narrative, threat model, validation matrix, reviewer checklist, closeout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 15: Full closeout — run every gate, evidence, change-protocol, tag

- [ ] **Step 1: Run the full closeout block** (spec §30), capturing 3E gate outputs to `evidence/stage-3e/{smoke,security-audit,privacy-audit,docker-smoke}-output.txt`. Every command exits 0 (docker may SKIP). If `prettier --check` fails, `npm run format` and re-commit.

- [ ] **Step 2: Capture two receipt samples** (`recorded_fixture` accepted + `policy_leak` blocked) to `evidence/stage-3e/receipt-samples/`; confirm hash-only by eye.

- [ ] **Step 3: Change-protocol** — append `Raouf:` Stage 3E-core entry to `AGENT.md` + `CHANGELOG.md` (modules, additive mount, no-network, live fail-closed, synthetic recorded fixtures, OpenAPI, non-root Docker, 70 fixtures, all gates green, tag).

- [ ] **Step 4: Commit evidence + changelog**

```bash
git add docs/research/llm-shield/evidence/stage-3e/ AGENT.md CHANGELOG.md
git commit -m "chore(llm-shield): Stage 3E-core closeout evidence + changelog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Tag after merge to main** (per change-protocol; tag on merged `main`, not the branch): `v0.7.0-stage-3e-core-industry-gateway`.

---

## Self-Review (against the spec)

**1. Spec coverage:**
- §4.1 mount order → Task 9 Step 4 + security audit Task 13 Step 3.
- §4.2/§6.2 session/token reuse + secret label → Task 9 (`deriveKey("llm-shield-gateway-*")`, `getStore("llmShieldGatewaySessions")`).
- §7 env gate / live fail-closed → Task 1 + Task 9 + live-disabled smoke (Task 9) + Task 5 registry guard.
- §8 routes + forbidden fields + case_id selector → Task 9 + Task 10 (OpenAPI) + Task 13 smokes.
- §9 contract/registry/normalise → Tasks 2, 5.
- §10 recorded synthetic provenance → Task 4 + Task 12 fixtures + Task 13 privacy audit.
- §11 tool boundary → Task 9 (gateToolRequest wiring) + tool_request smoke.
- §12 output boundary → Task 9 (scanOutput) + output_firewall smoke.
- §13 context boundary → Task 9 (guardContexts).
- §14 risk → Task 9 (reuses riskPointsFor/riskVerdict).
- §15 receipt → Task 6.
- §16 audit events → Task 7.
- §17 rate/cost → Task 8 + rate_limit smoke.
- §19 OpenAPI → Task 10.
- §20 Docker → Task 11.
- §21–22 evidence + 70 fixtures → Task 12.
- §23 tests → Tasks 1–13.
- §24 scripts + check.sh → Task 13.
- §25 security assertions → Task 13 Step 3.
- §26 privacy assertions → Task 13 Step 4.
- §27 metrics → Task 12.
- §28 reviewer docs → Task 14.
- §30 closeout + tag → Task 15.

**2. Placeholder scan:** Fixtures (Task 12) and reviewer docs (Task 14) are templated with exact schema/required content + concrete acceptance checks (runner passes; verbatim invariants/non-claims), consistent with the 3D plan. The five repeat e2e smokes (Task 13 Step 1) give one worked example + precise per-file assertions rather than five near-identical literals. Gate scripts (Task 13 Steps 2-4) specify exact assertions and the script to mirror. No "TBD"/"add error handling"/"similar to Task N" in code steps.

**3. Type consistency:** `rawProviderReturn` keys (`provider_response_kind`, `output_text`, `tool_request`, `usage`, `latency_bucket`) are produced by Tasks 3/4 and consumed by `normaliseProviderOutput` (Task 2) and the router (Task 9). `recordGatewayRun` `decision` keys (Task 7) match the router call (Task 9). `buildGatewayReceipt` args (Task 6) match the router (Task 9). `case_id` pattern `^3e_[a-z_]+_\d{3}$` is identical in Task 4, the OpenAPI schema (Task 10), and fixtures (Task 12).

**Known ordering note (flagged):** Task 9's smoke run (Step 2/5) depends on Tasks 1–8 being implemented first (it imports all gateway modules). Task 10's `/openapi.json` route returns 503 until the file exists — the route is added in Task 9, the file in Task 10. Both are stated inline.
