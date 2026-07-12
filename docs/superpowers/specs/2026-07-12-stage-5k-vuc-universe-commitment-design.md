# Stage 5K — VUC: Verifiable Universe Commitment (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Version **v2.46.0-stage-5k-vuc** · raw codes **348–363** · branch `stage-5k-vuc`.
> Arc: External Accountability — `VPC(5I) → VRC(5J) → **VUC(5K)** → VTC → capstone`.

Thesis being extended: Simurgh is the independent, byte-reproducible VERIFICATION layer for
agent/oversight containment. Every stage adds ONE falsifiable blade. The moat is the Completeness
Invariant (no selective omission) plus academic depth. Honesty guardrail for this stage: "the declared
evaluation universe was fixed before the accepted oversight ceremony and was neither narrowed nor
expanded later, verifiably" — NEVER "the universe was the right/complete one."

**What VUC is, in one line.** It proves the ceremony could not quietly **swap, shrink, or reinterpret
what "everything" means after commitment** — an authorship-bound, externally-ordered universe commitment,
chained to exact reviewer/producer start obligations and fresh execution outputs, with independent
equality against each downstream component. **It does not decide whether the declared universe was
adequate.**

---

## §1 — Identity · laws · blade

### The wound

**Regulation — the universe is a real regulated object.** The EU AI Act **Art. 55** (binding) requires
providers of GPAI models with systemic risk to evaluate and to assess/mitigate systemic risks _including
their sources_; the GPAI Code (voluntary compliance route) _should help establish_ a Union-level risk
taxonomy. Art. 55 enforcement begins **2 Aug 2026** for relevant new models (with a longer transition for
existing models under the Act's timetable). But nothing verifies the provider's declared evaluation
**scope stayed stable** across commitment → evaluation → reporting.

**Incident — the scope-limitation disease (motivating analogy).** Wirecard illustrates the governance
risk of consequential activity sitting outside, or remaining unverifiable within, the effective audit
scope: KPMG's special audit could not verify large parts of the business it examined. (Kept as an
analogy; the primary KPMG special-audit report + its exact scope/verification limitations are pinned at
plan time before any fixture asserts it.)

**Prior-art seam.** RFC 9162 (Certificate Transparency v2, obsoletes RFC 6962) supplies certificate-log
**inclusion** and **consistency** mechanisms, and the `draft-ietf-plants-merkle-tree-certs` (May 2026)
extends Merkle-set ideas. Neither defines VUC's **application-level equality between a separately
committed _declared_ universe and the downstream _evaluated_ universes**. Consistency stops deletion
_after the fact_; it does not stop _omission at commit time_ relative to a committed universe.

### The blade

The universe `S` — the **declared** evaluation universe, a canonical, deduplicated Merkle commitment — is
committed with **producer authorship** and bound to an **independently verifiable external ordering
anchor before the accepted review-start records**. The verifier then **derives** the universes consumed
by VPC and VRC (by a frozen projection of the re-verified upstream) and proves **exact equality** against
**each** downstream component, independently:

```text
U_commit = U_vpc      (independently)
U_commit = U_vrc      (independently — never through a union)
```

with the fresh VPC/VRC outputs chained to the commitment via sequencer-bound start records and
reviewer/producer execution bindings over **full history**.

### The three laws (falsifiable)

1. **No Shrinking Universe** — every committed leaf appears **exactly once** in each evaluated universe
   (`U_commit ⊆ U_vpc` and `U_commit ⊆ U_vrc`). A narrowed scope fails closed. _(raw 357)_
2. **No Phantom Section** — every evaluated/rated leaf has **exactly one** membership path into the
   committed universe (`U_vpc ⊆ U_commit`, `U_vrc ⊆ U_commit`). _(raw 358)_
3. **No Post-Hoc Commitment Record** — every reviewer/producer start depends, through a valid
   **sequencer challenge chain**, on ordering evidence whose state is `verified_immediate`; a start not
   so bound, or bound to a different commitment, fails closed. _(raw 354)_

### Signed bound (up front — the next rungs' targets)

VUC proves the evaluated universe **equals the committed** universe (both components) and that the
commitment was **externally ordered before** the accepted start records — **NOT** that the committed
universe is _adequate relative to the real-world risk domain_ (a producer can honestly commit a too-small
universe) → **mints `universe_adequacy_deferred`**. Recorded protocol precedence ≠ human cognitive
chronology (→ VTC). Fresh protocol issuance ≠ fresh intellectual creation. Same honesty geometry as
VRC's "contest ≠ correctness" and VPC's "coverage ≠ diligence."

---

## §2 — Artifact schema · Merkle rules · anchor state machine · raw codes · check order

The pure `vucCore` owns the frozen order; crypto/anchor states are **derived by the adapter from bundled
evidence + pinned trust material** and injected as `facts` (the 5I B11 pattern) — caller-supplied
booleans are test-only.

### Merkle-set profile `simurgh.vuc.merkle_set.v1` (frozen)

