# Phase 6: provider safety signals and monitor-gated dispatch

Declared 16 October 2026 (Australia/Sydney), following the user's instruction to
implement and test the source-backed roadmap phase by phase. Baseline `111b42ee`.
This phase pays bounded parts of N01/N02. Phase 7 addresses context/delegation;
phase 8 addresses authenticated credential lifecycle. Their broader claims remain open.

## Design

Add `tools/assurance-signals/`, retaining all frozen predecessors. The trusted
application binds one controller to an enforced host, project, response and request.
Native SDK tool execution calls the controller at the effect boundary. The controller
admits work only with a healthy monitor lease, an operator activation, no unresolved
authenticated alert, and no terminal provider stop. It never grants tool authority:
the existing exact-action host still decides whether the action is allowed.

Use the pinned OpenAI SDK's webhook signature verification on bounded raw bytes.
Strict JSON parsing rejects duplicates/nonfinite values. Persist the event ID and
body digest before alert lookup; repeated IDs with changed content fail. Unresolved
authenticated events hold dispatch. A trusted project-bound lookup returns normalized
alert details, matched by exact response/request identity. Other conversations are
ignored after lookup; missing/inaccessible details stay pending, not clean.
Reason may be null. `request_paused` is recorded, never treated as proof of local stop.

An authenticated correlated alert or trusted transport `misalignment_policy_violation`
error durably latches terminal stop before requesting host revocation. This terminal
state cannot be cleared by restart, heartbeat or an alternate model. Streaming errors
are handled even after output/effects. Provider automatic-stop coverage is not inferred.
Signature verification and alert lookup are local synthetic fixtures in this experiment;
no inference, live webhook endpoint, real credential or safety incident is required.

Monitoring starts paused. A trusted heartbeat supplies a bounded monotonic lease;
boot identity and backwards-clock checks prevent trusting stale leases. Expiry latches
a monitor pause. Restoring health alone does not resume work. A separate operator HMAC
decision binds the exact controller configuration, current revision, expiry and nonce;
only monitor pauses with no pending alerts and no terminal provider block can restart.
The signing keys and state remain outside model/worker access. This is a local trusted
operator contract, not enterprise identity integration. A compromised trusted host is
outside the threat model.

Dispatch admission is serialized with stop/pending state in SQLite, then the existing
host performs its bounded remote operation. Work admitted before a stop can commit;
work admitted after a stop is blocked. Host revocation completion is separate from
the durable stop latch. Failures to revoke leave the latch active and visible. Do not
claim distributed cancellation, undo, guaranteed webhook delivery or complete alerts.

Compare `local_only` (exact host authorization, ignores provider/monitor signals) with
`integrated` on identical scripted cases: authorized, block_before, stream_block_after,
alert_before, delayed_alert_after, duplicate_alert, wrong_response, lookup_unavailable,
null_reason, paused_false, forged_signature, expired_signature, monitor_missing,
monitor_expired, monitor_restored_no_approval, operator_restart, stale_restart,
provider_restart_denied, pending_restart, unrelated_error, unknown_effect.
Exactly 21 × 2 = 42 rows plus one event-gated in-flight drill per policy = 44 rows.
These are engineering fixtures, not sampled model attacks or statistical safety rates.
Record final raw receiver databases, controller events, lookup attempts and dispatch
admissions. Compare fresh replay in all deterministic fields; report wall timing only
as diagnostic metadata. Preserve unknowns and every partial failed publication attempt.

## Implementation plan and interfaces

1. Write failing signature, durable-stop, pending-alert, monitor-lease and restart tests.
   Implement `signals.py`: `SignalGate.create`, constructor/reopen, `heartbeat`,
   `restart`, `receive`, `resolve`, `provider_error`, `dispatch`, `events`, `state`.
   Use injected trusted lookup/clock only at application construction, never model input.
   `native_delivery(gate, action, directory)` delegates only `dispatch`; no frozen edits.
