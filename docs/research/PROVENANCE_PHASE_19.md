# Phase 19: authority provenance

Declared 1 November 2026 (Australia/Sydney), baseline `30fe9e4b`, under the owner's instruction to
proceed with the gauntlet-revised design
([Phase 19 v2.1](../superpowers/specs/2026-11-01-phase-19-authority-provenance-design.md)).
Phase 19a is executed here; 19b–19g are declared scope and are not implemented by this entry.

## Design and scope

The 1 November gap hunt ranked fifteen gaps from 230 lab pages; the design answers them with an
agent-writable manifest, provenance-tagged decision records, a belief-sensitivity receipt and one
lane per gap. Phase 19a is the only sub-phase with no new runtime mechanism: a verifier and a pack
that recompute four projections from the frozen Phase 17 archive (declines/blocks/admits per
generation and control; an awareness-flag sidecar that is not evaluable on this archive; coverage as
three counts with an architectural denominator; a judge-free row and the forced-call citation).
Results: [provenance-phase-19a/RESULTS.md](provenance-phase-19a/RESULTS.md).

Trusted host, provisioning, storage and receiver, as in the README. The frozen modules are neither
edited nor imported except for the optional Linux replay chain. Recomputing the project's own
archive is not custody evidence.

## Write scope and gate lifecycle

Add `tools/assurance-provenance/**`, `docs/research/provenance-phase-19a/**`, this ledger and the
Phase 19 design, plan, plug-in map and gauntlet records under `docs/superpowers/`. Modify
`.prettierignore` (P19-FORMAT01: three evidence files, bytes preserved), `AGENT.md` and `CHANGELOG.md`.
Modify nothing frozen. The CI workflow `.github/workflows/assurance-provenance.yml` is **not** added by this entry.

**P19-CI01 (declared, not yet exercised).** When the workflow is added, that single commit may modify
only `current` in `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` for the exact
new CI identities measured by `measureGateCensus.mjs` against the draft workflow (Phase 9 added one
identity for its step; the count here is measured, not assumed), and must carry a `paths:` filter on
`tools/assurance-provenance/**` and `docs/research/provenance-phase-19a/**`. This declaration must be
a strict ancestor of that commit. Preserve all non-current fields.

| Field                         | Declaration                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Phase 19a projection verifier (19b–19g declared)                                                                    |
| protected_surface             | New source/tests, protocol and retained pack under the new namespace                                                |
| next_phase_behaviour          | 19b–19g add lanes in the same namespace, subclass the unpinned successor, and never edit a pinned file              |
| maintenance_behaviour         | Bounded repair authority precedes any change to the protocol's pinned sources                                       |
| sunset_or_migration_condition | A versioned successor preserves the 288-branch projection and its verify command                                    |
| anti_vacuity_condition        | 288 split rows and 96 sidecar rows recomputed; five named mutations and a wrong root rejected with distinct reasons |

## Execution ledger

- Ruling: design approved only after a four-review gauntlet; v1 failed (41 findings), v2.1 holds with
  0 P0/P1 open in text. 19a approved outright by the closure reviewer; 19b/19c text fixed after that
  review and not independently re-read.
- Ruling: the pack was produced on macOS without the frozen replay chain, after the lane sources
  were committed; `receipt.json` records the host outcome and the commit in `tree_state`. A Linux
  run with `--replay` is owed before any "replayed" wording.
- Tests: 18 passed (`tools/assurance-provenance/tests`), ruff clean. No hosted CI receipt yet.
