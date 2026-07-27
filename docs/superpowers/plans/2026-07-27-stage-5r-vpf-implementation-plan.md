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
`vpf_admissibility_rules`, `vpf_role_archetypes` — were frozen **before** this plan existed. Nothing
below may weaken them. Where this plan resolves an ambiguity in them it resolves it **strictly**, and
§1.3 records every place it does.

**Spec sections amended after the freeze, all outside §§2–5, digest unchanged and re-verified:** §8.2
(N5 split into N5a/N5b — seven mutants, not six), §9.2 (Lane A's corpus is the attempted set), §10.1
(`family_result_root` total over all 55 pairs; `control_receipt_root` scoped to attempted families;
the false claim that verifying 5Q's signature needs 5Q's **private** key, corrected to the public key
committed in the envelope), §11.1 (G6 counts seven).

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
WAVE 3  proof, commitment, campaign     Tasks 15-21  prove it, lock it, commit to it, then run it
WAVE 4  attest, prove, wire, ship       Tasks 22-27  sign it, prove it, wire it, publish it, release it
```

Wave boundaries are barriers. **No control executes before Task 16** (the instrument must have been
shown to fail first), and **no campaign result is produced before Task 18** (the commitment must
exist first).

### §1.3 The five rulings this plan makes, all narrowing

**Ruling 1 — discharge is per cell, never per pair.** §4.2 forbids class-wide promotion but does not
say whether one admissible family discharges all 363 cells of its role. The loose reading is 5R-F001
one level down: generalising one control to a whole role is the argument 5Q made from one mutant to a
whole class, at finer grain. A cell is discharged only when the probe ran against that member and
satisfied the full predicate of Task 12. Sampling is prohibited. **Consequence, stated now: 5R's
delta will be small.**

**Ruling 2 — `orchestration` is unreachable in this universe, by measurement.** It is obligated only
under R9 and R16, both in the attacked five, so none of the 55 pairs touches it. The universe reaches
eight of the nine populated roles; A7's floor is met through `parity_mirror` alone, and the closeout
says so rather than letting the tick imply coverage that never existed.

**Ruling 3 — the corpus is the attempted set; the result ledger is total.** Lane A cannot hold 165
controls before anything verifies, or the tranche rule is unshippable. So the control corpus covers
attempted families only, and `family_result_root` carries **all 55 pairs**, each in exactly one of
`attempted_admissible | attempted_inadmissible | not_attempted`. Publishing "8 of 55" leaves 47 pairs
unnamed; a 55-row census names them. Omission becomes a row rather than a silence.

**Ruling 4 — T1 is immutable for this release.** An earlier draft said the tranche "may grow", which
is a cherry-picking route: keep adding families until the headline improves. T1 is fixed at Task 5
and does not change. Later families belong to a later release with its own commitment.

**Ruling 5 — no destructive negative test touches the primary inherited tree.** Every seeded
violation, tamper case and red-state demonstration runs in a scratch worktree or a copied fixture
tree. "Seed a write into the 5Q evidence tree and revert it" was in an earlier draft; it violates the
boundary G8 exists to protect, and an interrupted run leaves debris in the one tree that must never
move.

---

## §2 Global constraints — binding on every task

**Read-only surface.** `docs/research/llm-shield/evidence/stage-5q/**` and
`tools/simurgh-attestation/stage5{a..q}/**`, never written and never mutated even temporarily
(Ruling 5). A task needing a predecessor's logic **reads it as prior art and reimplements**: §2.4
forbids importing a `stage5{a..q}` module in the primary worktree.

**Write surface**, per frozen §2.3 — **six files on the shared list, five of which are the standing
wiring checklist** (`.prettierignore`, `check-e2e.sh`, both audit allowlists, `README.md`);
`package.json` is the sixth. §2.3.1's "all five" refers to the wiring five it enumerates. The
verifier covers all six.

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

**Runtime, expressed as a constraint rather than a path.** Every evidence build and every gate
asserts the major version, because `/opt/homebrew/opt/node@26/bin/node` exists only on this
developer's machine and CI runs Linux:

```bash
test "$(node -p 'process.versions.node.split(".")[0]')" = "26" || { echo "node 26 required"; exit 1; }
```

Every evidence bundle records `node_version`, `node_executable_realpath`, `platform`, `arch`. The
Homebrew path stays a local setup hint and appears in no gate.

**Arithmetic.** All published percentages are computed in integer arithmetic with round-half-up at
one decimal place:

```text
tenths = floor((numerator * 1000 + floor(denominator / 2)) / denominator)
display = tenths / 10, one decimal
```

Verified to reproduce both inherited figures exactly: 1438/23332 → 6.2, 2118/20213 → 10.5. No
floating point crosses a runtime boundary, so Node, Python and browser cannot each round differently.

**Raw codes.** None allocated. No 5R document prints a raw-code literal from any predecessor's band;
the next free value is read from the allocator. Enforced by G10 (Task 13), not by care.

**Attribution.** Neutral commit, PR and release messages. No co-author trailer, no tool tag anywhere.

**Keys.** The 5R private key lives only in `~/.simurgh/` and is never committed; deterministically
derived keys are forgeable and prohibited. **No 5R operation requires any predecessor's private key.**

**Evidence hygiene.** Every generated artefact is produced by a **named CLI builder** with a main
guard, built twice and `cmp`-ed. The task entries below name the builder for every artefact.

---

## §3 Plan-quality gates

```text
P1  every task states runnable verification COMMANDS — shell, not typography
P2  every task states its done condition as an observable: exit code, digest, file, clean tree
P3  every gate G0-G10 has a task that BUILDS it and a task that proves it RED, in that order
P4  every self-proof mutant N1-N6 (with N5a/N5b) has a seeding task and a named expected catch
P5  no task depends on an artifact or behaviour produced by a later task
P6  every frozen-object obligation appears in Matrix 2 against its discharging task
P7  a task touching a shared file names the exact mutation in advance
P8  no destructive negative test touches the primary inherited evidence tree      (Ruling 5)
P9  every generated artefact names its CLI builder and its exact build command
```

**These gates have now rejected two drafts.** The first draft violated P1 (`<base>` placeholders),
P2/P5 (done-conditions depending on later tasks) and P5 again in Matrix 1. An external line-by-line
review then found P1 and P2 unmet across sixteen tasks, plus the defects that became Rulings 3–5 and
Tasks 17, 18, 21 and 26. Both passes are recorded rather than quietly absorbed: a quality gate that
has never rejected its own author is the unproven instrument this stage is about.

---

## §4 The precommitted first tranche

§11.5's minimum is one admissible family per role archetype that an under-supported class obligates —
eight archetypes through eight roles (Ruling 2). Selection rule, checkable rather than aesthetic:
**attack where the predecessor's evidence is thinnest first.** The three reachable roles no mutant
ever touched — `evidence_emission`, `formal_statement`, `code_allocation` — lead; then one pair per
remaining archetype, taking the class with the largest obligation in that role.

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

**2 406 is the span, not the delta** (Ruling 1). **T1 is immutable** (Ruling 4): a family attempted
and failed is published as `attempted_inadmissible`; the only forbidden state is attempted-and-absent.

---

## §5 Wave 1 — inheritance and universe

### Task 1 — write-surface verifier, and the `.prettierignore` line

**Build.** `core/writeSurface.mjs` + `node/checkWriteSurface.mjs`: path classification for the
stage-owned list; **parsed structural comparison** for all six shared entries. Add the single
`.prettierignore` line `docs/research/llm-shield/evidence/stage-5r/` **now**, because Task 4 commits
generated JSON and every stage since 5P ignores its evidence directory — deferring this to Wave 4
leaves `format:check` red from Wave 1 onward.

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

**Done when.** All three exit 0; a seeded `stage5q/**` edit makes the second exit non-zero and name
the file.

### Task 2 — inheritance verifier, roots first, signature last

**Build.** `core/inherit.mjs` + `node/verifyInheritance.mjs`. Recompute the seven digests; verify the
envelope with the **public** key committed in it, checked against `expected_public_key_digest`;
confirm `member_count == 2531` and `closure_source_commit == 3512d287`; fail closed naming which
digest moved.

**Tests first.** All seven match; each one-byte tamper case is refused **in a copied fixture tree**
(P8); a valid signature over a mutated root is refused before the signature is examined;
`member_count` drift is refused; a run with no private key on the machine still verifies.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/inherit.test.js
node tools/simurgh-attestation/stage5r/node/verifyInheritance.mjs
git status --short docs/research/llm-shield/evidence/stage-5q/   # must print nothing
```

**Done when.** Exit 0 with seven digests printed; seven tamper fixtures each exit non-zero naming
their digest; the 5Q tree is untouched.

### Task 3 — G0: recompute every measurement the spec publishes

**Build.** `node/measureInheritedGap.mjs`. Recomputes the nine-role histogram (2531); 15 301 / 8 031
of 23 332; 2 118 of 20 213 → 10.5; the 26 obligations of the four unreached roles and the 22
discharged from another role; six receipts on `omitted` cells; four-of-nine roles restricted to
discharged classes; 55 pairs. Parses the spec for **every** occurrence of each claim and fails on a
duplicate, missing or conflicting occurrence — one matching number somewhere is not agreement.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/measureInheritedGap.test.js
node tools/simurgh-attestation/stage5r/node/measureInheritedGap.mjs
```

**Done when.** Every figure reproduces from committed bytes; changing any one occurrence in the spec
turns the test red and the failure names the claim.

### Task 4 — the family universe

**Build.** `core/archetypes.mjs` (A1–A8 + the measured `orchestration` exclusion as data) and CLI
builder `node/buildFamilyUniverse.mjs` →
`docs/research/llm-shield/evidence/stage-5r/universe/family-universe.json`.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/archetypes.test.js
node tools/simurgh-attestation/stage5r/node/buildFamilyUniverse.mjs
git add -A && git commit -q -m "wip(5r): universe"
node tools/simurgh-attestation/stage5r/node/buildFamilyUniverse.mjs
node tools/simurgh-attestation/stage5r/node/buildFamilyUniverse.mjs
git diff --exit-code
```

**Done when.** Exactly 55 pairs, eight roles, `orchestration` absent with its reason recorded as
data, A8 present at 362 cells; build → commit → rebuild twice leaves `git diff --exit-code` clean.

### Task 5 — the immutable tranche commitment

**Build.** CLI builder `node/buildTranche.mjs` → `evidence/stage-5r/universe/tranche-t1.json`: §4's
eight pairs plus the selection rule, digest recorded in the same commit.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/tranche.test.js
node tools/simurgh-attestation/stage5r/node/buildTranche.mjs && git diff --exit-code
```

**Done when.** The file is a subset of the universe, covers eight archetypes, totals 2 406 spanned
cells, is byte-stable across two builds, and its digest is committed. T1 does not change after this
commit (Ruling 4).

### Task 6 — baseline capture at the pinned predecessor commit

**Build.** `core/transition.mjs` (5R's own copy; `regressed_by_5r`, every other value byte-identical
to 5Q's) + `node/verifyTransition.mjs`. The baseline is captured **in a detached worktree at
`20fc323c`**, not on the 5R branch: by the time this task runs, Tasks 1–5 have already added code,
tests, a `.prettierignore` line and two evidence files, so "before any 5R artifact perturbs anything"
was false as written in an earlier draft.

```text
baseline_commit   20fc323c        clean detached worktree
candidate_commit  current 5R HEAD clean worktree
identical command manifest, identical runtime constraint
```

**Tests first.** Tree-relative → `not_comparable`; no baseline run → `not_compared`, never `green`;
failed before and after → `pre_existing`; passed before, fails after → `regressed_by_5r`.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/transition.test.js
node tools/simurgh-attestation/stage5r/node/verifyTransition.mjs --baseline 20fc323c
git diff --exit-code -- tools/simurgh-attestation/stage5q/
git worktree list   # no leftover baseline worktree
```

**Done when.** A baseline record exists under `evidence/stage-5r/transition/` bound to `20fc323c`,
5Q's `transition.mjs` is untouched, and no worktree leaks.

### Task 7 — the scratch worktree and the damage detector, containment proven both ways

**Build.** `node/probeImportWrites.mjs` + the scratch runner every import-executing task uses. The
sequence is four snapshots, not two — an earlier draft snapshotted only the primary tree, which
cannot see damage that lands in the scratch tree, i.e. exactly the damage F003 describes:

```text
snapshot primary
create scratch worktree, snapshot scratch
run the import work in scratch
re-snapshot scratch  → diff against the declared allowlist (normally empty)
re-snapshot primary  → must be identical
remove scratch in a finally block
```

Every path is resolved with `realpath` and asserted to be contained in the scratch root, so a symlink
cannot walk a write back into the primary tree.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/probeImportWrites.test.js
node tools/simurgh-attestation/stage5r/node/probeImportWrites.mjs
git status --short && git worktree list
```

**Done when.** A seeded import-writer is detected **and named** in the scratch diff; a clean sweep
reports zero; the primary tree is identical throughout; the scratch worktree is removed even when the
probe throws; a symlink escape attempt is refused.

---

## §6 Wave 2 — the instrument

### Task 8 — the family contract

**Build.** `core/familyContract.mjs`: §3.1's record with an **exact-key schema** that rejects unknown
fields, and the frozen six-entry `forbidden_surrogate_signals` list.

**Verify.** `node --test tests/unit/llmShield/stage5r/familyContract.test.js`

**Done when.** A record missing any control, carrying an unknown key, or declaring a disjunction as
`detector_signal` is refused with the offending key named; the frozen list is immutable at runtime.

### Task 9 — admissibility, and the comparability ratio fixed before any control exists

**Build.** `core/admissibility.mjs`: §4.1's seven conditions, conjunctive; §4.4's closure binding;
§4.3's structural comparability with the ratio **defined here, not chosen later**:

```text
span_bytes = UTF-8 byte length of the canonical source span
ratio      = max(vulnerable, safe) / min(vulnerable, safe)     integer comparison, no floats
require      span_bytes > 0 for both, and ratio ≤ 3
```

Three is the precommitted bound: a safe control more than three times the size of its vulnerable twin
is not "the same interface without the defect", it is a different function. Zero-length spans are
refused rather than treated as equal. Generated code is refused as a control outright.

**Verify.** `node --test tests/unit/llmShield/stage5r/admissibility.test.js`

**Done when.** Each of the seven conditions falsified in turn yields inadmissible **naming the failed
condition**; six-of-seven is inadmissible; a ratio of 4 is refused and 3 accepted; a `function_id`
outside the inherited closure is refused; a stub safe control is refused despite being "not detected".

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
capped stdout/stderr, timeout with process-group termination, and control order taken from a
committed permutation seed so sequence cannot leak the label.

The child emits a canonical verdict receipt and the parent embeds those bytes unchanged:

```text
control_digest · detector_digest · declared_signal · verdict · signal_evidence_digest
```

The verifier recomputes that digest independently. "The parent never rewrites the verdict" is
otherwise only a unit test about a function nobody is obliged to call.

**Verify.** `node --test tests/unit/llmShield/stage5r/laneB.test.js`

**Done when.** The payload provably contains no field naming which control it is; a deliberately
label-leaking payload is caught by the lane's own guard; a parent-side edit of a child receipt is
detected by digest; a `.pem` in argv aborts; an unscrubbed env var aborts; exit code alone never
becomes the verdict.

### Task 12 — the delta ledger, with an exact discharge predicate

**Build.** `core/deltaLedger.mjs` + CLI `node/buildDeltaLedger.mjs`. `inherited_cells` a constant
23 332 with no key able to hold another value; percentages by §2's integer rule.

**Set semantics, because a JSON array is not a set:** unique IDs, canonically sorted, duplicates
rejected, every ID a member of the inherited universe, every ID inside its family's committed pair,
disjoint across families, disjoint from 5Q's discharged set.

**The discharge predicate — all nine, or the cell is not discharged:**

```text
1 family admissible                          6 result schema valid, exact keys
2 obligation in the family's committed pair   7 result binds function_id AND obligation_id
3 member source digest matches the closure    8 restoration receipt valid
4 probe execution completed                   9 not already discharged by 5Q or another family
5 result deterministic across two runs
```

"Produced a result bound to its `obligation_id`" was the earlier wording, and an empty or random
result satisfies that sentence.

**`unprobed` reasons are a closed vocabulary**, never free text, because free text is an
omission-laundering tunnel:

```text
unsupported_target_shape · premise_not_applicable · detector_timeout · execution_error
non_deterministic_result · resource_limit · unsafe_to_execute
```

Each carries a checkable receipt; the closeout publishes counts by reason.

**Verify.** `node --test tests/unit/llmShield/stage5r/deltaLedger.test.js`

**Done when.** Each of the nine predicate clauses falsified in turn keeps the cell undischarged; a
duplicate ID is refused; an unsorted set is refused; a free-text `unprobed` reason is refused; 6.2%
and any cumulative figure reproduce identically in Node, Python and browser.

### Task 13 — two independent scanners: G7 and G10

**Build.** `core/prose.mjs` (G7: post-5Q coverage attribution) **and** `core/rawCodeScan.mjs` (G10:
predecessor-band raw-code literals). G10 was listed in the first draft's matrix and built by nothing —
P3 was false. G10 reads the band from the allocator rather than hard-coding it, scans every 5R
document, and matches literals **regardless of adjacent phrasing**, because 5Q's census fired only
when a literal and a stage-mention pattern co-occurred and this spec's first draft passed it by
accident. Encoded and formatted variants are tested.

Both scanners strip comments first **and** assert the raw file still contains the pattern, so
stripping cannot make a scan vacuous.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/prose.test.js
node --test tests/unit/llmShield/stage5r/rawCodeScan.test.js
node tools/simurgh-attestation/stage5r/node/scanDocuments.mjs
```

**Done when.** G7 catches a violating sentence in each artefact type and does not match its own
explanation; G10 catches a seeded band literal and its encoded variants; both fail loudly when the
anti-vacuity assertion cannot find the pattern in the raw file. G7's scope names where release notes
live: the committed `docs/research/llm-shield/STAGE_5R_CLOSEOUT.md` and the GitHub Release body, the
latter checked at Task 27 via `gh release view --json body`.

### Task 14 — the parity manifest, written before the mirrors

**Build.** CLI `node/buildParityManifest.mjs` → `evidence/stage-5r/parity/parity-manifest.json`:
every deterministic export and every test vector that must agree across Node, Python and browser.
"Deterministic core" without a manifest permits selective mirroring — mirror the easy half, call it
parity.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/parityManifest.test.js
node tools/simurgh-attestation/stage5r/node/buildParityManifest.mjs && git diff --exit-code
```

**Done when.** K7 (Task 26) fails if an eligible export is missing from the manifest, if a manifest
entry has no implementation in some runtime, or if a deterministic export is silently excluded.

---

## §7 Wave 3 — proof, commitment, campaign

### Task 15 — N1–N6, seven mutants including the N5 split

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
other. The spec was amended (§8.2, outside the frozen span) rather than the plan quietly choosing one.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/runMutationSelfProof.mjs
node --test tests/unit/llmShield/stage5r/selfProof.test.js
git status --short   # all mutations reverted, tree clean
```

**Done when.** All seven caught, each with a green→red→green receipt **naming the catching check**,
all seeded in a scratch worktree (P8). **N6 uncaught is a stop condition, not a warning.**

### Task 16 — recorded red state for every gate that exists by now

**Build.** For **G0–G7 and G10** — every gate implemented by the end of Task 15 — seed a violation in
a scratch tree, record the failure output, revert, record green, via CLI
`node/recordGateRedStates.mjs` → `evidence/stage-5r/gate-red-states/`.

**G8 and G9 belong to Task 26**, because G8's assertion is built there and G9's in Task 23. Proving
the red state of a gate that does not exist is a P5 violation and, under deadline, a skipped step.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/recordGateRedStates.mjs
node --test tests/unit/llmShield/stage5r/gateRedStates.test.js
git status --short
```

**Done when.** Nine gates hold a red receipt each; the tree is clean; every receipt names the gate,
the seeded violation and the observed failure text.

### Task 17 — the instrument lock

**Build.** CLI `node/lockInstrument.mjs` → `evidence/stage-5r/instrument-lock.json`, covering:

```text
digests of every deterministic core module and every campaign driver
every schema · the detector module(s) · every suppression transform
the seven N-receipts of Task 15 · the nine gate red-state receipts of Task 16
node_version · node_executable_realpath · platform · arch
```

Without this, 5R proves Instrument A in Task 15 and runs Instrument B in Task 20, and nothing in the
evidence can tell. Tasks 20 and 24 **refuse to run** on any mismatch.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/lockInstrument.mjs
node --test tests/unit/llmShield/stage5r/instrumentLock.test.js
```

**Done when.** The lock exists and is byte-stable; editing one byte of any covered module makes Task
20's runner exit non-zero naming the drifted module.

### Task 18 — the campaign commitment, C1 (two-phase, ancestry-checked)

**Build.** CLI `node/commitCampaign.mjs` → `evidence/stage-5r/commitments/campaign-c1.json`,
committed in its own commit **C1**, containing:

```text
tranche digest · family IDs · all three control digests per family
detector_signal per family · detector implementation digest
suppression transforms · the target obligation set per family
campaign ordering (permutation seed) · runner digest · instrument-lock digest
```

**Why this replaces "precommitment by content".** A digest proves content has not changed _since the
digest was taken_. It does not prove the author chose that content before seeing results: run several
candidate signals, keep the one that separated the controls, write its digest, publish both — every
check passes and nothing was precommitted. So campaign results land in a **later commit C2** that
references C1, and the verifier asserts `git merge-base --is-ancestor C1 C2` **and** that every byte
C1 committed still matches.

**Honest bound, recorded rather than papered over:** ancestry raises the cost of back-fitting, it does
not eliminate it, because the producer controls both commits. Eliminating it needs an external witness
— a TSA or transparency-log timestamp over C1 — which is 5M/5N machinery and belongs to a stage that
carries it as its blade. §13's "the red team and the blue team remain the same party" already names
this ceiling; this is that ceiling at commit granularity.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/commitCampaign.mjs
git add -A && git commit -q -m "commit(5r): campaign commitment C1"
node --test tests/unit/llmShield/stage5r/campaignCommitment.test.js
```

**Done when.** C1 exists as its own commit; its digest is recorded; a verifier can assert ancestry and
byte-equality; a family whose signal digest differs from C1 is refused by Task 20.

### Task 19 — build the T1 families

**Build.** Eight directories under `stage5r/families/`, 24 hand-authored controls, each with a premise
receipt. Lane C stays `not_in_scope`: a model-authored control whose vulnerability was never
independently verified would put an unverified premise under the stage's central claim.

**Verify.**

```bash
node --test tests/unit/llmShield/stage5r/families.test.js
node tools/simurgh-attestation/stage5r/node/verifyFamilyCorpus.mjs
```

**Done when.** 24 controls exist; every control digest matches its C1 entry; every premise receipt
recomputes; every (vulnerable, safe) pair satisfies the ratio ≤ 3 of Task 9.

### Task 20 — run the tranche (commit C2)

**Build.** `node/runTranche.mjs`. Refuses to start unless the instrument lock and C1 both verify.

**`attempt_start` receipt before any control executes**, binding `family_id · commitment_digest ·
instrument_digest · target set · run ordinal`. Without it, a family can be run locally, seen to fail
and deleted, and the final ledger cannot prove it was ever attempted. **A started family must end in
exactly one terminal state.**

**The probe set is every cell in the pair** (Ruling 1) — all 582 of `R3 × completeness_claim`, all 17
of `R12 × code_allocation`. Each cell ends `discharged` (all nine predicate clauses of Task 12),
`unprobed` (closed-vocabulary reason + receipt) or `inadmissible` (its family failed §4.1).

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/runTranche.mjs
node --test tests/unit/llmShield/stage5r/runTranche.test.js
git add -A && git commit -q -m "campaign(5r): tranche T1 results"
node tools/simurgh-attestation/stage5r/node/verifyCampaignAncestry.mjs
```

**Done when.** Every T1 family has an `attempt_start` receipt and exactly one terminal state; every
cell in every attempted pair carries one of the three states; no family outside `tranche-t1.json`
appears; `families attempted − families admissible` and the total `unprobed` count are printed
fields; ancestry verifies.

### Task 21 — the audit 5R owes 5Q, with its question stated exactly

**Build.** `node/auditPriorFamilies.mjs` over 5Q's six control-free families (`frozen-constant` R8,
`argument-aliasing` R8, `prototype-pollution` R1, `determinism` R15, `pathological-operand` R9,
`fail-open` R16), read as prior art, never imported.

**The question is the historical-contract audit, and its answer is known in advance:**

```text
Do the six signed 5Q family artefacts, as they stood, satisfy 5R's §4.1 contract?
Expected: no — the mandatory triad did not exist when they were built.
```

**So no score moves on this task.** An earlier draft made Frontier > 9.3 conditional on finding one of
the six inadmissible, which is guaranteed by construction: families explicitly built without controls
cannot satisfy a contract requiring three. Attaching a score to a predetermined answer is the
outcome-shopping this stage exists to catch, committed in the scoring rubric itself.

The **revalidation audit** — can newly built 5R triads reproduce or refute the six prior conclusions —
is the question with an uncertain answer. It costs 18 further controls and is **out of scope for this
release**, named here so its absence is a decision rather than an omission.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/auditPriorFamilies.mjs
node --test tests/unit/llmShield/stage5r/auditPriorFamilies.test.js
```

**Done when.** Six ledger records exist, each stating the question asked, the verdict and the failing
condition. 5Q's 1 438 cells are not removed — L5 forbids rewriting a frozen record — and each record
says plainly that it judges a historical artefact against a later contract.

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
obligations. Discovery alone passes with five irrelevant files, so discovery and required identity
coexist.

**Verify.**

```bash
bash scripts/check-stage5r-proofs.sh
node --test tests/unit/llmShield/stage5r/leanCorrespondence.test.js
```

**Done when.** Five proofs check with zero `sorry`; deleting one, renaming a theorem, or duplicating a
file each turns the script red; runtime-to-theorem correspondence tests pass; each theorem has a
witness showing it is not satisfied by an empty or degenerate model.

### Task 23 — finding ledger, delta, disclosure

**Build.** CLI `node/buildFindingLedger.mjs` and `node/buildDeltaLedger.mjs`. Opens with `5Q-F013`
carrying 5R's `vpf_disposition` (5Q's own `disposition` quoted, never replaced) and `5R-F001` at
`assurance_only`; then Tasks 20 and 21's outcomes, **including findings against 5R itself**. Emits the
**55-row** `family_result_root` census (Ruling 3) and the four-term disclosure.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/buildFindingLedger.mjs
node tools/simurgh-attestation/stage5r/node/buildDeltaLedger.mjs
node --test tests/unit/llmShield/stage5r/ledgers.test.js
git diff --exit-code
```

**Done when.** All 55 pairs carry exactly one terminal state; delta ∩ 5Q-discharged is ∅; the
four-term disclosure's arithmetic checks under the integer rule; both ledgers are byte-stable.

### Task 24 — attestation: producer signing, kept separate from reproduction

**Build.** Two-tier attestation over §10.1's roots. The two operations are different, and the plan
says so because CI and external reviewers hold no private key:

```text
PRODUCER (once, locally)             REVIEWER / CI (every run)
  build unsigned roots twice           rebuild unsigned roots
  cmp                                  compare against the signed envelope
  verify instrument lock + C1          verify the signature with the COMMITTED PUBLIC key
  sign once with ~/.simurgh/5r-…       never sign, never require a private key
```

Signer profile `stage5r-vpf-genesis`; the public key digest is committed. The negative test "a bundle
signed by another stage's key is refused" uses a **test fixture signer profile**, never predecessor
private-key possession. `package.json` gains its scripts-key entries here and nowhere else.

**Verify.**

```bash
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --build-only
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --build-only
git diff --exit-code
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --sign
node tools/simurgh-attestation/stage5r/node/verifyAttestation.mjs
node --test tests/unit/llmShield/stage5r/attestation.test.js
```

**Done when.** `--build-only` is byte-stable twice; verification succeeds with the private key moved
off the machine; a mutated root is refused **before** the signature is examined; a fixture-signed
bundle is refused.

### Task 25 — parity mirrors, wiring, reproduce

**Build.** `python/` and `browser/` mirrors implementing exactly the Task 14 manifest;
`scripts/reproduce-llm-shield-stage5r.sh`; `.github/workflows/stage-5r-checks.yml`, which asserts the
Node major version and invokes `scripts/check-stage5r-proofs.sh`. Then the named shared edits:
`check-e2e.sh` (one REPRODUCE entry) and one allowlist line in each audit script.

**Verify.**

```bash
bash scripts/reproduce-llm-shield-stage5r.sh
bash scripts/check-e2e.sh
node tools/simurgh-attestation/stage5r/node/runCrossRuntimeParity.mjs
node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs \
  --range "$(git merge-base origin/main HEAD)..HEAD"
```

**Done when.** Node == Python == browser over every manifest entry; evidence built twice and `cmp`-ed
under an asserted Node 26; the reproduce script runs from the REPRODUCE array; the write-surface
verifier is green with the shared edits present.

### Task 26 — K7 all-functions net, plus the two deferred red states

**Build.** Every export of every 5R module; §14's tamper matrix (each inherited digest mutated by one
byte → refusal; each §4.1 condition falsified → inadmissible; each forbidden surrogate forced as sole
signal → inadmissible); cross-stage invariants (5Q evidence byte-identical after a full run;
delta ∩ 5Q-discharged == ∅; `inherited_cells == 23332`; no per-role result promoted).

**G8 and G9 red states, in a copied fixture tree (Ruling 5).** G8's proof copies the 5Q evidence tree
to a fixture, seeds a write there, and confirms the comparison fires — the primary inherited tree is
never mutated, not even briefly. G9's proof removes one of the four disclosure terms from a fixture
copy.

**Verify.**

```bash
node --test tests/e2e/llmShield/stage5r/k7AllFunctions.test.js
node tools/simurgh-attestation/stage5r/node/recordGateRedStates.mjs --deferred
git status --short docs/research/llm-shield/evidence/stage-5q/   # must print nothing
```

**Done when.** Zero exports uncovered; every parity-manifest entry exercised; all **eleven** gates
hold a recorded red state (nine from Task 16, two here); the 5Q tree is untouched.

### Task 27 — closeout, re-score, security review, release

**Build.** `STAGE_5R_CLOSEOUT.md` carrying, always together:

```text
families admissible / attempted / not_attempted / universe (55)   — all four, from the census
newly discharged cells / 15 301 under-supported / 23 332 inherited
unprobed cells by closed-vocabulary reason
5Q original coverage 6.2% (1 438 of 23 332)   ·   5R cumulative <measured, integer rule>
```

Plus §13's non-claims verbatim; the socket ledger with I7 and I8 **OPEN**, 5R paying neither and
minting nothing unless measured evidence produces a genuine debt; §12.2's universe-adapter reported
**`unbuilt`** — no task builds it, which is planned rather than forgotten; Ruling 2's `orchestration`
exclusion stated; and the `README.md` release banner, edited here and nowhere else.

**Re-score rule, fixed in advance and no longer attached to a predetermined answer.** Task 21 moves
nothing, because its answer is known before it runs. Frontier rises above 9.3 only on a finding whose
outcome was uncertain when the campaign started: an inadmissible T1 family whose failing condition
reveals a real defect, or a finding against 5R's own instrument. Constitution rises above 9.5 only if
the stage published an uncomfortable result of its own campaign. **If T1 lands at the floor and
nothing uncertain is found, the scores go down and the closeout says so.** The four-axis score is
internal commentary, clearly labelled as such, and is never a release gate or a security claim.

**Security review — the whole executable surface, not two files.** The reviewable surface is
`stage5r/**` plus the two scripts, and specifically: child-process execution, environment scrubbing,
scratch worktree creation and removal, symlink and realpath containment, mutation restoration, key
loading, canonical JSON parsing, evidence path traversal, timeouts, subprocess output limits, and
control execution.

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
git status --short
# after merge
git rev-parse v2.53.0-stage-5r-vpf^{commit}
git rev-parse origin/main
gh release view v2.53.0-stage-5r-vpf --json tagName,url,isLatest,body
# then reproduce from a FRESH worktree at the tag, never the development tree
git worktree add /tmp/5r-tag v2.53.0-stage-5r-vpf
(cd /tmp/5r-tag && bash scripts/reproduce-llm-shield-stage5r.sh)
git worktree remove /tmp/5r-tag
```

**Done when.** The security review found no vulnerability and no control regression, or its findings
are repaired and re-reviewed; every pre-PR command exits 0 with a clean tree; CI is green; the tag
resolves to the merged commit; `gh release view` returns a release — a tag is not a release, which 5C
learned expensively — its body passes G7; and the fresh-worktree reproduction passes.

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
| G9     | tranche disclosure present and its arithmetic checks             | Task 23                          | Task 26 (fixture copy)    |
| G10    | no 5R document prints a predecessor-band raw-code literal        | Task 13 (`rawCodeScan.mjs`)      | Task 16                   |
| freeze | §§2–5 match `64fe8e76…`                                          | **done** (`ba8c3b96`/`0e3a564e`) | **done**, both directions |

---

## §10 Matrix 2 — frozen obligation → discharging task

| frozen source | obligation                                                          | task                |
| ------------- | ------------------------------------------------------------------- | ------------------- |
| §2.1          | seven digests + bound context verified before any artifact          | 2                   |
| §2.2          | roots first, signature last; fail closed naming the digest          | 2                   |
| §2.3          | write surface exhaustive; six shared files, mutation-scoped         | 1, 24, 25, 27       |
| §2.4          | no `stage5{a..q}` import in the primary worktree; damage detector   | 7                   |
| §3.1–3.2      | three mandatory controls, no optional control                       | 8, 10               |
| §3.3          | one pre-registered `detector_signal`, committed before the run      | 8, 18, 20           |
| §3.4          | frozen forbidden-surrogate list; suppression changes nothing        | 8, 12, 15, 20       |
| §3.5          | `coverage_delta` over inherited ids, per cell (Ruling 1)            | 12, 20              |
| §3.6          | mutation restoration proven by digest equality                      | 10                  |
| §4.1          | seven conditions, conjunctive, failing condition published          | 9                   |
| §4.2          | per-role admissibility; class-wide unrepresentable                  | 9, 15 (N6), 22 (L2) |
| §4.3          | structural comparability, not-a-stub, bounded ratio                 | 9                   |
| §4.4          | results bind to the inherited closure                               | 9, 20               |
| §4.5          | inadmissible is published, never retried into green                 | 20, 23              |
| §5.1–5.2      | A1–A8 including the named A8 extension                              | 4                   |
| §5.3–5.4      | 55-pair universe by rule, not by schedule                           | 4, 23               |
| §6.1–6.2      | delta ledger; 23 332 constant; no bare coverage field               | 12                  |
| §6.3          | prose gate, comment-stripped and anti-vacuous                       | 13                  |
| §7.1          | F013 inherited unchanged; `vpf_disposition` beside 5Q's             | 23                  |
| §7.3          | 5Q's six families audited; outcomes as ledger records               | 21                  |
| §7.4          | 5R-F001 at `assurance_only`, not a repair                           | 3, 23               |
| §8.1–8.3      | family self-proof; N1–N6 incl. N5a/N5b; every gate's red state      | 15, 16, 26          |
| §9.1          | module tree incl. writeSurface, transition, frozenBlock, mirrors    | 1, 6, 25            |
| §9.2          | Lane A corpus; Lane B blindness; Lane C `not_in_scope` + reason     | 11, 19, 20          |
| §10.1         | roots; new 5R key; public-key verification; producer/reviewer split | 24                  |
| §10.2         | five Lean theorems; discovery **and** theorem identity              | 22                  |
| §11.1         | G0–G10                                                              | Matrix 1            |
| §11.3         | prior-stage non-disturbance from a pinned baseline                  | 6                   |
| §11.5         | tranche rule; four terms together; immutable T1                     | 5, 23, 27           |
| §12.1–12.3    | socket ledger; founder's blocker; new evidence species              | 27                  |
| §13           | honest non-claims published in attestation and closeout             | 24, 27              |
| §14           | K7 net + tamper matrix + cross-stage invariants                     | 26                  |

---

## §11 Definition of done

```text
27 tasks complete, each by its own verification commands
N6 caught                                          (else the stage does not ship)
11 gates green, each with a recorded red state     (9 in Task 16, 2 in Task 26)
7 N-mutants caught, each naming its catching check
5 Lean proofs: discovery + theorem identity + non-vacuity witnesses, zero sorry
Node == Python == browser over every parity-manifest entry
evidence built twice and cmp-ed under an asserted Node 26
instrument lock verified by the campaign runner and the attestation builder
C1 proven an ancestor of C2, every committed byte still matching
all 55 pairs carry a terminal state                 (Ruling 3)
5Q evidence tree byte-identical, never mutated even in a negative test  (Ruling 5)
delta ∩ 5Q-discharged == ∅ · inherited_cells == 23332 unconditionally
verification succeeds with NO private key present
security review over the whole stage5r executable surface
tag resolves to the merged commit AND gh release view returns a release
fresh-worktree reproduction from the tag passes
freeze digest 64fe8e76… unchanged, or amended by numbered annex only
```

**And the one that is not a checkbox.** If the campaign lands at the floor and nothing uncertain is
found, the honest closeout says the instrument was built and shown to work, that it discharged little,
and that the scores went down. That is a result. Stretching the campaign until the number improves is
the failure mode this stage exists to make visible in other people's work, and it does not become
acceptable when it is ours.
