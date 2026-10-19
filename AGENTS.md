# Repository guidance

## Current entry points

- Read [README.md](README.md) and [the reviewer index](docs/REVIEWER_INDEX.md) for current
  research scope, reproducible commands and the distinction between active and historical work.
- Read the standing invariants at the start of [AGENT.md](AGENT.md), including the
  [gate lifecycle contract](docs/research/llm-shield/references/gate-lifecycle.md), before changing
  stage-owned gates or frozen surfaces.
- [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) state current component-specific
  boundaries. A historical test count or tagged result is not a result for the current tree.

## Research integrity

Preserve signed evidence, frozen specifications, historical releases and exact archival copies.
Add new measurements with their own scope and provenance; do not overwrite old results to improve
metrics. Separate implemented mechanisms, executed experiments and proposed work. Report failed,
skipped and unverified checks explicitly. See [CONTRIBUTING.md](CONTRIBUTING.md) for review steps.

## Documentation maintenance

Use [DOCUMENTATION.md](DOCUMENTATION.md) for current integration/reviewer routes and the
[dated audit](docs/documentation-audit-2026-10-19/README.md) for per-file review scope and errata.
Cite full paths when referring to phase numbers: the local continuation and provider-transfer
tracks reuse some numbers. Do not silently reinterpret an archived “current” or “pending” claim.

## Knowledge wiki

The Zurvan-federated [wiki scaffold](wiki/index.md) currently contains an index and log.
`wiki/decisions/` and `wiki/claims/` are intended destinations and are not populated in this checkout.
Use tracked documentation and evidence as the available record; do not imply that an absent wiki
claim or decision has been reviewed.
