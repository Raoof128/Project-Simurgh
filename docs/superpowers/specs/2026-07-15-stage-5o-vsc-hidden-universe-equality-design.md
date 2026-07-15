# Stage 5O — VSC: Hidden-Universe Equality (design)

**Status:** Section 1 FROZEN (identity, laws, honest core). Review edits folded: A3 claim ceiling + `not_proof_of_real_execution`; provider-agnostic public wording with the pinned seam deferred to the Section 13 source map; indexed-universe equality replacing set equality; two-layer position-binding split + `not_proof_of_unopened_leaf_preimage_index_consistency`. Sections 2–13 pending.
**Release target:** `v2.50.0-stage-5o-vsc-hidden-universe-equality`
**Motto:** _ClaimSafe first, then ReviewerSafe._
**Pays:** signed IOU **I6 `hiding_scope_commitment`** — in full, **on release acceptance** (not on spec approval).
**Mints:** nothing. `execution_origin_witnessing` is recorded as a successor-work **candidate**, not a socket; no IOU is minted until a future stage is selected and scoped.
**Reuses (frozen, unmodified):** the Stage 5M three-ecology external-anchor quorum, applied to the scope commitment anchor.
**Does NOT reuse:** Stage 5K's `simurgh.vuc.merkle_set.v1` leaf profile. Verified unsalted — `leafHash({leaf_id, leaf_type, subject_digest})` — therefore **binding but not hiding**, and canonicalised by sorting on `leaf_id`, which conflicts with position binding. Stage 5O defines a new domain-separated salted, position-bound profile.

**Amendment A1 folded:** Section 2 threat analysis added four signed claim ceilings and exposed an exact-versus-lower-bound ambiguity in the unopened-preimage statement. Section 1 now defines a monotone canonical non-claim union and delegates probability semantics to PC-0. **No blade, law, release predicate, or socket changed** — A1 is a claim-discipline correction, not a redesign.

---

## Section 1 — identity, laws, honest core

### Blade (one)

A **privately committed evaluation universe** whose committed, executed, and reported members are proven **exactly equal as indexed universes** under a salted, position-bound identity profile — without disclosing the unchallenged members. The commitment is externally anchored before a **predeclared future block height**; a public beacon derived from that block selects `k` indices the producer could not predict; each selected index must open to a valid case, salt, and authentication path.

Equality is the blade. The beacon challenge is what gives hiding teeth.

### Identity — indexed universes, not ordinary sets

Ordinary set equality discards ordering, collapses duplicates, and cannot express position binding. Stage 5O's equality is **function equality over a shared index domain**:

```text
dom(S) = dom(E) = dom(R) = {0, 1, ..., N-1}

∀ i ∈ dom(S):
  S[i].leaf_id = E[i].scope_leaf_id = R[i].scope_leaf_id
```

Where `S` is the committed scope, `E` the execution records, and `R` the reported results.

> **Equality means exact equality of index domains and position-bound leaf identities — not unordered payload-set equality.**

Each artifact's encoding must be a **bijection onto `{0..N-1}`**: exactly `N` entries, indices forming exactly that set, no repeats. This is a structural check over all `N`, requiring no openings and no payload disclosure.

Deterministically caught by this definition:

- missing indices;
- additional indices;
- duplicate-index laundering;
- reordering;
- substitution of one case for another;
- execution or result rows bound to the wrong scope member.

The private case payloads never appear in the execution and result artifacts. Only their common salted `leaf_i` identity does — so the equality check is itself non-disclosing.

**Coverage and guarantee, stated precisely.** Two distinct meanings of "position binding" are separated: the canonical tree position of the _public_ identifier (deterministic over all `N`), and the index embedded in the _private_ preimage (validated only for openings).

| Property                                         | Coverage   | Guarantee                                   |
| ------------------------------------------------ | ---------- | ------------------------------------------- |
| Canonical tree position → `leaf_id`              | all `N`    | **Deterministic**                           |
| Scope / execution / result identity equality     | all `N`    | **Deterministic**                           |
| Bijection onto `{0..N-1}`                        | all `N`    | **Deterministic**                           |
| Private preimage uses the **expected** index `i` | opened `k` | Probabilistic over the malformed population |
| Case and salt authenticate to `leaf_id`          | opened `k` | Deterministic per opening                   |

