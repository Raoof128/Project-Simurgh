# Stage 2.6 Windows Display Affinity Scanner

Stage 2.6A is implementation-complete and pending real Windows laptop validation. It extends Simurgh's daemon-proof contract to Windows scanner metadata while preserving the Stage 2.5 privacy and manual-review boundaries.

## Implemented On This Branch

- Server accepts signed daemon proofs with `platform: "windows"` and `scanner_version: "2.6.0"`.
- Signed Windows scanner fields include `capture_restricted_window_count` and `monitor_only_window_count`.
- `capture_excluded_window_count > 0` maps to Critical/manual review.
- `monitor_only_window_count > 0` maps to Warning/manual review.
- Tampered signed scanner fields are rejected with `invalid_signature`.
- Replayed daemon proof challenges are rejected.
- Recursive raw local-data rejection includes HWNDs, window handles, PIDs, process IDs, process names, window titles, executable paths, usernames, home directories, serial numbers, MAC addresses, screenshots, pixels, webcam frames, microphone audio, typed content, and pasted content.
- `tools/simurgh-daemon-windows/` contains a mock-first .NET 8 daemon skeleton with `IWindowInfoProvider`, `DisplayAffinityScanner`, `Win32WindowInfoProvider`, `PrivacyNormaliser`, `ProofSigner`, `LocalHttpServer`, and identity/session support classes.
- `scripts/smoke-stage-2-6-windows-scanner.sh` verifies signed Windows scanner proofs, warning/critical risk mapping, tamper rejection, raw-field rejection, report output, audit verification, and privacy audit.

## Manual-Review Contract

Windows scanner signals are review triggers only:

```text
Manual review recommended. No automatic misconduct finding.
```

Simurgh does not claim that these signals prove misconduct.

## Non-Claims

- No production Windows Service readiness.
- No MDM or Intune readiness.
- No hardware attestation.
- No kernel-level visibility.
- No Linux scanner support in this stage.
- No automatic misconduct detection.
- No real Windows laptop validation claim until the old Windows 10 laptop tests are run.

## Windows Laptop Validation Still Required

The next validation step is to run the Windows daemon against real windows and confirm:

- `GetWindowDisplayAffinity` detects `WDA_MONITOR`.
- `GetWindowDisplayAffinity` detects `WDA_EXCLUDEFROMCAPTURE`.
- `/health` and `/status` stay loopback-only and metadata-only.
- `/proof` signs scanner summaries accepted by the Node server.
- Privacy sweeps find no HWND, PID, process name, window title, executable path, username, pixels, screenshots, audio, webcam, typed content, or pasted content.
