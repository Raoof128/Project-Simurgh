# Validation record — 15 October 2026

Executed in the managed Linux x86_64 workspace with Node.js 24.19.0 and npm 11.9.0, on the
`openai-readiness` branch. Implementation base: `c32e0e8cecd66cbcd404c3785193723de1ebc411`.
The saved report pins the six final implementation source hashes; this record is not a release.

| Check                                                     | Observed result                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Full `npm test` after review fixes                        | 5,119 tests: 5,116 passed, zero failed, three skipped                                                            |
| New assurance tests, included in that run                 | 18 passed: 10 core, seven study, one CLI integration                                                             |
| Saved assurance report replay                             | Complete 51-case matrix equals fresh execution and source manifest                                               |
| Original `docs/openai/results/offline-report.json` replay | Verified; original source files and artifact unchanged                                                           |
| Isolated mutation sensitivity probes                      | Policy bypass, missing observation reported clean, and suppressed physical writes each caused assertion failures |
| Workflow census                                           | Exact current set: 26; frozen baseline unchanged at 19                                                           |
| Historical archive SHA-256 checks                         | Original README and device roadmap hashes unchanged                                                              |

The three suite skips are real Chrome parity and two Lean-dependent checks because those tools
are unavailable locally. They are not passing browser or proof results. No paid or live model
calls, native application build, external operator reproduction or hosted Actions execution was
performed. The CI workflow is wired and its commands were exercised locally; hosted CI remains
unverified until the remote run completes.

A fresh code reviewer found a mismatch between JavaScript property validation and canonicalization:
non-enumerable fields could disappear from a binding; accessor-backed authority arrays could change
while being read; sparse arrays could silently change the approval inventory. Three new regressions
failed before repair. The implementation now requires enumerable data fields and captures dense
array values once, rejecting indexed accessors and extra properties. Malformed observation arrays
produce unknown. All 51 ordinary-data fixture outcomes remained identical; the source hashes were
refreshed and the report replayed after repair. This fixes the local API contract; the original
JSON fixtures did not exploit those edge cases.

The review also identified inaccurate temporal wording. The tested grant is added **after policy
commitment but before action execution**. Documentation now states that boundary; retroactive
approval after a completed effect remains untested. The review did not authenticate external
publications or assess production readiness. Source retrieval provenance is recorded separately.

One development CLI run correctly failed source-manifest verification because formatting changed
source bytes while the test was running. After formatting completed, the stable-source CLI run
and full suite passed without weakening the verifier. Full-suite Python imports rewrote an
existing tracked bytecode file; that incidental change was restored and is not part of this work.

The added CI step is recorded as `unclassifiable_step` by the historical workflow classifier.
Only its explicitly mutable `current` inventory was rederived. The new lab's own six-field gate
lifecycle is declared in the [design](../superpowers/specs/2026-10-15-assurance-lab.md); the old
classifier's limitation is preserved rather than represented as a resolved historical finding.

Read the [result and trust boundary](README.md) alongside these checks. Passing tests establish
the instrument's bounded behavior, not universal safety or a novel advantage over checkpoints.
