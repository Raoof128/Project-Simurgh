## Change Log

## [0.4.10-sync] — 2026-05-16 — Documentation Audit and Synchronization

### Changed

- `DECISIONS.md`, `DEMO_SCRIPT.md`, `LIMITATIONS.md`, `RESOURCE_PLAN.md` — updated status to v0.4.10; reflected Stage 2 completion for macOS.
- `RESEARCH_PROGRAMME.md`, `STAGE_2_ARCHITECTURE.md` — synchronized architecture tracks with the frozen macOS implementation.
- `THREAT_MODEL.md`, `VALIDATION.md`, `RISK_REGISTER.md` — updated baseline to Stage 2.5 macOS prototype.
- `STAGE_1_5_REVIEWER_PACK.md`, `STAGE_1_ACADEMIC_SHIELD.md` — added historical/retrospective notes.
- `STAGE_2_3_MACOS_LOCALHOST_DAEMON.md` — marked as complete and verified.

### Raouf

- **Date:** 2026-05-16 (Australia/Sydney)
- **Scope:** Repository-wide documentation audit and synchronization
- **Summary:** Line-by-line audit of all 20+ documentation files to ensure consistency with the completed Stage 2.5 macOS Device Shield.
- **Files changed:** 13 files in `docs/` and root.
- **Verification:** All stale status banners and version strings updated to v0.4.10.
- **Follow-ups:** None.

## [0.4.10-docs] — 2026-05-16 — macOS Device Shield Closeout Documentation

### Added

- `docs/STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md` — main reviewer closeout document.
- `docs/STAGE_2_MACOS_VALIDATION_MATRIX.md` — mapping of requirements to verification evidence.
- `docs/STAGE_2_MACOS_REVIEWER_CHECKLIST.md` — formal verification checklist for the macOS prototype.
- `docs/evidence/stage-2-macos/` — folder for redacted verification evidence.

### Changed

- `README.md` — marked macOS Device Shield as frozen through v0.4.10; added release timeline and production-hardening backlog.
- `SECURITY.md` — added Stage 2 macOS security posture and clarified out-of-scope production controls.
- `PRIVACY.md` — documented the metadata-only scanner privacy contract and forbidden data list.
- `ROADMAP.md` — marked Stage 2 macOS tasks as complete and indicated Stage 2.6 Windows as the next milestone.

### Raouf

- **Date:** 2026-05-16 (Australia/Sydney)
- **Scope:** macOS Device Shield closeout documentation
- **Summary:** Final documentation pass to mark the macOS research prototype as complete, audited, and frozen before starting Windows Stage 2.6 work.
- **Files changed:** `docs/STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`, `docs/STAGE_2_MACOS_VALIDATION_MATRIX.md`, `docs/STAGE_2_MACOS_REVIEWER_CHECKLIST.md`, `docs/evidence/stage-2-macos/README.md`, `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Full verification suite passed (tests, privacy audit, security audit, smoke packs, check.sh).
- **Follow-ups:** None.

## [0.4.10] — 2026-05-16 — Stage 2.5 Closeout Security Audit

### Added

- `scripts/security-audit-stage-2-4-2-5.sh` — closeout cybersecurity gate for the Stage 2.4 browser SDK and Stage 2.5 scanner/daemon proof surface.
- `tests/security/stage24_25_security_audit.test.js` — regression suite covering recursive raw local-field rejection, SDK token/proof boundaries, daemon localhost hardening source checks, LaunchAgent dry-run safety, and dashboard/report wording.
- `docs/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md` — closeout audit scope, locked security decisions, command, and Stage 2.6 go/no-go rules.
- `scripts/check.sh` gate: `Stage 2.4/2.5 cybersecurity audit: SDK + daemon + scanner hardening`.

### Changed

- Daemon proof and pairing validation now reject forbidden raw local-data fields recursively, including nested debug/scanner objects.
- macOS daemon localhost server now has explicit request-size handling, malformed JSON rejection for sensitive JSON endpoints, method-not-allowed responses for known routes, and keeps loopback-only binding.
- Development LaunchAgent install/uninstall scripts now expose safe `--check` / `--dry-run` modes and bounded path checks; plist lint runs when `plutil` is available and is skipped cleanly on Linux CI.
- README now documents the Stage 2.5 closeout cybersecurity audit command and links the audit note.

### Verified

- Red step: `node --test tests/security/stage24_25_security_audit.test.js` failed before implementation on recursive forbidden fields, daemon HTTP hardening checks, and LaunchAgent dry-run checks.
- Targeted gate: `scripts/security-audit-stage-2-4-2-5.sh` — pass.

### Notes

- This is a Stage 2.5 closeout hardening pass, not Stage 2.6 feature work.
- No production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux daemon/scanner support, raw process/window collection, or automatic misconduct detection is claimed.

## [0.4.9] — 2026-05-16 — Stage 2.2/2.3 E2E Smoke Closeout

### Added

- `scripts/smoke-stage-2-2-2-3.sh` — closeout smoke wrapper for Stage 2.2 node pairing and Stage 2.3 daemon proof flows.
- `tests/e2e/stage22_23_smoke.mjs` — CI-safe E2E driver covering verified node pairing, signed integrity proofs, different-node rejection, stale proof rejection, nonce replay rejection, invalid signature rejection, daemon pairing/proofs, daemon proof replay/tamper rejection, reports, dashboard state, audit verification, and hardened missing-proof mode.
- `docs/superpowers/plans/2026-05-16-stage-2-2-2-3-e2e-smoke-pack.md` — implementation plan for the Stage 2.2/2.3 smoke pack.
- `scripts/check.sh` gate: `Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge`.

### Changed

- README now documents the dedicated Stage 2.2/2.3 smoke command and the bridge checks it performs before later Stage 2 work.

### Verified

- Targeted red step confirmed `tests/e2e/stage22_23_smoke.mjs` was missing before implementation.
- `scripts/smoke-stage-2-2-2-3.sh` — pass.
- Final verification after edits: `git diff --check` — clean; `npm test` — 234/234 pass; `./scripts/check.sh` — 50/50 gates pass; `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` — pass.

### Notes

- This is a Stage 2.2/2.3 smoke gate, not Stage 2.6 feature work.
- No production deployment, hardware attestation, notarisation, MDM readiness, Windows/Linux daemon support, or automatic misconduct detection is claimed.

## [0.4.8] — 2026-05-16 — Stage 2.4/2.5 E2E Smoke Closeout

### Added

- `scripts/smoke-stage-2-4-2-5.sh` — closeout smoke wrapper for Stage 2.4 browser SDK + Stage 2.5 scanner proof flows.
- `tests/e2e/stage24_25_smoke.mjs` — CI-safe E2E driver that creates an exam session, pairs a deterministic mock P-256 daemon, sends signed healthy and capture-excluded scanner proofs, rejects tampered/replayed/raw-field proofs, verifies report/dashboard `device_integrity`, and verifies the audit chain.
- `docs/superpowers/plans/2026-05-16-stage-2-4-2-5-e2e-smoke-pack.md` — implementation plan for the closeout smoke pack.
- `scripts/check.sh` gate: `Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof`.

### Changed

- README now documents the dedicated Stage 2.4/2.5 smoke command and its CI-safe versus macOS-only checks.
- Daemon rejection audit/dashboard state now stores `forbidden_local_field` for forbidden local-data proof failures instead of preserving exact forbidden field names.
- Daemon proof validation explicitly rejects `webcam` as a forbidden raw local-data field.
- Daemon `/status` now includes privacy-safe `platform: "macos"` for lifecycle smoke and UI consistency.

### Verified

- Baseline after pulling latest `main`: `git diff --check` passed; `npm test` — 234/234 pass; `./scripts/check.sh` — 48/48 gates pass; `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` — pass.
- `scripts/smoke-stage-2-4-2-5.sh` — pass.
- Final verification after edits: `git diff --check` — clean; `npm test` — 234/234 pass; `./scripts/check.sh` — 49/49 gates pass; `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` — pass.

### Notes

- This is a Stage 2.5 closeout gate, not Stage 2.6 feature work.
- No production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection is claimed.

## [0.4.7] — 2026-05-16 — Stage 2.5 macOS Affinity Scanner Implementation

### Added

- `AffinityScanner` now uses a mockable CoreGraphics metadata provider to enumerate meaningful visible windows and count capture-excluded risk signals.
- Stage 2.5 scanner summary fields inside signed daemon proofs: scanner state/version, scan timestamp, scan duration, visible/suspicious/capture-excluded counts, scan error count, privacy mode, and privacy-safe fingerprint hashes.
- Server-side daemon-proof validation for scanner fields, including privacy rejection for raw process/window/PID/path/user fields and signature tamper rejection when scanner fields change.
- Scanner audit events: `SCANNER_SCAN_COMPLETED`, `SCANNER_RISK_DETECTED`, `SCANNER_PERMISSION_DENIED`, `SCANNER_UNAVAILABLE`, `SCANNER_PRIVACY_REJECTED`, and `SCANNER_ERROR`.
- Stage 2.5 Swift and Node tests plus `scripts/check.sh` gates for scanner proof validation, scanner risk mapping, report scanner summaries, Swift scanner privacy/risk behavior, and signed scanner proof inclusion.
- `docs/STAGE_2_5_MACOS_AFFINITY_SCANNER.md`.

### Changed

- Daemon `/status` now exposes privacy-safe scanner state and last-scan metadata.
- Daemon `/proof` now signs scanner summaries inside the proof payload; browser code does not add trusted scanner fields beside the proof.
- `capture_excluded_window_count > 0` remains Critical/manual-review context, while `scanner_unavailable` and `permission_denied` are accepted as signed warning-level scanner states.
- Instructor dashboard and reports include scanner state, visible-window count, max capture-excluded count, scanner error counts, permission-denied counts, and manual-review wording.
- README, SECURITY, PRIVACY, and ROADMAP document Stage 2.5 while preserving the research-prototype and metadata-only boundaries.

### Verified

- Baseline before edits: `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build` all passed.
- `node --test tests/unit/daemonProofScanner.test.js tests/unit/daemonScannerRisk.test.js tests/unit/reportBuilderScanner.test.js` — 7/7 pass.
- `npm test` — 234/234 pass.
- `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass.
- `swift build` in `tools/simurgh-daemon-macos` — pass.
- `git diff --check` — clean.
- `./scripts/check.sh` — 48/48 gates pass, including Stage 2.5 scanner proof, risk, report, Swift scanner, and signed-proof gates.

