# Stage 5O — VSC (verifiable hidden-universe equality): closeout

**Motto: AnthropicSafe First, then ReviewerSafe.**

**Tag** `v2.50.0-stage-5o-vsc` · **merged main** `5403d32c` · **reproduced on merged main before
tagging**, including a real-browser ceremony PASS.

Stage 5O lets a producer commit to a **private** evaluation universe, lets a **public Bitcoin
beacon** issue an unpredictable challenge over it, and lets an offline verifier check the opened
cases, the cumulative disclosure budget, the detection probability and the assembled evidence
package — byte-reproducibly, with no trust in the producer.

---

## What shipped (all thirteen sections frozen)

| §         | Blade                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------ |
| **1–6**   | commitment schema, indexed-universe equality objects, anchored presented census closure           |
| **7**     | challenge issuance: 11-check prefix-ordered relation, real Bitcoin-mainnet suffix validator, RFC 5869 seed, byte-exact index sampler |
| **8**     | **No Unbudgeted Unzip** — case-only opening, indexed Merkle inclusion, cumulative budget where reopening costs nothing |
| **9**     | **exact rational probability** — the frozen T3.5 detection floor made an executable rejection, decided by integer cross-multiplication with no float on any verdict path |
| **10**    | sole numeric allocator: 44 symbolic reasons → codes **420–463**, generated from the frozen orders |
| **11**    | Lean core: **15 theorems, zero proof escapes, no project-defined axiom**                          |
| **12**    | assembled-package capsule over a six-section registry, Stage 4T adapter reused unchanged          |
| **13**    | pinned prior-art and novelty source map                                                           |

**Release ledger: all six requirements DISCHARGED**, each bound to executed evidence rather than to a
description.

## Evidence

```text
suite ......................... 3372/3372
K7 all-functions net .......... 14/14 — 210/210 exports exercised (100% export-reference coverage,
                                enforced by a GENERATED census that fails if any export is untouched)
Lean .......................... 15 theorems, 0 escapes, pinned toolchain 4.15.0
Node == Python == real browser  byte-for-byte, INCLUDING the §9 arithmetic transcript
generators .................... byte-stable
exit-ledger ................... 44 codes in 420-463, zero collisions with 0..419
CI ............................ dedicated `stage5o-reproduce` job (named, visible release gate)
```

The parity lane is the stage's first **arithmetic** parity: every earlier lane proved hashing agreed;
this one proves the **decisions** agree — chosen product form, term count, reduced rational bytes and
floor verdict, identical across three runtimes.

## The two laws worth remembering

> **No Unbudgeted Unzip** — for the frozen budget key, accept only when the union of previously
> disclosed and currently selected indices stays within the precommitted budget. Reopening costs
> nothing. The guarantee holds only over the complete valid history **presented to the verifier**.

> **No Rounded Verdict** — every normative probability, threshold and comparison is a canonical
> reduced rational evaluated in exact integer arithmetic. Decimal renderings are presentational only.

## The finding that shaped Section 9

The binomial ratio telescopes into **two equal products**, and choosing the shorter collapses this
stage's worst case from **293 ms / 153,459 digits → 0.007 ms / 10 digits**. Exact, not approximate —
so form selection is a resource decision and never a semantic one, which is why the `k == J` tie had
to be pinned. `dualFormIdentity` proves it for all inputs; the §9 census checks 424 generated cases.
**Neither is the other's oracle.**

## What the machinery caught that review did not

Recorded because the pattern is the deliverable, not the embarrassment:

- **§10's preflight understated its blast radius twice** (1 → 2 → 3 consumers). The rule now in the
  spec: _run the builders and enumerate what moves; a search finds only the shapes it expects._
- **§13's first source map carried a placeholder RFC URL** on the hypergeometric entry — a cardboard
  citation inside the anti-fabrication artifact. Removed, declared, and the gate now **forbids the
  defect class**.
- **A §9 fixture was silently testing the floor instead of activation**; the verifier exposed the
  false premise rather than bending to make the fixture green.
- **The release audit found four requirements reading `PENDING`** that had been discharged in fact by
  long-frozen sections. Each was verified against running code before its status moved.
- **Coverage was asserted, then measured: 81.4%.** The K7 net closed it to 100% and made the census
  self-enforcing.

## Non-claims (signed discipline)

- The Lean model is **symbolic**: hashes are deterministic functions, so it proves verifier
  **conformance** — never collision or preimage resistance, never real proof-of-work.
- `not_proof_that_the_probability_model_is_calibrated` — exactness is not calibration. An exactly
  computed probability of a wrongly modelled event is exactly the wrong number.
- `not_proof_of_redacted_section_confidentiality_in_lane_a` — Lane A salts are a public function of a
  public key, so **Lane A redactions hide nothing**. A dictionary-attack fixture demonstrates this and
  **passes as evidence of the non-claim**.
- `not_proof_of_package_capsule_salt_entropy` — fresh-looking bytes do not prove CSPRNG quality or
  custody. Lane B's claim is **audience-relative**: resistance to offline guessing only for an
  audience lacking the redacted section's salt and value.
- The prior-art sweep is **declared non-exhaustive**, and the gate rejects any map claiming otherwise.

## Four-axis scorecard (re-scored from shipped evidence — no floor, no mandatory increase)

| Axis             | Spec (draft) | Closeout | Why                                                                                                                                                                               |
| ---------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**      | 7.0          | **7.5**  | The budget accounting is as drafted, but §9 turned a frozen prose bound into an executable rejection **with claim-value verification** — the floor now catches a `9/10` label over a computed `4/5`. Narrow, and the ingredients are explicitly not ours (RFC 6962, RFC 5869, hypergeometric). |
| **Frontier**     | 7.0          | **7.0**  | **Unmoved, deliberately.** No independent producer ran this; no external party re-derived anything. The eval-set-protection shape is real but unexercised outside this repo, and §13's sweep skipped regulation, incidents and the lab surface. |
| **Anthropic**    | 7.5          | **8.0**  | Disclosure-budget accounting over a held evaluation corpus is the mapped use, and §9 adds a checkable adequacy floor so an audit cannot silently decay to a microscopic detection probability while every check stays green. |
| **Constitution** | 7.5          | **8.0**  | Every limit precommitted, every residue signed, and the honesty rails are now **executable**: Lane A's non-confidentiality is a passing fixture, and the citation gate refuses a fuzzy source. |

**Frontier stays at 7.0 on purpose.** The axis measures whether the world outside this repository has
exercised the blade, and nothing here did that. A stage that scores itself up for internal thoroughness
is grading its own homework.

**What would move it higher.** Frontier → 8.5 needs a **second, independent producer** committing a
universe and completing the challenge from the spec alone. Novelty → 8.5 needs the
`federated_disclosure_ledger` that closes T6.6 (cross-verifier history collation), plus an
authenticated-receipt profile for history entries. Anthropic → 9.0 needs one real held-out corpus run
by someone who actually owns an evaluation set.

## Known limitations carried forward

- **T6.6 / T6.7 stand**: the budget's completeness is only as good as the history presented, and
  independent verifiers can still collate openings out of band.
- **`stage5o-reproduce` is the only CI-gated stage.** The repository-wide census measured **74.7%**
  export-reference coverage across 38 stages, with K7 nets that no automated gate runs. Backfill
  queue by severity: `4h` (238 exports / 12 test files), `4e`, `5l`, `5i`, `5j`. Tracked as a separate
  infrastructure campaign — deliberately not mixed into this release.
- **Export-reference coverage is not line, branch, path or behavioural coverage.** 210/210 means every
  export is exercised at least once, nothing stronger.
