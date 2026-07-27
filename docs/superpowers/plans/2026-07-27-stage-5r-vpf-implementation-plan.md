# Stage 5R — VPF implementation plan

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

## §0 The contract this plan is written against — both digests

```text
spec                    docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md
frozen_block_commit     ba8c3b96
freeze_receipt_commit   0e3a564e
freeze_digest           64fe8e76971ab615a7d14d5fac59a2ced3e06cbf90859e448307d43ec5c020aa
frozen_bytes            17472
frozen_domain           simurgh.vpf.frozen-block.v1

post_freeze_spec_commit <pending — inserted by the commit after this one>
full_spec_digest        e1f282574c2a294eeae94e12abb6fc1bfaf32f17a8efb09c6bcc6f57380682d6
full_spec_domain        simurgh.vpf.full-spec.v1

recompute both          node tools/simurgh-attestation/stage5r/node/computeFreezeReceipt.mjs
gate                    node --test tests/unit/llmShield/stage5r/frozenBlock.test.js
```

**Why two digests.** The frozen digest is deliberately blind to everything outside §§2–5 — that is
what makes the rest of the document amendable. But this plan depends on amendable sections: §8.2's
mutant list, §9.2's corpus scope, §10.1's roots and key model. A reviewer who can verify only the
frozen core cannot tell which version of the remainder the plan assumed. `full_spec_digest` pins
that, and a test asserts the plan's recorded value against the live spec — so amending the spec
without re-pinning the plan turns CI red, deliberately.

**Spec sections amended after the freeze, all outside §§2–5, freeze digest unchanged throughout:**
§8.2 (N5 split into N5a/N5b — seven mutants, not six), §9.2 (Lane A's corpus is the attempted set;
one paragraph also repaired after a wrapped `+` line was reformatted into a list item, fragmenting
it), §10.1 (`family_result_root` total over 55 pairs; `control_receipt_root` scoped to attempted
families; the false claim that verifying 5Q's signature needs 5Q's **private** key, corrected to the
public key committed in the envelope), §11.1 (G6 counts seven).

Predecessor pins, verified at spec time and re-verified by Task 2:

```text
5Q tag                v2.52.0-stage-5q-vsr, main 20fc323c
closure_source_commit 3512d287d2e13ceb31115477acc8b5ff182bc36e   member_count 2531
verify 5Q with        the PUBLIC key in signer.public_key_b64, pinned by
                      expected_public_key_digest de557244…  (no private key required)
inherited_cells       23332   already discharged 1438 (6.2%)   under-supported 15301
family universe       55 (attack_class, target_security_role) pairs; 165 controls at full scope
```

---

## §1 What this plan is, and the rulings it makes

### §1.1 Scope

The whole of 5R: inheritance, the instrument, a precommitted first tranche, the audit 5R owes 5Q,
attestation, proofs, wiring, closeout and release. There is no Q0/Q1 split — that structure belonged
to 5Q's red-team lifecycle and produced the deadlock 5Q recorded as F013. 5R's phase boundary is the
**tranche**, a disclosure rule rather than a lifecycle gate, so an incomplete tranche is a published
fraction and not a blocked transition.

### §1.2 Twenty-seven tasks in four waves

```text
WAVE 1  inheritance and universe        Tasks 1-7    nothing is attacked before the universe is fixed
WAVE 2  the instrument                  Tasks 8-14   contract, admissibility, controls, ledger, scanners
WAVE 3  prove, lock, commit, run        Tasks 15-21  prove it, lock it, build it, commit it, run it
WAVE 4  attest, prove, wire, ship       Tasks 22-27  sign it, prove it, wire it, publish it, release it
```

Wave boundaries are barriers, and the campaign order inside Wave 3 is the load-bearing one:

```text
Task 17  lock the instrument
Task 18  BUILD the 24 controls — no execution
Task 19  commit C1 over those exact bytes
Task 20  execute the committed campaign, producing C2
```

Building controls before C1 is lawful; **running** them before C1 is not. An earlier draft had C1
committing "all three control digests per family" one task _before_ the controls existed, which is
not merely out of order — it is impossible, and the task that followed then required each control to
match a C1 entry that could never have been computed.

