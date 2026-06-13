# Banking Shield Preprint Readiness Checklist

Stage: B5-R Banking Shield Independent-Style Review Pack.
Target paper: `../banking-shield-paper-v1.2.md`.
Target PDF: `../banking-shield-paper-v1.2.pdf`.
Status: ready for Zenodo preprint after final verification and PDF export pass.

## Paper Scope

- [x] Fictional, non-bank, research-only framing appears in the abstract and
      introduction.
- [x] No fraud-detection, scam-prevention, payment-safety, payee-verification,
      financial-advice, compliance, production-readiness, or bank-grade security
      claim is made.
- [x] The paper states it is author-prepared and has not undergone formal peer
      review, external banking review, or independent security validation.
- [x] Evidence claims are bounded to the prototype gates, frozen evidence pack,
      fixtures, and formative internal dry-run scope.
- [x] The deterministic mock provider is clearly separated from any live-LLM
      safety claim.

## Review Substitute

- [x] Reviewer 1 privacy/security review recorded.
- [x] Reviewer 2 banking/governance review recorded.
- [x] Reviewer 3 HCI/usability review recorded.
- [x] Reviewer 4 AI safety review recorded.
- [x] Reviewer 5 hostile reviewer #2 attack recorded.
- [x] Author response to every required criticism recorded.
- [x] v1.1 paper incorporates the required B5-R fixes.
- [x] v1.2 paper incorporates the post-review writing revision.

## Evidence and Reproducibility

- [x] Unit test claim: 417/417.
- [x] Banking smoke claim: 14/14.
- [x] AI firewall smoke claim: 5/5.
- [x] Full banking E2E claim: 43/43.
- [x] Banking security audit claim: 27/27.
- [x] Three privacy audits pass.
- [x] No-egress static source gate passes.
- [x] Dependency audit reports 0 vulnerabilities.
- [x] Paper includes reproduction commands for the gate pack.

## Paper Hygiene

- [x] No unresolved `[CITATION NEEDED]` markers in v1.2.
- [x] Forbidden-field count is 46, matching source.
- [x] No reader-facing "B4-A instead" internal-stage wording.
- [x] No "externally validated", "peer reviewed", "independently verified", or
      "banking reviewed" claim.
- [x] LLM assistance and B5-R model-assisted review substitute are disclosed.
- [x] v1.2 PDF exported with embedded text, no encryption, and no JavaScript.

## Preprint Submission Wording

Use:

> This manuscript is an author-prepared preprint supported by automated test,
> audit, claim-review, and model-assisted adversarial-review evidence. It has
> not yet undergone formal peer review, external banking review, or independent
> security validation.

Do not use:

- externally validated
- peer reviewed
- independently verified
- banking reviewed
- production ready
- fraud detection
- scam prevention
- payment safety
- payee verification
- compliance-ready

## Final Gate

Before Zenodo submission, rerun:

```bash
npm test
bash scripts/smoke-banking-pilot.sh
SIMURGH_BANKING_PILOT_AI_EXPLAIN=true bash scripts/smoke-banking-pilot-ai-firewall.sh
bash scripts/smoke-banking-pilot-full-e2e.sh
bash scripts/security-audit-banking-pilot.sh
node scripts/privacy-audit-banking-pilot.mjs
node scripts/privacy-audit-banking-pilot-phase-b.mjs
node scripts/privacy-audit-banking-pilot-ai-firewall.mjs
npm audit --audit-level=moderate
npx prettier --check docs/research/banking-pilot/paper/banking-shield-paper-v1.2.md docs/research/banking-pilot/paper/review/*.md
pandoc docs/research/banking-pilot/paper/banking-shield-paper-v1.2.md -o docs/research/banking-pilot/paper/banking-shield-paper-v1.2.pdf --pdf-engine=xelatex --metadata title="Banking Shield" --metadata author="Mohammad Raouf Abedini" --variable monofont="Menlo"
pdfinfo docs/research/banking-pilot/paper/banking-shield-paper-v1.2.pdf
git diff --check
```
