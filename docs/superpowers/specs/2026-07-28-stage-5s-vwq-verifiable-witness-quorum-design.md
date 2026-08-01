# Stage 5S — VWQ: Verifiable Witness Quorum

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

|               |                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage id      | `5S`                                                                                                                                            |
| Name          | **VWQ — Verifiable Witness Quorum**                                                                                                             |
| Branch        | `stage-5s-vwq-verifiable-witness-quorum`                                                                                                        |
| Target tag    | `v2.54.0-stage-5s-vwq`                                                                                                                          |
| Predecessor   | 5R (VPF), `v2.53.0-stage-5r-vpf`, main `c82613f3`                                                                                               |
| Baseline      | main `7a9bd5d4` — after the Q1-F001 gate repair, Annex A5, the gate-lifecycle invariant and its fix                                             |
| Design ruling | 2026-07-28, §1 approved with four mandatory edits, all applied below                                                                            |
| Raw codes     | Band opens at **475** — 5P's `VSI_ALLOCATED_HI` is 474 and `VSI_AMENDMENT_FROM` is 473; 5Q and 5R allocated none. Allocation is frozen in §2.7. |

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

---

## §3 Evidence lanes, independence, attestation, and parity

Frozen 2026-07-28. §3's whole subject is one seam: the difference between machinery that works and
witnesses that are independent. 5P already paid for blurring it — distinct keys, a shared operator
login, outcome `identity_unresolved`, party independence undischarged and no score moved. §3 makes
that outcome structurally unreachable by refusing to let independence be inferred from anything.

### 3.1 Ruling: external anchors carry zero witness weight

A witness statement attests:

> I verified and signed this producer-authenticated checkpoint tuple under the committed witness
> policy.

An RFC-3161 token, a Rekor entry or a Bitcoin/OTS attestation attests something strictly narrower:

> This digest was externally anchored or observed under this service's mechanism.

Those are different propositions, and letting the narrower one satisfy a threshold defined over the
wider one is evidence-type laundering. **External anchors contribute zero witness weight and may
never count toward `threshold_q`.** They are reported beside the quorum, never inside it.

Enforcement needs no new code: an anchor is not a roster identity, so any attempt to feed one into
the quorum lane exits **489 `WITNESS_NOT_IN_ROSTER`** inside the frozen order. The band does not move.

### 3.2 Four independent statuses

```json
{
  "quorum_status": "witnessed_quorum",
  "witness_independence_status": "unproven",
  "external_corroboration_status": "satisfied",
  "comparison_status": "no_conflict_in_committed_comparison_set"
}
```

No status is derivable from another. A satisfied corroboration status never upgrades
`witness_independence_status`; a met quorum never implies a clean comparison; a clean comparison
never implies no fork occurred outside the committed set (§1.4).

### 3.3 Two policy blocks, deliberately not one

```text
witness_quorum_policy
  threshold_q
  full-tuple witness roster
  required witness-class mix

external_corroboration_policy
  minimum distinct anchor mechanisms
  permitted ecology classes
  required envelope digest
  freshness / inclusion requirements
```

Lane C may satisfy `external_corroboration_policy` and nothing else. A malformed or unmet
corroboration policy yields `external_corroboration_status: "not_satisfied"` — a status carried in
the attestation, **not** a core-verifier refusal, so no raw code crosses the §2 freeze for a lane
that is never CI-gated.

The claim this makes available is:

> **Externally corroborated checkpoint digest.**

It is not, and 511 forbids writing:

> ~~Independently witnessed quorum.~~

A genuinely independent quorum remains future work until an external operator signs the full witness
tuple. That is stated as a debt, not deferred silently.

### 3.4 Two taxonomies, so accidental counting is structurally impossible

```text
witness_operator_class            external_anchor_class
  same_operator_distinct_key        rfc3161
  distinct_operator_self_asserted   rekor
  unresolved                        bitcoin_ots
```

They are separate enumerations over separate roster structures. There is no value an anchor can take
that is also a witness-operator class, so the two can never be summed by accident — the type system
refuses before any policy check runs.

| class                             | what it structurally establishes                         | what it does not                                     |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `same_operator_distinct_key`      | separate keys, separate processes, no shared key custody | nothing about independence — we hold every key       |
| `distinct_operator_self_asserted` | a third party ran it and asserts independence            | their assertion is our input, not our evidence       |
| `unresolved`                      | nothing                                                  | the honest default, and 5P's actual recorded outcome |

**The rule.** `witness_quorum_policy` declares the required class mix. A quorum met entirely by
`same_operator_distinct_key` reports `witness_independence_status: "unproven"`, and the phrase
"independently witnessed" is structurally unavailable to that run — enforced by the 511 claim gate
over the declared surfaces of §2.9, not by author discipline.

### 3.5 What an external anchor establishes, worded to be checkable

The wording avoids any claim about who operates the anchor or what they know:

> The anchor is operated outside the project's key custody and execution environment, and verifies
> against an independently established public trust mechanism.

That sentence is true of a decentralised anchor with no operator at all, which is why it replaces the
unverifiable "the operators do not know us".

> Signed non-claims: external anchoring is not proof of non-collusion; not proof of organisational
> independence; not an endorsement of Simurgh's semantics by any anchor operator; and not proof that
> the submitted digest represented truthful content. An anchor observes a digest. It reads nothing.

### 3.6 The artifact's absence is typed, never null

The attestation root binds a typed status, never a nullable artifact slot:

```text
equivocation_artifact_status:
  present
  absent_same_checkpoint
  absent_compatible
  absent_comparison_unavailable
  absent_comparison_indeterminate
```

and **always** binds, in every outcome including `present`:

```text
comparison_manifest_digest
comparison_status
intake_complete
```

A reader who sees `absent_comparison_unavailable` learns that nothing was compared. A reader who sees
a null field learns nothing and assumes the best. **An absent artifact is never shorthand for "no
fork existed"** — the five variants exist precisely so that sentence cannot be written by omission.

### 3.7 Lane A — byte-stable committed pack, CI-gated

