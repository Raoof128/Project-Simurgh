# Stage 5R — VPF implementation plan

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

## §0 The frozen contract this plan is written against

```text
spec            docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md
freeze_commit   ba8c3b96
freeze_digest   64fe8e76971ab615a7d14d5fac59a2ced3e06cbf90859e448307d43ec5c020aa
frozen_bytes    17472
domain          simurgh.vpf.frozen-block.v1
recompute       node tools/simurgh-attestation/stage5r/node/computeFreezeReceipt.mjs
gate            node --test tests/unit/llmShield/stage5r/frozenBlock.test.js
```

The four frozen objects — `vpf_inherited_commitment`, `vpf_family_contract`,
`vpf_admissibility_rules`, `vpf_role_archetypes` — were frozen **before** this plan existed, on
purpose. A plan written against a contract still under revision becomes a fifth frozen object by
accident: the moment the plan names a behaviour the spec does not, the plan is where the real rule
lives. Nothing below may weaken §§2–5. Where this plan resolves an ambiguity in them it resolves it
**strictly**, and §1.3 records every place it does.

Predecessor pins, all verified at spec time and re-verified by Task 2:

```text
5Q tag                v2.52.0-stage-5q-vsr, main 20fc323c
closure_source_commit 3512d287d2e13ceb31115477acc8b5ff182bc36e   member_count 2531
signer to verify      stage5q-q0-genesis  (key must survive; it does not sign 5R)
inherited_cells       23332   already discharged 1438 (6.2%)   under-supported 15301
family universe       55 (attack_class, target_security_role) pairs; 165 controls
```

---

## §1 What this plan is, and the two rulings it makes

### §1.1 Scope

This plan covers the whole of 5R: inheritance, the instrument, the precommitted first tranche, the
audit 5R owes 5Q, attestation, proofs, wiring and closeout. There is no Q0/Q1 split — that structure
belonged to 5Q's red-team lifecycle and produced the deadlock 5Q recorded as F013. 5R's phase
boundary is the **tranche** (§4), which is a disclosure rule rather than a lifecycle gate, and
therefore cannot deadlock: an incomplete tranche is a published fraction, not a blocked transition.

### §1.2 Twenty-five tasks in four waves

```text
WAVE 1  inheritance and universe      Tasks 1-7    nothing may be attacked before the universe is fixed
WAVE 2  the instrument                Tasks 8-13   the contract, the runner, the ledger, the scanner
WAVE 3  self-proof and campaign       Tasks 14-19  prove the instrument, then use it
WAVE 4  attestation, proofs, closeout Tasks 20-25  sign it, prove it, wire it, publish it, ship it
```

Wave boundaries are barriers. In particular **no control executes before Task 14**, because a
campaign whose instrument has never been shown to fail is 5Q's Law 4 defect wearing this stage's
clothes.

### §1.3 The two rulings this plan makes, both narrowing

