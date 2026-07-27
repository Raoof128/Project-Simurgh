# Stage 5R — VPF: Verifiable Probe Families

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

|               |                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Stage id      | `5R`                                                                                                                  |
| Name          | **VPF — Verifiable Probe Families**                                                                                   |
| Branch        | `stage-5r-vpf-verifiable-probe-families`                                                                              |
| Target tag    | `v2.53.0-stage-5r-vpf`                                                                                                |
| Predecessor   | 5Q (VSR), `v2.52.0-stage-5q-vsr`, main `20fc323c`                                                                     |
| Successor     | 5S (witness co-signing — displaced from 5R by this ruling)                                                            |
| Design ruling | 2026-07-26, recorded verbatim in §0                                                                                   |
| Raw codes     | **NONE ALLOCATED IN THIS SPEC.** See §11.4 — the next free value is read from the allocator, never restated in prose. |

---

## §0 Ruling provenance and scope of this document

This spec exists to discharge one instruction, quoted verbatim from the ruling that accepted the 5Q
closeout as **evidence, not release**:

> Do **not** reopen Stage 5Q.
>
> Create:
>
> ## Stage 5R: **VPF — Verifiable Probe Families**
>
> Move witness co-signing to 5S.

The ruling further directs that 5R inherit seven 5Q artifacts **by digest**, freeze a
positive-control family contract with **three** controls, freeze family admissibility rules, require
one family per applicable **role archetype**, and publish coverage as a **delta** that never rewrites
the 5Q ledger.

### §0.1 The two sentences that govern everything downstream

> Nothing in 5R changes the published 5Q result. The 6.2% stays 6.2% forever.

> No sentence may say that 5Q itself reached the later percentage.

These are not stylistic preferences. §6 makes them mechanical: the delta ledger has no field capable
of expressing a revised 5Q figure, and a gate (§11.1, G7) greps the stage's own prose for the
sentence shape that would violate them. A rule enforced only by good intentions is a comment, and
this project does not ship comments as controls — that is 5Q's own §6.1 lesson, applied to itself.

### §0.2 What this document freezes

`§2`–`§5` are the four frozen objects:

```text
§2  vpf_inherited_commitment      the seven inherited 5Q digests
§3  vpf_family_contract           the three-control positive-control family
§4  vpf_admissibility_rules       when a family may discharge anything
§5  vpf_role_archetypes           the minimum family-per-archetype obligation
```

Once §§2–5 are frozen by digest, they are amended **only** by a numbered post-freeze annex. This is
the 5P/5Q convention (Annex R; Annexes A1–A4) and the two-commit freeze procedure of the earlier
ruling applies unchanged: freeze commit, then receipt commit, with an inside/outside mutation proof
demonstrating the boundary is real rather than ceremonial.

### §0.3 What this document does not do

It does not enumerate the fifty-five families member-by-member. §5.4 freezes the **rule** that
determines the family universe; the census emits the membership. Immutable rule in the spec, mutable
state in a generated ledger — the §2.12 discipline 5P established and 5Q inherited.

It also does not allocate raw codes, and does not schedule the work. Both belong to the
implementation plan (§16).

---

## §1 The blade, and the reason this stage exists

### §1.1 The blade

> **A red-team attack class is not admissible merely because one seeded mutant was detected. It
> becomes admissible only when a frozen positive-control family distinguishes vulnerable, safe and
> irrelevant-failure cases over the security roles where that class is claimed to apply.**

### §1.2 The defect this blade names

5Q's Law 4 — _No Green Without a Red_ — required a green→red→green mutation receipt per attack class
before any `attacked_pass` in that class could be admitted. Sixteen mutants M1–M16 were seeded, one
per class, and fourteen were detected.

That is a real gate, and it caught real things. It is also **weaker than it reads**, and the gap is
measured rather than argued. Every number below is recomputed by gate G0 from the inherited receipts,
closure and obligation matrix.

**The sixteen mutants reached five of the nine populated security roles.**

| role                 | members | reached by a mutant?                  |
| -------------------- | ------: | ------------------------------------- |
| `trust_decision`     |     363 | yes (M1, M5, M8, M13)                 |
| `schema_gate`        |     496 | yes (M4, M6, M10, M12, M14, M15, M16) |
| `canonicalisation`   |      71 | yes (M2, M3, M9)                      |
| `completeness_claim` |     582 | yes (M7)                              |
| `parity_mirror`      |     320 | yes (M11)                             |
| `evidence_emission`  |     376 | **no**                                |
| `formal_statement`   |     181 | **no**                                |
| `orchestration`      |     125 | **no**                                |
| `code_allocation`    |      17 | **no**                                |

The column counts **any** mutant. Narrowed to the fourteen classes that were actually discharged, the
mutants reached **four** roles, not five: `completeness_claim`'s only mutant is M7, whose class R7 is
one of the two 5Q ruled inadmissible, so it discharged nothing. Five-of-nine is the figure quoted
above because it is the one that flatters the predecessor, and a finding against a predecessor is
stated at its weakest defensible strength.

Four populated roles — 699 closure members — received **no mutation evidence of any kind**. Between
them those four carry **26** (role, class) obligations, and **22** were discharged class-wide on
evidence earned in some other role: `orchestration` 2 of 2, `evidence_emission` 5 of 6,
`formal_statement` 1 of 2, `code_allocation` 14 of 16. The four exceptions are R5 and R7 — the two
classes 5Q discharged nowhere. Stated as a count rather than as "every", because "every" is false and
the true number is damning enough.

**Per class, the receipt covers a tenth of the area it was generalised across.** For each of the
fourteen discharged classes, the mutant landed in exactly one role. Summing the obligated cells that
lie in the tested role, against the cells in the class as a whole:

```text
cells lying in the role a mutant actually tested      2 118
cells in those fourteen classes                      20 213
                                                     -------
fraction of the discharged area mutation-tested       10.5%
```

R1 was discharged from `trust_decision` (363 of 1 905 cells). R2 from `canonicalisation` (71 of
2 225). R16 from `schema_gate` (496 of 1 654). In each case the remaining roles carry no receipt and
were admitted by the shared label alone.

**And six mutants were seeded into cells the matrix marks `omitted`.** M4, M6, M10, M14 and M15 all
landed on cells whose omission reason is `no_trust_decision`; M12 on one reading
`not_in_historical_closure`. Each of those receipts discharged a class using evidence from a cell
where 5Q's own obligation matrix says the class does not apply.

5Q **published this last one**: `cells_discharged_on_omitted: 6` is a field in the committed
discharge ledger. It is quoted here as a sharpening of a disclosed fact, not as a discovery — a stage
built on 5Q's honesty does not get to re-sell it as its own catch. The role histogram and the 10.5%
figure are new, and become pre-stage finding **5R-F001** (§7.4).

That is a completeness claim resting on an unexamined generalisation — the exact defect family 5Q was
built to detect, sitting one level up inside 5Q's own admissibility rule.

### §1.3 The second defect: an attack that only ever fails

5Q's `core/probeFamilies.mjs` opens with a comment that is the honest ancestor of this stage:

