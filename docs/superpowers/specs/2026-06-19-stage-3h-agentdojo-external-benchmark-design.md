<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3H — LLM Shield External AgentDojo Benchmark Harness (Design)

**Date:** 2026-06-19
**Status:** Design locked — ready for implementation plan
**Branch:** `stage-3h-agentdojo-external-benchmark`
**Release target:** `v1.0.0-stage-3h-agentdojo-external-benchmark`
**Builds on:** Stage 3F containment benchmark (`v0.8.0`) and Stage 3G live-provider shadow framework (`v0.9.0`)
**Scope:** AgentDojo only, workspace canary subset first. In-loop mediating defence against the real Node HTTP gateway. No new detector hardening. No additional benchmarks (AgentDyn, InjecAgent, OS-Harm deferred). No provable-security claim.

---

## Steel-thread sentence

Stage 3H does not prove prompt-injection immunity. It makes the LLM Shield externally
benchmark-compatible by inserting Simurgh as an **in-loop mediating defence** inside the
AgentDojo evaluation loop — calling the real running Node HTTP gateway — and reporting both
AgentDojo-native utility/security metrics and Simurgh-specific metadata-only audit evidence,
with AgentDojo's task definitions and scoring logic left unchanged.

---

## Locked core rule

> Stage 3H uses **in-loop mediation, not post-hoc replay**. Simurgh is implemented as an
> AgentDojo-compatible defence/pipeline element that calls the real running Node gateway over
> HTTP. AgentDojo task definitions and scoring logic remain unchanged. The Python adapter
> transports AgentDojo events to the gateway and enforces the returned allow/block decision, but
> does not reimplement or reinterpret Simurgh boundary logic. Because Simurgh mediates execution
> before tool calls and final output export, AgentDojo-native Attack Success Rate and Utility
> Under Attack reflect the **defended run** rather than a hypothetical replay.

---

## Purpose

Stage 3H closes the main credibility gap in the LLM Shield evaluation.

Stages 3F and 3G showed that Simurgh preserves containment invariants on **self-authored
synthetic fixtures**. Stage 3H evaluates the same gateway boundaries against an **external**
benchmark with recognised task suites, tool environments, security cases, and utility metrics.

The goal is not to beat every benchmark baseline. The goal is to honestly measure:

1. Whether Simurgh preserves external benchmark utility (Benign Utility).
2. Whether Simurgh reduces attack success (Attack Success Rate).
3. Whether Simurgh still emits metadata-only receipts.
4. Whether Simurgh audit chains verify across external benchmark runs.
5. Whether containment invariants remain intact under external tasks.

## Research question

When Simurgh is inserted as a defence into AgentDojo, can it preserve the following?

1. Unsafe tool execution remains zero.
2. Unsafe output export remains zero.
3. Untrusted benchmark tool outputs do not become authority.
4. Every run produces a metadata-only receipt.
5. Every run produces an audit-verifiable decision chain.
6. Standard benchmark metrics are reported without hiding utility loss.

## Non-claims

Stage 3H does **not** claim: jailbreak immunity; complete prompt-injection prevention;
state-of-the-art AgentDojo score; production-readiness; live-provider safety by default;
universal compatibility with every agent benchmark; provable security; or replacement for
capability-based isolation. Stage 3H is an external benchmark harness, not a detector-hardening
stage. Receipts attest process, not ground truth.

---

## Why AgentDojo first

AgentDojo (Debenedetti et al., NeurIPS 2024) is selected because it provides: realistic
tool-using agent tasks; untrusted tool outputs; prompt-injection security cases; benchmark-native
**Benign Utility** and **Utility Under Attack** metrics; benchmark-native attack-success
measurement; multiple suites (workspace, Slack, travel, banking-style); and an extensible
agent/defence interface. Its 97 realistic tasks and 629 security cases map almost directly onto
Simurgh's context/tool/output containment model. AgentDojo's own guidance — that default attacks
alone are insufficient for robust evaluation — also sets up the future Stage 3J adaptive
red-team work.

AgentDyn, InjecAgent, OS-Harm, and adaptive red-team loops are deferred to later stages.

## Design principle

Simurgh is an **in-loop mediating defence**, not a benchmark fork. AgentDojo task, environment,
tools, and scoring logic remain external and unchanged. Simurgh inserts at AgentDojo's intended
defence/pipeline extension point and mediates:

