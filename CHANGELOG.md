## Change Log

## [agent-wording-clarification] — 2026-06-11 — Clarify push status in AGENT.md

**Raouf:** Updated push status wording in AGENT.md to clarify that the branch was pushed as dc2c5d8.

## [banking-shield-phase-a] — 2026-06-11 — Audit-fix hardening pass

**Raouf:** Audited the `banking-shield-phase-a` branch end to end and fixed all six findings before PR. Added per-IP rate limits and a session capacity cap to `/api/banking-pilot`, derived separate participant-code and audit-chain keys from the pepper (domain separation), renamed the payload depth-cap rejection to `payload_too_deep`, wired prior forbidden-field attempts into live risk scoring as `forbidden_payload_attempt`, replaced the missing-env 500 with a deterministic 503 `banking_pilot_not_configured`, and made withdrawn-session audit/verify transparency an asserted invariant. Extended the full E2E smoke from 38 to 41 gates and refreshed the Phase A evidence pack.

### Added

- `tests/unit/bankingPilot/bankingHardening.test.js` — not-configured 503, session capacity cap, and per-IP consent rate-limit coverage.
- Banking rate-limit / capacity env knobs in `.env.example` — `SIMURGH_BANKING_PILOT_CONSENT_RATE_MAX`, `SIMURGH_BANKING_PILOT_WRITE_RATE_MAX`, `SIMURGH_BANKING_PILOT_READ_RATE_MAX`, `SIMURGH_BANKING_PILOT_MAX_SESSIONS`.
- Three new full-E2E smoke gates: forbidden-attempt risk escalation, `payload_too_deep` rejection, withdrawn-session audit/verify transparency.

### Changed

- `src/bankingPilot/index.js` — rate limiters on all routes, session capacity cap, derived keys, `payload_too_deep` mapping, live `forbiddenPayloadAttempt` scoring, `banking_pilot_not_configured` guard.
- `src/bankingPilot/forbiddenBankingFields.js`, `src/bankingPilot/bankingScenarioPolicy.js` — exported `MAX_DEPTH_SENTINEL` and mapped it to `payload_too_deep`.
- `src/bankingPilot/bankingSessionStore.js` — `size()` accessor for the capacity cap.
- `docs/research/banking-pilot/BANKING_PILOT_PHASE_A_CLOSEOUT.md` and the Phase A evidence pack — refreshed to current gate counts.

### Verified

- `npm test` — 389/389 pass; Banking unit/security — 35/35 pass.
- `scripts/smoke-banking-pilot.sh` 14/14; `scripts/security-audit-banking-pilot.sh` 27/27; privacy audit PASS; closure smoke 4/4; full E2E smoke 41/41 (captured to evidence pack).
- `npx prettier --check .` clean; `npm audit --audit-level=high` no high/critical findings.
- `scripts/check.sh --quick` — all Banking Shield gates pass; the single failing step is the pre-existing local Linux Rust Xvfb prerequisite outside Banking Shield.

## [banking-shield-phase-a] — 2026-06-11 — Stage B1 synthetic banking-adjacent demo

**Raouf:** Implemented Stage B1 — Banking Shield Phase A Synthetic Demo. Added a new `/api/banking-pilot` subsystem with synthetic consent, five metadata-only scenario submissions, one-session-one-submit enforcement, recursive forbidden banking-field rejection, prototype-pollution key rejection, strict scenario allowlists, strict `consent_scope_hash`, banking-scoped HMAC session tokens, local deterministic risk scoring, token-bound report/audit/verify exports, and closure-before-auth write-route locking. Added public Phase A pages using fictional labels only, Banking Shield research docs with Phase B/C roadmap continuity, smoke/security/privacy scripts, unit/security/e2e test artifacts, and Phase A evidence fixtures. Sonnet runtime support remains off by default; Phase A verifies only the local metadata-only narrative sanitiser.

### Added

- `src/bankingPilot/**` — Banking Shield Phase A router, store, token, guard, scenario policy, risk, audit, report, and narrative sanitiser modules.
- `public/banking-pilot-consent.html`, `public/banking-pilot-scenario.html`, `public/banking-pilot-report.html` — synthetic Phase A pages.
- `docs/research/banking-pilot/**` — protocol, threat model, data management, participant notice, non-claims, closeout, claim audit, and evidence pack.
- `tests/unit/bankingPilot/**`, `tests/security/banking_pilot_security_audit.test.js`, `tests/e2e/banking_pilot_*_smoke.mjs` — Banking Shield test coverage.
- `scripts/smoke-banking-pilot.sh`, `scripts/smoke-banking-pilot-closed.sh`, `scripts/smoke-banking-pilot-full-e2e.sh`, `scripts/security-audit-banking-pilot.sh`, `scripts/privacy-audit-banking-pilot.mjs` — Phase A gates, full lifecycle E2E smoke, and generated-artifact privacy audit.

### Changed

- `server.js` mounts `/api/banking-pilot`.
- `.env.example` documents Banking Shield Phase A env vars.
- `scripts/check.sh` includes Banking Shield Phase A unit/security, smoke, security audit, privacy audit, closure, and full E2E gates, and exempts the banking forbidden-field guard from the global source-grep privacy false-positive.
- `tests/unit/displayServerLockServerWiring.test.js` uses a unique live-server port per boot to avoid a local `ECONNREFUSED` race between live-server tests.

### Verified

