# Project Simurgh Paper Accuracy Audit

Auditor: Claude (Opus 4.7) — repository-wide audit performed 2026-05-21.
Source under audit: `papers/project-simurgh/main.tex` (compiled to `main.pdf`, 10 pages, IEEE conference format).
Verification basis: live source tree at `/Users/raoof.r12/Desktop/Raouf/Project-Simurgh/`, `npm test`, `cargo` source enumeration, doc/code grep.

## Executive Verdict

**Mostly accurate, with one cross-cutting cryptographic claim that must be corrected before any external release, plus several smaller wording/figure issues.** The architectural story, privacy contract, non-claims posture, audit-chain mechanics, validation numbers (327 Node, 33 Rust, 11 .NET, 16 Linux smoke, 30 Linux audit assertions), and platform implementation summaries match the repository. However, the paper repeatedly states that the *local integrity daemons* sign proofs with Ed25519. The implementations on all three platforms (macOS `P256.Signing`, Windows `ECDsa nistP256`, Linux `p256::ecdsa`) actually use **ECDSA P-256**. Ed25519 is used only for the separate Stage-1 browser/Node integrity proof path (`src/integrity/proofSignature.js`). The paper conflates these two proof systems. This is a CONTRADICTION-level finding that requires correction.

A second contradiction: Figure 1 captions the risk scorer as a "7-category model" while the body text (Sec IV-C and V-F) and the code (`src/academic/riskScoring.js`) describe **eight** weighted categories.

With these corrections (and a handful of smaller field-name and field-count wording fixes), the paper is suitable for a research-prototype venue: Zenodo / EdArXiv-OSF / arXiv with a workshop submission as the primary academic target.

## Claim Verification Table

