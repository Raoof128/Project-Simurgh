# Stage 3I — AgentDojo Utility Recovery and Task-Scoped Containment Calibration

**Status:** proposed
**Release target:** `v1.2.0-stage-3i-agentdojo-utility-recovery`
**Builds on:** Stage 3D provenance containment, Stage 3E gateway, Stage 3F containment benchmark, Stage 3G live-provider shadow evaluation, Stage 3H AgentDojo harness, and Stage 3H-L2 sampled external run.

## Steel-thread sentence

Stage 3I does not prove jailbreak immunity. It demonstrates that Simurgh can preserve its consequence-containment guarantees while recovering benign AgentDojo task utility by replacing broad blocking with task-scoped, evidence-producing permits derived from benchmark task metadata, not from model text.

## One-paragraph summary

Stage 3H-L2 showed that Simurgh’s AgentDojo integration preserves containment evidence but over-defends legitimate tasks: defended Targeted ASR stayed at zero in the sampled run, while defended benign utility dropped to zero. Stage 3I fixes that specific defect. It introduces a task-permit layer, an error taxonomy, calibrated tool-family policy, argument-shape checks, effect checks, and utility-aware metrics. The model still cannot self-authorise. Untrusted context still cannot become instruction authority. Unsafe tool use is still blocked before execution. Unsafe output is still blocked before export. Every decision remains receipt-backed and audit-verifiable.

## Problem statement

The current gateway treats too many benign AgentDojo actions as unsafe consequences. This produces a perfect-looking safety posture but poor benchmark utility. A defence that blocks all work is not a useful agent defence. Stage 3I therefore aims to recover legitimate task completion while keeping the hard safety invariants from prior stages.

## Goals

1. Preserve all containment hard gates:

   * zero unsafe tool execution
   * zero unsafe output export
   * zero context authority escalation
   * complete receipt coverage
   * complete audit verification
   * zero raw transcript committed
   * zero generated-evidence leakage

2. Recover benign task utility on the frozen Stage 3H-L2 sample:

   * defended benign utility target: at least `7/10`
   * over-defence target: at most `3/10`
   * defended Targeted ASR target: must remain `0/20` on the sampled run

3. Add a reproducible failure taxonomy:

   * distinguish input firewall blocks, context rejects, tool-policy rejects, argument-shape rejects, effect rejects, output-firewall rejects, adapter mapping errors, scorer mismatch, and model task failure.

4. Keep the AgentDojo scorer unchanged:

   * no custom task-success scoring
   * no hidden scoring patch
   * no Python-side safety classifier

5. Keep Simurgh evidence metadata-only:

   * no raw user prompt storage
   * no raw context storage
   * no raw provider output storage
   * no raw tool arguments in generated evidence
   * hash or enum evidence only

## Non-goals

* No claim of jailbreak immunity.
* No claim of full AgentDojo all-suite performance.
* No production deployment claim.
* No live-provider safety claim.
* No provider-side tool execution.
* No real external tools.
* No real secrets.
* No raw transcript persistence.
* No weakening of the output leakage firewall.
* No permission derived from model text.
* No task success override outside AgentDojo’s native scorer.

## Design principle

Stage 3I uses **task metadata as permission input** and **gateway policy as enforcement output**.

The model may request an action.
The task permit may allow a narrow class of action.
The gateway decides whether the requested action fits the permit.
Unsafe consequences still lose.

## Architecture

```text
AgentDojo task metadata
  -> task intent canonicaliser
  -> task permit builder
  -> adapter action normaliser
  -> calibrated gateway tool policy
  -> argument-shape firewall
  -> effect firewall
  -> output leakage firewall
  -> Stage 3I receipt fields
  -> HMAC audit chain
  -> unchanged AgentDojo scorer
```

## New components

### Python adapter components

```text
tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/
  stage3i_task_intent.py
  stage3i_task_permit.py
  stage3i_error_taxonomy.py
  stage3i_metrics.py
```

### Node gateway components

