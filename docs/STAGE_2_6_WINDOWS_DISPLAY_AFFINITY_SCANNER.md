# Stage 2.6 Windows Display Affinity Scanner

Stage 2.6B is real-device validated on Windows 10. It extends Simurgh's daemon-proof contract to Windows scanner metadata while preserving the Stage 2.5 privacy and manual-review boundaries.

## Implemented On This Branch

- Server accepts signed daemon proofs with `platform: "windows"` and `scanner_version: "2.6.0"`.
- Signed Windows scanner fields include `capture_restricted_window_count` and `monitor_only_window_count`.
- `capture_excluded_window_count > 0` maps to Critical/manual review.
- `monitor_only_window_count > 0` maps to Warning/manual review.
- Tampered signed scanner fields are rejected with `invalid_signature`.
- Replayed daemon proof challenges are rejected.
- Recursive raw local-data rejection includes HWNDs, window handles, PIDs, process IDs, process names, window titles, executable paths, usernames, home directories, serial numbers, MAC addresses, screenshots, pixels, webcam frames, microphone audio, typed content, and pasted content.
- `tools/simurgh-daemon-windows/` contains a mock-first .NET 8 daemon skeleton with `IWindowInfoProvider`, `DisplayAffinityScanner`, `Win32WindowInfoProvider`, `PrivacyNormaliser`, `ProofSigner`, `LocalHttpServer`, and identity/session support classes.
- `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/` contains a controlled local Win32 fixture for `none`, `monitor`, and `exclude` display-affinity validation.
- `scripts/smoke-stage-2-6-windows-scanner.sh` verifies signed Windows scanner proofs, warning/critical risk mapping, tamper rejection, raw-field rejection, report output, audit verification, and privacy audit.

## Real Windows Laptop Validation

Validated on:

- OS: Windows 10 Pro / Build 19045
- Runtime: .NET 8.0.421
- Branch: `stage-2-6-windows-display-affinity-scanner`

Results:

- normal desktop scan: pass
- `WDA_MONITOR` fixture detected: pass
- `WDA_EXCLUDEFROMCAPTURE` fixture detected: pass
- signed Windows daemon proof accepted: pass
- `WDA_MONITOR` proof accepted with Warning/manual review context: pass
- `WDA_EXCLUDEFROMCAPTURE` proof accepted with Critical/manual review context: pass
- tampered scanner proof rejected: pass
- replayed proof rejected: pass
- raw local fields rejected as `forbidden_local_field`: pass
- report shows Windows scanner summary: pass
- dashboard shows Windows scanner state: pass
- audit chain verifies after Windows scanner events: pass
- privacy audit: pass
- npm audit: pass
- `scripts/check.sh`: pass

Observed live scanner states:

```json
{
  "normal": {
    "scanner_state": "healthy",
    "capture_excluded_window_count": 0,
    "capture_restricted_window_count": 0,
    "monitor_only_window_count": 0
  },
  "monitor": {
    "scanner_state": "restricted_detected",
    "capture_excluded_window_count": 0,
    "capture_restricted_window_count": 1,
    "monitor_only_window_count": 1
  },
  "exclude": {
    "scanner_state": "risk_detected",
    "capture_excluded_window_count": 1,
    "capture_restricted_window_count": 1,
    "monitor_only_window_count": 0
  }
}
```

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
- This is still a research prototype. It does not claim Windows Service deployment, production endpoint management, MDM/Intune readiness, hardware attestation, kernel-level visibility, or automatic misconduct detection.
