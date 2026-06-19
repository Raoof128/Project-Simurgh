<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3H-L2 — AgentDojo Layer-2 External Run Design

**Date:** 2026-06-19
**Status:** Design approved
**Target branch:** `stage-3h-agentdojo-layer2-external-run`
**Release target:** `v1.1.0-stage-3h-agentdojo-external-run`
**Builds on:** `v1.0.0-stage-3h-agentdojo-harness-core`
**Scope:** Required sampled pinned AgentDojo workspace external run through the shipped Simurgh
in-loop defence harness.
**Non-scope:** No new detector hardening, no AgentDojo scorer changes, no benchmark-task rewrites,
no capability-isolation redesign, no adaptive red-team loop, no full workspace or all-suite run.

## Steel-thread sentence

Stage 3H-L2 does not prove prompt-injection immunity or production readiness. It executes a
pinned sampled AgentDojo workspace benchmark in both baseline and Simurgh-defended modes, routes
the defended run through the existing in-loop Simurgh defence and real Node LLM Shield gateway,
leaves AgentDojo scoring unchanged, and reports AgentDojo-native utility/security metrics beside
Simurgh metadata-only containment, receipt, audit, privacy, and over-defence evidence.

## Locked closeout rule

Stage 3H-L2 closes only when a pinned sampled AgentDojo workspace run has been executed in both
baseline and Simurgh-defended modes under identical benchmark conditions, with AgentDojo scoring
unchanged and Simurgh evidence exported as metadata-only receipts, audit-chain verification,
containment metrics, and over-defence metrics.

If `agentdojo==0.1.30` cannot execute the sampled run because of upstream dependency, provider, or
scoring incompatibility, Stage 3H-L2 must not silently downgrade to runner-only. It must either pin
a working AgentDojo version or commit with the reason recorded in the run manifest, or close as
blocked without claiming external-run completion.

## Purpose

Stage 3H-core made Simurgh externally benchmark-compatible by shipping the AgentDojo adapter,
gateway-mediated canary, and CI-safe evidence path. Stage 3H-L2 turns that compatibility into a
measured external benchmark result.

The stage answers:

1. Can Simurgh run as an in-loop AgentDojo defence against a real sampled workspace suite?
2. What is Simurgh's measured effect on AgentDojo Targeted Attack Success Rate?
3. What benign utility and utility-under-attack cost does Simurgh impose?
4. Do Simurgh's containment invariants remain green during the external run?
5. Are all defended-run receipts and audit chains metadata-only and verifiable?
6. Does the evidence clearly separate AgentDojo-native scoring from Simurgh-specific containment
   scoring?

## Main claim

Stage 3H-L2 may claim:

```text
Simurgh was executed as an in-loop mediating defence on a pinned sampled AgentDojo workspace
external run. The same sampled task IDs, security case IDs, attack family, provider/model mode,
and benchmark pin were used for baseline and defended execution. AgentDojo task definitions and
scoring logic were left unchanged. The run reports AgentDojo-native utility/security metrics and
Simurgh-specific metadata-only containment evidence side by side.
```

Stage 3H-L2 must not claim:

```text
Simurgh solves prompt injection.
Simurgh is jailbreak-proof.
Simurgh is provably secure.
Simurgh is state of the art on AgentDojo.
Simurgh is production-ready.
Simurgh defeats adaptive attacks.
Simurgh provides CaMeL-style capability security.
```

## Scope

Stage 3H-L2 uses the existing Stage 3H-core harness and adapter. The Python adapter remains
transport and enforcement only.

Required sampled run:

```text
suite: workspace
benign utility tasks: 10
security cases: 20
configurations: baseline none + Simurgh defended
AgentDojo pin: agentdojo==0.1.30 unless replaced by a recorded working pin
gateway: real Node LLM Shield gateway for defended execution
scorer: AgentDojo-native, unchanged
evidence: metadata-only committed evidence
```

Deferred:

