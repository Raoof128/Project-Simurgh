# Stage 3J Closeout

**Status:** complete (real all-suite pass executed and committed, 2026-06-20).
**Tag target:** `v1.3.0-stage-3j-full-agentdojo-external-evaluation`.

## Outcome

Stage 3J scaled the Stage 3I-confirmed recovery from the sampled 30-case run to the full pinned AgentDojo benchmark (4 suites, 97 benign + 949 security) under the deterministic ground-truth pipeline. Defended benign utility 97/97, utility under attack 949/949, targeted ASR 0/949, over-defence 0/97, all containment hard gates clean across every suite, receipt/audit coverage 1046/1046.

## What was added

- `simurgh_agentdojo_adapter/stage3j_{manifest,metrics,suite_breakdown,full_runner}.py` (+ tests) — discovered inventory, variable-size metrics, suite breakdown, pure aggregator + opt-in runner with hard alignment assertions.
- `layer2_runner.run_all_suites_collect_rows` — all-suite ground-truth orchestration reusing the Stage 3H/3I pipeline + Stage 3I `_GatewayRecorder`; fresh recorder per suite; pipeline names carry a recognised model token for the `important_instructions` attack.
- `scripts/{privacy,consistency,security}-audit-llm-shield-stage3j.*`, `scripts/smoke-llm-shield-stage3j-{workspace,all-suite}.sh` (real run on opt-in env, audit-only by default).
- `docs/research/llm-shield/evidence/stage-3j/**` real evidence; reviewer docs; `check.sh` Stage 3I + 3J gates.

## What was NOT done (by design)

- No new defence logic; no tool-permit stack.
- No real-LLM provider in the committed result.
- No jailbreak-immunity / adaptive-attack / production claim.

## Honest caveats

- The deterministic ground-truth pipeline yields high utility by construction; the result demonstrates that Simurgh's mediation does not break the known-good path and contains injected goals — not that a live model resists injection.
- Static-benchmark cleanliness ≠ adaptive-attack robustness.

## Verification

- `npm test` 625/625; adapter pytest 56/56.
- Real all-suite run + Stage 3J privacy/consistency/security audits green (real mode).

## Next

Stage 3K deferred — no calibration target surfaced. Candidate triggers: suite-specific regression, an adaptive-attack lane, or an AgentDojo version bump (compatibility probe).
