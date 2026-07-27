# Stage 5R — VPF: Verifiable Probe Families

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties were designed in at SPEC time rather than retrofitted.

|             |                                                               |
| ----------- | ------------------------------------------------------------- |
| Stage       | `5R` — **VPF, Verifiable Probe Families**                     |
| Target tag  | `v2.53.0-stage-5r-vpf`                                        |
| Predecessor | 5Q (VSR), `v2.52.0-stage-5q-vsr`, main `20fc323c`             |
| Branch      | `stage-5r-vpf-verifiable-probe-families`                      |
| Signer      | `stage5r-vpf-genesis` (a new key; it signs nothing 5Q signed) |

---

## The blade

> A red-team attack class is not admissible merely because one seeded mutant was detected. It becomes
> admissible only when a frozen positive-control family distinguishes vulnerable, safe and
> irrelevant-failure cases over the security roles where that class is claimed to apply.

## What this stage produced, and the number it did not

**Tranche T1 is complete, and its coverage contribution is zero.** That is the honest headline and it
is stated first, because a stage that buries its uncomfortable number has already decided what kind
of stage it is.

```text
families admissible / attempted / not attempted / universe   8 / 8 / 47 / 55
newly discharged cells / under-supported / inherited         0 / 15 301 / 23 332

5Q original coverage    6.2%  (1 438 of 23 332)
5R cumulative coverage  6.2%  (1 438 of 23 332)     label: 5R cumulative
```

All 2 406 cells of the eight attempted pairs were probed, and every one of them carries a terminal
state:

```text
probed_not_discharged  210      defect_signal_absent              192
                                class_outcome_not_demonstrated     18
unprobed              2196      premise_not_applicable            1652
                                unsupported_target_shape           544
```

**Why zero, and why it was declared before the run.** The probe is static: it reads a member's
committed bytes and evaluates one declared signal over that member's own span. It never executes a
member, and it must not — §2.4 forbids importing `stage5{a..q}` code in the primary worktree and
Ruling 5 forbids writing to the inherited tree even temporarily. Clause 10 of the discharge predicate
requires the class-specific outcome to be matched **on this member**, and a static reading cannot
demonstrate an outcome that was never executed. So no cell can be discharged by this probe, the bound
is zero, and that bound is written into the module that produces the result rather than appended to
it afterwards. A unit test asserts no cell can reach `discharged` through this probe.

**What the tranche did establish.** Eight admissible families across eight role archetypes — the
ruling's own floor — each with a vulnerable control detected, a structurally comparable safe control
cleared, and an orthogonal failure control that fails loudly and is still not called a detection.
5R demonstrates an **instrument**, and says so instead of converting it into coverage.

**Eighteen candidate findings were raised and all eighteen were refuted.** Eleven are
`Array.prototype.sort()` with no comparator in browser mirrors — the default comparator orders by
UTF-16 code unit, which is engine-independent, checked against an explicit comparator rather than
assumed. Four are digest arguments, two of which are string literals. Three are generic digest
helpers whose domain separation lives in their callers. None discharged anything; a candidate is
never an automatic discharge.

## Findings

Ten records. The opening one is inherited; two name 5R itself.

| id        | about  | severity        | what                                                                            |
| --------- | ------ | --------------- | ------------------------------------------------------------------------------- |
| `5Q-F013` | 5q     | claim_narrowing | inherited by digest; 5Q's `disposition` quoted, 5R's `vpf_disposition` added    |
| `5R-F001` | 5q     | assurance_only  | a mutation receipt covers one member in one role — 10.5% of the discharged area |
| `5R-F002` | 5q     | assurance_only  | `frozen-constant` (R8) fails §4.1; 183 discharges across 4 roles                |
| `5R-F003` | 5q     | assurance_only  | `argument-aliasing` (R8) fails §4.1; 312 discharges across 4 roles              |
| `5R-F004` | 5q     | assurance_only  | `prototype-pollution` (R1) fails §4.1; 312 discharges across 4 roles            |
| `5R-F005` | 5q     | assurance_only  | `determinism` (R15) fails §4.1; 312 discharges across 4 roles                   |
| `5R-F006` | 5q     | assurance_only  | `pathological-operand` (R9) fails §4.1; 312 discharges across 4 roles           |
| `5R-F007` | 5q     | assurance_only  | `fail-open` (R16) fails §4.1; 2 discharges in 1 role                            |
| `5R-F008` | **5r** | claim_narrowing | 5R's own probe cannot satisfy clause 10, so the tranche discharges nothing      |
| `5R-F009` | **5r** | assurance_only  | 5R's detector decided by a marker comment, not a defect; repaired at Task 18    |

