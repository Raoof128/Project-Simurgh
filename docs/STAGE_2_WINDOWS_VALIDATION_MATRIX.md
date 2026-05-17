# Stage 2 Windows Device Shield — Validation Matrix

**Platform:** Windows 10 Pro build 19045
**Toolchain:** Git 2.53.0 · Node 24.14.0 · npm 11.9.0 · .NET 8.0.421
**Status:** Validated · Frozen as research-prototype baseline

---

## Build and Test Gates

| Requirement               | Result               | Command / Source                                                                                    |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| Windows daemon builds     | ✅ pass              | `.tools\dotnet\dotnet.exe build tools\simurgh-daemon-windows\SimurghDaemon.Windows.sln`             |
| Windows daemon tests pass | ✅ 11/11             | `.tools\dotnet\dotnet.exe test tools\simurgh-daemon-windows\SimurghDaemon.Windows.sln --no-restore` |
| Node unit tests pass      | ✅ 273/273           | `npm test`                                                                                          |
| npm audit clean           | ✅ 0 vulnerabilities | `npm audit --audit-level=high`                                                                      |
| Privacy audit clean       | ✅ pass              | `node tools/privacy-audit.mjs`                                                                      |
| Prettier format clean     | ✅ pass              | `npm run format:check` (Linux CI)                                                                   |

---

## Smoke Gates

| Requirement                                    | Result  | Command                                                        |
| ---------------------------------------------- | ------- | -------------------------------------------------------------- |
| Stage 2.6 Windows scanner smoke                | ✅ pass | `bash scripts/smoke-stage-2-6-windows-scanner.sh`              |
| Stage 2.7 cross-platform smoke (Scenarios A–G) | ✅ pass | `bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh` |
| Stage 2.6/2.7 closeout E2E smoke               | ✅ pass | `bash scripts/smoke-stage-2-6-2-7-closeout.sh`                 |

---

## Security Audit Gates

| Requirement                                              | Result  | Command                                                                 |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| Stage 2.4/2.5 cybersecurity audit                        | ✅ pass | `bash scripts/security-audit-stage-2-4-2-5.sh`                          |
| Stage 2.7 cross-platform security audit (15/15 tests)    | ✅ pass | `bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` |
| Stage 2.6/2.7 closeout cybersecurity audit (24/24 tests) | ✅ pass | `bash scripts/security-audit-stage-2-6-2-7-closeout.sh`                 |

---

## Full Quality Gate

| Requirement                         | Result         | Command                  |
| ----------------------------------- | -------------- | ------------------------ |
| `scripts/check.sh`                  | ✅ 47/48 gates | `bash scripts/check.sh`  |
| GitHub Actions Simurgh Quality Gate | ✅ pass        | CI on Linux ubuntu-24.04 |

The one non-passing gate (`prettier --check` on Windows local) is a pre-existing Windows-line-endings tolerance documented in `check.sh` itself. Linux CI passes prettier cleanly.

---

## Real Windows Device Validation

| Test                                         | Expected                                                                                    | Result             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| Normal desktop scan — WDA_NONE fixture       | `scanner_state: healthy`, zero counts                                                       | ✅ pass            |
| WDA_MONITOR fixture                          | `restricted_detected`, `monitor_only_window_count: 1`, `capture_restricted_window_count: 1` | ✅ detected        |
| WDA_EXCLUDEFROMCAPTURE fixture               | `risk_detected`, `capture_excluded_window_count: 1`                                         | ✅ detected        |
| Signed daemon proof accepted                 | `200 OK`, `device_integrity.daemon_platform: "windows"`                                     | ✅ pass            |
| Tampered proof rejected                      | `401`, `error: invalid_signature`                                                           | ✅ rejected        |
| Replayed proof rejected                      | Consumed challenge rejection                                                                | ✅ rejected        |
| Raw `hwnd` in proof rejected                 | `409`, `error: forbidden_local_field`                                                       | ✅ rejected        |
| Raw `pid` nested in array rejected           | `forbidden_local_field`                                                                     | ✅ rejected        |
| Raw `process_name` nested in object rejected | `forbidden_local_field`                                                                     | ✅ rejected        |
| Platform `linux` rejected at pairing         | `unsupported_platform`                                                                      | ✅ rejected        |
| Platform `linux` rejected at proof           | `unsupported_platform`                                                                      | ✅ rejected        |
| Report `device_integrity.daemon_platform`    | `"windows"`                                                                                 | ✅ present         |
| Report `manual_review_recommendation`        | `"Manual review recommended. No automatic misconduct finding."`                             | ✅ correct wording |
| Audit chain verify                           | `{ valid: true }`                                                                           | ✅ verified        |
| Privacy sweep                                | No forbidden field names in data directories                                                | ✅ clean           |

---

## Stage 2.7 Cross-Platform Smoke Scenarios

| Scenario | Platform | Input                                  | Expected                                      | Result |
| -------- | -------- | -------------------------------------- | --------------------------------------------- | ------ |
| A        | macOS    | Healthy proof                          | Accepted, `daemon_platform: macos`            | ✅     |
| B        | Windows  | Healthy proof                          | Accepted, `daemon_platform: windows`          | ✅     |
| C        | macOS    | `capture_excluded_window_count: 1`     | Critical/manual review                        | ✅     |
| D        | Windows  | `monitor_only_window_count: 1`         | Warning/manual review                         | ✅     |
| E        | Windows  | `capture_excluded_window_count: 1`     | Critical/manual review                        | ✅     |
| F        | Linux    | Any pairing                            | `unsupported_platform` rejected               | ✅     |
| G        | Windows  | Raw HWND/PID/window_title/process_name | `forbidden_local_field` rejected, no raw leak | ✅     |

---

## Closeout Cybersecurity Audit Dimensions

| Dimension                                                               | Tests     | Result |
| ----------------------------------------------------------------------- | --------- | ------ |
| `[1.proof]` — canonicalisation, sequence tamper, stale timestamp        | 4         | ✅     |
| `[2.scanner]` — version pinning, fingerprint pattern, count consistency | 3         | ✅     |
| `[3.platform]` — Linux rejection at proof and pairing                   | 3         | ✅     |
| `[4.daemon]` — node-id mismatch, no-pairing, public-key mismatch        | 3         | ✅     |
| `[5.sdk]` — trust-boundary comment, no rogue top-level scanner fields   | 2         | ✅     |
| `[6.report]` — `daemon_platform`, manual-review wording, no raw fields  | 2         | ✅     |
| `[7.dashboard]` — no misconduct phrases, no raw-field interpolation     | 2         | ✅     |
| `[8.privacy]` — shared import, frozen list, known leak vectors          | 2         | ✅     |
| `[9.wording]` — no overclaim, manual-review wording verbatim            | 2         | ✅     |
| Anchor manifest                                                         | 1         | ✅     |
| **Total**                                                               | **24/24** | ✅     |
