# Stage 4K — Verifiable Extraction-Budget Attestation (EBA) — Closeout

## Milestone

Stage 4K / Banger EP9 ships **Q8**, a cumulative per-bound-consumer supervision-exposure
budget gate. A bound consumer whose cumulative weighted exposure in a window exceeds its
declared budget produces raw code `30` (`extraction_budget_exceeded`), which the shared
Stage-4 exit wrapper maps to run-level `1`. The whole exposure ledger, budget policy,
attestation, and a stage4k-owned Ed25519-signed manifest are re-derived offline in one
command (`scripts/reproduce-llm-shield-stage4k.sh`) with anti-theatre falsifiers.

This attests **enforcement of a declared budget**, not prevention of model extraction. See
Non-Claims below.

## Gate semantics

- **Raw `30` = over-budget only.** It is emitted solely when `checkBudgets` finds a bound
  consumer with `weighted_total > budget`.
- **Raw `29 → run-level 3` = fail-closed.** Missing budget, weight drift, policy-schema
  drift, unknown signal class, malformed digest, unreadable bundle, or any harness/self-test
  failure. Never surfaces as `30`.
- **Raw `39` is reserved in prose only** (a future v1 `extraction_scope_violation`). It is
  deliberately NOT present in `RUN_LEVEL_BY_RAW`, so it falls through the total wrapper to the
  fail-closed default `3`. Do not add it to any ledger in v0.
- Digest/signature failures route through the shared 4H/4D bands: tamper caught by ledger or
  attestation recompute → `22`; bad or unpinned signature → `25`; 4H substrate re-verify
  failure → its own verbatim code.

## Falsifier table

| Falsifier                                               |  Raw | Run-level |
| ------------------------------------------------------- | ---: | --------: |
| over-budget consumer                                    | `30` |       `1` |
| deleted `extraction-ledger.json`                        | `29` |       `3` |
| unsigned ledger/attestation tamper (recompute mismatch) | `22` |       `1` |
| corrupted manifest signature                            | `25` |       `1` |
| valid signature under an unpinned key                   | `25` |       `1` |
| unknown signal class in the event stream                | `29` |       `3` |
| malformed `response_id_digest` (plaintext smuggling)    | `29` |       `3` |

## Non-claims (verbatim from spec §0.5)

- `not_capability_transfer_proof` — a budget breach is not proof that model capability was
  transferred or distilled; it is proof that a declared exposure budget was exceeded.
- `not_sybil_collusion_closure` — consumer binding is a declared input, not a closure over
  Sybil identities or colluding consumers.
- `budget_is_declared_policy_not_safety_bound` — the budget is a policy number chosen by the
  operator, not a measured or proven safety threshold.
- `weights_are_declared_policy` — signal-class weights are declared policy, not measured
  information content.
- `substrate_is_synthetic_fixture_stream` — the v0 event stream is a synthetic fixture, not a
  capture of real production traffic.
- `consumer_digest_is_pseudonymous_not_anonymous` — `consumer_id_digest` is a salted
  pseudonym (deterministic under the pinned fixture salt), not anonymisation.
- `attestation_assumes_reviewer_runtime` — offline re-derivation assumes the reviewer runs the
  committed tooling under Node 26; the attestation binds evidence, it is not a remote proof.
- `ledger_is_metadata_only` — the ledger records counts and digests, never response content.
- Single-window scope — v0 accounts within one declared window; cross-window composition is
  deferred.

## Deferred work

- Raw `39` / scope ledger, declared consumer-cluster binding, and recorded countermeasure
  receipts — the v1/v2 expansion path documented in `STAGE_4K_EBA_PLUS_ARCHITECTURE.md`.
- Cross-window composition.
- `shellcheck` is unavailable on the build machine; the reproduce script was not shellcheck-linted
  locally — run it in CI if available.

## Release decision

Shipped 2026-07-02 as Stage 4K / Banger EP9: PR #79 merged, tag+release
`v2.20.0-stage-4k-eba` published on merge commit `8c729d7e`. Verified on merged main before
tagging: 1271/1271 unit tests, e2e 19 pass + 1 skip (pre-26 node guard), reproduce
byte-idempotent (`stage4k reproduce: ALL GREEN`), and zero `src/llmShield` diffs.
