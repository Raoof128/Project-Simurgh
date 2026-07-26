# Stage 5Q — VSR — Q0 Implementation Plan

> **AnthropicSafe First, then ReviewerSafe.**

**Scope: Q0 only.** Discovery and freeze. This plan ends at the signed Q0 freeze plus one authorised
Q1 opening task. It contains **no speculative repair tasks**, because a repair task for a defect that
has not been found yet is a ghost task for a ghost defect.

|                 |                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------- |
| Spec            | `docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md`                |
| Frozen sections | §§2–5, digest `da78774b77495459e4889e1c433e1933bb502ac81c9e5c0811e2450af7fdfc74`, 23804 bytes |
| Freeze commits  | `652a2474` (freeze) / `f56b6619` (receipt)                                                    |
| Branch          | `stage-5q-vsr-stage-wide-red-team`                                                            |
| Target tag      | `v2.52.0-stage-5q-vsr`                                                                        |
| Tasks           | 21 ruled + 7 inserted (1.5, 7.6, 7.7, 18.1-18.4); Task 14 has 16 sub-tasks                    |

---

## Global constraints — copied verbatim from the spec, do not paraphrase

These are frozen. An implementer who finds them inconvenient is having the correct experience.

```text
READ-ONLY DURING Q0 (spec §6.1)
  everything in the committed closure, including
  tools/simurgh-attestation/stage5{a..p}/          <- 5P INCLUSIVE
  every first-party shared dependency whose source_digest is in the closure
  .github/workflows/**                             <- gate defs are closure members

PERMITTED WRITE SURFACE DURING Q0 — EXHAUSTIVE (spec §6.1)
  tools/simurgh-attestation/stage5q/**
  tests/**/stage5q/**
  proofs/stage5q/**
  stage5q evidence/output directories
  the narrowly scoped 5Q-only CI addition (spec §14.3)

IDENTITY (spec §2.5)
  function_id   = "<stage_id>:<module_path>:<symbol>"
  source_digest = SHA256( UTF8("simurgh.vsr.source-span.v1") || 0x00 || canonical_source_bytes )
  canonical_source_bytes: UTF-8; BOM REJECTED; CRLF/CR -> LF; exactly one trailing LF;
                          NO comment removal; NO whitespace collapsing; NO punctuation removal.
  A path move or symbol rename creates a NEW function_id. succession_hint never transfers identity.

CENSUS COMPARISON (spec §2.6)
  project(static_census, runtime_visible) == runtime_census
  Static-only internals are NOT conflicts. Four real conflict shapes only.

COVERAGE STATUS (spec §2.7) — exactly four, no others
  attacked_pass | finding_frozen | mechanically_unreachable | delegated_to_attacked_caller

ADMISSIBILITY (spec §7, L4)
  No attacked_pass may be PUBLISHED for an attack class lacking a green->red->green
  mutation receipt. Exploratory runs are permitted; publication is not.

DELEGATION (spec §2.7)
  Every call site named and itself attacked_pass or finding_frozen.
  A cycle in the delegation graph discharges NOTHING and fails closed.

CLOSURE ROOTS (spec §2.1 + ANNEX A1)
  R8 tests/unit/llmShield/stage5{a..p}/**   <- ADDED BY ANNEX A1, 243 files
  R8 is in the root set from the FIRST census (Task 1.5), not added later.

CLOSURE / DISCHARGE SPLIT (ANNEX A2)
  Task 8 commits closure_member_commitment ONLY.
  attack_pack_ids and coverage_status live in function_discharge_overlay,
  committed by Task 19. The joined view reproduces frozen §2.3 exactly.
  An overlay row for an uncommitted member fails closed.

HISTORICAL CLOSURE (ANNEX A3)
  historical_function members are enumerated and committed BEFORE L2 (Task 7.6),
  under their own historical_function_closure_digest. Task 16 attacks an
  already-frozen set. Neither closure may grow after L2.

OBLIGATION LEDGER (ANNEX A4)
  Obligations are keyed at function_id x attack_class, committed before L2
  (Task 7.7). Task 19 discharges CELLS; member coverage_status is DERIVED.
  A member status written without its cells is rejected.

RUNTIME PINNING — byte-stable evidence
  Every artifact whose byte-stability is asserted (Tasks 8, 19, 20) is built and
  verified under NODE 26 at /opt/homebrew/opt/node@26/bin, and the reproduce
  script pins it. Node 22 is the CI default and is NOT byte-stable for digest
  builders (the 4H lesson). A reviewer reproducing under 22 who gets different
  bytes is correct, and it is our defect, not theirs.

RAW CODES
  NONE. Outcomes are symbolic throughout Q0. Next free code if ever needed: 475.

ATTRIBUTION
  Neutral commit messages. No co-author trailers, no tool attribution, anywhere.
```

### Naming conventions fixed here so later tasks agree

```text
module root      tools/simurgh-attestation/stage5q/
evidence root    docs/research/llm-shield/evidence/stage-5q/
unit tests       tests/unit/llmShield/stage5q/<name>.test.js
e2e net          tests/e2e/llmShield/stage5q/k7AllFunctions.test.js
proofs           proofs/stage5q/Vsr.lean
domain tags      simurgh.vsr.<object>.v1
```

---

## Preflight — run before Task 1, batch any concerns into one question

```bash
node --version                                   # expect v22+ for dev
/opt/homebrew/opt/node@26/bin/node --version   # REQUIRED v26.x — byte-stable evidence only
lean --version                                   # expect 4.15.0
git branch --show-current                        # expect stage-5q-vsr-stage-wide-red-team
git status --short                               # expect clean
SIMURGH_SKIP_DOTENV=1 npm test 2>&1 | tail -5    # expect 0 fail (baseline)
npm run format:check                             # expect clean
```

**Gotchas carried in from prior stages — read before Task 1.**

- `npm test` runs **unit only**. The e2e/K7 nets run via `scripts/check-e2e.sh`, which enumerates
  with `find` and therefore auto-gates anything new under `tests/e2e/`.
- A bare `node --test <dir>` fails with `Cannot find module`. Always pass an explicit glob.
- `.remember/` is prettier-ignored; do not remove that entry.
- `docs/research/banking-pilot/.../rejected-attempt-audit-fixture.json` regenerates with fresh
  timestamps on every `check.sh`. `git checkout --` it before committing.
- Evidence directories are prettier-ignored. Add `docs/research/llm-shield/evidence/stage-5q/` to
  `.prettierignore` in Task 1 or every later task fights the formatter.
- 4H's digest builder and several reproduce scripts are byte-stable **only under Node 26**.

---

# WAVE I — define and commit the universe

**Wave gate:** no attack execution, no tray result, and no finding may be published before Task 8
commits the closure digest. Diagnostic development tests are permitted; publication is not. This is
L2, and it is the difference between a coverage ratio and a number.

---

## Task 1 — Frozen-object extractor and freeze verifier

**Status: substantially COMPLETE** (`652a2474`, `f56b6619`). This task closes the remainder.

**Files**

- exists: `tools/simurgh-attestation/stage5q/core/frozenBlock.mjs`
- exists: `tests/unit/llmShield/stage5q/frozenBlock.test.js` (12 tests)
- create: `tools/simurgh-attestation/stage5q/core/constants.mjs`
- modify: `.prettierignore` (add `docs/research/llm-shield/evidence/stage-5q/`)
- modify: `package.json` — add **exactly these scripts**, pinned here so later tasks do not invoke
  commands that were never created:

```json
"test:stage5q":            "node --test tests/unit/llmShield/stage5q/*.test.js",
"census:stage5q:static":   "node tools/simurgh-attestation/stage5q/node/measureStaticCensus.mjs",
"census:stage5q:runtime":  "node tools/simurgh-attestation/stage5q/node/measureRuntimeCensus.mjs",
"census:stage5q:gate":     "node tools/simurgh-attestation/stage5q/node/measureGateCensus.mjs",
"census:stage5q:coverage": "node tools/simurgh-attestation/stage5q/node/measureQ0Coverage.mjs",
"stage5q:commit-closure":  "node tools/simurgh-attestation/stage5q/node/commitClosure.mjs",
"stage5q:mutants":         "node tools/simurgh-attestation/stage5q/node/runMutationSelfProof.mjs",
"stage5q:attest":          "node tools/simurgh-attestation/stage5q/node/attestation.mjs",
"stage5q:transition":      "node tools/simurgh-attestation/stage5q/node/verifyTransition.mjs",
"stage5q:proofs":          "scripts/check-stage5q-proofs.sh"
```

