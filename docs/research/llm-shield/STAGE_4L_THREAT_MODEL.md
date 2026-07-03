# Stage 4L / CCB — Threat Model

**Stage:** 4L / Cluster-Commitment Budgets · **Builds on:** Stage 4K/EBA (`v2.20.0-stage-4k-eba`).
**Claim under test:** given a provider's committed cluster assignments, an offline auditor can
recompute that extraction-exposure budgets were enforced at the **cluster** level, catching
structuring that per-account accounting provably misses — without raw identity leaving the
provider.

## 1. The adversary: structuring

**Structuring** is the adversary decomposing one large extraction campaign into many
sub-threshold accounts, organizations, payment paths, or proxy routes so each account appears
compliant while the campaign as a whole exceeds the declared extraction budget. The term is drawn
from compute-KYC / BIS regulatory language, where the same evasion is named directly.

Stage 4K/EBA enforces a per-bound-consumer budget: for each consumer, recompute weighted
exposure and verify `weighted_total ≤ B`. That is necessary but weak against structuring — 100
accounts each making one request pass every per-account check while jointly extracting at scale.

Stage 4L upgrades the _subject_ of the budget: for each provider-declared cluster commitment,
recompute the sum of committed exposure across the cluster's members and verify
`cluster_weighted_total ≤ B_cluster`.

The crown demonstration (magnitudes are weighted exposure — the gate sums
`weighted_total`, not raw request counts; the committed fixtures realise each row):

| Scenario                                                            | Per-account check | Cluster check | Outcome                                 |
| ------------------------------------------------------------------- | ----------------- | ------------- | --------------------------------------- |
| 1 account, weighted exposure 100, B 80                              | fails             | fails         | both catch                              |
| 100 accounts × weighted 1, one shared cluster (Σ 100), B_cluster 80 | passes            | fails         | **CCB catches what per-account misses** |
| 100 accounts × weighted 1, 100 singleton clusters, each B 5         | passes            | passes        | **not caught — see §4**                 |

## 2. What CCB does NOT claim

CCB does not solve Sybil attacks. It accepts a provider-supplied cluster commitment and proves
that the declared cluster-level budget was enforced without exposing raw identity. It does not
prove the provider's fraud graph is correct or complete.

Signed non-claims (verbatim from `tools/simurgh-attestation/stage4l/constants.mjs`):

- `not_sybil_closure`
- `not_structuring_closure_without_provider_binding`
- `not_identity_truth`
- `provider_cluster_graph_assumed`
- `not_capability_transfer_proof`
- `budget_is_declared_policy_not_safety_bound`
- `raw_identity_not_exported`
- `ledger_is_metadata_only`
- `attestation_assumes_reviewer_runtime`
- `not_model_safety`
- `not_kernel_sandboxing`
- `determinism_not_statistical_robustness`
- `complements_not_replaces_prevention_credentials`

## 3. Adjacent lanes (position against, do not claim to replace)

| Lane                                                                              | Proves                                                              | Cannot do                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Anonymous rate-limited credentials (IETF ARC draft; Cloudflare deployment; k-TAA) | Per-credential limits without identity (prevention)                 | Third-party evidence that enforcement held; cluster level; post-hoc disclosure |
| Antidistillation fingerprinting (arXiv:2602.03812)                                | A student model learned from the target (detection, statistical)    | Quantify campaign scale; attest provider enforcement                           |
| TEE attested inference (AEX arXiv:2603.14283; commercial TEE serving)             | Per-request computation integrity (hardware trust)                  | Fleet-wide account-level policy enforcement without infra change               |
| SCITT / draft-hillier-scitt-arp (IETF, 2026)                                      | Supply-chain claim reconciliation; retroactive policy re-evaluation | Identity-cluster budgets; incentive analysis; extraction domain                |
| DSA transparency-report research                                                  | Documents that self-reported statistics are unverifiable            | Provides no replay tooling (demand signal, not competition)                    |

The canonical framing is Brundage et al. 2020, _Toward Trustworthy AI Development: Mechanisms for
Supporting Verifiable Claims_ (arXiv:2004.07213): CCB is a concrete software mechanism for
verifiable **enforcement** claims. Positioning line: ARC-style credentials _prevent_
per-credential overuse privately; CCB is the auditable evidence layer that prevention lacks.

Citations independently verified 2026-07-03: arXiv:2602.03812 (Xu et al., _Antidistillation
Fingerprinting_), arXiv:2603.14283 (_AEX: Non-Intrusive Multi-Hop Attestation and Provenance for
LLM APIs_), IETF `draft-hillier-scitt-arp` (Attestation Reconciliation Protocol, 2026), and
arXiv:2004.07213 (Brundage et al.) all confirmed against their source registries.

## 4. The honest hole, and why it is not silent: F9 + the cardinality commitment

A provider that assigns each of 100 accounts to its own singleton cluster produces a fully
consistent ledger — every subject assigned once, every digest recomputing, every cluster under
budget. Q9 passes. Under-clustering is exactly the failure mode this stage is about, and Q9 is
structurally blind to it. Falsifier **F9** encodes this as an _expected-green_ arm: it passes, and
that pass is signed into `known_limitations` as `singleton_cluster_evasion_not_detected_but_ledgered`.

What converts the blind spot from a silent gap into a falsifiable claim is the **cluster
cardinality commitment** (`simurgh.ccb.cluster_cardinality.v1`): every window, the builder
recomputes the cluster-size histogram from the assignment ledger and signs it into the pack, with
the singleton count always present. It does not detect the evasion. It forces a provider that
under-clusters to put "these 100 accounts are 100 independent actors" on the permanent record. The
evasion is not prevented; it is **ledgered**. When a later merge event (Stage 4M), a fingerprint
match, or partner corroboration contradicts that committed histogram, it is a provable prior
misstatement rather than a vague miss.

## 5. Formal spine (proof deferred to Stage 4M)

Cluster assignments are a **partition** of consumers. Fraud-graph improvements only ever
**coarsen** the partition (merge-only lattice); exposure is additive over blocks. From this an
anti-monotonicity lemma follows:

> Once any merged cluster exceeds its budget in a committed window, every further coarsening
> containing it also exceeds it — retroactive breaches can never be un-discovered by learning
> more. **Breaches are monotone under truth.**

This is what makes the enforcement-versus-audit-evasion incentive argument provable rather than
rhetorical: a provider that under-clusters to pass today's audit accumulates breach-debt that
surfaces the moment they cluster correctly, and they must cluster correctly to enforce at all.
Stage 4L states the lemma; Stage 4M proves it over signed cluster-merge events and consumes both
`graph_version_digest` and the cardinality commitments defined here.
