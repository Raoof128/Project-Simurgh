# Stage 2 macOS Threat Model

> **Status (v0.4.10, 2026-05-16):** Document represents the Stage 2.5 macOS Device Shield prototype state. Stage 2 countermeasures (signed integrity proofs, node pairing, localhost daemon, browser SDK) are now live for macOS. Stage 2.6 (Windows scanner) is the next milestone.

Project Simurgh Stage 2 extends the Academic Shield with a Local Integrity Node. This threat model describes the hardened device-trust boundary for macOS.

## Protected Assets

| Asset                  | Why it matters                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Student privacy        | The system must not collect answer content, screen pixels, webcam frames, audio, biometrics, or raw identity. |
| Exam session integrity | Joined sessions should reject forged, replayed, stale, or cross-session telemetry and proofs.                 |
| Instructor dashboard   | Review data, reports, and audit verification must require instructor authorization.                           |
| macOS integrity bridge | Signed proofs must be tamper-evident and bound to a specific session and node.                                |
| Audit chain            | Review records must be tamper-evident after events are written.                                               |
| Repository history     | Public code must not expose secrets, private data, or unsupported claims.                                     |

## Security Goals

- Enforce session-token boundaries for joined student sessions.
- Reject duplicate, stale, future-dated, malformed, oversized, or invalid telemetry and integrity proofs.
- Keep instructor APIs behind bearer-token authentication.
- Authenticate macOS daemon proofs with P-256 signatures and Keychain-stored identity.
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

| Boundary                    | Current trust posture           | Stage 2 control                                                        |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Browser to API              | Untrusted                       | Allowlisted telemetry, JSON size limit, replay guard, rate limit       |
| Joined student session      | Token-bound                     | HMAC session token issued at join                                      |
| macOS Daemon to API         | Authenticated via signed proofs | P-256 signatures, single-use challenges, node continuity (N1)          |
| SDK to macOS Daemon         | Local-only (Loopback)           | 127.0.0.1 binding, Origin/Method checks, X-Simurgh-Local-Client header |
| Instructor dashboard to API | Authenticated                   | Bearer token and query-token stripping in dashboard                    |
| Claude API                  | External service                | Sanitized metadata only; explanatory narrative only                    |
| Audit chain                 | Tamper-evident                  | HMAC-linked entries recorded for all integrity events                  |

## Attacker Types

- Student attempting to use external assistance during an exam.
- Student or local user attempting to replay or forge telemetry or signed proofs.
- Fake daemon attempting to submit false integrity reports.
- Web attacker attempting to access instructor APIs.
- Dashboard data attacker attempting XSS through untrusted fields.
- Repository observer searching for secrets or private data.
- Advanced endpoint attacker with local OS compromise.

## Defender Assumptions

- The server process and configured secrets are controlled by the institution or reviewer.
- Production deployments use distinct high-entropy values for all `SIMURGH_*` secrets.
- Reviewers run Stage 2 macOS closeout verification before trusting claims.
- Students are told what metadata is collected and what is not collected.
- Human reviewers remain responsible for academic integrity decisions.

## Attacker Capabilities

In scope:

- Submit arbitrary JSON to public API endpoints.
- Replay telemetry and proofs with duplicate sequence numbers or nonces.
- Send stale or future timestamps.
- Omit or forge bearer tokens.
- Attempt daemon reports with missing or invalid signatures.
- Attempt large payloads or invalid numeric values.
- Use known visual bypass techniques that screen capture may miss.

Out of scope for Stage 2:

- Kernel-level malware.
- Compromised operating system or browser runtime.
- Stolen production secrets.
- Malicious server administrator.
- Hardware bus attacks.
- Full GPU/compositor compromise.
- Hardware-rooted attestation.

## In-Scope Attacks and Stage 2 Mitigations

| Attack                            | Stage 2 mitigation                                            |
| --------------------------------- | ------------------------------------------------------------- |
| Session replay                    | Sequence, timestamp, and signed proof nonce guards            |
| Cross-session telemetry injection | HMAC session token + node-bound signed proof verification     |
| Missing or invalid session token  | `401` rejection on all joined lifecycle paths                 |
| Fake daemon proof post            | P-256 signature verification + Keychain-stored identity       |
| Instructor API probing            | Instructor bearer-token requirement                           |
| Oversized JSON                    | Express body limit + Daemon request-size guard                |
| Invalid numeric telemetry         | Server-side numeric rejection + recursive proof validation    |
| Audit record modification         | HMAC chain verification detects tampering                     |
| Dashboard token leakage           | Dashboard strips query token and uses Authorization headers   |
| Dashboard XSS                     | HTML-escaped dashboard rendering                              |
| Privacy overcollection            | Telemetry allowlist, recursive field rejection, privacy audit |

## Abuse Cases

- Treating a risk score as a misconduct determination.
- Deploying without institutional privacy/legal review.
- Using Simurgh for continuous employee monitoring.
- Publishing evidence logs containing tokens, student data, or sensitive local identifiers.

These are misuse cases. The project language and closeout docs keep them out of the supported Stage 2 boundary.

## Remaining Risks

- GPU-layer overlays (Metal/DirectX hooks) are out of scope for Stage 2.
- Read-only cheating workflows (silent transcription) remain a structural gap.
- Windows/Linux scanners are not yet implemented (Stage 2.6+).
- The system does not yet have hardware-rooted attestation (Secure Enclave research).

## Stage 2.6 Mitigations

Stage 2.6 will port the macOS display-affinity scanner logic to Windows:

- Windows Display Affinity Scanner (Countermeasure A).
- Native Windows daemon/helper implementation.
- Red-team validation of Windows display-fidelity attacks.

## Non-Goals

- Stage 2 does not solve every device-integrity problem.
- Stage 2 does not replace institutional misconduct process.
- Stage 2 does not make automatic misconduct findings.
- Stage 2 does not collect screen, webcam, audio, typed, or pasted content.
- Stage 2 does not provide hardware-rooted attestation in this release.

## Relationship to Invisible Window Research

The Invisible Window research shows that screen capture can fail to represent what a user physically sees. Stage 2 responds by avoiding pixel surveillance and combining metadata-only browser telemetry, signed OS-level metadata signals from a native daemon, and tamper-evident audit logs. This mitigates the known invisible-window class for macOS, but it does not close every overlay or endpoint-compromise path.

## Manual-Review Boundary

Every Warning or Critical result is a signal for human review. The canonical Stage 2 wording is: "Manual review required/recommended. No automatic misconduct finding." Reviewers must inspect context, accessibility needs, institutional policy, and audit evidence before taking any action.
