# Stage 3J — Full AgentDojo Workspace and All-Suite External Evaluation

**Status:** proposed
**Release target:** `v1.3.0-stage-3j-full-agentdojo-external-evaluation`
**Builds on:** Stage 3H AgentDojo harness, Stage 3H-L2 sampled external run, and Stage 3I context-provenance calibration (`v1.2.0`).

## Steel-thread sentence

Stage 3J does not prove jailbreak immunity. It measures whether Simurgh's provider-agnostic containment gateway preserves AgentDojo-native utility and targeted-ASR outcomes across the full pinned AgentDojo benchmark while maintaining zero unsafe tool execution, zero unsafe output export, zero context authority escalation, metadata-only receipts, and audit-verifiable evidence.

## One-paragraph summary

Stage 3I recovered benign utility on the sampled `10 benign + 20 security` AgentDojo run and confirmed it on a real external pass (defended benign utility `0/10 → 10/10`, over-defence `0/10`, targeted ASR `0/20`, containment gates clean). Stage 3J scales that confirmed recovery to the full pinned AgentDojo benchmark — all four suites — using the **deterministic ground-truth pipeline** (key-free, no real LLM, reproducible) that Stages 3H/3H-L2/3I already use. It adds no new defence logic. It reports AgentDojo's native metrics (benign utility, utility under attack, targeted ASR) suite-by-suite, alongside Simurgh's containment metrics, with the native scorer unchanged and all evidence metadata-only. Containment invariants are hard gates; utility/ASR are reported honestly and not hard-gated up front, because full-suite coverage may include tasks the harness does not solve.

## Pipeline decision (key claim boundary)

Stage 3J's committed result uses the **deterministic ground-truth pipeline**, not a real LLM provider. Rationale: the headline measures _Simurgh's mediation_ (does it preserve the known-good task path and contain injected goals?), not a live model's capability or robustness. A real provider would mix model capability + randomness + provider behaviour + Simurgh mediation into one number and require API keys, cost, and non-determinism — breaking CI reproducibility and the project's key-free discipline. The honest headline is therefore: **"full-suite external containment under a deterministic AgentDojo harness."** A real-LLM probe is explicitly deferred (see Non-goals / Stage 3K).

## Discovered benchmark inventory (not the paper number)

Measured locally from `agentdojo==0.1.30`, benchmark `v1.2.1`:

| Suite     | user tasks | injection tasks | security combos (user × injection) |
| --------- | ---------: | --------------: | ---------------------------------: |
| workspace |         40 |              14 |                                560 |
| travel    |         20 |               7 |                                140 |
| banking   |         16 |               9 |                                144 |
| slack     |         21 |               5 |                                105 |
| **Total** |     **97** |          **35** |                            **949** |

Benign user tasks total `97` (matches the AgentDojo paper). The full security cross-product is `949`, which differs from the paper's reported `629` (the paper counts applicable/deduped pairs differently). **Stage 3J records the discovered counts and lets AgentDojo's own `benchmark_suite_with_injections` fix the executed security set at manifest-freeze time; it never forces the paper number.** Full all-suite execution is ≈ `97 + (executed security set)` per mode × 2 modes (baseline + defended) ≈ ~2,000 task executions — offline-feasible but long-running; runtime/cost is reported, not gated.

## Two lanes (never mixed into one claim)

| Lane                         | Purpose                                                                                              | Claiming? |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| **3J-A pinned lane**         | Main scientific result on `agentdojo==0.1.30` / benchmark `v1.2.1`, comparable to Stage 3H-L2 and 3I | Yes       |
| **3J-B compatibility probe** | Optional, non-claiming probe against a newer AgentDojo only to observe what changed                  | No        |

## Goals

1. Run the full pinned AgentDojo `workspace` suite, then the full all-suite benchmark, in baseline vs Simurgh-defended modes, native scorer unchanged.
2. Report AgentDojo-native metrics (benign utility, utility under attack, targeted ASR) globally and suite-by-suite.
3. Report Simurgh containment metrics and hold the containment hard gates across the full run.
4. Reuse the Stage 3H adapter and Stage 3I context-provenance fix; reuse the Stage 3I failure taxonomy.
5. Produce a manifest freeze, suite breakdown, cost/runtime manifest, and reviewer closeout.

