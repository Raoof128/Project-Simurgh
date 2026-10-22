# Phase 4: portable reproduction and retained effect evidence

Declared 16 October 2026, Australia/Sydney. Implements step 4 of the gap map
following the user's instruction to proceed. Phase 3 remains frozen at `78f6259a`.

## Contract

An operator can replay every saved phase 3 proposal through the native SDK and
sandbox receiver, retain a SQLite snapshot after every decision, and compare the
entire recomputed report with the published baseline. No weights, provider key or
model inference are needed for this lane. Replay is not a fresh model experiment.
An isolated standard-library observer process snapshots and reads the receiver;
it does not import the connector's observation function. The observer shares the
host and operator, so this improves inspectability, not organizational independence.

The runner imports frozen code without editing it. A scoped Session subclass adds
observation after each existing step, while the original analyzer retains its full
capture, schedule, feedback and report checks. Snapshot failure aborts completion;
partial output and a failure receipt remain. Never overwrite an output directory.
No historical unknown/runtime-error step is converted into a successful reproduction.

Each successful pack contains all raw SQLite snapshots, ordered observations,
the exact baseline report and runtime metadata. A canonical manifest commits the
exact path/hash set. Verification requires an expected manifest digest provided
separately; recomputing a digest from a supplied pack is not authenticating it.
The verifier rejects missing/extra/duplicate paths, wrong hashes, unexpected schema,
wrong observations and incomplete decision inventories. Zip files are read without
extracting paths. Counts and effects must agree with the frozen capture, including
zero-effect decisions. A producer controlling the host, all evidence and the trusted
root can still fabricate history; no signature or independent-witness claim is made.

An outside operator must retain their own root and raw pack, use their own machine
and fresh ephemeral receiver credentials, record affiliation/setup/discrepancies,
and distinguish saved-proposal replay from a separately frozen inference run.
No outside participation, outreach or external attestation is manufactured here.

## Implementation and verification plan

1. Add tests first in `tools/assurance-reproduce/tests/`: real SQLite snapshot,
   missing/corrupt observer data, exact inventories, omission/invention/truncation,
   wrong trusted root, duplicate/path-traversal archives and no-overwrite behavior.
2. Add `observer.py`, `reproduce.py`, and hash-bound `contract.json`. Reuse existing
   hash-pinned SDK/workflow locks; portable paths derive from checkout, never `/workspace`.
   Preflight checks Python 3.12/Linux x86_64, dependencies and source hashes; no silent skips.
3. Run all 540 branches and retain all 763 decision snapshots, publish a compressed
   pack, root receipt and runtime costs. Execute offline verification with system Python.
   Run in a clean checkout with a fresh hash-locked environment when available.
4. Fresh internal code review, one test-first repair pass, focused and repository tests,
   frozen-input checks, current navigation, append both logs, commit and push.

Allowed surface: new `tools/assurance-reproduce/**`, `docs/research/reproduction-phase-4/**`,
this design, README, ROADMAP, reviewer index, package.json, readiness workflow and both logs.
No frozen implementation, protocol, capture, report or historical claim changes.

| Field                         | Declaration                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Reproduction phase 4                                                                                                    |
| protected_surface             | Phase 4 runner/contract and retained reproduction pack                                                                  |
| next_phase_behaviour          | Existing replay remains usable; successors use separate namespaces                                                      |
| maintenance_behaviour         | Exact-scope declaration must precede repairs after freeze                                                               |
| sunset_or_migration_condition | Versioned successor preserves original evidence and limits                                                              |
| anti_vacuity_condition        | Exact frozen branch/decision identities, all snapshots, exact baseline comparison and externally supplied expected root |

## Decisions and execution ledger

- Ruling: implement portable replay and custody preparation before changing recovery.
  This directly serves the approved roadmap; cost: the 31 failed attacked branches
  remain failed and new model utility experiments are deferred to a fresh protocol.
- Ruling: retain a separately implemented same-host observer, explicitly weaker than
  outside custody; cost: malicious host fabrication remains outside the assurance boundary.
- Ruling: use the existing cloud checkout and environments; no environment-settings
  changes or worktree creation, consistent with the user's earlier direction.
- Scope: architectural extension of existing replay, bounded to evidence retention
  and portable execution; implementation follows the authorized next-phase roadmap.
- Review focus: partial runs, falsified manifests, path/ZIP/SQLite inputs, observer
  cleanup, exact baseline linkage and misleading independence claims.

- Pre-run verification: 13 focused tests pass in a fresh hash-locked Python environment;
  full npm suite 5,122 pass, zero failures, three existing Chrome/Lean skips. Ruff and
  dependency checks pass. The real SDK failure test retains a snapshot; forced observer
  timeout produces incomplete evidence and no success receipt.
- Fresh internal review found one schema-filter defect: SQL LIKE treated underscore as
  a wildcard and hid an extra `sqliteXhidden` table. Full evidence-path regression failed
  before repair and passes with the literal-prefix GLOB filter. No further important
  findings; no deferred minor findings. Reviewer did not assess the final pack or run.
- Ruling: final pack/source binding and full reproduction are author verification,
  not reviewed outside evidence. Cost: independent result review/custody remains open.
- Author test also rejected a forged receipt key that agreed with the altered database;
  the verifier now recomputes the deterministic key from the exact action identity.
- Freeze: the source contract includes the original protocol's 31 bindings, original
  capture/journal/report/protocol, both dependency locks and all new runner/test files.
  Source and contract freeze precede execution; no new model inference occurs.

## Execution result — 16 October 2026, Australia/Sydney

- Source freeze `41f26e57f0b226bc48ca374b43a686f5f7713155` preceded the run.
  Clean local clone and fresh hash-locked environment; same host/operator.
- Original run completed once, exit zero, stderr empty: 540 branches, 763 decisions,
  full report identical. Replay/snapshot/report time 89.236 seconds, excluding install
  and final packaging. Retained 329 nonempty and 434 empty databases.
- Archive 413,485 bytes; 9,375,744 raw SQLite bytes. Manifest root
  `02b3a143dcc1b3a19768d6849ed6ecd6b4ff49382611fc46dbc2f9fba517db7c`.
  Standard-library verification and separate author raw-database count check agree.
- All 39 source/data bindings and predecessor frozen paths remain unchanged. Thirteen
  phase 4 and thirteen phase 3 tests pass; npm 5,122 pass with three prerequisite skips.
  Gate census exactly retains its 39 problem identities. This preserves, not fixes, them.
- [Results](reproduction-phase-4/RESULTS.md) and [handoff guide](reproduction-phase-4/README.md)
  published with honest scope. Engineering preparation complete; G18 outside operator,
  G19 independent custody, fresh-host execution and recovery utility remain open.
