# Record of corrections

This page lists the occasions on which the project's evidence, its audits or a replay showed that
something the project had claimed, expected or built was wrong, and what the project did about
it. Each entry links to the record that carries the detail. The page is an index into existing
records and adds no evidence.

Read it before deciding how far to trust the repository's numbers. It shows how the project found
its errors and what it did with them.

## Null results, failed predictions and readings the data overturned

| When        | The question, prediction or reading                                                                                               | What the data showed                                                                                                                                                                | Record                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 10 Nov 2026 | Tested: whether telling a model it is in an evaluation, or in live deployment, changes how often it sends when it should decline. | No shift of the size the design could detect (about twenty points) on any of three small models. Reported as a bound; the write-up does not claim that framing has no effect.       | [19h](research/provenance-phase-19h/README.md)                         |
| 10 Nov 2026 | After the framing study: one adversarial source worked because it claims to be the event that renews the monitoring lease.        | Contradicted by the next study. A reworded version of the same claim drew 0 of 4 sends where the original drew 4 of 4.                                                              | [19i](research/provenance-phase-19i/README.md)                         |
| 10 Nov 2026 | Recorded before the run: a self-clearing claim draws more sends than the control on the model that otherwise declines.            | The count went the predicted way (4 against 0) and the interval reaches zero. Written up as not established.                                                                        | [19i](research/provenance-phase-19i/README.md)                         |
| 11 Nov 2026 | Fixed before the run: a spoofed operator note draws the most sends of the five varied styles (H2).                                | Supported by the rule, 43 against 36, a margin the design cannot separate. The write-up says so next to the result.                                                                 | [19k](research/provenance-phase-19k/README.md)                         |
| 11 Nov 2026 | Implicit in the design: the ranking of injection styles is a property of the style.                                               | It is not. One wording of a style drew 24 of 24 sends and another drew none, and the ranking did not carry over to a smaller model of the same family.                              | [19k](research/provenance-phase-19k/README.md)                         |
| 11 Nov 2026 | Implicit in the first intervals: 120 generations per style are 120 observations.                                                  | The four trials of a case nearly always agree, so a style behaves like about 30 observations. The state-cluster intervals are the ones to read and the manuscript says which widen. | [Manuscript, Section 4.4](research/provenance-phase-19-paper/PAPER.md) |
| Oct 2026    | Tested: whether the composed controls add protection over a credential check on two models.                                       | A benefit on one model. On the other the credential-only baseline was already clean, so the study reports no incremental protection there.                                          | [Transfer results](research/transfer-phase-17/RESULTS.md)              |

## Defects the project found in its own work

