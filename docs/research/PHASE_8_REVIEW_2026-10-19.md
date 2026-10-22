# Phase 8 follow-up security review

19 October 2026 (Australia/Sydney). This completes the outstanding local source
review. It is an assistant review in the project workspace, not independent custody
or an external security certification. The earlier interrupted review stays recorded.

## Scope and threat model

Reviewed the Phase 8 change from `4e2654c2` through `f497775f`, including all ten
Python source/test files and `.github/workflows/assurance-credentials.yml`. The
source freeze is `dd861813b74dd05ba3203cda12259a24fe19e0c1`. Current source hashes
still match the 50-binding protocol; no frozen source or evidence was edited.

The attacker controls a proposed action and untrusted worker output, may supply
invalid bearer values, and may trigger the declared crash, timeout and lost-response
conditions. The host, issuer provisioning, administration, SQLite storage and kernel
are trusted. Credentials stay in the parent; the worker has no network or path
authority. Host compromise, hostile administrators, TLS, production identity
providers and remote cancellation after transport uncertainty are outside this model.

## Coverage and disposition

| Surface         | Review and evidence                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service.py`    | Exact JSON/field checks; parameterized SQL; admin/credential/session roles; credential and session expiry; scope binding; same-transaction effects and revocation; idempotency conflicts.       |
| `transport.py`  | Loopback service bootstrap through stdin; secret-free child environment; redirects disabled; bounded reads/timeouts; strict issuer/credential reply binding; HTTP failures remain unknown.      |
| `gateway.py`    | Exact approved action; durable intent before RPC; no resend of unknown intent; local stop before remote revoke; same-inode admission lock; correlated acknowledgment validation.                |
| `experiment.py` | Exact 46-row identity/order; actual raw effects retained for lost acknowledgments; vault deletion and revocation kept distinct; native worker probes; bearer absence checks.                    |
| `evidence.py`   | Exact archive/report inventory; all raw schemas/tables; source and Git-commit binding; fresh replay rejects coordinated report/database fabrication.                                            |
| Five test files | Read every test; reran all 24 tests, including admission/revoke ordering, expiry after lock acquisition, malformed acknowledgments, role rejection, crash-after-intent and all-table tampering. |
| Workflow        | Read-only repository permission, pinned Python version, hash-locked packages, focused tests and full archive replay; no provider credentials.                                                   |

Supporting reads followed the changed behavior into connector action validation,
native dispatch/worker isolation, read-only SQLite observation and bounded archive
verification. The review did not expand into an unrelated historical repository audit.

No new exploitable defect was confirmed within the declared model. The earlier
P8-R01 admission/revocation race regression passes. The following boundaries remain
material and are not treated as repaired vulnerabilities:

- A trusted administrator could deliberately provision one role's bearer into another
  role. Role separation depends on the explicitly declared provisioning assumption.
- SQLite/advisory locking relies on stable trusted storage. Host rollback or inode
  substitution is outside the guarantee.
- A timed-out RPC may continue remotely. Only the continuous receiver's transaction
  establishes the post-revocation-acknowledgment commit bound.
- Cached `observed` means a previously recorded effect, not new authority or a fresh
  remote observation. Unknown transport results are never promoted to observed.
- Logical-clock expiry is not evidence of wall-clock lease reliability. The loopback
  server is a lab component, not a hardened Internet-facing identity provider.
- Archive consistency and same-host replay do not establish truthful observation by
  an independently controlled receiver.

## Fresh verification

The pinned workflow environment ran all **24 tests successfully in 21.659 seconds**.
A separate `evidence.py verify` invocation verified the published archive with full
fresh execution: **46 rows, 92 snapshots**, manifest
`b84c6c7472d02652f22604dda64cfd9ff46f41ef31f18b04d6c8a56d84c7a31d`.

The security plugin's supporting preflight resource and scan tools were unavailable;
this is a documented manual source review, not a completed plugin scan or generated
SARIF report. External review remains separate work for the outside operator.