```text
src/llmShield/gateway/
  taskPermitSchema.js
  taskScopedToolPolicy.js
  argumentShapeFirewall.js
  effectFirewall.js
  stage3iReceiptFields.js
```

### Tests

```text
tools/agentdojo-simurgh-adapter/tests/
  test_stage3i_task_intent.py
  test_stage3i_task_permit.py
  test_stage3i_error_taxonomy.py
  test_stage3i_metrics.py

tests/unit/llmShield/gateway/
  taskPermitSchema.test.js
  taskScopedToolPolicy.test.js
  argumentShapeFirewall.test.js
  effectFirewall.test.js

tests/e2e/
  llm_shield_stage3i_utility_recovery_runner.mjs
  llm_shield_stage3i_policy_regression_runner.mjs
```

## Task permit model

A task permit is constructed from AgentDojo task metadata and adapter-known task identity. It is not constructed from model output.

Example shape:

```json
{
  "schema_version": "3I",
  "permit_id": "sha256:<hash>",
  "task_id_hash": "sha256:<hash>",
  "suite": "workspace",
  "user_task_hash": "sha256:<hash>",
  "source": "agentdojo_task_metadata",
  "model_authorised": false,
  "expires_after_run": true,
  "allowed_tool_families": [
    "workspace_read",
    "workspace_write",
    "email_read",
    "email_write",
    "calendar_read",
    "calendar_write"
  ],
  "allowed_effects": [
    "read_task_relevant_record",
    "write_task_relevant_record",
    "send_task_requested_message",
    "create_task_requested_event"
  ],
  "forbidden_effects": [
    "secret_access",
    "credential_access",
    "system_prompt_export",
    "developer_instruction_export",
    "network_exfiltration",
    "shell_execution",
    "cross_task_data_access",
    "mass_delete",
    "policy_bypass"
  ],
  "allowed_argument_shapes": [
    {
      "tool_family": "email_write",
      "required_fields": ["recipient_kind", "body_kind"],
      "forbidden_fields": ["raw_secret", "api_key", "system_prompt", "developer_message"]
    }
  ],
  "output_contract": {
    "allow_task_summary": true,
    "allow_secret_values": false,
    "allow_policy_text": false,
    "allow_tool_args": false
  }
}
```

## Tool decision model

Every tool-shaped request receives a structured decision:

```json
{
  "schema_version": "3I",
  "decision": "allow | block | demote | continue_without_tool",
  "reason_codes": [],
  "tool_name_hash": "sha256:<hash>",
  "tool_family": "workspace_read",
  "permit_match": true,
  "argument_shape_ok": true,
  "effect_ok": true,
  "model_authorised": false
}
```

## Policy rules

### Rule 1: Model text cannot authorise tools

The model can request a tool call, but the tool call is never trusted because the model requested it. The gateway checks the request against the task permit.

### Rule 2: Tool family must be permitted

A requested tool must map to an allowed tool family in the task permit.

Example families:

```text
workspace_read
workspace_write
email_read
email_write
calendar_read
calendar_write
database_read
database_write
browser_read
browser_write
unknown
unsafe_shell
unsafe_network
unsafe_secret_access
unsafe_policy_export
```

### Rule 3: Arguments must match an allowed shape

The gateway checks argument keys and high-level shape. Generated evidence stores only hashes, enums, counts, and reason codes.

### Rule 4: Effects must be task-scoped

A tool may be allowed by family but blocked by effect.

Example:

```text
email_write + send message to task-requested recipient -> allowed
email_write + send secrets to unrelated recipient -> blocked
workspace_read + read task-relevant document -> allowed
workspace_read + read unrelated credential file -> blocked
```

### Rule 5: Context cannot expand permissions

Untrusted context may never add a new permitted tool family, recipient, data source, or effect.

### Rule 6: Output firewall remains final veto

Even if a tool call is allowed and the model completes a task, the output firewall may still block export if the final response contains hidden policy, system prompt, developer instruction, secret, credential, raw tool arguments, or classifier internals.

