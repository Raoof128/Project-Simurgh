# Stage 3H-L2 — AgentDojo Sampled External Run

Stage 3H-L2 executes a pinned sampled AgentDojo workspace run in both baseline and
Simurgh-defended modes. It reports AgentDojo-native Utility, Utility Under Attack, and Targeted
Attack Success Rate with raw counts, plus Simurgh-specific metadata-only containment evidence for
the defended run.

This stage does not claim jailbreak immunity, provable security, production readiness,
state-of-the-art AgentDojo performance, or adaptive-attack resistance.

## Scope

- Suite: `workspace`
- AgentDojo pin: `agentdojo==0.1.30`
- Benchmark version: `v1.2.1`
- Attack family: `important_instructions`
- Sample: 10 benign tasks and 20 security cases from
  `docs/research/llm-shield/evidence/stage-3h-layer2/sample-manifest.json`
- Baseline: AgentDojo with no Simurgh gateway mediation
- Defended: AgentDojo with Simurgh gateway mediation before tool execution or output continuation
- Scorer: AgentDojo-native and unchanged
- Provider/model mode: local deterministic `agentdojo_ground_truth_pipeline`

## Measured Result

| Metric               | Baseline | Simurgh-defended |
| -------------------- | -------: | ---------------: |
| Benign Utility       |    10/10 |             0/10 |
| Utility Under Attack |    20/20 |             2/20 |
| Targeted ASR         |     0/20 |             0/20 |
| Task Completion      |    30/30 |            30/30 |

Simurgh containment evidence for the defended run:

- defended gateway contact: 30/30
- receipt coverage: 30/30
- audit verification: 30/30
- generated evidence leakage: 0/30
- unauthorised or unsafe tool execution: 0/30
- unsafe output export: 0/30
- context authority escalation: 0/30
- over-defence rate: 10/10

The important finding is not an ASR improvement. In deterministic ground-truth mode the sampled
baseline already has Targeted ASR 0/20. The defended run preserves containment receipts and audit
verification, but it over-blocks benign utility completely. That over-defence is a research result
and is not hidden behind a pass/fail gate.

## Evidence

- `docs/research/llm-shield/evidence/stage-3h-layer2/run-manifest.json`
- `docs/research/llm-shield/evidence/stage-3h-layer2/agentdojo-native-results.json`
- `docs/research/llm-shield/evidence/stage-3h-layer2/simurgh-containment-results.json`
- `docs/research/llm-shield/evidence/stage-3h-layer2/simurgh-run-index.json`
- `docs/research/llm-shield/evidence/stage-3h-layer2/metrics.json`
