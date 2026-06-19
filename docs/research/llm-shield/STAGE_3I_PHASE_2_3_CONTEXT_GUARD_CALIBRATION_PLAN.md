# Stage 3I Phase 2–3 — Context-Guard / Adapter Calibration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, AFTER review. Steps use checkbox (`- [ ]`) syntax.
>
> **Status: PROPOSED — docs only. Do NOT implement until reviewed.** This plan is the evidence-driven continuation chosen by the Phase 1 decision gate (`decision_gate == "rescope_context_guard_adapter"`). It is NOT the tool-permit stack; that remains deferred.

**Goal:** Recover benign AgentDojo task utility by fixing how the adapter integrates with the gateway's context-provenance guard, while preserving every Stage 3D/3E/3F containment invariant — above all, that untrusted/injected context can never become instruction authority.

**Branch:** continue on `stage-3i-agentdojo-utility-recovery` (taxonomy → root cause → calibration → utility recovery, one chain).

---

## Root cause (confirmed against code, not inferred)

The Phase 1 taxonomy attributed the 10/10 benign over-defence to `context_provenance_reject`. Tracing the gateway confirms the mechanism is an **adapter integration defect**, not an over-strict guard:

1. **Invalid trust level.** `src/llmShield/contextProvenanceGuard.js:13` accepts only `TRUST_LEVELS = {"trusted", "untrusted", "synthetic"}`. The Layer-2 adapter (`tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/layer2_runner.py`, `_GatewayRecorder.record`) sends `trust_level: "metadata_only"`. That value is not in the set, so the guard returns `verdict: "rejected"` / `reasonCodes: ["context_schema_invalid"]` for **every** context. In `gatewayRouter.js`, `contextResult.verdict === "rejected"` forces `gateway_verdict = "blocked"`, so all 10 benign (and all 20 security) defended cases are blocked at the context boundary. This single mismatch produces benign utility `0/10` and over-defence `10/10`.

2. **Boundary mislabeling.** The `/run` response (`gatewayRouter.js`) exposes `gateway_verdict`, `tool_gate_verdict`, `output_firewall_verdict`, and `receipt`, but **no top-level input verdict**. The adapter's `_blocking_boundary` therefore labels any block that is not tool/output as `"context_guard"`, even when the real cause is the input firewall. This is an `adapter_mapping_error` recorded as `context_provenance_reject`.

**Consequence for scope.** The fix is to make the adapter send _honest, valid_ provenance and to label boundaries _accurately_ — not to relax the guard. The guard's security behaviour is correct and unchanged. No tool-permit machinery is needed for utility recovery.

---

## Global Constraints

- License header on every new/edited source file (`// SPDX-License-Identifier: AGPL-3.0-or-later` / `# SPDX-License-Identifier: AGPL-3.0-or-later`).
- **Containment invariants are immutable.** Untrusted/injected context must remain demoted-to-data or rejected — never accepted as authority. Context that forges authority (`context_role_escalation`, `context_untrusted_instruction`) must still be rejected. No change to `contextProvenanceGuard.js` reject conditions.
- No third-party Python deps; AgentDojo stays the opt-in `agentdojo==0.1.30` extra.
- Metadata-only evidence; hashes/enums only; all artifacts pass `evidence_writer._assert_metadata_only` and the Stage 3I privacy audit.
- Native AgentDojo scorer unchanged. Stage 3H-L2 sampled identity (10 benign + 20 security) frozen.
- Re-run order after calibration: `npm test` → `scripts/smoke-llm-shield-stage3h-layer2.sh` (real external pass) → `scripts/smoke-llm-shield-stage3i-phase1.sh`.

---

## Maps to the six review requirements

