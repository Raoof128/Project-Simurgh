# Stage 5O — VSC: Hidden-Universe Equality (design)

**Status:** Section 1 FROZEN (identity, laws, honest core). Review edits folded: A3 claim ceiling + `not_proof_of_real_execution`; provider-agnostic public wording with the pinned seam deferred to the Section 13 source map; indexed-universe equality replacing set equality; two-layer position-binding split + `not_proof_of_unopened_leaf_preimage_index_consistency`. Sections 2–13 pending.
**Release target:** `v2.50.0-stage-5o-vsc-hidden-universe-equality`
**Motto:** _ClaimSafe first, then ReviewerSafe._
**Pays:** signed IOU **I6 `hiding_scope_commitment`** — in full, **on release acceptance** (not on spec approval).
**Mints:** nothing. `execution_origin_witnessing` is recorded as a successor-work **candidate**, not a socket; no IOU is minted until a future stage is selected and scoped.
**Reuses (frozen, unmodified):** the Stage 5M three-ecology external-anchor quorum, applied to the scope commitment anchor.
**Does NOT reuse:** Stage 5K's `simurgh.vuc.merkle_set.v1` leaf profile. Verified unsalted — `leafHash({leaf_id, leaf_type, subject_digest})` — therefore **binding but not hiding**, and canonicalised by sorting on `leaf_id`, which conflicts with position binding. Stage 5O defines a new domain-separated salted, position-bound profile.

**Amendment A1 folded:** Section 2 threat analysis added four signed claim ceilings and exposed an exact-versus-lower-bound ambiguity in the unopened-preimage statement. Section 1 now defines a monotone canonical non-claim union and delegates probability semantics to PC-0. **No blade, law, release predicate, or socket changed** — A1 is a claim-discipline correction, not a redesign.

**Amendment A2 folded:** Section 2 established that cumulative disclosure is enforceable only over a complete presented ledger for one commitment root. Section 1's unconditional "bounded" wording for A6 was narrowed accordingly. **No blade, law, release predicate, or socket changed.**

**Amendment A3 folded:** Removed the duplicated Section 2 non-claim mirror from Section 1. Each normative section now owns its additions, while Section 1 retains the baseline honest core and the monotone canonical-union invariant. The release gate requires an explicit section-level declaration, including empty declarations, from every normative section. **No blade, law, release predicate, or socket changed.**

**Amendment A4 folded:** Section 3 established that full leaf-preimage conformance is verified only for challenged positions. Law 3 was renamed from "No Unopenable Scope" to **"No Unopenable Challenge"** so its title matches its already-frozen body and signed limitations. The law body, blade, release predicate, and sockets are **unchanged** — only the claim the title was making. A law name is a claim.

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
3. **No Unopenable Challenge** (A4) — every beacon-selected index must produce a valid case, salt, and authentication path. Refusal, absence, duplication, or malformation **fails closed**. The law binds **challenged** positions; it does not assert that all `N` leaves are openable (see `not_proof_of_unopened_leaf_preimage_conformance`).

### Honest core — baseline and accumulation rule

**Accumulation rule (A1, A3).** Section 1 freezes the **baseline** honest core. Later reviewed sections may **add** non-claims when their threat analysis exposes a new claim ceiling. The release envelope signs the canonical **union** of all section-level non-claims. **No later section may remove, weaken, or silently rename a previously frozen non-claim.** The limitations remain normative and signed — "not an appendix" is preserved in substance — while the spec is permitted to learn without pretending Section 1 predicted every future seam.

**Ownership rule (A3).** Each normative section **owns and defines** any non-claims first introduced by that section. Section 1 defines the **baseline honest core and the accumulation rule only** — it does not mirror later sections' additions. The release envelope signs the canonical union of the Section 1 baseline and every later section's owned additions. One fact, one home, one signature path.

**Freeze invariant.**

```text
release_non_claims =
  lexicographically_sorted_union(
    section_1.baseline_non_claims,
    section_2.added_non_claims,
    ...
    section_13.added_non_claims
  )
```

Ordering is **lexicographic by machine field**, fixed and canonical, so a non-claim's section of origin cannot affect the signed bytes.

**Completeness checks (A3) — the section index IS the census.**

```text
- every normative section MUST declare added_non_claims, even if empty
- each machine field has exactly one owning section
- later sections may reference an existing field but MUST NOT redefine it
- duplicate ownership fails closed
- removal, weakening, or silent renaming fails closed
- a missing section-level declaration fails the release gate
```

The last rule is load-bearing: without it a producer could "compute the union" while quietly omitting a section, which is selective omission wearing the union's clothes.

**Section 1 baseline** (`section_1.baseline_non_claims`):

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

> Selective openings reveal the challenged cases. All unchallenged case payloads remain undisclosed under the stated commitment assumptions.

> **`not_proof_of_real_execution`** — Stage 5O proves equality and consistency among committed scope identities, execution-record identities, and reported-result identities. It does not independently prove that every execution record arose from a real model or system invocation.

> **`not_proof_of_unopened_leaf_preimage_index_consistency`** — The verifier deterministically checks each public leaf identifier's canonical tree position and cross-artifact equality. It validates the private preimage's embedded index only for beacon-selected openings.