**Ruling 1 — discharge is per cell, never per pair.** §4.2 makes class-wide promotion
unrepresentable and says a family for `R4 × trust_decision` "discharges cells in `R4 ×
trust_decision` and nothing else". It does not say a family discharges **all** 363 of them. This plan
rules the strict reading: **a family's admissibility licenses attack over its (class, role) cell set;
a cell is discharged only when the family's probe actually ran against that cell's member and
produced a result bound to that `obligation_id`.** `coverage_delta` counts probed cells, not pair
size.

The reason is that the loose reading is 5R-F001 one level down. 5Q generalised one mutant to a whole
class; a family that generalised one control to 363 members of one role would be making the identical
argument at finer grain, in the stage built to forbid it. The blade does not get an exemption for
being ours.

Consequence, stated now so it cannot be a surprise at closeout: **5R's delta will be small.** The
first tranche's eight pairs span 2 406 cells, and the delta will be a fraction of that, not 2 406.
That is the honest arithmetic of the strict reading, and §11.5's four-term disclosure exists so a
small number can be published without being dressed up.

**Ruling 2 — `orchestration` is unreachable in this universe, by measurement.** §5.1 maps A7 to
`orchestration, parity_mirror`. Recomputed from the inherited matrix, `orchestration` is obligated
only under R9 and R16 — both in the attacked five, neither in the under-supported eleven — so no
(class, role) pair in the 55 touches it. The universe reaches **eight** of the nine populated roles.
A7's floor is therefore discharged through `parity_mirror` alone, and the closeout must say
`orchestration` was never in scope rather than letting A7's tick imply it was.

---

## §2 Global constraints — binding on every task

**Read-only surface.** `docs/research/llm-shield/evidence/stage-5q/**` and
`tools/simurgh-attestation/stage5{a..q}/**`. A task that needs a predecessor's logic **reads it as
prior art and reimplements**; §2.4 forbids importing a `stage5{a..q}` module in the primary worktree,
and F003 established that importing a closure module is not read-only.

**Write surface**, exhaustive, per frozen §2.3:

```text
STAGE-OWNED            tools/simurgh-attestation/stage5r/**
                       tests/**/stage5r/**   tests/fixtures/llmShield/stage5r/**
                       proofs/stage5r/**     docs/research/llm-shield/evidence/stage-5r/**
                       docs/research/llm-shield/STAGE_5R_CLOSEOUT.md
                       docs/superpowers/specs/2026-07-27-...-design.md   (annex only, post-freeze)
                       docs/superpowers/plans/2026-07-27-...-implementation-plan.md
                       scripts/check-stage5r-proofs.sh
                       scripts/reproduce-llm-shield-stage5r.sh
                       .github/workflows/stage-5r-checks.yml
SHARED, MUTATION-SCOPED   package.json (scripts key only) · .prettierignore (one line)
                       scripts/check-e2e.sh (one REPRODUCE entry) · README.md (banner, closeout only)
                       scripts/security-audit-llm-shield-stage3m.sh
                       scripts/security-audit-llm-shield-stage3o.sh  (one allowlist line each,
                       matching by PATH REGEX with no digits)
```

Task 1 builds the verifier for this list before any other task writes a file, and the verifier
compares **parsed before/after structure** for the shared entries, not paths: "I only touched
`package.json`" must not cover swapping a crypto library.

**Runtime.** Node 26 at `/opt/homebrew/opt/node@26/bin/node` for every evidence build. Evidence built
under any other runtime is not byte-comparable and does not count as a build.

**Raw codes.** None allocated (§11.4). No 5R document prints a raw-code literal from any
predecessor's band, and the next free value is read from the allocator rather than restated. If a 5R
finding needs a typed outcome, it arrives by post-freeze annex under the Annex R contract — one
canonical table, lookup never arithmetic, band closed on completion.

**Attribution.** Commit, PR and release messages are neutral. No co-author trailer and no tool tag
anywhere.

**Keys.** The 5R private key never leaves `~/.simurgh/` and is never committed. Deterministically
derived keys are forgeable and are prohibited. The 5Q key must survive — it verifies inherited
signatures and does not sign 5R.

**Evidence hygiene.** Every generated artifact is produced by a CLI main with a main guard, is built
twice and `cmp`-ed, and every node driver carries its main guard from its first commit.

---

## §3 Plan-quality gates

These bind the plan itself, and a task that violates one is not ready to execute.

```text
P1  every task states its verification COMMAND, runnable as written, with no placeholder
P2  every task states its definition of done as an observable, not an intention
P3  every spec gate G0-G10 has a task that BUILDS it and a task that proves it RED (§8.3)
P4  every self-proof mutant N1-N6 has a task that seeds it and an expected catch
P5  no task depends on an artifact produced by a later task
P6  every frozen-object obligation appears in Matrix 2 against the task that discharges it
P7  a task that touches a shared mutation-scoped file names the exact mutation in advance
```

**These gates caught this plan.** A line-by-line pass against the repo found three of them violated by
the first draft: P1 twice (`<base>` written as a literal placeholder in Tasks 1 and 22), P2/P5 twice
(Tasks 5 and 16 stated done-conditions that depended on Task 19's behaviour), and P5 again in
Matrix 1, where Task 15 was scheduled to prove the red state of two gates that Tasks 19 and 23 had not
yet built. All are repaired above. A quality gate that has never rejected its own author's work is
the same unproven instrument this whole stage is about.

---

## §4 The precommitted first tranche

### §4.1 The floor, and why these eight

§11.5's minimum is one admissible family per role archetype that any under-supported class obligates.
By §1.3's Ruling 2 that is eight archetypes reached through **eight roles**. The tranche is fixed
**here, before any family is built**, because §1.7's T3 is "pick the detector signal after seeing
results" and its sibling is "pick the family after seeing which one worked".

Selection rule, stated so it is checkable rather than aesthetic: **attack where the predecessor's
evidence is thinnest first.** The three roles that received no mutation evidence at all and are
reachable in this universe — `evidence_emission`, `formal_statement`, `code_allocation` — lead. Then
one pair per remaining archetype, choosing the class carrying the largest obligation in that role so
the delta is worth measuring.

| #   | archetype | pair                      | cells | why this pair                                                                                                                            |
| --- | --------- | ------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | A5        | `R2 × evidence_emission`  |   376 | no mutation evidence ever reached this role                                                                                              |
| F2  | A8        | `R10 × formal_statement`  |   181 | the archetype the ruling did not name; R10 over R7 because R7 is inadmissible in 5Q and a floor family should not depend on lifting that |
| F3  | A4        | `R12 × code_allocation`   |    17 | smallest role in the closure; if the contract cannot work here it cannot work                                                            |
| F4  | A1        | `R4 × trust_decision`     |   363 | the role every trust decision flows through                                                                                              |
| F5  | A2        | `R3 × completeness_claim` |   582 | largest role in the closure                                                                                                              |
| F6  | A6        | `R3 × schema_gate`        |   496 | schema_gate reaches only R2, R3, R7 in this universe                                                                                     |
| F7  | A3        | `R6 × canonicalisation`   |    71 | canonicalisation is where source-span geometry bugs live                                                                                 |
| F8  | A7        | `R11 × parity_mirror`     |   320 | A7's only reachable half (Ruling 2)                                                                                                      |

```text
tranche T1     8 families · 24 controls · 2406 cells spanned of 15301 under-supported
universe       55 families · 165 controls
```

**2 406 is the span, not the delta.** Under Ruling 1 the delta is the number of cells actually probed
and admitted. Both numbers are published; neither substitutes for the other.

### §4.2 What may change after this point

The tranche list may **grow**. It may not be **swapped**: a family that is attempted and fails is
published as attempted-and-inadmissible (§4.5), and replacing F5 with an easier pair after seeing F5
fail is the exact move §11.5 forbids. Task 19's ledger records `families attempted` and
`families admissible` as separate numbers, and their difference is a finding if it is large.

---

## §5 Wave 1 — inheritance and universe (Tasks 1–7)

### Task 1 — write-surface verifier, before anything else writes

**Build.** `stage5r/core/writeSurface.mjs` + `node/checkWriteSurface.mjs`. Path classification for
the stage-owned list; **parsed structural comparison** for the six shared entries (package.json
scripts-key-only diff; .prettierignore single added line; check-e2e.sh single REPRODUCE entry; one
allowlist line per audit script, each matching a path regex containing no digits; README banner).

**Also, in this task and not later:** add the single `.prettierignore` line
`docs/research/llm-shield/evidence/stage-5r/`. Every stage from 5P on ignores its whole evidence
directory, and Task 4 commits generated JSON. Scheduling this edit in Wave 4 would leave
`npm run format:check` red from Wave 1 onward — the wiring-order gotcha this project has already paid
for once. The mutation is named here in advance, which is the permitted route.

**Tests first.** A stage-owned write passes; a write to `stage5q/**` fails; a `package.json` scripts
addition passes while a dependency change fails; an allowlist line containing a digit fails; a
`.prettierignore` diff of more than one added line fails.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/writeSurface.test.js
node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs \
  --range "$(git merge-base origin/main HEAD)..HEAD"
npm run format:check
```

**Done when.** The verifier exits 0 on the branch as it stands, exits non-zero on a seeded
`stage5q/**` edit, and `format:check` is green with the `.prettierignore` line present.

### Task 2 — inheritance verifier, roots first, signature last

**Build.** `core/inherit.mjs` + `node/verifyInheritance.mjs`. Recompute all seven digests from the
committed 5Q evidence; verify the signed envelope against `stage5q-q0-genesis`; confirm
`member_count == 2531` and `closure_source_commit == 3512d287`; fail closed naming which digest moved.

**Tests first.** All seven match on the real tree; a one-byte mutation of any inherited file is
refused and names the digest; a valid signature over a mutated root is still refused (roots first);
`member_count` drift is refused.

**Verify.** `node tools/simurgh-attestation/stage5r/node/verifyInheritance.mjs`
**Done when.** Exit 0 with seven digests printed, and exit non-zero for each of the seven single-byte
tamper cases.

### Task 3 — G0: recompute every measurement §1.2 publishes

**Build.** `node/measureInheritedGap.mjs`. Recomputes, from the inherited receipts, closure and
obligation matrix: the nine-role histogram summing to 2531; 15 301 under-supported and 8 031 attacked
of 23 332; 2 118 of 20 213 at 10.5%; the 26 obligations carried by the four unreached roles and the
22 discharged from another role; the six receipts on `omitted` cells; four-of-nine roles reached once
restricted to discharged classes; 55 pairs.

**Tests first.** Each figure asserted against the spec's printed value, read **from the spec text**
so prose and gate cannot drift apart.

**Verify.** `node --test tests/unit/llmShield/stage5r/measureInheritedGap.test.js`
**Done when.** Every number in §1.2 and §7.4 is reproduced from committed bytes, and changing any one
of them in the spec turns the test red.

### Task 4 — the family universe

**Build.** `core/archetypes.mjs` (A1–A8, plus the measured fact that `orchestration` is unreachable)
and `node/buildFamilyUniverse.mjs` emitting `evidence/stage-5r/universe/family-universe.json`: the 55
pairs with their inherited cell counts and archetype.

**Tests first.** Exactly 55 pairs; every pair generates ≥1 obligated cell in the inherited matrix;
restricted to the eleven under-supported classes; eight distinct roles; `orchestration` absent with
the reason recorded as data, not a comment; A8 present carrying 362 cells.

**Verify.** `node --test tests/unit/llmShield/stage5r/archetypes.test.js`
**Done when.** The universe file is byte-stable across two builds and `git diff --exit-code` is clean
after the second.

### Task 5 — the tranche commitment

**Build.** `evidence/stage-5r/universe/tranche-t1.json` — §4.1's eight pairs, committed **before any
family exists**, with the selection rule recorded alongside the list.

**Tests first.** The tranche is a subset of the universe; covers eight distinct archetypes; its
spanned-cell total is 2 406; a pair not in the universe is refused.

**Verify.** `node --test tests/unit/llmShield/stage5r/tranche.test.js`
**Done when.** `tranche-t1.json` is committed, byte-stable across two builds, and its digest is
recorded in the same commit. (The enforcement that no family outside it may be published belongs to
Task 17's own done-condition; a task's done-condition may not depend on a later task's behaviour.)

### Task 6 — baseline capture and the transition model

**Build.** `core/transition.mjs` (5R's own copy; `regressed_by_5r`, every other value byte-identical
to 5Q's — copy, never rename, per §11.3) + `node/verifyTransition.mjs`. Capture the prior-stage
baseline **now**, before any 5R artifact can perturb anything.

**Tests first.** A tree-relative command is `not_comparable`; absent a baseline run the value is
`not_compared`, never `green`; a command that failed before and after is `pre_existing`; one that
passed before and fails after is `regressed_by_5r`.

**Verify.** `node --test tests/unit/llmShield/stage5r/transition.test.js`
**Done when.** A baseline record exists under `evidence/stage-5r/transition/` and 5Q's
`transition.mjs` is untouched (`git diff --exit-code -- tools/simurgh-attestation/stage5q/`).

### Task 7 — the import-damage detector and the scratch worktree

**Build.** `node/probeImportWrites.mjs` + the scratch-worktree runner every import-executing task
uses. Snapshot digests of the primary worktree, run the import work in a scratch `git worktree`,
re-snapshot, diff.

**Tests first.** A module that writes on import is detected and named; a clean import leaves the
snapshot identical; the scratch worktree is removed even when the probe throws.

**Verify.** `node --test tests/unit/llmShield/stage5r/probeImportWrites.test.js`
**Done when.** The detector reports zero damage after a full closure-import sweep, and reports damage
when a writer is deliberately seeded.

---

## §6 Wave 2 — the instrument (Tasks 8–13)

### Task 8 — the family contract

**Build.** `core/familyContract.mjs`: §3.1's record shape, mandatory fields, no optional control, and
the **frozen** `forbidden_surrogate_signals` list of §3.4.

**Tests first.** A record missing any of the three controls is refused; the forbidden list is exactly
the six frozen entries and is immutable at runtime; `detector_signal` must be a single named signal
and a disjunction is refused (§3.3).

**Verify.** `node --test tests/unit/llmShield/stage5r/familyContract.test.js`

### Task 9 — admissibility, conjunctive and without partial credit

**Build.** `core/admissibility.mjs`: §4.1's seven conditions; §4.3's structural comparability
including the not-a-stub rule; §4.4's binding to the inherited closure.

**Tests first.** Each of the seven conditions falsified in turn yields inadmissible **and names the
failing condition**; six-of-seven is inadmissible; a `function_id` absent from the inherited closure
is refused; a safe control that never reaches the `detector_signal` path is refused even though it is
"not detected".

**Verify.** `node --test tests/unit/llmShield/stage5r/admissibility.test.js`

### Task 10 — the three-control runner and restoration proof

**Build.** `core/controls.mjs` + `node/runFamily.mjs`. Premise recomputation per control; mutation
restoration proved by `source_digest` equality before and after, recorded as a receipt (§3.6); all
mutating work inside the scratch worktree of Task 7.

**Tests first.** A vulnerable control whose premise no longer holds fails the family rather than
passing it; an unrestored mutation fails the family; a no-op orthogonal control fails the family
(§3.2); restoration receipts are per control, not per family.

**Verify.** `node --test tests/unit/llmShield/stage5r/controls.test.js`

### Task 11 — Lane B, the blind detector process

**Build.** The two-process ceremony: the detector runs in a child that receives control bytes on
stdin plus the attack class and **is not told which of the three controls it is looking at**. Env
scrubbed to `PATH`; `OPERATOR*` env and `.pem` argv refused; the parent never rewrites the child's
verdict.

**Tests first.** Blindness is asserted **structurally**, not statistically: the payload handed to the
child is checked to contain no field naming which control it is (`control_kind`, `is_vulnerable`,
file paths that encode it, ordering that reveals it), and a deliberately label-leaking payload is
caught by the lane's own guard and fails the run. A distribution comparison was the first draft's
test and it is not a test: two runs of an honest detector agree by construction, so the assertion
passes whether or not the child could see the label.

Also: a parent attempting to overwrite a verdict is refused; a `.pem` in argv aborts; an unscrubbed
env var aborts; the child's exit code alone never becomes the verdict (§3.4's first surrogate).

**Verify.** `node --test tests/unit/llmShield/stage5r/laneB.test.js`

### Task 12 — the delta ledger

**Build.** `core/deltaLedger.mjs` + `node/buildDeltaLedger.mjs`: §6.1's five fields;
`inherited_cells` a constant 23 332 with no schema key able to hold another value;
`newly_discharged_cells` a **set of inherited `obligation_id`s**; empty-intersection assertion against
5Q's discharged set; `cumulative_coverage` always labelled `5R cumulative` and always printed beside
the inherited 6.2%.

**Tests first.** A cell 5Q already discharged is refused (T5); an attempt to write a different
`inherited_cells` is unrepresentable (T6); a bare `coverage` field does not exist; per Ruling 1, a
family claiming its whole pair without per-cell results is refused.

**Verify.** `node --test tests/unit/llmShield/stage5r/deltaLedger.test.js`

### Task 13 — the prose gate

**Build.** `core/prose.mjs` + its driver: G7's scanner over 5R's spec, plan, closeout, release notes
and evidence for sentence shapes attributing a post-5Q figure to 5Q. Strips comments first **and**
asserts the raw file still contains the pattern, so stripping cannot make the scan vacuous.

**Tests first.** A violating sentence is caught in each artifact type; the scanner does not match its
own explanation; the anti-vacuity assertion fails when the pattern is absent from the raw file.

**Verify.** `node --test tests/unit/llmShield/stage5r/prose.test.js`

---

## §7 Wave 3 — self-proof and campaign (Tasks 14–19)

### Task 14 — N1–N6, the harness-level self-proof

**Build.** `node/runMutationSelfProof.mjs` producing a green→red→green receipt for each:

| mutant | what is seeded                                                         | which check must catch it, and how it must fail                                  |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| N1     | admissibility accepts a family whose orthogonal control WAS detected   | `admissibility.mjs` returns inadmissible naming condition three                  |
| N2     | delta ledger double-counts a cell 5Q already discharged                | the empty-intersection assertion throws, naming the `obligation_id`              |
| N3     | inheritance verifier accepts a mutated 5Q digest                       | `verifyInheritance` exits non-zero naming which of the seven moved               |
| N4     | safe control is a stub the detector never reaches                      | §4.3's not-a-stub check fails the family despite "not detected"                  |
| N5     | a family whose verdict CHANGES under surrogate suppression is admitted | §3.4's suppression run marks the family inadmissible, reason recorded            |
| N6     | a per-role admissibility silently promotes to class-wide               | the promotion is unrepresentable; the seeded write throws at the ledger boundary |

**Done when.** All six are caught, each with a recorded red state naming the catching check, not
merely a non-zero exit. **N6 is the blade's own mutant: if it is not caught, the stage does not
ship**, and that is a stop condition, not a warning.

### Task 15 — recorded red state for every gate that exists by this point (§8.3)

**Build.** For **G0–G7 and G10** — every gate whose implementation exists by the end of Task 14 —
seed a violation, record the failure output, revert, record green. Stored under
`evidence/stage-5r/gate-red-states/`.

**G8 and G9 are excluded here and belong to Task 23**, because G8's assertion is built in Task 23 and
G9's in Task 19, both after this task. An earlier draft of this plan scheduled all eleven here, which
would have required proving the red state of a gate that did not yet exist — a P5 violation in the
plan's own matrix, and precisely the kind of ordering fiction that turns into a skipped step under
deadline.

**Done when.** Nine gates have a red receipt each. A gate with no recorded red state blocks the tag —
5Q shipped two gates that could never pass, and the inverse (a gate that can never fail) is worse
because it is invisible.

### Task 16 — build the T1 families

**Build.** Eight family directories under `stage5r/families/`, each with three hand-authored controls
and a pre-registered `detector_signal` committed **before** the run. Lane C is `not_in_scope`:
controls are hand-authored with recomputed premises, and a model-authored control whose vulnerability
was never independently verified would put an unverified premise under the stage's central claim.

**Done when.** 24 controls exist, each with a premise receipt, and each family's `detector_signal` is
committed as its own digest-bound file whose digest is recorded in
`evidence/stage-5r/commitments/signal-commitments.json` **before** Task 17 runs. Task 17 refuses any
family whose signal file is missing or whose digest differs from the recorded one.

Precommitment is proved by **content, not by commit order**. An earlier draft asserted it from git
history, which a rebase silently rewrites — a precommitment provable only by a mutable log is not a
precommitment, and this stage's own T3 is the move it is meant to stop.

### Task 17 — run the tranche

**Build.** `node/runTranche.mjs`. Every family through the seven conditions; per-cell results bound to
inherited `function_id` and `obligation_id`; forbidden-surrogate suppression run for each family.

**The probe set, ruled here because Ruling 1 requires it and the spec does not fix it.** A family's
probe set is **every cell in its (class, role) pair** — all 582 of `R3 × completeness_claim`, all 17
of `R12 × code_allocation`, and so on. Each cell ends in exactly one of three states, all published:

```text
discharged    the probe ran against that member and produced a result bound to its obligation_id
unprobed      the probe could not run; the reason is recorded per cell
inadmissible  the family failed §4.1, so none of its cells are discharged
```

`coverage_delta` is the count of `discharged` cells and nothing else. **Sampling is prohibited**: a
family that probed 30 of 582 members and claimed the pair would be making the identical argument 5Q
made from one mutant to a whole class, which is the argument this stage exists to refuse. If probing
every cell is too expensive for a family, the honest response is to publish the unprobed remainder,
not to generalise over it — and if the unprobed count is large, that is the finding.

**Done when.** Eight families have outcomes, admissible or not; every cell in every attempted pair
carries one of the three states; and **every attempted family is published** including the failures.
`families attempted − families admissible` and the total `unprobed` count are numbers in the output,
not subtractions the reader must perform. No family outside `tranche-t1.json` appears in the results.

### Task 18 — the audit 5R owes 5Q (§7.3)

**Build.** `node/auditPriorFamilies.mjs`. 5Q's six control-free families — `frozen-constant` R8,
`argument-aliasing` R8, `prototype-pollution` R1, `determinism` R15, `pathological-operand` R9,
`fail-open` R16 — re-examined against §4.1, reading 5Q's definitions as prior art without importing
them.

**Done when.** Six verdicts are published as **ledger records**, whichever way they fall. 5Q's 1 438
cells are not retroactively removed — L5 forbids rewriting a frozen record — but a discharge that
would not be admissible under the stronger rule is recorded as a distinct, visible line. This is the
task that can move Frontier above 9.3, and it is equally able to find nothing.

### Task 19 — the 5R finding ledger and the delta

**Build.** `node/buildFindingLedger.mjs` and the delta ledger build. Opens with the two inherited
records — `5Q-F013` with 5R's `vpf_disposition` (5Q's own `disposition` quoted, never replaced) and
`5R-F001` at `assurance_only` — then Task 17's and Task 18's outcomes, **including findings against
5R itself**. 5Q published zero findings against 5Q; 5R records its own outcomes as ledger rows.

**Done when.** The ledger verifies, the delta intersects 5Q's discharged set in ∅, and the four-term
disclosure of §11.5 is present with arithmetic that checks.

---

## §8 Wave 4 — attestation, proofs, wiring, closeout, release (Tasks 20–25)

### Task 20 — Lean core

**Build.** `proofs/stage5r/`, Lean 4.15.0, no mathlib, zero `sorry`, symbolic model:

```text
Admissibility.lean          L1  conjunctive; any false condition ⟹ inadmissible
NoPromotion.lean            L2  admissible(R,S) ⇏ admissible(R,S′) for S′ ≠ S
DeltaDisjoint.lean          L3  union of deltas disjoint from inherited discharged ⟹ cumulative ≤ 1
DenominatorInvariance.lean  L4  no admission sequence changes inherited_cells
OrthogonalSoundness.lean    L5  verdict invariant under surrogate suppression ⟹ distinguishable
```

**Build also.** `scripts/check-stage5r-proofs.sh`, gated **by discovery with a count floor**:
enumerate `proofs/stage5r/*.lean` from the filesystem, refuse when the count is below five, then
check each. 5P's lean-check listed proofs by name and went vacuously green; the same defect is open
in the shared workflow as 5Q-F001, and an empty directory piped to `xargs` exits 0.

**Verify.** `bash scripts/check-stage5r-proofs.sh`
**Done when.** Five proofs check, zero `sorry`, and deleting a proof file turns the script red.

### Task 21 — attestation and the key ceremony

**Build.** Two-tier attestation with the §10.1 roots; signer profile `stage5r-vpf-genesis`; Ed25519
key generated in-session at `~/.simurgh/5r-ed25519.pem`, never committed, public key digest recorded
in the bundle. The 5Q key is required to verify inherited signatures and **does not sign 5R** — a
successor signing with its predecessor's key makes the two indistinguishable.

**Tests first.** Roots-first verification; a mutated root refuses before the signature is examined; a
bundle signed by the 5Q key is refused; the public key digest must match.

**Verify.** `node --test tests/unit/llmShield/stage5r/attestation.test.js`

### Task 22 — parity, wiring, reproduce

**Build.** `python/` and `browser/` mirrors of the deterministic core;
`scripts/reproduce-llm-shield-stage5r.sh`; `.github/workflows/stage-5r-checks.yml`, which **invokes
`scripts/check-stage5r-proofs.sh`** so the Lean gate runs in CI rather than only on a developer's
machine. Then the remaining mutation-scoped edits: `check-e2e.sh` (one REPRODUCE entry), both
security-audit allowlists (one path-regex line each, no digits), `package.json` (scripts key only).
`.prettierignore` was already edited in Task 1; `README.md` belongs to Task 24. That is **five shared
files touched across three tasks**, not four in one, and the verifier of Task 1 sees all of them.

**Verify.**

```bash
bash scripts/reproduce-llm-shield-stage5r.sh
node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs \
  --range "$(git merge-base origin/main HEAD)..HEAD"
bash scripts/check-e2e.sh
```

**Done when.** Node == Python == browser on the deterministic surface, evidence built twice and
`cmp`-ed under Node 26, the reproduce script joins the REPRODUCE array and passes from it, and the
write-surface verifier is green **with** the shared edits present — the property whose absence 5Q
shipped unrepaired.

### Task 23 — K7 all-functions net

**Build.** Every export of every 5R module, plus §14's tamper matrix: each of the seven inherited
digests mutated by one byte → refusal; each of the seven §4.1 conditions falsified in turn →
inadmissible; each forbidden surrogate forced as the sole signal → inadmissible. Cross-stage
invariants: 5Q evidence byte-identical after the full run (G8); delta ∩ 5Q-discharged == ∅;
`inherited_cells == 23332` unconditionally; no per-role result promoted to class-wide.

**Also.** The red states for **G8 and G9**, deferred from Task 15 because neither gate existed then:
seed a write into the 5Q evidence tree and confirm G8 fires; seed a tranche disclosure missing one of
its four terms and confirm G9 fires; revert both.

**Verify.** `node --test tests/e2e/llmShield/stage5r/k7AllFunctions.test.js`
**Done when.** Zero exports uncovered; G8 verified by digesting the 5Q tree before and after a full
run; and all **eleven** gates now hold a recorded red state between Task 15's nine and this task's
two.

### Task 24 — tranche disclosure, closeout, re-score

**Build.** `STAGE_5R_CLOSEOUT.md` carrying, always together:

```text
families admissible / families attempted / families in the universe (55)
newly discharged cells / 15 301 under-supported / 23 332 inherited
5Q original coverage 6.2% (1 438 of 23 332)   ·   5R cumulative <measured>
```

Plus: §13's honest non-claims verbatim; the socket ledger with I7 and I8 still **OPEN** and 5R paying
neither and minting nothing unless measured evidence produces a genuine new debt; Ruling 2's
`orchestration` exclusion stated rather than implied; the total `unprobed` cell count from Task 17;
and the four-axis re-score. The `README.md` release banner is edited here and nowhere else — it is
the sixth shared file, and it is named so its edit is declared before it happens.

**§12.2's universe-adapter schema will be reported `unbuilt`, and that is planned rather than
forgotten.** No task in this plan builds it: it is roadmap debt for a later stage, and a stage that
quietly built half of it and reported a tick would be doing to its own ledger what §7.3 criticises 5Q
for doing to its findings. The closeout names it, names its blocker, and says `unbuilt`.

**Re-score rule, fixed in advance so it cannot be tuned to the result.** Frontier rises above 9.3
only if Task 18 finds one of 5Q's six families inadmissible. Constitution rises above 9.5 only if the
stage published an uncomfortable result of its **own** campaign. If Task 17 lands at the §11.5 floor
and Task 18 finds nothing, the scores go **down**, and the closeout says so.

### Task 25 — security review, PR, tag

**Build.** Nothing new. This task is the release sequence every prior stage ran and this plan's first
draft omitted entirely — a plan that ends at "closeout written" ends one step before the work is
actually exposed to anyone.

```text
1  security review of scripts/reproduce-llm-shield-stage5r.sh and
   .github/workflows/stage-5r-checks.yml — the two new pieces of executable surface
2  full local gate sweep: npm test · check-e2e.sh · reproduce · check-stage5r-proofs.sh
3  PR, neutral message, no co-author trailer and no tool tag
4  CI green, merge, tag v2.53.0-stage-5r-vpf, verify the tag has a matching release
```

**Done when.** The security review found no vulnerability and no control regression, or its findings
are repaired and re-reviewed; CI is green; and `gh release list` shows the tag — a tag is not a
release, which 5C learned the expensive way.

---

## §9 Matrix 1 — gate → task that builds it → task that proves it red

| gate   | what it asserts                                                   | built by                         | red-state proof           |
| ------ | ----------------------------------------------------------------- | -------------------------------- | ------------------------- |
| G0     | §1.2's measurements recompute                                     | Task 3                           | Task 15                   |
| G1     | seven inherited digests recompute; envelope verifies roots-first  | Task 2                           | Task 15                   |
| G2     | every published family satisfies all seven §4.1 conditions        | Task 9                           | Task 14 (N1)              |
| G3     | every control carries a recomputed premise and proven restoration | Task 10                          | Task 15                   |
| G4     | no `coverage_delta` intersects 5Q's discharged set                | Task 12                          | Task 14 (N2)              |
| G5     | no per-role admissibility promotes to class-wide                  | Task 9                           | Task 14 (N6)              |
| G6     | the six N-mutants are detected                                    | Task 14                          | Task 15                   |
| G7     | no 5R artifact attributes a post-5Q figure to 5Q                  | Task 13                          | Task 15                   |
| G8     | 5Q evidence byte-identical before and after the full run          | Task 7, asserted 23              | Task 23                   |
| G9     | tranche disclosure present and its arithmetic checks              | Task 19                          | Task 23                   |
| G10    | no 5R document prints a predecessor-band raw-code literal         | Task 13                          | Task 15                   |
| freeze | §§2–5 match `64fe8e76…`                                           | **done** (`ba8c3b96`/`0e3a564e`) | **done**, both directions |

---

## §10 Matrix 2 — frozen obligation → discharging task

| frozen source | obligation                                                        | task                |
| ------------- | ----------------------------------------------------------------- | ------------------- |
| §2.1          | seven digests + bound context verified before any artifact        | 2                   |
| §2.2          | roots first, signature last; fail closed naming the digest        | 2                   |
| §2.3          | write surface exhaustive, shared entries mutation-scoped          | 1, 22               |
| §2.4          | no `stage5{a..q}` import in the primary worktree; damage detector | 7                   |
| §3.1–3.2      | three mandatory controls, no optional control                     | 8, 10               |
| §3.3          | one pre-registered `detector_signal`, committed before the run    | 8, 16, 17           |
| §3.4          | frozen forbidden-surrogate list; suppression changes nothing      | 8, 17               |
| §3.5          | `coverage_delta` over inherited ids (per cell — §1.3 Ruling 1)    | 12                  |
| §3.6          | mutation restoration proven by digest equality                    | 10                  |
| §4.1          | seven conditions, conjunctive, failing condition published        | 9                   |
| §4.2          | per-role admissibility; class-wide unrepresentable                | 9, 14 (N6), 20 (L2) |
| §4.3          | structural comparability incl. the not-a-stub rule                | 9, 14 (N4)          |
| §4.4          | results bind to the inherited closure                             | 9, 17               |
| §4.5          | inadmissible is published, never retried into green               | 17, 19              |
| §5.1–5.2      | A1–A8 including the named A8 extension                            | 4                   |
| §5.3–5.4      | 55-pair universe by rule, not by schedule                         | 4                   |
| §6.1–6.2      | delta ledger; 23 332 constant; no bare coverage field             | 12                  |
| §6.3          | prose gate, comment-stripped and anti-vacuous                     | 13                  |
| §7.1          | F013 inherited unchanged; `vpf_disposition` added beside 5Q's     | 19                  |
| §7.3          | 5Q's six families audited; outcomes as ledger records             | 18                  |
| §7.4          | 5R-F001 at `assurance_only`, not a repair                         | 3, 19               |
| §8.1–8.3      | family self-proof, N1–N6, every gate's red state                  | 14, 15              |
| §9.2          | Lane B blindness; Lane C `not_in_scope` with the reason           | 11, 16              |
| §10.1         | roots; new 5R key; 5Q key survives but does not sign              | 21                  |
| §10.2         | five Lean theorems; gated by discovery with a count floor         | 20                  |
| §11.5         | tranche rule; four terms always together                          | 5, 19, 24           |
| §12.1–12.3    | socket ledger, founder's blocker, new evidence species            | 24                  |
| §13           | honest non-claims published in attestation and closeout           | 21, 24              |
| §14           | K7 net + tamper matrix + cross-stage invariants                   | 23                  |

---

## §11 Definition of done for the stage

```text
25 tasks complete, each by its own verification command
N6 caught                                    (else the stage does not ship)
11 gates green, each with a recorded red state   (9 in Task 15, 2 in Task 23)
5 Lean proofs, zero sorry, gated by discovery with a count floor
Node == Python == browser on the deterministic surface
evidence built twice and cmp-ed under Node 26
5Q evidence tree byte-identical before and after           (G8)
delta ∩ 5Q-discharged == ∅                                  (G4)
inherited_cells == 23332 unconditionally                    (T6 closed)
every attempted family published, admissible or not         (§4.5)
four-term tranche disclosure present and arithmetically checked
freeze digest 64fe8e76… unchanged, or amended by numbered annex only
```

**And the one that is not a checkbox.** If the campaign lands at the floor and the audit finds
nothing, the honest closeout says the instrument was built and shown to work, that it discharged
little, and that the scores went down. That outcome is a result. Stretching the campaign until the
number improves is the failure mode this stage was built to make visible in other people's work, and
it does not become acceptable when it is ours.