1. _Untrusted context cannot become instruction authority_ → Task 3 regression tests; guard reject conditions untouched.
2. _Task-scoped context classification for benign task context_ → Task 1: benign Simurgh benchmark seed declared `synthetic` (accepted); genuinely untrusted/injected content declared `untrusted` (demoted-to-data).
3. _Separate malicious authority escalation from benign benchmark context_ → Tasks 1 + 3: distinct provenance per case kind, with tests that a forged-authority context is still rejected.
4. _Evidence stays metadata-only_ → Task 2 boundary labels are enums; no raw content added; privacy audit re-run in Task 4.
5. _Regression tests proving injected context still cannot widen authority_ → Task 3 (adapter-level) + a gateway unit test asserting reject.
6. _Re-run Stage 3H-L2 and Stage 3I Phase 1 audits after calibration_ → Task 4.

---

## File Structure

- Modify: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/layer2_runner.py` — honest per-kind provenance + accurate boundary mapping.
- Modify: `src/llmShield/gateway/gatewayRouter.js` — add a metadata-only `input_verdict` enum to the `/run` response so the adapter can label the input-firewall boundary precisely (no behaviour change to verdicts).
- Create: `tools/agentdojo-simurgh-adapter/tests/test_stage3i_context_calibration.py` — provenance + boundary-mapping + injected-authority regression tests.
- Create: `tests/unit/llmShield/gateway/stage3iContextCalibration.test.js` — gateway-level: benign `synthetic` accepted, injected forged-authority rejected, response exposes `input_verdict`.
- (No new evidence files; Task 4 regenerates the Stage 3I fixture/real evidence.)

---

### Task 1: Honest per-kind context provenance in the adapter

Replace the invalid `trust_level: "metadata_only"` with valid provenance chosen by case kind: benign Simurgh-generated benchmark seed → `synthetic` (accepted path); security/injection-carrying context → `untrusted` (demoted-to-data, never authority).

**Files:**

- Modify: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/layer2_runner.py` (`_GatewayRecorder.record`)
- Test: `tools/agentdojo-simurgh-adapter/tests/test_stage3i_context_calibration.py`

**Interfaces:**

- Produces: `_GatewayRecorder.record` sends `trust_level ∈ {"synthetic","untrusted"}`, `source_type` describing the provenance, and only the existing `ALLOWED_FIELDS` keys (`context_id, source_type, trust_level, purpose, content`).

- [ ] **Step 1: Write the failing test** asserting the recorder builds a `synthetic` context for a benign task and an `untrusted` context for an injection task, with no invalid `metadata_only` value and only allowed fields. (Use a fake transport capturing the posted payload — mirror `tests/test_simurgh_client.py` patterns.)
- [ ] **Step 2: Run it; expect FAIL** (recorder still emits `metadata_only`).
- [ ] **Step 3: Implement** — in `_GatewayRecorder.record`, derive `trust_level` from `task_kind` (`synthetic` for benign, `untrusted` for security/injection), set `source_type` accordingly (`agentdojo_benign_seed` / `agentdojo_untrusted_injection`), keep `content` a hash only. Do not add fields outside `ALLOWED_FIELDS`.
- [ ] **Step 4: Run it; expect PASS.**
- [ ] **Step 5: Commit** `feat(llm-shield): send valid per-kind context provenance from stage 3I adapter`.

### Task 2: Accurate boundary labeling (+ metadata-only `input_verdict`)

Make `_blocking_boundary` distinguish input-firewall blocks from context-guard rejects, using a new metadata-only `input_verdict` enum on the `/run` response.

**Files:**

