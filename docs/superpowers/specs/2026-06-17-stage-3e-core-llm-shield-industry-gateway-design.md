<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-core — LLM Shield Industry Gateway (Design)

**Date:** 2026-06-17
**Status:** Design locked for implementation planning
**Branch:** `stage-3e-core-industry-gateway`
**Release target:** `v0.7.0-stage-3e-core-industry-gateway`
**Builds on:** Stage 3A-alpha, Stage 3B frozen benchmark, Stage 3C hardening, Stage 3D
provenance & containment (merged `v0.6.0-stage-3d-llm-containment`).
**Scope:** No-network gateway shell only. No live provider adapter. No real tool
execution. No production-deployment claim.

## Steel-thread sentence

> Stage 3E-core does not prove live-provider jailbreak resistance. It exposes the
> Stage 3D containment core through a no-network provider gateway so reviewers can
> test that unsafe consequences are blocked, audited, and receipt-backed.

Two load-bearing invariants (stated verbatim, repeated in the stage doc):

> Stage 3E-core defines live mode only as a fail-closed contract. It contains no
> live provider adapter and performs no provider network call.

> recorded_fixture mode is not a transcript replay system. It is a synthetic
> provider-shaped fixture replay system.

Reviewer framing: the provider is an untrusted text generator, not an authority
boundary — even a (future) live response must survive the Stage 3D consequence
boundaries before export.

## 1. Purpose

Stage 3D proved the containment architecture against deterministic mock outputs in
the research route. Stage 3E-core wraps that architecture in a **stable,
reviewer-testable HTTP gateway** with an explicit provider-mode contract, while
introducing **zero network surface**. It is the showroom door; the street-facing
vault (live providers) opens in Stage 3E-live.

Provider modes in core:

1. `mock` — default, deterministic, no network, CI default, Docker default.
2. `recorded_fixture` — replays **synthetic, hand-authored** provider-shaped
   outputs from committed fixtures; no network, no capture pipeline.
3. `live` — **contract only**: the env gate recognises it and always **fails
   closed** in core (no adapter exists). Implemented in Stage 3E-live.

## 2. Non-claims (loud; carried into the stage doc)

Inherits all 3A/3B/3C/3D non-claims. New for 3E-core:

- Stage 3E-core does **not** prove live-provider jailbreak immunity.
- Stage 3E-core does **not** call any live provider and ships **no** live adapter.
- Stage 3E-core does **not** execute real tools and does **not** enable
  provider-side tools.
- Stage 3E-core does **not** store raw provider transcripts, request bodies,
  response bodies, or API keys (it has no mechanism to obtain them).
- Stage 3E-core does **not** capture or import real provider transcripts;
  `recorded_fixture` is synthetic-only.
- Stage 3E-core is **not** production deployment and claims no compliance or
  third-party attestation.
- **Receipts attest what the configured gateway did, not whether the model was
  truly safe.**

## 3. Reference incident framing (Fable 5)

Used only as a **reference incident class** motivating consequence containment —
never reproduced, never relied upon. No raw jailbreak payload, leaked prompt,
exploit chain, or provider-specific bypass text appears anywhere in the repo.

Allowed: "Stage 3E-core is motivated by contested public reports of live-provider
jailbreak concerns such as the Fable 5 incident class; it reproduces no payload and
instead tests whether a provider-agnostic gateway can contain unsafe consequences."
Forbidden: any "Simurgh fixes/proves/reproduces/prevents Fable 5" wording.

## 4. Threat model

**Assets:** the Stage 3D containment boundary; gateway session tokens; HMAC
audit-chain integrity; metadata-only receipt boundary; tool-execution boundary;
output-export boundary; generated-evidence privacy.

**In-scope attacker capabilities:** malicious `input`; untrusted `contexts[]` and
indirect injection through context content; inducing tool-shaped provider output
(via `recorded_fixture`); inducing leakage-shaped provider output; smuggling raw
provider output / response body through HTTP fields; attempting to enable `live`
mode without the env flag; denial-of-wallet via oversized/repeated requests;
inferring provider config from receipts; ambiguous provider-mode behaviour.