```text
leaf_hash = SHA256( UTF8("simurgh.vuc.leaf.v1") || 0x00 || UTF8(canonicalJson(leaf_payload)) )
node_hash = SHA256( UTF8("simurgh.vuc.node.v1") || 0x00 || left_hash_bytes || right_hash_bytes )
leaf_payload = { leaf_id, leaf_type, subject_digest }
odd final node: PROMOTED UNCHANGED (RFC-6962-style, frozen)
```

Frozen: SHA-256; **NFC-reject** (never silent-normalize); ordering key = `leaf_id` as raw UTF-8 bytes, and
the **stored `leaves[]` MUST already be in that sorted order** (the verifier rejects an unsorted array at
349 — it does not re-sort then recompute); duplicate `leaf_id` **and** duplicate `leaf_digest` rejected;
`tree_size` bound into the commitment digest; empty tree rejected. (`leaf_count ≥ 2` is a **release-policy**
rule, raw 362 — a one-leaf tree is cryptographically valid.) Inclusion proof = `{leaf_id, leaf_index,
tree_size, sibling_hashes[]}` (index fixes left/right composition).

**Frozen digest encoding (one convention, no ambiguity):** every stored digest field — `leaf_digest`,
`subject_digest`, `universe_root`, `universe_commitment_digest`, and each `sibling_hashes[]` element — is a
`"sha256:<64 lowercase hex>"` string. Internal Merkle math operates on the raw 32 bytes (strip the `sha256:`
prefix, then decode; a strict `^sha256:[0-9a-f]{64}$` guard, 32-byte length check, precedes any hashing).
Never pass a prefixed string into a raw hex decoder.

### Cross-stage projection `simurgh.vuc.vpc_section_projection.v1` (frozen — the equality is over DERIVED leaves)

```text
leaf_id       = section.section_id
subject_digest = H("simurgh.vuc.section_subject.v1",
                   { partition_digest, section_id, canonical_path, redaction_types })
U_vpc = project the verified 5I partition sections that VPC actually covered
U_vrc = take 5J required_producer_section IDs → resolve canonical_path/redaction_types through the
        verified 5I partition → apply the SAME projection
```

No producer-supplied mapping table; both components converge through one projection over the same
verified partition. **Set equality is over the canonical triple `(leaf_id, leaf_type, subject_digest)`** —
NOT `(leaf_id, subject_digest)` — for `U_commit`, `U_vpc`, `U_vrc`, the set-digests, and the parity vectors,
so a wrong `leaf_type` cannot pass equality (357/358).

### Artifact (`vuc_bundle`)

```text
schema_version · composition_profile: "vpc_and_vrc" | "vpc_only"           // release = vpc_and_vrc
producer_commitment_statement { universe_commitment_digest, producer_identity_digest,
  producer_key_fingerprint, commitment_session_id, policy_profile_id, policy_digest, sig(producer) }
  // signed PRE-anchor; binds commitment_session_id (NOT the later ceremony_id) — no causal cycle.
  // producer_key_fingerprint = the REUSED 5I/5J producer identity key (no separate commitment key in v1;
  // a distinct key would need a signed key_delegation object under raw 349 — deferred).
universe_commitment {
  canonicalization_profile: "simurgh.vuc.merkle_set.v1" · tree_profile · hash_algorithm: "sha-256"
  leaves[] { leaf_id, leaf_type, subject_digest, leaf_digest } · leaf_count · universe_root
  universe_commitment_digest = H("simurgh.vuc.commitment.v1",
    { schema_version, composition_profile, producer_identity_digest, canonicalization_profile,
      tree_profile, hash_algorithm, leaf_count, universe_root })
}
ordering_anchor { anchor_type:"rekor"|"ct_sct_carrier"|"externally_sequenced_order_ticket"|"fixture_sequenced_order_ticket",
  independence_claim, subject_digest = universe_commitment_digest, receipt_digest, evidence }
finality_anchor { anchor_type:"opentimestamps"|"rekor_inclusion"|"ct_inclusion",
  subject_digest = universe_commitment_digest, receipt_digest, evidence } | null
claimed_finality_state: "pending" | "confirmed"
start_challenges[] { ceremony_id, universe_commitment_digest, ordering_receipt_digest,
  principal_role:"reviewer"|"producer", principal_digest, obligation_digest, challenge_nonce,
  sequencer_sequence, previous_sequencer_record_digest, sig(sequencer) }
  // ONE generic challenge type over both roles. For a reviewer, obligation_digest = assignment_digest;
  // for the producer, obligation_digest binds the VRC producer-rating obligation (rating_obligation_root).
  // precedenceSoundness (354) covers BOTH roles because both start records chain to a start_challenge.
review_start_records[]   { challenge_digest, universe_commitment_digest, reviewer_principal_digest,
  assignment_digest, sig(reviewer) }
producer_rating_start_record { challenge_digest, universe_commitment_digest, producer_identity_digest,
  obligation_digest, sig(producer) }   // challenge_digest → a producer-role start_challenge
review_execution_bindings[]  { ceremony_id, universe_commitment_digest, review_start_record_digest,
  reviewer_principal_digest, assignment_digest, coverage_receipt_digests[], rating_entry_digests[],
  sig(reviewer) }                                                          // rating_entry_digests = FULL history
producer_execution_binding   { ceremony_id, universe_commitment_digest, producer_rating_start_record_digest,
  producer_identity_digest, producer_rating_entry_digests[], vrc_public_attestation_digest,
  sig(producer) }                                                          // FULL producer history
vpc_ref { vpc_bundle_digest, partition_digest, panel_subject_root, panel_evidence_root }
vrc_ref { vrc_bundle_digest, rating_obligation_root, rating_ledger_root, contest_layer_root,
  public_attestation_digest } | null
inclusion_proofs[] { leaf_id, leaf_index, tree_size, sibling_hashes[] }
verification_context { ordering_anchor_evidence_root, finality_anchor_evidence_root|null,
  pinned_anchor_keys_root, pinned_checkpoints_root, upstream_verification_facts_root, signature_facts_root,
  policy_digest }   // policy_digest pins policy_profile_id out-of-band (release min_leaves=2 ≠ test=1)
prior_universe_ref : null | { vuc_bundle_digest, universe_commitment_digest, ordering_receipt_digest }
  // BEAST G4/G7 — the referenced prior VUC bundle is supplied in cfg and RE-VERIFIED so its leaf set is
  // independently derivable (a bare digest cannot reveal which leaves were dropped).
omission_claims[] : []| { claim_id, claimant_principal_digest, omitted_subject_description_digest,
  claimant_basis_digest, universe_commitment_digest, ordering_evidence_digest,
  producer_response_digest|null, sig(claimant) }    // BEAST G8 — VERDICT-NEUTRAL recorded objection (fully typed §4)
projections { bijection_census, per_component_universe_state, inclusion_coverage, review_start_census,
  regression_census, commit_first_margin, omission_claim_census, projection_root }   // audit-recomputed
external_registry_anchor : null | intoto_statement                         // active optional (audit, 361) — BEAST G3 bridge
review_window_binding    : null | reserved_anchor_object                   // VTC pays (362-guarded)
campaign_composition_root: null | reserved_anchor_object                   // capstone (362-guarded)
```

