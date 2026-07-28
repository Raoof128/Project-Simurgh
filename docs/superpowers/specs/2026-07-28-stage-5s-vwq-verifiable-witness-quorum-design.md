# Stage 5S — VWQ: Verifiable Witness Quorum

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

|               |                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Stage id      | `5S`                                                                                                 |
| Name          | **VWQ — Verifiable Witness Quorum**                                                                  |
| Branch        | `stage-5s-vwq-verifiable-witness-quorum`                                                             |
| Target tag    | `v2.54.0-stage-5s-vwq`                                                                               |
| Predecessor   | 5R (VPF), `v2.53.0-stage-5r-vpf`, main `c82613f3`                                                    |
| Baseline      | main `7a9bd5d4` — after the Q1-F001 gate repair, Annex A5, the gate-lifecycle invariant and its fix  |
| Design ruling | 2026-07-28, §1 approved with four mandatory edits, all applied below                                 |
| Raw codes     | Band opens at **475** (`VSI_RESERVED_FROM`; 5Q and 5R allocated none). Exact allocation lands in §2. |

---

## §1 Identity, laws, and the blade

### 1.1 The claim

> **Stage 5S proves that a checkpoint received a policy-sufficient quorum of independently keyed
> witness attestations, and that incompatible checkpoints within the same committed witness scope
> produce offline-verifiable equivocation evidence.**

### 1.2 The blade — one mechanism

A checkpoint is co-signed by _n_ independently keyed witnesses under a committed `q-of-n` policy.
Two checkpoints that are incompatible **within the same committed witness scope** are extracted into
a standalone **equivocation artifact** that any third party verifies offline, without our keys and
without trusting either witness.

One mechanism, so a reviewer can reject this stage by attacking exactly one thing: the claim that a
conflict between two compared views must become evidence.

### 1.3 The three laws

**No Two Compared Histories.**

> For any committed scope, if a compliant comparator receives two individually valid but incompatible
> producer checkpoints, it deterministically emits canonical equivocation evidence binding both views.

The law is deliberately conditioned on comparison, and the earlier draft was not. "No Two Histories"
asserted something §1.4 denies: a perfectly partitioning producer can hold two histories forever if
the views never meet. The law states the **safety** property — when both views meet, evidence must
emerge — and makes no **liveness** claim that they will.

**No Self-Witness.**

> A producer identity is ineligible for its own witness quorum. Eligibility and distinctness are
> evaluated over committed witness identities, not signature instances or key aliases.

**No Quorum Laundering.**

> A quorum counts only distinct, policy-authorised witness identities signing the exact checkpoint,
> scope, epoch and witness-policy commitment. Duplicate, aliased, replayed, wrong-scope, wrong-policy
> and producer-controlled signatures contribute zero quorum weight.

The three are non-overlapping by construction: conflicting compared views become evidence; the
producer cannot witness itself; signatures cannot be rearranged into a counterfeit quorum.

### 1.4 The honest core, signed up front — comparison-bounded detection

**Comparison-bounded detection** is a named property of this stage, not a disclaimer appended to it:

> 5S guarantees equivocation evidence generation once incompatible valid views enter the same
> compliant comparison set. It does not guarantee gossip delivery, view convergence, witness honesty,
> network availability, or global discovery of every fork.

The green verdict therefore reads, exactly:

> **Green means no equivocation was demonstrated within the compared view set. It does not mean the
> producer did not equivocate elsewhere.**

This bound is not closable by more signatures. It is closable only by making views meet, which is a
delivery problem rather than a cryptographic one — the same bound Certificate Transparency's gossip
literature carries. It is this stage's declared attack surface and the natural target of a successor.

### 1.5 Ledger targets

Neither IOU is marked PAID here. A design section may **target** a discharge; only the acceptance
matrix and the closeout gates may record one.

| ledger item                                      | origin                                | status                           |
| ------------------------------------------------ | ------------------------------------- | -------------------------------- |
| **I8** `checkpoint_witness_cosigning`            | minted by 5M, `stage5m/constants.mjs` | **targeted for discharge by 5S** |
| **4L deferred v1** — `cluster_view_equivocation` | seeded 2026-07-03, 4L §7              | **targeted for discharge by 5S** |

Both are the same mechanism — comparing signed roots across independently received views to detect a
producer showing different histories to different auditors — so paying both does not give this stage
two cores. 5S adopts 4L's name rather than inventing a synonym for it.