**Out of scope (→ Stage 3E-live / 3F):** real provider calls, live SDK invocation,
provider-side tools, real tool execution, browser/computer use, MCP, multi-agent,
enterprise auth, persistent DB, production hardening, live-model exploit benchmarks.

**Trust assumptions:** server env vars not attacker-controlled; HMAC audit secret
not attacker-known; CI runs `mock`; raw fixture text allowed only in fixture
folders (and only synthetic); generated evidence is metadata-only.

## 5. Success criteria (gate-shaped)

- `mock` works with no network and is the CI + Docker default.
- `recorded_fixture` works with no network, synthetic-only, fails closed on bad
  provenance.
- `provider_mode=live` **always fails closed** in core (no adapter).
- Provider-side tools are never configured; no real tool executes.
- Provider output always passes the Stage 3D output firewall before export; blocked
  output is hash-only and never returned.
- Tool-shaped provider output always passes the Stage 3D tool gate; never executed.
- No raw provider transcript / request / response / API key in receipts, logs,
  metrics, audit, or evidence.
- Existing 3A/3B/3C/3D routes and receipts unchanged; Stage 3B benchmark no drift;
  Stage 3D gates still pass.
- OpenAPI validates structurally; Docker image runs `mock` with no keys and as
  non-root.
- Security + privacy + docker audits pass; CI requires no keys and no network.

No numeric "block rate" promised up front; rates are runner-generated and reported
honestly.

## 6. Architecture

```
Client / Reviewer
  ↓ POST /api/llm-shield/gateway/sessions        (Bearer gateway secret)
  ↓ POST /api/llm-shield/gateway/:sessionId/run  (Bearer session token, body cap)
gatewayRouter
  ↓ gatewayEnv (provider-mode contract; live fails closed)
  ↓ normalisePrompt → promptFirewall            (reuse 3A/3C)
  ↓ guardContexts                                (reuse 3D context provenance)
  ↓ runRiskAccumulator pre-provider check        (reuse 3D, gateway signals added)
  ↓ providerRegistry → { mockGatewayProvider | recordedFixtureProvider }
  ↓ providerOutputNormalise                      (transient raw output in memory only)
  ↓ gateToolRequest                              (reuse 3D tool gate; never executes)
  ↓ scanOutput                                   (reuse 3D output firewall)
  ↓ gatewayReceipt (schema_version "3E")
  ↓ HMAC audit chain → GET /gateway/:sessionId/verify
```

Principle: **the provider is an untrusted text generator, not an authority
boundary.** Raw provider output lives in memory only until the firewall completes;
it is never written to disk, logs, receipts, metrics, or audit payloads.

### 6.1 Mount-order invariant (hard)

`server.js` must register the gateway router **before** the base router:

```js
app.use("/api/llm-shield/gateway", gatewayRouter);
app.use("/api/llm-shield", llmShieldRouter);
```

so `/api/llm-shield/gateway/*` cannot be shadowed by the base router's
`/:sessionId` routes. This ordering is asserted by the security audit.

### 6.2 Session/token reuse

Reuse `src/security/sessionToken.js` (`issueSessionToken`/`verifySessionToken`/
`extractBearer`) and `getStore("llmShieldGatewaySessions")`. Secret derived from the
existing LLM-shield secret via HMAC label **`llm-shield-gateway`**. No second
token/session mechanism is invented.

## 7. Provider-mode env gate (`gatewayEnv.js`)

Parses/validates provider mode and fail-closed defaults. Default (no env):

```json
{ "provider_mode": "mock", "live_provider_enabled": false,
  "provider": "mock", "network_egress_allowed": false }
```

Fail-closed cases and reason codes:

| Case | Result | Reason code |
| --- | --- | --- |
| `provider_mode=live` (any config) in core | reject | `gateway_live_provider_not_implemented` |
| unknown provider mode | reject | `gateway_provider_mode_invalid` |
| unknown provider | reject | `gateway_provider_not_allowed` |
| client submits API key in request | reject | `gateway_client_key_rejected` |
| client submits provider response/output override | reject | `gateway_provider_output_override_rejected` |

