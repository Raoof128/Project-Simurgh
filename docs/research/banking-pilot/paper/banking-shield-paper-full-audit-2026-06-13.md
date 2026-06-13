# Banking Shield Paper Full Audit

Audit date: 2026-06-13.
Auditor: Codex 5.5, principal software engineering and cybersecurity review.
Scope: `docs/research/banking-pilot/paper/banking-shield-paper-v1.0.md` final
audited revision, supporting source, tests, scripts, fixtures, and prior
claim-audit notes.

## Executive Verdict

The Banking Shield paper is ready for supervisor/external review as a
research-only paper. The implementation gates pass, the paper's live factual
claims match the current source, the overclaim boundary is intact, and all
previous paper-readiness blockers from this audit have been resolved.

This verdict is bounded: the paper is ready within its stated research-only
scope. It is not a production-readiness, compliance, fraud-detection,
scam-prevention, payment-safety, payee-verification, or financial-advice claim.

## Resolved Issues

### R1 - Forbidden-field count corrected

Earlier audit pass: the paper said the forbidden-field firewall had 47 names,
but the source had 46.

Final state: the paper now consistently says 46. Live source verification:

```text
node -e "import('./src/bankingPilot/forbiddenBankingFields.js').then(m=>console.log(m.FORBIDDEN_BANKING_FIELD_NAMES.length))"
46
```

Authoritative source: `src/bankingPilot/forbiddenBankingFields.js:5-52`.

### R2 - Evidence provenance clarified

Earlier audit pass: the paper pinned the evidence pack to `92dabb4`, while this
audit verified checkout `3dcf21b`.

Final state: the paper now states both facts: empirical evidence traces to the
Stage B5 evidence pack at `92dabb4`, and the claims were re-audited against
checkout `3dcf21b` on 2026-06-13 before the final paper-only edits.

### R3 - Internal stage label removed from reader-facing prose

Earlier audit pass: a related-work paragraph used `B4-A` as if it were the
system name.

Final state: the paragraph now says `Banking Shield`.

### R4 - Citation placeholders removed

Earlier audit pass: three `[CITATION NEEDED]` markers remained.

Final state: the active paper has no unresolved citation placeholders. Academic
transparency-artifact references use DOI-backed Model Cards and Datasheets
papers; open-banking consent and payee-confirmation context use stable
institutional/standards sources.

## Security Review

No implementation-level security failure was found during this audit.

Validated controls:

- Forbidden banking fields are recursively rejected, including structural
  pollution keys (`src/bankingPilot/forbiddenBankingFields.js:5-81`).
- The AI explanation input is constructed from allowlisted metadata, re-scanned,
  and capped at 4096 bytes (`src/bankingPilot/bankingAiExplain.js:23-46`).
- The narrative provider is reached only after the input firewall and is local
  deterministic code (`src/bankingPilot/bankingAiExplain.js:48-49`).
- The output firewall enforces top-level schema allowlisting, 600-character
  field caps, non-empty `non_claims`, negation-aware forbidden-claim scanning,
  and official-result equality (`src/bankingPilot/bankingNarrativeOutputFirewall.js:15-129`).
- Receipts assert `sensitive_payload_sent_to_ai:false` and
  `network_egress_used:false`, and tests cover success, disabled, and
  fail-closed paths.
- The no-egress audit scanned the four AI-firewall modules and found no network
  primitives.

Residual risks are disclosed in the paper: deterministic mock only, no live LLM
filtering, n=5 trusted insiders, incomplete denylist scanning, self-authored
gates, single-node in-memory prototype, and server-keyed tamper-evident rather
than tamper-proof audit chains.

## Overclaim Review

The paper maintains its non-claim discipline. Capability nouns such as fraud
detection, scam prevention, payment safety, payee verification, financial
advice, compliance, production readiness, and bank-grade security appear in
negated/non-claim contexts, denylist descriptions, related-work contrasts, or
limitations. The strongest reader-facing claims are about mechanisms, gate
results, fixtures, and formative internal dry-run aggregates, not real-world
banking outcomes.

## Citation Review

No `[CITATION NEEDED]` marker remains in the active paper. DOI-backed academic
references are present for warning comprehension, data minimisation,
tamper-evident logging, LLM/AI risk frameworks, and AI transparency artifacts.
Institutional references are present for open-banking consent context and
payee/beneficiary name-checking schemes.

## Verification Performed

```text
npm test
# tests 417
# pass 417
# fail 0

bash scripts/smoke-banking-pilot.sh
smoke-banking-pilot: 14 passed, 0 failed

SIMURGH_BANKING_PILOT_AI_EXPLAIN=true bash scripts/smoke-banking-pilot-ai-firewall.sh
PASS=5 FAIL=0

bash scripts/smoke-banking-pilot-full-e2e.sh
smoke-banking-pilot-full-e2e: 43 passed, 0 failed

bash scripts/security-audit-banking-pilot.sh
security-audit-banking-pilot: 27 passed, 0 failed

node scripts/privacy-audit-banking-pilot.mjs
privacy-audit-banking-pilot: PASS

node scripts/privacy-audit-banking-pilot-phase-b.mjs
privacy-audit-banking-pilot-phase-b: PASS

node scripts/privacy-audit-banking-pilot-ai-firewall.mjs
privacy-audit-banking-pilot-ai-firewall: PASS
ai firewall modules contain no network primitives (4 scanned)

npm audit --audit-level=moderate
found 0 vulnerabilities
```

Paper-readiness scans after edits:

```text
rg -n "\\b47\\b|B4-A instead|\\[CITATION NEEDED\\]" docs/research/banking-pilot/paper/banking-shield-paper-v1.0.md
# no matches

npx prettier --check docs/research/banking-pilot/paper/banking-shield-paper-v1.0.md docs/research/banking-pilot/paper/banking-shield-paper-full-audit-2026-06-13.md
# All matched files use Prettier code style
```

## Final Recommendation

Proceed to supervisor or external research review. For formal venue submission,
the paper should still receive normal human author review for venue formatting,
reference style, and strategic positioning, but there is no known factual,
security, overclaim, or citation-placeholder blocker in the active paper.
