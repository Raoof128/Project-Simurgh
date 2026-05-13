# Agent Rules and Logs

## Agent Change Log

### 2026-05-13 (Australia/Sydney) — Stage 1 CI (GitHub Actions)

**Raouf:**

- **Scope:** Continuous integration
- **Summary:** Added `.github/workflows/stage-1-checks.yml` — a GitHub Actions workflow that runs `./scripts/check.sh` on every push to `main`/`stage-1-academic-shield` and every PR targeting `main`. Uses Ubuntu latest + Node 22 + `npm ci`. Safe non-real env vars are injected so the smoke test can boot the server in demo mode. Failed runs upload `.simurgh_check_logs/` as an artifact for debugging. Concurrency group cancels in-flight runs when newer commits land. Removed `package-lock.json` from `.gitignore` and committed the lockfile so `npm ci` is reproducible. Added a CI status badge to the README and noted the workflow in the Stage 1 Verification block.
- **Files Changed:**
  - `.github/workflows/stage-1-checks.yml` (new)
  - `.gitignore` — drop `package-lock.json` exclusion
  - `package-lock.json` (now tracked)
  - `README.md` — Stage 1 Checks badge + CI note in Verification block
- **Verification:** Local `./scripts/check.sh` continues to pass 21/21. CI run will be triggered automatically by the commit push.
- **Follow-ups:**
  - After CI is green on `main`, tag `v0.3.2-stage-1-ci`.
  - Enable branch protection on `main`: require PR, require `Stage 1 Security Checks` to pass, disallow force-push. (Manual UI step on GitHub.)
  - CD (deployment automation) is intentionally NOT in scope until Stage 2.

### 2026-05-13 (Australia/Sydney) — Stage 1 Quality Gate (Prettier + check.sh)

**Raouf:**

- **Scope:** Repository quality gate
- **Summary:** Added Prettier (`npm run format` + `format:check`), `.prettierignore`, `.prettierrc.json`, and integrated formatting into `scripts/check.sh` (full + `--quick` run `format:check`; `--fix` runs `format`). One-shot reformatted 41 files to baseline. Added a `Stage 1 Verification` block to README pointing to `./scripts/check.sh`.
- **Files Changed:**
  - `package.json` — `format` and `format:check` scripts, prettier dev dep
  - `.prettierignore`, `.prettierrc.json` (new)
  - `scripts/check.sh` — new Format step inserted between Syntax and Tests
  - `README.md` — Stage 1 Verification section
  - 41 source/test/doc files reformatted to prettier defaults
- **Verification:** `./scripts/check.sh --quick` → 11/11 pass. `./scripts/check.sh` (full) → 21/21 pass. `./scripts/check.sh --fix` → 11/11 pass. All 65 unit tests still pass after formatting.
- **Follow-ups:** Tag `v0.3.1-stage-1-quality-gate`.

### 2026-05-13 (Australia/Sydney) — Stage 1 Security Hardening

**Raouf:**

- **Scope:** Stage 1 cybersecurity hardening (full blueprint pass)
- **Summary:** Implemented the Stage 1 security hardening blueprint end-to-end. Added HMAC-signed session tokens (issued at `/join`, required on lifecycle + joined-session telemetry), per-session sequence+timestamp replay guard, generic per-key rate limiter with limits on join/affinity/sessions/report/verify, four-secret separation (instructor / helper / audit / session-signing) with non-demo fail-fast, JSON body limit dropped to 32 KB, stricter sanitiser (reject NaN/Infinity/negative/2× over-range), HTTP security headers, dashboard XSS hardening (URL token strip, Authorization header everywhere, escaped DOM rendering), privacy audit CLI tool, hardened `.gitignore` for runtime data.
- **Files Changed:**
  - `src/security/sessionToken.js`, `src/security/replayGuard.js`, `src/security/rateLimit.js` (new)
  - `src/config/env.js` (extended)
  - `server.js` (session token + replay + rate limits wired into all routes)
  - `public/index.html` (token + sequence + timestamp on every telemetry POST; sequence reset on session rotation)
  - `public/instructor.html` (URL token stripping; Authorization header for report/verify)
  - `tools/privacy-audit.mjs` (new — CI-ready forbidden-field scanner)
  - `.gitignore` (data/sessions, data/audit, data/reports, logs/, simurgh-\* artifacts)
  - `README.md` (new "Stage 1 Security Hardening" section)
  - `tests/unit/sessionToken.test.js`, `tests/unit/replayGuard.test.js`, `tests/unit/rateLimit.test.js` (23 new tests; 65 total)
