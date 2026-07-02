# EBA+ — Attested Distillation-Control Plane (Stage 4K expansion path)

> **Status: DRAFT companion architecture — NOT for external use yet.**
> The §18 source ledger (incident figures, URLs, named companies, policy documents) is **NOT yet independently verified**. Every load-bearing external fact below — the 16M+/24,000 and 28.8M/~25,000 figures, the 2026-04-22→2026-06-05 window, the CNBC URL, NSTM-4, the GTIG and IAPS pieces — must clear the §18 verification checklist before this document informs anything external. Company attributions are allegations sourced to their publishers; **a match is not an accusation** (3T rule).
> Layering rule: **this document specifies the v1/v2 expansion path only.** Stage 4K v0 is specified solely by `docs/superpowers/specs/2026-07-02-stage-4k-eba-design.md`; where the two disagree, the v0 spec wins for v0.

**Executive summary.** EBA+ is the Anthropic-facing expansion of Stage 4K: an **attested distillation-control plane** that turns internal distillation detection and enforcement into signed, privacy-preserving, third-party-replayable evidence. It does not replace Anthropic's classifiers, account graphing, or threat-intelligence work. It makes their enforcement claims reviewable: who was bound, what supervision signal was exposed, what scope allowed it, what budget was consumed, what gate fired, and what countermeasure happened.

**Defensible claim.** EBA+ helps frontier labs defend against adversarial distillation by proving that a declared extraction-exposure policy was applied to a bound consumer or declared cluster under a signed evidence chain. It does **not** prove downstream capability transfer, solve Sybil attacks, or prevent all model extraction.

## 1. Why this design exists

Anthropic's 2026 public reports validate the core threat. DeepSeek, Moonshot, and MiniMax allegedly generated **16M+ Claude exchanges** through about **24,000 fraudulent accounts**, targeting reasoning, reward-like grading, chain-of-thought style data, tool use, coding, data analysis, computer-use agents, and reasoning-trace reconstruction. Anthropic's response already includes classifiers, behavioral fingerprinting, coordinated-account detection, access controls, intelligence sharing, and countermeasures. _(Figures unverified — §18 gate.)_

The June 2026 Alibaba/Qwen accusation shows the attack scaled again: CNBC reported **28.8M exchanges** using roughly **25,000 fraudulent accounts** between **2026-04-22** and **2026-06-05**. _(Figures and URL unverified — §18 gate.)_

OpenAI creates the opposite pole. Its Model Distillation API productizes legitimate distillation through **Stored Completions → Evals → Fine-tuning**. A credible defense cannot treat every distillation-like workflow as abuse. It must separate **authorized distillation**, **ordinary use**, **suspicious extraction**, and **prohibited extraction**.

Policy pressure points the same direction. NSTM-4 and related 2026 policy analysis frame adversarial distillation as a national-security and supply-chain risk; CSA's summary emphasizes vendor attestation, model provenance, API governance, account controls, detection/monitoring, prevention/response, and information-sharing. _(Unverified — §18 gate.)_

## 2. Core move

Existing defenses mostly answer: did the provider detect a suspicious pattern; did the provider throttle, ban, downgrade, or refuse; did the provider share indicators?

EBA+ answers a different question:

> Can a third party replay the evidence and verify that the declared distillation-control policy actually ran?

That is Simurgh's wedge. Stage 4D made mediated actions receipt-bearing. Stage 4H made evidence packs canonical and signed. Stage 4J made authorization proof-carrying. Stage 4K/EBA makes extraction-budget enforcement proof-carrying.

## 3. Design name

**EBA+ — Attested Distillation-Control Plane.**

EBA+ is the v1/v2 expansion path for Stage 4K. The current 4K v0 remains small: metadata-only exposure ledger, Q8 budget gate, raw code `30 extraction_budget_exceeded`, stage4k-owned signed attestation, and two anti-theatre falsifiers. EBA+ defines the complete Anthropic-facing architecture around that core.

## 4. Requirements from 2026 evidence

| 2026 observation (pending §18 verification)                 | Design requirement                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Attackers used ~24k–25k fraudulent accounts                 | Budget by bound consumer **and** declared cluster, not just account ID          |
| Attackers targeted reasoning traces / chain-of-thought data | Track `reasoning_trace` as high-value supervision signal                        |
| Attackers used reward-like grading tasks                    | Track `reward_like_judgment` as highest-value signal                            |
| Attackers targeted agentic coding, tool use, orchestration  | Track `tool_use_trajectory` and coding/tool surfaces                            |
| OpenAI productizes legitimate distillation                  | Add authorized-distillation scope, not blanket blocking                         |
| ZDR/MAM and enterprise privacy constrain raw logging        | Use metadata-only digests, counters, commitments, and classifier/policy digests |
| NSTM-4 creates attestation pressure                         | Emit auditor-ready signed evidence, not private dashboards                      |
| Provider logs can be incomplete or self-serving             | Add replay, digest-binding, and anti-theatre falsifiers                         |

