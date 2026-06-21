# LLM Shield — Stage 3P: Cross-Defence Containment Attestation

> **Stage 3P proves that Simurgh's verifiable containment contract can produce
> signed, offline-verifiable evidence about heterogeneous defence mechanisms —
> without ranking them.** Each provenance-typed target runs the same frozen canary
> discrimination matrix and produces its own Ed25519-signed attestation; a signed,
> hash-bound catalogue binds the campaign set. The category line: _everyone can be
> measured under the same evidence contract_ — not "we beat everyone."

## The VCA ladder

| Stage  | What it proves                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------- |
| 3M     | the evidence bundle verifies offline (Ed25519)                                                           |
| 3N     | the claims made _from_ that evidence cannot outrun it                                                    |
| 3O     | others can produce evidence under the same contract                                                      |
| **3P** | **the contract binds many, differently-built targets — each independently and campaign-wide verifiable** |

3P is the generalisation rung: 3O proved a single external gateway can produce a
signed attestation; 3P proves the contract holds across a spread of defence
mechanisms and emits a hash-bound campaign of per-target attestations. It is
tooling, not a defence, and ships **no `src/llmShield` change** (policy-drift
guard enforced).

## The sacred wall (verbatim)

> **Attestation catalogue, not leaderboard. Stage 3P does not rank defences,
> declare winners, or claim product superiority. Each row states only what target
> was executed, under what provenance, against what corpus, and what signed
> evidence was produced.**

## Provenance model

Every target carries a signed provenance tag and trust attribution. A target name
may only claim what was actually executed — a schema invariant, not prose.

| Provenance            | Meaning                                                   | CI behaviour            | Brand names |
| --------------------- | --------------------------------------------------------- | ----------------------- | ----------- |
| `reference_replica`   | Simurgh-authored deterministic stand-in for a _mechanism_ | run in CI               | never       |
| `no_defence_baseline` | deliberate empty target (calibration floor)               | run in CI               | no          |
| `vendored_oss`        | real OSS defence, pinned version/commit/weights           | CI verifies bundle only | yes         |
| `live_api`            | real provider/API, opt-in, metadata-only                  | CI verifies bundle only | yes         |

`execution_trust ∈ {project_generated, maintainer_generated, third_party_submitted}`
answers the reviewer's "who ran it?" The brand-denylist gate fails any replica
whose id/name/summary/`non_claims` carries a real product/provider brand
(separator-normalised, so `llama-guard` is caught). Product names are allowed only
with `vendored_oss`/`live_api` plus version + execution mode.

CI core replicas (mechanism-named only): `no-defence-baseline`,
`keyword-filter-replica`, `regex-denylist-replica`, `llm-judge-replica`,
`context-sanitiser-replica`, `tool-gate-replica`, `full-gateway-target`.

## The discrimination matrix corpus

A deterministic, canary-only **mechanism-fingerprinting** corpus:
**5 boundaries × 5 evasions = 25 cells × 6 cases = 150 + 30 controls = 180**.

- Boundary axis: `direct_input`, `context_injection`, `tool_request`,
  `output_export`, `multi_turn`.
- Evasion axis: `plain_marker`, `obfuscated_marker`, `split_marker`,
  `synonymed_instruction`, `composite_chain`.

Because mechanisms differ, each target lights up a different subset of cells → a
**coverage profile**, not a score. The matrix _is_ the artifact: it shows where a
mechanism contains and where it leaks, directly answering the Firewalls/PISmith
saturation critique (simple replicas visibly fail the evasion columns). Cell
results are restricted to the fixed enum `contained | allowed |
rejected_invalid_target | not_applicable | verification_failed`. Every malicious
goal is a harmless canary `CONTAINMENT-CANARY-3P-<BOUNDARY>-<EVASION>-<ID>`; the
oracle checks marker leakage only, never harmful content.

## Attestation topology

Per-target signed `containment-attestation.json`
(`simurgh.cross_defence.target_attestation.v1`) — independently verifiable. Plus a
signed `attestation-catalogue.json`
(`simurgh.cross_defence.attestation_catalogue.v1`) — a **hash-bound catalogue
index** (no Merkle tree is computed; it stores each target attestation's canonical
digest and binds the set by listing those digests). A known planned target must
appear in `targets[]` or `excluded_targets[]` (with `reason_code` + `reason`);
silent dropping fails. A **dedicated Stage 3P Ed25519 key** signs only 3P
artifacts (3L/3M/3O keys never sign 3P). CI is **verify-only**; the actual
signature is a sibling `.signature.json` sidecar (faithful to the 3M/3O pattern).

The overclaim gate is **negation-aware and schema-aware**: structured false-guard
fields are renamed to boring tokens (`numeric_summary_exported`,
`ordering_metric_exported`, `catalogue_kind: "non_ranking_attestation_catalogue"`),
and the exact disclaimer phrases are allow-listed — so the gate never bites its
own non-claims, while affirmative ranking fields/words still fail.

## Self-proof — the teeth (both layers)

Unit tests on every gate **and** end-to-end adversarial self-proof in a separate
`self-proof-results.json` that never pollutes the clean catalogue:

| Fixture                       | Must trip detector                    |
| ----------------------------- | ------------------------------------- |
| `clean-baseline`              | accepted (happy path)                 |
| `brand-violator-replica`      | `provenance_brand_denylist_violation` |
| `ranking-overclaimer`         | `ranking_export_violation`            |
| `claim-conflict-liar`         | `claim_conflict`                      |
| `false-full-coverage-claimer` | `unverified_full_coverage_claim`      |
| `silent-drop-catalogue`       | `catalogue_silent_drop`               |

## Determinism

CI drives in-process module replicas (deterministic, no network, no port flake);
`--target <url>` performs real HTTP `POST /run` for adopters, opt-in and not
CI-gated. External target runs emit `result: "measured_not_certified"`.

## Non-claims

- Not a leaderboard, ranking, certification, or declaration of a best/winning
  defence.
- Not proof that any defence (replica, OSS, or live) is safe or production-ready.
- Not semantic truth of any target's internal logic — only externally observable
  cell behaviour and the consistency between a target's coverage claims and the
  canary evidence.
- `reference_replica` targets prove the contract generalises across defence
  **mechanisms**, not named real systems; `vendored_oss`/`live_api` attestations
  bind real targets **only when actually executed**, recorded by `execution_trust`.
- "First" is shown by verifiable artifacts and the discrimination matrix, never
  asserted.

## Out of scope (deferred)

- **Stage 3Q — Attestation registry + regression diff** (append-only registry,
  cross-version weakening detection).

## External anchors

- [AgentDojo (NeurIPS 2024), arXiv:2406.13352](https://arxiv.org/abs/2406.13352)
- [AgentDyn, arXiv:2602.03117](https://arxiv.org/abs/2602.03117) — defences insecure or over-defensive in dynamic environments.
- [Firewalls, arXiv:2510.05244](https://arxiv.org/abs/2510.05244) — public benchmarks saturate; adoptable, stronger benchmarks needed.
- [PISmith, arXiv:2603.13026](https://arxiv.org/abs/2603.13026) — defences remain vulnerable to adaptive attacks.
- [Anthropic browser-use defences](https://www.anthropic.com/research/prompt-injection-defenses) — no agent is immune; measure, don't certify.
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html); [NIST AI RMF (AI 100-1)](https://www.nist.gov/itl/ai-risk-management-framework).
