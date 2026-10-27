# Pass-3 audit repair — 28 October 2026

Owner-requested repair of the High and main Medium findings of the strict pass-3 audit of `main`
at `6e4a1a0b` (27 October 2026). This declaration precedes implementation. Every finding below
was reproduced before this declaration; each repair lands with a regression test that fails on
`6e4a1a0b` first.

## Constraint: frozen gate sources stay byte-identical

`tools/assurance-signals/signals.py`, `tools/assurance-composed/composition.py`,
`tools/assurance-credentials/gateway.py`, `tools/assurance-context/context_gate.py` and their
tests are sha256-pinned in the `sources` of the Phase 6–17 `protocol.json` files. Editing them would
stop every archived study from replaying against the tree. The owner chose a **post-freeze
successor**: the frozen files are not modified; the four gate defects are fixed in a new module
that subclasses them, and SECURITY.md discloses that the evaluated code carries the defects.

`src/llmShield/**` is likewise outside this repair: the Stage 3K–3X policy-drift guards forbid
changes there, so the LLM Shield session flood is bounded at the mount point in `server.js`.

## Findings and authorized operations

| Finding                   | Exact path                                                                                            | Operation    | Purpose                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1 audit-chain forgery    | `src/privacy/hashIdentity.js`                                                                         | modify       | Derive the student-ID key with domain separation (`HMAC(base, "simurgh/student-id/v2")`), so the join response can never equal an audit-chain signature even when the base secret is the audit secret. Prefix becomes `v2:`.                                                                                       |
| H1                        | `tests/unit/hashIdentity.test.js`, `tests/unit/securityHardening.test.js`                             | modify       | `v2:` prefix; regression: a forged entry signed through `hashStudentId` fails `verifyChain`.                                                                                                                                                                                                                       |
| H1                        | `.env.example`, `PRIVACY.md`                                                                          | modify       | Document `SIMURGH_STUDENT_ID_PEPPER` and the derivation.                                                                                                                                                                                                                                                           |
| H3, M5, M6, macOS lock    | `tools/assurance-composed-successor/**`                                                               | add          | Successor pipeline: case-insensitive webhook headers (ambiguous duplicates rejected), caller-supplied `response_id`/`request_id` per route, a latch on any route that blocks every route, a stop that continues past a failing revoker, and sidecar lock files instead of `flock` on the SQLite file. Tests first. |
| H3, M5, M6                | `.github/workflows/assurance-composed.yml`                                                            | modify       | Run the successor tests; trigger on its paths and on the frozen modules it imports.                                                                                                                                                                                                                                |
| H4 4H evidence self-check | `tests/e2e/llmShield/stage4hFullSmoke.test.js`                                                        | modify       | Snapshot the committed 4H fixture and evidence bytes before the builder runs, assert the rebuild is byte-identical, and restore the snapshot afterwards.                                                                                                                                                           |
| H4 dirty tree             | `scripts/check.sh`, `scripts/check-e2e.sh`                                                            | modify       | Under `CI=true`, a dirty working tree after the gate is a failure.                                                                                                                                                                                                                                                 |
| Session flood             | `server.js`, `src/security/rateLimit.js`                                                              | modify       | Tokenless telemetry may not consume the capacity reserved for joined sessions and is rate-limited per IP; `POST /api/llm-shield/sessions` is rate-limited per IP at the mount; the instructor-token limiter keys on a fixed-length digest of the bearer.                                                           |
| Session flood             | `tests/unit/maintenance/pass3Runtime.test.js`, `tests/unit/rateLimit.test.js`                         | add / modify | Regressions for the three flood paths.                                                                                                                                                                                                                                                                             |
| Cannot-fail steps         | `scripts/check.sh`                                                                                    | modify       | Informational steps and skips are counted separately and never as passes; `Passed:` counts only checks that can fail.                                                                                                                                                                                              |
| Cannot-fail steps         | `scripts/check-e2e.sh`                                                                                | modify       | Remove the duplicated Stage 5C VSB entry.                                                                                                                                                                                                                                                                          |
| Unrun tests               | `package.json`                                                                                        | modify       | `npm test` uses Node's own recursive glob so every `tests/unit/**/*.test.js` file runs.                                                                                                                                                                                                                            |
| Unrun tests               | `tests/unit/maintenance/testDiscovery.test.js`                                                        | add          | Guard: every unit test file is matched by the `npm test` pattern.                                                                                                                                                                                                                                                  |
| Unrun tests               | `scripts/check.sh`                                                                                    | modify       | Run the whole `tools/agentdojo-simurgh-adapter/tests` directory, not nine named files.                                                                                                                                                                                                                             |
| CI pins                   | `.github/workflows/*.yml`                                                                             | modify       | Pin every `uses:` to a full commit SHA with the tag as a comment; install elan from a fixed release with a verified sha256, never from `master`.                                                                                                                                                                   |
| Effective sample          | `README.md`, `docs/research/transfer-phase-17/RESULTS.md`, `docs/research/transfer-phase-17/BRIEF.md` | modify       | State the six-scenario clustering and scenario-level intervals; hedge BRIEF.md line 25. Existing numbers are not changed.                                                                                                                                                                                          |
| Disclosure                | `SECURITY.md`                                                                                         | modify       | Record the four frozen-gate defects, the successor, and the residual LLM Shield session cap.                                                                                                                                                                                                                       |
| Record                    | `AGENT.md`, `CHANGELOG.md`                                                                            | append       | Log entry.                                                                                                                                                                                                                                                                                                         |

## Gate lifecycle

- **active_phase:** from this maintenance onward, the root unit suite, the quality gate and the
  successor pipeline.
- **protected_surface:** frozen sources and archived evidence stay byte-identical; every existing
  assertion stays at least as strict.
- **next_phase_behaviour:** a future study that wants the fixed gate freezes the successor's sources
  in its own `protocol.json`; it does not re-pin the old ones.
- **maintenance_behaviour:** no retry-to-green, no skip, no assertion loosened.
- **sunset_or_migration_condition:** the successor replaces the frozen pipeline only in a new,
  separately frozen study.
- **anti_vacuity_condition:** each regression test fails on `6e4a1a0b`; the discovery guard fails if
  a unit test file falls outside the pattern; the dirty-tree check fails when a CI gate leaves
  tracked files modified.

## Limits

No change to frozen sources, archived evidence, recorded numbers or `src/llmShield/**`. The LLM
Shield session store keeps its fixed capacity without eviction; the repair bounds how fast one
client can fill it and SECURITY.md states the residual. Branch protection on `main` is a repository
setting, applied after this branch merges, and recorded in the log entry.

## Addendum 1 — gates that observe the pinned workflows

Pinning the actions and the elan installer changes text that two existing gates read. Both are
updated in the direction their own lifecycle declares, before the repair commit:

| Exact path                                                            | Operation             | Purpose                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/linuxCiWorkflow.test.js`                                  | modify                | The Stage 2.8D test asserts the literal `dtolnay/rust-toolchain@stable`. It now requires the action pinned to a 40-hex commit **and** `toolchain: stable`, which is stricter: a moving ref fails it.                                                                                                            |
| `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` | modify `current` only | Re-pin the live census, as the gate's successor rule (5S-F015) requires. The 5Q `Install Lean (elan)` step no longer fetches `elan-init.sh` from `master`, so the census classifies it `unclassifiable_step` like the five other elan steps, not `missing_committed_universe_query`. `baseline` is not touched. |