> `EVERY FAMILY HERE IS CHOSEN FOR ONE PROPERTY: IT NEEDS NO POSITIVE CONTROL.`
> `The obvious way to attack 1033 targets mechanically is to call each one with malformed input and`
> `count a throw as a refusal. That is F001 wearing a new hat.`

Six families were built under that constraint, and the constraint was correct: without a positive
control, a generic probe cannot distinguish _refused because the guard worked_ from _threw because
the arguments were nonsense_. 5Q solved that by only building families where no control was needed,
which is honest and which is also **why coverage stalled at 6.2%**. Eleven of sixteen classes have no
family at all, because every family that would attack them needs the control 5Q declined to invent.

5R invents the control. That is the whole stage.

### §1.4 Why the third control is the load-bearing one

Two controls — vulnerable and safe — look sufficient and are not. The ruling is explicit:

> The third control is essential. Otherwise a detector that flags every crash, malformed file or
> non-zero exit can appear brilliant while understanding nothing.

An `orthogonal_failure_control` fails, loudly, for a reason that has **nothing to do with the target
class**: a syntax error, a missing file, a non-zero exit from an unrelated cause. A detector that
reports "R4 violation" when handed a file that simply does not parse has learned to detect _sadness_,
not signature substitution. Without the third control that detector scores a perfect
vulnerable-detected / safe-not-detected pair and ships.

This is not hypothetical. 5Q produced and killed **four** false findings, listed in its closeout:
an argument-ignoring census function; a body-level `??` default; eight `canonicalJson` transforms
with no verdict to fail open; and an inverted reproducible/unreproducible tally.

Three of the four were the probe reading a signal the target's guard never produced — the third is
the purest case, since a function with no verdict **cannot** fail open, so the probe's signal was
unrelated to R16 by construction. The fourth was a consumer misreading a producer's tally and is a
different defect. All four were caught by hand, one at a time, after draft findings existed. §3.4's
`forbidden_surrogate_signals` makes the same catch mechanical and pre-registered.

### §1.5 Prior art, and the seam it concedes

**Mutation testing's coupling effect.** L4 is a mutation-adequacy argument, and the coupling-effect
hypothesis it inherits — that a suite killing simple mutants also catches complex real faults — is
the most-studied assumption in the field and is known to hold only partially. The Just et al. line of
work classifying real faults against generated mutants found a substantial minority coupled to no
mutant at all, and later work found the syntactic distance between faulty and fixed programs is often
far larger than any standard mutation operator produces. The literature's own framing is
_dynamic subsumption_: a mutant is coupled to a fault only when the tests that kill the mutant also
kill the fault, and that relation is per-fault, never per-category.

The seam: **the mutation-testing literature reasons about coupling between a mutant and a fault. It
has no notion of coupling across a security ROLE.** Nothing in it licenses "M4 died, therefore class
R4 is testable everywhere R4 is claimed", because it never had classes claimed over role partitions
in the first place. 5Q imported the adequacy argument and inherited an assumption the source
literature does not actually make.

**Construct validity in evaluations.** The parallel wound is live and expensive: recent systematic
reviews of widely-cited LLM benchmarks report that only about half present any construct-validity
evidence, and that near half lack a consensus definition of the phenomenon they claim to measure. A
European Commission JRC meta-review names construct-validity failure and gaming risk among its
systemic issues in AI benchmarking. The remedy that field asks for — show that the instrument
discriminates the construct from its neighbours, not merely that it fires — is exactly a
positive-control triad, and nobody ships one mechanically.

**The wedge.** 5R's family contract is a **construct-validity instrument for a security detector**,
expressed as recomputable evidence rather than a methods paragraph. A detector that fires on the
vulnerable control, stays silent on the structurally-matched safe control, and stays silent on the
orthogonal failure has demonstrated discrimination. One that cannot is measuring _sadness_, and the
artifact says so under signature.

### §1.6 What 5R does not attempt

5R does **not** re-run 5Q's campaign, does not re-derive its closure, and does not improve its
numbers. It builds the instrument that 5Q lacked and measures what that instrument discharges,
additively. The 5Q attestation is a read-only input with a signature over it.

### §1.7 Threat model — what a dishonest 5R author would do

The stage's own author is the adversary with the best access, and every mechanism above is a defence
against a specific move. Naming them makes the defences falsifiable.

| #   | the move                                                                                                                                  | why it is tempting                                  | what stops it                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | **Stub the safe control.** Make it an empty function so the detector cannot possibly fire.                                                | Condition two passes instantly for all 55 families. | §4.3's not-a-stub rule: the safe control must exercise the `detector_signal` path, asserted by execution rather than by review.                   |
| T2  | **Make the orthogonal control a no-op.** A control that never really fails is never misclassified.                                        | Condition three passes for free.                    | §3.2 requires a real throw, non-zero exit or parse error, recorded in the receipt; a no-op orthogonal control fails the family.                   |
| T3  | **Pick the detector signal after seeing results.** Run first, then declare whichever signal separates the three controls.                 | Every family becomes admissible.                    | §3.3 requires one pre-registered signal, committed before the run, and the commitment is digest-bound in the family record.                       |
| T4  | **Choose the easiest role per class.** Build one family per class in whichever role is simplest, and let §4.2 quietly do class-wide work. | 11 families instead of 55.                          | §4.2 makes class-wide promotion **unrepresentable**; N6 seeds the promotion as a mutant and G5 gates on it staying caught.                        |
| T5  | **Count 5Q's cells again.** Let a 5R family claim a cell 5Q already discharged.                                                           | The cumulative figure rises with no new work.       | §6.2's empty-intersection assertion over inherited `obligation_id`s, gated by G4.                                                                 |
| T6  | **Shrink the denominator.** Drop `formal_statement`, or restrict to "applicable" roles, and 15 301 becomes a friendlier number.           | Coverage percentage rises with no new families.     | `inherited_cells` is the constant 23 332 with no schema field able to hold another value; §5.2 adds A8 explicitly rather than dropping 362 cells. |
| T7  | **Report the tranche as the universe.** Ship 12 families and describe coverage without the denominator.                                   | The stage looks finished.                           | §11.5 pins the tranche disclosure; §5.4 fixes the universe at 55 by rule, not by schedule.                                                        |

T4 and T6 are the two that would actually be tempting under deadline, and they are the two the blade
exists to forbid. If 5R fails, it should fail visibly at one of these, not quietly.

---

## §2 FROZEN OBJECT 1 — `vpf_inherited_commitment`

### §2.1 The seven inherited digests

The ruling names seven artifacts inherited by digest. Each value below is read from the committed 5Q
evidence at `main` `20fc323c` and re-derived live by gate G1 (§11.1):

