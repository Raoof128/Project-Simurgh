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