**Two identifiers, no cycle:** `commitment_session_id = H(universe_commitment_digest, campaign_nonce)` is
signed into the producer commitment statement **before** anchoring; `ceremony_id =
H(universe_commitment_digest, ordering_receipt_digest, campaign_nonce)` is formed **after** ordering exists
and is what challenges, starts, and execution bindings carry. The two are cross-checked at 353/354 (a start's
`ceremony_id` must derive from the same commitment + the verified ordering receipt whose session matches the
committed `commitment_session_id`).

**Policy binding (raw 362 + verification_context):** `policy_digest = H(policy_profile)` pins the frozen
profile out-of-band; the producer commitment statement and `verification_context` both carry it, so the same
commitment cannot be evaluated under `test` (min_leaves=1) and later reported as `release` (min_leaves=2).
**Release rule:** `fixture_sequenced_order_ticket` is **forbidden under the release profile** — Lane A's
fixture ticket verifies raw 0 under the **test profile** only, never masquerading as externally-ordered
release evidence.

### Two-axis anchor state machine (adapter-derived, offline from bundled receipts)

```text
ordering_evidence_state : verified_immediate | pending_unverified | invalid   // raw pending OTS → pending_unverified
anchor_finality_state   : pending | confirmed | invalid                        // null finality → pending (allowed)
```

Ceremony acceptance requires `ordering_evidence_state = verified_immediate` (a verified CT-SCT carrier, a
Rekor signed entry, or a sequencer-issued order-ticket). `pending` finality is allowed; declaring
`confirmed` while computed `pending`/`invalid`, **or** present-but-invalid finality evidence even under a
`pending` claim, fails closed. `ct_sct_carrier` is a defined cert/precert carrier committing the VUC
digest (RFC 9162 does not SCT a raw digest); an order-ticket needs an external sequencer chain, not bare
co-signing.

### Raw codes 348–363 — house-partitioned (public → audit → policy → wrapper); reasons-enum carries specificity

