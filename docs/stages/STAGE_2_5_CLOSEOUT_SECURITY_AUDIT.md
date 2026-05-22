# Stage 2.5 Closeout Security Audit

Date: 2026-05-16 (Australia/Sydney)

This closeout gate covers Stage 2.4 browser SDK extraction and Stage 2.5 macOS affinity scanner integration before Stage 2.6 work begins.

## Scope

In scope:

- Browser SDK token handling, daemon discovery, and proof-backed telemetry.
- macOS localhost daemon request parsing, loopback binding, Origin allowlist, method handling, body-size guard, and malformed JSON rejection.
- Server P-256 daemon pairing/proof validation, canonical signing, single-use challenge replay protection, and recursive raw local-data rejection.
- Scanner fields inside signed daemon proofs.
- Hardened `SIMURGH_REQUIRE_DAEMON=true` missing-proof rejection.
- Report, dashboard, audit, and privacy output.
- Development LaunchAgent script safety and dry-run checks.
- Privacy-safe daemon doctor output.

Out of scope:

- Stage 2.6 feature work.
- Windows/Linux scanners.
- Hardware attestation.
- Production endpoint management.
- Notarisation or MDM deployment.
- Automatic misconduct detection.

## Command

Run the closeout audit from the repository root:

```bash
./scripts/security-audit-stage-2-4-2-5.sh
```

`./scripts/check.sh` also runs this gate in full mode.

## Locked Security Decisions

- The browser SDK may use `/status` for UX, but server trust comes only from a signed `daemon_proof`.
- Scanner fields are trusted only when included inside the signed daemon payload.
- Daemon proof challenges are single-use and purpose-bound by the server challenge registry.
- Forbidden raw local fields are rejected recursively, including nested debug objects.
- Capture-excluded scanner windows create Critical/manual-review context, not an automatic misconduct finding.
- `scanner_unavailable` and `permission_denied` are honest warning/manual-review context, not guilt claims.
- LaunchAgent scripts are development-only and expose safe `--check` / `--dry-run` paths.
- Doctor output is diagnostic only and must not print secrets, raw process/window data, usernames, home paths, serials, MAC addresses, screenshots, pixels, webcam data, typed content, or pasted content.

## Current Gate Coverage

- `tests/security/stage24_25_security_audit.test.js`
  - recursive raw local-field rejection for daemon proofs and pairing payloads
  - SDK token/daemon-proof trust-boundary checks
  - daemon loopback/body/malformed JSON/method/origin source checks
  - LaunchAgent dry-run and dangerous-command checks
  - dashboard/report manual-review wording checks
- `scripts/security-audit-stage-2-4-2-5.sh`
  - security test suite
  - privacy audit
  - `npm audit --audit-level=high`
  - Stage 2.4/2.5 E2E smoke
  - LaunchAgent shell syntax and safe checks
  - generated-output privacy grep
  - overclaim wording grep
  - daemon dangerous-pattern grep
  - macOS Swift test/build/release build and doctor redaction check when available

## Go / No-Go

Stage 2.6 stays blocked if any of these fail:

- `scripts/security-audit-stage-2-4-2-5.sh`
- `scripts/smoke-stage-2-4-2-5.sh`
- `npm test`
- `npm audit --audit-level=high`
- `node tools/privacy-audit.mjs`
- `./scripts/check.sh`
- macOS `swift test`, `swift build`, and `swift build -c release`

This audit does not claim production readiness, notarisation, MDM readiness, hardware attestation, Windows/Linux support, or automatic misconduct detection.

## External Review Status

Stage 2.5 is closed, regression-gated, and ready for external technical review.

This means the macOS Device Shield research prototype has completed its daemon, SDK, scanner, E2E smoke, and cybersecurity audit closeout cycle. Reviewers should evaluate the system as a research prototype, not as production endpoint-management software.

External review is especially welcome on:

- browser SDK trust boundaries
- localhost daemon lifecycle
- signed daemon proof validation
- metadata-only scanner design
- replay/tamper/missing-proof handling
- recursive forbidden-field rejection
- report/dashboard/audit integration
- privacy and limitation wording