- create: `scripts/check-stage5q-proofs.sh` — the §14.3 gate, **with a non-empty assertion**:

```bash
#!/usr/bin/env bash
set -euo pipefail
COUNT=$(find proofs/stage5q -name '*.lean' | wc -l | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "FAIL: no proofs under proofs/stage5q — a proof gate with nothing to prove is a false green"
  exit 1
fi
find proofs/stage5q -name '*.lean' -print0 | sort -z | xargs -0 -n1 lean
echo "OK: $COUNT proof file(s) verified"
```

**Why the count floor exists.** The bare `find … | xargs … lean` from spec §14.3 exits **0** when the
directory is empty — verified: zero files means zero invocations means success. Shipping that gate
before Task 18.1 writes a proof would reproduce `F001-false-green` inside the stage that froze F001
as evidence. The floor is not defensive programming; it is the stage refusing to commit its own
defining defect.

**Interfaces produced**

```js
// constants.mjs
export const STAGE_ID = "5q";
export const STAGE5_STAGE_IDS = Object.freeze(["5a",…,"5p"]);           // 16
export const ATTACK_CLASSES  = Object.freeze(["R1",…,"R16"]);            // 16, spec §4.1
export const SECURITY_ROLES  = Object.freeze([...]);                     // spec §2.4, 11 roles
export const COVERAGE_STATUSES = Object.freeze([...]);                   // spec §2.7, exactly 4
export const OMISSION_REASONS  = Object.freeze([...]);                   // spec §4.2, 6 reasons
export const MUTANT_IDS = Object.freeze(["M1",…,"M16"]);                 // spec §7.1
export const MUTANT_PRIMARY_CLASS = Object.freeze({ M1:"R1", …, M16:"R16" });
export const DOMAIN = Object.freeze({ sourceSpan:"simurgh.vsr.source-span.v1", … });
```

**Failing test first** — `tests/unit/llmShield/stage5q/constants.test.js`: assert 16 stage ids, 16
attack classes, exactly 4 coverage statuses, `MUTANT_PRIMARY_CLASS` is a **bijection** onto
`ATTACK_CLASSES` (this is the anti-noisy-mutant rule made mechanical), every collection frozen.

Plus `tests/unit/llmShield/stage5q/proofGate.test.js`: **the proof gate fails on an empty
`proofs/stage5q`.** Run it against a temp dir with no `.lean` files and assert a non-zero exit. This
is the only test in Wave I that guards against the stage's own signature defect, so it is written
before the gate script, not after.

```bash
SIMURGH_SKIP_DOTENV=1 node --test tests/unit/llmShield/stage5q/constants.test.js
# EXPECT: Cannot find module .../constants.mjs
```

**Implement** the constant tables. No logic.

```bash
SIMURGH_SKIP_DOTENV=1 node --test tests/unit/llmShield/stage5q/{constants,frozenBlock}.test.js
# EXPECT: pass 12 + N, fail 0
npm run format:check                                    # EXPECT clean
```

**Commit:** `feat(5q): Task 1 — frozen-block verifier, constants, bijective mutant map`

---

## Task 1.5 — Annex A1: closure root R8 (**before every census**)

**Moved here from Task 7.5 by the external gauntlet (P0-3).** Sitting after Tasks 2-6 meant the
census, reachability graph and role file would all be authored over the WRONG universe and then
enlarged by 243 members immediately before commitment. Roles in particular would be incomplete:
the old placement never listed `stage5-roles.json` as modified, so the new members could not have
received an assignment at all.

R8 must be in the root set from the FIRST census execution.

**Files**

- modify: `tools/simurgh-attestation/stage5q/core/constants.mjs` (add R8 to the root table)
- modify: `tools/simurgh-attestation/stage5q/core/censusStatic.mjs` (walk R8) — created in Task 2,
  so if Task 2 has not run yet this modification is instead an **input constraint on Task 2**: the
  root table it consumes already contains R8
- modify: `tools/simurgh-attestation/stage5q/roles/stage5-roles.json` — R8 members receive role
  assignments in the SAME pass as R1 members, never as a later top-up
- create: `tests/unit/llmShield/stage5q/annexA1Roots.test.js`

**Failing tests first:**

- the root table contains R8 and it resolves to `tests/unit/llmShield/stage5{a..p}/**`;
- the static census over a fixture tree admits a unit-test file and types it `gate_definition`;
- a fixture that builds fixtures is typed `evidence_emission`, not `gate_definition`;
- **`tests/unit/llmShield/stage4*/` is NOT admitted** (A1.3 scope discipline), with the single named
  exception `stage4h/exitWrapper.test.js`, which is already in the closure by dependency;
- R8 members are subject to the §2.4 adversarial role check exactly as R1 members are — a unit test
  declared `pure_transform` while reachable from a `trust_decision` member fails closed.

**Then the count check that proves R8 actually fired:**

```bash
npm run census:stage5q:static -- --format=summary
# EXPECT: member count materially ABOVE the pre-annex diagnostic;
#         the 243 stage-5 unit-test files present as members.
#         Matching the OLD numbers means R8 did not fire.
```

**Named members that must appear, because they are why the annex exists:**

```text
tests/unit/llmShield/stage5p/rawCodeCensus.test.js         gate_definition / completeness_claim
tests/unit/llmShield/stage5p/typedOutcomeDischarge.test.js gate_definition / completeness_claim
```

**Commit:** `feat(5q): Task 1.5 — Annex A1, closure root R8 admits stage-5 unit-level gates`

---

## Task 2 — Static census

**Files**

- create: `tools/simurgh-attestation/stage5q/core/sourceDigest.mjs`
- create: `tools/simurgh-attestation/stage5q/core/functionId.mjs`
- create: `tools/simurgh-attestation/stage5q/core/censusStatic.mjs`
- create: `tools/simurgh-attestation/stage5q/node/measureStaticCensus.mjs`
- create: `tests/unit/llmShield/stage5q/{sourceDigest,functionId,censusStatic}.test.js`

**Interfaces**

```js
// sourceDigest.mjs
export function canonicalSourceBytes(text): Buffer      // throws on BOM
export function sourceSpanDigest(text): string          // domain-separated hex

// functionId.mjs
export function makeFunctionId({ stageId, modulePath, symbol }): string
export function parseFunctionId(id): { stageId, modulePath, symbol }

// censusStatic.mjs
export function staticCensus({ roots, readFile, listFiles }): {
  members: Array<Member>, byId: Map<string, Member>,
  successionHints: Array<{ disappeared_id, appeared_id, shared_source_digest }>
}
// Member: { function_id, stage_id, module_path, export_name_or_internal_symbol,
//           source_digest, category, exported: boolean, runtime_visible: boolean }
```

**Three frozen categories that an earlier draft of this plan silently dropped** (§2.2), each needing
its own emission and its own test:

- **`verifier_branch`** — one member per distinct `reject(check_id, outcome)` site. This is the
  category that makes per-branch attack targeting possible at all; without it a tray can only aim at
  whole functions and R6 (first-failure shadowing) has nothing to attack.
- **`imported_dependency`** — R7-boundary members: in the closure, carrying **no** attack obligation
  unless a stage-5 `security_role` depends on them. They must be _present and marked_, not absent.
- **`historical_function`** — populated by Task 16, but the field and its validation belong here.

**`succession_hint`** (§2.5) is emitted when a disappeared id and an appeared id share a
`source_digest`. Test it, and test the honest limitation: **a rename accompanied by reformatting
produces no hint at all**, because the digest carries no semantic normalisation. Assert the absence
rather than pretending the hint is reliable.

**Failing tests first.** `sourceDigest`: BOM **throws** (not stripped); CRLF and LF inputs digest
identically; a missing trailing newline is added; the digest changes when one byte changes; two
different domain tags never collide. `functionId`: round-trips; a module path containing `:` is
rejected rather than silently ambiguous. `censusStatic`: over a **fixture tree** (not the live repo),
finds exported functions, arrow-const exports, internal declarations, and marks
`runtime_visible` correctly.

```bash
SIMURGH_SKIP_DOTENV=1 node --test tests/unit/llmShield/stage5q/sourceDigest.test.js
# EXPECT: Cannot find module
```

**Implement.** Parse with a real parser, not regex, for `.mjs` — regex over source is exactly the
class of mistake §2.5 deleted. Use `node:module` + a lightweight AST walk, or accept a documented
regex fallback **only** for `.py`/`.lean`/`.sh` with the limitation recorded as a member field.