- `npm test` — 384/384 pass.
- `npm audit --audit-level=high` — pass, no high/critical findings; existing moderate `qs` advisories remain.
- Banking unit/security tests — 30/30 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS, 4 generated fixtures, attack values absent.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 38/38 pass; output captured at `docs/research/banking-pilot/evidence/phase-a-synthetic/smoke-banking-pilot-full-e2e.txt`.
- `npx prettier --check .` — pass.
- `scripts/check.sh --quick` — Banking gates pass; command exits 1 on the existing local Linux Xvfb Rust integration gate.
- Full `scripts/check.sh` — Banking Shield Phase A gates pass; command summarizes 68 passed and 2 failed steps because installed .NET SDK 7.0.307 cannot target the Windows daemon `.NET 8.0` projects, and local Linux Xvfb integration tests fail with `Connection refused`/`PoisonError` results in `xvfb_integration_tests.rs`.

---

## [paper-source-links] — 2026-06-05 — Fix README paper source path casing

**Raouf:** Fixed the two README "Source" links that were live-broken on GitHub: `Papers/project-simurgh/` and `Papers/simurgh-voting-pilot/`. Root cause: the paper source directories are tracked under lower-case `papers/...`, while the README used upper-case `Papers/...`; local macOS checks passed on a case-insensitive filesystem, but GitHub returned 404 because paths are case-sensitive. Updated the two README source links to `papers/project-simurgh/` and `papers/simurgh-voting-pilot/`. Verification: live pre-fix `curl -I -L` checks to the upper-case GitHub tree URLs returned 404; `git ls-tree -r --name-only HEAD | rg '^papers/'` confirms lower-case tracked source paths; `npx --yes markdown-link-check README.md` passes 57/57 links; `npx prettier --check README.md AGENT.md CHANGELOG.md` passes.

---

## [readme-link-audit] — 2026-06-05 — README link audit and anchor repair

**Raouf:** Audited all 57 Markdown links in `README.md` with `markdown-link-check`. Root cause: stale internal GitHub heading slugs after headings containing `&` and `2026 - 2028` changed. Fixed six README anchor hrefs: License badge, Status badge, Socio-Economic Impact TOC row, Cost & Latency TOC row, Strategic Roadmap TOC row, and Status & License TOC row. Verification: `npx --yes markdown-link-check README.md` passed (57/57 links); `npx prettier --check README.md` passed.

---

## [voting-pilot-paper-author-companion-cite] — 2026-06-04 — Author block + Invisible Window companion citation

**Raouf:** Sourced author data from Invisible Window PDF. Author block: "Raouf" → "Mohammad Raouf Abedini", Department of Computing, mohammadraouf.abedini@students.mq.edu.au. `simurgh2026` BibTeX author corrected. New entry `abedini2026invisible` (DOI 10.5281/zenodo.20376495) added. Introduction updated with 2-sentence companion-paper context. Build: 4 pages, 122 KB, 0 Overfull, 0 undefined refs.

---

## [voting-pilot-paper-external-audit-fixes] — 2026-06-04 — External audit fixes — submission-ready v2

**Raouf:** PDF sanity confirmed (Hastings/Nov. 2023, no Runyan, no TODO). Applied 4 external-audit fixes: title → "Voting-Adjacent Workflows", placeins + FloatBarrier (×2) for float containment, "any caller" → "any caller able to reach the pilot API" (×3), HREC scope sentence added to §IV.C. Author block flagged for update (full name + MQ email needed before submission). Build: 4 pages, 122 KB, 0 Overfull, 0 warnings.

---

## [voting-pilot-paper-final-audit] — 2026-06-04 — Paper final full audit — submission-ready

**Raouf:** Final systematic audit. One issue found: "artefacts" (British) → "artifacts" (American English, IEEE). Surrounding passive converted to active. Full scorecard: em dashes 0, British spellings 0, Overfull 0, undefined citations 0, TODO notes 0, NIST authors correct, NSWEC Nov. 2023. Build: 4 pages, 121 KB, 0 warnings. Status: submission-ready.

---

## [voting-pilot-paper-submission-polish] — 2026-06-04 — Paper blocking fixes + submission polish

**Raouf:** Fixed two blocking citation errors (NIST IR 7770 wrong author → 4 correct authors + DOI; NSWEC year 2022→2023 November, "verify year" TODO note removed from bibliography). Eight submission-readiness fixes: §V.A Dataset paragraph added, "privacy-sensitive data" narrowed, "passive surveillance" → "content-level surveillance", fetch-call precision fix, "no data persisted" scoped correctly, Table II abbreviation note, Governance and Ethics subsection added (§IV), long path cleaned. Build: 4 pages, 121 KB, 0 warnings.

---

## [voting-pilot-paper-100pct-audit] — 2026-06-04 — Paper 100% audit pass

**Raouf:** Second systematic audit pass. 22 issues resolved: all 12 em dashes removed (count verified 0), British spellings fixed (Minimisation→Minimization), §\ref→Sec.~\ref, grammar fix in §III.C, tense fixes in §IV.B, passive→active in §IV.B, "rank"→"select" (radio buttons), empty TikZ node removed, "establish"→"demonstrate", "official ballot"→"official vote", spurious commas removed. Build: 4 pages, 121 KB, 0 warnings.

---

## [voting-pilot-paper-full-audit] — 2026-06-04 — Full paper audit and rewrite

**Raouf:** Full paper audit using ml-paper-writing and stop-slop skills. 16 issues found and fixed: abstract rewritten (Farquhar formula), TikZ flow figure added, contribution bullets added, §IV pilot section expanded, passive voice eliminated, stop-slop patterns removed, citation workshop name corrected (EVT/WOTE), float specifiers fixed. Build: 4 pages, 121 KB, 0 warnings.

### Changed

- `Papers/simurgh-voting-pilot/main.tex` — abstract, figure, contributions, pilot section, passive voice, style, structure.
- `Papers/simurgh-voting-pilot/references.bib` — EVT/WOTE correction, nswec year verification note.
- `Papers/simurgh-voting-pilot/main.pdf` — rebuilt.

