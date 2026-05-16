# Stage 2 macOS Validation Matrix

This document maps the Stage 2 macOS Device Shield requirements to their verification evidence.

| Area                 | Evidence                      | Command                                                      |
| -------------------- | ----------------------------- | ------------------------------------------------------------ |
| Unit tests           | Node suite                    | `npm test`                                                   |
| Privacy audit        | Forbidden-field scan          | `node tools/privacy-audit.mjs`                               |
| Stage 2.2/2.3 smoke  | Pairing + daemon proof bridge | `./scripts/smoke-stage-2-2-2-3.sh`                           |
| Stage 2.4/2.5 smoke  | SDK + scanner + proof         | `./scripts/smoke-stage-2-4-2-5.sh`                           |
| Security audit       | Daemon/SDK/scanner hardening  | `./scripts/security-audit-stage-2-4-2-5.sh`                  |
| Full gate            | All local gates               | `./scripts/check.sh`                                         |
| Swift daemon         | Build / Test                  | `cd tools/simurgh-daemon-macos && swift test && swift build` |
| Swift daemon release | Release Build                 | `cd tools/simurgh-daemon-macos && swift build -c release`    |

## Verification Details

### 1. Node Unit Tests

- **Count:** 234 tests across 43 suites.
- **Coverage:** Telemetry normalisation, risk scoring, HMAC chaining, session token auth, replay protection, rate limiting, and integrity proof validation.

### 2. Privacy Audit

- **Tool:** `tools/privacy-audit.mjs`.
- **Logic:** Scans all source and generated data for forbidden strings (pixels, webcam, typed_content, etc.).
- **Pass Criteria:** 0 forbidden fields found.

### 3. Stage 2.2/2.3 E2E Smoke

- **Script:** `scripts/smoke-stage-2-2-2-3.sh`.
- **Verification:** verified integrity proofs, node pairing, challenge/response, and audit trail consistency.

### 4. Stage 2.4/2.5 E2E Smoke

- **Script:** `scripts/smoke-stage-2-4-2-5.sh`.
- **Verification:** SDK integration, daemon lifecycle, scanner metadata summary in proofs, and risk escalation for excluded windows.

### 5. Cybersecurity Audit Gate

- **Script:** `scripts/security-audit-stage-2-4-2-5.sh`.
- **Verification:** Recursive forbidden-field rejection in proofs and pairing payloads; daemon loopback, method, and origin hardening.

### 6. Full Gate (check.sh)

- **Script:** `scripts/check.sh`.
- **Verification:** Aggregates Node tests, Swift builds, privacy audits, secret scans, tone checks, and smoke packs into a single pass/fail signal.
