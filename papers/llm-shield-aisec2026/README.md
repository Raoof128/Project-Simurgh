# LLM Shield AISec 2026 Paper Package

Blind-review title:

**Verifiable Containment Attestation After LLM Guardrail Failure**

This is the canonical paper package for the Simurgh LLM Shield / Verifiable Containment Attestation research. The current `main.tex`/`main.pdf` is the anonymous AISec submission version.

## Target

- Primary venue: ACM AISec 2026.
- Format: ACM `acmart`, `sigconf,anonymous,review`.
- Paper type: original systems/security research paper with artifact.
- Status: **READY FOR AISec HOTCRP UPLOAD** after the 2026-06-24 audit pass. Keep author identity only in HotCRP metadata during blind review.

## Contents

- `main.tex` - ACM anonymous paper draft.
- `references.bib` - verified bibliography seed.
- `Makefile` - local PDF build.
- `artifact/` - reviewer artifact README and wrapper script.
- `audit/` - claim, venue, anonymity, citation, non-claim, reproducibility, and final readiness audits.
- `source/` - section source notes used to keep claims and disclosures synchronized.

## Build

```bash
cd Papers/llm-shield-aisec2026
make
```

## Submission Files

- Anonymous paper: `main.pdf`
- Anonymous artifact archive: `dist/llm-shield-aisec2026-anonymous.tar.gz`

## Camera-Ready Note

For camera-ready or public preprint use, author information can be restored after the anonymity requirement no longer applies.
