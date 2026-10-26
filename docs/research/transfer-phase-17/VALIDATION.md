# Validation receipts and boundaries

The experiment implementation froze at `4afe9538`; the separate role correction and native
workflow froze at `fbe06eca`. This publication adds evidence and navigation, not runtime changes.
The exact prior declarations are `359202cf` and `00503114`. P17-FORMAT01 at `ecbbb5a2`
authorizes only the exact frozen baseline's formatting exclusion.

| Check                                  | Result                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| New transfer tests                     | 15 passed, including forced calls in all eight lifecycle states                          |
| Corrective role tests                  | 3 passed, including the 16-request correction cap                                        |
| Frozen comparison / reliability tests  | 16 / 12 passed                                                                           |
| Maintained Node/browser gates          | 45 passed, zero skipped                                                                  |
| Archived comparison replay             | 288 fresh branches match captured receiver state                                         |
| Original / corrected workflow replay   | 8 / 8 captured proposals replay with matching state                                      |
| Reliability storage checks             | Both exact 60-fixture epochs pass the frozen validator                                   |
| Deliberate evidence mutations          | 10 rejected: omissions, duplicates, proposals, effects, roles, report and budget changes |
| macOS native                           | Node 2 and daemon 8 tests passed                                                         |
| Windows native                         | Daemon 11 tests passed; affinity fixture compiled with zero warnings/errors              |
| Runtime / model dependency consistency | 62 / 34 installed packages compatible                                                    |
| Existing hosted readiness workflow     | All 13 jobs passed at 4afe9538                                                           |
| npm audit                              | Zero reported vulnerabilities at retrieval                                               |

[Native CI run](https://github.com/Raoof128/Project-Simurgh/actions/runs/38962135213)
tested `fbe06eca6425c87b344bf2137b52f364fec28be6`. Its artifacts contain source and toolchain
receipts, raw Swift logs and Windows TRX results. These are project-operated hosted checks,
not independent review. Windows display capture and macOS interactive privacy permissions
were not exercised.

The archive roots pin the retained files; both published ZIPs were read back and replayed.
All original and corrective paid attempts are retained. All prior frozen source bytes remain
unchanged. The [log bundle](validation-logs.zip) includes the initial expected failing TDD checks
as well as successful checks; a test import collision was fixed before capture. The native
check does not claim broad OS integration from a compile-only affinity result.

The research tools and prototype boundary received focused functional/negative verification.
The earlier Phase 8 whole-change security review remains incomplete after its automatic
cybersecurity block; it was not retried through another route. There is no new complete
security-audit or independent-review claim. A one-minute isolated-fixture reliability run
also does not establish a sustained production deployment or service SLO.

See [validation.json](validation.json) for exact artifacts, checks and source revisions.

The final [13-job readiness run](https://github.com/Raoof128/Project-Simurgh/actions/runs/38961632209)
passed at the original implementation freeze `4afe9538`. Its long-running persisted-workflow
recovery job completed successfully. The [separate hosted receipt](hosted-validation.json)
and [raw hosted logs](hosted-validation-logs.zip) preserve exact job identities and timestamps.
The original validation bundle is unchanged; this is an additive receipt. The hosted jobs
exercise their existing suites, while the new transfer/role suites and archive replay are
recorded as local checks above. No final-publication-head hosted result is implied.

## Note added 26 October 2026

The "Deliberate evidence mutations" row above records a one-off run of `mutation_checks.py` from
[validation-logs.zip](validation-logs.zip). Every one of its ten checks passed `replay=False`, so
they exercised the structural validators and not the fresh replay. The same ten mutations now run
as individual tests in `tools/evidence-mutations/tests/test_mutations.py`, with the recorded
reason codes, under `.github/workflows/evidence-mutations.yml`. That lane adds one check the
logged script could not make: a role archive whose flipped report, manifest entry and root all
agree passes `read_pack` by construction and must be rejected by the fresh replay, which needs
Linux x86_64. The recorded rows and the log bundle are unchanged.
