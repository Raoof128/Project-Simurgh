# Phase 16: bounded maintenance continuation

Authority: the user requests completion of all locally feasible phases and tests, with
standing authorization to commit and push the topic branch. Baseline: `cab202af`.
This declaration must be committed before implementation. No provider calls or keys.

## Design and findings

P16-GATE: deployed legacy live requests are permanently retired (HTTP 410). Migrate
HTTP smoke expectations, retain mock/fixture defenses and historical adapter unit tests.
Do not restore the billable route. Optional legacy live smoke must also assert retirement.

P16-SET: retain the exact historical 50-script Stage 5S pin. Add a versioned current
manifest extending that set with the strict Stage 5L successor. Share validation between
runner and tests: verify baseline digest, exact set equality, duplicates, removals and
additions, with nonempty input. Do not silently regenerate pins during tests.

P16-BROWSER: discover an explicit browser override or standard installed paths. An
explicit invalid override fails; an absent optional browser skips visibly; an installed
browser that fails is a failure. Preserve browser modules and vectors byte for byte.
Diagnose the existing headless timeout before claiming parity.

P16-DOCKER: fix source ownership for non-root operation with restrictive checkout modes.
Support an explicit offline lock-verified npm cache build; preserve default online build,
TLS verification, lockfile integrity and mock-only smoke behavior.

## Prior authority write surface

Only the operations below are authorized; no frozen verifier, evidence, receipt,
protocol, baseline inventory or application source is changed.

| Path                                                             | Operation | Purpose / finding                                             |
| ---------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| `tests/e2e/llm_shield_stage3e_live_disabled_smoke.mjs`           | modify    | P16-GATE                                                      |
| `tests/e2e/llm_shield_stage3e_live_missing_key_smoke.mjs`        | modify    | P16-GATE                                                      |
| `tests/e2e/llm_shield_stage3e_live_context_rejected_smoke.mjs`   | modify    | P16-GATE                                                      |
| `tests/e2e/llm_shield_stage3e_live_rate_limit_smoke.mjs`         | modify    | P16-GATE                                                      |
| `tests/e2e/llm_shield_stage3e_live_optional_anthropic_smoke.mjs` | modify    | P16-GATE                                                      |
| `scripts/security-audit-llm-shield-stage3e.sh`                   | modify    | P16-GATE                                                      |
| `scripts/smoke-llm-shield-stage3e-live.sh`                       | modify    | P16-GATE                                                      |
| `scripts/runAllPriorReproduce.sh`                                | modify    | P16-SET                                                       |
| `tests/e2e/llmShield/stage5s/priorReproduceSet.test.js`          | modify    | P16-SET                                                       |
| `tests/unit/llmShield/stage5p/crossRuntimeParity.test.js`        | modify    | P16-BROWSER                                                   |
| `Dockerfile.gateway`                                             | modify    | P16-DOCKER                                                    |
| `scripts/docker-smoke-llm-shield-stage3e.sh`                     | modify    | P16-DOCKER                                                    |
| `scripts/lib/currentReproduceSet.mjs`                            | add       | Bounded helper, regression, manifest or reproducible report   |
| `scripts/lib/browserExecutable.mjs`                              | add       | Bounded helper, regression, manifest or reproducible report   |
| `tests/unit/maintenance/currentReproduceSet.test.js`             | add       | Bounded helper, regression, manifest or reproducible report   |
| `tests/unit/maintenance/browserExecutable.test.js`               | add       | Bounded helper, regression, manifest or reproducible report   |
| `docs/research/maintenance-phase-16/prior-reproduce-set.v2.json` | add       | Bounded helper, regression, manifest or reproducible report   |
| `docs/research/maintenance-phase-16/Dockerfile.gateway.offline`  | add       | Bounded helper, regression, manifest or reproducible report   |
| `docs/research/maintenance-phase-16/RESULTS.md`                  | add       | Bounded helper, regression, manifest or reproducible report   |
| `docs/research/maintenance-phase-16/RUNBOOK.md`                  | add       | Bounded helper, regression, manifest or reproducible report   |
| `README.md`, `docs/REVIEWER_INDEX.md`, `ROADMAP.md`              | modify    | Link current maintenance results; preserve older observations |
| `AGENT.md`, `CHANGELOG.md`                                       | append    | Matching dated Raouf audit entries                            |
| `docs/research/LOCAL_MAINTENANCE_PHASE_16.md`                    | append    | Implementation rulings and validation receipt                 |