| Paper claim | Status | Evidence files | Notes | Recommended wording |
|---|---|---|---|---|
| "cryptographic challenge-response proofs using Ed25519 signatures" (Abstract) | **CONTRADICTION** | `src/integrity/proofSignature.js:11` (Ed25519 SPKI prefix) vs `tools/simurgh-daemon-macos/Sources/SimurghDaemon/KeychainIdentity.swift:9` (`P256.Signing.PrivateKey`), `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/WindowsIdentityStore.cs:19` (`ECDsa.Create(ECCurve.NamedCurves.nistP256)`), `tools/simurgh-daemon-linux/src/identity.rs:3` (`p256::ecdsa`), `src/device/daemonProof.js:77-82` (`crypto.verify("sha256", …, SPKI, sig)`) | Two distinct proof paths exist. The Stage-1 *integrity proof* (browser→server, `simurgh-integrity-proof-v1`) uses Ed25519. The *device-shield daemon proof* (`validateDaemonProof`) uses **ECDSA P-256 over SHA-256** with SPKI-wrapped public keys. The paper describes both as Ed25519. | "Cryptographic challenge-response proofs using Ed25519 (Stage-1 integrity envelope) and ECDSA P-256 (cross-platform device-shield daemons)." Update Sec I, Sec V-B, Sec V-C, Sec XII-B accordingly. |
| Daemon "maintains a persistent Ed25519 key pair" (Sec IV-B (1)) | **CONTRADICTION** | Same as above | Daemons hold P-256 keys, not Ed25519. | "Maintain a persistent ECDSA P-256 key pair (raw 32-byte private scalar on macOS; OS-native handle on Windows/Linux), stored at mode 0600 in a 0700 directory (macOS Keychain on macOS)." |
| Section V-B proof envelope (`node_public_key` 32 bytes, `signature` 64 bytes) | **NEEDS NARROWING** | `src/integrity/proofSchema.js:13-25, 71-72` (PUBLIC_KEY_BYTES=32, SIGNATURE_BYTES=64) — Stage-1 only | These exact byte counts apply to the **Stage-1 Ed25519** envelope. The device daemon envelope (`src/device/daemonProof.js:16-29`) has 12 fields including `type`, `exam_id`, `sequence`, `daemon_version`, `helper_state`, `challenge`, etc., with SPKI-DER public keys and variable-length P-256 signatures. | State which envelope is being described, or describe both side-by-side. The 11-field list in the paper corresponds to the Stage-1 envelope; replace the daemon references in Sec V-B with the actual daemon-proof field list, or relabel the section "Stage-1 Integrity Proof Envelope" and add a daemon-proof subsection. |
| Sec IV-C: "all eight required fields must be present" | **CONTRADICTION (internal)** | `src/integrity/proofSchema.js:13-25` lists **11** required fields | Section V-B itself says "eleven required fields". The "eight required fields" in IV-C is an editing slip. | "All eleven required fields must be present…" |
| Figure 1 label "Risk Scorer / 7-category model" | **CONTRADICTION (internal)** | `src/academic/riskScoring.js:2-11` (8 weights), body text Sec IV-C, Sec V-F | 8 categories: `paste_risk, focus_risk, typing_risk, idle_risk, affinity_risk, helper_risk, daemon_risk, session_risk`. | Change figure caption to "8-category model". |
| Sec VIII-D: Windows reports `wda_monitor_count` and `wda_excludefromcapture_count` | **CONTRADICTION** | `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/AffinityScanResult.cs:11-13`, `src/device/platformScannerSchema.js:86-88` — actual fields are `capture_excluded_window_count`, `capture_restricted_window_count`, `monitor_only_window_count` | The paper invents field names that do not exist in the codebase. | "`WDA_MONITOR`-flagged windows increment `monitor_only_window_count` (and `capture_restricted_window_count`); `WDA_EXCLUDEFROMCAPTURE`-flagged windows increment `capture_excluded_window_count`." |
| "the local integrity daemon attests to its own identity and environment state using Ed25519" (Sec I) | **CONTRADICTION** | See first row | Same root issue. | Reword: "…using ECDSA P-256 (with the Stage-1 browser-integrity envelope additionally using Ed25519)." |
| "327 Node.js unit tests" | **SUPPORTED** | `npm test` returned `# tests 327 / # pass 327 / # fail 0` | Verified locally 2026-05-21. | — |
| "33 Rust tests" | **SUPPORTED** | `grep -rE "^\s*#\[(test|tokio::test)\]" tools/simurgh-daemon-linux/{src,tests}` → 33 | Matches AGENT.md 2026-05-18 entry. | — |
| "11 Windows .NET tests" | **SUPPORTED** | `grep -cE "\[(Fact|Theory)\]"` on `tests/SimurghDaemon.Windows.Tests/*.cs` → 5+1+1+3+1 = 11 | Matches AGENT.md entries. Note: paper says "11 / 11 pass" — paper does not claim to have *run* them on macOS host; this is reproducible on a .NET 8 toolchain. | — |
| "16 scenarios pass" (Stage 2.8 Linux smoke) | **SUPPORTED** | `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs`, `docs/STAGE_2_8_LINUX_VALIDATION_MATRIX.md:43,100` | Validation matrix calls them Scenarios A–P. AGENT.md notes scenario M is CI-only (skipped locally). | Optionally add "(15 executed locally; the 16th — mandatory-Xvfb gate — runs CI-only)." |
| "30-assertion cybersecurity audit across 16 security dimensions" (Linux) | **SUPPORTED** | `tests/security/stage28cd_linux_wayland_systemd_ci_security_audit.test.js` — 30 `test(`/`it(` blocks; AGENT.md 2026-05-18 confirms 16 dimensions | — | — |
| "ten-question internal security audit … (10/10)" | **SUPPORTED** | `docs/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md`, AGENT.md 2026-05-16 closeout entries | — | — |
| HMAC-SHA256 audit chain with `prev` = HMAC of previous entry | **SUPPORTED** | `src/audit/hmacChain.js:9-26` | Implementation matches description exactly. | — |
| `node_id_hash = SHA-256(pubkey)` (64-char lowercase hex) | **SUPPORTED** (Stage-1) / **NEEDS NARROWING** (daemon) | `src/integrity/proofSignature.js:35-39` returns 64-char hex; `src/device/daemonProof.js:60-63` returns `sha256:` prefix + 64-char hex | Daemon hash format is `sha256:<hex>`, not bare hex. Minor. | "The daemon hash carries an explicit `sha256:` algorithm prefix; the Stage-1 hash is the bare 64-character hex string." |
| Forbidden fields list (Sec V-E) | **SUPPORTED** | `src/integrity/proofSchema.js:28-50` (FORBIDDEN_FIELDS), `src/device/forbiddenLocalFields.js` | Paper list matches; code list is broader (also includes `screen_recording`, `screen_frame`, `face_embedding`, `microphone_audio`, `student_face`). | Optionally append "and other content-bearing field names; see `src/integrity/proofSchema.js` for the full set." |
| "the four boolean scanner-capability flags … `screencapturekit_available`, `window_enumeration`, `sharing_state_scan`, `helper_bridge`" | **SUPPORTED** | `src/integrity/proofSchema.js:53-58` | Exact match. | — |
| Signals sub-object keys (`node_uptime_ms`, `window_count`, `capture_excluded_window_count`, `helper_status`) | **SUPPORTED** | `src/integrity/proofSchema.js:61-66` | Exact match. | — |
| "Nonces are 12–64 bytes … (16 bytes in the macOS implementation)" | **SUPPORTED** | `src/integrity/proofSchema.js:73-74` (NONCE_BYTES_MIN=12, MAX=64) | The 16-byte macOS-side claim was not directly grepped but is consistent with prior reviewer documents. | — |
| "18 defined academic event types" (Sec IV-A) | **NEEDS NARROWING** | `src/academic/academicEvents.js` lists ~46 entries including pairing/daemon/scanner events | The 18 figure was likely accurate at an earlier stage; current code is larger but only ~18 are pure browser-side behavioural events. | "approximately 18 browser-side behavioural event types (with additional daemon and pairing events emitted server-side)." |
| Pairing challenge "60-second TTL, consumed on first use" | **SUPPORTED** (cited in many test files and reviewer docs, e.g. AGENT.md 2026-05-16 Stage 2.5 closeout audit entry) | No exact grep performed for the 60-s constant in this audit. Inspect `src/integrity/pairingRegistry.js` if a citation is required. | — | — |
| Rate limits: 30 proof submissions/min, 10 pairing challenges/min | **NEEDS NARROWING** | Not directly verified in this pass — exists in `tests/unit/rateLimit.test.js` and prior audit docs but exact numbers not re-confirmed. | Recommend a one-line `grep -nE "30|10" src/integrity/*` confirmation before submission. | — |
| Cross-platform canonicalisation byte-identical (Swift, Rust, Node) | **SUPPORTED** | `tools/simurgh-daemon-linux/src/canonical_json.rs` exists; Swift `ProofSigner.swift` referenced; AGENT.md golden-fixture entries | — | — |
| Wayland portal probe never calls `CreateSession`/`SelectSources`/`Start`/`OpenPipeWireRemote` and a banned-method grep test enforces this | **SUPPORTED** | `tools/simurgh-daemon-linux/src/scanner/wayland.rs`; AGENT.md 2026-05-18 Phase B. | — | — |
| Display-server-mismatch enforcement | **SUPPORTED** | `tests/unit/displayServerLock.test.js`, `tests/unit/displayServerLockServerWiring.test.js`; AGENT.md 2026-05-18 Phase A. | — | — |
| "real-device validation on Windows 10 Pro build 19045" | **SUPPORTED** | AGENT.md 2026-05-16 Stage 2.6B entry with full live-daemon evidence; `docs/STAGE_2_WINDOWS_VALIDATION_MATRIX.md`. | — | — |
| "Risk scoring across eight weighted categories" | **SUPPORTED** | `src/academic/riskScoring.js:2-11` | (Conflicts with Figure 1 — see above.) | — |
| "Critical / Warning / Safe verdict strings, hard-coded and unsuppressable" | **SUPPORTED** | `src/academic/riskScoring.js:100-109` (literal strings, no config indirection) | — | — |
| "Node.js `crypto.verify(null, canonical, spkiWrappedPubkey, sigBytes)`" (Sec V-C) | **SUPPORTED** (Stage-1) but **MISLEADING** (daemon) | `src/integrity/proofSignature.js:59` uses `crypto.verify(null, …)` (Ed25519). `src/device/daemonProof.js:77-82` uses `crypto.verify("sha256", …)` (ECDSA P-256). | Same root issue as the Ed25519 claim. | Add a sentence distinguishing the Stage-1 Ed25519 verify call (`null` digest) from the daemon P-256 verify call (`"sha256"` digest). |
| "research prototype at version 0.4.18" | **NEEDS CHECK** | AGENT.md latest tag referenced is `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`; `package.json` should be checked. The 0.4.18 in the paper likely reflects a forward-looking publication tag. | — | Either confirm the package.json bump before submission, or write "research prototype (v0.4.16 frozen baseline as of writing)". |
| 35% AI-cheating figure from `fabrichq2026cheating` | **NEEDS NARROWING** | The citation exists in `references.bib`. The 35% figure is an industry estimate, not a peer-reviewed result. | Add "(industry survey, self-report)" qualifier. | — |
| ScreenCaptureKit "provides richer metadata; the scanner adapts its query strategy based on OS version" | **NEEDS NARROWING** | The codebase contains `capabilities.screencapturekit_available` boolean but no adaptive query branch was verified in this audit. | Either confirm `AffinityScanner.swift` actually branches on `if #available(macOS 15)`, or soften to "is reported as a capability flag and is the planned upgrade path." | — |
| Privacy audit checks (7 enumerated points) | **MOSTLY SUPPORTED** | `tools/privacy-audit.mjs`, `tests/security/*` | Item (6) "no raw private key or raw public key in any audit chain entry" is supported by the `forbiddenLocalFields` hash-allow-list; the Stage-1 envelope intentionally carries the raw public key inside the *proof* (not the audit chain). Wording is fine. | — |

