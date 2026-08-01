# Stage 5S — VWQ: Verifiable Witness Quorum — closeout

**AnthropicSafe First, then ReviewerSafe.**

## What this stage is

A producer publishes signed checkpoints. Different auditors receive them independently. 5S compares
what they received and reports, in signed and recomputable bytes, whether the producer showed two
incompatible histories at one coordinate.

The blade is one sentence and it is bounded:

> Two producer-authenticated checkpoints occupy an incompatible relation under the committed
> comparison authority.

Not that the producer is dishonest. Not that a fork reached anybody. Not that the witness quorum
agreed — quorum is irrelevant to the finding, because two authenticated producer signatures over
incompatible checkpoints prove the producer signed both without any witness at all.

## The honest core, stated first

**Detection is comparison-bounded.** A green run means no equivocation was demonstrated _within the
compared view set_. It never means none occurred. The phrase this stage uses is "no conflict in the
committed comparison set", and the claim gate refuses the shorter, wrong sentence.

**Independence is unproven, by construction.** Every Lane B witness is one operator holding several
distinct keys. `witness_independence_status` has exactly one member — `unproven` — because a
stronger value would be an empty chair labelled "independent" waiting for future optimism. Paying
that debt costs an external operator signing the full witness tuple; an anchor over a digest does not
buy it, and a third party's self-assertion of independence is an input rather than evidence.

**An external anchor carries zero witness weight.** It observes a digest and reads nothing. Lane C
corroborates a digest; it never upgrades independence, and no score below is credited for anchoring
as though it were.

## What was built

| layer                  | what it does                                                               |
| ---------------------- | -------------------------------------------------------------------------- |
| frozen check order     | 12 checks, 38 raw codes (475–512), first-failure semantics                 |
| compatibility relation | four verdicts over two views and an injected ancestry oracle               |
| equivocation artifact  | recomputes 9 things; verifies without the builder and without our keys     |
| finding ledger         | makes exit 0 auditable; 8 contradictions refused                           |
| Lane A                 | 21 authored cases × 11 independently pinned columns; 35 code probes        |
| Lane B                 | four roles, four processes, deterministic keys, byte-identical transcripts |
| Lane C                 | live RFC-3161 and OpenTimestamps capture, verified offline                 |
| parity                 | Node core, WHATWG WebCrypto mirror, Python — byte-identical                |
| proofs                 | five Lean theorems, zero escape hatches                                    |
| attestation            | binds a set of compared digests and a map of quorum statuses               |

## The final suite, stated without rounding

Measured on the final tree, in one `scripts/check.sh` run, not carried forward from an earlier one:

```text
unit  (npm test)  5053 tests · 5053 pass · 0 fail · 0 skipped · 0 todo
e2e   (e2e nets)   358 tests ·  357 pass · 0 fail · 1 skipped · 0 todo
                  ─────────────────────────────────────────────────────
repository-wide   5411 tests · 5410 pass · 0 fail · 1 skipped · 0 todo

check.sh          151 steps · 151 pass · 0 fail
reproduce          30 gates ·  30 pass
5S surface        612 tests · 612 pass · 0 fail · 0 skipped
prior sweep        50 prior reproduce scripts, 5S excluded by name
```

**The skip count varies with the environment, and the table above is one environment.** On this
machine there is one environment-dependent skip: a Stage 4K test needing a second Node older than 26.
On a runner without a Lean toolchain there are three, because two Stage 5S proof assertions skip
rather than fail — `scripts/check.sh` runs before the `Install Lean (elan)` step of
`stage-1-checks.yml`, so `lean` is genuinely absent there. Every one of them is a skip, is counted as
a skip, and is not a pass.

Those two proof skips are safe for a stated reason rather than by hope. The escape-hatch scan that
actually catches `sorry` is source-based and never skips — `lean` exits 0 on a sorry-closed theorem,
so the type-checker was never what enforced that. And the type-check itself runs in CI jobs that do
install the toolchain, which a permanently-executing test asserts: it checks that the workflow
installs elan, that a step runs the repo-wide gate, and that the install comes **first**, since
installing a toolchain after the gate has already run is precisely the arrangement that produced
this (5S-F018).

