# Stage 5S — VWQ implementation plan

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

Revision 2.1, after gauntlet rounds 2 (§13) and 3 (§14). Both rounds returned **FAIL WITH BLOCKERS**;
every blocker from both is applied below.

## §0 The contract this plan is written against

Task 0 lands as **two commits**, because one cannot work: recording a commit's own hash inside that
commit changes the hash again. Commit 0a carries the authority; commit 0b records what 0a produced.
Until 0b lands, the digest below is the pre-amendment one and the pin test is expected to fail —
that expected failure is Task 0's own first witness.

```text
spec                docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md
pre_task0_commit    76c469a0    §§1-7 frozen
pre_task0_digest    3357a92529063d7c21d251c411bce41e1b1b84be11f1ddcbc0c91337391f025f
pre_task0_bytes     65753

post_task0_commit   a21103e7e3503d5c3b6b620bc70c4836060b122f   commit 0a; Annex S added at Task 2
post_task0_digest   17844fff6ecc88a5e9a6ee34c7240da60a1e050b8c82c9eab2972bfd24383b9e
post_task0_bytes    81952                    re-pinned at Task 36: Annex S rows 5S-S016/S017, Annex M withdrawal note
frozen_range_digest e0d25ce115d0b945175ccff5fcadebcd017ea47af02a8f2a9b249364132b83ec
frozen_range_bytes  64240                    §§1-7, UNMOVED from 76c469a0 — see Annex M.5
spec_domain         simurgh.vwq.full-spec.v1

recompute           shasum -a 256 docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md
gate                node --test tests/unit/llmShield/stage5s/specPin.test.js     (built by Task 1)
```

§§1–7 are untouched by Task 0, and that is recorded as a digest rather than a promise: the frozen
range hashes to `e0d25ce1…` over 64240 bytes at both `76c469a0` and commit 0a. Task 1 recomputes
**both** digests, because a whole-file digest alone cannot distinguish "an annex was added" from "an
annex was added and a frozen section was quietly reworded" (Annex M.5). The amendment is confined to
the unnumbered header table and the new Annex M, both outside the freeze — the shape 5Q's Annex A5
used.

### Predecessor pins, each verified at plan time rather than remembered

```text
5R tag                v2.53.0-stage-5r-vpf, main c82613f3
branch baseline       main 7a9bd5d4 — after Q1-F001, Annex A5, gate-lifecycle doctrine and its fix
C1 commitment source  tools/simurgh-attestation/stage5r/core/commitment.mjs
raw band predecessor  tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs
                      VSI_AMENDMENT_FROM = 473, VSI_ALLOCATED_HI = 474  → 475 is genuinely free
lean floor            scripts/check-lean-proofs.mjs DEFAULT_FLOOR = 38 → becomes 39 at Task 26
closeout precedent    git ls-tree v2.53.0-stage-5r-vpf shows STAGE_5R_CLOSEOUT.md INSIDE the tag;
                      the tag follows closeout, and revision 1 had this backwards
browser precedent     5O runs the portable module under Node 26 WebCrypto in CI and keeps a real
                      headless-browser run in the browser/ HTML runner — two different claims
Node                  /opt/homebrew/opt/node@26/bin   (4H digest builder is byte-stable ONLY here)
prettier              repo-local; validate with `npm run format:check`, NEVER a hand-picked
                      `npx prettier --check <glob>` — a subset missed a browser HTML file and
                      reddened 4V round 1 (gotcha ledger, Formatting)
```

---

## §1 Scope and the rulings this plan makes

The whole of 5S: the artifact algebra, the comparison relation, **all three lanes**, every declared
gate, four-runtime parity, five Lean theorems, the acceptance matrix, attestation, reproduce,
closeout and release.

**Ruling 1 — the allocator is a table, never arithmetic.** 5P's allocator carries the reason in its
own header: an offset map "silently re-numbers every later row the moment one is inserted, which is
exactly the ripple that reddened CI on 4R and 4S." 5S has 38 codes, the largest band this repo has
allocated at once. No `475 + index`.

**Ruling 2 — the core is pure, and purity means no I/O at all.** `core/` reads no file, spawns
nothing, reads no clock and no environment. Anything that must read bytes is a loader in `node/` that
hands bytes to a pure validator. Revision 1 broke this in its own inheritance task (§13, B2).

**Ruling 3 — one status, one function, one test file.** Five status functions therefore mean five
test files, not one. Revision 1 wrote five functions into a single file while quoting the ruling that
forbids it (§13, E2).

**Ruling 4 — the expected answers are oracle-free.** The fixture builder may not import `verify`,
`status` or the finding derivation. A corpus whose expected column was computed by the verifier tests
whether the verifier agrees with itself. An import-boundary test enforces this.

**Ruling 5 — a gate ships only with a recorded RED state, over a declared gate universe.** §11 names
every gate, including the ones that are gate-shaped but sat outside G1–G10. The RED sweep is the last
gate-related task in the plan.

**Ruling 6 — one obligation, one owning task**, reinforcement listed separately.

**Ruling 7 — authority is read, never declared in the same commit it judges.** `core/writeSurface.mjs`
parses the surface from the frozen spec and Annex M. It does not invent permissions. Two copies of a
declaration are two chances to disagree, and the one that disagrees silently is the one nobody looks
at.

**Ruling 8 — a quorum shortfall is a STATUS; 496 is for a quorum that was CLAIMED.** Raised during
Task 16, because the ordered evaluator is the first code that has to decide it. §2.5's own worked
example returns `"ok": true` with `quorum_status: {a: witnessed_quorum, b: quorum_incomplete}` over a
detected fork, and says that "reaching `QUORUM_BELOW_POLICY` first would have violated No Two Compared
Histories inside the stage that declares it" — so a short witness set cannot be a refusal. But §2.7
allocates 496 and §5.6 requires every code reachable at its frozen position, so it has to fire
somewhere real. It fires on a **claim**: a bundle presenting a quorum certificate that asserts the
committed threshold is met, over a tally that does not meet it, is family 5's counterfeit quorum and
takes 496. A bundle that is simply short, and says so, carries `quorum_incomplete` and continues.
Claims are checked, never believed; silence is not a claim. This also keeps the lanes genuinely
independent — the exit code never depends on what the comparison lane found.

**Ruling 9 — an accusation requires two producer-authenticated checkpoints.** The `⟂` lane split means
a WITNESS-lane refusal never suppresses a finding. It does not mean an unauthenticated checkpoint
still produces one. A structural or `checkpoint+producer` refusal — an unsigned checkpoint, a
stranger's signature, an unbound C1 root, a foreign protocol version — means the stage never
established what it would be accusing anybody of, so the comparison is `comparison_unavailable`, no
artifact is minted, and no finding is recorded. The first draft of `core/verify.mjs` minted artifacts
over all of these; the **authored** acceptance columns of Task 18 caught it in eleven cases. A
computed matrix would have agreed with the bug.

---

## §2 Global constraints — binding on every task, copied from the spec

