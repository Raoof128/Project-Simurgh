# CI and README maintenance — 23 October 2026

Owner-requested repair following integration PR #138. This declaration precedes implementation.

## Observed failures

- Main Actions run 39872672508: 5,180 root tests passed; the real Stage 5P browser parity test failed. Its detailed error was lost because failure-log upload rejected a colon in a log filename. The same focused parity test passes locally with real Chromium; browser root cause remains unconfirmed.
- PR Actions run 39872493749: Stage 5S write-surface checking judged 879 integration paths and refused 872 unrelated paths. Annex S.4 makes its write authority inert for successor work; verification remains active.

## Authorized operations

| Exact path                                               | Operation | Purpose                                                                                                                                                                      |
| -------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/stage-5s-checks.yml`                  | modify    | Run the historical whole-branch write-surface command only on its declared Stage 5S branch, following Stage 5Q precedent; keep all verifier/proof/reproduction steps active. |
| `scripts/check.sh`                                       | modify    | Use filesystem-portable log filenames and expose the failing test diagnostic alongside its name. Preserve command status and failure counts.                                 |
| `tests/unit/maintenance/checkRuntimeEnvironment.test.js` | modify    | Behavioral regressions for log-name portability, failure diagnostics and failure propagation in both output modes.                                                           |
| `tests/unit/maintenance/stage5sWorkflowScope.test.js`    | add       | Assert historical push/PR branch gating and successor verification coverage.                                                                                                 |
| `README.md`                                              | modify    | Display the original `docs/Project-Simurgh-Logo.png` across the header. Original image bytes must remain unchanged.                                                          |
| `AGENT.md`                                               | append    | Accurately attributed change and verification log.                                                                                                                           |
| `CHANGELOG.md`                                           | append    | Accurately attributed change and verification log.                                                                                                                           |

## Lifecycle and limits

Active during this CI maintenance. Protect failure reporting, historical branch scoping and original logo bytes. Successors retain regression coverage; any further stage-owned repair needs its own declaration before implementation. No frozen verifier, evidence, proof, artifact or signed capture may be rewritten. A failed browser assertion remains a failure. No skip, retry-to-green or assertion weakening is authorized. Hosted success must be verified against the actual pushed revision; any remaining failure requires investigation rather than a passing claim.
