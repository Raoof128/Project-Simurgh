<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Simurgh LLM Shield — 3A–3C writeup

Three framings of the same result, drawn from
[`../STAGE_3C_FINDINGS.md`](../STAGE_3C_FINDINGS.md) and
[`../RELATED_WORK.md`](../RELATED_WORK.md).

- [`01-summary.md`](01-summary.md) — one-page narrative summary of the 3A–3C result and
  positioning.
- [`02-arxiv-note.md`](02-arxiv-note.md) — compact arXiv-style technical note
  (abstract → method → evaluation → limitations), markdown form.
- [`03-release-summary.md`](03-release-summary.md) — GitHub release blurb + LinkedIn post.

**Core result.** Against a frozen adversarial corpus, deterministic
canonicalize-then-classify + a framing-aware context guard + a `warning` tier improve
adversarial detection 2/30 → 18/30, preserve clean-benign at 10/10, and reduce
hard-negative blocked false positives 2/5 → 0/5; held-out generalization is 7/9.

**Frame.** Not jailbreak immunity — an application-layer, pre-provider boundary made
measurable, reproducible, and auditable, via an honest seed → failure → hardening arc.

Citations in the note were verified against live sources during preparation; the three
arXiv entries were confirmed against their abstract pages (title, authors, date) on
2026-06-16. A compiled LaTeX version of the note is in
[`02-arxiv-note.tex`](02-arxiv-note.tex) (self-contained; no `.bib` needed).