```text
raw band            475-512, exactly 38 codes, allocation frozen (spec §2.7)
                    512 VWQ_UNKNOWN is LAST — the fail-closed wrapper
                    VWQ_EQUIVOCATION_DETECTED consumes NO raw code; it is a finding id, exit 0
check order         structural → checkpoint+producer → witness policy → witness identity →
                    laundering → replay → quorum ⟂ comparison policy → receiver → comparison
                    → claim gate → wrapper                     (⟂ = the two lanes are independent)
fork coordinate     (producer_identity, scope_id, epoch)
digests             checkpoint_body_digest    excludes signature material  → COMPATIBILITY
                    checkpoint_envelope_digest includes it                 → witnesses, receipts
same_checkpoint     BODY digests equal — never envelope equality (spec §2.4)
compatibility       SAME CHECKPOINT | INCOMPATIBLE | COMPATIBLE | INDETERMINATE
indeterminate       ancestry unprovable from committed inputs — ok:true, a fourth outcome
509                 ancestry proof MALFORMED or falsely derived — a refusal, never indeterminate
artifacts           9 (spec §2.1)
anchors             ZERO witness weight; an anchor in the witness lane exits 489
independence        never inferred; typed; same_operator_distinct_key ⇒ independence_unproven
clean requires      distinct_committed_receivers >= 2, over authenticated receipt provenance
theorem set         5, pinned as a SET (spec §6.4 G8); lean floor 38 → 39
pins                every pin is a SET, never a count (Q1-F002)
anti-vacuity        an empty evaluated range with a dirty tree is a REFUSAL (Q1-F004)
CI trigger          paths:-scoped to 5S-owned files, and the scoping is itself tested (Q1-F005)
goldens ripple      three Stage 4H paths, authorised ONLY by Annex M (Task 0), rebuilt under Node 26
unknown probe       UNKNOWN_RAW_PROBE (999), never a hardcoded free value
evidence dir        docs/research/llm-shield/evidence/stage-5s/ — prior stages' reproduce scripts
                    must stay green over it (the 5Q/5R path collision, Task 3)
release order       closeout INSIDE the tag, verified against 5R's tree; gh release create is named
never               git add -A after check.sh; it commits the banking fixture and .pyc
```

---

## §3 Plan-quality gates — run before Task 0 and after the last task

1. every spec obligation has exactly one **owning** task (Matrix 2, §12), reinforcement listed apart;
2. every declared gate (§11) has a building task and a red-proving task, and the red-proving task
   number is **greater than** every building task number;
3. no task says "TBD", "similar to Task N", or "add appropriate error handling";
4. **every task names an exact proving command** — no task may prove itself with prose;
5. no task consumes an artifact, or an authority, produced by a later task.

Gates 4 and 5 are the two revision 1 failed. Gate 5 now covers **authority**, not just artifacts:
Task 5's golden ripple was forbidden by Task 2's own surface until Annex M existed (§13, B1).

---

## §4 Wave 0 — authority

### Task 0 — the spec amendment, Annex M, and the re-pin

Three edits, all outside frozen §§1–7:

1. header table: `VSI_RESERVED_FROM` → `VSI_AMENDMENT_FROM = 473` / `VSI_ALLOCATED_HI = 474`, the
   symbols that exist;
2. **Annex M — the additive-ripple surface.** Exactly three paths, operation `modify`, purpose
   "additive raw-band ripple required by §2.10", authorising section §2.10:

```text
tests/fixtures/llmShield/stage4h/expected-results/exit-map.json
docs/research/llm-shield/evidence/stage-4h/exit-map.json
tests/unit/llmShield/stage4h/exitWrapper.test.js
```

3. then, as a **separate commit 0b**, write commit 0a's hash, the resulting digest and the byte
   count into this plan's §0.

Annex M exists because §2.10 already _creates_ the obligation to ripple those three files while §6.2
refuses prior-stage evidence. Revision 1 shipped that contradiction unresolved. The annex authorises
three named paths under one named operation for one named purpose — not a category.

Proves:

```bash
bash -euo pipefail -c '
  AUTH="$(git log --format=%H -1 -- docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md)"
  grep -q "$AUTH" docs/superpowers/plans/2026-07-29-stage-5s-vwq-implementation-plan.md
  D="$(shasum -a 256 docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md | cut -d" " -f1)"
  grep -q "$D" docs/superpowers/plans/2026-07-29-stage-5s-vwq-implementation-plan.md
'
```

exits 0, and `git log --oneline -2` shows 0b on top of 0a.

---

## §5 Wave 1 — pins, surface, algebra

### Task 1 — the spec pin

`tests/unit/llmShield/stage5s/specPin.test.js` recomputes the digest and asserts §0's post-Task-0
value. Test first against a mutated copy, watch it fail, then against the real file.

Proves: `node --test tests/unit/llmShield/stage5s/specPin.test.js`

### Task 2 — the write surface, parsed from the spec

`core/writeSurface.mjs` **parses** the §6.2 surface and Annex M out of the spec text (Ruling 7) and
judges changed paths purely. `node/checkWriteSurface.mjs` is the driver that asks git what changed.

Failing tests first — `tests/unit/llmShield/stage5s/writeSurface.test.js`:

- the surface is parsed, not re-declared: mutating the spec text changes the parsed surface;
- parsing is bounded to Annex M's own section — a table elsewhere is not its authority;
- a path outside the surface is refused;
- a permitted path under an unpermitted operation is refused;
- an empty changed set with a dirty tree → `uncommitted_changes_not_evaluated`;
- a prior-stage evidence path **not** in Annex M is refused;
- the three Annex M paths are permitted under `modify` and refused under `add`;
- a private-key path is refused by **regex on path**, never by digit-bearing filename (5P).

Proves: `node --test tests/unit/llmShield/stage5s/writeSurface.test.js`

### Task 3 — evidence directory, `.prettierignore`, prior-reproduce sanity

Create `docs/research/llm-shield/evidence/stage-5s/`; add it and
`tools/simurgh-attestation/stage5s/fixtures/` to `.prettierignore` (4K); then run 5Q's and 5R's
reproduce scripts to prove the new path does not disturb their `git status --porcelain` gates —
adding files under an evidence tree broke 5R once and forced Q1's artifacts into a sibling.

The script names are the repo's, verified rather than guessed: the family is
`scripts/reproduce-llm-shield-stage<id>.sh`, **not** `reproduce-stage-<id>.sh`. Revision 2 named four
files that do not exist.

Chaining with `;` returns only the last status, so 5Q could fail while 5R passes and the task would
report success.

**Corrected during execution — see finding 5S-F001 (§15).** Running a prior stage's reproduce script
from a successor branch does not test what it appears to test. 5Q's gate 2 diffs `MERGE_BASE..HEAD`
against a surface that knows nothing about Stage 5S, so it refuses every 5S file — and it refuses
them on any successor branch, forever. That is the gate-lifecycle species again, fourth occurrence.

A prior stage's reproduce script verifies **that stage's sealed evidence**, and its subject is main,
not this branch. It is therefore run on main at Task 38. What a feature branch can honestly check is
the narrower property Task 3 actually needs: that 5S's added paths lie outside every prior stage's
evidence tree, which is the collision that forced Q1's artifacts into a sibling directory.

Proves:

```bash
bash -euo pipefail -c '
  node --test tests/unit/llmShield/stage5s/evidencePathIsolation.test.js
  npm run format:check
'
```

### Task 4 — inheritance: a loader in `node/`, a pure validator in `core/`

```text
node/loadInheritedRoots.mjs   reads 5R's C1 artifact; binds source path, source commit, source digest
core/inherit.mjs              accepts bytes and digests as arguments; validates purely
```

Roots before signatures, as 5R itself does, so a signature check never masks a root mismatch.

Tests: `core/inherit.mjs` source contains no `node:fs` import; a C1 digest mismatch is refused
**before** any signature verification, asserted by a spy recording call order.

Proves: `node --test tests/unit/llmShield/stage5s/inherit.test.js`

### Task 5 — the raw-code allocator, as a frozen table, plus the Annex M ripple

`core/rawCodeAllocator.mjs`: `VWQ_CLOSED_BAND` (38 frozen `{check_id, policy_outcome, raw_code}`
rows), `VWQ_BAND_LO = 475`, `VWQ_BAND_HI = 512`.

Tests: exactly 38 rows whose codes are the contiguous set 475…512, computed as a set difference with
`added`/`removed` printed separately; the module source contains no `475 +` and no `BAND_LO +`; 512 is
`VWQ_UNKNOWN` and last; `VWQ_EQUIVOCATION_DETECTED` is **absent** from the band; every code reachable
from exactly one `check_id`; `VWQ_BAND_LO === VSI_ALLOCATED_HI + 1`, imported from 5P.