- **Verification:** All 65 unit tests pass. End-to-end smoke confirms: anonymous telemetry works, replay rejected, stale timestamp rejected, negative numbers rejected, joined-session telemetry without token returns 401, joined-session telemetry with token passes, security headers present on every response.
- **Follow-ups:** Optional Stage 1.1 — full request HMAC signing with `SIMURGH_SESSION_SIGNING_SECRET` (currently signing is at token-issuance only).

### 2026-05-13 (Australia/Sydney) — Production-Readiness Audit Fixes

**Raouf:**

- **Scope:** Production-readiness hardening (post full end-to-end audit)
- **Summary:** Ran a 23-point production audit. All 23 checks passed. Fixed 6 identified issues: block telemetry on submitted sessions, MAX_SESSIONS cap with 503, HTTP security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS), fail-fast when SIMURGH_AUDIT_SECRET missing in production, louder CORS origin warning, eliminated AUDIT_CHAIN_CAP duplication.
- **Files Changed:** `server.js`
- **Verification:** 42/42 tests pass. Smoke test confirms: security headers present, submitted-session telemetry blocked with 403, health endpoint OK, Safe/Critical scoring correct.
- **Follow-ups:** None for Stage 1.

### 2026-05-13 (Australia/Sydney) — Repository Documentation

**Raouf:**