**Layer 1 — tree-position and cross-artifact identity equality.** The canonical tree shape places each `leaf_id` at declared tree position `i`, so the commitment itself binds `tree position i → leaf_id` for all `N` leaves. Combined with `S[i].leaf_id = E[i].scope_leaf_id = R[i].scope_leaf_id`, this deterministically proves whole-universe **positional identifier equality** — no openings, no payload disclosure.

**Layer 2 — leaf-preimage index consistency.** For each challenged position `i`, the verifier confirms:

```text
leaf_id = H( domain || epoch || expected_index_i || salt_i || H(case_i) )
```

The critical word is **expected**. Frozen checks, for every challenged `i`:

1. The challenge selects canonical outer position `i`.
2. The authentication path proves `leaf_id` occupies tree position `i`.
3. Recalculation injects the **verifier-known** `i`.
4. A producer-supplied `index_i` must equal `i`, or be omitted as redundant (schema decision deferred to Section 4).
5. Any preimage internally built with `j ≠ i` fails.

A verifier that recomputes from the opening's _self-declared_ index validates the producer's claim against itself, and the malformed leaf survives. The index field must never be trusted as an input to its own check.

**What an internal-index mismatch buys the producer.** It does _not_ bypass the committed list, cardinality, whole-universe cross-artifact equality, or tree-position binding of the public `leaf_id`. It _does_ buy a population of schema-malformed leaf preimages that remains invisible unless sampled.

If **exactly** `J` unopened leaves violate the declared opening predicate, a uniformly sampled challenge of `k` distinct indices detects at least one with **exact** probability `1 − C(N−J, k) / C(N, k)`. If **at least** `J` leaves violate the predicate, that expression is a **lower bound**. If the predicate cannot recognise the defect, the guarantee does not apply. An internal-index mismatch is counted among the defects `J` under the opening predicate — it needs no separate machinery.

All probability claims are subject to **PC-0**'s validity domain, predicate-precommitment, beacon assumptions, and canonical rational encoding rules.

The consequence is **not cosmetic across compositions.** Within Stage 5O's own verification context the mismatch gains the producer nothing exploitable, because every consumer reads `leaf_id` at its bound tree position. But a future composition that detaches a leaf from its Merkle position and relies on the embedded index would activate the dormant population. Stage 5S composes frozen sub-evidence; a latent defect in a composed input is a defect of the composition. Hence the signed limitation rather than a reassurance.

### The three laws

1. **No Scope After The Fact** — the private universe and its cardinality `N` are committed and externally anchored before the predeclared challenge height. `N` is bound _into_ the commitment, not signed beside it.
2. **No Hidden Shrinkage** — the committed, executed, and reported universes are exactly equal as indexed universes under the Stage 5O salted, position-bound identity profile.
3. **No Unopenable Scope** — every beacon-selected index must produce a valid case, salt, and authentication path. Refusal, absence, duplication, or malformation **fails closed**.

### Honest core — baseline and accumulation rule

**Accumulation rule (A1).** Section 1 freezes the **baseline** honest core. Later reviewed sections may **add** non-claims when their threat analysis exposes a new claim ceiling. The release envelope signs the canonical **union** of all section-level non-claims. **No later section may remove, weaken, or silently rename a previously frozen non-claim.** The limitations remain normative and signed — "not an appendix" is preserved in substance — while the spec is permitted to learn without pretending Section 1 predicted every future seam.

**Freeze invariant.**

```text
release_non_claims
=
ordered_deduplicated_union(
  section_1_baseline_non_claims,
  section_2_added_non_claims,
  ...
)
```

Ordering is **lexicographic by machine field**, fixed and canonical, so a non-claim's section of origin cannot affect the signed bytes.

**Section 1 baseline:**

