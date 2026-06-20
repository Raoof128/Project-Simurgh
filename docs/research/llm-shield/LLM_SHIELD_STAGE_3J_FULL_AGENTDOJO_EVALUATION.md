# LLM Shield Stage 3J — Full AgentDojo External Evaluation

**Tag target:** `v1.3.0-stage-3j-full-agentdojo-external-evaluation`
**Builds on:** Stage 3H harness, Stage 3H-L2 sampled run, Stage 3I context-provenance calibration.

## What this stage is

Stage 3J scales the Stage 3I-confirmed recovery from the sampled `10 benign + 20 security` run to the **full pinned AgentDojo benchmark** — all four suites — using the **deterministic ground-truth pipeline** (key-free, no real LLM, reproducible). It adds no new defence logic; it reuses the Stage 3H adapter, the Stage 3I provenance fix, and the Stage 3I failure taxonomy.

**Honest headline:** full-suite external containment under a deterministic AgentDojo harness. It is **not** a live-model benchmark, **not** a jailbreak-immunity claim, and **not** an adaptive-attack robustness claim.

## Pipeline (claim boundary)

The committed result uses AgentDojo's ground-truth tool calls to drive the agent, mediated by the Stage 3I-calibrated Simurgh gateway. Metrics therefore measure whether Simurgh's mediation preserves the known-good task path (utility) and contains injected goals (ASR) — not a live model's capability. A real-LLM probe is explicitly deferred.

## Discovered inventory (pinned `agentdojo==0.1.30`, benchmark `v1.2.1`)

| Suite     | user tasks | injection tasks | security combos |
| --------- | ---------: | --------------: | --------------: |
| workspace |         40 |              14 |             560 |
| travel    |         20 |               7 |             140 |
| banking   |         16 |               9 |             144 |
| slack     |         21 |               5 |             105 |
| **Total** |     **97** |          **35** |         **949** |

Benign user tasks total 97 (matches the AgentDojo paper). The executed security cross-product is 949; the paper's reported 629 counts applicable/deduped pairs differently. We record the **discovered** counts; AgentDojo's own `benchmark_suite_with_injections` fixes the executed security set.

## Result (real external pass)

| Metric                        | Defended  | Gate            |
| ----------------------------- | --------- | --------------- |
| benign utility                | 97/97     | soft (reported) |
| utility under attack          | 949/949   | soft (reported) |
| targeted ASR                  | 0/949     | soft (reported) |
| over-defence                  | 0/97      | soft (reported) |
| unsafe tool execution         | 0         | **hard**        |
| unsafe output export          | 0         | **hard**        |
| context authority escalation  | 0         | **hard**        |
| receipt coverage              | 1046/1046 | **hard (100%)** |
| audit verification            | 1046/1046 | **hard (100%)** |
| native AgentDojo scorer       | unchanged | **hard**        |
| Python-side safety classifier | none      | **hard**        |

All four suites pass the containment hard gates individually (see `STAGE_3J_VALIDATION_MATRIX.md`). Injected context is demoted-to-data (not rejected), so the agent completes the task under attack while the attack cannot act as authority.

## Reproduce

```bash
python3 -m venv tools/agentdojo-simurgh-adapter/.venv-stage3j
source tools/agentdojo-simurgh-adapter/.venv-stage3j/bin/activate
pip install --upgrade pip && pip install agentdojo==0.1.30
# start a Simurgh gateway (SIMURGH_DEMO_MODE=1, SIMURGH_LLM_SHIELD_SECRET, PORT), then:
SIMURGH_RUN_STAGE3J_ALL_SUITES=1 \
SIMURGH_STAGE3J_PYTHON=tools/agentdojo-simurgh-adapter/.venv-stage3j/bin/python \
SIMURGH_GATEWAY_BASE_URL="http://127.0.0.1:<PORT>/api/llm-shield/gateway" \
bash scripts/smoke-llm-shield-stage3j-all-suite.sh
```

The default (no env flag) path is CI-safe: it audits the committed evidence only.

## Completion criterion

Stage 3J is complete only after the **all-suite** pinned lane has executed and passed the containment hard gates with real evidence committed. Workspace-only is an intermediate checkpoint.

## Next

Stage 3K is not pre-built. Because the full run is clean (utility preserved, ASR contained, gates clean), there is no immediate calibration target; a future Stage 3K would be triggered only by a suite-specific regression, an adaptive-attack lane, or an AgentDojo version bump (compatibility probe).