---

## [voting-pilot-paper-claim-audit] — 2026-06-04 — Paper claim audit + evidence capture

**Raouf:** Audited all 20 paper claims against repo evidence. Two issues found and fixed: (1) consent disclosure vs. Phase C implementation for focus-loss/paste counts; (2) privacy audit table entry scope clarified. Phase C gate evidence captured to `evidence/phase-c-closeout/` (359/359 tests, all gates). `PAPER_CLAIM_AUDIT.md` created. PDF rebuilt: 4 pages, 0 undefined citations. Verdict: Accurate.

### Added

- `Papers/simurgh-voting-pilot/PAPER_CLAIM_AUDIT.md` — 20-claim audit table with evidence links and verdict.
- `docs/research/mq-voting-pilot/evidence/phase-c-closeout/` — 7 gate evidence files at Phase C closeout baseline.

### Changed

- `Papers/simurgh-voting-pilot/main.tex` — §III.A consent/implementation distinction; Table 2 privacy audit note.
- `Papers/simurgh-voting-pilot/main.pdf` — rebuilt after fixes.

---

## [voting-pilot-paper-related-work] — 2026-06-04 — Paper related work + PDF build

**Raouf:** Filled Related Work section (5 subsections: E2E verifiable voting, remote voting security, voting standards, Australian TAV context, privacy/data minimisation, position statement). Added protective abstract sentence. Expanded `references.bib` to 10 entries. Added `Makefile`. PDF builds clean: 4 pages, 107 KB, 0 undefined citations.

### Changed

- `Papers/simurgh-voting-pilot/main.tex` — full related work section, abstract protective sentence.
- `Papers/simurgh-voting-pilot/references.bib` — Civitas, STAR-Vote, NIST IR 7770, National Academies 2018, VVSG 2021, NSWEC TAV, Cavoukian 2009 added.

### Added

- `Papers/simurgh-voting-pilot/Makefile` — `latexmk` build target.
- `Papers/simurgh-voting-pilot/main.pdf` — built (4 pages).

---

## [voting-pilot-phase-c-results-pack] — 2026-06-04 — Phase C results pack + paper scaffold

**Raouf:** Created Phase C results analysis documents and IEEE-format LaTeX paper scaffold. Three analysis docs (results analysis, results tables, paper findings summary) plus `Papers/simurgh-voting-pilot/main.tex` and `references.bib`. All non-claims preserved; wording guide included to prevent reviewer-hostile overclaims.

### Added

- `docs/research/mq-voting-pilot/results/PHASE_C_RESULTS_ANALYSIS.md`
- `docs/research/mq-voting-pilot/results/PHASE_C_RESULTS_TABLES.md`
- `docs/research/mq-voting-pilot/results/PAPER_FINDINGS_SUMMARY.md`
- `Papers/simurgh-voting-pilot/main.tex`
- `Papers/simurgh-voting-pilot/references.bib`

---

## [v0.5.0-voting-pilot-phase-c-closeout] — 2026-06-04 — Phase C tag + closeout doc final update

**Raouf:** Tagged `v0.5.0-voting-pilot-phase-c-closeout` on `main`. Updated `PHASE_C_MEMBER_PILOT_CLOSEOUT.md` with server-side closure endpoint table, tag reference, and final paper-safe summary paragraph.

---

## [voting-pilot-phase-c-collection-lock] — 2026-06-04 — Phase C server-side collection lock

**Raouf:** Enforced server-side Phase C collection closure. `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true` causes consent/accept, submit, and withdraw to return `410 Gone` with `voting_pilot_collection_closed`. Report export remains open. New `scripts/smoke-voting-pilot-closed.sh` (5 gates, dedicated server on port 33034). Gates: closure smoke 5/5, original smoke 8/8, security-audit 10/10, 359/359 tests, 0 high vulns, privacy audit PASS.

### Added

- `scripts/smoke-voting-pilot-closed.sh` — server-side closure smoke (5 gates).
- `scripts/check.sh` gate 10r — Voting pilot Phase C collection-closure smoke.

### Changed

- `src/votingPilot/index.js` — `collectionClosed()`, `rejectIfClosed` middleware; consent/accept + submit + withdraw return 410 when env var set; report unaffected.
- `.env.example` — `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED` documented.

---

## [voting-pilot-phase-c-closeout] — 2026-06-04 — Phase C member pilot closeout

**Raouf:** Closed Phase C data collection for the MQ Persian Society voting pilot. 31 consented sessions: 30 submitted (primary analysis set), 1 withdrawn (`vp_4fcc741a`, excluded). Both pilot pages replaced with "Collection closed" banners — no new sessions possible. All gates green: 359/359 tests, 0 high vulns, privacy audit PASS, smoke 8/8, security-audit 10/10.

### Added

- `docs/research/mq-voting-pilot/PHASE_C_MEMBER_PILOT_CLOSEOUT.md` — closeout document with session counts, privacy assertions, gate results, paper-safe sentence, and non-claims.

### Changed

- `public/voting-pilot.html` — collection closed; consent/submit buttons and JS logic removed.
- `public/voting-pilot-submit.html` — collection closed; submit/withdraw buttons and JS logic removed.

---

## [voting-pilot-phase-c-approval-pack] — 2026-06-04 — Phase C approval pack

**Raouf:** Created five governance documents for Phase C (real member pilot): go/no-go checklist, member pilot protocol, executive approval request, participant notice, and data management addendum. Phase C requires executive written approval and ethics determination before any member participation.

## [voting-pilot-phase-b-closeout] — 2026-06-04 — Phase B internal human dry run closeout