Fixtures cover all **38** frozen codes plus the tamper matrix, offline and deterministic, `cmp`-stable
under Node 26. Six fixture families are mandatory because each encodes a ruling rather than a code:

1. a finding emitted **despite** a quorum shortfall on one view — equivocation detection does not
   depend on quorum success;
2. the same checkpoint **body** under differing envelope signatures — corroboration, stays clean;
3. a policy/protocol-version dodge at one `(producer_identity, scope_id, epoch)` — still one fork
   coordinate;
4. invented receiver identities absent from the comparison roster;
5. incomplete ancestry returning `indeterminate` rather than a fork;
6. an external anchor inserted into the quorum lane, which **must fail** at 489.

Family 6 is the machine-checked form of §3.1. Without it the ruling is prose.

### 3.8 Lane B — multi-process, not multi-party

The lane's own output carries this sentence, and the attestation binds it:

> Separate OS processes with separately generated keys and protocol-only communication under one
> operator-controlled environment.

Every witness in Lane B is therefore `same_operator_distinct_key` and
`witness_independence_status` is `unproven` **by construction**, not by measurement.

What is mechanically tested: each role runs as a distinct process with keys generated in its own
directory and never co-resident; each process's input set is captured as a per-process input manifest
and asserted equal to its declared protocol inputs, so no role reads another's key path or internal
state.

What is a design property and is **not** claimed as tested: freedom from covert channels. One
operator, one filesystem, one kernel — "blind to each other's state" in the strong sense is not
something this lane can establish, so it is not asserted.

### 3.9 Lane C — real external anchoring, captured, never CI-gated

Digest-only submission of the checkpoint envelope digest to the ecology classes 5M already pinned,
then frozen as captured evidence.

It demonstrates external digest anchoring; verification against independent public mechanisms; and
5R's C1 commitment bound indirectly through the checkpoint envelope digest.

It does not demonstrate full-tuple witness semantics, quorum participation, policy interpretation, or
any independent review of the checkpoint's contents.

### 3.10 The blade must be shown going red

5R's tranche discharged zero cells because its probe could not execute, and a stage that can only
report green measures nothing. So 5S runs a **deliberate producer equivocation**: our own producer
signs two incompatible checkpoints at one fork coordinate, both reach committed receivers, and the
comparator must emit a self-verifying artifact. The negative control is equally load-bearing: a
normal epoch advance with valid transitive ancestry must return compatible, never a fork. Both are
pinned fixtures.

> Signed non-claim: a self-inflicted equivocation demonstrates the detector. It is not evidence that
> any provider equivocated, and it is not an accusation against anyone.

### 3.11 Attestation and parity

Two-tier as always — public structural bundle, audit rerun — signed offline with a stage key at
`~/.simurgh/5s-ed25519.pem`, never committed; verification requires no private key and refuses `--key`.

The attestation root binds: both policy digests, the quorum certificate, the four statuses of §3.2,
the declared class mix, the typed artifact status and the three always-bound comparison fields of
§3.6, the Lane B environment sentence of §3.8, and the C1 binding into 5R.

Parity across Node core, Node portable, Python and browser on the deterministic surface:
canonicalisation, the body/envelope digest split, the compatibility relation, ancestry validation,
and quorum arithmetic. Crypto verification remains a separate contract, as 5R scoped it.

### 3.12 What §3 does not claim

- not that our witnesses are independent, unless the class mix says so and the operators are external;
- not that any anchor operator endorses our semantics — an anchor observes a digest;
- not that an absent artifact means no fork occurred;
- not that a self-inflicted equivocation says anything about any real provider;
- not that Lane B's processes are free of covert channels.

---

## §4 Lean theorems, non-claims, limitations, wedge, and scorecard

Frozen 2026-07-28.

### 4.1 Five theorems, each narrow enough to match the executable relation

Every theorem below is a statement about the same relation the verifier evaluates, over the same
frozen artifact algebra of §2. Zero `sorry`, and the escape scan of the repaired Q1-F001 gate is what
enforces that — not the type-check, which exits 0 on a `sorry`-closed theorem.