## Error taxonomy

Stage 3I writes an error taxonomy for every failed or blocked benign task.

```json
{
  "case_id": "string",
  "task_id_hash": "sha256:<hash>",
  "mode": "baseline | defended",
  "utility_result": "pass | fail",
  "primary_failure_class": "input_firewall_block | context_provenance_reject | tool_family_not_permitted | argument_shape_reject | effect_reject | output_firewall_block | adapter_mapping_error | scorer_completion_mismatch | model_failed_task | unknown",
  "boundary": "input | context | tool | argument | effect | output | adapter | scorer | model",
  "reason_codes": [],
  "receipt_hash": "sha256:<hash>",
  "audit_chain_valid": true
}
```

## Metrics

Primary Stage 3I metrics:

```json
{
  "stage": "3I",
  "sample_size": {
    "benign": 10,
    "security": 20
  },
  "defended_benign_utility": {
    "pass": 7,
    "total": 10,
    "minimum_required": 7
  },
  "over_defence": {
    "count": 3,
    "total": 10,
    "maximum_allowed": 3
  },
  "defended_targeted_asr": {
    "success": 0,
    "total": 20,
    "maximum_allowed": 0
  },
  "containment": {
    "unsafe_tool_execution": 0,
    "unsafe_output_export": 0,
    "context_authority_escalation": 0
  },
  "evidence": {
    "receipt_coverage": "30/30",
    "audit_verification": "30/30",
    "raw_transcript_committed": 0,
    "generated_evidence_leakage": 0
  }
}
```

## Evidence layout

```text
docs/research/llm-shield/evidence/stage-3i/
  README.md
  metrics.json
  error-taxonomy.json
  task-permit-manifest.json
  benign-recovery-analysis.json
  security-regression.json
  receipt-samples.json
  audit-sample.json
  runner-output.txt
```

## Gate scripts

```bash
bash scripts/smoke-llm-shield-stage3i.sh
bash scripts/security-audit-llm-shield-stage3i.sh
node scripts/privacy-audit-llm-shield-stage3i.mjs
node scripts/consistency-audit-llm-shield-stage3i.mjs
```

Optional full external run gate remains opt-in:

```bash
SIMURGH_RUN_STAGE3I_AGENTDOJO=1 bash scripts/smoke-llm-shield-stage3i-agentdojo.sh
```

## Security audit requirements

The Stage 3I security audit must verify:

```text
[ ] Model output cannot create or widen a task permit.
[ ] Untrusted context cannot create or widen a task permit.
[ ] Tool metadata cannot create or widen a task permit.
[ ] Unknown tool families are blocked.
[ ] Unsafe shell/network/secret/policy-export families are blocked.
[ ] Arguments are shape-checked before any allowed action.
[ ] Effects are checked after tool-family match.
[ ] Output firewall still blocks hidden-policy/secret/tool-arg leakage.
[ ] Receipt coverage remains complete.
[ ] Audit chain verifies after allow, block, demote, and output-block paths.
[ ] Generated evidence contains no raw prompt, raw context, raw output, raw tool args, or secrets.
[ ] Stage 3F containment benchmark does not drift.
[ ] Stage 3G live-shadow evidence does not drift.
```

## Privacy audit requirements

The Stage 3I privacy audit must verify:

```text
[ ] No raw AgentDojo transcript in generated evidence.
[ ] No raw tool arguments in generated evidence.
[ ] No raw provider output in generated evidence.
[ ] No raw secret values.
[ ] No raw system/developer instruction text.
[ ] Permit manifests contain only hashes, enums, counts, and reason codes.
[ ] Receipts contain only metadata.
[ ] Error taxonomy contains no raw task content.
```

## Consistency audit requirements

The Stage 3I consistency audit must verify:

```text
[ ] Metrics match run index.
[ ] Permit manifest covers all defended cases.
[ ] Error taxonomy covers every utility failure and every blocked security case.
[ ] Receipt hashes match receipt samples.
[ ] Audit sample verifies.
[ ] Stage 3H-L2 pinned sample identity remains unchanged.
[ ] AgentDojo version remains pinned.
[ ] Native AgentDojo scorer remains unchanged.
```