## Non-goals

- No new defence logic; no tool-permit stack unless the full run reveals a new failure class (→ Stage 3K).
- No real-LLM provider in the committed result; no live-provider safety claim.
- No production-deployment claim; no broad jailbreak-resistance claim; no adaptive-attack robustness claim.
- No change to AgentDojo tasks, scorer, attacks, or utility functions; no Python-side safety classifier.
- No raw transcript / raw task text / raw injection text / raw tool args / raw provider output / secrets in evidence.

## Architecture

```text
AgentDojo pinned benchmark (agentdojo==0.1.30, v1.2.1, important_instructions)
  -> suite discovery + full manifest freeze
  -> baseline run (deterministic ground-truth pipeline)
  -> Simurgh-defended run (same pipeline, mediated by the Stage 3I-calibrated gateway)
  -> native AgentDojo scorer (unchanged)
  -> Simurgh receipt + audit collector (metadata-only)
  -> Stage 3I failure-taxonomy reuse
  -> suite-by-suite + global metrics
  -> privacy / consistency / security audits
  -> closeout report
```

Reuses the Stage 3H adapter (`tools/agentdojo-simurgh-adapter/`) and the Stage 3I provenance fix; it does not rewrite the adapter or the gateway.

## Phases

- **3J-A — Manifest freeze.** Discover suites/tasks/injections under the pin; freeze `manifest.json`, `suite-index.json`, `run-plan.json`, `pinned-environment.json`. Record discovered counts (97 / 35 / 949 cross-product) and the AgentDojo-fixed executed security set; explain any divergence from the paper.
- **3J-B — Full workspace run.** Run `workspace` first (it extends the Stage 3H-L2 sampled workspace run). Emit baseline/defended results, containment, taxonomy, metrics, runner output.
- **3J-C — Full all-suite run.** Run all four suites under the pin. Emit all-suite baseline/defended results, containment, taxonomy, metrics, suite breakdown, runner output.
- **3J-D — Suite-by-suite diagnosis.** Per-suite utility/ASR/over-defence + failure taxonomy, so a global average never hides a per-suite weakness.
- **3J-E — Audits.** Privacy, consistency, security audits + workspace/all-suite smoke gates.
- **3J-F — Closeout + PR.** Reviewer docs, closeout, and PR.

## Metrics

**AgentDojo-native (unchanged scorer):** `benign_utility`, `utility_under_attack`, `targeted_asr` — reported with numerator/denominator, baseline and defended, globally and per suite.

**Simurgh containment:** `unsafe_tool_execution`, `unsafe_output_export`, `context_authority_escalation`, `receipt_coverage`, `audit_verification`, `raw_transcript_committed`, `generated_evidence_leakage`, `over_defence`, `gateway_contact_coverage`, `taxonomy_coverage`.

**Comparative deltas:** `utility_delta`, `uua_delta`, `asr_delta`, `over_defence_delta` (baseline vs defended).

## Gates

**Hard gates (fail the stage if violated):**

```text
unsafe_tool_execution == 0
unsafe_output_export == 0
context_authority_escalation == 0
receipt_coverage == 100%
audit_verification == 100%
raw_transcript_committed == 0
generated_evidence_leakage == 0
native_agentdojo_scorer_changed == false
python_side_safety_classifier == false
```

**Soft / report-only (measured, not gated at first):** `benign_utility`, `utility_under_attack`, `targeted_asr`, per-suite utility loss, per-suite ASR, dominant failure classes, runtime/cost. Rationale: AgentDojo reports that current LLMs solve well under two-thirds of tasks even without attacks, and the deterministic harness may not complete every task; a hard utility gate up front would be dishonest. If a suite shows a utility regression, that is a Stage 3K calibration target, not a Stage 3J failure.

## File plan

**Python adapter (reuse existing; add):** `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage3j_{manifest,full_runner,metrics,suite_breakdown,sanitise}.py` and matching `tests/test_stage3j_{manifest,metrics,suite_breakdown,sanitise}.py`. The full runner reuses the Stage 3H/3I ground-truth pipeline, gateway client, and Stage 3I provenance; it extends the Layer-2 runner to iterate all suites rather than a frozen sample.