Then ripple the three Annex M goldens **in this task**, under Node 26, and run 4H's suite.

Proves:

```bash
bash -euo pipefail -c '
  node --test tests/unit/llmShield/stage5s/rawCodeAllocator.test.js tests/unit/llmShield/stage4h/exitWrapper.test.js
  BASE="$(git merge-base origin/main HEAD)"
  node tools/simurgh-attestation/stage5s/node/checkWriteSurface.mjs --range "${BASE}..HEAD"
'
```

### Task 6 — canonicalisation and the two digests

`core/canonical.mjs`: `canonicalJson`, `checkpointBodyDigest`, `checkpointEnvelopeDigest`.

Body excludes `producer_signature` and every signature-bearing field; envelope includes them. The
load-bearing test: two checkpoints differing **only** in signature bytes share a body digest and
differ in envelope digest.

Not tested, because it is not testable: that differing bodies can never share a digest. That is
collision resistance, and it is an **assumption** (spec §5.2 item 1), recorded as one rather than
dressed as a passing test (§13, E7).

Decimals are strings; `canonicalJson` throws on BigInt (4Z).

Proves: `node --test tests/unit/llmShield/stage5s/canonical.test.js`

### Task 7 — the nine artifact schemas

`core/artifacts.mjs`: one validator per artifact of §2.1, each returning a typed refusal rather than
throwing. Schema failures map to 475/476 only.

Test: each of the nine constructs, validates and rejects a mutated form; `receiver_unavailable_status`
validates as an authenticated statement of absence carrying no view payload.

Proves: `node --test tests/unit/llmShield/stage5s/artifacts.test.js`

### Task 8 — the two policy blocks and the two disjoint taxonomies

`core/policy.mjs`: `witness_quorum_policy` and `external_corroboration_policy` as separate validated
types (§3.3). `core/classes.mjs`: `WITNESS_OPERATOR_CLASS` and `EXTERNAL_ANCHOR_CLASS` as two frozen
enumerations whose intersection is empty, asserted by a set-intersection test.

Policy validation **returns validity only**. Deriving `external_corroboration_status` here would
couple a status to a validator, which Ruling 3 forbids; the status is computed in Task 13 (§13, E6).

Proves: `node --test tests/unit/llmShield/stage5s/policy.test.js tests/unit/llmShield/stage5s/classes.test.js`

---

## §6 Wave 2 — the relation

### Task 9 — the compatibility relation, over BODY digests

`core/compatibility.mjs`: `compare(viewA, viewB)` →
`same_checkpoint | incompatible | compatible | indeterminate`.

The corrected load-bearing test (§13, B3):

```text
body_digest_a == body_digest_b
envelope_digest_a != envelope_digest_b     two valid but different signature envelopes
result == same_checkpoint
```

The relation must never depend on signature determinism. Remaining tests: same coordinate with
differing bodies → `incompatible`; valid transitive ancestry → `compatible`; ancestry unprovable from
committed inputs → `indeterminate`; a `policy_digest` or `protocol_version` change does not move the
fork coordinate; **§7.3** one `history_root` under two document projections → `compatible`; **§7.3** a
document projection in a checkpoint slot → refused at 475, never compared.

Proves: `node --test tests/unit/llmShield/stage5s/compatibility.test.js`

### Task 10 — ancestry, with malformed and incomplete kept apart

`core/ancestry.mjs`. Two outcome classes, never blended (§13, B4):

```text
missing link, insufficient committed material   → ok:true,  comparison_indeterminate
cycle, contradictory links, false derivation    → refusal,  509 ANCESTRY_PROOF_INVALID
```

Tests: a self-referencing predecessor and a two-node loop both take 509, not indeterminate; a chain
short one committed link is indeterminate with `ok:true`; `allow_epoch_gaps` and authorised transition
records behave as committed.

Proves: `node --test tests/unit/llmShield/stage5s/ancestry.test.js`

### Task 11 — quorum arithmetic and laundering collapse

`core/quorum.mjs`. Producer exclusion happens **before** alias/duplicate collapse, so a producer
wearing two aliases cannot consume two collapse slots and survive as one witness.

Tests: self-witness → 491; alias → 492; duplicate → 493; cross-epoch replay → 494; cross-scope → 495;
below threshold → 496; **an external anchor identity → 489**, the machine-checked form of §3.1.

Proves: `node --test tests/unit/llmShield/stage5s/quorum.test.js`

### Task 12 — the receiver lane and intake tiers

`core/receivers.mjs`: roster authority, receipt authentication, collapse over **authenticated
provenance rather than array position**, `intake_complete` for both tiers.

Corrected mapping (§13, E5): a receipt whose signature is cryptographically valid but bound to the
**wrong comparison policy** is not a signature failure — it takes **499
`COMPARISON_POLICY_DIGEST_MISMATCH`**, with both digests printed. 502 is reserved for a signature that
does not verify.

Other tests: invented receiver → 501; aliased → 503; duplicate → 504; unverifiable signature → 502;
all responded → `intake_complete: true`; one signed unavailable → still true; one silent → false. An
unavailable status contributes no view, no quorum weight, no corroboration.

Proves: `node --test tests/unit/llmShield/stage5s/receivers.test.js`

### Task 13 — five status functions, five test files

`core/status.mjs` exporting `quorumStatusOf`, `comparisonStatusOf`, `witnessIndependenceStatusOf`,
`externalCorroborationStatusOf`, `equivocationArtifactStatusOf` — with
`tests/unit/llmShield/stage5s/status.{quorum,comparison,independence,corroboration,artifact}.test.js`.
One status, one function, one file (Ruling 3).

`status.comparison.test.js` **owns** the quorum cross-product: met/met, met/incomplete,
incomplete/met, incomplete/incomplete all yield `equivocation_detected`, as four separate assertions
with four case ids exported for reuse. Task 18 reinforces them at the matrix layer by importing those
ids rather than retyping them (§13, E3).

`status.independence.test.js` asserts that a satisfied `external_corroboration_status` never changes
`witness_independence_status`.

Proves: `node --test "tests/unit/llmShield/stage5s/status.*.test.js"`

### Task 14 — the equivocation artifact and its self-verification

`core/equivocation.mjs`: derive, and verify a stranger's artifact without our keys. Falsely derived
artifact → 510; falsely derived ancestry proof → 509; correctly derived finding → exit **0**.

Proves: `node --test tests/unit/llmShield/stage5s/equivocation.test.js`

### Task 15 — the finding ledger

`core/findings.mjs` and `node/buildFindingLedger.mjs`. `VWQ_EQUIVOCATION_DETECTED` lives here, not in
the raw band, and the ledger is what makes exit 0 auditable: expected outcome, actual outcome, the
compared roots, the typed artifact status.

Proves: `node --test tests/unit/llmShield/stage5s/findings.test.js`

### Task 16 — the ordered evaluator, and the pinned check-order sequence

`core/verify.mjs` runs the §2.8 order and returns the first failure plus the five statuses. The lane
split is real: comparison is evaluated even when quorum fails.

Export `CHECK_ORDER` as a frozen ordered array of `check_id`, pinned by a test as a **sequence**, so
reordering two checks is caught here even before the fixture net of Task 19.

Tests here use hand-built minimal inputs, six representative double-defect pairs spanning the order.
The exhaustive adjacent-pair net is Task 19, after the builder exists.

Proves: `node --test tests/unit/llmShield/stage5s/verify.test.js`

---

## §7 Wave 3 — corpus, order net, matrix

### Task 17 — the fixture builder, oracle-free

`node/buildFixtures.mjs` generates every Lane A fixture deterministically from committed seeds. No
clock, no randomness.

Ruling 4 is enforced mechanically: an import-boundary test asserts the builder's module graph
contains none of `core/verify.mjs`, `core/status.mjs`, `core/findings.mjs`. Expected columns are
authored, not computed.