Note: the env gate also recognises the future live env vars
(`SIMURGH_LIVE_PROVIDER_ENABLED`, `SIMURGH_LLM_PROVIDER`, model/key) for forward
compatibility, but in core any path resolving to `live` returns
`gateway_live_provider_not_implemented` — it never attempts a network call.

## 8. Routes (`gatewayRouter.js`)

```
POST /api/llm-shield/gateway/sessions          → { ok, session_id, token }
POST /api/llm-shield/gateway/:sessionId/run     → run (below)
GET  /api/llm-shield/gateway/:sessionId/verify  → { ok, valid, head }
GET  /api/llm-shield/gateway/openapi.json       → committed static OpenAPI JSON
```

Session creation performs no provider call. Run request:

```json
{ "task_type": "general_qa", "input": "User request", "contexts": [],
  "provider_mode": "mock", "provider": "mock", "scenario": "benign" }
```

`recorded_fixture` run selects a committed fixture by `case_id` rather than free
output. `case_id` is an **opaque fixture identifier, not a path**: it must match a
strict allowlist pattern (e.g. `^3e_[a-z_]+_\d{3}$`) and resolve through
`fixture-manifest.json`; path-like selectors and direct file paths are rejected
(`gateway_fixture_selector_invalid`). **Forbidden request fields** (presence →
reject before any provider step, `gateway_forbidden_field`):

```
api_key, anthropic_api_key, openai_api_key, provider_request_body,
provider_response_body, mock_provider_output, synthetic_provider_output,
raw_provider_output, tool_result, system_prompt, developer_prompt
```

(Synthetic output is fixtures-only; it is never accepted over HTTP.)

## 9. Provider contract + registry

```
src/llmShield/gateway/providerTypes.js          (shape/jsdoc contract)
src/llmShield/gateway/providerRegistry.js        (mode → provider; live → fail-closed)
src/llmShield/gateway/mockGatewayProvider.js     (deterministic; reuses 3D scenarios)
src/llmShield/gateway/recordedFixtureProvider.js (synthetic fixture replay)
src/llmShield/gateway/providerOutputNormalise.js (raw → {kind, text, tool_request})
```

Unified async interface returns metadata + **transient** `output_text` /
`tool_request` (memory only): `{ provider, provider_mode, provider_called,
network_egress_used, provider_response_kind, output_text, tool_request, usage,
latency_bucket, error_code }`. Providers must not import network modules and must
not import Simurgh tool-execution modules. The registry maps `live` → a
fail-closed stub returning `gateway_live_provider_not_implemented`.

## 10. recorded_fixture provenance (synthetic-only)

Stage 3E-core permits `recorded_fixture` only for hand-authored synthetic
provider-shaped outputs. Every recorded fixture MUST include `"provenance":
"synthetic"`. No fixture may derive from a real provider transcript, private
request, provider response, leaked prompt, copied safety policy, or production log.
**Core has no capture/import pipeline** — the only way to create one is to author
synthetic text directly. Fixture shape:

```json
{ "case_id": "3e_recorded_001", "category": "recorded_fixture",
  "provider_mode": "recorded_fixture", "provider": "anthropic_shape",
  "provenance": "synthetic", "input": "synthetic user request",
  "input_hash": "sha256:...", "provider_output_hash": "sha256:...",
  "provider_response_kind": "text | tool_request | refusal | error | leaky_text",
  "synthetic_provider_output": "fixture-only synthetic provider-shaped output",
  "expected": { "gateway_verdict": "accepted | warning | blocked",
    "tool_gate_verdict": "not_requested | blocked",
    "output_firewall_verdict": "accepted | blocked | not_called",
    "reason_codes": [] } }
```

The recordedFixtureProvider validates `provenance === "synthetic"` and the
output-hash before replay; fails closed otherwise.

## 11. Tool boundary

