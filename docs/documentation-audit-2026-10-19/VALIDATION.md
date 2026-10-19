# Documentation validation receipt

The documentation audit starts at `8d47bbbfd2bc2e351fa334fa3a61acc7ac108ef5` and follows
the declaration at `4ca41a95`. Production source and frozen evidence are unchanged. This
receipt describes documentation checks and selected command reruns; the earlier full
implementation smoke remains a separate source-bound measurement.

## Executed command examples

| Command or check                                                                                | Result                                                                                                                     | Boundary                                                                          |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run test:openai`                                                                           | 31 tests passed, zero failures/skips                                                                                       | Original Node instrument and transport contract tests                             |
| Fresh `openai:offline` followed by `openai:verify`                                              | Artifact verified with complete deterministic replay                                                                       | Self-attested embedded key; no independent signer or live inference               |
| README `corrected_roles.py demo` with recorded archive/root                                     | All eight rows replayed                                                                                                    | Two authorized effects, one active refusal and five restricted declines retained  |
| Six explorer CLI examples: summary, unauthorized records, unknown records, detail, search, gaps | All exit 0 and return JSON                                                                                                 | Existing 144-row dataset and static index; no new 288-row ingestion               |
| Inspect `test_task.py`                                                                          | Five tests passed                                                                                                          | Existing pinned Python environment reused; no new dependency installation claimed |
| Inspect mock `task.py`                                                                          | Seven samples; three authorized completions, three contained valid attacks, one intended execution error                   | Six scores of one and one score of zero; not a model safety percentage            |
| Pipeline negative/positive controls                                                             | Unprotected `tee` masks exit 73; `pipefail` propagates 73; successful pipeline exits 0                                     | Validates the historical runbook correction without changing stage source         |
| Auditor negative controls                                                                       | Empty inventory and missing baseline file refuse; missing local path/anchor detected; valid inline/reference links resolve | Prose that only resembles a reference definition is not counted                   |
| Headline report checks                                                                          | 288 branches; 23/24 Llama utility, 17/24 → 0/24 restricted effects; Luna zero baseline; 2/3 + 5/5 correction               | Checked directly against retained JSON reports, not copied from secondary prose   |
| Proposal constraints                                                                            | 1,822 proposal words; 175 problem-statement words; no URLs                                                                 | Below the draft's 3,000/200 limits; submission form itself still governs          |

Raw commands, exits, elapsed times and outputs are retained in [logs.zip](logs.zip). Node
26.12.0 and existing Python 3.12 environments were used. The Inspect framework's existing
resource/deprecation warnings remain in the logs. No paid inference, new model acquisition,
provider lifecycle exercise, browser-policy bypass or outreach occurred.

## Inventory, links and preservation

The final checks and exact path/byte counts are in [checks.json](checks.json). The baseline
contains 910 candidates. Of those, 881 remain byte-identical and 29 change (27 editorial
updates plus two append-only root logs). Fourteen short historical attestation runbooks also
received scope review; findings are corrected through additive errata and replay guidance.

The ledger distinguishes 27 editorial updates, 37 selected-claim/scope reviews, two log reviews,
two exact-archive checks and 842 automated-only files. This is **not 910 completed semantic
reviews**. All 910 receive complete-text extraction/scanning and an individual ledger row.

Local link validation uses a CommonMark parser with table support and checks inline/reference
links, image destinations and HTML targets against existing paths and applicable anchors.
Application-root URLs in executable HTML are routes, not filesystem paths. External URLs,
runtime-generated anchors, publication layout and every inline-code path are not covered by that
check. A regex-only preliminary scan falsely interpreted a prose `[P1, byte-stability]: it ...`
line as a reference definition; the parsed scan rejected that false positive. No historical prose
was edited to satisfy a regex artifact.

Targeted Prettier formatting, repository formatting checks and `git diff --check` are recorded
separately. New guides, audit documentation/tooling and generated inventory files are outside the
fixed baseline candidate set and are explicitly checked as additions. Self-referential hashes
are not used for the inventory's own bytes.

## Scope that was not rerun

The full 142-step base and 32-step E2E scripts, the 473-case Python research matrix, Rust,
interactive native apps and real browser rendering were not rerun for this documentation-only
change. Their most recent results and exclusions remain in the
[full smoke report](../research/smoke-validation-2026-10-19/RESULTS.md). Changing prose does not
turn a previous result into a current-head test. No new platform or standards certification follows.

The edited portable Inspect installation recipe uses a fresh Python 3.12 virtual environment
and the existing version-pinned requirements; this pass exercises the commands in an already
prepared environment. A fresh-install claim is deliberately not made.
