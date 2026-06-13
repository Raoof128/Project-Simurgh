# Banking Shield — Preprint Package

**Title.** Banking Shield: Machine-Checked Absence Claims for Privacy-Sensitive
AI Explanations.

**Author.** Mohammad Raouf Abedini, Department of Computing, Macquarie
University.

**Status.** Author-prepared preprint. Not yet peer reviewed, externally
bank-reviewed, or independently security-validated. Fictional, non-bank,
research-only prototype: no fraud-detection, scam-prevention, payment-safety,
payee-verification, financial-advice, compliance, or production-readiness claim.

## Contents

| Path                                                   | What it is                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `main.tex`                                             | IEEEtran conference-format paper (canonical).                                 |
| `references.bib`                                       | Bibliography; every entry verified via CrossRef on 2026-06-13.                |
| `Makefile`                                             | `make` builds `main.pdf` via `latexmk`.                                       |
| `main.pdf`                                             | Compiled preprint (7 pages).                                                  |
| `source/`                                              | Markdown drafts (v0.1–v1.2), outline, audits, and the Stage B5-R review pack. |
| `source/banking-shield-paper-v1.2.md`                  | The prose source the LaTeX was built from.                                    |
| `source/banking-shield-paper-full-audit-2026-06-13.md` | Full factual/security/overclaim audit + addenda.                              |
| `source/banking-shield-paper-claim-audit.md`           | Forbidden-claim discipline audit.                                             |
| `source/review/`                                       | Five simulated hostile reviews + author response.                             |
| `PAPER_CLAIM_AUDIT.md`                                 | Citation + claim verification summary for this package.                       |

## Build

```bash
make            # -> main.pdf
make clean      # remove build artifacts
```

Requires a TeX Live distribution with `IEEEtran`, `tikz`, `booktabs`,
`orcidlink`, and `hyperref`.

## Minting the Zenodo DOI

The preprint is positioned for a Zenodo deposit (same path as the companion
voting-pilot paper). The deposition metadata is pre-filled in
[`.zenodo.json`](.zenodo.json) (title, author + ORCID, abstract, keywords,
`cc-by-4.0` license, related identifiers). Minting requires an authenticated
upload, so it is a manual step:

1. Build the PDF: `make` (produces `main.pdf`).
2. Sign in at <https://zenodo.org> and start **New upload**.
3. Upload `main.pdf`. Copy the fields from `.zenodo.json` into the form
   (or use the Zenodo REST API with the JSON as the deposition body).
4. **Reserve DOI** (or publish) to obtain `10.5281/zenodo.<id>`.
5. In `main.tex`, uncomment the DOI line in the title `\thanks{}` block and fill
   the id, then re-run `make` so the published PDF carries its own DOI.
6. Add a self-citation `@misc` entry to `references.bib` if cross-referencing
   from other papers, mirroring `simurgh-voting-pilot/references.bib`.

License note: `.zenodo.json` declares `cc-by-4.0` for the manuscript text; the
code in the repository is licensed under AGPL-3.0-or-later (see the root
[`LICENSE`](../../LICENSE)). Change the `license` field if you prefer a different
manuscript license.

## Provenance

All empirical facts trace to the Stage B5 evidence pack frozen at repo `main`
commit `92dabb4`, re-audited at checkout `3dcf21b`, and re-verified live on
2026-06-13. The reproduction gates are listed in the paper's Reproducibility
section and run from the repository root.

## Reproduction gates

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
```

At the evidence freeze these passed: 417/417 unit tests, 14/14 banking smoke,
5/5 AI-firewall smoke, 43/43 full E2E, 27/27 security audit, three privacy
audits PASS, no-egress static gate PASS (4 modules), 0 dependency
vulnerabilities.
