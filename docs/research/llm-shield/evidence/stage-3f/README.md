# Stage 3F — Agentic Prompt-Injection Containment Benchmark — Evidence

Stage 3F does not prove jailbreak immunity. It benchmarks consequence containment across the LLM Shield gateway.

This directory contains a deterministic 240-case synthetic fixture corpus, metadata-only metrics, a hash-only corpus manifest, detector digests, receipt samples, audit samples, and runner output.

## Layout

| Path                          | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| `fixtures/direct-input/`      | Direct user prompt-injection attempts                 |
| `fixtures/context-poisoning/` | Malicious instructions embedded in untrusted context  |
| `fixtures/tool-injection/`    | Provider-shaped unsafe tool requests                  |
| `fixtures/output-leakage/`    | Provider-shaped unsafe output export attempts         |
| `fixtures/multi-turn/`        | Gradual authority escalation and delayed consequences |
| `fixtures/benign/`            | Ordinary safe controls                                |
| `fixtures/hard-negative/`     | Tricky benign controls                                |
| `metrics.json`                | Hard-gate and measured research metrics               |
| `corpus-manifest.json`        | Hash-only fixture manifest                            |
| `detector-digests.json`       | Frozen detector and gateway digests                   |
| `receipt-samples/`            | Metadata-only sample receipts                         |
| `audit-samples/`              | Metadata-only audit-chain sample                      |
| `runner-output/`              | Metadata-only runner status                           |

Raw synthetic payloads are allowed only under `fixtures/**`. Generated evidence outside fixtures must remain metadata-only.

## Reproduce

```bash
node tests/e2e/llm_shield_stage3f_benchmark_runner.mjs
bash scripts/smoke-llm-shield-stage3f.sh
bash scripts/security-audit-llm-shield-stage3f.sh
node scripts/privacy-audit-llm-shield-stage3f.mjs
```
