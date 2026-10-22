# Phase 15: consolidated validation and handoff

16 October 2026. This phase ran the maintained local test inventory, replayed saved
research archives, diagnosed aggregate failures and retained the unsuccessful attempts.
**The complete repository is not fully green.** The new Phases 13–14 components pass;
legacy test migration, browser portability and external validation remain open.

## Verified coverage

| Check                             | Observed result                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| New reliability/export components | 12 + 7 focused tests; complete retained evidence verification; hosted job passed                                |
| Maintained Python tools           | 636 passed across all 28 directories; zero failed or skipped                                                    |
| Full Node unit suite              | 5,124 passed, zero failed, one platform-path browser skip (5,125 discovered)                                    |
| Gate-maintenance regressions      | 37 passed; narrow canary exception also retained six changed-value/path/extra-token controls                    |
| Lean                              | All 39 discovered proofs type-check; no escape hatches; negative self-test works                                |
| Linux Rust daemon                 | Formatting and clippy pass; 34 tests pass with Xvfb required                                                    |
| Saved Phases 4–9 archives         | All six separately verify against their pinned roots with fresh execution                                       |
| Phase 10 source / Phase 14 export | Complete 144-branch source replay and exact reprojection pass, including a separate local invocation            |
| Phase 13 retained run             | All 60 fixtures, 210 final calls, 10 initial calls and 600 raw snapshots verify; fresh schedule invariants pass |
| Full end-to-end gate              | 31 step passes, one step failure; test net has 578 passed, one failed and one skipped out of 580                |
| Wrong Node-major guard            | Separate real Node 24 invocation returns the expected wrapper exit 2                                            |
| Formatting and secret scan        | Pass after precise P15-CHECK01 maintenance; frozen artifact bytes preserved                                     |

The end-to-end script includes duplicate Stage 5C execution; its step count is not a
count of distinct independent experiments. Tests overlap with archive checks and each
other; these counts must not be added into a safety-effectiveness score.

## Failures, corrections and remaining limits

The initial aggregate run reported **135 passed steps and six failures**. The formatting
conflict was corrected with individual machine-evidence exclusions; the synthetic-key
false positive was corrected only for the exact public canary assignments in two test
paths. Those changes passed focused checks without editing source-bound tests or artifacts.

Three failed legacy smoke/audit steps expect `gateway_live_provider_disabled`, while the
current server deliberately returns HTTP 410 and `legacy_live_gateway_retired`. This is
an obsolete assertion, not evidence that the retired route performs a provider call.
The Docker smoke also failed during image dependency installation. The isolated validation
recipe passed after trusted-CA package prefetch, offline lockfile installation, and source
ownership compatible with the existing non-root user. Its health/mock/retired-route checks
pass. The original unmodified gate was not silently relabeled green.

The first end-to-end attempt lacked `origin/main` and pytest on its command path. A new
clone with the actual remote reference, pinned pytest environment and Lean corrected
those failures. One failure remains: Stage 5S's frozen prior-script inventory omits the
later strict Stage 5L successor. The [gap map](GAPS.md) explains the required migration.

The first Python workflow attempt reached its wrapper's 600-second limit while exercising
complete fresh-process replay; it is an incomplete attempt, not a zero-test success. The
final workflow invocation has no shortened per-suite limit and its result is retained.
The initial reliability matrix attempt intersected intentionally failing review regressions;
the complete post-fix 12-test suite supersedes that attempt. Both earlier logs remain available.

One Node browser test hard-codes a macOS executable path. Separate Chromium attempts timed
out after 90 seconds and 60 seconds with an isolated profile. The Stage 5R runtime receipt
records **two-runtime parity true, three-runtime parity false**. Its enclosing reproduction
step passes with that explicitly weaker claim. The end-to-end skip assumes `/usr/bin/node`;
a separate invocation using the installed Node 24 binary verified the wrong-major refusal.

macOS/CryptoKit, optional external AgentDojo/live-provider campaigns, and the previously
interrupted Phase 8 whole-change security review were not completed by this Linux run.
No paid API calls or new model inference were used. Independent custody and production
reliability are not established.

Both hosted runs at `eb961854` succeeded: reliability/export run 38852395272 and all 13
readiness jobs in run 38852395223. These hosted results precede the narrow formatter/scanner
maintenance and final documentation; the latter checker change has its own local checks.

## Evidence and reproducibility

- [Structured validation record](validation.json), [exact Python inventory](python-matrix.json).
- [Retained logs](logs.zip) and [log digest manifest](log-manifest.json). The already-public
  token-shaped canary is redacted from logs where present; original and distributed hashes
  are distinguished. These hashes do not establish outside custody.
- [Container receipt](docker-smoke-receipt.json) and [isolated build recipe](Dockerfile.gateway.validation).
- [Runbook](RUNBOOK.md), [current gaps](GAPS.md), and the
  [design/review/ruling ledger](../LOCAL_CONTINUATION_PHASES_13_15.md).
- [Hosted readiness receipt](hosted-readiness.json) and
  [hosted reliability/export receipt](hosted-reliability-export.json).

Runs bind the source commits stated in their receipts. Subsequent documentation and the
narrow checker maintenance do not change the frozen Phase 13/14 source. Historical
reproduction scripts were executed in disposable clones: generated banking/parity files
changed there, while the primary checkout's frozen evidence remained intact.