Proves:
`node tools/simurgh-attestation/stage5s/node/buildFixtures.mjs --out /tmp/f1 && node tools/simurgh-attestation/stage5s/node/buildFixtures.mjs --out /tmp/f2 && diff -r /tmp/f1 /tmp/f2`
exits 0, and `node --test tests/unit/llmShield/stage5s/fixtureOracle.test.js`

### Task 18 — Lane A families 1–8, and the all-codes sweep

Eight families of §5.5 plus the two additive §7.3 cases, each row carrying all eleven acceptance
columns and the **named adversary win it denies**. A case denying no named win fails the builder.

Then: for each of the 38 codes, a fixture reaches exactly that code and no earlier one.

Proves: `node --test tests/e2e/llmShield/stage5s/laneA.test.js`

### Task 19 — the adjacent-pair first-failure net

Reachability proves a code exists; it does not prove a **total order**. A verifier could swap two
untested checks and pass everything in Task 18 (§13, B6).

Generate the **37 adjacent double-defect cases**: for each `i`, a bundle defective at `check_i` and
`check_i+1` must report `check_i`. Plus the six spanning pairs of Task 16, retained as regression.

Proves: `node --test tests/e2e/llmShield/stage5s/checkOrderNet.test.js`

### Task 20 — the acceptance matrix, pinned twice

Identity pinning alone lets a row's meaning drift while its id holds (§13, B5). Two independent
commitments:

1. the exact `case_id` set — `added` and `removed` computed and printed separately;
2. a canonical digest over every expected semantic row, with **field-level** drift reported: which
   case, which column, from what to what.

Sorting is plain code-unit comparison, never `localeCompare` (the Q1 `::`/`-` disagreement).

Proves: `node --test tests/unit/llmShield/stage5s/acceptanceMatrix.test.js`

### Task 21 — the tamper matrix, set-pinned with an explicit census

Every artifact × field class: digest swap, signature swap, roster swap, coordinate swap,
projection-in-checkpoint-slot. The census is pinned as a **set of `{artifact, field_class}` pairs**
with a required first-failure code each, so a silently dropped tamper case is a refusal (§13, E8).

Proves: `node --test tests/e2e/llmShield/stage5s/tamper.test.js`

---

## §8 Wave 4 — lanes

### Task 22 — Lane B, with deterministic keys

Revision 1 called the ceremony deterministic while generating random keys, so no two runs could match
(§13, B7). Keys are **derived from committed test seeds, domain-separated by role and case id**, and
are marked fixture-only: a test asserts no ceremony key path is accepted by the attestation signer
policy of Task 30.

`node/ceremony/` — producer, witness, receiver, comparator as separate processes, each emitting an
input manifest the parent asserts against that role's declared protocol inputs.

Asserted: distinct PIDs; **each role is passed only its declared key path** — the narrowed claim,
since separate directories do not prove a process could not read another's; manifest equality;
`independence_unproven: true`; and two complete runs byte-identical.