- **Scope:** Repository documentation polish
- **Summary:** Created SECURITY.md, PRIVACY.md, ROADMAP.md, ETHICS.md, DISCLAIMER.md. Added status notice to README.md top section.
- **Files Changed:** `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `ETHICS.md`, `DISCLAIMER.md`, `README.md`
- **Verification:** All files render correctly. README status notice links to the three policy docs.
- **Follow-ups:** None.

### 2026-05-13 (Australia/Sydney)

**Raouf:**

- **Scope:** Stage 1 Academic Shield
- **Summary:** Implemented full Stage 1 Academic Shield — exam lifecycle, privacy-safe telemetry normaliser, SHA-256 identity hashing, local category-based risk scoring (7 weighted categories), Claude narrative layer (Warning/Critical only, fail-open), academic event taxonomy, session state machine, HMAC audit chain module, JSON report builder, and updated instructor dashboard with risk cards, event timeline, filter bar, report export, and audit verify.
- **Files Changed:**
  - `src/config/env.js`, `src/privacy/privacyConfig.js`, `src/privacy/normaliseTelemetry.js`, `src/privacy/hashIdentity.js`
  - `src/storage/memoryStore.js`
  - `src/academic/riskScoring.js`, `src/academic/academicEvents.js`, `src/academic/exams.js`, `src/academic/sessions.js`, `src/academic/reportBuilder.js`
  - `src/audit/hmacChain.js`, `src/audit/verifyAudit.js`
  - `server.js` — integrated all modules, added 9 new routes
  - `public/index.html` — privacy modal, helper status
  - `public/instructor.html` — risk cards, timeline, filters, report export, audit verify
  - `README.md` — Academic Shield section added
  - `tests/unit/` — 8 test files covering all new modules
- **Verification:** All 42 unit tests pass. Server starts cleanly. Telemetry endpoint returns category-based risk scores. Report endpoint returns valid JSON. Audit verify confirms chain integrity. Dashboard loads with new components.
- **Follow-ups:** Stage 1.5 — route-level refactor of server.js into src/routes/. PDF report export (P2).

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
- **Summary:** Comprehensive polish pass to bring the README to patent-review and technical-interview quality. Fixed 10 identified issues: broken badge anchor links, inconsistent voice (mixed 1st/3rd person), missing horizontal rule separators, trailing whitespace, informal language, sparse API reference, missing Security Considerations section, missing env var documentation table, telemetry fields as raw list instead of structured table, and missing component summary.
- **Files Changed:**
  - `README.md` — Full rewrite. Added Section 8 (Security Considerations), expanded API Reference, added tables throughout, normalized voice, fixed anchors, extended roadmap.
- **Verification:** All 11 ToC anchors resolve correctly. Consistent formatting. No trailing whitespace.
- **Follow-ups:** Ready for GitHub push and interview presentation.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Screenshots & Visual Documentation
- **Summary:** Replaced stale hero screenshot (old "Verity" branding) with fresh Simurgh-branded captures. Added student exam view and instructor dashboard screenshots in a side-by-side table.
- **Files Changed:**
  - `docs/screenshot.png`, `docs/screenshot-exam-view.png`, `docs/screenshot-instructor.png`, `docs/screenshot-idle.png`
  - `README.md` — Updated hero caption, added Screenshots subsection, fixed badge anchors
- **Verification:** All screenshots render correctly. No remaining "Verity" branding.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Content Enhancement — Cost Reduction, First-Mover Strategy, Contributors
- **Summary:** Expanded Institutional Cost Reduction (invigilator/venue elimination), added first-mover advantage to Why Anthropic, added Contributors section with Claude credit.
- **Files Changed:**
  - `README.md` — Sections 4, 9, 11, 12 updated; ToC and badge anchors renumbered.
- **Verification:** All 12 ToC anchors resolve. Badge links updated.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README — Public Health Resilience Argument
- **Summary:** Added "Public Health Resilience" subsection to Section 4. Positions remote behavioral verification as institutional resilience infrastructure against epidemiological risks.
- **Files Changed:**
  - `README.md` — New subsection under Section 4.
- **Verification:** Formal, research-grade tone validated.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Mermaid Architecture Diagram & Rebranding Audit
- **Summary:** Converted ASCII architecture diagram to Mermaid flowchart. Full-codebase grep confirms zero "Verity" leaks in source/config/HTML — only historical changelog entries remain.
- **Files Changed:**
  - `README.md` — Replaced ASCII diagram with Mermaid in Section 3.
- **Verification:** `grep -ri verity` clean across all source files.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** SEB Critique & Cross-Platform Roadmap Expansion
- **Summary:** Added SEB comparison table contrasting Windows-only lockdown with Simurgh's platform-agnostic approach. Expanded roadmap with per-platform milestones (Windows, Linux, iOS, Android, ChromeOS).
- **Files Changed:**
  - `README.md` — New subsection in Section 4, expanded Phases 1–3 in Section 10.
- **Verification:** Tables render correctly. Platform roadmap is logically sequenced.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README — Zero Client-Side Compute & Device Inclusivity
- **Summary:** Added subsection explaining server-side Claude processing, no video/images leaving the device, and universal device compatibility.
- **Files Changed:**
  - `README.md` — New subsection in Section 4.
- **Verification:** Factually accurate to architecture.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Email Cross-Reference Audit, Browser/App Delivery Roadmap, Gap Patching
- **Summary:** Audited email to Dario vs README (7 matches, 6 gaps patched). Added Interview Coder, capability-uplift note, Macquarie University, and Phase 3b (browser PWA + native apps for 5 platforms).
- **Files Changed:**
  - `README.md` — Sections 2, 10, 11 updated.
- **Verification:** All email claims now backed by README.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Codebase Verification Audit, Roadmap Expansion, Bug Fixes
- **Summary:** Verified all README claims against codebase. Fixed 3 issues: wrong audit endpoint name, stale `verity-helper` binary, wrong Countermeasure label. Expanded Phase 3b with full 6-platform delivery matrix (Browser + App + Helper).
- **Files Changed:**
  - `README.md` — Fixed `/api/audit-export` → `/api/audit`, expanded Phase 3b matrix.
  - `package.json` — Fixed Countermeasure A → C.
  - `tools/simurgh-helper/verity-helper` — Deleted stale binary.
- **Verification:** 14 architectural claims ✅, 6 env vars ✅, 4 API endpoints ✅.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Terminology Refinement & Strategic Positioning
- **Summary:** Replaced "cooperate" with "collaborate" and "partner" in the README. This shift in terminology elevates the project from a formal/legalistic tone to a "Silicon Valley" peer-to-peer ecosystem dialect, better aligning with Anthropic's partnership-driven culture.
- **Files Changed:**
  - `README.md` — Updated lines 323 and 330.
- **Verification:** Verified that "collaborate" and "partner" now appear in the "Why Anthropic?" and concluding sections. Global grep for "cooperate" returns zero matches in source code or documentation.
- **Follow-ups:** None.