| theorem                                        | statement                                                                                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProducerCannotSelfWitness`                    | no accepted quorum contains a statement whose witness key digest equals the committed `producer_key_digest`                                                     |
| `QuorumRequiresDistinctEligibleWitnesses`      | an accepted quorum has at least `threshold_q` pairwise-distinct roster-eligible witness identities, after alias and duplicate collapse                          |
| `ComparedSameCoordinateConflictYieldsEvidence` | two valid views incompatible at one `(producer_identity, scope_id, epoch)` inside a compliant comparison set derive an equivocation artifact that self-verifies |
| `QuorumShortfallCannotSuppressEquivocation`    | the derivation above is independent of either view's quorum status — a shortfall changes `quorum_status` and cannot change `comparison_status`                  |
| `CompatibleAncestryCannotYieldEquivocation`    | a valid transitive ancestry chain between two views yields `compatible`, never a fork — the negative control, proved                                            |

The fourth is the stage's sharpest. It closes the trapdoor found in round two of the §2 review, where
a producer could publish a second, deliberately under-witnessed view and have the comparator report a
shortfall instead of a fork — equivocation laundered as an incomplete quorum. It is proved rather
than tested because the property is about the _shape_ of the derivation, and a test can only sample
the shortfalls it thought to construct.

**What the theorems deliberately do not touch:** actual receiver delivery, operator independence,
external-anchor semantics, cryptographic unforgeability, and real-world honesty. Those are assumptions
or executable checks. A theorem over an assumed-honest witness proves the assumption, not the system,
and this repo does not ship Lean theatre.

**One demotion, recorded rather than quietly dropped.** The brainstorm list carried
`WitnessReplayCannotChangeCheckpointScope`. It is not in the five. Replay retains full executable
coverage at **494 `CROSS_EPOCH_REPLAY`** and **495 `CROSS_SCOPE_REPLAY`** with Lane A fixtures, and it
is the one candidate whose content is a field-equality check already inside the frozen check order.
The cost is real and stated: replay resistance is tested, not proved, in 5S.

### 4.2 The full non-claim set

The six locked at ruling time:

1. not physical time or trusted timestamping, except where a real TSA is used and only within that
   mechanism's own guarantees;
2. not witness honesty;
3. not network availability or liveness;
4. not prevention of equivocation;
5. not global transparency outside the participating witness set;
6. not that quorum agreement makes the checkpoint truthful.

Added here, and signed with the same weight:

7. not proof that all views were received, unless `intake_complete: true`;
8. not proof that witnesses are organisationally independent;
9. not proof that witnesses inspected or understood checkpoint semantics — a witness signs a tuple;
10. not proof that any external anchor signed the witness tuple;
11. not proof that a clean comparison excludes a partitioned fork;
12. not proof of physical time ordering, except within an external mechanism's own guarantees;
13. not proof that the producer's underlying containment evidence is truthful merely because its
    checkpoint was witnessed;
14. not prevention of equivocation — restated deliberately, because it is the non-claim most likely
    to erode under summary.

**Stated concretely for 3L-class containment failures** — the reference capture where a real model's
output had to be contained after the input filter missed:

> 5S can expose inconsistent signed containment histories once they are compared. It does not stop
> the model, the gateway, or the operator from producing the first bad history. It makes the second,
> contradictory story **detectable and attributable once compared** — not the first one impossible.

"Expensive" was the drafting word and is retired from every claim surface: cost is interpretive
unless a stage measures it, and 5S measures no cost. The 511 denylist pins the retirement, so the
word cannot reappear in a signed claim, a generated summary or the closeout by drift.

### 4.3 Limitations, separated by layer

Layering them keeps the partition bound from being buried among engineering caveats, which is exactly
how a hard limit becomes a footnote.

**Protocol limitations.** The fork coordinate is `(producer_identity, scope_id, epoch)`; a producer
operating under a genuinely different committed identity is a different producer, not a fork.
Ancestry is verified transitively with `allow_epoch_gaps` and authorised transition records, so an
unauthorised history rewrite that forges no signature still requires a valid chain — but a chain the
comparator never sees is not evaluated.

**Comparison and gossip limitations.** The bound of §1.4. A perfect partition — two audiences that
never share a view — produces no artifact, and 5S reports that honestly as
`absent_comparison_unavailable` or an insufficient set, never as a clean verdict. This is not
closable by more signatures; it is closable only by making views meet.

**Identity and independence limitations.** Every Lane B witness is `same_operator_distinct_key`, so
`witness_independence_status` is `unproven` by construction. `distinct_operator_self_asserted` is an
input, not evidence. 5P's undischarged party independence is inherited here, not solved.

**External-anchor limitations.** An anchor observes a digest and reads nothing. Anchors carry zero
witness weight, satisfy only `external_corroboration_policy`, and their time guarantees are exactly
their own mechanism's — no more.

**Implementation and evaluation limitations.** Lane C is captured and never CI-gated, so it is
evidence of one execution rather than a continuously verified property. Byte-stability of the 4H
digest builder holds only under Node 26. Code 511 is lexical, not semantic, inheriting 4X's bound.
Covert channels between Lane B processes are unclaimed and untested.

### 4.4 The wedge — containment evidence becomes fork-accountable

The wedge is not that we invented witness co-signing; §1.6 already concedes the mechanism to prior
art. It is this:

> **A deployment can no longer safely show one signed containment history to one auditor and a
> different signed containment history to another, once those authenticated views enter the same
> committed comparison set.**

Which composes with the post-guardrail thesis the repo has been building since 3E:

```text
guardrail may miss
containment boundary may act
checkpoint records the consequence
witness quorum authenticates the checkpoint
comparison converts conflicting histories into recomputable evidence
```

Every rung before this one made a single history recomputable. 5S is the first that makes **two
histories mutually accountable** — the first place in the ladder where telling two stories is itself
a detectable, typed, offline-verifiable event rather than a matter of whose copy you happened to read.

**The founder's ledger entry.** The concrete external actor who could run this verifier tomorrow is a
second auditor of the same deployment — a regulator's technical reviewer holding one signed
containment history while a customer's assurance team holds another. The single blocker is that no
external operator yet signs the full witness tuple, which is precisely what §3.3 records as a debt
and what 5T is scheduled to attack.

### 4.5 Scorecard — pre-freeze targets

These are targets. Closeout re-scores independently, and a downgrade there is a feature.

| axis                   | target  | reasoning                                                                                                                                  |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Novelty**            | **8.6** | mechanism novelty is moderate and conceded; compositional novelty is stronger — conflict-as-typed-evidence inside the Completeness lattice |
| **Frontier relevance** | **9.4** | multi-party assurance of AI containment claims is live, unsolved, and being legislated into existence                                      |
| **Good for Anthropic** | **9.5** | third-party assurance without trusting the producer, and honest uncertainty reported as typed status rather than absence                   |
| **Constitution**       | **9.2** | infrastructure alignment only — machine-checkable honesty about what was and was not established                                           |

Novelty sits below 9 deliberately. Consecutive 9s stop discriminating, and this stage's core mechanism
is genuinely prior art.

**What moves each higher — buildable artifacts, tracked as debts, not aspirations:**

- **Novelty → 9.2:** a real fork detected between two views the project did not author.
- **Frontier → 9.7:** a second party running the verifier against a deployment we do not operate.
- **Anthropic → 9.8:** one external operator signing the full witness tuple, retiring §3.3's debt.
- **Constitution → 9.5:** a published contest path for a producer disputing an equivocation artifact,
  composing 4V's due-process machinery onto this stage's finding.

**The external anchor does not move the independence score.** Lane C is corroboration of a digest.
The semantic quorum remains same-operator until an external operator signs the complete tuple, and no
axis above is credited for anchoring as though it were independence.

### 4.6 Forward requirement on §6

Each gate 5S installs carries its six lifecycle declaration fields **adjacent to the gate's own
definition**, in the file where the gate lives. §6 provides the census and the set-pinned index; it is
not the only place the fields appear. A reviewer must never perform document archaeology to learn a
gate's successor behaviour — that failure mode is exactly what produced Q1-F002, F004 and F005.

---

## §5 Threat model and acceptance matrix

Frozen 2026-07-28.

### 5.1 Actors and their powers

Each actor is modelled separately, because a threat model that merges roles cannot express the attack
where one party holds two of them.

| actor               | powers granted in the model                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Producer**        | sign conflicting checkpoints; change policy or protocol-version fields; partition recipients; withhold views; attempt key substitution   |
| **Witness**         | refuse to sign; replay; duplicate; alias keys; sign conflicting checkpoints                                                              |
| **Receiver**        | lie about receipt; duplicate another receiver; suppress a view                                                                           |
| **Assembler**       | cherry-pick statements; count anchors as witnesses; manufacture quorum                                                                   |
| **Comparator**      | omit inputs; fabricate a clean result; supply incomplete ancestry                                                                        |
| **External anchor** | be delayed, unavailable or operationally compromised — but never interprets VWQ semantics, because it is only ever handed a digest       |
| **Reviewer**        | trusts only committed policy roots, public keys and offline verification — never our narrative, our tooling defaults, or our environment |

**Stated plainly:** a single operator may hold several distinct witness keys. That run can still
report `witnessed_quorum`, and it **must** carry `independence_unproven: true`. This is not an edge
case in the model — it is Lane B's normal, expected condition.

### 5.2 Trust assumptions, frozen apart from mechanisms

Assumptions are listed separately so no reader mistakes one for something 5S establishes:

1. signature unforgeability and digest collision resistance;
2. externally committed producer, witness and receiver keys are authentic;
3. detection requires at least one incompatible view to reach the committed comparison set;
4. strong-tier intake completeness depends on every expected receiver signing either a receipt or an
   unavailable status;
5. the verifier implementation matches the frozen algebra of §2 — parity across four runtimes is
   evidence for this assumption, not a proof of it;
6. same-machine process separation is not organisational independence.

### 5.3 Adversary wins — the failure vocabulary

```text
false_clean
    incompatible authenticated views compared but no finding emitted

