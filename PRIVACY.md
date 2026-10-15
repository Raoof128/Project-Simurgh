# Privacy Policy

**Scope clarification:** 2026-10-15. The academic/device policy below records the Stage 2.8
closeout of 2026-05-19. It applies to that telemetry pipeline, not every research tool in this
repository.

## Research evaluation data

The [OpenAI demonstration](docs/openai/EVALUATION.md) uses synthetic task and context text.
Offline mode makes no provider requests. An explicitly authorized live run sends those inputs to
the OpenAI Responses API; local reports can contain proposed tool arguments, provider metadata
and fixture text. Review reports before sharing and do not replace fixtures with private data.
`store: false` is a request setting, not a claim of zero retention under provider policy.

Other historical model-capture and attestation tools have their own declared data scopes. Read
the relevant experiment protocol and [security boundaries](SECURITY.md) before enabling network
access or publishing a capture. The academic telemetry exclusions below must not be generalized
to those research inputs.

## Retired legacy helper path

The legacy macOS helper path has a confirmed privacy mismatch: its payload includes raw process
names and PIDs, and the historical server path retains those fields in affinity state and emits
them through audit/SSE. This differs from the counts-only modern daemon-proof contract. The
[security review](docs/openai/SECURITY_REVIEW.md) tracks the finding and any subsequent remediation.
Do not interpret the intended exclusions in the historical policy below as proof that this legacy
path never transmitted or retained identifiers.

The current server now returns HTTP 410 for all legacy `/api/affinity` ingress, simulator
and read endpoints before reaching that collection path. This prevents new use of its
storage/audit/SSE projections through those routes. It does not erase prior exports or
change the historical native helper's local collection behavior. The helper is unsupported
on this server; modern signed daemon-proof routes retain their separate counts-only
contract. See the [hardening disposition](docs/research/hardening-phase-1/README.md).

## Academic and device telemetry policy

> **Stage 2.7 note:** The canonical list of forbidden raw-field names now lives in [`src/device/forbiddenLocalFields.js`](src/device/forbiddenLocalFields.js) and is enforced recursively by the daemon proof validator, the privacy audit CLI (`tools/privacy-audit.mjs`), and the Stage 2.7 security audit gate. Any new field added to that list automatically tightens the privacy contract across both macOS and Windows.

> **Stage 2.8C/D note:** The Linux daemon counts-only contract is preserved in Stage 2.8C/D. The Wayland portal probe reads only the `AvailableSourceTypes` property (an integer bitmask); no session, stream, or PipeWire handle is ever opened. `browser_package_hint` is UX-only and client-side — it is not collected, stored, transmitted to the server, or referenced in any server module. No new field categories were introduced.

The sections below describe the academic/device collection policy and modern daemon contracts.
They must be read with the legacy-helper exception above and the component-specific implementation
evidence; policy intent alone does not establish enforcement.

---

## What We Collect

The academic/device telemetry policy permits **behavioural metadata only**. Typed answer
and pasted text content are excluded from that pipeline.

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

## Excluded data in the academic/device policy

| Data                                                 | Status                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Screen pixels or screenshots                         | ❌ Never                                                                                    |
| Webcam frames                                        | ❌ Never                                                                                    |
| Microphone audio                                     | ❌ Never                                                                                    |
| Typed answer content                                 | ❌ Never                                                                                    |
| Pasted text content                                  | ❌ Never                                                                                    |
| Raw student name or email                            | ❌ Never                                                                                    |
| Biometric identifiers                                | ❌ Never                                                                                    |
| IP address (stored)                                  | ❌ Not persisted                                                                            |
| Location data                                        | ❌ Never                                                                                    |
| Raw Ed25519 signatures (Stage 2)                     | ❌ Never persisted to audit (verify-only)                                                   |
| Raw pairing challenge bytes (Stage 2.2)              | ❌ Never (only the SHA-256 hash enters audit)                                               |
| Raw process names, window titles, HWNDs, or PIDs     | Rejected in modern daemon proofs; legacy helper names/PIDs are a documented exception above |
| macOS node private key                               | ❌ Never leaves the local machine (stored at `~/.simurgh/node-key`, 0600)                   |
| Daemon private key                                   | ❌ Never leaves the local machine (stored in macOS Keychain)                                |
| Usernames, serial numbers, MAC addresses, file paths | ❌ Never                                                                                    |
| LaunchAgent system inventory or device identifiers   | ❌ Never                                                                                    |

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

This table describes the historical academic narrative integration. Optional research integrations
are described in the research evaluation section above.

---

## Privacy by Design

Simurgh enforces privacy constraints at the code level:

- `src/privacy/privacyConfig.js` — declarative policy (what is and is not collected)
- `src/privacy/normaliseTelemetry.js` — strict allowlist enforcement before any processing
- `src/privacy/hashIdentity.js` — one-way hashing at point of entry
- `public/sdk/simurgh-browser-sdk.js` — daemon status state machine with metadata-only proof attachment
- `tools/simurgh-daemon-macos/Sources/SimurghDaemon/AffinityScanner.swift` — CoreGraphics metadata scanner with aggregate output only
- `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/DisplayAffinityScanner.cs` — Win32 `GetWindowDisplayAffinity` scanner with aggregate counts only; raw field transmission is unconditionally rejected

These are named enforcement paths, not proof of repository-wide coverage. The legacy helper
exception above illustrates why each ingestion and export route needs separate review.

---

---

## Windows Scanner Privacy Contract

The Windows Device Shield scanner (`tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/DisplayAffinityScanner.cs`) operates on metadata only.

**Allowed Windows scanner output:**

| Field                             | Type     | Description                                             |
| --------------------------------- | -------- | ------------------------------------------------------- |
| `platform`                        | string   | `"windows"`                                             |
| `scanner_state`                   | string   | `healthy`, `risk_detected`, `restricted_detected`, etc. |
| `scanner_version`                 | string   | `"2.6.0"`                                               |
| `scan_timestamp`                  | ISO-8601 | When the scan ran                                       |
| `scan_duration_ms`                | int      | How long the scan took                                  |
| `visible_window_count`            | int      | Count of visible non-trivial windows                    |
| `suspicious_window_count`         | int      | Count of display-restricted windows                     |
| `capture_excluded_window_count`   | int      | Count of `WDA_EXCLUDEFROMCAPTURE` windows               |
| `capture_restricted_window_count` | int      | Count of `WDA_MONITOR` windows                          |
| `monitor_only_window_count`       | int      | Count of `WDA_MONITOR` windows                          |
| `scan_error_count`                | int      | Count of scan errors                                    |
| `privacy_mode`                    | string   | Always `"metadata_only"`                                |
| `window_fingerprint_hashes`       | string[] | SHA-256 of position/size tuple — no title, no handle    |

**Unconditionally forbidden in Windows scanner output:**

- HWNDs / window handles
- PIDs / process identifiers
- Process names / executable names
- Executable paths / bundle paths
- Window titles / raw window titles
- Usernames / home directories
- Serial numbers / MAC addresses
- Screen pixels / screenshots / screen frames
- Webcam frames / microphone audio
- Typed content / pasted content / answer text

Raw field transmission is rejected server-side by `containsForbiddenLocalFieldDeep` with the generic reason code `forbidden_local_field`, which never echoes the raw value.

---

## Contact

Privacy questions: **raoof.r12@gmail.com**
