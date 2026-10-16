# Phase 4 author-operated reproduction result

Recorded 16 October 2026, Australia/Sydney. **Engineering handoff complete;
outside-operator reproduction pending.** This adds inspectable receiver evidence
to saved-proposal replay. It does not provide a new model-safety measurement.

## Execution

Source freeze: `41f26e57f0b226bc48ca374b43a686f5f7713155`.
A clean local clone of that commit and a newly created Python 3.12.14 environment
ran the full experiment. Installation used `uv pip install --require-hashes
--only-binary=:all:` with both frozen SDK/workflow locks; 62 installed packages
passed dependency checks. This was the same host and operator, not a fresh host
or outside reproduction. No API key, model download or paid inference was used.

The replay ran from 15 October 2026 20:12:25 to 20:13:54 UTC: **89.236 seconds**
for native replay, snapshots and report computation, excluding installation and
final archive packaging/verification. This is one shared-host operational timing,
not randomized overhead evidence or a performance benchmark. A transient tool
connection drop did not stop the process; its original exit status was zero and
stderr was empty. No replacement full run was performed.

All **540 branches and 763 decisions** matched the frozen phase 3 report exactly.
All 763 raw SQLite snapshots are retained: **329 nonempty, 434 empty**. The raw
databases total 9,375,744 bytes; the complete compressed pack is 413,485 bytes.
A separate standard-library pack verification passed, followed by an author count
cross-check that read every SQLite payload and recomputed the final group totals.
Neither the cross-check nor fresh internal code review constitutes outside validation.

| Task kind   | Control  | Branches | Useful completion | Unauthorized effects |
| ----------- | -------- | -------: | ----------------: | -------------------: |
| Benign      | Enforced |       90 |                90 |                    0 |
| Benign      | Bypass   |       90 |                90 |                    0 |
| Benign      | Deny all |       90 |                 0 |                    0 |
| Adversarial | Enforced |       90 |                59 |                    0 |
| Adversarial | Bypass   |       90 |                47 |                   43 |
| Adversarial | Deny all |       90 |                 0 |                    0 |

These are reproduced phase 3 outcomes, not 540 new independent model trials.
The 31 unsuccessful attacked branches remain unsuccessful. Read the original
[study limitations](../model-phase-3/README.md) before presenting these counts.

## Evidence and checks

- [Evidence archive](evidence.zip), [receipt](receipt.json), [trusted-checkout root](ROOT.sha256),
  [source contract](contract.json), [operator guide](README.md).
- Manifest SHA-256:
  `02b3a143dcc1b3a19768d6849ed6ecd6b4ff49382611fc46dbc2f9fba517db7c`.
  This binds the archived path/hash set; it does not establish identity or external truth.
- Thirteen phase 4 tests pass, including omission/invention/truncation, wrong root,
  duplicate/archive paths, raw-schema/receipt disagreement, observer timeout,
  incomplete real-SDK execution and no-overwrite behavior.
- Fresh internal review found one SQLite wildcard schema-filter bug. The full
  evidence-path regression failed before the fix and passed afterwards. No further
  important findings or deferred minors. The reviewer did not assess the final pack.
- Thirteen predecessor phase 3 tests pass. Full repository suite: 5,122 passed,
  zero failed, three existing prerequisite skips (Chrome and two Lean checks).
- All 39 phase 4 source/data bindings match. Frozen prior source and evidence paths
  are unchanged. Ruff, dependency checks, authored-document formatting and diff checks
  pass. The gate census remains exactly the same 39 problem identities; this is no
  claim that those historical census problems have been fixed.
- Hosted CI checks the saved pack and SDK failure tests, alongside existing phase 3
  replay. Its status is recorded separately after push; local results above do not
  imply hosted success.

## Scope decisions and remaining work

Portable replay precedes recovery changes, preserving the original failed outcomes.
A separate-process SQLite observer improves implementation diversity and retention,
but shares the host and operator. The author verified the final pack after the
internal code review. These decisions leave malicious-host fabrication, independent
custody and independent result review unresolved. There are no deferred minor review
findings. These are limitations of the delivered evidence, not hidden success claims.

| Gap                              | Disposition                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| G23: reproducibility             | Portable entry point, pinned inputs and clean local checkout exercised; fresh host still pending  |
| G19: evidence custody            | Raw snapshots, exact inventory and tamper rejection implemented; independent custody remains open |
| G18: outside operator            | Handoff ready; no operator receipt or outreach claimed                                            |
| Recovery utility                 | 31/90 attacked branches still fail; use new tasks and a new protocol for improvements             |
| Real identity/vendor integration | Unchanged; local synthetic connector only                                                         |

Subjective planning scores, not measurements or readiness probabilities:

| Axis                   | Score / 10 | Artifact needed to improve it                                              |
| ---------------------- | ---------: | -------------------------------------------------------------------------- |
| Local reproducibility  |          8 | Successful fresh-host run with retained discrepancy record                 |
| Independent custody    |          3 | Outside operator's separately retained root and effect observations        |
| Evaluation breadth     |          4 | New independently maintained tasks and separately frozen model comparison  |
| Deployment integration |          2 | Authenticated real identity and representative vendor connector experiment |

The next external action is for an operator to execute the guide on their own host,
retain their root/pack, and complete the [operator record](OPERATOR_RECORD.md).
That record is currently an unexecuted template. No private details, keys or outreach
are needed from the user to inspect the published author pack.

## Hosted receipt — 16 October 2026, Australia/Sydney

Commit `54119e5732eee06f5fb9046c33f8d096750e680b` passed all 13 jobs in
[run 38800643360](https://github.com/Raoof128/Project-Simurgh/actions/runs/38800643360).
This verified the retained pack and existing saved-proposal replay. A full phase 4
run on a fresh hosted machine is separately tracked in phase 5; this receipt alone
is not an outside-operator reproduction.

## Successor fresh-host result

The phase 5 [fresh-host record](../recovery-phase-5/hosted-phase4/README.md) now
completes the previously pending fresh-machine replay: 540 branches, 763 retained
snapshots, downloaded and verified locally. Project-operated GitHub execution remains
separate from an independent outside operator or independent custody.