**Stage 5R's named ceiling.** 5R recorded that closing its C1→C2 back-fitting gap "needs an external
witness over C1 — a timestamp authority or a transparency log." **5S supplies the external-witness
mechanism over 5R's C1 commitment.** The stage is a protocol and an evidence system; it is not
itself an independent witness, and it must not be described as one.

### 1.6 Prior art, positioned honestly

5S claims **no novelty in witness co-signing as a mechanism.** That is prior art, and the sources are
named rather than gestured at: CoSi (Syta et al.), Certificate Transparency gossip, CONIKS, the Go
checksum database's witnesses, Sigstore/TUF checkpoint co-signing, and SCITT receipts.

> **Novelty hypothesis:** quorum-witnessed containment checkpoints whose conflicts become
> recomputable, typed evidence within the Completeness lattice.

It stays a **hypothesis** until the prior-art gate passes. It is not upgraded to "novel contribution"
by this document, and any figure taken from a secondary source is marked "reported" until its primary
is pinned.

### 1.7 Gate lifecycle

`docs/research/llm-shield/references/gate-lifecycle.md` became repository doctrine on 2026-07-28, and
5S is the first stage it judges. Every gate this stage installs carries all six declaration fields in
§6 — `active_phase`, `protected_surface`, `next_phase_behaviour`, `maintenance_behaviour`,
`sunset_or_migration_condition`, `anti_vacuity_condition` — decided at spec time rather than
discovered by a successor. Concretely, and from birth:

- the CI trigger is `paths:`-scoped to 5S-owned files (Q1-F005);
- every pin is a **set**, never a count (Q1-F002);
- every range-diff gate declares an anti-vacuity condition, and an empty range with a dirty tree is a
  refusal rather than a pass (Q1-F004).

---

_Sections §2 (artifact schema, raw codes, frozen check order), §3 (evidence lanes, attestation,
parity), and §4 (Lean theorems, non-claims, limitations, wedge, scorecard) follow, each presented for
approval before it is written._

---

## §2 Artifacts, raw codes, and the frozen check order

Frozen 2026-07-28 after three review rounds. The rounds are recorded because each closed a real
trapdoor: round one had no producer authentication (the artifact proved conflicting witnessed
objects, not producer equivocation); round two let a producer escape the fork coordinate by changing
its own policy digest, and let a quorum shortfall suppress equivocation evidence; round three left
receiver authority, signed absence, and the indeterminate outcome undefined.

### 2.1 Nine artifacts

| artifact                      | binds                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `witness_policy`              | `scope_id`, `policy_id`, `threshold_q`, roster (witness identity → key digest), producer identity, **`producer_key_digest`**, **`producer_signature_profile`**, canonicalisation profile, `policy_digest` |
| `comparison_policy`           | `comparison_roster` (receiver identity → key digest), receiver signature profile, strong-tier intake rule, `comparison_policy_digest`                                                                     |
| `checkpoint`                  | `scope_id`, `epoch`, `history_root`, `predecessor`, `c1_commitment`, `protocol_version`, `policy_digest`, producer identity, `producer_signature` + profile                                               |
| `witness_statement`           | the **`checkpoint_envelope_digest`**, every binding field above, witness identity, profile, signature                                                                                                     |
| `quorum_certificate`          | a checkpoint + the statements satisfying the committed `q-of-n`                                                                                                                                           |
| `view_receipt`                | `receiver_identity`, `receiver_key_digest`, `scope_id`, `epoch`, `checkpoint_envelope_digest`, `policy_digest`, `receiver_sequence`, profile, signature                                                   |
| `receiver_unavailable_status` | `receiver_identity`, `receiver_key_digest`, `scope_id`, expected receipt coordinate, `receiver_sequence`, `reason_code`, `comparison_policy_digest`, profile, signature                                   |
| `comparison_manifest`         | `comparison_scope`, set-canonical input digests, receiver provenance, comparator version, `policy_digest`, `comparison_policy_digest`, `comparison_set_digest`                                            |
| `equivocation_artifact`       | both checkpoints, both statement sets, the receipts that carried them, and the deterministic compatibility derivation                                                                                     |

**Authority is never self-conferred.** A checkpoint cannot authorise its own signing key, so the
producer key is committed in `witness_policy`. A comparator cannot authorise its own receivers, so
the comparison roster is committed in `comparison_policy` — a roster authored by the comparator being
checked proves nothing about the comparator being checked.

**`receiver_unavailable_status` carries two locked rules.** It contributes to **intake completeness
only**. It never contributes a view, quorum weight, corroboration, or clean-comparison evidence — a
signed absence that could become a synthetic observation would be an attendance record voting.

### 2.2 Two digests, two jobs

