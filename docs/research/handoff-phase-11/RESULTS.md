# Phase 11 execution record

16 October 2026 (Australia/Sydney). The [handoff](handoff.json) pins publication
`f020c56eb4e144015c961faacc2e4d636129169d` and Phase 10 freeze
`67d1442faaeedb0b62f763b3a3ddb1ce9d3b7d5e`.

A clean local Git clone with no shared object hardlinks and a newly created Python
3.12.14 virtual environment completed the [documented recipe](README.md). The install
used both existing requirements files with `--require-hashes --only-binary=:all:`;
no model weights, provider keys, Node dependencies or existing application environment
were used. This was a fresh checkout/environment on the project's current Linux x86_64
host, not a separate externally operated machine.

- **16 focused tests passed**, zero failures or skips.
- **48 saved generations, 144 branches and 1,440 snapshots verified**, including fresh
  native proposal execution and source/committed-protocol checks.
- All **10 artifact/requirements hashes** in the handoff matched the clean checkout.
- Dependency compatibility passed. The retained inventory contains **63 distributions**:
  62 application dependencies plus the virtual environment's pip installer.
- Initial and final checkout status were empty: no tracked or untracked modifications.
- [Local receipt](local/receipt.json), [replay receipt](local/replay-receipt.json),
  [tests](local/tests.log), [dependency check](local/pip-check.log),
  [package inventory](local/packages.json).

The expected archive manifest root was:
`3a63db0052b42c284b9feba94b82aa0b236e31530837c2caf42d927e2f008a96`.

## Separate hosted verification

Project-operated GitHub run
[38846752661](https://github.com/Raoof128/Project-Simurgh/actions/runs/38846752661)
**succeeded** at publication commit `f020c56e`. Its Ubuntu/Python 3.12 job installed
hash-locked dependencies, passed all 16 focused tests and freshly replayed the same
48/144/1,440 inventory with the pinned root. See the [hosted receipt](hosted-receipt.json)
for the exact commit and retained verification lines.

Both runs support portability and consistency of the supplied evidence. They did not
regenerate model outputs, establish inference provenance, exercise live provider safety
monitoring, or establish independent receiver/host custody. The
[external operator record](OPERATOR_RECORD.md) remains explicitly unexecuted.