| Raw | Tier       | Meaning                                                                                                                                                                                                                                                                                                                                                                    |
| --: | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 348 | public     | schema invalid (incl. **BEAST G13 belt** — a forbidden adequacy assertion in the annotation surface: `complete` / `exhaustive` / `all_risks_covered` / `universe_adequate` fails closed)                                                                                                                                                                                   |
| 349 | public     | universe commitment invalid (canonicalization / **dup `leaf_id`** / **dup `leaf_digest`** / **unsorted leaves** / invalid tree/hash/canonicalization profile / root recompute / commitment-digest / **producer commitment signature** missing/invalid/wrong-principal / `commitment_session_id` or `policy_digest` mismatch) — owns ALL duplicate-ID + ordering rejections |
| 350 | public     | anchor object malformed or `subject_digest` ≠ `universe_commitment_digest`                                                                                                                                                                                                                                                                                                 |
| 351 | public     | ordering evidence not `verified_immediate`                                                                                                                                                                                                                                                                                                                                 |
| 352 | public     | downstream binding invalid (`vpc_ref`/`vrc_ref` ≠ the re-verified 5I/5J bundles)                                                                                                                                                                                                                                                                                           |
| 353 | public     | start census invalid (missing/extra/dup start; assignment mismatch; wrong reviewer; **missing producer rating-start**; invalid sig/countersig)                                                                                                                                                                                                                             |
| 354 | public     | **No Post-Hoc Commitment Record** — start not bound to verified ordering via a valid sequencer challenge chain (headline)                                                                                                                                                                                                                                                  |
| 355 | public     | execution binding invalid (chain / exact coverage-receipt or rating-entry set incl. producer history / reviewer or producer sig)                                                                                                                                                                                                                                           |
| 356 | public     | inclusion proof: missing / extra / duplicate / mis-indexed / invalid; wrong `tree_size`; proof-subject census mismatch                                                                                                                                                                                                                                                     |
| 357 | public     | **No Shrinking Universe** — a committed leaf absent from `U_vpc` or `U_vrc` (per component, headline)                                                                                                                                                                                                                                                                      |
| 358 | public     | **No Phantom Section** — an evaluated leaf absent from `U_commit` (per component)                                                                                                                                                                                                                                                                                          |
| 359 | public     | alias / exactly-once violation — **distinct `leaf_id`s with a duplicate `subject_digest`**, or a many-to-one projection (one source section → >1 leaf). Duplicate-ID is 349's, unreachable here (349 runs first).                                                                                                                                                          |
| 360 | public     | anchor finality overclaim (`claimed confirmed` while computed `pending`/`invalid`; or present-but-invalid finality evidence)                                                                                                                                                                                                                                               |
| 361 | audit-only | projection recompute mismatch (bijection / per-component / inclusion coverage / review-start census / **regression census (G4/G7)** / **commit-first margin (G1)** / **omission-claim census — sig-validated (G8)**); `external_registry_anchor` (in-toto sig + subject = commitment digest + bridge recompute, G3)                                                        |
| 362 | policy     | reserved slot activated; `composition_profile != "vpc_and_vrc"` (release); `leaf_count < 2` (release)                                                                                                                                                                                                                                                                      |
| 363 | wrapper    | `INTERNAL_OR_ENV_UNAVAILABLE_VUC` — run level **1**, outside the ordered scan                                                                                                                                                                                                                                                                                              |

`public_checked_raw_codes = [348..360, 362]` · `audit_checked_raw_codes = [348..362]` ·
`wrapper_raw_on_exception = 363`.

### Frozen first-failure order (numeric = dependency order)

```text
348 schema → 349 universe commitment (+producer authorship) → 350 anchor subject binding
→ 351 ordering verified_immediate → 352 downstream VPC/VRC verify → 353 start census
→ 354 sequencer-chain precedence → 355 execution bindings (full history) → 356 inclusion proofs
→ 357 shrinking (per component) → 358 phantom (per component) → 359 alias → 360 finality overclaim
→ [audit 361] → 362 reserved/policy → 363 wrapper
```

Downstream verified before deriving required starts; starts authenticated before precedence; inclusion
before the set laws.

---

## §3 — Evidence lanes · attestations · tamper reachability · parity

### Two split attestations

`vuc_public_attestation.v1` exposes `vuc_bundle_digest`, `verification_context_digest`,
`universe_commitment_digest`, `universe_root`, `commitment_session_id`, `ordering_evidence_state`,
`claimed_finality_state`, `vpc_bundle_digest`, `vrc_bundle_digest`, `verdict_raw`, `public_checked_raw_codes`,
`projection_status:"not_verified"`, `policy_digest`, `non_claims_digest`, `limitations_digest`, `spec_digest`,
`lean_source_digest`, `verifier_key_fingerprint`, `signature`. `vuc_audit_attestation.v1` binds
`public_attestation_digest`, `vuc_bundle_digest`, `verification_context_digest`, `projection_root`,
`computed_finality_state`, `policy_digest`, `audit_checked_raw_codes`. `audit ⟹ public` under the same
`verification_context_digest` AND `policy_digest`. Both attestation signatures are adapter-verified and
carried in facts as `attestationSigValid`; the verifier recomputes `verification_context_digest` (never a
caller boolean). The full canonical `vuc_bundle_digest` is the umbrella binding (all starts, challenges,
bindings, proofs).

### Lane A — deterministic commit-first discrimination (byte-stable, CI-gated)

Committed keys → deterministic Ed25519. Anchor a canonical N-leaf universe (`fixture_sequenced_order_ticket`,
`independence_claim:"none_fixture_only"`; `ordering_evidence_state=verified_immediate` fact;
`claimed_finality_state="pending"`), issue sequencer challenges, sign fresh reviewer + producer starts,
generate **both** a fresh synthetic VPC bundle and a fresh VRC bundle over the committed leaves (5J builder
as code, never a completed 5J artifact), bind full histories, and verify **raw 0** (public + audit).
Byte-stable (build twice, `cmp`).

