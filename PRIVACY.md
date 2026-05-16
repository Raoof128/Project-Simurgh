# Privacy Policy

**Last updated:** 2026-05-16 (Stage 2.6B real Windows metadata-only scanner validation)

Project Simurgh is a research prototype for privacy-preserving academic integrity verification. This document describes what data is collected, how it is used, and what is explicitly not collected.

---

## What We Collect

Simurgh collects **behavioural metadata only**. No content is ever collected, stored, or transmitted.

| Signal                                               | Collected              | Purpose                                                             |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| Keystroke count per window                           | ✅                     | Typing cadence analysis                                             |
| Characters typed (count only)                        | ✅                     | Cognitive load signal                                               |
| Effective WPM                                        | ✅                     | Superhuman cadence detection                                        |
| Focus loss count                                     | ✅                     | Context-switch detection                                            |
| Time off window (ms)                                 | ✅                     | Off-task duration signal                                            |
| Paste count                                          | ✅                     | Paste frequency                                                     |
| Paste length (chars, no content)                     | ✅                     | Bulk paste detection                                                |
| Maximum idle gap (ms)                                | ✅                     | Idle-then-paste pattern                                             |
| Keydown timing intervals                             | ✅ (capped at 200)     | Rhythm analysis                                                     |
| Helper connection status                             | ✅                     | Countermeasure A attestation                                        |
| Display-affinity alerts                              | ✅                     | Invisible window detection                                          |
| Node ID hash (SHA-256 of Ed25519 pubkey)             | ✅                     | Stage 2.1/2.2 — node continuity check                               |
| Node public key (base64)                             | ✅                     | Stage 2.2 — paired-session signature verification                   |
| Pairing challenge hash                               | ✅                     | Stage 2.2 — pairing audit trail                                     |
| Proof / pairing signatures (verify-only)             | ✅ (not stored as raw) | Stage 2.1/2.2 — Ed25519 verification; raw bytes never enter audit   |
| Capability flags (booleans)                          | ✅                     | Stage 2.1 — node capability summary                                 |
| Node uptime / window count / capture-excluded count  | ✅                     | Stage 2.1 — numeric signals                                         |
| Daemon node hash and version                         | ✅                     | Stage 2.3 — localhost daemon proof verification                     |
| Daemon state, proof age, and challenge hash          | ✅                     | Stage 2.3 — replay-resistant device-integrity metadata              |
| Browser SDK daemon state label                       | ✅                     | Stage 2.4 — local lifecycle status only                             |
| Scanner state, counts, duration, and version         | ✅                     | Stage 2.5/2.6 — aggregate metadata-only affinity scanner summary    |
| Windows monitor-only / capture-excluded counts       | ✅                     | Stage 2.6B — signed `WDA_MONITOR` / `WDA_EXCLUDEFROMCAPTURE` counts |
| Raw HWNDs, process/window names, PIDs, paths, pixels | ❌                     | Forbidden; rejected by daemon-proof validation and privacy audit    |

## What We Never Collect

| Data                                                 | Status                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Screen pixels or screenshots                         | ❌ Never                                                                  |
| Webcam frames                                        | ❌ Never                                                                  |
| Microphone audio                                     | ❌ Never                                                                  |
| Typed answer content                                 | ❌ Never                                                                  |
| Pasted text content                                  | ❌ Never                                                                  |
| Raw student name or email                            | ❌ Never                                                                  |
| Biometric identifiers                                | ❌ Never                                                                  |
| IP address (stored)                                  | ❌ Not persisted                                                          |
| Location data                                        | ❌ Never                                                                  |
| Raw Ed25519 signatures (Stage 2)                     | ❌ Never persisted to audit (verify-only)                                 |
| Raw pairing challenge bytes (Stage 2.2)              | ❌ Never (only the SHA-256 hash enters audit)                             |
| Raw process names, window titles, HWNDs, or PIDs     | ❌ Never (Stage 2.1+ only ships counts and capability flags)              |
| macOS node private key                               | ❌ Never leaves the local machine (stored at `~/.simurgh/node-key`, 0600) |
| Daemon private key                                   | ❌ Never leaves the local machine (stored in macOS Keychain)              |
| Usernames, serial numbers, MAC addresses, file paths | ❌ Never                                                                  |
| LaunchAgent system inventory or device identifiers   | ❌ Never                                                                  |

---

## Student Identity

Student identifiers are hashed with **SHA-256** before any storage or processing. The raw identifier is never written to disk, logged, or transmitted to third-party services.

---

## Risk Scores and Reports

Risk scores are produced by **local deterministic heuristics**. When a session reaches Warning or Critical level, an optional Claude AI narrative is appended — this call receives only the sanitised telemetry metadata listed above, never content.

**All risk findings are recommendations for manual human review. Simurgh does not make automatic misconduct findings.**

---

## Data Retention

| Data type                   | Retention                            |
| --------------------------- | ------------------------------------ |
| In-memory session telemetry | 4 hours of inactivity (auto-evicted) |
| Audit chain (in-memory)     | Session lifetime                     |
| Exported reports            | Operator-controlled                  |

This is a stateless prototype. No data is written to a database. Restarting the server clears all session data.

---

## Third-Party Services

| Service              | What it receives             | Purpose                                |
| -------------------- | ---------------------------- | -------------------------------------- |
| Anthropic Claude API | Sanitised telemetry metadata | Risk narrative (Warning/Critical only) |

No other third-party services receive any data.

---

## Privacy by Design

Simurgh enforces privacy constraints at the code level:

- `src/privacy/privacyConfig.js` — declarative policy (what is and is not collected)
- `src/privacy/normaliseTelemetry.js` — strict allowlist enforcement before any processing
- `src/privacy/hashIdentity.js` — one-way hashing at point of entry
- `public/sdk/simurgh-browser-sdk.js` — daemon status state machine with metadata-only proof attachment
- `tools/simurgh-daemon-macos/Sources/SimurghDaemon/AffinityScanner.swift` — CoreGraphics metadata scanner with aggregate output only

These controls cannot be bypassed by configuration without code changes.

---

## Contact

Privacy questions: **raoof.r12@gmail.com**
