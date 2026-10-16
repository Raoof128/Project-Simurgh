# Phase 5: guarded recovery and local incident response

Declared 16 October 2026, Australia/Sydney, under the user's direction to complete
what can be done by the project operator. Preserve every previous frozen result.

## Design and scope

The exact-copy connector already holds a complete trusted approved action. Add a
host-controlled recovery policy that may submit that existing action once after
an invalid proposal or a blocked attempt. Read the action from durable host policy,
never from a model-supplied "correction" or grant. Every recovery passes through the
same native SDK, isolated proposal worker and current exact-authority check.
Revocation, absent approval and idempotency conflicts remain effective. Explicit
model declines and generation/runtime errors do not trigger recovery. Unknown
outcomes allow read-only reconciliation of the original action, never blind retry.
This is deterministic orchestration, not an improvement in model understanding or
a general answer generator. No phase 3 results are relabeled or tuned away.

A second policy detects a valid action that differs from an existing trusted grant,
records attribution, revokes authority and stops further sends. Malformed calls and
missing grants are blocked without being labeled detected attacks. A real in-flight
send may commit before revocation acquires the dispatch lock. Record that outcome;
revocation completion stops later dispatch but cannot undo a committed effect.
A deterministic event-gated concurrency drill establishes this order without timing
luck. Report detection-to-revocation latency as local observed timing, not an SLA.

Compare three declared policies on the same new scripted cases: `baseline` (no
recovery/monitor), `recover` (one authorized fallback), `stop` (revoke on mismatch).
All use enforced host authorization; there is no unsafe bypass in this new matrix.
Predeclared case set: authorized, destination_substitution, content_substitution,
cross_run, malformed_call, explicit_decline, revoked_before, no_approval,
recovery_after_revocation, lost_reply_committed, receiver_unavailable,
false_receipt, idempotency_repeat. Exactly 13 × 3 = 39 matrix rows, plus one
in-flight revocation drill for each policy = three rows. These are scripted
engineering fixtures; no held-out or new model-efficacy claim is permitted.

Retain ordered event traces and raw final receiver snapshots, including failures.
A source-bound report and archive verifier check exact inventories, expected effects,
receipt identity, attribution, policy decisions and event order. Fresh execution
must agree in deterministic fields; wall times are reported separately. No result
filtering, empty-suite success or silent prerequisite skips.

## Fresh hosted reproduction

Add a path-scoped GitHub workflow that executes the unchanged phase 4 runner on a
fresh hosted Linux machine, installs only the hash-pinned dependencies, and retains
pack/root/receipt/logs as Actions artifacts. Download and verify the resulting pack
locally. This pays the fresh-host check, not outside-operator independence: the
project still controls the workflow. Outside participation and real vendor/IAM
integration remain external work; no messages or outreach are authorized here.

## Plan and permitted changes

1. Record phase 4's 13/13 hosted success. Add fresh-machine replay CI and check its
   output while developing the successor. Pin the changed live gate identity set.
2. Write failing recovery and concurrency tests. Implement `tools/assurance-recovery/`
   using frozen phase 2 native dispatch and phase 4 observation/pack helpers.
3. Add the exact scripted case matrix and retained-evidence verifier. Fresh internal
   whole-change review; reproduce important findings RED, repair once, run GREEN.
4. Freeze source/protocol before executing the published matrix; retain failures.
   Verify raw effects, replay, focused/full tests, prior frozen hashes and documentation.
5. Publish results/navigation/logs, commit/push and report hosted statuses accurately.

Add: `tools/assurance-recovery/**`, `docs/research/recovery-phase-5/**`, this design,
`.github/workflows/assurance-followup.yml`. Modify current navigation only in README,
ROADMAP, reviewer index, package.json and both logs. Phase 4 narrative may receive
hosted receipts; its source, contract, archive and root remain immutable.

Exact maintenance authority P5-CI01: modify only the `current` field in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` to record new
workflow gate identities and telemetry. Purpose: preserve exact live census after
adding path-scoped jobs. The `baseline` and all historical findings remain unchanged.
This declaration commit must strictly precede that edit; verify ancestry.

| Field                         | Declaration                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Recovery phase 5 and fresh hosted replay                                                                               |
| protected_surface             | New recovery source/protocol/evidence; frozen dependencies bound by digest                                             |
| next_phase_behaviour          | Earlier studies replay unchanged; future experiments use new namespaces                                                |
| maintenance_behaviour         | Exact repair authority precedes changes after freeze                                                                   |
| sunset_or_migration_condition | A versioned successor retains old raw evidence and limits                                                              |
| anti_vacuity_condition        | Exact 39 matrix plus 3 concurrency identities, all raw snapshots and trace/effect assertions; fresh replay comparisons |

## Decisions and review focus

- Ruling: use deterministic recovery because this workflow already has the exact
  approved action. Cost: results do not generalize to tasks requiring new reasoning.
- Ruling: explicit decline stays terminal and uncertainty permits reconciliation only.
  Cost: some tasks remain incomplete even when a human could later authorize a retry.
- Ruling: combine local incident tests with fresh-host replay, without real credentials
  or affected websites. Cost: real identity, distributed cancellation and outside
  independence remain unvalidated.
- Review focus: authority substitution, fallback budget, unknown effects, persistent
  revocation, fabricated traces, denominator omission and concurrent ordering.
