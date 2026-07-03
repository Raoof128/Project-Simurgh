# Stage 4L / CCB — Closeout

**Stage:** 4L / Cluster-Commitment Budgets · **Version target:** `v2.21.0-stage-4l-ccb`
**Builds on:** Stage 4K/EBA (`v2.20.0-stage-4k-eba`), Stage 4H wrapper/signing, Stage 4D evidence spine.
**Status:** implemented on branch `stage-4l-ccb`; release/tag is owner-driven after review.

## What shipped

A new additive attestation module, `tools/simurgh-attestation/stage4l/`, implementing the **Q9
cluster-commitment budget gate**: given a provider's committed cluster assignments, an offline
auditor recomputes that extraction-exposure budgets were enforced at the cluster level — catching
**structuring** (one campaign split across many sub-threshold accounts) that Stage 4K's
per-account accounting provably misses — without raw identity leaving the provider.

Components:

- `constants.mjs` — frozen schemas, cluster-basis enum, raw-identity denylist, non-claims,
  known-limitations.
- `clusterCommitment.mjs` — exact-key assignment schema + privacy guard; `clusterCommitmentDigest`
  (a cluster identity: members sharing basis fields share the commitment).
- `clusterAssignmentLedger.mjs` — deterministic assignment ledger, completeness against the 4K
  exposure ledger, and the **cardinality commitment** (`simurgh.ccb.cluster_cardinality.v1`).
- `clusterBudgetGate.mjs` — `aggregateClusterExposure` + Q9 `checkClusterBudgets`.
- `build-stage4l-attestation.mjs` — attestation + Ed25519 signed manifest (own stage4l key, own
  domain `SIMURGH_STAGE4L_CCB_MANIFEST_V1`).
- `build-stage4l-fixtures.mjs` — seven deterministic synthetic bundles.
- `verify-stage4l.mjs` — offline verifier CLI, recompute-before-trust, typed exits.
- `scripts/reproduce-llm-shield-stage4l.sh` — one-command offline reproduce.

Raw codes (spec §2): **40** `cluster_commitment_missing`, **41** `cluster_budget_exceeded`, **42**
`cluster_assignment_mismatch`, all run-level 1. Raw **39 stays reserved** (v1
`extraction_scope_violation`, prose only) and is deliberately unmapped. This supersedes any earlier
draft that allocated 39/40/41.

## Falsifier outcomes (F1–F10)

| #           | Falsifier                                 | Expected                          | Result |
| ----------- | ----------------------------------------- | --------------------------------- | ------ |
| F1          | clean bundle                              | exit 0                            | pass   |
| F-STRUCTURE | 100 × 1 in one cluster over B_cluster     | raw 41                            | pass   |
| F2b         | single fat account over budget            | raw 41                            | pass   |
| F2c         | boundary total == B_cluster               | exit 0                            | pass   |
| F3          | missing assignment                        | raw 40                            | pass   |
| F4          | duplicate assignment                      | raw 42                            | pass   |
| F5          | commitment byte-flip                      | raw 42                            | pass   |
| F6          | budget lowered after signing              | raw 22 (never 41)                 | pass   |
| F7          | raw-identity key injected                 | raw 42                            | pass   |
| F8          | per-account checker on structuring bundle | PASSES (control)                  | pass   |
| F9          | singleton-cluster evasion                 | PASSES (expected-green, ledgered) | pass   |
| F10         | cardinality tamper                        | raw 42                            | pass   |

## Verification (on this branch, Node 26.4.0)

- `npm test` — **1309 pass / 0 fail** (whole repository).
- `bash scripts/reproduce-llm-shield-stage4l.sh` — ALL GREEN, exit 0, byte-idempotent across two
  runs, clean tree after.
- `git diff main...HEAD -- src/llmShield` — **empty** (zero product-code change; enforced by the
  e2e net).
- Q8 (Stage 4K) verdicts byte-unchanged with 4L present.

## Non-claims (signed, verbatim from `constants.mjs`)

`not_sybil_closure`, `not_structuring_closure_without_provider_binding`, `not_identity_truth`,
`provider_cluster_graph_assumed`, `not_capability_transfer_proof`,
`budget_is_declared_policy_not_safety_bound`, `raw_identity_not_exported`, `ledger_is_metadata_only`,
`attestation_assumes_reviewer_runtime`, `not_model_safety`, `not_kernel_sandboxing`,
`determinism_not_statistical_robustness`, `complements_not_replaces_prevention_credentials`.

## Known limitations (signed)

- `singleton_cluster_evasion_not_detected_but_ledgered` — Q9 cannot detect a provider that assigns
  each account to its own singleton cluster (F9); the cardinality commitment forces that choice
  onto the signed record so it is falsifiable later.
- `basis_digests_opaque_slots` — basis digests are opaque 256-bit slots the verifier cannot
  recompute (Stage 3U R2-B lineage).
- `graph_version_not_verified_in_4l` — `graph_version_digest` is checked for presence/format only;
  Stage 4M binds it.

## Anti-monotonicity lemma (stated here, proved in 4M)

Cluster assignments partition consumers; fraud-graph improvements only coarsen the partition;
exposure is additive over blocks. Therefore once a merged cluster exceeds budget in a committed
window, every further coarsening containing it also exceeds it — **breaches are monotone under
truth**. This makes the enforcement-vs-audit-evasion incentive argument provable in Stage 4M.

## Out of scope (deferred, seeded here)

- **4M / VXD** — signed `cluster_merge_event.v1` (reserved name), monotone merge lattice,
  retroactive re-scoring proving the lemma above, disclosure-claim binding, Article-73 template
  projection (with `not_legal_compliance_certification`), and the respondent path (adversarial
  verifiability / due process for the accused). Consumes `graph_version_digest`, the cardinality
  commitments, and the reserved `demand_side_evidence_digest`.
- **4N (candidate) — Public Extraction-Telemetry Heartbeat** ("Extraction Seismograph"): a public
  append-only per-window digest + coarse aggregates.
- **VFR** — verifiable friction receipts, its own later stage (never merged into 4M).
- **OWASP LLM10 / NIST MEASURE 2.7 mapping note** — docs-only companion PR.
- **4P / CPC** — cross-provider corroboration by digest equality; consumes
  `corroborating_commitments` (reserved empty in the v0 attestation).

Deferred v1: cross-pack cluster-view non-equivocation. The v0 pack commits the assignment root as
`assignment_ledger_digest` (signed in the manifest); v1 compares signed roots across independently
shared packs for the same window and emits `cluster_view_equivocation`.