### Notes

- Stage 2.5 remains a research prototype milestone. It does not claim production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, or automatic misconduct detection.
- Scanner output is metadata-only. It does not transmit raw process names, raw window titles, PIDs, usernames, home directories, file paths, serial numbers, MAC addresses, screenshots, screen pixels, webcam frames, microphone audio, typed content, or pasted content.

## [0.4.6] — 2026-05-16 — Stage 2.4 Browser SDK & Daemon Lifecycle Hardening

### Added

- `public/sdk/simurgh-browser-sdk.js` — reusable browser SDK for daemon discovery, health/status checks, pairing, proof fetch, telemetry send, hardened missing-proof handling, and explicit client daemon state.
- Browser SDK unit coverage for missing daemon state, pair success, proof-backed telemetry, hardened missing-proof blocking, and proof replay/rejection state.
- macOS daemon lifecycle commands: `start`, `stop`, `status`, `doctor`, and `reset-identity`.
- `DaemonDoctor` diagnostics covering daemon reachability, port availability, Keychain identity presence, allowed-origin configuration, localhost binding, server reachability, and proof round-trip readiness.
- Development-only LaunchAgent plist plus install/uninstall scripts under `tools/simurgh-daemon-macos/`.
- Stage 2.4 check gates for SDK loading/tests, daemon lifecycle/doctor redaction tests, LaunchAgent plist lint, and daemon lifecycle smoke.

### Changed

- `public/index.html` now consumes the SDK instead of owning the daemon bridge inline.
- Daemon localhost server now supports CORS preflight for allowed origins and a local `/shutdown` control route for development lifecycle use.
- README, SECURITY, PRIVACY, and ROADMAP document Stage 2.4 while keeping production deployment, notarisation, MDM, hardware attestation, Windows/Linux daemon, and scanner-upgrade work out of scope.

### Verified

- Baseline before edits: `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build` all passed.
- `node --test tests/unit/browserSdk.test.js tests/unit/daemonLifecycle.test.js tests/unit/daemonDoctor.test.js` — 8/8 pass.
- `npm test` — 227/227 pass.
- `swift build` in `tools/simurgh-daemon-macos` — pass.
- `swift test` in `tools/simurgh-daemon-macos` — 2/2 pass.
- `./scripts/check.sh` — 43/43 gates pass, including Stage 2.4 SDK load/tests, doctor redaction, LaunchAgent plist lint, and daemon lifecycle smoke.

### Notes

- The LaunchAgent path is development-only. It is not notarised, not production endpoint management, and not MDM deployment.
- The daemon scanner remains a conservative metadata-only placeholder; deeper scanner detection is reserved for a later stage.

## [0.4.5] — 2026-05-15 — Stage 2.3 macOS Localhost Daemon

### Added

- `src/device/daemonProof.js` — P-256 daemon proof canonicalisation, node hash derivation, signature verification, timestamp/session/exam validation, and raw local-data field rejection.
- `src/device/daemonPairing.js` — per-session single-use daemon challenge registry for `pair`, `session_start`, `proof`, and `session_end` purposes.
- `src/device/daemonState.js` — daemon state machine and `daemon_risk` scoring helper.
- `src/device/daemonEvents.js` and Stage 2.3 event constants in `src/academic/academicEvents.js`.
- `POST /api/device/challenge` and `POST /api/device/pair` in `server.js`.
- Telemetry `daemon_proof` handling: valid proofs update daemon state and audit; invalid, stale, node-mismatched, or replayed proofs are rejected.
- `SIMURGH_REQUIRE_DAEMON=true` hardened mode, which rejects telemetry without a daemon proof and audits `DAEMON_MISSING`.
- `device_integrity` report section and instructor-dashboard daemon status card.
- `tools/simurgh-daemon-macos/` — SwiftPM macOS localhost daemon skeleton with Keychain-backed P-256 identity, `127.0.0.1` listener, `/health`, `/status`, `/pair`, `/proof`, and `/session/end`.
- `docs/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`.
- Unit tests for daemon proof validation, pairing registry, daemon state, daemon risk scoring, and report `device_integrity`.
- `scripts/check.sh` gates for Stage 2.3 daemon pair/proof smoke, replay rejection, tampered-proof audit rejection, hardened missing-proof rejection, and Swift daemon build/test.