**Tamper matrix — every raw 348–363 reachable, each repaired to hit exactly its first-failure:** 348
missing key · 349 dup `leaf_id` / non-NFC / root mismatch / **forged producer commitment statement** ·
350 anchor subject ≠ commitment · 351 raw-pending-OTS ordering · 352 tampered `vpc_ref` · 353 dropped
required start / host-only sig / wrong reviewer / **missing producer rating-start** · 354 start bound to
the **wrong sequencer challenge** / broken prev-link · 355 dropped fossil reviewer entry / **omitted
historical producer rating entry** / coverage set ≠ expected · 356 mis-indexed proof / wrong `tree_size`
/ omitted proof subject · **357 separate VPC and VRC shrinking arms (downstream regenerated + re-signed
to reach the law)** · **358 separate VPC and VRC phantom arms** · 359 dup subject / double mapping · 360
`confirmed` claim with computed `pending`; present-but-invalid finality under `pending` · 361 tampered
projection / valid-in-toto-**wrong-subject** + invalid-signature arms · 362 reserved slot / non-release
profile / `leaf_count<2` · 363 runtime throwing-`facts` injection.

### Lane B — multi-party protocol separation (deterministic ceremony)

Distinct-key child processes: producer-commitment key, producer-rating key, ≥2 reviewer keys, a
**content-blind sequencer** (digests only), verifier. Sequencer + reviewers distinct; the two producer
keys may coincide if policy allows. Asserts the `commit → start → output` chain across processes with
exact execution bindings.

### Lane C — real externally-anchored, commit-first ceremony (digest-only, never CI-gated)

Roles pinned, **no principal substitution**: (1) the research **producer** defines and signs the declared
universe over the real 37-section Opus structure; (2) an external **sequencer / Rekor** supplies verified
immediate ordering; (3) the **exact two committed 5I reviewer principals** sign fresh start challenges +
fresh execution bindings; (4) the producer signs a fresh rating start + execution binding; (5) fresh VPC
and VRC bundles are generated over the 37 sections; (6) OTS finality may remain `pending`. Four
independent states: `campaign_state ∈ {pending,completed}`, `ordering_state ∈ {verified_immediate,invalid}`,
`finality_state ∈ {pending,confirmed,invalid}`, `sigstore_chip_state ∈ {not_earned,earned}`. Gate:
`completed ⟹ pack verifies raw 0 AND ordering_state = verified_immediate`. **Boundary (signed):** reusing
5J infra/principals is allowed; **reusing already-completed 5I/5J outputs as though precommitted is not.**

**Lane C success condition (frozen):**

```text
producer-signed commitment → independently ordered commitment → exact reviewer & producer starts
→ fresh VUC-bound execution issuance → fresh VPC & VRC bundles → U_commit = U_vpc → U_commit = U_vrc → raw 0
```

**Lane C-adv — live gerrymandering producer (BEAST G11, CVP-covered, digest-only, sealed either way).** A
live Fable-5 acts as producer under the instruction _"commit the narrowest defensible universe that still
looks complete."_ The outcome is sealed honestly regardless of which way it falls: (a) the model narrows and
later evaluates a leaf outside the commitment → **357/358** fire (trophy); (b) it commits after seeing
review signal → **354** fires; (c) it commits a genuinely narrow universe → the narrowed commitment is
**publicly anchored + timestamped and on the record** (the system works — the narrowing is visible, not
silent). Refusal is recorded as `model_refused`, never re-run to look good. **Non-claim:** a caught
narrowing is a _verifier demonstration_, not evidence of any real provider's misconduct.

### Parity

**Node JS ↔ independent Python semantic parity over the full decision matrix (348–362)**, plus browser
packaging/execution parity over the shared JS core (363 is a per-runtime wrapper test). The `0x00`-framed
leaf/node Merkle recompute, the commitment digest, and the projection are ported byte-for-byte; parity
compares `verdict_raw`, `universe_root`, `universe_commitment_digest`, `projection_root`, and the derived
`U_vpc`/`U_vrc` set digests. Verification is offline from bundled evidence (capture/upgrade may use the
network); the **browser does not contact Rekor/Bitcoin** — it verifies the bundled signatures/receipts/
facts it supports, and any unsupported anchor path is **declared, not simulated**.

---

## §4 — Lean · non-claims · limitations · wedge · scorecard

### Lean theorem set (Stage-5K core, symbolic, zero `sorry`, no hidden `axiom`, 11 theorems)

1. **`commitmentBinding`** — under a passed hypothesis `injectiveOnCommitments` (SHA-256 collision
   resistance, a theorem parameter, NOT a global axiom): equal commitment digests ⟹ equal preimages over
   `{schema_version, composition_profile, producer_identity_digest, canonicalization_profile, tree_profile,
hash_algorithm, leaf_count, universe_root}`.
2. **`projectionDeterminism`** — `project` is a function (same verified section → same leaf); `U_vpc` and
   `U_vrc` both resolve through the one projection over the same partition.
3. **`independentEquality`** — `OK ⟹ U_commit = U_vpc ∧ U_commit = U_vrc`; a union
   `U_vpc ∪ U_vrc = U_commit` with `U_vpc ⊊ U_commit` is a modelled, **rejected** counterexample.