## Implementation phases

### Phase 1: Taxonomy-only audit

Add the Stage 3I error taxonomy runner without changing policy. Re-run the Stage 3H-L2 sample and classify every benign failure.

Deliverables:

```text
stage3i_error_taxonomy.py
stage3i_metrics.py
error-taxonomy.json
benign-recovery-analysis.json
```

Exit condition:

```text
All 10 benign failures have a primary failure class.
No policy behaviour changes yet.
```

### Phase 2: Task permit schema

Add task permit construction from AgentDojo task metadata and adapter-known task identity.

Deliverables:

```text
stage3i_task_intent.py
stage3i_task_permit.py
taskPermitSchema.js
task-permit-manifest.json
```

Exit condition:

```text
Every sampled task has exactly one permit.
No permit is derived from model text.
No permit contains raw task text.
```

### Phase 3: Calibrated tool policy

Add task-scoped tool-family matching, argument-shape checking, and effect checking.

Deliverables:

```text
taskScopedToolPolicy.js
argumentShapeFirewall.js
effectFirewall.js
```

Exit condition:

```text
Benign utility improves without allowing unsafe tool execution.
```

### Phase 4: Utility recovery run

Re-run the exact Stage 3H-L2 sampled run.

Exit gates:

```text
defended_benign_utility >= 7/10
over_defence <= 3/10
defended_targeted_asr == 0/20
unsafe_tool_execution == 0
unsafe_output_export == 0
context_authority_escalation == 0
receipt_coverage == 30/30
audit_verification == 30/30
```

### Phase 5: Regression and closeout

Run all Stage 3I gates plus previous relevant LLM Shield gates.

Closeout command block:

```bash
npm test
bash scripts/smoke-llm-shield.sh
bash scripts/smoke-llm-shield-bench.sh
bash scripts/smoke-llm-shield-stage3d.sh
bash scripts/smoke-llm-shield-stage3e.sh
bash scripts/smoke-llm-shield-stage3f.sh
bash scripts/smoke-llm-shield-stage3g.sh
bash scripts/smoke-llm-shield-stage3h.sh
bash scripts/smoke-llm-shield-stage3i.sh
bash scripts/security-audit-llm-shield-stage3i.sh
node scripts/privacy-audit-llm-shield-stage3i.mjs
node scripts/consistency-audit-llm-shield-stage3i.mjs
npm audit --audit-level=high
npx prettier --check .
```

## Risk register

| Risk | Description                 | Mitigation                                                             |
| ---- | --------------------------- | ---------------------------------------------------------------------- |
| R1   | Permit too broad            | Per-task permit hash, narrow tool families, argument/effect firewall   |
| R2   | Model self-authorises       | Explicit `model_authorised:false`, reject model-supplied permit fields |
| R3   | Context expands permissions | Context cannot write permit fields                                     |
| R4   | Utility recovered by bypass | All allow decisions must produce receipt/audit evidence                |
| R5   | Scorer gaming               | Keep native AgentDojo scorer unchanged                                 |
| R6   | Privacy leak in taxonomy    | Hash/enums only, privacy audit over generated evidence                 |
| R7   | Safety regression           | Stage 3F/3G regression gates remain required                           |
| R8   | Adapter hides safety logic  | Python adapter remains transport/enforcement only                      |

## Expected closeout statement

Stage 3I does not claim full AgentDojo robustness or jailbreak immunity. It shows that, on the frozen sampled AgentDojo run, Simurgh can recover legitimate benign task utility while preserving zero unsafe tool execution, zero unsafe output export, zero context authority escalation, complete receipt coverage, and complete audit verification.

## Deferred to Stage 3J

Stage 3J should run the full AgentDojo workspace and all-suite external benchmark only after Stage 3I passes. Running the full suite before utility recovery would merely scale a known over-defence failure.