false_equivocation
    compatible or indeterminate history accused as a fork

counterfeit_quorum
    ineligible, duplicated, aliased, replayed, producer or anchor material contributes weight

intake_laundering
    omitted receiver represented as complete intake

attribution_laundering
    unsigned or wrong-key checkpoint attributed to the producer

claim_laundering
    narrow comparison result presented as global non-equivocation
```

Every mandatory case in §5.5 names the win it denies. A case that denies no named win is decoration
and does not enter the matrix.

### 5.4 Acceptance matrix shape

No single expected-result column. Every independent dimension is pinned independently, because a
collapsed column lets a case pass for the wrong reason:

```text
case_id
verifier_exit
quorum_status_a
quorum_status_b
comparison_status
equivocation_artifact_status
finding_codes
intake_complete
witness_independence_status
external_corroboration_status
first_failure_code
```

The matrix is pinned **as a set of `case_id`s**, never as a count (Q1-F002). Added and removed cases
are computed and printed independently; the count is telemetry.

### 5.5 Mandatory case families

**1 — Clean mechanics.** One valid `q-of-n` checkpoint; two receivers reporting the same checkpoint;
compatible multi-epoch ancestry; a valid policy/version transition. _Denies:_ `false_equivocation`.

**2 — Equivocation.** Same coordinate with different bodies; two histories with neither an ancestor
of the other; and the full quorum cross-product:

| view A quorum | view B quorum | required `comparison_status` |
| ------------- | ------------- | ---------------------------- |
| met           | met           | `equivocation_detected`      |
| met           | incomplete    | `equivocation_detected`      |
| incomplete    | met           | `equivocation_detected`      |
| incomplete    | incomplete    | `equivocation_detected`      |

**All four combinations must yield `equivocation_detected`.** This is the executable form of
`QuorumShortfallCannotSuppressEquivocation`, and it is the direct answer to the reviewer question the
design most invites — _can a partially witnessed fork still disappear?_ — with four separate "no"
receipts rather than one argument. _Denies:_ `false_clean`.

**3 — Indeterminate.** A missing committed ancestry link; valid but incomplete ancestry inputs.
Neither a finding nor a clean result — the outcome is `indeterminate`, and both a green verdict and an
accusation are refused. _Denies:_ `false_equivocation` and `false_clean` simultaneously.

**4 — Attribution.** Producer key absent; wrong producer key; body/envelope digest confusion;
fabricated unsigned checkpoints. _Denies:_ `attribution_laundering`.

**5 — Quorum laundering.** Producer self-witness; key aliases; duplicate identity; cross-epoch replay;
cross-scope replay; an external anchor injected into the witness roster. _Denies:_
`counterfeit_quorum`.

**6 — Receiver laundering.** Invented receiver; aliased receiver keys; duplicate receipt; invalid
receipt signature; a receipt issued under the wrong comparison policy. _Denies:_ `counterfeit_quorum`
in the comparison lane.

**7 — Intake tiers.** Every receiver responds → `intake_complete: true`; one signed unavailable status
→ still complete; one receiver simply missing → `intake_complete: false`. An unavailable status
contributes no view, no quorum weight and no corroboration — it is an authenticated statement of
absence, not a vote. _Denies:_ `intake_laundering`.

**8 — Honesty.** An empty or insufficient comparison cannot reach green; a narrow result cannot be
rendered as "the producer did not equivocate"; every legitimate absence variant of §3.6 is exercised
and typed. _Denies:_ `claim_laundering`.

### 5.6 Closeout acceptance law

> **Stage 5S is accepted only if every raw code is reached at its frozen first-failure position, every
> typed outcome is reachable, all four quorum-status combinations preserve valid equivocation
> findings, compatible ancestry never yields an accusation, and no external anchor contributes witness
> weight.**

Five conjuncts, each independently falsifiable, none satisfiable by a passing test count. This is the
matrix's spine, and it is the sentence the closeout must defend rather than paraphrase.

---

## §6 Gates, write surface, and K7-A obligations

Frozen 2026-07-28. Three authorities, deliberately not merged: a mega-gate that answers "did
everything pass?" cannot answer "what exactly was evaluated?", and the second question is the one
that caught Q1-F001.

### 6.1 Authority 1 — the gate census

Every gate declares its six lifecycle fields **adjacent to its own definition**, in the file where the
gate lives (§4.6). This section carries the set-pinned index:

```text
declared_gate_ids
implemented_gate_ids
added      = implemented − declared
removed    = declared − implemented
```

Acceptance requires exact set equality; `added` and `removed` are computed and printed independently,
and either being non-empty is a refusal. The count is telemetry.

### 6.2 Authority 2 — the write surface

Pinned by path **and operation and purpose**, because a path allowlist alone lets an unrelated edit
hide inside a permitted file — the exact hole Annex A5 closed for maintenance:

```text
path
allowed_operation      add | modify
purpose
authorising_section
```

Five acceptance conditions, all required:

1. `changed_paths` is non-empty — an empty evaluated range with a dirty tree is a refusal, not a pass
   (Q1-F004);
2. `changed_paths ⊆ declared surface`;
3. no frozen prior-stage evidence modified;
4. no private key material, checked by path regex rather than by digit-bearing filename (5P);
5. no undeclared workflow-trigger expansion.

### 6.3 Authority 3 — K7-A obligations, enumerated by symbol

Obligations enumerate **functions and exported behaviours**, never files. A file-level row can be
satisfied by a suite that never invokes the export — which is how a census passes while a symbol goes
untested.

```text
obligation_id
implementation_symbol
runtime
required_case_ids
required_first_failure_codes
parity_requirement
status
evidence_digest
```

Every discovered in-scope symbol carries exactly one status: `covered`,
`excluded_with_signed_reason`, or `not_applicable_with_signed_reason`. No missing status, and no
generic "covered by suite" — a reason that names no mechanism is not a reason.

### 6.4 Gate families

**G1 — schema and raw-band lock.** Protects raw codes **475–512** (the frozen band of §2.7, not the
round-two draft), the exact first-failure order, the outcome schema, and the separation of finding ids
from verifier failures.
_active_ during 5S · _next phase_ stays active read-only, refusing any reallocation inside the band ·
_maintenance_ additive codes above 512 only, never renumbering · _sunset_ never, while the band is
referenced by a shipped verifier · _anti-vacuity_ at least one fixture reaches **every** raw code and
**every** typed outcome.

**G2 — acceptance-matrix completeness.** Protects the pinned case set of §5.4.
_active_ during 5S · _next phase_ active, set-pinned · _maintenance_ cases may be added, never
silently removed · _sunset_ never while §5.6 stands · _anti-vacuity_ added and removed case ids
proved separately; each case denies at least one named win; all four quorum-status combinations yield
`equivocation_detected`; `indeterminate` yields neither clean nor accusation.

**G3 — artifact and binding integrity.** Exercises all nine artifact forms of §2.1, including the
signed unavailable status, typed equivocation absence, body/envelope digest separation, external
producer-key commitment, and comparison-roster authority.
_active_ during 5S · _next phase_ active · _maintenance_ new artifact forms extend the set · _sunset_
never · _anti-vacuity_ every artifact form is constructed and tampered at least once.

**G4 — Lane A deterministic net.** Every frozen fixture and tamper case.
_active_ during 5S · _next phase_ active · _maintenance_ fixtures regenerate byte-identically ·
_sunset_ never · _anti-vacuity_ **byte stability across repeated generation** — one run is not
determinism evidence, so the gate builds twice and `cmp`s.

**G5 — Lane B ceremony.** Asserts mechanically: separate OS processes; separately generated,
never-co-resident keys; per-process input-manifest equality against declared protocol inputs; and
`independence_unproven: true` in the output.
_active_ during 5S · _next phase_ active · _maintenance_ additional roles extend the manifest ·
_sunset_ when an external operator signs the full tuple, at which point the class mix changes and this
gate's independence assertion is superseded rather than deleted · _anti-vacuity_ the ceremony must
produce a fresh certificate each run. **Does not gate on covert-channel claims** — §3.8 does not make
them.

**G6 — Lane C capture verification.** Split explicitly so network availability never becomes a release
dependency, while a stale or malformed capture still cannot ship:

```text
capture_required                     = false
frozen_capture_verification_required = true
```

_active_ during 5S · _next phase_ verification stays required · _maintenance_ re-capture replaces, and
supersedes rather than edits · _sunset_ never while the capture is cited · _anti-vacuity_ the frozen
capture is verified offline against its committed envelope digest, and an unverifiable capture is a
refusal rather than a skip.

**G7 — runtime parity.** Pins the shared deterministic surface: canonical serialisation, body and
envelope digests, the compatibility relation, ancestry, quorum arithmetic, and typed status rendering.
Exact result equality across Node core, portable Node, Python and browser.
_active_ during 5S · _next phase_ active · _maintenance_ new surface members must be added to all four
runtimes together · _sunset_ never · _anti-vacuity_ each runtime is executed and its results compared;
a runtime that fails to launch is a refusal, never a silent skip.

**G8 — Lean proof gate.** Uses the repaired self-enumerating repository-wide gate (Q1-F001); no
by-name file list, ever. Additionally pins the Stage 5S theorem names **as a set**, all five present
and type-checked:

```text
ProducerCannotSelfWitness
QuorumRequiresDistinctEligibleWitnesses
ComparedSameCoordinateConflictYieldsEvidence
QuorumShortfallCannotSuppressEquivocation
CompatibleAncestryCannotYieldEquivocation
```

_active_ during 5S · _next phase_ active repository-wide · _maintenance_ the theorem set is additive ·
_sunset_ never · _anti-vacuity_ the escape scan runs over every discovered proof, a seeded `sorry`
must fail the gate, and directory coverage is cross-checked by a mechanism distinct from enumeration.
The type-check alone is not the gate: `lean` exits 0 on a `sorry`-closed theorem.

**G9 — claim and non-claim gate.** Scans only the declared Stage 5S claim surfaces of §2.9.
Requires: code 511 red on every banned-phrase fixture; the signed non-claims present as an exact id
set; typed clean wording used; **"expensive" rejected**; global non-equivocation language rejected.
_active_ during 5S · _next phase_ active over 5S surfaces · _maintenance_ the denylist and the
non-claim id set are both additive · _sunset_ never · _anti-vacuity_ every banned phrase has a
positive fixture proving the gate goes red, and the surface set is proved non-empty.

**G10 — attestation and reproduction.** Two-tier: public structural verification and full audit rerun.
Requires the verifier to refuse private-key arguments; offline execution; byte-identical regeneration;
tamper rejection; a typed equivocation finding still exiting **0**; and an invalid equivocation
artifact exiting at its frozen raw code (510).
_active_ during 5S · _next phase_ active · _maintenance_ re-attestation regenerates byte-identically ·
_sunset_ never · _anti-vacuity_ both tiers execute, and a tier that verifies zero roots is a refusal.

### 6.5 CI trigger scoping and its self-test

The workflow is `paths:`-scoped to Stage 5S implementation, fixtures, the 5S proof file, 5S spec and
evidence, and any shared library 5S actually changes — nothing wider (Q1-F005).

The scoping is itself tested, because a trigger that silently stops firing is indistinguishable from a
gate that always passes:

```text
every owned path triggers
every unrelated prior-stage path does not trigger
the workflow file itself triggers
the trigger repair runs its own job
```

The last line is Q1-F005 carved into a test rather than remembered: 5R's gate fired on every pull
request to `main` and blocked the entire repository, and the fix would have been unverifiable if the
repair's own workflow had not been in scope.

### 6.6 Closeout law for §6

> **Stage 5S gates are accepted only when the declared gate set equals the implemented gate set, every
> gate evaluates a non-vacuous surface, every in-scope function carries a K7-A status, every Stage
> 5S-owned change is authorised by the frozen write surface, and successor-stage behaviour is declared
> before release.**

---

## §7 Gap hunt — four fronts swept 2026-07-29

Source-precision rule applies throughout: every figure or quotation below is taken from the primary
document, and anything reached only through a secondary source is marked **reported**.

### 7.1 Prior-art seam — witnesses authenticate, they do not interpret

The transparency.dev witness-network write-up concedes the seam in its own words:

> "Witnesses are not concerned with the contents of the log's leaves. For example for a firmware
> transparency log, a witness would not be able to validate legit firmware was logged."

That is the exact boundary §4.2 non-claim 9 already draws — a witness signs a tuple, it does not
understand containment semantics. 5S therefore claims nothing the witness literature has not already
built, and its contribution sits one layer up: what a **conflict between two witnessed views** turns
into. The mechanism concession of §1.6 stands and is now sourced rather than asserted.

### 7.2 Regulatory front — the second evaluator is arriving

From the Commission's own AI Act page: the Act "entered into force on 1 August 2024, and will be
fully applicable 2 years later on **2 August 2026**, with some exceptions"; GPAI obligations became
applicable 2 August 2025; and the Commission's evaluation capacity is "expected to be operational by
**2027**".

The relevance is structural, not rhetorical. 5S's blade only bites when **two parties hold
authenticated views of the same history** — and the regulatory architecture that creates a second
institutional evaluator is being stood up on exactly that timeline. A stage that makes two views
mutually accountable is early rather than speculative.

### 7.3 Lab surface — the two-version problem, conceded in primary text

Anthropic's Responsible Scaling Policy v3.0 §§3.5–3.6 describes precisely the two-audience structure
5S is shaped for, verbatim:

> "We will publish a public version of our Risk Report. We will aim to minimize redactions to the
> public version of the report."

> "This means working with one or more third-party organizations that will receive private versions
> of our Risk Reports (unredacted or with minimal redactions…) and publish comprehensive commentary
> on them… and whether the redactions we've made for the public version are reasonable and
> appropriate."

> "there are no well-established organizations or procedures for this sort of practice, and we are
> approaching it as an experiment."

> "'Significantly redacted' means that the redactions omit information a reasonable external safety
> researcher would consider important in evaluating the overall level of risk, such that a reader of
> only the public version could not meaningfully assess whether they agree with our conclusions."

Today the reviewer judges redaction reasonableness **by reading**. Nothing machine-checks that the
public version and the private version are views of one committed history rather than two.

**This is a composition, not a redirect, and it does not reopen §2.** A redaction is a projection at
the _document_ layer — 4M's monotone merge lattice — while a checkpoint commits to a `history_root`.
Both the public and private versions should bind the **same** checkpoint. Then:

- same `history_root` under two document projections → `compatible`, correctly clean;
- different `history_root` at one `(producer_identity, scope_id, epoch)` → the finding, correctly.

**New non-claim, signed: a redaction is not a fork.** 5S compares checkpoints, never documents.
Feeding a redacted _document_ into the comparator as though it were a second checkpoint is a misuse
that manufactures `false_equivocation` — the §5.3 win the stage is obliged to deny. Two additive
cases enter the matrix under G2's additive-maintenance rule, reopening nothing:

1. one `history_root`, two distinct document projections → `compatible`;
2. a document projection submitted in a checkpoint slot → refused as malformed, not compared.

### 7.4 Incident front — an honest negative

No publicly documented incident was found in which an AI provider gave one signed safety history to a
regulator and a different one to another auditor. The adjacent real enforcement activity is
"AI-washing" misrepresentation in investor materials, which is a different failure (a false claim to
one audience, not two inconsistent claims to two).

Recorded as a negative because it changes the honest framing: **5S is pre-incident infrastructure.**
It has no Brigandi-style wound to point at, unlike 4W. Building the detector before the incident is
the right order, and claiming a wound that has not been documented would be the exact dishonesty this
repo exists to make expensive — sorry, **detectable**.

### 7.5 Novelty hypothesis — verdict

Two primary sources bound the space from opposite sides. The witness literature does not look at what
is being witnessed (§7.1). The nearest safety-claim work — Vishwarupe, Shadbolt, Jirotka and Flechais,
_NeurIPS Should Require Reproducibility Standards for Frontier AI Safety Claims_, arXiv 2605.08192,
submitted 5 May 2026, whose "evidential inversion" already names 5H's code 312 — addresses the
reproducibility of an **individual** claim and explicitly not cross-party consistency.

The hypothesis of §1.6 therefore survives its first real test, still as a hypothesis: conflict-as-typed-evidence
over witnessed containment checkpoints is not occupied by either neighbour.

**Scorecard effect, deliberately small.** Novelty target **8.6 → 8.9**: the compositional claim is
better bounded than when it was scored, but the mechanism is still prior art and the composition is
still unbuilt. **Frontier stays 9.4** — §7.4's negative is a reason not to raise it, and the
regulatory timeline was already priced in. No other axis moves. An axis that moves on a literature
sweep alone is an axis measuring reading, not building.

---

## Annex M — the additive-ripple surface

Amendable section, added 2026-07-29 alongside the header correction. **§§1–7 are untouched.**

### M.1 The contradiction this resolves

§2.10 creates an obligation: an additive raw band ripples three Stage 4H goldens, and the stage is
required to move them. §6.2 creates a refusal: no prior-stage evidence may be modified. Both are
correct, and together they forbid the stage from doing what its own spec requires — the same shape as
5Q's Q0/Q1 deadlock, which Annex A5 resolved by naming exact paths rather than widening a category.

The resolution is the same: **three paths, one operation, one purpose.** Not "Stage 4H", not
"goldens", not "evidence needed by the ripple" — three literal paths.

### M.2 The surface

| path                                                              | op     | purpose                                                                                                                | id      |
| ----------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` | modify | additive raw-band ripple required by §2.10                                                                             | 5S-M001 |
| `docs/research/llm-shield/evidence/stage-4h/exit-map.json`        | modify | additive raw-band ripple required by §2.10                                                                             | 5S-M002 |
| `tests/unit/llmShield/stage4h/exitWrapper.test.js`                | modify | additive raw-band ripple required by §2.10                                                                             | 5S-M003 |
| `tools/simurgh-attestation/stage4h/exitCodes.mjs`                 | modify | extend the shared run-level raw-code ledger through the frozen Stage 5S band and regenerate its authorised projections | 5S-M004 |
| `tests/unit/llmShield/stage5o/exitCodes.test.js`                  | modify | move Stage 5O's successor-handoff assertion, which pins where the next band begins                                     | 5S-M005 |
| `tests/unit/llmShield/stage5p/rawCodeCensus.test.js`              | modify | widen Stage 5P's approved-documentation list, never its band regex                                                     | 5S-M006 |