```text
workspace full
all suites sampled
all suites full
adaptive red-team extension
capability-isolation redesign
live-provider bragging or provider-specific claims
```

## Architecture

```text
Pinned AgentDojo sampled workspace runner
  -> baseline run: defence=none
       -> AgentDojo task suite
       -> AgentDojo scorer unchanged
       -> baseline AgentDojo-native metrics
  -> defended run: defence=simurgh
       -> AgentDojo task suite
       -> existing Simurgh AgentDojo adapter
            -> HTTP
            -> real Node gateway /api/llm-shield/gateway
                 -> input firewall
                 -> context provenance guard
                 -> provider path
                 -> tool invocation gate
                 -> output firewall
                 -> receipt builder
                 -> HMAC audit chain
            <- gateway verdict + receipt metadata
       -> adapter enforces allow/block before tool execution or output export
       -> AgentDojo scorer unchanged
       -> defended AgentDojo-native metrics
  -> Stage 3H-L2 exporter
       -> baseline vs defended AgentDojo metrics
       -> Simurgh containment metrics
       -> receipt and audit verification
       -> metadata-only evidence
```

## Comparison locks

The baseline and defended runs must use the exact same:

- committed sample manifest;
- AgentDojo package version or commit;
- workspace suite;
- sampled benign task IDs;
- sampled security case IDs;
- attack family;
- provider/model mode;
- benchmark configuration;
- runtime scoring path.

The 10 benign tasks and 20 security cases must be frozen before execution in:

```text
docs/research/llm-shield/evidence/stage-3h-layer2/sample-manifest.json
```

The runner must not sample randomly at runtime. Any sample change requires a committed
`sample-manifest.json` update and invalidates prior metric comparisons unless the previous sample
is preserved as a separate run.

## In-loop mediation points

| AgentDojo event             | Simurgh boundary         | Enforcement                                         |
| --------------------------- | ------------------------ | --------------------------------------------------- |
| user task starts            | trusted intent boundary  | recorded as trusted user intent                     |
| tool output returned        | context provenance guard | untrusted data is demoted or flagged                |
| model proposes tool call    | tool invocation gate     | block unsafe or unauthorised calls before execution |
| model proposes final answer | output firewall          | block unsafe output before export                   |
| defended run completes      | receipt + audit verifier | emit metadata-only evidence                         |

The adapter may transport, translate, and enforce the gateway decision. It must not classify,
downgrade, override, or reinterpret Simurgh safety decisions.

## Provider and model strategy

The preferred first implementation uses the least risky deterministic or local-compatible
AgentDojo-supported provider/model mode available. If a live provider is required, the run is
manual only, requires explicit environment configuration, records the provider/model label in the
manifest, commits no raw provider outputs, and stores only sanitised or hash-only evidence.

Stage 3H-L2 is an external benchmark execution stage, not a live-provider capability claim.

## Metrics

### AgentDojo-native metrics

AgentDojo-native metrics are measured by AgentDojo and reported without modification:

```text
Benign Utility
Utility Under Attack
Targeted Attack Success Rate
task completion rate
suite name
attack family
defence name
model/provider mode
```

Each metric must include numerator and denominator counts, not percentages alone:

```text
targeted_asr: 6/20
benign_utility: 8/10
utility_under_attack: 12/20
```

### Simurgh-specific containment metrics

Simurgh-specific metrics are measured from defended execution:

```text
unauthorised_or_unsafe_tool_execution_rate
unsafe_output_export_rate
context_authority_escalation_rate
receipt_coverage_rate
audit_verification_rate
generated_evidence_leakage_rate
raw_transcript_committed
boundary_distribution
blocked_tool_requests
blocked_final_outputs
context_guard_warnings
output_hash_coverage_rate
```

### Quality and cost metrics

Quality and cost metrics are measured, not hard-gated:

```text
over_defence_rate
blocked_benign_tool_calls
blocked_benign_final_outputs
utility_preserved_rate
gateway_roundtrip_ms_avg
gateway_roundtrip_ms_p95
adapter_overhead_ms_avg
model_refusal_rate
```