Provider-side tools: **disabled** (none configured anywhere). If a (fixture)
provider output is tool-shaped, it routes to the Stage 3D `gateToolRequest`:
allow / warning / blocked — and is **never executed** (`mock_file_read` still
blocked). Reason codes: `gateway_provider_tool_use_disabled`,
`gateway_provider_tool_request_detected`, `gateway_tool_request_blocked`.

## 12. Output boundary

All provider output is untrusted: hash → `scanOutput` (3D firewall) → accepted or
blocked. Accepted may return safe output text; blocked must **not** include the raw
output:

```json
{ "ok": false, "gateway_verdict": "blocked", "provider_called": true,
  "output_exported": false, "reason_codes": ["output_hidden_policy_leakage"],
  "receipt": { "schema_version": "3E", "output_hash": "sha256:..." } }
```

## 13. Context boundary

`contexts[]` flow through the existing Stage 3D provenance guard: raw context
transient, hash into receipt, untrusted demoted, role-escalation/unsigned-trusted/
secret-marker rejected. A `rejected` context skips the provider. (In core, the
"what reaches the provider" question is moot — the mock/recorded providers don't
consume raw context; the firm text-to-provider rule is a **3E-live** decision.)

## 14. Risk accumulator (reuse 3D + gateway signals)

Reuse `runRiskAccumulator` (thresholds locked 0–2/3–5/6+). Additive gateway
signals (weights tunable until runner closeout): provider returned tool-shaped
output `+2`; provider returned leakage-shaped output `+5`; synthetic provider error
`+1`; client API key supplied → hard block; unknown provider attempt → hard block.
(Live-mode signals are defined but inert in core.)

## 15. Receipt schema (`gatewayReceipt.js`, new)

New builder; **`safetyReceipt.js` and `stage3dReceipt.js` untouched.**

```json
{ "type": "simurgh.llm_gateway_receipt.v1", "schema_version": "3E",
  "session_id_hash": "sha256:...", "run_id": "gw_run_001", "task_type": "general_qa",
  "input_hash": "sha256:...", "normalised_input_hash": "sha256:...",
  "context_verdict": "not_supplied|accepted|demoted|rejected", "context_hashes": [],
  "gateway_verdict": "accepted|warning|blocked",
  "provider_mode": "mock|recorded_fixture|live", "provider": "mock|recorded_fixture|...",
  "provider_called": true, "provider_response_kind": "text|tool_request|refusal|error",
  "provider_response_hash": "sha256:...", "network_egress_used": false,
  "tool_gate_verdict": "not_requested|allowed|warning|blocked", "tool_called": false,
  "tool_name_hash": "sha256:...|null",
  "output_firewall_verdict": "accepted|blocked|not_called", "output_hash": "sha256:...",
  "risk_score": 4, "risk_verdict": "safe|warning|blocked",
  "latency_bucket": "0-250ms|...", "input_token_bucket": "0-1k|...|unknown",
  "output_token_bucket": "0-1k|...|unknown", "reason_codes": [],
  "privacy_mode": "metadata_only", "raw_provider_transcript_recorded": false,
  "raw_context_recorded": false, "raw_tool_args_recorded": false,
  "api_key_recorded": false, "timestamp": "...", "audit_entry_hash": "sha256:..." }
```

Must never include: `raw_input`, `raw_context`, `raw_provider_output`,
`provider_request_body`, `provider_response_body`, `api_key`, `system_prompt`,
`developer_prompt`, `tool_args`.

## 16. Audit events (`gatewayAudit.js`, additive)

```
LLM_GATEWAY_SESSION_CREATED, LLM_GATEWAY_REQUEST_ACCEPTED,
LLM_GATEWAY_REQUEST_REJECTED, LLM_GATEWAY_PROVIDER_CONFIG_REJECTED,
LLM_GATEWAY_PROVIDER_SKIPPED, LLM_GATEWAY_PROVIDER_CALLED,
LLM_GATEWAY_PROVIDER_OUTPUT_HASHED, LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED,
LLM_GATEWAY_TOOL_BLOCKED, LLM_GATEWAY_OUTPUT_ACCEPTED, LLM_GATEWAY_OUTPUT_BLOCKED,
LLM_GATEWAY_RISK_ACCUMULATED, LLM_GATEWAY_RISK_ESCALATED,
LLM_GATEWAY_RECEIPT_EXPORTED
```

