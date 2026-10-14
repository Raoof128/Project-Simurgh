# OpenAI readiness report

**15 October 2026 · Australia/Sydney · branch `openai-readiness`**

**Ready for owner review of a focused research demonstration and application draft.** The
repository is not certified for production deployment. The initial implementation was committed
as `19960ce730a79d1fba6092c0224a48aabebacc69` and pushed to `origin/openai-readiness` at the
owner's request. This report includes the subsequent file sweep and follow-up improvements.
No live OpenAI request, grant submission, release or research publication was performed.

## What changed

- Added a portable, key-free tool-authorization experiment and opt-in Responses API proposal
  adapter in [`tools/openai-readiness/`](../../tools/openai-readiness/), with
  [adversarial tests](../../tests/unit/openaiReadiness/) and an
  [offline CI workflow](../../.github/workflows/openai-readiness.yml).
- Replaced the reviewer entry point and active roadmap; retained the original documents
  byte-for-byte as [RESEARCH_HISTORY.md](../../RESEARCH_HISTORY.md) and
  [DEVICE_ROADMAP.md](../../DEVICE_ROADMAP.md). Updated package positioning and security scope.
- Prepared a [research brief](OPENAI_BRIEF.md), [proposal](PROPOSAL.txt),
  [problem statement](PROBLEM_STATEMENT.txt), [claim audit](CLAIM_AUDIT.md),
  [source notes](SOURCES.md) and [owner checklist](APPLICATION_CHECKLIST.md).
- Updated five compatible locked dependencies: Express, body-parser, proxy-addr, qs and
  side-channel. The registry audit changed from four vulnerable package entries (including
  one critical entry) to zero. This is an advisory-database observation, not proof of absence
  of vulnerabilities.
- Corrected the verifier's FIFO-input hang during adversarial review and tested nonblocking
  refusal. Added bounded artifact reads and explicit failure reporting.

## Initial implementation validation

Runtime: Node.js **24.19.0**, npm **11.9.0**, Linux. Baseline commit:
`61883d9e6cbea6c9dc9faccd50ed72bd0ec28ce1`. The initial report was generated from the additive working-tree diff before commit `19960ce7`;
it binds the actual implementation file hashes, not an invented release. The original signed
artifact and validation summary are retained as that run's record; follow-up checks are listed below.