**Not asserted:** covert-channel freedom (spec §3.8). Ports, if bound, come from the reserved CI range
(3V-A's `EADDRINUSE`).

Proves: `node --test tests/e2e/llmShield/stage5s/laneB.test.js`

### Task 23 — the positive and negative controls

Deliberate producer equivocation at one fork coordinate, both views reaching committed receivers,
artifact required. Negative control: a normal epoch advance with valid ancestry → `compatible`.

The signed non-claim ships in the lane output: a self-inflicted equivocation demonstrates the
detector; it is not evidence about any provider and not an accusation.

Proves: `node --test tests/e2e/llmShield/stage5s/controls.test.js`

### Task 24 — Lane C acquisition, live and never CI-gated

Revision 1 verified a capture nothing produced (§13, B8). This task produces it: submit the checkpoint
envelope digest to the three ecology mechanisms, freeze each response under
`docs/research/llm-shield/evidence/stage-5s/lane-c/`, and record failures as typed outcomes rather
than retries. Both outcomes are sealed honestly — a refusal or an outage is recorded, never re-run
until it looks good.

Release semantics, frozen here: **no capture → typed `not_captured`, and no Lane C achievement is
claimed anywhere.** A capture present makes Task 25's offline verification mandatory.

Proves:
`node tools/simurgh-attestation/stage5s/node/captureLaneC.mjs --emit docs/research/llm-shield/evidence/stage-5s/lane-c/`
writes the capture or a typed `not_captured` record; the operator pastes the transcript into the
evidence directory.

### Task 25 — Lane C frozen-capture verification, offline

`node/verifyCapture.mjs` verifies the frozen capture offline against its committed envelope digest.

```text
capture_required                     = false
frozen_capture_verification_required = true      when a capture is present
```

An unverifiable capture is a refusal, never a skip; an absent capture is `not_captured`, never green.

Proves: `node --test tests/unit/llmShield/stage5s/capture.test.js`

---

## §9 Wave 5 — proofs, parity, claims, attestation, census

### Task 26 — the five Lean theorems, and the floor bump to 39

`proofs/stage5s/Vwq.lean` with the five names of §6.4 G8, zero `sorry`. Theorem names pinned as a
**set**, so a missing theorem is a set difference rather than a reader's job.

**Raise `DEFAULT_FLOOR` in `scripts/check-lean-proofs.mjs` from 38 to 39 in this task** (§13, B12).
Without the bump, deleting 5S's only proof later returns the repository to 38 and the count guard
stays green while directory coverage loses the directory entirely.

Proves: `node scripts/check-lean-proofs.mjs` and
`node --test tests/unit/llmShield/stage5s/theoremSet.test.js`

### Task 27 — the parity manifest, written before the mirrors

`core/parityManifest.mjs` listing the shared surface: canonicalisation, both digests, the compatibility
relation, ancestry, quorum arithmetic, typed status rendering.

Proves: `node --test tests/unit/llmShield/stage5s/parityManifest.test.js`

### Task 28 — the three mirrors, with the browser claim split honestly

Following 5O's precedent, which states the distinction in its own header:

- **CI lane:** `browser/vwq-portable.mjs` under Node 26 WebCrypto — the identical WHATWG API a
  browser exposes. This proves **API equivalence**, and is labelled as that, not as browser execution.
- **Captured lane:** a real headless-browser run of the same module via the `browser/` HTML runner,
  frozen as evidence under the Lane C-style capture rules — present or typed absent, never implied.
- `python/vwq_parity.py` and the portable Node path complete the four runtimes.

A runtime that fails to launch is a refusal, never a skip.

Proves: `node --test tests/e2e/llmShield/stage5s/parity.test.js` and
`node tools/simurgh-attestation/stage5s/browser/runHeadless.mjs --emit docs/research/llm-shield/evidence/stage-5s/browser/`

### Task 29 — the claim and non-claim set (G9), before anything binds it

Code 511 over the set-pinned 5S claim surfaces of §2.9, and the **signed non-claim id set** as a
frozen list. Every banned phrase has a positive fixture proving the gate goes red, including
**"expensive"** and global non-equivocation language. The surface set is proved non-empty — an empty
scan is a refusal.

Placed before attestation because attestation binds this set; revision 1 had them reversed and still
claimed the reinforcement (§13, B9).

Proves: `node --test tests/unit/llmShield/stage5s/claimGate.test.js`

### Task 30 — attestation, two tiers, binding a map rather than a certificate

A singular `quorum_certificate` root cannot represent two compared checkpoints or the four
met/incomplete combinations (§13, B9). The root binds:

```text
compared checkpoint envelope digest SET
per-view quorum_status MAP, keyed by checkpoint envelope digest
witness policy digest, comparison policy digest
comparison manifest digest
receipt / unavailable-status root
comparison_status
intake_complete
witness_independence_status
external_corroboration_status  + Lane C capture state
finding-ledger digest
typed equivocation_artifact_status
exact signed non-claim ID set              (from Task 29)
declared witness class mix
Lane B environment sentence
C1 binding                                 (from Task 4)
```

Signer: `~/.simurgh/5s-ed25519.pem`, never committed. The artifacts, named rather than gestured at:

```text
docs/research/llm-shield/evidence/stage-5s/attestation/vwq-attestation.json
docs/research/llm-shield/evidence/stage-5s/attestation/vwq-attestation-envelope.json
docs/research/llm-shield/evidence/stage-5s/attestation/vwq-public-key.pem
docs/research/llm-shield/evidence/stage-5s/attestation/vwq-key-fingerprint.txt
tools/simurgh-attestation/verify-stage5s-attestation.mjs
```

The verifier **refuses** `--key`.

Proves:

```bash
bash -euo pipefail -c '
  node --test tests/e2e/llmShield/stage5s/attestation.test.js
  B=docs/research/llm-shield/evidence/stage-5s/attestation/vwq-attestation-envelope.json
  node tools/simurgh-attestation/verify-stage5s-attestation.mjs --bundle "$B"
  node tools/simurgh-attestation/verify-stage5s-attestation.mjs --bundle "$B" --key ~/.simurgh/5s-ed25519.pem && exit 1
  sed "s/witnessed_quorum/witnessed_quoruM/" "$B" > /tmp/tampered.json
  node tools/simurgh-attestation/verify-stage5s-attestation.mjs --bundle /tmp/tampered.json && exit 1
  exit 0
'
```

### Task 31 — CI workflow and its trigger self-test

`.github/workflows/stage-5s-checks.yml`, `paths:`-scoped, with the four self-test assertions of §6.5,
including that the workflow file itself triggers.

Proves: `node --test tests/unit/llmShield/stage5s/triggerScope.test.js`

### Task 32 — the gate census, comparing lifecycle VALUES

Each gate module exports a frozen `LIFECYCLE` object in its own file (§4.6).
`node/checkGateCensus.mjs` builds the set-pinned index of §6.1 and — the correction — compares each
complete object **field by field against a frozen authority**, reporting field-level drift. Six
present-but-meaningless strings passed revision 1's presence check (§13, B11).

Proves: `node --test tests/unit/llmShield/stage5s/gateCensus.test.js`

### Task 33 — K7-A all-functions net

Obligations enumerate **symbols**, not files, with the eight columns of §6.3. Every discovered
in-scope symbol carries exactly one of `covered`, `excluded_with_signed_reason`,
`not_applicable_with_signed_reason`. No missing status, no "covered by suite". Adapters must genuinely
invoke — an import must not satisfy the census.

Placed before the RED sweep (Task 35) because K7-A is a declared gate in §11 and Ruling 5 applies
to it (§13, B10).

Proves: `node --test tests/e2e/llmShield/stage5s/k7AllFunctions.test.js`

### Task 34 — the reproduce script

`scripts/reproduce-llm-shield-stage5s.sh` — the repo's naming family, verified against the other 43 —
running every declared gate in order with a per-gate verdict. Under `set -e`, **never** `cmd && echo`:
it fails OPEN. Split the lines (5E's droplet lesson, which caught two fail-opens).

Built here, before the RED sweep, because the sweep red-proves G10 and G10 is not fully built until
this script exists. Revision 2 had the sweep at 34 and this at 35, breaking its own plan-quality
gate 2 (§14, R2).

Proves: `bash scripts/reproduce-llm-shield-stage5s.sh` exits 0 with every declared gate reporting.

---

## §10 Wave 6 — the sweep, closeout, release

### Task 35 — the RED sweep, over the declared gate universe

Every gate in §11 — G1–G10 plus the four gate-shaped checks revision 1 left outside the universe — is
driven to failure once by a **live seeded defect**, and the failure output recorded as evidence. Last
gate-related task in the plan, by construction, and now genuinely so.

Proves: `node --test tests/e2e/llmShield/stage5s/gateRedStates.test.js`

### Task 36 — the prior-reproduce sweep, self-enumerating and self-excluding

"Every prior reproduce script" must not be a list someone maintains (§13, E10). Three corrections
revision 2 needed here, all from checking the directory rather than assuming it:

1. the glob is `scripts/reproduce-llm-shield-stage*.sh` — revision 2's `reproduce-stage-*.sh` would
   have matched 4 scripts and missed 43;
2. seven scripts sit outside that family (`reproduce-stage4d.sh`, `reproduce-stage4d-to-4f.sh`,
   `reproduce-stage4e.sh`, `reproduce-stage4f.sh`, `reproduce-stage4g.sh`, `reproduce-vca-chain.sh`,
   `reproduce-on-droplet.sh`), so a glob alone is not a census — the **set pin is authority** and the
   glob is only how candidates are discovered;
3. `reproduce-llm-shield-stage5s.sh` is **excluded by name**: this stage's own script is not a prior
   script, and including it would make Task 36 re-run Task 34 under the label "prior" (§14, R5).

The runner pins the discovered set against a committed set and refuses on `added` or `removed`, so a
script that vanishes is a refusal rather than a silence. At plan time the prior set has 50 members:
43 in the `llm-shield` family plus the 7 outside it.

Then `check.sh`, which takes ~9–10 minutes: background one wait loop, never repeated foreground
sleeps.

Proves:

```bash
bash -euo pipefail -c '
  node --test tests/e2e/llmShield/stage5s/priorReproduceSet.test.js
  bash scripts/runAllPriorReproduce.sh
  bash scripts/check.sh
'
```

### Task 37 — closeout, inside the tag

Closeout doc with the honestly re-scored scorecard, README banner, north-star update — all committed
**before** the tag exists, matching what `git ls-tree v2.53.0-stage-5r-vpf` shows for 5R.

Proves: `node tools/simurgh-attestation/stage5s/node/checkCloseout.mjs` exits 0.

### Task 38 — merge, tag, release, verify

```text
PR → CI green → rebase-merge → reset local main to origin/main → reproduce ON MAIN
→ git tag v2.54.0-stage-5s-vwq → gh release create v2.54.0-stage-5s-vwq
→ verify tag, release and artifact digests
```

A tag is not a release (5C), so `gh release create` is named rather than implied, and
`gh release list` is diffed against `git tag`. Any fact that only exists after tagging goes into a
separately scoped release-receipt commit — the tagged stage is never silently mutated.

Memory write and Zurvan ingest close the task; search Zurvan for duplicates before ingesting.

Proves: `bash scripts/reproduce-llm-shield-stage5s.sh` on main exits 0;
`gh release view v2.54.0-stage-5s-vwq` succeeds; `git tag | grep 5s` and `gh release list | grep 5s`
agree.

---

## §11 The declared gate universe

Revision 1 applied Ruling 5 to G1–G10 while four other checks behaved as gates (§13, B10). The
universe is declared here and is what Task 35 sweeps.

| gate | what it protects                 | built by | red-proved by |
| ---- | -------------------------------- | -------- | ------------- |
| G1   | schema and raw band              | 5        | 35            |
| G2   | acceptance-matrix completeness   | 20       | 35            |
| G3   | artifact and binding integrity   | 7        | 21, 35        |
| G4   | Lane A deterministic net         | 17, 18   | 35            |
| G5   | Lane B ceremony                  | 22       | 35            |
| G6   | Lane C capture verification      | 24, 25   | 35            |
| G7   | runtime parity                   | 27, 28   | 35            |
| G8   | Lean proofs                      | 26       | 35            |
| G9   | claim and non-claim              | 29       | 35            |
| G10  | attestation and reproduction     | 30, 34   | 35            |
| G11  | spec pin                         | 1        | 35            |
| G12  | write surface                    | 2        | 35            |
| G13  | gate census and lifecycle values | 32       | 35            |
| G14  | K7-A all-functions net           | 33       | 35            |

Every red-proving number exceeds every building number, satisfying plan-quality gate 2.

## §12 Matrix 2 — spec obligation → owning task → reinforced by

| spec  | obligation                            | owner | reinforced by |
| ----- | ------------------------------------- | ----- | ------------- |
| §2.1  | nine artifacts                        | 7     | 21            |
| §2.4  | compatibility over BODY digests       | 9     | 18            |
| §2.5  | ancestry, malformed ≠ incomplete      | 10    | 19            |
| §2.7  | 38 raw codes + Annex M ripple         | 5     | 18            |
| §2.8  | frozen first-failure order            | 16    | 19            |
| §2.9  | claim-gate surface scope              | 29    | 35            |
| §2.10 | goldens ripple authority              | 0     | 5             |
| §3.1  | anchors carry zero witness weight     | 11    | 18            |
| §3.2  | four independent statuses             | 13    | 30            |
| §3.3  | two policy blocks                     | 8     | 30            |
| §3.4  | two disjoint taxonomies               | 8     | 35            |
| §3.6  | typed artifact absence                | 13    | 30            |
| §3.8  | Lane B tested vs design properties    | 22    | 35            |
| §3.9  | Lane C capture and verification       | 24    | 25            |
| §4.1  | five theorems, floor 39               | 26    | 35            |
| §4.2  | non-claims as an exact id set         | 29    | 30            |
| §4.6  | lifecycle fields adjacent, values     | 32    | 35            |
| §5.2  | collision resistance as an assumption | 6     | —             |
| §5.4  | acceptance matrix, pinned twice       | 20    | 35            |
| §5.5  | eight case families                   | 18    | 20            |
| §6.1  | gate census, set equality             | 32    | 35            |
| §6.2  | write surface, parsed from the spec   | 2     | 36            |
| §6.3  | K7-A by symbol                        | 33    | 36            |
| §6.5  | trigger self-test                     | 31    | 35            |
| §7.3  | a redaction is not a fork             | 9     | 18            |

## §13 Gauntlet round 2 — 13 blockers and 12 execution defects, all applied

Four claims were verified against the repository before adoption rather than accepted on assertion:
B3 against the frozen §2.4 text; B12 against `scripts/check-lean-proofs.mjs:20`; B13 against
`git ls-tree v2.53.0-stage-5r-vpf`, which shows `STAGE_5R_CLOSEOUT.md` inside the tag; and E9 against
5O's parity test header, which already distinguishes Node-WebCrypto API equivalence from a real
headless-browser run.

| id  | blocker                                                               | resolution                                                        |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| B1  | the golden ripple was forbidden by the plan's own write surface       | Task 0 Annex M: three exact paths, `modify`, purpose, authority   |
| B2  | `core/inherit.mjs` performed file I/O against Ruling 2                | loader in `node/`, pure validator in `core/` (Task 4)             |
| B3  | `same_checkpoint` tested on envelope, frozen relation says **body**   | corrected, with the two-envelope/one-body case as the anchor test |
| B4  | cycles typed as "indeterminate-with-refusal", blending two classes    | incomplete → `indeterminate` ok:true; malformed → 509 (Task 10)   |
| B5  | matrix pinned ids only, so a row's meaning could drift silently       | dual commitment + field-level drift; oracle-free builder (17, 20) |
| B6  | six sample pairs cannot prove a 38-entry total order                  | 37 adjacent double-defect cases + pinned `CHECK_ORDER` (16, 19)   |
| B7  | a "deterministic" ceremony generating random keys                     | seed-derived, role/case domain-separated keys; two runs identical |
| B8  | Lane C verified a capture that no task produced                       | Task 24 acquisition + Task 25 verification; typed `not_captured`  |
| B9  | attestation bound one certificate and preceded the claim set it cited | binds a map; Task 29 moved before Task 30                         |
| B10 | K7-A built after the sweep that claimed to red-prove every gate       | §11 gate universe declared; K7-A at 33, sweep at 34               |
| B11 | lifecycle fields checked for presence, not agreement                  | field-by-field comparison against a frozen authority (Task 32)    |
| B12 | the Lean floor stayed 38 after adding a 39th proof                    | Task 26 raises `DEFAULT_FLOOR` to 39                              |
| B13 | the tag preceded closeout, contrary to the repo's own tagged trees    | closeout at 37, tag + `gh release create` at 38                   |

| id  | execution defect                                             | resolution                                          |
| --- | ------------------------------------------------------------ | --------------------------------------------------- |
| E1  | "both lanes" where there are three                           | §1 corrected                                        |
| E2  | five status functions in one test file against Ruling 3      | five files (Task 13)                                |
| E3  | cross-product reinforcement attributed to the builder task   | attributed to Task 18, ids imported not retyped     |
| E4  | four tasks had no exact proving command                      | every task now names one; gate 4 restated           |
| E5  | wrong-policy receipt mapped to signature-invalid             | → 499 `COMPARISON_POLICY_DIGEST_MISMATCH` (Task 12) |
| E6  | corroboration status derived inside policy validation        | moved to Task 13                                    |
| E7  | "differing bodies never share a digest" claimed as testable  | recorded as assumption §5.2, not a test             |
| E8  | tamper corpus neither set-pinned nor censused                | `{artifact, field_class}` set pin (Task 21)         |
| E9  | Node import presented as browser parity                      | CI = API equivalence; real headless run captured    |
| E10 | "every prior reproduce script" was an unpinned phrase        | self-enumerating glob + set pin (Task 36)           |
| E11 | the spec correction would move the digest mid-implementation | Task 0, before the pin test exists                  |
| E12 | §12 said "seven structural, two editorial" over ten rows     | counts removed; the table is the census             |

## §15 Findings raised by Stage 5S against the repository

| id      | finding                                                                                                                                                                                      | status                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 5S-F001 | 5Q's §6.1 write-surface gate has no successor-stage behaviour: its range is `MERGE_BASE..HEAD` and its surface knows only 5Q, so it refuses every file of every later stage, on every branch | recorded; Task 3 rescoped, prior reproduce runs on main at Task 38  |
| 5S-F002 | §6.2 of the 5S spec declares the write-surface **schema** and its five conditions but enumerates no rows, so the surface it specifies has no members and refuses everything                  | fixed in-stage by Annex S, which instantiates what §6.2 specifies   |
| 5S-F003 | Annex S first declared the spec and plan `modify`; on the branch that introduces them they are `add`, and the checker refused them on its first real run                                     | declaration corrected, checker not loosened — recorded in Annex S.2 |

| 5S-F004 | both committed Stage 4H exit-map goldens are **11 codes stale**: `RUN_LEVEL_BY_RAW` carries 456 entries up to 474, the goldens carry 445 up to 463, and the gap is exactly 5P's band 464-474. No gate caught it across 5P, 5Q or 5R | recorded; the repair is larger than 5S's own ripple and needs a ruling |
| 5S-F005 | Annex M authorised the three goldens but **not** `tools/simurgh-attestation/stage4h/exitCodes.mjs`, the source that generates them. The ripple could not be performed under the authority written for it | RESOLVED by Annex M row 5S-M004, landed in its own authority commit before the file was touched |
| 5S-F006 | The Stage 5S write-surface driver had two fail-opens of the vacuous-green species: an unrecognised flag was ignored (so `--base origin/main` silently became `--staged`, examined zero paths, and printed OK), and every git call was wrapped in a swallow-and-return-`""` helper (so a bogus revision range produced zero changed paths, which violate nothing) | RESOLVED in Task 11: `parseArgs` refuses unknown arguments, git runs strict, and a third exit code separates **operator error (2)** from **refusal (1)** — nine driver tests, each seeded from one of the two failures |
| 5S-F007 | The suite reports `4850 tests / 4842 pass / 0 fail`, and the residue is **8 skipped, 0 todo, 0 cancelled**. All eight are Stage 5N tests over the REAL banked TSA/OTS ceremony proofs, guarded on `existsSync` against the absolute path `/Users/raoof.r12/Desktop/Raouf/test/stage5n-gate-capture` — a scratch directory outside the repository, absent both in CI and on the authoring machine today. The artifacts they would verify ARE committed, at `docs/research/llm-shield/evidence/stage-5n/real-laneb/` (`start.confirmed.ots`, `start.tsr`, `D_start.hex`…), under different filenames. So eight verifications of real Bitcoin and TSA evidence have been silently inert since the 5N ceremony, while the evidence sits committed a few directories away | RECORDED against Stage 5N, not 5S. Repair is a rewire to repo-relative paths plus the ceremony filename mapping, and it belongs to whoever owns 5N's gate — 5S must not edit 5N's tests under its own write surface. Until then the residue is declared here so "all tests pass" cannot hide it |

| 5S-F008 | `ARTIFACT_SCHEMAS.equivocation_artifact` still required `fork_coordinate` after Task 14 renamed the field to `comparison_coordinate_pair`, so `validateArtifact` refused every **valid** equivocation artifact as `SCHEMA_UNSUPPORTED` — a suppressed finding wearing a refusal's clothes. Each side was internally consistent and its own tests passed, so nothing saw it: no test had ever handed a REAL derived artifact to the validator | RESOLVED in Task 15: schema aligned, plus a **seam test** that derives a real artifact and validates it, and a subset assertion between the schema and `REQUIRED_ARTIFACT_BINDINGS`. Seeded red — both tests fail when the name drifts back |
| 5S-F009 | The same species again, found the moment the ordered evaluator first handed one object to two definitions: the `witness_policy` schema required `roster` while `core/policy.mjs`, `core/quorum.mjs` and both their suites read `witness_roster`. A policy block that satisfied its own validator was refused as `SCHEMA_UNSUPPORTED`. §2.1 writes "roster" as unquoted prose beside backticked field names, so it names the concept and not the key | RESOLVED in Task 16: the schema row now says `witness_roster`. The general lesson is that a schema nobody feeds a real instance to is a schema nobody has tested — Task 16's clean-bundle case is now that instance for four artifacts at once |
| 5S-F010 | **Raw code 492 `WITNESS_KEY_ALIASED` is unreachable as a first failure.** Reaching the alias check requires every statement to have cleared the `(identity, key)` roster pair at 489, which forces distinct keys per identity; the only roster that shares a key is refused at 485, six codes earlier, by `validateWitnessQuorumPolicy`. Three decisions, each defensible alone, that together make the code dead. §5.6's closeout law requires every raw code reached **at its frozen first-failure position**, so this blocks that conjunct | **RULED and RESOLVED** — adopt the candidate repair; the code is not deleted or reserved. The defect was the definition of roster membership, not the existence of the alias code. Membership is now identity eligibility **then key ownership**: identity absent → 489; key owned by no roster identity → 489; key owned by **another** roster identity → 492. So `489 = no authorised roster binding exists for this submission`, `492 = an authorised roster key is being worn by the wrong authorised identity`. A **semantic clarification, not a raw-band change** — code number, name, check position and security strength all unchanged, and the spec nowhere defines 489 as exact `(identity, key)` pair membership, so no frozen-band reopening was needed. Five reachability witnesses pinned; Task 11's accepted tests updated; 492 now has a real probe and the declared-unreachable set is down to `{510}`. Seeded red: reverting the tree reddens 2 |
| 5S-F011 | §2.1 says the `equivocation_artifact` binds "both checkpoints, **both statement sets**, the receipts that carried them, and the deterministic compatibility derivation". The implemented artifact binds the checkpoints, the receipts and the derivation — but **not** the witness statement sets, because the Task 14 ruling enumerated fourteen bindings that omit them and the artifact's narrow sentence is deliberately quorum-free | **RULED and RESOLVED** — restore them. The Task 14 list was a **minimum** binding list, not permission to omit fields frozen §2.1 requires. The artifact now binds `witness_statement_set_digest_{a,b}` and `witness_statement_set_status_{a,b}` (`validated` / `refused` / `empty`), embedding the canonical sets so self-verification recomputes both roots and both statuses. They are **context, never premises**: producer authentication and the compatibility relation decide whether equivocation exists; the statement sets record what witness evidence accompanied each view. All four combinations — validated/validated, validated/empty, refused/validated, refused/refused — still yield `equivocation_detected`, machine-checked. An invalid set moves `quorum_status` and stops there. Seeded red: coupling set validity to artifact validity reddens 6. **Consequent change**: once set roots enter the seal, the same fork yields different artifact bytes as witness statements arrive, so the canonical finding identity moved off the artifact digest onto the producer-equivocation fact — `H(domain ‖ producer_identity ‖ scope_id ‖ canonical body pair ‖ canonical envelope pair ‖ finding_id)` — and C7's duplicate rule keys on it. The artifact digest stays bound separately as the evidence-package version. Seeded red: keying back on the digest reddens 2 |

| 5S-F012 | **An intermittent failure in Stage 4J, ~1 run in 6 of the full suite.** `tests/e2e/llmShield/stage4jFullSmoke.test.js:101` — "E2E: byte-stable golden" — fails with `SyntaxError: Unexpected end of JSON input` from `readJson` at `verify-stage4j-pcta.mjs:16`, called from `loadDfiSubstrate:36` (`pack: readJson(\`${base}-base-pack.json\`)`) inside the regenerated-matrix loop. A JSON file is read empty or truncated. Reproduced twice in thirteen full-suite runs; **never** reproduced by the test alone, including 15 runs on `origin/main`under six-way CPU load, so it needs real full-suite parallelism. Ruled out with evidence: the 4J builder does **not** mutate the committed tree (md5 unchanged,`git status`clean after a run); builder output is complete and parseable across 25 builds under load; no`writeFileSync`anywhere in`tests/`or`tools/`targets the shared 4H fixture paths;`tamperClosure`reads`q0-clean-disconnected-untrusted`and writes only into its own`outputDir`; `.remember/`is gitignored so hook writes are invisible to tests; temp filesystem has 38Gi free, 1% inodes, no leaked directories | RECORDED against Stage 4J, not 5S —`tests/e2e/llmShield/stage4jFullSmoke.test.js`and`tools/simurgh-attestation/stage4j/`are outside Annex S, and 5S must not edit another stage's tests under its own surface (same boundary as 5S-F007). Reproduction recipe: run`node --test "tests/unit/**/\*.test.js" "tests/e2e/**/\*.test.js"` repeatedly; expect ~1 failure per 6 runs. A load-time source-rewrite probe (`module.registerHooks`) that makes `readJson`name its own path and length is the instrument for the next attempt — **note that patching`fs.readFileSync`does NOT work**, because ESM named imports bind the original function, which left two earlier probes silently inert. Until the mechanism is known, the suite is reported as`1 environment-dependent skip` **and** this known flake, never as "all tests passed" |

| 5S-F013 | **A second intermittent failure, in Stage 4K, distinct from 5S-F012.** `tests/e2e/llmShield/stage4kAllFunctions.test.js:337` — "CLI matches the programmatic API" — fails at line 352, `assert.equal(under.status, 0, under.stderr)`, with `3 !== 0`. Exit **3** is the CLI's catch-all in `verify-stage4k-eba.mjs:165` (`main().catch(...)`), which always writes `stage4k eba: ${e.message}` to stderr first — yet the assertion fell back to its DEFAULT message, so `under.stderr` was empty. A catch-all exit with no diagnostic is the interesting part. Caught once in seven full-suite runs; **not** reproduced by the test alone in 10 runs, with or without an inherited `NODE_OPTIONS` preload. **Correction:** the inference "therefore it needs full-suite parallelism" does not follow. 5S-F014 turned out to be a 1-in-256 randomness defect, and 10 isolated runs have a 4% chance of catching such a thing — so these isolation runs were far too short to distinguish "needs parallelism" from "rare and random". The cause of F013 remains **unknown** | RECORDED against Stage 4K, not 5S — outside Annex S. Distinct from F012: different stage, different file, different failure mode (a rejected CLI `main()` versus a truncated JSON read), and neither has been shown to share a cause. The instrument for the next attempt rewrites the assertion at load time to report the whole `spawnSync` result — status, signal, error, stderr, stdout — because the committed assertion discards everything except the status when stderr happens to be empty |

| 5S-F014 | **A no-op tamper: `"00" + signature.slice(2)` leaves the signature UNCHANGED whenever its first byte is already `0x00`.** `tests/unit/llmShield/stage4x/vlrCore.test.js:42` signs with a fresh `generateKeyPairSync` on every run, so the "tampered" bundle is sometimes a perfectly valid one and `evaluateVlr` correctly returns raw 0 where the test expects 174. Measured directly: **75 of 20,001** Ed25519 signatures begin `00` — 1 in 267, against a predicted 1 in 256. Caught in the wild once in seven full-suite runs. The species is repo-wide: the same prefix-replacement tamper appears at `stage5a/vncCore.test.js:44`, `stage5b/k7AllFunctions.test.js:54`, `stage4x/k7AllFunctions.test.js:46` and `stage5m/rekorAdapter.test.js:64`. Those four tamper COMMITTED values rather than freshly signed ones, and the two I could resolve (`stage-4x/attestation.json`, prefix `3428`) do not begin `00` — so they pass today. That is the more dangerous form, not the safer one: if such a fixture is ever regenerated there is a 1-in-256 chance the tamper becomes a **permanent** silent no-op, and a tamper test that never tampers is green forever | RECORDED against Stages 4X / 5A / 5B / 5M — all outside Annex S, same boundary as F007. The repository already contains the correct idiom, at `stage4k/verifier.test.js:58`: `(sig[0] === "A" ? "B" : "A") + sig.slice(1)`, which is guaranteed to change the value. The one-line repair at each site is to adopt it. **This is the only one of the three intermittent failures whose mechanism is now proven** |

| 5S-F015 | **Stage 5Q's problem-gate census has no successor-stage behaviour, so Stage 5S trips it — F001's species, one stage over.** The census flags manually enumerated CI steps that carry no committed universe query; 5S's workflow adds four, so `node --test tests/unit/llmShield/stage5q/*.test.js` is red on the 5S branch, and 5R's transition check reports it in turn as `disturbed a prior stage: true`. 5Q's own test header reads like an invitation to re-pin — it records that the pin "went stale the moment Stage 5R added seven workflow steps with no committed universe query, and 5Q's reproduce script had been red on main ever since". **It is not an invitation.** A re-pin was drafted, authorised by a seventh Annex M row, and taken green — and then 5Q's Q1 finding ledger failed, because it ties `entry_count` to a measurement taken **at tag v2.53.0**. The pin is anchored to a historical observation, not floating with the working tree, so re-pinning would have rewritten a prior stage's recorded evidence to make a later stage's suite green | **RECORDED, and the re-pin REVERTED along with its Annex M row.** The withdrawal is written into Annex M.2 so the next stage does not repeat the attempt. Awaiting a ruling between: (a) record and proceed, as F001 was handled; (b) repair 5Q's census to declare a successor-stage behaviour, as separate work on its own branch, the way F007 was done; (c) re-pin with the finding ledger updated — which makes everything green and rewrites a historical measurement, and is not recommended. The prior-reproduce sweep's other five failures are environment prerequisites: `pytest` is absent (4o, 4q, 4s) and `DROPLET_SSH` is unset (`reproduce-on-droplet.sh`) |

| 5S-F016 | **Stage 5Q's write-surface anti-vacuity guard covers `range` mode but not `staged`, and `staged` is the DEFAULT.** `tools/simurgh-attestation/stage5q/node/checkWriteSurface.mjs:90` reads `if (mode === "range" && result.checked === 0)`, so an empty change set over a dirty working tree refuses in `range` mode and passes in the default mode. Demonstrated by control, same repository state, one file modified and nothing staged: `--range HEAD..HEAD` prints `REFUSING: uncommitted_changes_not_evaluated` and exits 1; the bare invocation prints `paths examined: 0 / OK — every change is inside the spec §6.1 write surface` and exits 0. The comment sitting directly above the guard describes the exact accident it fails to prevent on the default path — "this is exactly how the Q1-F001 repair was verified 21/21 with its work uncommitted". Found by walking into it: the 5Q census repair's surface gate was run before staging and reported OK having examined nothing | RECORDED against Stage 5Q, not repaired here — `tools/simurgh-attestation/stage5q/` is outside Annex S, the same boundary as 5S-F007 and 5S-F012. Not the same defect as 5S-F006: that was an _unrecognised flag_ silently downgrading to the default mode, this is the default mode itself lacking the guard the other mode has. The repair is one condition — drop `mode === "range"` and let any zero-path evaluation over a dirty tree refuse — but it must be made on 5Q's branch under 5Q's authority, and it will need its own seeded-red witness. 5S's own G10 covers this case (`judgeChanges` refuses `uncommitted_changes_not_evaluated` on an empty change set with a dirty tree, driven red in `gateRedStates.test.js`), which is why the gap shows up as a difference between the two stages rather than as a shared blind spot |

5S-F001 is the fourth member of a species this repository already made a standing rule about: _every
stage-installed gate must declare its successor-stage behaviour before the stage freezes_
(Q1-F002/F004/F005). The rule was written on 2026-07-28. 5Q predates it, which is exactly why 5S
declares all six lifecycle fields for every gate and annex it installs, including Annex M and Annex S.

## §14 Gauntlet round 3 — four blockers, one correction, one found here

| id  | blocker                                                                                      | resolution                                                                       |
| --- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| R1  | Task 0 recorded its own commit hash inside that commit — recording the hash changes the hash | two commits: 0a authority, 0b pin. Task 1 pins what 0a produced                  |
| R2  | G10 was built by Tasks 30 and 35 but red-proved by 34, so `34 > every builder` was false     | reproduce script moved to 34, RED sweep to 35; G10 built by 30, 34, proved by 35 |
| R3  | angle-bracket placeholders `<spec>` `<base>` `<path>` survived the "zero placeholder" claim  | concrete commands and five named attestation artifact paths                      |
| R4  | `bash a.sh; bash b.sh` returns only the second status — 5Q could fail while the task passed  | every multi-command proof is one `bash -euo pipefail -c` block                   |
| R5  | Task 36's glob would have swept this stage's own reproduce script as a "prior" script        | excluded by name, and the set pin is authority rather than the glob              |
| R6  | **found here:** every reproduce script name in revision 2 was wrong                          | the family is `reproduce-llm-shield-stage<id>.sh`; 43 in family, 7 outside       |

R6 is the one the reviewer could not have seen without the directory listing, and it is the worst of
the six: revision 2's Task 3 invoked two files that do not exist, and Task 36's glob would have
matched 4 scripts while missing 43 — a completeness gate reporting green over 8% of its subject. The
mechanical checker missed R3 and R4 too, because it scanned for `TBD` and `TODO` rather than for
angle brackets and `;`-chained shell. Both patterns are now in the scan.

## §15 Definition of done

The §5.6 acceptance law, unmodified:

> Stage 5S is accepted only if every raw code is reached at its frozen first-failure position, every
> typed outcome is reachable, all four quorum-status combinations preserve valid equivocation
> findings, compatible ancestry never yields an accusation, and no external anchor contributes witness
> weight.

plus §6.6:

> declared gate set = implemented gate set; every gate evaluates a non-vacuous surface; every in-scope
> function carries a K7-A status; every 5S-owned change is authorised by the frozen write surface;
> successor-stage behaviour declared before release.