Payloads whitelisted to hashes/verdicts/reason-codes. Representative orders:

- **mock accepted:** REQUEST_ACCEPTED → PROVIDER_CALLED → PROVIDER_OUTPUT_HASHED →
  OUTPUT_ACCEPTED → RISK_ACCUMULATED → RECEIPT_EXPORTED
- **live fail-closed:** REQUEST_ACCEPTED → PROVIDER_CONFIG_REJECTED →
  PROVIDER_SKIPPED → RECEIPT_EXPORTED
- **tool-shaped blocked:** REQUEST_ACCEPTED → PROVIDER_CALLED →
  PROVIDER_OUTPUT_HASHED → PROVIDER_TOOL_REQUEST_DETECTED → TOOL_BLOCKED →
  RECEIPT_EXPORTED (every provider-called path records the output-hash reduction)
- **output leakage blocked:** REQUEST_ACCEPTED → PROVIDER_CALLED →
  PROVIDER_OUTPUT_HASHED → OUTPUT_BLOCKED → RECEIPT_EXPORTED

The chain must verify after every path.

## 17. Rate / cost guards (`gatewayRateLimit.js`) — OWASP LLM10

Config (env, with safe defaults): `SIMURGH_GATEWAY_MAX_INPUT_CHARS=4000`,
`MAX_CONTEXT_CHARS=16000`, `MAX_OUTPUT_CHARS=8000`, `TIMEOUT_MS=20000`,
`MAX_LIVE_CALLS_PER_SESSION=20`, `MAX_LIVE_CALLS_PER_MINUTE=5`,
`MAX_DAILY_LIVE_CALLS=200`. In core, char/timeout caps are active; live-call limits
are wired but inert (no live calls). Fail-closed reason codes:
`gateway_input_too_large`, `gateway_context_too_large`, `gateway_output_too_large`,
`gateway_unbounded_consumption_guard` (+ live-rate codes reserved for 3E-live).

## 18. Logging & privacy contract

Logs may include: run_id, session_id_hash, provider_mode, provider,
gateway_verdict, risk_verdict, reason_codes, latency/token buckets, audit hash.
Never: raw input/context/output, provider request/response bodies, API keys,
Authorization headers, cookies, provider headers.

## 19. OpenAPI artifact

`docs/research/llm-shield/evidence/stage-3e/openapi.json`, OpenAPI 3.1, committed
static (not runtime-generated). Bearer security scheme; documents the four routes;
explicit request/response/receipt/error schemas; documents forbidden fields in
descriptions; **mock examples only**; no payloads, no keys.

## 20. Docker artifact

`Dockerfile.gateway`, `docker-compose.gateway.yml`, `.dockerignore`. Default `mock`
mode (no keys, no startup network call). Non-root `USER`; no secrets baked in;
`.env` excluded by `.dockerignore`; `npm ci` from lockfile; healthcheck hits a
local mock endpoint; live mode requires explicit runtime env (none in core).

## 21. Evidence folder

```
docs/research/llm-shield/evidence/stage-3e/
  README.md  metrics.json  fixture-manifest.json  openapi.json
  receipt-samples/  smoke-output.txt  security-audit-output.txt
  privacy-audit-output.txt  docker-smoke-output.txt
  fixtures/{mock_gateway,recorded_fixture,live_disabled,provider_error,
            output_firewall,tool_request,rate_limit}/
```

Generated evidence is metadata-only.

## 22. Fixture corpus (70 cases, no-network)

10 per category: `mock_gateway` (default path), `recorded_fixture` (synthetic
replay), `live_disabled` (fail-closed config), `provider_error` (synthetic
timeout/refusal/error mapping), `output_firewall` (synthetic leakage blocked),
`tool_request` (synthetic tool-shaped blocked), `rate_limit` (cap enforcement).
Frozen identity: `case_id`, `category`, `input_hash`, `provider_mode`, `provider`,
`provider_output_hash` (where applicable), `provenance` (for recorded), expected
verdict + reason codes. Raw text only under fixture folders, synthetic only. Don't
jump to 150.

