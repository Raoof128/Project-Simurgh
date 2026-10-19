# Phase 17 — portable runtime prerequisites

19 October 2026 (Australia/Sydney), under the continuing owner instruction.

## Design

P17-B01 replaces the Stage 5P test's single macOS executable path with explicit
`SIMURGH_CHROME` selection and normal platform/PATH discovery. On managed Linux
Chromium, a wildcard URL block policy without a file-URL exception is a declared
missing prerequisite. It is an explicit skip, never a browser parity pass. Neither
policy files nor browser security settings are changed. A selected but failing
browser still fails; a missing configured path refuses rather than falling back.

P17-N01 discovers a real Node older than 26 using `SIMURGH_ALTERNATE_NODE` or PATH,
then puts that binary's directory first for the wrong-major test. The test must
observe wrapper exit 2; it never substitutes an empty PATH or mocks the version.

A standalone Stage 5R browser command uses the existing frozen manifest, portable
module and Python mirror, writes a new receipt to a caller-selected path, and
returns nonzero when browser parity is unavailable or false. It does not overwrite
the historical Stage 5R receipt or change its frozen driver.

## Exact maintenance authority

Commit this declaration before implementation; verify its commit is a strict
ancestor of the maintenance commit.

| Path                                                      | Operation | Purpose                                                    |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| `scripts/lib/runtimePrerequisites.mjs`                    | add       | P17-B01/P17-N01 discovery and explicit policy prerequisite |
| `scripts/check-browser-parity.mjs`                        | add       | Fresh Stage 5R three-runtime check and new receipt         |
| `tests/unit/runtimePrerequisites.test.js`                 | add       | Missing override, discovery and policy regressions         |
| `tests/unit/llmShield/stage5p/crossRuntimeParity.test.js` | modify    | P17-B01 portable discovery and named skip                  |
| `tests/e2e/llmShield/stage4kAllFunctions.test.js`         | modify    | P17-N01 real alternate runtime selection                   |
| `AGENT.md`                                                | append    | Authority and results                                      |
| `CHANGELOG.md`                                            | append    | Authority and results                                      |

## Lifecycle

- active_phase: maintained browser and wrong-major checks.
- protected_surface: actual runtime execution and honest prerequisite reporting.
- next_phase_behaviour: configurable discovery remains portable; a skip is never parity evidence.
- maintenance_behaviour: bounded changes with preceding exact-path authority.
- sunset_or_migration_condition: a versioned replacement retains historical source/receipts.
- anti_vacuity_condition: actual wrong-major exit; browser output must match every manifest vector; absent or policy-blocked browser never yields a verified receipt.

## Diagnosis

Both the packaged Chromium and direct binary timed out after 15 seconds on a
minimal page. A diagnostic browser session returned the organization's blocked-page
document. The managed URL policy blocks all origins except its designated platform
origin; file/data test navigation is unavailable. No policy bypass is authorized or
attempted. Official headless documentation was consulted at
<https://developer.chrome.com/docs/chromium/headless>.