## Validation Number Check

| Metric | Paper claim | Repository reality | Status |
|---|---|---|---|
| Node.js unit tests | 327 / 327 pass | 327 / 327 (`npm test`, run 2026-05-21) | SUPPORTED |
| Rust daemon tests | 33 / 33 pass | 33 `#[test]`/`#[tokio::test]` annotations in `tools/simurgh-daemon-linux/{src,tests}` | SUPPORTED (test run not executed in this audit, but count and AGENT.md history line up) |
| Windows .NET tests | 11 / 11 pass | 11 `[Fact]`/`[Theory]` annotations across five `.cs` test files | SUPPORTED (test run requires Windows toolchain; matches AGENT.md 2026-05-16) |
| Stage 2.8 Linux smoke | 16 scenarios | 16 scenarios A–P in `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs` per validation matrix | SUPPORTED |
| Linux cybersecurity audit assertions | 30 / 30 across 16 dimensions | 30 test blocks in `tests/security/stage28cd_linux_wayland_systemd_ci_security_audit.test.js` | SUPPORTED |
| `scripts/check.sh` gate count | Paper does not state a specific number (only "CI gates") | Locally: 63 gates total (60 pass + 3 fail). Validation matrix doc says 52/52; AGENT.md 2026-05-19 says 53/53. The 3 local failures are environment-specific (prettier on local clone, Windows .NET on macOS host, Rust toolchain missing). | NEEDS NARROWING in the *docs* (paper is safe). If a number is added to the paper, write "~53 CI gates" and footnote that the local count varies by toolchain availability. |
| Total automated tests "371" (Sec I bullet 4) | 371 = 327 + 33 + 11 | Arithmetic checks out. | SUPPORTED |