### Changed

- `src/academic/riskScoring.js` now includes `daemon_risk` without removing existing helper and affinity categories.
- `tools/privacy-audit.mjs` and `scripts/check.sh` now enforce additional raw local-data forbidden fields: serial/device identifiers, usernames, home directories, process names, window titles, and raw process/window fields.
- README, SECURITY, PRIVACY, and ROADMAP now describe the Stage 2.3 daemon boundary and limitations.
- `.env.example` documents the demo/browser-only default and hardened `SIMURGH_REQUIRE_DAEMON=true` path.
- GitHub Actions now names the CI/CD workflow as the Simurgh Quality Gate while continuing to run `./scripts/check.sh`.

### Verified

- `npm test` — 219/219 pass.
- `node --test tests/unit/riskScoring.test.js tests/unit/reportBuilder.test.js` — 15/15 pass.
- `node --test tests/unit/envConfig.test.js` — 3/3 pass.
- `swift test` in `tools/simurgh-daemon-macos` — 1/1 pass.
- `./scripts/check.sh` — 38/38 gates pass.
- Stage 2.3 check gate verifies daemon pairing, telemetry proof acceptance, replay rejection, tampered-proof audit rejection, and hardened missing-proof rejection/audit.
- `npm audit --audit-level=high` — 0 vulnerabilities.

### Notes

- Stage 2.3 remains a research prototype. It does not claim hardware attestation, production endpoint management, or automatic misconduct detection.
- The daemon scanner currently returns a conservative zero count; future native scanner work should preserve the same metadata-only API contract.

## [0.4.4] — 2026-05-15 — Audit-Coverage Closure (Q9 + Q10) and Research Programme

### Added

- `docs/RESEARCH_PROGRAMME.md` — long-horizon four-track research roadmap (Interface Vulnerabilities, Proof-Based Integrity Defence, Secure Agent Sandboxing, Regulated / Secure-Environment Roadmap). Includes the 10/10 audit-question evidence matrix with file/line citations.
- `scripts/check.sh` — two consolidated audit-coverage gates covering the five Q10 demo states:
  - "Stage 2 stale proof + replayed nonce both rejected (proof_stale, nonce_replayed)" — exercises `proof_stale` clock-drift rejection and `nonce_replayed` replay-guard rejection on one session.
  - "Stage 2.2 invalid_signature + challenge-rejection both emit INTEGRITY_PAIRING_REJECTED (Q9)" — exercises pairing `invalid_signature` rejection (zeroed sig) **and** the new challenge-request audit emission (`stage: "challenge_request"`).

### Changed

- `server.js` `/api/integrity/pairing/challenge` rejection path — now appends `INTEGRITY_PAIRING_REJECTED` with `stage: "challenge_request"` when `createChallenge` returns a failure (e.g. `node_already_paired`). Previously these returned `409` silently with no audit trail entry. Closes the Q9 audit-coverage gap identified in the May 2026 internal audit.

### Verified

- `npm test` — 203/203 pass
- `./scripts/check.sh` — 34/34 gates pass (was 32; +2 consolidated audit-coverage gates)
- `npm audit --audit-level=high` — 0 vulnerabilities
- Audit posture: 10/10 on the May 2026 ten-question matrix (all entries have both a code-level answer and a regression gate).

### Notes

- The new gates intentionally share two sessions (one for proof-state coverage, one for pairing-state coverage) to stay under the `/join` 10/min IP rate limit when run inside the stage-21 server boot in `check.sh`.

## [0.4.3] — 2026-05-15 — Stage 2 Security Hardening Pass

### Added

- `src/integrity/pairingAuditHints.js` — `safeParsedPairingHints()` helper. `node_id_hash_if_parsed` is now emitted in audit chain rejection payloads only when the public key actually decodes to 32 bytes AND the hash matches sha256(pubkey), not on regex shape alone.
- `tests/unit/integrity/pairingAuditHints.test.js` — 8 tests covering the audit-hint safety invariants.
- `limitIntegrityProof` — rate limiter on `POST /api/integrity/proofs` (30/min per session token) to bound Ed25519 verify cost on a compromised session token.

### Changed

- `pairingRegistry.completePairing` — challenge comparison now uses `crypto.timingSafeEqual` rather than `!==`. Challenges are not strictly secrets (they round-trip through the client), but constant-time compare removes future regression risk.
- `server.js` `/api/integrity/proofs` and `/api/integrity/pairing/complete` rejection paths — use the new safe-parsed-hints helper instead of inline regex checks; audit payloads now never carry a `node_id_hash_if_parsed` that wasn't cryptographically reconciled with the submitted public key.
- Stage 2.2 design spec, plan, and historical docs — gate-count references normalised to `32/32` (was a mix of `31/31` and `32/32`).

### Verified

- `npm test` — 203/203 pass (was 195; +8 from new audit-hints suite)
- `./scripts/check.sh` — 32/32 gates pass
- `npm audit --audit-level=high` — 0 vulnerabilities
- No raw key / signature / challenge bytes appear in any audit payload (verified by inspection of all `appendAudit(... EVENTS.INTEGRITY_*)` call sites)

### Notes

- The macOS CLI key at `~/.simurgh/node-key` remains a development identity key (0600 / dir 0700). Not Keychain-backed. Not Secure Enclave-backed. Hardware attestation remains future work — do not infer production device trust.

## [0.4.2] — 2026-05-14 — Stage 2.2 macOS Node Pairing

### Added

- `src/integrity/pairingSchema.js` — v1 pairing envelope constants (8 required fields, reused forbidden-field blocklist)
- `src/integrity/pairingCanonicalise.js` — re-exports the proof canonicaliser as `canonicalisePairingPayload` (single source of truth for the wire format)
- `src/integrity/pairingValidator.js` — orchestrates v1 schema + timestamp + key/hash + signature checks
- `src/integrity/pairingRegistry.js` — per-session state machine (pending → paired) with injectable `now` for deterministic tests
- `POST /api/integrity/pairing/challenge` — 32-byte CSPRNG challenge, 60 s TTL, 10/min/session-token rate limit
- `POST /api/integrity/pairing/complete` — verifies Ed25519-signed pairing payload, stores node public key for the session, 20/min rate limit
- Three new audit event constants: `INTEGRITY_PAIRING_CHALLENGE_CREATED`, `INTEGRITY_NODE_PAIRED`, `INTEGRITY_PAIRING_REJECTED`; payloads carry only hashes, never raw challenge/public-key/signature
- macOS Swift CLI `pair` subcommand with strict unknown-subcommand handling (exit 64)
- `PairingEnvelope.swift` + `PairingSigner.swift` mirror their proof counterparts
- Cross-implementation golden pairing fixture (`golden-pairing-payload.{json,sha256}`)
- 5 new `scripts/check.sh` gates: pairing round-trip, paired-proof verified, paired-session rejects different node, unpaired backward compat, N1 cross-route consistency — gate count 27 → 32

