# Reviewer index

Start with one falsifiable question: does the local authorization boundary reject unauthorized tool
consequences while allowing authorized work on the declared synthetic cases? The current package
makes this experiment inspectable and records what has and has not been validated.

## Suggested review sequence

1. Read the [research brief](openai/OPENAI_BRIEF.md) and [evaluation protocol](openai/EVALUATION.md).
2. Run the offline demonstration using the commands in [README.md](../README.md). Use a fresh
   report path, verify the artifact and examine the vulnerable, safe and orthogonal failure controls.
3. Read the [claim audit](openai/CLAIM_AUDIT.md), [security review](openai/SECURITY_REVIEW.md) and
   [readiness report](openai/READINESS_REPORT.md). A passing demonstration does not close the
   historical security findings or establish real connector isolation.
4. Challenge the scope: the corpus is authored locally, the effects are simulated and the oracle
   shares the harness's trust domain. No live OpenAI result or independent operator replication is
   established by the offline report.
5. Inspect the [proposal](openai/PROPOSAL.txt) for the experiments intended to reduce those limits.
   The [application checklist](openai/APPLICATION_CHECKLIST.md) records owner inputs still needed.

## Which documents describe which state?

For the next empirical milestone, read the [real-effects lab](assurance/README.md) and
[source-backed industry gap map](assurance/INDUSTRY_GAPS.md). This separate experiment measures
actual disposable disk writes and trace discrepancies. Its saved report is replayable with
`npm run assurance:verify -- docs/assurance/evidence/report.json`. The original OpenAI report's
simulated-effect limits above still apply to that original instrument. The subsequent
[SDK integration](assurance/sdk/README.md) exercises native OpenAI Agents SDK and LangGraph
approval/resume flows against the unchanged lab; it includes reproducible setup, all 102 matrix
rows, native lifecycle probes and explicit unsupported behavior. The [durability study](assurance/durable/README.md)
then adds real process kills, restarts and concurrent workers against a separate idempotent
file sink. Its report distinguishes created, recovered and replayed completions.

| Documents                                                                                                                                                                                                                                     | Read them as                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [README](../README.md), [ROADMAP](../ROADMAP.md), `docs/openai/`                                                                                                                                                                              | Current research entry point, focused evaluation and proposed follow-up work                                                                                    |
| [SECURITY](../SECURITY.md), [PRIVACY](../PRIVACY.md)                                                                                                                                                                                          | Component-specific current guidance with explicitly identified historical architecture                                                                          |
| [RESEARCH_HISTORY](../RESEARCH_HISTORY.md), [DEVICE_ROADMAP](../DEVICE_ROADMAP.md)                                                                                                                                                            | Exact historical copies, including old scores, vendor framing and status labels; not current assurance                                                          |
| [Research programme](RESEARCH_PROGRAMME.md)                                                                                                                                                                                                   | May 2026 device-track plan at v0.4.4; its “current,” “next” and 10/10 score refer to that snapshot                                                              |
| [Reviewer checklist](REVIEWER_CHECKLIST.md), [demo script](DEMO_SCRIPT.md), [validation](VALIDATION.md), [threat model](THREAT_MODEL.md), [resource plan](RESOURCE_PLAN.md), [risk register](RISK_REGISTER.md), [limitations](LIMITATIONS.md) | Stage 1/2 reviewer history, not the current OpenAI workflow. Some retained planning statements say Stage 2 is pending even though later releases implemented it |
| [AGENT.md](../AGENT.md), [CHANGELOG](../CHANGELOG.md)                                                                                                                                                                                         | Dated activity records; historical follow-ups and test counts may have been superseded                                                                          |
| `docs/research/`, `docs/stages/`, `docs/superpowers/`, `papers/`                                                                                                                                                                              | Research-specific claims, frozen plans, closeouts and manuscripts; check the stated stage, tag and evidence before reuse                                        |
| [Wiki](../wiki/index.md)                                                                                                                                                                                                                      | Index/log scaffold; the intended claims and decisions directories are not populated                                                                             |

Use [CONTRIBUTING.md](../CONTRIBUTING.md) for current contribution checks. Old examples using
`npm install` are not the preferred reproducibility path: use `npm ci` with the committed lockfile.
Do not run historical fix/regeneration commands on signed evidence without reviewing their scope.

## What would strengthen the research?

A useful review tests a specific mechanism and publishes enough detail to reproduce its failure or
success: threat model, case provenance, implementation revision, controls, measured consequences,
results, limitations and the next experiment. Independent reproduction and comparison with
established evaluation frameworks would strengthen external validity; neither is claimed complete.
A publication or preprint should be evaluated by its methods and evidence, not treated as peer
review or endorsement merely because it has a DOI or is publicly hosted.

The [presentation audit](openai/PRESENTATION_AUDIT.md) distinguishes complete automated document
scanning from the smaller set of entry points reviewed semantically. It records unresolved issues
rather than treating a file count as proof of quality.

## Real Redis connector evidence

The [Redis study](assurance/redis/README.md) adds 19 real-service cases for lost replies, conditional
writes, conservative reconciliation, eight-worker contention and AOF restart. Read the
[validation record](assurance/redis/VALIDATION.md) and [saved report](assurance/redis/evidence/report.json)
with their same-host, synthetic-effect and unknown-outcome limits. Older reports remain unchanged.
