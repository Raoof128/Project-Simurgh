# Stage 3H — External AgentDojo Benchmark Harness (core)

Stage 3H does not prove prompt-injection immunity. It makes the LLM Shield externally
benchmark-compatible by inserting Simurgh as an **in-loop mediating defence** that calls the real
Node HTTP gateway, and reporting both AgentDojo-native metrics and Simurgh-specific metadata-only
evidence — with AgentDojo's task definitions and scoring logic left unchanged.

Stage 3H-core ships the harness and a CI-safe canary path. A full Layer-2 AgentDojo external
benchmark run is supported by design but **not claimed** unless executed separately with the
pinned AgentDojo dependency (future tag `v1.1.0-stage-3h-agentdojo-external-run`).

## Design

A Python adapter (`tools/agentdojo-simurgh-adapter/`) plugs into AgentDojo's defence hook and is
**transport + enforcement only**: it forwards each step (user task, untrusted tool output,
proposed action, final output) to the real gateway over HTTP and enforces the returned
`gateway_verdict`. It performs no safety classification of its own. The gateway remains the single
source of truth; the AgentDojo scorer is never modified.

The mandatory CI evidence is produced Node-side: a no-AgentDojo, no-network canary dry-run drives
a vendored 30-case workspace fixture through the real gateway HTTP stack.

## Scope

Workspace suite, 30-case canary (10 benign-class, 20 attack-class) across seven tracks. Each
canary case maps to a deterministic gateway scenario:

| Track             | Cases | Observed verdict | Blocking boundary   |
| ----------------- | ----: | ---------------- | ------------------- |
| benign            |     5 | accepted         | —                   |
| hard_negative     |     5 | accepted         | —                   |
| context_poisoning |     5 | blocked          | context guard       |
| tool_injection    |     5 | blocked          | tool gate           |
| output_leakage    |     5 | blocked          | output firewall     |
| multi_turn        |     5 | accepted         | — (context demoted) |

Containment is demonstrated across three distinct boundaries; benign and hard-negative controls
pass cleanly (over-defence rate 0/10).

## Modes

| Mode               | Purpose                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `dry_run` (CI)     | Node canary through the real gateway. No AgentDojo, no network. Always-on.        |
| `recorded_fixture` | Python adapter against pinned AgentDojo (no model). Runs where AgentDojo present. |
| `live_shadow`      | Optional Layer-2 external run with a live provider. Never in CI.                  |

## Hard gates

- `unauthorised_or_unsafe_tool_execution_rate` = 0 (counts denied/unseen executions, not normal tool use)
- `unsafe_output_export_rate` = 0
- `context_authority_escalation_rate` = 0
- `receipt_coverage_rate` = 100%
- `audit_verification_rate` = 100%
- `generated_evidence_leakage_count` = 0
- `raw_transcript_committed` = 0
- `agentdojo_version_pinned` = true

## Measured, not gated

Benign Utility, Utility Under Attack, Attack Success Rate (AgentDojo-native; `measured_external_run_only`
in CI), over-defence rate, latency overhead, model refusal rate.

## Non-claims

Stage 3H does not claim jailbreak immunity, complete prompt-injection prevention, a SOTA AgentDojo
score, production readiness, live-provider safety by default, provable security, or replacement
for capability-based isolation. Receipts attest process, not ground truth.

## Reproduce

```bash
bash scripts/smoke-llm-shield-stage3h.sh
bash scripts/security-audit-llm-shield-stage3h.sh
node scripts/privacy-audit-llm-shield-stage3h.mjs
node scripts/consistency-audit-llm-shield-stage3h.mjs
# adapter unit tests (where python3 present):
cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/ -q
```

To regenerate evidence after fixture changes:

```bash
SIMURGH_DEMO_MODE=1 SIMURGH_LLM_SHIELD_SECRET="<32+ chars>" PORT=33058 node server.js &
node tests/e2e/llm_shield_stage3h_metrics_runner.mjs http://127.0.0.1:33058
```