```text
checkpoint_body_digest      canonical checkpoint fields, NO signature material
checkpoint_envelope_digest  body + producer signature + profile + committed key digest
```

Witness statements and view receipts bind the **envelope**; compatibility compares the **body**. Two
valid signatures over identical content may differ in envelope bytes, and that must never read as a
fork. Ed25519 is deterministic, but the protocol does not rest on that accident.

### 2.3 The fork coordinate, and why it is this small

```text
fork_coordinate = (producer_identity, scope_id, epoch)
```

`policy_digest` and `protocol_version` are **uniqueness-bearing fields**, not coordinate components,
alongside `checkpoint_body_digest`, `history_root`, `predecessor` and `c1_commitment`. Carrying them
in the coordinate would let a producer change its own policy digest and have two same-epoch forks
classified as unrelated objects — the escape hatch closed in review round two.

### 2.4 The compatibility relation, frozen

```text
body digests equal                                          → SAME CHECKPOINT
same (producer, scope, epoch) and bodies differ             → INCOMPATIBLE
different epochs, valid transitive ancestry, and every
  policy/version transition authorised by committed rule    → COMPATIBLE
different epochs, neither a valid ancestor of the other     → INCOMPATIBLE
ancestry unprovable from the committed inputs               → INDETERMINATE
```

**Transitive ancestry**, never `later.predecessor == earlier.body_digest`: a canonical ordered
ancestry proof, each link body→predecessor, with cycle rejection, missing-link rejection, epoch gaps
only where policy commits `allow_epoch_gaps`, and an authorised transition record for any policy or
protocol change along the chain.

`INDETERMINATE` is a fourth deterministic outcome, not a soft failure. Failing closed here would
accuse a producer of forking because our inputs were short, which inverts this project's honesty
rule. A valid but incomplete committed record is indeterminate — not invalid, and not clean.

### 2.5 Quorum and comparison are independent lanes

```json
{
  "ok": true,
  "quorum_status": { "a": "witnessed_quorum", "b": "quorum_incomplete" },
  "comparison_status": "equivocation_detected",
  "finding_codes": ["VWQ_EQUIVOCATION_DETECTED"],
  "intake_complete": false
}
```

Structural invalidity stops verification. **A quorum shortfall never suppresses valid
equivocation evidence**: two authenticated producer signatures over incompatible checkpoints prove
the producer signed both, and no witness is needed to establish that. The earlier single-`outcome`
enum could not represent these independent facts, and reaching `QUORUM_BELOW_POLICY` first would have
violated No Two Compared Histories inside the stage that declares it.

`comparison_indeterminate` is reported as
`{ "comparison_status": "comparison_indeterminate", "reason": "ancestry_unprovable_from_committed_inputs", "finding_codes": [] }`.

### 2.6 Intake completeness is a tier, never an assumption

| tier       | condition                                                                          | outcome name                              |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| **narrow** | committed comparison set only                                                      | `no_conflict_in_committed_comparison_set` |
| **strong** | every roster receiver returned a signed receipt **or** a signed unavailable status | same, with `intake_complete: true`        |

The phrase "views that reached us" appears nowhere in this stage's output or prose, because intake
completeness is machine-checked only in the strong tier.

### 2.7 Raw codes — band 475–512, allocation frozen

