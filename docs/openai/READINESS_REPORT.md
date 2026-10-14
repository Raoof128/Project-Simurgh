# OpenAI readiness report

**15 October 2026 · Australia/Sydney · branch `openai-readiness`**

**Ready for owner review of a focused research demonstration and application draft.** The
repository is not certified for production deployment. No live OpenAI request, external
submission, push, release or publication was performed. The changes are local and uncommitted.

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

## Actual validation

Runtime: Node.js **24.19.0**, npm **11.9.0**, Linux. Baseline commit:
`61883d9e6cbea6c9dc9faccd50ed72bd0ec28ce1`. The current work is an additive working-tree diff;
the experimental report binds the actual implementation file hashes, not an invented release.

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
| Grant text validation                                                            | Proposal **1,589/3,000 words**; problem statement **165/200 words**; no URLs in plaintext fields         |

The three unit-test skips are one real Chrome parity test and two Lean type-check/gate tests;
Chrome and Lean were not installed. They are not passing proof or browser results. The full
native/desktop quality gate, every historical reproduction ceremony, hosted GitHub Actions
execution and a fresh external machine reproduction were not run. The CI workflow is prepared,
not remotely validated.

Machine-readable current-run evidence: [validation summary](results/validation-summary.json)
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

The independent [scoped security review](SECURITY_REVIEW.md) confirmed four open historical
reuse blockers: recipient-domain substitution, destructive-action authorization that ignores
negation/resource scope, unauthenticated live-gateway session creation, and incomplete live-call
quota accounting. They remain in the historical implementation and must be addressed before
production reuse. The new runner does not use those authorization/live-gateway paths.

The first full test run failed because the relocated README was outside a historical
documentation allowlist. `tests/unit/llmShield/stage5p/rawCodeCensus.test.js` now permits only
the exact original archive bytes through an SHA-256 assertion. Its detection regex, code
allocation rules and other assertions are unchanged. This one historical test-maintenance
change is explicitly disclosed; no historical verifier, signed result or frozen spec was edited.

Generated new evidence is excluded from prose formatting and is validated by its dedicated
verifier. Original archive hashes were checked against the baseline Git objects. The original
5Q coverage, 5R zero added discharge and 5S comparison bounds remain unchanged.

## Requested scope and remaining limits

| Requested work                                   | Disposition                                                                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exhaustive repository/research audit             | **Partial:** repository inventory and selected runtime, evidence, claim and documentation paths reviewed; thousands of files were not individually read or revalidated |
| Current official OpenAI requirements             | **Verified** as described in [SOURCES.md](SOURCES.md); unspecified April attribution and exact legal representations remain unverified                                 |
| Focused defensive question and implementation    | **Completed** within the synthetic local scope in [DESIGN.md](DESIGN.md)                                                                                               |
| Optional OpenAI integration                      | **Implemented and locally tested** against provider-shaped fixtures; live interoperability and account/model access unverified                                         |
| Independent review                               | **Independent agent review completed**, not an external audit; unavailable security scan tooling prevented a completed Codex Security scan                             |
| Research-claim audit and history preservation    | **Completed for promoted claims**; not a certification of all historical research                                                                                      |
| Positive/negative controls and explicit failures | **Passed** for the declared corpus and tests                                                                                                                           |
| Application package                              | **Drafts complete**; applicant identity, authorship, model selection, budget, dates and terms require owner decisions                                                  |
| Final readiness decision                         | **Owner-review ready**; production readiness, live model results and submission authorization remain outstanding                                                       |

The uploaded text referenced `SIMURGH_OPENAI_READINESS_CODEX_PROMPT.md`, but that separate
file was not supplied or present. Work followed the complete requirements in the supplied
pasted text; it does not claim compliance with unseen phases or acceptance criteria.

Before submission, use the [application checklist](APPLICATION_CHECKLIST.md) to resolve the
owner fields, select a resource scenario and approve final wording. Any paid live experiment
needs explicit approval of its model, account, data scope and budget first. The package makes
no eligibility certification, license change or endorsement claim.