**`0 fail` in this run was never what retired the two intermittent failures.** 5S-F012 (Stage 4J,
roughly one run in six) and 5S-F013 (Stage 4K, once in seven) did not fire here, and a green run of
an intermittent failure is evidence of nothing except that particular run. Both were closed by
measurement instead: one non-atomic fixture write, `writeFile` truncating a file it is refilling,
and two readers of the same bytes. The 4J reader parses it bare and throws; the 4K verifier parses
it inside a `try/catch` and returns raw 29 with an empty stderr, which is the entire reason F013
read as a separate and causeless bug. Measured with both arms running concurrently under identical
load: 666 truncated reads in 2,779,311 against the old writer, **0 in 2,773,312** against
write-then-rename.

So the honest reading of the table above is still "this run passed" rather than "the suite passes" —
a table records a run, and no number of green runs closes an intermittent failure. What closed these
two was a mechanism and a controlled measurement, which is a different kind of claim and is the only
kind that should ever retire a flake.

That distinction is why the numbers are printed rather than summarised. The reassuring one-line
summary would be true of this run and false about the repository, so it is not written here — and
the closeout gate refuses it lexically, which it demonstrated by refusing an earlier draft of this
very paragraph. The gate was left strict rather than taught to recognise the phrase in quotation
marks: a gate that exempts quoted text hands every future overclaim a pair of quotes to hide behind.

## What this stage found, in itself and in the repository

Twenty-one findings. Nine are against 5S's own work — F002, F003, F005, F006, F008, F009, F010,
F011 and F021 — and were fixed here. The other twelve are against stages 4H, 4J, 4K, 5N, 5Q and the
repository at large; not one was repaired inside this stage, because each sits outside Annex S and a
stage that edits another stage's tests to go green has found a defect in itself.

**Ten of those twelve are closed.** F007, F012, F013, F014, F015, F016, F017 and F018 were repaired
on their OWN branches under the authority that owns the file — the shape this boundary is meant to
produce, with the obstacle removed at its source rather than worked around where it was noticed.
F004 and F019 are the same eleven-code staleness in the committed 4H exit map, and both close as a
side effect of 5S's own Annex M ripple rather than on a branch of their own.

**Two remain open, by decision rather than neglect.** F001 and F020 are both properties of Stage
5Q's gate — it refuses every later stage's files, and once triggered it judges the whole diff
against 5Q's surface. Neither is 5S's to repair, and F020 was worked around here by splitting the 5Q
change into its own pull request, which is a workaround and is labelled one.

The last finding to fall was F013, and it fell by turning out to be F012 wearing different clothes:
the Stage 4K verifier hardcodes the Stage 4H substrate path and reads it inside a `try/catch`, so
the truncated read that made 4J throw a loud `SyntaxError` made 4K return raw 29 and print nothing.
One race, two presentations — and the second stayed invisible for two stages precisely because
catching the error is what converted it into a silent refusal.

What that does NOT establish: the measured truncation rate has not been reconciled arithmetically
with the roughly-one-in-seven field frequency, and F013 has not been re-observed since the repair.
The mechanism is demonstrated and the atomic write demonstrably closes it; the frequency accounting
is not claimed.

| id      | finding                                                                                                                                                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5S-F006 | the write-surface driver had two fail-opens: an unrecognised flag was ignored and every git call swallowed its error, so it printed OK having examined nothing                                                                                                                                 |
| 5S-F007 | eight Stage 5N tests pointed at a machine-local path and had been silently inert since the ceremony, while the real Bitcoin and TSA evidence sat committed a few directories away — **resolved**: paths now resolve from the module, and an absent required capture is a refusal, never a skip |
| 5S-F008 | the artifact schema and the artifact's own binding list drifted apart, so `validateArtifact` refused every valid artifact — a suppressed finding wearing a refusal's clothes                                                                                                                   |
| 5S-F009 | the same species one module over: the policy schema said `roster`, every consumer said `witness_roster`                                                                                                                                                                                        |
| 5S-F010 | raw code 492 was unreachable — three defensible decisions that together made it dead. Repaired by the key-ownership decision tree                                                                                                                                                              |
| 5S-F011 | the artifact omitted the witness statement sets that frozen §2.1 requires. Restored as context, never as premises                                                                                                                                                                              |
| 5S-F012 | an intermittent Stage 4J failure — **resolved**: a non-atomic fixture write, observable half-written 90 times in 400, repaired by write-then-rename                                                                                                                                            |
| 5S-F013 | a second intermittent failure in Stage 4K — **resolved: the SAME race as F012, on the same file**, caught by a `try/catch` that turned a truncated read into a silent refusal                                                                                                                  |
| 5S-F014 | `"00" + signature.slice(2)` is a no-op whenever the signature already begins `00` — measured at 75 in 20,001. Six sites shared it, all repaired                                                                                                                                                |
| 5S-F015 | Stage 5Q's problem-gate census tied a live check to a measurement frozen at another stage's tag, so 5S's four CI steps could only go green by rewriting prior evidence                                                                                                                         |
| 5S-F016 | Stage 5Q's write-surface anti-vacuity guard covers `range` mode but not the default `staged` mode, so a zero-path run over a dirty tree prints OK                                                                                                                                              |
| 5S-F017 | the Q1-F006 repair kept two v1 field readings below an early return, so no test could reach them until the first day the repair worked                                                                                                                                                         |
| 5S-F018 | two 5S proof assertions hard-required a Lean toolchain that `check.sh`'s own job installs only afterward — green on every developer machine, red in CI, reproduced by neither                                                                                                                  |
| 5S-F019 | the committed 4H exit-map on `main` is stale by eleven codes — 5P shipped without rippling it, and nothing compares the committed map against what the builder produces                                                                                                                        |
| 5S-F020 | Stage 5Q's gate is scoped by trigger but unscoped in evaluation, so a PR touching a 5Q file plus anything else is refused — Q1-F005's sentence, one level in                                                                                                                                   |
| 5S-F021 | the F014 guard this stage shipped could not tell a description of the pattern from a use of it, and reddened against four of 5S's own passages the moment the two branches met                                                                                                                 |