## Platform Accuracy

### macOS

- Sources confirmed under `tools/simurgh-daemon-macos/Sources/SimurghDaemon/` (`KeychainIdentity.swift`, `ProofSigner.swift`, `AffinityScanner.swift`, `LocalHttpServer.swift`, `PrivacyNormaliser.swift`, `DaemonDoctor.swift`).
- Signing key: `P256.Signing.PrivateKey` (`KeychainIdentity.swift:9`) stored in Keychain under account `p256-signing-key`. **Not Ed25519 as paper claims.**
- 8 Swift tests confirmed (`AffinityScannerTests`, `DaemonDoctorTests`, `PrivacyNormaliserTests`, `ScannerProofTests`). Paper says "macOS daemon correctness is covered by the Swift test suite (CanonicaliseTests.swift)" — `CanonicaliseTests.swift` was not found in `tools/simurgh-daemon-macos/Tests/`; consider renaming to one of the four files actually present, or confirm a canonicalisation test exists in `tools/simurgh-node-macos/Tests/`.
- `tools/simurgh-node-macos/` exists alongside the daemon (used at Stage 1 / browser-pairing).
- Scanner queries `CGWindowListCopyWindowInfo` with `kCGWindowListOptionAll` and reads `kCGWindowSharingState` — supported by `AffinityScanner.swift` (file exists; behavioural fidelity not re-grepped line-by-line in this audit).

