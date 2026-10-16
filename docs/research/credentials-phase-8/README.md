# Phase 8: authenticated credential lifecycle

This owned-service experiment distinguishes vault deletion, rotation, credential
revocation, session cancellation and expiry. It compares session-snapshot checking
with credential checks at every receiver commit. Read the [design/ledger](../CREDENTIALS_PHASE_8.md)
and [source-backed motivation](../OPENAI_NEEDS_2026-10-16.md). The [results](RESULTS.md)
retain all 46 rows and 92 raw snapshots with fresh replay verification.

## Reproduce

Use Linux x86_64, Python 3.12 and full Git history. From the repository root:

```bash
python3.12 -m venv /tmp/simurgh-credentials-venv
/tmp/simurgh-credentials-venv/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-credentials-venv/bin/python -m pip check
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-credentials-venv/bin/python -m unittest discover \
  -s tools/assurance-credentials/tests -v
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-credentials-venv/bin/python \
  tools/assurance-credentials/evidence.py verify docs/research/credentials-phase-8/evidence.zip \
  --expected-root "$(cat docs/research/credentials-phase-8/ROOT.sha256)"
```

Get the root from a trusted checkout or independently retained receipt. Verification
checks exact cases, all raw tables/schema, current and committed source hashes, and
fresh native replay. It establishes reproducibility, not independent custody.
For a new retained run, commit the source/protocol first, then use
`evidence.py run --out /absolute/new/directory`. Existing directories are refused;
retain every partial failure and raw snapshot.

## Boundaries and operation

`Service` owns a loopback HTTP subprocess. Administrator, credential and session
bearers have different roles. Issuer IDs bind session handles and revocation replies.
Database snapshots store token hashes, never bearer values or the bootstrap key.
Generated runtime defaults are random; published fixtures deliberately use public,
deterministic keys. Never reuse fixture keys outside this owned lab.

The in-memory `Vault` is a lifecycle model, not encrypted secret storage. An existing
environment snapshot retains its old credential after vault deletion/update. New
snapshots see the new value or a missing credential. Rotation leaves the original
credential valid until explicitly revoked. Cancelling a session leaves the underlying
credential available for a new login. Neither operation is a substitute for the other.

`Gateway` keeps secrets in the trusted parent client and sends only the action to the
isolated worker. It enforces exact authority, persists intent before RPC and never
resends an unknown intent automatically. Cached observed results do not cause a new
receiver call. Revocation durably stops local dispatch before contacting the service;
only an issuer/credential-correlated positive acknowledgment records confirmation.
An outage or malformed reply leaves the remote status unknown and local stop active.
A same-inode advisory lock serializes admitted calls across gateway processes. Local
stop persists before waiting for an admitted call to return, then remote revocation
runs. This can delay revocation; it does not cancel a timed-out request still running
at a receiver. Only the continuous receiver supplies the post-revocation commit bound.
The gateway requires Linux and trusted storage without database replacement.

In the continuous policy, session and credential checks run inside the receiver's
SQLite effect transaction. Revocation acknowledgment follows commit. An admitted
transaction may complete before acknowledgment; later sends fail. The snapshot
control deliberately retains credential authority from login until its session
expires or is cancelled. These policies are lab alternatives, not claims about
OpenAI's backend implementation.

Expiry uses an authenticated logical fixture clock, sampled after the transaction
lock. Fault injection can close a real HTTP response after effect commit. These
controls establish deterministic boundary behavior, not clock synchronization,
latency or production hardening. The lab uses loopback HTTP without TLS. Trusted
host/admin/storage, actor routing and issuer provisioning remain outside the threat
model. No OAuth/OIDC, vendor account, real API key, model inference or outside
custody is tested. Phases 6/7 controls are not implicitly composed into this study.
