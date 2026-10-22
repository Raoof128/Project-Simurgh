# Full smoke validation — 19 October 2026

Both prescribed workflows pass on **`ebf2a752e2e8f26eb8d0684040db2b0fe05c8200`** after two bounded test-harness
repairs. This is local functional validation plus project-operated native CI; it is not
independent reproduction or production certification. The initial failures are retained.

## Results

| Check                       | Observed result                                    | Scope                                                                                                           |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `bash scripts/check.sh`     | **142 steps passed, zero failed**                  | Complete base gate; optional exclusions below                                                                   |
| Root Node suite             | **5,171 passed, zero failed, zero skipped**        | Node 26; real Lean checks included                                                                              |
| `bash scripts/check-e2e.sh` | **32 steps passed, zero failed**                   | Full-chain tests and configured reproduction pipelines                                                          |
| Full-chain E2E tests        | **580 passed, zero failed, zero skipped**          | 77 test files                                                                                                   |
| Linux Rust                  | **34 passed, zero failed, zero ignored**           | fmt/clippy pass; mandatory real Xvfb cases included                                                             |
| Dashboard/CLI               | **16 passed, zero skipped; build passed**          | Shared queries, imports/exports, interactions and HTTP boundary                                                 |
| Built dashboard HTTP smoke  | **Passed**                                         | Both assets and all 144 records served; summary/filter match real CLI; writes and cross-origin requests refused |
| Python research suites      | **473 tests passed across 29 suites**              | All discovered unittest suites; no skips or expected-failure exemptions                                         |
| AgentDojo adapter           | **181 pytest cases passed**                        | Local adapter tests; external AgentDojo campaign not run                                                        |
| Docker smoke                | **Passed at UID 1000**                             | Documented offline npm cache; mock receipt and retired live-route HTTP 410                                      |
| Native macOS/Windows CI     | **10 / 11 tests passed; Windows fixture compiled** | Separate exact revision `2cf8ad69`; see native scope below                                                      |
| Strict fresh browser parity | **Blocked; exit 1**                                | `managed_browser_file_navigation_blocked`; Node/portable/Python agree                                           |

The E2E script invokes 30 reproduction entries covering **29 distinct scripts**; Stage 5C
appears twice. The 32-step count also includes the Node prerequisite and full-chain suite.
It is not a claim that all 51 historically indexed reproduction runners executed. Tests
within aggregate and reproduction steps can overlap, so these rows are not summed into a
single unique-test total.

## Repairs and retained first-run failures

The first run at `2cf8ad69` finished with **138 passing/four failing base steps** and
**24 passing/eight failing E2E steps**. Its root suite passed 5,167 tests with two Lean skips;
the E2E suite passed 578 and failed two. Logs remain available alongside the successful rerun.

1. **Selected runtime lost in a login shell.** The launcher checked Node 26, but its command
   steps used `bash -lc`, whose profile selected Node 24 and removed Lean from PATH. The
   maintained launcher now uses `bash -c`. Both quiet/verbose behavioral regressions failed
   before repair and passed afterward. The complete rerun executes all 5,171 root tests
   without skips, including the two new regressions and the Lean checks.
2. **Xvfb reset after readiness.** The readiness probe disconnected before the test client
   connected, allowing Xvfb to reset. The initial run failed a managed-window connection;
   a separate reproduction failed the empty-display case. Owned fixtures now use `-noreset`
   and retain their existing teardown and scanner assertions. Ten consecutive focused runs
   passed all four cases, followed by the complete 34-test Rust pass.
3. **Temporary port collisions.** Three initial smokes could not bind their fixed ports.
   Socket inspection found an outbound `TIME-WAIT` connection on a conflicting port. All
   three checks passed in the complete rerun. No host-wide network policy was changed;
   this observation is not a claim that fixed-port collisions can never recur.
4. **Validation-checkout prerequisites.** The first disposable E2E checkout selected a Python
   environment without pytest and lacked `origin/main`. These setup omissions account for
   the initial reproduction failures and two full-chain failures. The rerun setup
   checks pytest and imports the actual main reference before execution; no historical
   ancestry check was weakened or bypassed.

The repair was declared at `53260051` before implementation. It changes the maintained
command launcher and display fixture setup only. Production enforcement and scanner
semantics, frozen protocols, archives and evidence pins are unchanged.

## Platform and external boundaries

[Native CI run 39199323099](https://github.com/Raoof128/Project-Simurgh/actions/runs/39199323099) tested
`2cf8ad69455585ef334e5e4def439d7b87cb5b5f`. It ran the two macOS Swift suites (2 + 8 tests),
11 Windows daemon tests and the Windows affinity fixture build. The later repair changes
no native macOS/Windows source or native workflow. Raw hosted logs and job metadata are
retained; an artifact download was unavailable, so no locally retained Windows TRX is claimed.

The local base script excludes macOS-only lifecycle/plist checks and Windows .NET execution.
The native jobs supply their stated unit/build coverage, not interactive desktop capture,
macOS consent flows or all platform smokes. The four opt-in external campaigns (3H-L2, 3J,
3K and 3L) stayed disabled; they require separate prerequisites and provider scope.

The historical Stage 5R runner accepts the narrower Node/portable/Python result even when
its browser execution fails. Its enclosing E2E pass is therefore **not browser parity**.
The separate strict runner exits 1 and records the managed navigation block. Dashboard
interactions use jsdom and the built-app check uses HTTP; real browser rendering, mobile
layout and accessibility remain unverified. No browser management policy was changed.

Independent custody, real provider IAM/alert lifecycles, sustained deployment and real-data
privacy validation remain outside this local run. No fresh paid model inference occurred.

## Environment and reproduction

Recorded tools: Node **26.12.0**, Python **3.12.14**, pytest **8.4.2**, Lean **4.15.0** and
Cargo **1.99.1** on Linux. The real main reference was
`61883d9e6cbea6c9dc9faccd50ed72bd0ec28ce1`. Prepared root/explorer dependencies were reused;
this run does not claim a fresh package installation. Docker used the maintained
[`SIMURGH_NPM_BUILD_CACHE` path](../maintenance-phase-16/RUNBOOK.md), not a new network build.

Use a disposable full checkout with the prerequisites from the
[maintenance runbook](../maintenance-phase-16/RUNBOOK.md). The principal commands are:

```sh
git fetch origin main:refs/remotes/origin/main
node --version
python3 -m pytest --version
lean --version
bash scripts/check.sh
bash scripts/check-e2e.sh
npm --prefix tools/simurgh-explorer test
npm --prefix tools/simurgh-explorer run build
```

The [machine-readable receipt](validation.json) lists every supplemental command and exact
source revision. Its archive contains the launchers, preflight receipt, complete test inventory
and per-step logs. These launchers record this workspace's paths; adapt them to a prepared
review environment rather than treating them as installation scripts.

Some historical smokes regenerate tracked fixtures: the banking audit fixture and Stage 5R
parity receipt changed **only in disposable checkouts**. Their status records are retained.
The primary checkout's historical files were not refreshed from those generated outputs.

## Evidence package

[Download logs and receipts](logs.zip). The ZIP includes initial failures, successful reruns,
focused red/green checks, native logs, the strict browser receipt and a per-file SHA-256 manifest.
The archive was read back and every manifest entry checked. Its SHA-256 is
`3834abd2b84fb5adeba49685710068fad6b7c91274402543652e7b0f76bcd131`. Repository-provided hashes bind these bytes; they do not establish
outside custody or authenticate the original observations independently.