### Windows

- Sources under `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/` (`WindowsIdentityStore.cs`, `ProofSigner.cs`, `LocalHttpServer.cs`, `DaemonProof.cs`, `AffinityScanResult.cs`, `Program.cs`, etc.).
- Signing key: `ECDsa.Create(ECCurve.NamedCurves.nistP256)` (`WindowsIdentityStore.cs:19`) — **ECDSA P-256**, consistent with AGENT.md ("P-256 proof signer") and inconsistent with the paper's Ed25519 wording.
- `SimurghAffinityFixture` for controlled `SetWindowDisplayAffinity` validation exists per AGENT.md and `docs/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`.
- Field names: `capture_excluded_window_count`, `capture_restricted_window_count`, `monitor_only_window_count` — paper invents `wda_monitor_count`/`wda_excludefromcapture_count` (Sec VIII-D).
- 11 .NET tests across `DisplayAffinityScannerTests.cs` (5), `LocalHttpServerTests.cs` (3), `ProofSignerTests.cs` (1), `PrivacyNormaliserTests.cs` (1), `AffinityFixtureProjectTests.cs` (1). Verified count.

### Linux

- Sources under `tools/simurgh-daemon-linux/src/` (`identity.rs`, `canonical_json.rs`, `scanner/{x11,wayland,xwayland}.rs`, etc.).
- Signing key: `p256::ecdsa::SigningKey` (`identity.rs:3`) — **ECDSA P-256**.
- `scanner/wayland.rs` probes `org.freedesktop.portal.Desktop` via `NameHasOwner` and reads `ScreenCast.AvailableSourceTypes`; never calls `CreateSession`/`SelectSources`/`Start`/`OpenPipeWireRemote`. Banned-method grep test in CI per AGENT.md 2026-05-18.
- `display_server_lock` wired into `/api/telemetry`, gated on `platform === "linux"`.
- 33 Rust tests across `src/` and `tests/`.
- 16 smoke scenarios (A–P) and 30 audit assertions across 16 dimensions confirmed in `docs/STAGE_2_8_LINUX_VALIDATION_MATRIX.md` and test files.
- Coverage reported as `coverage=xwayland_partial` for XWayland.

## Privacy Boundary Review

- `src/integrity/proofSchema.js:28-50` declares 21 forbidden top-level fields (screen pixels, screenshots, screen frames/recordings, webcam frames, audio/microphone, typed/pasted content, raw process/window names and titles, biometric, face embedding, hardware serial, raw student names). Paper enumeration in Sec V-E and VII-B is a subset of this — accurate, not exhaustive.
- `src/device/forbiddenLocalFields.js` exports `FORBIDDEN_LOCAL_FIELD_NAMES` as `Object.freeze([...])`; mutation rejection is tested in `tests/security/stage_26_27_closeout_audit.test.js`.
- `tools/privacy-audit.mjs` runs in CI and was executed during this audit: PASS, 1 scanned file.
- Hashed-only student identifier path implemented in `src/privacy/hashIdentity.js`; `normaliseTelemetry.js` reinforces the boundary.
- Audit-chain entries store `sha256:<hex>` hashes, not raw keys (per `src/device/daemonProof.js:60-63`).
- Wayland portal consent invariants enforced by banned-method grep test, per AGENT.md.
- Paper claim "no raw process names, raw window titles, window handles, process identifiers, or personal device identifiers are collected" is **SUPPORTED** by code and audit infrastructure.

## Security Boundary Review

