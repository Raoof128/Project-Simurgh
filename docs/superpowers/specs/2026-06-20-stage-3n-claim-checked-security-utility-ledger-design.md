# Stage 3N — Claim-Checked Security–Utility Ledger — Design

Status: Approved design baseline
Date: 2026-06-20
Release target: `v1.7.0-stage-3n-claim-checked-security-utility-ledger`
Branch: `main-stage-3n-claim-checked-security-utility-ledger`
Type: Derived-evidence / measurement / claim-governance stage. **No `src/llmShield/**` guard changes.\*\*

---

## 1. Steel-thread sentence

> **Stage 3N does not claim universal robustness or external superiority. It makes Simurgh's security–utility claims machine-checkable: every reported metric in the 3N ledger must hash to frozen evidence, incompatible denominators must refuse pooling, prose-only ("ghost baseline") claims must be excluded and labelled historical, and every registered claim must pass a closed-world claim-to-evidence consistency gate.**

The leap over prior stages:

```
3M = verify the evidence bundle (Ed25519, offline)
3N = verify the CLAIMS made from that evidence (closed-world, hash-bound)
3O = let others run the same contract (future)
```

3N is the **claim-governance** stage. It is not a benchmark and it is not a defence.

---

## 2. Why 3N exists (and the conflict that motivated it)

During design we checked the frozen evidence against the prose narrative and found a
**prose/evidence conflict**:

- The project narrative says Stage 3H-L2 / pre-3I exhibited an over-defence collapse
  (defended benign utility `0/10`, over-defence `10/10`) that Stage 3I then recovered.
- The **committed** files show the opposite already-clean state:
  - `docs/research/llm-shield/evidence/stage-3h-layer2/metrics.json`
    → `simurgh_containment_metrics.over_defence_rate` = **0/10**, `utility_preserved_rate` = **10/10**.
  - `docs/research/llm-shield/evidence/stage-3i/benign-recovery-analysis.json`
    → `over_defence` = **0/10**, `benign_failures` = **0**.

The `10/10 → 0/10` recovery describes a **transient bug** that was found and fixed; it was
**never frozen as a committed artifact**. There is no `10/10` baseline file to hash.

Rather than hide this, 3N makes it the centrepiece: a claim that cannot resolve to a frozen
artifact is **excluded from the ledger and labelled `prose_history`**, and a CI gate fails if
any _registered_ claim's number drifts from its committed source field. The conflict becomes
proof of discipline, not an embarrassment.

External anchors (motivation only; verified at write-time per §12):

- AgentDojo — realistic-task benchmark with benign utility, utility-under-attack, ASR
  (OpenReview `m1YYAQjO3w`). Establishes the metric families but **its denominators are not
  interchangeable across our runs**.
- Anthropic browser-use prompt-injection post — "no agent is immune"; progress, not solved.
  Supports the no-universal-robustness posture.
- OWASP AI Agent Security Cheat Sheet — maps to Simurgh's risk classes (prompt injection,
  tool abuse, privilege escalation, data exfiltration).
- NIST AI RMF (AI 100-1) — Govern/Map/Measure/Manage framing; 3N is a _Measure/Govern_
  evidence layer, **not** a compliance claim.
- Supporting (pending write-time re-verification, non-load-bearing): AgentDyn `2602.03117`,
  PISmith `2603.13026`, Firewalls `2510.05244`, In-the-Wild `2604.27202`.

---

## 3. Scope

### In scope (v1)

- Normalising **frozen, committed** Simurgh evidence into one metric schema.
- A **metric contract** that declares each row's population/denominator and refuses pooling
  across incompatible denominators.
- A **held-line ledger**: per-family rows proving over-defence stayed 0 and utility stayed
  intact _where committed metrics show it_, at rising scale/adversity.
- A **closed-world claim-to-evidence compiler**: every registered claim is either `verified`
  against a committed field or `excluded` with a recorded reason (`prose_history`).
- Application of the claim compiler to **3N's own ledger rows + the one registered historical
  conflict (3H-L2 prose)** — and nothing else.
- Standard audit quartet + closeout, evidence hashes, privacy/security/consistency audits,
  policy-drift guard.

### Out of scope (explicit non-goals)

- No new attacks, no new guard tuning, no `src/llmShield` change.
- No live provider execution; no AgentDyn integration (future 3O/3P).
- **No universal claim-policing of the whole repo's prose.** 3N polices only its own
  registered claim surface. Other stages may opt in later; v1 does not retrofit them.
- No external comparator claim (a `comparator` row type is reserved but left
  `not_yet_populated`).
- No real security–utility frontier: confirmed below that **no tunable strictness knob exists**
  in the guard layer, so `frontier_status = not_applicable_degenerate`.

### Frontier determination (recorded fact)

`src/llmShield` exposes only discrete switches: `promptFirewall` `opts.stages` is a
canonicalisation feature-toggle (merged from `DEFAULT_STAGES`), and `contextProvenanceGuard`
uses discrete provenance enums such as trust level, source type, and purpose values; these are
categorical boundary labels, not a continuous security/utility strictness dial. Therefore a
real Pareto frontier is unavailable and 3N emits `frontier_status = not_applicable_degenerate`
with `frontier_reason_recorded = true`.

