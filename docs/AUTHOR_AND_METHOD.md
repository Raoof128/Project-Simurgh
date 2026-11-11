# Author, working method and open problems

This page is for a reader who wants to judge the person and the process behind this repository as
well as its results. It states who is accountable for the work, how the work is produced, how the
method has changed since the first commit, and which problems the author cannot settle alone.
Every dated statement links to the record that supports it.

## Who is accountable

Project Simurgh is the work of one person, Mohammad Raouf Abedini
([ORCID 0009-0000-6214-258X](https://orcid.org/0009-0000-6214-258X)), an independent researcher.
The author decides what is studied, authorises every run and every spend, decides what is
published, and answers for every claim in the repository.

A CV is not project evidence, and the project's own audit says so
([finding M36](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m36--personal-résumé-is-not-verified-project-evidence)).
This page therefore makes no claim about the author that the repository cannot back.

## How the work is produced

Much of the engineering is done with an AI coding agent (Claude, from Anthropic) working under the
author's direction. The division of labour, as the records show it:

- **The author** sets the question and the constraints, chooses which experiments are worth
  running, authorises each line of work and any cost, and decides what is released. The ledger
  records these instructions where they shaped a study, for example the choice to run the
  experiments whose outcome was not known in advance
  ([Phase 19 ledger](research/PROVENANCE_PHASE_19.md)).
- **The agent** proposes each plan as a written declaration, writes instruments, verifiers and
  tests, runs the captures and replays, and drafts the write-ups, including the first draft of
  the [manuscript](research/provenance-phase-19-paper/PAPER.md).
- **The record** is how the two are held to account. A declaration is committed before the work
  it authorises. [AGENT.md](../AGENT.md) logs each change with its scope and verification. Commits
  made with the agent carry a co-author line: 380 of the 2,275 commits on `main` at
  11 November 2026, and nearly every non-merge commit since Phase 19 began. An older commit
  without that line should not be read as evidence that no assistant was used.

Three consequences follow, and a reviewer should weigh them.

1. The volume of code and documents here is not a measure of one person's typing. The questions
   asked, the experiments chosen, the limits stated and the errors admitted are the better measure.
2. An agent can be confidently wrong. The safeguards against that are structural: plans fixed
   before runs, verifiers that recompute every number from raw outputs, tests that pin write-ups
   to evidence packs, and replays run apart from the session that produced the evidence. The
   [record of corrections](RECORD_OF_CORRECTIONS.md) shows what those safeguards caught.
3. The author must be able to explain and defend each design choice without the agent. That is
   the right thing for a reviewer to test, and the last section suggests where to press.

## How the method has changed

The project began on 3 May 2026 as a privacy-preserving exam-integrity prototype and became a
study of authority control for AI agents. What changed over six months is how much a reader has
to take on trust.

| When             | What was added                                                                                                                                                                     | What a reader no longer has to take on trust                                    | Record                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| May to Aug 2026  | A series of frozen stages, each with a closeout document, signed evidence and machine-checked proofs of selected properties.                                                       | That the stated artefacts exist and are unaltered.                              | [Research history](../RESEARCH_HISTORY.md)                             |
| 17 Oct 2026      | A matched-control study on two models: the same captured proposals run behind three controls, with a null result reported for one model.                                           | That a reported benefit is not an artefact of unequal comparison.               | [Transfer results](research/transfer-phase-17/RESULTS.md)              |
| 19 Oct 2026      | A review of 919 of the project's own documents, with 141 dated findings published, including overstatements in earlier closeouts.                                                  | That the project's own summaries are accurate.                                  | [Documentation audit](documentation-audit-2026-10-19/README.md)        |
| 1 Nov 2026       | Phase 19: one lane per gap found in a survey of 230 published lab pages, with a ledger in which authority to change anything is declared before it is used.                        | That a repair or a result was not shaped after the fact.                        | [Phase 19 ledger](research/PROVENANCE_PHASE_19.md)                     |
| 8 Nov 2026       | A line-by-line audit of the project's own Phase 19 work that found three blocking and twelve major defects, each then repaired with a test written first.                          | That the verifiers check what they say they check.                              | [Record of corrections](RECORD_OF_CORRECTIONS.md)                      |
| 8 to 10 Nov 2026 | Four replays run apart from the session that produced the evidence: three by the owner's reviewer on machines the owner controls, one by an outside operator on their own machine. | For five earlier packs, that the results reproduce away from the author's desk. | [Operator receipt and review](research/provenance-phase-19f/README.md) |
| 10 Nov 2026      | Model studies whose plan and instrument are committed and pushed seconds before the first generation.                                                                              | That the analysis was not chosen after seeing the data.                         | [19h](research/provenance-phase-19h/README.md)                         |
| 11 Nov 2026      | A confirmatory study with five hypotheses decided by rules written in code beforehand, a replay of every recorded send, and a manuscript draft.                                    | That an exploratory pattern repeats, and where it does not.                     | [Manuscript](research/provenance-phase-19-paper/PAPER.md)              |

## Problems the author cannot settle alone

These are the questions where a mentor, a collaborator or access to stronger models would change
the outcome. Each names what already exists to build on.

1. **An attacker that knows the gate.** Every send replayed so far came from a model that was not
   trying to defeat the control, and defences tested only on fixed attacks are routinely broken by
   adaptive ones. The fixtures, the replay harness and a declared but unrun informed-attacker arm
   exist. What is missing is a capable attacking model and someone experienced in adaptive
   evaluation to say when the attack was strong enough.
2. **Stronger models.** All Phase 19 model results are on 4-bit models that fit an 8 GB laptop.
   Whether a spoofed operator note moves a frontier model under the same contract is unknown, and
   unlike a plain refusal test its outcome is not predictable.
3. **Authority across context boundaries.** The contract tested here fits in one prompt. The
   harder cases are context compaction and hand-offs between agents, where the state that grants
   or withdraws authority may no longer be in what the model reads. The host-side state machine
   exists; an evaluation that exercises those boundaries does not.
4. **Cost on real tasks.** The gate refused no exact authorised send in 217, on fixtures where the
   authorised action is unambiguous. Its cost on a task benchmark, where legitimate work is messier,
   has not been measured in this phase.
5. **Reproduction and review by others.** One outside operator has replayed five earlier packs on
   macOS. The manuscript's studies have not been replayed outside the author's custody, and no
   researcher outside the project has read the manuscript.

## Where to press

A reviewer who wants to test the author's understanding, and not the agent's output, could ask:

- Why are the state-cluster intervals the ones to read in the confirmatory study, and which
  results weaken under them?
- Hypothesis H2 is recorded as supported. Why does the manuscript decline to lean on it?
- Why is "none of 1,439 wrong sends landed" a correctness check and not a security result?
- The credential gateway stopped 17% of wrong sends. What do those cases have in common, and what
  would a benchmark that tested only that case have concluded?
- Which claim in this repository is the author least sure of?