**Raouf:** Locked Phase B evidence artefacts for the MQ Persian Society voting pilot. Patched 34 Phase B session JSON files to carry `"synthetic": false, "data_source": "internal_human_dry_run"` (previously mislabelled). Created `PHASE_B_INTERNAL_HUMAN_DRY_RUN_CLOSEOUT.md`. All safety gates pass: 359/359 tests, 0 high vulns, 0 privacy violations, smoke 8/8, security-audit 10/10.

## [ci-stage-2-7-smoke-flake] — 2026-06-01 — Quality Gate raw-field smoke hardening

**Raouf:** Fixed the failing Simurgh Quality Gate run `26617769927` by hardening the Stage 2.7 raw-field smoke assertion. The CI failure was a false positive: scenario G searched the entire audit export JSON for the short forbidden value `"4321"`, which can appear by chance inside generated audit metadata such as HMACs, hashes, timestamps, or IDs even when the rejected raw debug payload is not leaked.

### Fixed

- `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — replaced whole-export substring matching with structured forbidden-data traversal.
- Audit leakage checks now inspect audit entry payloads, not HMAC chain metadata.
- Crypto/generated fields such as signatures, previous hashes, chain terminators, nonces, node hashes, session IDs, exam IDs, and tokens are excluded from raw-value leak matching.
- The raw-field rejection path remains unchanged: telemetry containing `hwnd`, `pid`, `window_title`, and `process_name` must still return `forbidden_local_field`.

### Verified

- `bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh` — pass.
- Five consecutive Stage 2.7 smoke runs — pass.
- `npx prettier --check tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — pass.
- `bash scripts/check.sh` — patched Stage 2.7 block passed; full local gate stopped on local prerequisites unrelated to this fix: installed .NET SDKs are 6.0/7.0 while Windows daemon projects target .NET 8.0, and local Xvfb is unavailable while CI installs Xvfb before running the mandatory Linux Rust tests.

## [paper-v0.1] — 2026-05-21 — Project Simurgh Research Paper Initial Draft

**Raouf:** Initial IEEE-format research paper draft. 10 pages, 13 sections, 34 citations, 0 overfull hboxes. Covers threat model, system architecture, Ed25519 proof protocol, cross-platform implementations, privacy model, evaluation (371 tests across 3 runtimes), security analysis, ethics. All non-claims preserved. Companion to the Invisible Window paper (Abedini, 2026).

## [0.4.18-stage-2-8-linux-closeout] — 2026-05-19 — Stage 2.8 Linux Closeout Docs

**Raouf:** Stage 2.8 Linux closeout documentation, validation matrix, reviewer checklist, real-device validation plan, external-review readiness, and top-level security/privacy/roadmap documentation refresh.

### Added

- `docs/stages/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md` — 24-section reviewer-facing technical brief: daemon architecture, X11/Wayland/XWayland scanner design, display server lock, browser_package_hint trust boundary, systemd dev-only lifecycle, proof flow, privacy contract, CI/smoke/audit coverage, non-claims.
- `docs/stages/STAGE_2_8_LINUX_VALIDATION_MATRIX.md` — build/test/CI/smoke/cybersecurity/real-device validation matrix with honest pending status for unvalidated environments.
- `docs/stages/STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md` — 16-group, 76-item reviewer checklist with concrete, file-level assertions.
- `docs/stages/STAGE_2_8_LINUX_CLOSEOUT.md` — freeze declaration: what is frozen, what is not claimed, gate evidence, real-device evidence (pending), reviewer notes.
- `scripts/check.sh` gate 53 — doc-grep safety: rejects forbidden overclaim phrases in docs/README/SECURITY/PRIVACY/ROADMAP.

### Changed

- `README.md` — Status blockquote updated to reflect Stage 2.8 frozen; Linux Display Integrity Closeout section added; "Linux support is Stage 2.8 future research" removed.
- `SECURITY.md` — Stage 2.8C/2.8D section renamed to "Stage 2.8 Linux Device Shield Security Posture"; expanded with proof verification, challenge binding, forbidden-field rejection, no-automatic-misconduct bullets.
- `PRIVACY.md` — Last-updated date refreshed to 2026-05-19.
- `ROADMAP.md` — Stage 2.8 status updated; Stage 2.8 Linux Research item marked complete; next-step updated to external review + Stage 3 planning.

## [0.4.16-stage-2-8C-8D] — 2026-05-18 — Stage 2.8C/2.8D Linux Wayland + systemd + Ubuntu CI

**Raouf:** Combined PR #21+#22 — Linux Wayland portal probe (property-read only, no consent triggered), XWayland partial coverage, browser_package_hint UX-only, live `display_server_mismatch` enforcement, dev-only systemd `--user` lifecycle, Ubuntu CI Rust toolchain + mandatory Xvfb + shellcheck, combined Stage 2.8C/D smoke and cybersecurity audit.

### Added

- `scanner/wayland.rs` — Wayland portal probe via `AvailableSourceTypes` property read only. Banned-method grep test prevents consent-triggering calls.
- `scanner/xwayland.rs` — XWayland scanner mapping to `coverage=xwayland_partial`. Never claims `x11_full` or `wayland_limited`.
- `systemd/simurgh-daemon-linux.service` — dev-only `--user` unit with `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=read-only`, `PrivateTmp=true`. No root, no sudo.
- Lifecycle scripts: install/uninstall/check/doctor with `--check` + `--dry-run`. shellcheck-clean.
- `SIMURGH_REQUIRE_XVFB_TESTS=1` env-var gate: panics when set + Xvfb missing; skips gracefully when unset.
- 16-scenario combined smoke + 30-assertion cybersecurity audit (16 dimensions). `docs/evidence/stage-2-linux/README.md` evidence rules.

### Changed

