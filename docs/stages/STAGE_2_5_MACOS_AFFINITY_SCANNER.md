# Stage 2.5: macOS Affinity Scanner Implementation

Stage 2.5 replaces the daemon's conservative placeholder scanner with a real macOS metadata-only scanner for display-affinity risk signals.

## Scope

- Implement visible-window enumeration in the macOS localhost daemon through CoreGraphics.
- Preserve the Stage 2.3 and Stage 2.4 signed proof pipeline.
- Include scanner summaries inside signed daemon proofs.
- Surface scanner state in daemon status, server risk scoring, reports, dashboard, and audit events.
- Keep all scanner output privacy-safe and aggregate.

## Non-Goals

- No screenshots, screen pixels, webcam frames, microphone audio, typed content, or pasted content.
- No raw process names, raw window titles, PIDs, usernames, home directories, file paths, serial numbers, or MAC addresses.
- No Windows or Linux scanner implementation.
- No hardware attestation, notarisation, MDM readiness, production endpoint management, or automatic misconduct finding.

## Scanner Contract

The daemon reports only metadata:

```json
{
  "capture_excluded_window_count": 0,
  "scanner_state": "healthy",
  "scanner_version": "2.5.0",
  "scan_timestamp": "2026-05-16T00:00:00Z",
  "scan_duration_ms": 8,
  "scan_error_count": 0,
  "suspicious_window_count": 0,
  "visible_window_count": 12,
  "privacy_mode": "metadata_only",
  "window_fingerprint_hashes": []
}
```

`capture_excluded_window_count > 0` is a Critical device-integrity risk and requires manual review. It is not an automatic misconduct finding.

## Implementation

The scanner is split into a mockable provider and a normaliser:

- `WindowInfoProvider` lists window metadata.
- `CoreGraphicsWindowInfoProvider` reads CoreGraphics window dictionaries.
- `AffinityScanner` applies conservative visibility and sharing-state rules.
- `AffinityScanResult` serialises the privacy-safe summary.

Tests use mock providers only. Production uses CoreGraphics and drops local-only fields before proofs, status responses, audit payloads, reports, or dashboards.
