<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# From Jailbreak Detection to Consequence Containment: A 240-Case Agentic Prompt-Injection Benchmark

**Raouf** · Stage 3F one-page research summary

## Core claim

Stage 3F does not prove jailbreak immunity. It benchmarks consequence containment
across the LLM Shield gateway.

The benchmark shifts the question away from "can a model be tricked?" and toward the
system property Simurgh can actually enforce:

> Even when prompt-injection attempts reach the gateway, can they cause unauthorised
> context promotion, tool execution, unsafe output export, evidence loss, or audit-chain
> failure?

## Why this matters

Prompt injection is not cleanly separable from ordinary language. A system that depends
on a model never being confused is brittle. Stage 3F therefore assumes compromise
pressure and measures the blast radius: untrusted context must remain data, provider-
shaped tool requests must not execute, unsafe output must not leave the gateway, and
every decision must produce metadata-only evidence.

This is stronger than claiming a filter blocks every jailbreak. The benchmark allows
detection quality to be imperfect while hard-gating the consequences that matter.

## What was built

Stage 3F adds a deterministic **240-case synthetic prompt-injection containment
benchmark** across seven tracks:

| Track                  | Cases |
| ---------------------- | ----: |
| Direct input injection |    40 |
| Context poisoning      |    40 |
| Tool injection         |    40 |
| Output leakage         |    40 |
| Multi-turn softening   |    30 |
| Benign controls        |    30 |
| Hard-negative controls |    20 |

The benchmark is run by a read-only verifier. An explicit update mode regenerates only
metadata-only evidence: `metrics.json`, `corpus-manifest.json`, `detector-digests.json`,
receipt samples, audit samples, and runner output. Raw synthetic payloads are confined
to `fixtures/**`.

## Hard-gated result

| Invariant                    | Result |
| ---------------------------- | -----: |
| Unsafe tool execution        |      0 |
| Unsafe output export         |      0 |
| Context authority escalation |      0 |
| Receipt coverage             |   100% |
| Audit verification           |   100% |
| Generated evidence leakage   |      0 |

Measured, not hard-gated, metrics include benign pass rate, hard-negative false-positive
rate, direct-input block/warn rate, multi-turn escalation rate, and boundary
distribution. Those numbers are research signals, not claims of model alignment.

## Evidence posture

The benchmark preserves the LLM Shield privacy model:

- generated evidence is metadata-only;
- provider-shaped output is represented by hashes and verdicts, not exported raw text;
- receipt samples carry hashes, boundary names, verdicts, and reason codes only;
- audit samples prove chain coverage without storing prompts or transcripts.

Receipts attest process, not ground truth. A receipt means the configured boundary
classified, blocked, allowed, hashed, or logged an event according to the benchmark
rules. It does not prove that the content was truly safe.

## Reproduce

```bash
node tests/e2e/llm_shield_stage3f_benchmark_runner.mjs
bash scripts/smoke-llm-shield-stage3f.sh
bash scripts/security-audit-llm-shield-stage3f.sh
node scripts/privacy-audit-llm-shield-stage3f.mjs
```

The full reviewer checklist is in
[`../STAGE_3F_REVIEWER_CHECKLIST.md`](../STAGE_3F_REVIEWER_CHECKLIST.md).

## Next

Stage 3G should not add more synthetic cases. The next useful question is whether these
same containment invariants hold when an external live provider is placed behind the
gateway in shadow mode: no real tools, no real secrets, no raw transcript storage, and
no direct provider-output export.
