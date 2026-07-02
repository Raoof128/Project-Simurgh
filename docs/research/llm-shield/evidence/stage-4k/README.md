# Stage 4K (EBA) — Evidence Pack

These artifacts are emitted by `tools/simurgh-attestation/stage4k/emit-stage4k-evidence.mjs`,
which refuses to write anything if any observed verdict diverges from the committed expected
matrix. They are copied from the `under-budget` committed bundle plus a generated summary.

## Artifacts

- `extraction-ledger.json` — the frozen, metadata-only per-consumer/window exposure ledger
  (counts + salted digests; no response content).
- `budget-policy.json` — the declared budget policy (window, frozen class weights, per-consumer
  budgets).
- `extraction-attestation.json` — the faithful per-consumer record (weighted totals, budgets,
  `under_budget` verdicts, `denied_over_budget`). Over-budget consumers are recorded honestly,
  not hidden.
- `eba-manifest.json` — the stage4k-owned, domain-separated Ed25519 manifest binding the ledger,
  attestation, policy, and the shared 4H DFI certificate digest.
- `extraction-summary.json` — the Q8 conjunction (clean run all under budget; over-budget caught
  at raw `30`).

## Byte-stability note

`extraction-ledger.json`, `extraction-attestation.json`, and the exposure matrix are
byte-stable: a fresh `build-stage4k-fixtures.mjs` regenerates them identically, and the
reproduce script byte-compares them. `eba-manifest.json` signature bytes are **key-bound** —
each rebuild draws a fresh key, so the manifest signature changes while the bound digests do
not. Integrity is guaranteed by the signed manifest, not by whitespace; these files are
excluded from Prettier so the JSON.stringify byte-identity holds.

## Non-claims

A budget breach is **not** proof of capability transfer or distillation
(`not_capability_transfer_proof`); consumer binding is a declared input, not Sybil/collusion
closure (`not_sybil_collusion_closure`); the budget is declared policy, not a measured safety
bound (`budget_is_declared_policy_not_safety_bound`); signal-class weights are declared policy
(`weights_are_declared_policy`); the event stream is a synthetic fixture
(`substrate_is_synthetic_fixture_stream`); `consumer_id_digest` is a salted pseudonym, not
anonymisation (`consumer_digest_is_pseudonymous_not_anonymous`); offline re-derivation assumes
the reviewer runs the committed tooling (`attestation_assumes_reviewer_runtime`); the ledger is
metadata-only (`ledger_is_metadata_only`).

## Reviewer

Run the six-test checklist in `../../STAGE_4K_REVIEWER_CHECKLIST.md`. You do not need to trust
us; re-derive everything with `scripts/reproduce-llm-shield-stage4k.sh`.
