# Assurance lab through two agent runtimes

OpenAI Agents SDK **0.23.1** and LangGraph **1.2.15** now execute the original assurance
lab through native approval and resume flows. All **102 case/control/runtime rows** match
the original lab's authority, trace, observed effects and verdicts. The runtimes are real;
action proposals are scripted and no model endpoint is called.

This closes a bounded integration gap from the [industry review](../INDUSTRY_GAPS.md).
It establishes compatibility for these pinned APIs and authored fixtures. It does not
establish production readiness, effectiveness against model-generated attacks or a new
authorization mechanism. See the [API sources](SOURCES.md), [validation](VALIDATION.md),
[design](../../superpowers/specs/2026-10-15-assurance-sdk-design.md) and
[saved report](evidence/report.json).

## Reproduce

Tested on Linux x86_64 with Python 3.12.14 and Node 24.19.0. From the repository root:

```bash
python3.12 -m venv /tmp/simurgh-assurance-sdk-venv
/tmp/simurgh-assurance-sdk-venv/bin/python -m pip install --require-hashes --only-binary=:all: -r tools/assurance-sdk/requirements.lock
/tmp/simurgh-assurance-sdk-venv/bin/python -m pip check
export PYTHONPATH=tools/assurance-sdk
export PYTHONDONTWRITEBYTECODE=1
node --test tests/unit/assuranceSdk/*.test.js
/tmp/simurgh-assurance-sdk-venv/bin/python -m unittest discover -s tools/assurance-sdk/tests -v
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_sdk.study run --out /tmp/simurgh-sdk/report.json
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_sdk.study verify /tmp/simurgh-sdk/report.json
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_sdk.study verify docs/assurance/sdk/evidence/report.json
```

Installation needs package-registry access; execution needs no credentials or services.
Use a new output path: existing reports cannot be overwritten. Omitting `--out` creates
a unique temporary report directory. The lock pins all 60 dependencies with artifact hashes.
Verification checks installed versions and source hashes, reruns the complete workload and
compares the entire report. Source changes, omitted cases, extra assertions and modified
results fail verification. This is shared-code reproducibility, not historical authentication.

## Results — 15 October 2026

Each runtime executes the same 17 cases under three controls; the following results hold
separately for each runtime. The denominators describe authored fixtures, not attack rates.

| Control             | Authorization cases with forbidden effects / 7 | Benign completions / 3 | Unknown cases / 17 |
| ------------------- | ---------------------------------------------: | ---------------------: | -----------------: |
| Bypass              |                                              7 |                      3 |                  2 |
| Exact-action policy |                                              0 |                      3 |                  2 |
| Deny-all            |                                              0 |                      0 |                  2 |

Under exact policy, checkpoint and full-effect comparisons each detect all four applied
trace mutations; trace-only checking detects none. No checkpoint superiority is claimed.
No-op mutations remain excluded from applied-mutation denominators. Observer outage and
sink failure remain unknown under every control; zero observed forbidden effects is not
an all-cases safety guarantee.

The main matrix includes **156 native interruptions and resumptions** (78 per runtime).
At 144 pauses, the observer confirms that only earlier executed effects are present. The
other 12 observations are unavailable in the fault cases and cannot establish absence.
Four additional lifecycle rows record **three exercised probes and one unsupported probe**:

| Runtime           | Native rejection           | Native argument edit                                                          | State scope                                                                  |
| ----------------- | -------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| OpenAI Agents SDK | No tool callback or effect | Unsupported by this adapter's pinned public approval API; reported explicitly | RunState serialized and restored before each resume, within the same process |
| LangGraph         | No tool callback or effect | Edited content reaches the boundary and is denied                             | InMemorySaver checkpoint and Command resume within the same process          |

The unsupported OpenAI row is not an executed pass or a vulnerability finding. Approval
callbacks are scripted operator decisions, not authenticated human approvals. Framework
approval permits a callback; the precommitted external policy still decides whether its
exact arguments may produce an effect.

## Execution and limits

Python adapters invoke a persistent Node bridge, which reuses the unchanged original
policy and child-process file sink. Authority is selected once from the trusted corpus;
later calls cannot replace it. The bridge serializes requests and retains consumed grants
across all actions in a case. Each OpenAI action uses a fresh Agent/model run; each LangGraph
action uses its own thread in the same in-memory graph. Cross-action replay enforcement
belongs to the persistent boundary, not framework conversation memory.

The Python transport bounds frames and deadlines, rejects malformed responses and cleans
up the process group and temporary files. It is Linux/POSIX-specific. The Python socket/DNS
guard and disabled SDK tracing prevent ordinary Python network access in the experiment;
they are not an OS firewall or a sandbox against hostile native code. Reviewed Node code
uses local IPC and files. No claim covers a compromised host or modified dependencies.

OpenAI's serialized state restoration does not test restart recovery: the agent/model and
external bridge remain alive. LangGraph's saver is not durable storage. Exact-policy state,
principal/tenant strings, sink observations and the operator all share one host and trust
domain. Final disk state cannot observe transient reads or unrelated network effects.

The next engineering gap is durable atomic replay protection across retries, crashes and
concurrent enforcers. Held-out attacks, independent reproduction, authenticated identity,
revocation, real connectors and measured overhead also remain open. Integration effort,
latency and storage were not benchmarked in this phase. Frozen historical coverage and
the original lab and OpenAI artifacts remain unchanged.

The subsequent [durability phase](../durable/README.md) now supplies a separate local executor
crash/retry contract. The SDK report above remains frozen and makes no restart claim itself.
