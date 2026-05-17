# Stage 2.6 — Windows Display Affinity Scanner

**Release tag:** `v0.4.12-stage-2-6-windows-display-affinity-scanner`

> **Stage 2.7 cross-reference (added 2026-05-17):** The Stage 2.6 Windows scanner now operates under the unified Stage 2.7 Device Shield contract — see [`STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md) and [`DEVICE_SHIELD_CONTRACT.md`](DEVICE_SHIELD_CONTRACT.md). The Windows .NET daemon code is unchanged; what changed is that the Node server validator now consumes a shared `platformScannerSchema` module that codifies the contract this scanner has been emitting since v0.4.12.

Stage 2.6 completes real-device Windows display-affinity validation for the Device Shield research
prototype. `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE` are detected through the Windows daemon,
signed inside daemon proofs, verified server-side, reflected in risk/report/dashboard/audit
outputs, and protected by tamper, replay, and raw-field rejection gates.

Stage 2.6B is real-device validated on Windows 10 Pro build 19045 for live
`GetWindowDisplayAffinity` detection. It extends Simurgh's daemon-proof contract to Windows
scanner metadata while preserving the Stage 2.5 privacy and manual-review boundaries.

---

## What Stage 2.6 Implements

- Server accepts signed daemon proofs with `platform: "windows"` and `scanner_version: "2.6.0"`.
- Signed Windows scanner fields: `capture_restricted_window_count` and `monitor_only_window_count`.
- `capture_excluded_window_count > 0` maps to Critical/manual review.
- `monitor_only_window_count > 0` maps to Warning/manual review.
- Tampered signed scanner fields are rejected with `invalid_signature`.
- Replayed daemon proof challenges are rejected.
- Recursive raw local-data rejection covers HWNDs, window handles, PIDs, process IDs, process
  names, window titles, executable paths, usernames, home directories, serial numbers, MAC
  addresses, screenshots, pixels, webcam frames, microphone audio, typed content, and pasted
  content — all rejected with the generic `forbidden_local_field` reason.
- `tools/simurgh-daemon-windows/` — mock-first .NET 8 daemon skeleton with
  `IWindowInfoProvider`, `DisplayAffinityScanner`, `Win32WindowInfoProvider`,
  `PrivacyNormaliser`, `ProofSigner`, `LocalHttpServer`, and identity/session support.
- `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/` — controlled local Win32 fixture
  with `none`, `monitor`, and `exclude` modes for real `SetWindowDisplayAffinity` validation.
- `scripts/smoke-stage-2-6-windows-scanner.sh` — end-to-end smoke driver verifying signed
  Windows scanner proofs, warning/critical risk mapping, tamper rejection, raw-field rejection,
  report output, audit verification, and privacy audit.

---

## Validation Gates

### Quality gate

```bash
./scripts/check.sh          # 44/44 checks pass (includes step 10k: Windows scanner smoke + .NET tests)
```

### Targeted smoke

```bash
scripts/smoke-stage-2-6-windows-scanner.sh
```

### Unit and security tests

```bash
npm test                                                              # 239/239 pass
node --test tests/unit/daemonProofScanner.test.js                     # Windows scanner proof validation
node --test tests/unit/daemonScannerRisk.test.js                      # WDA_MONITOR/WDA_EXCLUDEFROMCAPTURE risk mapping
node --test tests/unit/reportBuilderScanner.test.js                   # Windows report privacy contract
node --test tests/security/stage24_25_security_audit.test.js          # recursive forbidden-field audit
scripts/security-audit-stage-2-4-2-5.sh                              # Stage 2.4/2.5 closeout security gate
```

### .NET daemon tests

```bash
dotnet test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln   # 11/11 pass
```

### Privacy and dependency audit

```bash
node tools/privacy-audit.mjs    # 0 forbidden fields in generated data
npm audit --audit-level=high    # 0 high/critical vulnerabilities
```

---

## Real Windows Laptop Validation

**Validated on:**

| Item    | Value                                        |
| ------- | -------------------------------------------- |
| OS      | Windows 10 Pro / Build 19045                 |
| Runtime | .NET 8.0.421                                 |
| Node    | 24.14.0                                      |
| npm     | 11.9.0                                       |
| Git     | 2.53.0                                       |
| Branch  | `stage-2-6-windows-display-affinity-scanner` |

**Toolchain verification:**

| Check                                        | Result            |
| -------------------------------------------- | ----------------- |
| `npm test`                                   | 239/239 pass      |
| `dotnet test SimurghDaemon.Windows.sln`      | 11/11 pass        |
| `scripts/check.sh`                           | 44/44 pass        |
| `npm audit --audit-level=high`               | 0 vulnerabilities |
| `node tools/privacy-audit.mjs`               | pass              |
| `scripts/smoke-stage-2-6-windows-scanner.sh` | pass              |
| `scripts/security-audit-stage-2-4-2-5.sh`    | pass              |

**Runtime validation results:**

| Scenario                                                | Result |
| ------------------------------------------------------- | ------ |
| Normal desktop scan (zero restricted/excluded)          | pass   |
| `WDA_MONITOR` fixture detected                          | pass   |
| `WDA_EXCLUDEFROMCAPTURE` fixture detected               | pass   |
| Signed Windows daemon proof accepted                    | pass   |
| `WDA_MONITOR` proof → Warning/manual review             | pass   |
| `WDA_EXCLUDEFROMCAPTURE` proof → Critical/manual review | pass   |
| Tampered scanner proof rejected (`invalid_signature`)   | pass   |
| Replayed proof rejected (consumed challenge)            | pass   |
| Raw `hwnd` rejected as `forbidden_local_field`          | pass   |
| Report shows Windows scanner summary                    | pass   |
| Dashboard shows Windows scanner state                   | pass   |
| Audit chain verifies after Windows scanner events       | pass   |
| Privacy audit                                           | pass   |
| npm audit                                               | pass   |

**Observed live scanner states:**

```json
{
  "normal": {
    "scanner_state": "healthy",
    "capture_excluded_window_count": 0,
    "capture_restricted_window_count": 0,
    "monitor_only_window_count": 0
  },
  "monitor": {
    "scanner_state": "restricted_detected",
    "capture_excluded_window_count": 0,
    "capture_restricted_window_count": 1,
    "monitor_only_window_count": 1
  },
  "exclude": {
    "scanner_state": "risk_detected",
    "capture_excluded_window_count": 1,
    "capture_restricted_window_count": 1,
    "monitor_only_window_count": 0
  }
}
```

---

## Windows Privacy Boundary

The Windows daemon transmits **aggregate counts only**. It never transmits:

- Raw HWNDs or window handles
- Raw process IDs (PIDs) or process names
- Raw window titles or executable paths
- Usernames, home directories, or file paths
- Serial numbers, MAC addresses, or device identifiers
- Screenshots, screen pixels, or webcam frames
- Microphone audio
- Typed content or pasted content

Enforcement is unconditional — there is no debug flag or configuration option that enables raw
field transmission from the Windows daemon. Any proof payload containing these fields is rejected
server-side with `forbidden_local_field` before the proof is accepted.

---

## Manual-Review Contract

Windows scanner signals are review triggers only:

```text
Manual review recommended. No automatic misconduct finding.
```

Simurgh does not claim that `WDA_MONITOR` or `WDA_EXCLUDEFROMCAPTURE` signals prove misconduct.
A flagged state requires human judgment and institutional due process before any action is taken.

---

## Non-Claims

- Not a production Windows Service deployment.
- Not notarised, not MDM/Intune ready, not enterprise endpoint managed.
- Not hardware-attested. The Windows daemon identity is a development P-256 key, not
  TPM-backed, Secure Enclave-backed, or hardware-rooted.
- Not kernel-level. `GetWindowDisplayAffinity` is a user-space Win32 API call.
- Not a Linux scanner. Linux affinity detection is not included in Stage 2.6.
- Not automatic misconduct detection. All findings are manual-review recommendations only.
- Not a claim of unbreakability. A determined adversary could kill the daemon process. Stage 4
  explores hardware-rooted attestation as a future mitigation.
- This is a research prototype. External deployment, institutional use, or compliance decisions
  require independent evaluation beyond this prototype's scope.