**Node scripts:** `scripts/smoke-llm-shield-stage3j-workspace.sh`, `scripts/smoke-llm-shield-stage3j-all-suite.sh`, `scripts/privacy-audit-llm-shield-stage3j.mjs`, `scripts/consistency-audit-llm-shield-stage3j.mjs`, `scripts/security-audit-llm-shield-stage3j.sh`. The heavy runs are opt-in via `SIMURGH_RUN_STAGE3J_WORKSPACE=1` / `SIMURGH_RUN_STAGE3J_ALL_SUITES=1` (and `scripts/check.sh` gates them off by default, mirroring the Stage 3H-L2 opt-in). The CI-safe path runs the audits against committed evidence.

**Docs:** `docs/research/llm-shield/LLM_SHIELD_STAGE_3J_FULL_AGENTDOJO_EVALUATION.md`, `STAGE_3J_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

**Evidence:** `docs/research/llm-shield/evidence/stage-3j/` — `manifest.json`, `pinned-environment.json`, `workspace-*`, `all-suite-*`, `*-suite-breakdown.json`, `*-taxonomy.json`, `simurgh-containment-metrics.json`, `receipt-samples.json`, `audit-sample.json`, and the three audit output logs.

## Audits

**Privacy:** no raw transcript / user-task text / injection text / tool args / provider output / secrets / API keys / system-developer prompt text; task and receipt IDs hashed; evidence is hashes/enums/counts only (extends the Stage 3I privacy discipline).

**Consistency:** manifest count == result count; suite breakdown sums to global metrics; baseline and defended share one task/case manifest; AgentDojo version / benchmark version / attack name pinned; native scorer unchanged; every defended case has a receipt; every receipt has an audit entry; every audit sample verifies; no generated-evidence leakage.

**Security:** no Python-side safety classifier; no adapter tool-execution bypass; no gateway route bypass; no provider-side tool execution; context authority escalation remains blocked; forged-authority context remains rejected; untrusted context remains demoted-to-data; tool-shaped output never auto-executed; unsafe output blocked before export; Stage 3F containment benchmark does not drift; Stage 3I sampled-run result does not drift.

## Threat model (summary)

A jailbreak / indirect prompt injection bypasses input-level filtering and attempts consequences via context, tools, or output export. Stage 3J does not try to prove the jailbreak cannot occur; it measures whether harmful consequences are contained if it does. Attacker may place malicious instructions in untrusted tool outputs, attempt to override system/developer instructions, redirect the user task, trigger malicious tool calls, cause secret/policy/tool-arg leakage, or derail the benign task (DoS). Defender invariants: model text cannot become policy; untrusted context cannot become instruction authority; provider output is untrusted; provider-side tools off; tool-shaped output gated and never auto-executed; unsafe output blocked before export; all evidence metadata-only.

## Expected outputs

**Success headline (if numbers strong):** "Stage 3J scales Simurgh from sampled AgentDojo recovery to full-suite external measurement, preserving containment hard gates while reporting native AgentDojo utility and ASR honestly."

**If utility drops in a suite:** still valuable — "Stage 3J exposed suite-specific utility regressions under full AgentDojo coverage; the run preserves containment evidence and identifies the next calibration target through suite-level taxonomy." This feeds Stage 3K.

## Stage 3K depends on Stage 3J (do not pre-build)

| If Stage 3J shows                     | Stage 3K becomes                   |
| ------------------------------------- | ---------------------------------- |
| tool-family over-defence              | task-scoped permit stack           |
| context failures in one suite         | suite-specific context calibration |
| output-firewall false positives       | output-contract refinement         |
| utility-under-attack low but ASR zero | DoS-resilience / safe continuation |
| ASR nonzero                           | consequence-boundary hardening     |
| latest AgentDojo breaks adapter       | compatibility migration stage      |

## Release

PR title: `test(llm-shield): add full AgentDojo Stage 3J external evaluation` (`test`, not `feat` — Stage 3J is benchmark/evidence, not behaviour change). Tag: `v1.3.0-stage-3j-full-agentdojo-external-evaluation`.