| band              | codes                                                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| structural        | 475 `SCHEMA_UNSUPPORTED` · 476 `CANONICALISATION_UNKNOWN`                                                                                                                                                                                                  |
| checkpoint+produ. | 477 `CHECKPOINT_BINDING_MISMATCH` · 478 `PRODUCER_IDENTITY_MALFORMED` · 479 `PRODUCER_SIGNATURE_INVALID` · 480 `C1_COMMITMENT_UNBOUND` · 481 `PROTOCOL_VERSION_MISMATCH` · 482 `EPOCH_INVALID` · 483 `HISTORY_ROOT_MISMATCH`                               |
| witness policy    | 484 `POLICY_NOT_COMMITTED` · 485 `POLICY_MALFORMED_OR_ROSTER_INVALID` · 486 `POLICY_DIGEST_MISMATCH` · 487 `PRODUCER_KEY_NOT_COMMITTED`                                                                                                                    |
| witness identity  | 488 `WITNESS_IDENTITY_MALFORMED` · 489 `WITNESS_NOT_IN_ROSTER` · 490 `WITNESS_SIGNATURE_INVALID`                                                                                                                                                           |
| laundering        | 491 `PRODUCER_SELF_WITNESS` · 492 `WITNESS_KEY_ALIASED` · 493 `WITNESS_DUPLICATE`                                                                                                                                                                          |
| replay            | 494 `CROSS_EPOCH_REPLAY` · 495 `CROSS_SCOPE_REPLAY`                                                                                                                                                                                                        |
| quorum            | 496 `QUORUM_BELOW_POLICY`                                                                                                                                                                                                                                  |
| comparison policy | 497 `COMPARISON_POLICY_NOT_COMMITTED` · 498 `COMPARISON_POLICY_MALFORMED_OR_ROSTER_INVALID` · 499 `COMPARISON_POLICY_DIGEST_MISMATCH`                                                                                                                      |
| receiver          | 500 `RECEIVER_IDENTITY_MALFORMED` · 501 `RECEIVER_NOT_IN_COMPARISON_ROSTER` · 502 `RECEIVER_RECEIPT_SIGNATURE_INVALID` · 503 `RECEIVER_KEY_ALIASED` · 504 `RECEIVER_DUPLICATE` · 505 `RECEIVER_STATUS_MALFORMED` · 506 `RECEIVER_STATUS_SIGNATURE_INVALID` |
| comparison        | 507 `COMPARISON_MANIFEST_NOT_COMMITTED` · 508 `COMPARISON_SET_INSUFFICIENT` · 509 `ANCESTRY_PROOF_INVALID` · 510 `EQUIVOCATION_ARTIFACT_INVALID`                                                                                                           |
| claim gate        | 511 `NONEQUIVOCATION_OVERCLAIM`                                                                                                                                                                                                                            |
| wrapper           | 512 `VWQ_UNKNOWN` — **last**                                                                                                                                                                                                                               |

38 codes. The band grew by twelve across three review rounds, and that is the correct direction: a
neat number is not a security property.

**`VWQ_EQUIVOCATION_DETECTED` consumes no raw code.** It is a finding id in the 5S finding ledger.
The verifier exits **0** with a typed finding when both inputs are valid, incompatibility is
correctly derived, and the artifact self-verifies. Only a malformed, inconsistent or falsely derived
artifact takes a non-zero exit (510), and only a malformed or falsely derived ancestry proof takes 509. CI visibility comes from asserted outcomes — expected `equivocation_detected`, actual
`equivocation_detected`, test passes — preserving 5Q's separation between a finding about a producer
and a failure of the verifier.

### 2.8 Frozen first-failure order

```text
structural  →  checkpoint + producer  →  witness policy  →  witness identity  →
laundering  →  replay  →  quorum  ⟂  comparison policy  →  receiver  →  comparison
→  claim gate  →  wrapper
```

Two orderings are load-bearing, and one separation is:

- **policy before roster.** Roster membership, aliasing, self-witness, duplication and threshold are
  all undecidable until the committed policy has been loaded and verified.
- **sufficiency before cleanliness.** `COMPARISON_SET_INSUFFICIENT` precedes any clean verdict, so a
  comparator that compared fewer than two committed views can never emit this stage's strongest
  green. That is the blade's own anti-vacuity condition.
- **`⟂` marks the lane split.** Comparison does not sit downstream of quorum; the two lanes are
  evaluated independently and reported independently.

`comparison_clean` additionally requires `distinct_committed_receivers >= 2`, over authenticated
receipt provenance rather than array position, so copying one checkpoint twice manufactures nothing.
Two receivers reporting the same envelope digest is corroboration and stays clean; two reporting
different bodies at one fork coordinate is the finding.

### 2.9 Code 511's declared scope

A **fail-closed lexical drift detector over a set-pinned collection of Stage 5S-authored claim
surfaces**: signed claim and non-claim fields, the 5S README and closeout text, generated evidence
summaries, release metadata, and machine-readable scorecard text. It does **not** scan arbitrary
repository prose, quoted prior art, test attack strings, historical stage documents, or third-party
content. It lives in the release/claim-gate ledger, not in the core verifier's artifact-validation
path.

> Signed non-claim: the gate is a fail-closed lexical drift detector over declared Stage 5S-authored
> surfaces. It is **not** a semantic proof that every possible paraphrase of an overclaim is absent.

4X's lexical-≠-semantic bound is inherited here rather than re-litigated.

### 2.10 Implementation obligations this allocation creates

Additive raw codes have rippled before, and the ripple is named here so no task discovers it late:
both `exit-map.json` goldens and `tests/unit/llmShield/stage4h/exitWrapper.test.js` move with any new
code; the unknown-code probe uses `UNKNOWN_RAW_PROBE` (999) rather than a hardcoded free value; and
the full Node-26 e2e plus every prior stage's reproduce script runs before push, because additive
changes must not disturb sealed history.