A hidden universe that is fixed is not a universe that is right. **Hiding makes gerrymandering invisible**; the beacon challenge bounds _stuffing_, never _taste_.

### Attack taxonomy — what is deterministic, what is probabilistic, what is neither

| #   | Attack                                                                      | Caught                                                         | By                                         |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| A1  | Commit the scope after seeing results                                       | **Deterministically**                                          | future-height anchor (Law 1)               |
| A2  | **Structural omission** — census has ≠ `N` entries, or index domains differ | **Deterministically**                                          | indexed-universe equality (Law 2)          |
| A3  | **Record fabrication** — `N` records exist, some invented                   | **Conditionally probabilistic, possibly not at all**           | beacon opening, bounded by predicate power |
| A4  | **Scope stuffing** — `N` real executions, `J` of them junk                  | **Probabilistically** at `P_detect(N,J,k)`                     | beacon opening                             |
| A5  | **Challenge manipulation** — refuse or malform an opening                   | **Deterministically**                                          | fail-closed (Law 3)                        |
| A6  | Unzip the corpus via repeated audits                                        | **Locally bounded, conditional on evidence completeness** (A2) | cumulative disclosure budget               |

**Missing execution is not a probabilistic detection event.** Commit `N` and report fewer, or shift the index domain, and the census comparison fails with certainty. The sampling probability never qualifies the equality law.

**A6 — locally bounded, conditional on evidence completeness (A2).** The verifier enforces the unique-index disclosure budget over the **complete, non-forked disclosure history presented for one commitment root and epoch**. It does **not** prove that omitted histories, disconnected reviewers, or re-committed versions of the same hidden corpus do not exist. The budget is not unconditionally bounded — it is bounded relative to the evidence it was handed. See:

```text
not_proof_of_global_cross_verifier_disclosure_budget
not_proof_of_complete_disclosure_history_without_committed_ledger
not_proof_of_cross_commitment_corpus_reuse
```

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

## Section 2 — threat model and attack matrix (DRAFT, uncommitted)

Six classes. Every concrete attack belongs to **exactly one primary class**. No raw codes are assigned in this section.

### Detection-mode vocabulary (frozen for this spec)

| Mode                          | Meaning                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Deterministic**             | Rejected for every instance, from evidence the verifier already holds. No sampling.                          |
| **Conditional probabilistic** | Detected only when sampled **and** the declared predicate discriminates it. Requires a probability contract. |
| **Assumption-dependent**      | Outside verifier reach; correctness rests on a signed external premise.                                      |
| **Potentially undetectable**  | No verifier action exists within this stage's contract. Names a claim ceiling.                               |

**Discipline:** "probabilistic" never appears alone. Every conditional-probabilistic row cites a probability contract (PC-1…PC-3) stating the defective population, the discriminating predicate, the required beacon assumptions, the exact expression, and the behaviour when the predicate cannot discriminate.

### T1 — structural omission and substitution

Producer capability throughout: full control of the census encoding. Required evidence throughout: the public census (no openings, no payload disclosure).

| ID   | Attack                                         | Targets    | Mode          | Failure outcome                                | Residual | Normative fixture           |
| ---- | ---------------------------------------------- | ---------- | ------------- | ---------------------------------------------- | -------- | --------------------------- |
| T1.1 | census holds ≠ `N` entries                     | Law 2      | Deterministic | reject: cardinality ≠ committed `N`            | —        | `census_short_by_one`       |
| T1.2 | missing index                                  | Law 2      | Deterministic | reject: index domain ≠ `{0..N-1}`              | —        | `census_missing_index`      |
| T1.3 | duplicate index                                | Law 2      | Deterministic | reject: encoding not a bijection               | —        | `census_duplicate_index`    |
| T1.4 | out-of-range index                             | Law 2      | Deterministic | reject: index ∉ `{0..N-1}`                     | —        | `census_index_out_of_range` |
| T1.5 | scope/execution/result domain mismatch         | Law 2      | Deterministic | reject: `dom(S) ≠ dom(E)` or `dom(E) ≠ dom(R)` | —        | `execution_domain_mismatch` |
| T1.6 | reordered `leaf_id`                            | Laws 1 + 2 | Deterministic | reject: root mismatch at bound tree position   | —        | `leaf_reordered`            |
| T1.7 | substituted `leaf_id`                          | Law 1      | Deterministic | reject: root mismatch                          | —        | `leaf_substituted`          |
| T1.8 | execution/result row bound to another position | Law 2      | Deterministic | reject: `S[i].leaf_id ≠ E[i].scope_leaf_id`    | —        | `result_row_crossbound`     |

**Class guarantee:** deterministically rejected, without openings. No residual — the guarantee is complete over all `N`.

### T2 — record fabrication

Producer capability throughout: controls the execution environment **and** its own signing keys. Required evidence: openings + the declared predicate; no independent execution witness exists in this stage.

| ID   | Attack                                                               | Targets               | Mode                             | Failure outcome                                               | Residual                      | Normative fixture                                         |
| ---- | -------------------------------------------------------------------- | --------------------- | -------------------------------- | ------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------- |
| T2.1 | execution records invented for calls never made                      | meaning of "executed" | Conditional probabilistic (PC-2) | reject **iff** the predicate discriminates at an opened index | `not_proof_of_real_execution` | `fabricated_record_predicate_visible`                     |
| T2.2 | fabricated model-response digests                                    | meaning of "executed" | Conditional probabilistic (PC-2) | as T2.1                                                       | `not_proof_of_real_execution` | `fabricated_response_digest`                              |
| T2.3 | producer signs synthetic execution evidence with its own trusted key | meaning of "executed" | **Potentially undetectable**     | none — no verifier action exists                              | `not_proof_of_real_execution` | `self_signed_synthetic_execution` (must verify **green**) |