```text
not_scope_adequacy
not_zero_disclosure
not_proof_of_real_execution
not_proof_of_unopened_leaf_preimage_index_consistency
not_proof_of_beacon_unbiasability_or_finality
not_proof_of_salt_entropy
not_semantic_junk_detection_beyond_declared_predicate
not_proof_that_the_private_scope_was_well_chosen
```

**Added by Section 2** (threat analysis; see that section for each ceiling's wording):

```text
not_proof_of_case_distinctness
not_proof_of_global_cross_verifier_disclosure_budget
not_proof_of_complete_disclosure_history_without_committed_ledger
not_proof_of_cross_commitment_corpus_reuse
```

> Selective openings reveal the challenged cases. All unchallenged case payloads remain undisclosed under the stated commitment assumptions.

> **`not_proof_of_real_execution`** — Stage 5O proves equality and consistency among committed scope identities, execution-record identities, and reported-result identities. It does not independently prove that every execution record arose from a real model or system invocation.

> **`not_proof_of_unopened_leaf_preimage_index_consistency`** — The verifier deterministically checks each public leaf identifier's canonical tree position and cross-artifact equality. It validates the private preimage's embedded index only for beacon-selected openings.

A hidden universe that is fixed is not a universe that is right. **Hiding makes gerrymandering invisible**; the beacon challenge bounds _stuffing_, never _taste_.

### Attack taxonomy — what is deterministic, what is probabilistic, what is neither

| #   | Attack                                                                      | Caught                                               | By                                         |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| A1  | Commit the scope after seeing results                                       | **Deterministically**                                | future-height anchor (Law 1)               |
| A2  | **Structural omission** — census has ≠ `N` entries, or index domains differ | **Deterministically**                                | indexed-universe equality (Law 2)          |
| A3  | **Record fabrication** — `N` records exist, some invented                   | **Conditionally probabilistic, possibly not at all** | beacon opening, bounded by predicate power |
| A4  | **Scope stuffing** — `N` real executions, `J` of them junk                  | **Probabilistically** at `P_detect(N,J,k)`           | beacon opening                             |
| A5  | **Challenge manipulation** — refuse or malform an opening                   | **Deterministically**                                | fail-closed (Law 3)                        |
| A6  | Unzip the corpus via repeated audits                                        | **Bounded**                                          | cumulative disclosure budget               |

**Missing execution is not a probabilistic detection event.** Commit `N` and report fewer, or shift the index domain, and the census comparison fails with certainty. The sampling probability never qualifies the equality law.

**A3 — record fabrication, stated without overclaim:**

```text
Caught: conditionally probabilistic, and potentially undetectable.

If at least J fabricated records violate the declared audit predicate,
sampling detects at least one with P_detect(N, J, k).

If fabricated records satisfy the predicate, Stage 5O proves membership
and cross-artifact consistency, not real execution occurrence.
```

> **The declared audit predicate's discriminating power is the ceiling on what opening can detect.** If the predicate cannot distinguish a fabricated execution record from a real one, an opening proves _membership_, not _execution_.

Deterministic execution-occurrence evidence would require an independent trust root — provider-signed invocation receipts, a producer-independent sink or witness, hardware-backed attestation, or a challenge-response ceremony controlled outside the producer. A producer-signed response digest is **not** sufficient: a producer controlling both the signing key and the execution environment can sign a fabricated digest. That is a separate blade, recorded as the successor-work candidate `execution_origin_witnessing`.

### Conditional detection probability (not a soundness bound)

```text
P_detect(N, J, k) = 1 − C(N−J, k) / C(N, k)
```

Sampling is **without replacement** over `k` distinct indices; the hypergeometric form is exact. The with-replacement approximation `1 − (1−J/N)^k` is not used: it understates detection (at `N=1247, k=30`: `J=1` → 0.023780 vs exact 0.024058; `J=62` → 0.783451 vs exact 0.787431). The error is conservative rather than an overclaim, but exactness is free.

**Encoding:** exact integer numerator and denominator as **decimal strings**. Verified necessary, not stylistic — `canonicalJson` throws on BigInt (`Do not know how to serialize a BigInt`), and IEEE-754 doubles will not survive JS↔Python↔browser parity.

The theorem establishes the combinatorial result **given**:

_Modelled facts_

- `N`, `J`, `k` are valid (`0 ≤ J ≤ N`, `0 ≤ k ≤ N`);
- sampling yields `k` distinct, uniformly distributed indices;
- at least `J` indices violate the declared predicate.

_Assumptions / externally checked premises_

- the beacon-derived seed was unpredictable before commitment;
- the derivation algorithm was faithfully executed.

This mirrors Stage 5N's `elapsedSoundness`, which is conditional on the committed uncertainty bounds holding of the true clocks. A biasable or reorganisable beacon means a predictable challenge, which **voids the bound entirely**. Stage 5O therefore **consumes** `not_proof_of_beacon_unbiasability_or_finality` and makes it load-bearing. It does not discharge it.

### Beacon hygiene (normative)

```text
beacon  → challenge index derivation   (public)
CSPRNG  → per-leaf salts               (private, never beacon-derived)
```

Per the NIST beacon project's explicit warning against using beacon output as secret key material. Salts are ≥256-bit and locally generated; the residual is signed as `not_proof_of_salt_entropy`.

### Motivating seam (prior-art map classification: **motivating seam**, not novelty evidence)

Published frontier-lab policy permits confidential evaluation or review scopes while requiring complete coverage. The cited policy condition is currently expressed in prose rather than as a publicly recomputable evidence relation.

The pinned instance (full citation with retrieval date and digest belongs in Section 12's source map): the cited policy text states a complete-coverage condition over confidentially reviewed sections, but **does not specify a public, machine-verifiable mechanism by which an outsider can recompute that coverage**. This is a statement about the published text only; it is not a claim that no internal mechanism exists.

**What Stage 5O contributes to such a claim:** Stage 5O makes the **hidden-universe completeness and no-omission component** machine-checkable under its declared evidence contract. It does not make the full claim checkable — whether material was genuinely _evaluated_ additionally requires reviewer receipts, independence, and adequacy mechanisms. In Simurgh terms the stronger statement belongs to a composition:

```text
5O hidden-universe equality
  + 5I reviewer coverage equality
  + 5J rating obligations and divergence
```

and even then, each stage's adequacy and human-action non-claims are retained.

**Prior art we do NOT claim.** Publicly verifiable random sampling via randomness beacons is established prior art, including the goals of enabling public verifiability of random sampling and preventing selection bias or advance knowledge of selections. Merkle commitments, salted commitments, and hypergeometric acceptance sampling are all established.

**Novelty claim (composition only):** a pre-anchored, salted, position-bound private evaluation universe whose execution and result sets must equal the commitment as indexed universes, combined with an independently derived public-beacon challenge, exact signed detection bounds, cumulative disclosure accounting, and fail-closed adequacy non-claims.

---

## Sections 2–13 — pending

2. Threat model and attack matrix — **structural omission**, **record fabrication**, **scope stuffing**, **challenge manipulation**, and **commitment/preimage manipulation** treated as distinct animals. Malformed internal indices classify under commitment/preimage manipulation, **not** structural omission.
3. Salted, position-bound leaf profile.
4. Commitment schema and canonical declared-index ordering.
5. Indexed-universe equality objects.
6. Future-height anchor contract.
7. Beacon-seed and unique-index derivation (rejection sampling; no modulo bias).
8. Opening rules and cumulative-disclosure accounting.
9. Exact rational probability encoding (decimal-string integers).
10. Raw codes from **420**, first-failure order frozen before implementation.
11. Conditional Lean model.
12. Evidence lanes: normative Lane A, captured Bitcoin Lane B, dishonest-producer fixtures.
13. Prior-art and novelty source map (pinned: title, version/date, URL, retrieval date, exact quote, digest or archived copy, classification).

**Outside the release predicate:** the independent-producer Frontier gate (a second producer completing the Stage 5N ceremony) runs parallel to Stage 5O and does not gate its release. Frontier remains capped at **9.4** until that run lands.
