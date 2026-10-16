# Phase 8: authenticated credential lifecycle

Declared 16 October 2026 (Australia/Sydney), baseline `4e2654c2`, under the user's
instruction to implement and test phase 8. The [OpenAI needs review](OPENAI_NEEDS_2026-10-16.md)
N06 motivates this work: vault deletion, provider revocation, credential rotation and
session termination are different operations. Its official vault/security sources
and broader standards, incident, prior-art and buyer source map remain the context.
No novelty, OpenAI compatibility or production identity integration is claimed.

## Design

Build an owned loopback HTTP credential service in `tools/assurance-credentials/`.
Separate administrator, credential and session bearer authority. Persist only token
hashes, credential identity/tenant/resource/expiry/revocation, session snapshots,
effects and events. Issue session tokens using HMAC domain separation under the
server bootstrap secret. Runtime defaults use generated secrets; published fixtures
use explicitly public deterministic keys for reproducibility. They are not usable
against any real service. Never read or use uploaded/provider credentials.

Compare receiver policies `session_snapshot` and `continuous`. Both authenticate
login, enforce session expiry/cancellation, bind subject/tenant/resource and reject
forged bearer tokens. The snapshot control retains authorization obtained at login.
Continuous additionally checks credential expiry/revocation in the same SQLite
write transaction as the effect. Revoke acknowledgments follow transaction commit.
Thus no continuous-policy effect authorized by that credential can commit AFTER a
successful revoke acknowledgment. Work already inside the commit transaction can
finish BEFORE that acknowledgment. This is an owned-service guarantee, not a claim
about external vendors or distributed cancellation.

A host-memory vault supplies credentials to immutable environment snapshots. Vault
updates/deletion affect new snapshots only. Session cancellation does not revoke the
underlying credential; credential rotation alone does not revoke the old one. Tests
must preserve these distinctions, including permitted old sessions before explicit
revocation and permitted new sessions using the replacement credential afterward.

A durable gateway mediates native SDK/isolated-worker proposals, enforces one exact
approved action, and reserves its intent before RPC. Credential/session/admin secrets
stay outside worker arguments/environment and durable gateway state. Receiver denial,
local block, observed delivery and unknown transport outcome are distinct. Unknown
intent is not automatically resent. Local revoke latches stop BEFORE admin RPC;
failed or inaccessible revocation stays `unknown`, even when local dispatch blocks.

Clock advancement and dropped responses are explicit authenticated lab controls.
Time is a deterministic logical fixture clock, sampled inside the effect transaction;
expiry tests establish boundary semantics, not real clock synchronization or latency.
The loopback transport assumes a trusted host and does not establish TLS, OAuth/OIDC,
enterprise IAM, secure vault storage, live OpenAI interoperability or outside custody.
No model inference occurs. This phase does not silently compose phases 6/7 controls;
it isolates credential enforcement while retaining native tool isolation.

## Exact experiment and acceptance

Two policies × 23 cases = **46 rows**:

`authorized`, `vault_delete_existing`, `vault_delete_new`, `rotation_existing`,
`rotation_new`, `rotate_revoke_old`, `rotate_revoke_new`, `credential_expiry`,
`session_expiry`, `wrong_identity`, `wrong_tenant`, `wrong_scope`, `forged_credential`,
`forged_session`, `unauthorized_admin`, `remote_revoke`, `local_revoke`,
`revocation_outage`, `lost_ack`, `receiver_outage`, `revoked_login`, `cancel_session`,
`cancel_session_new`.

Continuous final results: seven observed, nine receiver-denied, five locally blocked,
two unknown. Snapshot final results: ten observed, six denied, five blocked, two unknown.
Lost acknowledgment retains one actual receiver effect despite an unknown gateway
outcome; receiver outage retains none. These are declared fixture outcomes, not safety
rates or a representative workload. All rows must retain both complete raw SQLite
databases: **92 snapshots**. Raw normalized schema/table contents and all report fields
are checked; fresh native replay must match. Deterministic public fixture keys make
hash fields reproducible without excluding them from verification.