**Class guarantee:** Stage 5O proves identity consistency, not real execution occurrence. T2.3's fixture is a deliberate green: a producer controlling both key and environment produces evidence this stage cannot distinguish from honest evidence, and the stage must say so rather than fail in a way that implies it caught something.

### T3 — scope stuffing and gerrymandering

Producer capability throughout: free choice of the private universe's contents before anchoring.

| ID   | Attack                                                                                                                         | Targets               | Mode                                                                                                          | Failure outcome                                                    | Residual                                                                             | Normative fixture                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| T3.1 | trivial cases inserted to inflate `N`                                                                                          | hiding vs adequacy    | Conditional probabilistic (PC-1)                                                                              | reject on an opened trivial case                                   | `not_semantic_junk_detection_beyond_declared_predicate`                              | `stuffed_trivial_cases`                                                                                                                 |
| T3.2 | **real cases duplicated across positions**                                                                                     | probability integrity | **Pair-conditional probabilistic (PC-3) — effectively undetectable**                                          | reject only if **both** members are opened                         | **`not_proof_of_case_distinctness`**                                                 | `duplicate_payload_pair`                                                                                                                |
| T3.3 | malformed or semantically empty cases                                                                                          | predicate             | Conditional probabilistic (PC-1)                                                                              | reject on an opened empty case                                     | `not_semantic_junk_detection_beyond_declared_predicate`                              | `stuffed_empty_case`                                                                                                                    |
| T3.4 | technically valid but strategically weak universe                                                                              | adequacy              | **Not addressed**                                                                                             | none — outside the contract                                        | `not_scope_adequacy`, `not_proof_that_the_private_scope_was_well_chosen`             | `weak_but_valid_universe` (must verify **green**)                                                                                       |
| T3.5 | **cardinality dilution** — valid, unique, genuinely executed filler cases added to grow `N` while the defect count stays fixed | probability integrity | **Potentially undetectable as misconduct** — the verifier computes and signs the weakened probability exactly | reject only if the policy-bound non-vacuity floor is unmet (below) | `not_proof_of_challenge_parameter_adequacy`, `not_proof_of_target_defect_prevalence` | `cardinality_dilution_absolute_basis` (**rejected** at floor), `cardinality_dilution_fraction_basis` (accepted **+ ceilings asserted**) |

**Class guarantee:** detectable defects among at least `J` positions are sampled at exact `P_detect(N,J,k)`; semantic quality above the declared predicate is not established; scope adequacy remains unproved. T3.4 verifies green **by design** — a stage that failed a weak-but-honest universe would be claiming adequacy judgement it does not have.

#### T3.5 — cardinality dilution and the policy-bound non-vacuity floor

Dilution is distinct from stuffing: every added case may be genuinely executed, unique, and predicate-passing, and every universe equality may hold. **The verifier is not deceived — it computes and signs the weakened probability correctly.** The attack is that the number becomes microscopic and nobody reads it.

Measured (`k=30`, `J=5` fixed, valid filler added):

```text
N=  1247  J=5  P_detect=0.114814
N= 12470  J=5  P_detect=0.011973
N= 62350  J=5  P_detect=0.002404      <- 48x collapse, every check still green
```

**Non-vacuity floor (normative).** Precommit, before the anchor:

```text
target_defect_basis        absolute_count | fraction
target_defect_threshold    J* or f*
minimum_detection_bound    p_min (exact rational, PC-0 encoding)
k_derivation_version
```

For a fraction basis, `J* = ceil(f* × N)`. The verifier **rejects** unless:

```text
P_detect(N, J*, k) >= p_min
```

This prevents the challenge from silently falling below its own declared policy. It does **not** prove the selected `J*`, `f*`, or `p_min` are wise.

**The two bases behave differently under dilution:**

```text
absolute-count basis:
  J* remains fixed as N grows;
  the declared detection floor may weaken under cardinality expansion.

fraction basis:
  J* = ceil(f* × N);
  the policy target scales with N;
  the bound remains conditional on the actual predicate-visible defect
  population being at least J*.
```

A fraction-based target is **resistant to simple cardinality dilution within the declared policy model**, because its hypothetical defect threshold scales with `N`. It is **not exactly invariant** under finite-population arithmetic and the ceiling operation, and it **does not prove that the committed universe actually contains the target defect fraction**. Measured (`f*=0.004, k=30`): `P` drifts `0.11481395` at `N=1247` to `0.11334823` at `N=124700` — a `1.28%` relative spread converging on the asymptote `1 − (1 − f*)^k = 0.11329297`.

**The prevalence gap — why `not_proof_of_target_defect_prevalence` exists.** The floor is computed against a _hypothetical_ threshold. If reality holds fewer defects than the policy supposes, the premise "at least `J*` positions violate the predicate" is **false**, and the advertised bound **does not apply at all**:

```text
producer: 5 real predicate-visible defects + 10,000 valid filler, policy f* = 0.05
  N=11247   J* (policy hypothetical) = 563   ->  advertised floor  P = 0.786190
            J  (actual reality)      =   5   ->  true detection    P = 0.013268
```

A correctly computed, correctly signed `0.786190` that means nothing, because its premise is false. The floor is a statement about the _policy_, never about the _universe_.

**Three adjacent ceilings that must not be conflated:**

| Ceiling                                     | What it concedes                                                      |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `not_proof_of_target_defect_prevalence`     | the real universe may hold fewer predicate-visible defects than `J*`  |
| `not_proof_of_challenge_parameter_adequacy` | the chosen `J*`, `f*`, or `p_min` may simply be too weak              |
| `not_scope_adequacy`                        | the universe may be strategically poor regardless of any defect count |

### T4 — challenge manipulation

**Verifier-enforced failures and external assumptions are separated.** Beacon unpredictability and finality are signed premises; the verifier does not manufacture them.

| ID   | Attack                                                                           | Targets               | Mode                     | Failure outcome                                                                                           | Residual                                        | Normative fixture                                                                 |
| ---- | -------------------------------------------------------------------------------- | --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| T4.1 | commitment created after the challenge height                                    | Law 1                 | Deterministic            | reject: anchor time ≥ predeclared height                                                                  | —                                               | `commit_after_height`                                                             |
| T4.2 | producer-selectable or retryable block height                                    | Law 1                 | Deterministic            | reject: height not bound in the pre-anchor policy digest                                                  | —                                               | `height_reselected`                                                               |
| T4.3 | beacon unpredictability, selection-neutrality, availability, or finality failure | probability integrity | **Assumption-dependent** | availability failure alone fails closed; unpredictability or neutrality failure has **no verifier check** | `not_proof_of_beacon_unbiasability_or_finality` | `beacon_unavailable` (fails closed); none for neutrality — outside verifier reach |
| T4.4 | modulo-biased index derivation                                                   | probability integrity | Deterministic            | reject: derivation not rejection-sampled                                                                  | —                                               | `modulo_biased_derivation`                                                        |
| T4.5 | duplicate challenge indices                                                      | probability integrity | Deterministic            | reject: fewer than `k` distinct indices                                                                   | —                                               | `duplicate_challenge_index`                                                       |
| T4.6 | producer-controlled `k`                                                          | probability integrity | Deterministic            | reject: `k` not bound pre-anchor                                                                          | —                                               | `producer_chosen_k`                                                               |
| T4.7 | seed omits commitment root, epoch, or policy digest                              | probability integrity | Deterministic            | reject: seed preimage incomplete                                                                          | —                                               | `seed_missing_root`                                                               |
| T4.8 | accept a later favourable beacon after an unfavourable one                       | Law 1                 | Deterministic            | reject: more than one challenge per epoch, or height mismatch                                             | —                                               | `beacon_reroll`                                                                   |

**Class guarantee:** every listed attack except T4.3 is a verifier-enforced deterministic rejection. T4.3 is the load-bearing external premise, and it is broader than grinding alone — it covers **unpredictability, selection neutrality, availability, and finality**, with failure modes including miner or producer collusion, hash grinding, block withholding, selective beacon abandonment, chain reorganisation, and compromised beacon derivation.

**Availability and neutrality fail differently.** A beacon that is _unavailable_ fails closed: no seed, no challenge, no green. A beacon whose _unpredictability or neutrality_ is broken produces a perfectly well-formed challenge that silently voids PC-1, PC-2, and PC-3 — the arithmetic still computes, and it no longer means anything. Only the first is a verifier check.

### T5 — commitment and preimage manipulation

| ID   | Attack                                                             | Targets | Mode                                                   | Failure outcome                                                    | Residual                                                | Normative fixture                                                                    |
| ---- | ------------------------------------------------------------------ | ------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| T5.1 | **malformed** salt — short, non-canonical encoding, or empty       | hiding  | Deterministic on opening                               | reject: salt < 256 bits, non-canonical, or absent                  | —                                                       | `short_salt`, `noncanonical_salt`                                                    |
| T5.2 | salt provenance **declared** as beacon-derived                     | hiding  | Deterministic                                          | reject: `salt_source` ∉ permitted private-CSPRNG sources           | —                                                       | `declared_beacon_derived_salt` (must **reject**)                                     |
| T5.3 | domain-separation swap                                             | Law 2   | Deterministic on opening; unopened join `J` under PC-1 | reject: recomputation mismatch                                     | `not_proof_of_unopened_leaf_preimage_index_consistency` | `domain_swap`                                                                        |
| T5.4 | non-canonical case encoding                                        | Law 3   | Deterministic on opening; unopened join `J` under PC-1 | reject: encoding not canonical                                     | `not_proof_of_unopened_leaf_preimage_index_consistency` | `noncanonical_case`                                                                  |
| T5.5 | internal index `j ≠ i`                                             | Law 2   | Deterministic on opening; unopened join `J` under PC-1 | reject: recomputation with **verifier-known** `i` fails            | `not_proof_of_unopened_leaf_preimage_index_consistency` | `internal_index_mismatch`                                                            |
| T5.6 | authentication path valid for another position                     | Law 2   | Deterministic on opening; unopened join `J` under PC-1 | reject: path does not reach the root at position `i`               | `not_proof_of_unopened_leaf_preimage_index_consistency` | `path_wrong_position`                                                                |
| T5.7 | cross-epoch leaf replay                                            | Law 1   | Deterministic                                          | reject: epoch not bound, or epoch mismatch                         | —                                                       | `cross_epoch_replay`                                                                 |
| T5.8 | ambiguous tree padding or odd-leaf rule                            | Law 1   | Deterministic                                          | reject: tree shape ≠ canonical shape for `N`                       | —                                                       | `ambiguous_padding`                                                                  |
| T5.9 | salt secretly beacon-derived, **undeclared**, well-formed 256 bits | hiding  | **Potentially undetectable**                           | none — a valid-looking salt is indistinguishable from CSPRNG bytes | `not_proof_of_salt_entropy`                             | `undeclared_beacon_derived_salt_indistinguishable` (accepted **+ ceiling asserted**) |