The others (F001–F005) are recorded in the plan's §15.

**F014 is the one worth carrying forward.** A tamper test whose tamper does nothing tests the
verifier's willingness to accept good evidence. When the tampered value is freshly signed the defect
is intermittent at 1 in 256; when it is a committed fixture the same accident is **permanent** — a
tamper test that never tampers and is green forever. Every mutation in 5S's own tamper matrix is
proved to have mutated before its code is asserted.

## Scores, re-scored at closeout

Targets were set pre-freeze in §4.5. Closeout re-scores independently and a downgrade is a feature.

| axis               | target | closeout | why it moved, or did not                                                                                                                                                                                                                                                                                |
| ------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 8.6    | **8.6**  | unchanged. The core mechanism is genuinely prior art; the compositional novelty — conflict as typed evidence inside the Completeness lattice — is real and is what the 8.6 is for. No fork was detected between two views this project did not author, so the 9.2 debt stands untouched                 |
| Frontier relevance | 9.4    | **9.4**  | unchanged. Multi-party assurance of containment claims remains live and unsolved. The 9.7 debt — a second party running the verifier against a deployment we do not operate — is not paid                                                                                                               |
| Good for Anthropic | 9.5    | **9.3**  | **downgraded.** The independence debt is not merely unpaid, it is now precisely priced: §3.3 names the exact price and Lane B demonstrates multi-process rather than multi-party. Reporting 9.5 for a stage whose central independence claim is `unproven` by construction would be the flattering read |
| Constitution       | 9.2    | **9.2**  | unchanged. Machine-checkable honesty about what was and was not established, including two intermittent failures this stage could not explain and did not bury                                                                                                                                          |

**Good for Anthropic goes down.** Nothing broke; the stage did what it said. But the pre-freeze 9.5
was scored against an expectation that Lane B would feel more like independence than it does, and
the honest number for "third-party assurance without trusting the producer" is lower while every
witness is the same operator.

## Debts, priced

- **Novelty → 9.2:** a real fork detected between two views this project did not author.
- **Frontier → 9.7:** a second party running the verifier against a deployment we do not operate.
- **Anthropic → 9.8:** one external operator signing the full witness tuple, retiring §3.3's debt.
- **Constitution → 9.5:** a published contest path for a producer disputing an equivocation
  artifact, composing 4V's due-process machinery onto this stage's finding.
- **Repository:** none outstanding. F012 and F013 turned out to be one mechanism and are repaired at
  the writer; F014's six sites carry the value-dependent flip and a discovering guard; 492's
  interpretation receipt should still be read by whoever next touches roster membership.

## What 5S does not claim

1. that the compared set exhausts what the producer published — only that no conflict appears
   within it;
2. that the witnesses are independent — they are one operator with several keys;
3. that an external anchor establishes anything about content — it observes a digest and reads
   nothing;
4. that the claim gate is semantic — it is lexical, and a paraphrase it does not know will pass;
5. that Lane B proves a process could not read another's key — separate directories do not show that;
6. that the browser lane ran in a browser — no driver was installed, and the capture says so;
7. that the self-inflicted control is evidence about any provider — the fork is ours, and it is not
   an accusation.