### Changed

- `src/integrity/proofValidator.js` — `validateProof(raw, { now, pairedNode, expectedSessionId })`; returns `{ ok, proof, signature_status }`. Paired sessions get `signature_status: "verified"` via E1 strict triple check (hash + public-key string + signature using registered key).
- `server.js` — `POST /api/integrity/proofs` looks up `pairingRegistry.getPairedNode(sessionId)` and forwards it to the validator; new reason codes mapped to 401/409
- `examEvictionTimer` callback now evicts pairing registry entries alongside integrity state
- macOS Swift CLI — `main.swift` rewritten for subcommand dispatch; bare `--session` still defaults to `proof`

### Notes

- Stage 2.2 transitional posture preserved: unpaired Stage 2.1 sessions still return `signature_status: "unregistered_node"`
- Pairing registry is in-memory only; server restart loses all pairings (matches session lifecycle)
- Pairing is immutable per session; `/challenge` and `/complete` both reject 409 `node_already_paired` after pairing
- Cross-route N1 consistency: `/pairing/complete` refuses to pair if `integrityState.bound_node_id_hash` already differs from the pairing payload
- SwiftPM cannot reference resources outside the package, so the golden pairing fixture is duplicated under `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/`; sync enforced by the `check.sh` "Golden fixture sync" gate
- The CLI's `~/.simurgh/node-key` remains a development identity key, not hardware-backed attestation

### Verified

- `npm test` — all tests pass
- `./scripts/check.sh` (full) — 32/32 gates pass on macOS
- `swift build` + `swift test` — pass on macOS
- `npm audit --audit-level=high` — 0 vulnerabilities

## [Unreleased] — 2026-05-15 — Stage 2.2 Task 4: Pairing Registry

### Added

- `src/integrity/pairingRegistry.js` — `createPairingRegistry({ challengeTtlMs })` factory that tracks per-session pairing state (none → pending → paired). Injectable `now` parameter for deterministic tests. Default TTL 60 s. Paired state is immutable for the session lifetime. Exports: `createChallenge`, `getChallenge`, `completePairing`, `getPairedNode`, `isPaired`, `evict`, `evictMissing`, `size`. Reason codes: `node_already_paired`, `challenge_not_found`, `challenge_expired`, `challenge_mismatch`.
- `tests/unit/integrity/pairingRegistry.test.js` — 14 tests across 3 suites covering challenge creation, replacement, rejection when paired; pairing happy path and all error paths; accessors, eviction, and size reporting.

### Raouf

- **Date:** 2026-05-15 (Australia/Sydney)
- **Scope:** Stage 2.2 Task 4 — pairing registry (TDD)
- **Summary:** Written test-first: test file confirmed module-not-found failure before implementation. 14/14 tests pass. `npm test` → 189/189 total. Prettier passes on both new files.
- **Files changed:** `src/integrity/pairingRegistry.js`, `tests/unit/integrity/pairingRegistry.test.js`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `node --test tests/unit/integrity/pairingRegistry.test.js` → 14/14. `npm test` → 189/189. `npx prettier --check` → clean.
- **Follow-ups:** Task 5 (wire registry into server pairing endpoints), Task 6 (Swift pairing handshake), Task 7 (check.sh Stage 2.2 gates).

## [0.4.1] — 2026-05-14 — Stage 2.1 macOS Integrity Proof Pipeline

### Added

- `src/integrity/proofCanonicalise.js` — canonical JSON serialiser (sorted keys, no whitespace, top-level `signature` excluded)
- `src/integrity/proofSignature.js` — Ed25519 verifier with raw-bytes → DER/SPKI wrap for Node `crypto.verify`; `computeNodeIdHash` helper
- `src/integrity/proofValidator.js` — orchestrates v1 schema + timestamp + privacy + key + signature checks
- `src/integrity/integrityState.js` — per-session N1 strict node continuity (immutable `bound_node_id_hash`)
- `INTEGRITY_NODE_STALE` event constant in `src/academic/academicEvents.js` (defined; not emitted in Stage 2.1, reserved for Stage 2.x)
- `tools/simurgh-node-macos/` — Swift CLI generating signed v1 proofs (no daemon, no permissions, no ScreenCaptureKit, no content collection); package builds and tests pass on macOS
- `tests/unit/integrity/__fixtures__/golden-proof.{json,sha256}` — cross-implementation canonical-bytes fixture; SHA-256 locked at `fa63f66f9800cd8b9589b2a6e026f3c6f682fea98bd017f95c03b82185faeeca`
- `scripts/check.sh` — 6 new gates: Stage 2.1 round-trip smoke, zeroed-signature rejection, fixture sync, Swift conditional build + test, CLI output privacy regression. Quick mode skips the Stage 2.1 server smoke and the Swift block.
- Cross-implementation interop test (`tools/simurgh-node-macos/Tests/SimurghNodeTests/CanonicaliseTests.swift`) proves `JSONEncoder.sortedKeys` produces byte-identical output to the Node canonicaliser for the golden fixture

### Changed

- `src/integrity/proofSchema.js` — rewritten to declarative v1 constants (validation moved to `proofValidator.js`)
- `src/integrity/nonceGuard.js` — simplified to global replay protection (removed `nonce_session_mismatch`)
- `server.js` — `POST /api/integrity/proofs` rewired to the v1 pipeline; returns `409 session_expired_or_evicted` if telemetry session is missing; logs minimal privacy-safe rejection payloads
- Audit payload for `INTEGRITY_PROOF_RECEIVED` now stores `nonce_hash` (not raw nonce) and capability/signal summaries (not raw signals)
- `package.json` test glob recurses into `tests/unit/**/*.test.js`
- `.gitignore` excludes `.simurgh_check_logs/`, `tools/simurgh-node-macos/.build/`, `.swiftpm/`

### Notes

- Stage 2.1 transitional posture: every accepted proof returns `signature_status: "unregistered_node"` until pairing registry lands in Stage 2.2
- The CLI's `~/.simurgh/node-key` is a development identity key, not hardware-backed attestation
- No claim of production device trust
- SwiftPM does not permit resources from outside the package, so the golden fixture is duplicated under `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/`. The check.sh "Golden fixture sync" gate enforces byte-identity between the two copies.

### Verified

- `npm test` — 140/140 tests pass across 27 suites
- `./scripts/check.sh` (full) — 27/27 gates pass
- `swift build` (macOS) — succeeds
- `swift test` (golden interop) — passes
- `npm audit --audit-level=high` — 0 vulnerabilities

## [Unreleased] — 2026-05-14 — README Anchor Audit Fix

### Fixed

