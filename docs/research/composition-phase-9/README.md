# Phase 9: composed lifecycle reproduction

This owned-service experiment connects the frozen phase 6 signal gate, phase 7
context/lineage gate and phase 8 credential gateway/receiver in one native workflow.
Read the [results](RESULTS.md) and [design/execution ledger](../COMPOSITION_PHASE_9.md).
All 40 rows and 360 raw snapshots are retained. No model or provider account is used.

## Reproduce

Use Linux x86_64, Python 3.12 and full Git history from the repository root:

```bash
python3.12 -m venv /tmp/simurgh-composed-venv
/tmp/simurgh-composed-venv/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-composed-venv/bin/python -m pip check
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-composed-venv/bin/python -m unittest discover \
  -s tools/assurance-composed/tests -v
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-composed-venv/bin/python \
  tools/assurance-composed/evidence.py verify docs/research/composition-phase-9/evidence.zip \
  --expected-root "$(cat docs/research/composition-phase-9/ROOT.sha256)"
```

Use a root from a trusted checkout or independently retained receipt. Verification
requires exact raw inventory and all schemas/tables, committed/current source bindings,
and fresh native replay. A new retained run requires committed source/protocol and a
new output directory: `evidence.py run --out /absolute/new/path`. Retain partial failures.

## Interfaces and limits

The native worker sees proposed actions only. Credentials, operator signing material,
actor selection and controller objects stay in the trusted parent. `Pipeline.resume`
returns a trusted session; route actions through its `dispatch`. Route all authority
mutations through `Pipeline.update(callback)`. That callback must not reenter pipeline
methods that acquire the lock. Direct component access is a trusted host capability,
not a model/tool API; unmediated host access defeats the admission boundary.

The pipeline holds one advisory lock across each dispatch or update. Updates set a
durable hold before touching component states and clear it only after completion.
An exception or process exit leaves the task held; reopen does not clear it. Recovery
requires a new reviewed task, not editing the database or automatically retrying the
callback. This sacrifices availability rather than guessing whether a partial update
succeeded. Trusted storage must preserve the database inode and prevent rollback.

Each route's immutable policy adapter binds the actual credential gateway. Receiver
`denied` remains in the raw gateway and is translated to `blocked` for the frozen
context controller's status vocabulary. Unknown remote revocation raises through the
signal adapter; a local stop never becomes a confirmed remote revocation.

A context reservation occurs before the downstream signal check, so a signal hold can
consume the budget even when no HTTP call occurs. Unknown results are never resent or
refunded. A cached successful action can still return its earlier `observed` result
after a signal stop, without consulting the downstream route or causing another effect.
The stop-after-delivery row explicitly retains that distinction. No new-delivery claim
can be inferred from an observed cached result.

Already admitted work can complete before an update acquires the lock. Calls are
serialized and remote timeouts can leave work running remotely. Continuous credential
checks retain the receiver's post-revocation commit guarantee; signal/context stops
are not distributed cancellation or undo. Monitor and service clocks are separate
logical fixtures. Real clock behavior, TLS/IAM, provider delivery, state rollback,
malicious host/admin, model generalization and independent custody remain unvalidated.
Public fixture keys are for this lab only. The credential-only control bypasses the
composition/context/signal boundaries while retaining exact credential authorization.