---

## 4. Architecture & components

Three pillars, one runner, pure lib + thin runner (matching 3L/3M style).

```
tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs      # pure functions, no I/O beyond passed-in data
tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs   # reads frozen evidence, writes evidence/stage-3n/*
tests/unit/llmShield/stage3nClaimLedgerLib.test.js     # unit tests incl. tamper/negative cases
```

### Pillar 1 — Held-line ledger

For each source family, a row built **only** from committed fields:

| Source file                       | family                         | key fields used                                                                                                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `stage-3h-layer2/metrics.json`    | `agentdojo_layer2`             | `simurgh_containment_metrics.over_defence_rate` (0/10), `utility_preserved_rate` (10/10)                                           |
| `stage-3j/all-suite-metrics.json` | `agentdojo_full`               | `agentdojo_native_metrics.defended.targeted_asr` (0/949), `simurgh_containment_metrics.over_defence_rate` (0/97)                   |
| `stage-3k/metrics.json`           | `adaptive_readiness`           | `agentdojo_native_metrics.defended.targeted_asr` (0/385), `mutation_variant_count` (350), `action_open_attacker_goal_rate` (0)     |
| `stage-3l/metrics.json`           | `fable5_reference_containment` | `malicious_targeted_asr` (0), `malicious_total` (150), `benign_hard_negative_passed` (30), `input_miss_downstream_contained` (120) |
| `stage-3m` attestation            | `attestation_validity`         | verifier PASS over signed 3L pack                                                                                                  |

Each row records `role` ∈ {`held_line`, `attestation`}. No `recovery_point`, no
`regression_baseline` — those would require a frozen `10/10` artifact that does not exist.

### Pillar 2 — Metric contract

`metric-contract.v1.json` — one entry per family:

```json
{
  "source_stage": "3L",
  "metric_family": "fable5_reference_containment",
  "denominator_basis": "stage3l_malicious_case_count",
  "security_denominator": 150,
  "utility_denominator": 30,
  "pooling_group": "stage3l_only",
  "pooling_allowed_with": []
}
```

The runner refuses to pool two families unless their `denominator_basis` is identical AND each
lists the other in `pooling_allowed_with`. Any attempt emits a `denominator-pooling-report.json`
entry and increments `pooling_refused`. No pooled ASR is ever reported.

### Pillar 3 — Closed-world claim-to-evidence compiler

`claim-evidence-map.json` registers every claim 3N makes. Two shapes:

```json
{
  "claim_id": "3n.claim.stage3l_targeted_asr",
  "claim_text": "Stage 3L targeted ASR was 0/150.",
  "source_file": "docs/research/llm-shield/evidence/stage-3l/metrics.json",
  "source_field": "malicious_targeted_asr",
  "expected": 0,
  "denominator_field": "malicious_total",
  "expected_denominator": 150,
  "status": "verified"
}
```

```json
{
  "claim_id": "3n.claim.stage3h_l2_historical_overdefence",
  "claim_text": "Historically, defended benign utility dropped to 0/10 and over-defence was 10/10.",
  "source_type": "prose_history",
  "frozen_metric_artifact_present": false,
  "status": "excluded_from_ledger",
  "reason": "No committed metrics artifact proves this row; transient pre-3I bug, never frozen."
}
```

**The machine check is field-equality, never prose NLP.** `claim_text` is human-readable
decoration. For `verified` claims the compiler loads `source_file`, reads `source_field`
(dotted path) and `denominator_field`, and asserts they equal `expected` / `expected_denominator`.

**Closed-world rule:** every claim in 3N's surface must be **either** `verified` against a
committed field **or** `excluded_from_ledger` with a `reason`. A claim that is neither = FAIL.
This is what makes the conflict-catch real rather than theatre: a new unbacked number cannot
silently escape by simply being absent from the map — `claim_evidence_map_complete` asserts the
registry covers the full surface.

**Definition of the 3N claim surface:** the union of generated ledger rows, per-family panel
claims, denominator-pooling report claims, and the registered historical conflict claim. It
does **not** include arbitrary prose outside the generated 3N evidence files. The registry is
complete iff every claim in this union is present and resolves to `verified` or
`excluded_from_ledger`.

---

## 5. Data flow

```
frozen evidence (3H-L2, 3J, 3K, 3L, 3M)
  → runner reads committed JSON (no mutation of sources)
  → normalised-metrics.json            (uniform shape, per family)
  → metric-contract.v1.json gate       (no cross-denominator pooling)
  → held-line-ledger.json + per-family-panels.json
  → claim compiler over claim-evidence-map.json
       → claim-consistency-report.json (verified / excluded / FAIL)
  → stage3m-attestation-validation.json (re-run 3M verifier, PASS)
  → evidence-hashes.json               (sha256 of every source file cited)
  → generated-evidence-privacy-report.json
  → runner-output.txt
```

---

## 6. Hypotheses

