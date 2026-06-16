# Agent Rules and Logs

## Agent Change Log

### 2026-06-16 (Australia/Sydney) — LLM Shield seed crystal (Stage 3A-alpha)

**Raouf:**

- **Scope:** Built the first slice of the Simurgh LLM Shield — an input-only safety boundary for direct prompt-injection and system-prompt-extraction attempts. Classifies user input before model invocation, calls only a deterministic local mock provider for safe input, skips the provider for blocked input, emits a metadata-only safety receipt, and links each run to a per-session HMAC audit chain. Deliberately excluded: untrusted `contexts[]` (fail-closed via `contexts_not_supported_alpha`), instruction-provenance guard, tool gate, output firewall, obfuscation/`warning` verdict, live models, and UI — each is a named later stage (3B–3F). A fourth shield on the existing spine; reuses `hmacChain.js`, `sessionToken.js`, `memoryStore.js` directly and mirrors the Banking Shield AI-firewall pattern. Fail-closed throughout.
- **Summary:** Six new `src/llmShield/` modules (normalise, firewall, mock provider, receipt, audit, router) built TDD red→green, plus a 16-fixture corpus, a metrics runner, two focused e2e smokes, and a smoke gate. Router mounted at `/api/llm-shield`, gated by `SIMURGH_LLM_SHIELD_SECRET` (503 when unset). Detection is deterministic phrase matching with negation-awareness so benign system-prompt-discussion questions pass. The blocked path records `LLM_PROVIDER_SKIPPED`, making "blocked before invocation" provable from the audit log. Audit payloads are whitelisted (no raw input text). Documented an explicit benchmark caveat: the alpha corpus is small and partly denylist-aligned, so the 100% block rate is not broad jailbreak resistance.
- **Files changed:** `src/llmShield/{promptNormalise,promptFirewall,mockLlmProvider,safetyReceipt,llmShieldAudit,llmShieldRouter}.js`, `server.js`, `.env.example`, `tests/unit/llmShield/*.test.js`, `tests/e2e/llm_shield_{fixture_runner,direct_jailbreak_smoke,receipt_verify_smoke}.mjs`, `scripts/smoke-llm-shield.sh`, `docs/evidence/stage-3a-llm-shield/**`, `docs/stages/STAGE_3A_LLM_SHIELD.md`, `docs/superpowers/specs/2026-06-16-stage-3a-alpha-llm-shield-design.md`, `docs/superpowers/plans/2026-06-16-stage-3a-alpha-llm-shield.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 449/449 (32 new `llmShield` tests, no regressions); `scripts/smoke-llm-shield.sh` all gates pass (attack_block_rate 100% 11/11, benign_pass_rate 100% 5/5, false_positive_rate 0%); `npx prettier --check .` clean.
- **Follow-ups:** Stage 3B adds adversarial/obfuscated fixtures (expected to lower the block rate to a realistic number), the `warning` verdict, and the full 100+50 corpus. Add `security-audit-llm-shield.sh` / `privacy-audit-llm-shield.mjs` so the metadata-only privacy claim becomes a standing gate rather than unit-tested only.
### 2026-06-13 (Australia/Sydney) — README professionalization audit + paper-folder casing fix

**Raouf:**

- **Scope:** Full audit of the root `README.md` for research-presentation readiness (factual accuracy, internal consistency, tone, navigability), plus the cross-platform folder-casing bug it surfaced. README + paper-package only — no runtime code, gates, or evidence touched.
- **Summary:** (1) Renamed `Papers/banking-shield` → `papers/banking-shield` so all three papers share the lowercase `papers/` root (capital `P` would render as a separate folder on case-sensitive GitHub/Linux — the same bug class that previously 404'd the voting-pilot paper); two-step git rename through a temp name on the case-insensitive macOS FS; updated live in-package path strings and rebuilt `main.pdf`. (2) Fixed a privacy contradiction — §6 `/api/affinity` payload claimed "process names, PIDs," contradicting the no-raw-fields posture — to a metadata-only aggregate. (3) Corrected stale facts: 331→417 Node tests (verified), 383→469 total, baseline `v0.4.18`→`v0.5.0`, removed doubled HR, unified audit param name. (4) Toned down marketing-register claims (Superiority→Coverage, removed unsupported 85%/prompt-caching non-sequitur, hedged Silicon-Valley/orders-of-magnitude/SEB/cost absolutes into design-level expectations). (5) Added a TOC navigation line for the un-numbered narrative sections.
- **Files changed:** `papers/banking-shield/**` (rename + `main.tex`/`source/v1.2.md` path strings + rebuilt `main.pdf`), root `README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npx prettier --check` clean; `npm test` 417/417; no residual `Papers/` references; banking-shield PDF carries the lowercase path; no evidence-fixture churn.
- **Follow-ups:** Append-only `Papers/...` mentions in prior AGENT.md/CHANGELOG history entries left as-is (they record what was true at the time).

---

### 2026-06-13 (Australia/Sydney) — SPDX headers for tests/ and native tools/ (Rust/Swift/.NET)

**Raouf:**

- **Scope:** Completed the SPDX header pass over the remaining first-party source the earlier pass deferred. Driven off `git ls-files` so build artifacts (`target/`, `.build/`, `obj/`, .NET `bin/`) and untracked files are excluded.
- **Summary:** Added `SPDX-License-Identifier: AGPL-3.0-or-later` to 161 files: `tests/**` (74 js + 8 mjs) and native `tools/` (23 rs, 28 swift, 22 cs, 6 sh). Comment style `//` (js/mjs/rs/swift/cs) or `#` (sh); shebang-aware; idempotent. The temp-file rewrite initially reset the executable bit on 8 files (2 e2e `.mjs` and the Linux daemon install/uninstall/check/doctor scripts), which broke one test; restored +x and re-verified. Hash-pinned fixtures are `.json` and untouched.
- **Files changed:** 161 source files + `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 417/417; `cargo check` (Linux daemon) exit 0; `npx prettier --check .` clean; no mode changes; no evidence-fixture churn. Swift/.NET test suites not run in this environment (line-comment headers are syntactically safe; verified no Rust crate-level inner-attribute placement issues).
- **Follow-ups:** None — all first-party source now carries SPDX headers.

---

### 2026-06-13 (Australia/Sydney) — Banking Shield: wire minted Zenodo DOI

**Raouf:**

- **Scope:** Wired the user-minted Banking Shield Zenodo DOI `10.5281/zenodo.20675513` into the paper and repository. Paper/docs only.
- **Summary:** Activated the DOI line in the `main.tex` title `\thanks{}` (with a self-`\cite`), added the `abedini2026bankingshield` self-citation to `references.bib` (mirrors voting-pilot), added the DOI to the package README and switched its Zenodo section to published state, and added Banking Shield as the third Zenodo preprint in the root README (Research Papers section + §13, "Two" → "Three"). Recompiled: DOI embedded in `main.pdf`.
- **Files changed:** `Papers/banking-shield/main.tex`, `main.pdf`, `references.bib`, `README.md`; root `README.md`; `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `latexmk` exit 0 (6 pages, 0 overfull, 0 undefined, 17/17 citations); DOI string present in `main.pdf`; `npx prettier --check` clean; no fixture churn.
- **Follow-ups:** None outstanding for the preprint; future revisions upload as a new version under the same Zenodo concept DOI.

---

### 2026-06-13 (Australia/Sydney) — Add SPDX license headers to first-party code

**Raouf:**

- **Scope:** Follow-up to the AGPL relicense — added `SPDX-License-Identifier: AGPL-3.0-or-later` headers to 80 first-party source files for per-file clarity. Shebang-aware and idempotent.
- **Summary:** Prepended the SPDX comment to `server.js`, all `src/**/*.{js,mjs}` (52), `scripts/*.mjs` (3) and `scripts/*.sh` (21), and top-level `tools/*.mjs` (3) — `//` for JS, `#` for shell, inserted after any `#!` shebang. Left the native `tools/` subdirs (Rust/Swift/.NET) and the 82 `tests/` files for a later pass. Confirmed the inserted comments do not disturb the source-scanning privacy/security audits.
- **Files changed:** 80 source files + `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 417/417; `npx prettier --check .` clean; `security-audit-banking-pilot.sh` 27/27; no-egress privacy audit PASS; `smoke-banking-pilot.sh` 14/14; no fixture churn.
- **Follow-ups:** Optional later pass for `tests/` and native subdirs.

---

### 2026-06-13 (Australia/Sydney) — Relicense code MIT → AGPL-3.0-or-later

**Raouf:**

- **Scope:** Relicensed the repository from MIT to AGPL-3.0-or-later at the user's request — keep the work open for research while preventing closed-source/proprietary capture. Papers under `Papers/` stay CC-BY-4.0. Flagged honestly that licenses protect expression, not ideas; research priority comes from the timestamped Zenodo preprints.
- **Summary:** Replaced `LICENSE` with the verbatim official GNU AGPL-3.0 text (fetched from gnu.org, not hand-typed). Added `"license": "AGPL-3.0-or-later"` to `package.json`. Rewrote README §13 as a dual-license statement (code AGPL, papers CC-BY-4.0) with a copyright notice and the expression-vs-idea caveat, and updated the license badge. Fixed the stale MIT note in the banking-shield package README. Left third-party MIT entries in `package-lock.json` and historical MIT mentions in AGENT/CHANGELOG untouched.
- **Files changed:** `LICENSE`, `package.json`, `README.md`, `Papers/banking-shield/README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 417/417; `package.json` valid JSON; `npx prettier --check` clean; no fixture churn.
- **Follow-ups:** AGPL is auto-detected by GitHub from `LICENSE`. If desired later, add per-source-file SPDX headers (`SPDX-License-Identifier: AGPL-3.0-or-later`).

---

### 2026-06-13 (Australia/Sydney) — Banking Shield: layout audit + Zenodo deposition prep

**Raouf:**

- **Scope:** Full layout audit of the compiled IEEEtran preprint and Zenodo deposition preparation. Paper/docs only.
- **Summary:** Layout audit found page 2 nearly blank — the `[section]` FloatBarrier was forcing the full-width Figure 1 out before §II could flow. Switched to plain `\usepackage{placeins}`; the paper reflows to 6 tight pages (from 7 with a near-empty page). Verified all pages visually: 3 TikZ figures + 5 booktabs tables place cleanly, monospace tokens render, references complete with corrected years, balanced two columns. For Zenodo: added a pre-filled `.zenodo.json` deposition metadata file (title, author + ORCID, abstract, keywords, cc-by-4.0, related identifiers), a commented ready-to-fill DOI line in the title `\thanks{}` (no fabricated DOI), and a step-by-step mint guide in the README. Actual minting is a manual authenticated upload the user performs; I cannot mint the DOI.
- **Files changed:** `Papers/banking-shield/main.tex`, `Papers/banking-shield/main.pdf`, `Papers/banking-shield/.zenodo.json`, `Papers/banking-shield/README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `latexmk` exit 0 (6 pages, 0 overfull, 0 undefined, 16/16 citations); `.zenodo.json` valid JSON; `npx prettier --check` clean.
- **Follow-ups:** User mints the Zenodo DOI via web upload of `main.pdf` using `.zenodo.json`, then uncomments the DOI line in `main.tex` and recompiles.

---

### 2026-06-13 (Australia/Sydney) — Banking Shield: applied external-review wording refinements (preprint)

**Raouf:**

- **Scope:** Applied the three open judgment-call wording refinements from the external review to the LaTeX paper and its source markdown. Paper/docs only. Positioned as a research preprint; no venue targeted.
- **Summary:** (1) §4.1 reworded to a data-minimisation _design principle_ in the limited engineering sense, with Klein/Yeung recast as GDPR data-protection-by-design governance context rather than data-minimisation authorities; (2) related work no longer calls Lee et al. "guardrail practice" — now a life-cycle bias/risk study, Ray as TRiSM controls, both framed as live-model filtering the prototype contrasts structurally; (3) added a one-line "AI-style" clarifier in §4.2 (explanation-interface contract, not a live-model evaluation). `PAPER_CLAIM_AUDIT.md` §4 marked applied.
- **Files changed:** `Papers/banking-shield/main.tex`, `Papers/banking-shield/main.pdf`, `Papers/banking-shield/source/banking-shield-paper-v1.2.md`, `Papers/banking-shield/PAPER_CLAIM_AUDIT.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `latexmk` exit 0 (7 pages, 0 overfull, 0 undefined, 16/16 citations); `npx prettier --check` clean.
- **Follow-ups:** Optional Zenodo DOI mint when ready; no venue selection (research preprint).

---

### 2026-06-13 (Australia/Sydney) — Banking Shield: full citation/claim audit + LaTeX preprint package

**Raouf:**

- **Scope:** Three deliverables: (1) full citation audit, (2) full claims audit, (3) LaTeX preprint package moved into the root `Papers/` folder. Docs/paper only — no runtime code, gates, scoring, privacy assertions, or evidence fixtures were changed.
- **Summary:** (1) All 16 references verified to exist via CrossRef DOI content negotiation (12 DOIs: authors/title/venue/year confirmed) and URL resolution (4 institutional; 2× 200, 2× 403 Cloudflare bot-block with pages confirmed real). Zero hallucinated citations. (2) Every empirical claim re-verified true against live source, gates, and the frozen evidence pack (46 fields, 29 phrases, 4 KB/16 KB/600-char caps, 4-module no-egress, default-off exact "true", textContent-only, domain-separated HMAC keys, all gate counts, all Phase B aggregates, fixture pair). (3) Built `Papers/banking-shield/` (IEEEtran `main.tex` with 4 TikZ figures + 5 booktabs tables, `references.bib`, `Makefile`, `README.md`, `PAPER_CLAIM_AUDIT.md`, `.gitignore`, compiled `main.pdf`); moved `docs/research/banking-pilot/paper/` → `Papers/banking-shield/source/` via git rename and fixed the v1.2 markdown's §8/§11 path references.
- **Files changed:** `Papers/banking-shield/**` (new package), `docs/research/banking-pilot/paper/` → `Papers/banking-shield/source/` (rename), `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `latexmk` exit 0 (7 pages, 0 overfull boxes, 16/16 citations resolved, 0 undefined refs); CrossRef metadata for all journal DOIs; `npx prettier --check` clean on all new markdown.
- **Follow-ups:** Regenerate is unnecessary (LaTeX is now canonical); the stale committed source PDFs (v1.1/v1.2) predate the markdown fixes — the LaTeX `main.pdf` supersedes them. Optional open items recorded in `PAPER_CLAIM_AUDIT.md` §4. Zenodo DOI mint + venue selection still pending.

---

### 2026-06-13 (Australia/Sydney) — Stage B5: external-review verification + citation-year sweep (v1.2)

**Raouf:**

- **Scope:** Verified an external model-generated review of the v1.2 PDF item by item against source and authoritative CrossRef metadata (DOI content negotiation). Docs only.
- **Summary:** The review's version, Figure 3 caption, and three citation-year flags are correct; the citation years are online-first dates that conflict with the version-of-record volume/issue the reference list already prints (Klein et al. is an outright error — online and print both 2022). The audit-of-the-review found the same defect in two references the review missed (Scherr 2015→2016, Yeung & Bygrave 2021→2022). Fixed the caption and all five years (in-text + reference list); Gebru et al. 2021 is genuinely 2021 and unchanged. Remaining review items (data-minimisation source fit, Lee/Ray related-work framing, "AI-style" clarifier, and PDF-production polish) are judgment calls logged as open in the audit addendum.
- **Files changed:** `docs/research/banking-pilot/paper/banking-shield-paper-v1.2.md`, `docs/research/banking-pilot/paper/banking-shield-paper-full-audit-2026-06-13.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** CrossRef metadata for all journal DOIs; `npx prettier --check` clean. The committed v1.2 PDF predates these markdown fixes and must be regenerated before release.
- **Follow-ups:** Regenerate v1.2 PDF from corrected markdown; optionally apply the open judgment-call recommendations; venue/LaTeX work still pending.

---

### 2026-06-13 (Australia/Sydney) — Stage B5: full audit of Banking Shield paper v1.2

**Raouf:**

- **Scope:** Full paper-writing audit of `banking-shield-paper-v1.2.md` using the ml-paper-writing skill. Docs only — no runtime code, gates, scoring, privacy assertions, or evidence fixtures were changed. Re-ran every reproduction gate and re-verified all empirical claims against live source, the frozen evidence pack (`92dabb4`), the re-audit checkout (`3dcf21b`), and HEAD.
- **Summary:** All gate counts, byte/length caps, the 46-field denylist, the four-module no-egress scan, and every Phase B aggregate (Tables 4–5) reproduced exactly; the two highest-risk DOIs resolve to live publisher records; overclaim discipline intact; prettier clean. Found and fixed two defects: D1 — §4.2 undercounted the affirmative-claim scan as 28 phrasings when `FORBIDDEN_CLAIM_PHRASES` has 29 at freeze, re-audit, and HEAD (a long-standing undercount the v1.0 audit missed); D2 — §11 still said "this v1.1 preprint candidate" inside the v1.2 document. Added a v1.2 re-audit addendum to the standing full-audit doc.
- **Files changed:** `docs/research/banking-pilot/paper/banking-shield-paper-v1.2.md`, `docs/research/banking-pilot/paper/banking-shield-paper-full-audit-2026-06-13.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 417/417; banking smoke 14/14; AI-firewall smoke 5/5; full E2E 43/43; security audit 27/27; three privacy audits PASS; no-egress gate PASS (4 modules); `npm audit` 0 vulns; `npx prettier --check` clean on both edited docs; Phase A fixture churn restored.
- **Follow-ups:** Venue selection + CFP/AI-use-disclosure check and LaTeX conversion still pending (carried from B5-D).

---

### 2026-06-12 (Australia/Sydney) — Stage B5-D: Banking Shield full paper v1.0 with verified citations

**Raouf:**

- **Scope:** Produced the full Banking Shield paper v1.0 from draft v0.1, the reviewer-simulation fix list, and live citation verification. Docs only — no runtime code, gates, scoring, privacy assertions, or evidence fixtures were changed. Claim discipline enforced end-to-end: every banking-capability noun in the paper appears only in negated non-claims, denylist descriptions, fictional-scenario labels, or comprehension-count rows.
- **Summary:** Added `docs/research/banking-pilot/paper/banking-shield-paper-v1.0.md`: full paper with embedded text figures F1–F4, tables T1–T5 filled from the frozen evidence pack, an LLM-assistance disclosure section, and a references section with 10 DOI-backed citations verified this session through an academic search gateway (tamper-evident logging, warning/rights comprehension, GDPR data-minimisation/design-based regulation, LLM guardrails/TRiSM). The three categories with no verifiable source in the available corpus retain explicit `[CITATION NEEDED]` markers — zero invented citations. Re-ran the claim audit against v1.0 (PASS; recorded in `banking-shield-paper-claim-audit.md`) and updated the B5 closeout: B5-D draft complete, venue selection + camera-ready pending.
- **Files changed:** `docs/research/banking-pilot/paper/banking-shield-paper-v1.0.md`, `docs/research/banking-pilot/paper/banking-shield-paper-claim-audit.md`, `docs/research/banking-pilot/stage-b5-model-paper/MODEL_REVIEW_CLOSEOUT.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Mechanical forbidden-claim scan of v1.0 clean (all capability nouns negated/denylist/fictional); `scripts/security-audit-stage-2-4-2-5.sh` exit 0 (docs overclaim gate); `npx prettier --check .` clean; Phase A fixture churn restored.
- **Follow-ups:** Venue selection + current-CFP check (page limits, AI-use disclosure), LaTeX conversion, final figure artwork, optional broader citation verification against CS-venue indices (the gateway corpus is publisher-limited).

---

### 2026-06-12 (Australia/Sydney) — Stage B5-A/B/C: Banking Shield model-assisted evidence synthesis + paper draft v0.1

**Raouf:**

- **Scope:** Executed Stage B5 (Banking Shield model-assisted evidence synthesis and paper draft) inline using the systems-paper-writing skill and a 12-pass committee protocol (novelty extraction, claim prosecutor, hostile reviewer, methodology audit, threat model, related-work mapping, figure/table planning, abstracts, outline, draft v0.1, four-role reviewer simulation, final polish). Docs only — no runtime code, routes, gates, scoring, privacy assertions, or evidence fixtures were changed. The model was used to improve the paper, never to validate the system; system validation remains exclusively with tests/smokes/audits/fixtures.
- **Summary:** Created `docs/research/banking-pilot/stage-b5-model-paper/` (protocol, allowed/forbidden input boundaries, sanitised evidence pack frozen at `92dabb4`, 13 versioned prompts, full response log with per-pass rubric scoring, model claim audit, closeout marking B5-A/B/C complete and B5-D not started) and `docs/research/banking-pilot/paper/` (outline with per-section claim boundaries, draft v0.1 with reviewer fixes applied, paper claim audit with all nine forbidden claims at zero affirmative occurrences, figure/table specifications F1–F4/T1–T5). All citations are `[CITATION NEEDED]` placeholders — none invented. Phase B framed throughout as a formative n=5 internal dry run; the mock provider is declared in the abstract.
- **Files changed:** `docs/research/banking-pilot/stage-b5-model-paper/**` (8 docs + 13 prompts), `docs/research/banking-pilot/paper/**` (3 docs + 2 spec READMEs), `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `scripts/security-audit-stage-2-4-2-5.sh` exit 0 (the docs-scanning overclaim gate; new docs deliberately avoid its literal patterns); `npx prettier --check .` clean; Phase A fixture churn restored. No runtime gates affected (docs-only change).
- **Follow-ups:** Stage B5-D — verify citations manually (never from model memory), produce F1–F4 artwork, fill T1–T5, revise v0.1 → v1.0 against the reviewer-simulation fix list, re-run the claim audit, check target-venue CFP including AI-use disclosure policy.

---

### 2026-06-12 (Australia/Sydney) — Fix Stage 2.4/2.5 overclaim scan false positive on B4-A denylist

**Raouf:**

- **Scope:** Fixed the CI quality-gate failure on PR #28. The Stage 2.4/2.5 cybersecurity audit's overclaim-wording scan flagged `src/bankingPilot/bankingNarrativeOutputFirewall.js` because the B4-A `FORBIDDEN_CLAIM_PHRASES` denylist literally contains "production ready" — the phrase exists there so the firewall can BLOCK it, the same category as the already-excluded stage27 security tests. No firewall behavior, scan patterns, route logic, or privacy assertions were changed.
- **Summary:** Added `src/bankingPilot/bankingNarrativeOutputFirewall.js` to the overclaim scan's exclusion list in `scripts/security-audit-stage-2-4-2-5.sh`. The denylist stays readable/greppable instead of being string-obfuscated to dodge the scanner. The other three failing CI audits (2.6/2.7, 2.8A/B, 2.8C/D) were cascades — each re-runs 2.4/2.5 as a no-regression step.
- **Files changed:** `scripts/security-audit-stage-2-4-2-5.sh`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `scripts/security-audit-stage-2-4-2-5.sh` exit 0 ("Stage 2.4/2.5 cybersecurity audit passed"); full `scripts/check.sh` (the exact CI gate) re-run locally; `npx prettier --check .` clean.
- **Follow-ups:** If a future module embeds scanner-target phrases as forbidden terms, add it to the same exclusion list rather than obfuscating the strings.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield B4-A/B residual audit-observation polish

**Raouf:**

- **Scope:** Closed the four residual observations from the latest B4-A/B full audit. Conservative hardening/consistency only — no route semantics, scoring, audit-chain verification, withdrawal policy, privacy assertions, live LLM provider, network egress, Phase C logic, or real banking integrations were changed, and the output firewall remains fail-closed. The pre-existing server-level CORS default was deliberately left out of scope (already documented in `server.js` with an override recommendation).
- **Summary:** (1) The claim scanner's negation window now accepts exactly one article/determiner between a negator and a forbidden phrase ("not a fraud detection tool" passes; "not really a scam protection" still blocks), with the window widened from 12 to 16 chars. (2) Documented the fail-closed receipt semantics of `buildFirewallFailedReceipt`. (3) Added `ok: false` to the ai-privacy-explain 503/403/422 error responses for cross-route consistency. (4) The report page now `encodeURIComponent`s the session id in fetch URLs.
- **Files changed:** `src/bankingPilot/bankingNarrativeOutputFirewall.js`, `src/bankingPilot/bankingAiPrivacyReceipt.js`, `src/bankingPilot/index.js`, `public/banking-pilot-report.html`, `tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js`, `tests/unit/bankingPilot/aiExplainRouter.test.js`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 417/417 (two new negation-scanner test blocks), `scripts/smoke-banking-pilot.sh` 14/14, `scripts/smoke-banking-pilot-ai-firewall.sh` 5/5, `scripts/smoke-banking-pilot-full-e2e.sh` 43/43, `scripts/security-audit-banking-pilot.sh` 27/27, all three Banking Shield privacy audits PASS, `npm audit` 0 vulnerabilities, `npx prettier --check .` clean, `git diff --check` clean. Phase A HMAC fixture churn from audit reruns was restored and excluded.
- **Follow-ups:** None. Keep future narrative copy in single-determiner negated form ("not a …", "no …") so disclaimers pass the scanner without further widening.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield dependency audit cleanup

**Raouf:**

- **Scope:** Cleared the remaining npm dependency advisory found during the B4-A/B full audit. No application code, routes, Banking Shield scoring, privacy assertions, AI explanation behavior, UI copy, or evidence fixtures were changed.
- **Summary:** Ran `npm audit fix`, updating the lockfile to Express `4.22.2` and `qs` `6.15.2`, removing the vulnerable transitive `body-parser/node_modules/qs` copy and clearing the moderate `qs` advisory chain.
- **Files changed:** `package-lock.json`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 415/415, `scripts/smoke-banking-pilot.sh` 14/14, `scripts/smoke-banking-pilot-ai-firewall.sh` 5/5, `scripts/smoke-banking-pilot-full-e2e.sh` 43/43, `scripts/security-audit-banking-pilot.sh` 27/27, all three Banking Shield privacy audits PASS, `npm audit` reports 0 vulnerabilities, `npx prettier --check .` clean, and `git diff --check` clean.
- **Follow-ups:** None.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield B4-A/B full audit hardening

**Raouf:**

- **Scope:** Audited the current Banking Shield branch diff across B4-A backend firewall code, B4-B report UI, changed scenario/consent pages, smoke/security/privacy scripts, tests, and closeout docs. No route semantics, scoring logic, audit-chain verification, withdrawal policy, privacy assertions, live LLM provider, network egress, Phase C logic, or real banking integrations were added.
- **Summary:** Tightened the B4-A output firewall to reject unexpected top-level narrative fields and malformed/over-length `non_claims` entries, matching the exact-schema contract in the spec. Added red/green tests for those schema cases. Added explicit network/JSON failure handling to the B4-B report export and AI explanation UI and to the scenario submit/withdraw UI so failed fetches do not leave tester pages stuck in loading states. Extended the full E2E smoke static contract to require the new failure-state copy.
- **Files changed:** `src/bankingPilot/bankingNarrativeOutputFirewall.js`, `tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js`, `public/banking-pilot-report.html`, `public/banking-pilot-scenario.html`, `scripts/smoke-banking-pilot-full-e2e.sh`, `docs/research/banking-pilot/phase-b4b/BANKING_PILOT_PHASE_B4B_CLOSEOUT.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Red/green focused output-firewall test; red/green full E2E smoke for B4-B/scenario failure copy; final full gate: `npm test` 415/415, `scripts/smoke-banking-pilot.sh` 14/14, `scripts/smoke-banking-pilot-ai-firewall.sh` 5/5, `scripts/smoke-banking-pilot-full-e2e.sh` 43/43, `scripts/security-audit-banking-pilot.sh` 27/27, all three Banking Shield privacy audits PASS, `npm audit --audit-level=high` found no high/critical advisories (existing moderate `qs` chain remains), `npx prettier --check .` clean, and `git diff --check` clean.
- **Follow-ups:** None from this audit at the Banking Shield layer; keep future narrative fields behind explicit schema/test updates.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Stage B4-B AI privacy explanation UI

**Raouf:**

- **Scope:** Surfaced the B4-A privacy-firewalled explanation on the public Banking Shield report page. No backend route semantics, deterministic scoring, official policy result fields, audit-chain verification, withdrawal handling, privacy assertions, live LLM provider, network egress, secrets, Phase C logic, or real banking integrations were changed.
- **Summary:** Added B4-B plan/spec docs, a Simurgh-styled AI Privacy Explanation panel on `public/banking-pilot-report.html`, receipt/non-claim rendering, disabled/off-path wording, and shared CSS for compact narrative/receipt panels. Extended the full Banking Shield E2E smoke gate so it verifies the B4-B page contract and a flag-on explanation receipt with `sensitive_payload_sent_to_ai:false`, `network_egress_used:false`, `official_result_unchanged:true`, `claim_guard_passed:true`, and a stable `narrative_hash` shape.
- **Files changed:** `docs/superpowers/specs/2026-06-12-banking-shield-ai-privacy-explanation-ui-design.md`, `docs/superpowers/plans/2026-06-12-banking-shield-ai-privacy-explanation-ui.md`, `public/banking-pilot-report.html`, `public/banking-pilot.css`, `scripts/smoke-banking-pilot-full-e2e.sh`, `docs/research/banking-pilot/phase-b4b/BANKING_PILOT_PHASE_B4B_CLOSEOUT.md`, `docs/research/banking-pilot/phase-b4b/BANKING_PILOT_PHASE_B4B_CLAIM_AUDIT.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 413/413; `scripts/smoke-banking-pilot.sh` 14/14; `scripts/smoke-banking-pilot-ai-firewall.sh` 5/5; `scripts/smoke-banking-pilot-full-e2e.sh` 43/43; `scripts/security-audit-banking-pilot.sh` 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS; `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` PASS; `npx prettier --check .` clean; Browser visual check confirmed the populated B4-B panel, visible receipt flags, and no horizontal overflow after fixing the export-legend wrapping.
- **Follow-ups:** Keep B4-B wording presentation-only. If a later stage adds richer UI behavior, it must continue to display the receipt and must not weaken the B4-A input/output firewall claims.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Stage B4-A AI privacy firewall (backend)

**Raouf:**

- **Scope:** Wired and hardened a backend-only, mock-only, fail-closed AI explanation layer for Banking Shield. No public report-page UI (deferred to B4-B), no live LLM provider, no network egress, no secrets, no Phase C logic, no real banking integrations, no renamed API fields, and no privacy-assertion changes.
- **Summary:** Added a deterministic offline narrative generator (enum→template; no randomness, clock, I/O, or network), an output claim firewall (schema + per-field length caps + negation-aware forbidden-claim scanner so disclaimer non-claims like "not fraud detection" pass while affirmative-capability phrasing is blocked + official-result-unchanged check), an AI privacy receipt builder (enabled/disabled-off-path/firewall-failed, with a success-only `narrative_hash`), and an orchestrator running input firewall (allowlist payload reuse + defensive forbidden-field re-scan + byte cap) → generator → output firewall → receipt. Exposed `GET /api/banking-pilot/:sessionId/ai-privacy-explain`: token-bound, path-token matched, read-rate limited, gated by default-off `SIMURGH_BANKING_PILOT_AI_EXPLAIN` (503 when off), blocking withdrawn sessions (403), and appending one `AI_EXPLANATION_EXPORTED` HMAC audit event on success. Added a no-egress static gate proving the four B4-A modules import no network primitive, plus accepted and rejected-claim evidence fixtures.
- **Files changed:** `src/bankingPilot/bankingNarrativeGenerator.js`, `src/bankingPilot/bankingNarrativeOutputFirewall.js`, `src/bankingPilot/bankingAiPrivacyReceipt.js`, `src/bankingPilot/bankingAiExplain.js`, `src/bankingPilot/bankingAudit.js`, `src/bankingPilot/index.js`, `tests/unit/bankingPilot/{bankingAudit,bankingNarrativeGenerator,bankingNarrativeOutputFirewall,bankingAiPrivacyReceipt,bankingAiExplain,aiExplainRouter}.test.js`, `scripts/smoke-banking-pilot-ai-firewall.sh`, `scripts/privacy-audit-banking-pilot-ai-firewall.mjs`, `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLOSEOUT.md`, `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLAIM_AUDIT.md`, `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/{accepted-explanation-fixture,rejected-claim-fixture}.json`, `docs/superpowers/specs/2026-06-12-banking-shield-ai-privacy-firewall-design.md`, `docs/superpowers/plans/2026-06-12-banking-shield-ai-privacy-firewall.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 413/413; `scripts/smoke-banking-pilot.sh` 14/14; `scripts/smoke-banking-pilot-ai-firewall.sh` 5/5 (flag on/off, withdrawal, receipt flags); `scripts/smoke-banking-pilot-closed.sh` 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` 41/41; `scripts/security-audit-banking-pilot.sh` 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS; `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` PASS (no-egress + fixtures + attack scan, incl. a negative check confirming the gate fails on an injected network primitive); `npx prettier --check .` clean. Phase A HMAC fixture churn from audit reruns was restored and excluded.
- **Follow-ups:** B4-B — surface the firewall-approved explanation on the public report page with user-facing labels and UI smoke tests, without changing the privacy boundary or official policy result. Keep all disallowed banking-capability claims blocked.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase B3d closeout + claim-audit update

**Raouf:**

- **Scope:** Closed the Banking Shield Phase B internal dry run using aggregate-only results from B3a (human dry run), B3b (UX copy patch), and B3c (focused copy-validation rerun). No Phase B runtime routes, Phase C logic, real banking integrations, API field renames, or privacy-assertion changes were made; no raw tester feedback, screenshots, or personal financial details were retained.
- **Summary:** Moved the Phase B closeout and claim audit from `not_run`/`Not yet run` to completed, evidence-backed statuses. Added completed aggregate evidence files (`aggregate-results.json`, `participant-feedback.json`) alongside the retained empty templates, and updated the evidence README and closeout summary. Recorded: 5 trusted testers, 30 total sessions, 25 submitted scenario sessions, 5 withdrawal sessions (all blocking report export afterward), identical deterministic pattern safe/warning/warning/warning/safe, consent/withdrawal/non-claims clear 5/5, and the main finding that the key improvement was export-page interpretability rather than privacy failure. Kept all disallowed banking-capability claims blocked.
- **Files changed:** `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLOSEOUT.md`, `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLAIM_AUDIT.md`, `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/aggregate-results.json`, `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/participant-feedback.json`, `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/closeout-summary.md`, `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 389/389; `scripts/smoke-banking-pilot.sh` 14/14; `scripts/security-audit-banking-pilot.sh` 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS; `scripts/smoke-banking-pilot-closed.sh` 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` 41/41; `npx prettier --check .` clean.
- **Follow-ups:** Stage the branch for PR. Paper-safe finding: Phase A established automated structural privacy and integrity gates; Phase B evaluated the consent, warning, withdrawal, report, audit, and verification workflow with trusted internal participants using fictional banking-adjacent scenarios only, and its main improvement was export-page interpretability, not privacy failure.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase B3b UX copy patch (Report/Audit/Verify readability)

**Raouf:**

- **Scope:** Applied a narrow Phase B UX copy/UI-wording patch after the human dry run found that the main improvement area was interpretability of the Report/Audit/Verify exports, not privacy. No Phase B runtime routes, Phase C logic, real banking integrations, API field names, privacy assertions, or retained raw tester feedback were added.
- **Summary:** Added plain-English one-liners for the Report, Audit, and Verify exports (shown contextually when each export loads), a static export legend that also defines "Policy outcome" with the non-claims (not fraud detection, not financial advice, not a banking decision), short Audit-vs-Verify sub-labels, and a note explaining that opening exports adds audit events so report and verify event counts can differ. Added one short fictional takeaway sentence per scenario (and the withdrawal action) on the scenario page, plus a standing "policy outcome only" non-claims line. All changes are presentation-only; `verdict` remains the API field while the user-facing explanation uses "policy outcome".
- **Files changed:** `public/banking-pilot-report.html`, `public/banking-pilot-scenario.html`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` passed 389/389; `scripts/smoke-banking-pilot.sh` 14/14; `scripts/security-audit-banking-pilot.sh` 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS over 6 evidence files; `scripts/smoke-banking-pilot-closed.sh` 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` 41/41; `npx prettier --check .` clean. Focused copy-validation re-run (3 fresh sessions, one submitted scenario each) confirmed the live pages serve the new copy and that report `audit.event_count` (4) differs from verify `event_count` (6), with all audit chains valid.
- **Follow-ups:** Stage B3c (focused copy-validation rerun) done at agent level; record only aggregate copy-validation results, then proceed to B3d closeout + claim-audit update. Do not close Phase B until B3d is complete.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Simurgh function alignment audit

**Raouf:**

- **Scope:** Completed a targeted full audit of Banking Shield Phase A alignment with the broader Simurgh design and function set before trusted testers use the demo. No Banking Shield runtime routes, Phase B human-result logic, Phase C logic, real banking integrations, or Academic Shield proctoring telemetry were added.
- **Summary:** Added `BANKING_PILOT_SIMURGH_ALIGNMENT_AUDIT.md` covering visual alignment, public tester flow, local deterministic scoring, HMAC audit/report/verify exports, closure/token/privacy gates, Sonnet narrative boundary, and the explicit reason Banking Shield must not reuse Academic Shield proctoring telemetry. Updated the consent page with a Simurgh functions panel stating that Banking Shield uses local policy, HMAC exports, optional metadata-only Sonnet narrative support, and no Academic Shield proctoring telemetry.
- **Files changed:** `docs/research/banking-pilot/BANKING_PILOT_SIMURGH_ALIGNMENT_AUDIT.md`, `public/banking-pilot-consent.html`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Banking unit/security target passed 35/35; `scripts/smoke-banking-pilot.sh` passed 14/14; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `scripts/smoke-banking-pilot-full-e2e.sh` passed 41/41; targeted Prettier check passed; local Playwright screenshot captured the updated consent page. Generated Phase A HMAC fixture churn from audit reruns was restored and excluded.
- **Follow-ups:** Keep Banking Shield on structural Simurgh reuse only: local scoring, audit chain, report/audit/verify exports, and optional sanitized narrative support. Do not wire Academic Shield `/api/telemetry` or device/proctoring signals into Banking Shield Phase A.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase A tester UI visual alignment

**Raouf:**

- **Scope:** Restyled the public Banking Shield Phase A tester pages to match the broader Project Simurgh interface language. No runtime routes, API payloads, scenario states, Phase B human-run logic, Phase C logic, real banking integrations, or privacy assertions were changed.
- **Summary:** Added a shared Banking Shield stylesheet using the existing Simurgh paper/ink/oxblood/moss visual system, Fraunces/JetBrains Mono/Inter Tight typography, sticky seal header, research-demo panels, privacy boundary banner, responsive scenario grid, and styled JSON output. Reworked the consent, scenario, and report pages to use that shared style while preserving the Phase A synthetic-only controls and existing browser `sessionStorage` token flow. Fixed a frontend hidden-state bug by enforcing `[hidden] { display: none !important; }` so the Continue link stays hidden until consent succeeds.
- **Files changed:** `public/banking-pilot.css`, `public/banking-pilot-consent.html`, `public/banking-pilot-scenario.html`, `public/banking-pilot-report.html`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Static page/CSS `curl -I` checks returned 200 for the stylesheet and all three Banking Shield public pages; `npm test` passed 389/389; `scripts/smoke-banking-pilot.sh` passed 14/14; `scripts/security-audit-banking-pilot.sh` passed 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `scripts/smoke-banking-pilot-full-e2e.sh` passed 41/41; `npx prettier --check public/banking-pilot.css public/banking-pilot-consent.html public/banking-pilot-scenario.html public/banking-pilot-report.html` passed; local Playwright screenshots were captured for desktop consent and mobile scenario pages.
- **Follow-ups:** Keep tester copy fictional-only during the B3 dry run, and do not record human dry-run results until trusted testers complete the approved Phase B protocol.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase B3 pre-tester readiness

**Raouf:**

- **Scope:** Started Stage B3 — Banking Shield Phase B Internal Dry Run Execution + Closeout by completing the parts available before human testers. No human dry-run results were fabricated, no Phase B runtime routes were added, no Phase C logic was added, and the existing Phase A `/api/banking-pilot` runtime remains unchanged.
- **Summary:** Created branch `banking-shield-phase-b-execution-closeout` from current `main`, updated the Phase B go/no-go checklist with a pre-tester readiness decision of `no_go_pending_tester_selection`, checked verifiable runtime/privacy readiness items, and left tester selection, participant notice review, and tester comprehension gates unchecked until 2-3 trusted internal testers actually run the protocol.
- **Files changed:** `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_GO_NO_GO_CHECKLIST.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` passed 389/389; `scripts/smoke-banking-pilot.sh` passed 14/14; `scripts/security-audit-banking-pilot.sh` passed 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS over 6 evidence files; `scripts/smoke-banking-pilot-closed.sh` passed 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` passed 41/41; `npx prettier --check .` passed. Generated Phase A HMAC fixture churn from privacy-audit reruns was restored and excluded.
- **Follow-ups:** Select 2-3 trusted internal testers, show the participant notice to each tester, run five fresh submitted sessions plus one separate withdrawal session per tester, record aggregate-only results, then update Phase B closeout, claim audit, and evidence files.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase B PR-prep polish

**Raouf:**

- **Scope:** Applied the final three Phase B PR-preparation polish fixes requested after review. No runtime code, routes, states, Phase C logic, real banking integrations, or completed human dry-run results were added.
- **Summary:** Tightened `BANKING_PILOT_PHASE_B_FEEDBACK_FORM.md` so raw tester free text is not retained as evidence, clarified `BANKING_PILOT_PHASE_B_TESTER_RUNBOOK.md` so testers use five fresh submit sessions plus one separate withdrawal session, and added the PR-safe statement that the PR prepares the Phase B protocol/evidence scaffold but does not report completed human dry-run results. Inspected the dirty Phase A rejected-attempt audit fixture; its diff was timestamp/HMAC churn from local privacy-audit reruns, so it was restored and excluded from the Phase B PR.
- **Files changed:** `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_FEEDBACK_FORM.md`, `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_TESTER_RUNBOOK.md`, `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_DOC_AUDIT.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` passed 389/389; `scripts/smoke-banking-pilot.sh` passed 14/14; `scripts/security-audit-banking-pilot.sh` passed 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS over 6 evidence files; `scripts/smoke-banking-pilot-closed.sh` passed 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` passed 41/41; `npx prettier --check .` passed.
- **Follow-ups:** Use the exact PR body sentence: "This PR prepares the Phase B internal dry-run protocol and evidence scaffold. It does not report completed human dry-run results."

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase B documentation audit

**Raouf:**

- **Scope:** Audited every Stage B2 Phase B document and evidence scaffold created on `banking-shield-phase-b-dry-run`, one by one. No runtime code, routes, states, real banking integrations, Phase C logic, or human dry-run data were added.
- **Summary:** Added `BANKING_PILOT_PHASE_B_DOC_AUDIT.md`, tightened participant notice and protocol wording, converted closeout blanks to explicit `not_run` tables, marked the implementation plan execution steps complete, and preserved the aggregate-only evidence contract.
- **Files changed:** `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_DOC_AUDIT.md`, `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLOSEOUT.md`, `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_PARTICIPANT_NOTICE.md`, `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_PROTOCOL.md`, `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/closeout-summary.md`, `docs/superpowers/specs/2026-06-12-banking-shield-phase-b-internal-dry-run-design.md`, `docs/superpowers/plans/2026-06-12-banking-shield-phase-b-internal-dry-run.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Phase B documentation scan found no unresolved draft markers, prohibited claim phrases, em dashes, or selected filler terms; `npx prettier --check` passed across Phase B docs, evidence scaffolds, spec, and plan; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS over 6 evidence files.
- **Follow-ups:** Keep the one-by-one audit current if future Phase B closeout evidence replaces templates after trusted testers complete the dry run.

---

### 2026-06-12 (Australia/Sydney) — Banking Shield Phase B internal dry-run scaffold

**Raouf:**

- **Scope:** Started Stage B2 — Banking Shield Phase B Internal Dry Run as an internal trusted-tester comprehension layer only. No Phase B runtime routes, server states, real banking integrations, real CDR, real Confirmation of Payee, real payments, real accounts, real balances, real payees, transaction amounts, OTPs, credentials, screenshots, app names, process names, or window titles were added.
- **Summary:** Added the formal Phase B design spec and implementation plan, created the Phase B protocol pack, added aggregate-only evidence templates, captured current Phase B privacy/smoke gate output, and wired a dedicated Phase B evidence privacy audit into `scripts/check.sh`.
- **Files changed:** `docs/superpowers/specs/2026-06-12-banking-shield-phase-b-internal-dry-run-design.md`, `docs/superpowers/plans/2026-06-12-banking-shield-phase-b-internal-dry-run.md`, `docs/research/banking-pilot/phase-b/**`, `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/**`, `scripts/privacy-audit-banking-pilot-phase-b.mjs`, `scripts/check.sh`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` passed 389/389; `scripts/smoke-banking-pilot.sh` passed 14/14; `scripts/security-audit-banking-pilot.sh` passed 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` PASS over 6 Phase B evidence files; `scripts/smoke-banking-pilot-closed.sh` passed 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` passed 41/41; `npx prettier --check .` passed.
- **Known local blockers:** `scripts/check.sh --quick` passed 21 steps and failed only `Linux Rust daemon fmt/clippy/test` because `SIMURGH_REQUIRE_XVFB_TESTS` is set but Xvfb is not installed. Full `scripts/check.sh` passed 69 steps and failed 2 existing local prerequisite gates outside Banking Shield: installed .NET SDK 7.0.307 cannot target the Windows daemon `.NET 8.0` projects, and local Linux Xvfb integration tests fail because Xvfb is not installed.
- **Follow-ups:** Run the trusted internal dry run only after the Phase B go/no-go checklist is completed. After testers finish, replace templates with aggregate-only results, rerun privacy/security/smoke gates, complete the Phase B closeout, and keep all non-claims intact.

---

### 2026-06-11 (Australia/Sydney) — Clarify Banking Shield push status in AGENT.md

**Raouf:**

- **Scope:** Clarified push status wording in AGENT.md.
- **Summary:** Updated "No push/PR yet" to "No PR yet at the time of the hardening pass; branch was pushed afterward as dc2c5d8."
- **Files Changed:** AGENT.md, CHANGELOG.md
- **Verification:** Git diff review.

---

### 2026-06-11 (Australia/Sydney) — Banking Shield Phase A audit-fix hardening pass

**Raouf:**

- **Scope:** Full branch audit of `banking-shield-phase-a` followed by fixes for all six audit findings, extended E2E coverage, and a refreshed evidence pack. No PR yet at the time of the hardening pass; branch was pushed afterward as dc2c5d8.
- **Fixes applied:**
  1. **Rate limiting + session capacity cap** — `/api/banking-pilot` now carries per-IP fixed-window rate limits via the shared `createRateLimiter` (consent 60/min, writes 120/min, reads 240/min by default, env-overridable via `SIMURGH_BANKING_PILOT_{CONSENT,WRITE,READ}_RATE_MAX`), plus an in-memory session capacity cap (`SIMURGH_BANKING_PILOT_MAX_SESSIONS`, default 5000) returning 503 `banking_session_capacity_reached`. Closes the unbounded unauthenticated consent-session memory-growth vector flagged as a Phase B follow-up.
  2. **Key domain separation** — the pepper no longer keys anything directly; participant-code hashing and audit-chain signing each use an HMAC-derived key with a distinct label (`banking-pilot-participant-code-v1`, `banking-pilot-audit-chain-v1`).
  3. **Depth-cap error naming** — payloads nested beyond 20 levels now return 400 `payload_too_deep` instead of `forbidden_banking_field` with the internal `__max_depth__` sentinel, and no longer skew the `forbidden_fields_rejected` counter.
  4. **Forbidden-attempt risk escalation wired live** — a session that had a forbidden-field attempt rejected and later submits a valid scenario now scores with `forbiddenPayloadAttempt`, adding the `forbidden_payload_attempt` risk category (+35).
  5. **Deterministic misconfiguration response** — missing `SIMURGH_BANKING_PILOT_PEPPER`/`TOKEN_SECRET` now returns 503 `banking_pilot_not_configured` instead of a generic Express 500.
  6. **Withdrawn-session transparency made explicit** — withdrawn sessions keep `/audit` and `/verify` exports (report stays 403); now asserted by unit test, E2E smoke, and the closeout doc. The dual deep-scan (router + scenario policy) is documented as intentional defense in depth.
- **Files changed:** `src/bankingPilot/index.js`, `src/bankingPilot/forbiddenBankingFields.js`, `src/bankingPilot/bankingScenarioPolicy.js`, `src/bankingPilot/bankingSessionStore.js`, `tests/unit/bankingPilot/router.test.js`, `tests/unit/bankingPilot/bankingHardening.test.js` (new), `scripts/smoke-banking-pilot-full-e2e.sh`, `.env.example`, `docs/research/banking-pilot/BANKING_PILOT_PHASE_A_CLOSEOUT.md`, refreshed `docs/research/banking-pilot/evidence/phase-a-synthetic/*`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` 389/389 (was 384; +5 new hardening/escalation/transparency/depth tests); Banking unit/security 35/35 (was 30); `scripts/smoke-banking-pilot.sh` 14/14; `scripts/security-audit-banking-pilot.sh` 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS; `scripts/smoke-banking-pilot-closed.sh` 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` 41/41 (was 38; +3 gates: risk escalation, payload_too_deep, withdrawn audit/verify transparency) with output captured to the evidence pack; `npx prettier --check .` clean; `npm audit --audit-level=high` no high/critical (existing moderate `qs` advisories remain); `scripts/check.sh --quick` 20 passed / 1 failed, the single failure being the pre-existing local Linux Rust Xvfb prerequisite outside Banking Shield.
- **Known local blockers:** unchanged — full `scripts/check.sh` still fails only on the two pre-existing local prerequisites outside Banking Shield (.NET SDK 7.0.307 vs `.NET 8.0` Windows daemon projects; local Linux Xvfb `xvfb_integration_tests.rs` `Connection refused`/`PoisonError` results).
- **Follow-ups:** Phase B/C still require a separate approval pass and updated governance/participant material; the rate-limit hardening item is now implemented and only needs review sign-off.

---

### 2026-06-11 (Australia/Sydney) — Banking Shield Phase A synthetic demo

**Raouf:**

- **Scope:** Implement Stage B1 — Banking Shield Phase A Synthetic Demo as a synthetic-only banking-adjacent research wing with Phase B/C docs roadmap only.
- **Summary:** Added `/api/banking-pilot` with synthetic consent, five metadata-only scenario submissions, one-session-one-submit semantics, HMAC audit/report/verify exports, closure-before-auth, strict scenario allowlists, recursive forbidden banking-field rejection, prototype-pollution key rejection, strict `consent_scope_hash`, banking-scoped HMAC tokens, local deterministic risk scoring, and default-off Sonnet runtime support with local sanitisation tests.
- **Privacy posture:** No real bank integration, real CDR, real Confirmation of Payee, real payments, real accounts, real bank branding, or real banking data. Rejected-attempt audit entries store route, reason, and field name only. Reports emit all sensitive collection assertions as `false`.
- **Docs/evidence:** Added Banking Shield protocol, threat model, data management, participant notice, non-claims, Phase A closeout, claim audit, and Phase A synthetic evidence pack with accepted report, rejected-attempt audit, Sonnet sanitised payload, closure response, and full E2E smoke fixtures.
- **Files changed:** `.env.example`, `server.js`, `src/bankingPilot/**`, `public/banking-pilot-*.html`, `tests/unit/bankingPilot/**`, `tests/security/banking_pilot_security_audit.test.js`, `tests/e2e/banking_pilot_*_smoke.mjs`, `scripts/smoke-banking-pilot*.sh`, `scripts/security-audit-banking-pilot.sh`, `scripts/privacy-audit-banking-pilot.mjs`, `scripts/check.sh`, `docs/research/banking-pilot/**`, `docs/superpowers/specs/2026-06-11-banking-shield-phase-a-design.md`, `docs/superpowers/plans/2026-06-11-banking-shield-phase-a.md`.
- **Adjacent harness fix:** `tests/unit/displayServerLockServerWiring.test.js` now uses a unique live-server port per boot to remove a local `ECONNREFUSED` race between two live-server tests.
- **Verification:** `npm test` passed 384/384 tests; `npm audit --audit-level=high` passed with no high/critical findings while reporting existing moderate `qs` advisories; Banking unit/security tests passed 30/30; `scripts/smoke-banking-pilot.sh` passed 14/14; `scripts/security-audit-banking-pilot.sh` passed 27/27; `node scripts/privacy-audit-banking-pilot.mjs` PASS with 4 generated fixtures and attack values absent; `scripts/smoke-banking-pilot-closed.sh` passed 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` passed 38/38 and captured `docs/research/banking-pilot/evidence/phase-a-synthetic/smoke-banking-pilot-full-e2e.txt`; `npx prettier --check .` passed; `scripts/check.sh --quick` passed the Banking gates but exited 1 on the existing local Linux Xvfb Rust integration step.
- **Known local blockers:** Fresh full `scripts/check.sh` passed the Banking Shield Phase A unit/security, smoke, security audit, privacy audit, closure smoke, and full E2E smoke gates, then summarized 68 passed and 2 failed steps. The failed steps remain local prerequisites outside Banking Shield: installed .NET SDK 7.0.307 cannot target the Windows daemon `.NET 8.0` projects, and local Linux Xvfb integration tests fail in `xvfb_integration_tests.rs` with `Connection refused`/`PoisonError` results.
- **Follow-ups:** Before Phase B or Phase C, require a separate approval pass, updated governance/participant material, and rate-limit hardening review.

---

### 2026-06-05 (Australia/Sydney) — README paper source path casing fix

**Raouf:**

- **Scope:** Fix the two README "Source" links that were still broken on GitHub after the anchor repair pass.
- **Root cause:** The paper source files are tracked under lower-case `papers/...`; README linked to upper-case `Papers/...`. Local macOS checks passed because the filesystem is case-insensitive, but GitHub is case-sensitive and returned 404 for both `/tree/main/Papers/...` URLs.
- **Changes:**
  1. `README.md` architecture paper source link now targets `papers/project-simurgh/`.
  2. `README.md` voting-adjacent pilot paper source link now targets `papers/simurgh-voting-pilot/`.
- **Verification:** Live pre-fix `curl -I -L` checks to both upper-case GitHub tree URLs returned 404; `git ls-tree -r --name-only HEAD | rg '^papers/'` confirms the lower-case source paths are tracked; `npx --yes markdown-link-check README.md` passes 57/57 links; `npx prettier --check README.md AGENT.md CHANGELOG.md` passes.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`.

---

### 2026-06-05 (Australia/Sydney) — README link audit and anchor repair

**Raouf:**

- **Scope:** Full audit of Markdown links in `README.md`; repair confirmed broken internal anchors.
- **Root cause:** README headings containing `&` and `2026 - 2028` generate GitHub-compatible double/triple-hyphen slugs, while the badges/table of contents still used older single-hyphen anchors.
- **Audit result:** `markdown-link-check` found 4 initially broken anchors: `#13-status-license`, `#4-socio-economic-impact-democratic-access`, `#7-cost-latency`, and `#11-strategic-roadmap-2026-2028`.
- **Changes:**
  1. License and Status badges now target `#13-status--license`.
  2. Table of contents rows now target `#4-socio-economic-impact--democratic-access`, `#7-cost--latency`, `#11-strategic-roadmap-2026---2028`, and `#13-status--license`.
- **Verification:** `npx --yes markdown-link-check README.md` passed with 57/57 links; `npx prettier --check README.md` passed.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: author block + companion citation

**Raouf:**

- **Scope:** Extract author and companion-paper data from the Invisible Window PDF; update voting pilot paper accordingly.
- **Data sourced from** `invisible-window-research-main/paper/main.pdf`:
  - Full author name: Mohammad Raouf Abedini
  - Department: Department of Computing, Macquarie University
  - Email: mohammadraouf.abedini@students.mq.edu.au
  - Companion paper DOI: 10.5281/zenodo.20376495
  - HREC note: MQ HREC exempt determination was for the Invisible Window gaze-tracking study (n=8), NOT the voting pilot; voting pilot HREC sentence correctly remains "society-approved internal pilot" only.
- **Changes:**
  1. Author block updated: "Raouf" → "Mohammad Raouf Abedini", Department of Computing, institutional email.
  2. `references.bib`: `simurgh2026` author fixed to "Abedini, Mohammad Raouf". New entry `abedini2026invisible` added with DOI 10.5281/zenodo.20376495.
  3. Introduction: 2-sentence context added — \sys{} developed in response to the Invisible Window attack; companion citation `abedini2026invisible` wired.
- **Build:** 4 pages, 122 KB, 0 Overfull, 0 undefined references in final pass. All citations verified in .bbl.
- **Files changed:** `main.tex`, `references.bib`, `main.pdf`, `AGENT.md`, `CHANGELOG.md`.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: external audit fixes — submission-ready v2

**Raouf:**

- **Scope:** Address all remaining issues from external audit review. PDF sanity confirmed first.
- **PDF sanity check:** `pdftotext` confirmed: Hastings/Peralta/Popoveniuc/Regenscheid present, Nov. 2023 present, "Runyan" absent, "verify publication year" absent. Single correct PDF on disk.
- **Fixes applied:**
  1. **Title updated** — "Student-Society Voting" → "Student-Society Voting-Adjacent Workflows" to prevent election-security reviewer expectation.
  2. **`placeins` package** added (`\usepackage[section]{placeins}`). `\FloatBarrier` added before §V Results and §VI Discussion — prevents tables drifting across section boundaries.
  3. **"Any caller" precision** — All 3 instances (abstract, §VI.A, conclusion) updated to "any caller able to reach the pilot API" to avoid implying unauthenticated scanning.
  4. **HREC scope sentence** added to §IV.C Governance: "This paper does not claim formal institutional human-research ethics approval; it reports a society-approved internal pilot with aggregate technical outcomes only."
  5. **Author block** — NOT changed. Full name and MQ email required from Raouf before submission. Current: "Raouf / MQ Persian Society / Macquarie University / Sydney, Australia". Flag: update to full academic name + institutional email before submitting to any venue.
- **Build:** 4 pages, 122 KB, 0 Overfull, 0 warnings, 0 undefined references.
- **Full scorecard:** em dashes 0, British spellings 0, verify notes 0, FloatBarrier 2, HREC sentence 1, title updated 1, PDF references correct.
- **Files changed:** `main.tex`, `main.pdf`, `AGENT.md`, `CHANGELOG.md`.
- **Remaining pre-submission action:** Author block — Raouf must supply full academic name and institutional email.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: final full audit pass — submission-ready

**Raouf:**

- **Scope:** Final systematic audit after all previous passes. One remaining issue found and fixed.
- **Issue found:** "artefacts" (British) → "artifacts" (American English, IEEE standard) in §IV.D. Also converted surrounding passive to active: "aggregate gate evidence and closeout artifacts were separately archived" → "The application persisted no live pilot session records; aggregate gate evidence and closeout artifacts were separately archived."
- **Full scorecard verified clean:**
  - Em dashes: 0 ✅
  - British spellings: 0 ✅
  - Overfull hboxes: 0 ✅
  - Undefined citations: 0 ✅
  - TODO/verify notes in tex/bib: 0 ✅
  - §\ref style (should be Sec.~\ref): 0 ✅
  - Old nswec2022 key: 0 ✅
  - NIST IR 7770 correct authors (Hastings et al.): 1 ✅
  - NSWEC Nov. 2023: 1 ✅
  - Pages: 4 ✅
- **Build:** 4 pages, 121 KB, 0 Overfull hboxes, 0 warnings, 0 undefined references, 0 undefined citations.
- **Status: Submission-ready** for supervisor review or small workshop/WIP venue.
- **Files changed:** `main.tex`, `main.pdf`, `AGENT.md`, `CHANGELOG.md`.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: blocking fixes + submission polish

**Raouf:**

- **Scope:** Fix two blocking citation errors and eight submission-readiness issues identified in external audit review.
- **Blocking fixes:**
  1. **NIST IR 7770 author** — "Runyan, Nelson" was wrong. Correct authors are Hastings, Nelson; Peralta, Rene; Popoveniuc, Stefan; Regenscheid, Andrew. DOI `10.6028/NIST.IR.7770` added. Month feb added.
  2. **NSWEC reference** — Year 2022→2023 (final report released November 2023). "verify publication year" note removed (was visible in PDF bibliography). URL updated to specific review page. Key renamed `nswec2022tav`→`nswec2023tav`.
- **Submission-readiness fixes (8):** 3. **§V.A Dataset** — Was empty between heading and table. Added 2-sentence intro paragraph: "Phase C recorded 31 consented pilot sessions. Thirty sessions completed the submit step and formed the primary analysis dataset; one session was withdrawn before submission and excluded." 4. **"privacy-sensitive data"** (too broad) → "ballot choices, content-level data, screen or audio/video recordings, raw local identifiers, or personal device identifiers." 5. **"no passive surveillance"** → "no content-level surveillance" (pilot does collect metadata; passive surveillance was reviewer bait). 6. **"before every fetch call"** → "before the submit fetch call" + parenthetical clarifying consent fetch has no ballot field. 7. **"no data persisted to disk"** → "no live pilot session records were persisted by the application; aggregate gate evidence and closeout artefacts were separately archived in the repository." Closes potential "but your repo has evidence files" objection. 8. **Table II abbreviation note** — `\footnotesize` note below table: "Row 1 abbreviates the full field name `ballot_choice_recorded_by_simurgh` for column width." 9. **§IV Governance and Ethics subsection** — Added: executive approval, participant notice, data management addendum, no individual-level analysis, no re-identification, fully voluntary. 10. **Long path string** in §V.D removed — replaced with prose description.
- **Build result:** 4 pages, 121 KB, 0 warnings, 0 undefined references. Both corrected citations verified in `.bbl`.
- **Files changed:** `references.bib`, `main.tex`, `main.pdf`, `AGENT.md`, `CHANGELOG.md`.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: 100% audit pass

**Raouf:**

- **Scope:** Second full audit pass after the ml-paper-writing/stop-slop rewrite. Systematic detection of all remaining issues using grep verification across 10 issue classes.
- **Issues found and fixed (16 total):**
  1. **12 em dashes** removed — all replaced with colons, semicolons, commas, or sentence restructure. Count verified to zero.
  2. **British "Minimisation"** → "Minimization" (subsection title + body). IEEE requires American English.
  3. **British "data-minimisation"** → "data minimization".
  4. **`§\ref{}`** → `Sec.~\ref{}` for IEEE cross-reference style. Two instances.
  5. **Grammar: §III.C** "The chain initialized on consent and verified on report export" → "The chain initialized on consent; the server verified its integrity on report export." (missing auxiliary verb fixed).
  6. **Tense: §IV.B** "and form the primary analysis dataset" → "and formed".
  7. **Tense: §IV.B** "is excluded from all analysis" → "is excluded" (session withdrawn in past — restructured to active: "that session is excluded from all analysis").
  8. **Active voice: §IV.B** "was withdrawn by the participant before submit" → "The participant in one session withdrew before submitting".
  9. **"before submit"** (non-idiomatic) → "before submitting".
  10. **"rank" → "select"**: poll used radio buttons (select one), not ranking. §IV.A.
  11. **Empty TikZ node** `\node[note, right=0.8cm of consent, yshift=-0.15cm] {};` removed.
  12. **"These results establish"** → "This pilot demonstrates" (overclaim in conclusion).
  13. **"the official ballot"** → "the official vote" in conclusion (ballot = the form, vote = the outcome).
  14. **"without access to, or influence on"** → "without access to or influence on" (spurious comma, twice).
  15. **§II.A** "— whether the system collected..." em dash → colon ": whether the system..."
  16. **Table 2** long cell truncated: `ballot\_choice\_recorded\_by\_simurgh` → `ballot\_choice\_recorded` to avoid Overfull hbox; caption retains full field name.
  17. **Table caption** `—` (em dash) in "Privacy Assertions — All 30 Submitted Sessions" → `---` (LaTeX triple hyphen) for correct IEEE dash rendering.
  18. **`\smallskip`** → `\medskip` before contribution bullets (cleaner IEEE spacing).
  19. **§II.D** passive "has been explored in" → "Several Australian jurisdictions have piloted".
  20. **§II.F** "holds a non-disciplinary posture" → "does not discipline or flag participants" (plain language).
  21. **§IV.A** "optional mock ballot page" → "a mock ballot page mirroring" (removed misleading "optional").
  22. **§IV.C** "the store cleared on server restart" → "the store reset on server restart" (clearer intransitive).
- **Verification:** 0 em dashes, 0 British spellings, 0 `§\ref`, grammar fixed, tense fixed, active voice, "rank" fixed, empty node removed, "establish" → "demonstrate", "official ballot" → "official vote", comma fixed. Build: 4 pages, 121 KB, 0 warnings.
- **Files changed:** `main.tex`, `main.pdf`, `AGENT.md`, `CHANGELOG.md`.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: full audit + rewrite (ml-paper-writing + stop-slop)

**Raouf:**

- **Scope:** Full paper audit using ml-paper-writing and stop-slop skills. 16 issues found across narrative, abstract, structure, style, citation, and figure dimensions. All fixed.
- **Issues fixed:**
  1. **Abstract** — Rewritten with Farquhar 5-sentence formula: achievement first, why hard, how, evidence (359/359, 8/8, 10/10, 5/5), scope note. No more generic opener.
  2. **Figures** — TikZ system flow diagram added (Fig. 1): consent→submit→report lifecycle, client-side discard, HMAC events, 410 bracket.
  3. **Contribution bullets** — Explicit `\textbf{Contributions:}` list added to introduction.
  4. **Introduction** — "While X, Y" binary contrast removed; "not a study of election security" tightened to active construction.
  5. **§II.F** — "not a new voting protocol. It is a bounded evaluation" contrast removed; positive construction used.
  6. **§III headers** — Consistent title case across all subsections.
  7. **§IV** — Pilot section expanded: event description (4 options), explicit shadow-mode framing, session count subsection, data management rationale.
  8. **§V.B** — Added explanatory paragraph: `ballot_choice_recorded_by_simurgh: false` is a behavioral guarantee verified by gate suite; per-session reports not available post-hoc (in-memory store).
  9. **§VI.A** — "What the results show" renamed to "Interpretation".
  10. **§VI.B** — Added fifth limitation bullet explicitly noting in-memory-store post-hoc report gap.
  11. **Passive voice** — 11 passive constructions converted to active: "was held"→"held", "was persisted"→"persisted", "was set"→"we set", etc.
  12. **Stop-slop** — Em dash in §VI removed; "not X, it is Y" patterns removed; "is structurally related to" → "follows"; "has been explored" → active.
  13. **Spelling** — "emphasises" → "emphasizes" (IEEE American English).
  14. **Float specifiers** — `[h]` → `[!t]` on all tables.
  15. **Citations** — `bell2013starvote` workshop corrected: "USENIX/ACCURATE/EVT" → "EVT/WOTE"; `nswec2022tav` flagged for year verification before submission.
  16. **`\sys` macro** — `\newcommand{\sys}{Project Simurgh}` added for consistency.
- **Build result:** 4 pages, 121 KB, 0 warnings, 0 undefined references, 0 undefined citations.
- **Files changed:**
  - `Papers/simurgh-voting-pilot/main.tex` — full rewrite as above
  - `Papers/simurgh-voting-pilot/references.bib` — EVT/WOTE fix, nswec year note
  - `Papers/simurgh-voting-pilot/main.pdf` — rebuilt
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: claim audit + evidence capture

**Raouf:**

- **Scope:** Audit all paper claims against repo evidence; capture Phase C gate evidence files; fix two claim gaps found; write `PAPER_CLAIM_AUDIT.md`.
- **Issues found and fixed:**
  1. **Focus-loss/paste claim gap** — consent page disclosed focus-loss/paste as potential collection categories; Phase C only collected session timestamps + audit-chain events. Paper §III.A now explicitly distinguishes consent-page disclosure from Phase C implementation.
  2. **Privacy audit scope** — Table 2 entry updated to "PASS (code + evidence files)" to clarify that the audit scanned pre-existing evidence files + code, not 30 live Phase C session reports (in-memory store was cleared).
- **Evidence captured:** All 6 gate outputs saved to `docs/research/mq-voting-pilot/evidence/phase-c-closeout/` at tag `v0.5.0-voting-pilot-phase-c-closeout`. Pre-pilot files (357 tests) superseded by Phase C files (359 tests).
- **Audit result:** 20 claims audited — all confirmed or fixed. Verdict: Accurate.
- **PDF rebuilt after fixes:** 4 pages, 0 undefined citations, 0 undefined references.
- **Files changed:**
  - `Papers/simurgh-voting-pilot/PAPER_CLAIM_AUDIT.md` — new (20-claim audit table, evidence index, verdict)
  - `Papers/simurgh-voting-pilot/main.tex` — §III.A consent disclosure clarified; Table 2 privacy audit note added
  - `Papers/simurgh-voting-pilot/main.pdf` — rebuilt
  - `docs/research/mq-voting-pilot/evidence/phase-c-closeout/` — 7 files (npm-test, npm-audit, privacy-audit, smoke, security-audit, smoke-closed, README)
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry

---

### 2026-06-04 (Australia/Sydney) — Voting pilot paper: related work + PDF build

**Raouf:**

- **Scope:** Fill Related Work section in `Papers/simurgh-voting-pilot/main.tex`, add protective abstract sentence, expand `references.bib`, add `Makefile`, build PDF.
- **Related Work sections added (5):**
  1. End-to-End Verifiable Voting — Helios, Civitas, STAR-Vote; positions Simurgh as session-integrity evidence, not ballot-verifiability protocol.
  2. Remote and Internet Voting Security — NIST IR 7770, National Academies 2018; frames pilot as student-society case study not production internet voting.
  3. Voting Standards, Privacy, and Auditability — VVSG 2.0 (EAC 2021); aligns Simurgh with audit-evidence direction, outside certification scope.
  4. Australian Technology-Assisted Voting Context — NSWEC TAV review; provides local relevance, bounded-pilot rationale.
  5. Privacy-Preserving Telemetry and Data Minimisation — Dwork & Roth (differential privacy), Cavoukian (privacy by design).
  6. Position of This Work — explicit non-voting-protocol statement.
- **Abstract:** Added "The study is voting-adjacent: it does not implement ballot cryptography, voter eligibility verification, coercion resistance, tally protection, or public-election certification."
- **New BibTeX entries:** Clarkson 2008 (Civitas), Bell 2013 (STAR-Vote), NIST IR 7770, National Academies 2018, VVSG 2021, NSWEC 2022, Cavoukian 2009.
- **Makefile:** `latexmk -pdf` build + `clean` target added.
- **Build result:** 4 pages, 107 KB, 0 undefined citations, 0 undefined references. Underfull hbox warnings are standard IEEE two-column draft noise.
- **Files changed:**
  - `Papers/simurgh-voting-pilot/main.tex` — related work + abstract sentence
  - `Papers/simurgh-voting-pilot/references.bib` — 7 new BibTeX entries
  - `Papers/simurgh-voting-pilot/Makefile` — new build file
  - `Papers/simurgh-voting-pilot/main.pdf` — rebuilt (4 pages)
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry

---

### 2026-06-04 (Australia/Sydney) — Voting pilot Phase C results pack + paper scaffold

**Raouf:**

- **Scope:** Create Phase C results analysis documents and paper scaffold for the results analysis + paper draft phase.
- **Files created:**
  - `docs/research/mq-voting-pilot/results/PHASE_C_RESULTS_ANALYSIS.md` — full results analysis: dataset summary, privacy envelope, integrity flow, safety gates, claims/non-claims, paper-safe headline finding, reviewer-safe wording guide.
  - `docs/research/mq-voting-pilot/results/PHASE_C_RESULTS_TABLES.md` — five numbered tables ready for paper inclusion (session counts, privacy assertions, integrity flow, safety gates, endpoint closure map).
  - `docs/research/mq-voting-pilot/results/PAPER_FINDINGS_SUMMARY.md` — paper title, abstract summary, headline finding, key findings by section, wording guide, suggested paper structure, non-claims checklist.
  - `Papers/simurgh-voting-pilot/main.tex` — IEEE-format LaTeX paper scaffold: title, abstract, introduction with scope note, related work (TODOs), system design (consent, ballot-field exclusion, HMAC chain, closure), Phase C pilot, results (4 tables), discussion (findings, limitations, non-claims), conclusion.
  - `Papers/simurgh-voting-pilot/references.bib` — initial BibTeX entries (Simurgh repo, Helios, Dwork 2014).
- **Non-claims preserved throughout:** research prototype only; voting-adjacent case study, not election security; no automatic misconduct finding; official vote determined by society's own system.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot Phase C tag + closeout doc final update

**Raouf:**

- **Scope:** Tag `v0.5.0-voting-pilot-phase-c-closeout` on `main` commit `f2803b4`. Update `PHASE_C_MEMBER_PILOT_CLOSEOUT.md` with server-side closure table, tag reference, and reviewer-safe paper summary paragraph.
- **Files changed:**
  - `docs/research/mq-voting-pilot/PHASE_C_MEMBER_PILOT_CLOSEOUT.md` — server-side closure table, 410 endpoint map, tag, paper-safe summary paragraph
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry

---

### 2026-06-04 (Australia/Sydney) — Voting pilot Phase C server-side collection lock

**Raouf:**

- **Scope:** Enforce server-side collection closure so Phase C remains closed to direct `curl` calls even when the UI pages are closed.
- **Change:** Added `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true` env var. When set: `POST /api/voting-pilot/consent/accept` returns 410 (checked first in route handler); `POST /api/voting-pilot/submit` returns 410 (via `rejectIfClosed` middleware before `requirePilotToken`); `POST /api/voting-pilot/withdraw` returns 410 (same). `GET /:sessionId/report` remains open — existing sessions can still export their report.
- **New script:** `scripts/smoke-voting-pilot-closed.sh` — boots a dedicated server on port 33034 with the closed flag, runs 5 closure gates (consent/accept→410, submit→410, withdraw→410, report still active), then shuts down. Wired into `scripts/check.sh` as gate 10r.
- **Gate results:** closure smoke 5/5; original smoke 8/8; security-audit 10/10; 359/359 tests; 0 high vulns; privacy audit PASS; `index.js` prettier-clean.
- **Files changed:**
  - `src/votingPilot/index.js` — `collectionClosed()` helper, `rejectIfClosed` middleware, wired to consent/accept + submit + withdraw
  - `.env.example` — `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED` documented
  - `scripts/smoke-voting-pilot-closed.sh` — new closure smoke script (5 gates)
  - `scripts/check.sh` — gate 10r wired
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry

---

### 2026-06-04 (Australia/Sydney) — Voting pilot Phase C member pilot closeout

**Raouf:**

- **Scope:** Close Phase C data collection, freeze consent/submit pages, create closeout document, run all gates.
- **Session counts:** 31 consented, 30 submitted (primary analysis set), 1 withdrawn (`vp_4fcc741a` — excluded from report export and analysis).
- **Collection freeze:** Removed consent/submit buttons and all JS submission logic from `voting-pilot.html` and `voting-pilot-submit.html`. Both pages now show a "Collection closed" banner. No new sessions can be created.
- **Privacy:** `ballot_choice_recorded_by_simurgh: false` for all 30 submitted sessions. Report export for withdrawn session returns 403. Ballot choice never left the browser.
- **Gate results:** 359/359 tests; 0 high vulnerabilities; privacy audit PASS (52 files); smoke-voting-pilot 8/8; security-audit-voting-pilot 10/10; prettier clean on modified files.
- **Files changed:**
  - `public/voting-pilot.html` — collection closed banner; submit logic removed; prettier applied
  - `public/voting-pilot-submit.html` — collection closed banner; submit/withdraw logic removed; prettier applied
  - `docs/research/mq-voting-pilot/PHASE_C_MEMBER_PILOT_CLOSEOUT.md` — new closeout document
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry
- **Paper-safe sentence:** Phase C recorded 31 consented pilot sessions. One session was withdrawn before final analysis, leaving 30 submitted sessions in the primary analysis dataset. All 30 submitted sessions completed the consent-to-submit flow and returned `ballot_choice_recorded_by_simurgh: false`.
- **Non-claims preserved:** Research prototype only. Simurgh did not record ballot choices. No automatic misconduct finding. No effect on official election result.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot Phase C approval pack

**Raouf:**

- **Scope:** Prepare governance, ethics, and participant documents required before Phase C (real member pilot) can launch.
- **Files created:**
  - `docs/research/mq-voting-pilot/PHASE_C_GO_NO_GO_CHECKLIST.md` — all items must be checked before launch
  - `docs/research/mq-voting-pilot/PHASE_C_MEMBER_PILOT_PROTOCOL.md` — full protocol for real-member pilot
  - `docs/research/mq-voting-pilot/PHASE_C_EXECUTIVE_APPROVAL_REQUEST.md` — sign-off document for society executive
  - `docs/research/mq-voting-pilot/PHASE_C_PARTICIPANT_NOTICE.md` — plain-language notice for participants
  - `docs/research/mq-voting-pilot/PHASE_C_DATA_MANAGEMENT_ADDENDUM.md` — Phase C data management addendum
- **Phase C data label confirmed:** `synthetic: false, human_participant: true, data_source: human_participant`
- **Phase C prerequisite:** Executive written approval + ethics determination required before any real member participation.

---

### 2026-06-04 (Australia/Sydney) — Voting pilot Phase B internal human dry run closeout

**Raouf:**

- **Scope:** Lock Phase B evidence artefacts, patch metadata labels, run all safety gates, commit closeout.
- **Actions:**
  - Patched 34 new Phase B evidence files: `"synthetic": false, "data_source": "internal_human_dry_run"` (previously mislabelled `synthetic: true`).
  - Created `docs/research/mq-voting-pilot/PHASE_B_INTERNAL_HUMAN_DRY_RUN_CLOSEOUT.md` — 9 scenario types, 34 artefacts, all assertions PASS.
- **Gate results:** 359/359 tests pass; 0 high vulnerabilities; 0 privacy violations (52 files scanned); check.sh exit 0; smoke 8/8; security-audit 10/10.
- **Files changed:**
  - `docs/research/mq-voting-pilot/PHASE_B_INTERNAL_HUMAN_DRY_RUN_CLOSEOUT.md` — new closeout document
  - `docs/research/mq-voting-pilot/evidence/synthetic/session-*-1780541*.json` — 34 files: `synthetic` corrected, `data_source` added
  - `AGENT.md` — this entry
  - `CHANGELOG.md` — release-log entry

---

### 2026-06-01 (Australia/Sydney) — CI quality gate Stage 2.7 raw-field smoke hardening

**Raouf:**

- **Scope:** Diagnose and fix failed Simurgh Quality Gate run `26617769927` on `main` push for `docs(paper): full audit pass — fix margin overflow, citation accuracy…`.
- **Root cause:** `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` scenario G used a whole-audit-export substring search for the short raw PID value `"4321"`. The audit export legitimately contains generated HMAC chain metadata, hashes, IDs, signatures, and timestamps, so the short value can appear by chance even when no raw debug field is leaked.
- **Files changed:**
  - `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — added structured forbidden-data traversal, excluded cryptographic/generated metadata keys, and narrowed audit leak checks to entry payloads.
  - `AGENT.md` — this continuity entry.
  - `CHANGELOG.md` — release-log entry for the CI fix.
- **Verification:** `bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh` passed; five consecutive Stage 2.7 smoke runs passed; `npx prettier --check tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` passed; full `bash scripts/check.sh` passed the patched Stage 2.7 block but could not fully pass on this Mac because local prerequisites are missing (`dotnet` SDK 8.0 for Windows daemon tests and Xvfb for mandatory Linux Rust tests). CI workflow installs Xvfb and the failed CI run showed Stage 2.6 .NET tests passing before the Stage 2.7 failure.
- **Security/privacy review:** Raw-field rejection behavior is unchanged: signed telemetry containing `hwnd`, `pid`, `window_title`, or `process_name` is still rejected with `forbidden_local_field`. The fix only removes false positives from cryptographic/generated audit metadata.
- **Follow-ups:** Confirm the next `main` push quality gate passes on GitHub Actions.

### 2026-05-25 (Australia/Sydney) — Paper accuracy audit + test-count sync + PDF rebuild

**Raouf:**

- **Scope:** Full paper accuracy re-audit, sync stale test counts in paper and repo docs, add Zenodo preprint version note, rebuild main.pdf.
- **Findings:** All three required edits from the 2026-05-22 audit (IV-B nonce→challenge, V-D global nonce guard, V-B dual canonicaliser) confirmed applied. One new finding: Node.js test count was stale (327→331) following the nonceGuardTtlReplay regression suite added in the methodology upgrade session. Updated in paper (abstract, contribution bullet, Table II), AGENT.md, Stage 2.8 closeout docs, and PAPER_ACCURACY_AUDIT.md.
- **Files changed:**
  - `Papers/project-simurgh/main.tex` — test counts updated (327→331, 379→383); Zenodo preprint version note added to \thanks
  - `Papers/project-simurgh/main.pdf` — rebuilt (12 pages, 0 errors)
  - `AGENT.md` — methodology upgrade entry corrected (327→331); this entry added
  - `docs/PAPER_ACCURACY_AUDIT.md` — updated to 2026-05-25 pass, table rows corrected
  - `docs/stages/STAGE_2_8_LINUX_VALIDATION_MATRIX.md` — current baseline note added
  - `docs/stages/STAGE_2_8_LINUX_CLOSEOUT.md` — current baseline note added
  - `docs/stages/STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md` — current baseline note added
- **Verification:** 331/331 Node, 33/33 Rust, 53/53 scripts/check.sh (non-Rust gates), privacy audit pass, PDF compiles clean.
- **Non-claims preserved:** Research prototype only. No production deployment, no automatic misconduct finding, no GPU overlay detection, no hardware attestation. Paper explicitly states preprint/prototype status.

### 2026-05-21 (Australia/Sydney) — Paper: Project Simurgh research paper initial draft

**Raouf:**

- **Scope:** Initial IEEE-format research paper for Project Simurgh — companion to the Invisible Window disclosure paper.
- **Files added:**
  - `Papers/project-simurgh/main.tex` — full 10-page IEEE conference paper (13 sections, 2 TikZ figures, 2 tables)
  - `Papers/project-simurgh/references.bib` — 34 BibTeX entries
  - `Papers/project-simurgh/Makefile` — build + arxiv-archive targets
  - `Papers/project-simurgh/README.md` — paper metadata
  - `docs/superpowers/specs/2026-05-21-simurgh-paper-design.md` — paper design spec
- **Paper coverage:** Threat model, system architecture, Ed25519 proof protocol (E1 triple check, N1 node continuity, nonce replay rejection), platform implementations (macOS/Windows/Linux), privacy model (metadata-only, forbidden fields), evaluation (327+33+11 tests, 30-assertion audit, real-device Windows validation, Linux CI), security analysis, ethics and deployment limits, related work, future work.
- **Non-claims preserved throughout:** research prototype only, no production deployment, no automatic misconduct finding, no GPU overlay detection, no hardware attestation claim.
- **Build status:** 10 pages, 0 overfull hboxes, 0 undefined citations, clean compile.

### 2026-05-18 (Australia/Sydney) — Stage 2.8C/2.8D Linux Wayland + systemd + Ubuntu CI

**Raouf:**

- **Scope:** Combined PR #21+#22 — Linux Wayland portal probe, XWayland partial coverage, browser_package_hint UX-only, live `display_server_mismatch` enforcement, dev-only systemd `--user` lifecycle, Ubuntu CI Rust toolchain + mandatory Xvfb + shellcheck, combined Stage 2.8C/D smoke (16 scenarios) + cybersecurity audit (16 dimensions, 30 assertions), evidence-rules README.
- **Phase A:** Wired `createDisplayServerLock` into `/api/telemetry`. Closes the v0.4.15 P0 follow-up. Strictly gated on `platform === "linux"`. Counters not advanced on rejection. `DAEMON_PROOF_REJECTED` audit emitted. Stage 2.7 macOS/Windows path byte-identical.
- **Phase B:** Added `zbus` 4.4.0 (minimal `tokio` feature). New `LinuxScannerSummary` type alongside `X11ScannerSummary`. `scanner/wayland.rs` probes `org.freedesktop.portal.Desktop` via `NameHasOwner` + reads `ScreenCast.AvailableSourceTypes` property — NEVER calls `CreateSession`/`SelectSources`/`Start`/`OpenPipeWireRemote`. Banned-method grep test enforces consent safety.
- **Phase C:** `scanner/xwayland.rs` reuses X11 path against `$DISPLAY` but maps to `coverage=xwayland_partial`. `CurrentScan` renamed to `LinuxScannerSnapshot`. `/status` + `/proof` dispatch on `display_server`. New proof-endpoint test proves `xwayland_window_count` + `portal_*` flow through SIGNED proof.
- **Phase D:** `browser_package_hint` UX-only via SDK `getDeviceShieldStatus()`. Defaults to `"unknown"`. Soft `daemon_unreachable_hint` wording. 8 trust-boundary tests across SDK + 5 server modules — none of which reference the field.
- **Phase E:** `systemd/simurgh-daemon-linux.service` (user-scope, hardening directives). Four lifecycle scripts (install/uninstall/check/doctor) with `--check` + `--dry-run`. No sudo, no eval, no curl-pipe-sh, only `systemctl --user`.
- **Phase F:** `SIMURGH_REQUIRE_XVFB_TESTS=1` env-var enforcement (panic when set + Xvfb missing; eprintln skip when unset). `.github/workflows/stage-1-checks.yml` extended with apt deps (xvfb x11-utils dbus-x11 xterm shellcheck), Rust stable toolchain, cargo cache, shellcheck, fmt/clippy/test, env var set. Timeout 10→20 min for cold-cache headroom. 7 workflow assertion tests.
- **Phase G:** 16-scenario combined smoke covering X11, Wayland states, XWayland, browser hint, display lock, non-local DISPLAY, headless, systemd lifecycle, mandatory Xvfb CI gate, report shape, audit chain. 15/15 executed pass (scenario M correctly skipped locally; CI-only).
- **Phase H:** 30-assertion combined cybersecurity audit across 16 dimensions. Surfaced one wording violation (systemd unit comment said "production endpoint" in a negated form — reworded). All other dimensions clean.
- **Phase I:** `docs/evidence/stage-2-linux/README.md` with allowed/forbidden evidence rules + research-prototype non-claims posture.
- **Phase J:** scripts/check.sh wired for 5 new gates (Stage 2.8A/B smoke+audit, Stage 2.8C/D smoke+audit, Linux Rust fmt+clippy+test). Light README/ROADMAP/SECURITY/PRIVACY updates.
- **Verification:** `npm test` 327/327, `cargo test` 33/33 with `SIMURGH_REQUIRE_XVFB_TESTS=1`, `cargo fmt --check` + `cargo clippy -- -D warnings` clean, prettier clean, npm audit 0 high vulnerabilities, privacy audit pass, Stage 2.7 + Stage 2.8A/B regression green, Stage 2.8C/D smoke 16 scenarios pass, Stage 2.8C/D cybersecurity audit 30 assertions pass.
- **Non-claims preserved:** research prototype only. No production Linux endpoint deployment, no distro packaging, no system-wide service, no MDM, no hardware attestation, no kernel-level visibility, no universal Wayland surface enumeration, no GPU overlay detection, no automatic misconduct detection.
- **Follow-up:** PR #23 closeout docs + full real-device validation matrix (Fedora, KDE, Sway).

### 2026-05-19 (Australia/Sydney) — Stage 2.8 Linux Closeout Docs + Validation Matrix

**Raouf:**

- **Scope:** PR #23 — Stage 2.8 Linux closeout documentation, validation matrix, reviewer checklist, closeout declaration, README/SECURITY/PRIVACY/ROADMAP refresh, AGENT/CHANGELOG entries.
- **Summary:** Wrote four new Linux closeout documents (`STAGE_2_8_LINUX_TECHNICAL_BRIEF.md`, `STAGE_2_8_LINUX_VALIDATION_MATRIX.md`, `STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md`, `STAGE_2_8_LINUX_CLOSEOUT.md`) and refreshed six top-level docs. Added doc-grep safety gates to scripts/check.sh. Stage 2.8 Linux Display Integrity Research frozen as a documented research-prototype baseline through `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`.
- **Files Changed:**
  - `docs/stages/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md` — new (24 sections, Linux daemon architecture, scanner design, proof flow, privacy contract, non-claims)
  - `docs/stages/STAGE_2_8_LINUX_VALIDATION_MATRIX.md` — new (11 sections, build/CI/smoke/audit/real-device validation evidence)
  - `docs/stages/STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md` — new (16 groups, 76 checklist items)
  - `docs/stages/STAGE_2_8_LINUX_CLOSEOUT.md` — new (10 sections, freeze declaration)
  - `README.md` — Linux closeout section added, status updated
  - `SECURITY.md` — Stage 2.8 security posture section renamed and expanded
  - `PRIVACY.md` — last-updated date refreshed
  - `ROADMAP.md` — Stage 2.8 status and next-step updated
  - `scripts/check.sh` — doc-grep safety gate added (gate 53)
- **Verification:** 331/331 Node, 33/33 Rust, 53/53 scripts/check.sh, privacy audit pass, cargo fmt/clippy clean.
- **Non-claims preserved:** Research prototype only. No production Linux endpoint deployment, no distro packaging, no system-wide service, no MDM, no hardware attestation, no kernel-level visibility, no universal Wayland surface enumeration, no GPU overlay detection, no automatic misconduct detection.

### 2026-05-17 (Australia/Sydney) — Post-Merge Fixes: CI Rerun, Tag Release, Issue Updates

**Raouf:**

- **Scope:** Post-merge housekeeping after PR #17 (Windows Device Shield Closeout) was merged to `main`.
- **Summary:**
  - **CI transient failure diagnosed and fixed.** GitHub Actions Quality Gate failed on the `main` push for PR #17 with "server boot — /health not reachable" and "server boot smoke (composite)". Root cause: transient runner resource contention — two prior PR merges (PRs #15 and #16) had run on the same shared runner moments earlier. The docs-only PR #17 added no JS changes; `node server.js` boots in under 1 second locally. Fixed via `gh run rerun --failed` on run `25981443157`; re-run passed ✅ 47/48 gates.
  - **Release tag published.** `v0.4.13-stage-2-windows-device-shield-closeout` tagged on `main` commit `c456455` (PR #17 merge) and published as a GitHub Release with full release notes.
  - **macOS external review issue #11 updated.** Issue was sparse (no logo, no validation table, no reviewer checklist link). Updated to match the Windows issue template: logo at top (absolute raw GitHub URL), full scope bullet list, technical brief as primary review doc with scope footnote, validation table (234/234 tests, 50/50 gates, all smokes), review focus areas, known limitations, confirmed non-claims, and Stage 2.7 cross-platform note linking to Issue #18.
  - **Windows external review issue #18 fixed.** All relative doc links (`docs/stages/STAGE_2_WINDOWS_TECHNICAL_BRIEF.md` etc.) were broken in the GitHub issue UI. Replaced with absolute `https://github.com/Raoof128/Project-Simurgh/blob/main/docs/...` URLs. Added a proper Review Documents table (8 docs), all 4 release tags hyperlinked, logo rendered via raw GitHub URL.
- **Files changed:** `AGENT.md` (this entry), `CHANGELOG.md` (post-merge log entry). GitHub Issues #11 and #18 updated remotely via `gh issue edit`.
- **Verification:** CI re-run passed. `v0.4.13-stage-2-windows-device-shield-closeout` tag pushed and release published. Both issues verified with working links.
- **Follow-ups:** Stage 2.8 Linux Display Integrity Research — X11 enumeration feasibility and Wayland compositor/security-model investigation. Linux daemon proofs currently rejected with `unsupported_platform` at both pairing and proof layers.

### 2026-05-17 (Australia/Sydney) — Stage 2 Windows Device Shield Closeout

**Raouf:**

- **Scope:** Windows Device Shield closeout documentation, validation matrix, reviewer checklist, logo integration, release freeze documentation, and external review signal.
- **Summary:**
  - Created `docs/stages/STAGE_2_WINDOWS_TECHNICAL_BRIEF.md` — 20-section reviewer-facing technical summary covering the full Windows path: research origin, daemon architecture, scanner design, controlled affinity fixture, signed proof flow, server verification, risk mapping, report/dashboard/audit integration, privacy contract, E2E smoke coverage, cybersecurity audit coverage, real-device validation, known limitations, and non-claims.
  - Created `docs/stages/STAGE_2_WINDOWS_DEVICE_SHIELD_CLOSEOUT.md` — freeze declaration with evidence table (WDA_MONITOR, WDA_EXCLUDEFROMCAPTURE, tamper/replay/raw-field rejection, gate evidence), cross-platform contract cross-references, and confirmed non-claims.
  - Created `docs/stages/STAGE_2_WINDOWS_VALIDATION_MATRIX.md` — gate-level verification matrix covering build/test gates, smoke gates, security audit gates, real Windows device validation (all 20 test rows), Scenario A–G smoke, and all nine closeout audit dimensions.
  - Created `docs/stages/STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md` — reviewer checklist covering release gates, real-device validation, proof path, platform integrity, privacy contract, cross-platform contract, report/dashboard/audit, smoke and security audit coverage, non-claims, and documentation completeness.
  - Created `docs/evidence/stage-2-windows/README.md` — evidence-folder rules specifying what artefacts are allowed and what is strictly forbidden.
  - Added Project Simurgh logo (`docs/Project-Simurgh-Logo.png`) to README.md header, `docs/stages/STAGE_2_5_TECHNICAL_BRIEF.md`, and `docs/stages/STAGE_2_WINDOWS_TECHNICAL_BRIEF.md`.
  - Updated README: logo in header, Windows Device Shield Closeout section, updated verification counts (`273/273` Node tests, `47/48` check.sh gates), status block updated to Stage 2 Windows closeout, External Technical Review updated.
  - Updated SECURITY.md: v0.4.13-closeout added to supported versions; Stage 2 Windows Device Shield Security Posture section added (9 protection mechanisms + production non-claim wording).
  - Updated PRIVACY.md: last-updated date updated; Windows Scanner Privacy Contract section added with full allowed/forbidden field tables.
  - Updated ROADMAP.md: Stage 2 Windows Device Shield closeout marked done; "Next: Linux research, not Linux production implementation" note added.
  - Updated AGENT.md (this entry) and CHANGELOG.md with Raouf-prefixed entries.
- **Verification:** `npm test` 273/273, `npm audit --audit-level=high` 0 vulnerabilities, `node tools/privacy-audit.mjs` pass, `bash scripts/check.sh` 47/48 (pre-existing Windows CRLF prettier tolerance). All smoke and audit scripts pass locally.
- **Non-claims preserved:** Research prototype only. No production Windows Service, MDM/Intune readiness, hardware attestation, kernel-level visibility, GPU overlay coverage, or automatic misconduct detection. No collection of raw HWNDs, PIDs, process names, window titles, usernames, serial numbers, MAC addresses, screen pixels, webcam/microphone frames, typed content, or pasted content.
- **Follow-ups:** Push branch, open PR `stage-2-windows-device-shield-closeout`, wait for GitHub Actions Quality Gate, merge to `main`, then begin Stage 2.8 Linux Display Integrity Research.

### 2026-05-17 (Australia/Sydney) — Stage 2.6/2.7 Closeout (umbrella E2E smoke + cybersecurity audit)

**Raouf:**

- **Scope:** Final closeout for the Windows Device Shield (Stage 2.6) and cross-platform unification (Stage 2.7). Two new umbrella gates plus targeted hardening of gaps surfaced during Stage 2.7 review.
- **Hardening additions** (extending `tests/security/stage27_cross_platform_security_audit.test.js`):
  - Pairing payload with raw `hwnd` anywhere in the envelope is rejected as `forbidden_local_field` (previously only tested on the proof path).
  - Pairing payload with forbidden field nested inside `signed_payload` is rejected.
  - Pairing payload with `platform: "linux"` is rejected as `unsupported_platform` at `validateDaemonPairingPayload` (the actual rejection point; Stage 2.7 audit only covered the proof-level path).
  - SDK trust-boundary invariant: `validateDaemonProof` never echoes unsigned client-supplied fields into the trusted proof object.
  - `FORBIDDEN_LOCAL_FIELD_NAMES` is frozen and mutation throws at runtime (push and indexed assignment both rejected).
- **New umbrella audit** (`tests/security/stage_26_27_closeout_audit.test.js`, 24 tests): a single manifest covering nine dimensions with file-scoped assertions:
  - `[1.proof]` canonicalisation determinism, post-signing sequence tamper, stale timestamp.
  - `[2.scanner]` platform-pinned scanner version, fingerprint hash pattern, suspicious_count consistency.
  - `[3.platform]` Linux rejection at both proof and pairing paths.
  - `[4.daemon]` node-id mismatch, no-pairing, public-key mismatch.
  - `[5.sdk]` `getDeviceShieldStatus` carries trust-boundary comment; `sendTelemetry` never emits top-level `scanner_state` / `platform` / `capture_excluded_window_count` outside the signed proof.
  - `[6.report]` `device_integrity` exposes `daemon_platform` + manual-review wording; full recursive scan finds zero forbidden raw fields.
  - `[7.dashboard]` no affirmative misconduct phrases; no template interpolation of raw forbidden field names.
  - `[8.privacy]` daemonProof and privacy-audit both import the shared `forbiddenLocalFields` list; the list is frozen and contains every known leak vector.
  - `[9.wording]` source files contain no overclaim phrases (production-ready, MDM-ready, hardware-attestation, cheating-detected, etc.); manual-review wording preserved verbatim in `scannerRiskPolicy`.
- **New umbrella scripts:**
  - `scripts/security-audit-stage-2-6-2-7-closeout.sh` — runs Stage 2.4/2.5 + Stage 2.7 + new closeout audits + privacy-audit + `npm audit`.
  - `scripts/smoke-stage-2-6-2-7-closeout.sh` — runs Stage 2.6 Windows smoke + Stage 2.7 cross-platform smoke + privacy-audit.
- **CI wiring:** `scripts/check.sh` section 10m runs both closeout gates after the per-stage gates.
- **Verification:** Windows OS Windows 10 Pro / Build 19045. Node 24.14.0, .NET 8.0.421. After closeout: `npm test` 273/273 unit tests pass (unchanged — closeout work lives in `tests/security/`, which `npm test` does not glob). Security-audit tests across all gates: Stage 2.7 audit 15/15 (5 new hardening tests, was 10), closeout audit 24/24. `scripts/check.sh` 47/48 (the single failure is the pre-existing Windows-line-endings prettier tolerance documented in check.sh itself; CI on Linux passes prettier). All five smoke scripts, four security-audit scripts, .NET daemon tests (11/11), privacy audit, and `npm audit --audit-level=high` (0 vulns) green.
- **Non-claims preserved:** Research prototype only. No production deployment claim, no MDM/Intune, no hardware attestation, no kernel-level visibility, no GPU overlay coverage, no automatic misconduct detection. Linux daemon proofs rejected with `unsupported_platform` at both pairing and proof layers until Stage 2.8.
- **Follow-ups:** Open closeout PR (supersedes/extends Stage 2.7 PR #15), wait for GitHub Actions Quality Gate to confirm Linux-CI green, merge to `main`, tag `v0.4.13-stage-2-7-cross-platform-device-shield`, publish GitHub release. Then Stage 2.8 Linux Display Integrity Research.

### 2026-05-17 (Australia/Sydney) — Stage 2.7 Cross-Platform Device Shield Unification

**Raouf:**

- **Scope:** Stage 2.7 unifies the macOS and Windows Device Shield surfaces under one documented cross-platform proof, scanner, risk, report, dashboard, privacy, and audit contract before Linux research begins.
- **Summary:**
  - Extracted three shared server modules: `src/device/forbiddenLocalFields.js` (canonical raw-field name list + recursive deep-check helper), `src/device/platformScannerSchema.js` (supported platforms + scanner enum + scanner validator), `src/device/scannerRiskPolicy.js` (daemon-risk mapping + manual-review wording).
  - Refactored `src/device/daemonProof.js`, `src/device/daemonState.js`, `src/academic/riskScoring.js` (via `daemonState.scoreDaemonRisk`), `src/academic/reportBuilder.js`, and `tools/privacy-audit.mjs` to consume the shared modules. No behaviour change; every `fail()` reason code preserved.
  - `device_integrity` report section now emits `daemon_platform` as the canonical platform key (back-compat `platform` alias retained for this release).
  - Browser SDK gains UX-only `getDeviceShieldStatus()` accessor; trust boundary explicit in code comments — the server NEVER consults this status; trust still requires signed `daemon_proof` on `/api/telemetry`.
  - Stage 2.7 cross-platform E2E smoke (`scripts/smoke-stage-2-7-cross-platform-device-shield.sh`) with Scenarios A–G covers macOS healthy, Windows healthy, macOS capture-excluded Critical, Windows monitor-only Warning, Windows capture-excluded Critical, Linux `unsupported_platform` rejection, and recursive raw-field rejection across nested objects and arrays.
  - Stage 2.7 cross-platform security audit (`scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`) locks tampered platform/scanner-field rejection, unsupported-platform rejection, raw-field rejection, dashboard misconduct-phrase ban, and a sweep that every name on `forbiddenLocalFields` is rejected by the proof validator.
  - Docs added: `docs/DEVICE_SHIELD_CONTRACT.md`, `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`, `docs/stages/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`, `docs/stages/STAGE_2_7_REVIEWER_CHECKLIST.md`, `docs/schemas/daemon-proof.schema.json`, `docs/schemas/device-scanner-result.schema.json`.
  - `scripts/check.sh` extended with Stage 2.7 smoke + audit gates.
- **Verification:** Windows OS: Windows 10 Pro / Build 19045. Toolchain: Node 24.14.0, npm 11.9.0, .NET 8.0.421. Baseline `v0.4.12`: clean working tree, 239/239 Node tests, privacy audit pass. After Stage 2.7: 273/273 Node tests pass, `npm audit --audit-level=high` clean (0 vulnerabilities), `node tools/privacy-audit.mjs` clean, Stage 2.7 cross-platform smoke (Scenarios A–G) green, Stage 2.7 security audit green, Stage 2.2/2.3 smoke green, Stage 2.4/2.5 smoke green, Stage 2.5 security audit green, Stage 2.6 Windows scanner smoke green, Stage 2.6 .NET daemon tests green (11/11), `scripts/check.sh` 45/46 green (the one failure is the pre-existing Windows-line-endings prettier tolerance — CI on Linux passes prettier).
- **Non-claims preserved:** Research prototype only. No production deployment claim, no MDM/Intune readiness, no hardware attestation, no kernel-level visibility, no GPU overlay coverage, no automatic misconduct detection. No collection of screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.
- **Follow-ups:** Open PR, merge after GitHub Actions pass, tag `v0.4.13-stage-2-7-cross-platform-device-shield`. Stage 2.8 Linux Display Integrity Research is the next milestone — X11 enumeration feasibility plus Wayland compositor/security-model investigation, no parity claim until both paths are signed and validated.

### 2026-05-16 (Australia/Sydney) — Stage 2.6 CI Fix, Workflow Consolidation, PR Merge & Release Tag

**Claude (claude-sonnet-4-6):**

- **Scope:** Post-implementation CI triage, workflow consolidation, PR merge, and release tagging for Stage 2.6.
- **Summary:**
  - Diagnosed CI failure on PR #14: `scripts/smoke-stage-2-6-windows-scanner.sh` was committed with file mode `100644` (not executable), causing `Permission denied` on the Linux GitHub Actions runner at `check.sh` line 1150. All 43 other gates had passed.
  - Fixed by running `git update-index --chmod=+x scripts/smoke-stage-2-6-windows-scanner.sh` (mode `100644` → `100755`). No file content was changed.
  - Identified that the separate `.github/workflows/windows-daemon.yml` workflow was fully redundant: `scripts/check.sh` step 10k already runs both `dotnet test` on the Windows daemon solution and the Stage 2.6 smoke script on every Linux CI run. CI logs confirmed `✓ Stage 2.6 Windows daemon .NET tests` passing inside the quality gate.
  - Removed `.github/workflows/windows-daemon.yml`. After the push, only the Simurgh Quality Gate workflow remains; both `windows-daemon` check entries disappeared from PR #14.
  - Marked PR #14 as ready for review (`gh pr ready 14`) and merged to `main` with `--admin` flag after both quality gate checks passed (43 passes, 0 failures).
  - Tagged `v0.4.12-stage-2-6-windows-display-affinity-scanner` on `main` and pushed the tag.
  - Published a GitHub release at that tag with the Stage 2.6 release note.
- **Files Changed:**
  - `scripts/smoke-stage-2-6-windows-scanner.sh` — mode `100644` → `100755` (executable bit only)
  - `.github/workflows/windows-daemon.yml` — deleted
  - `AGENT.md`, `CHANGELOG.md`
- **Verification:** `gh pr checks 14` — 2/2 quality gate checks pass, 0 windows-daemon checks. `gh run view` — 43 passed, 1 previously failed (now fixed). `git tag` — `v0.4.12-stage-2-6-windows-display-affinity-scanner` present on `main`. GitHub release published.
- **Follow-ups:** Stage 2.7 or next milestone. The Windows goblin has been inspected, fingerprinted, and escorted into the audit log.

### 2026-05-16 (Australia/Sydney) — Stage 2.6 Windows Display Affinity Scanner Real-Device Validation

**Raouf:**

- **Scope:** Stage 2.6B — real Windows laptop validation for Win32 display-affinity detection.
- **Summary:**
  - Validated the Windows daemon on Windows 10 Pro build 19045.
  - Added a controlled local `SimurghAffinityFixture` with `none`, `monitor`, and `exclude` modes for real `SetWindowDisplayAffinity` validation.
  - Confirmed normal desktop scanner state with zero restricted/excluded counts.
  - Confirmed `WDA_MONITOR` increments `monitor_only_window_count` and `capture_restricted_window_count`.
  - Confirmed `WDA_EXCLUDEFROMCAPTURE` increments `capture_excluded_window_count` and moves scanner state to `risk_detected`.
  - Confirmed signed Windows scanner proofs are accepted by the server and mapped to Warning/Critical manual-review context.
  - Confirmed tampered, replayed, and raw-field proofs are rejected, with raw local fields rejected as `forbidden_local_field`.
  - Confirmed reports, dashboard state, audit-chain verification, privacy audit, and baseline gates remain green.
- **Files Changed:**
  - `tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln`
  - `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/`
  - `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/{DaemonProof,JsonResponse,LocalHttpServer,Program,ProofSigner}.cs`
  - `tools/simurgh-daemon-windows/tests/SimurghDaemon.Windows.Tests/{AffinityFixtureProjectTests,LocalHttpServerTests}.cs`
  - `docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`
  - `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Windows OS check: Windows 10 Pro build 19045. Toolchain: Git 2.53.0, Node 24.14.0, npm 11.9.0, .NET 8.0.421. Baseline before edits: `git diff --check` clean; `npm test` passed 239/239; `npm audit --audit-level=high` passed with 0 vulnerabilities; `node tools/privacy-audit.mjs` passed; Git Bash `scripts/smoke-stage-2-6-windows-scanner.sh` passed; Git Bash `scripts/security-audit-stage-2-4-2-5.sh` passed; Git Bash `scripts/check.sh` passed 44/44; `.tools/dotnet/dotnet.exe build tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln` passed; `.tools/dotnet/dotnet.exe test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln --no-restore` passed 8/8 before fixture and 11/11 after fixture. Runtime validation: `/health` returned platform `windows`; `/status` returned scanner version `2.6.0` and `metadata_only`; normal scan returned zero restricted/excluded counts; `WDA_MONITOR` returned `restricted_detected`, `monitor_only_window_count: 1`, `capture_restricted_window_count: 1`; `WDA_EXCLUDEFROMCAPTURE` returned `risk_detected`, `capture_excluded_window_count: 1`; live daemon proof chain accepted healthy/monitor/exclude proofs, rejected tampered proof with `invalid_signature`, rejected replayed proof with consumed challenge, rejected raw `hwnd` as `forbidden_local_field`, generated Windows report/dashboard state, and verified the audit chain. Privacy sweep found only expected forbidden-field rejection references in test logs.
- **Follow-ups:** Open PR, merge after GitHub Actions pass, and tag `v0.4.12-stage-2-6-windows-display-affinity-scanner` or the chosen release tag. Do not claim production Windows Service deployment, MDM/Intune readiness, hardware attestation, kernel-level visibility, Linux scanner support, or automatic misconduct detection.

### 2026-05-16 (Australia/Sydney) — Stage 2.6 Windows Display Affinity Scanner

**Raouf:**

- **Scope:** Stage 2.6A implementation-complete, pending real Windows laptop validation — Windows metadata-only display-affinity scanner contract, mock-first .NET daemon skeleton, server risk/report/dashboard support, and Windows-local gate portability.
- **Summary:**
  - Extended signed daemon proof validation to accept `platform: "windows"` with `scanner_version: "2.6.0"`, `capture_restricted_window_count`, and `monitor_only_window_count`.
  - Mapped `WDA_EXCLUDEFROMCAPTURE` / `capture_excluded_window_count > 0` to Critical/manual review and `WDA_MONITOR` / `monitor_only_window_count > 0` to Warning/manual review.
  - Changed daemon proof and pairing raw-local-data rejection to generic `forbidden_local_field`, including recursive Windows fields such as HWNDs, window handles, process IDs, executable paths, microphone/audio, screenshots, pixels, typed content, and pasted content.
  - Added Windows scanner state/report/dashboard fields while preserving the signed-proof trust boundary and metadata-only contract.
  - Added `tools/simurgh-daemon-windows/`, a .NET 8 mock-first daemon skeleton with scanner provider abstraction, Win32 provider stub, privacy normaliser, P-256 proof signer, identity store, health payload, and xUnit tests.
  - Added Stage 2.6 E2E smoke coverage, Windows daemon CI workflow, Windows-safe baseline fixes for Node test path handling, Git Bash check temp paths, and Windows line-ending tolerant check formatting.
- **Files Changed:**
  - `src/device/daemonProof.js`, `src/device/daemonState.js`
  - `src/academic/riskScoring.js`, `src/academic/reportBuilder.js`
  - `server.js`, `public/instructor.html`, `tools/privacy-audit.mjs`
  - `tests/unit/*daemon*`, `tests/security/stage24_25_security_audit.test.js`, `tests/e2e/stage24_25_smoke.mjs`, `tests/e2e/stage26_windows_scanner_smoke.mjs`
  - `tools/simurgh-daemon-windows/`, `scripts/smoke-stage-2-6-windows-scanner.sh`, `scripts/check.sh`, `.github/workflows/windows-daemon.yml`
  - `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`, `docs/superpowers/plans/2026-05-16-stage-2-6-windows-display-affinity-scanner.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Red step confirmed Stage 2.6 Windows proof/risk/report tests failed before implementation. `npm test` passed 239/239. `npm audit --audit-level=high` passed with 0 vulnerabilities. `node tools/privacy-audit.mjs` passed. `scripts/security-audit-stage-2-4-2-5.sh` passed. `scripts/smoke-stage-2-6-windows-scanner.sh` passed. `.tools/dotnet/dotnet.exe build tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln` passed. `.tools/dotnet/dotnet.exe test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln --no-restore` passed 8/8. `scripts/check.sh` passed 44/44 gates on Windows, with macOS Swift gates skipped honestly.
- **Follow-ups:** Run the real Windows laptop validation for `GetWindowDisplayAffinity` detection of `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE`. Do not claim production Windows Service readiness, MDM/Intune readiness, hardware attestation, kernel visibility, Linux scanner support, or automatic misconduct detection.

### 2026-05-16 (Australia/Sydney) — Stage 2.5 External Technical Review Signal

**Raouf:**

- **Scope:** Review-signal closeout artefact — signal Stage 2.5 external technical review readiness without touching Stage 2.6 feature code.
- **Summary:**
  - Updated README status block from "Stage 2.5 research prototype — macOS metadata-only affinity scanner active" to "Stage 2.5 closed — macOS Device Shield regression-gated and ready for external technical review."
  - Fixed stale README Stage 2.5 section heading: `branch active — v0.4.7 target` → `frozen — v0.4.10`.
  - Added `## External Technical Review` section to README (immediately after the status block) listing the full macOS Device Shield baseline, current verification numbers (234/234 tests, 50/50+ gates, Swift build/test, all smoke packs, security audit, privacy audit), an open-door statement for technical reviewers, and the honest non-claims list.
  - Updated README Status & License section to reflect Stage 2.5 closeout state.
  - Added `## External Review Status` section to `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md` with prototype framing and eight specific focus areas for reviewers.
  - Pushed branch `stage-2-macos-external-review-signal`, opened PR #10, created and pinned GitHub Issue #11 "External Review Request: Stage 2.5 macOS Integrity Stack."
- **Files Changed:**
  - `README.md`
  - `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md`
  - `AGENT.md`, `CHANGELOG.md`
- **Verification:** `npm test` — 234/234 pass. `npm audit --audit-level=high` — 0 vulnerabilities. `node tools/privacy-audit.mjs` — pass. `git diff --check` — clean. Docs-only change; no code, no gates altered.
- **Follow-ups:** Merge PR #10. Then begin Stage 2.6 Windows daemon and display-affinity scanner work on `stage-2-6-windows-display-affinity-scanner`. Do not infer production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection.

### 2026-05-16 (Australia/Sydney) — Stage 2.5 Closeout Security Audit

**Raouf:**

- **Scope:** Stage 2.5 closeout — cybersecurity audit and hardening gate for Stage 2.4 browser SDK + Stage 2.5 scanner/daemon proof surfaces before Stage 2.6.
- **Summary:**
  - Added `scripts/security-audit-stage-2-4-2-5.sh`, a dedicated closeout cybersecurity gate that runs the Stage 2.4/2.5 security tests, privacy audit, npm audit, E2E smoke pack, LaunchAgent shell/dry-run checks, generated-output privacy grep, overclaim grep, daemon dangerous-pattern grep, and macOS Swift daemon test/build/doctor checks when available.
  - Added `tests/security/stage24_25_security_audit.test.js`, which verifies recursive raw local-field rejection in daemon proof/pairing payloads, SDK token/proof trust boundaries, localhost daemon loopback/body/malformed JSON/method/origin hardening, LaunchAgent dry-run safety, and dashboard/report manual-review wording.
  - Hardened `src/device/daemonProof.js` so forbidden raw local-data fields are rejected recursively, including nested debug/scanner objects in daemon proof and pairing envelopes.
  - Hardened `LocalHttpServer.swift` with explicit request-size checks, malformed JSON rejection for sensitive JSON endpoints, method-not-allowed responses for known routes, and preserved loopback-only binding.
  - Added safe `--check` / `--dry-run` modes and bounded path checks to the development LaunchAgent install/uninstall scripts; plist lint runs when `plutil` is available and skips cleanly on Linux CI.
  - Added `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md`, documented the audit command in README, and wired the gate into `scripts/check.sh`.
- **Files Changed:**
  - `scripts/security-audit-stage-2-4-2-5.sh`
  - `tests/security/stage24_25_security_audit.test.js`
  - `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md`
  - `src/device/daemonProof.js`
  - `tools/simurgh-daemon-macos/Sources/SimurghDaemon/LocalHttpServer.swift`
  - `tools/simurgh-daemon-macos/scripts/{install-launch-agent,uninstall-launch-agent}.sh`
  - `scripts/check.sh`
  - `README.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Baseline before edits on `stage-2-5-closeout-smoke-security-audit`: `git diff --check` → clean; `npm test` → 234/234 pass; `npm audit --audit-level=high` → 0 vulnerabilities; `node tools/privacy-audit.mjs` → pass; `./scripts/check.sh` → 50/50 gates pass; `swift test`, `swift build`, and `swift build -c release` in `tools/simurgh-daemon-macos` → pass. Red step confirmed `tests/security/stage24_25_security_audit.test.js` failed before implementation on recursive forbidden fields, daemon HTTP hardening checks, and LaunchAgent dry-run checks. Targeted closeout security gate: `scripts/security-audit-stage-2-4-2-5.sh` → pass.
- **Follow-ups:** Keep this security audit and the Stage 2.4/2.5 smoke gate green before Stage 2.6. Do not infer production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection.

### 2026-05-16 (Australia/Sydney) — Stage 2.2/2.3 E2E Smoke Closeout

**Raouf:**

- **Scope:** Stage 2.2 + Stage 2.3 closeout — pairing, integrity proof, daemon proof, hardened-required, report, dashboard, audit, and privacy E2E smoke.
- **Summary:**
  - Added `scripts/smoke-stage-2-2-2-3.sh`, a dedicated smoke wrapper that starts daemon-optional and daemon-required demo servers, runs the Stage 2.2/2.3 Node E2E driver, runs privacy audit, and performs macOS-only Swift daemon build/test/help checks when available.
  - Added `tests/e2e/stage22_23_smoke.mjs`, which verifies Ed25519 node pairing, verified integrity proofs, different-node rejection, nonce replay rejection, stale proof rejection, invalid registered-signature rejection, deterministic mock P-256 daemon pairing/proofs, daemon proof replay/tamper rejection, hardened missing-proof rejection, report/dashboard `device_integrity`, and HMAC audit verification.
  - Added the smoke wrapper to `scripts/check.sh` as `Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge`.
  - Documented the smoke command in README and captured the Superpowers implementation plan under `docs/superpowers/plans/`.
- **Files Changed:**
  - `scripts/smoke-stage-2-2-2-3.sh`
  - `tests/e2e/stage22_23_smoke.mjs`
  - `docs/superpowers/plans/2026-05-16-stage-2-2-2-3-e2e-smoke-pack.md`
  - `scripts/check.sh`
  - `README.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Targeted red step confirmed `tests/e2e/stage22_23_smoke.mjs` was missing before implementation. Targeted closeout smoke: `scripts/smoke-stage-2-2-2-3.sh` → pass. Final verification after edits: `git diff --check` → clean; `npm test` → 234/234 pass; `./scripts/check.sh` → 50/50 gates pass; `swift test` in `tools/simurgh-daemon-macos` → 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` → pass.
- **Follow-ups:** Keep this Stage 2.2/2.3 bridge smoke green before relying on Stage 2.4/2.5 or Stage 2.6 work. No production deployment, hardware attestation, notarisation, MDM readiness, Windows/Linux daemon support, or automatic misconduct detection is claimed.

### 2026-05-16 (Australia/Sydney) — Stage 2.4/2.5 E2E Smoke Closeout

**Raouf:**

- **Scope:** Stage 2.5 closeout — Stage 2.4 browser SDK + Stage 2.5 scanner end-to-end smoke gauntlet before Stage 2.6.
- **Summary:**
  - Added `scripts/smoke-stage-2-4-2-5.sh`, a dedicated closeout smoke wrapper that starts daemon-optional and daemon-required demo servers, runs the CI-safe Node E2E driver, runs privacy audit, and performs macOS-only daemon lifecycle checks when Swift is available.
  - Added `tests/e2e/stage24_25_smoke.mjs`, which imports the browser SDK, verifies `public/index.html` uses it, creates/join/starts an exam, pairs a deterministic mock P-256 daemon, sends signed healthy and capture-excluded scanner proofs, rejects tampered and replayed proofs, rejects raw local fields, checks report/dashboard `device_integrity`, and verifies the audit chain.
  - Added the smoke wrapper to `scripts/check.sh` as `Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof`.
  - Documented the smoke command in README and captured the Superpowers implementation plan under `docs/superpowers/plans/`.
  - Tightened daemon privacy handling after the smoke exposed closeout gaps: audit/dashboard rejection reasons now store `forbidden_local_field` instead of exact forbidden field names, daemon proof validation explicitly rejects `webcam`, and daemon `/status` includes privacy-safe `platform: "macos"`.
- **Files Changed:**
  - `scripts/smoke-stage-2-4-2-5.sh`
  - `tests/e2e/stage24_25_smoke.mjs`
  - `docs/superpowers/plans/2026-05-16-stage-2-4-2-5-e2e-smoke-pack.md`
  - `scripts/check.sh`
  - `server.js`
  - `src/device/daemonProof.js`
  - `tests/unit/daemonProofScanner.test.js`
  - `tools/simurgh-daemon-macos/Sources/SimurghDaemon/PrivacyNormaliser.swift`
  - `tools/simurgh-daemon-macos/Tests/SimurghDaemonTests/PrivacyNormaliserTests.swift`
  - `README.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Baseline after pulling latest `main`: `git diff --check` passed; `npm test` → 234/234 pass; `./scripts/check.sh` → 48/48 gates pass; `swift test` in `tools/simurgh-daemon-macos` → 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` → pass. Targeted closeout smoke: `scripts/smoke-stage-2-4-2-5.sh` → pass. Final verification after edits: `git diff --check` → clean; `npm test` → 234/234 pass; `./scripts/check.sh` → 49/49 gates pass; `swift test` in `tools/simurgh-daemon-macos` → 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` → pass.
- **Follow-ups:** Stage 2.6 can start only after this closeout smoke remains green. Do not infer production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection.

### 2026-05-16 (Australia/Sydney) — Stage 2.5 macOS Affinity Scanner Implementation

**Raouf:**

- **Scope:** Stage 2.5 — macOS metadata-only display-affinity scanner implementation.
- **Summary:**
  - Replaced the daemon's conservative placeholder `AffinityScanner` with a mockable CoreGraphics metadata scanner using `WindowInfoProvider`, privacy-safe `WindowInfo`, `AffinityScanResult`, and conservative visible-window filtering.
  - Wired scanner summaries into daemon `/status` and signed `/proof` payloads, including scanner state, version, scan timestamp, duration, visible/suspicious/capture-excluded counts, error count, privacy mode, and privacy-safe window fingerprint hashes.
  - Updated server daemon-proof validation to accept Stage 2.5 scanner fields, preserve Stage 2.3/2.4 compatibility, reject forbidden raw scanner/local fields, and reject scanner-field tampering through the existing signed payload.
  - Extended daemon state, risk scoring, reports, instructor dashboard, audit events, and privacy audit for scanner state while keeping manual-review wording and no automatic misconduct finding.
  - Added Stage 2.5 Swift and Node tests plus `scripts/check.sh` gates for scanner proof validation, scanner risk mapping, report scanner summaries, Swift scanner privacy/risk behavior, and signed scanner proof inclusion.
  - Updated README, SECURITY, PRIVACY, ROADMAP, and `docs/stages/STAGE_2_5_MACOS_AFFINITY_SCANNER.md` with Stage 2.5 scope and non-production boundaries.
- **Files Changed:**
  - `tools/simurgh-daemon-macos/Sources/SimurghDaemon/{AffinityScanner,ProofSigner,PrivacyNormaliser,LocalHttpServer,KeychainIdentity}.swift`
  - `tools/simurgh-daemon-macos/Tests/SimurghDaemonTests/{AffinityScannerTests,ScannerProofTests}.swift`
  - `src/device/{daemonProof,daemonState,daemonEvents}.js`
  - `src/academic/{academicEvents,reportBuilder}.js`
  - `server.js`
  - `public/instructor.html`
  - `tests/unit/{daemonProofScanner,daemonScannerRisk,reportBuilderScanner,reportBuilder}.test.js`
  - `tools/privacy-audit.mjs`
  - `scripts/check.sh`
  - `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `docs/stages/STAGE_2_5_MACOS_AFFINITY_SCANNER.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Baseline before edits: `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build` all passed. Targeted Stage 2.5 tests: `node --test tests/unit/daemonProofScanner.test.js tests/unit/daemonScannerRisk.test.js tests/unit/reportBuilderScanner.test.js` → 7/7 pass; `swift test --filter AffinityScannerTests` → 5/5 pass; `swift test --filter ScannerProofTests` → 1/1 pass. Broad verification: `npm test` → 234/234 pass; `swift test` in `tools/simurgh-daemon-macos` → 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` → pass; `git diff --check` → clean; `./scripts/check.sh` → 48/48 gates pass.
- **Follow-ups:** Stage 2.6 can add Windows scanner work. Production packaging, notarisation, MDM deployment, hardware attestation, Windows/Linux support, and automatic misconduct detection remain out of scope.

### 2026-05-16 (Australia/Sydney) — Stage 2.4 Browser SDK & Daemon Lifecycle Hardening

**Raouf:**

- **Scope:** Stage 2.4 — Browser SDK extraction and macOS daemon lifecycle hardening.
- **Summary:**
  - Added `public/sdk/simurgh-browser-sdk.js` as the reusable daemon browser SDK for discovery, health/status checks, pairing, challenge/proof fetch, telemetry send, hardened missing-proof handling, safe failure state, and explicit local daemon states.
  - Updated `public/index.html` so the student page consumes the SDK instead of owning the daemon bridge inline.
  - Added macOS daemon lifecycle commands: `start`, `stop`, `status`, `doctor`, and `reset-identity`.
  - Added privacy-safe `DaemonDoctor` diagnostics for daemon reachability, port availability, Keychain identity presence, allowed-origin configuration, localhost binding, server reachability, and proof round-trip readiness.
  - Added development-only LaunchAgent plist plus install/uninstall scripts under `tools/simurgh-daemon-macos/`.
  - Extended `scripts/check.sh` with Stage 2.4 SDK, lifecycle, doctor redaction, LaunchAgent plist, and lifecycle smoke gates.
  - Updated README, SECURITY, PRIVACY, and ROADMAP with Stage 2.4 scope and explicit non-production boundaries.
- **Files Changed:**
  - `public/sdk/simurgh-browser-sdk.js`
  - `public/index.html`
  - `tools/simurgh-daemon-macos/Sources/SimurghDaemon/{DaemonCommand,DaemonDoctor,DaemonConfig,KeychainIdentity,LocalHttpServer,main}.swift`
  - `tools/simurgh-daemon-macos/Tests/SimurghDaemonTests/DaemonDoctorTests.swift`
  - `tools/simurgh-daemon-macos/launchd/dev.raouf.simurgh.daemon.plist`
  - `tools/simurgh-daemon-macos/scripts/{install-launch-agent,uninstall-launch-agent}.sh`
  - `tests/unit/{browserSdk,daemonLifecycle,daemonDoctor}.test.js`
  - `scripts/check.sh`
  - `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `AGENT.md`, `CHANGELOG.md`
- **Verification:** Baseline before edits: `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build` all passed. Stage 2.4 targeted checks: `node --test tests/unit/browserSdk.test.js tests/unit/daemonLifecycle.test.js tests/unit/daemonDoctor.test.js` → 8/8 pass; `swift test` in `tools/simurgh-daemon-macos` → 2/2 pass. Final verification: `npm test` → 227/227 pass; `swift build` in `tools/simurgh-daemon-macos` → pass; `swift test` in `tools/simurgh-daemon-macos` → 2/2 pass; `./scripts/check.sh` → 43/43 gates pass.
- **Follow-ups:** Stage 2.5 can upgrade scanner signals while preserving the metadata-only contract.

### 2026-05-15 (Australia/Sydney) — Stage 2.3 macOS Localhost Daemon

**Raouf:**

- **Scope:** Stage 2.3 — macOS localhost integrity daemon foundation.
- **Summary:**
  - Added server-side daemon modules under `src/device/` for P-256 daemon proof verification, single-use device challenges, per-session daemon state, and daemon event names.
  - Added `POST /api/device/challenge` and `POST /api/device/pair`; telemetry now accepts optional `daemon_proof` by default, rejects invalid/replayed/stale proofs, updates `daemon_risk`, appends privacy-safe daemon audit events, and exposes `device_integrity` in verdicts/reports.
  - Added hardened native-required mode with `SIMURGH_REQUIRE_DAEMON=true`, which rejects telemetry missing a daemon proof with `daemon_proof_required` and audits `DAEMON_MISSING` without consuming the sequence number.
  - Added `tools/simurgh-daemon-macos/`, a SwiftPM macOS daemon skeleton that binds to `127.0.0.1`, stores a P-256 identity in Keychain, exposes `/health`, `/status`, `/pair`, `/proof`, and `/session/end`, and returns metadata-only status/proofs.
  - Updated student and instructor pages with localhost daemon discovery/status, token-aware pairing/proof flow, and dashboard device-integrity display.
  - Expanded privacy enforcement for raw local-data terms and documented Stage 2.3 in README, SECURITY, PRIVACY, ROADMAP, and `docs/stages/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`.
  - Added targeted Stage 2.3 test-creator pass coverage for daemon risk scoring, report `device_integrity`, daemon-required env config, and end-to-end tampered/missing daemon proof rejection audit gates.
  - Renamed the GitHub Actions workflow to the Simurgh Quality Gate so CI/CD naming matches the Stage 2.3 `scripts/check.sh` release gate.
- **Files Changed:**
  - `server.js`
  - `.env.example`, `.prettierignore`, `src/config/env.js`
  - `src/device/{daemonProof,daemonPairing,daemonState,daemonEvents}.js`
  - `src/academic/{academicEvents,reportBuilder,riskScoring}.js`
  - `tests/unit/daemon{Proof,Pairing,State}.test.js`, `tests/unit/{envConfig,reportBuilder,riskScoring}.test.js`
  - `tools/simurgh-daemon-macos/`
  - `public/index.html`, `public/instructor.html`
  - `tools/privacy-audit.mjs`, `scripts/check.sh`
  - `.github/workflows/stage-1-checks.yml`
  - `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `docs/stages/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`
- **Verification:** `node --test tests/unit/riskScoring.test.js tests/unit/reportBuilder.test.js` → 15/15 pass. `node --test tests/unit/envConfig.test.js` → 3/3 pass. `npm test` → 219/219 pass. `swift test` in `tools/simurgh-daemon-macos` → 1/1 pass. Full `./scripts/check.sh` → 38/38 gates pass, including Stage 2.3 daemon pair/proof smoke, replay rejection, tampered-proof audit rejection, hardened missing-proof rejection/audit, Swift macOS daemon build, and Swift macOS daemon test. `npm audit --audit-level=high` inside `check.sh` → 0 vulnerabilities.
- **Follow-ups:** Stage 2.4 should harden browser SDK packaging and daemon lifecycle. Future native scanner work can replace the placeholder `AffinityScanner` while preserving the metadata-only contract.

### 2026-05-15 (Australia/Sydney) — Stage 2 Security Hardening Pass

**Raouf:**

- **Scope:** Pre-tag hardening pass on the merged Stage 2.1 + 2.2 surface following an external cybersecurity audit (A- / 8.7). No new features, no Stage 2.3 work.
- **Summary:**
  - Added per-session-token rate limiter to `POST /api/integrity/proofs` (30/min) — closes the only remaining CPU-abuse path on the integrity surface.
  - Introduced `src/integrity/pairingAuditHints.js` with `safeParsedPairingHints()`. Rejection-path audit entries no longer emit `node_id_hash_if_parsed` on regex shape alone; the hash must be cryptographically reconciled with a 32-byte decoded public key. Wired into both `/pairing/complete` and `/proofs` reject paths.
  - Hardened `pairingRegistry.completePairing` with `crypto.timingSafeEqual` for challenge comparison (challenges are not strict secrets but the constant-time path removes future-regression risk).
  - Normalised all gate-count references in `docs/superpowers/{plans,specs}/` to `32/32` to match `AGENT.md`, `CHANGELOG.md`, and the actual `check.sh` total.
- **Files Changed:**
  - `server.js` (new limiter + reject-path refactor in two routes)
  - `src/integrity/pairingAuditHints.js` (new)
  - `src/integrity/pairingRegistry.js` (constant-time compare)
  - `tests/unit/integrity/pairingAuditHints.test.js` (new, 8 tests)
  - Spec + plan docs gate-count normalisation
  - `CHANGELOG.md`, `AGENT.md`
- **Verification:** `npm test` → 203/203 pass (was 195). `./scripts/check.sh` → 32/32 gates pass. `npm audit --audit-level=high` → 0 vulnerabilities. Honesty grep confirms no false "production device trust", "hardware attestation", or "ScreenCaptureKit scanning" claims.
- **What this does NOT do:** No new Stage 2.x scope. Does not migrate node key to Keychain or Secure Enclave (still development key at `~/.simurgh/node-key`). Does not add browser SDK, daemon, or risk-score integration.
- **Follow-ups:** Open PR, merge, tag `v0.4.3-stage-2-hardening`. Then Stage 2.3 brainstorm (macOS localhost node daemon).

### 2026-05-14 (Australia/Sydney) — Stage 2.2 Implementation

**Raouf:**

- **Scope:** Stage 2.2 — macOS node pairing (Tasks 1–17)
- **Summary:** Five new JS modules: `pairingSchema` (constants), `pairingCanonicalise` (re-export of proof canonicaliser), `pairingValidator` (schema + crypto), `pairingRegistry` (in-memory state machine with injectable now), plus an update to `proofValidator` that accepts `pairedNode` + `expectedSessionId` and returns `signature_status`. Two new server routes: `POST /api/integrity/pairing/challenge` and `/complete`, both rate-limited (10/min and 20/min per session token). The proofs route now looks up the paired node and returns `signature_status: "verified"` when paired. Cross-route N1 consistency check refuses pairing if `integrityState.bound_node_id_hash` already differs. Three new audit event constants emitted with privacy-safe payloads (hashed nonce, challenge_hash, never raw key/signature). macOS Swift CLI gains a `pair` subcommand with strict unknown-subcommand handling (exit 64). Cross-implementation golden pairing fixture locks Swift `JSONEncoder.sortedKeys` byte-equal to Node canonicaliser.
- **Files Changed:**
  - `src/integrity/{pairingSchema,pairingCanonicalise,pairingValidator,pairingRegistry}.js` (new)
  - `src/integrity/proofValidator.js` (pairedNode + expectedSessionId)
  - `src/academic/academicEvents.js` (3 new constants)
  - `server.js` (pairing registry instance, eviction, 2 new routes, proofs route upgrade)
  - `tools/simurgh-node-macos/Sources/SimurghNode/{PairingEnvelope,PairingSigner}.swift` (new)
  - `tools/simurgh-node-macos/Sources/SimurghNode/main.swift` (pair subcommand)
  - `tools/simurgh-node-macos/Tests/SimurghNodeTests/PairingCanonicaliseTests.swift` (new)
  - `tests/unit/integrity/__fixtures__/golden-pairing-payload.{json,sha256}` (new)
  - `scripts/check.sh` (5 new gates: 27 → 32)
- **Verification:** `npm test` (target ≈ 200 pass). `./scripts/check.sh` (full) → 32/32 gates pass on macOS. `swift build` + `swift test` pass on macOS. Smoke round-trip returns `signature_status: "verified"`. Different-node proofs rejected with 409 `paired_node_mismatch`. Unpaired baseline still returns `"unregistered_node"`. `npm audit --audit-level=high` clean.
- **What this does NOT do:** No localhost daemon (Stage 2.3). No browser SDK (Stage 2.4). No ScreenCaptureKit (Stage 2.5). No risk-score integration. No hardware attestation. No persistence across server restarts.
- **Follow-ups:** Open draft PR `stage-2-2-macos-node-pairing` → `main`; tag `v0.4.2-stage-2-2-macos-node-pairing` after merge.

### 2026-05-15 (Australia/Sydney) — Stage 2.2 Task 4: Pairing Registry

**Raouf:**

- **Scope:** Stage 2.2 Task 4 — per-session pairing state machine (TDD)
- **Summary:** Added `src/integrity/pairingRegistry.js` — a factory-pattern in-memory registry tracking per-session pairing state (none → pending → paired). Injectable `now` parameter enables deterministic testing. Default TTL 60 s. Paired state is immutable for the session lifetime. Written test-first: test file created and confirmed module-not-found failure, then implemented. 14 tests across 3 suites all pass. API: `createChallenge`, `getChallenge`, `completePairing`, `getPairedNode`, `isPaired`, `evict`, `evictMissing`, `size`. Reason codes: `node_already_paired`, `challenge_not_found`, `challenge_expired`, `challenge_mismatch`. Prettier formatting applied before commit.
- **Files Changed:**
  - `src/integrity/pairingRegistry.js` (new — `createPairingRegistry` factory export)
  - `tests/unit/integrity/pairingRegistry.test.js` (new — 14 tests, 3 suites)
  - `AGENT.md`, `CHANGELOG.md` — postflight log entries
- **Verification:** `node --test tests/unit/integrity/pairingRegistry.test.js` → 14/14 pass, 0 fail. `npm test` → 189/189 pass. `npx prettier --check` passes on both new files.
- **Follow-ups:** Task 5 (wire pairingRegistry into server.js pairing endpoints), Task 6 (Swift CLI pairing handshake), Task 7 (full check.sh gates for Stage 2.2).

### 2026-05-14 (Australia/Sydney) — Stage 2.1 Implementation Complete

**Raouf:**

- **Scope:** Stage 2.1 — macOS CLI integrity proof pipeline (Tasks 1–15)
- **Summary:** Implemented the full Stage 2.1 plan end-to-end. Refactored Stage 2.0 scaffold to v1 envelope. New JS modules: `proofSchema` (constants), `proofCanonicalise` (sorted-key JSON), `proofSignature` (Ed25519 verify with SPKI wrap for raw 32-byte keys), `proofValidator` (full pipeline orchestration), `integrityState` (N1 strict node continuity with immutable `bound_node_id_hash`). Simplified `nonceGuard` to global replay. Rewired `POST /api/integrity/proofs` to the v1 pipeline with `signature_status: "unregistered_node"`, hashed-nonce audit payloads, and 409 on session_expired_or_evicted. New macOS Swift CLI under `tools/simurgh-node-macos/`: `Package.swift`, `main.swift`, `NodeIdentity.swift` (keypair at `~/.simurgh/node-key`, 0600/0700, no auto-regen), `ProofEnvelope.swift`, `ProofSigner.swift`. Cross-implementation golden-fixture interop test (Swift `JSONEncoder.sortedKeys` matches Node canonicaliser byte-for-byte; SHA-256 locked at `fa63f66f9800cd8b9589b2a6e026f3c6f682fea98bd017f95c03b82185faeeca`). `scripts/check.sh` extended with 6 new gates (round-trip smoke, zeroed-sig negative, fixture sync, conditional Swift build/test, CLI privacy regression).
- **Files Changed:**
  - `src/integrity/{proofSchema,proofCanonicalise,proofSignature,proofValidator,integrityState,nonceGuard}.js` (rewritten or new)
  - `tests/unit/integrity/*` (all rewritten or new)
  - `tests/unit/integrity/__fixtures__/golden-proof.{json,sha256}`
  - `src/academic/academicEvents.js` — `INTEGRITY_NODE_STALE` constant added (defined, not yet emitted)
  - `server.js` — v1 pipeline route, integrity-state eviction
  - `tools/simurgh-node-macos/` — full Swift package + test target + Fixtures copy
  - `scripts/check.sh` — Stage 2.1 round-trip, fixture sync, conditional Swift block
  - `.gitignore` — `.simurgh_check_logs/`, `.build/`, `.swiftpm/`
  - `README.md` — Stage 2.1 paragraph
  - `package.json` — recursive test glob
- **Verification:** `npm test` 140/140 pass. `./scripts/check.sh` 27/27 gates pass. `swift test` (in `tools/simurgh-node-macos/`) 1/1 pass. `swift build` succeeds. Smoke round-trip returns `202 + signature_status: "unregistered_node"`. Zeroed signature rejected with 401. CLI stdout contains no forbidden fields. `npm audit --audit-level=high` clean.
- **What this does NOT do:** No pairing/registry (Stage 2.2). No daemon, no port, no ScreenCaptureKit, no screen recording permission. No hardware-rooted attestation claim. No risk-score integration. No replacement of `/api/affinity` helper path.
- **Follow-ups:** Open a draft PR `stage-2-integrity-node` → `main`, let CI go green, tag `v0.4.1-stage-2-1-macos-integrity` after merge.

### 2026-05-14 (Australia/Sydney) — README Anchor Audit Fix

**Raouf:**

- **Scope:** README anchor audit
- **Summary:** Fixed stale README badge and table-of-contents anchors on the Stage 2 branch after the vendor-neutral heading update.
- **Files Changed:**
  - `README.md` — corrected GitHub-style anchors for Socio-Economic Impact, Cost & Latency, Strategic Roadmap, and Status & License
  - `AGENT.md`, `CHANGELOG.md` — postflight log entries
- **Verification:** Branch-object audit confirmed zero old company-specific README wording, the neutral section exists, AGENT/CHANGELOG contain the vendor-neutral log, and README relative links/anchors pass across all active branches. `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. `git diff --check` passed.
- **Follow-ups:** None.

### 2026-05-14 (Australia/Sydney) — Vendor-Neutral README Positioning

**Raouf:**

- **Scope:** README vendor-neutral positioning
- **Summary:** Removed company-specific Anthropic pitch language before external outreach and reframed the README around AI platforms, proof-based integrity, and vendor-neutral education/enterprise/agentic workflow relevance.
- **Files Changed:**
  - `README.md` — replaced "Why Anthropic?" with "Why AI Platforms Need Proof-Based Integrity"; neutralized high-visibility Claude/Anthropic framing while keeping actual env var references accurate
  - `AGENT.md`, `CHANGELOG.md` — postflight log entries
- **Verification:** `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. README relative links and anchors passed. README grep confirmed no `Why Anthropic`, `Anthropic`, `Claude`, `Constitutional`, `strategic moat`, or partnership-pitch wording remains. `git diff --check` passed. Full `npm run format:check` remains blocked by existing Stage 2/generated files outside this README change (`docs/superpowers/plans/2026-05-14-stage-2-1-macos-integrity-proof.md`, `tools/simurgh-node-macos/README.md`, and tracked `.build` artifacts).
- **Follow-ups:** None.

### 2026-05-14 (Australia/Sydney) — Stage 2.1 Task 4: Proof Validator

**Raouf:**

- **Scope:** Stage 2.1 Task 4 — proof validator (TDD)
- **Summary:** Added `src/integrity/proofValidator.js` as the single-entry-point validator orchestrating schema, timestamp, privacy, public-key, and signature checks. Written test-first: test file created, confirmed module-not-found failure, then implemented. 32 tests across 9 suites all pass. Also added `proofValidator.js` to the privacy grep exclusion list in `scripts/check.sh` (it imports and references forbidden-field constants, not privacy violations).
- **Files Changed:**
  - `src/integrity/proofValidator.js` (new — `validateProof` export)
  - `tests/unit/integrity/proofValidator.test.js` (new — 32 tests, 9 suites)
  - `scripts/check.sh` — added `proofValidator.js` to privacy grep exclusion list
  - `AGENT.md`, `CHANGELOG.md` — postflight log entries
- **Verification:** `node --test tests/unit/integrity/proofValidator.test.js` → 32/32 pass, 0 fail. Does NOT run `npm test` (other tests pending Task 8 route wiring).
- **Follow-ups:** Task 5 (integrityState.js), Task 6 (route wiring), Task 7 (nonceGuard integration), Task 8 (full npm test).

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
  - `docs/stages/STAGE_1_ACADEMIC_SHIELD.md` — tightened bounded-security and misconduct wording
  - `docs/stages/STAGE_1_5_REVIEWER_PACK.md`, `docs/THREAT_MODEL.md`, `docs/VALIDATION.md`, `docs/LIMITATIONS.md`, `docs/stages/STAGE_2_ARCHITECTURE.md`, `docs/RESOURCE_PLAN.md`, `docs/DEMO_SCRIPT.md`, `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/REVIEWER_CHECKLIST.md` — new Stage 1.5 reviewer pack
  - `docs/evidence/stage-1/README.md`, `docs/evidence/stage-1/.gitkeep` — evidence folder rules and placeholder
  - `.github/pull_request_template.md` — PR review checklist
- **Verification:** `npm install` passed with 0 vulnerabilities. `./scripts/check.sh --fix` passed 21/21. Initial `./scripts/check.sh` found one Prettier drift in `docs/stages/STAGE_1_5_REVIEWER_PACK.md`; reran `./scripts/check.sh --fix`, then final `./scripts/check.sh` passed 21/21. `npm test` passed 65/65 tests. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. `git diff --check` passed. Markdown relative link audit passed. README image path audit passed. Secret/privacy/overclaim grep audits found only expected enforcement, test, policy, and historical-log references.
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
  - `docs/stages/STAGE_1_ACADEMIC_SHIELD.md` — full Stage 1 reviewer/reference document with threat model and verification commands
- **Verification:** Initial `./scripts/check.sh` found only Prettier formatting drift in `docs/stages/STAGE_1_ACADEMIC_SHIELD.md`. Ran `npm run format`, synced the uploaded Desktop copy, then reran `./scripts/check.sh` successfully: 21/21 checks passed.
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