2. Write failing 42-row/2-drill and tamper tests. Implement `experiment.py` and
   `evidence.py` using frozen phase 4 observation/archive primitives. A source-bound
   protocol declares exact case identities, policy identities and pinned dependencies.
   Verification requires raw-effect agreement and a complete fresh native replay.
3. Fresh whole-change internal review. Reproduce important findings before fixing them.
   Run focused tests, Ruff, pinned dependency checks and the repository suite.
4. Commit the source/protocol freeze before published execution. Execute once into a
   new directory, retain outcome/failure artifacts, verify separately and publish results.
5. Add path-scoped CI, update live gate census under the authority below, push and record
   actual hosted status. Update current navigation and logs without changing old scores.

Preflight interfaces: the native workflow requires only `dispatch(action)`; `Host`
remains the exact authority and durable intent implementation. Phase 4 observer accepts
one exact action per receiver; this experiment intentionally uses that bounded sink.
The archive helper provides byte integrity, not truth or independent custody.

## Write scope and lifecycle

Add `tools/assurance-signals/**`, `docs/research/signals-phase-6/**`, this design and
`.github/workflows/assurance-signals.yml`. Modify current README, ROADMAP, reviewer
index, package.json, AGENT.md and CHANGELOG.md as needed. No frozen predecessor changes.

Maintenance authority P6-CI01: modify only `current` in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` to add the exact
new CI step identity and refresh its telemetry. Preserve `baseline` and other fields.
This declaration commit must be a strict ancestor of that edit; verify ancestry.

| Field                         | Declaration                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| active_phase                  | Phase 6 provider safety signals                                                      |
| protected_surface             | New source, tests, protocol and evidence; dependencies pinned by hash                |
| next_phase_behaviour          | Successors add namespaces; old fixtures remain reproducible                          |
| maintenance_behaviour         | Exact repair authority precedes frozen edits                                         |
| sunset_or_migration_condition | Versioned successor preserves old evidence and scope                                 |
| anti_vacuity_condition        | Exact 42 matrix and 2 drill identities, raw effects, negative tests and fresh replay |

## Decisions, review focus and ledger

- Ruling: use local signed fixtures and a trusted normalized lookup boundary. This
  validates handling, not live OpenAI delivery, account access or provider monitoring.
- Ruling: terminal provider stops never restart; only monitor pauses can receive an
  exact operator restart. Cost: conservative unavailability after false provider alerts.
- Ruling: admission precedes remote work, so already admitted work may finish after a
  stop. Cost: no cancellation guarantee; ordered traces must expose the limit.
- Review focus: signature/key separation, replay/body collisions, wrong identity,
  pending-alert crash windows, expiry/reboot, restart forgery, stop/admission races,
  revocation failures, report tampering, denominator completeness and false-clean claims.
- Ruling: an alert with contradictory response/request IDs remains pending, rather
  than being labeled unrelated. The first unrelated-alert test had this contradictory
  fixture; both IDs now differ for that case. Cost: conservative availability on
  inconsistent provider metadata, with the ambiguity preserved.
- Author edge tests reproduced equal webhook/operator key acceptance; construction
  now requires distinct decoded signing keys of at least 32 bytes. Lookup interruption
  and contradictory identity tests retain pending holds across reopen.
- Fresh internal review found four important defects: clock sampled before SQLite
  lock acquisition, unused operator approvals surviving reboot, omitted deterministic
  controller fields in evidence verification, and a standalone CLI import failure
  introduced by import sorting. Each reproduced in a failing regression before repair.
  Clock checks now occur inside the transaction; restart scope binds boot identity;
  normalized raw evidence includes every table/schema; a separate interpreter checks CLI.
- Ruling on review limits: live provider delivery, real credential custody, distributed
  cancellation and outside observation remain unvalidated. The final committed-source
  and artifact checks will be performed by the author, not this internal reviewer.
  No deferred minor findings. The cost is a scoped engineering result, not deployment assurance.
- P6-CI01 adds exactly one live gate identity (41→42), none removed. Historical
  baseline fields remain unchanged. This records a census classification gap, not its repair.
- Progress: implementation and review repairs complete; final tests and source freeze pending.
