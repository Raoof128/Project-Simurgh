# Documentation fact check, 12 November 2026

A check of every Markdown document in the repository against the repository itself, made before
an outside reviewer reads it. It corrected 79 findings in current documents and left 720 open,
most of them in dated records that this project does not rewrite. The open ones are listed in
[FINDINGS.md](FINDINGS.md).

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

The author's AI agent split the files into 240 batches and ran the check with a workflow of
small-model agents (Claude Haiku), read-only:

1. One agent read each batch in full and reported findings with a quoted line and the evidence it
   had opened. The 150 documents a reviewer reads first were read twice, by two agents with
   different instructions: one for numbers and results, one for references, status and
   consistency. 283 checking agents in all.
2. A second agent was given each finding and told to refute it: to find the quoted line, open the
   evidence itself, and decide whether the problem was real, whether the document was a dated
   record that had been true on its date, or whether it could not tell.

The agent that ran the workflow also checked every relative link and scanned every file for
private-data patterns with a script.

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

## What was corrected

79 confirmed findings in 33 documents. A finding counts as corrected when this change edits its
line or one within three lines of it, or adds a dated note for it. For each one, a third agent
proposed the exact replacement and the orchestrating agent checked the claim against the code or
the pack before keeping it. Proposals were dropped where the claim could not be confirmed
cheaply, and where the file is stage-owned, generated, attested by a pack, a paper draft or a
pilot governance document.

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
- `docs/DEVICE_SHIELD_CONTRACT.md` listed 29 forbidden field names where the code has 38, named
  three audit events and three scripts that do not exist, and said Linux was not yet supported.
- `docs/research/llm-shield/ANTHROPIC_BRIEF.md` said the classifier missed 138
  downstream-injection attacks. It missed 138 malicious cases: 120 downstream-injection cases and
  18 of 30 direct-input attacks.
- `docs/assurance/sdk/README.md` said the lock pins 60 dependencies. It pins 59.

## What was left open

720 confirmed findings in 300 files, listed in [FINDINGS.md](FINDINGS.md).

| Why it is open                                                                    | Findings |
| --------------------------------------------------------------------------------- | -------- |
| Dated record: a plan, spec, stage document, log entry, paper draft or older audit | 601      |
| Private data, which is the owner's decision                                       | 62       |
| Frozen evidence or a stage-owned file                                             | 39       |
| Current document, left for the author                                             | 16       |
| Attested by a pack, or generated                                                  | 2        |

The agents labelled 118 of the open findings high severity, 172 medium and 430 low. The label is
the agent's, and many high labels are on private-data entries.

Dated records are not edited, by the rule in [AGENTS.md](../../AGENTS.md). Most of their findings
are small: a code sample in a plan that would not run as written, a link to a file that later
moved, a count that differs from the shipped code. Frozen and stage-owned files are not edited
either; a correction to one needs that stage's own authority.

## A sample checked by hand

Ten open findings were drawn at random from the dated records, private-data entries excluded
(Python `random.seed(19)`, `random.sample(..., 10)`). The orchestrating agent checked each against
the repository: nine by running the command the finding rested on, one by reading the code it
described. All ten were real. Ten of 720 says the confirmed findings are mostly right; it does not
give a rate.

## Limits

- The checking agents are a small model. This check says what they found, not that nothing else
  is wrong. No estimate of what they missed is offered.
- "Confirmed" means a second agent of the same kind reproduced the finding. The author has not
  reviewed the open findings one by one, and a pair of agents can share a blind spot.
- The 23 findings the second agent could not settle are not listed.
- Only Markdown was read. Source code, JSON evidence, PDFs and LaTeX were opened as evidence, not
  checked as documents. Links to other sites were not followed.
- Citations to outside literature were checked only where the cited text is in the repository.
- Private values are not repeated in this record. An entry says which kind of value a line holds.
- The check ran on one commit. Documents changed after `91bd9300` were not re-read, except the
  ones this change edits.
