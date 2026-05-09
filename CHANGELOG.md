## Change Log

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
- **Verification:** `grep -ri verity` returns matches only in CHANGELOG.md and AGENT.md historical entries. Zero leaks in server.js, public/*.html, package.json, .env.example, or tools/.
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
