# Full smoke validation and bounded harness maintenance

19 October 2026 (Australia/Sydney). The owner requested the existing complete E2E smoke
workflow after the reviewer README. This declaration precedes changes to the maintained
check launcher and Linux display-test setup.

## Observations and scope

The first `scripts/check.sh` run at `2cf8ad69` completed 138 passing and four failing
steps. Three failed because ephemeral outbound sockets occupied the fixed smoke ports.
The Rust Xvfb tests failed after the readiness connection closed; a separate rerun failed
in a different case at the same post-readiness connection boundary. The server's default
reset on its last client disconnecting is inconsistent with the test fixture's intended
lifetime. Root tests passed 5,167 cases with two Lean skips because `run_step` launches a
login shell that replaces the supplied runtime PATH.

Permitted maintenance:

- `scripts/check.sh`: preserve the caller's selected tools in command steps by using a
  non-login shell. Keep command text, checks, step accounting and failure behavior.
- `tests/unit/maintenance/checkRuntimeEnvironment.test.js`: exercise the real command-step
  function against a controlled login-shell PATH reset, in quiet and verbose modes.
- `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs`: keep each owned Xvfb instance
  alive without resetting when the readiness client disconnects. Keep all scanner assertions,
  mandatory-Xvfb behavior and child-process teardown.
- This directory, `AGENT.md` and `CHANGELOG.md`: append exact observations and verification.

No production runtime, scanner semantics, frozen protocol, historical archive, source pin,
model request or security policy may change. Port collisions are investigated and rerun;
no host-wide networking or browser-management policy change is authorized by this plan.

## Gate lifecycle

| Field                         | Contract                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Full smoke validation, 19 October 2026                                                                                                          |
| protected_surface             | Maintained check launcher and owned Xvfb fixture lifecycle only                                                                                 |
| next_phase_behaviour          | Preserve selected runtime environment and stable fixture lifetime for later checks                                                              |
| maintenance_behaviour         | Retain command, nonzero execution, failure and scanner assertions; record subsequent changes                                                    |
| sunset_or_migration_condition | A declared replacement runner/fixture may supersede these adapters; historical evidence remains unchanged                                       |
| anti_vacuity_condition        | Regression tests execute the actual command function; Rust must execute all four Xvfb cases; skipped/unavailable checks are reported separately |

## Verification and publication

Retain the first failed aggregate and Xvfb reproduction. Establish the command-step regression
before repair. Run formatting, focused regression tests and repeated real Xvfb execution, then
rerun the full base and E2E scripts on the repaired revision. Add the dashboard/CLI and Python
research suites outside the historical script's inventory. Report fresh native CI separately
with its exact tested commit. A passing shell-step total must not hide optional platform,
external-provider or browser exclusions. Commit and push the repair and additive receipts.
