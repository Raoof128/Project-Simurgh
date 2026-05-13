# Security Policy

## Supported Versions

Project Simurgh is a research prototype. Security fixes are applied to the latest tagged release and the `main` branch.

| Version                      | Supported      |
| ---------------------------- | -------------- |
| `v0.3.0` (Stage 1 Hardening) | ✅ Active      |
| `main` (development)         | ✅ Active      |
| Earlier tags                 | Not maintained |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues to: **raoof.r12@gmail.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected component (server, helper, audit chain, dashboard, etc.)
- Potential impact assessment

You will receive a response within **72 hours**. If the vulnerability is confirmed, a fix will be prioritised for the next release. You will be credited in the changelog unless you request anonymity.

## Security Architecture (v0.3.0)

### Trust Boundaries

| Component              | Trust Level         | Mechanism                                                                                      |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Student browser        | **Untrusted**       | Strict allowlist + range-reject validation; replay guard (sequence + timestamp); rate limit    |
| Joined student session | **Token-bound**     | HMAC-SHA256 session token issued at `/api/exams/:id/join`, required for lifecycle + telemetry  |
| Native helper          | **Authenticated**   | `x-simurgh-helper-secret` shared-secret header + per-helper rate limit                         |
| Instructor dashboard   | **Authenticated**   | Bearer token (`SIMURGH_INSTRUCTOR_TOKEN`) — query-string token stripped from URL after capture |
| Claude API             | **Trusted service** | Receives sanitised behavioural metadata only, never raw content                                |
| Audit chain            | **Tamper-evident**  | HMAC-SHA256 linked entries; any modification invalidates downstream signatures                 |

### Secret Separation

Four independent secrets in production. Reuse is not permitted.

| Secret                           | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `SIMURGH_INSTRUCTOR_TOKEN`       | Dashboard, sessions list, report, audit verify, SSE |
| `SIMURGH_HELPER_SECRET`          | Native helper authentication                        |
| `SIMURGH_AUDIT_SECRET`           | HMAC key for the audit chain                        |
| `SIMURGH_SESSION_SIGNING_SECRET` | HMAC key for student session tokens                 |

The server refuses to start in non-demo mode if any of these are unset.

### Privacy Guarantees

Simurgh is designed around data minimisation. The following data is **never** collected, stored, logged, or transmitted to third parties:

- Screen pixels, screenshots, or screen recordings
- Webcam frames or microphone audio
- Typed answer content
- Paste content (only paste length and count are recorded)
- Raw student names or email addresses (SHA-256 hashed at ingress only)
- Biometric identifiers
- Process names or window titles (hashed when sent by the helper unless `SIMURGH_DEBUG_RAW_PROCESS_NAMES=true`)

Enforcement points:

- `src/privacy/privacyConfig.js` — declarative allowlist of what may be collected
- `src/privacy/normaliseTelemetry.js` — strict allowlist applied before storage
- `src/privacy/hashIdentity.js` — one-way SHA-256 hashing at point of entry
- `tools/privacy-audit.mjs` — CI-ready scanner that fails if forbidden fields appear in generated data

These controls cannot be bypassed by configuration alone — modification requires a code change visible in the audit log.

### No Automatic Misconduct Finding

Simurgh produces **risk scores and event timelines**. It never automatically accuses, flags, or penalises a student. Every anomaly recommendation is worded as:

> "Manual review required. No automatic misconduct finding."

This is the canonical wording emitted by `src/academic/riskScoring.js` for Warning and Critical verdicts. Institutions deploying Simurgh must apply human judgment and due process before any action is taken on the basis of a risk score.

### Known Limitations (from research paper §VI-C)

The following attack classes are **not** detectable from telemetry alone:

1. **Click-through overlays** — `WS_EX_TRANSPARENT` (Windows) or `ignoresMouseEvents` (macOS) do not fire focus or paste events
2. **Read-don't-paste workflows** — silent transcription at human WPM with no paste events
3. **GPU-layer overlays** (DirectX / Metal hooks, e.g. Cluely-class) — bypass both DOM events and `getDisplayMedia()`

Mitigations:

- The macOS `simurgh-helper` (Countermeasure A) enumerates display-affinity flags at the OS level and triggers a Critical override when a capture-excluded window is detected.
- Stage 4 research will explore hardware-rooted attestation and on-device verification for GPU-layer overlays.

These limitations are documented openly. The system is **privacy-preserving, tamper-evident, hardened, and auditable against the Stage 1 threat model** — it is not unbreakable, and Simurgh's value proposition does not rely on the claim that it is.

## Dependency Security

```bash
npm audit
```

The repository currently reports **0 known vulnerabilities**. Report any new findings with high or critical severity via the vulnerability disclosure process above.

## Verification Tools

```bash
npm test                                       # 65 unit tests across 12 modules
node tools/privacy-audit.mjs                   # scan generated data for forbidden fields
node tools/verify-audit.mjs <chain.json>       # verify an exported HMAC audit chain
```
