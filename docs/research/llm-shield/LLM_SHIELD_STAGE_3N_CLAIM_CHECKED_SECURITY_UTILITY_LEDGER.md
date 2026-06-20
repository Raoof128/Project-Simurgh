# LLM Shield — Stage 3N: Claim-Checked Security–Utility Ledger

> **Stage 3N does not claim blanket robustness or external superiority. It makes
> Simurgh's security–utility claims machine-checkable: every reported metric in
> the 3N ledger must hash to frozen evidence, incompatible denominators must
> refuse pooling, prose-only ("ghost baseline") claims must be excluded and
> labelled historical, and every registered claim must pass a closed-world
> claim-to-evidence consistency gate.**

## The leap

| Stage | What it proves |
|---|---|
| 3M | The evidence bundle can be verified offline (Ed25519, no shared secret). |
| **3N** | **The claims made *from* that evidence cannot outrun it.** |
| 3O (future) | Others can run the same metric contract (BYO-gateway). |

Stage 3N is a **measurement / claim-governance** stage. It is not a benchmark and
it ships **no** change to `src/llmShield/**` (enforced by a policy-drift guard).

## Why this stage exists

The field has converged on the *security–utility* problem: recent work shows that
many agent defences are "either not secure enough or suffer from significant
over-defence" in dynamic, open-ended environments
([AgentDyn, arXiv:2602.03117](https://arxiv.org/abs/2602.03117)), that public
benchmarks can be saturated and need stronger metrics
([Firewalls, arXiv:2510.05244](https://arxiv.org/abs/2510.05244)), and that
defences remain vulnerable to adaptive attacks
([PISmith, arXiv:2603.13026](https://arxiv.org/abs/2603.13026)). Indirect prompt
injection is already a web-scale reality
([In-the-Wild, arXiv:2604.27202](https://arxiv.org/abs/2604.27202)), and the
honest posture is "measure and contain, no immunity claim"
([Anthropic browser-use defences](https://www.anthropic.com/research/prompt-injection-defenses)).

The right response is not another "we blocked X prompts" claim. It is
**security–utility measurement with machine-checked claims**.

### The conflict that became the centrepiece

While designing 3N we checked the project narrative against the frozen evidence and
found a **prose/evidence conflict**. The narrative described a Stage 3H-L2 / pre-3I
over-defence collapse (defended benign utility 0/10, over-defence 10/10) that 3I
recovered. But the **committed** files show the already-clean state:

- `evidence/stage-3h-layer2/metrics.json` → `over_defence_rate` = **0/10**, `utility_preserved_rate` = **10/10**.
- `evidence/stage-3i/benign-recovery-analysis.json` → `over_defence` = **0/10**.

The `10/10` collapse was a transient bug, found and fixed, and **never frozen as a
committed artifact**. Rather than hide it, 3N registers that number as an
`excluded_from_ledger / prose_history` claim, and a CI gate fails if any
*registered* claim drifts from its committed source field. The conflict becomes
proof of discipline.

## Three pillars

1. **Held-line ledger** — per-family rows built **only** from committed fields
   (`held-line-ledger.json`, `per-family-panels.json`). No `recovery_point` or
   `regression_baseline` row, because no frozen `10/10` artifact exists.
2. **Metric contract** — each family declares its denominator basis; the runner
   refuses to pool two families across incompatible denominators and records the
   refusal (`metric-contract.v1.json`, `denominator-pooling-report.json`). No
   pooled ASR is ever reported.
3. **Closed-world claim-to-evidence compiler** — every registered claim is either
   `verified` against a committed JSON field (field-equality, never prose parsing)
   or `excluded_from_ledger` with a reason; anything else fails
   (`claim-evidence-map.json`, `claim-consistency-report.json`).

The Stage 3M attestation is re-verified in-process and hash-bound into the ledger
(`stage3m-attestation-validation.json`).

## Frontier status

`src/llmShield` exposes only discrete switches (a canonicalisation feature-toggle
and categorical provenance enums), not a continuous strictness dial. A real Pareto
frontier is therefore unavailable, and 3N emits
`frontier_status = not_applicable_degenerate` with the reason recorded — rather
than drawing a curve that does not exist.

## Hard gates

| Gate | Meaning |
|---|---|
| `all_ledger_rows_hash_to_committed_evidence` | every ledger row's source files are hash-bound |
| `prose_only_metric_claims_excluded` | no ghost baseline leaks into a claim |
| `claim_evidence_map_complete` | closed world: every claim verified or excluded |
| `unresolved_numeric_claim_conflicts = 0` | no registered number drifts from its field |
| `cross_family_pooling_performed = 0` | no denominator soup |
| `mismatched_denominator_pooling_refusal_test_passed` | the refusal test ran and passed |
| `pooled_asr_reported = false` | no pooled ASR |
| `frontier_status ∈ {computed, not_applicable_degenerate}` | honest frontier label |
| `stage3m_attestation_validation_present` | 3M verifier PASS recorded |
| `source_evidence_hashes_match`, `generated_evidence_leakage = 0`, `src_llmShield_policy_drift = 0`, `overclaim_wording_detected = 0` | integrity / privacy / no-drift |

## Non-claims

- Stage 3N does not prove blanket robustness across all settings.
- Stage 3N does not prove model safety.
- Stage 3N does not claim primacy or superiority over external systems.
- Stage 3N does not compare against external systems (a comparator row is
  reserved but not populated).
- Stage 3N reports a held-line security–utility ledger over bounded, frozen
  Simurgh evidence.
- Stage 3N treats attestation as integrity/authorship evidence, not proof the
  system was truthful.
- Stage 3N's claim compiler proves registered claims match frozen fields; it does
  not police prose outside its registered surface.

## External anchors

- [AgentDojo (NeurIPS 2024), arXiv:2406.13352](https://arxiv.org/abs/2406.13352) — 97 tasks, 629 security cases; denominators are family-specific and not interchangeable.
- [AgentDyn, arXiv:2602.03117](https://arxiv.org/abs/2602.03117) — defences "insecure or over-defensive" in dynamic environments.
- [Firewalls, arXiv:2510.05244](https://arxiv.org/abs/2510.05244) — benchmarks saturate; stronger metrics needed.
- [PISmith, arXiv:2603.13026](https://arxiv.org/abs/2603.13026) — defences remain vulnerable to adaptive attacks.
- [In-the-Wild, arXiv:2604.27202](https://arxiv.org/abs/2604.27202) — web-scale prevalence of indirect prompt injection.
- [Anthropic browser-use defences](https://www.anthropic.com/research/prompt-injection-defenses) — no agent is immune; progress, not solved.
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — maps to Simurgh's risk classes.
- [NIST AI RMF (AI 100-1)](https://www.nist.gov/itl/ai-risk-management-framework) — Govern/Map/Measure/Manage framing; 3N is a Measure/Govern layer, not a compliance claim.
