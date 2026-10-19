# Phase 18 — shared evidence explorer

Declared 19 October 2026 under the owner's request for a human dashboard, agent CLI,
failure inspection and searchable 2026 documents and industry gaps.

## Design

Build one versioned, local evidence index and pure query library shared by a React/Vite
dashboard and dependency-free Node CLI. Preserve source statuses; derive clearly named
failure flags rather than turning every block into a model failure. Show unauthorized
effects, active-task incompletion, explicit errors and unknown acknowledgments separately.
Public Phase 14 records remain the default; an explicit local full-evidence index can
include Phase 10 actions/reasons with their omitted-field and trust limits displayed.
No paid inference, remote execution, automatic retries, or provider mutations.

Search scoped repository research documents and a dated primary-source register; retain
URLs, retrieval dates, excerpts and the distinction between source facts and our gap
analysis. Search is a local index, not a claim of live exhaustive web search. Re-check
selected current 2026 official sources for the initial register. Loaded records are data,
never instructions. Render text without raw HTML and reject unsupported/oversized bundles.

Default local server binds loopback, exposes only generated UI/data assets, and offers
no filesystem API or command execution. Browser imports stay in memory. The CLI emits
versioned JSON for agents, including evidence provenance and verification limitations.
Hash binding is integrity information, not independent custody or semantic verification.

## Additive write authority

- Add `tools/simurgh-explorer/**` (isolated package, shared library, CLI, indexer, UI,
  tests, README, local gitignore; generated dist/node_modules remain ignored).
- Add `docs/research/explorer-phase-18/**` (dated source register, gap analysis and results).
- Add `docs/research/CONTINUATION_HANDOFF_2026-10-19.md` and fresh validation records
  under `docs/research/continuation-validation-2026-10-19/**`.
- Update current navigation only: README, ROADMAP, docs/REVIEWER_INDEX.md.
- Append AGENT.md and CHANGELOG.md and update this ledger with measured results.

No historical source, capture, frozen protocol or receipt changes. No root dependency
changes and no new mandatory CI gate. The dashboard is a research viewer, not an
authorization controller. A shared schema/query layer avoids UI/CLI interpretations
drifting. A standalone web project avoids perturbing the historical app and packages.

## Acceptance and lifecycle

Exact preservation of 144 public rows; real failure/unknown filters; matching CLI/UI
queries; inspectable source records; local imports and filtered export; cited research
search and explicit gap states; invalid schema, path escape and oversized input refusal.
Test the behavioral contract and build the production app. Attempt browser verification
only where allowed; report managed-browser limitations rather than inventing a screenshot.

- active_phase: human/agent exploration of retained research evidence.
- protected_surface: source fidelity, explicit provenance, no execution of evidence.
- next_phase_behaviour: additive schema adapters preserve outcome meaning.
- maintenance_behaviour: version changes require compatibility tests and recorded scope.
- sunset_or_migration_condition: successor keeps original archives independently replayable.
- anti_vacuity_condition: nonempty exact inventory, negative controls, no unverified-to-verified promotion.