- `/api/telemetry` now enforces `display_server_mismatch` live (Phase A P0 follow-up). Emits `DAEMON_PROOF_REJECTED` to HMAC audit chain on mismatch.
- `browser_package_hint` is UX-only in SDK `getDeviceShieldStatus()`. Server modules source-grep clean of the field.
- Ubuntu CI extended: Rust stable toolchain, cargo fmt/clippy/test, shellcheck, Xvfb apt deps, timeout 10→20 min.
- README Node test count: 327/327. Rust test count: 33/33.

### Non-claims preserved

Research prototype only. No production Linux endpoint deployment, no distro packaging, no system-wide service, no MDM, no hardware attestation, no kernel-level visibility, no universal Wayland surface enumeration, no GPU overlay detection, no automatic misconduct detection.

---

## [post-merge] — 2026-05-17 — CI fix, tag release, issue updates

Post-merge housekeeping after PR #17 merged to `main`.

### Fixed

- **CI transient failure** on PR #17 `main` push — "server boot — /health not reachable" caused by runner resource contention after two prior merges on the same host. Docs-only PR; server boots locally in < 1s. Fixed via `gh run rerun --failed`; re-run passed 47/48 gates.

### Released

- Tag `v0.4.13-stage-2-windows-device-shield-closeout` published as a GitHub Release.

### Updated (GitHub Issues)

- **Issue #11** (macOS external review) — updated to match the Windows issue template: logo, scope bullets, validation table, review focus areas, confirmed non-claims, Stage 2.7 cross-platform note.
- **Issue #18** (Windows external review) — fixed broken relative doc links; replaced with absolute GitHub URLs; added Review Documents table, all 4 release tags hyperlinked, logo via raw GitHub URL.

---

## [0.4.13-windows-closeout] — 2026-05-17 — Stage 2 Windows Device Shield Closeout

Stage 2 Windows Device Shield is frozen as a real-device validated research-prototype baseline. This entry adds the Windows technical brief, closeout declaration, validation matrix, reviewer checklist, evidence-folder rules, logo integration, and top-level doc updates.

### Added

- `docs/stages/STAGE_2_WINDOWS_TECHNICAL_BRIEF.md` — 20-section reviewer-facing technical summary (research origin, daemon architecture, scanner design, affinity fixture, signed proof flow, server verification, risk mapping, report/audit integration, privacy contract, smoke/audit coverage, real-device validation, limitations, non-claims).
- `docs/stages/STAGE_2_WINDOWS_DEVICE_SHIELD_CLOSEOUT.md` — freeze declaration with evidence table, gate evidence, cross-platform contract references, and confirmed non-claims.
- `docs/stages/STAGE_2_WINDOWS_VALIDATION_MATRIX.md` — gate-level verification matrix across all smoke, audit, real-device, and Scenario A–G rows.
- `docs/stages/STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md` — reviewer checklist covering release gates, real-device validation, proof path, privacy contract, cross-platform contract, smoke/audit coverage, non-claims, and documentation completeness.
- `docs/evidence/stage-2-windows/README.md` — evidence-folder rules specifying allowed artefacts and forbidden raw identifiers.
- `docs/evidence/stage-2-windows/.gitkeep` — folder initialisation.
- `docs/Project-Simurgh-Logo.png` — Project Simurgh official logo (Simurgh bird with shield and keyhole, "Project Simurgh" wordmark, Knowledge / Verification / Guidance attributes).

### Changed

- `README.md` — logo added to header; Windows Device Shield Closeout section added; status block updated to Stage 2 Windows closeout; External Technical Review updated; verification counts updated (`273/273`, `47/48`).
- `docs/stages/STAGE_2_5_TECHNICAL_BRIEF.md` — logo added to header.
- `SECURITY.md` — `v0.4.13-stage-2-6-2-7-closeout` added to supported versions; Stage 2 Windows Device Shield Security Posture section added.
- `PRIVACY.md` — last-updated date updated; Windows Scanner Privacy Contract section added with full allowed/forbidden field tables.
- `ROADMAP.md` — Stage 2 Windows Device Shield closeout marked done; next-stage note added.

### Verified

- Windows 10 Pro build 19045 validation passed (Stage 2.6B AGENT.md entry).
- `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE` detected.
- Signed daemon proofs accepted; tampered, replayed, raw-field proofs rejected.
- Reports, dashboard, audit chain, and privacy sweep passed.
- `npm test` 273/273, `npm audit --audit-level=high` 0 vulnerabilities, `node tools/privacy-audit.mjs` pass.
- All smoke and security audit gates pass.

### Non-claims

- Research prototype only. No production deployment, Windows Service, MDM/Intune, hardware attestation, kernel visibility, GPU overlay, or automatic misconduct detection.

---

## [0.4.13-closeout] — 2026-05-17 — Stage 2.6/2.7 Closeout (umbrella gates + hardening)

Final closeout before tagging `v0.4.13-stage-2-7-cross-platform-device-shield`. Adds two umbrella gates that exercise the full Stage 2.6/2.7 surface plus targeted hardening of gaps surfaced during Stage 2.7 review.

### Added

- `tests/security/stage_26_27_closeout_audit.test.js` — 24-test umbrella manifest covering nine audit dimensions: proof, scanner, platform, daemon, SDK, report, dashboard, privacy, wording.
- `scripts/security-audit-stage-2-6-2-7-closeout.sh` — closeout cybersecurity audit running Stage 2.4/2.5 + Stage 2.7 + new closeout audit + privacy-audit + `npm audit`.
- `scripts/smoke-stage-2-6-2-7-closeout.sh` — closeout E2E smoke running Stage 2.6 Windows scanner smoke + Stage 2.7 cross-platform smoke + privacy-audit.

### Hardened (extending `tests/security/stage27_cross_platform_security_audit.test.js`)

