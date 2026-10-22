# LLM Shield AISec 2026 Paper Package

Blind-review title:

**Verifiable Containment Attestation After LLM Guardrail Failure**

This is the paper package for the Simurgh LLM Shield / Verifiable Containment Attestation research. `main.tex`/`main.pdf` contains the anonymous draft prepared for an intended AISec submission. This repository does not establish submission, acceptance, or peer review.

## Target

- Primary venue: ACM AISec 2026.
- Format: ACM `acmart`, `sigconf,anonymous,review`.
- Paper type: original systems/security research paper with artifact.
- Status: **Historical submission draft; current venue readiness requires owner review.** The 2026-06-24 audit recorded upload readiness for that snapshot. Venue metadata still contains `TBD` in `main.tex`; current deadlines, required metadata, anonymity rules and artifact links must be rechecked before submission. The paper has not been rebuilt or its numerical results revalidated by the OpenAI readiness sweep.
- For the current research demonstration and its limitations, start with the [reviewer index](../../docs/REVIEWER_INDEX.md).

## Contents

- `main.tex` - ACM anonymous paper draft.
- `references.bib` - verified bibliography seed.
- `Makefile` - local PDF build.
- `artifact/` - reviewer artifact README and wrapper script.
- `audit/` - claim, venue, anonymity, citation, non-claim, reproducibility, and final readiness audits.
- `source/` - section source notes used to keep claims and disclosures synchronized.

## Build

```bash
cd papers/llm-shield-aisec2026
make
```

## Submission Files

- Anonymous paper: `main.pdf`
- Anonymous artifact archive: `dist/llm-shield-aisec2026-anonymous.tar.gz`

## Camera-Ready Note

For camera-ready or public preprint use, author information can be restored after the anonymity requirement no longer applies.