- Corrected stale README badge and table-of-contents anchors on the Stage 2 branch after the vendor-neutral heading update.

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** README anchor audit
- **Summary:** Fixed stale README badge and table-of-contents anchors on the Stage 2 branch after the vendor-neutral heading update.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Branch-object audit confirmed zero old company-specific README wording, the neutral section exists, AGENT/CHANGELOG contain the vendor-neutral log, and README relative links/anchors pass across all active branches. `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. `git diff --check` passed.
- **Follow-ups:** None.

## [Unreleased] — 2026-05-14 — Vendor-Neutral README Positioning

### Changed

- Removed the README's company-specific "Why Anthropic?" section.
- Added vendor-neutral "Why AI Platforms Need Proof-Based Integrity" positioning.
- Reworded high-visibility README references from Claude/Anthropic-specific phrasing to optional AI narrative provider language while keeping actual environment variable names accurate.
- Neutralized contributor and capability-uplift wording for company-neutral review.

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** README vendor-neutral positioning
- **Summary:** Removed company-specific Anthropic pitch language before external outreach and reframed the README around AI platforms, proof-based integrity, and vendor-neutral education/enterprise/agentic workflow relevance.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. README relative links and anchors passed. README grep confirmed no `Why Anthropic`, `Anthropic`, `Claude`, `Constitutional`, `strategic moat`, or partnership-pitch wording remains. `git diff --check` passed. Full `npm run format:check` remains blocked by existing Stage 2/generated files outside this README change (`docs/superpowers/plans/2026-05-14-stage-2-1-macos-integrity-proof.md`, `tools/simurgh-node-macos/README.md`, and tracked `.build` artifacts).
- **Follow-ups:** None.

## [Unreleased] — 2026-05-14 — Stage 2.1 Task 4: Proof Validator

### Added

- `src/integrity/proofValidator.js` — `validateProof(raw, { now })` orchestrates forbidden-field, required-field, version, platform, privacy_mode, session_id, timestamp window, capabilities, signals, public-key length, node_id_hash binding, nonce, signature format, and Ed25519 signature checks. Returns `{ ok: true, proof }` (with raw `nonce_bytes` Buffer) or `{ ok: false, reason }`.
- `tests/unit/integrity/proofValidator.test.js` — 32 tests across 9 suites (happy path, required-field deletion loop, forbidden-field loop, version/platform/mode, session_id, timestamp window, capabilities/signals shapes, public-key/hash binding, signature format + verification + canonical-sort stability).

### Changed

- `scripts/check.sh` — added `src/integrity/proofValidator.js` to privacy grep exclusion list (it imports forbidden-field constants, not privacy violations).

### Verified

- `node --test tests/unit/integrity/proofValidator.test.js` → 32/32 pass, 0 fail.

## [Unreleased] — 2026-05-14 — Stage 2.1 Design Spec

### Added

- `docs/superpowers/specs/2026-05-14-stage-2-1-macos-integrity-proof-design.md` — approved design spec for Stage 2.1 (macOS CLI integrity proof pipeline)
  - Locks A (v1 envelope refactor), B2 (Ed25519 per-node keypair), D1 (CLI proof generator), N1 (strict node continuity)
  - v1 envelope shape, strict validator rules, canonical-JSON signing, Node SPKI wrapping for Ed25519, asymmetric timestamp tolerance, audit-payload privacy rules, ~60-test plan with cross-implementation golden fixture
- AGENT.md entry: Stage 2.1 design spec scope + verification + follow-ups

### Notes

- Spec only; no runtime code changes yet
- Next: invoke `superpowers:writing-plans` to produce the implementation plan
- Stage 2.0 scaffold (v0.4.0) will be refactored — the v1 envelope replaces the simpler shape

## [0.4.0] — 2026-05-14 — Stage 2.0 Integrity Proof Pipeline Scaffold

### Added

- `src/integrity/proofSchema.js` — proof validator enforcing forbidden-field blocklist (screen_pixels, webcam_frame, paste_content, typed_answer, etc.), required-field checks, 30 s timestamp freshness window, capability allowlist, privacy_mode enforcement, sha256 hash root validation
- `src/integrity/nonceGuard.js` — nonce replay protection with TTL eviction for `POST /api/integrity/proofs`
- `POST /api/integrity/proofs` route — session-token-gated, nonce-replay-protected, audit-chain-connected Stage 2.0 scaffold endpoint (returns 202 with `note:` field advertising scaffold status)
- `INTEGRITY_PROOF_RECEIVED` and `INTEGRITY_PROOF_REJECTED` events in `src/academic/academicEvents.js`
- 25 new unit tests across `tests/unit/integrity/` (19 proofSchema + 6 nonceGuard)
- Test runner glob now recurses into `tests/unit/**/*.test.js`

### Changed

- `scripts/check.sh` privacy grep now excludes `src/integrity/proofSchema.js` (contains the forbidden-field constant list, not privacy violations)

### Does not include

- Cryptographic signature verification (planned Stage 2.x)
- Integration with Stage 1 risk scoring (planned Stage 2.x)
- Hardware-rooted attestation (future milestone)
- Replacement of the `/api/affinity` helper path

### Verified

- 93/93 unit tests pass
- `./scripts/check.sh` (full) → 21/21 pass
- `npm audit` → 0 vulnerabilities

## [0.3.6] — 2026-05-14 — Stage 2 Readiness Audit Fix

### Fixed

- Corrected `SIMURGH_CLAUDE_ON_SAFE` handling so Claude narrative calls remain skipped for Safe verdicts by default, matching README and `.env.example`.
- Added `tests/unit/envConfig.test.js` to lock the Safe/Warning/Critical Claude gating defaults.
- Updated current test-count references in README and SECURITY.

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** Stage 2 readiness audit fix
- **Summary:** Full audit found one code/docs mismatch: Safe verdicts were documented as skipping Claude by default, but `stagingConfig.claudeOnSafe` defaulted to enabled when the env var was absent. Fixed the default, added regression coverage, and updated current verification-count docs.
- **Files changed:** `src/config/env.js`, `tests/unit/envConfig.test.js`, `README.md`, `SECURITY.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` passed 68/68 tests. `npm run format:check` passed. `./scripts/check.sh --fix` passed 21/21. Final `./scripts/check.sh` passed 21/21. Markdown relative links and anchors passed. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. Direct dependency licence spot-check found MIT for `@anthropic-ai/sdk`, `express`, and `prettier`. `git diff --check` passed.
- **Follow-ups:** Push branch and collect remote CI evidence before tagging.

## [0.3.5] — 2026-05-14 — Stage 1.5 Validation Pack

### Added

- Stage 1.5 reviewer documentation:
  - `docs/STAGE_1_5_REVIEWER_PACK.md`
  - `docs/THREAT_MODEL.md`
  - `docs/VALIDATION.md`
  - `docs/LIMITATIONS.md`
  - `docs/STAGE_2_ARCHITECTURE.md`
  - `docs/RESOURCE_PLAN.md`
  - `docs/DEMO_SCRIPT.md`
  - `docs/DECISIONS.md`
  - `docs/RISK_REGISTER.md`
  - `docs/REVIEWER_CHECKLIST.md`
  - `docs/evidence/stage-1/README.md`
  - `docs/evidence/stage-1/.gitkeep`
- `.github/pull_request_template.md` with validation, security/privacy, docs, and Stage boundary checks

### Changed

- Updated `README.md` for Stage 1 complete / Stage 1.5 validation pack / Stage 2 planned framing
- Fixed README clone URL and Node prerequisite to match the actual repo and CI target
- Added README links to the Stage 1.5 pack and clarified what Stage 1 proves and does not prove
- Updated `ROADMAP.md` so Stage 1.5 is the validation pack and Stage 2 is the Device Shield / Integrity Node direction
- Tightened Stage 1 documentation wording around bounded security claims and misconduct language

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** Stage 1.5 validation and reviewer readiness
- **Summary:** Added the Stage 1.5 validation pack, evidence rules, risk register, reviewer checklist, Stage 2 architecture plan, and PR hygiene template. Kept the work documentation-first and did not add major Stage 2 runtime code.
- **Files changed:** `README.md`, `ROADMAP.md`, `docs/STAGE_1_ACADEMIC_SHIELD.md`, `docs/STAGE_1_5_REVIEWER_PACK.md`, `docs/THREAT_MODEL.md`, `docs/VALIDATION.md`, `docs/LIMITATIONS.md`, `docs/STAGE_2_ARCHITECTURE.md`, `docs/RESOURCE_PLAN.md`, `docs/DEMO_SCRIPT.md`, `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/REVIEWER_CHECKLIST.md`, `docs/evidence/stage-1/README.md`, `docs/evidence/stage-1/.gitkeep`, `.github/pull_request_template.md`.
- **Verification:** `npm install` passed with 0 vulnerabilities. `./scripts/check.sh --fix` passed 21/21. Initial `./scripts/check.sh` found one Prettier drift in `docs/STAGE_1_5_REVIEWER_PACK.md`; reran `./scripts/check.sh --fix`, then final `./scripts/check.sh` passed 21/21. `npm test` passed 65/65 tests. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. `git diff --check` passed. Markdown relative link audit passed. README image path audit passed. Secret/privacy/overclaim grep audits found only expected enforcement, test, policy, and historical-log references.
- **Follow-ups:** Push branch and collect fresh remote CI evidence. Recommended next tag after review: `v0.3.6-stage-1-5-validation-pack`.

## [0.3.4] — 2026-05-13 — README API Table Repair

### Fixed

- Fixed the broken `POST /api/telemetry` API reference table in `README.md`
- Moved the response JSON into a fenced code block so `Safe | Warning | Critical` no longer breaks Markdown table columns
- Clarified the allowed `risk_level` values directly below the response example

### Verified

- `npm run format:check`
- `git diff --check`
- `./scripts/check.sh --quick` → 11/11 pass

## [0.3.3] — 2026-05-13 — Stage 1 Documentation Polish

### Changed

- Replaced `docs/STAGE_1_ACADEMIC_SHIELD.md` short branch note with the full Stage 1 Academic Shield reviewer/reference document
- Added document metadata, contents, an explicit Stage 1 threat model, exact verification commands, reviewer notes, and consistent section numbering
- Renamed the documentation heading from "CI/CD Status" to "CI Status" to match the Stage 1 CI-only boundary

### Notes

- Branch protection remains documented as a manual follow-up because the saved GitHub branch-protection state was not confirmed during this pass

### Verified

- Initial `./scripts/check.sh` found only Prettier formatting drift in `docs/STAGE_1_ACADEMIC_SHIELD.md`
- `npm run format`
- `./scripts/check.sh` → 21/21 pass

## [0.3.2] — 2026-05-13 — Stage 1 CI

### Added

- `.github/workflows/stage-1-checks.yml` — GitHub Actions workflow runs `./scripts/check.sh` on every push to `main`/`stage-1-academic-shield` and every PR to `main`
  - Ubuntu latest, Node 22, `npm ci`
  - Safe non-real env vars (`SIMURGH_*` test values) injected for the boot smoke test
  - 10-minute timeout, concurrency cancellation per branch
  - Uploads `.simurgh_check_logs/` as artifact on failure
- Stage 1 Checks badge added to the README header

### Changed

- `.gitignore` no longer excludes `package-lock.json`; the lockfile is now tracked so CI can run `npm ci` reproducibly

### Notes

- CD (deployment automation) intentionally deferred — Stage 1 is a research prototype
- Branch protection on `main` should be enabled in the GitHub UI: require PR, require Stage 1 Security Checks to pass, disallow force-push

## [0.3.1] — 2026-05-13 — Stage 1 Quality Gate

### Added

- `scripts/check.sh` — one-shot pre-commit/pre-push verification script (Node version, syntax, format, tests, privacy guard, secret scan, tone check, npm audit, server boot smoke, audit chain self-test, git state). Mirrors the COMP3130 structure; supports `--quick`, `--fix`, `--verbose`, `--help`.
- Prettier 3 as a dev dependency; `npm run format` and `npm run format:check` scripts
- `.prettierignore` and `.prettierrc.json` (printWidth 100, double quotes, semis, trailing-comma es5)
- README "Stage 1 Verification" section linking to `./scripts/check.sh`

### Changed

- 41 source/test/doc files reformatted to Prettier defaults (no semantic changes)

### Verified

- `./scripts/check.sh --quick` → 11/11 pass
- `./scripts/check.sh` (full) → 21/21 pass
- All 65 unit tests still pass after formatting
- 0 npm vulnerabilities

## [0.3.0] — 2026-05-13 — Stage 1 Security Hardening

### Added

- `src/security/sessionToken.js` — HMAC-signed student session tokens (issue + verify, with timing-safe comparison)
- `src/security/replayGuard.js` — per-session sequence + timestamp window enforcement
- `src/security/rateLimit.js` — generic per-key rate limiter middleware
- `tools/privacy-audit.mjs` — CLI scanner that exits 1 if any forbidden field (typed_content, paste_content, screen_data, webcam, biometric, etc.) appears in generated data; allowlists `*_hash` variants
- `SIMURGH_SESSION_SIGNING_SECRET` env var; non-demo mode refuses to start without it
- `Authorization: Bearer <token>` enforcement on `/api/sessions/:id/privacy-accept`, `/start`, `/submit`, and on `/api/telemetry` for joined sessions
- Per-endpoint rate limiters: `/join` (10/min/IP), `/affinity` (60/min/helper), `/sessions`, `/report`, `/audit/.../verify` (20–60/min/token)
- `sequence` and `timestamp` fields on telemetry payloads (replay rejection of duplicates, rollbacks, stale, future timestamps)
- 23 new unit tests covering session token, replay guard, rate limiter (65 total)
- README "Stage 1 Security Hardening" section documenting the auth model, replay protection, rate limits, and headers

### Changed

- JSON body limit reduced from 256 KB to 32 KB (configurable via `SIMURGH_JSON_LIMIT`)
- `sanitiseTelemetry` now rejects (returns null) on NaN, Infinity, negative values, or values > 2× the documented max; only mild over-range values are clamped
- Student page (`public/index.html`) sends `Authorization: Bearer <sessionToken>` + monotonic `sequence` + `timestamp` on every telemetry POST
- Instructor dashboard (`public/instructor.html`) strips `?token=` from the URL via `history.replaceState`; report/verify use `Authorization` header instead of query param
- `.gitignore` now excludes `data/sessions/`, `data/audit/`, `data/reports/`, `data/exams/`, `logs/`, `simurgh-audit-*.json`, `simurgh-report-*.json`

### Security

- Four-secret separation enforced: instructor token, helper secret, audit HMAC key, session signing key — never reused for cross-purposes
- All HTTP responses carry `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, plus `Strict-Transport-Security` in production
- Documented Stage 1 limitations and the privacy/tamper-test workflow

