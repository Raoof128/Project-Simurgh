# Phase 8 results: authenticated credential lifecycle

16 October 2026 (Australia/Sydney). Source/protocol freeze: `dd861813`.
One retained run completed **46 rows: 23 cases × two policies**, followed by a
matching fresh replay. The experiment uses native Agents SDK approval/resume,
isolated workers and an owned authenticated loopback HTTP service. It uses no
model inference, real provider account or uploaded API key.

## Observed outcomes

| Outcome across 23 cases per policy | Session snapshot | Continuous credential checks |
| ---------------------------------- | ---------------: | ---------------------------: |
| Final delivery observed            |               10 |                            7 |
| Receiver denied                    |                6 |                            9 |
| Gateway blocked                    |                5 |                            5 |
| Final receiver outcome unknown     |                2 |                            2 |
| Actual receiver effects            |               11 |                            8 |

The continuous receiver denied three additional cases: an expired credential,
explicit revocation of the old rotated credential, and remote credential revocation.
The snapshot control retained the session's login-time credential authority. Both
policies enforced session expiry/cancellation and identity, tenant and resource scope.
These are predefined engineering cases, not model attack rates or representative
utility measurements. The snapshot control's higher delivery count is not a safety score.

Seven intended cases completed under both policies: authorized delivery, an existing
snapshot after vault deletion, existing and new snapshots after rotation, the new
credential after revoking the old one, delivery after an unauthorized admin attempt,
and a new session after cancellation of the previous session. Vault deletion blocks
new snapshots but does not revoke existing credentials. Rotation alone leaves the old
credential active. Cancelling a session does not prevent a new login with its credential.

Both unknown outcomes are retained. A real closed HTTP response after receiver commit
leaves **one effect despite an unknown gateway result**; a subsequent dispatch does
not resend it. A receiver outage leaves no effect. Thus each policy has one more actual
effect than final observed outcomes. Remote revocation outage persists local stop but
keeps remote revocation status unknown. None of these unknowns becomes an asserted success.

## Ordering and failure boundaries

Continuous checks of credential revocation/expiry occur inside the same SQLite
transaction as the effect. A successful revocation acknowledgment follows commit.
An already admitted transaction may complete before that acknowledgment; a later
continuous-policy effect using the revoked credential cannot commit. Tests also
advance the clock while a send waits for the database lock, requiring the expiry
check to use the clock after lock acquisition.

The partial review identified a gateway race: an intent-reserved send could pause
before its RPC while revocation completed. A failing regression reproduced it before
repair. A same-inode advisory lock now serializes gateway calls and remote revocation
across gateway instances/processes. Local stop is durably recorded before waiting for
an admitted call to return. The regression checks stop persistence and raw receiver
ordering. Process-exit tests retain unknown intent without automatic resend.

This lock can delay revocation and serializes calls. It cannot cancel a timed-out
request still executing remotely. Only the continuous receiver supplies the stated
post-revocation commit bound. The snapshot policy deliberately lacks that guarantee.
Linux locking, trusted storage and an unchanged database inode are required.

## Evidence and verification

- [Canonical report](report.json), [archive](evidence.zip), [root](ROOT.sha256),
  [receipt](receipt.json), [protocol](protocol.json), [reproduction guide](README.md).
- **92 complete raw SQLite snapshots**: service and gateway state for every row.
  Normalized schema and every table are checked against the report. Token hashes are
  included; plaintext bearer tokens and the admin bootstrap secret are not retained.
  Fixture keys are deliberately public and deterministic for replay; runtime defaults
  generate random keys. Fixture keys must never be used with a real service.
- Archive: **114,305 bytes**. Manifest SHA-256:
  `b84c6c7472d02652f22604dda64cfd9ff46f41ef31f18b04d6c8a56d84c7a31d`.
- **50 source/data bindings** match the committed source freeze. Verification checks
  exact inventory, raw tables, outcomes, summaries and a fresh native replay.
  Coordinated raw/report alteration is rejected by replay. The archive's manifest
  hash provides byte integrity, not independent custody or proof of omitted events.
- **24 focused tests passed**. Repository suite: **5,122 passed**, zero failures,
  three existing prerequisite skips. Ruff and compatibility of 62 pinned packages pass.
  The retained run's mandatory fresh replay and a separate archive verification passed.
- The fresh whole-change review was interrupted by an automatic cybersecurity-content
  block. Its one reported race was reproduced and fixed by the author. There is no
  completed independent-review verdict; the final fix/artifacts are author-verified.
- P8-CI01 declaration `9e372a0d` strictly precedes the live census addition in
  `122f4226` (43→44). Historical baseline and non-current fields are unchanged.
  Hosted verification status is recorded separately in the [execution ledger](../CREDENTIALS_PHASE_8.md).

## Limits and next milestone

This partially addresses N06 in the [OpenAI needs review](../OPENAI_NEEDS_2026-10-16.md).
The official [vault guide](https://developers.openai.com/api/docs/guides/agents-api/tools/vaults)
and [environment security guide](https://developers.openai.com/api/docs/guides/agents-api/environments/security)
were checked again on 16 October 2026. They motivate distinguishing stored secrets
from provider credentials and running sessions; the experiment does not characterize
OpenAI's actual backend or establish vendor compatibility.

The vault is trusted host memory, not encrypted secret storage. Time is an authenticated
logical fixture clock. Fault controls and HTTP without TLS are lab mechanisms.
Administrator provisioning, issuer identity, host/storage integrity and actor routing
are trusted. Deliberately provisioning a session bearer as another credential is outside
that assumption. No OAuth/OIDC, production IAM, shared-credential agent deployment,
wall-clock synchronization, live model safety or independent custody is established.
Phases 6 and 7 are not silently composed into this result.

The next bounded milestone is to compose the phase 6–8 controls in one end-to-end
pipeline, then test fresh held-out model tasks against that composition. Representative
provider identity integration and an outside operator remain separate evidence gaps.
A completed whole-change review is also still needed before presenting this as reviewed.

| Planning axis (subjective, not a benchmark) | Score / 10 | Named artifact needed to improve it                   |
| ------------------------------------------- | ---------: | ----------------------------------------------------- |
| Local lifecycle failure coverage            |          7 | Separately operated concurrent fault campaign         |
| Provider identity integration               |          2 | Authorized real-provider rotation/revocation capture  |
| Independent custody                         |          1 | Outside operator commitments and reproduction receipt |
