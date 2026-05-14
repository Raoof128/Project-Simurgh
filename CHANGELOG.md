## Change Log

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
- **Verification:** `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. README relative links and anchors passed. README grep confirmed no `Why Anthropic`, `Anthropic`, `Claude`, `Constitutional`, `strategic moat`, or partnership-pitch wording remains. `git diff --check` passed.
- **Follow-ups:** None.

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
