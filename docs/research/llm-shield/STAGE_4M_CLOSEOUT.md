# Stage 4M / VXD — Closeout

**Motto:** _AnthropicSafe First, then ReviewerSafe._ Carries the 4L non-claims
(`not_sybil_closure`, `not_structuring_closure_without_provider_binding`) plus the 4M additions.

**Tag target:** `v2.22.0-stage-4m-vxd` (verify on merged `main`; `git tag --sort=-creatordate`
first — latest must read `v2.21.0-stage-4l-ccb`).

## What shipped

Signed merge-only cluster-graph evolution + retroactive re-scoring proving the anti-monotonicity
lemma, disclosure-claim binding by chain position, a respondent contest path with acknowledgement
receipts, an Article-73/55 projection surface, a Lean-4 machine-checked lemma, a single-file
browser verifier, and a tier-aware offline verifier. **Zero `src/llmShield` changes;** raw codes
43–46 additive; Q0–Q9 byte-untouched.

Module layout (`tools/simurgh-attestation/stage4m/`): `core/` (IO-free, shared by both
frontends) — `canonical`, `mergeLatticeCore`, `retroScoreCore`, `disclosureCore`,
`respondentCore`, `verdictCore`; `node/` — `verify-stage4m`, `build-stage4m-fixtures`,
`build-stage4m-attestation`, `article73Projection`, `signing-node`, `fs-bundle-loader`;
`browser/` — `build-browser-verifier`, `browser-adapter`. Proof:
`proofs/stage4m/AntiMonotonicity.lean` (+ `lean-toolchain`, CI job).

## Raw codes

- **43** `merge_event_invalid` — split, budget inflation, chain break, dangling ref, schema/raw-identity.
- **44** `anti_monotonicity_violation` — a committed breach un-breaches under a coarsening.
- **45** `disclosure_claim_conflict` — claim fails to recompute, or binds after its own chain entry.
- **46** `respondent_contest_invalid` — contest/ack signature, dangling ref, or non-enum type.

Raw 39 stays reserved. All map to run-level 1; unknown codes fail closed to 3. Exit-map goldens
for 4H/4K/4L refreshed in the same commit as the additive codes.

## Falsifier matrix (observed = expected)

| Bundle / arm                     | Expected                                                                     | Observed |
| -------------------------------- | ---------------------------------------------------------------------------- | -------- |
| clean-chain (V1, V6)             | raw 0                                                                        | raw 0    |
| crown-reveal (V-CROWN, V10, V17) | raw 0; newly_revealed = 1 cluster; 1 `singleton_merge_contradiction` finding | matches  |
| no-merge-control (V15)           | raw 0; zero rescore records                                                  | matches  |
| split-event (V2)                 | raw 43 `non_coarsening_split`                                                | matches  |
| inflated-budget (V3)             | raw 43 `budget_inflation`                                                    | matches  |
| broken-chain (V4)                | raw 43 `parent_digest_mismatch`                                              | matches  |
| tampered-window (V5)             | raw 44 `anti_monotonicity_violation`                                         | matches  |
| disclosure-conflict (V7)         | raw 45 `claim_recompute_mismatch`                                            | matches  |
| disclosure-backdated (V8)        | raw 45 `commitment_sequenced_after_disclosure`                               | matches  |
| pincer-violated (V9)             | raw 45 `pincer_slot_not_null`                                                | matches  |
| forged-contest (V11)             | raw 46 `signature_invalid`                                                   | matches  |
| dangling-contest (V12)           | raw 46 `dangling_record_reference`                                           | matches  |
| forged-ack (V17)                 | raw 46 `dangling_contest_digest`                                             | matches  |
| projection tamper (V13)          | recompute differs                                                            | matches  |
| merge byte-flip (V14)            | verifier nonzero                                                             | matches  |
| browser parity (V16)             | verdicts byte-identical to node                                              | matches  |
| proof-text tamper (V18)          | manifest digest + CI Lean check                                              | CI-gated |
| tier-P alone (V19)               | raw 0, ledger checks `not_in_tier`                                           | matches  |
| tier equivocation (V20)          | raw 22 `attestation_chain_mismatch`                                          | matches  |
| no consumer ids (V21)            | zero identifiers under fixtures                                              | matches  |

## Verification transcript

- `bash scripts/reproduce-llm-shield-stage4m.sh` — **ALL GREEN**, exit 0, twice, byte-idempotent
  on deterministic files, clean tree after. **Requires Node 26** (byte-stable reproduce).
- `node --test tests/unit/llmShield/stage4m/*.test.js` — 48 pass, 0 fail.
- `node --test --test-concurrency=1 tests/e2e/llmShield/stage4m/vxdFullNet.test.js` — 5 pass, 0
  fail (closed export surface, tamper matrix, cross-stage invariants, dual-safety arms).
- `git diff main...HEAD -- src/llmShield` — empty (enforced by the E2E net's zero-src guard).
- Browser verifier: `docs/research/llm-shield/evidence/stage-4m/verify-stage4m.html`, sha256
  `76860c0b7a0542610d7ad7adb3fd940d944e139e5c1f83db774c18249ad8a445`.
- Lean proof (`proofs/stage4m/AntiMonotonicity.lean`) is gated by
  `.github/workflows/stage-4-lean-proofs.yml`. **Verified locally** on 2026-07-03 under
  `leanprover/lean4:v4.15.0` (installed via elan): `lean proofs/stage4m/AntiMonotonicity.lean`
  exits 0 with no `sorry`; the V18 arm (closing `omega` → `trivial`) reproduces a real type error
  (`tactic 'assumption' failed`, goal `⊢ sumExposure cs > newBudget`), so a broken proof is
  demonstrably rejected. It sits inside the wider **Stage 4 formal core** (`proofs/README.md`):
  `ExitLattice.lean` (wrapper totality + fail-closed, 4H..4M) and `Structuring.lean` (per-account
  budgets miss what cluster budgets catch, 4K→4L) also type-check clean.

## Non-claims (19, signed) and known limitations (13, signed)

Non-claims: the thirteen 4L non-claims plus `not_legal_compliance_certification`,
`contest_is_recorded_not_adjudicated`, `merge_evidence_not_verified`,
`retro_rescoring_is_arithmetic_not_new_measurement`,
`disclosure_binding_is_chain_ordering_not_truth`, `projection_is_output_surface_not_filing`.

Known limitations: `merge_evidence_not_verified`, `no_merge_no_reveal`,
`demand_side_evidence_digest_reserved_unbound`, `basis_digests_opaque_slots`,
`respondent_key_binding_out_of_band`, `proof_is_of_model_not_implementation`,
`acknowledgement_is_receipt_not_ruling`, `browser_verifier_is_projection_not_normative`,
`disclosure_is_adversary_feedback_bounded_not_eliminated`, `tier_r_slice_machinery_deferred`,
`bundle_recipient_vetting_out_of_band`, `window_budgets_assumed_consistent_with_graph_policy`,
`singleton_contradiction_not_yet_bound_to_4l_cardinality_digest`.

## Out of scope (deferred, seeded)

Demand-side pincer binding (slot reserved-null, V9 enforces); Tier-R respondent slice machinery
(follow-up stage "SRD"); contest adjudication (permanently out of lane); 4N Extraction
Seismograph; DSA statement-of-reasons projection (companion / 4M-b); ZK compliance lane (noted,
never a silent swap); live regulator filing.
