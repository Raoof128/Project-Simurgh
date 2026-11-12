# Documentation fact check, 12 November 2026

A check of every Markdown document in the repository against the repository itself, made before
an outside reviewer reads it. It corrected 148 findings, 53 of them private values that were
redacted, and left 645 open, most of them in dated records that this project does not rewrite.
The open ones are listed in [FINDINGS.md](FINDINGS.md).

This record adds to the [19 October audit](../documentation-audit-2026-10-19/README.md); it does
not replace it.

## What was checked

All 871 tracked Markdown files at commit `91bd9300`, which is `main` at `d8c58d56` plus lane 19m.
Each file was checked for:

- references: links, paths, scripts, commands and names that no longer exist;
- numbers and results: counts, hashes, roots, commit ids and dates against the artefact they come
  from;
- consistency inside a document and against the documents and packs it restates;
- present-tense status claims in current documents that are no longer true;
- private data and defects a reader would see, such as an unclosed code fence.

## How

The check had two passes.

**First pass, by small-model agents.** The author's AI agent split the files into 240 batches and
ran a workflow of small-model agents (Claude Haiku), read-only:

1. One agent read each batch in full and reported findings with a quoted line and the evidence it
   had opened. The 150 documents a reviewer reads first were read twice, by two agents with
   different instructions: one for numbers and results, one for references, status and
   consistency. 283 checking agents in all.
2. A second agent was given each finding and told to refute it: to find the quoted line, open the
   evidence itself, and decide whether the problem was real, whether the document was a dated
   record that had been true on its date, or whether it could not tell.

| Verdict of the second agent                    | Findings |
| ---------------------------------------------- | -------- |
| Confirmed                                      | 799      |
| Refuted                                        | 80       |
| A dated record, true on its date, not an error | 161      |
| Could not be settled                           | 23       |
| Total reported                                 | 1,063    |

The laptop slept during the run and six batches failed with no network. They were run again. That
second run also re-read some other batches before it was stopped, and the 47 new findings it
raised there were verified with the six batches' 11; the table includes all of them.

**Second pass, by the orchestrating agent.** The agent that ran the workflow (a larger model)
then went through the 799 confirmed findings itself:

- It checked every proposed correction against the code or the pack before keeping it.
- It wrote scripts for the findings a script can settle: private-data patterns on the quoted
  line, paths that do not exist, tags and commit ids that do not resolve, and counts of Lean
  theorem declarations. These reproduced 132 of the findings then open and refuted none.
- It read every other open finding with its evidence. Fifteen of those it also checked by
  command: a random sample of ten (Python `random.seed(19)`, `random.sample(..., 10)` over the
  dated records) and five labelled high severity. All fifteen were real.
- It rejected six confirmed findings as not errors. They are listed below.

It also checked every relative link and scanned every file for private-data patterns with a
script, before the agents' results were in.

## What was corrected

148 confirmed findings in 77 files: 95 corrections in 41 documents, and 53 private-data findings
closed by the redaction described below. A finding counts as corrected when this change edits
its line or one within three lines of it, adds a dated note for it, or removes the private value
it quoted. Proposals were dropped where
the claim could not be confirmed, and where the file is stage-owned, generated, attested by a
pack, a paper draft or a pilot governance document.

The corrections a reviewer is most likely to have met:

- `docs/AUTHOR_AND_METHOD.md` gave the number of commits carrying an AI co-author line as 380 of
  2,275. It is 346.
- `README.md` said eleven Phase 19 packs and that the Linux daemon manifest still declared MIT.
  There are twelve, and the manifest has declared AGPL-3.0-or-later since 31 October.
- The Phase 19 ledger's overview did not mention lane 19m, said nine 19d cases hold where eleven
  do, and described only the first 19d pack's host.
- The Phase 19 manuscript said one wording of each style moved the model in every state and
  trial. That is true of two of the five styles. A table row read "either control" where its
  counts are for both controls.
- The operator handoff said the verify set had been installed and run on macOS x86_64. It was
  installed and run on Linux x86_64 and macOS arm64; for macOS x86_64 only its wheels were
  resolved. The handoff also left lane 19m out of the list of lanes that need only Python.
- `docs/DEVICE_SHIELD_CONTRACT.md` listed 29 forbidden field names where the code has 38, named
  three audit events and three scripts that do not exist, and said Linux was not yet supported.
- `docs/research/llm-shield/ANTHROPIC_BRIEF.md` said the classifier missed 138
  downstream-injection attacks. It missed 138 malicious cases: 120 downstream-injection cases and
  18 of 30 direct-input attacks.
- Two documents told a reader to clone a branch, `openai-readiness`, that has been merged and
  removed.
- `docs/assurance/sdk/README.md` and its validation record said the lock pins 60 dependencies. It
  pins 59.
- The capture recipes in the Phase 19 lane READMEs and the manuscript installed an unpinned
  runtime. They now pin the versions the captures used.

## What was rejected on the second pass

| Finding                                                    | Why it is not an error                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `docs/REVIEWER_INDEX.md`, the "Reviewed" date              | The line gives the date of the review, which is what it says.                              |
| The Phase 19 ledger's two times for the 19m resume         | Two events: the relaunch at 19:58:02 and the model process start at 19:58:07.              |
| The H4 rule wording in the 19k and 19m results (2 entries) | The rule compares the two named states with the other four, which is what the code does.   |
| `docs/research/validation-phase-15/RESULTS.md`, parity     | A dated run report: the receipt regenerated in that run's disposable clone read as stated. |
| `docs/research/CREDENTIALS_PHASE_8.md`, suite total        | The finding infers a count that the record does not give.                                  |