## 5. Threat model

### Adversaries

1. **Extractor.** Uses many accounts, proxies, resellers, payment instruments, or compromised access paths to harvest model outputs.
2. **Coordinated lab.** Routes requests through infrastructure that hides common ownership.
3. **Dishonest producer.** Claims enforcement happened but omits, edits, or fabricates ledger evidence.
4. **Overclaiming defender.** Uses vague "we stopped distillation" language without proving what was enforced.

### Trust boundaries

- The provider may run internal classifiers and clustering, but the reviewer should not need to trust a dashboard.
- The reviewer must run an offline verifier against a signed pack.
- Raw prompts and outputs may be unavailable due to retention controls, customer privacy, or ZDR/MAM settings.
- **Cluster binding is a declared, trusted input** (the provider's own clustering output, recorded by digest); it makes the binding policy reviewable — it cannot guarantee Sybil closure.

## 6. System overview (v1 target architecture)

EBA+ has five ledgers and one gate family.

| Layer           | Artifact                                            | Purpose                                                                                                                 |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Exposure Ledger | `extraction-ledger.json`                            | Counts supervision signal by bound consumer/window (v0)                                                                 |
| Scope Ledger    | `distillation-scope.json`                           | Records what distillation, storage, export, model, and signal classes were authorized (v1)                              |
| Binding Ledger  | `consumer-binding.json`                             | Records account/org/payment/network/device cluster digests and binding policy (v1)                                      |
| Control Ledger  | `countermeasure-receipt.json`                       | Records throttle, refusal, downgrade, verification, storage disablement, or trace redaction (v1, recorded-not-verified) |
| Evidence Ledger | `extraction-attestation.json` + `eba-manifest.json` | Binds all relevant digests acyclically into the stage4k-owned signed manifest (v0)                                      |
| Q8 gate family  | `extractionBudgetGate.mjs` (+ v1 scope check)       | Raw `30 extraction_budget_exceeded` (v0); raw `39 extraction_scope_violation` reserved for v1                           |

## 7. Data model

### 7.1 Exposure event (v1 shape; v0 events carry no timestamp field)

```json
{
  "event_id_digest": "sha256:...",
  "timestamp_bucket": "2026-07-02T08:00Z",
  "consumer_id_digest": "sha256:...",
  "cluster_id_digest": "sha256:...",
  "model_family_digest": "sha256:...",
  "signal_class": "reasoning_trace",
  "surface": "api_response",
  "budget_delta": 3,
  "policy_digest": "sha256:...",
  "classifier_digest": "sha256:...",
  "content_commitment": "sha256:optional-salted-commitment"
}
```

Rules:

- No raw prompt, no raw output, no plaintext user or organization identity, no tool arguments or transcripts. Only counts, digests, commitments, and deterministic policy references.
- **`timestamp_bucket` is declared event data, never a clock read** — the byte-stable golden forbids wall-clock reads anywhere in build or verify. It is absent from v0 (window label only, per the v0 spec).

### 7.2 Signal classes

| Signal class           | Default weight | Why it matters                           |
| ---------------------- | -------------: | ---------------------------------------- |
| `final_answer`         |              1 | Ordinary supervised fine-tuning signal   |
| `tool_use_trajectory`  |              2 | Agent imitation and orchestration signal |
| `reasoning_trace`      |              3 | High-value reasoning distillation signal |
| `reward_like_judgment` |              4 | RL/preference-model-like signal          |

This preserves the 4K v0 frozen weights. Surface expansion (`stored_completion`, `fine_tune_file`, `batch_export`, `external_egress`) is a **versioned E-v2** (3T→3U additive pattern), never an edit to v1's frozen list. Boundary note: PCTA owns egress _authority_; EBA owns supervision-_signal exposure_ — the two gates must never claim each other's surface. v2 can replace heuristic weights with QIF-grounded leakage or query-complexity-grounded budgets.

### 7.3 Authorized distillation scope (v1)

```json
{
  "scope_id_digest": "sha256:...",
  "mode": "none | authorized | suspicious | prohibited",
  "authorized_by": "contract | customer_admin | provider_policy | regulator",
  "source_model_family_digest": "sha256:...",
  "target_model_family_digest": "sha256:optional",
  "allowed_signal_classes": ["final_answer"],
  "forbidden_signal_classes": ["reasoning_trace", "reward_like_judgment"],
  "storage_allowed": true,
  "fine_tune_export_allowed": false,
  "eval_export_allowed": true,
  "window": "2026-07",
  "budget": 1000,
  "scope_digest": "sha256:..."
}
```

This is the design's legal and product bridge. OpenAI-style distillation can pass inside declared scope. Illicit extraction fails when it exceeds scope, budget, signal class, or export permissions. **A scope violation is its own failure class — raw `39 extraction_scope_violation` (reserved now, implemented in v1) — never folded into `30`,** which means exactly one thing: budget exceeded.

### 7.4 Consumer binding (v1)

```json
{
  "binding_policy_digest": "sha256:...",
  "account_digest": "sha256:...",
  "org_digest": "sha256:...",
  "payment_cluster_digest": "sha256:...",
  "network_cluster_digest": "sha256:...",
  "device_cluster_digest": "sha256:...",
  "reseller_path_digest": "sha256:optional",
  "confidence_bucket": "low | medium | high"
}
```

Honest boundary: this does not solve Sybils, and the cluster digests are the **provider's declared clustering output, trusted by construction** (the 4C modelled-labels lesson). What EBA+ adds is that the binding _policy_ becomes reviewable — the reviewer sees whether enforcement happened at account, org, payment, network, device, or reseller level.

### 7.5 Countermeasure receipt (v1, recorded-not-verified)

```json
{
  "gate": "Q8_extraction_budget",
  "raw_code": 30,
  "decision": "fail",
  "countermeasure": {
    "type": "throttle | downgrade | refuse | require_verification | disable_store | disable_finetune_export | redact_reasoning",
    "reason": "extraction_budget_exceeded",
    "policy_digest": "sha256:...",
    "classifier_digest": "sha256:...",
    "scope_digest": "sha256:..."
  }
}
```

This turns enforcement from a private operational event into a reviewable control-plane fact. It is a **producer self-report, recorded and digest-bound but not independently verified** (the 3O self-report/oracle distinction); independent corroboration of countermeasure execution is future work.

## 8. Q8 gate semantics

**v0 (shipping now, normative in the v0 spec):** Q8 fails iff at least one bound **consumer** exceeds its declared budget. No scope, no clusters.

**v1 (this document):** budgets attach to bound subjects (consumer **or declared cluster**) under the active scope.

```
For each bound_subject in ledger:
  exposure = Σ class_counts[class] * weight[class]
  budget = policy.budget_for(bound_subject, window, scope)
  if exposure > budget:
    emit raw 30 extraction_budget_exceeded
```

Boundary rules (v0 and v1):

- `weighted_total == B` passes; `weighted_total > B` fails.
- Missing ledger fails closed. Missing policy fails closed.
- **Unknown signal class fails closed** (adopted into the v0 spec §0.2).
- Unknown raw code maps to run-level `3`. Q0–Q7 remain unchanged.

## 9. Evidence pack (v1 target)

```
docs/research/llm-shield/evidence/stage-4k/
  extraction-ledger.json
  budget-policy.json
  distillation-scope.json        (v1)
  consumer-binding.json          (v1)
  countermeasure-receipt.json    (v1)
  extraction-attestation.json
  extraction-summary.json
  eba-manifest.json
  README.md
```

Digest-binding rule: the verifier **recomputes** `ledger_digest`, `scope_digest`, `binding_policy_digest`, `countermeasure_digest`, and `extraction_attestation_digest` from local output; the **stage4k-owned manifest** binds them acyclically and is signed with the **fresh stage-4K Ed25519 key** under domain separator `SIMURGH_STAGE4K_EBA_MANIFEST_V1\0` (4J pattern — 4H's crypto functions are reused; its manifest builder and key are not).

## 10. One-command replay

```bash
scripts/reproduce-llm-shield-stage4k.sh
```

The command must: (1) scrub + pin environment (Node 26 assert); (2) regenerate fixtures + digests into temp dirs only (`STAGE4K_FIXTURE_OUT`); (3) verify the stage4k Ed25519 manifest; (4) recompute `E(consumer, window)` for each subject and byte-diff against the committed ledger; (5) run Q8; (6) replay Q0–Q7; (7) rebuild twice and byte-diff ledgers, attestations, summaries; (8) run anti-theatre falsifiers; (9) emit `extraction-summary.json`; (10) exit only through `stage4CodeForRawCode`.

## 11. Falsifier matrix

| Falsifier                   | Action                                                             | Expected                                                                                              | Tier |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---- |
| F1 clean run                | Run one-command reproduce                                          | exit `0`                                                                                              | v0   |
| F2 over-budget              | Inject over-budget consumer                                        | raw `30`, run-level `1`                                                                               | v0   |
| F3 ledger deletion          | Delete `extraction-ledger.json` (temp copy)                        | fail-closed, never `0`                                                                                | v0   |
| F4 scope mismatch           | Mark `reasoning_trace` forbidden, include trace exposure           | raw `39 extraction_scope_violation`, run-level `1` — **never `30`**                                   | v1   |
| F5 store/export violation   | Attempt stored-completion / fine-tune export outside scope         | rejecting receipt                                                                                     | v1   |
| F6 cluster accumulation     | Split events across accounts sharing a **declared** cluster digest | budget **accumulates across the declared cluster** (clustering itself is trusted input, not verified) | v1   |
| F7 classifier downgrade     | Swap classifier digest                                             | digest mismatch                                                                                       | v1   |
| F8 manifest tamper          | Edit attestation after signing                                     | signature or digest failure                                                                           | v0   |
| F9 ZDR mode                 | Attempt `store=true` under ZDR-compatible policy                   | store disabled in receipt                                                                             | v1   |
| F10 authorized distillation | Stay under budget and within scope                                 | pass                                                                                                  | v1   |

## 12. How this helps Anthropic

Anthropic already has the hard internal pieces: classifiers, behavioral fingerprinting, account enforcement, threat intelligence, industry sharing. EBA+ adds the missing public-accountability layer.

| Anthropic need                                     | EBA+ answer                               |
| -------------------------------------------------- | ----------------------------------------- |
| Defend against ~24k–25k account campaigns          | declared-cluster-bound exposure budget    |
| Show why reasoning-trace harvesting is different   | high-weight `reasoning_trace` class       |
| Show why reward-style grading is different         | high-weight `reward_like_judgment` class  |
| Preserve privacy and enterprise retention promises | metadata-only digests and commitments     |
| Distinguish legal distillation from abuse          | authorized scope ledger                   |
| Explain enforcement to regulators                  | countermeasure receipt                    |
| Share evidence without raw customer content        | redacted signed evidence pack             |
| Avoid "trust our logs" criticism                   | offline replay and falsifiers             |
| Coordinate with NIST/CSA-style controls            | control mapping and attestation artifacts |

## 13. Anthropic adoption path

**Phase A — internal shadow mode:** run EBA+ alongside existing distillation classifiers; emit metadata-only exposure ledgers; no production impact; compare Q8 breaches with existing abuse-investigation cases. Output: calibration report, false-positive review, class-weight sanity check.

**Phase B — enforcement evidence mode:** keep internal classifiers as the detection engine; add scope + countermeasure receipts; route enforcement decisions through the signed evidence pack; use for internal audits and legal review. Output: reproducible enforcement bundle for selected incidents.

**Phase C — external audit mode:** share redacted packs with trusted partners, cloud providers, or regulators — digests, counters, scope, policy, binding class, countermeasure evidence only. Output: third-party-verifiable enforcement proof.

**Phase D — standardization mode:** map EBA+ artifacts to NIST/CSA control language; publish an implementation profile without private classifier logic; support cross-lab indicator exchange via digests and policy references. Output: candidate AI Distillation Defense Framework control.

## 14. Implementation plan for Simurgh

### v0 — current Stage 4K (normative spec: `2026-07-02-stage-4k-eba-design.md`)

`constants.mjs` · `extractionLedger.mjs` · `extractionBudgetGate.mjs` · `ebaManifest.mjs` · `build-stage4k-fixtures.mjs` · `verify-stage4k-eba.mjs` · `emit-stage4k-evidence.mjs` · `scripts/reproduce-llm-shield-stage4k.sh` · raw code `30` · metadata-only fixture pack · over-budget + ledger-deletion falsifiers · closeout + reviewer checklist.

### v1 — Anthropic-ready EBA+

`distillationScope.mjs` (raw `39`) · `consumerBinding.mjs` · `countermeasureReceipt.mjs` · declared-cluster budget accumulation · authorized-distillation positive fixture · forbidden-signal negative fixture · stored-completion/export surface fixtures (E-v2, versioned) · ZDR-compatible mode fixture · source-mapped control table.

### v2 — beyond-industry upgrades (only after v0/v1 pass)

ZK proof-of-exposure · verifiable DP-style accounting · query-complexity-grounded budgets · QIF-grounded exposure metric · VKD retrieval-completeness for omitted ledger entries · cross-lab redacted indicator exchange.

## 15. Reviewer checklist (v1 target; v0 checklist lives in the v0 spec)

| Test                    | Command/action                                                   | Expected                                       | Tier |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------- | ---- |
| T1 clean                | `scripts/reproduce-llm-shield-stage4k.sh`                        | exit `0`                                       | v0   |
| T2 over-budget          | run over-budget fixture                                          | raw `30`, run-level `1`                        | v0   |
| T3 deleted ledger       | remove ledger in temp pack                                       | fail-closed                                    | v0   |
| T4 forbidden signal     | expose forbidden `reasoning_trace` under final-answer-only scope | raw `39`, run-level `1`                        | v1   |
| T5 cluster accumulation | split events across accounts in one **declared** cluster         | budget accumulates across the declared cluster | v1   |
| T6 metadata-only        | grep pack for prompts/outputs/plaintext identities               | no raw content                                 | v0   |
| T7 signature tamper     | edit attestation after signing                                   | digest/signature failure                       | v0   |
| T8 authorized scope     | run under-budget authorized distillation fixture                 | pass                                           | v1   |

## 16. Non-claims (state verbatim, every time)

- It measures **supervision signal exposed**, not capability transferred.
- It does not prove an attacker trained a model.
- It does not prevent all distillation.
- It does not solve Sybil or multi-account collusion; cluster binding is a declared, trusted input.
- It does not replace Anthropic's classifiers or account-network analysis.
- It proves enforcement under a declared policy, not that the budget is objectively safe.
- Countermeasure receipts are producer self-reports: recorded and digest-bound, not independently verified.
- It depends on reviewer-side replay of the signed pack.
- It is metadata-only by design.

## 17. External positioning

Use:

> **EBA+ is a privacy-preserving attestation layer for distillation-control enforcement: it records exposure, scope, binding, gate decisions, and countermeasures so an external reviewer can replay whether the provider enforced its declared extraction-budget policy.**

Avoid: "prevents distillation" · "solves model theft" · "proves capability transfer" · "closes Sybils" · "first distillation-proof system" · "makes models safe".

## 18. Source ledger — VERIFICATION GATE (all unchecked; nothing external until cleared)

1. Anthropic, **Detecting and preventing distillation attacks**, 2026. https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks
2. CNBC, **Anthropic accuses Alibaba of campaign to extract AI capabilities**, 2026-06-24. https://www.cnbc.com/2026/06/24/anthropic-alibaba-distillation-campaign.html
3. OpenAI, **Model Distillation in the API**. https://openai.com/index/api-model-distillation/
4. OpenAI Developers, **Data controls in the OpenAI platform**. https://developers.openai.com/api/docs/guides/your-data
5. Anthropic, **Building safeguards for Claude**. https://www.anthropic.com/news/building-safeguards-for-claude
6. Anthropic Engineering, **How we contain Claude across products**. https://www.anthropic.com/engineering/how-we-contain-claude
7. Google Cloud, **GTIG AI Threat Tracker: Distillation, Experimentation, and Integration of AI for Adversarial Use**, 2026-02-12. https://cloud.google.com/blog/topics/threat-intelligence/distillation-experimentation-integration-ai-adversarial-use
8. Cloud Security Alliance, **NSTM-4: US Policy Response to AI Model Distillation Attacks**. https://labs.cloudsecurityalliance.org/research/csa-research-note-nstm4-ai-distillation-policy-enterprise-im/
9. IAPS, **AI Distillation Attacks: The Case for Targeted Government Intervention**, 2026-03-18. https://www.iaps.ai/research/ai-distillation-attacks-the-case-for-targeted-government-intervention

Verification checklist (each item: confirm existence, title, publisher, date, and every figure quoted from it):

- [ ] Source 1 + the 16M+/24,000 figures and targeted-capability list
- [ ] Source 2 + the 28.8M/~25,000 figures and the 2026-04-22→2026-06-05 window
- [ ] Sources 3–4 (OpenAI distillation product + ZDR/MAM data controls)
- [ ] Sources 5–6 (Anthropic safeguards + containment engineering post)
- [ ] Sources 7–9 (GTIG, CSA/NSTM-4, IAPS) + every policy claim attributed to them

## 19. Final build instruction

Build Stage 4K v0 first. Do not overbuild EBA+ into v0. The v0 rule is:

> ledger + Q8 + signed attestation + replay + falsifiers.

Then v1 adds scope (raw `39`), binding, countermeasure receipts, and Anthropic-ready controls.
