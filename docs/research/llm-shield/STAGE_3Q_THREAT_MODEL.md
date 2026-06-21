# Stage 3Q — Threat Model

Stage 3Q is a temporal measurement and attestation layer. Its threat model is about
the **integrity of the timeline and its comparisons**, not about defending a live
system. The asset is the trustworthiness of the signed registry and regression
evidence: a reader must not be misled about what changed, when, or whether a target
genuinely weakened.

## Adversaries and mitigations

| Adversary / risk                                                     | Mitigation                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A defence silently weakens between releases                          | Same-lineage regression diff classifies `contained → allowed` as `regressed` over the matrix               |
| "Evidence invalid" is dressed up as "defence weaker" (or vice versa) | Anti-laundering lattice: integrity failures → `integrity_failure` only; never regressed/improved           |
| Corpus is swapped to fake a comparison                               | `corpus_mismatch` → `non_comparable`; same-corpus required for regressed/improved                          |
| Two different targets are compared as if one (leaderboard sin)       | `cross_target_diff_violation` (checked BEFORE lineage binding)                                             |
| A manifest relabels a target lineage after the fact                  | Strict lineage binding to the 3P attestation's own `target_id`; no aliases → `lineage_binding_violation`   |
| A past registry entry is edited                                      | Internal hash chain: `entry_digest` over `entry_body`; `registry_chain_violation`                          |
| A timeline entry is silently dropped or reordered                    | Append-continuity vs previous head: preserved prefix must equal previous head; tail-only appends           |
| The registry's claims about 3P drift from the real files             | `verifyRegistryReferences` re-hashes the referenced catalogue/targets (canonical)                          |
| A fabricated wall-clock timestamp                                    | Timestamps are committed manifest inputs; strict UTC validation rejects impossible dates; no `Date.now()`  |
| The registry is tampered after signing                               | Ed25519 signature over the canonical ledger; full-pack hash check                                          |
| A private key leaks via the repo                                     | Private key outside the repo (`~/.simurgh/`); CI verify-only; only the public key committed                |
| Measurement tooling silently weakens the defence                     | Fail-closed policy-drift guard (`main...HEAD`, warns + safe fallback) forbids `src/llmShield` change       |
| The wording audit disables itself on the self-proof pack             | Self-proof is exempt by design (it names the violations it provokes); published artifacts scanned strictly |

## Trust boundaries

- **Generation** (local, holds the private key) is separated from **verification**
  (CI, public key only). Generation never asserts a signature; only the verifiers do.
- The registry is a self-contained, offline-verifiable snapshot; append-only
  continuity is proven against the committed previous head, not asserted.

## Residual risk (accepted)

- At genesis there are zero real diffs; the diff engine is proven by the self-proof
  pack, which is generated deterministically from fixed fixtures (no overclaim
  surface).
- The previous-head input is maintained deliberately by the maintainer between
  releases; a future Stage 3R could automate multi-release continuity end-to-end.