## 23. Tests

**Unit (`tests/unit/llmShield/gateway/`):** `gatewayEnv`, `providerRegistry`,
`mockGatewayProvider`, `recordedFixtureProvider`, `providerOutputNormalise`,
`gatewayReceipt`, `gatewayRateLimit`.
**E2E (`tests/e2e/`):** `..._stage3e_mock_gateway_smoke`,
`..._stage3e_recorded_fixture_smoke`, `..._stage3e_live_disabled_smoke`,
`..._stage3e_provider_error_smoke`, `..._stage3e_output_firewall_smoke`,
`..._stage3e_tool_request_smoke`, `..._stage3e_rate_limit_smoke`,
`..._stage3e_fixture_runner`, `..._stage3e_docker_smoke` (skips if Docker absent).
No live-provider tests in core.

## 24. Scripts + check.sh wiring

`scripts/{smoke,security-audit,privacy-audit,docker-smoke}-llm-shield-stage3e.{sh,mjs}`.
Wire all into `scripts/check.sh` after the 3D steps (docker step skips gracefully
if Docker unavailable). CI requires no keys and no network.

## 25. Security-audit assertions

`provider_mode=live` fails closed (`gateway_live_provider_not_implemented`); no live
adapter file exists / no live SDK import path in core; gatewayRouter mounted before
base router; HTTP rejects `mock_provider_output`/`synthetic_provider_output`/
`provider_response_body`/`api_key`; provider-side tools never configured; mock &
recorded providers have no network imports; provider output passes the firewall
before response; tool-shaped output passes the tool gate; blocked output not
returned; no raw provider response in receipt samples; OpenAPI has Bearer scheme;
Dockerfile uses non-root `USER`; `.env` in `.dockerignore`; recordedFixtureProvider
validates synthetic provenance + fails closed; recorded_fixture rejects path-like
fixture selectors and resolves only manifest-listed `case_id` values; Stage 3B no
drift; Stage 3D gates pass.

## 26. Privacy-audit assertions

The forbidden-key scan covers **generated** evidence only — `metrics.json`,
`*-output.txt` gate outputs, and `receipt-samples/**` — and **excludes
`openapi.json`** (which documents forbidden field *names* in its descriptions) and
**`fixtures/**`** (synthetic by design). Scanned files contain none of: `raw_input`, `raw_context`, `raw_provider_output`,
`provider_request_body`, `provider_response_body`, `api_key`, `authorization`,
`cookie`, `x-api-key`, `anthropic_api_key`, `openai_api_key`, `system_prompt`,
`developer_prompt`, `tool_args`. Every `recorded_fixture` fixture has
`provenance === "synthetic"` (build fails on missing/other). Generated evidence for
mock/recorded carries `raw_provider_transcript_recorded:false`,
`api_key_recorded:false`, `network_egress_used:false`. `gatewayReceipt.js` exposes
no raw-text keys.

## 27. Metrics

Runner-generated `metrics.json`: `{ stage:"3E-core-industry-gateway",
provider_modes:["mock","recorded_fixture","live_failclosed"], fixture_count:70,
per_category:{...}, raw_provider_transcript_leak_count:0, api_key_leak_count:0,
network_egress_used_in_ci:false }`. No live performance metric.

## 28. Reviewer docs

`docs/research/llm-shield/LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY.md`,
`STAGE_3E_CORE_THREAT_MODEL.md`, `STAGE_3E_CORE_VALIDATION_MATRIX.md`,
`STAGE_3E_CORE_REVIEWER_CHECKLIST.md`, `STAGE_3E_CORE_CLOSEOUT.md`. Checklist
asserts: no immunity claim; live fails closed / no adapter; CI needs no keys; mock
& recorded have no network imports; provider-side tools off; no real tool execs;
output through firewall; tool-shaped output through gate; no raw transcript stored;
keys never accepted in requests nor written to evidence; OpenAPI documents auth;
Docker mock default + non-root; recorded fixtures synthetic-only; 3B no drift; 3D
gates pass.