The table is the authority. The write-surface checker **parses this annex** and never re-declares it,
because two copies of a declaration are two chances to disagree and the silent one is the copy nobody
reads.

**The fourth row was added on 2026-07-29, after Task 5 found that the annex authorised the three
projections but not the source that generates them (finding 5S-F005).** An authority to change an
output while its input stays forbidden is not an authority to do the work; it is a permission slip
for the half of the job that cannot be done alone.

Before the row was added, the binding of the evidence projection was checked rather than assumed: no
signed manifest covers `evidence/stage-4h/exit-map.json` by digest or by path, and Stage 4H's own
reproduce script regenerates it three times through `build-stage4h-digest-fixtures.mjs`. It is a
regenerated projection, not an immutable historical artifact, and that is why modifying it is
legitimate here. Had it been covered by a historical signature, the correct move was an additive
successor projection and this annex would say so.

**Rows 5S-M005 and 5S-M006 were added on 2026-07-29**, after the ripple turned two prior-stage
guards red. Neither is a defect in those guards; both are doing exactly their job.

Stage 5O asserts that 475 stays unallocated. Its own comment already explains the shape of that
statement: when 464 was released to 5P, the original "464 must stay unmapped" line "was recording a
temporary fact, not a Stage 5O invariant". 475 is the same kind of fact, and it becomes false the
moment a successor takes the handoff. The assertion moves to pin Stage 5S's band exactly, which is
strictly stronger than asserting an absence.

