# Agent Rules and Logs

## Agent Change Log

### 2026-05-14 (Australia/Sydney) — Stage 2.1 Design Spec (macOS Integrity Proof Pipeline)

**Raouf:**

- **Scope:** Stage 2.1 design spec — macOS CLI integrity proof pipeline
- **Summary:** Brainstormed and locked Stage 2.1 architecture with the user across six sections: module layout, v1 proof envelope + canonical signing, server validation flow, macOS CLI behaviour, audit events + per-session integrity state, and test plan. Four decisions locked: (A) refactor existing Stage 2.0 scaffold to the v1 envelope, (B2) Ed25519 / Curve25519 per-node keypair with `signature_status: "unregistered_node"` transitional state, (D1) CLI proof generator (no daemon, no permissions, no ScreenCaptureKit), (N1) strict node continuity via immutable `bound_node_id_hash`. Spec includes the Node SPKI wrapping detail required for `crypto.verify` on raw Ed25519 keys, asymmetric timestamp tolerance (30 s past / 5 s future), golden cross-implementation canonical-bytes fixture, and ~60 new tests.
- **Files Changed:**
  - `docs/superpowers/specs/2026-05-14-stage-2-1-macos-integrity-proof-design.md` (new — 6-section approved spec)
- **Verification:** Spec self-review passed: no placeholders, internal consistency confirmed across sections, single-milestone scope, all field rules and reason codes enumerated. User reviewed and approved with six refinement requests (SPKI wrapping detail, validator scope clarification, evicted-session audit semantics, base64-decoded-length validation rule, pretty-vs-canonical clarification, AGENT/CHANGELOG entry) — all applied before this commit.
- **Follow-ups:** Invoke `superpowers:writing-plans` to produce an implementation plan from the locked spec.

### 2026-05-14 (Australia/Sydney) — Stage 2.0 Integrity Proof Pipeline Scaffold

**Raouf:**

- **Scope:** Stage 2 scaffold — integrity proof pipeline
- **Summary:** Merged Stage 1.5 validation pack into `main`. Created `stage-2-integrity-node` branch. Scaffolded the Stage 2 integrity proof pipeline: proof schema validator (`src/integrity/proofSchema.js`) with forbidden-field enforcement, timestamp freshness, capability allowlist, nonce guard (`src/integrity/nonceGuard.js`), `POST /api/integrity/proofs` route stub (session-token-gated, nonce replay protected, audit-chain connected), two new EVENTS constants (`INTEGRITY_PROOF_RECEIVED`, `INTEGRITY_PROOF_REJECTED`), and 25 new unit tests (93 total). Updated test glob to recurse into subdirectories.
- **Files Changed:**
  - `src/integrity/proofSchema.js` (new)
  - `src/integrity/nonceGuard.js` (new)
  - `src/academic/academicEvents.js` — two Stage 2 event constants added
  - `server.js` — imports and `POST /api/integrity/proofs` route
  - `package.json` — test glob updated to recurse into `tests/unit/**/*.test.js`
  - `tests/unit/integrity/proofSchema.test.js` (new, 19 tests)
  - `tests/unit/integrity/nonceGuard.test.js` (new, 6 tests)
  - `scripts/check.sh` — proofSchema.js added to privacy-grep exclusion list
- **Verification:** 93/93 tests pass. `./scripts/check.sh` (full) → 21/21 pass. Server starts, smoke test passes. Privacy audit passes. npm audit 0 vulnerabilities.
- **What this does NOT do:** No cryptographic signature verification (planned). No influence on Stage 1 risk score (planned). No hardware attestation claim. Does not replace `/api/affinity` helper path.
- **Follow-ups:** Push branch, CI, tag `v0.4.0-stage-2-scaffold`.

### 2026-05-14 (Australia/Sydney) — Stage 2 Readiness Audit Fix

**Raouf:**

- **Scope:** Stage 2 readiness audit fix
- **Summary:** Full audit found one code/docs mismatch: Safe verdicts were documented as skipping Claude by default, but `stagingConfig.claudeOnSafe` defaulted to enabled when the env var was absent. Fixed the default, added regression coverage, and updated current verification-count docs.
- **Files Changed:**
  - `src/config/env.js` — `SIMURGH_CLAUDE_ON_SAFE` now defaults to false unless explicitly set to `true`
  - `tests/unit/envConfig.test.js` — regression coverage for Claude gating defaults
  - `README.md`, `SECURITY.md` — current test count updated to 68 tests / 13 modules
  - `AGENT.md`, `CHANGELOG.md` — audit log entries