## [0.2.2] — 2026-05-13

### Fixed

- Block telemetry ingestion on submitted/closed exam sessions (prevents post-submission audit manipulation)
- Add `MAX_SESSIONS` cap (default 10,000) — return 503 at capacity instead of unbounded memory growth
- Add HTTP security headers on all responses: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production only)
- Fail fast with `process.exit(78)` in non-demo mode when `SIMURGH_AUDIT_SECRET` is not set
- Warn in non-demo mode when `SIMURGH_ALLOWED_ORIGIN` is unset (wildcard CORS)
- Replace local `AUDIT_CHAIN_CAP` constant with imported `CHAIN_CAP` from `hmacChain.js`
- Guard all `getSession()` call sites for null return at capacity

## [0.2.1] — 2026-05-13

### Added

- `SECURITY.md` — vulnerability disclosure policy and security architecture overview
- `PRIVACY.md` — full data collection policy (collected vs. never collected)
- `ROADMAP.md` — Stages 1–4 with current status and known limitations
- `ETHICS.md` — commitments on misconduct findings, transparency, and power asymmetry
- `DISCLAIMER.md` — research prototype disclaimer, no-warranty statement, compliance guidance
- README status notice linking to policy documents

## [0.2.0] — 2026-05-13

### Added

- **Stage 1 Academic Shield** — full academic integrity workflow
- `src/privacy/` — privacy config, telemetry normaliser, SHA-256 identity hashing
- `src/academic/` — local risk scoring (7 categories), academic event taxonomy, session state machine, exam registry, JSON report builder
- `src/audit/` — HMAC chain module, audit chain verifier
- `src/config/env.js` — Stage 1 environment variable config
- `src/storage/memoryStore.js` — namespace memory store
- 9 new API endpoints: `/api/exams`, `/api/exams/:id/join`, `/api/sessions/:id/privacy-accept`, `/api/sessions/:id/start`, `/api/sessions/:id/submit`, `/api/sessions/:id/report`, `/api/audit/:id/verify`, plus `GET /api/exams`
- Privacy notice modal on student exam page
- Helper status badge on student exam page
- Risk score cards, event timeline, filter bar, report export, audit verify on instructor dashboard
- `node:test` unit test suite (8 modules, 42 tests)