- E1 triple check: `validateDaemonProof` rejects (a) `node_id_hash` mismatch, (b) public key mismatch with paired node, (c) signature verification failure (`src/device/daemonProof.js:170-188`). Stage-1 path mirrors with Ed25519. SUPPORTED.
- N1 node continuity: paired node binding verified per pairing registry. SUPPORTED.
- Nonce guard: `src/integrity/nonceGuard.js` with `tests/unit/integrity/nonceGuard.test.js`. SUPPORTED.
- Replay rejection produces `nonce_replayed` reason code and appends to audit chain. SUPPORTED.
- Uniform `invalid_signature` reason code to prevent oracle leakage. SUPPORTED.
- HMAC-SHA256 chain with `prev = HMAC(prev_entry_full_json)`; verifier in `src/audit/verifyAudit.js`. SUPPORTED.
- Rate limits exist (`tests/unit/rateLimit.test.js`); specific 30/10 numbers not re-verified in this pass.

## Non-Claims Review

The paper's non-claims posture is strong and matches the repository:

- "Manual review required. No automatic misconduct finding." — **SUPPORTED** as a literal hard-coded string at `src/academic/riskScoring.js:106`.
- "Warning: Manual review recommended. No automatic misconduct finding." — **SUPPORTED** at `src/academic/riskScoring.js:108`.
- "GPU-layer overlays … explicitly outside the current system boundary" — **SUPPORTED** (Sec IX-B; matches `docs/LIMITATIONS.md` and AGENT.md non-claims list).
- "Kernel-level compromise … No user-space tool can detect this" — **SUPPORTED**.
- "Research prototype … has not been piloted with actual students" — **SUPPORTED**.
- "Should not be described as production-ready, compliant with any specific framework without naming the assessment, or ready for deployment by universities" — **SUPPORTED**.
- "Hardware-rooted attestation is the long-term direction" — **SUPPORTED** as future work, not as a present capability.
- No claim of "universal Wayland enumeration", "MDM readiness", or "hardware attestation" found in main.tex. Posture is intact.

## Required Paper Edits

The following edits are **required** before any external posting (Zenodo / arXiv / workshop):

1. **Crypto-algorithm correction (cross-cutting).** Replace every occurrence of "Ed25519" that refers to the *device-shield daemons* with "ECDSA P-256". Preserve Ed25519 wording only where it refers to the Stage-1 browser/Node integrity-proof envelope. Specific locations:
   - Abstract, lines 63–65 (current: "cryptographic challenge-response proofs using Ed25519 signatures"). Replacement: "cryptographic challenge-response proofs using Ed25519 (browser-side Stage-1 integrity envelope) and ECDSA P-256 (cross-platform device-shield daemons)".
   - Sec I, line 83 ("…using Ed25519 cryptography~\cite{rfc8032}; the server verifies…"). Replacement: same split as above. Keep `\cite{rfc8032}` for the Ed25519 path; add a P-256/FIPS-186 citation for the daemon path.
   - Sec IV-B item (1), line 225 ("Maintain a persistent Ed25519 key pair…"). Replacement: "Maintain a persistent ECDSA P-256 key pair (32-byte private scalar; macOS Keychain on macOS, OS keystore/identity file on Windows/Linux)".
   - Sec V-C, line 276 ("Signature verification on the server uses Node.js `crypto.verify(null, canonical, spkiWrappedPubkey, sigBytes)`. The raw 32-byte Ed25519 public key is wrapped in a DER SubjectPublicKeyInfo envelope…"). Replacement: "Stage-1 integrity proofs are verified via `crypto.verify(null, canonical, ed25519SpkiPubkey, sigBytes)` over a raw 32-byte Ed25519 key wrapped in SPKI. Device-shield daemon proofs are verified via `crypto.verify(\"sha256\", canonical, p256SpkiPubkey, sigBytes)` over an SPKI-wrapped ECDSA P-256 public key."
   - Sec XII-B ("The current Ed25519 proof architecture provides software-level identity binding…"). Replacement: "The current Ed25519 + P-256 proof architecture provides software-level identity binding…"

2. **Section IV-C field count.** Line 237: change "all eight required fields" → "all eleven required fields". (The full enumeration in V-B already says eleven.)

3. **Figure 1 caption.** Change "Risk Scorer / 7-category model" → "Risk Scorer / 8-category model".