**Class guarantee:** tree position and public identity equality are deterministic over all `N`; private preimage correctness is verified only for opened positions; malformed unopened preimages form part of the unknown defective population `J`.

**Malformed salts and unpredictable salts are different animals.** An opened salt _can_ be checked for required byte length, canonical encoding, non-emptiness, and recomputation correctness — all deterministic per opening (T5.1). It _cannot_ be checked for genuine entropy from its bytes alone: a beacon-derived 256-bit value and a CSPRNG 256-bit value are indistinguishable to any verifier (T5.9). **Low entropy is therefore not placed under PC-1** — the declared predicate cannot recognise it, so it never enters `J`. The distinction that matters is disclosure, not derivation: a producer who _declares_ a beacon salt source is deterministically rejected (T5.2); a producer who lies about it is invisible (T5.9).

### T6 — disclosure accumulation

**This class is not challenge manipulation.** Every challenge may be perfectly unbiased and correctly derived. The attack is that legitimate audits compose.

| ID   | Attack                                                                                                                           | Targets                        | Mode                                                    | Failure outcome                                                           | Residual                                                            | Normative fixture                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T6.1 | repeated valid audits gradually unzip the universe                                                                               | hiding                         | Deterministic (locally)                                 | reject: cumulative disclosure > declared budget                           | `not_proof_of_global_cross_verifier_disclosure_budget`              | `budget_exhausted`                                                                                                                                                          |
| T6.2 | independently operating reviewers collate their openings                                                                         | hiding                         | **Potentially undetectable**                            | none — a local verifier cannot observe other verifiers                    | `not_proof_of_global_cross_verifier_disclosure_budget`              | `collated_reviewers_isolated_views` (accepted **+ ceiling asserted**); `collated_reviewers_merged_receipts_over_budget` (**rejected** when all receipts reach one verifier) |
| T6.3 | epoch reset drops disclosure history                                                                                             | hiding                         | Deterministic                                           | reject: budget not carried across epochs of the same root                 | —                                                                   | `epoch_reset_budget`                                                                                                                                                        |
| T6.4 | fresh audit requested after learning the previous sample                                                                         | hiding + probability integrity | Deterministic                                           | reject: more than one challenge per epoch                                 | —                                                                   | `post_hoc_reaudit`                                                                                                                                                          |
| T6.5 | same commitment reopened under multiple nominal policies                                                                         | hiding                         | Deterministic                                           | reject: budget is keyed on the **commitment root**, not on (root, policy) | —                                                                   | `multipolicy_reopen`                                                                                                                                                        |
| T6.6 | **disclosure-history truncation or fork** — producer supplies only a favourable prefix, or one branch, of prior opening receipts | hiding                         | **Potentially undetectable** without a committed ledger | none — an offline verifier knows only the history it was handed           | `not_proof_of_complete_disclosure_history_without_committed_ledger` | `truncated_disclosure_history`, `forked_disclosure_history` (accepted **+ ceiling asserted**)                                                                               |
| T6.7 | **cross-commitment corpus reuse** — the same private corpus recommitted with fresh salts under a new root, resetting the budget  | hiding                         | **Potentially undetectable**                            | none — fresh salts make the two roots unlinkable                          | `not_proof_of_cross_commitment_corpus_reuse`                        | `resalted_corpus_new_root` (accepted **+ ceiling asserted**)                                                                                                                |

**Class guarantee:** cumulative disclosure is tracked per commitment root and epoch; already-disclosed indices count against the budget; a new challenge cannot silently reset the budget; exceeding the declared budget fails closed or requires a newly committed universe and policy.

**What the budget counts.** The baseline unit is **unique disclosed indices per commitment root** — not opening events and not total disclosures, since re-opening an already-disclosed index reveals nothing new and should not consume budget. Per-recipient exposure is **outside** this number: the budget bounds what has been revealed, not to whom.

**The budget's completeness is only as good as the history the verifier is given.** "Cumulative disclosure budget" sounds deterministic, and it is — over the receipts presented. An offline verifier cannot know that the presented history is complete (T6.6) or that a fresh root does not conceal the same corpus (T6.7). Closing T6.6 requires a **monotonic per-root disclosure ledger**: previous-state digest, unique opened-index census, challenge receipt chained to prior state, and a complete-history requirement for offline verification. Until that is built, the gap is signed. Recorded as the successor-work **candidate** `federated_disclosure_ledger`; no socket minted.