- **Verification:** `npm test` passed 68/68 tests. `npm run format:check` passed. `./scripts/check.sh --fix` passed 21/21. Final `./scripts/check.sh` passed 21/21. Markdown relative links and anchors passed. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. Direct dependency licence spot-check found MIT for `@anthropic-ai/sdk`, `express`, and `prettier`. `git diff --check` passed.
- **Follow-ups:**
  - Push branch and collect remote CI evidence before tagging.

### 2026-05-14 (Australia/Sydney) — Stage 1.5 Validation Pack

**Raouf:**

- **Scope:** Stage 1.5 validation and reviewer readiness
- **Summary:** Added the Stage 1.5 validation pack, evidence rules, risk register, reviewer checklist, Stage 2 architecture plan, and PR hygiene template. Kept the work documentation-first and did not add major Stage 2 runtime code.
- **Files Changed:**
  - `README.md` — Stage 1.5 section, fixed clone URL, Node 22 prerequisite, clearer Stage 1/Stage 2 boundaries
  - `ROADMAP.md` — Stage 1.5 validation pack status and Stage 2 Device Shield / Integrity Node direction
  - `docs/STAGE_1_ACADEMIC_SHIELD.md` — tightened bounded-security and misconduct wording
  - `docs/STAGE_1_5_REVIEWER_PACK.md`, `docs/THREAT_MODEL.md`, `docs/VALIDATION.md`, `docs/LIMITATIONS.md`, `docs/STAGE_2_ARCHITECTURE.md`, `docs/RESOURCE_PLAN.md`, `docs/DEMO_SCRIPT.md`, `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/REVIEWER_CHECKLIST.md` — new Stage 1.5 reviewer pack
  - `docs/evidence/stage-1/README.md`, `docs/evidence/stage-1/.gitkeep` — evidence folder rules and placeholder
  - `.github/pull_request_template.md` — PR review checklist
- **Verification:** `npm install` passed with 0 vulnerabilities. `./scripts/check.sh --fix` passed 21/21. Initial `./scripts/check.sh` found one Prettier drift in `docs/STAGE_1_5_REVIEWER_PACK.md`; reran `./scripts/check.sh --fix`, then final `./scripts/check.sh` passed 21/21. `npm test` passed 65/65 tests. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. `git diff --check` passed. Markdown relative link audit passed. README image path audit passed. Secret/privacy/overclaim grep audits found only expected enforcement, test, policy, and historical-log references.
- **Follow-ups:**
  - Push the branch and collect fresh remote CI evidence.
  - Recommended next tag after review: `v0.3.6-stage-1-5-validation-pack`.

### 2026-05-13 (Australia/Sydney) — README API Table Repair

**Raouf:**

- **Scope:** README API reference polish
- **Summary:** Fixed the broken `POST /api/telemetry` API reference table by removing unescaped pipe characters from the table cell and moving the risk response shape into a fenced JSON example. Clarified the allowed `risk_level` values in prose so the Markdown renders cleanly on GitHub.
- **Files Changed:**
  - `README.md` — repaired telemetry API table and response example
- **Verification:** `npm run format:check` passed. `git diff --check` passed. `./scripts/check.sh --quick` passed 11/11; server boot smoke and audit-chain self-test were skipped by quick mode.
- **Follow-ups:** None.

### 2026-05-13 (Australia/Sydney) — Stage 1 Documentation Polish

**Raouf:**

- **Scope:** Stage 1 reviewer documentation
- **Summary:** Replaced the short Stage 1 branch note with the full polished Stage 1 Academic Shield reference document. Added document metadata, a contents section, an explicit threat model, CI-only heading cleanup, exact verification commands, reviewer notes, and consistent section numbering. Kept branch protection documented as a manual follow-up because the saved GitHub branch-protection state was not confirmed.
- **Files Changed:**
  - `docs/STAGE_1_ACADEMIC_SHIELD.md` — full Stage 1 reviewer/reference document with threat model and verification commands
- **Verification:** Initial `./scripts/check.sh` found only Prettier formatting drift in `docs/STAGE_1_ACADEMIC_SHIELD.md`. Ran `npm run format`, synced the uploaded Desktop copy, then reran `./scripts/check.sh` successfully: 21/21 checks passed.
- **Follow-ups:**
  - Enable branch protection on `main` in the GitHub UI if it has not already been saved.

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
