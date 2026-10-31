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

Three further repairs from the 31 October 2026 repository audit (A1-1, A1-2, A1-3):

5. **Only the three verification headers are folded.** The first version of fix 1 refused the whole
   delivery when any two header names collided after folding, or any name was non-ASCII, even for
   names the signature check never reads; a signed alert carrying `Content-Type`/`content-type` or
   `X-Protö` was dropped and the route kept dispatching. Now only `webhook-id`, `webhook-timestamp`
   and `webhook-signature` are folded and checked for ambiguity; everything else passes through.
6. **An authentic alert is never discarded.** The frozen gate raises `invalid_webhook_event` only
   after the signature verified, and it raises before any write, so a signed alert with an extra
   field, a float `created_at` or a bytes body left no trace while the route kept dispatching. The
   successor decodes bytes, and holds any signature-valid but unparseable alert `pending` under its
   webhook id (`alert_unparseable_pending` event, empty alert id, never looked up). That row blocks
   every route until the host reconciles it; redelivery of the same bytes is idempotent and a
   different body under the same id collides.
7. **A pending alert holds every route.** `latched_routes()` read only `terminal`; an alert that
   was received while lookup was down left the sibling route dispatching until the lookup
   recovered. `blocking_routes()` also returns routes with a pending alert, and the block is
   recorded as `dispatch_sibling_pending`.
8. **Revocation is re-driven.** After a crash between the stop latch and the revoke call the
   frozen gate reopened latched but never revoked, and a replayed stop event answered `stopped`
   from the inbox without revoking (A1-4). The successor revokes on open and on replay whenever a
   route is terminal with no `host_revoked` event.
9. **A symlinked signal database is refused** on open, as the sibling files already were (A1-8).

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

Not covered: a pending unparseable alert has no in-band release (a new pipeline directory is the
host's path); restart approvals are not bound to a pipeline instance (A1-5); the connector's host
database path still follows symlinks (frozen `core.py`);
callers that use `pipeline.gateways[...]` or `pipeline.signals[...]` directly rather
than through `resume()`; the window between the latch check and an already-admitted dispatch (the
frozen gate also lets admitted work finish after a stop); `SignalGate.receive` does not take the
pipeline lock.