Every percentage-like metric must include raw counts:

```text
over_defence_rate: 1/10
receipt_coverage_rate: 30/30
audit_verification_rate: 30/30
```

## Hard gates

Stage 3H-L2 may close only if:

```text
AgentDojo scorer modified = false
AgentDojo task definitions modified = false
Simurgh defence in-loop = true
post_hoc_replay_used_for_ASR = false
baseline_and_defended_sample_ids_identical = true
sample_manifest_committed_before_execution = true
unauthorised_or_unsafe_tool_execution_rate = 0
unsafe_output_export_rate = 0
context_authority_escalation_rate = 0
receipt_coverage_rate = 100%
audit_verification_rate = 100%
generated_evidence_leakage_rate = 0
raw_transcript_committed = 0
agentdojo_version_pinned = true
run_manifest_complete = true
```

`unauthorised_or_unsafe_tool_execution_rate` counts tool executions the gateway denied or never
saw. Normal authorised tool calls in benign AgentDojo tasks count toward utility, not toward this
failure rate.

## Measured, not gated

The following must be reported honestly and must not be silently tuned into pass/fail gates:

```text
Benign Utility
Utility Under Attack
Targeted Attack Success Rate
over_defence_rate
latency overhead
model refusal rate
```

A poor utility result is a research finding, not a reason to change benchmark conditions after the
fact.

## Evidence layout

```text
docs/research/llm-shield/evidence/stage-3h-layer2/
  README.md
  sample-manifest.json
  run-manifest.json
  metrics.json
  agentdojo-native-results.json
  simurgh-containment-results.json
  simurgh-run-index.json
  receipt-samples/
  audit-samples/
  sanitized-agentdojo-summary/
  generated/
```

Recommended generated artifacts:

- `sample-manifest.json` — frozen benign task IDs, security case IDs, attack family, suite, and
  sample rationale.
- `run-manifest.json` — AgentDojo version/commit, benchmark provenance, Simurgh commit,
  provider/model mode, Node/Python versions, OS, timestamps, and any pin substitution reason.
- `agentdojo-native-results.json` — baseline and defended AgentDojo utility, utility-under-attack,
  targeted-ASR, task-completion fields, and raw counts.
- `simurgh-containment-results.json` — per-run boundary decisions and aggregate containment
  invariants for defended execution.
- `simurgh-run-index.json` — mapping from AgentDojo task/run IDs to Simurgh receipt IDs, or an
  explicit non-call reason.
- `metrics.json` — public combined summary with counts, percentages, and comparison deltas.

## Receipt mapping

Every defended AgentDojo run must map to one of:

```text
receipt_id: <Simurgh receipt ID>
non_call_reason: <explicit reason no gateway call was expected or possible>
```

This mapping is stored in:

```text
docs/research/llm-shield/evidence/stage-3h-layer2/simurgh-run-index.json
```

Missing receipt mappings are closeout blockers unless the run is explicitly marked with a
non-call reason that does not weaken the in-loop mediation claim.

## Evidence privacy contract

Allowed in committed evidence:

```text
suite name
task IDs
security case IDs
attack family labels
defence name
model/provider label
AgentDojo aggregate scores
metric numerators and denominators
Simurgh boundary verdicts
reason codes
receipt IDs
receipt hashes
audit verification booleans
latency summaries
aggregate utility/security metrics
```

Forbidden in committed evidence:

```text
raw prompts
raw tool outputs
raw provider responses
raw full trajectories
API keys
tokens
personal data
hidden instructions
system prompts
unsanitised benchmark transcripts
```

Raw AgentDojo trajectories may exist locally during execution, but they must be excluded from
committed evidence unless transformed into an allowlisted, metadata-only summary.

## Implementation layout