- **H1 — Faithful normalisation.** Every normalised metric equals its committed source field.
- **H2 — No ghost baseline.** No ledger row asserts a number without a frozen artifact; the
  historical `10/10` claim is present only as `excluded_from_ledger`.
- **H3 — No denominator soup.** No pooled ASR; at least one mismatched-pooling attempt is
  refused and recorded.
- **H4 — Closed-world completeness.** Every claim in the surface is verified or excluded; zero
  unresolved.
- **H5 — Attestation still valid.** 3M verifier PASSES over the signed 3L pack.

---

## 7. Hard gates

```
source_index_valid                          = true
metric_contract_schema_valid                = true
normalised_metrics_schema_valid             = true

all_ledger_rows_hash_to_committed_evidence  = true
prose_only_metric_claims_excluded           = true
claim_evidence_map_complete                 = true
claim_consistency_report_generated          = true
unresolved_numeric_claim_conflicts          = 0

cross_family_pooling_performed                      = 0
mismatched_denominator_pooling_refusal_test_passed  = true
pooled_asr_reported                                 = false
per_family_panels_present                           = true

frontier_status ∈ {computed, not_applicable_degenerate}
frontier_reason_recorded                    = true

stage3m_attestation_validation_present      = true
source_evidence_hashes_match                = true
generated_evidence_leakage                  = 0
src_llmShield_policy_drift                  = 0
overclaim_wording_detected                  = 0
```

Optional stretch (NOT a hard gate):

```
stage3n_bundle_signed_with_3m_tooling       = true
```

---

## 8. Evidence files

```
docs/research/llm-shield/evidence/stage-3n/
  README.md
  source-index.json
  metric-contract.v1.json
  normalised-metrics.json
  held-line-ledger.json
  per-family-panels.json
  denominator-pooling-report.json
  claim-evidence-map.json
  claim-consistency-report.json
  stage3m-attestation-validation.json
  evidence-hashes.json
  generated-evidence-privacy-report.json
  runner-output.txt
```

---

## 9. Docs (quartet + main)

```
docs/research/llm-shield/
  LLM_SHIELD_STAGE_3N_CLAIM_CHECKED_SECURITY_UTILITY_LEDGER.md
  STAGE_3N_THREAT_MODEL.md
  STAGE_3N_VALIDATION_MATRIX.md
  STAGE_3N_REVIEWER_CHECKLIST.md
  STAGE_3N_CLOSEOUT.md
```

---

## 10. Threat model

In scope:

- Misreporting a source metric (caught: claim compiler field-equality).
- Ghost baseline / prose-only number leaking into a claim (caught: closed-world rule).
- Denominator pooling to mask weakness (caught: contract gate + pooling report).
- Over-reading static zero-ASR as universal robustness (countered: non-claims + frontier
  `not_applicable_degenerate`).
- Evidence leakage in generated summaries (caught: privacy audit).
- Overclaim wording ("SOTA", "first in industry", "immune") (caught: overclaim-scan).
- Silent guard drift hidden in a measurement PR (caught: policy-drift guard).

Out of scope:

- New attack generation, guard tuning, live provider safety, AgentDyn execution, universal
  robustness, external-system comparison, content-harm/refusal classification.

---

## 11. Non-claims (verbatim, machine-readable in bundle)

```
- Stage 3N does not prove universal robustness.
- Stage 3N does not prove model safety.
- Stage 3N does not claim Simurgh is state of the art or first in industry.
- Stage 3N does not compare against external systems (comparator row reserved, not populated).
- Stage 3N reports a held-line security–utility ledger over bounded, frozen Simurgh evidence.
- Stage 3N treats attestation as integrity/authorship evidence, not proof the system was truthful.
- Stage 3N's claim compiler proves registered claims match frozen fields; it does not police
  prose outside its registered surface.
```

---

## 12. Implementation phases

1. **Source index + hashes** — enumerate the 5 frozen sources, hash them, fail on drift.
2. **Normalisation lib** — committed field → uniform metric shape (TDD, pure).
3. **Metric contract + anti-pooling gate** — schema + refusal logic + report.
4. **Held-line ledger + per-family panels** — rows from committed fields only.
5. **Claim compiler** — map schema, dotted-path field reader, closed-world verify/exclude,
   consistency report. Includes the registered 3H-L2 `prose_history` exclusion + a negative
   test that a drifted number FAILS.
6. **3M attestation re-validation** — invoke existing verifier; record PASS.
7. **Audits + policy-drift guard + check.sh wiring** — privacy/security/consistency/drift.
8. **Docs quartet + closeout + citation verification** (re-verify §2 anchors; drop any that
   don't resolve).
9. **Stretch:** sign the 3N bundle with existing 3M tooling.

---

## 13. Citation verification

Re-run the 3L/3M citation-verification procedure before any anchor enters the prose docs.
Load-bearing anchors are the four stable ones (AgentDojo/OpenReview, Anthropic, OWASP, NIST).
AgentDyn/PISmith/Firewalls/In-the-Wild are supporting only; include each in
`citation-verification.md` with resolved/dropped status. The argument must stand on the stable
four alone.