Concurrency regressions separately test revocation during a locked effect transaction,
post-ack rejection and expiry after waiting for the database lock. A dropped response
is an actual closed HTTP response after commit, not a mocked success result. Malformed
admin/auth requests, wrong token roles, idempotency conflicts, persistent unknowns,
source bindings and coordinated evidence forgery must fail appropriately.

## Implementation plan and interfaces

Use inline execution and one fresh whole-change review. This tracked design is the
ledger; development logs belong in `/workspace/simurgh-research/phase-8/`.

1. **Authenticated receiver.** Add `service.py`, `transport.py`, `tests/test_service.py`.
   First run failing tests for authentication, identity/scope, expiry, rotation,
   revocation, cancellation, idempotency, HTTP response loss and transaction ordering.
   Implement `Store.create(path, policy, now=100)`, `issue`, `login`, `send`, `revoke`,
   `cancel`, `advance`, `drop_next`; `Service` owns a subprocess/HTTP server and admin
   client; `SessionClient` holds one bearer and binding in trusted parent memory.
   Admin methods authenticate separately. No redirects or ambient HTTP credentials.
2. **Gateway and native matrix.** Add `gateway.py`, `experiment.py` and tests.
   `Vault` snapshots credentials; `Gateway.create(path, client, approved)` persists
   exact authority and intent, `dispatch(action)` returns the four distinct outcomes,
   `revoke(revoker)` records durable local stop and correlated remote status.
   Native delivery consumes only `dispatch`; the worker receives proposals, never keys.
   First fail exact 46-case outcomes and raw inventory, then implement and run.
3. **Evidence.** Add `evidence.py`, tests and phase-specific protocol. Bind inherited
   native/replay dependencies and every new Python file. Require exact inventory,
   all raw schemas/tables, report agreement, committed hashes and full fresh replay.
   Retain all partial published failures. Freeze source/protocol in Git BEFORE the
   retained publication execution; later frozen edits require preceding repair authority.
4. **Review and publication.** Fresh review of auth-role confusion, receiver commit/
   revoke races, clock/expiry, retries, forged acknowledgments, worker secret exposure,
   raw verification and unsupported claims. Reproduce important findings before fixes.
   Run focused tests, Ruff, pinned dependency checks and `PYTHONDONTWRITEBYTECODE=1 npm test`.
   Publish results and raw evidence, verify separately, push and record actual hosted CI.

Preflight: existing `native_delivery` accepts a dispatch facade and a fixed action
schema; the phase 4 archive helper supplies byte integrity only. New receiver tables
require a new raw observer; do not repurpose the old single-inbox observer. Report
no bearer values. The complete service DB contains hashes only, never bootstrap keys.

## Write scope and lifecycle

Add `tools/assurance-credentials/**`, `docs/research/credentials-phase-8/**`, this design
and `.github/workflows/assurance-credentials.yml`. Update current README, ROADMAP,
reviewer index, package.json and both change logs.