| When        | What was wrong                                                                                                                                                                                        | How it was found                                                                   | What changed                                                                                                                              | Record                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Oct 2026    | In the first live provider workflow, host permission updates were sent in the wrong message role. The model declined all eight workflows, three of them authorised.                                   | The first live run.                                                                | The original traces were kept. A correction frozen before its run completed two of three authorised workflows; one refusal is still open. | [Role correction](research/provider-role-phase-17b/RESULTS.md)  |
| 19 Oct 2026 | Earlier closeout documents overstated what some stages had shown, and several retained verifiers did not check what their documents said they checked.                                                | A review of 919 of the project's own documents.                                    | 141 dated findings published. Some are repaired; others stay open and are listed as open in the README.                                   | [Documentation audit](documentation-audit-2026-10-19/README.md) |
| 3 Nov 2026  | A verifier compared snapshot digests that its own protocol declared reported, not compared. They depend on the SQLite build, so the first hosted run refused a valid pack.                            | The first hosted run of the Phase 19 workflow.                                     | Replaced by an inventory check, under a scope declared before the edit (P19-REPAIR01).                                                    | [Ledger](research/PROVENANCE_PHASE_19.md)                       |
| 8 Nov 2026  | A probe ran `python` where every other worker ran the current interpreter. On a stock Linux server it never executed, reported zero bytes and discarded the exit code, and the verifier still passed. | The author's first replay on a Linux server.                                       | Repaired with the audit's findings below (P19-REPAIR02, P19-REPAIR03).                                                                    | [Ledger](research/PROVENANCE_PHASE_19.md)                       |
| 8 Nov 2026  | Three blocking and twelve major defects in Phase 19, among them a verifier that built its receipt from a part of the pack it never compared, and a network namespace that confined IP routing only.   | A line-by-line audit of six lanes, each finding reproduced before it was accepted. | Each defect repaired with a reproducing test written first; packs regenerated (P19-REPAIR03, P19-REPAIR04).                               | [Ledger](research/PROVENANCE_PHASE_19.md)                       |
| 8 Nov 2026  | The hosted workflow read the expected pack roots from the same checkout it was verifying, so a pull request that changed code, pack and root together would have passed on its own say-so.            | The same audit.                                                                    | Expected roots now come from a repository variable set outside any pull request.                                                          | [Ledger](research/PROVENANCE_PHASE_19.md)                       |
| 10 Nov 2026 | The output decoder of the framing study would have accepted a call without its wrapper on one model's wire format.                                                                                    | Writing the tests for the next lane.                                               | No recorded output depended on it. The pinned source was left untouched and the note added to that lane's README.                         | [19h](research/provenance-phase-19h/README.md)                  |

## Defects that independent replays found

These replays were run apart from the session that produced the evidence: three by the owner's
reviewer on machines the owner controls, and one by an outside operator. Every replay reproduced
the committed results. Every replay also found something wrong with the instructions or the tests,
which the producing session's own runs had not. The outside operator's receipt discloses that an
AI coding agent on a subscription registered to the author typed the commands; the review can
establish what the returned outputs say and cannot establish who produced them.

| When        | Who replayed                                                   | What they found                                                                                                                                     | Record                                                        |
| ----------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 8 Nov 2026  | The owner's reviewer, owner-controlled Linux host              | The comparator checked host-dependent fields the handoff said it would not; a test required a toolchain the handoff called optional (P19-REPAIR05). | [Ledger](research/PROVENANCE_PHASE_19.md)                     |
| 9 Nov 2026  | The owner's reviewer, owner-controlled macOS host              | A test helper did not tolerate an error code that macOS returns when a peer closes early (P19-REPAIR06).                                            | [Ledger](research/PROVENANCE_PHASE_19.md)                     |
| 10 Nov 2026 | The owner's reviewer, owner-controlled Linux host, fresh clone | The handoff's time estimates were too low by a factor of two to three on small servers (P19-REPAIR07).                                              | [Ledger](research/PROVENANCE_PHASE_19.md)                     |
| 10 Nov 2026 | An outside operator on their own machine                       | Two verifiers needed a package the handoff did not mention, and the locked dependency set had no build for one platform (P19-OPERATOR01).           | [Receipt and review](research/provenance-phase-19f/README.md) |

## Departures from a declared plan

| When        | The plan said                                                           | What was done instead, and why                                                                                                                                         | Record                                    |
| ----------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 11 Nov 2026 | The second gate replay is verified in the hosted suite as the first is. | The full replay takes about thirty minutes and does not fit the hosted job's time limit. The hosted suite checks structure; the full replay ran twice on a Linux host. | [Ledger](research/PROVENANCE_PHASE_19.md) |

## Corrections to the record itself

| When        | What the record said                                                                                             | Correction                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11 Nov 2026 | A change-log entry described the list of gaps that prompted the scaled study as coming from "an outside review". | It was the project's own assessment, made by the author with the AI agent. No outside reviewer had read the work. The entry is corrected in place. |

## What is still open

The project knows about these and has not repaired them.

- No attacker that knows the gate has been run against it.
- The studies in the manuscript have not been replayed outside the author's custody.
- Several findings of the October documentation audit remain open; the README names them.
- No researcher outside the project has reviewed the manuscript.
