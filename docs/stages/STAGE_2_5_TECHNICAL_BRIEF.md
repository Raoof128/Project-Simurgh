<div align="center">
<img src="../Project-Simurgh-Logo.png" alt="Project Simurgh Logo" width="220"/>
</div>

# Project Simurgh Technical Brief

**From The Invisible Window to Proof-Based Integrity for High-Stakes AI Sessions**

_A Stage 1–2.5 technical summary of Project Simurgh's privacy-preserving integrity architecture._

> **Scope footnote (added 2026-05-17):** This brief documents Stage 1 through Stage 2.5 (macOS-only Device Shield). Windows display-affinity scanning landed in Stage 2.6 (`v0.4.12`). The cross-platform unification contract that ties macOS and Windows together is documented in [`STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md) and [`DEVICE_SHIELD_CONTRACT.md`](../DEVICE_SHIELD_CONTRACT.md). Sections of this brief that say "macOS only" or "Windows scanner is future work" reflect Stage 2.5 historical scope.

**Author:** Raouf Abedini — Final-year Cyber Security student, Macquarie University  
**Status:** Stage 2.5 closed · v0.4.10 · Ready for external technical review  
**Date:** 2026-05-16

---

## 1. Thesis

Simurgh replaces surveillance-first trust with signed, privacy-preserving integrity proofs for high-stakes AI-mediated sessions. The system verifies session integrity using behavioural metadata, cryptographic proofs, and native OS signals — without capturing screen pixels, webcam frames, typed content, pasted content, audio, raw process names, or raw window titles. Every anomaly is a signal for manual human review. No automatic misconduct finding is ever produced.

---

## 2. Research Origin: The Invisible Window

Modern operating systems expose a documented, unprivileged API that allows any user-level application to render a window visible on the physical display while hiding it from all screen-capture APIs.

On macOS, the mechanism is `NSWindow.sharingType = .none`. On Windows, the equivalent capture-exclusion mechanism is `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE` or `WDA_MONITOR`. Click-through behaviour may involve `WS_EX_TRANSPARENT`, and layered windows may involve `WS_EX_LAYERED`, but those are window-style flags and are not the same as display-affinity capture exclusion. These APIs are documented OS features intended for DRM and rights-managed content playback. Commercial AI-overlay tools and compositor-layer overlays have re-purposed them to deliver live AI output during exams, technical interviews, and performance reviews. The output appears only on the physical display and leaves no trace in any screen recording.

The PoC lives in this repository at `tools/invisible-window-poc/`. It creates a `sharingType = .none` window, runs alongside Simurgh, and verifies that the native helper detects and flags the window within approximately two seconds. The attack is plain-labelled and cites the disclosure paper directly. It ships because a claimed mitigation is only credible when you can run the disclosed attack against it.

The research paper (Abedini, 2026) defines three attack subclasses:

| Subclass                  | Mechanism                                                          | Detectability without native OS signals                  |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Capture-invisible overlay | `sharingType = .none` (macOS) / `WDA_EXCLUDEFROMCAPTURE` (Windows) | Not detectable from DOM events or `getDisplayMedia()`    |
| Click-through overlay     | `ignoresMouseEvents = true` / `WS_EX_TRANSPARENT`                  | Does not fire blur or focus events; undetectable from JS |
| GPU-layer overlay         | DirectX / Metal compositor hooks                                   | Bypasses both DOM events and screen-capture APIs         |

Visual monitoring is structurally weak against all three because screen capture returns what the compositor chooses to expose, not what is physically on the display. The gap between the capture surface and the physical surface is the attack surface.

Simurgh's response is to stop treating screen capture as a trust source and instead produce integrity signals at the OS level, where the gap does not exist.

---

## 3. Stage 1 Foundation

Stage 1 (v0.3.x) establishes the behavioural integrity layer that Stage 2 builds on.

### 3.1 Behavioural Telemetry

The browser client sends metadata only. No content leaves the student's device.

| Signal                 | What is collected          | What is never collected        |
| ---------------------- | -------------------------- | ------------------------------ |
| Keystroke count        | Count per window           | Keystroke content              |
| Characters typed       | Count only                 | Any typed text                 |
| Paste events           | Count and character length | Paste content                  |
| Focus loss             | Count and duration (ms)    | Window title or target         |
| Idle gaps              | Maximum gap (ms)           | Any content during idle        |
| WPM                    | Effective words per minute | Text being typed               |
| Keydown timing         | Up to 200 interval samples | Keydown content                |
| Helper affinity signal | Connection status + count  | Process names or window titles |

The server hashes student identifiers with SHA-256 at ingress. The raw identifier is never written to disk, logged, or transmitted.

### 3.2 Risk Scoring

A local deterministic model scores sessions across seven weighted categories: paste, focus, typing, idle, affinity, helper, and session. Thresholds produce Safe, Warning, or Critical verdicts. When a session reaches Warning or Critical, an optional Claude API call appends a narrative — the API receives only the sanitised metadata above, never content.

Every Warning and Critical verdict is accompanied by the canonical wording:

> "Manual review required. No automatic misconduct finding."

This wording is hard-coded in `src/academic/riskScoring.js` and cannot be changed through configuration.

### 3.3 HMAC Audit Chain

The server writes all session events to an in-process HMAC-SHA256 audit chain. Each entry links to the previous entry's hash. Any modification to a record invalidates all subsequent signatures. The chain can be exported and verified offline:

```bash
node tools/verify-audit.mjs <chain.json>
```

### 3.4 Session Security

Stage 1 enforces:

- HMAC session tokens issued at `/api/exams/:id/join`, required for lifecycle and telemetry endpoints
- Sequence number and timestamp replay guard per session
- Per-endpoint rate limiting (join, telemetry, affinity, sessions, report, verify)
- 32 KB JSON body limit
- Strict numeric allowlist (rejects NaN, Infinity, negative, and extreme values)
- HTTP security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS)
- HTML-escaped dashboard rendering with URL token stripping
- Four independent secrets (instructor, helper, audit, session-signing)

### 3.5 Gaps Stage 1 Leaves Open

Stage 1 does not close the capture-invisible overlay attack class. The helper's display-affinity signal partially mitigates this, but it relies on a shared-secret authenticated native helper rather than a cryptographically signed proof. A compromised or spoofed helper secret breaks the attestation chain.

Stage 2 moves toward signed proofs from a locally-keyed daemon.

---

## 4. Stage 2 macOS Integrity Stack

Stage 2 transitions Simurgh from browser-centered telemetry to device-aware proof-based integrity. Each sub-stage is merged, tagged, and regression-gated before the next begins.

### 4.1 Stage 2.1 — Signed Integrity Proofs (v0.4.1)

The macOS CLI tool (`tools/simurgh-node-macos/`) generates Ed25519 signed integrity proofs. A proof is a sorted-key JSON envelope signed over the canonical bytes:

```json
{
  "session_id": "sess_example",
  "nonce": "api-issued-nonce",
  "issued_at": "2026-05-14T00:00:00.000Z",
  "version": "2.1",
  "platform": "macos",
  "capabilities": ["display_affinity_scan"],
  "privacy_mode": "metadata_only",
  "node_id_hash": "sha256:...",
  "signature": "..."
}
```

The server validates the Ed25519 signature against the node's SPKI-wrapped public key, enforces a 30-second past / 5-second future timestamp window, checks nonce uniqueness globally, and returns `signature_status: "verified"` or `"unregistered_node"`.

A cross-implementation golden fixture (`tests/unit/integrity/__fixtures__/golden-proof.{json,sha256}`) locks the Swift `JSONEncoder.sortedKeys` output byte-equal to the Node canonicaliser. Both must produce the same SHA-256 hash for the fixture to pass.

### 4.2 Stage 2.2 — Node Pairing (v0.4.2, hardened v0.4.3)

Stage 2.2 binds a browser exam session to a specific macOS node public key.

Flow:

1. Browser calls `POST /api/integrity/pairing/challenge` to obtain a 32-byte challenge (rate-limited at 10/min per session token).
2. macOS CLI's `pair` subcommand signs the canonical pairing payload over the challenge, session ID, exam ID, timestamp, nonce, node identity, capabilities, and privacy mode.
3. Browser calls `POST /api/integrity/pairing/complete` to register the node's public key (20/min per session).
4. Subsequent integrity proofs from the registered node return `signature_status: "verified"`. Proofs from a different node return `409 paired_node_mismatch`.

The v0.4.3 hardening pass added a 30/min rate limiter on `/api/integrity/proofs`, `safeParsedPairingHints` (audit entries require cryptographic reconciliation with a 32-byte decoded public key before including the node hash), and a `crypto.timingSafeEqual` challenge compare.

### 4.3 Stage 2.3 — macOS Localhost Daemon (v0.4.5)

Stage 2.3 moves the CLI signing flow behind a localhost HTTP server. The Swift daemon (`tools/simurgh-daemon-macos/`) runs at `127.0.0.1:3031` and exposes:

| Daemon endpoint     | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `GET /health`       | Liveness check                                 |
| `GET /status`       | Capability and scanner state summary           |
| `POST /pair`        | Challenge-signed pairing handshake             |
| `POST /proof`       | Signed daemon proof for a session-issued nonce |
| `POST /session/end` | Session teardown                               |

**Cryptography:** P-256 signing key, private key stored in macOS Keychain. Public key exported as base64url SPKI DER. `node_id_hash` is `sha256:` of the public-key DER bytes. Challenges are 32 random bytes, single-use, and expire after 30 seconds.

**Server-side extensions:** `POST /api/device/challenge` issues challenges; `POST /api/device/pair` verifies and records the daemon public key; `POST /api/telemetry` accepts an optional `daemon_proof`, verifies the P-256 signature, checks freshness, checks session and exam binding, rejects replay and tamper, updates `daemon_risk`, and emits a privacy-safe daemon audit event. The final `device_integrity` section of exported reports includes daemon state, proof counts, maximum capture-excluded count, and manual-review wording.

`SIMURGH_REQUIRE_DAEMON=true` enforces signed proofs on all telemetry. Missing proofs are rejected with `daemon_proof_required` and HMAC-audited as `DAEMON_MISSING` without consuming the sequence number.

### 4.4 Stage 2.4 — Browser SDK and Daemon Lifecycle (v0.4.6)

Stage 2.4 moves the browser-side daemon bridge into a reusable, testable SDK (`public/sdk/simurgh-browser-sdk.js`). The SDK owns daemon discovery, health/status checks, pairing, challenge/proof fetch, telemetry send, hardened missing-proof handling, and client daemon state.

**SDK state machine:**

```
idle → discovering → available → pairing → paired → proof_ready
                  ↓                                    ↓
              missing ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
              stale
              untrusted
              error
```

Server-side proof replay or invalid-proof responses move the SDK to `untrusted`. Hardened missing-proof mode blocks telemetry submission instead of spoofing an absent daemon proof.

The macOS daemon gains `start`, `stop`, `status`, `doctor`, and `reset-identity` lifecycle commands. `DaemonDoctor` checks daemon reachability, port availability, Keychain identity presence, allowed-origin configuration, localhost binding, server reachability, and proof round-trip readiness. Doctor output is diagnostic-only and is audited for privacy-forbidden fields before leaving the daemon process.

A development LaunchAgent plist and install/uninstall scripts (`tools/simurgh-daemon-macos/scripts/`) allow the daemon to start at user login on a development machine. These scripts are local-only and user-scoped. They are not notarised, not MDM-managed, and not production endpoint-management software.

### 4.5 Stage 2.5 — Metadata-Only Affinity Scanner (v0.4.7)

Stage 2.5 replaces the daemon's conservative placeholder scanner with a CoreGraphics-backed, metadata-only scanner that produces the signals the research paper requires as Countermeasure A evidence.

**Scanner architecture:**

- `WindowInfoProvider` protocol — mockable interface for window enumeration.
- `CoreGraphicsWindowInfoProvider` — reads CoreGraphics window dictionaries (kCGWindowLayer, kCGWindowSharingState, kCGWindowBounds, kCGWindowIsOnscreen).
- `AffinityScanner` — applies conservative visibility and sharing-state filters, rejects tiny windows (under 50×50 points), rejects known system UI, counts `capture_excluded_window_count` conservatively.
- `PrivacyNormaliser` — strips all locally-identifying fields before scanner results leave the daemon.
- `AffinityScanResult` — serialises the privacy-safe aggregate summary only.

**Scanner output contract:**

```json
{
  "scanner_state": "healthy",
  "scanner_version": "2.5.0",
  "scan_timestamp": "2026-05-16T00:00:00Z",
  "scan_duration_ms": 8,
  "scan_error_count": 0,
  "visible_window_count": 12,
  "suspicious_window_count": 0,
  "capture_excluded_window_count": 0,
  "privacy_mode": "metadata_only",
  "window_fingerprint_hashes": []
}
```

No raw process names, raw window titles, PIDs, usernames, home directories, file paths, serial numbers, or MAC addresses appear in any scanner output, status response, audit event, report section, or dashboard display.

**Trust chain:** Scanner fields are signed inside the daemon proof envelope. The browser SDK cannot append trusted scanner fields to a proof it did not sign. The server validates scanner fields only when they appear inside a verified signed payload. Standalone scanner fields in telemetry are treated as client-asserted, not daemon-verified.

**Risk escalation:** `capture_excluded_window_count > 0` applies a Critical floor (score ≥ 85) and requires manual review. This directly surfaces the Invisible Window class at the risk-scoring layer. It is not an automatic misconduct finding.

`scanner_unavailable` and `permission_denied` are accepted as honest scanner states. They add warning-level review context and do not produce accusatory language.

**Recursive forbidden-field rejection:** The server rejects forbidden raw local-data fields recursively in daemon proofs and pairing payloads, including nested debug and scanner objects. This closes the case where a modified daemon might attempt to embed raw local fields inside nested proof structures.

### 4.6 Stage 2.5 Closeout — E2E Smoke and Security Audit (v0.4.8–v0.4.10)

Three closeout gates were added before Stage 2.6 work begins:

**Stage 2.4/2.5 E2E smoke** (`scripts/smoke-stage-2-4-2-5.sh` + `tests/e2e/stage24_25_smoke.mjs`):  
Creates an exam session, imports the browser SDK, pairs a deterministic mock P-256 daemon, sends signed healthy and capture-excluded scanner proofs, rejects tampered proofs, replayed proofs, and raw-field proofs, verifies `device_integrity` in the report, verifies the HMAC audit chain, and runs the privacy audit. On macOS with Swift available, it also builds and tests the real daemon, starts the localhost daemon, checks `/health` and `/status`, runs `doctor`, and performs a LaunchAgent boundary check.

**Stage 2.2/2.3 E2E smoke** (`scripts/smoke-stage-2-2-2-3.sh` + `tests/e2e/stage22_23_smoke.mjs`):  
Verifies Ed25519 node pairing, verified integrity proofs, different-node rejection, nonce replay rejection, stale proof rejection, invalid registered-signature rejection, deterministic mock P-256 daemon pairing and proofs, daemon proof replay and tamper rejection, hardened missing-proof rejection, report and dashboard `device_integrity`, and HMAC audit verification.

**Stage 2.4/2.5 cybersecurity audit** (`scripts/security-audit-stage-2-4-2-5.sh` + `tests/security/stage24_25_security_audit.test.js`):  
Covers recursive raw local-field rejection for daemon proofs and pairing payloads, SDK token/daemon-proof trust-boundary checks, daemon loopback/body/malformed JSON/method/origin source checks, LaunchAgent dry-run and dangerous-command checks, and dashboard/report manual-review wording. The audit script also runs the privacy audit, `npm audit --audit-level=high`, the E2E smoke pack, LaunchAgent shell syntax checks, generated-output privacy grep, overclaim wording grep, and daemon dangerous-pattern grep.

---

## 5. Validation

All gates must pass before Stage 2.6 work begins.

| Gate                                  | Result                    |
| ------------------------------------- | ------------------------- |
| `npm test`                            | 234/234 pass              |
| `scripts/check.sh`                    | 50/50 gates pass          |
| Swift daemon `swift test`             | 8/8 pass                  |
| Swift daemon `swift build`            | pass                      |
| Swift daemon `swift build -c release` | pass                      |
| Stage 2.2/2.3 E2E smoke               | pass                      |
| Stage 2.4/2.5 E2E smoke               | pass                      |
| Stage 2.5 closeout security audit     | pass                      |
| `node tools/privacy-audit.mjs`        | pass — 0 forbidden fields |
| `npm audit --audit-level=high`        | pass — 0 vulnerabilities  |

Run all gates:

```bash
npm test
node tools/privacy-audit.mjs
npm audit --audit-level=high
./scripts/smoke-stage-2-2-2-3.sh
./scripts/smoke-stage-2-4-2-5.sh
./scripts/security-audit-stage-2-4-2-5.sh
./scripts/check.sh
```

On macOS with Swift available, `./scripts/check.sh` also builds, tests, and release-builds the daemon and runs the macOS-specific doctor redaction check.

---

## 6. Privacy Architecture

Privacy enforcement lives in code, not in configuration. Each forbidden-field boundary maps to one enforcement module and one test gate.

| Enforcement point       | Module                              | What it blocks                                                    |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Telemetry ingress       | `src/privacy/normaliseTelemetry.js` | Any field not on the explicit allowlist                           |
| Identity hashing        | `src/privacy/hashIdentity.js`       | Raw student identifiers at point of entry                         |
| Daemon proof validation | `src/device/daemonProof.js`         | Forbidden raw local fields, recursively, including nested objects |
| Scanner output          | `PrivacyNormaliser.swift`           | Raw window titles, process names, PIDs, paths, identifiers        |
| Privacy audit           | `tools/privacy-audit.mjs`           | CI-side scan of all generated output for forbidden field names    |

The full set of fields that are never collected or transmitted:

- Screen pixels, screenshots, screen recordings
- Webcam frames or microphone audio
- Typed answer content or pasted text content
- Raw student names or email addresses
- Biometric identifiers
- IP addresses (not persisted)
- Raw process names or raw window titles
- macOS daemon private key (never leaves the Keychain)
- macOS node private key (never leaves `~/.simurgh/node-key`, mode 0600)
- Usernames, serial numbers, MAC addresses, home directories, file paths
- LaunchAgent system inventory or device identifiers

---

## 7. Trust Boundary Summary

```
Browser client (untrusted)
    ↓  HMAC session token · replay guard · allowlist validation
Server API
    ↓  P-256 signature verification · challenge freshness · session binding
Daemon proof (signed)
    ↓  Scanner fields inside signed envelope · forbidden-field rejection
Risk engine
    ↓  Deterministic heuristics · manual-review wording
HMAC audit chain (tamper-evident)
    ↓  Export + offline verify
Human reviewer (final authority)
```

The browser cannot inject trusted daemon or scanner fields without a signed proof from a paired daemon. The server rejects raw local-identifying fields from the daemon recursively. The wording in the risk engine is hard-coded and gated by test coverage, so no automatic misconduct finding can reach output.

---

## 8. Known Limitations

| Limitation                 | Detail                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click-through overlays     | `ignoresMouseEvents = true` does not fire focus or blur events. Only the native daemon scanner can flag the window.                                        |
| Read-don't-paste workflows | Silent transcription at human WPM with no paste events is not detectable from metadata alone.                                                              |
| GPU-layer overlays         | DirectX / Metal compositor hooks used by commercial AI-overlay tools bypass both DOM events and CoreGraphics enumeration.                                  |
| Compromised endpoint       | A fully compromised OS or kernel is out of scope for Stage 2.                                                                                              |
| Helper secret exposure     | If `SIMURGH_HELPER_SECRET` is leaked, the helper telemetry channel can be spoofed. Stage 2 daemon proofs are not affected — they use Keychain-backed keys. |

---

## 9. Non-Claims

- **No production deployment readiness.** This is a research prototype and technical demonstrator.
- **No notarisation or MDM readiness.** The daemon and helper are not notarised. The LaunchAgent scripts are development-only and user-scoped.
- **No hardware attestation.** P-256 keys are stored in the macOS Keychain, not in a Secure Enclave or TPM-equivalent. Hardware-rooted attestation remains a future research milestone.
- **No automatic misconduct detection.** Every anomaly is a signal for human review. The canonical output wording — "Manual review required. No automatic misconduct finding." — is hard-coded and enforced by tests.
- **No raw process name or raw window title collection.** Scanner output contains only aggregate counts and state labels.
- **No Windows or Linux scanner.** macOS only. Stage 2.6 begins Windows daemon and display-affinity scanner work.
- **No institutional pilot data.** Effectiveness claims require red-team validation, accessibility review, and pilot data. None of those exist yet.

---

## 10. Stage 2.6

Stage 2.6 begins Windows daemon and display-affinity scanner work. The Windows equivalent surface is `SetWindowDisplayAffinity`, including `WDA_EXCLUDEFROMCAPTURE` and `WDA_MONITOR`. Stage 2.6 will implement a `simurgh-helper-win` agent that queries these flags at the Win32 level and produces the same metadata-only signed proof structure as the macOS daemon. Related overlay behaviours such as `WS_EX_TRANSPARENT` click-through windows will be tracked as adjacent UI-redressing signals but are not the core display-affinity mechanism.

Stage 2.5 closeout gates remain as go/no-go prerequisites for all Stage 2.6 work.

---

## 11. Repository

```
src/
  academic/          risk scoring, report builder, event taxonomy
  audit/             HMAC chain, export, verify
  device/            daemon proof validation, daemon state, daemon events
  integrity/         Ed25519 proof validation, node pairing, nonce guard
  privacy/           telemetry allowlist, identity hashing, privacy config
  security/          session tokens, replay guard, rate limiter
public/
  sdk/               simurgh-browser-sdk.js (Stage 2.4)
  index.html         student exam client
  instructor.html    instructor dashboard
tools/
  simurgh-daemon-macos/   Swift daemon (Stage 2.3–2.5)
  simurgh-node-macos/     Swift CLI (Stage 2.1–2.2)
  invisible-window-poc/   PoC reproducer for the attack class
  privacy-audit.mjs       CI forbidden-field scanner
  verify-audit.mjs        HMAC audit chain verifier
scripts/
  check.sh                       full pre-push gate (50 checks)
  smoke-stage-2-2-2-3.sh         Stage 2.2/2.3 E2E smoke
  smoke-stage-2-4-2-5.sh         Stage 2.4/2.5 E2E smoke
  security-audit-stage-2-4-2-5.sh  Stage 2.5 closeout security audit
tests/
  unit/              Node.js unit tests (234 total)
  e2e/               E2E smoke drivers
  security/          Security audit regression suite
```

---

## 12. Contact and Review

Stage 2.5 is open for external technical review. Feedback is especially welcome on:

- browser SDK trust boundaries
- localhost daemon lifecycle and key management
- signed daemon proof validation and replay resistance
- metadata-only scanner design and conservative counting rules
- recursive forbidden-field rejection coverage
- replay, tamper, and missing-proof handling completeness
- report, dashboard, and audit integration
- privacy boundary accuracy and limitation wording

GitHub: [github.com/Raoof128/Project-Simurgh](https://github.com/Raoof128/Project-Simurgh)  
Primary review entry point: [Issue #11 — External Review Request: Stage 2.5 macOS Integrity Stack](https://github.com/Raoof128/Project-Simurgh/issues/11) (pinned)  
Contact: raoof.r12@gmail.com