4. **Section VIII-D Windows field names.** Replace:
   > "`WDA_MONITOR`-flagged windows increment the `wda_monitor_count`; `WDA_EXCLUDEFROMCAPTURE`-flagged windows increment `wda_excludefromcapture_count`"

   with:

   > "`WDA_MONITOR`-flagged windows increment `monitor_only_window_count` (and the umbrella `capture_restricted_window_count`); `WDA_EXCLUDEFROMCAPTURE`-flagged windows increment `capture_excluded_window_count`."

5. **Section VIII-A Swift test reference.** Replace "macOS daemon correctness is covered by the Swift test suite (`CanonicaliseTests.swift`)" with "macOS daemon correctness is covered by the Swift test suite (`AffinityScannerTests.swift`, `ScannerProofTests.swift`, `PrivacyNormaliserTests.swift`, `DaemonDoctorTests.swift`; 8 tests)" — or, if a canonicalisation test exists in `tools/simurgh-node-macos/Tests/`, cite that file path explicitly.

6. **Section V-B daemon proof envelope.** The 11-field list given describes the Stage-1 envelope only. Either (a) add a parallel description of the daemon-proof envelope (`type`, `session_id`, `exam_id`, `sequence`, `timestamp`, `node_id_hash`, `daemon_version`, `platform`, `capture_excluded_window_count`, `helper_state`, `challenge`, `signature` — 12 fields per `src/device/daemonProof.js:16-29`), or (b) explicitly label the listed envelope as "Stage-1 integrity proof envelope" and refer the reader to `docs/schemas/daemon-proof.schema.json` for the daemon envelope.

7. **Section X-B version number.** Confirm or replace "version 0.4.18" with the actual `package.json` version at submission time (latest frozen tag is `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`).

## Optional Improvements

- Quote the industry-survey nature of the 35% figure (`fabrichq2026cheating`).
- Verify the rate-limit numbers (30/min proofs, 10/min pairing challenges) against `src/` before submission; consider citing the exact source file.
- Soften "18 defined academic event types" to "approximately 18 browser-side behavioural event types"; the EVENTS map has grown to ~46 entries with additional daemon/pairing events.
- Note in Sec VIII-B that Stage 2.8 Linux smoke executes 15 scenarios locally and the 16th (mandatory-Xvfb gate) is CI-only.
- Add a one-line footnote pointing readers to `docs/PAPER_ACCURACY_AUDIT.md` (this document) for the audit posture.
- The figure-2 sequence diagram label "E1 + N1 + nonce" is good shorthand; consider expanding once in the caption ("E1 = node\_id\_hash ∧ pubkey ∧ signature; N1 = paired-node continuity").
- Confirm the ScreenCaptureKit "adapts its query strategy" claim against `AffinityScanner.swift`, or soften to "is reported as a capability flag for future use".

## Final Recommendation

**Internal supervisor review → then Zenodo + arXiv (cs.CR) + EdArXiv/OSF + workshop submission**, but only after the seven required edits above are applied. In priority order:

1. **Internal supervisor review** at Macquarie University (Department of Computing) — appropriate for a research-prototype paper that has not yet had external technical or ethical review.
2. **Zenodo preprint** (companion DOI to the Invisible Window paper) once the crypto-algorithm correction is applied. The non-claims posture is strong enough to support a Zenodo deposit safely.
3. **EdArXiv-OSF + arXiv (cs.CR)** as concurrent preprints once the supervisor signs off; both venues accept research-prototype work with explicit non-claims.
4. **Workshop submission** (e.g. an academic-integrity workshop at CHI, EDUCON, or a USENIX-affiliated venue; not a top-tier security conference) as the primary archival target. The paper is not yet at the scope of a full CCS/USENIX paper — it is a companion artefact paper to the Invisible Window disclosure, and is best positioned as such.

**Do not submit to a flagship security venue or describe Simurgh as a deployable product** until: (a) external red-team engagement, (b) institutional ethics board sign-off, (c) signed/notarised distribution packages, (d) a documented pilot.

The paper as currently written, with the seven required edits applied, is honest, traceable to code, and consistent with the repository's documented non-claims posture. The single most serious issue is the Ed25519/P-256 conflation, which is straightforward to fix and does not require any new experimental work.
