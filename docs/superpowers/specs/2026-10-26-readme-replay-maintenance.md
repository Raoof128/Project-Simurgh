# README replay and CI hygiene maintenance — 26 October 2026

Owner-requested repair following an independent review of `main` at `cb27617a`. This declaration
precedes implementation.

## Observed failures

- The README "Replay the evidence" demo fails before printing a row. On macOS (arm64, Python 3.12.2)
  it stops after 17 s with `sqlite3.OperationalError: database is locked`: the frozen
  `Pipeline.locked()` holds `fcntl.flock` on its SQLite file and Darwin's flock conflicts with
  SQLite's own lock (an isolated reproduction fails on Darwin and passes on Linux). In Linux
  arm64 and emulated linux/amd64 containers it stops with `apply_action: worker_refused`; the
  worker's real reasons, `only Linux x86_64 supported` and `seccomp installation failed`, are
  discarded by the frozen worker runner. The README states only "a POSIX environment".
- The affected modules (`tools/assurance-composed/composition.py`,
  `tools/assurance-connector/workflow.py`, `tools/assurance-isolation/simurgh_isolation/kernel.py`
  and both entry points) are hash-pinned in `docs/research/transfer-phase-17/protocol.json` and
  compared with their freeze commit. They cannot be repaired in place without invalidating the
  evidence they verify.
- No workflow runs `corrected_roles.py demo` or `transfer_study.py verify`.
- Main runs 39872672508 and 39876975808 fail `npm test` on real-browser tests (Stage 5P parity;
  browser lifecycle) with a bare `browser result timed out`. The same tests pass in the PR runs,
  on macOS Chrome and on Linux Chromium under full-suite load; root cause is unconfirmed. The
  32.27 s parity duration (30 s timeout plus the 2 s SIGKILL grace) shows Chrome ignored SIGTERM.
- On macOS, `npm test` fails two `tests/unit/openaiReadiness/cli.test.js` cases on untouched
  `main`: `os.tmpdir()` lies behind the `/var -> /private/var` symlink, which the CLI correctly
  refuses as an output parent. The same file passes with a resolved `TMPDIR`.
- The quality gate leaves the checkout dirty: the banking privacy audit rewrites a committed
  evidence fixture with fresh timestamps (see `3f7bb7be`), two `.pyc` files are tracked despite
  `.gitignore`, and the Lean installer `elan-init` is downloaded into the root.

## Authorized operations

| Exact path                                                                                    | Operation | Purpose                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/replay-preflight/preflight.py`                                                         | add       | Unpinned preflight reproducing each replay prerequisite (platform, Python, history, SQLite under flock, the worker's own seccomp bootstrap, dependencies) and printing the actual reason. |
| `tools/replay-preflight/tests/test_preflight.py`                                              | add       | Behavioral tests for refusal reasons, fail-closed probes and exit status.                                                                                                                 |
| `.github/workflows/readme-replay.yml`                                                         | add       | Run the README commands verbatim on `ubuntu-latest` and compare demo output with the archived report and the README's stated result.                                                      |
| `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json`                         | modify    | Re-pin `current` by set for the one added replay step, per the Q1-F002 contract. `baseline` is not touched.                                                                               |
| `README.md`                                                                                   | modify    | State the Linux x86_64 requirement and both failure signatures, add the preflight, clone the default branch rather than the merged `openai-readiness` branch.                             |
| `scripts/lib/browserExecutable.mjs`                                                           | modify    | Name the stalled protocol step, the last fixture value and Chrome's stderr in timeout errors; add standard unattended-run flags. No timeout, retry, skip or assertion change.             |
| `tests/unit/maintenance/browserExecutable.test.js`                                            | modify    | Deterministic stub-browser regression for the timeout diagnostic; tighten the real-browser timeout assertion.                                                                             |
| `tests/unit/openaiReadiness/cli.test.js`                                                      | modify    | Resolve each temporary root with `realpath` so the tests exercise the CLI's symlink refusal rather than tripping it on macOS. The CLI's refusal is unchanged.                             |
| `scripts/privacy-audit-banking-pilot.mjs`                                                     | modify    | Audit freshly generated fixtures in a temporary directory; rewrite committed evidence only with `--write-evidence`.                                                                       |
| `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/__pycache__/*.cpython-312.pyc` (2) | untrack   | Bytecode already covered by `.gitignore`; regenerated by Python at run time.                                                                                                              |
| `.gitignore`                                                                                  | modify    | Ignore the CI-downloaded `/elan-init`.                                                                                                                                                    |
| `AGENT.md`, `CHANGELOG.md`                                                                    | append    | Accurately attributed change and verification log.                                                                                                                                        |

## Gate lifecycle for `readme-replay.yml`

- **active_phase:** from this maintenance onward, on changes to `README.md`, `tools/**` or either
  replayed evidence directory.
- **protected_surface:** the README's replay commands and their stated result for
  `provider-role-phase-17b` and `transfer-phase-17`.
- **next_phase_behaviour:** a successor that changes the README replay commands updates this
  workflow in the same change; one that adds a replay re-pins `current` in the problem-gate set.
- **maintenance_behaviour:** comparison values are read from the archived `report.json`, never
  restated; a mismatch fails the job.
- **sunset_or_migration_condition:** retire or migrate when the README stops advertising this
  replay, in the same change that edits the README.
- **anti_vacuity_condition:** empty or reordered demo output fails; the README's eight-row,
  two-effect, six-decline, one-prior-effect result is asserted explicitly.

## Lifecycle and limits

No frozen verifier, protocol, evidence archive, proof, signed capture or pinned source is
rewritten; `git diff` on every path listed in the transfer and provider-role protocols must stay
empty. The macOS and ARM limits are documented, not removed. A browser failure remains a failure:
no retry-to-green, skip, longer timeout or weakened assertion is authorized, and the browser flags
are hardening, not a confirmed root cause. Hosted success must be checked against the pushed
revision before any passing claim.

## Addendum — 26 October 2026, after the first hosted run

PR #140's quality gate (run 40284904565) passed `npm test` and reported a clean working tree, but
failed `npm audit` and five Stage 2.x security audits that re-run it: advisory GHSA-27r3-jxmh-p828
(high) affects `body-parser` < 1.20.9, which `express@4.22.3` resolves to 1.20.8. The advisory
post-dates the 23 October runs that passed `npm audit`; it is unrelated to the changes above.

| Exact path                 | Operation | Purpose                                                                                             |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| `package-lock.json`        | modify    | `npm audit fix` within declared ranges: `body-parser` 1.20.8 → 1.20.9. `package.json` is unchanged. |
| `AGENT.md`, `CHANGELOG.md` | append    | Record the hosted results and the dependency remediation.                                           |

## Addendum 2 — 26 October 2026, documentation defects from the strict review

| Exact path                                     | Operation | Purpose                                                                                                                                     |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTRIBUTING.md`                              | modify    | State the Linux x86_64 requirement for the replay and for the `tools/*/tests` Python suites, which fail on macOS for environmental reasons. |
| `docs/research/reproduction-phase-4/README.md` | modify    | Clone the default branch; `openai-readiness` is merged. Current instruction, not a frozen record.                                           |
| `docs/assurance/hf-containment/REPRODUCE.md`   | modify    | Same clone-line correction.                                                                                                                 |
| `AGENT.md`, `CHANGELOG.md`                     | append    | Record the change.                                                                                                                          |
