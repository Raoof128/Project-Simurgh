# SDK integration validation

Executed 15 October 2026 on Linux x86_64, Node 24.19.0, Python 3.12.14.
The tested SDKs are openai-agents 0.23.1 and langgraph 1.2.15.

| Check                                                | Observed result                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Full repository `PYTHONDONTWRITEBYTECODE=1 npm test` | 5,122 tests: 5,119 passed, zero failed, three skipped (Chrome/Lean unavailable); includes three new bridge tests             |
| Python SDK unittest discovery                        | 31 tests passed, including native framework lifecycles, transport failures, controls and replay/tamper checks                |
| Hash-locked installation                             | All 60 dependencies installed and consistent using both uv and clean pip environments; pip required hashes and binary wheels |
| Saved SDK report in clean pip environment            | Complete fresh replay passed; 102 matrix rows match the original projections                                                 |
| Native lifecycle probes                              | Three exercised: both rejections and LangGraph edit; one explicitly unsupported OpenAI edit                                  |
| CLI negative checks                                  | Existing output refused with exit 1 and unchanged bytes; omitted-case report rejected with exit 1                            |
| Original lab and OpenAI reports                      | Both saved artifacts verified; their sources and report bytes remain unchanged                                               |
| Historical workflow allocator/census tests           | 18 passed; current problem set remains 26, frozen baseline remains 19                                                        |
| Ruff                                                 | All ten Python files pass lint and formatting checks                                                                         |

The Python suite exercises both installed runtimes under the socket/DNS guard. It checks
native state restoration, no callback on rejection, duplicate action IDs, argument preservation,
edited arguments, unknown observation, failed execution, tracing suppression, process cleanup,
bounded requests, bridge death and response/write deadlines. Tests compare the adapter's
reported callbacks and observations with callbacks actually invoked by the harness.

The backpressure regression first failed because a blocking pipe write could outlast the
request deadline. The transport now uses nonblocking writes and shares one deadline across
writing and reading. The test stops the bridge with a deliberately small pipe and confirms
timeout and cleanup. Node framing tests initialize the bridge before malformed input, so a
missing executable cannot masquerade as successful protocol rejection.

Fresh replay compares the full report, including the exact 102 identities, all lifecycle
rows, summaries and source manifest. Negative tests modify case content, counts, extra claims
and source hashes. The manifest covers the Python implementation and tests, dependency pins,
Node bridge, all original lab modules and the baseline report. It does not authenticate the
operator or prove the integrity of installed package bytes at execution time; installation
checks downloaded artifact hashes and execution checks dependency versions.

The original 17-case lab remains the baseline. Original OpenAI verification initially used
an incorrect file path during this validation; rerunning the documented
`docs/openai/results/offline-report.json` path passed. No artifact was changed to satisfy a check.

CI now contains a separate pinned SDK job for Linux/Python 3.12/Node 24, with dependency checks,
both test suites, a generated report and fresh verification of generated and committed reports.
The commands were exercised locally; a hosted GitHub Actions result is not claimed here.

A fresh reviewer independently reran all 31 Python tests and three Node bridge tests,
checked the saved manifest and matrix counts, and found no Critical or Important issue.
One minor issue is deferred: the standalone LangGraph adapter accepts an empty workflow
and does not validate trusted callback observation/result shapes as strictly as the OpenAI
adapter. The study supplies a fixed nonempty inventory and validated bridge callbacks;
its own callback comparisons and fresh replay constrain these inputs. Broader standalone
adapter reuse should add matching input validation and regressions first.

No paid/live model call, external reproduction, durable restart/concurrent-enforcer test,
authenticated approval, real enterprise connector, latency/storage benchmark, deployment or
submission was performed. All limits and denominators in the [results](README.md) apply.
