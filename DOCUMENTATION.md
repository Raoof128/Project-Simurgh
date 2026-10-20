# Documentation map and maintenance rules

Start with [README](README.md) for the research question and runnable demonstration,
[the reviewer guide](docs/REVIEWER_INDEX.md) for evidence, and
[the integration matrix](docs/INTEGRATIONS.md) for supported surfaces and limits.

## Choose the right record

| Need                                           | Document                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Reproduce current evidence without an API key  | [README replay](README.md#replay-the-evidence)                                                                                             |
| Inspect failures as a person or an agent       | [Dashboard and CLI](tools/simurgh-explorer/README.md)                                                                                      |
| See what passed, failed or was excluded        | [Full smoke validation](docs/research/smoke-validation-2026-10-19/RESULTS.md)                                                              |
| Arrange independent reproduction               | [Handoff](docs/research/CONTINUATION_HANDOFF_2026-10-19.md)                                                                                |
| Understand unfinished work                     | [Roadmap](ROADMAP.md)                                                                                                                      |
| Make a reproducible contribution               | [Contributing](CONTRIBUTING.md), [repository rules](AGENTS.md)                                                                             |
| Review security, privacy or ethical boundaries | [Security](SECURITY.md), [privacy](PRIVACY.md), [ethics](docs/ETHICS.md)                                                                   |
| Check authoritative guidance reviewed in 2026  | [Source applicability map](docs/documentation-audit-2026-10-19/SOURCES.md)                                                                 |
| Find a document's audit scope or correction    | [Audit report and per-file ledger](docs/documentation-audit-2026-10-19/README.md), [errata](docs/documentation-audit-2026-10-19/ERRATA.md) |
| Reproduce a historical stage                   | [Historical replay guide](docs/HISTORICAL_REPLAY.md)                                                                                       |
| Read old research or device plans              | [Exact research archive](RESEARCH_HISTORY.md), [exact device roadmap](DEVICE_ROADMAP.md)                                                   |

The [manual review continuation](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md)
records the completed 919-candidate content review and 141 dated findings. Its
[per-file ledger](docs/documentation-audit-2026-10-19/manual-progress.json) records exact reviewed
bytes and individual assessments; [final validation](docs/documentation-audit-2026-10-19/FINAL_VALIDATION.md)
states verification limits. The earlier automated inventory remains a separate historical record.

## Current guidance versus historical evidence

Current entry points describe the maintained branch. A study report describes its own source
revision, corpus and measured run. A plan describes intended work until an execution record
establishes otherwise. A manuscript is not proof of publication, acceptance or peer review.
An activity-log follow-up is not necessarily still open.

The provider-transfer track and local continuation reuse phase numbers. Cite a full path and
revision, such as `docs/research/transfer-phase-17/RESULTS.md`, rather than “Phase 17” alone.
The explorer defaults to the 288-branch transfer study; `--study phase10` selects the historical
144-row dataset. [Readiness repairs and current blockers](docs/readiness-2026-10-21/RESULTS.md)
are recorded separately from the original audit receipts.
Likewise, the root package version, explorer version and research tags are distinct.

## Updating a document

1. Determine whether the file is current guidance, a frozen specification, evidence, a generated
   artifact or a historical snapshot. Check stage authority and source bindings before editing.
2. Tie factual claims to implementation and exact evidence. Keep models, controls, denominators,
   unknowns, failures, source SHA and platform scope together. Do not borrow another study's result.
3. Date primary-source research. Distinguish a source's version/publication date from the date
   it was checked. Separate normative requirements, vendor guidance and project interpretation.
4. Use explicit working directories, pinned prerequisites and fresh output paths in commands.
   Distinguish key-free replay from fresh inference, and build tests from interactive validation.
5. Check relative paths, anchors, commands and formatting for edited mutable files. Record checks
   actually performed and material exclusions. Never label an automated inventory as complete
   semantic or scientific validation.
6. Append the required change-log entries and preserve old evidence bytes. Correct a frozen
   assertion through a dated erratum linking the original path and replacement evidence.

Avoid unsupported superlatives, broad “safe” labels, blanket metadata-only claims or statements
of standards compliance without requirement-specific evidence. Hashes bind bytes under a trust
assumption; signatures alone establish neither truthful execution nor operator independence.

## Document collections

The audit ledger includes each baseline document candidate individually: Markdown, plain text,
HTML, LaTeX/bibliographies, PDFs, DOCX and license text. Executable HTML pages and dependency
manifests are classified explicitly; source code, machine evidence and binary archives remain
supporting records whose original verifiers govern their contents. The ledger records the
exact candidate set and distinguishes content review from full-text automated inspection.

The wiki is currently an index/log scaffold. `wiki/claims/` and `wiki/decisions/` are intended
collections, not available reviewed material. Older delivery bundles keep the revisions and
hashes in their own manifests; a newer branch README does not update those bundles.
