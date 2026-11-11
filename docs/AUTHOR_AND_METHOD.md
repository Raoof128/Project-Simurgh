# Author, working method and open problems

This page is for a reader who wants to judge the person and the process behind this repository as
well as its results. Every dated statement links to the record that supports it.

## Who is accountable

Project Simurgh is the work of one person, Mohammad Raouf Abedini
([ORCID 0009-0000-6214-258X](https://orcid.org/0009-0000-6214-258X)), an independent researcher.
The author decides what is studied, authorises every run and every spend, decides what is
published, and answers for every claim in the repository.

A CV is not project evidence, and the project's own audit says so
([finding M36](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m36--personal-résumé-is-not-verified-project-evidence)).
This page therefore makes no claim about the author that the repository cannot back.

## How the work is produced

An AI coding agent (Claude, from Anthropic) does much of the engineering under the author's
direction. The records show this division of labour.

The author sets the question and the constraints, chooses which experiments are worth running,
authorises each line of work and any cost, and decides what is released. The
[Phase 19 ledger](research/PROVENANCE_PHASE_19.md) records these instructions where they shaped a
study, for example the choice to run the experiments whose outcome was not known in advance.

The agent proposes each plan as a written declaration, writes instruments, verifiers and tests,
runs the captures and replays, and drafts the write-ups, including the first draft of the
[manuscript](research/provenance-phase-19-paper/PAPER.md).

The record holds both to account. A declaration is committed before the work it authorises, and
[AGENT.md](../AGENT.md) logs each change with its scope and verification. Commits made with the
agent carry a co-author line: 380 of the 2,275 commits on `main` at 11 November 2026, and nearly
every non-merge commit since Phase 19 began. An older commit without that line may still have had
an assistant's help.

A reviewer should weigh three consequences.

1. An agent typed most of the code and documents here, so their volume says little about the
   author. Judge the author by the questions asked, the experiments chosen, the limits stated and
   the errors admitted.
2. An agent can be confidently wrong. Four things guard against that: plans fixed before runs,
   verifiers that recompute every number from raw outputs, tests that pin write-ups to evidence
   packs, and replays run apart from the session that produced the evidence. The
   [record of corrections](RECORD_OF_CORRECTIONS.md) shows what they caught.
3. The author must be able to explain and defend each design choice without the agent. A reviewer
   should test that, and the last section suggests where to press.

## How the method has changed

The project began on 3 May 2026 as a privacy-preserving exam-integrity prototype and became a
study of authority control for AI agents. Over six months each step cut what a reader has to take
on trust.

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

A mentor, a collaborator or access to stronger models would change the outcome of each question
below. Each item names what already exists to build on.

1. **An attacker that knows the gate.** Every send replayed so far came from a model that was not
   trying to defeat the control, and adaptive attacks break defences that were tested only on
   fixed ones. The fixtures, the replay harness and a declared but unrun informed-attacker arm
   exist. The work lacks a capable attacking model, and someone experienced in adaptive
   evaluation to say when the attack was strong enough.
2. **Stronger models.** All Phase 19 model results are on 4-bit models that fit an 8 GB laptop.
   Whether a spoofed operator note moves a frontier model under the same contract is unknown, and
   unlike a plain refusal test its outcome is not predictable.
3. **Authority across context boundaries.** The contract tested in Phase 19 fits in one prompt.
   The harder cases are context compaction and hand-offs between agents, where the state that
   grants or withdraws authority may no longer be in what the model reads.
   [Phase 7](research/CONTEXT_PHASE_7.md) tested those transitions with scripted proposals, no
   live model and no real compaction or agent API. An evaluation with live models whose context is compacted or
   handed off has not been built.
4. **Cost on real tasks.** The gate refused no exact authorised send in 217, on fixtures where the
   authorised action is unambiguous. Phase 19 did not measure its cost on a task benchmark, where
   legitimate work is messier.
5. **Reproduction and review by others.** One outside operator has replayed five earlier packs on
   macOS. The manuscript's studies have not been replayed outside the author's custody, and no
   researcher outside the project has read the manuscript.

## Where to press

To test the author's understanding apart from the agent's output, a reviewer could ask:

- Why are the state-cluster intervals the ones to read in the confirmatory study, and which
  results weaken under them?
- Hypothesis H2 is recorded as supported. Why does the manuscript decline to lean on it?
- Why is "none of 1,439 wrong sends landed" a correctness check and not a security result?
- The credential gateway stopped 17% of wrong sends. What do those cases have in common, and what
  would a benchmark that tested only that case have concluded?
- Which claim in this repository is the author least sure of?
