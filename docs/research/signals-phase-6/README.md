# Phase 6: safety signals and monitor dispatch

This successor tests a local application boundary for OpenAI-style safety signals.
It uses the pinned OpenAI SDK to verify synthetic webhook signatures, a trusted
project-bound alert lookup fixture, native tool dispatch and a real owned receiver.
It does not call OpenAI, expose a webhook endpoint or measure a model's behavior.

Read the [published results](RESULTS.md),
[design and lifecycle](../SAFETY_SIGNALS_PHASE_6.md) and
[research motivation](../OPENAI_NEEDS_2026-10-16.md). The retained run and a separate
verification both passed fresh replay against the frozen source/protocol commit.

## Reproduce

Use Linux x86_64 and Python 3.12. From a clean checkout with full Git history:

```bash
python3.12 -m venv /tmp/simurgh-signals-venv
/tmp/simurgh-signals-venv/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-signals-venv/bin/python -m pip check
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-signals-venv/bin/python -m unittest discover \
  -s tools/assurance-signals/tests -v
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-signals-venv/bin/python \
  tools/assurance-signals/evidence.py verify docs/research/signals-phase-6/evidence.zip \
  --expected-root "$(cat docs/research/signals-phase-6/ROOT.sha256)"
```

The root must come from a trusted checkout or separately obtained receipt. A root
provided by the same untrusted archive does not authenticate the experiment. Verification
checks the source/protocol commit, raw snapshots, complete case inventory and fresh
native execution. It requires the pinned SDK dependencies; it is not a stdlib-only verifier.

For a new capture, pass `run --out /tmp/simurgh-signals-new-run` instead of `verify`.
The output directory must not exist. Partial failures retain their rows and a failure
record; never overwrite them to conceal an unsuccessful run.

## Boundary and API contract

`SignalGate.create(...)` binds one enforced host and one project/response/request.
The application owns the signing keys, monotonic clock and alert lookup callback;
model-generated input must never configure these. The callback must retrieve using
credentials scoped to the configured project and return normalized `id`, `response_id`,
`request_id`, `request_paused` and optional `reason`. Lookup outages, inaccessible
records, contradictory identities and missing identifiers retain a pending hold.
The experiment has no authenticated remote lookup adapter yet.

Route raw webhook bodies and headers to `receive`. Signature verification precedes
strict parsing and durable insertion. New authenticated events hold dispatch until
`resolve` attributes them; repeated pending events require explicit resolution by
application background processing. Successful resolution of another conversation's
alert removes that event's hold. It does not clear a terminal stop or monitor pause.
Do not acknowledge a real webhook until its durable intake succeeds. A production
receiver should enqueue bounded background lookup work; this library is not that server.

Call `provider_error` from trusted API/stream error handling with the response identity.
It handles the documented error code; it is not a drop-in HTTP/stream consumer. Never
pass a model's assertion that a provider returned a block as an authenticated provider
signal. Handle stream errors even when earlier output has already arrived.

Initial dispatch is paused. Trusted heartbeat leases last 30 seconds. A separate
operator-signed restart binds controller scope/current boot, revision, expiry and nonce. Restarts
are only for monitor pauses after health returns; provider stops are terminal.
Fixture signing keys are public synthetic constants. They must never protect a real service.

Every tool must use the gate at the effect boundary. Calling the underlying host
from another trusted path bypasses this signal check; a compromised application or
host is outside the threat model. Work admitted before a signal can finish afterward.
The stop latch and host revocation acknowledgment are separate recorded facts, and
neither undoes a committed effect. Missing alert delivery remains undetectable without
an independent signal. A heartbeat demonstrates local liveness, not the provider's
ability to detect every problem.