Stage 5P's census restricts where the literals 464-474 may appear, and its own comment states the
remedy in advance: "widen the approved list, never weaken the band regex. A successor stage must be
able to say which codes its predecessor consumed without laundering the literal out of the sentence."
5S's spec and plan cite 473 and 474 for exactly that reason. The list is widened; the regex is not
touched.

### M.3 What this annex does not authorise

- not `add` on any of the three paths — a ripple modifies existing goldens; creating a new one under
  a Stage 4H path is a different act and is refused;
- not any other Stage 4H file, and no file of any other prior stage;
- not a renumbering of an existing code. §2.7's band is frozen; this annex moves goldens **because**
  475–512 are additive, and an edit that changed an allocated code below 475 is outside it;
- not the deletion of any row. A ripple that removes a mapping is not additive.

### M.4 Lifecycle declaration

Annex M is a surface, and the gate-lifecycle invariant applies to surfaces as it does to gates.

```text
active_phase                 Stage 5S implementation, from Task 0 until the 5S tag
protected_surface            the three paths of M.2, under `modify` only
next_phase_behaviour         inert — a successor stage inherits no ripple authority from 5S and
                             declares its own annex if its band is additive
maintenance_behaviour        additive only: a successor may add a row for a path its own band
                             genuinely ripples, and may never broaden an existing row's operation
sunset_or_migration_condition  when the Stage 4H exit map moves behind a generated, non-committed
                             artifact, at which point no stage needs write authority over it
anti_vacuity_condition       the annex is only satisfied if the ripple actually occurred: the three
                             paths must differ from their pre-ripple bytes, and 4H's own suite must
                             pass over the new bytes. An unchanged golden is a refusal, not a pass.
```