- Modify: `src/llmShield/gateway/gatewayRouter.js` (add `input_verdict: inputVerdict` to the `res.json` payload — an enum string already computed; no verdict-logic change)
- Modify: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/layer2_runner.py` (`_blocking_boundary`)
- Test: `tests/unit/llmShield/gateway/stage3iContextCalibration.test.js` + adapter test

- [ ] **Step 1: Write failing gateway test** asserting `/run` response includes `input_verdict` and that a blocked-by-input request reports `input_verdict: "blocked"`.
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement** the one-line response field; update `_blocking_boundary` to return `"input_firewall"` when `input_verdict == "blocked"`, else `"context_guard"` when `gateway_verdict == "blocked"` and context rejected, preserving tool/output branches.
- [ ] **Step 4: Run; expect PASS.**
- [ ] **Step 5: Commit** `feat(llm-shield): expose input_verdict and label stage 3I boundaries precisely`.

### Task 3: Containment-invariant regression tests

Prove the calibration does not weaken security: an injected context that forges authority is still rejected, and an `untrusted` benign-reference context is demoted-to-data (never authority), at both gateway and adapter level.

**Files:**

- `tests/unit/llmShield/gateway/stage3iContextCalibration.test.js`
- `tools/agentdojo-simurgh-adapter/tests/test_stage3i_context_calibration.py`

- [ ] **Step 1:** Gateway test — a context with role-escalation / untrusted-instruction markers → `verdict: "rejected"` (reason `context_role_escalation` or `context_untrusted_instruction`), `gateway_verdict: "blocked"`. A benign `synthetic` seed → accepted, provider called. A benign `untrusted` reference → demoted, provider still called.
- [ ] **Step 2: Run; expect FAIL** until assertions match (these mostly encode existing behaviour — they lock it in).
- [ ] **Step 3:** Adapter test — recorder for a security case never yields an accepted-authority context.
- [ ] **Step 4: Run; expect PASS.**
- [ ] **Step 5: Commit** `test(llm-shield): lock stage 3I context-authority invariants`.

### Task 4: Re-run external pass + Phase 1 audits; refresh evidence (Phase 3 closeout)

- [ ] **Step 1:** `npm test` — expect green (gateway change is additive).
- [ ] **Step 2:** Maintainer-operated real external pass (needs `agentdojo==0.1.30`): `bash scripts/smoke-llm-shield-stage3h-layer2.sh` — regenerates `stage-3h-layer2` metrics and overwrites the `stage-3i` fixture with real taxonomy.
- [ ] **Step 3:** Inspect `docs/research/llm-shield/evidence/stage-3h-layer2/metrics.json` — expect `defended.benign_utility` to rise from `0/10` toward the spec target (`≥ 7/10`), `over_defence_rate` to fall (`≤ 3/10`), `defended.targeted_asr` to stay `0/20`, and all containment hard gates to remain clean.
- [ ] **Step 4:** `bash scripts/smoke-llm-shield-stage3i-phase1.sh` — expect privacy + consistency OK; `benign-recovery-analysis.json` over-defence count drops.
- [ ] **Step 5:** Commit refreshed evidence `test(llm-shield): refresh stage 3I evidence after context-guard calibration`.

**Phase 3 exit gates (from the spec):** `defended_benign_utility ≥ 7/10`, `over_defence ≤ 3/10`, `defended_targeted_asr == 0/20`, `unsafe_tool_execution == 0`, `unsafe_output_export == 0`, `context_authority_escalation == 0`, `receipt_coverage == 30/30`, `audit_verification == 30/30`.

---

## Risks

| Risk                                             | Mitigation                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marking benign context `synthetic` over-accepts  | `synthetic` is only for Simurgh-generated benchmark seed (a hash), never for model/external text; injection content stays `untrusted`/rejected (Task 3) |
| Utility recovers by silently weakening the guard | Guard reject conditions untouched; Task 3 locks invariants; containment hard gates re-checked in Task 4                                                 |
| `input_verdict` field leaks content              | It is an enum string (`safe`/`warning`/`blocked`), not content; privacy audit re-run                                                                    |
| Over-defence still high after fix                | Then a second cause exists; re-run the Phase 1 taxonomy to re-locate before any further change (taxonomy-first discipline holds)                        |

## Open question for review

Should benign AgentDojo task context be declared `synthetic` (accepted) or `untrusted` (demoted-to-data)? Both let the provider be called and recover utility. `synthetic` is honest (it IS Simurgh-generated benchmark metadata); `untrusted` is more conservative (treats even our own seed as data). Recommendation: `synthetic` for the benign benchmark seed, `untrusted` for anything carrying injection content — but flag for your call before Task 1.