`5R-F009` is the one worth reading twice. The detector built at Task 11 decided by looking for a
marker comment naming the declared signal — a marker the control's own author places. Under it
`vulnerable → detected` and `safe → not detected` held **by construction**, all seven admissibility
conditions passed, and none of it was about a defect. It was found while writing the first control,
before any campaign ran. Mutant **N7** now seeds exactly that defect and the census catches it.

5Q published twelve findings and every one named another stage, while its own harness defects were
narrated in prose. §7.3 exists to close that, and closing it means finding against yourself first.

## The audit 5R owes 5Q

Six signed 5Q families, judged against 5R's §4.1 contract: **six inadmissible**. The answer was
knowable before the code existed — the mandatory triad did not exist when they were built — so **no
score moves on this audit**. What was computed rather than asserted is which conditions hold: premise
recomputation and closure binding hold in all six, derived from 5Q's own records.

**Nothing is withdrawn.** 5Q's 1 438 discharged cells stand. L5 forbids rewriting a frozen record and
this audit rewrites none; it records what a later contract would say about an earlier artefact.

The **revalidation** audit — whether newly built 5R triads reproduce or refute the six prior
conclusions — is the question with an uncertain answer. It costs eighteen further controls and is
**deferred**, named so its absence is a decision rather than an omission.

## Evidence

```text
inherited commitment      seven 5Q digests, verified roots-first and signature-last
control corpus            8 families, 24 hand-authored controls, premise receipts byte-stable
instrument lock           18 campaign-affecting paths; 6 named OUT with reasons
campaign commitment C1    46c8577c   → results C2   632e094f   (ancestry verified)
campaign                  2 406 cells, 55 pairs, every one with a terminal state
prior-family audit        6 of 6 inadmissible under §4.1
ledgers                   delta + findings, both rebuilt byte-identically
Lean core                 5 theorems, 0 sorry, 0 axiom, each with non-vacuity witnesses
self-proof                8 mutants caught; 11 gates hold a recorded red state
parity                    Node core = portable = Python = browser, three-runtime
attestation               7 roots, signed once, verified with NO private key
```

## Honest non-claims

Verbatim from §13, and they are the point rather than the disclaimer:

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

To which this stage adds one of its own: **a static probe cannot discharge an obligation cell.**

## Ledgers

**Sockets.** 5R pays none and mints none. **I7 and I8 remain OPEN.** Paying I8 requires witness gossip
and split-view detection — a different blade in a different domain, and folding it in would give 5R
two cores.

**The universe adapter is `unbuilt`.** No task in this stage builds it. That is planned rather than
forgotten, and it is recorded here so nobody has to infer it from an absence.

**`orchestration` is excluded by measurement, not by preference** (Ruling 2). The role is unreachable
in this universe, the reason is carried as data in the family universe artefact, and its 125 members
are still counted in the 23 332.

## The ceiling this stage does not clear

C1 is an ancestor of C2, and every byte C1 committed still matches. That raises the cost of
back-fitting; it does not eliminate it, because the producer controls both commits. Closing it needs
an external witness over C1 — a timestamp authority or a transparency log — which is 5M/5N machinery
and belongs to a stage carrying it as its blade.

## Scorecard

| axis               | score | what would move it higher                                                                                           |
| ------------------ | ----: | ------------------------------------------------------------------------------------------------------------------- |
| Novelty            |   9.2 | positive-control families with a mandatory third control, and a coverage delta that is allowed to be zero           |
| Frontier           |   9.0 | an executable probe that can satisfy clause 10; three-runtime parity is present, an external witness over C1 is not |
| Good for Anthropic |   9.4 | a benchmark-validity answer shape a safety-evaluation team can adopt directly                                       |
| Constitution       |   9.5 | the stage finds against itself under signature, and publishes the number that flatters it least                     |
