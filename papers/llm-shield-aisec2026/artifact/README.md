# Reviewer Artifact

This artifact plan describes what an anonymous reviewer should be able to reproduce from the repository snapshot.

## What Reviewers Can Reproduce

- Stage 3M signed VCA bundle verification.
- Stage 3X public VCA chain reproduction.
- Key paper evidence checks for Stage 3L, Stage 3M, Stage 3V-B, and Stage 3X.
- Paper PDF build, if LaTeX is installed.

## What Reviewers Cannot Reproduce

- The original live Llama Guard 4 GPU capture. The model is not re-executed in CI or in the reviewer artifact.
- Production-traffic validation. No production traffic is claimed.
- Private signing operations. Private keys are not included.

## Dependencies

- Node.js 22 or newer.
- npm dependencies installed via `npm ci`.
- Bash-compatible shell.
- Optional: TeX Live with `acmart` and `latexmk` for rebuilding the PDF.

## Commands

From the repository root:

```bash
npm ci
papers/llm-shield-aisec2026/artifact/reproduce-paper-claims.sh
```

Expected summary:

```text
paper claim artifact checks: PASS
```

The wrapper calls existing repository verifiers where practical and otherwise checks committed evidence files.

## Privacy Guarantees

The paper artifact uses metadata-only evidence. It must not include raw harmful prompt transcripts, raw provider outputs, private keys, real user data, public author identity, or non-anonymous repository links.

## Non-Claims

- No jailbreak immunity.
- No general jailbreak resistance.
- No model-safety proof.
- No production readiness.
- No vendor ranking.
- No signed-evidence-as-ground-truth claim.
- No uniform 12/12 full reproduction claim.

## Known Limitations

The artifact verifies the committed evidence and deterministic replay paths. It does not prove the original live model capture environment, real-world deployment behavior, or coverage of all attack strategies.