**Then run the live census as a diagnostic (not published):**

```bash
npm run census:stage5q:static -- --format=summary
```

**These figures are a DIAGNOSTIC, never a target** (Annex A1.4). The pre-annex measurement was ~827
exported JS functions, ~174 internals, ~178 Python defs — taken **before** root R8 added 243 unit-test
files, so the true count is materially higher. If the census output happens to match the old numbers,
that is evidence R8 was not implemented, not evidence the census is right. Never tune a census toward
a remembered number.

**Commit:** `feat(5q): Task 2 — static census, canonical source digest, function identity`

---

## Task 3 — Runtime-visible census

**Files**

- create: `tools/simurgh-attestation/stage5q/core/censusRuntime.mjs`
- create: `tools/simurgh-attestation/stage5q/node/measureRuntimeCensus.mjs`
- create: `tests/unit/llmShield/stage5q/censusRuntime.test.js`

**Interfaces**

**The interface splits in two.** An earlier draft took an injected `importer` _and_ mandated
child-process isolation, which cannot both hold — a function cannot cross a process boundary. Pure
core takes the injection and is unit-testable; the driver owns the processes.

```js
// core/censusRuntime.mjs — PURE, injectable, unit-tested in-process
export async function runtimeCensusFromNamespaces({ namespaces }): {
  members: Array<{ function_id, module_path, symbol, kind }>,  // kind: function|constant|cli
  failures: Array<{ module_path, error }>                       // import failures are DATA
}

// node/measureRuntimeCensus.mjs — DRIVER, owns crash isolation
//   spawns a child per batch, each child imports its batch and prints JSON,
//   merges results, converts a dead child into failures[] entries
export async function runtimeCensusSpawned({ modulePaths, batchSize }): SameShape
```

**Failing test first.** Import failure is recorded, never thrown away — a module that fails to import
is a census fact, not an accident. Re-exports appear. A `Symbol`-keyed export is enumerated or
explicitly excluded with a reason. **A child that dies mid-batch yields `failures` entries for the
whole batch, not a silently short member list** — this is the R7 failure mode (census truncation)
committed by our own tooling, and it must be tested against a fixture module that calls
`process.exit(1)` at import time.

**Implementation note.** There are **380** `.mjs` files under `stage5{a..p}` (measured at `9a2f64df`),
plus whatever R8 adds. Importing them executes their top level, so any import-time side effect runs.
Batch size 25 is a reasonable starting point; the number is not load-bearing, the isolation is.

```bash
node tools/simurgh-attestation/stage5q/node/measureRuntimeCensus.mjs --format=summary
# EXPECT: a member count and a (possibly empty) failures list, exit 0
```

**Commit:** `feat(5q): Task 3 — runtime-visible census with import failures as data`

---

## Task 4 — Gate-definition census

**Files**

- create: `tools/simurgh-attestation/stage5q/core/censusGate.mjs`
- create: `tools/simurgh-attestation/stage5q/node/measureGateCensus.mjs`
- create: `tests/unit/llmShield/stage5q/censusGate.test.js`

**Interfaces**

```js
export function gateCensus({ workflows, packageScripts, shellScripts }): {
  gates: Array<{ gate_id, source, kind, enumeration_style, asserted_facts }>
}
// enumeration_style: "self_extending" | "manually_enumerated"
```

**This task is where F001 becomes mechanical.** Spec §2.8 requires every completeness gate to be
classified. A `manually_enumerated` gate must additionally carry a drift check comparing its list to
the filesystem.

**Failing tests first**, using **fixtures** rather than the live workflows so the test does not break
when the repo changes:

- a workflow listing files by name → `manually_enumerated`;
- a workflow using `find …` → `self_extending`;
- a `manually_enumerated` gate whose list omits an on-disk file → drift **detected**;
- the drift checker returns the omitted names, not merely a boolean.

