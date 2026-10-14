# Documentation and presentation audit

The current entry points now distinguish the focused research experiment, historical device work
and proposed future evidence. The review corrected factual overclaims and navigation problems;
it does not certify every historical sentence or predict an application outcome.

## Coverage and method

The baseline inventory came from `git ls-files`, not a filename sample: **710 tracked documents**
with `.md`, `.markdown`, `.txt`, `.rst` or `.adoc` extensions. A script read every file's complete
UTF-8 content and recorded its path, SHA-256, size, line count, lexical signals and unresolved inline
local-link targets. This was approximately **11.7 MB and 221,000 lines**. Binary artifacts, rendered
HTML, source code and external websites are outside this document-only scan.

Automated checks looked for placeholder markers, absolute workstation paths, broad assurance
language, temporal status words and missing inline Markdown link targets. **No missing inline
local targets were found in that scan.** This is not a complete link validator: it does not validate
remote URLs, fragment anchors, reference-style links or paths shown as code. A keyword occurrence
is a review signal, not a defect; quoted non-claims, instructions and authored test examples
frequently contain those words legitimately.

Semantic review focused on these **20 existing reader entry points**: `README.md`, `ROADMAP.md`,
`SECURITY.md`, `PRIVACY.md`, `AGENTS.md`, the pull-request template, `docs/ETHICS.md`,
`docs/DISCLAIMER.md`, the eight device-track documents listed below, `wiki/index.md`, `wiki/log.md`,
`tools/openai-readiness/README.md` and `docs/openai/CLAIM_AUDIT.md`. The newly written contributor
guide, reviewer index and this report were also read and checked. `AGENT.md`'s standing invariants
were read separately; its long activity log received automated scanning, not complete semantic
review in this pass. Specialist reviews of application and security materials are recorded in
those documents and the [readiness report](READINESS_REPORT.md).

The broader [file inventory](evidence/file-audit.json) records a hash, file type, lexical signals
and applicable syntax checks for every tracked or unignored repository file at the final scan.
Regenerate it with `python scripts/audit-reviewer-files.py --out /tmp/reviewer-files.json`.
The output file itself is excluded when regenerating in place; dependencies, caches and private
correspondence outside the checkout are excluded. Binary files receive byte inventory only.
This whole-tree sweep complements the document-specific and semantic scopes above; it does not
convert automated coverage into a claim that every file is professionally or scientifically sound.

## Findings and dispositions

| ID  | Finding                                                                                                                                | Disposition and evidence                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01 | Root privacy language described every research input as metadata-only and named only the historical provider                           | Corrected [PRIVACY.md](../../PRIVACY.md): synthetic research text, optional OpenAI transport, report sensitivity and provider-retention limits now have an explicit scope                                 |
| P02 | The legacy macOS helper can send raw process names/PIDs even though modern daemon proofs reject raw fields                             | Privacy documentation now names the exception and points to the [security review](SECURITY_REVIEW.md). Documentation does not substitute for a runtime fix; consult that review for remediation status    |
| P03 | Ethics language said an HMAC chain could not be changed even by its operator                                                           | Corrected [ETHICS.md](../ETHICS.md): a key holder can recompute a chain; stronger assurance needs independently retained state or custody. Checked against [`hmacChain.js`](../../src/audit/hmacChain.js) |
| P04 | Security and ethics prose conflated Warning and Critical recommendation wording; disclaimer called heuristic risk scores probabilistic | Corrected against [`riskScoring.js`](../../src/academic/riskScoring.js): Warning recommends review, Critical requires review; heuristic scores are not calibrated misconduct probabilities                |
| P05 | May 2026 device documents still called Stage 2 pending or “current” v0.4.4                                                             | Added historical-scope banners without rewriting their body or old measurements; the [reviewer index](../REVIEWER_INDEX.md) identifies current instructions                                               |
| P06 | AGENTS implied populated wiki claim/decision directories                                                                               | Corrected [AGENTS.md](../../AGENTS.md): only the index/log scaffold is present; absent knowledge is not represented as reviewed                                                                           |
| P07 | Pull-request template required obsolete Stage 1.5 boundaries and an entry under a named person's identity                              | Replaced with relevant validation, evidence preservation and accurate attribution expectations                                                                                                            |
| P08 | Security prose guaranteed a 72-hour response and implied source edits necessarily appear in application audit logs                     | Clarified the response target and the actual limits of application logging in [SECURITY.md](../../SECURITY.md)                                                                                            |
| P09 | Roadmap demo command omitted the explicit output path used by its verifier example                                                     | Corrected the path pairing; reviewer instructions say to use a fresh filename for each run                                                                                                                |
| P10 | Historical archives contain subjective scores, “first” claims and dated test totals                                                    | Preserved exactly; [claim audit](CLAIM_AUDIT.md) and reviewer index prevent promoting these to current independent validation                                                                             |
| P11 | AISec manuscript README said it was ready for submission while the source still contains venue placeholders                            | Marked the statement as a dated historical snapshot, clarified that submission/acceptance/peer review are unverified, and fixed the case-sensitive source-directory command                               |

P05 covers `docs/RESEARCH_PROGRAMME.md`, `REVIEWER_CHECKLIST.md`, `DEMO_SCRIPT.md`,
`LIMITATIONS.md`, `RESOURCE_PLAN.md`, `RISK_REGISTER.md`, `THREAT_MODEL.md` and `VALIDATION.md`.
Their dated body text remains historical, including internal contradictions about what was pending.
The banner is a navigation correction, not a revalidation of every old statement.

## Alignment with general research guidance

General application guidance favors demonstrated technical work, a clearly relevant threat model,
reproducible experiments and engagement with existing research. That guidance is **not an
individualized diagnosis of a prior selection decision**. No private correspondence or applicant
details are included here.

The project now presents one narrow question, links code and reproducible controls, and exposes
negative findings alongside strengths. The [reviewer index](../REVIEWER_INDEX.md) makes it practical
to challenge the result. Proposed next evidence remains explicit: independently authored cases,
an authorized live capture, external reproduction and a comparison with established evaluation
frameworks. These would strengthen the research if executed; this editorial work does not claim
new publications, citations, affiliations, fellowships, mentor relationships or external validation.

## Limits and remaining work

- The 710-file scan is coverage of an automated reading procedure, **not 710 completed semantic
  reviews**. Historical papers, frozen specs, signed evidence, fixture documents and long activity
  logs retain their original assertions for future scoped review.
- Possible absolute machine paths and placeholders in historical instructions were not globally
  removed. Some are intended examples or signed context; each requires its own provenance and
  relevance check before changing it.
- Internal document clarity does not establish research novelty, independently verified benchmark
  performance, production security, applicant eligibility or readiness to submit without owner review.
- Security findings and actual check results are tracked in [SECURITY_REVIEW.md](SECURITY_REVIEW.md)
  and [READINESS_REPORT.md](READINESS_REPORT.md), not converted into a presentation pass.

New and edited presentation files were formatted with targeted Prettier commands and checked for
local link existence and whitespace errors. Exact archival copies and existing signed evidence
were excluded from rewriting.
