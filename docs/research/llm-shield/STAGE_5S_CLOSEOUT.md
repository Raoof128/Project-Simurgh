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

```text
5S surface     602 tests · 602 pass · 0 fail · 0 skipped · 0 todo
reproduce      30 gates · 30 pass
prior sweep    50 prior reproduce scripts, 5S excluded by name
```

The repository-wide suite carries **one environment-dependent skip** — a Stage 4K test needing a
second Node older than 26 — and **two intermittent failures recorded as findings against the stages
that own them** (5S-F012 in 4J, 5S-F013 in 4K). Those are reported as the counts above rather than
compressed into a single reassuring sentence.

## What this stage found, in itself and in the repository

Seventeen findings, of which seven are against 5S's own work and were fixed here. The other ten are
against stages 4J, 4K, 5N, 5Q and the repository at large; none was repaired inside this stage,
because each sits outside Annex S and a stage that edits another stage's tests to go green has
found a defect in itself. Three of them (F015, F016, F017) were repaired on Stage 5Q's own branches
under 5Q's own authority, which is the shape this boundary is meant to produce: the obstacle removed
at its source, not worked around where it was noticed.

| id      | finding                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5S-F006 | the write-surface driver had two fail-opens: an unrecognised flag was ignored and every git call swallowed its error, so it printed OK having examined nothing                    |
| 5S-F007 | eight Stage 5N tests pointed at a machine-local path and had been silently inert since the ceremony, while the real Bitcoin and TSA evidence sat committed a few directories away |
| 5S-F008 | the artifact schema and the artifact's own binding list drifted apart, so `validateArtifact` refused every valid artifact — a suppressed finding wearing a refusal's clothes      |
| 5S-F009 | the same species one module over: the policy schema said `roster`, every consumer said `witness_roster`                                                                           |
| 5S-F010 | raw code 492 was unreachable — three defensible decisions that together made it dead. Repaired by the key-ownership decision tree                                                 |
| 5S-F011 | the artifact omitted the witness statement sets that frozen §2.1 requires. Restored as context, never as premises                                                                 |
| 5S-F012 | an intermittent Stage 4J failure, cause unknown, recorded with its reproduction recipe                                                                                            |
| 5S-F013 | a second intermittent failure, in Stage 4K, distinct from F012, cause unknown                                                                                                     |
| 5S-F014 | `"00" + signature.slice(2)` is a no-op whenever the signature already begins `00` — measured at 75 in 20,001. Five sites share the pattern                                        |
| 5S-F015 | Stage 5Q's problem-gate census tied a live check to a measurement frozen at another stage's tag, so 5S's four CI steps could only go green by rewriting prior evidence            |
| 5S-F016 | Stage 5Q's write-surface anti-vacuity guard covers `range` mode but not the default `staged` mode, so a zero-path run over a dirty tree prints OK                                 |
| 5S-F017 | the Q1-F006 repair kept two v1 field readings below an early return, so no test could reach them until the first day the repair worked                                            |

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
- **Repository:** F012 and F013 need mechanisms; F014's five sites need the one-line repair; 492's
  interpretation receipt should be read by whoever next touches roster membership.

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