```text
q0_attestation_public_digest
  8d04e35c6ccd7531e963de7e6aa964e4777b361666be8be516642f25eac27de6

closure_member_commitment_digest        (function closure)
  87512ae221ae2de5148759dcd48ad04ebf02c1b6354bc75e95af9d991f7fc936

historical_function_closure_digest      (historical closure)
  c9838ae46d0d5ff00126876660e49eff2da038aef3e4ace604f6ac620711d79e

attack_taxonomy_digest                  (attack taxonomy)
  f5e03d1193263afc7966263c466c7794cd2c1d7dd8105e45e1e5124103c5f2e7

obligation_matrix_root                  (obligation matrix)
  eefabdf2ddf3b4c0db9a061377ffefdb484d3c09aa591fb3d61770a933f09b70

q0_finding_ledger_digest                (finding ledger)
  7f8c70f1f14e7b49d701372759d831591f4babc215cdf3740f5bb03546f0b05f

coverage_discharge_root                 (coverage discharge root)
  755e74c4ea05aad1dbd58f7583d7f28c0e850c1d28914a1ee9d6c1bbc6aba5ac
```

Bound context, also frozen, because a digest without its provenance is a number:

```text
closure_source_commit   3512d287d2e13ceb31115477acc8b5ff182bc36e
member_count            2531
parser                  acorn 8.17.0
                        sha512-xRQbDb9BnwDafYNn6Vwl839DYVjqXYb1XVGtWAZ1kcDc6iwAL4hg3B1dZlRiuENFeO2H53gFG3in621AdERVAg==
signer_profile_id       stage5q-q0-genesis
public_key_digest       de557244c368b6105e5cbad5717f009fa5a6299ba896b2843d324ebdd1886811
inadmissible_classes    R5, R7
```

### §2.2 Inheritance is verified, not asserted

Before any 5R artifact is produced, the inheritance verifier must:

1. recompute all seven digests from the committed 5Q evidence files;
2. verify the 5Q signed envelope against `stage5q-q0-genesis` — **roots first, signature last**, the
   ordering 5Q's `verifyAttestation` established, because a signature over stale claims verifies
   perfectly;
3. confirm `member_count == 2531` and `closure_source_commit == 3512d287`;
4. fail closed on any mismatch, naming which digest moved.

A 5R run against a mutated 5Q evidence tree must be **impossible**, not merely discouraged. If 5Q's
evidence has drifted, 5R has no legitimate baseline and produces nothing.

### §2.3 The 5Q evidence tree is read-only for the whole of 5R

`docs/research/llm-shield/evidence/stage-5q/**` is read-only. So is
`tools/simurgh-attestation/stage5{a..q}/**`, extending 5Q's own §6.1 by exactly one stage — 5Q is now
a shipped stage and a 5R input, so it acquires the protection every prior stage has.

The 5R write surface is **exhaustive**:

```text
STAGE-OWNED (unrestricted within the path)
  tools/simurgh-attestation/stage5r/**
  tests/**/stage5r/**
  tests/fixtures/llmShield/stage5r/**
  proofs/stage5r/**
  docs/research/llm-shield/evidence/stage-5r/**
  docs/research/llm-shield/STAGE_5R_CLOSEOUT.md
  docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md
  docs/superpowers/plans/2026-07-27-stage-5r-vpf-implementation-plan.md
  scripts/check-stage5r-proofs.sh
  scripts/reproduce-llm-shield-stage5r.sh
  .github/workflows/stage-5r-checks.yml

SHARED, MUTATION-SCOPED (the file is permitted; the EDIT is not)
  package.json                              scripts key only; no dependency change
                                            without a named, pinned version
  .prettierignore                           one added line: the 5R evidence dir
  scripts/check-e2e.sh                      one added entry in the REPRODUCE array
  scripts/security-audit-llm-shield-stage3m.sh
  scripts/security-audit-llm-shield-stage3o.sh
                                            one added test-key allowlist line each,
                                            matching by PATH REGEX with no digits
  README.md                                 the release banner, at closeout only
```

### §2.3.1 Why the second list exists at all

The first draft of this section listed only the stage-owned paths and called itself exhaustive. It
was wrong, and the way it was wrong is worth freezing.

The project's standing wiring checklist **requires** touching `.prettierignore` (evidence byte-
stability depends on it), `scripts/check-e2e.sh` (the reproduce script must join the REPRODUCE
array), both security-audit allowlists (test keys), and `README.md` at closeout. A write surface that
forbids all five makes the mandatory wiring a declared violation on the day it is performed — and 5Q
shipped with exactly one unrepaired write-surface violation of precisely this shape, a prior-stage
test widened first and named afterwards.

Naming them in advance is the permitted route. Naming them afterwards is what L5 forbids. So they are
named, and they are **mutation-scoped rather than path-permitted**: "I only touched `package.json`"
must not cover swapping a crypto library, and "I only touched `check-e2e.sh`" must not cover editing
a prior stage's reproduce invocation. The verifier compares parsed before/after structure, not paths,
for every entry in the second list — the discipline 5Q's `checkPackageJsonMutation` established,
generalised to all five shared files.

The closeout path is likewise named **here, before a byte of it exists**.

### §2.4 F003 is inherited as an operational constraint, not just a fact

5Q finding F003 established that **importing a closure module is not read-only**. That constraint
binds 5R with full force, because 5R's controls execute far more closure code than 5Q's probes did:

```text
No 5R census, probe, control or campaign may import a stage5{a..q} module
in the primary worktree. Import-executing work runs in a scratch git worktree,
and the damage detector runs after it.
```

---

## §3 FROZEN OBJECT 2 — `vpf_family_contract`

### §3.1 The record

Every probe family is exactly this shape. Fields are mandatory; there is no optional control.

```text
probe_family_id
attack_class                    one of R1..R16, from the inherited taxonomy
target_security_role            one of the eleven 5Q roles
role_archetype                  §5.1
inherited_5q_obligation_cells   count, derived from the inherited obligation matrix

vulnerable_control
  premise_receipt
  expected_detection
  expected_outcome

safe_control
  same interface and comparable structure
  expected non-detection

orthogonal_failure_control
  fails for an unrelated reason
  must not count as detecting the target class

detector_signal
forbidden_surrogate_signals
coverage_delta
```

### §3.2 The three controls, stated so they cannot be softened

**`vulnerable_control`** — a target that genuinely carries the defect the class names, for a member
of the stated role. Its `premise_receipt` recomputes the premise at run time: 5Q's rule that a
finding's premise is re-derived rather than remembered applies here to controls. A vulnerable control
whose premise no longer holds is not a passing control, it is a **broken** one, and it fails the
family.

**`safe_control`** — the same interface, comparable structure, _without_ the defect. "Comparable
structure" is a real constraint and §4.3 makes it checkable: a safe control that is trivially
different (an empty function, a stub, a different arity) tests nothing. The pair
(vulnerable, safe) must differ in the defect and as little else as the language permits.

**`orthogonal_failure_control`** — fails loudly for a reason unrelated to the class. It must be a
**real** failure, not a no-op: a genuine throw, a genuine non-zero exit, a genuine parse error. The
family is admissible only if the detector reports _not-detected_ for it. See §1.4.

### §3.3 `detector_signal`

The single, named, pre-registered signal the family reads to decide _detected_ or _not detected_. It
is declared **before** the controls are run, and it is one signal, not a disjunction assembled after
seeing results. A family that would pass under signal A and fail under signal B has not chosen; it
has post-hoc rationalised.

### §3.4 `forbidden_surrogate_signals`

The pre-registered list of signals that must **not** be what the detector is actually reading. At
minimum, and frozen:

```text
process exit code alone
"an exception was thrown" alone
"stderr was non-empty" alone
"the file did not parse" alone
"the run took longer than a threshold" alone
"any string matched a generic error regex"
```

Each is a signal that the orthogonal-failure control also produces. If the detector's decision
changes when a forbidden surrogate is suppressed, the family is **inadmissible**, and the reason is
recorded rather than the family quietly re-tuned.

This is the mechanical form of the ruling's warning about a detector that "can appear brilliant while
understanding nothing."

### §3.5 `coverage_delta`

The count of inherited 5Q obligation cells this family — **and only this family** — discharges, with
the cells identified by their inherited `obligation_id`. Deltas are computed over inherited
identifiers, never over a re-derived matrix, so double-counting between families is detectable by
set intersection rather than by trust.

### §3.6 Mutation restoration is part of the contract

Every control that mutates a target must prove restoration: the target's `source_digest` before and
after must be equal, and the proof is a recorded receipt, not an assertion. 5Q's F003 exists because
a producer's write went unnoticed for three occurrences. A stage that seeds defects into 5A–5Q code
on purpose has a strictly larger version of that risk and must carry a strictly stronger proof.

---

## §4 FROZEN OBJECT 3 — `vpf_admissibility_rules`

### §4.1 The seven conditions

A probe family is admissible **only** when all seven hold, verbatim from the ruling:

```text
vulnerable control     detected
safe control           not detected
orthogonal failure     not misclassified
premises               recomputed
target role            matches the claimed applicability
results                bind to the inherited 5Q closure
mutation restored      proven
```

There is no partial admissibility for a family. Six of seven is inadmissible, and the failing
condition is published.

### §4.2 A class is admissible per role, never globally

This is the blade in mechanical form:

```text
admissible(class R, role S)  ⟺  an admissible family exists with
                                 attack_class == R and target_security_role == S
```

There is **no** rule promoting per-role admissibility to class-wide admissibility. A family for
`R4 × trust_decision` discharges cells in `R4 × trust_decision` and nothing else. §1.2's
generalisation is not merely discouraged; it is unrepresentable in the data model.

### §4.3 Structural comparability of the safe control

`safe_control` must satisfy, mechanically:

```text
same exported symbol name or same call signature arity
same category (exported_function | exported_constant | ...)
same security role
source-span size within a bounded ratio of the vulnerable control
not a stub: the safe control must exercise the detector_signal path
```

The last is the one that matters and the easiest to get wrong. A "safe" control the detector never
reaches is not-detected for the wrong reason, and would pass condition two while proving nothing.

### §4.4 Binding to the inherited closure

Every result carries the inherited `function_id` and inherited `obligation_id`. A result citing an
identifier absent from the inherited closure is refused — it cannot be about 5Q's universe, so it
cannot discharge a 5Q cell. This is 5Q's L2 (_Universe Before Attack_) inherited rather than
re-litigated: 5R does not get its own universe, and cannot grow one.

### §4.5 Inadmissible is a published outcome, not a retry

An inadmissible family is recorded with its failing condition and stays recorded. It is not deleted,
re-tuned until green, or replaced silently. 5Q's L3 (_No Erased Finding_) and L5 (_No Retroactive
Innocence_) apply to 5R's own families: the record is of what happened, including the families that
did not work.

R5 and R7 arrive from 5Q already marked `inadmissible_classes`. 5R may make them admissible **per
role**, by building families that pass §4.1 — and if it does, the 5Q record still says they were
inadmissible then, because they were.

---

## §5 FROZEN OBJECT 4 — `vpf_role_archetypes`

### §5.1 The archetypes

The ruling names seven, requiring "at minimum, one family for each applicable role archetype":

```text
A1  trust decision          →  trust_decision
A2  completeness claim      →  completeness_claim
A3  canonicalisation        →  canonicalisation
A4  code allocation         →  code_allocation
A5  evidence emission       →  evidence_emission
A6  schema gate             →  schema_gate
A7  orchestration/parity    →  orchestration, parity_mirror
```

### §5.2 An eighth archetype, added with its reason stated

The seven above do not cover 5Q's eleven roles. `formal_statement` is unmapped, and it is not empty:
181 closure members carry it, obligated under R7 and R10, for **362 inherited cells**.

```text
A8  formal statement        →  formal_statement       (EXTENSION, not in the ruling)
```

This is an addition to the ruling's list, made deliberately and flagged as such. The reason is that
the alternative is worse: without A8 those 362 cells are permanently undischargeable, and 5R would be
publishing a coverage figure over a denominator quietly smaller than the one it inherited. Shrinking
an inherited denominator without saying so is precisely the shape of 5Q-F001. An extension that is
named is safe; a silent exclusion is not.

`pure_transform` and `imported_dependency` are mapped to **no archetype**, correctly: both carry an
empty required-class matrix in the inherited obligation model and generate zero obligated cells. They
discharge by delegation, unchanged.

### §5.3 The eleven under-supported classes

Derived from the inherited obligation matrix; 15,301 of the 23,332 obligated cells:

| class | cells | roles obligated                                                                                                                                         |
| ----- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2    | 2 225 | completeness_claim 582 · schema_gate 496 · evidence_emission 376 · trust_decision 363 · parity_mirror 320 · canonicalisation 71 · code_allocation 17    |
| R3    | 1 849 | completeness_claim 582 · schema_gate 496 · trust_decision 363 · parity_mirror 320 · canonicalisation 71 · code_allocation 17                            |
| R4    | 1 033 | completeness_claim 582 · trust_decision 363 · canonicalisation 71 · code_allocation 17                                                                  |
| R5    | 1 033 | completeness_claim 582 · trust_decision 363 · canonicalisation 71 · code_allocation 17                                                                  |
| R6    | 1 033 | completeness_claim 582 · trust_decision 363 · canonicalisation 71 · code_allocation 17                                                                  |
| R7    | 2 086 | completeness_claim 582 · schema_gate 496 · evidence_emission 376 · trust_decision 363 · formal_statement 181 · canonicalisation 71 · code_allocation 17 |
| R10   | 1 590 | completeness_claim 582 · evidence_emission 376 · trust_decision 363 · formal_statement 181 · canonicalisation 71 · code_allocation 17                   |
| R11   | 1 353 | completeness_claim 582 · trust_decision 363 · parity_mirror 320 · canonicalisation 71 · code_allocation 17                                              |
| R12   | 1 033 | completeness_claim 582 · trust_decision 363 · canonicalisation 71 · code_allocation 17                                                                  |
| R13   | 1 033 | completeness_claim 582 · trust_decision 363 · canonicalisation 71 · code_allocation 17                                                                  |
| R14   | 1 033 | completeness_claim 582 · trust_decision 363 · canonicalisation 71 · code_allocation 17                                                                  |

The five classes 5Q did attack — R1 (1 905), R8 (1 905), R9 (1 158), R15 (1 409), R16 (1 654) — total
8 031 cells and are **not** in scope for new families, but they are in scope for §7's audit: 5Q's six
control-free families were admitted under the weaker L4 rule, and §7 asks whether they survive §4.1.

### §5.4 The family universe rule