- Pairing payload with raw `hwnd` anywhere in the envelope is rejected as `forbidden_local_field` (was only tested on the proof path).
- Pairing payload with forbidden field nested inside `signed_payload` is rejected.
- Pairing payload with `platform: "linux"` is rejected as `unsupported_platform` at the pairing layer (the actual rejection point).
- SDK trust-boundary invariant: `validateDaemonProof` never echoes unsigned client-supplied fields into the trusted proof object.
- `FORBIDDEN_LOCAL_FIELD_NAMES` is frozen — mutation via `push` and indexed assignment both throw at runtime.

### Changed

- `scripts/check.sh` — new section 10m runs both closeout umbrella gates after the per-stage gates.

### Verified

- Windows OS: Windows 10 Pro / Build 19045. Toolchain: Node 24.14.0, npm 11.9.0, .NET 8.0.421.
- `npm test` — 273/273 unit tests pass (unchanged; closeout work lives in `tests/security/`, which `npm test` does not glob).
- `node --test tests/security/stage27_cross_platform_security_audit.test.js` — 15/15 (5 new hardening tests, was 10).
- `node --test tests/security/stage_26_27_closeout_audit.test.js` — 24/24.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- `bash scripts/smoke-stage-2-6-2-7-closeout.sh` — pass (Stage 2.6 + Stage 2.7 smokes + privacy).
- `bash scripts/security-audit-stage-2-6-2-7-closeout.sh` — pass (Stage 2.4/2.5 + Stage 2.7 + closeout audit + privacy + npm audit).
- All five smoke scripts (2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 Windows, 2.7 cross-platform) green.
- `bash scripts/check.sh` — 47/48 green; the single failure is the pre-existing Windows-line-endings prettier tolerance documented in check.sh itself. CI on Linux passes prettier cleanly.

### Non-claims (unchanged)

- Research prototype only.
- No production deployment claim, no MDM/Intune readiness, no Windows Service or notarised macOS packaging, no hardware attestation, no kernel-level visibility, no GPU overlay coverage, no automatic misconduct detection.
- No collection or transmission of screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.
- Linux daemon proofs rejected with `unsupported_platform` at both pairing and proof layers until Stage 2.8 Linux Display Integrity Research delivers a signed, validated path.

After this closeout the Windows Device Shield is fully closed as a research prototype, Stage 2.7 is safe to release, and Linux research can begin.

---

## [0.4.13] — 2026-05-17 — Stage 2.7 Cross-Platform Device Shield Unification

Stage 2.7 unifies the macOS and Windows Device Shield implementations under one documented cross-platform proof, scanner, risk, report, dashboard, privacy, and audit contract before Linux research begins.

### Added

