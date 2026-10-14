# OpenAI Cybersecurity Grant application checklist

**Status: prepared for owner review, not submitted.** Requirements below reflect the [official form](https://openai.com/form/cybersecurity-grant-program/) retrieved on **15 October 2026 (Australia/Sydney)**. The applicant must recheck the form and terms before submission. This document identifies remaining decisions; it does not authorize API expenditure, publishing, or submitting.

## Map the form fields

| Form field                                          | Prepared material / action                                                                                               | State                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| First name; last name; email                        | Owner provides legal identity and appropriate contact email. Do not infer from the repository handle.                    | Owner input required                 |
| Company or University                               | Owner supplies affiliation if applicable.                                                                                | Owner input                          |
| Role / Title; LinkedIn                              | Owner supplies accurate required fields.                                                                                 | Owner input required                 |
| Other contributors and their roles                  | List actual consenting collaborators and roles; do not list automated assistants as independent external reviewers.      | Owner input                          |
| Additional notes                                    | Explain any collaboration request; do not upload confidential or personal data.                                          | Optional                             |
| Project title                                       | “Project Simurgh: Verifiable Tool Authorization for AI Agents”                                                           | Draft ready                          |
| Project proposal                                    | [PROPOSAL.txt](PROPOSAL.txt): plaintext, no URLs or images, below 3,000 words. Resolve pending items before pasting.     | Draft ready; owner decisions pending |
| What problem are you trying to solve?               | [PROBLEM_STATEMENT.txt](PROBLEM_STATEMENT.txt): below 200 words.                                                         | Draft ready                          |
| PDF link if necessary                               | No PDF needed: the proposal is self-contained plaintext.                                                                 | Optional; not prepared               |
| Links to relevant papers on which you are an author | Candidate references and relevance in [SOURCES.md](SOURCES.md). Confirm links and applicant authorship before inclusion. | Owner verification required          |
| Project timeline                                    | Proposed eight-week plan in proposal; replace relative weeks with dates after confirming staff availability.             | Owner start date required            |
| Requested funding / API credits / resources needed  | Select and justify one illustrative scenario; specify whether the request is credits only or a full research grant.      | Owner budget decision required       |

## Technical and research checks before applying

- Read the [research brief](OPENAI_BRIEF.md), [evaluation design](EVALUATION.md), [claim audit](CLAIM_AUDIT.md), and [readiness report](READINESS_REPORT.md). Resolve remaining failures or describe them explicitly.
- Reproduce the key-free run from the repository root: `npm run openai:offline -- --out /tmp/simurgh-openai/report.json`, then `npm run openai:verify -- /tmp/simurgh-openai/report.json`. Use a fresh output path; the CLI refuses to overwrite an existing artifact. Follow the harness README for the exact current requirements. The report's payload is reproducible; a fresh self-generated signature need not be byte-identical across runs.
- Report the actual fixture denominator, allowed-task completion, prohibited effects, positive/negative controls, and verifier outcomes. Do not replace a missing live-model result with an offline score.
- Inspect the documented trust boundary: synthetic single-call proposals and local effects; a separate consequence code path; no independent external witness; no proof of human deliberation; no claim of general safety.
- Preserve Stage 5Q's 6.2%, 5R's zero added discharge, and 5S's comparison bounds and unproven witness independence. Historical signatures and frozen evidence must remain untouched.
- Confirm the rights for shared artifacts and planned public distribution under the existing AGPL-3.0 license. Do not imply compatibility with copying into MIT-licensed repositories. Review any external dataset or dependency separately.

## Owner decisions that prevent a final submission

1. Confirm applicant identity, team, track record, relevant paper authorship, and work location.
2. Choose the explicit live Responses API model ID(s), account/project, synthetic data transmission scope, repetitions, token budget, and maximum spend. The repository's optional live path is not itself authorization to incur charges. No live result was produced for this package.
3. Choose a resource scenario and calendar milestones. USD 500 credits and USD 25,000 combined support are illustrative proposals, not approvals, prices, or known grant offers. Explain how labor is supported if requesting credits only.
4. Review current program terms and any eligibility/export-control representations presented during submission. Their exact applicability is not established by this package. The visible form's non-exclusivity notice also requires owner consideration.
5. Review the final application text and authorize any external submission or publication separately. No application, email, upload to OpenAI, or public release has been sent by preparing these files.

## Local document validation

From the repository root:

```sh
python3 - <<'PY'
from pathlib import Path
for name, limit in [('PROPOSAL.txt', 3000), ('PROBLEM_STATEMENT.txt', 200)]:
    text = Path('docs/openai', name).read_text()
    count = len(text.split())
    assert count <= limit, (name, count, limit)
    assert 'http://' not in text and 'https://' not in text
    print(f'{name}: {count}/{limit} words; no URL links')
PY
```

Word counts include draft notices and headings. Recheck after replacing placeholders or editing. The form's own count and requirements govern the eventual submission.
