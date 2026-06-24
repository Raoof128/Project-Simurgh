# Non-Claim Audit

Audit date: 2026-06-24

## Banned Phrases Scan

Forbidden terms to scan before submission:

```bash
rg -n "jailbreak-proof|solves jailbreaks|guarantees safety|prevents all attacks|production-ready|certified|proves model safety|ground truth|real-world validated|vendor .* unsafe" Papers/llm-shield-aisec2026
```

Current manual result: no intentional use in `main.tex` or source claim notes; matches inside audit files are scan rules or examples and must be reviewed in context.

## Required Non-Claims Present

- No jailbreak immunity.
- No general jailbreak resistance.
- No production readiness.
- No model safety proof.
- No vendor ranking.
- No signed-evidence-as-ground-truth claim.
- No uniform 12/12 full reproduction claim.

## Subtle Overclaim Controls

- Perfect counts are qualified as corpus-bound.
- Stage 3V-B is described as an input-only boundary study.
- Stage 3X is described as tiered replay.
- Signatures are described as integrity/issuer evidence, not factual truth.
