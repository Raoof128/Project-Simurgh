# Replaying historical stages

Historical runbooks describe their original environment and authority. Use a disposable full-history
checkout at the intended source revision, inspect that stage's instructions and retain the original
results. Do not run capture/build commands against the primary evidence tree just to make a new
report appear current. The [latest full smoke report](research/smoke-validation-2026-10-19/RESULTS.md)
records which runners were actually exercised; it does not cover every historical script.

## Common prerequisites and failure handling

Use Node 26 for the historical byte-stability runners, Python where the runner invokes it, and
Lean 4.15.0 where the committed `lean-toolchain` requires it. Install tools into an account you
control and select them through `PATH`. Elevating the whole reproduction to root or substituting
another account's home directory is not the current recommended setup. Preserve inherited TLS
and environment policy when installing dependencies.

When retaining output through `tee`, enable pipeline failure propagation. For example, from the
root of the disposable checkout, after installing its prerequisites:

```sh
set -o pipefail
simurgh_stage_log=$(mktemp "${TMPDIR:-/tmp}/simurgh-stage5f.XXXXXX")
bash tools/simurgh-attestation/stage5f/conformance-pack/run.sh "$PWD" 2>&1 | tee "$simurgh_stage_log"
```

Check the pipeline's exit code immediately and inspect the full log. Without `pipefail`, a successful
`tee` can mask a failed runner. Stage 5F also permits a named Python-parity skip when Python is
absent; `ALL PASS` alone therefore does not establish that every optional runtime was exercised.
The runner rebuilds stage evidence to compare bytes, which is why the disposable checkout matters.

A byte-stability mismatch has several possible causes: source/evidence drift, runtime or dependency
changes, or nondeterministic behavior. Diagnose and retain the diff; do not assume the Node major
version is the only explanation. A capture recipe containing `<pinned>` or `<repo>` is a template,
not a copy-and-run instruction. Obtain exact inputs from the original protocol and manifests.

## Capture, verification and independence

Verification of frozen detector scores does not invoke the detector and does not refresh its model
behavior. New model captures require their own declared inputs, source binding, data/compute scope
and retained failures. A local assistant can refuse or fail even when no separate API key is needed;
key-free does not mean guaranteed execution.

A different key or process does not prove organizational independence. Follow each stage's explicit
identity/challenge/custody bounds. The [errata](documentation-audit-2026-10-19/ERRATA.md) identifies
historical runbook wording that needs this qualification. For the current agent research, use the
[README replay](../README.md#replay-the-evidence) and [integration matrix](INTEGRATIONS.md) instead.