```text
tools/agentdojo-simurgh-adapter/
  simurgh_agentdojo_adapter/
    agentdojo_register.py       # registers Simurgh as an AgentDojo defence
    layer2_runner.py            # orchestrates pinned baseline + defended sampled runs
    layer2_metrics.py           # extracts native + Simurgh metrics with raw counts
    layer2_sanitise.py          # strips raw trajectories into allowlisted summaries
    layer2_manifest.py          # dependency/run/sample provenance
  tests/
    test_agentdojo_register.py
    test_layer2_metrics.py
    test_layer2_sanitise.py
    test_layer2_manifest.py

scripts/
  smoke-llm-shield-stage3h-layer2.sh
  security-audit-llm-shield-stage3h-layer2.sh
  privacy-audit-llm-shield-stage3h-layer2.mjs
  consistency-audit-llm-shield-stage3h-layer2.mjs

docs/research/llm-shield/
  LLM_SHIELD_STAGE_3H_LAYER2_AGENTDOJO_EXTERNAL_RUN.md
  STAGE_3H_LAYER2_THREAT_MODEL.md
  STAGE_3H_LAYER2_VALIDATION_MATRIX.md
  STAGE_3H_LAYER2_REVIEWER_CHECKLIST.md
  STAGE_3H_LAYER2_CLOSEOUT.md
```

The exact AgentDojo CLI/API binding may change after implementation inspection. The requirement is
stable: pinned sampled workspace suite, unchanged scorer, baseline plus Simurgh-defended execution,
real gateway enforcement, metadata-only evidence export, and honest metric reporting.

## Runner command shape

Suggested defended run:

```bash
python -m simurgh_agentdojo_adapter.layer2_runner \
  --suite workspace \
  --sample-manifest docs/research/llm-shield/evidence/stage-3h-layer2/sample-manifest.json \
  --benchmark-version agentdojo==0.1.30 \
  --attack important_instructions \
  --defence simurgh \
  --gateway-base-url http://127.0.0.1:33030/api/llm-shield/gateway \
  --out docs/research/llm-shield/evidence/stage-3h-layer2/defended
```

Suggested baseline run:

```bash
python -m simurgh_agentdojo_adapter.layer2_runner \
  --suite workspace \
  --sample-manifest docs/research/llm-shield/evidence/stage-3h-layer2/sample-manifest.json \
  --benchmark-version agentdojo==0.1.30 \
  --attack important_instructions \
  --defence none \
  --out docs/research/llm-shield/evidence/stage-3h-layer2/baseline
```

## Acceptance criteria

Stage 3H-L2 is complete when:

1. The sampled workspace task/security-case set is frozen in committed `sample-manifest.json`.
2. Baseline and defended runs use the exact same sample IDs, attack family, provider/model mode,
   and AgentDojo pin.
3. AgentDojo scorer output exists for both baseline and defended runs.
4. AgentDojo-native utility, utility-under-attack, and targeted-ASR metrics are exported with raw
   counts.
5. Simurgh containment metrics are exported for defended execution.
6. Every defended run has a Simurgh receipt ID or explicit non-call reason in
   `simurgh-run-index.json`.
7. Receipt coverage is 100% for gateway-mediated defended runs.
8. Audit verification is 100%.
9. Generated evidence leakage is zero.
10. Raw AgentDojo trajectories are excluded from committed evidence or transformed into
    allowlisted metadata-only summaries.
11. Docs clearly separate AgentDojo-native metrics from Simurgh-specific metrics.
12. No claim of jailbreak immunity, provable security, production readiness, or adaptive-attack
    defeat is made.

## References

- Debenedetti et al., **AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and
  Defenses for LLM Agents**, NeurIPS 2024. https://arxiv.org/abs/2406.13352
- Beurer-Kellner, Debenedetti et al., **Design Patterns for Securing LLM Agents against Prompt
  Injections** (2025). https://arxiv.org/abs/2506.08837
- Debenedetti et al., **Defeating Prompt Injections by Design (CaMeL)** (2025).
  https://arxiv.org/abs/2503.18813
