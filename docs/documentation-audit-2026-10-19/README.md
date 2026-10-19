# Repository documentation audit — 19 October 2026

This audit corrects current reviewer, contributor, integration and component guidance and records
an individual disposition for **all 910 document candidates** at baseline
`8d47bbbfd2bc2e351fa334fa3a61acc7ac108ef5`. The inventory includes Markdown, plain text, HTML,
LaTeX/bibliographies, PDFs, the Word document and license text. No baseline candidate was omitted.

**Coverage is explicit:** every candidate received a complete-text automated scan; selected
entry points and claims received editorial review. This is not a claim that all 1.54 million
baseline words, historical citations, proofs and experiments received independent semantic review.
The [file ledger](FILES.md) and [machine inventory](inventory.json) distinguish those scopes.
Frozen evidence, historical specifications, papers and exact archival copies are preserved.

## What changed

- Replaced contradictory status histories with a [reviewer guide](../REVIEWER_INDEX.md),
  [current roadmap](../../ROADMAP.md) and [integration matrix](../INTEGRATIONS.md).
- Connected the latest 288-branch transfer study, developer-role correction, full smoke receipts
  and completed local Phase 8 review while keeping the explorer's older 144-outcome dataset explicit.
- Corrected the legacy helper privacy claim: it reads raw identifiers and capture buffers,
  samples alpha values and can send names/PIDs. Its current supported ingress is retired.
- Updated contributor/runtime instructions, portable Inspect setup, Linux build commands,
  native-platform scope and the independent handoff's old-bundle/current-branch distinction.
- Updated the technical brief, problem statement, proposal context and research-fit discussion
  with actual evidence and retained failures. Applicant identity, eligibility and submission
  decisions remain unresolved; none were inferred from repository text.
- Added a [13-entry primary-source applicability map](SOURCES.md),
  [20-item correction register](ERRATA.md) and [documentation maintenance guide](../../DOCUMENTATION.md).
  Sources cover official OpenAI, MCP, IETF, NIST, OWASP, SLSA, W3C and LangGraph material.

The declaration was committed first at `4ca41a95`. This is documentation and audit-tooling work;
production runtime, tests, dependency locks, stage gates, captured results and protocols are unchanged.
The exact edited files are available in Git and in the ledger's changed-from-baseline field.

## Per-file method

1. Enumerate the exact baseline path set with `git ls-tree`; include all matching extensions and
   named license/citation files. Empty inventories refuse. Record a hash of the sorted path set.
2. Read every UTF-8 file completely; extract all available PDF text with `pdftotext -layout`
   and Word prose from `word/document.xml`. Record original/observed hashes and extraction method.
3. Record placeholder, workstation-path, temporal-status and assurance-language occurrences by
   line. Signals are review candidates, not defects: quoted non-claims and deliberate test examples
   often contain them. Do not execute document code or embedded HTML.
4. Compare current claims with relevant implementation and retained evidence. Name corrections,
   source applicability and residual gaps. Distinguish manual editorial work, selected-claim review,
   exact-byte preservation and automated-only inspection in every row.
5. Parse local Markdown links, reference-style links, image destinations and HTML targets; check
   filesystem paths and applicable heading/HTML anchors. Inspect current commands and retain
   exact verification receipts in [VALIDATION.md](VALIDATION.md).

Executable HTML pages are inventoried as executable pages, not silently classified as prose.
The requirements text file is a dependency manifest; it is preserved. PDF/DOCX extraction does
not validate visual layout, legal rights, resume accuracy or affiliation. Machine-readable research
records and binary archives are supporting evidence governed by their original verifiers, not
newly certified by reading a document that points to them.

## Reproduce the inventory

Run from a full checkout with Python 3.12 and `pdftotext` installed:

```sh
python3.12 docs/documentation-audit-2026-10-19/audit.py \
  --out /tmp/simurgh-documentation-audit-new.json
```

The output path must be new. The script compares current files with the fixed baseline and
uses the explicit [review dispositions](reviews.json); it cannot recreate human review merely
by running. New audit deliverables are checked separately to avoid self-referential hashes.
Later edits legitimately change observed hashes and signal locations; original hashes and the
candidate set remain baseline-bound. A regenerated inventory is not a new expert review.

The local-link checker is also retained. In a separate environment with
`markdown-it-py==3.0.0` installed, run:

```sh
python3 docs/documentation-audit-2026-10-19/check_links.py \
  --out /tmp/simurgh-documentation-links-new.json
```

It checks tracked files, including staged additions; stage the intended documentation before
using it on an uncommitted checkout. It returns nonzero for unresolved local links. It does not
fetch external sources or execute embedded content.

## Remaining review limits

- Historical plans, logs, manuscripts and artifacts retain dated claims, TODOs, workstation paths
  and original results. The ledger does not mark automated-only files “scientifically correct.”
  [Errata](ERRATA.md) supplies current reading guidance without changing their original bytes.
- This work does not execute every historical command, recheck every external citation, rebuild
  publication PDFs, audit theorem correctness or determine current personal/legal facts.
- The latest implementation smoke remains the separate run at `ebf2a752`; documentation-only
  publication does not refresh that receipt. Strict browser parity, interactive platform checks,
  accessibility, real provider IAM/alerts, deployment load and independent custody remain bounded
  by their existing evidence or are explicitly open.
- Primary-source alignment is not NIST, OWASP, MCP, OAuth, SLSA or WCAG certification. No provider
  endorsement, grant acceptance, universal novelty or general model-safety claim is made.

A useful next review can select any ledger path, inspect its signals and scope, and add a dated
semantic finding or experiment. The preserved archive remains falsifiable rather than being
silently rewritten into a uniform present-day success story.