P8-CI01 authorizes modifying only `current` in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` to add the exact new
CI identity and refresh telemetry. Preserve baseline and all other fields. This
commit must be a strict ancestor of the census edit. No frozen predecessor edits.

| Field                         | Declaration                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| active_phase                  | Phase 8 credential lifecycle                                       |
| protected_surface             | New source/tests, protocol and retained artifacts                  |
| next_phase_behaviour          | Successors add namespaces and preserve this reproduction           |
| maintenance_behaviour         | Bounded repair declaration precedes frozen changes                 |
| sunset_or_migration_condition | Versioned successor retains evidence and scope                     |
| anti_vacuity_condition        | Exact 46 identities, 92 snapshots, negative tests and fresh replay |

## Decisions and ledger

- Ruling: owned HTTP service and public deterministic fixture keys establish real
  local authentication/commit semantics, not live vendor identity integration.
- Ruling: credential revocation is checked at the receiver's commit boundary; an
  already active transaction can finish before acknowledgment. No undo is promised.
- Ruling: unknown transport/revocation outcomes remain unknown and locally stopped
  intents are never automatically retried. Cost: conservative availability.
- Ruling: logical clock and authenticated fault controls enable exact replay; they
  do not establish wall-clock behavior, TLS or production hardening.
- Ruling: continue on the clean authorized topic branch, implement inline, and push
  without another approval roundtrip. The tracked ledger replaces unavailable local
  skill helper scripts. Preserve development failures and frozen historical artifacts.
- Prior phase: broader readiness run `38836069319` completed successfully.
- Progress: design and exact cases declared before implementation; subsequent checks
  and review disposition are recorded below.

## Implementation and development checks

- Tasks 1–3 implemented. Initial missing-service, gateway, matrix and verifier tests
  failed before implementation. All 23 focused tests now pass (24.092 seconds),
  including actual HTTP response loss and process exit after durable intent.
- Exact 46-row development execution matches the declared outcomes with 92 raw
  snapshots. Every service/gateway table is covered by mutation tests; coordinated
  raw/report fabrication fails fresh replay. No bearer values are retained in evidence.
- Ruling: issuer IDs additionally bind session handles and revocation acknowledgments.
  This prevents rebinding equal local IDs to another issuer; provisioning that identity
  remains a trusted host responsibility, not external identity attestation.
- Additional tests discard a revocation reply after an actual remote commit, reject
  malformed/bool/uncorrelated acknowledgment fields and duplicate credential issuance,
  and preserve an unknown intent after process exit without resending it.
- Ruff passes; repository suite 5,122 passed, zero failed, three existing prerequisite
  skips. Protocol binds 50 source/data files. Source freeze awaits fresh review.
- P8-CI01 adds exactly one live gate identity (43→44), none removed. Historical
  baseline/non-current fields are unchanged; the classification limitation remains.

## Review disposition and source freeze

- The fresh whole-change reviewer stopped after an automatic cybersecurity-content
  block. Its review is incomplete; no clean independent-review conclusion is claimed.
  Before stopping it identified a possible dispatch/revocation race. The author
  reproduced it with a paused send and a second gateway instance: remote revocation
  overtook the already-reserved call before that call reached the snapshot receiver.
- P8-R01 adopted: the new regression failed before the fix. A same-inode Linux advisory
  lock now serializes admission and remote revocation across gateway instances/processes.
  Local stop persists before waiting for an admitted RPC; the remote operation waits
  for that RPC to return. A test event-name typo was corrected after the first fix run.
  The regression checks local stop, acknowledgment ordering and raw receiver event order.
- Ruling: this lock drains synchronous calls only. A transport timeout or crashed sender
  can leave a request executing remotely; only continuous receiver checks establish the
  post-revocation commit bound. Cost: serialized calls and delayed remote revocation,
  Linux-specific locking, trusted same-inode storage and no protection from host rollback.
- Remaining review scope is author-checked, not independently cleared: role separation
  assumes a trusted administrator and issuer provisioning, including no deliberate reuse
  of a session bearer as a newly provisioned credential. Fixture public keys are separate.
  Malicious administrator provisioning, production IAM/TLS and independent custody are
  outside this study. No reviewer verdict on those external systems is implied.
- Source/protocol freeze follows final checks below. Published execution must reference
  that committed revision; its report and hosted receipts remain separate deliverables.

- Final freeze checks: 24 focused tests passed in 29.677 seconds; repository suite
  5,122 passed, zero failures and three prerequisite skips. Ruff passes. All 50
  source/data bindings pass protocol preflight. P8-CI01 is a strict ancestor of the
  census change; non-current census fields remain identical to the phase baseline.
