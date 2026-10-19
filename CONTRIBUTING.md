# Contributing

Project Simurgh is a research prototype for agent authorization and inspectable evidence.
Start with the [README](README.md), [reviewer guide](docs/REVIEWER_INDEX.md),
[integration matrix](docs/INTEGRATIONS.md) and [repository guidance](AGENTS.md).
Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

## Evidence and change scope

State the research question, affected component, threat model and expected observable result.
Before changing a stage-owned gate or frozen surface, read the standing invariants in
[AGENT.md](AGENT.md) and the relevant stage declaration. Authority must precede the repair.

- Preserve source-bound inputs, signed artifacts, exact archives and historical measurements.
  New evidence receives its own revision, corpus, configuration and provenance.
- Distinguish scripted fixtures, saved-proposal replay, fresh model capture, project-operated CI
  and independent operator evaluation. A separate code path is not independent custody.
- Report useful completion alongside unauthorized effects. Keep refusals, malformed proposals,
  infrastructure errors, unknown effects and skipped checks in their declared denominators.
- Correct current instructions directly; put corrections to frozen records in dated errata.
  Follow the [documentation maintenance rules](DOCUMENTATION.md).

## Reproducible environments

| Task                                    | Environment                                                                                | Entry point                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Current credential-free evidence replay | Full Git history, Python 3.12, hash-locked SDK/workflow dependencies, POSIX local services | [README replay](README.md#replay-the-evidence)                            |
| Dashboard and JSON CLI                  | Node 24 or 26; isolated package lock for UI build                                          | [Explorer guide](tools/simurgh-explorer/README.md)                        |
| Historical offline Node instrument      | Root `npm ci`; Node 22+ for this focused instrument                                        | [Instrument guide](tools/openai-readiness/README.md)                      |
| Full base/E2E reproduction              | Node 26 plus the recorded Python, Lean, Rust, Xvfb and Docker prerequisites                | [Full smoke report](docs/research/smoke-validation-2026-10-19/RESULTS.md) |
| Native platform checks                  | Real macOS/Swift or Windows/.NET host as specified by the workflow                         | [Native CI workflow](.github/workflows/provider-transfer-native.yml)      |

Run from the repository root unless a component guide says otherwise. Use `npm ci` and
committed lockfiles; upgrading a dependency is a separate change with its own validation.
Use fresh output directories. Some historical reproduction commands regenerate evidence:
run broad suites in a disposable full-history checkout and inspect the resulting diff.

## Checks appropriate to the change

For the original offline Node instrument:

```sh
npm ci
npm run test:openai
review_dir=$(mktemp -d)
npm run openai:offline -- --out "$review_dir/report.json"
npm run openai:verify -- "$review_dir/report.json"
```

For implementation changes, run affected tests and the applicable reproduction script.
For broad integration changes, inspect and run `bash scripts/check.sh` and
`bash scripts/check-e2e.sh` in an isolated checkout. The latter's 32 steps exercise 29 distinct
historical reproduction scripts; it does not run every historical runner or opt-in live campaign.
Record source SHA, tool versions, commands, exits, failures, skips and retained logs.

For documentation changes, check paths, anchors, examples, source attribution, changed claims
and `git diff --check`. Format only edited mutable documents; do not use a repository-wide
rewrite to reformat frozen evidence. A passing prose check does not refresh old test receipts.

## Data and live experiments

A new paid/model campaign needs a declared model, data scope, budget and stopping rule.
Use existing authorized scope when applicable; a replay needs no provider key. Never commit
credentials, private correspondence, identifiable participant records or raw sensitive traces.
Review every generated export before publication. `store: false` is not a universal provider
retention guarantee. See [PRIVACY.md](PRIVACY.md).

## Review handoff

Describe the problem, resulting behavior, evidence and remaining limits for a reviewer who has
not read the conversation. Link the exact result and source revision. Update current navigation
and append the required dated entries to `AGENT.md` and `CHANGELOG.md`, accurately attributing
work and assistance. Preserve original failures when reporting a successful repair.

The repository uses AGPL-3.0-or-later; inspect separately licensed dependencies and model terms.
Do not imply provider endorsement, publication acceptance or relicensing. Deployment, spending,
submission and outreach must remain within the owner's explicit authorization.
