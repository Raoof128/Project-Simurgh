# Security Policy

## Supported Versions

Project Simurgh is a research prototype. Security fixes are applied to the latest tagged release and the `main` branch.

| Version                                           | Supported              |
| ------------------------------------------------- | ---------------------- |
| `v0.4.13` (Stage 2.7 cross-platform unification)  | ✅ Active              |
| `v0.4.12` (Stage 2.6B Windows scanner validation) | ✅ Active              |
| `v0.4.11` (Stage 2.6 Windows scanner branch)      | ✅ Active              |
| `v0.4.7` (Stage 2.5 macOS scanner)                | ✅ Active              |
| `v0.4.6` (Stage 2.4 SDK/lifecycle)                | ✅ Active              |
| `v0.4.5` (Stage 2.3 daemon foundation)            | ✅ Active              |
| `v0.4.3` (Stage 2 hardening)                      | ✅ Active              |
| `v0.4.2` (Stage 2.2 macOS node pairing)           | ✅ Active              |
| `v0.4.1` (Stage 2.1 macOS integrity)              | ✅ Active              |
| `v0.3.x` (Stage 1 / 1.5)                          | ⚠️ Critical fixes only |
| `main` (development)                              | ✅ Active              |
| Earlier tags                                      | Not maintained         |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues to: **raoof.r12@gmail.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected component (server, helper, audit chain, dashboard, etc.)
- Potential impact assessment

You will receive a response within **72 hours**. If the vulnerability is confirmed, a fix will be prioritised for the next release. You will be credited in the changelog unless you request anonymity.

## Security Architecture (v0.4.12)

> The trust-boundary table below describes the Stage 1 surface. Stage 2.1 added an Ed25519-signed integrity-proof envelope (`/api/integrity/proofs`); Stage 2.2 added per-session node pairing (`/api/integrity/pairing/{challenge,complete}`); v0.4.3 added rate limiting on the proofs route, cryptographically-reconciled audit hints (`safeParsedPairingHints`), and a constant-time challenge compare. Stage 2.3 adds a localhost daemon proof surface (`/api/device/{challenge,pair}` plus telemetry `daemon_proof`) with P-256 signatures. Stage 2.4 moves the browser bridge into a reusable SDK. Stage 2.5 adds a CoreGraphics-backed, metadata-only macOS scanner summary inside signed daemon proofs. Stage 2.6B validates live Windows `GetWindowDisplayAffinity` detection on Windows 10 Pro build 19045 using a controlled local fixture. This still does not constitute hardware attestation, notarised distribution, MDM/Intune readiness, Windows Service readiness, kernel-level visibility, or a production device-trust claim.

### Stage 2.3 localhost daemon controls

- Daemon binds to `127.0.0.1` only.
- Browser-facing daemon endpoints reject unknown origins and require `X-Simurgh-Local-Client: browser` on POST requests.
- Server challenges expire after 30 seconds and are single-use.
- `SIMURGH_REQUIRE_DAEMON=true` enforces signed `daemon_proof` on telemetry; missing proofs are rejected and HMAC-audited as `DAEMON_MISSING`.
- Server stores public key hashes, proof ages, daemon state, signature status, and capture-excluded counts only.
- Raw process names, raw window titles, usernames, serial numbers, MAC addresses, screenshots, pixels, audio, typed content, and pasted content remain forbidden.

### Stage 2.4 browser SDK and lifecycle controls

- `public/sdk/simurgh-browser-sdk.js` owns daemon discovery, pairing, proof fetch, telemetry send, hardened missing-proof handling, and client daemon state.
- SDK state is explicit: `idle`, `discovering`, `available`, `pairing`, `paired`, `proof_ready`, `missing`, `stale`, `untrusted`, and `error`.
- Server-side proof replay or invalid-proof responses move the client state to `untrusted`; hardened missing-proof mode blocks telemetry before spoofing a daemon proof.
- `simurgh-daemon doctor` reports only status labels such as daemon reachability, port availability, Keychain identity presence, allowed-origin configuration, localhost binding, server reachability, and proof round-trip readiness.
- Development LaunchAgent scripts are local-only and user-scoped. They do not install into system LaunchDaemons and do not make production, notarisation, or managed-deployment claims.

### Stage 2.5 scanner controls

- `AffinityScanner` uses CoreGraphics window metadata only and filters for meaningful onscreen windows before counting capture-excluded risk.
- Scanner summaries are signed inside daemon proofs; browser code cannot append trusted scanner fields beside the proof.
- Server validation rejects forbidden raw local fields including process/window names, raw process/window fields, PIDs, usernames, home directories, file paths, serial numbers, MAC addresses, screenshots, pixels, audio, typed content, and pasted content.
- `scanner_unavailable` and `permission_denied` are accepted as signed scanner states and treated as warning/manual-review context, not automatic findings.

### Stage 2.6 Windows scanner controls

- Windows scanner fields are accepted only inside signed daemon proofs with `platform: "windows"` and `scanner_version: "2.6.0"`.
- `WDA_EXCLUDEFROMCAPTURE` maps to Critical/manual review through `capture_excluded_window_count > 0`.
- `WDA_MONITOR` maps to Warning/manual review through `monitor_only_window_count > 0` and `capture_restricted_window_count > 0`.
- Tampered scanner counts invalidate the P-256 daemon proof signature; replayed proof challenges are rejected.
- Raw HWNDs, PIDs, process names, window titles, executable paths, usernames, home directories, screenshots, pixels, webcam frames, microphone audio, typed content, and pasted content are forbidden and rejected recursively with the generic `forbidden_local_field` reason.
- Real-device validation on Windows 10 Pro build 19045 confirmed normal scans, `WDA_MONITOR`, `WDA_EXCLUDEFROMCAPTURE`, signed proof acceptance, tamper/replay rejection, report/dashboard output, audit verification, and privacy audit.

### Stage 1 Trust Boundaries

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
- Raw process names or window titles (Stage 1 helper hashes these; Stage 2+ daemon proofs reject them unconditionally as `forbidden_local_field` — no flag enables raw transmission)

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
npm test                                       # full unit suite
node tools/privacy-audit.mjs                   # scan generated data for forbidden fields
node tools/verify-audit.mjs <chain.json>       # verify an exported HMAC audit chain
```
