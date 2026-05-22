# Claims

## C01 — Display Fidelity Failure Is Structural

**Statement:** The WebRTC `getDisplayMedia()` screen-capture API does not satisfy the Display
Fidelity Property on Windows 10 v2004+ or macOS when any top-level window has a
capture-exclusion flag set, making capture-based proctoring structurally defeatable by any
standard-privilege user running a documented OS API.

**Status:** Supported (by prior work cited)

**Falsification criteria:** A platform where `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`
or `NSWindow.SharingType.none` does NOT exclude the window from a `getDisplayMedia()` capture
would refute this claim.

**Proof:** E01 (cited from Abedini 2026 Invisible Window; not independently re-verified in this
prototype — Simurgh's motivation is grounded in this prior result)

**Evidence basis:** `abedini2026invisible` (DOI 10.5281/zenodo.20319832) — 100% evasion confirmed
across Windows 10/11, macOS 14, macOS 26.3.1 with zero visual artefacts.

**Interpretation:** This claim is inherited from the companion disclosure paper. Simurgh accepts
it as the motivating threat and does not re-evaluate it. Reviewers should assess the companion
paper independently.

**Dependencies:** O1, G1

**Tags:** security, motivation, pre-condition

---

## C02 — Metadata-Only Proof Can Replace Screen Surveillance

**Statement:** A privacy-preserving integrity system can assess session integrity through signed,
metadata-only device proofs (OS window-state summaries, behavioural telemetry counts) without
collecting screen pixels, audio, webcam frames, typed content, pasted content, raw process names,
or raw window titles at any layer.

**Status:** Supported (design claim, demonstrated by prototype)

**Falsification criteria:** Any path through the codebase that collects forbidden data would
refute this claim. The privacy audit script (`tools/privacy-audit.mjs`) and forbidden-field
schema (`src/integrity/proofSchema.js:FORBIDDEN_FIELDS`) are the regression gates.

**Proof:** E02

**Evidence basis:**

- `src/integrity/proofSchema.js:28-50`: 21 forbidden top-level fields enforced at schema level
- `src/device/forbiddenLocalFields.js`: daemon-side forbidden-field list (frozen array)
- `tools/privacy-audit.mjs`: CI-run audit; passes on all CI runs as of 2026-05-22
- `src/privacy/hashIdentity.js`: SHA-256 hash of student ID at ingress; raw value never stored

**Interpretation:** The metadata-only constraint is architectural (schema validation + privacy audit
as regression gates), not merely a policy claim. The daemon's OS scanner returns counts, not
identifiers or content. This is the system's strongest and most verifiable claim.

**Dependencies:** O3, G2, A2

**Tags:** privacy, architecture, core-claim

---

## C03 — Cross-Platform OS Metadata Detection Without Content Access

**Statement:** The Simurgh daemon correctly detects capture-exclusion state on Windows
(`WDA_MONITOR`, `WDA_EXCLUDEFROMCAPTURE` via `GetWindowDisplayAffinity`) and macOS
(`kCGWindowSharingState` via `CGWindowListCopyWindowInfo`), and overlay-relevant
window-manager states on Linux X11 (`_NET_WM_STATE`), without accessing window titles,
process names, process identifiers, or window handles in any proof field.

**Status:** Supported (Windows: real-device validated; macOS: Swift unit tests; Linux: CI/Xvfb)

**Falsification criteria:** A signed proof containing a window title, process name, PID, or
raw HWND would refute this claim. A test where `WDA_EXCLUDEFROMCAPTURE` is set but
`capture_excluded_window_count` is not incremented would refute the Windows detection claim.

**Proof:** E03

**Evidence basis:**

- Windows real-device validation on Windows 10 Pro build 19045 (AGENT.md 2026-05-16 Stage 2.6B):
  `WDA_MONITOR` → `monitor_only_window_count`; `WDA_EXCLUDEFROMCAPTURE` → `capture_excluded_window_count`
- `tools/simurgh-daemon-macos/Sources/SimurghDaemon/AffinityScanner.swift:32`: mask =
  `[.optionOnScreenOnly, .excludeDesktopElements]`; sharing state read from `kCGWindowSharingState`
- `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/AffinityScanResult.cs:11-13`:
  field names `capture_excluded_window_count`, `capture_restricted_window_count`,
  `monitor_only_window_count`
- Linux X11: `_NET_WM_STATE` property; no title or class read (Section VI-C)
- 11 Windows .NET tests, 8 macOS Swift tests, 33 Rust tests all pass

**Interpretation:** Windows detection is real-device validated; macOS and Linux are validated
through unit tests and CI only. The Linux X11 path does NOT claim Windows/macOS-style
capture-exclusion detection — it reports window-manager metadata counts.

**Dependencies:** O1, O4, G3

**Tags:** implementation, platform, core-claim

---

## C04 — Manual-Review-Only Decision Model Is Architecturally Enforced

**Statement:** The risk scorer produces exactly three verdict strings that are hard-coded and
cannot be suppressed through configuration; no component of the system produces an automatic
misconduct finding, suspension, or disciplinary record.

**Status:** Supported

**Falsification criteria:** Any code path that produces a binary misconduct verdict, triggers
an automated action, or allows the verdict strings to be configured away would refute this claim.

**Proof:** E04

**Evidence basis:**

- `src/academic/riskScoring.js:100-109`: three literal verdict strings with no config indirection:
  - `"Manual review required. No automatic misconduct finding."`
  - `"Manual review recommended. No automatic misconduct finding."`
  - `"No anomalies detected."`
- Risk thresholds: Critical ≥ 70, Warning ≥ 40, Safe < 40 (from `riskScoring.js`)
- No webhook, email, or LMS notification triggered by any verdict level (server.js review)

**Interpretation:** This is the system's most important ethical property. The hard-coding is
intentional — the risk of misconfiguration producing automated misconduct findings is considered
high enough to remove configurability entirely.

**Dependencies:** G2, A3

**Tags:** ethics, architecture, non-claim
