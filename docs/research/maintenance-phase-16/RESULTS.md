# Phase 16: maintenance and portable validation

16 October 2026. Final implementation tested: `8ebe0103b1cfa870c8c065f980cb031b7596cc4a`.
Documentation and log publication follow that revision. The local aggregate and E2E gates
now pass. This closes the reproduced maintenance failures from Phase 15; it does not
establish production readiness or broad model-safety effectiveness.

## Executed results

| Check                                 | Result                                  | Qualification                                                                              |
| ------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Complete Node unit suite              | **5,154 passed; 0 failed; 0 skipped**   | Node 26, concurrency 4, selected Lean environment preserved                                |
| Aggregate repository gate             | **142 steps passed; 0 failed**          | Includes Docker, smokes, audits and Rust; optional platform/provider lanes remain excluded |
| E2E gate                              | **32 steps passed; 0 failed**           | Test set: 579 passed, 0 failed, 1 explicit skip across 580 tests                           |
| Linux Rust                            | **34 passed**                           | Xvfb mandatory; formatting and clippy also pass                                            |
| Lean                                  | **39 proofs checked; 0 escape hatches** | Negative self-test rejects deliberately invalid input                                      |
| Portable .NET unit project            | **11 passed; 0 failed**                 | SDK 8.0.426 in Linux container; not native Windows execution                               |
| Stage 5P browser parity               | **1,734 checks agree**                  | Real Chromium 154, unchanged browser module/vectors                                        |
| Stage 5R successor parity             | **5 entries / 17 vectors agree**        | Node core, portable Node, Python and real Chromium; missing/altered answers rejected       |
| Gateway/core and legacy-live fixtures | **72 and 40 passed**                    | HTTP checks enforce permanent retirement; fixture/adapter history is not a live deployment |
| Container smoke                       | **Passed at UID 1000**                  | Mock receipt plus retired live HTTP 410; empty offline npm cache correctly refuses         |

The aggregate runner invokes some commands in a login shell, which resets this machine's
custom Lean PATH: its embedded Node run reports 5,152 passes and two explicit skips. The
separate complete Node run above executes both, and the separate proof gate verifies all
39 proofs. The E2E skip searches for an older Node at `/usr/bin/node`; a separate run using
the actual Node 24 location returns the required wrapper exit 2. These additional checks
do not erase the original skip counts.

## Repairs and evidence integrity

- Legacy live HTTP smoke/audit checks now require the deployed retirement contract,
  including explicit legacy opt-in, missing keys, zero caps and untrusted inputs.
  No provider key was loaded and no provider inference was requested.
- The current reproduction manifest validates 51 script identities while hash-binding the
  original 50-script Stage 5S pin. Added, removed, duplicated, empty and substituted sets
  refuse. The stricter Stage 5L successor is retained. The runner uses the same validator.
- Browser discovery supports normal paths and an explicit override. Managed Chromium
  blocks `file://` navigation; dump-DOM also hung on a blank page. The working harness uses
  loopback fixture serving and a local debugging pipe, preserving page CSP and portable
  source bytes. Timeouts, process failures and negative browser results remain failures.
- Container builds support a verified offline npm cache, preserve lockfile/TLS checks, and
  give the existing non-root user ownership of source copied from restrictive checkouts.
- Broader testing exposed two further false positives. The literal gate now recognizes
  exactly two hash-bound historical total lines, with changed-line/path/code controls.
  The privacy smoke permits a canonical optional paired-node digest while still detecting
  raw PIDs, malformed digests and leaked values beside a valid digest.

Each bounded gate change followed its committed exact-path authority. See the
[design and authority record](../LOCAL_MAINTENANCE_PHASE_16.md). No application source,
frozen verifier, proof, historical evidence, prior protocol or published Phase 15 result
was changed. Broad scripts ran in disposable clones: one banking fixture and one historical
browser receipt regenerated there. Those bytes were not copied into the publication tree.

Initial broad runs recorded two aggregate failures and one E2E reproduction failure;
the latter shared the literal-gate cause. Initial .NET attempts exposed UID-only mutex
setup and artifact-layout problems, both corrected without source changes. Successful
reruns and these failed attempts are retained in [326 command logs](logs.zip), with
[per-file hashes, exact revision and outcomes](validation.json). No canary redactions were
needed. These are local receipts; no new hosted final-head verification is claimed.

## Remaining limits

- Native macOS/CryptoKit and native Windows scanner/service behavior were not tested here.
  The .NET result covers portable logic and fixtures on Linux only.
- The old Stage 5R driver still records two-runtime parity on this host. The new successor
  independently proves its own real-browser result; it does not rewrite that old receipt.
- The default online Docker installation remains dependent on host CA/network configuration.
  This environment's supported offline path passed; arbitrary external builds are unproven.
- The 51-script inventory is not a claim that all 51 runners executed. The 32-step E2E
  gate covers its declared set; external-droplet and paid-provider campaigns remain separate.
- Outside custody, live provider identity/alert entitlements, fresh held-out multi-model
  tasks, sustained deployment load and the previously interrupted whole-change security
  review remain open. The earlier 636-test Python matrix remains Phase 15 evidence; it
  was not rerun or relabeled as a new Phase 16 result.

The project now has stronger local reproducibility and a clearer presentation record.
Use the [runbook](RUNBOOK.md) for these commands and the [needs/gap register](../validation-phase-15/GAPS.md)
for the external evidence still needed. This report supersedes that register's reproduced
local maintenance failures, while retaining its evaluation and deployment limitations.