- `src/device/forbiddenLocalFields.js` — shared single source of truth for forbidden raw-field names plus recursive deep-check helper.
- `src/device/platformScannerSchema.js` — supported-platform list, scanner-state enum, per-platform scanner-version map, and scanner-summary validator.
- `src/device/scannerRiskPolicy.js` — shared `mapScannerSummaryToRisk` plus `getManualReviewReason` (session + device-integrity contexts).
- `public/sdk/simurgh-browser-sdk.js#getDeviceShieldStatus` — UX-only platform/scanner status accessor with explicit trust-boundary comment.
- `docs/DEVICE_SHIELD_CONTRACT.md`, `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`, `docs/stages/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`, `docs/stages/STAGE_2_7_REVIEWER_CHECKLIST.md`.
- `docs/schemas/daemon-proof.schema.json`, `docs/schemas/device-scanner-result.schema.json` — JSON Schema draft-07.
- `scripts/smoke-stage-2-7-cross-platform-device-shield.sh`, `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`.
- `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — Scenarios A–G.
- `tests/security/stage27_cross_platform_security_audit.test.js` — 10 negative tests including a full sweep over `FORBIDDEN_LOCAL_FIELD_NAMES`.
- `tests/unit/{forbiddenLocalFields,platformScannerSchema,scannerRiskPolicy,reportBuilderDeviceShield}.test.js`.

### Changed

- `src/device/daemonProof.js`, `src/device/daemonState.js`, `src/academic/reportBuilder.js`, `tools/privacy-audit.mjs` — refactored to consume the new shared modules. No behaviour change; every `fail()` reason code preserved.
- `src/device/daemonState.js` `baseRecord.platform` default: `"macos"` → `"unknown"`. Unpaired sessions no longer implicitly claim a platform.
- `device_integrity` report section now emits `daemon_platform` as the canonical platform key; legacy `platform` retained as a back-compat alias for this release (planned removal: Stage 2.8 or later).
- `device_integrity.manual_review_recommendation` wording is now sourced from `scannerRiskPolicy.getManualReviewReason({ context: "device_integrity" })`.
- `scripts/check.sh` — new section 10l wires Stage 2.7 smoke + audit into the CI gate; privacy guard exemption added for `src/device/forbiddenLocalFields.js`.
- `scripts/security-audit-stage-2-4-2-5.sh` — overclaim grep exempts the Stage 2.7 contract / matrix / reviewer checklist / stage doc / spec / plan / security-test files, which legitimately enumerate the forbidden phrases.

### Verified

- Windows OS: Windows 10 Pro / Build 19045. Toolchain: Node 24.14.0, npm 11.9.0, .NET 8.0.421.
- `npm test` — 273/273 pass (+34 new tests).
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- Git Bash `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` — all seven scenarios pass.
- Git Bash `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` — 10/10 negative tests pass.
- Stage 2.2/2.3, Stage 2.4/2.5, Stage 2.5 security audit, Stage 2.6 Windows scanner smoke, Stage 2.6 .NET daemon tests — all green.
- `scripts/check.sh` — 45/46 green; one pre-existing Windows-line-endings prettier tolerance failure (documented in check.sh itself). CI on Linux passes prettier cleanly.

### Non-claims (unchanged)

- Research prototype only. No production deployment claim.
- No MDM/Intune readiness, no Windows Service or notarised macOS packaging, no hardware attestation, no kernel-level visibility, no GPU overlay coverage, no automatic misconduct detection.
- No collection or transmission of screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.
- Linux daemon proofs are rejected with `unsupported_platform` until Stage 2.8 Linux Display Integrity Research delivers a signed, validated path.

---

## [0.4.12] — 2026-05-16 — Stage 2.6 Windows Display Affinity Scanner (Release)

Tagged `v0.4.12-stage-2-6-windows-display-affinity-scanner` on `main` after PR #14 merged clean.

Stage 2.6 completes real-device Windows display-affinity validation for the Device Shield research prototype. WDA_MONITOR and WDA_EXCLUDEFROMCAPTURE are detected through the Windows daemon, signed inside daemon proofs, verified server-side, reflected in risk/report/dashboard/audit outputs, and protected by tamper, replay, and raw-field rejection gates.

### Fixed (this session)

- `scripts/smoke-stage-2-6-windows-scanner.sh` committed with mode `100644` (not executable) — caused `Permission denied` on the Linux CI runner at `check.sh` line 1150. Fixed with `git update-index --chmod=+x` (mode → `100755`).

### Removed (this session)

- `.github/workflows/windows-daemon.yml` — deleted as fully redundant. Both `dotnet test` on the Windows daemon solution and the Stage 2.6 smoke script are already executed inside `scripts/check.sh` step 10k on every Simurgh Quality Gate run. Consolidates all checks under a single workflow.

### Released

- PR #14 merged to `main`.
- Tag `v0.4.12-stage-2-6-windows-display-affinity-scanner` pushed.
- GitHub release published with Stage 2.6 release note.

---

## [0.4.12-stage-2-6B] — 2026-05-16 — Stage 2.6B Windows Display Affinity Scanner Real-Device Validation

Stage 2.6B is real-device validated on Windows 10 Pro build 19045 for live `GetWindowDisplayAffinity` detection of `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE`.

### Added

- `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/` — controlled local Win32 fixture with `none`, `monitor`, and `exclude` modes.
- Windows daemon runtime `/health`, `/status`, `/pair`, and `/proof` loopback paths for local validation.
- .NET tests covering privacy-safe status/proof payloads and fixture project safety expectations.

### Changed

- Windows daemon proofs now include the full scanner field set required by the server validator, including scan timestamp, duration, privacy mode, and empty fingerprint hash array.
- `docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`, README, SECURITY, PRIVACY, and ROADMAP now mark Stage 2.6B real Windows validation as passed.
- Roadmap now tracks real Windows laptop validation as complete while leaving production Windows Service packaging and deployment design out of scope.

### Verified

- Windows OS: Windows 10 Pro / Build 19045.
- Toolchain: Git 2.53.0, Node 24.14.0, npm 11.9.0, .NET 8.0.421.
- `npm test` — 239/239 pass.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- Git Bash `scripts/smoke-stage-2-6-windows-scanner.sh` — pass.
- Git Bash `scripts/security-audit-stage-2-4-2-5.sh` — pass.
- Git Bash `scripts/check.sh` — 44/44 pass.
- `.tools/dotnet/dotnet.exe build tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln` — pass.
- `.tools/dotnet/dotnet.exe test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln --no-restore` — 11/11 pass.
- Live daemon `/health` returned `platform: "windows"`.
- Live daemon `/status` returned `scanner_version: "2.6.0"` and `privacy_mode: "metadata_only"`.
- Normal desktop scan returned zero restricted/excluded counts.
- `WDA_MONITOR` fixture returned `restricted_detected`, `monitor_only_window_count: 1`, and `capture_restricted_window_count: 1`.
- `WDA_EXCLUDEFROMCAPTURE` fixture returned `risk_detected` and `capture_excluded_window_count: 1`.
- Live signed Windows daemon proofs were accepted by the server for healthy, monitor-only, and capture-excluded states.
- Tampered scanner proof rejected with `invalid_signature`.
- Replayed proof rejected through consumed challenge rejection.
- Raw local `hwnd` rejected as `forbidden_local_field`.
- Report showed Windows scanner summary; dashboard showed Windows scanner state; audit chain verified.
- Privacy sweep found only expected forbidden-field rejection references in test logs.

### Notes

- Manual review wording remains: `Manual review recommended. No automatic misconduct finding.`
- This is still a research prototype. It does not claim Windows Service deployment, production endpoint management, MDM/Intune readiness, hardware attestation, kernel-level visibility, Linux scanner support, or automatic misconduct detection.

## [0.4.11-stage-2-6A] — 2026-05-16 — Stage 2.6A Windows Display Affinity Scanner Implementation

Stage 2.6A is implementation-complete and pending real Windows laptop validation for live `GetWindowDisplayAffinity` detection.

### Added

- Windows signed daemon-proof support for `platform: "windows"` and `scanner_version: "2.6.0"`.
- Windows scanner fields: `capture_restricted_window_count` and `monitor_only_window_count`.
- Stage 2.6 smoke driver: `scripts/smoke-stage-2-6-windows-scanner.sh` and `tests/e2e/stage26_windows_scanner_smoke.mjs`.
- `tools/simurgh-daemon-windows/` .NET 8 daemon skeleton with mock-first scanner architecture, Win32 provider stub, privacy normaliser, P-256 proof signer, identity store, local health payload, and xUnit tests.
- GitHub Actions Windows daemon build/test workflow.
- `docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`.

### Changed

- `WDA_EXCLUDEFROMCAPTURE` / `capture_excluded_window_count > 0` maps to Critical/manual review.
- `WDA_MONITOR` / `monitor_only_window_count > 0` maps to Warning/manual review.
- Recursive daemon proof and pairing privacy rejection now returns generic `forbidden_local_field` for forbidden local fields.
- Reports and instructor dashboard include Windows platform and aggregate scanner counts without raw HWND, PID, process, title, path, username, pixel, audio, webcam, typed, or pasted data.
- `scripts/check.sh` is safer on Windows hosts: portable Node test paths, Windows line-ending tolerant format check, and repo-local audit-chain temp files.

### Verified

- Red step: Stage 2.6 Windows proof/risk/report tests failed before implementation.
- `node --test tests/unit/daemonProof.test.js tests/unit/daemonProofScanner.test.js tests/unit/daemonScannerRisk.test.js tests/unit/reportBuilderScanner.test.js` — pass.
- `node --test tests/security/stage24_25_security_audit.test.js` — pass.
- `scripts/smoke-stage-2-6-windows-scanner.sh` — pass.
- `npm test` — 239/239 pass.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- `scripts/security-audit-stage-2-4-2-5.sh` — pass.
- `.tools/dotnet/dotnet.exe test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln --no-restore` — 8/8 pass.
- `scripts/check.sh` — 44/44 gates pass on Windows; macOS Swift gates skipped honestly.

### Notes

- Real Windows laptop validation is still pending. This branch does not claim production deployment, Windows Service readiness, MDM/Intune readiness, hardware attestation, kernel-level visibility, Linux scanner support, or automatic misconduct detection.

## [0.4.11] — 2026-05-16 — Stage 2.5 External Technical Review Signal

### Changed

- README status block updated from "Stage 2.5 research prototype — macOS metadata-only affinity scanner active" to "Stage 2.5 closed — macOS Device Shield regression-gated and ready for external technical review."
- README Stage 2.5 section heading corrected from `branch active — v0.4.7 target` to `frozen — v0.4.10`.
- README Status & License section updated to state Stage 2.5 is closed and ready for external technical review.

### Added

- README `## External Technical Review` section (after status block): lists the full macOS Device Shield baseline, current verification numbers (234/234 tests, 50/50+ gates, all smoke packs), open-door statement for reviewers, and honest non-claims list.
- `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md` — `## External Review Status` section with prototype framing and eight specific focus areas for reviewers.
- PR #10 `stage-2-macos-external-review-signal` → `main`.
- GitHub Issue #11 "External Review Request: Stage 2.5 macOS Integrity Stack" (pinned).