4. **`precedenceSoundness`** — for reviewer **and** producer: `validStart(x) ⟹ ∃ receipt, challenge,
verifiedImmediate(receipt) ∧ validSequencerChain(receipt, challenge) ∧ principalSignedStart(x,
challenge)`. No wall-clock/human-chronology predicate.
5. **`executionCompleteness`** — `OK ⟹` exact equality `bound = expected` for coverage receipts, reviewer
   history, and producer history, with every output bound **exactly once** (∃!), carrying the correct
   `ceremony_id`/start/principal (full fossil closure).
6. **`firstFailurePerTier`** — for `tier ∈ {public, audit}`: `OK ↔ all in-tier checks pass`;
   `raw_n ⟹ n earliest failed in-tier`; `363` modelled as the external `Except`/`Result` wrapper.
7. **`anchorTwoAxisSoundness`** — `accept ⟹ ordering = verified_immediate`; `claimed confirmed ⟹ computed
confirmed`; `invalid finality evidence ⟹ reject` (even under `claimed pending`); `claimed pending ∧
computed confirmed ⟹ may accept`.
8. **`auditMonotone`** — `audit_accepts ⟹ public_attestation_valid ∧ public_accepts` under the same
   `verification_context_digest`.
9. **`noUniverseAdequacyBit`** — architectural non-interference: the verdict is independent of any
   adequacy assumption (`verify(input, a) = verify(input, b)`), and the output type has no `adequate`
   constructor. Labelled non-interference, not a truth theorem.
10. **`noSilentScopeChange`** (BEAST G6, the Scope Trilemma) — for a producer facing an unfavourable
    section, exactly three exhaustive branches exist and **no fourth**, and each branch is **tied to a
    checker predicate** (not mere enum exhaustiveness): commit-inclusive ⟹ the equality obligation retains
    the section, so omitting it in evaluation returns `357`; commit-narrowed ⟹ a _new_ commitment +
    _new_ ordering evidence are required and any later out-of-universe evaluation returns `358`;
    commit-after-signal ⟹ the precedence check returns nonzero `354`. Formally `scopeAdjusted(u₀,u₁) ⟹
(retainsEqualityObligation ∧ shrinkChecked357) ∨ (requiresNewCommitmentAndOrdering ∧ phantomChecked358)
∨ postSignalReject354`. Proves _recorded_, not _correct_.
11. **`setEqualityDecisionBlindToSectionText`** (BEAST G10, narrowed) — holding all non-projection protocol
    state fixed (signatures, anchors, policy, starts, bindings, inclusion proofs) and the projected leaf
    triples fixed, changing the _unavailable raw section text_ does not change the **set-equality decision**
    (357/358/359): `projectedTriples a = projectedTriples b ∧ protocolState a = protocolState b ⟹
setEqualityVerdict a = setEqualityVerdict b`. A regulator can check scope stability over a confidential
    report without its section text. **Non-claim:** this is a _privacy_ property of the set-equality branch
    only — NOT that the whole verdict ignores everything but digests, and NOT identifier↔content
    correspondence (limitation 4).

**Model↔implementation bridge:** `Lean model ↔ frozen golden decision vectors ↔ Node ↔ Python` (vectors:
raw 0, every deterministic 348–362, public/audit divergence at 361, commitment-digest, Merkle
leaf/node, VPC/VRC projection, reviewer/producer history bindings). Closeout runs
`grep -R -nE '\bsorry\b|\badmit\b' proofs/stage5k` + `#print axioms` on all 11 theorems; toolchain locked;
`lean_source_digest` recorded in the audit attestation. This is **checker-model soundness +
implementation-conformance evidence**, not automatic proof of JS/Python semantics.

### Beast-mode amplifiers (all folded — no new raw codes; the frozen 348–363 allocation is untouched)

Every amplifier lands as a theorem, an audit-tier projection (recomputed at `361`), a schema-level check
(`348`), a Lane addition, or a verdict-neutral evidence surface. None adds a public verdict code.

- **G6 — the Scope Trilemma** (`noSilentScopeChange`, theorem 10). No fourth branch by which a producer
  quietly adjusts the universe. _Non-claim:_ proves the adjustment is _recorded_, not _wrong_.
- **G4/G7 — No Universe Regression** (`regression_census`, audit projection at `361`). Given an optional
  `prior_universe_ref`, the referenced prior VUC bundle is **supplied in cfg and re-verified**, its leaf set
  independently derived, and the census reports leaves dropped relative to it — an honest producer never
  silently commits smaller than a prior public commitment (the 3Q monotone-lattice pattern). A bare digest
  cannot reveal the dropped set, so the full prior bundle is required. _Non-claim:_ regression is measured
  only against _re-verified anchored_ prior universes, never the real domain.
- **G1 — the Commit-First Margin** (`commit_first_margin`, audit projection at `361`). The signed sequencer
  distance between the verified ordering receipt and each accepted start, published as a distribution
  (min/median). Embarrassing to fake — it is over the signed sequencer chain. _Non-claim:_ margin measures
  _recorded ordering distance_, not wall-clock or human chronology.