### Changed

- Telemetry scoring now uses local heuristic category model (7 weighted categories); Claude provides narrative only on Warning/Critical (fail-open)
- Session objects extended with lifecycle state, exam linkage, reconnect count, risk score cache

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Project Branding and Documentation
- **Summary:** Rebranded the project from "Verity" to "Project Simurgh" and updated the core README.md content to reflect the new brand, emphasizing behavioral telemetry.
- **Files Changed:**
  - `README.md` - Entirely rewritten with the new Simurgh brand, dropping "Verity", updating architectural descriptions, and refining the strategic roadmap.
- **Verification:** Readme markdown is properly formatted with the appropriate links, headers, code block architectures, and images preserved.
- **Follow-ups:** Ensure that any other text occurrences or components inside the source code (like public HTML files) are eventually scrubbed of "Verity" if necessary.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Complete Codebase Rebranding
- **Summary:** Executed a global search-and-replace to rename all internal mentions, variables, file structures, and titles from "Verity" to "Simurgh".
- **Files Changed:**
  - `package.json`, `package-lock.json`
  - `.env.example`
  - `server.js`
  - `public/index.html`, `public/instructor.html`
  - `tools/verify-audit.mjs`
  - `tools/invisible-window-poc/README.md`, `tools/invisible-window-poc/main.swift`
  - Renamed directory `tools/verity-helper` -> `tools/simurgh-helper`
  - `tools/simurgh-helper/README.md`, `tools/simurgh-helper/main.swift`, `tools/simurgh-helper/Makefile`, `tools/simurgh-helper/simurgh-helper.entitlements`
- **Verification:** Ran a Node.js script to execute safe string replacements matching casing conventions, and successfully renamed the helper tool paths to ensure the architecture is functionally synced with the new brand.
- **Follow-ups:** Testing the project (e.g. `npm start`) locally to ensure the refactored keys and environment variables run identically as before.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Professional Polish
- **Summary:** Elevated the tone of the README to a highly professional, academic/engineering standard suitable for a patent review and technical interview. Filled out the previously empty placeholder sections.
- **Files Changed:**
  - `README.md` - Formatted text into the 3rd person, added complete Installation/Quick Start instructions, API reference, Cost & Latency breakdowns, and improved structural hierarchy.
- **Verification:** Verified markdown renders correctly.
- **Follow-ups:** Prepare the presentation or demo environment for the actual interview.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** "Ethical Manifesto" & Roadmap Upgrade
- **Summary:** Elevated the product positioning from a purely technical security tool to a Global Ethics Standard. Added the "Socio-Economic Impact" section focusing on Bandwidth-Inclusive Security and privacy-as-code. Advanced the Strategic Roadmap with Phase 4: Privacy-Preserving Visuals ("Code-Video").
- **Files Changed:**
  - `README.md` - Injected new Section 4 (Socio-Economic Impact & Democratic Access) and appended Phase 4 to the Strategic Roadmap.
- **Verification:** Markdown structure, table of contents, and numbered headers successfully reorganized and validated.
- **Follow-ups:** Prepare for patent review emphasizing the Code-Video layer and hardware-rooted attestation concepts.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** "Why Anthropic?" Strategic Alignment
- **Summary:** Positioned the README as a direct partnership proposal by adding a dedicated section that maps Project Simurgh's "Privacy-as-Code" values to Anthropic's "Constitutional AI" principles.
- **Files Changed:**
  - `README.md` - Injected Section 8: "Why Anthropic?" and renumbered subsequent headings and table of contents items.
- **Verification:** Markdown structure validated. The narrative perfectly links Anthropic's mission with Simurgh's capabilities.
- **Follow-ups:** Final review before pushing to GitHub.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Final Professional & Research Polish
- **Summary:** Comprehensive polish pass to bring the README to patent-review and technical-interview quality. Fixed 10 identified issues: broken badge anchor links, inconsistent voice (mixed 1st/3rd person), missing horizontal rule separators, trailing whitespace, informal language ("surveillance bots"), sparse API reference, missing Security Considerations section, missing env var documentation table, telemetry fields presented as raw list instead of structured table, and missing component summary.
- **Files Changed:**
  - `README.md` — Full rewrite. Added Section 8 (Security Considerations) with HMAC audit chain, helper auth, and threat model coverage table. Expanded API Reference with 4 endpoints, auth headers, and error codes. Converted telemetry fields to a proper table with types and descriptions. Added Component Summary table. Added full environment variable reference table. Normalized all voice to consistent 3rd-person. Fixed badge anchors to resolve to correct heading IDs. Extended roadmap timeline to 2028.
