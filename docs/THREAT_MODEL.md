# Stage 1.5 Threat Model

Project Simurgh Stage 1 is a bounded research MVP for academic integrity review. This threat model describes what Stage 1 protects, what it does not protect, and why Stage 2 moves toward a Local Integrity Node.

## Protected Assets

| Asset                  | Why it matters                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Student privacy        | The system must not collect answer content, screen pixels, webcam frames, audio, biometrics, or raw identity. |
| Exam session integrity | Joined sessions should reject forged, replayed, stale, or cross-session telemetry.                            |
| Instructor dashboard   | Review data, reports, and audit verification must require instructor authorization.                           |
| Native helper channel  | Helper telemetry must be authenticated before it can influence risk.                                          |
| Audit chain            | Review records must be tamper-evident after events are written.                                               |
| Repository history     | Public code must not expose secrets, private data, or unsupported claims.                                     |

## Security Goals

- Enforce session-token boundaries for joined student sessions.
- Reject duplicate, stale, future-dated, malformed, oversized, or invalid telemetry.
- Keep instructor APIs behind bearer-token authentication.
- Authenticate native helper reports with a distinct helper secret.
- Maintain HMAC-linked audit entries for tamper-evident review.
- Rate-limit high-risk endpoints.
- Render dashboard data safely without trusting session-provided strings.

## Privacy Goals

- Process metadata only.
- Hash student identifiers at ingress.
- Never store typed answer content or pasted text content.
- Never capture screen, webcam, microphone, biometric, or location data.
- Keep Claude narrative optional and limited to sanitized telemetry metadata.
- Keep every anomaly as a manual-review input, not an automatic finding.

## Trust Boundaries

| Boundary                    | Current trust posture                       | Stage 1 control                                                           |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Browser to API              | Untrusted                                   | Allowlisted telemetry, JSON size limit, replay guard, rate limit          |
| Joined student session      | Token-bound                                 | HMAC session token issued at join                                         |
| Native helper to API        | Authenticated but spoofable if secret leaks | `x-simurgh-helper-secret`, rate limit, payload validation                 |
| Instructor dashboard to API | Authenticated                               | Bearer token and query-token stripping in dashboard                       |
| Claude API                  | External service                            | Receives sanitized metadata only and cannot override official local score |
| Audit chain                 | Tamper-evident in process/export            | HMAC-linked entries                                                       |

## Attacker Types

- Student attempting to use external assistance during an exam.
- Student or local user attempting to replay or forge telemetry.
- Fake helper attempting to submit false affinity reports.
- Web attacker attempting to access instructor APIs.
- Dashboard data attacker attempting XSS through untrusted fields.
- Repository observer searching for secrets or private data.
- Advanced endpoint attacker with local OS compromise.

## Defender Assumptions

- The server process and configured secrets are controlled by the institution or reviewer.
- Production deployments use distinct high-entropy values for all `SIMURGH_*` secrets.
- Reviewers run Stage 1.5 validation commands before trusting claims.
- Students are told what metadata is collected and what is not collected.
- Human reviewers remain responsible for academic integrity decisions.

## Attacker Capabilities

In scope:

- Submit arbitrary JSON to public API endpoints.
- Replay telemetry with duplicate sequence numbers.
- Send stale or future timestamps.
- Omit or forge bearer tokens.
- Attempt helper reports with missing or invalid helper secrets.
- Attempt large payloads or invalid numeric values.
- Use known visual bypass techniques that screen capture may miss.

Out of scope for Stage 1:

- Kernel-level malware.
- Compromised operating system or browser runtime.
- Stolen production secrets.
- Malicious server administrator.
- Hardware bus attacks.
- Full GPU/compositor compromise.
- Hardware-rooted attestation.

## In-Scope Attacks and Stage 1 Mitigations

| Attack                            | Stage 1 mitigation                                          |
| --------------------------------- | ----------------------------------------------------------- |
| Session replay                    | Sequence and timestamp replay guard                         |
| Cross-session telemetry injection | HMAC session token bound to session ID for joined sessions  |
| Missing or invalid session token  | `401` rejection on joined lifecycle and telemetry paths     |
| Fake helper post                  | Shared helper secret and helper rate limit                  |
| Instructor API probing            | Instructor bearer-token requirement                         |
| Oversized JSON                    | Express body limit via `SIMURGH_JSON_LIMIT`                 |
| Invalid numeric telemetry         | Reject `NaN`, `Infinity`, negative, and extreme values      |
| Audit record modification         | HMAC chain verification detects tampering                   |
| Dashboard token leakage           | Dashboard strips query token and uses Authorization headers |
| Dashboard XSS                     | HTML-escaped dashboard rendering                            |
| Privacy overcollection            | Telemetry allowlist and privacy audit                       |

## Abuse Cases

- Treating a risk score as a misconduct determination.
- Deploying without privacy/legal review.
- Using Simurgh for continuous employee monitoring.
- Enabling raw process-name or window-title debug modes in production.
- Publishing evidence logs containing tokens, student data, or sensitive local identifiers.

These are misuse cases. The project language and reviewer pack keep them out of the supported Stage 1 boundary.

## Remaining Risks

- GPU-layer overlays are not fully solved by Stage 1.
- Read-only cheating workflows are not fully solved by Stage 1.
- Helper telemetry depends on OS API behavior.
- Helper spoofing remains possible if the helper secret is exposed.
- Stage 1 has no hardware-rooted attestation.
- CI status depends on GitHub Actions state after push, not only local checks.
- Institutional effectiveness claims require pilot data and red-team validation.

## Stage 2 Mitigations

Stage 2 is planned as Device Shield / Integrity Node work:

- Local Integrity Node paired to the browser session.
- Signed integrity proofs from the node to the API.
- Tamper-aware local logs.
- Stronger helper attestation and replay resistance.
- Network integrity checks.
- Privacy-preserving risk output rather than raw local observations.
- Future hardware-rooted attestation when supported by deployment environments.

## Non-Goals

- Stage 1 does not solve every device-integrity problem.
- Stage 1 does not replace institutional misconduct process.
- Stage 1 does not make automatic misconduct findings.
- Stage 1 does not collect screen, webcam, audio, typed, or pasted content.
- Stage 1 does not provide hardware-rooted attestation.

## Relationship to Invisible Window Research

The Invisible Window research shows that screen capture can fail to represent what a user physically sees. Stage 1 responds by avoiding pixel surveillance and combining metadata-only browser telemetry, helper display-affinity signals, and tamper-evident audit logs. This partially mitigates the known invisible-window class when helper telemetry is available, but it does not close every overlay or endpoint-compromise path.

## Manual-Review Boundary

Every Warning or Critical result is a signal for human review. The canonical Stage 1 wording is: "Manual review required/recommended. No automatic misconduct finding." Reviewers must inspect context, accessibility needs, institutional policy, and audit evidence before taking any action.