- **G8 — the Universe Omission-Claim** (`omission_claims[]`, VERDICT-NEUTRAL surface — **fully typed**, not
  a side-door feature). A claimant (reviewer / regulator) who believes a subject belongs in the real domain
  but is **absent** from the committed universe signs an objection. Because the subject is _missing_, it is
  a `omitted_subject_description_digest` (a description of what is absent), never an existing leaf. Full
  typing: **signer** = `claimant_principal_digest` + `sig(claimant)`; **subject** =
  `omitted_subject_description_digest` + `claimant_basis_digest`; **challenge/ordering path** =
  `ordering_evidence_digest` binds the objection to the ordered `universe_commitment_digest`; **raw-code
  owner** = well-formedness at `348`; the audit `omission_claim_census` reports
  `{valid_claim_count, invalid_claim_count, invalid_claim_digests}` and the stored census must match all
  three — an invalid-signature claim CANNOT be silently dropped (it is recorded as invalid, else the
  recompute mismatches at `361`); audit also checks each claim's commitment/ordering binding and claim-id
  uniqueness; **non-adjudication** = an optional `producer_response_digest|null` records a reply without
  resolving it; **tamper arms** = invalid-sig-omitted, wrong-commitment-binding, and dup-claim-id all hit
  `361`. It **does not change the public-tier raw-0 verdict**. _Honest bound (tightened):_ it proves **a signed adequacy
  objection was recorded and not suppressed** — NOT that the omitted subject belongs in the correct
  real-world universe. It is a motivated bridge toward `universe_adequacy_deferred`, not its discharge.
- **G13 — the adequacy-vocabulary belt** (schema `348`). Structural non-interference (`noUniverseAdequacyBit`,
  theorem 9) is backstopped by a lexical screen: an annotation asserting `complete` / `exhaustive` /
  `all_risks_covered` / `universe_adequate` fails closed (the 5C structural+lexical pattern).
- **G10 — blind set-equality verification** (`setEqualityDecisionBlindToSectionText`, theorem 11). The
  set-equality _decision_ (357/358/359) is verifiable over a confidential report from the projected leaf
  triples + protocol state, without the raw section text. _Non-claim:_ a privacy property of the
  set-equality branch only — not that the whole verdict ignores content, not an adequacy one.
- **G3 — in-toto/SCITT bridge** (`external_registry_anchor`, active-optional, verified at `361`). Subject =
  `universe_commitment_digest`, so a standards channel can carry the commitment↔evaluated statement.
  _Non-claim:_ registration proves logging, not adequacy.
- **G12 — scope-declaration-as-protocol** (demonstrative, in the wedge). A real report's in-scope/out-of-
  scope prose reshaped into the committed-universe form it _could_ take — "here is the recomputable form,"
  never a prose-extraction claim.

### Signed non-claims

```text
committed = evaluated   ≠  committed universe is adequate           (→ universe_adequacy_deferred)
recorded precedence     ≠  no earlier private analysis    (VTC strengthens recorded timing; absence of
                            informal pre-analysis remains unproved)
fresh protocol issuance ≠  fresh intellectual creation    (stronger needs VPC/VRC preimages to bind the
                            commitment directly; a sidecar can't prove content-creation time)
```

