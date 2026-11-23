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

## Phase 19 coverage, declared 23 November 2026

Declared under the owner's request of 23 November for a full audit of the dashboard, which
shows none of the thirty-one Phase 19 packs. This section is committed before the change it
covers.

**Design.** Add Phase 19 lanes to the same index, query layer, dashboard and command line.
A lane is read from committed files only: the lane table and status of the operator handoff
tool, each pack's receipt, report and protocol, the lane's two pages, the ledger's dated
rulings and the README's list of open work. No figure, outcome or wording about a lane is
typed into the tool. At build time the explorer opens no Phase 19 archive and verifies none;
it compares a lane's root file with the root its receipt names and refuses the lane on a
mismatch. Lanes
are an optional, validated part of the `simurgh.explorer.v1` bundle, so a file written before
them still loads. The interface is redrawn around the lanes; the transfer-study view, the
imports, the exports and the server's limits keep their behaviour.

**Additive write authority.**

- Change `tools/simurgh-explorer/**`: new modules for lanes and views, the shared query
  layer, the command line, the stylesheet, the tests and the README. Add one image,
  `src/simurgh-mark.png`, cut from `docs/Project-Simurgh-Logo.png` by a script kept beside it,
  and one more served file type, PNG, so that the server can send it. Add a check that
  recomputes a pack's root and member hashes in the reader's browser: the build copies the
  packs beside the index, the server gains the ZIP file type to send them, and the page
  reports a match or what differs, and can list a pack's members and show one as text. It
  never reports a pack as verified, and it replays nothing. Give the command line a command for each view of the dashboard, a `watch` command
  that compares with a saved snapshot and signals by exit code, and the same commands as
  read-only tools over standard input and output. A tool takes no file path, and nothing
  opens a network connection.
- Add `docs/research/explorer-phase-18/AUDIT_2026-11-23.md`.
- Update current navigation only: `README.md`, `ROADMAP.md`, `DOCUMENTATION.md`.
- Append `AGENT.md` and `CHANGELOG.md`, and this section.

No pack, receipt, lane page, ledger entry, frozen file or handoff text changes. No root
dependency changes and no new gate or hosted job. The explorer's own dependencies stay as
they are.

**Acceptance.** Every pack in the repository is a lane and nothing else is. Each outcome
equals the pack's receipt. Wording is found on the lane's own page. Each verify command is
the one the rendered handoff prints. The outside status equals the handoff tool's own. A
mismatched root is refused. A bundle without lanes loads. Hostile text in a lane stays inert.
The command line and the browser layer agree. A lane the tool has never seen appears from
its files alone, and the tool's source holds no lane id, declaration id, root or model name.
A test drives the built app in a real browser through every lane, at several widths and in
both colour schemes, and what was not checked is said.

- active_phase: human and agent exploration of retained research evidence, Phase 19 included.
- protected_surface: source fidelity, explicit provenance, no execution of evidence.
- next_phase_behaviour: a new pack appears when the handoff table names it; a pack whose
  receipt has a new shape shows its predictions as none declared until a reader is added.
- maintenance_behaviour: a change to the bundle stays additive and keeps the older-file test.
- sunset_or_migration_condition: a successor keeps the packs independently verifiable.
- anti_vacuity_condition: the lane inventory is compared with the repository in both
  directions, and a test requires at least one failed prediction to be shown.