The anti-vacuity condition is the one that matters. An authority to change three files, exercised by
changing nothing, is an authority that recorded a permission and proved no work — and this repository
has already shipped one gate that passed by evaluating an empty set.

### M.5 The frozen range, as a number rather than a promise

This annex asserts that §§1–7 are untouched. An assertion of that kind is worth exactly as much as
its recomputation, so the range is defined precisely and its digest is recorded:

```text
frozen_range        from the line `## §1 Identity, laws, and the blade`
                    up to the annex separator that precedes `## Annex M`,
                    trailing whitespace and the separator rule removed
frozen_range_digest e0d25ce115d0b945175ccff5fcadebcd017ea47af02a8f2a9b249364132b83ec
frozen_range_bytes  64240
```

The digest is identical at `76c469a0` (the freeze) and at the commit carrying this annex. Task 1's
pin test recomputes **both** the whole-file digest and this range digest, so an amendment that
accidentally reflows a frozen section is caught by the range even though the file digest was expected
to move.

A whole-file digest alone could not distinguish "the annex was added" from "the annex was added and
§4 was quietly reworded". Two digests can.

---

## Annex S — the Stage 5S owned surface

Amendable section, added 2026-07-29 during Task 2. **§§1–7 untouched**; the frozen-range digest of
Annex M.5 is unchanged by this annex and is re-verified by Task 1.

### S.1 Why an annex, and not §6.2

§6.2 declares the **schema** of the write surface — path, operation, purpose, authorising section —
and the five acceptance conditions. It never enumerates rows, so the surface it specifies has no
members. A contract with no instances refuses everything, which is fail-closed and useless.

Annex S instantiates it. §6.2 remains the authority on _shape_; this annex is the authority on
_membership_, and the checker parses both rather than declaring either.

### S.2 Two kinds of row, and why the distinction is principled

**Prefix rows** cover the stage's own tree. Every path under them exists because 5S created it, so
enumerating them one by one would be a list that grows with every task and disagrees with reality
between commits — a pin that is always slightly wrong teaches reviewers to ignore it.

**Exact rows** cover everything outside the stage's tree. Precision matters most where the blast
radius reaches other stages, which is why Annex M's three ripple paths are exact and are not
reachable from any prefix here.

| kind   | path                                                                                 | op         | purpose                                                       | id      |
| ------ | ------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------- | ------- |
| prefix | `tools/simurgh-attestation/stage5s/`                                                 | add-modify | the stage's implementation, mirrors and signer                | 5S-S001 |
| prefix | `tests/unit/llmShield/stage5s/`                                                      | add-modify | unit tests                                                    | 5S-S002 |
| prefix | `tests/e2e/llmShield/stage5s/`                                                       | add-modify | e2e nets                                                      | 5S-S003 |
| prefix | `proofs/stage5s/`                                                                    | add-modify | Lean theorems                                                 | 5S-S004 |
| prefix | `docs/research/llm-shield/evidence/stage-5s/`                                        | add-modify | this stage's evidence only                                    | 5S-S005 |
| exact  | `docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md` | add-modify | amendable annexes; §§1-7 protected by the frozen-range digest | 5S-S006 |
| exact  | `docs/superpowers/plans/2026-07-29-stage-5s-vwq-implementation-plan.md`              | add-modify | the plan and its pin block                                    | 5S-S007 |
| exact  | `.github/workflows/stage-5s-checks.yml`                                              | add-modify | this stage's CI trigger                                       | 5S-S008 |
| exact  | `scripts/reproduce-llm-shield-stage5s.sh`                                            | add-modify | this stage's reproduce script                                 | 5S-S009 |
| exact  | `scripts/check-lean-proofs.mjs`                                                      | modify     | the proof-floor bump 38 to 39 required by §4.1                | 5S-S010 |
| exact  | `.prettierignore`                                                                    | modify     | fixture and evidence directories                              | 5S-S011 |
| exact  | `docs/research/llm-shield/STAGE_5S_CLOSEOUT.md`                                      | add        | closeout, inside the tag                                      | 5S-S012 |
| exact  | `tools/simurgh-attestation/verify-stage5s-attestation.mjs`                           | add        | the standalone attestation verifier named by Task 30          | 5S-S016 |
| exact  | `README.md`                                                                          | modify     | stage banner                                                  | 5S-S013 |
| exact  | `CHANGELOG.md`                                                                       | modify     | release entry                                                 | 5S-S014 |
| exact  | `AGENT.md`                                                                           | modify     | stage entry                                                   | 5S-S015 |

`add-modify` means both operations are permitted on that row. A row carrying a single operation
permits only that one — 5S-S010 may **modify** the proof gate and may never create a second one.

5S-S006 and 5S-S007 were written `modify` in the first draft of this annex and the checker refused
them on its first real run, because on the branch that introduces this stage the spec and plan are
**added**, not modified. The declaration was wrong and the declaration was corrected; the checker was
not loosened to accept it. That direction is the whole point of a surface — a gate that gets relaxed
the first time it says no is a gate that will never say no again.

### S.3 What Annex S does not authorise

- not any path under another stage's tree, evidence or tests. The one exception in the whole stage is
  Annex M's three ripple paths, and those are exact, `modify`-only and separately justified;
- not `src/`, not the kernel, not `package.json` dependencies;
- not any private key material, under any row. `tools/simurgh-attestation/stage5s/signer/` is inside
  prefix 5S-S001, and the private-key refusal overrides every row — a prefix grant is not a licence to
  commit a key. That refusal is checked before membership, so no row can outvote it;
- not a second stage's reproduce script, and not the shared prior-reproduce runner if one is created
  outside `scripts/reproduce-llm-shield-stage5s.sh`.

### S.4 Lifecycle declaration

```text
active_phase                 Stage 5S implementation, Task 2 until the 5S tag
protected_surface            the rows of S.2, plus Annex M's three exact paths
next_phase_behaviour         inert for authorising writes; the checker remains runnable so a
                             successor can re-verify what 5S was permitted to touch
maintenance_behaviour        additive rows only, each carrying its own id and purpose; an existing
                             row's operation set may never be widened
sunset_or_migration_condition  when Stage 5S's tree is archived, at which point the prefixes match
                             nothing and S.5's anti-vacuity condition fails loudly rather than
                             passing silently
anti_vacuity_condition       the checker must have evaluated a NON-EMPTY change set, or the working
                             tree must be clean. An empty evaluated range over a dirty tree is a
                             refusal (Q1-F004), and a run that matched zero rows against a non-empty
                             change set is a refusal rather than an accepted no-op.
```