**Three distinct honest ceilings, often confused:**

| Ceiling                                                             | What escapes                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `not_proof_of_global_cross_verifier_disclosure_budget`              | separate verifiers sharing what each legitimately learned                                    |
| `not_proof_of_complete_disclosure_history_without_committed_ledger` | one verifier being handed a truncated or forked local history                                |
| `not_proof_of_cross_commitment_corpus_reuse`                        | the same corpus re-salted under a new root, unlinkable even to a single verifier seeing both |

### Probability contracts

#### PC-0 — shared preconditions for every probability contract

**Domain (frozen).**

```text
0 <= J <= N
0 <= k <= N
C(a, b) = 0 when b > a
```

**Exact versus lower bound (frozen).** The distinction is not decorative — a producer quoting the bound must not be able to choose the reading:

```text
If EXACTLY J positions violate predicate Q:
  P_detect = 1 - C(N-J, k) / C(N, k)

If AT LEAST J positions violate Q:
  P_detect >= 1 - C(N-J, k) / C(N, k)
```

More defects can only raise detection, so an "at least `J`" claim yields a **minimum guarantee**, never an exact probability.

**Predicate precommitment (frozen).** The audit predicate must not be selectable or weakenable after the sample is known. Bound into the pre-challenge commitment:

```text
predicate_id
predicate_version
predicate_digest
predicate_parameters
```

Every contract below applies **only** to defects violating the _precommitted_ predicate.

**Canonical rational encoding (frozen).** Canonical JSON serialises faithfully; it cannot canonicalise a rational's value. `"2"/"4"` and `"1"/"2"` are the same number and must not be two encodings. Therefore:

- positive denominator;
- numerator and denominator reduced to **lowest terms** (gcd-divided);
- decimal strings, no leading zeroes except the literal `"0"`.

#### PC-1 — single-position detectable defect

Cited by: T3.1, T3.3, T5.3, T5.4, T5.5, T5.6.

1. **Defective population** — the `N` committed positions, of which `J` contain a defect detectable at a **single** position.
2. **Discriminating predicate** — the precommitted opening predicate `Q`, a per-position function of `(case_i, salt_i, path_i, verifier-known i)`.
3. **Required beacon assumptions** — the seed was unpredictable before commitment; the derivation algorithm was faithfully executed. (See T4.3: neutrality failure voids this contract silently.)
4. **Expression** — exact for exactly `J`; a **minimum guarantee** (`>=`) for at least `J`. Per PC-0.
5. **When `Q` cannot discriminate** — the defect is not counted in `J`, and the contract says nothing whatsoever about it. `P_detect` is a statement about `Q`-visible defects only.

#### PC-2 — record fabrication

Cited by: T2.1, T2.2, T2.3.

1. **Defective population** — let `V` be the subset of fabricated records **visible to `Q`** at a single opened position. `V` is generally much smaller than the fabricated population, and may be empty.
2. **Discriminating predicate** — the precommitted `Q`, which has no access to an independent execution witness. A producer-signed response digest is signed by the party under audit.
3. **Required beacon assumptions** — as PC-1.
4. **Expression** — `P_detect` over `V` only: exact for exactly `|V|`, a minimum guarantee for at least `|V|`.
5. **When `Q` cannot discriminate** — **If zero fabricated records are predicate-visible, the detection probability is zero regardless of the total fabricated population.** This is the general case for a producer controlling both signing key and execution environment. Stage 5O proves identity consistency, not execution occurrence (`not_proof_of_real_execution`).

#### PC-3 — relational defect: one declared duplicate pair

Cited by: T3.2. **`P_detect(N, J, k)` does not apply to this class.**

**Scope, stated narrowly:** PC-3 defines the exact probability for **one declared defective pair**. Multi-pair or duplicate-group claims require a structure-specific probability contract and **may not be inferred from edge count alone**.

**Active domain (frozen).**

```text
PC-3 active domain:
  N >= 2
  2 <= k <= N
```

Outside that domain PC-3 makes **no claim**:

```text
For k < 2:
  pair_detection_probability = 0
  pair_ratio                 = absent
  PC-3 claim                 = inactive
```

The ratio field is absent rather than zero because `(N−1)/(k−1)` divides by zero at `k=1` and yields a negative value at `k=0`. A field that cannot be computed must not be emitted.

1. **Defective population** — one specified pair of positions holding the same case. Each member is individually well-formed, non-trivial, and predicate-passing, because each **is a real case**.
2. **Discriminating predicate** — **none exists at single-position granularity.** Duplication is a relation between two positions; any per-position `Q` is blind to it by construction. Detection requires both members in the same sample.
3. **Required beacon assumptions** — as PC-1.
4. **Exact expression** — for one specified pair:

   ```text
   P_pair(N, k) = C(N-2, k-2) / C(N, k) = k(k-1) / (N(N-1))
   ```

5. **When `Q` cannot discriminate** — always, at single-position granularity. Signed as `not_proof_of_case_distinctness`.

**Verifier behaviour (normative — PC-3 is a check, not prose).** A probability contract with no executable step behind it detects nothing even when both members are sampled. Required:

- the **relational predicate `R`** is precommitted alongside `Q` (`predicate_id`, `predicate_version`, `predicate_digest`, `predicate_parameters`);
- when `R` is declared, the verifier evaluates **all unordered pairs among the opened cases** — not a fixture-specific duplicate check;
- opening **both** members of a pair forbidden by `R` → **reject**;
- opening **one** member → **accept**, with `not_proof_of_case_distinctness` asserted present.

Minimum paired fixtures:

```text
duplicate_pair_both_opened
  -> reject (via the precommitted relational predicate R)

duplicate_pair_one_opened
  -> accept
  -> not_proof_of_case_distinctness required present
```

**Ratio to single-position detection has a closed form**, and is therefore **not a constant**:

```text
P_detect(N, 1, k) / P_pair(N, k) = (N-1) / (k-1)
```

Measured: `N=1247, k=30` → `42.97`; `N=100, k=10` → `11.00`; `N=5000, k=50` → `102.02`. Any single quoted multiplier is an artifact of one configuration.

**Multi-pair structure is not derivable from a defect count.** For `m` **disjoint** pairs the exact expression is:

```text
P_pair-detect(N, m, k) = 1 - [ Σ_{r=0}^{min(m,k)} C(m,r) · 2^r · C(N-2m, k-r) ] / C(N, k)
```

For an arbitrary relation graph `G`, the exact probability is `1 − I_k(G) / C(N, k)`, where `I_k(G)` counts size-`k` vertex subsets containing no defective relation edge. Stage 5O **does not ship** the general graph computation; a structure-specific contract is required for any multi-pair claim.

Measured (`N=1247, k=30`, disjoint pairs): `m=1` → `0.000560`; `m=50` → `0.027664`; `m=200` → `0.106696`; `m=400` → `0.203338`. The independence approximation `1 − (1 − P_pair)^m` understates these by up to `1.29%` at `m=400` and is **not** used.

**Consequence, stated without superlative.** Duplication is a particularly **sampling-resistant relational stuffing strategy**, because each member may pass an independent single-case predicate and detection may require opening both related positions. It is **not** claimed to be optimal: a semantically weak but unique case that passes the precommitted predicate (T3.4) is undetectable at probability zero, which is strictly stronger for the producer than any relational strategy.

This is signed, not solved. Considered and rejected: a committed per-case tag `PRF(K, H(case_i))` renders duplicates deterministically visible over all `N`, but verifying tag derivation at an opening requires `K`, and revealing `K` makes the entire tag list brute-forceable — hiding dies. Recorded as the successor-work **candidate** `case_distinctness_witnessing`. No socket minted.

#### Single-challenge semantics — no aggregate detection claim

**PC-1, PC-2, and PC-3 apply independently to ONE challenge.** The disclosure ledger does **not** create an aggregate detection claim across challenges. Stage 5O ships no PC-4.

This blocks the laundering move: _"three audits opened `k=30`, therefore we sampled 90 cases."_ That is false whenever challenges overlap.

**Why no PC-4.** An aggregate contract over `q` challenges would be exact only if every challenge is present in the complete ledger and the producer cannot suppress an unfavourable one — which is **precisely T6.6**, the disclosure-history-completeness hole this section signs as unprovable. A probability contract resting on a premise we have already conceded we cannot verify is a bound in name only. If a future stage builds the monotonic committed ledger (`federated_disclosure_ledger`), an aggregate contract becomes available; it is not available now.

Signed as `not_proof_of_aggregate_multi_challenge_detection_probability`.

### Accepted-blindness fixtures — what "green" must mean

Eight fixtures encode attacks this stage genuinely cannot catch. **Green must never mean a silent raw `0`.** It means: valid under the bounded contract, **with the exact non-claim asserted present**. A verifier that accepts the fixture but drops the limitation **fails the test**.

```text
self_signed_synthetic_execution:
  accepted
  not_proof_of_real_execution           = present
  real_execution_verified               = false or absent

weak_but_valid_universe:
  accepted
  not_scope_adequacy                    = present

undeclared_beacon_derived_salt_indistinguishable:
  accepted
  not_proof_of_salt_entropy             = present
  no claim that salt generation was independently verified

collated_reviewers_isolated_views:
  accepted (each isolated view)
  not_proof_of_global_cross_verifier_disclosure_budget = present

truncated_disclosure_history / forked_disclosure_history:
  accepted
  not_proof_of_complete_disclosure_history_without_committed_ledger = present

resalted_corpus_new_root:
  accepted
  not_proof_of_cross_commitment_corpus_reuse = present

cardinality_dilution_fraction_basis:
  accepted (policy floor met)
  not_proof_of_target_defect_prevalence     = present
  not_proof_of_challenge_parameter_adequacy = present

duplicate_pair_one_opened:
  accepted
  not_proof_of_case_distinctness            = present
```

The paired **enforcement** fixtures prove the other side — that the stage does bite where evidence exists:

```text
declared_beacon_derived_salt:                    rejected
collated_reviewers_merged_receipts_over_budget:  rejected (all receipts at one verifier)
cardinality_dilution_absolute_basis:             rejected (non-vacuity floor unmet)
duplicate_pair_both_opened:                      rejected (via precommitted relational predicate R)
```

### `section_2.added_non_claims` — owned by this section (A3)