**Diagnostic run against the live repo (F001's premise, not yet published as evidence):**

```bash
node tools/simurgh-attestation/stage5q/node/measureGateCensus.mjs --drift
# EXPECT: stage-4-lean-proofs.yml classified manually_enumerated,
#         drift lists PanelCoverage, RatingContest, UniverseCommitment,
#         TemporalQuorum, EcologyQuorum
```

**Do NOT repair the workflow.** Spec §14.2 prohibits it during Q0.

**Commit:** `feat(5q): Task 4 — gate census, enumeration-style classification, drift detection`

---

## Task 5 — Reconciliation and reachability graph

**Files**

- create: `tools/simurgh-attestation/stage5q/core/reconcile.mjs`
- create: `tools/simurgh-attestation/stage5q/core/reachability.mjs`
- create: `tests/unit/llmShield/stage5q/{reconcile,reachability}.test.js`

**Interfaces**

```js
export function reconcile({ staticCensus, runtimeCensus }): {
  ok: boolean,
  conflicts: Array<{ shape, function_id, detail }>   // shape ∈ the FOUR frozen shapes
}
export function buildReachability({ members, edges }): {
  reachableFrom(id): Set<string>, callersOf(id): Set<string>, isReachable(from, to): boolean
}
```

**The projection rule is the whole point (spec §2.6).** Failing tests first:

- a static-only **internal** is NOT a conflict (this is the test that would fail under the naive
  rule, and the reason the rule was corrected);
- a runtime-visible export missing from the static projection **is** a conflict;
- a statically exported symbol absent at runtime **is** a conflict;
- a dynamic export not represented statically **is** a conflict;
- a category disagreement on a symbol in both **is** a conflict;
- exactly those four shapes are producible — a fifth shape string is rejected.

```bash
SIMURGH_SKIP_DOTENV=1 node --test tests/unit/llmShield/stage5q/reconcile.test.js
# EXPECT initially: Cannot find module; then pass with 0 fail
```

**Commit:** `feat(5q): Task 5 — census reconciliation over the projection, reachability graph`

---

## Task 6 — Security-role assignment and adversarial role checks

**Files**

- create: `tools/simurgh-attestation/stage5q/core/roleAssignment.mjs`
- create: `tools/simurgh-attestation/stage5q/roles/stage5-roles.json` (the assignment, reviewable)
- create: `tests/unit/llmShield/stage5q/roleAssignment.test.js`

**Interfaces**

```js
export function assignRoles({ members, declared, reachability }): {
  assigned: Map<string, Role>,
  violations: Array<{ function_id, declared, reason, path }>
}
export function requiredClasses(role): string[]        // spec §2.4 obligation table
```

**This is the highest-value attack against 5Q itself (spec §2.4), so it gets the sharpest test.**

Failing tests first:

- **a member declared `pure_transform` that is reachable from a `trust_decision` member FAILS
  CLOSED**, and the violation names the reachability path;
- the failure is only cleared by a signed member-specific exception, and an unsigned exception does
  not clear it;
- `requiredClasses` returns the full matrix for the four full-obligation roles;
- an unknown role string is rejected, never defaulted.

**Fault injection required before this task is done:** flip one real member's declared role from a
full-obligation role to `pure_transform` and confirm the violation fires. Record the command in the
commit body. A role checker that has never rejected is not known to work.

**Commit:** `feat(5q): Task 6 — role assignment with reachability-checked adversarial validation`

---

## Task 7 — Delegation validation and cycle rejection

**Files**

- create: `tools/simurgh-attestation/stage5q/core/delegation.mjs`
- create: `tests/unit/llmShield/stage5q/delegation.test.js`

**Interfaces**

```js
export function validateDelegation({ members, statuses, callers }): {
  ok: boolean,
  problems: Array<{ function_id, kind }>  // kind: unattacked_caller | cycle | missing_callsite
}
```

**Failing tests first:**

- delegation with every caller `attacked_pass` → valid;
- **one** unattacked caller → invalid (one is enough; this is not a majority vote);
- a two-node cycle A↔B discharges **nothing** — both are problems;
- a longer cycle A→B→C→A is also caught;
- a member claiming delegation with zero named call sites is invalid, not vacuously true.

The vacuous-empty case is the one most likely to be got wrong and the most dangerous: "all zero of my
callers are attacked" is trivially true and must be rejected explicitly.

**Commit:** `feat(5q): Task 7 — delegation validation, cycle and vacuous-delegation rejection`

---

## Task 7.6 — Historical function inventory (**Annex A3, pre-L2**)

**Added by the external gauntlet (P0-2).** The old plan discovered `historical_function` members in
Task 16 — after L2 — and then kept them outside the committed closure. That is an uncommitted
function universe inside the stage whose central law is Universe Before Attack, and every one of
those members would have had no coverage status, breaking L1 as well.

**This task enumerates. It does not attack.** No pack runs here.

**Files**

- create: `tools/simurgh-attestation/stage5q/core/historicalClosure.mjs`
- create: `tools/simurgh-attestation/stage5q/node/inventoryHistorical.mjs`
- create: `tests/unit/llmShield/stage5q/historicalClosure.test.js`
- output: `docs/research/llm-shield/evidence/stage-5q/closure/historical-function-closure.json`

**Interfaces**

```js
export function historicalClosure({ tagRecords }): {
  members: Array<{ tag_name, commit_sha, function_id, source_digest, category, still_trusted_by }>,
  historical_function_closure_digest: string
}
```

**Failing tests first:**

- a member is keyed by `(tag_name, function_id)` — the **same** `function_id` may legitimately exist
  in several tags with **different** `source_digest`s, and collapsing them loses exactly the drift
  that R12 (historical downgrade) exists to find;
- enumerating a tag runs **no** attack pack — assert the pack runner is never invoked;
- a tag that cannot be checked out yields `environment_unreproducible` **as a member-level record**,
  not an absent tag;
- the digest is byte-stable across two runs.

```bash
export PATH="${SIMURGH_NODE26_BIN:-/opt/homebrew/opt/node@26/bin}:$PATH"
node tools/simurgh-attestation/stage5q/node/inventoryHistorical.mjs --worktree-root /tmp/5q-inv
# EXPECT: 16 tags enumerated, digest printed, worktrees removed
```

**Commit:** `feat(5q): Task 7.6 — precommitted historical function closure (Annex A3)`

---

## Task 7.7 — Obligation matrix, member × class (**Annex A4, pre-L2**)

**Added by the external gauntlet (P0-5), and it is the most consequential of the four.** Without a
cell ledger, one R3 pack against one function could discharge R3 for **every** R3-obligated function
in its tray — and nothing would look wrong. The tray report would read complete, the coverage ledger
would read complete, and every member status would be populated. A false completeness claim at
exactly the granularity this stage exists to police.

**Files**

- create: `tools/simurgh-attestation/stage5q/core/obligations.mjs`
- create: `tools/simurgh-attestation/stage5q/node/generateObligations.mjs`
- create: `tests/unit/llmShield/stage5q/obligations.test.js`
- output: `docs/research/llm-shield/evidence/stage-5q/closure/obligation-matrix.json`

**Interfaces**

```js
export function obligationId({ functionId, attackClass }): string
// SHA256( UTF8("simurgh.vsr.obligation.v1") || 0x00 || function_id || 0x00 || attack_class )

export function generateObligations({ members, roles, taxonomy }): {
  cells: Array<{ obligation_id, function_id, attack_class, applicability,
                 omission_reason, planned_pack_ids }>,
  obligation_matrix_root: string
}
```

**Failing tests first:**

- the cell count equals `Σ over members of |applicable classes for its role|` — computed
  independently of the generator, or the test merely agrees with the code;
- `applicability: "omitted"` **requires** a reason from the §4.2 frozen six-value enum; free text is
  rejected;
- `applicability: "obligated"` with an omission reason is rejected (contradictory cell);
- `obligation_id` is a pure function of `(function_id, attack_class)` and collides for neither a
  transposed pair nor a concatenation ambiguity — test `("ab","c")` vs `("a","bc")` explicitly,
  which is what the `0x00` separator is for;
- a cell naming a `function_id` outside the committed closure is rejected.

**Discharge direction is now bottom-up (A4.3).** Task 19 discharges cells; member status is
**derived** from them and may never be written directly. The plan's original direction — record
member status, infer class coverage — is precisely the inference that permitted the false discharge.

**Commit:** `feat(5q): Task 7.7 — member × class obligation matrix (Annex A4)`

---

## Task 8 — Closure commitment (**the L2 boundary**)

**Preconditions: Tasks 1.5, 7.6 and 7.7 complete.** Nothing committed here can be amended afterwards.

**Annex A2 splits what Task 8 commits.** The frozen §2.3 entry record contains `attack_pack_ids` and
`coverage_status`, which do not exist until Tasks 9–19. Task 8 commits only the immutable
projection; the discharge overlay is committed by Task 19.

```text
COMMITTED HERE (immutable at L2)          COMMITTED BY TASK 19 (overlay)
  closure_member_commitment                 function_discharge_overlay
    function_id                               function_id  (FK into the commitment)
    stage_id                                  attack_pack_ids
    module_path                               coverage_status
    export_name_or_internal_symbol
    source_digest
    category
    reachable_from
    security_role
    historical_tags
```

**Additional failing tests for the split:**

- an overlay row whose `function_id` is not in the commitment is **rejected** — this is the
  gerrymandering direction the split creates and it must be exercised, not assumed;
- the overlay cannot add, remove or re-key members: cardinality is fixed at L2;
- the joined view reproduces §2.3 exactly, field for field.

**Files**

- create: `tools/simurgh-attestation/stage5q/core/closureCommit.mjs`
- create: `tools/simurgh-attestation/stage5q/node/commitClosure.mjs`
- create: `tests/unit/llmShield/stage5q/closureCommit.test.js`
- output: `docs/research/llm-shield/evidence/stage-5q/closure/function-closure.json` + `.digest`

**Interfaces**

```js
export function commitClosure({ members, roles, tagClosure, taxonomy }): {
  function_closure_digest, release_tag_closure_digest, attack_taxonomy_digest,
  merkle_root, member_count, committed_at_commit
}
```

**Failing tests first:**

- the commitment is **byte-stable**: two builds produce identical bytes;
- adding one member changes the digest;
- **removing** one member changes the digest (the gerrymandering direction — test it explicitly);
- reordering members does **not** change the digest (canonical ordering), so the digest describes the
  set rather than the listing;
- the tag closure contains exactly the 16 tags of spec §3.1 and rejects a 17th.

**Reuse, do not reinvent:** 5K's Merkle-set universe commitment already solves set-commitment. Import
it rather than writing a second one — a second implementation is a second thing to attack.

`commitClosure.mjs` takes `--out <path>` (required with `--write`) so the two builds land in
**different files**. An earlier draft wrote twice to the same path and then compared against a
`.rerun` file nothing produced — `cmp` would have failed on a missing operand, and the stage's
central byte-stability proof would have been a command that errors.

```bash
export PATH=/opt/homebrew/opt/node@26/bin:$PATH   # byte-stability is pinned to Node 26
node --version                                    # EXPECT: v26.x

E=docs/research/llm-shield/evidence/stage-5q/closure
node tools/simurgh-attestation/stage5q/node/commitClosure.mjs --write --out "$E/function-closure.json"
node tools/simurgh-attestation/stage5q/node/commitClosure.mjs --write --out /tmp/5q-closure-rerun.json
cmp "$E/function-closure.json" /tmp/5q-closure-rerun.json && echo "BYTE-IDENTICAL"
# EXPECT: BYTE-IDENTICAL, exit 0
```

**WAVE I GATE — after this commit, the universe is frozen. Attacks may now run.**

**Commit:** `feat(5q): Task 8 — closure commitment; the universe is now frozen (L2)`

---

# WAVE II — prove the red-team machinery can bleed

---

## Task 9 — Attack-pack schema and premise receipts

**Files**

- create: `tools/simurgh-attestation/stage5q/core/attackPack.mjs`
- create: `tools/simurgh-attestation/stage5q/core/premiseReceipt.mjs`
- create: `tests/unit/llmShield/stage5q/{attackPack,premiseReceipt}.test.js`

**Interfaces**

```js
export function validateAttackPack(pack): { ok, problems }
export function makePremiseReceipt({ packId, generatedCase, assertion }): Receipt
export function verifyPremise(receipt): boolean
```

**The premise gate (spec §4.4) is inherited from 5P and is not relaxed for volume.** Failing tests
first:

- a pack claiming a contradiction whose two vectors merely **differ** is REJECTED — this is the
  literal 5P defect, reproduced as a fixture so it can never recur silently;
- a pack with no premise receipt is inadmissible regardless of its results;
- an omitted attack class must carry a reason from the **frozen six-value enum**; free text is
  rejected;
- expected outcomes are symbolic — a numeric raw code in a pack is rejected (spec §12.4).

**Commit:** `feat(5q): Task 9 — attack-pack schema, premise gate, symbolic-outcome enforcement`

---

## Task 10 — Append-only Q0 finding ledger

**Files**

- create: `tools/simurgh-attestation/stage5q/core/findingLedger.mjs`
- create: `tests/unit/llmShield/stage5q/findingLedger.test.js`

**Interfaces**

```js
export function appendFinding(ledger, record): Ledger      // returns NEW ledger, never mutates
export function verifyChain(ledger): { ok, brokenAt }
export function ledgerDigest(ledger): string
```

**Failing tests first (L3 made mechanical):**

- the full Q0 field set of spec §5.1 is required, including `discovered_by` and `corroborated_by`;
- `discovered_by` accepts only the three frozen values;
- **an attempt to edit an existing record throws** — append-only is enforced, not documented;
- the hash chain detects a tampered middle record and reports its index;
- **severity cannot be changed after append** (spec §5.3 escalation rule) — the attempt throws and
  the caller is told to mint a new finding;
- a Q1 record referencing a nonexistent `finding_id` is rejected.

**Commit:** `feat(5q): Task 10 — append-only hash-chained finding ledger, severity immutable`

---

## Task 11 — Harness core

**Files**

- create: `tools/simurgh-attestation/stage5q/core/harness.mjs`
- create: `tools/simurgh-attestation/stage5q/node/runTray.mjs`
- create: `tests/unit/llmShield/stage5q/harness.test.js`

**Interfaces**

```js
export async function runPack({ pack, target, closureDigest, admissibility }): PackResult
export function admissibility(mutationReceipts): { isAdmissible(cls): boolean }
```

**Failing tests first — the admissibility rule is the point:**

- a pack whose class has **no** mutation receipt may run, but its result is marked
  `inadmissible` and **cannot** be published as `attacked_pass`;
- a pack run against a closure digest ≠ the committed one is **refused outright** (L2);
- a pack result records the closure digest it ran against, so a reviewer can check the pairing.

**Commit:** `feat(5q): Task 11 — harness core with L2 closure binding and L4 admissibility`

---

## Task 12 — M1–M16 mutation self-proof (**the L4 gate**)

**Files**

- create: `tools/simurgh-attestation/stage5q/core/mutationReceipt.mjs`
- create: `tools/simurgh-attestation/stage5q/mutants/M1.json` … `M16.json` (descriptions only) —
  **unpadded**, matching `MUTANT_IDS` exactly. An earlier draft wrote `M01.json` against ids `M1`,
  which breaks every id→file lookup and would be found only at runtime.
- create: `tools/simurgh-attestation/stage5q/node/runMutationSelfProof.mjs`
- create: `tests/unit/llmShield/stage5q/mutationReceipt.test.js`
- output: `docs/research/llm-shield/evidence/stage-5q/mutation/receipts.json`

**Every class produces exactly this receipt (frozen shape):**

```text
baseline_command
baseline_exit = 0
mutation_applied = true
mutation_digest
mutated_command
mutated_exit != 0
detecting_pack_id
mutation_reverted = true
restored_command
restored_exit = 0
```

**Failing tests first:**

- a receipt missing the restore leg is **invalid** — a mutant left in place is not a proof, it is a
  regression;
- `baseline_exit != 0` invalidates the receipt: a mutant "detected" by an already-red suite proves
  nothing (spec §7.3);
- `mutated_exit == 0` means the class is **not** discharged;
- a receipt whose `detecting_pack_id` targets a **different** primary class does not discharge this
  class — cross-class detections are secondary observations only (spec §7.1);
- all 16 classes must have receipts before the ledger publishes any `attacked_pass`.

**Execution rules (spec §7.2):** mutants are applied in a scratch worktree and reverted. **No mutated
source is ever committed.** Only descriptions, commands and observed exits enter evidence.

```bash
node tools/simurgh-attestation/stage5q/node/runMutationSelfProof.mjs --all
# EXPECT: 16/16 receipts, each green->red->green; any red->red or green->green FAILS the task
git status --short    # EXPECT: clean apart from evidence output — no mutated source
```

**If a mutant is NOT detected:** strengthen the pack and re-run. Do not weaken the mutant. Record the
strengthening in the commit body — an undetected mutant is the most valuable single output of Wave II
and must not be quietly tuned away.

**Commit:** `feat(5q): Task 12 — M1-M16 mutation self-proof, one primary receipt per class`

---

## Task 13 — F001 Q0 evidence capture

**Files**

- create: `tools/simurgh-attestation/stage5q/node/captureF001.mjs`
- create: `tests/unit/llmShield/stage5q/f001Capture.test.js`
- output: `docs/research/llm-shield/evidence/stage-5q/findings/F001/{premise,false-green,complete-probe}.json`

**Three artefacts, exactly as spec §14.1 requires. All three are evidence collection; none is a
repair.**

```text
F001-premise         32 Lean files exist; 27 named by the workflow; named set ≠ filesystem set
F001-false-green     the existing CI command EXITS SUCCESSFULLY while omitted proof files
                     remain outside its execution closure
F001-complete-probe  an independent diagnostic attempts EVERY proof and records each result
```

**Failing tests first:**

- the premise artefact records both sets and their difference, not merely a count;
- the false-green artefact records the gate's **exit status** — a short list that failed loudly would
  be a nuisance, not a false green, and the artefact must be able to tell them apart;
- the complete-probe artefact records a per-file result, including failures;
- the capture asserts `discovered_by = pre_stage_design_review` and
  `corroborated_by = stage5q_q0_attack_pack`, and a capture that sets `discovered_by` to the harness
  is **rejected** (never re-credit discovery).

**The complete probe is out-of-band and is NOT wired into any shared workflow (spec §14.1/§14.2):**

```bash
find proofs -name '*.lean' -print0 | sort -z | xargs -0 -n1 -I{} sh -c 'lean {} >/dev/null 2>&1; echo "$?  {}"'
```

**ESCALATION (spec §14.6).** If any proof fails, F001 keeps `assurance_only` and a **separate**
finding is minted with its own premise receipt and claim impact. Do not rewrite F001's severity.

**Commit:** `feat(5q): Task 13 — F001 Q0 artefacts: premise, false-green, complete probe`

---

# WAVE III — attack the stack

---

## Task 14 — Sixteen stage trays (14.1 … 14.16)

**One sub-task per stage, each with its own test cycle and its own commit.** A reviewer must be able
to reject the 5L tray without blocking review of 5A.

**Per sub-task files** (`X` ∈ `a…p`):

- create: `tools/simurgh-attestation/stage5q/trays/stage5X.mjs`
- create: `tools/simurgh-attestation/stage5q/packs/stage5X/*.json`
- create: `tests/unit/llmShield/stage5q/trays/stage5X.test.js`
- output: `docs/research/llm-shield/evidence/stage-5q/trays/stage5X.json`

**Every tray emits exactly this frozen record:**

```text
tray_id
closure_digest              MUST equal the Task 8 commitment
target_function_ids
applicable_classes
omitted_classes_with_frozen_reason
attack_pack_ids
premise_receipts
finding_ids
coverage_statuses
positive_path_result
```

**`positive_path_result` is defined here** because an earlier draft required every tray to emit it
without saying what it was — a zero-context implementer could not have known what to run.

```text
positive_path_result = the exit status and log digest of scripts/reproduce-llm-shield-stage5X.sh
                       run at head, under Node 26

values: reproduced | reproduced_with_diff | script_absent | environment_unreproducible
```

**Its purpose is to prove the attacks did not break the thing they attacked.** A tray reporting no
findings while the stage's own reproduce script has stopped passing is reporting on rubble.

Note that 8 of the 16 stage reproduce scripts are **not** run by `check-e2e.sh` (5f, 5g, 5i, 5j, 5k,
5l, 5n, 5p; 5o has its own workflow). Their positive paths are therefore _unverified at head_ going
in, and a tray that finds `reproduced_with_diff` for one of them has found something real — record it
as a finding, do not repair it during Q0.

**Failing tests per tray:**

- every target id exists in the committed closure (a tray cannot invent targets);
- every omitted class carries a reason from the frozen six-value enum;
- no `attacked_pass` is emitted for a class lacking a Task 12 receipt;
- the tray's `closure_digest` matches the commitment, else the tray refuses to run.

**The clean-tray wording is frozen and must be asserted by a test:**

> No finding was produced by these admissible packs over this frozen target set.

A tray must **never** emit "secure", "no vulnerabilities", or "passed". A test greps the emitted
report for those words and fails on any of them.

**Order:** 14.1 `5a` → 14.16 `5p`. Later trays reuse earlier pack scaffolding; the first two will be
slower than the remaining fourteen.

**Commit each:** `feat(5q): Task 14.N — stage 5X tray`

---

## Task 15 — Current-head composition campaign

**Files**

- create: `tools/simurgh-attestation/stage5q/campaigns/head.mjs`
- create: `tests/unit/llmShield/stage5q/campaigns/head.test.js`
- output: `.../evidence/stage-5q/campaigns/head.json`

Targets combinations **within** the current head that no single tray sees: a verifier from one stage
consuming an artifact built by another; shared canonicalisation used with two different domain tags;
a census from one stage counting members owned by another.

**Commit:** `feat(5q): Task 15 — current-head composition campaign`

---

## Task 16 — Historical-tag campaign

**Files**

- create: `tools/simurgh-attestation/stage5q/campaigns/historical.mjs`
- create: `tests/unit/llmShield/stage5q/campaigns/historical.test.js`
- output: `.../evidence/stage-5q/campaigns/historical.json`

**Per spec §3.3/§3.4.** Each of the 16 tags is exercised in its **own git worktree** at its own
commit. Tags are never checked out over the working tree and never rewritten.

**Failing tests first:**

- all five outcome values are producible, and `environment_unreproducible` is **never** counted as a
  pass — reproducible and unreproducible tags are printed as **separate denominators, never summed**;
- **every tag in §3.1 appears in the output**, including unreproducible ones (no tag may vanish
  because a modern toolchain dislikes it);
- step 5 — current tooling accepting weaker historical semantics — is its own assertion, because it
  is the highest-value step and the one no isolated tray can perform.

**Annex A3 changed this task's job.** It no longer _discovers_ `historical_function` members —
Task 7.6 enumerated and committed them before L2. Task 16 **attacks an already-frozen historical
target set**, exactly as the trays attack an already-frozen head closure.

A member encountered here that is absent from the committed historical closure is a **finding**
(the inventory was incomplete), never a silent addition. Neither closure may grow after L2.

```bash
node tools/simurgh-attestation/stage5q/campaigns/historical.mjs --worktree-root /tmp/5q-tags
# EXPECT: 16 tag records, each with an outcome; worktrees removed on exit
git worktree list
# EXPECT: exactly ONE line — the primary worktree. `git worktree list` always lists the primary,
# so "no worktrees" is never a correct expectation; the assertion is that no /tmp/5q-tags entry
# survives. Assert on the absence of the worktree-root prefix, not on an empty list.
```

**Commit:** `feat(5q): Task 16 — historical-tag campaign in isolated worktrees`

---

## Task 17 — Cross-stage seam campaign

**Files**

- create: `tools/simurgh-attestation/stage5q/campaigns/seam.mjs`
- create: `tests/unit/llmShield/stage5q/campaigns/seam.test.js`
- output: `.../evidence/stage-5q/campaigns/seam.json`

All nine seam targets of spec §10. The last two get first-class expected-outcome tables rather than
appendix treatment, because every component is individually valid and no existing test can see them:

- one stage's **non-claim** silently promoted into another stage's premise;
- conflicting stage artefacts that each verify independently but **cannot coexist truthfully**.

**Commit:** `feat(5q): Task 17 — cross-stage seam campaign`

---

## Task 18 — Claude Fable 5 containment campaign

**Files**

- create: `tools/simurgh-attestation/stage5q/campaigns/fable5.mjs`
- create: `tests/unit/llmShield/stage5q/campaigns/fable5.test.js`
- output: `.../evidence/stage-5q/campaigns/fable5.json`

**Governing rule, frozen text, asserted by a test on the emitted report:**

> Model output may describe authority, identity, completeness or verification. It can never create
> them.

**Privacy/egress contract (spec §8.3) — enforced by tests, not by care:**

- mechanical attack strings (confusables, malformed objects) stored in full;
- live-provider output digest-pinned with a **frozen-length prefix only**, never a corpus dump;
- a test asserts no evidence file exceeds the prefix bound and no file is a reusable working recipe;
- `model_refused` is a valid recorded outcome and is never re-run to obtain a better one.

**Commit:** `feat(5q): Task 18 — Fable 5 authority-laundering containment campaign`

---

# WAVE III-b — the standing structural contract

Inserted after the gauntlet. Spec §12.2 mandates these and §16 deferred their details **to this
plan**; the first draft collected none of them. They sit before Wave IV because Task 20's attestation
must cover them and §12.2 gates them.

---

## Task 18.1 — Lean core `proofs/stage5q/Vsr.lean`

**Files**

- create: `proofs/stage5q/Vsr.lean`
- create: `tests/unit/llmShield/stage5q/leanProofBinding.test.js`

**Theorem targets** — 5Q's own invariants, not restatements of prior stages:

```text
delegationAcyclic        a delegation graph with a cycle discharges nothing
delegationNonVacuous     zero named call sites never discharges
coverageTotality         every closure member maps to exactly one of four statuses
ledgerAppendMonotone     the finding ledger's chain length never decreases
admissibilityBlocks      attacked_pass requires a green->red->green receipt for its class
closureBindsResults      a pack result carries the closure digest it ran against
projectionSoundness      a static-only internal is never a census_conflict
```

**Failing test first.** `leanProofBinding.test.js` asserts each named theorem exists in the file, and
that the file contains **zero** `sorry`/`admit`/`native_decide` escapes. The binding test is what
stops a proof file drifting away from the properties the plan claims it proves.

```bash
lean proofs/stage5q/Vsr.lean          # EXPECT: exit 0, no output
npm run stage5q:proofs                # EXPECT: "OK: 1 proof file(s) verified"
```

**Lean 4.15 gotcha:** `omega` cannot see `Nat.max`; use `Nat.le_max_left/right` and `Nat.max_le`.

**Commit:** `feat(5q): Task 18.1 — Lean core, seven theorems, zero escapes`

---

## Task 18.2 — K7 all-functions net for 5Q's own code

**Files**

- create: `tests/e2e/llmShield/stage5q/k7AllFunctions.test.js`

Spec §12.2: _the red team's harness is not exempt from the discipline it enforces._ The net enumerates
every export of every `stage5q` module and exercises it, exactly as the sixteen prior K7 nets do.

**Failing tests first:**

- every `stage5q` export is reached (dynamic enumeration via `import * as`, never a hand list —
  a hand-listed K7 net would be F001 a third time);
- **dead exports fail the net.** 5P's K7 census found 5 dead exports plus 2 more when Lane L landed;
  expect the same here and delete them rather than exercising them token-effort;
- cross-lane invariants: a closure digest from Task 8 verifies against the attestation in Task 20.

Placed under `tests/e2e/`, so `scripts/check-e2e.sh` picks it up automatically by `find` — no
workflow edit, and therefore no new manually-enumerated gate.

**Commit:** `feat(5q): Task 18.2 — K7 all-functions net over the harness itself`

---

## Task 18.3 — Python and browser parity for 5Q's deterministic surface

**Files**

- create: `tools/simurgh-attestation/stage5q/python/vsr_parity.py`
- create: `tools/simurgh-attestation/stage5q/python/parity-vectors.json`
- create: `tools/simurgh-attestation/stage5q/browser/{index.html,vsr-portable.mjs}`
- create: `tests/unit/llmShield/stage5q/crossRuntimeParity.test.js`

**Parity surface — deterministic functions only**, declared explicitly so the claim is bounded:

```text
canonicalSourceBytes / sourceSpanDigest      (§2.5)
makeFunctionId / parseFunctionId
closure canonical ordering + merkle root     (Task 8)
coverage status validation                   (Task 19)
```

Nothing touching the filesystem, the clock, or a process is in the parity surface. **Node ≡ Python ≡
browser on the same vectors, or the claim is withdrawn** — a parity claim over a surface where the
runtimes were never compared is worse than no claim.

**Gotchas:** CSP `default-src 'none'` with no `connect-src`; skip honestly when no browser is present
rather than passing vacuously; Python canonical JSON is
`json.dumps(sort_keys=True, separators=(",",":"), ensure_ascii=False)`.

**Commit:** `feat(5q): Task 18.3 — Node/Python/browser parity over the deterministic surface`

---

## Task 18.4 — `scripts/reproduce-llm-shield-stage5q.sh`

**Files**

- create: `scripts/reproduce-llm-shield-stage5q.sh`

Reproduces Q0 end to end from pinned inputs: freeze verification, all three censuses, closure
commitment byte-stability, mutation receipts, tray reports, campaign reports, coverage ledger,
attestation verification.

**Hard requirements, each paid for by a prior stage:**

- **explicit `if/then/else` gates — never `cmd && echo OK` chains.** Under `set -e` a failing
  `cmd && echo` fails **open**, which cost Stage 5E two undetected failures on the droplet repro;
- pins Node 26 for every byte-stability step;
- names Lane/campaign items **not** reproduced, and why, rather than omitting them;
- prints reproducible and unreproducible historical tags as separate counts (§3.3).

```bash
./scripts/reproduce-llm-shield-stage5q.sh
# EXPECT: ALL GATES PASSED, exit 0
```

**Commit:** `feat(5q): Task 18.4 — Q0 reproduce script with fail-closed gates`

---

# WAVE IV — reconcile, sign and stop

---

## Task 19 — Q0 coverage and discharge ledger

**Files**

- create: `tools/simurgh-attestation/stage5q/core/coverageLedger.mjs`
- create: `tools/simurgh-attestation/stage5q/node/measureQ0Coverage.mjs`
- create: `tests/unit/llmShield/stage5q/coverageLedger.test.js`
- output: `.../evidence/stage-5q/coverage/discharge-ledger.json`

**The L1 gate, now bottom-up (Annex A4.3).** Task 19 discharges **every obligation cell**, and the
member-level `coverage_status` is **derived** from its cells — never written directly:

```text
member status := attacked_pass                iff every obligated cell discharged, none found
                 finding_frozen               iff any cell produced a finding
                 mechanically_unreachable     iff every cell omitted with a mechanical reason
                 delegated_to_attacked_caller iff validateDelegation() passes (§2.7 unchanged)
```

Task 19 also emits the **discharge overlay** of Annex A2, which is the second half of what §2.3
describes; Task 8 committed the first half. Every closure member appears **exactly once** with
exactly one of the four statuses.

**Additional failing tests:**

- a member status written directly, without cells, is **rejected**;
- an undischarged obligated cell blocks the member's `attacked_pass`, even if every other cell for
  that member passed — this is the P0-5 defect, exercised;
- `validateDelegation` is **invoked here**, not merely unit-tested in Task 7 (gauntlet P1-14).

**Failing tests first:**

- a member with **no** status fails the ledger (not defaulted);
- a member appearing **twice** fails;
- a fifth status value is rejected;
- an `attacked_pass` whose class lacks a Task 12 receipt is rejected at publication;
- `mechanically_unreachable` backed by prose rather than a reachability computation is rejected;
- the ledger is byte-stable across two builds.

```bash
npm run census:stage5q:coverage
# EXPECT: every member accounted for; 0 unstatused; 0 duplicate; 0 inadmissible pass
```

**Commit:** `feat(5q): Task 19 — Q0 coverage and discharge ledger (L1)`

---

## Task 20 — Q0 attestation, signing and immutable freeze

**Files**

- create: `tools/simurgh-attestation/stage5q/node/attestation.mjs`
- create: `tests/unit/llmShield/stage5q/attestation.test.js`
- output: `.../evidence/stage-5q/attestation/stage5q-q0-attestation.json` + `.pub`

**Freezes exactly these seven roots:**

```text
closure_member_commitment_digest     (A2 — was function_closure_digest)
release_tag_closure_digest
attack_taxonomy_digest
q0_finding_ledger_digest
mutation_receipt_root
attack_pack_root
coverage_discharge_root              (A2 — the discharge overlay)
historical_function_closure_digest   (A3 — NEW)
obligation_matrix_root               (A4 — NEW)
```

**This is NINE roots, not the seven originally ruled.** A2 renamed one and clarified another; A3 and
A4 each added one. The change is called out rather than absorbed silently, because a root list that
grows without announcement is how an attestation quietly stops covering what it claims to cover.

Two-tier Ed25519, public (recomputable) / audit (signed limitations). **Private key never leaves the
session scratchpad and is never committed** — 5P's lesson: a deterministically derived key is
forgeable by anyone reading the source.

**Failing tests first:**

- the gate **recomputes the payload** rather than checking the signature alone — a signature over
  stale claims verifies perfectly and means nothing;
- every non-claim of spec §13 appears in `known_limitations`, including _zero discovered findings is
  not itself a security result_;
- tampering any one of the seven roots breaks verification;
- the attestation records which attack classes are `inadmissible`, if any.

**After this commit, Q0 evidence is read-only.**

**Commit:** `feat(5q): Task 20 — Q0 attestation over seven roots; Q0 evidence now read-only`

---

## Task 21 — Q0→Q1 transition validator

**Files**

- create: `tools/simurgh-attestation/stage5q/core/transition.mjs`
- create: `tools/simurgh-attestation/stage5q/node/verifyTransition.mjs`
- create: `tests/unit/llmShield/stage5q/transition.test.js`

**The frozen Q0→Q1 transition contract.** Q1 may not begin until all of these hold:

```text
T1  the Q0 attestation verifies and its seven roots recompute
T2  every attack class is admissible, or its inadmissibility is recorded in the attestation
T3  every closure member has exactly one coverage status
T4  the finding ledger chain verifies end to end
T5  no Q1 record exists yet for any finding
T6  the frozen-block digest still equals da78774b…  (the spec was not edited in place)
```

**Failing tests first:** each of T1–T6 fails independently when violated; a Q1 record present before
the freeze is detected by T5; T6 catches an in-place spec edit.

```bash
node tools/simurgh-attestation/stage5q/node/verifyTransition.mjs
# EXPECT: all six conditions pass, exit 0 — Q1 is now authorised
```

**Commit:** `feat(5q): Task 21 — Q0->Q1 transition validator, six frozen conditions`

---

# Q1 boundary — exactly two entries

## `Q1-F001` — the first and only authorised repair

Fully specified by spec §14.4. **Cannot begin before the signed Q0 freeze (Task 20) and a passing
transition validator (Task 21).**

```text
manually enumerated Lean list
  → repository-wide self-extending proof discovery
  → filesystem-versus-executed-set equality gate

required regression sequence, all three witnessed:
  before repair:          workflow green, omission witness red
  after repair:           all proof files executed, set-equality witness green
  seeded omission after:  workflow or drift gate red

PROHIBITED: adding the five missing filenames. That repairs the photograph, not the camera.

Q1 append must list historical tags still affected (L5 — head may be repaired,
tags remain affected, F001's Q0 record remains immutable).
```

## `Q1-FUTURE` — generated, never imagined

```text
Tasks are generated ONLY from immutable Q0 finding records.
No task exists until a corresponding signed Q0 finding exists.
No speculative repair task may be written into this plan.
```

---

# Matrix 1 — spec-to-task coverage

**Scope, stated rather than assumed.** This matrix covers every **normative** requirement in
§§1–14 plus Annex A1. It deliberately excludes four non-normative sections, named here so the
exclusion is a declaration and not an omission:

```text
§0    ruling provenance and document scope — no requirement to discharge
§11   architecture rationale and rejected alternatives — records a decision, imposes no gate
§15   scorecard and founder's ledger — re-scored at closeout, not a Q0 gate
§16   the deferred list itself — DISCHARGED by Wave III-b, which is what it deferred
```

An earlier draft claimed coverage of "§§1–16" while omitting these rows. In a stage whose blade is
false completeness claims, an unqualified completeness claim in the coverage matrix is the defect
demonstrating itself — the same standard §14.0 applied to F001's absence receipt.

| Spec    | Requirement                                               | Task        | Gate                                          |
| ------- | --------------------------------------------------------- | ----------- | --------------------------------------------- |
| §1.2 L1 | every member has exactly one status                       | 19          | coverage ledger rejects unstatused/duplicate  |
| §1.2 L2 | universe committed before attack                          | 8, 11       | harness refuses a mismatched closure digest   |
| §1.2 L3 | no finding erased                                         | 10          | edit-after-append throws; chain verify        |
| §1.2 L4 | no green without a red                                    | 12, 11      | admissibility blocks publication              |
| §1.2 L5 | no retroactive innocence                                  | 16, Q1-F001 | tags-still-affected list required             |
| §1.3    | honest core in non-claims                                 | 20          | limitations completeness test                 |
| §2.1    | membership roots R1–R7                                    | 2, 3, 4     | fixture-tree census tests                     |
| §2.2    | member categories                                         | 2           | category assignment test                      |
| §2.3    | entry record fields                                       | 2, 8        | schema test                                   |
| §2.4    | role obligation matrix                                    | 6           | `requiredClasses` test                        |
| §2.4    | pure_transform reachable from trust_decision fails closed | 6           | adversarial role test + fault injection       |
| §2.5    | function_id stability, no semantic normalisation          | 2           | BOM throws; CRLF≡LF; one-byte moves digest    |
| §2.6    | projection rule, four conflict shapes                     | 5           | static-only internal is NOT a conflict        |
| §2.7    | four statuses only                                        | 19          | fifth value rejected                          |
| §2.7    | delegation: all callers, no cycles, not vacuous           | 7           | cycle and empty-callsite tests                |
| §2.8    | gates classified; manual gates carry drift check          | 4           | drift returns omitted names                   |
| §3.1    | exactly 16 tags                                           | 8, 16       | 17th tag rejected                             |
| §3.3    | environment_unreproducible never a pass                   | 16          | separate denominators test                    |
| §3.4    | isolated worktrees, tags never rewritten                  | 16          | no leftover worktrees                         |
| §4.1    | 16 attack classes                                         | 1           | constants test                                |
| §4.2    | omission reasons from frozen enum                         | 9, 14       | free-text reason rejected                     |
| §4.4    | premise gate                                              | 9           | the 5P differ-vs-contradict fixture           |
| §5.1    | Q0 record fields incl. discovered_by                      | 10, 13      | discovery never re-credited                   |
| §5.3    | severity never rewritten                                  | 10          | post-append severity change throws            |
| §5.5    | append-only, hash-chained, visible                        | 10          | tampered-middle detection                     |
| §6.1    | read-only surface incl. 5P and workflows                  | all         | pre-commit path guard (Task 1)                |
| §7.1    | one mutant per class, bijective                           | 1, 12       | bijection test; cross-class ≠ primary         |
| §7.2    | mutants never committed                                   | 12          | `git status` clean after run                  |
| §7.3    | green→red→green, no vacuous detection                     | 12          | baseline_exit≠0 invalidates                   |
| §8.2    | model output cannot create authority                      | 18          | frozen-text assertion                         |
| §8.3    | privacy/egress bounds                                     | 18          | prefix-bound test                             |
| §9      | six historical steps                                      | 16          | per-step assertions                           |
| §10     | nine seam targets                                         | 17          | per-target expected outcomes                  |
| §12.1   | eleven release gates                                      | 19, 20, 21  | transition T1–T6                              |
| §12.3   | prior reproduce scripts stay green                        | 21          | full `check-e2e.sh`                           |
| §12.4   | no raw codes, symbolic only                               | 9           | numeric outcome rejected                      |
| §13     | nine non-claims                                           | 20          | limitations completeness                      |
| §14.1   | three F001 artefacts                                      | 13          | exit-status recorded                          |
| §14.2   | Q0 prohibitions                                           | 13          | workflow-unmodified assertion                 |
| §14.3   | 5Q proofs self-extending **and non-vacuous**              | 1, 18.1     | count floor: empty dir → exit 1               |
| §12.2   | Lean, zero `sorry`                                        | 18.1        | `leanProofBinding` escape scan                |
| §12.2   | K7 net over 5Q's own code                                 | 18.2        | dynamic enumeration; dead exports fail        |
| §12.2   | parity where claimed                                      | 18.3        | Node ≡ Python ≡ browser on shared vectors     |
| §12.3   | 5Q reproduce script                                       | 18.4        | `if/then/else` gates, never `cmd && echo`     |
| §2.1 A1 | root R8 admits stage-5 unit gates                         | 1.5         | member count rises; named members present     |
| A2      | closure/discharge split                                   | 8, 19       | overlay row for uncommitted member rejected   |
| A3      | historical closure precommitted                           | 7.6, 16     | enumeration runs no attack pack               |
| A4      | obligation cell ledger                                    | 7.7, 19     | undischarged cell blocks member attacked_pass |
| A4.3    | member status derived, never written                      | 19          | direct status write rejected                  |
| §2.2    | `verifier_branch` per `reject()` site                     | 2           | per-branch emission test                      |
| §2.2    | `imported_dependency` present, unobligated                | 2           | marked-not-absent test                        |
| §2.2    | `historical_function`                                     | 16          | tag records only, never head closure          |
| §2.5    | `succession_hint` + its honest limit                      | 2           | rename+reformat produces NO hint              |
| §14.6   | escalation mints new finding                              | 10, 13      | severity immutability                         |

---

# Matrix 2 — artifact provenance

Every published Q0 field maps to a producer, inputs, canonicaliser, digest, verifier and **negative
witness**. A field that merely "comes from the harness" fails review — the harness is a machine, not
an oracle.

| Published field                      | Producer | Source inputs                        | Canonicaliser             | Digest                      | Verifier                 | Negative witness                    |
| ------------------------------------ | -------- | ------------------------------------ | ------------------------- | --------------------------- | ------------------------ | ----------------------------------- |
| `function_closure_digest`            | T8       | static+runtime+gate censuses, roles  | canonical member ordering | `simurgh.vsr.closure.v1`    | `commitClosure --verify` | remove one member → digest moves    |
| `release_tag_closure_digest`         | T8       | 16 `(tag, sha)` pairs                | sorted tag list           | `simurgh.vsr.tags.v1`       | tag existence check      | 17th tag rejected                   |
| `attack_taxonomy_digest`             | T8       | spec §4.1 frozen table               | frozen order R1–R16       | `simurgh.vsr.taxonomy.v1`   | constants test           | reordered table → digest moves      |
| `q0_finding_ledger_digest`           | T10      | appended findings                    | chain order               | `simurgh.vsr.ledger.v1`     | `verifyChain`            | tampered middle record detected     |
| `mutation_receipt_root`              | T12      | 16 receipts                          | receipt canonical form    | `simurgh.vsr.mutation.v1`   | receipt validator        | green→green receipt rejected        |
| `attack_pack_root`                   | T9,T14   | pack definitions + premises          | pack canonical form       | `simurgh.vsr.pack.v1`       | `validateAttackPack`     | pack without premise inadmissible   |
| `coverage_discharge_root`            | T19      | statuses over closure                | member order              | `simurgh.vsr.coverage.v1`   | coverage ledger          | unstatused member fails             |
| `tray.*.finding_ids`                 | T14.N    | pack results                         | tray canonical form       | tray digest                 | tray schema test         | invented target id rejected         |
| `F001.*`                             | T13      | filesystem, workflow, `lean` exits   | artefact canonical form   | finding digest              | F001 capture test        | `discovered_by`=harness rejected    |
| `tag.*.outcome`                      | T16      | worktree runs                        | outcome enum              | campaign digest             | campaign test            | unreproducible ≠ pass               |
| `tray.*.positive_path_result`        | T14.N    | stage reproduce script under Node 26 | outcome enum              | tray digest                 | tray schema test         | `reproduced_with_diff` is a finding |
| `lean_theorem_set`                   | T18.1    | `proofs/stage5q/Vsr.lean`            | Lean source bytes         | source-span digest          | `leanProofBinding`       | a `sorry` fails the scan            |
| `parity_vector_result`               | T18.3    | shared vectors                       | canonical JSON            | vector digest               | `crossRuntimeParity`     | one diverged rule fails all three   |
| `historical_function_closure_digest` | T7.6     | tag worktrees                        | canonical member ordering | `simurgh.vsr.historical.v1` | inventory test           | member absent at T16 is a finding   |
| `obligation_matrix_root`             | T7.7     | closure × taxonomy                   | canonical cell ordering   | `simurgh.vsr.obligation.v1` | `obligations` test       | ab/c vs a/bc collision test         |
| `closure_member_commitment_digest`   | T8       | censuses, roles, edges               | canonical member ordering | `simurgh.vsr.closure.v1`    | `commitClosure --verify` | remove one member → digest moves    |

---

# Execution notes

- **Stop after Task 8 and report.** The universe commitment is the point of no return for L2; the
  closure boundary deserves a look before falcons are released against it.
- **Stop after Task 12 and report.** If any mutant went undetected, that is the most valuable
  single output of Wave II and needs a decision, not a quiet fix.
- Every task: failing test → watch it fail → minimal implementation → green → `format:check` → one
  focused commit. Read the plan critically first and raise concerns as **one batched question**
  before Task 1.
- `npm test` after every task; `scripts/check-e2e.sh` before Task 20.
- **Never loosen a check to make evidence pass.** Fix the fixture or fix the doc.