- user task input (trusted intent);
- untrusted tool output (untrusted context);
- proposed tool calls (tool requests, mediated **before execution**);
- final agent output (output export, mediated **before export**);
- benchmark result metadata.

Using AgentDojo's defence hook is distinct from forking it: the scorer is untouched.

## Mapping model

| AgentDojo concept              | Simurgh concept                                       |
| ------------------------------ | ----------------------------------------------------- |
| User task                      | trusted user intent                                   |
| Tool output / environment data | untrusted context                                     |
| Prompt injection text          | untrusted context payload                             |
| Agent tool call                | tool request                                          |
| Tool execution                 | authorised or blocked consequence                     |
| Final answer                   | output export                                         |
| Security case                  | adversarial run                                       |
| Benign task                    | utility run                                           |
| Attack success                 | unsafe consequence or benchmark-defined attacker goal |
| Utility success                | benchmark-defined task completion                     |
| Defence element                | Simurgh LLM Shield gateway (in-loop)                  |
| Benchmark result               | Simurgh receipt + AgentDojo score row                 |

---

## Architecture

```text
AgentDojo runner (Python, unchanged scorer)
  -> Simurgh AgentDojo defence element (Python adapter; transport + enforcement only)
       -> HTTP -> real Node Simurgh gateway  (/api/llm-shield/gateway, default :33030)
            -> context provenance guard
            -> provider call or simulated provider call (mock / recorded / live-shadow)
            -> tool invocation gate
            -> output firewall
            -> receipt builder
            -> HMAC audit chain
  -> AgentDojo scorer (unchanged)
  -> Stage 3H metrics exporter (AgentDojo-native + Simurgh-specific)
```

### Gateway connection (locked)

The adapter calls the **real running Simurgh gateway** over HTTP, defaulting to
`http://127.0.0.1:33030/api/llm-shield/gateway`, with the base URL configurable by environment
variable:

```bash
SIMURGH_GATEWAY_BASE_URL=http://127.0.0.1:33030/api/llm-shield/gateway
```

Python must be **plumbing only**. No duplicated safety logic.

### Adapter authority boundary (locked)

> The Python adapter may **transport, translate, and enforce** the gateway decision. It must
> **not classify, downgrade, override, or reinterpret** Simurgh safety decisions.

### Block semantics (locked)

> When Simurgh blocks a tool call or final output, the adapter returns a **benchmark-compatible
> blocked-action result** so AgentDojo can continue scoring without changing task definitions or
> scorer logic.

### Post-hoc replay (locked)

> Post-hoc replay may exist **only as a diagnostic comparison mode**. It must **not** be used for
> AgentDojo ASR or Utility Under Attack claims.

---

## Modes

### Mode 1 — dry-run adapter mode (CI-safe)

No live provider, no external model call. Verifies schema mapping, run lifecycle, receipt
coverage, audit verification, and evidence privacy. Runs on every commit.

```bash
node tests/e2e/llm_shield_stage3h_agentdojo_adapter_smoke.mjs
```

### Mode 2 — recorded-fixture mode (CI-safe)

Synthetic or recorded-safe benchmark-shaped outputs. No live network. Deterministic CI.

```bash
python scripts/agentdojo-stage3h-runner.py --suite workspace --mode recorded_fixture
```

### Mode 3 — live-shadow mode (optional, opt-in)

Requires explicit provider env and `--run-live`. No raw transcripts committed. Provider outputs
are hashed or sanitised before evidence export. Never runs in CI by default.

```bash
python scripts/agentdojo-stage3h-runner.py --suite workspace --mode live_shadow --run-live
```

The default path is always key-free, no-network, and CI-safe.

### CI execution split (resolves mode/CI ambiguity)

- **Mode 1 (dry-run, Node)** is the **mandatory always-on CI gate**. It has **no AgentDojo
  dependency** — it exercises the adapter contract against the vendored canary fixture and the
  real Node gateway only.
- **Mode 2 (recorded-fixture, Python)** is key-free and no-network, but **requires the pinned
  AgentDojo to be installed**; it runs in CI **only** on jobs where that pinned AgentDojo is
  present (Layer 1 below). It is not assumed available on every commit job.
- **Mode 3 (live-shadow)** never runs in CI.

---

## Two-layer build