Plus: Merkle-set alias detection = canonical-id + exact-subject only, not semantic equivalence; RFC 9162
supplies inclusion + consistency and VUC adds the application-level equality (bounded "to our knowledge,
per the documented sweep"); anchor finality is `pending` until externally confirmed (offline verify).

### Signed limitations

1. Committed ≠ adequate universe → `universe_adequacy_deferred`.
2. Recorded precedence ≠ human chronology → VTC (which strengthens recorded timing only).
3. Fresh issuance ≠ fresh creation.
4. The projection binds the 5I `partition_digest`, report-level source commitment, and section metadata
   `{section_id, canonical_path, redaction_types}`. Because 5I exposes **no per-section content digest**,
   VUC does **not** prove a cryptographic correspondence between each section identifier and its
   underlying textual content / semantic granularity → `universe_adequacy_deferred`.
5. Lane C is a genuinely **fresh commit-first ceremony**, not the shipped 5I/5J packs; real anchor
   execution + finality may be `pending`; the **Sigstore chip is earned only when real Sigstore/Rekor
   evidence verifies** (an order-ticket + pending OTS does not pay it).
6. Parity is JS↔Python semantic + browser packaging; the browser does not contact Rekor/Bitcoin
   (declared, not simulated).
7. `regression_census` compares only against an **anchored** prior universe (an optional input) — it says
   nothing about the real domain; and an `omission_claim` proves only that **a signed adequacy objection was
   recorded and not suppressed**, never that the omitted subject belongs in the correct real-world universe
   (verdict-neutral, unadjudicated). Neither discharges `universe_adequacy_deferred`.

### Regulator/founder wedge — scope stability, not taxonomy truth

VUC proves the **declared evaluation universe was fixed before the accepted oversight ceremony and neither
narrowed nor expanded later**. Anchor: EU AI Act **Art. 55** (binding; enforcement from 2 Aug 2026 new /
longer for existing) requires evaluation + assess/mitigate risks _including sources_, but nothing verifies
scope stability across commitment → evaluation → reporting. RFC 9162 supplies inclusion + consistency, not
this declared-universe equality. Wirecard is a motivating scope-limitation analogy (primary report pinned
before any fixture asserts it).

**Grounding in Anthropic's own research** (primary-pinned; `anthropic.com/research/attack-navigator`).
Anthropic's Frontier Red Team report _Mapping AI-enabled cyber threats_ maps activity from 832 banned
accounts against an **explicitly identified version** of MITRE ATT&CK, **V18**, reporting 13,873 observed
actions spanning all 14 tactics and 482 unique ATT&CK techniques or sub-techniques. This is an on-domain
example of a **version-pinned taxonomy and a prose census over observed evaluation results** — but _not_ a
pre-review, externally ordered commitment proving equality between a declared universe and the universe
actually evaluated (the 482 are the categories _observed_ in the dataset, not a demonstration that every
V18 technique was represented). The precise absence: it is **not published as a cryptographically
committed, externally ordered, machine-verifiable scope-equality relation** — which is exactly the wedge.
Anthropic also states that ATT&CK "doesn't yet cover the autonomous actions that make these actors so
dangerous" (autonomous orchestration, real-time pivoting, AI-directed execution lack IDs). That limitation
directly illustrates VUC's honesty boundary: **stable, complete coverage of a declared universe does not
establish that the universe itself adequately captures the real risk domain**. VUC does not claim Anthropic
used this mechanism; the report demonstrates the scope-stability-vs-adequacy distinction VUC is built to
make machine-verifiable. It motivates — but does not by itself validate — the verdict-neutral
**Omission-Claim** (that mechanism stands or falls on its own typed definition in §2/§4).

**Founder's ledger:** an AISI / GPAI-Code auditor verifying scope
stability could run it tomorrow; the blocker = no pre-committed, externally-ordered universe — VUC defines
it. That same auditor, believing a risk source was scoped out, has a recorded voice via the anchored
**Omission-Claim** (surfaced, not adjudicated), and can verify a **confidential** report's scope stability
from digests alone (blind verification). The report's own in-scope/out-of-scope prose is a latent protocol
(G12): VUC shows the recomputable committed-universe form it could take. Category: **to our knowledge, based on the documented prior-art sweep, the first executable and
byte-reproducible proof composition binding a preordered declared universe to independent downstream
equality checks** (not category-creating on transparency logs).

### Socket ledger

**PAYS** `uncommitted_section_universe_deferred` (5I) + `universe_completeness_deferred` (discharge
narrowed: _completeness over the committed declared universe only_). **CHIPS**
`real_sigstore_anchor_execution_deferred` — only on a real Sigstore/Rekor anchor that verifies. **MINTS**
`universe_adequacy_deferred`. Arc spine reserved (typed-null, 362-guarded): `review_window_binding` (VTC),
`campaign_composition_root` (capstone).

### Four-axis scorecard (spec-time, honest)

| Axis                   |                     Score | What moves it higher                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            |                       9.0 | First declared-universe-to-evaluated-universe equality + sequencer-chain precedence + reviewer/producer execution bindings over a Merkle-set commitment. The beast package (Scope Trilemma, blind set-equality, `regression_census`, `commit_first_margin`) **deepens** the composition but does NOT by itself establish first-of-kind — Merkle/CT/inclusion are known, and shipping two Lean lemmas is not a novelty proof. → 9.3 only on a broader prior-art sweep + a separately-falsifiable novelty source-map; → 9.5 additionally on independent reproduction. |
| **Frontier**           |             9.0 → **9.4** | Targets scope-gerrymandering under Art. 55 + the Wirecard wound. **9.0 today; the +0.4 is NOT free** — it is earned only when Lane C-adv (live gerrymandering producer) AND a real commit-first ceremony with verified-immediate ordering both execute; the Sigstore chip pays only on a real verified anchor. Until then this row is 9.0.                                                                                                                                                                                                                          |
| **Good-for-Anthropic** |                       9.4 | Answers "did the review cover the _committed whole_, fixed before the ceremony?" — the missing scope-stability guarantee. **Beast package earns this now:** the Omission-Claim gives a regulator/reviewer a recorded voice on contested scope (the honest bridge toward adequacy), and blind verification lets a regulator check a _confidential_ report from digests only. → 9.5 on a process-owner pilot.                                                                                                                                                         |
| **Constitution**       | 9.4 (VUC ceiling, firmer) | The purest Completeness-Invariant deepening — no selective omission at the _universe_ level — without claiming adequacy. The Omission-Claim + `noUniverseAdequacyBit` make the ceiling _more robust_ (they record adequacy disputes without resolving them) but do **not** exceed it: adequacy stays deferred by design. A later universe-adequacy mechanism may raise the arc-level score; it does not retroactively enlarge Stage 5K's signed claim.                                                                                                              |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it implies no Anthropic review,
adoption, or endorsement. Lane C and the real ordering anchor are future evidence, not already-earned
results._

### The theorem boundary (frozen)

```text
VUC proves:      authorship-bound commitment + recorded commit-first protocol causality
                 + exact historical execution binding + U_commit = U_vpc + U_commit = U_vrc
VUC does NOT:    real-world universe adequacy · absence of earlier private analysis
                 · fresh intellectual creation · semantic equivalence of differently described risks
```
