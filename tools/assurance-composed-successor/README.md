# Composed pipeline successor

A post-freeze successor to `tools/assurance-composed/composition.py`. It fixes four defects found
by the pass-3 audit (`docs/superpowers/specs/2026-10-28-pass3-audit-repair.md`) without touching
the code those defects live in.

## Why the frozen files are untouched

`tools/assurance-signals/signals.py`, `tools/assurance-composed/composition.py`,
`tools/assurance-credentials/gateway.py`, `tools/assurance-context/context_gate.py` and their tests
are sha256-pinned in the `sources` of the archived Phase 6-17 `protocol.json` files. Editing them
would stop every archived study from replaying against the tree. `successor.py` imports them and
subclasses them. Where a frozen class hard-wires its collaborators (`Pipeline.__init__`,
`Pipeline.resume`, `BoundSession.dispatch`, `Pipeline.stop`) the minimum is re-implemented and the
docstring names the frozen method it mirrors. Each frozen module stays what the archived studies
evaluated, defects included.

## The four fixes

1. **Header case.** `SignalGate.receive` verifies the signature case-insensitively but compared
   `event["id"]` with `headers.get("webhook-id")` case-sensitively, so a genuine signed alert with
   `Webhook-Id` raised `invalid_webhook_event` and never latched. The successor folds header names
   to lowercase first (ASCII only, so U+212A cannot fold onto `webhook-id`) and raises
   `ValueError("invalid_webhook")` if two names collide.
2. **Bindings.** The frozen pipeline hard-wires `response-<name>` and `request-<name>`, so a real
   provider alert resolved as `unrelated`. The successor `Pipeline` requires
   `bindings={"a": {"response_id": ..., "request_id": ...}, "b": {...}}`, validates them, and stores
   them in the persisted config. A reopened pipeline must present the same bindings.
3. **Sibling route and stop.** Alerts are per route and a gateway revokes only itself, so with a
   `session_snapshot` receiver route b kept landing effects after route a was stopped and its
   revocation acknowledged. A latch on any route now blocks dispatch on every route (checked in
   `BoundSession.dispatch` and again at the port, and recorded as `dispatch_sibling_latched`).
   `Pipeline.stop()` attempts every route and re-raises the first error afterwards.
4. **macOS lock.** `Pipeline.locked()` and `Gateway.admission()` took `flock(LOCK_EX)` on the SQLite
   file; on Darwin that makes SQLite on the same file fail with "database is locked". The successor
   locks a `<db>.lock` sidecar (created if missing, symlink refused with `ValueError("lock_state")`).

## Run the tests

```sh
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tools/assurance-composed-successor/tests -v
```

The suite does not patch `fcntl.flock`; it runs on macOS and Linux. To see that the tests are not
vacuous, point them at the frozen pipeline: `SUCCESSOR_IMPL=frozen python -m unittest discover ...`.
That run is expected to fail (on macOS every test fails in `setUp` with "database is locked", which
is defect 4 itself; with `flock` shimmed to a sidecar, defects 1-3 each fail for their own reason).
The frozen run is not part of CI.

CI runs the suite in `.github/workflows/assurance-composed.yml`, which also triggers on the frozen
modules the successor imports.

## Status

No study has been run against the successor. It is a regression-tested repair, not an evaluated
gate. A future study that wants the fixed gate freezes this module's sources in its own
`protocol.json`; it does not re-pin the old ones.

Not covered: callers that use `pipeline.gateways[...]` or `pipeline.signals[...]` directly rather
than through `resume()`; the window between the latch check and an already-admitted dispatch (the
frozen gate also lets admitted work finish after a stop); `SignalGate.receive` does not take the
pipeline lock.