Per the Section 1 ownership rule, Section 2 **owns and defines** the ceilings first introduced by its threat analysis. Section 1 does not mirror this list; the release envelope computes the canonical union. All seven are **claim ceilings**, not IOUs. No sockets minted; successor-work candidates recorded without scoping a stage.

**Declaration** (lexicographic by machine field):

```text
section_2.added_non_claims = [
  not_proof_of_aggregate_multi_challenge_detection_probability
  not_proof_of_case_distinctness
  not_proof_of_challenge_parameter_adequacy
  not_proof_of_complete_disclosure_history_without_committed_ledger
  not_proof_of_cross_commitment_corpus_reuse
  not_proof_of_global_cross_verifier_disclosure_budget
  not_proof_of_target_defect_prevalence
]
```

> **`not_proof_of_case_distinctness`** — Stage 5O does not establish that the committed private universe contains `N` distinct cases. Duplicated cases are individually valid and are detectable only when both members of a pair fall in the same sample.

> **`not_proof_of_global_cross_verifier_disclosure_budget`** — Stage 5O tracks cumulative disclosure per commitment root within one verifier's ledger. It does not prove that independently operating verifiers have not collated their legitimately disclosed openings.

> **`not_proof_of_complete_disclosure_history_without_committed_ledger`** — Stage 5O's disclosure budget is deterministic over the receipts it is given. Absent a monotonic committed ledger, it does not prove that the presented disclosure history is complete rather than a favourable prefix or a single branch of a fork.

> **`not_proof_of_cross_commitment_corpus_reuse`** — Stage 5O does not prove that two commitment roots conceal different corpora. The same private cases re-salted under a fresh root are unlinkable, including to a single verifier holding both.

> **`not_proof_of_challenge_parameter_adequacy`** — Stage 5O enforces that the challenge meets its own precommitted non-vacuity floor. It does not prove that the selected `J*`, `f*`, or `p_min` are strong enough to matter.

> **`not_proof_of_target_defect_prevalence`** — The signed challenge floor is calculated against a precommitted hypothetical defect threshold. It does not prove that the actual hidden universe contains that many predicate-visible defects.

> **`not_proof_of_aggregate_multi_challenge_detection_probability`** — Each probability contract applies to one challenge. Stage 5O makes no claim about combined detection across repeated challenges, and the disclosure ledger does not create one.

Successor-work candidates: `case_distinctness_witnessing`, `federated_disclosure_ledger`, `execution_origin_witnessing` (from Section 1).

### Section 2 freeze gate

| Gate                                                                          | Status                                                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| PC-1 and PC-2 distinguish exact probability from minimum guarantee            | ✅ PC-0 freezes exact-for-`J` vs `>=`-for-at-least-`J`, plus domain and canonical rational encoding                                                  |
| PC-3 narrowed to one specified pair                                           | ✅ multi-pair needs a structure-specific contract; exact disjoint-pair sum and graph form recorded, neither shipped                                  |
| PC-3 has a strict active domain and an executable relational check            | ✅ `N>=2`, `2<=k<=N`; `k<2` → probability 0, ratio **absent**, claim inactive; precommitted relational predicate `R` over all unordered opened pairs |
| Cardinality dilution named with a policy-bound non-vacuity floor              | ✅ T3.5; both bases distinguished; fraction basis **resistant, not invariant** (1.28% measured drift); prevalence gap signed                         |
| Repeated audits carry no aggregate detection claim                            | ✅ Option A — PC-1/2/3 are single-challenge; no PC-4, because its premises are the T6.6 hole                                                         |
| "Duplication is optimal" removed                                              | ✅ replaced with "sampling-resistant relational strategy"; T3.4 named as strictly stronger                                                           |
| Green blindness fixtures assert limitations, not merely acceptance            | ✅ eight accepted-blindness fixtures assert non-claim presence; four paired enforcement fixtures reject                                              |
| Beacon salt fixture distinguishes disclosed from indistinguishable provenance | ✅ T5.2 declared → **reject**; T5.9 undeclared → accepted + ceiling                                                                                  |
| Disclosure truncation, ledger forking, cross-root corpus reuse named          | ✅ T6.6, T6.7, with two new ceilings                                                                                                                 |
| Each attack belongs to exactly one primary class                              | ✅ 40 attacks (T1 8, T2 3, T3 5, T4 8, T5 9, T6 7), one class each                                                                                   |
| Deterministic failures not diluted by sampling language                       | ✅ T1 and T4 (except T4.3) carry no probability text                                                                                                 |
| Record fabrication never presented as generally detectable                    | ✅ T2.3 `potentially undetectable`; PC-2 states zero-visible → zero probability                                                                      |
| Beacon guarantees separated from beacon assumptions                           | ✅ T4.3 is the sole assumption-dependent row; availability fails closed, neutrality does not                                                         |
| Repeated-audit disclosure has its own class                                   | ✅ T6, distinct from T4                                                                                                                              |
| Section 2 declares `added_non_claims` explicitly (A3 ownership rule)          | ✅ seven owned ceilings, lexicographic; Section 1 carries no mirror                                                                                  |
| Every residual maps to an existing non-claim or proposes one without an IOU   | ✅ seven proposed, all claim ceilings; three successor candidates, zero sockets                                                                      |
| No raw `420+` codes assigned                                                  | ✅ none in this section                                                                                                                              |

---

## Sections 3–13 — pending

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