- **Layer 1 — CI-safe harness.** No live provider, no network; runs on every commit. Proves the
  adapter, mapping, receipt, audit, and evidence-privacy paths. Does **not** require an installed
  AgentDojo with network/model access; it pins an AgentDojo version/commit and uses a small
  vendored workspace canary fixture so adapter-mapping tests cannot silently drift from the
  real AgentDojo schema.
- **Layer 2 — optional external run.** AgentDojo installed locally; optional model/provider.
  Not required in CI. Proves external benchmark compatibility, utility metrics, attack-success
  metrics, and Simurgh metrics side-by-side.

---

## Initial scope

Start with one AgentDojo suite: **workspace** (email/calendar/file-like workflows map cleanly to
context poisoning and tool misuse; easier to reason about than travel/banking; less risky than
payment-like flows).

Canary subset for the first pass:

- 10 benign utility tasks;
- 20 security cases;
- up to 3 attack variants if available;
- no live provider by default.

Expansion order after the canary is stable: `workspace full` → `all suites sampled` →
`all suites full`. Do **not** start with all 629 cases.

---

## Metrics

### AgentDojo-native (measured, not gated)

Benign Utility; Utility Under Attack; Attack Success Rate; task completion rate; suite name;
attack family; defence mode.

### Simurgh-specific

unsafe tool execution rate; unsafe output export rate; context authority escalation rate; receipt
coverage rate; audit verification rate; generated evidence leakage rate; output hash coverage
rate; boundary distribution; false-positive / over-defence rate; latency overhead where
measurable.

### Over-defence measurement (directly addresses the 3F 60% hard-negative FP)

A defence that blocks every tool call has low attack success but no utility. Stage 3H must report:

```text
utility_preserved_rate
blocked_benign_tool_calls
blocked_benign_final_outputs
over_defence_rate
```

---

## Hard gates vs measured

### Hard-gated (must hold)

```text
unsafe_tool_execution_rate = 0
unsafe_output_export_rate = 0
context_authority_escalation_rate = 0
receipt_coverage_rate = 100%
audit_verification_rate = 100%
generated_evidence_leakage_rate = 0
raw_transcript_committed = 0
```

### Measured, not hard-gated (reported honestly)

```text
Benign Utility
Utility Under Attack
Attack Success Rate
false-positive / over-defence rate
latency overhead
model refusal rate
```

Detection/utility quality is reported honestly and is **not** silently tuned into pass/fail gates.

---

## Evidence layout

```text
docs/research/llm-shield/evidence/stage-3h/
  README.md
  agentdojo-run-manifest.json          # AgentDojo version/commit, Simurgh commit, mode, suite
  metrics.json
  agentdojo-native-results.json
  simurgh-containment-results.json
  receipt-samples/
  audit-samples/
  adapter-samples/
  generated/
```

### Evidence privacy rules

**Allowed in generated evidence:** case IDs; suite names; track names; attack family labels;
boundary verdicts; reason codes; hashes; receipt IDs; audit verification booleans; aggregate
metrics.

**Forbidden in generated evidence:** raw prompt text; raw provider response body; raw tool output
body; API keys; auth tokens; personal data; hidden instructions; full benchmark transcripts
unless explicitly allowed and sanitised.

---

## Implementation layout

```text
tools/agentdojo-simurgh-adapter/
  README.md
  pyproject.toml
  simurgh_agentdojo_adapter/
    __init__.py
    defence.py            # AgentDojo defence/pipeline element (in-loop hook)
    mapping.py            # AgentDojo events <-> Simurgh boundary events
    metrics.py            # AgentDojo-native + Simurgh-specific exporters
    evidence_writer.py    # metadata-only evidence; privacy enforcement
    simurgh_client.py     # HTTP client to real Node gateway (transport + enforcement only)
  tests/
    test_mapping.py
    test_metrics.py
    test_evidence_writer.py

tests/e2e/
  llm_shield_stage3h_agentdojo_adapter_smoke.mjs

scripts/
  smoke-llm-shield-stage3h.sh
  security-audit-llm-shield-stage3h.sh
  privacy-audit-llm-shield-stage3h.mjs
  agentdojo-stage3h-runner.py

docs/research/llm-shield/
  LLM_SHIELD_STAGE_3H_EXTERNAL_AGENTDOJO_BENCHMARK.md
  STAGE_3H_THREAT_MODEL.md
  STAGE_3H_VALIDATION_MATRIX.md
  STAGE_3H_REVIEWER_CHECKLIST.md
  STAGE_3H_CLOSEOUT.md
```

