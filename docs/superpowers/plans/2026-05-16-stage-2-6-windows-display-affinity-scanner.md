# Stage 2.6 Windows Display Affinity Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a metadata-only Windows display-affinity scanner contract with signed daemon proofs, risk/report/dashboard support, and a mock-first .NET daemon skeleton.

**Architecture:** Extend the existing Stage 2.5 signed daemon-proof path instead of trusting browser `/status` data. Keep Win32 enumeration behind `IWindowInfoProvider` so server and scanner behavior can be tested with mocks on Windows CI and local Windows hosts before real laptop validation.

**Tech Stack:** Node.js `node:test`, Express server, Git Bash smoke scripts, .NET 8 / xUnit, P-256 daemon signatures.

---

### Task 1: Windows Proof Contract

**Files:** `src/device/daemonProof.js`, `tests/unit/daemonProofScanner.test.js`

- [x] Write failing tests for `platform: "windows"`, `scanner_version: "2.6.0"`, `monitor_only_window_count`, `capture_restricted_window_count`, tamper rejection, and recursive forbidden-field rejection.
- [x] Accept Windows daemon proofs only when scanner fields are signed and privacy mode is `metadata_only`.
- [x] Return generic `forbidden_local_field` for raw local-data leaks.

### Task 2: Risk, State, Report, Dashboard

**Files:** `src/device/daemonState.js`, `src/academic/riskScoring.js`, `src/academic/reportBuilder.js`, `public/instructor.html`

- [x] Write failing tests for `WDA_MONITOR` warning/manual-review context and Windows scanner report fields.
- [x] Track Windows scanner counts in daemon state.
- [x] Apply a Warning floor for signed monitor-only/restricted scanner signals.
- [x] Include Windows platform and counts in reports and dashboard state without raw fields.

### Task 3: Windows Daemon Skeleton

**Files:** `tools/simurgh-daemon-windows/`

- [x] Create .NET solution, console app, and xUnit test project.
- [x] Write mock-first scanner, privacy normaliser, proof signer, and health payload tests.
- [x] Implement `IWindowInfoProvider`, `DisplayAffinityScanner`, `Win32WindowInfoProvider`, `PrivacyNormaliser`, `ProofSigner`, `LocalHttpServer`, identity/config/session records.

### Task 4: Gates And Docs

**Files:** `scripts/check.sh`, `scripts/smoke-stage-2-6-windows-scanner.sh`, `tests/e2e/stage26_windows_scanner_smoke.mjs`, `.github/workflows/windows-daemon.yml`, docs and logs

- [x] Add Stage 2.6 smoke flow for signed Windows proofs, warning/critical mapping, tamper/replay/privacy/report/audit coverage.
- [x] Add Windows daemon build/test CI job.
- [x] Update README, SECURITY, PRIVACY, ROADMAP, AGENT, CHANGELOG, and Stage 2.6 documentation.