- **Verification:** All 11 Table of Contents anchor links resolve to correct heading IDs. Markdown structure validated with consistent `---` separators between all sections. No trailing whitespace. Zero instances of informal/editorial language.
- **Follow-ups:** Ready for GitHub push and interview presentation.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Screenshots & Visual Documentation
- **Summary:** Replaced the stale hero screenshot (which still displayed old "Verity" branding) with a fresh capture showing the rebranded "Simurgh" UI. Added two additional screenshots: the student exam view with a live behavioral verdict and the instructor multi-session dashboard. Screenshots are embedded in a side-by-side table in the Quick Start section for maximum visual impact.
- **Files Changed:**
  - `docs/screenshot.png` — Replaced with updated Simurgh-branded exam view
  - `docs/screenshot-exam-view.png` — New: student view with typed response and live verdict
  - `docs/screenshot-instructor.png` — New: instructor dashboard with session cards and SSE streaming
  - `docs/screenshot-idle.png` — New: idle exam view before user interaction
  - `README.md` — Updated hero image caption, added Screenshots subsection with side-by-side table, fixed badge anchor links
- **Verification:** All 4 screenshots render correctly in the README. Hero screenshot displays "Simurgh | BEHAVIORAL PROCTOR" header. No remaining "Verity" branding in any screenshot.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Content Enhancement — Cost Reduction, First-Mover Strategy, Contributors
- **Summary:** Expanded the Institutional Cost Reduction subsection to address the elimination of human invigilators and physical venue costs. Added a 4th point to "Why Anthropic?" — the first-mover advantage and strategic moat argument. Added Section 11 (Contributors) crediting Claude as an AI pair-programming partner.
- **Files Changed:**
  - `README.md` — Expanded Section 4 (Institutional Cost Reduction), added first-mover advantage to Section 9, added Section 11 (Contributors), renumbered Status & License to Section 12, updated ToC and badge anchors.
- **Verification:** All 12 ToC anchors resolve correctly. Badge links updated to `#12-status--license`.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README — Public Health Resilience Argument
- **Summary:** Added a "Public Health Resilience" subsection to Section 4 (Socio-Economic Impact). Frames the epidemiological risk of large-scale in-person exams (COVID-19, seasonal influenza) and positions behavioral integrity verification as institutional resilience infrastructure.
- **Files Changed:**
  - `README.md` — New subsection under Section 4.
- **Verification:** Section reads in a formal, research-grade tone consistent with the rest of the document.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Mermaid Architecture Diagram & Rebranding Audit
- **Summary:** Converted the ASCII art architecture diagram to a native Mermaid flowchart for professional GitHub rendering. Performed a full-codebase grep audit for any remaining "Verity" references — confirmed zero leaks in source code, HTML, README, or config files. Only historical changelog/agent log entries referencing the rebranding remain (correct behavior).
- **Files Changed:**
  - `README.md` — Replaced `text` code block with `mermaid` flowchart in Section 3.
- **Verification:** `grep -ri verity` returns matches only in CHANGELOG.md and AGENT.md historical entries. Zero leaks in server.js, public/\*.html, package.json, .env.example, or tools/.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** SEB Critique & Cross-Platform Roadmap Expansion
- **Summary:** Added a "Cross-Platform Superiority over Legacy Lockdown Software" subsection to Section 4, critically contrasting Safe Exam Browser's Windows-centric limitations against Simurgh's platform-agnostic behavioral API. Included a comparison table covering Windows, macOS, Linux, iOS, Android, and ChromeOS. Expanded the Strategic Roadmap (Section 10) with explicit per-platform milestones: `simurgh-helper-win` (Win32), `simurgh-helper-linux` (X11/Wayland), iOS/iPadOS Safari validation, Android Chrome/WebView validation, ChromeOS managed environment certification, and a unified cross-platform deployment toolkit.
- **Files Changed:**
  - `README.md` — New subsection in Section 4, expanded Phases 1–3 in Section 10 with platform-specific deliverables.
- **Verification:** Markdown tables render correctly. Roadmap phases logically sequence platform expansion from current macOS PoC through to full mobile/ChromeOS coverage.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README — Zero Client-Side Compute & Device Inclusivity
- **Summary:** Added a "Zero Client-Side Compute — Device Inclusivity by Design" subsection to Section 4. Explains that all AI processing is offloaded to Claude server-side, no video/images ever leave the student's device, and any device (old or new) with a browser can participate — eliminating hardware inequality as a barrier to assessment.
- **Files Changed:**
  - `README.md` — New subsection in Section 4.
- **Verification:** Content is factually accurate to the architecture (server-side Claude inference, ~2KB JSON telemetry only).
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Email Cross-Reference Audit, Browser/App Delivery Roadmap, Gap Patching
- **Summary:** Performed a line-by-line cross-reference audit of the email to Dario Amodei against the README. Identified 7 full matches, 6 minor gaps, and confirmed the README substantially exceeds the email's claims. Patched key gaps: added "Interview Coder" alongside Cluely, added Claude capability-uplift case study note (Paper Section VIII-G), added Macquarie University to Contributors. Added Phase 3b (Delivery Modes) to the roadmap with browser-based PWA and native application milestones for macOS, Windows, Linux, iOS, and Android.
- **Files Changed:**
  - `README.md` — Section 2 (added Interview Coder + capability-uplift note), Section 10 (new Phase 3b with browser PWA and 5 native app milestones), Section 11 (Macquarie University + VIII-G reference in Contributors).
- **Verification:** All email claims now have README backing. Delivery mode table renders correctly. Phase numbering is consistent.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Codebase Verification Audit, Roadmap Expansion (Browser + App + Helper for all platforms), Bug Fixes
- **Summary:** Performed a file-by-file verification of every README claim against the actual codebase. Found and fixed 3 issues: (1) README said `GET /api/audit-export/:sessionId` but actual endpoint is `/api/audit/:sessionId` — fixed. (2) Stale `verity-helper` binary left in `tools/simurgh-helper/` — deleted. (3) `package.json` described "Countermeasure A" instead of the correct "Countermeasure C" — fixed. Expanded Phase 3b roadmap to show a full per-platform matrix of Browser PWA, Native App, and Native Helper support across macOS, Windows, Linux, iOS, Android, and ChromeOS.
- **Files Changed:**
  - `README.md` — Fixed `/api/audit-export` → `/api/audit`, expanded Phase 3b with 6-platform delivery matrix table.
  - `package.json` — Fixed Countermeasure label (A → C).
  - `tools/simurgh-helper/verity-helper` — Deleted stale binary (rebranding leftover).
- **Verification:** All 14 core architectural claims verified ✅. All 6 env vars verified ✅. All 4 API endpoints match codebase ✅. 5-second interval confirmed (WINDOW_MS=5000). Helper 2-second interval confirmed (intervalMs=2000). Prompt caching confirmed (cache_control: { type: "ephemeral" }).
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Terminology Refinement & Strategic Positioning
- **Summary:** Replaced "cooperate" with "collaborate" and "partner" in the README. This shift in terminology elevates the project from a formal/legalistic tone to a "Silicon Valley" peer-to-peer ecosystem dialect, better aligning with Anthropic's partnership-driven culture.
- **Files Changed:**
  - `README.md` — Updated lines 323 and 330.
- **Verification:** Verified that "collaborate" and "partner" now appear in the "Why Anthropic?" and concluding sections. Global grep for "cooperate" returns zero matches in source code or documentation.
- **Follow-ups:** None.
