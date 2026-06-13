# Stage B5 — Model Review Protocol

**Stage:** B5 — Banking Shield Model-Assisted Evidence Synthesis and Paper Draft
**Subtitle:** Using a frontier model as a controlled research-review engine over sanitised evidence
**Date:** 2026-06-12 (Australia/Sydney)
**Model:** Claude (Fable 5), executed inline in Claude Code with all prompts and responses logged in-repo.

## Core strategy

```text
Model     = research amplifier
CI/tests  = proof source
Sanitised evidence = only input
Paper     = final output
```

The model is used as a committee of specialists (claim prosecutor, hostile reviewer,
methodology auditor, threat modeller, paper architect, editor) — never as a
validator of the system itself.

## Golden rule

> The model can improve the paper.
> The model cannot validate the system.

System validation comes exclusively from: unit tests, smoke gates, privacy
audits, security audits, HMAC evidence fixtures, Phase B aggregate results, and
B4-A firewall receipts. Every factual statement in model output must trace back
to `MODEL_REVIEW_INPUT_PACK.md`; anything else is flagged and discarded.

## The 12 passes

| #   | Pass                 | Output artifact                                                           |
| --- | -------------------- | ------------------------------------------------------------------------- |
| 1   | Novelty extraction   | `MODEL_RESPONSE_LOG.md` §Pass 1                                           |
| 2   | Claim prosecutor     | `MODEL_CLAIM_AUDIT.md`                                                    |
| 3   | Reviewer #2 attack   | `MODEL_RESPONSE_LOG.md` §Pass 3                                           |
| 4   | Methodology audit    | `MODEL_RESPONSE_LOG.md` §Pass 4                                           |
| 5   | Threat model builder | `MODEL_RESPONSE_LOG.md` §Pass 5                                           |
| 6   | Related-work mapper  | `MODEL_RESPONSE_LOG.md` §Pass 6 (categories only — no invented citations) |
| 7   | Figure/table planner | `MODEL_RESPONSE_LOG.md` §Pass 7 + `paper/figures/` + `paper/tables/`      |
| 8   | Abstract generator   | `MODEL_RESPONSE_LOG.md` §Pass 8                                           |
| 9   | Paper outline        | `paper/banking-shield-paper-outline.md`                                   |
| 10  | Draft v0.1           | `paper/banking-shield-paper-v0.1.md`                                      |
| 11  | Reviewer simulation  | `MODEL_RESPONSE_LOG.md` §Pass 11                                          |
| 12  | Final polish         | applied to v0.1 in place; noted in §Pass 12                               |

Prompts are versioned in `prompts/01-…12-….md`. Responses are logged in
`MODEL_RESPONSE_LOG.md` with a rubric score per pass.

## Scoring rubric (every pass)

| Criterion                   | Pass rule                                |
| --------------------------- | ---------------------------------------- |
| Uses only provided evidence | No invented results                      |
| Claim discipline            | No forbidden claims                      |
| Privacy discipline          | No request for sensitive data            |
| Method honesty              | Phase B framed as small internal dry run |
| Paper usefulness            | Actionable improvements                  |
| Citation discipline         | No fabricated citations                  |
| Non-claims preserved        | Explicit limitations remain              |
| Reproducibility             | Points back to tests/evidence            |

A pass that fails any rubric row is re-run or its output is struck from the
record (struck content stays in the log, marked `REJECTED`).

## Stage breakdown

```text
B5-A = Model-assisted evidence synthesis (passes 1–8)
B5-B = Paper draft v0.1 (passes 9–10)
B5-C = Reviewer simulation + claim audit (passes 11–12, claim audit refresh)
B5-D = Preprint v1.0 (next stage; revision against B5-C findings)
```

## System instruction used for every pass

See `prompts/00-system-instruction.md`. In short: use only the evidence pack;
invent nothing; flag unsafe claims instead of strengthening them; treat the
system as a fictional banking-adjacent research prototype.
