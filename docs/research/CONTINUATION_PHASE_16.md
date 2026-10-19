# Phase 16 — maintained gate migration

19 October 2026 (Australia/Sydney). Raouf authorized completing the remaining
tasks consecutively. Baseline: `cab202af` on `openai-readiness`.

## Design and acceptance

P16-G01 migrates maintained HTTP tests to the already-retired live gateway contract:
HTTP 410 with `legacy_live_gateway_retired`, regardless of historical provider flags,
key presence or call limits. Mock/fixture checks continue exercising their boundaries.
No live endpoint is restored and no provider request is required.

P16-G02 preserves the exact Stage 5S historical 50-script pin. A separate versioned
maintenance manifest binds that pin by SHA-256 and declares the strict Stage 5L
successor as an addition. Both the test and runner use the same validated union.
Unexpected additions, removals, duplicates, self-inclusion, pin mutation and empty
sets refuse. Tests remove and add identities independently, including equal-count
replacement. The runner executes the validated set, including the strict successor.

## Authority before implementation

This declaration must be committed before implementation. Its commit must be a
strict ancestor of the implementation commit. The following exact paths are the
authorized maintenance surface; this does not change any historical result or grant
authority over other frozen files.

| Path                                                             | Operation | Purpose                                                        |
| ---------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| `tests/e2e/llm_shield_stage3e_live_disabled_smoke.mjs`           | modify    | P16-G01 retired contract                                       |
| `tests/e2e/llm_shield_stage3e_live_missing_key_smoke.mjs`        | modify    | P16-G01 retired contract with missing key                      |
| `tests/e2e/llm_shield_stage3e_live_context_rejected_smoke.mjs`   | modify    | P16-G01 retired contract with forged input                     |
| `tests/e2e/llm_shield_stage3e_live_rate_limit_smoke.mjs`         | modify    | P16-G01 retired contract with zero call cap                    |
| `tests/e2e/llm_shield_stage3e_live_optional_anthropic_smoke.mjs` | modify    | P16-G01 retirement is unconditional, no paid smoke             |
| `scripts/security-audit-llm-shield-stage3e.sh`                   | modify    | P16-G01 require exact status and error                         |
| `scripts/smoke-llm-shield-stage3e-live.sh`                       | modify    | Describe maintained retirement coverage                        |
| `scripts/lib/priorReproduceSet.mjs`                              | add       | P16-G02 validate historical pin plus explicit additions        |
| `scripts/prior-reproduce-maintenance.json`                       | add       | P16-G02 versioned maintenance declaration                      |
| `scripts/runAllPriorReproduce.sh`                                | modify    | P16-G02 execute validated union                                |
| `tests/e2e/llmShield/stage5s/priorReproduceSet.test.js`          | modify    | P16-G02 compare maintained union, retain historical assertions |
| `tests/unit/priorReproduceMaintenance.test.js`                   | add       | P16-G02 behavioral refusal regressions                         |
| `AGENT.md`                                                       | append    | Declaration and verification log                               |
| `CHANGELOG.md`                                                   | append    | Declaration and verification log                               |

## Gate lifecycle

- active_phase: Phase 16 maintenance and subsequent maintained sweeps.
- protected_surface: exact retired HTTP response; historical pin bytes and maintained script identities.
- next_phase_behaviour: declared additions extend the maintained set without editing historical evidence.
- maintenance_behaviour: exact path, reason and authority declared before each change.
- sunset_or_migration_condition: a separately versioned manifest replaces the maintained set; historical pin remains verifiable.
- anti_vacuity_condition: nonempty validated set, independent added/removed checks, real HTTP response assertions, executed-count refusal.

## Initial evidence

The original seven inventory tests yielded six passes and one failure naming only
`reproduce-llm-shield-stage5l-strict.sh`. The original gateway smoke failed because
the server returned `legacy_live_gateway_retired`. Raw logs are retained in the
continuation work directory. Final outcomes will be appended after verification.

## Verification

Authority commit `8af9d15a` precedes implementation. The 15 inventory tests pass,
including independent drift and frozen-byte negative controls. Both gateway smoke
suites pass (72 core and 40 historical live fixture cases); all 14 security-audit
checks pass. The maintained set contains 51 identities and the frozen pin remains 50. Smokes ran in a disposable clone to contain historical generated-file writes.
Consolidated end-to-end verification follows the remaining maintenance.
