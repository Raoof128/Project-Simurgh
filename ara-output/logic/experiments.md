# Experiments

## E01 — Display Fidelity Failure Validation (Prior Work)

**Verifies:** C01

**Setup:** Windows 10/11 and macOS 14/26 with `getDisplayMedia()` active. Apply
`SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` or `NSWindow.SharingType.none` to a
top-level application window.

**Procedure:** Inspect the captured frame for pixels from the excluded window. Check DOM events
and browser-observable state for any indication of the exclusion.

**Metrics:** Evasion rate (fraction of excluded windows absent from capture frame); DOM event
count for exclusion-state changes; visual artefact count in captured frames.

**Expected outcome (directional):** Evasion rate approaches 100%; zero DOM events; zero visual
artefacts. Result sourced from companion paper (Abedini 2026) — not independently re-run in
this prototype.

**Baselines:** Standard `getDisplayMedia()` capture without any exclusion flag (baseline: 0%
evasion).

**Dependencies:** O1, A1

---

## E02 — Privacy Boundary Regression Testing

**Verifies:** C02

**Setup:** Run `tools/privacy-audit.mjs` against the full source tree. Run `npm test` with the
full 327 Node.js unit test suite. Inspect `src/integrity/proofSchema.js:FORBIDDEN_FIELDS` and
`src/device/forbiddenLocalFields.js`.

**Procedure:**

1. Execute `tools/privacy-audit.mjs`; check exit code and output for any forbidden-API
   calls (`getDisplayMedia`, `getUserMedia`, clipboard read).
2. Run `tests/security/` suite; verify all privacy-related assertions pass.
3. Submit a test proof containing a forbidden field (e.g., `window_title`); verify rejection
   with `forbidden_local_field` reason code.
4. Submit a valid proof; verify student ID is stored only as SHA-256 hash.

**Metrics:** Privacy audit exit code; number of forbidden-field violations found; test pass rate.

**Expected outcome (directional):** Privacy audit exits 0; zero forbidden-field violations;
all privacy-related tests pass; forbidden-field proofs rejected.

**Baselines:** A naive implementation with no schema validation (would pass any proof).

**Dependencies:** C02, O3

---

## E03 — Cross-Platform Detection Correctness

**Verifies:** C03

**Setup:**

- Windows: Physical Windows 10 Pro (build 19045). Apply `SetWindowDisplayAffinity` with
  `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE` to test windows using `SimurghAffinityFixture`.
- macOS: Swift unit test suite (`AffinityScannerTests.swift`).
- Linux: CI environment with Xvfb, `SIMURGH_REQUIRE_XVFB_TESTS=1`.

**Procedure:**

- Windows: Run .NET daemon; submit proof to Node.js verifier; inspect `capture_excluded_window_count`
  and `monitor_only_window_count`; verify server acceptance; verify no PID/title/HWND in proof.
- macOS: Run `AffinityScannerTests.swift`; verify `captureExcludedWindowCount` increments for
  `SharingType.none` windows.
- Linux: Run Rust test suite under Xvfb; verify X11 `_NET_WM_STATE` counts; verify no title/class.

**Metrics:** Flag-count accuracy (correct increment/decrement); presence of forbidden fields
in submitted proofs; server acceptance rate for valid proofs; rejection rate for tampered proofs.

**Expected outcome (directional):** `WDA_EXCLUDEFROMCAPTURE` windows increment
`capture_excluded_window_count`; `WDA_MONITOR` windows increment `monitor_only_window_count`;
unflagged windows contribute to neither; no titles/PIDs/HWNDs in any submitted proof.

**Baselines:** A scanner that returns static zero counts (no detection capability).

**Dependencies:** C03, O1, O4

---

## E04 — Manual-Review-Only Decision Model Enforcement

**Verifies:** C04

**Setup:** `src/academic/riskScoring.js` and `tests/unit/riskScoring.test.js`.

**Procedure:**

1. Inject telemetry with paste ≥ 200 chars and typed < 20 chars; verify risk_level = "Critical".
2. Inject proof with `capture_excluded_window_count` > 0; verify `affinity_risk` = 100 and
   risk_score ≥ 85.
3. Verify verdict string for Critical = "Manual review required. No automatic misconduct finding."
4. Attempt to configure an alternative verdict string via environment variable or config object;
   verify the hard-coded string is used regardless.
5. Verify no webhook, email, or LMS integration is triggered by any risk level.

**Metrics:** Correctness of verdict string for each risk level; presence of any configurable
verdict path; presence of any automated action trigger.

**Expected outcome (directional):** Verdict strings match hard-coded literals exactly for all
risk levels; no configuration path overrides them; no automated action triggered.

**Baselines:** A system with configurable verdict strings that could be set to empty or
custom text.

**Dependencies:** C04, G2