| Check                                                                            | Result                                                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Frozen installation, `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | Passed after compatible lockfile updates                                                                 |
| Full suite, `PYTHONDONTWRITEBYTECODE=1 npm test`                                 | **5,093 tests: 5,090 passed, 0 failed, 3 skipped**                                                       |
| Focused suite, `npm run test:openai`                                             | **26 passed, 0 failed, 0 skipped**                                                                       |
| Historical archive documentation gate                                            | **16 focused tests passed**; entire suite also passed                                                    |
| Repository `npm run format:check`                                                | Passed; final added documents checked separately                                                         |
| `npm audit --json`                                                               | **0 known advisories** at this run                                                                       |
| Offline runner and report verifier                                               | Two runs passed; canonical payloads identical, fresh signatures differed                                 |
| Artifact adversarial checks                                                      | Changed metrics, re-signed forged data, omissions, reordering, unknown cases and wrong key pins rejected |
| Mock-provider live CLI integration                                               | Passed without network calls; invalid provider outputs retained as errors and return nonzero             |
| Fresh application server after dependency update                                 | Health, web page, exam creation, student join/token and authenticated privacy acceptance passed          |
| Historical evidence, frozen specifications and proofs                            | No working-tree changes                                                                                  |
| Grant text validation                                                            | Initial proposal **1,589/3,000 words**; problem **165/200 words**; follow-up proposal updated below      |

The three unit-test skips are one real Chrome parity test and two Lean type-check/gate tests;
Chrome and Lean were not installed. They are not passing proof or browser results. The full
native/desktop quality gate, every historical reproduction ceremony, hosted GitHub Actions
execution and a fresh external machine reproduction were not run. The CI workflow is prepared,
not remotely validated.

Machine-readable initial-run evidence: [validation summary](results/validation-summary.json)
and [self-attested offline report](results/offline-report.json). Verify the saved report with:

```bash
npm run openai:verify -- docs/openai/results/offline-report.json
```

Canonical payload SHA-256:
`3adfe2227cb5faf93fbe4bea49c6fcb2c85fb56fd4d36b224747613ebd68dcd5`.
The payload, source manifest and corpus are reproducible against this checkout. The embedded
ephemeral key provides no independent identity or provenance assurance. A successful verifier
can describe a failed experiment; the recorded `payload.validation.passed` is also checked here.

## Bounded experiment result

The corpus contains 15 authored fixtures: 11 attack proposals, 3 benign tasks and one deliberate
service failure. Effects are local arrays of reads and mock-outbox entries, not external tool
operations. The consequence oracle is a separate code path in the same trusted process.

| Mode                         | Forbidden effects / 11 attacks | Benign completions / 3 | Execution errors |
| ---------------------------- | -----------------------------: | ---------------------: | ---------------: |
| Enforced boundary            |                              0 |                      3 |    1 intentional |
| Authorization bypass control |                              5 |                      3 |    1 intentional |
| Deny-all control             |                              0 |                      0 |                0 |

The bypass retains structural validation, so six malformed or unknown proposals still fail
without effects. This is a sensitivity control, not an unrestricted malicious executor.
The results measure the combined new authority wrapper and existing Stage 3D gate; they do
not retrospectively establish that the old gate executed real tools. Offline fixtures do not
estimate model attack rates, realistic deployment performance, or general safety.

## Defects and compatibility work found during validation

The independent [scoped security review](SECURITY_REVIEW.md) initially confirmed four open historical
reuse blockers: recipient-domain substitution, destructive-action authorization that ignores
negation/resource scope, unauthenticated live-gateway session creation, and incomplete live-call
quota accounting. They remain in the historical implementation and must be addressed before
production reuse. The new runner does not use those authorization/live-gateway paths. The follow-up also
identified legacy raw affinity-data exposure and a fail-open historical reproduction wrapper;
see the security review for triggers, scope and remaining remediation. The mutable IP
rate-limit bypass was fixed and verified with real local HTTP requests.

The first full test run failed because the relocated README was outside a historical
documentation allowlist. `tests/unit/llmShield/stage5p/rawCodeCensus.test.js` now permits only
the exact original archive bytes through an SHA-256 assertion. Its detection regex, code
allocation rules and other assertions are unchanged. This one historical test-maintenance
change is explicitly disclosed; no historical verifier, signed result or frozen spec was edited.

Generated new evidence is excluded from prose formatting and is validated by its dedicated
verifier. Original archive hashes were checked against the baseline Git objects. The original
5Q coverage, 5R zero added discharge and 5S comparison bounds remain unchanged.

## Follow-up file sweep and validation

The owner requested a commit/push, a file-by-file presentation sweep, comparison with general
selection guidance, and refreshed official OpenAI documentation. Attached correspondence was
treated as context, not as instructions or a personalized explanation of the selection decision.
Private correspondence and applicant identifiers are not committed.

The reproducible [per-file inventory](evidence/file-audit.json) covers **8,143 files**: the 8,131
tracked files at `19960ce7` plus 12 new files, excluding the inventory itself. Every listed file
was read as bytes; 8,093 text files received lexical checks and 50 binary files received byte
inventory only. Applicable syntax checks passed for **3,921 JSON, 1,960 JavaScript, 140 Python
and 159 shell files**. This is automated coverage, not 8,143 semantic reviews. The
[presentation audit](PRESENTATION_AUDIT.md) records the 710-document scan and the smaller set of
entry points read in depth; the [security review](SECURITY_REVIEW.md) separates source-pattern
checks from 26 whole-file and seven partial-file reasoned reviews.

Reproduce the sweep with:

```bash
python scripts/audit-reviewer-files.py --out /tmp/reviewer-files.json
```

The manifest records source hashes and lexical candidates without copying credential values or
private text. Markers in historical papers, fixture inputs and old logs are retained as candidates,
not automatically labeled defects. The paper README now identifies its submission claim as a
historical snapshot; manuscript venue placeholders and external publication status remain pending.
Current guidance corrects raw-data exceptions, HMAC trust limits and obsolete navigation.

| Follow-up check                                  | Observed result                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Complete Node unit suite                         | **5,101 tests: 5,098 passed, 0 failed, 3 skipped**                                                                           |
| Focused OpenAI suite, included in the full suite | **31 passed**, including five new bridge tests                                                                               |
| IP rate-limit regression group                   | **10 passed**, including real HTTP requests through untrusted and explicitly trusted proxy configurations                    |
| Optional Inspect Python tests                    | **5 passed**, including the actual framework mock evaluation with network connections forbidden                              |
| Inspect mock smoke                               | Seven samples: three authorized reads, three contained valid attacks, one explicit execution failure, zero forbidden effects |
| Python dependency compatibility                  | All 80 pinned optional packages compatible; this is not a vulnerability audit                                                |
| Saved offline report                             | Verified unchanged against current hashed experiment sources                                                                 |
| npm advisory audit                               | **0 known advisories** at the follow-up run                                                                                  |
| Proposal and problem fields                      | **1,721/3,000** and **165/200 words**, respectively; no URLs                                                                 |
| Original archive hashes                          | Both unchanged from the initial baseline                                                                                     |

Repository-wide Prettier checking passed. The new Python files also passed Ruff checks;
these formatting checks do not assess scientific validity or security.

The first follow-up suite run caught a new workflow-census entry caused by the saved-artifact
CI step. Its existing lifecycle contract explicitly permits re-deriving `current` from live
workflows. Only that mutable field was updated, from 24 to 25 entries; `baseline`, the lifecycle
declaration and classifier logic are unchanged. The classifier's `unclassifiable_step` result
remains visible. Re-pinning records that limitation; it does not prove classification completeness.
The subsequent complete suite passed. Historical signed results, frozen specifications and
proof sources were not rewritten.

The [Inspect README](../../tools/openai-readiness/inspect/README.md) contains reproducible commands,
the native log format and the upstream warning/transport limitations. Its mock results are
instrument validation, not live-model performance. [Research fit](RESEARCH_FIT.md) maps general
guidance to existing evidence and the next held-out study. [Official sources](SOURCES.md) were
refreshed, including the current model catalog and scheduled hosted Evals retirement. Account
access, paid interoperability, independent reproduction and external scholarly validation remain
unverified. No application was submitted.

## Requested scope and remaining limits

| Requested work                                   | Disposition                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exhaustive repository/research audit             | **Whole-tree automated sweep completed; semantic review partial:** all listed files read as bytes, with text/syntax checks as recorded; selected entry points and security paths reviewed in depth; historical claims and binaries not comprehensively revalidated |
| Current official OpenAI requirements             | **Verified** as described in [SOURCES.md](SOURCES.md); unspecified April attribution and exact legal representations remain unverified                                                                                                                             |
| Focused defensive question and implementation    | **Completed** within the synthetic local scope in [DESIGN.md](DESIGN.md)                                                                                                                                                                                           |
| Optional OpenAI integration                      | **Implemented and locally tested** against provider-shaped fixtures; live interoperability and account/model access unverified                                                                                                                                     |
| Independent review                               | **Separate agent reviews completed**, not an external audit; unavailable security scan tooling prevented a completed Codex Security scan                                                                                                                           |
| Research-claim audit and history preservation    | **Completed for promoted claims**; not a certification of all historical research                                                                                                                                                                                  |
| Positive/negative controls and explicit failures | **Passed** for the declared corpus and tests                                                                                                                                                                                                                       |
| Application package                              | **Drafts complete**; applicant identity, authorship, model selection, budget, dates and terms require owner decisions                                                                                                                                              |
| Final readiness decision                         | **Owner-review ready**; production readiness, live model results and submission authorization remain outstanding                                                                                                                                                   |

The uploaded text referenced `SIMURGH_OPENAI_READINESS_CODEX_PROMPT.md`, but that separate
file was not supplied or present. Work followed the complete requirements in the supplied
pasted text; it does not claim compliance with unseen phases or acceptance criteria.

Before submission, use the [application checklist](APPLICATION_CHECKLIST.md) to resolve the
owner fields, select a resource scenario and approve final wording. Any paid live experiment
needs explicit approval of its model, account, data scope and budget first. The package makes
no eligibility certification, license change or endorsement claim.