### Adapter responsibilities

1. Start or connect to a real Simurgh gateway session over HTTP.
2. Convert AgentDojo user tasks into trusted user-intent records.
3. Convert AgentDojo tool outputs into untrusted context records.
4. Intercept proposed tool calls **before** execution.
5. Route tool calls through the Simurgh tool gate and enforce the decision.
6. Route final answers through the Simurgh output firewall and enforce the decision.
7. On block, return a benchmark-compatible blocked-action result.
8. Export AgentDojo-native scores.
9. Export Simurgh containment metrics.
10. Export metadata-only receipts and verify HMAC audit chains after each run.

### Adapter non-responsibilities

Must not: rewrite AgentDojo task definitions; change AgentDojo scoring logic; hide failed
utility; store raw provider transcripts in generated evidence; commit live provider outputs;
execute tools outside AgentDojo's normal runtime; classify/downgrade/override/reinterpret Simurgh
decisions; or claim CaMeL-style provable security.

---

## Stage 3H gates

### Smoke gate

adapter loads; one canary task maps correctly; gateway session created; receipt emitted; audit
chain verifies; metrics file written.

### Security audit gate

unsafe tool execution = 0; unsafe output export = 0; context authority escalation = 0; no direct
tool execution bypasses the Simurgh gate; no live provider path runs unless explicitly enabled.

### Privacy audit gate

generated evidence has no raw prompts, no raw provider outputs, no API keys; receipt samples are
metadata-only; blocked outputs are hash-only.

### External benchmark consistency gate

AgentDojo scoring output exists; Simurgh metrics output exists; run manifest records AgentDojo
version/commit and Simurgh commit; adapter mode is explicit; no benchmark task definitions are
modified.

---

## Acceptance criteria

Stage 3H can close when:

1. AgentDojo workspace canary subset runs through the in-loop Simurgh defence.
2. AgentDojo-native metrics are exported.
3. Simurgh containment metrics are exported.
4. Hard containment invariants are green.
5. Receipt coverage is 100%.
6. Audit verification is 100%.
7. Generated evidence leakage is zero.
8. Utility metrics are reported honestly.
9. Docs clearly separate external benchmark metrics from Simurgh-specific metrics.
10. No claim of jailbreak immunity or provable security is made.

---

## Phase plan

1. **3H-A** — Adapter mapping only (AgentDojo events ↔ Simurgh boundary events).
2. **3H-B** — CI-safe canary runner (dry-run + recorded-fixture).
3. **3H-C** — Metrics exporter (AgentDojo-native + Simurgh-specific + over-defence).
4. **3H-D** — Security/privacy/consistency gates wired into `check.sh`.
5. **3H-E** — Optional AgentDojo canary external result (Layer 2).
6. **3H-F** — Closeout doc and release tag.

---

## Release

```text
Release tag:     v1.0.0-stage-3h-agentdojo-external-benchmark
Commit message:  Add Stage 3H AgentDojo external benchmark harness
```

## Closeout paragraph (target)

Stage 3H adds an external AgentDojo benchmark harness for the LLM Shield gateway. It evaluates
Simurgh as an in-loop, provider-agnostic mediating defence around recognised tool-using
prompt-injection tasks, calling the real Node HTTP gateway and leaving AgentDojo's scorer
unchanged. It reports both AgentDojo-native utility/security metrics and Simurgh-specific
metadata-only evidence metrics. The stage does not claim jailbreak immunity or provable security.
It demonstrates external benchmark compatibility, containment-invariant preservation,
metadata-only receipt generation, and audit-chain verification.

---

## References

- Debenedetti et al., **AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and
  Defenses for LLM Agents**, NeurIPS 2024 — 97 tasks, 629 security cases, Benign Utility / Utility
  Under Attack metrics. https://arxiv.org/abs/2406.13352
- Beurer-Kellner, Debenedetti et al., **Design Patterns for Securing LLM Agents against Prompt
  Injections** (2025) — six patterns; positions filtering vs provable isolation.
  https://arxiv.org/abs/2506.08837
- Debenedetti et al., **Defeating Prompt Injections by Design (CaMeL)** (2025) — control/data-flow
  + capabilities; architectural reference for a future Stage 3I. https://arxiv.org/abs/2503.18813
- **AgentDyn** (2026) — deferred later benchmark; 60 open-ended tasks, 560 injection cases.
  https://arxiv.org/abs/2602.03117