```text
The family universe is the set of (attack_class, target_security_role) pairs
such that the pair generates at least one obligated cell in the INHERITED
obligation matrix, restricted to the eleven under-supported classes.
```

Applying that rule to §5.3 yields **55 families**, and therefore **165 controls**. That number is
computed, not chosen, and it is the honest scale of the stage.

The number is also large, and §12 does not pretend otherwise. A tranche that covers part of the
universe is the expected outcome; what is not permitted is a tranche that covers part of the universe
and reports as though it covered the whole. 5Q's answer to that problem — publish the fraction, keep
the denominator — is inherited entire.

---

## §6 Delta-only coverage accounting

### §6.1 The ledger shape

Frozen by the ruling:

```text
inherited_cells
newly_discharged_cells
new_findings
still_undischarged_cells
cumulative_coverage
```

Both figures stay visible, always, in this exact relationship:

```text
5Q original coverage     6.2%     (1 438 of 23 332)
5R cumulative coverage   <measured>
```

### §6.2 The three mechanical guarantees

**One.** `inherited_cells` is read from the inherited obligation matrix and is **23 332**, a
constant. The delta ledger has no field, and the schema no key, capable of expressing a different
5Q-era denominator or a revised 5Q-era numerator. The sentence the ruling forbids cannot be
constructed from the data.

**Two.** `cumulative_coverage = (1438 + newly_discharged_cells) / 23332`, always shown beside the
inherited 6.2%, and always labelled `5R cumulative`. There is no bare "coverage" field.

**Three.** `newly_discharged_cells` is a set of inherited `obligation_id`s, not a count. Its
intersection with 5Q's already-discharged set must be **empty**, and the gate asserts it. A cell
cannot be discharged twice, and a family cannot claim credit for work 5Q already did.

### §6.3 The prose gate

