# Contributing

Project Simurgh is a research prototype. Begin with [README.md](README.md), the
[reviewer index](docs/REVIEWER_INDEX.md) and [repository guidance](AGENTS.md). For substantial work,
describe the research question, affected component and expected evidence in an issue or proposal.
Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Keep claims tied to evidence

- State the threat model, corpus and implementation revision behind each result.
- Distinguish a synthetic fixture, an authorized live capture, a same-code reproduction and an
  independent implementation or operator evaluation.
- Include safe and vulnerable controls and make infrastructure failures distinguishable from
  successful detections. Report failures and skips alongside passes.
- Preserve signed artifacts and historical results. New evidence gets its own scope and record;
  do not regenerate frozen evidence or edit old numbers to make a new check pass.
- Inspect [AGENT.md](AGENT.md)'s standing invariants and the relevant stage's authority before
  changing stage-owned files. Declare the scope and lifecycle of any new gate.

## Local checks

Use Node.js 22 or newer for the focused demonstration; historical reproduction scripts can require
Node.js 26 and additional tools. Install with `npm ci`, then run checks appropriate to the change:

```bash
npm run test:openai
npm run openai:offline -- --out /tmp/simurgh-review-new.json
npm run openai:verify -- /tmp/simurgh-review-new.json
npm test
git diff --check
```

Choose a fresh report path for every run. For wider changes, inspect and run the relevant stage
reproduction commands and `scripts/check.sh`; preserve the original failure output when a check
fails. Record the environment and actual command results in the change description. Formatting
changes must not rewrite frozen evidence, specifications or exact historical archives.

The optional live API path needs explicit owner authorization, an approved model and spending
scope. Do not commit credentials, private correspondence, identifiable participant data or raw
sensitive capture output. Review generated reports before publication.

## Review handoff

Explain the problem, resulting behavior, evidence, limitations and unresolved checks. Keep factual
corrections separate from historical measurements. Existing code remains under its current license;
check license compatibility before copying code into differently licensed upstream projects.
Publication, deployment, paid API use and submission are separate owner decisions.
