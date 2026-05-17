# Device Shield Platform Matrix

**Status:** authoritative capability matrix for the Stage 2.7 cross-platform Device Shield.
**Companion to:** [`docs/DEVICE_SHIELD_CONTRACT.md`](DEVICE_SHIELD_CONTRACT.md).

This document reconciles two existing matrices in the repository — the design-spec capability matrix (`docs/superpowers/specs/2026-05-17-stage-2-7-cross-platform-device-shield-design.md`) and the platform-coverage matrix in `README.md` — into a single canonical view. Where they disagreed, the verified behaviour of `src/device/daemonProof.js` and the Stage 2.6 baseline wins.

---

## 1. Capability Matrix (per Stage 2.7 spec §2 / design spec)

Rows are capabilities; columns are platforms. `Yes` means the capability is present in the Stage 2.7 baseline. `No` means it is explicitly out of scope or rejected. `Research` means investigation only — no production claim.

| Capability                    | macOS                             | Windows                                       | Linux                                   |
| ----------------------------- | --------------------------------- | --------------------------------------------- | --------------------------------------- |
| Browser telemetry             | Yes                               | Yes                                           | Yes (browser only)                      |
| Localhost daemon              | Yes (Swift, `127.0.0.1:3031`)     | Yes (.NET 8, `127.0.0.1:3031`)                | No                                      |
| Signed P-256 daemon proof     | Yes                               | Yes                                           | No (rejected as `unsupported_platform`) |
| Metadata-only scanner         | Yes (CoreGraphics, `2.5.0`)       | Yes (Win32, `2.6.0`)                          | No                                      |
| Display-affinity detection    | Yes (`NSWindow.SharingType.none`) | Yes (`WDA_EXCLUDEFROMCAPTURE`, `WDA_MONITOR`) | No                                      |
| Real-device validation        | Yes (Stage 2.5)                   | Yes (Stage 2.6B real-laptop run)              | No                                      |
| Production installer          | No (research prototype)           | No (research prototype)                       | No                                      |
| Hardware attestation          | No                                | No                                            | No                                      |
| Automatic misconduct decision | No (manual review only)           | No (manual review only)                       | No                                      |

Linux remains a Stage 2.8+ research target. Stage 2.7 daemons rejecting `platform: "linux"` as `unsupported_platform` is the intended behaviour.

---

## 2. README Coverage Matrix (reconciled)

The `README.md` carries two related coverage tables — one for browser-based telemetry, one for the strategic Phase 3b packaging plan — using different schemas to those above. The tables below are **reconciled views** (not verbatim copies) that normalise the README content into the Stage 2.7 vocabulary, so reviewers can cross-check without flipping back and forth. The authoritative wording in `README.md` remains the source of truth; Stage 2.7 Task 15 brings the README's roadmap items in line with the v0.4.12 baseline.

### 2.1 Telemetry coverage (reconciled from `README.md` §4)

| Host OS | Browser Coverage | Helper Coverage                                    |
| ------- | ---------------- | -------------------------------------------------- |
| Windows | Full             | Yes via `tools/simurgh-daemon-windows` (Stage 2.6) |
| macOS   | Full             | Yes via `tools/simurgh-daemon-macos` (Stage 2.3+)  |
| Linux   | Full             | None — Stage 2.8 research                          |

> **Stage 2.7 reconciliation:** The README's Phase 2 roadmap still carries the pre-Stage-2.6 line "Develop `simurgh-helper-win` using `SetWindowDisplayAffinity` enumeration via Win32 API" as a planned item. The Windows row above reflects the v0.4.12 baseline; Stage 2.7 Task 15 brings the README's Phase 2 list in line.

### 2.2 Packaging plans (reconciled from `README.md` §11 Phase 3b)

| Host OS | Daemon Status      | Packaging Target                   | Native Helper Status                             |
| ------- | ------------------ | ---------------------------------- | ------------------------------------------------ |
| macOS   | Shipped (research) | Future — signed/notarised `.app`   | `simurgh-helper` (Swift / CoreGraphics)          |
| Windows | Shipped (research) | Future — signed `.msix` via GPO    | `tools/simurgh-daemon-windows/` (.NET 8 / Win32) |
| Linux   | None               | Future — `.deb` / `.rpm` / Flatpak | Stage 2.8 research                               |

> **Stage 2.7 reconciliation:** Production packaging (notarisation, MSIX, MDM/Intune, GPO) is explicitly out of scope for Stage 2.7. Those columns describe future stages, not current capability.

---

## 3. Platform Vocabulary Cross-Reference

| Concept                     | macOS term                   | Windows term                                       | Schema field                      |
| --------------------------- | ---------------------------- | -------------------------------------------------- | --------------------------------- |
| Capture-excluded affinity   | `NSWindow.SharingType.none`  | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` | `capture_excluded_window_count`   |
| Monitor-only affinity       | not applicable               | `SetWindowDisplayAffinity(WDA_MONITOR)`            | `monitor_only_window_count`       |
| Capture-restricted affinity | partial / not applicable     | restricted variants below `WDA_EXCLUDEFROMCAPTURE` | `capture_restricted_window_count` |
| Window enumeration          | `CGWindowListCopyWindowInfo` | `EnumWindows` + `GetWindowDisplayAffinity`         | `visible_window_count`            |
| Scanner baseline            | `2.5.0`                      | `2.6.0`                                            | `scanner_version`                 |
| Historic-only scanner state | `unsupported_macos_version`  | never emitted                                      | `scanner_state`                   |

---

## 4. Non-Claims (Matrix-Specific)

The matrices above are descriptive, not aspirational. In particular, none of them imply:

- Hardware attestation on any row.
- MDM/Intune readiness on any row.
- Kernel-level visibility on any row.
- GPU overlay coverage on any row.
- Automatic misconduct detection on any row.

Where a "Future" or "Research" entry appears, it means **not implemented today**.