## What was left open

645 confirmed findings in 277 files, listed in [FINDINGS.md](FINDINGS.md). Each entry says
whether the second pass reproduced it with a script (85) or read it without running the check
again (560).

| Why it is open                                                                    | Findings |
| --------------------------------------------------------------------------------- | -------- |
| Dated record: a plan, spec, stage document, log entry, paper draft or older audit | 591      |
| Frozen evidence or a stage-owned file                                             | 38       |
| Kept on purpose: a contact or author address                                      | 11       |
| Kept on purpose: a host label with no address, or the author's city               | 3        |
| Attested by a pack                                                                | 1        |
| Owner action: confirm an API key was rotated                                      | 1        |

The first-pass agents labelled 70 of the open findings high severity, 158 medium and 417 low.
The label is theirs.

Dated records are not edited, by the rule in [AGENTS.md](../../AGENTS.md). Most of their findings
are small: a code sample in a plan that would not run as written, a link to a file that later
moved, a count that differs from the shipped code. Frozen and stage-owned files are not edited
either; a correction to one needs that stage's own authority.

Some open findings are not small, and the author should read them:

- The voting-pilot records disagree with each other on governance facts: 31 consented sessions
  against a stated ceiling of 30, a data-management plan described as ethics-approved where the
  checklist records that formal approval was not required, and gate results recorded as passing
  where a later closeout says the gate had failures.
- An older paper's README states gate counts at its evidence freeze (417 unit, 43 end-to-end).
  The only captured outputs in the repository at that commit show 389 and 41, from an earlier
  phase.
- The risk scorer's weights in `src/academic/riskScoring.js` sum to 1.05, and two documents
  state the sum as 1.00.
- `docs/research/provenance-phase-19g/DEPLOYER_PROFILE.md` says every Claude system card hands
  enforcement to the deployer. Its source notes sampled the cards and do not support "every". The
  19g pack attests this document, so it is not edited here.

## Private data redacted

On the owner's instruction, private values were replaced in 48 files, evidence files included,
by one script with fixed rules. The values are not repeated here.

| What                                                        | Replaced with                                             |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| A server's address, its login name and the key file's name  | `[redacted-ip]`, `[redacted-user]`, `[redacted-key-path]` |
| Host names of the author's laptop and of the server         | `[redacted-host]`, `[droplet]`                            |
| Local paths under the author's home directory               | `[repo]`, `[zurvan]`, `[scratch]`, `[home]`               |
| Five outside reviewers' email addresses in one manifest     | `(address withheld)`                                      |
| The author's personal address in three old plans' git lines | `[redacted-email]`                                        |

Four Markdown evidence files carry a dated note saying what was replaced. Nothing else in any
file changed, and every edited JSON file still parses. The quick gate, the end-to-end tests of
the seven stages whose evidence was edited and the reviewer-signature aggregator all pass after
the change. No edited file's earlier checksum is pinned by a gate.

What the redaction did not change, and why:

- **The five reviewers' signed blocks** (`evidence/stage-4r/reviewer-runs/reviewer-*.json`) still
  hold the identity string each reviewer declared, with an email address. That string is inside
  the signed body, so removing it would break the reviewer's signature. Removing it needs the
  reviewers to sign again under another name, or a decision to keep unverifiable copies.
- **One comment in a stage-owned source file** (`tools/simurgh-attestation/stage5n/node/realEvidence.mjs`)
  names a local scratch path. Stage-owned sources are not edited here.
- **Contact and author addresses** in `SECURITY.md`, `PRIVACY.md`, `docs/DISCLAIMER.md`, two
  write-ups, one stage brief, the pilot's participant notice and the papers' author blocks are
  there on purpose.
- **Test files** contain path and address patterns as test inputs, not as leaks.
- **Git history** keeps every redacted value. Rewriting it would change the commit ids that the
  evidence, the ledger and the release tags cite, so it was not done. The values should be
  treated as disclosed. The repository's own notes say the server accepts key logins only.

An API key was used for two October studies and shared with the agent as a chat attachment
(`docs/assurance/openai-native/README.md`). A search of the whole git history for key and token
patterns found test fixtures and nothing real. Whether the key was rotated afterwards is not
recorded in the repository; only the account owner can confirm or do it.

## Limits

- The first-pass agents are a small model. This check says what was found, not that nothing else
  is wrong. No estimate of what they missed is offered.
- The second pass reviewed the findings, not the documents. It did not read the 871 files again.
- "Read" means the orchestrating agent found the finding and its quoted evidence consistent. It
  did not open the evidence again for those 566 entries.
- The 23 findings the second agent could not settle are not listed.
- Only Markdown was read. Source code, JSON evidence, PDFs and LaTeX were opened as evidence, not
  checked as documents. Links to other sites were not followed.
- Citations to outside literature were checked only where the cited text is in the repository.
- Private values are not repeated in this record. An entry says which kind of value a line holds.
- The check ran on one commit. Documents changed after `91bd9300` were not re-read, except the
  ones this change edits.