Gate G7 (§11.1) scans 5R's own spec, plan, closeout, release notes and evidence for sentence shapes
that attribute a post-5Q coverage figure to 5Q. This gate will match its own documentation — **three**
5Q guards that scanned a file they lived inside did exactly that (the Lean escape scan reading
"sorry" from its own comment, the browser parity check finding `VSR-PARITY-FAILED` in the branch that
sets it, K7-A's bare-existence scan matching its own explanation). So the gate strips comments first
**and** asserts the raw file still contains the pattern, ensuring the stripping cannot make the scan
vacuous. 5Q paid for that lesson three times; 5R pays once, in advance.

---

## §7 Inherited findings, and the audit of 5Q's own families

### §7.1 `5Q-F013` is inherited as 5R's opening finding

The ruling permits two homes for F013 and 5Q used the first: a signed closeout addendum, additive,
binding the unchanged Q0 public digest and ledger digest. 5R takes the second **as well** —
inheriting it as the opening finding — because F013 is the reason this stage exists.

```text
finding_id          5Q-F013            (5Q's identifier, unchanged; not renumbered)
class               lifecycle / state-machine deadlock
severity            claim_narrowing
inherited_from      docs/research/llm-shield/evidence/stage-5q/attestation/closeout-addendum.json
vpf_disposition     5R IS the lawful outgoing transition
```

F013's content is inherited by digest and is **not** re-derived, re-worded or re-classified. 5R adds
one field of its own — `vpf_disposition` — and touches nothing else.

The name is deliberate. The inherited addendum **already carries a `disposition`**: _"Published here
and inherited by the successor stage. Stage 5Q is NOT reopened. The 6.2% coverage figure and the
twelve-record ledger stand exactly as signed."_ A successor writing its own value into a key its
predecessor already signed would be overwriting the record while calling it inheritance — the
smallest possible version of the move this whole stage exists to forbid. 5R's field sits beside 5Q's;
5Q's is quoted, never replaced.

### §7.2 Why 5R is a lawful exit and Q1 was not

F013's deadlock is precise: Q0 is frozen, T3 and T7 are false, Q1 is gated on them, and no phase at
or after `Q0_TRANSITION` may produce the artifacts that would make them true. The deadlock is a
property of **5Q's phase table**, and 5R is not in it. A new stage produces new evidence under its
own lifecycle without reopening Q0, which is exactly the move the phase table forbids to Q0's own
remaining phases and permits to a successor.

This does not repair 5Q. 5Q remains deadlocked, permanently, and its transition validator will report
that forever. What changes is that the _work_ T3 describes becomes performable somewhere lawful.

### §7.3 The audit 5R owes its own predecessor

5Q's six control-free families were admitted under L4's one-mutant-per-class rule. §4.1 is strictly
stronger. 5R must therefore re-examine those six against the new contract and publish the result,
whatever it is:

```text
frozen-constant       R8   exported_constant
argument-aliasing     R8   exported_function
prototype-pollution   R1   exported_function
determinism           R15  exported_function
pathological-operand  R9   exported_function
fail-open             R16  exported_function, roles trust_decision + completeness_claim
```

If a family fails §4.1, that is a **5R finding against 5Q**, published under 5R's own identifiers.
The 1 438 cells 5Q discharged are not retroactively removed — L5 forbids rewriting the frozen record —
but 5R may record that a discharge it inherited would not be admissible under the stronger rule, and
say so in the delta ledger as a distinct, visible line. A stage whose blade is "one mutant is not
enough" that declined to apply the blade to its own predecessor's six families would be exempting
itself from its own thesis.

The precedent is real but must be stated accurately, because the inaccurate version was in this
spec's first draft: **5Q published zero findings against 5Q.** All twelve ledger records name another
stage (`5m`, `5c`, `5d`, `5l`, `5o`, `5p`) or `cross-stage`. 5Q's own harness defects — ten drivers
running on import, a fail-open in its own gate, breaking 5P for two commits, four false findings —
were repaired during the campaign and narrated in the closeout, not frozen as findings.

That is a defensible choice for defects fixed before the freeze, and it is also a gap: a stage's
self-criticism lived in prose while its criticism of others lived under signature. 5R closes it by
recording §7.3's outcomes as **ledger records**, whichever way they fall, including against itself.

### §7.4 Pre-stage finding `5R-F001`

Recorded here because it was measured during this spec's research, **before** the 5R harness existed
— the 5Q §14 precedent for `5Q-F001`.

```text
finding_id        5R-F001
affected_stage    5q
affected_artifact docs/research/llm-shield/evidence/stage-5q/mutation/receipts.json
                  + the L4 admissibility rule that consumes it
attack_class      R7   (selective omission / fake completeness)
severity          assurance_only
```

**Expected.** A green→red→green mutation receipt for class R is evidence that class R is detectable
over the members where R is claimed to apply.

**Observed.** Each receipt is evidence over exactly one member, in one role. Across the fourteen
discharged classes the tested role holds **2 118 of 20 213** obligated cells — **10.5%**. Four
populated roles totalling 699 members (`evidence_emission`, `formal_statement`, `orchestration`,
`code_allocation`) were reached by no mutant at all; of the 26 (role, class) obligations they carry,
22 were discharged class-wide on evidence earned in another role, the 4 exceptions being R5 and R7,
which 5Q discharged nowhere. Six receipts were earned on cells the obligation matrix marks `omitted`.
Restricted to the fourteen discharged classes, the mutants reached four roles, not five.

**Why `assurance_only` and not `claim_narrowing`.** No published 5Q coverage number depends on it.
`status_tally` shows `attacked_pass: 0` — no member was ever admitted on the strength of a class
discharge, so the weak generalisation never propagated into the 6.2%. The defect is in the
**assurance argument**, not in the arithmetic. Any stronger severity would be an overclaim, and this
finding exists to make an overclaim harder, not to commit one.

**Not a repair.** 5Q's ledger is not reopened and its receipts are not re-run. 5R-F001 is a 5R record
about a 5Q artifact, which is the same relationship 5Q had to 5M.

---

## §8 Mandatory negative self-proof

5Q's rule stands and is sharpened by the three-control contract. A campaign that finds nothing may be
excellent or asleep, and the difference must be mechanically visible.

### §8.1 The family-level self-proof is structural

Every admissible family **is** its own negative self-proof: the vulnerable control is a seeded defect
the detector must catch, and the safe and orthogonal controls are the two ways of proving the
detector is not simply always-on. This is a stronger self-proof than 5Q's, because it runs per
(class, role) rather than per class, and because the orthogonal control tests something the mutation
receipts never did.

### §8.2 The harness-level self-proof

5R's own code is not exempt. Seeded defects in 5R's admissibility checker, delta ledger and
inheritance verifier must be caught by 5R's own tests, with a green→red→green receipt each:

```text
N1  admissibility accepts a family whose orthogonal control WAS detected
N2  delta ledger double-counts a cell 5Q already discharged
N3  inheritance verifier accepts a mutated 5Q digest
N4  safe control is a stub the detector never reaches            (§4.3)
N5  forbidden surrogate suppression does not change the verdict  (§3.4)
N6  a per-role admissibility silently promotes to class-wide     (§4.2)
```

N6 is the blade's own mutant. If it is not caught, the stage does not ship.

### §8.3 The gate that must be able to fail

5Q shipped two CI gates that could never pass — `--mode=verify` and `--all` — and both had to be
replaced. The inverse failure is worse and easier to commit here: a gate that can never _fail_. Every
5R gate carries a recorded demonstration of its own red state, produced by seeding and reverting, and
the demonstration is part of the evidence rather than a claim in a comment.

---

## §9 Architecture and evidence lanes

### §9.1 Module tree

```text
tools/simurgh-attestation/stage5r/
  core/
    inherit.mjs          the seven digests, verified roots-first, signature last
    familyContract.mjs   §3 record, schema, and the frozen forbidden-surrogate list
    admissibility.mjs    §4.1's seven conditions; no partial credit
    archetypes.mjs       §5.1 + A8; the family-universe rule of §5.4
    controls.mjs         the three-control runner and restoration proof
    deltaLedger.mjs      §6; inherited ids only; empty-intersection assertion
    prose.mjs            §6.3's forbidden-sentence scanner
    writeSurface.mjs     §2.3.1's verifier: parsed before/after STRUCTURE for the
                         five mutation-scoped shared files, never path matching
    transition.mjs       §11.3's prior-stage non-disturbance attribution; 5R's own
                         copy, never an edit to 5Q's
  node/
    verifyInheritance.mjs
    buildFamilyUniverse.mjs
    runFamily.mjs
    buildDeltaLedger.mjs
    auditPriorFamilies.mjs     §7.3
    checkWriteSurface.mjs
    probeImportWrites.mjs      §2.4's damage detector, run after import-executing work
    verifyTransition.mjs
    attestStage5r.mjs
  python/                      parity mirror of the deterministic core
  browser/                     parity mirror of the deterministic core
  families/                    55 families, one directory each, three controls each
  signer/
```

The last five entries are listed because three sections above mandate a check that would otherwise
have no home — §2.3.1 a structural write-surface verifier, §2.4 a damage detector, §11.3 an
attribution model — and because §14's Node == Python == browser parity is not satisfiable by a tree
with no mirrors. Each has a 5Q analogue (`core/writeSurface.mjs`, `node/probeImportWrites.mjs`,
`core/transition.mjs`), read as prior art, not imported: §2.4 forbids importing a stage5{a..q} module
in the primary worktree.

Every node driver carries a main guard from the first commit. Ten of 5Q's own drivers executed on
import until K7-A found them, and a census cannot enumerate a module that exits during enumeration.

### §9.2 The three evidence lanes

The standing lane contract applies, and the mapping is stated rather than assumed because 5R's lanes
are unusual — the "fixture corpus" here is a corpus of **controls**, and the thing being tested is a
detector rather than a verdict.

**Lane A — byte-stable control corpus, CI-gated.** The 165 controls and their receipts are a
committed corpus generated by a CLI main and proven idempotent (`generate twice + git diff
--exit-code`). Every admissibility condition in §4.1 appears at least once in a **failing** variant,
so the tamper matrix covers the seven conditions rather than only the happy path. Includes a
multi-byte / non-ASCII control wherever a source span or byte offset is involved — that is where
geometry bugs die in daylight, and canonicalisation families live exactly there.

**Lane B — deterministic two-process control ceremony, CI-gated.** The detector runs in a child
process that is **blind by construction**: it receives the control's bytes on stdin and is told the
attack class, and it is told nothing about which of the three controls it is looking at. Env scrubbed
to `PATH`; `OPERATOR*` env and `.pem` argv refused. The parent never rewrites the child's verdict.
Blindness negatives prove the guards fire. This lane is what makes §3.3's pre-registration mean
something operationally — a detector that cannot see the label cannot fit to it.

**Lane C — live model capture: `not_in_scope` for 5R, and the reason is recorded.** A model could
plausibly generate control candidates, and that is precisely why it is excluded: a
model-authored control whose vulnerability was never independently verified would put an unverified
premise underneath the stage's central claim. Controls are hand-authored with recomputed premises.
If a later stage wants model-assisted control generation, it arrives as its own blade with its own
verification story, not as a convenience here.

---

## §10 The 5R attestation and proofs

### §10.1 Two-tier attestation

Following the standing contract: a public structural bundle and a signed audit envelope. Roots, at
minimum:

```text
inherited_commitment_digest      the seven §2.1 digests, canonicalised together
family_universe_root             the 55 (class, role) pairs
family_result_root               per-family admissibility outcomes
control_receipt_root             165 control receipts incl. restoration proofs
delta_ledger_digest              §6
prior_family_audit_digest        §7.3
vpf_finding_ledger_digest        5R's own findings
```

Signed by a new 5R key. The 5Q key at `~/.simurgh/5q-ed25519.pem` **must survive** — it is required
to verify inherited signatures — but it does not sign 5R. A successor signing with its predecessor's
key makes the two indistinguishable, which is the property 5G spent a stage establishing.

### §10.2 Lean core

`proofs/stage5r/`, Lean 4.15.0, no mathlib, zero `sorry`, symbolic model rather than real crypto. The
theorem targets are the properties that must not be reachable by any execution path:

```text
L1  admissibility is conjunctive: any one of the seven §4.1 conditions false
    ⟹ the family is inadmissible.  (no partial credit, provably)
L2  no promotion: admissible(R, S) for any single role S does not entail
    admissible(R, S') for S' ≠ S.  (the blade, as a theorem)
L3  delta disjointness: the union of family deltas is disjoint from the
    inherited discharged set ⟹ cumulative ≤ 1 and monotone in new work only.
L4  denominator invariance: no sequence of family admissions changes
    inherited_cells.  (T6, closed formally)
L5  orthogonal soundness: if the detector's verdict is invariant under
    suppression of every forbidden surrogate, then a detected vulnerable
    control and a not-detected orthogonal control are distinguishable by
    the declared signal alone.
```

L2 and L4 are the two that carry the stage. L5 is the weakest — it is conditional on the surrogate
list being complete, which §13 declares as a non-claim rather than proving.

The Lean gate is wired **by discovery, not by name**: the workflow enumerates `proofs/stage5r/*.lean`
from the filesystem. 5P's lean-check listed proof files by name and went vacuously green when a file
was added, and 5Q-F001 is the same defect in the shared workflow, still open.

---

## §11 Release gates

### §11.1 5R's own gates

```text
G0  §1.2's measurements recompute from the inherited receipts, closure and
    obligation matrix: the role histogram, the 2118/20213 ratio, the six
    receipts on omitted cells, the 26 obligations carried by the four
    unreached roles and the 22 of them discharged from another role, and
    the four-of-nine roles reached once restricted to discharged classes.
    A spec number that cannot be re-derived is an assertion, and this
    stage's whole subject is assertions that were never re-derived.  Every
    figure this gate covers is named here, so a number added to the prose
    later without being added to the gate is visibly outside it.
G1  the seven inherited digests recompute, and the 5Q envelope verifies roots-first
G2  every published family satisfies all seven §4.1 conditions
G3  every control carries a recomputed premise and a proven restoration
G4  no family's coverage_delta intersects 5Q's already-discharged set
G5  no per-role admissibility promotes to class-wide (N6's mutant stays caught)
G6  the six N-mutants are detected; each gate has a recorded red state (§8.3)
G7  no sentence in 5R's own artifacts attributes a post-5Q figure to 5Q (§6.3)
G8  the 5Q evidence tree is byte-identical before and after the full 5R run
G9  the tranche disclosure of §11.5 is present and its arithmetic checks
G10 no 5R document prints a raw-code literal from any predecessor's band
    (§11.4 — asserted here rather than left to a prior stage's census to
    notice, because that census fires only on a literal AND a stage-mention
    pattern together, and passing it by phrasing is not passing it)
```

G8 is the one most likely to fail, and it is the one that must not be softened. F003 says importing
this code writes to it.

### §11.2 Inherited structural gates

Unchanged: read-only kernel, two-tier attestation, byte-stable evidence built twice and `cmp`-ed,
Node↔Python↔browser parity on the deterministic surface, Lean with zero `sorry` and gated **by
discovery rather than by name** — 5P's lean-check listed proofs by name and went vacuously green, and
5Q-F001 is the same defect in the shared workflow — and the K7 all-functions net over 5R's own code.

### §11.3 Prior-stage non-disturbance

Every prior stage's reproduce script stays green, 5Q's included. 5R is additive.

5R **copies** 5Q's attribution model into its own `core/transition.mjs` (§9.1) and does not edit 5Q's.
The member 5Q calls `regressed_by_q0` is `regressed_by_5r` in 5R's copy, because the name states whose
work is being attributed; every other value is byte-identical:

```text
green | regressed_by_5r | pre_existing | not_compared | not_comparable
```

**Copy, not rename, and the reason is mechanical rather than stylistic.** `regressed_by_q0` is defined
in `tools/simurgh-attestation/stage5q/core/transition.mjs` and asserted by name in a 5Q unit test and
in the 5Q K7 net. Renaming it in place would edit three files §2.3 makes read-only, break the
predecessor's own tests, and move bytes G8 requires to be identical before and after the 5R run — a
rename dressed as inheritance. An earlier draft of this subsection said "inherited with its member
renamed", which under the plain reading would have made the mandatory work a declared write-surface
violation on the day it was performed: the same shape as the five wiring files §2.3.1 exists to
prevent, recurring nine sections later. A small copied module is the whole cost of leaving 5Q's record
exactly as signed.

`not_compared` stays its own value — absent a baseline run, "we did not check" must not be dressed up
as "green" — and `not_comparable` stays for tree-relative commands, which 5Q added only after
mislabelling one `pre_existing`.

### §11.4 No raw codes in this spec

None allocated. The next free code is **one past the top of 5P's closed band**, which 5Q left
untouched by allocating none; the value is read from the allocator rather than restated here. If 5R
needs typed outcomes, they come by post-freeze annex under the 5P Annex R contract: one canonical
table, lookup never arithmetic, no literals scattered through verifiers, band closed on completion,
existing codes never move.

**And the literal-in-prose trap is inherited.** 5Q broke its predecessor twice by writing raw-code
literals into documentation — the second time into prose _about the rule against them_. This spec's
first draft did it a third time, in this very subsection, printing both the closed-band top and its
successor.

It passed the census by luck rather than by rule. That gate fires on a file only when a band literal
**and** a predecessor-mention pattern both appear, and the draft happened to write the stage id
without the word that completes the pattern — so a purely editorial edit, one word long, would have
turned a prior stage's gate red. A check that passes because of a phrasing accident is not a check
that passed.

So the rule is stated as behaviour, not as an aspiration: **5R's spec, plan and closeout describe raw
codes and never print them**, and G10 asserts the absence in 5R's own documents rather than relying
on the predecessor's census to notice.

### §11.5 The tranche rule — what a shippable 5R is

55 families is the universe (§5.4). It is not a schedule, and a stage that quietly redefines the
universe to match what it built is committing T7. So the boundary is pinned here, before any family
exists.

**Minimum to ship.** One admissible family for **every role archetype A1–A8** that any
under-supported class obligates. That is the ruling's own floor — "at minimum, require one family for
each applicable role archetype" — and it is what proves the contract works across archetypes rather
than in one comfortable corner. Below that floor the stage has demonstrated a mechanism, not a
method, and should say so instead of tagging.

**Every published number carries all four terms**, always together:

```text
families admissible / families attempted / families in the universe (55)
newly discharged cells / 15 301 under-supported / 23 332 inherited
```

**A family that is attempted and fails is published.** Attempted-and-inadmissible is the honest
outcome §4.5 requires; the only forbidden state is attempted-and-unmentioned. `families attempted`
minus `families admissible` is therefore a number the reader can see, and if it is large that is the
finding.

The precedent is direct: 5Q shipped 6.2% with the denominator intact rather than stretching the
campaign until the number looked better. 5R inherits the practice, including the part where the
uncomfortable number is the headline.

---

## §12 Ledgers

### §12.1 The socket ledger — 5R pays none and mints none

Stated explicitly, because a stage that silently skips the IOU ledger is how the discipline dies.

```text
I7  keyless_submitter_identity_binding      OPEN
    (5P executed a real public Rekor entry, retiring 5G's sigstore debt BY
    EXECUTION, and stated plainly that it was not keyless. I7 survives.)

I8  checkpoint_witness_cosigning            OPEN, scheduled for 5S
    (minted by 5M; the roadmap routed it to 5Q, 5Q became the red team,
    the ruling then routed it to 5R, and this ruling routes it to 5S.
    Three reroutes is the point at which a socket needs saying out loud
    rather than assuming.)
```

**5R pays neither, and mints nothing new.** Paying I8 requires witness gossip and split-view
detection — a different blade in a different domain, and folding it in would give 5R two cores, which
is the split rule this project applies to itself. Minting a fresh socket while carrying two open ones
would be hoarding. If 5R's campaign surfaces a genuinely new debt it is minted at closeout, from
measured evidence, not speculated here.

### §12.2 The founder's ledger

**Who could run this tomorrow.** An **AI-evaluation team publishing a safety benchmark** — internal
to a lab or at an evaluation organisation. Their live problem is §1.5's: reviewers increasingly ask
whether a benchmark measures the construct it names, and the field's own surveys report that around
half of widely-cited benchmarks ship no construct-validity evidence at all. 5R's family record is a
drop-in answer shape — vulnerable, structurally-matched safe, orthogonal failure, one pre-registered
signal, forbidden surrogates named — and its verifier recomputes the triad offline from committed
bytes.

**The single blocker.** The contract is currently expressed over the inherited 5Q closure: a family
is bound to a `function_id` and an `obligation_id` from one specific committed universe. An outside
team has no such closure and cannot mint one without 5Q's census. Until the family record can bind to
a **caller-supplied universe descriptor** — any committed set of items with roles and obligations —
the contract is portable in principle and captive in practice.

That is a concrete, buildable artifact, and it is this stage's roadmap debt rather than an
aspiration: **a universe-adapter schema plus one worked non-Simurgh example.** It is tracked like a
socket, and the closeout must report it as built or unbuilt by name.

### §12.3 The new evidence species

Every stage in the arc produced a kind of evidence the repository had never produced. 5R's is:

> **A signed receipt that a detector discriminates a property from its neighbours** — not that a
> check ran, not that an artifact verified, but that the instrument doing the checking was shown to
> distinguish three deliberately-constructed cases and to be insensitive to a named list of
> surrogates.

Every prior stage attested to a **result**. This one attests to the **instrument**.

---

## §13 Honest non-claims

Frozen, and published in the attestation and the closeout:

- **not** proof that Stage 5 has no vulnerabilities;
- **not** a repair of Stage 5Q, and **not** a revision of its published 6.2%;
- **not** exhaustive over all possible attacks, or all possible controls per class;
- **not** a claim that an admissible family makes its class safe — it makes the class _measurable_
  for one role;
- **not** proof that a detector reading the declared `detector_signal` reads nothing else; §3.4
  bounds that risk, it does not eliminate it;
- complete **only** over the inherited closure, taxonomy and obligation matrix — 5R inherits 5Q's
  universe and cannot see past it;
- the red team and the blue team remain the same party, the ceiling 5Q named and no internal rigour
  removes;
- zero discovered findings is not itself a security result.

---

## §14 K7 all-functions E2E net

Mandatory before tag, per standing project contract. The net covers **every export of every 5R
module**, plus:

```text
tamper matrix         each of the seven inherited digests mutated by one byte → refusal
                      each of the seven §4.1 conditions falsified in turn   → inadmissible
                      each forbidden surrogate forced as the sole signal    → inadmissible
cross-stage invariants
                      5Q evidence byte-identical after the full run
                      delta ∩ 5Q-discharged == ∅
                      inherited_cells == 23332, unconditionally
                      no per-role result promoted to class-wide
runtime parity        Node == Python == browser on the deterministic surface
```

The plan ends with this net plus a docs-accuracy pass over every claim in this spec.

---

## §15 Scorecard

Honest scores at spec time, with what would move each.

| axis                   | score | reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            |   9.0 | Positive-control families for security _detectors_, with a third orthogonal-failure control, expressed as signed recomputable evidence. §1.5 locates the seam precisely: mutation testing reasons about coupling between a mutant and a **fault**, never across a **role**, so the adequacy argument 5Q imported does not license what it was used for. Held at 9.0, not higher, because the control triad itself is a rigorous transplant from clinical/biological method rather than a new primitive — the invention is the binding to roles and obligations, not the triad.                                                                                                              |
| **Frontier**           |   9.0 | It attacks the exact reason a shipped red team stalled at 6.2%, with the gap now **measured** (§1.2: five of nine roles reached, 10.5% of the discharged area, 699 members with no mutation evidence) rather than argued. Raised from 8.8 on that measurement and on 5R-F001. Rises above 9.3 only if §7.3 finds one of 5Q's own six inherited families inadmissible — precommitted here, earnable or missable, not retrofittable.                                                                                                                                                                                                                                                          |
| **Good-for-Anthropic** |   9.4 | "One seeded test is not evidence the detector understands the class" is a safety-evals argument first and a code argument second. §1.5's construct-validity wedge is live and external: systematic reviews report roughly half of widely-cited LLM benchmarks ship no construct-validity evidence, and a JRC meta-review names construct-validity failure among its systemic issues. An eval that scores well by detecting _sadness_ is a model-evaluation failure mode, not only a red-team one.                                                                                                                                                                                           |
| **Constitution**       |   9.5 | The stage is structurally forbidden from improving its predecessor's number, gates its own prose against implying otherwise, publishes its own threat model as the author-adversary (§1.7), and corrected its own claims against measurement in two pre-freeze passes — three false factual claims in the first, and in the second an "every class ... was discharged class-wide" that recomputation showed to be 22 of 26, plus a §11.3 rename that would have made mandatory work a declared write-surface violation on the day it was performed. Not higher until it has published an uncomfortable result of its **own campaign**; 9.5 is the design's honesty, not yet the campaign's. |

Re-scored at closeout against what was measured, per standing practice — including downward if §7.3
finds nothing and the tranche lands at the §11.5 floor.

**Scorecard teeth.** Every "what moves it higher" above names a buildable artifact or a precommitted
measurement, not an aspiration. §12.2's universe-adapter schema is tracked like a socket and must be
reported built or unbuilt by name at closeout.

---

## §16 Deferred to the implementation plan

- task decomposition and the tranche boundary (§5.4: 55 families is the universe, not the schedule);
- which classes are attempted first, and the stated reason;
- the 5R signer profile and key ceremony;
- Lean core targets;
- the closeout scorecard re-score;
- whether any 5R finding warrants raw codes (§11.4).

Nothing in the plan may weaken §§2–5 once frozen. Annex only.

---

## Freeze block

`§§2–5` are **not yet frozen**. Freeze is the two-commit procedure:

```text
commit 1   freeze §§2-5; record the extraction procedure; generate normalised bytes
           twice; compare byte-for-byte; digest field marked awaiting receipt
commit 2   insert freeze_commit and freeze_digest; re-run extraction; prove a
           one-byte change INSIDE §§2-5 fails the gate and a change OUTSIDE does not
```

```text
freeze_commit    <pending>
freeze_digest    <pending>
```