## Gate lifecycle

- **active_phase:** Phase 16 maintenance, successor to Phase 15's recorded failures.
- **protected_surface:** Historical pin and browser evidence unchanged; deployed retirement,
  exact current script inventory, real browser execution and non-root container remain checked.
- **next_phase_behaviour:** New scripts require an explicit versioned inventory update;
  unrelated changes remain permitted. Missing optional platform support is reported separately.
- **maintenance_behaviour:** Commit exact scope and reason before changing a protected gate.
- **sunset_or_migration_condition:** Replace the current manifest through a documented version
  migration; historical sets and their tests remain available and hash bound.
- **anti_vacuity_condition:** Reject empty/duplicate/substituted sets; verify exact 410 responses,
  real browser checks and non-root mock receipt. Never equate skipped/failed lanes with passes.

## Verification plan

Reproduce gateway and inventory failures first. Exercise negative inventory controls and
browser-selection failures; run affected gateway suites and container smoke, full Node unit
and E2E suites where prerequisites permit. Retain exact statuses and limitations. Check
frozen paths unchanged, authority ancestry, formatting and push the topic branch.

## Implementation ruling

The existing Chromium 154 executable runs JavaScript through its debugging protocol, but
`--dump-dom about:blank` times out and `file://` navigation returns
`ERR_BLOCKED_BY_ADMINISTRATOR`. The new Stage 5P harness uses the supported loopback HTTP
origin and local debugging pipe. It does not change browser policy, CSP, portable code,
vectors or frozen receipts. A failing installed browser remains a failure. Other historical
browser drivers retain their historical behavior and must not inherit this lane's result.

## Additive Stage 5R browser successor authority

P16-BROWSER-R authorizes **add** of the exact path
`tests/unit/maintenance/stage5rBrowserParity.test.js` before implementation. It independently
runs the unchanged Stage 5R portable module over the exact committed manifest, comparing
Node core, portable Node, Python and real browser answers with the existing checker. It
must include missing/wrong-answer negative controls. This closes current portability
coverage without rewriting the historical driver or its frozen receipt. The six lifecycle
fields above apply; a missing browser explicitly skips and a failing browser fails.

## Validation publication surface

Authorize **add** of `docs/research/maintenance-phase-16/logs.zip` and
`docs/research/maintenance-phase-16/validation.json` for retained command logs, per-file
hashes, exact tested revisions, test outcomes and exclusions. Any known public synthetic
canary redaction must be stated. Do not include credentials, process environments or private
attachments. This is a new publication, not a change to frozen Phase 15 observations.

## Additional reproduced gate defects: prior authority

P16-LITERAL authorizes **modify** of
`tests/unit/llmShield/stage5p/rawCodeCensus.test.js`: retain the full reserved-code regex and
file-level correlation; exclude only two exact hash-bound historical lines in `AGENT.md`
and `CHANGELOG.md` whose unrelated total is 469. Require each exception to occur exactly
once and prove changed bytes, changed paths and appended code do not qualify. No blanket
root-log allowlist and no historical line edits. This supersedes a false correlation exposed
when the new append-only log truthfully names Stage 5P. Lifecycle: current gate remains
active; later edits require new prior authority; empty or altered exceptions refuse.

P16-CANARY authorizes **modify** of
`tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` and **add** of
`tests/unit/maintenance/privacyCanary.test.js`. Recognize only the exact
`node_id_hash_if_paired` field with canonical SHA-256 syntax as a permitted hashed identifier;
retain raw field/value detection elsewhere, including malformed values at that same key.
Export the detector behind an import-safe CLI guard for deterministic regression controls.
The reproduced failure was digits 4321 inside a valid 64-hex digest, not a raw PID leak.
Lifecycle: this synthetic smoke remains active; no production privacy policy changes;
missing/modified raw-value detection must fail the regression controls.