**No campaign control executes before Task 20.** Task 15 may execute isolated self-proof fixtures in
scratch worktrees; those are not campaign controls and the earlier blanket sentence ("no control
executes before Task 16") contradicted the task that had to execute them.

### §1.3 The five rulings this plan makes, all narrowing

**Ruling 1 — discharge is per cell, never per pair.** §4.2 forbids class-wide promotion but does not
say whether one admissible family discharges all 363 cells of its role. The loose reading is 5R-F001
one level down. A cell is discharged only when the probe ran against that member and satisfied every
clause of Task 12's predicate — **including that the probe actually detected the declared attack
class on that member**. Sampling is prohibited. **Consequence, stated now: 5R's delta will be small.**

**Ruling 2 — `orchestration` is unreachable in this universe, by measurement.** It is obligated only
under R9 and R16, both in the attacked five, so none of the 55 pairs touches it. The universe reaches
eight of the nine populated roles; A7's floor is met through `parity_mirror` alone, and the closeout
says so rather than letting the tick imply coverage that never existed.

**Ruling 3 — the corpus is the attempted set; the result ledger is total.** The control corpus covers
attempted families only, and `family_result_root` carries **all 55 pairs**, each in exactly one of
`attempted_admissible | attempted_inadmissible | not_attempted`. Publishing "8 of 55" leaves 47 pairs
unnamed; a 55-row census names them.

**Ruling 4 — T1 is immutable for this release.** "The tranche may grow" is a cherry-picking route:
keep adding families until the headline improves. T1 is fixed at Task 5 and does not change.

**Ruling 5 — no destructive negative test touches the primary inherited tree.** Every seeded
violation, tamper case and red-state demonstration runs in a scratch worktree or a copied fixture
tree. An interrupted run must never leave debris in the one tree that must not move.

---

## §2 Global constraints — binding on every task

**Read-only surface.** `docs/research/llm-shield/evidence/stage-5q/**` and
`tools/simurgh-attestation/stage5{a..q}/**`, never written and never mutated even temporarily
(Ruling 5). A task needing a predecessor's logic **reads it as prior art and reimplements**: §2.4
forbids importing a `stage5{a..q}` module in the primary worktree.

**Write surface**, per frozen §2.3 — **six files on the shared list, five of which are the standing
wiring checklist** (`.prettierignore`, `check-e2e.sh`, both audit allowlists, `README.md`);
`package.json` is the sixth. §2.3.1's "all five" refers to the wiring five it enumerates.

```text
STAGE-OWNED  tools/simurgh-attestation/stage5r/**
             tests/**/stage5r/**   tests/fixtures/llmShield/stage5r/**
             proofs/stage5r/**     docs/research/llm-shield/evidence/stage-5r/**
             docs/research/llm-shield/STAGE_5R_CLOSEOUT.md
             docs/superpowers/specs/2026-07-27-stage-5r-…-design.md   (annex only for §§2-5)
             docs/superpowers/plans/2026-07-27-stage-5r-vpf-implementation-plan.md
             scripts/check-stage5r-proofs.sh · scripts/reproduce-llm-shield-stage5r.sh
             .github/workflows/stage-5r-checks.yml
SHARED       package.json            scripts key only; no dependency change      Task 24
             .prettierignore         one added line: the 5R evidence dir         Task 1
             scripts/check-e2e.sh    one added REPRODUCE entry                   Task 25
             scripts/security-audit-llm-shield-stage3m.sh   one allowlist line   Task 25
             scripts/security-audit-llm-shield-stage3o.sh   one allowlist line   Task 25
             README.md               release banner                              Task 27
```

**Runtime, expressed as a constraint rather than a path**, because `/opt/homebrew/opt/node@26/bin/node`
exists only on this developer's machine and CI runs Linux:

```bash
test "$(node -p 'process.versions.node.split(".")[0]')" = "26" || { echo "node 26 required"; exit 1; }
```

Every evidence bundle records `node_version`, `node_executable_realpath`, `platform`, `arch`.

**Arithmetic.** Published percentages use integer arithmetic with round-half-up at one decimal:

```text
tenths = floor((numerator * 1000 + floor(denominator / 2)) / denominator)
```

Verified to reproduce both inherited figures exactly: 1438/23332 → 6.2, 2118/20213 → 10.5. No
floating point crosses a runtime boundary.

**Reproducibility, stated at the strength the commands actually establish.** The earlier blanket
"every artefact is built twice and `cmp`-ed" promised more than the commands did, and several tasks
built once.

```text
DETERMINISTIC artefacts (universe, tranche, parity manifest, instrument lock, C1,
ledgers, attestation roots) are built TWICE INTO SEPARATE PATHS, cmp-ed against
each other, and then cmp-ed against the committed copy.

RUNTIME EXECUTION RECEIPTS (self-proof receipts, gate red states, campaign results,
audit results) are produced ONCE — re-running them re-executes processes and cannot
be byte-identical by construction — but their CANONICAL FORM is deterministic and is
independently re-verified from the recorded inputs.
```

The build-twice idiom, used verbatim by every deterministic builder:

```bash
a="$(mktemp)"; b="$(mktemp)"
node <builder>.mjs --output "$a"
node <builder>.mjs --output "$b"
cmp "$a" "$b"
cmp "$a" <committed path>
rm -f "$a" "$b"
```

**`git diff --exit-code` is not a cleanliness check** — verified: it exits 0 with an untracked file
present, so a newly generated wrong artefact passes it. Every cleanliness assertion is:

```bash
test -z "$(git status --porcelain)"
```

**Commits are scoped.** No `git add -A` in any ceremony: a commitment that swallows unrelated branch
state is not a commitment. Every ceremony stages exact paths and requires a clean tree first.

**Assertions, not observations.** `git status`, `git worktree list`, `git rev-parse` and
`gh release view` all exit 0 whatever they print. Every use is wrapped in `test`.

**Raw codes.** None allocated; enforced by G10 (Task 13), not by care. **Attribution.** Neutral
messages, no trailers or tool tags. **Keys.** The 5R private key lives only in `~/.simurgh/`, is never
committed, and **no 5R operation requires any predecessor's private key.** **Evidence hygiene.** Every
artefact names its CLI builder, output path and schema.

---

## §3 Plan-quality gates

```text
P1  every task states runnable verification COMMANDS — shell, not typography
P2  every task states its done condition as an observable: exit code, digest, file, clean tree
P3  every gate G0-G10 has a task that BUILDS it and a task that proves it RED, in that order
P4  every mutant N1-N6 (with N5a/N5b) has a seeding task and a named expected catch
P5  no task's DONE CONDITION depends on a later task's behaviour; integration requirements are
    stated as integration requirements and verified where they are built
P6  every frozen-object obligation appears in Matrix 2 against its discharging task
P7  a task touching a shared file names the exact mutation in advance
P8  no destructive negative test touches the primary inherited evidence tree      (Ruling 5)
P9  every generated artefact names its CLI builder, output path, schema and build mode
```

**These gates have now rejected three drafts.** Draft one: `<base>` placeholders (P1), done-conditions
depending on later tasks (P2/P5), a red-state proof scheduled before its gate existed (P5). Draft two,
under external review: P1/P2 unmet across sixteen tasks, plus the defects that became Rulings 3–5.
Draft three, this one: C1 committed control digests before the controls existed, the discharge
predicate never required the target defect to be detected, four done-conditions still reached
forward, the instrument lock claimed a scope that went stale on the next task, and the build-twice
rule was prose with no commands behind it.

---

## §4 The precommitted first tranche

§11.5's minimum is one admissible family per role archetype an under-supported class obligates —
eight archetypes through eight roles (Ruling 2). Selection rule: **attack where the predecessor's
evidence is thinnest first.** The three reachable roles no mutant ever touched — `evidence_emission`,
`formal_statement`, `code_allocation` — lead; then one pair per remaining archetype, taking the class
with the largest obligation in that role.

| #   | archetype | pair                      | cells | why this pair                                                                  |
| --- | --------- | ------------------------- | ----: | ------------------------------------------------------------------------------ |
| F1  | A5        | `R2 × evidence_emission`  |   376 | no mutation evidence ever reached this role                                    |
| F2  | A8        | `R10 × formal_statement`  |   181 | the archetype the ruling did not name; R10 not R7, which 5Q ruled inadmissible |
| F3  | A4        | `R12 × code_allocation`   |    17 | smallest role in the closure; if the contract fails here it fails              |
| F4  | A1        | `R4 × trust_decision`     |   363 | the role every trust decision flows through                                    |
| F5  | A2        | `R3 × completeness_claim` |   582 | largest role in the closure                                                    |
| F6  | A6        | `R3 × schema_gate`        |   496 | schema_gate reaches only R2, R3, R7 in this universe                           |
| F7  | A3        | `R6 × canonicalisation`   |    71 | canonicalisation is where source-span geometry bugs live                       |
| F8  | A7        | `R11 × parity_mirror`     |   320 | A7's only reachable half (Ruling 2)                                            |

```text
tranche T1   8 families · 24 controls · 2406 cells spanned of 15301 under-supported
universe     55 pairs · 165 controls at full scope · all 55 carry a result row (Ruling 3)
```

**2 406 is the span, not the delta** (Ruling 1). **T1 is immutable** (Ruling 4).

---

## §5 Wave 1 — inheritance and universe

### Task 1 — write-surface verifier, and the `.prettierignore` line

**Build.** `core/writeSurface.mjs` + `node/checkWriteSurface.mjs`: path classification for the
stage-owned list; **parsed structural comparison** for all six shared entries. Add the single
`.prettierignore` line `docs/research/llm-shield/evidence/stage-5r/` **now**, because Task 4 commits
generated JSON and every stage since 5P ignores its evidence directory.

**Tests first.** Stage-owned write passes; `stage5q/**` write fails; `package.json` scripts addition
passes but a dependency change fails; an allowlist line containing a digit fails; a `.prettierignore`
diff of more than one added line fails.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/writeSurface.test.js
node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs \
  --range "$(git merge-base origin/main HEAD)..HEAD"
npm run format:check
```

**Done when.** All three exit 0; a seeded `stage5q/**` edit in a scratch worktree makes the second
exit non-zero and name the file.

### Task 2 — inheritance verifier, roots first, signature last

**Build.** `core/inherit.mjs` + `node/verifyInheritance.mjs`. Recompute the seven digests; verify the
envelope with the **public** key committed in it, checked against `expected_public_key_digest`;
confirm `member_count == 2531` and `closure_source_commit == 3512d287`; fail closed naming which
digest moved. Also verify both spec digests: §§2–5 against `freeze_digest`, and the whole spec against
`full_spec_digest`, so a reviewer confirms the core **and** the amendments this plan assumes.

**Tests first.** All seven match; each one-byte tamper case is refused **in a copied fixture tree**
(P8); a valid signature over a mutated root is refused before the signature is examined;
`member_count` drift is refused; verification succeeds with no private key on the machine.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/inherit.test.js
node tools/simurgh-attestation/stage5r/node/verifyInheritance.mjs
node tools/simurgh-attestation/stage5r/node/computeFreezeReceipt.mjs
test -z "$(git status --porcelain docs/research/llm-shield/evidence/stage-5q/)"
```

**Done when.** Exit 0 with seven digests printed; both spec digests match their recorded values;
seven tamper fixtures each exit non-zero naming their digest; the 5Q tree is clean.

### Task 3 — G0: recompute every measurement the spec publishes

**Build.** `node/measureInheritedGap.mjs` → `evidence/stage-5r/measurements/inherited-gap.json`
(deterministic; build-twice idiom). Recomputes the nine-role histogram (2531); 15 301 / 8 031 of
23 332; 2 118 of 20 213 → 10.5; the 26 obligations of the four unreached roles and the 22 discharged
from another role; six receipts on `omitted` cells; four-of-nine roles restricted to discharged
classes; 55 pairs. Parses the spec for **every** occurrence of each claim and fails on a duplicate,
missing or conflicting occurrence — one matching number somewhere is not agreement.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/measureInheritedGap.test.js
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/measureInheritedGap.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/measureInheritedGap.mjs --output "$b"
cmp "$a" "$b" && cmp "$a" docs/research/llm-shield/evidence/stage-5r/measurements/inherited-gap.json
rm -f "$a" "$b"
```

**Done when.** Every figure reproduces from committed bytes; changing any one occurrence in the spec
turns the test red naming the claim; both builds are byte-identical.

### Task 4 — the family universe

**Build.** `core/archetypes.mjs` (A1–A8 + the measured `orchestration` exclusion as data); CLI
`node/buildFamilyUniverse.mjs` →
`docs/research/llm-shield/evidence/stage-5r/universe/family-universe.json`.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/archetypes.test.js
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/buildFamilyUniverse.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/buildFamilyUniverse.mjs --output "$b"
cmp "$a" "$b"
cmp "$a" docs/research/llm-shield/evidence/stage-5r/universe/family-universe.json
rm -f "$a" "$b"
test -z "$(git status --porcelain)"
```

**Done when.** Exactly 55 pairs, eight roles, `orchestration` absent with its reason recorded as data,
A8 present at 362 cells; both builds byte-identical and equal to the committed copy; tree clean.

### Task 5 — the immutable tranche commitment

**Build.** CLI `node/buildTranche.mjs` →
`docs/research/llm-shield/evidence/stage-5r/universe/tranche-t1.json`: §4's eight pairs plus the
selection rule.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/tranche.test.js
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/buildTranche.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/buildTranche.mjs --output "$b"
cmp "$a" "$b"
cmp "$a" docs/research/llm-shield/evidence/stage-5r/universe/tranche-t1.json
rm -f "$a" "$b"
git add docs/research/llm-shield/evidence/stage-5r/universe/tranche-t1.json
git commit -q -m "commit(5r): tranche T1"
test -z "$(git status --porcelain)"
```

**Done when.** The tranche is a subset of the universe, covers eight archetypes, totals 2 406 spanned
cells, both builds are byte-identical, and it is committed by exact path. T1 does not change after
this commit (Ruling 4).

### Task 6 — baseline capture at the pinned predecessor commit

**Build.** `core/transition.mjs` (5R's own copy; `regressed_by_5r`, every other value byte-identical
to 5Q's) + `node/verifyTransition.mjs` → `evidence/stage-5r/transition/` (runtime receipt: produced
once, canonically re-verifiable). The baseline is captured **in a detached worktree at `20fc323c`**,
not on the 5R branch: by now Tasks 1–5 have written code, tests, a `.prettierignore` line and three
evidence files.

**Tests first.** Tree-relative → `not_comparable`; no baseline run → `not_compared`, never `green`;
failed before and after → `pre_existing`; passed before, fails after → `regressed_by_5r`.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/transition.test.js
node tools/simurgh-attestation/stage5r/node/verifyTransition.mjs --baseline 20fc323c
test -z "$(git status --porcelain -- tools/simurgh-attestation/stage5q/)"
test -z "$(git worktree list --porcelain | grep -F 'worktree ' | grep -v "$(pwd)$")"
```

**Done when.** A baseline record exists bound to `20fc323c`; 5Q's `transition.mjs` is untouched; no
worktree leaks.

### Task 7 — the scratch worktree and the damage detector, containment proven both ways

**Build.** `node/probeImportWrites.mjs` + the scratch runner every import-executing task uses. Four
snapshots, not two — an earlier draft snapshotted only the primary tree and so could not see damage
landing in the scratch tree, which is exactly the damage F003 describes:

```text
snapshot primary → create scratch, snapshot scratch → run imports in scratch
→ re-snapshot scratch, diff against the declared allowlist (normally empty)
→ re-snapshot primary, must be identical → remove scratch in a finally block
```

Every path is `realpath`-resolved and asserted inside the scratch root, so a symlink cannot walk a
write back into the primary tree.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/probeImportWrites.test.js
node tools/simurgh-attestation/stage5r/node/probeImportWrites.mjs
test -z "$(git status --porcelain)"
test -z "$(git worktree list --porcelain | grep -F 'worktree ' | grep -v "$(pwd)$")"
```

**Done when.** A seeded import-writer is detected and named in the scratch diff; a clean sweep reports
zero; the primary tree is identical throughout; the scratch worktree is removed even when the probe
throws; a symlink escape is refused.

---

## §6 Wave 2 — the instrument

### Task 8 — the family contract

**Build.** `core/familyContract.mjs`: §3.1's record with an **exact-key schema** rejecting unknown
fields, and the frozen six-entry `forbidden_surrogate_signals` list.

**Verify.** `node --test tests/unit/llmShield/stage5r/familyContract.test.js`

**Done when.** A record missing any control, carrying an unknown key, or declaring a disjunction as
`detector_signal` is refused with the offending key named; the frozen list is immutable at runtime.

### Task 9 — admissibility, and the comparability ratio fixed by cross-multiplication

**Build.** `core/admissibility.mjs`: §4.1's seven conditions, conjunctive; §4.4's closure binding;
§4.3's structural comparability with the bound **defined here and evaluated without division**:

```text
span_bytes = UTF-8 byte length of the canonical source span
require      span_bytes > 0 for both controls
require      max_span_bytes <= 3 * min_span_bytes
```

Integer division would floor 399/101 to 3 and admit a pair whose true ratio is 3.95 — verified.
Cross-multiplication has no such gap. Three is the precommitted bound: a safe control more than three
times its vulnerable twin is a different function, not the same interface without the defect.
Generated code is refused as a control outright.

**Verify.** `node --test tests/unit/llmShield/stage5r/admissibility.test.js`

**Done when.** Each of the seven conditions falsified in turn yields inadmissible **naming the failed
condition**; six-of-seven is inadmissible; the boundary cases hold — `300/100` accepted, `301/100`
refused, `399/101` refused; a zero-length span is refused; a `function_id` outside the inherited
closure is refused; a stub safe control is refused despite being "not detected".

### Task 10 — the three-control runner and whole-tree restoration

**Build.** `core/controls.mjs` + `node/runFamily.mjs`. Premise recomputed per control; restoration
proven over the **whole scratch tree**, not one target file — a mutation that repairs its target and
leaves a stray artefact elsewhere restored nothing.

**Verify.** `node --test tests/unit/llmShield/stage5r/controls.test.js`

**Done when.** A stale premise fails the family; an unrestored mutation fails it; a no-op orthogonal
control fails it; the whole-tree digest before and after each control is equal, per control.

### Task 11 — Lane B, blind by construction, with a child-emitted verdict receipt

**Build.** One **fresh child per control**, no persistent state, neutral control IDs, fixed working
directory, no label-bearing filenames or env, no inherited descriptors, absolute executable paths,
capped stdout/stderr, timeout with process-group termination, control order from a committed
permutation seed so sequence cannot leak the label. The child emits a canonical verdict receipt whose
bytes the parent embeds unchanged:

```text
control_digest · detector_digest · declared_signal · verdict · signal_evidence_digest
```

The verifier recomputes that digest independently. "The parent never rewrites the verdict" is
otherwise only a unit test about a function nobody is obliged to call.

**Verify.** `node --test tests/unit/llmShield/stage5r/laneB.test.js`

**Done when.** The payload provably contains no field naming which control it is; a label-leaking
payload is caught by the lane's own guard; a parent-side edit of a child receipt is detected by
digest; a `.pem` in argv aborts; an unscrubbed env var aborts; exit code alone never becomes the
verdict.

### Task 12 — the delta ledger, and the ten-clause discharge predicate

**Build.** `core/deltaLedger.mjs` + CLI `node/buildDeltaLedger.mjs`. `inherited_cells` a constant
23 332 with no key able to hold another value; percentages by §2's integer rule.

**Set semantics, because a JSON array is not a set:** unique IDs, canonically sorted, duplicates
rejected, every ID a member of the inherited universe, every ID inside its family's committed pair,
disjoint across families, disjoint from 5Q's discharged set.

**The discharge predicate — all ten, or the cell is not discharged:**

```text
1 family admissible                          6 result schema valid, exact keys
2 obligation in the family's committed pair   7 result binds function_id AND obligation_id
3 member source digest matches the closure    8 restoration receipt valid
4 probe execution completed                   9 not already discharged by 5Q or another family
5 result deterministic across two runs
10 THE TARGET DEFECT WAS DETECTED ON THIS MEMBER:
   verdict == detected, on this cell, not merely on the family's control
   AND the committed detector_signal was the signal observed
   AND signal_evidence_digest verifies
   AND the attack-class-specific expected outcome matched
   AND forbidden-surrogate suppression did not change the verdict
   AND the target-cell premise applies; premise_not_applicable ⇒ unprobed, never discharged
```

**Clause 10 is the one the first nine did not imply.** A probe returning a deterministic,
schema-valid `not_detected` satisfies clauses 1–9 completely. The family's control triad proves the
instrument can discriminate _one committed example_; it says nothing about this member. Without
clause 10, Ruling 1 still permits per-cell promotion — the very generalisation the stage exists to
refuse, smuggled back in at the smallest possible grain.

**`unprobed` reasons are a closed vocabulary**, never free text, because free text is an
omission-laundering tunnel:

```text
unsupported_target_shape · premise_not_applicable · detector_timeout · execution_error
non_deterministic_result · resource_limit · unsafe_to_execute
```

Each carries a checkable receipt; the closeout publishes counts by reason.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/deltaLedger.test.js
node tools/simurgh-attestation/stage5r/node/checkCanonicalVectors.mjs --runtime node
```

**Done when.** Each of the ten predicate clauses falsified in turn keeps the cell undischarged —
clause 10 tested by a member that is deterministically `not_detected`; a duplicate or unsorted ID set
is refused; a free-text `unprobed` reason is refused; the Node implementation reproduces every
canonical vector, including 6.2 and 10.5 under the integer rule. **Cross-runtime agreement is an
integration requirement discharged by Task 25**, not a completion condition here — the mirrors do not
exist yet.

### Task 13 — two independent scanners: G7 and G10

**Build.** `core/prose.mjs` (G7: post-5Q coverage attribution) **and** `core/rawCodeScan.mjs` (G10:
predecessor-band raw-code literals). G10 was listed in an earlier matrix and built by nothing — P3 was
false. G10 reads the band from the allocator rather than hard-coding it, scans every 5R document, and
matches literals **regardless of adjacent phrasing**, because 5Q's census fired only when a literal
and a stage-mention pattern co-occurred and this spec's first draft passed it by accident. Encoded and
formatted variants are tested. Both scanners strip comments first **and** assert the raw file still
contains the pattern, so stripping cannot make a scan vacuous.

Scanner scope is a named list: this spec, this plan, the closeout, every evidence document, and the
GitHub Release body — the last supplied by `gh release view --json body` at Task 27.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/prose.test.js
node --test tests/unit/llmShield/stage5r/rawCodeScan.test.js
node tools/simurgh-attestation/stage5r/node/scanDocuments.mjs
```

**Done when.** G7 catches a violating sentence in each artefact type and does not match its own
explanation; G10 catches a seeded band literal and its encoded variants; both fail loudly when the
anti-vacuity assertion cannot find the pattern in the raw file.

### Task 14 — the parity manifest, written before the mirrors

**Build.** CLI `node/buildParityManifest.mjs` →
`docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json`: every deterministic export
and every canonical test vector that must agree across Node, Python and browser. "Deterministic core"
without a manifest permits selective mirroring — mirror the easy half, call it parity.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/parityManifest.test.js
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/buildParityManifest.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/buildParityManifest.mjs --output "$b"
cmp "$a" "$b"
cmp "$a" docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json
rm -f "$a" "$b"
node tools/simurgh-attestation/stage5r/node/checkManifestCoverage.mjs --runtime node
```

**Done when.** The manifest is complete against the **current Node export census** — every eligible
deterministic export appears, and `checkManifestCoverage.mjs` exits non-zero if one is missing or if
a manifest entry has no Node implementation. **K7's enforcement across all three runtimes is an
integration requirement discharged by Task 26**, not a completion condition here.

---

## §7 Wave 3 — prove, lock, build, commit, run

### Task 15 — N1–N6, seven mutants including the N5 split

**Build.** `node/runMutationSelfProof.mjs` → `evidence/stage-5r/self-proof/n-receipts.json`
(**runtime receipt**: produced once; canonical form deterministic and independently replayable from
the recorded mutation, command and observed output). Schema: one record per mutant, sorted by mutant
id, each carrying `mutant_id · seeded_diff_digest · command · baseline_exit · mutated_exit ·
catching_check · restored_digest_equal`.

| mutant | seeded defect                                                           | the check that must catch it                           |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| N1     | admissibility accepts a family whose orthogonal control WAS detected    | inadmissible, naming condition three                   |
| N2     | delta ledger double-counts a cell 5Q discharged                         | empty-intersection assertion throws with the id        |
| N3     | inheritance verifier accepts a mutated 5Q digest                        | non-zero exit naming which of the seven moved          |
| N4     | safe control is a stub the detector never reaches                       | §4.3's not-a-stub check fails the family               |
| N5a    | the suppression machinery is a **no-op** — suppressing changes nothing  | the suppression self-test detects the no-op, run fails |
| N5b    | a family whose verdict **changes** under suppression is admitted anyway | admissibility marks it inadmissible, reason recorded   |
| N6     | a per-role admissibility silently promotes to class-wide                | unrepresentable; the seeded write throws at the ledger |

N5 was one line in the spec's first draft and named only N5a. A suppressor that does nothing and an
admissibility check that ignores what the suppressor found are different defects, and each hides the
other. The spec was amended rather than the plan quietly choosing one.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/runMutationSelfProof.mjs
node --test tests/unit/llmShield/stage5r/selfProof.test.js
test -z "$(git status --porcelain)"
```

**Done when.** All seven caught, each receipt naming its catching check; every mutation seeded in a
scratch worktree (P8) and restored; the tree is clean. **N6 uncaught is a stop condition.**

### Task 16 — recorded red state for every gate that exists by now

**Build.** CLI `node/recordGateRedStates.mjs` → `evidence/stage-5r/gate-red-states/` (runtime
receipts). For **G0–G7 and G10** — every gate implemented by the end of Task 15 — seed a violation in
a scratch tree, record the failure output, revert, record green. **G8 and G9 belong to Task 26**,
because G8's assertion is built there and G9's in Task 23.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/recordGateRedStates.mjs
node --test tests/unit/llmShield/stage5r/gateRedStates.test.js
test -z "$(git status --porcelain)"
```

**Done when.** Nine gates hold a red receipt each, naming the gate, the seeded violation and the
observed failure text; the tree is clean.

### Task 17 — the instrument lock, over an exact census

**Build.** CLI `node/lockInstrument.mjs` → `evidence/stage-5r/instrument-lock.json`. The lock covers
**only the bytes capable of affecting a campaign outcome**, as an exact sorted path census:

```text
core/familyContract.mjs · core/admissibility.mjs · core/controls.mjs
the Lane B detector and child · every suppression transform
node/runFamily.mjs · node/runTranche.mjs · core/deltaLedger.mjs
every campaign schema · the campaign-commitment verifier
the canonicalisation and digest helpers used by the above
the runtime and command manifest
```

"Every deterministic module" was the earlier scope and it was self-defeating: Tasks 22–26 add ledger,
attestation, parity and K7 code, so the lock would be stale the moment it was written, or the word
"every" would be false. Reporting, attestation, parity and K7 bytes get a separate
`release_surface_root` at Task 27. One lock does not pretend to be both.

Adding or deleting an eligible file must fail the lock — the census is a set, not a prefix.

**Verify.**

```bash
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/lockInstrument.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/lockInstrument.mjs --output "$b"
cmp "$a" "$b" && cmp "$a" docs/research/llm-shield/evidence/stage-5r/instrument-lock.json
rm -f "$a" "$b"
node tools/simurgh-attestation/stage5r/node/verifyInstrumentLock.mjs
node --test tests/unit/llmShield/stage5r/instrumentLock.test.js
```

**Done when.** Both builds byte-identical; `verifyInstrumentLock.mjs` exits 0 on the current tree and
exits non-zero **naming the drifted path** when run against a scratch copy with one byte changed, one
eligible file added, and one deleted — three negative cases, run here rather than deferred to Task 20.

### Task 18 — build the 24 controls, without executing them

**Build.** Eight directories under `stage5r/families/`, 24 hand-authored controls, plus CLI
`node/buildPremiseReceipts.mjs` → `evidence/stage-5r/families/premise-receipts.json` (deterministic).
Each family declares its `detector_signal` in its own file. **Nothing is executed against a target
cell in this task** — construction is lawful before the commitment; execution is not.

Lane C stays `not_in_scope`: a model-authored control whose vulnerability was never independently
verified would put an unverified premise under the stage's central claim.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/families.test.js
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/buildPremiseReceipts.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/buildPremiseReceipts.mjs --output "$b"
cmp "$a" "$b"
rm -f "$a" "$b"
node tools/simurgh-attestation/stage5r/node/verifyFamilyCorpus.mjs
```

**Done when.** 24 control files and 8 signal files exist; every premise receipt recomputes; every
(vulnerable, safe) pair satisfies `max <= 3 * min`; `verifyFamilyCorpus.mjs` confirms no control has
been executed against a target cell (no result artefacts exist yet).

### Task 19 — the campaign commitment C1, over bytes that already exist

**Build.** CLI `node/commitCampaign.mjs` → `evidence/stage-5r/commitments/campaign-c1.json`,
committed in its own commit **C1**, over the Task 18 artefacts:

```text
tranche digest · family IDs · all three control digests per family
detector_signal per family · detector implementation digest
suppression transforms · the target obligation set per family
campaign ordering (permutation seed) · runner digest · instrument-lock digest
```

**Why this replaces "precommitment by content".** A digest proves content has not changed _since the
digest was taken_. It does not prove the author chose that content before seeing results. So results
land in a later commit **C2**, and the verifier asserts `git merge-base --is-ancestor C1 C2` **and**
that every byte C1 committed still matches.

**Honest bound:** ancestry raises the cost of back-fitting, it does not eliminate it, because the
producer controls both commits. Eliminating it needs an external witness over C1 — TSA or
transparency-log — which is 5M/5N machinery and belongs to a stage carrying it as its blade. §13's
"the red team and the blue team remain the same party" is that ceiling; this is it at commit
granularity.

**Verify.**

```bash
test -z "$(git status --porcelain)"
node tools/simurgh-attestation/stage5r/node/commitCampaign.mjs
git add docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json
git commit -q -m "commit(5r): campaign commitment C1"
node --test tests/unit/llmShield/stage5r/campaignCommitment.test.js
node tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs
node tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs \
  --against tests/fixtures/llmShield/stage5r/altered-family/    # must exit non-zero
```

**Done when.** C1 is its own commit, staged by exact path from a clean tree; the verifier exits 0
against the real corpus and **non-zero against a fixture family whose control bytes were altered**,
proving the check here rather than deferring it to Task 20.

### Task 20 — run the committed campaign (commit C2)

**Build.** `node/runTranche.mjs` → `evidence/stage-5r/campaign/` (runtime receipts). Refuses to start
unless the instrument lock and C1 both verify.

**`attempt_start` receipt before any control executes**, binding `family_id · commitment_digest ·
instrument_digest · target set · run ordinal`. Without it, a family can be run locally, seen to fail
and deleted, and the final ledger cannot prove it was ever attempted. **A started family must end in
exactly one terminal state.**

**The probe set is every cell in the pair** (Ruling 1) — all 582 of `R3 × completeness_claim`, all 17
of `R12 × code_allocation`. Each cell ends `discharged` (all ten clauses of Task 12), `unprobed`
(closed-vocabulary reason + receipt) or `inadmissible` (its family failed §4.1).

**Verify.**

```bash
test -z "$(git status --porcelain)"
node tools/simurgh-attestation/stage5r/node/runTranche.mjs
node --test tests/unit/llmShield/stage5r/runTranche.test.js
git add docs/research/llm-shield/evidence/stage-5r/campaign/
git commit -q -m "campaign(5r): tranche T1 results"
node tools/simurgh-attestation/stage5r/node/verifyCampaignAncestry.mjs
```

**Done when.** Every T1 family has an `attempt_start` receipt and exactly one terminal state; every
cell in every attempted pair carries one of the three states; no family outside `tranche-t1.json`
appears; `families attempted − families admissible` and total `unprobed` are printed fields; ancestry
verifies C1 as an ancestor of C2 with all committed bytes matching.

### Task 21 — the audit 5R owes 5Q, with its question stated exactly

**Build.** `node/auditPriorFamilies.mjs` → `evidence/stage-5r/audit/prior-families.json` over 5Q's six
control-free families (`frozen-constant` R8, `argument-aliasing` R8, `prototype-pollution` R1,
`determinism` R15, `pathological-operand` R9, `fail-open` R16), read as prior art, never imported.

**The question is the historical-contract audit, and its answer is known in advance:**

```text
Do the six signed 5Q family artefacts, as they stood, satisfy 5R's §4.1 contract?
Expected: no — the mandatory triad did not exist when they were built.
```

**So no score moves on this task.** An earlier draft made Frontier > 9.3 conditional on finding one of
the six inadmissible, which is guaranteed by construction. Attaching a score to a predetermined answer
is the outcome-shopping this stage exists to catch, committed in the scoring rubric itself. The
**revalidation audit** — can newly built 5R triads reproduce or refute the six prior conclusions — is
the question with an uncertain answer; it costs 18 further controls and is **out of scope for this
release**, named so its absence is a decision rather than an omission.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/auditPriorFamilies.mjs
node --test tests/unit/llmShield/stage5r/auditPriorFamilies.test.js
```

**Done when.** Six ledger records exist, each stating the question asked, the verdict and the failing
condition, each saying plainly that it judges a historical artefact against a later contract.

---

## §8 Wave 4 — attest, prove, wire, ship

### Task 22 — Lean core, with theorem identity and non-vacuity

**Build.** `proofs/stage5r/`, Lean 4.15.0, no mathlib, zero `sorry`:

```text
Admissibility.lean          L1  conjunctive: any false condition ⟹ inadmissible
NoPromotion.lean            L2  admissible(R,S) ⇏ admissible(R,S′), S′ ≠ S
DeltaDisjoint.lean          L3  deltas disjoint from inherited discharged AND a subset of the
                                inherited universe ⟹ cumulative ≤ 1, monotone in new work only
DenominatorInvariance.lean  L4  no admission sequence changes inherited_cells
OrthogonalSoundness.lean    L5  with the variable inputs pinned, verdict invariance under every
                                forbidden surrogate ⟹ discrimination by the declared signal alone
```

L3 gained the subset clause: disjointness alone does not bound cumulative coverage if new IDs may come
from outside the universe. L5 gained the pinned-input clause: invariance proves nothing about
causation unless the model fixes what was allowed to vary.

**Build also.** `scripts/check-stage5r-proofs.sh`: discover every `proofs/stage5r/*.lean`; refuse below
five; scan for `sorry`, `axiom` and unsafe escapes; **require the five theorem identifiers by name**;
require each to be referenced by the proof manifest; reject duplicate copies masquerading as distinct
obligations. Discovery alone passes with five irrelevant files.

**Verify.**

```bash
bash scripts/check-stage5r-proofs.sh
node --test tests/unit/llmShield/stage5r/leanCorrespondence.test.js
```

**Done when.** Five proofs check with zero `sorry`; deleting one, renaming a theorem, or duplicating a
file each turns the script red; runtime-to-theorem correspondence tests pass; each theorem carries a
witness showing it is not satisfied by an empty or degenerate model.

### Task 23 — finding ledger, delta, disclosure

**Build.** CLIs `node/buildFindingLedger.mjs` and `node/buildDeltaLedger.mjs` (deterministic; both
build-twice). Opens with `5Q-F013` carrying 5R's `vpf_disposition` (5Q's own `disposition` quoted,
never replaced) and `5R-F001` at `assurance_only`; then Tasks 20 and 21's outcomes, **including
findings against 5R itself**. Emits the **55-row** `family_result_root` census (Ruling 3) and the
four-term disclosure.

**Verify.**

```bash
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/buildDeltaLedger.mjs --output "$a"
node tools/simurgh-attestation/stage5r/node/buildDeltaLedger.mjs --output "$b"
cmp "$a" "$b" && cmp "$a" docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json
rm -f "$a" "$b"
node tools/simurgh-attestation/stage5r/node/buildFindingLedger.mjs
node --test tests/unit/llmShield/stage5r/ledgers.test.js
test -z "$(git status --porcelain)"
```

**Done when.** All 55 pairs carry exactly one terminal state; delta ∩ 5Q-discharged is ∅; the
four-term disclosure's arithmetic checks under the integer rule; both ledgers byte-stable.

### Task 24 — campaign attestation: producer signing, and the attested boundary stated

**Build.** Two-tier attestation over §10.1's roots. Two different operations, because CI and external
reviewers hold no private key:

```text
PRODUCER (once, locally)             REVIEWER / CI (every run)
  build unsigned roots twice           rebuild unsigned roots
  cmp                                  compare against the signed envelope
  verify instrument lock + C1          verify with the COMMITTED PUBLIC key
  sign once with ~/.simurgh/5r-…       never sign, never require a private key
```

**The attested boundary, stated rather than implied.** These roots cover **campaign evidence**, all of
which is complete by Task 23: inherited commitment, family universe, the 55-row result census, control
receipts, delta ledger, prior-family audit, finding ledger. They deliberately **do not** cover parity
mirrors, K7 output, the deferred G8/G9 receipts or the closeout, none of which exist yet. Those are
release-gate evidence and are covered by a separate signed `release_surface_root` at Task 27. Without
this split, signing at Task 24 would leave substantial release evidence free to change afterwards
without invalidating a signature that appears to cover it.

`package.json` gains its scripts-key entries here and nowhere else.

**Verify.**

```bash
a="$(mktemp)"; b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --build-only --output "$a"
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --build-only --output "$b"
cmp "$a" "$b"
rm -f "$a" "$b"
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --sign
# private-key independence, performed rather than asserted
key="$HOME/.simurgh/5r-ed25519.pem"; stash="$(mktemp)"
mv "$key" "$stash"; trap 'mv "$stash" "$key"' EXIT
node tools/simurgh-attestation/stage5r/node/verifyAttestation.mjs
trap - EXIT; mv "$stash" "$key"
node --test tests/unit/llmShield/stage5r/attestation.test.js
```

**Done when.** `--build-only` is byte-identical twice; **verification succeeds with the private key
physically absent**; the verifier refuses a `--key` argument outright; a mutated root is refused
before the signature is examined; a fixture-signed bundle is refused.

### Task 25 — parity mirrors, wiring, reproduce

**Build.** `python/` and `browser/` mirrors implementing exactly the Task 14 manifest;
`scripts/reproduce-llm-shield-stage5r.sh`; `.github/workflows/stage-5r-checks.yml`, asserting the Node
major version and invoking `scripts/check-stage5r-proofs.sh`. Then the named shared edits:
`check-e2e.sh` (one REPRODUCE entry) and one allowlist line in each audit script.

**Verify.**

```bash
bash scripts/reproduce-llm-shield-stage5r.sh
bash scripts/check-e2e.sh
node tools/simurgh-attestation/stage5r/node/runCrossRuntimeParity.mjs
node tools/simurgh-attestation/stage5r/node/checkManifestCoverage.mjs --runtime all
node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs \
  --range "$(git merge-base origin/main HEAD)..HEAD"
test -z "$(git status --porcelain)"
```

**Done when.** Node == Python == browser over **every** manifest entry (this discharges Task 12's and
Task 14's cross-runtime integration requirements); evidence built twice and `cmp`-ed under an asserted
Node 26; the reproduce script runs from the REPRODUCE array; the write-surface verifier is green with
the shared edits present.

### Task 26 — K7 all-functions net, plus the two deferred red states

**Build.** Every export of every 5R module; §14's tamper matrix (each inherited digest mutated by one
byte → refusal; each §4.1 condition falsified → inadmissible; each forbidden surrogate forced as sole
signal → inadmissible); cross-stage invariants (5Q evidence byte-identical after a full run;
delta ∩ 5Q-discharged == ∅; `inherited_cells == 23332`; no per-role result promoted).

**G8 and G9 red states, in copied fixture trees (Ruling 5).** G8's proof copies the 5Q evidence tree
to a fixture, seeds a write there, and confirms the comparison fires — the primary inherited tree is
never mutated, not even briefly. G9's proof removes one of the four disclosure terms from a fixture
copy.

**Verify.**

```bash
node --test tests/e2e/llmShield/stage5r/k7AllFunctions.test.js
node tools/simurgh-attestation/stage5r/node/recordGateRedStates.mjs --deferred
test -z "$(git status --porcelain docs/research/llm-shield/evidence/stage-5q/)"
```

**Done when.** Zero exports uncovered; every parity-manifest entry exercised (this discharges Task
14's K7 integration requirement); all **eleven** gates hold a recorded red state (nine from Task 16,
two here); the 5Q tree is clean.

### Task 27 — closeout, its machine checker, the release receipt, and the release

**Build.** `STAGE_5R_CLOSEOUT.md`, plus CLI `node/checkCloseout.mjs`, plus the signed
`release_surface_root` covering what Task 24 deliberately excluded (parity output, K7 results, the
deferred red receipts, the closeout itself).

The closeout carries, always together:

```text
families admissible / attempted / not_attempted / universe (55)   — all four, from the census
newly discharged cells / 15 301 under-supported / 23 332 inherited
unprobed cells by closed-vocabulary reason
5Q original coverage 6.2% (1 438 of 23 332)   ·   5R cumulative <measured, integer rule>
```

Plus §13's non-claims verbatim; I7 and I8 **OPEN**; §12.2's universe-adapter reported **`unbuilt`** —
no task builds it, which is planned rather than forgotten; Ruling 2's `orchestration` exclusion; and
the `README.md` release banner, edited here and nowhere else.

**`checkCloseout.mjs` machine-checks the prose against the ledgers**, because Task 23 builds the
disclosure and Task 26 proves G9 red, but nothing yet checked that the closeout _copied it correctly_:
all four family counts, all three coverage denominators, the cumulative arithmetic, the unprobed
reason census, the `orchestration` exclusion, the `unbuilt` universe adapter, I7/I8 open, and the
exact non-claim sentences. It runs against **both** the closeout file and the GitHub Release body.

**The release body is public 5R prose and passes the same gates as any other 5R document** — G7, G9,
G10, non-claim presence, and stage/version/tag consistency. Letting it bypass the document gates would
leave an escape hatch in the last metre.

**Re-score rule, fixed in advance and not attached to a predetermined answer.** Task 21 moves nothing.
Frontier rises above 9.3 only on a finding whose outcome was uncertain when the campaign started: an
inadmissible T1 family whose failing condition reveals a real defect, or a finding against 5R's own
instrument. Constitution rises above 9.5 only if the stage published an uncomfortable result of its own
campaign. **If T1 lands at the floor and nothing uncertain is found, the scores go down and the
closeout says so.** The four-axis score is internal commentary, labelled as such, and is never a
release gate or a security claim.

**Security review — the whole executable surface**, not two files: `stage5r/**` plus both scripts, and
specifically child-process execution, environment scrubbing, scratch worktree creation and removal,
symlink and realpath containment, mutation restoration, key loading, canonical JSON parsing, evidence
path traversal, timeouts, subprocess output limits, and control execution.

**Verify.** The release ceremony, in order:

```bash
# pre-PR, on the branch
npm test
npm run format:check
git diff --check
bash scripts/check-e2e.sh
bash scripts/reproduce-llm-shield-stage5r.sh
bash scripts/check-stage5r-proofs.sh
node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs \
  --range "$(git merge-base origin/main HEAD)..HEAD"
node tools/simurgh-attestation/stage5r/node/computeFreezeReceipt.mjs
node tools/simurgh-attestation/stage5r/node/checkCloseout.mjs \
  --source docs/research/llm-shield/STAGE_5R_CLOSEOUT.md
test -z "$(git status --porcelain)"

# after merge — assertions, not observations
test "$(git rev-parse v2.53.0-stage-5r-vpf^{commit})" = "$(git rev-parse origin/main)"
gh release view v2.53.0-stage-5r-vpf --json tagName,url,isLatest,body > /tmp/5r-release.json
test -s /tmp/5r-release.json
node tools/simurgh-attestation/stage5r/node/checkCloseout.mjs --source /tmp/5r-release.json --json-body
node tools/simurgh-attestation/stage5r/node/scanDocuments.mjs --extra /tmp/5r-release.json

# reproduce from a FRESH worktree at the tag, never the development tree
tag_tree="$(mktemp -d "${TMPDIR:-/tmp}/5r-tag.XXXXXX")"
trap 'git worktree remove --force "$tag_tree" 2>/dev/null || true' EXIT
git worktree add --detach "$tag_tree" v2.53.0-stage-5r-vpf
( cd "$tag_tree" && bash scripts/reproduce-llm-shield-stage5r.sh )
git worktree remove --force "$tag_tree"; trap - EXIT
```

**Done when.** The security review found no vulnerability and no control regression, or its findings
are repaired and re-reviewed; every pre-PR command exits 0 with a clean tree; `checkCloseout.mjs`
passes against the closeout **and** the release body; the release body passes G7, G9 and G10; the tag
resolves to the merged commit by assertion; `gh release view` returns a release — a tag is not a
release, which 5C learned expensively; and the fresh-worktree reproduction passes.

---

## §9 Matrix 1 — gate → built by → proved red by

| gate   | what it asserts                                                  | built by                         | red-state proof           |
| ------ | ---------------------------------------------------------------- | -------------------------------- | ------------------------- |
| G0     | the spec's measurements recompute                                | Task 3                           | Task 16                   |
| G1     | seven inherited digests recompute; envelope verifies roots-first | Task 2                           | Task 16                   |
| G2     | every published family satisfies all seven §4.1 conditions       | Task 9                           | Task 15 (N1)              |
| G3     | every control has a recomputed premise and proven restoration    | Task 10                          | Task 16                   |
| G4     | no `coverage_delta` intersects 5Q's discharged set               | Task 12                          | Task 15 (N2)              |
| G5     | no per-role admissibility promotes to class-wide                 | Task 9                           | Task 15 (N6)              |
| G6     | the seven N-mutants are detected                                 | Task 15                          | Task 16                   |
| G7     | no 5R artifact attributes a post-5Q figure to 5Q                 | Task 13                          | Task 16                   |
| G8     | 5Q evidence byte-identical before and after the full run         | Task 7, asserted Task 26         | Task 26 (fixture copy)    |
| G9     | tranche disclosure present and its arithmetic checks             | Task 23, copied-check Task 27    | Task 26 (fixture copy)    |
| G10    | no 5R document prints a predecessor-band raw-code literal        | Task 13 (`rawCodeScan.mjs`)      | Task 16                   |
| freeze | §§2–5 match `64fe8e76…`; whole spec matches `e1f28257…`          | **done** (`ba8c3b96`/`0e3a564e`) | **done**, both directions |

---

## §10 Matrix 2 — frozen obligation → discharging task

| frozen source | obligation                                                        | task                |
| ------------- | ----------------------------------------------------------------- | ------------------- |
| §2.1          | seven digests + bound context verified before any artifact        | 2                   |
| §2.2          | roots first, signature last; fail closed naming the digest        | 2                   |
| §2.3          | write surface exhaustive; six shared files, mutation-scoped       | 1, 24, 25, 27       |
| §2.4          | no `stage5{a..q}` import in the primary worktree; damage detector | 7                   |
| §3.1–3.2      | three mandatory controls, no optional control                     | 8, 10, 18           |
| §3.3          | one pre-registered `detector_signal`, committed before the run    | 8, 18, 19, 20       |
| §3.4          | frozen forbidden-surrogate list; suppression changes nothing      | 8, 12, 15, 20       |
| §3.5          | `coverage_delta` over inherited ids, per cell (Ruling 1)          | 12, 20              |
| §3.6          | mutation restoration proven by digest equality                    | 10                  |
| §4.1          | seven conditions, conjunctive, failing condition published        | 9                   |
| §4.2          | per-role admissibility; class-wide unrepresentable                | 9, 15 (N6), 22 (L2) |
| §4.3          | structural comparability, not-a-stub, bounded ratio               | 9, 18               |
| §4.4          | results bind to the inherited closure                             | 9, 20               |
| §4.5          | inadmissible is published, never retried into green               | 20, 23              |
| §5.1–5.2      | A1–A8 including the named A8 extension                            | 4                   |
| §5.3–5.4      | 55-pair universe by rule, not by schedule                         | 4, 23               |
| §6.1–6.2      | delta ledger; 23 332 constant; no bare coverage field             | 12                  |
| §6.3          | prose gate, comment-stripped and anti-vacuous                     | 13                  |
| §7.1          | F013 inherited unchanged; `vpf_disposition` beside 5Q's           | 23                  |
| §7.3          | 5Q's six families audited; outcomes as ledger records             | 21                  |
| §7.4          | 5R-F001 at `assurance_only`, not a repair                         | 3, 23               |
| §8.1–8.3      | family self-proof; N1–N6 incl. N5a/N5b; every gate's red state    | 15, 16, 26          |
| §9.1          | module tree incl. writeSurface, transition, frozenBlock, mirrors  | 1, 6, 25            |
| §9.2          | Lane A corpus; Lane B blindness; Lane C `not_in_scope` + reason   | 11, 18, 20          |
| §10.1         | roots; new 5R key; public-key verification; attested boundary     | 24, 27              |
| §10.2         | five Lean theorems; discovery **and** theorem identity            | 22                  |
| §11.1         | G0–G10                                                            | Matrix 1            |
| §11.3         | prior-stage non-disturbance from a pinned baseline                | 6                   |
| §11.5         | tranche rule; four terms together; immutable T1                   | 5, 23, 27           |
| §12.1–12.3    | socket ledger; founder's blocker; new evidence species            | 27                  |
| §13           | honest non-claims published in attestation and closeout           | 24, 27              |
| §14           | K7 net + tamper matrix + cross-stage invariants                   | 26                  |

---

## §11 Definition of done

```text
27 tasks complete, each by its own verification commands
N6 caught                                          (else the stage does not ship)
11 gates green, each with a recorded red state     (9 in Task 16, 2 in Task 26)
7 N-mutants caught, each naming its catching check
every deterministic artefact built twice into separate paths, cmp-ed, and cmp-ed
  against its committed copy; runtime receipts canonically re-verified instead
5 Lean proofs: discovery + theorem identity + non-vacuity witnesses, zero sorry
Node == Python == browser over every parity-manifest entry
instrument lock verified, with three negative cases proven at Task 17
C1 built over controls that already existed, proven an ancestor of C2
every discharged cell satisfies all TEN predicate clauses, clause 10 included
all 55 pairs carry a terminal state                 (Ruling 3)
5Q evidence tree byte-identical, never mutated even in a negative test  (Ruling 5)
verification succeeds with the private key physically absent
closeout AND release body both pass checkCloseout, G7, G9 and G10
tag resolves to the merged commit BY ASSERTION; gh release view returns a release
fresh-worktree reproduction from a mktemp path passes
freeze digest 64fe8e76… and full_spec_digest e1f28257… both unchanged, or re-pinned
  deliberately with the plan updated in the same commit
```

**And the one that is not a checkbox.** If the campaign lands at the floor and nothing uncertain is
found, the honest closeout says the instrument was built and shown to work, that it discharged little,
and that the scores went down. That is a result. Stretching the campaign until the number improves is
the failure mode this stage exists to make visible in other people's work, and it does not become
acceptable when it is ours.
