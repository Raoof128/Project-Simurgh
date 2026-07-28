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