### Verified

- `npm test` — 234/234 pass.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- `git diff --check` — clean.
- Docs only — no code changes, no gate changes.

### Notes

- This is a review-signal closeout artefact, not Stage 2.6 feature work.
- No production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection is claimed.

## [0.4.10] — 2026-05-16 — Stage 2.5 Closeout Security Audit

### Added

- `scripts/security-audit-stage-2-4-2-5.sh` — closeout cybersecurity gate for the Stage 2.4 browser SDK and Stage 2.5 scanner/daemon proof surface.
- `tests/security/stage24_25_security_audit.test.js` — regression suite covering recursive raw local-field rejection, SDK token/proof boundaries, daemon localhost hardening source checks, LaunchAgent dry-run safety, and dashboard/report wording.
- `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md` — closeout audit scope, locked security decisions, command, and Stage 2.6 go/no-go rules.
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
- `docs/stages/STAGE_2_5_MACOS_AFFINITY_SCANNER.md`.

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
- `docs/stages/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`.
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
  - `docs/stages/STAGE_1_5_REVIEWER_PACK.md`
  - `docs/THREAT_MODEL.md`
  - `docs/VALIDATION.md`
  - `docs/LIMITATIONS.md`
  - `docs/stages/STAGE_2_ARCHITECTURE.md`
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
- **Files changed:** `README.md`, `ROADMAP.md`, `docs/stages/STAGE_1_ACADEMIC_SHIELD.md`, `docs/stages/STAGE_1_5_REVIEWER_PACK.md`, `docs/THREAT_MODEL.md`, `docs/VALIDATION.md`, `docs/LIMITATIONS.md`, `docs/stages/STAGE_2_ARCHITECTURE.md`, `docs/RESOURCE_PLAN.md`, `docs/DEMO_SCRIPT.md`, `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/REVIEWER_CHECKLIST.md`, `docs/evidence/stage-1/README.md`, `docs/evidence/stage-1/.gitkeep`, `.github/pull_request_template.md`.
- **Verification:** `npm install` passed with 0 vulnerabilities. `./scripts/check.sh --fix` passed 21/21. Initial `./scripts/check.sh` found one Prettier drift in `docs/stages/STAGE_1_5_REVIEWER_PACK.md`; reran `./scripts/check.sh --fix`, then final `./scripts/check.sh` passed 21/21. `npm test` passed 65/65 tests. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. `git diff --check` passed. Markdown relative link audit passed. README image path audit passed. Secret/privacy/overclaim grep audits found only expected enforcement, test, policy, and historical-log references.
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

- Replaced `docs/stages/STAGE_1_ACADEMIC_SHIELD.md` short branch note with the full Stage 1 Academic Shield reviewer/reference document
- Added document metadata, contents, an explicit Stage 1 threat model, exact verification commands, reviewer notes, and consistent section numbering
- Renamed the documentation heading from "CI/CD Status" to "CI Status" to match the Stage 1 CI-only boundary

### Notes

- Branch protection remains documented as a manual follow-up because the saved GitHub branch-protection state was not confirmed during this pass

### Verified

- Initial `./scripts/check.sh` found only Prettier formatting drift in `docs/stages/STAGE_1_ACADEMIC_SHIELD.md`
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