## 29. Implementation phasing (one spec → one plan)

1. Docs skeleton + `gatewayEnv` (fail-closed contract incl. live→fail-closed).
2. Provider contract + registry + `providerOutputNormalise`.
3. `mockGatewayProvider` (reuse 3D scenarios) + `recordedFixtureProvider`
   (synthetic provenance validation).
4. `gatewayReceipt` + `gatewayAudit` events.
5. `gatewayRouter` (routes, session/token reuse, forbidden-field rejection) +
   `server.js` mount-order wiring.
6. Wire 3D context guard / tool gate / output firewall / risk into the run handler.
7. `gatewayRateLimit` caps.
8. OpenAPI artifact.
9. Docker artifact + docker smoke.
10. 70-fixture corpus + fixture runner + metrics.
11. smoke/security/privacy/docker gates + check.sh wiring.
12. Reviewer docs + closeout + tag.

Each phase independently green.

## 30. Closeout commands

```bash
npm test
bash scripts/smoke-llm-shield.sh
bash scripts/smoke-llm-shield-bench.sh
bash scripts/smoke-llm-shield-stage3d.sh
bash scripts/security-audit-llm-shield.sh
bash scripts/security-audit-llm-shield-stage3d.sh
node scripts/privacy-audit-llm-shield.mjs
node scripts/privacy-audit-llm-shield-stage3d.mjs
bash scripts/smoke-llm-shield-stage3e.sh
bash scripts/security-audit-llm-shield-stage3e.sh
node scripts/privacy-audit-llm-shield-stage3e.mjs
bash scripts/docker-smoke-llm-shield-stage3e.sh   # skips if Docker absent
npm audit --audit-level=high
npx prettier --check .
```

Tag on green (after merge to `main`): `v0.7.0-stage-3e-core-industry-gateway`.

## 31. File-change summary

**New runtime:** `src/llmShield/gateway/{gatewayEnv,gatewayRouter,gatewayReceipt,
gatewayAudit,gatewayRateLimit,providerTypes,providerRegistry,providerOutputNormalise,
mockGatewayProvider,recordedFixtureProvider}.js`.
**Modify runtime:** `server.js` (mount gateway router first). No changes to
`safetyReceipt.js`, `stage3dReceipt.js`, `promptFirewall.js`, `promptNormalise.js`,
`stage3dMockScenarios.js`, `llmShieldRouter.js`. (`runRiskAccumulator.js` reused
as-is; gateway signals computed in the gateway handler.)
**New docs/evidence:** this spec, the five `STAGE_3E_CORE_*` / stage docs, and
`evidence/stage-3e/**` (fixtures, openapi.json, metrics, samples, gate outputs).
**New container/API:** `Dockerfile.gateway`, `docker-compose.gateway.yml`,
`.dockerignore`, `evidence/stage-3e/openapi.json`.
**New tests/scripts:** `tests/unit/llmShield/gateway/*.test.js`,
`tests/e2e/llm_shield_stage3e_*.mjs`,
`scripts/{smoke,security-audit,privacy-audit,docker-smoke}-llm-shield-stage3e.*`.
**Update:** `AGENT.md`, `CHANGELOG.md`, `scripts/check.sh` (per change-protocol,
each phase adds a `Raouf:` entry).

## 32. Out of scope → Stage 3E-live (separate spec)

`anthropicProviderAdapter.js` (lazy `@anthropic-ai/sdk` import only inside the live
branch after `SIMURGH_LIVE_PROVIDER_ENABLED=true`), the live context-to-provider
text rule, optional live tests (skipped unless `SIMURGH_RUN_LIVE_PROVIDER_TESTS=true`),
denial-of-wallet live-call limits made active, and any OpenAI-compatible adapter
(later, or fail-closed stub). 3E-live may call Anthropic only after merged 3E-core
passes all gates. → `docs/superpowers/specs/2026-06-17-stage-3e-live-provider-adapters-design.md`.
