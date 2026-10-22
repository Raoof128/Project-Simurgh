# Phase 9 results: composed lifecycle controls

16 October 2026 (Australia/Sydney). Source/protocol freeze: `9c326a8c`.
One retained run completed **40 rows: 20 cases × two controls** and passed mandatory
fresh replay. It composes the actual frozen phase 6 signal controller, phase 7
context/lineage controller and phase 8 credential gateway/authenticated receiver.
Native SDK approval/resume and isolated workers remain in the delivery path.
No model inference, real provider account or API key was used.

```mermaid
flowchart LR
  A[Isolated proposed action] --> B[Pipeline hold and ordering]
  B --> C[Context, delegation and shared budget]
  C --> D[Route signal and monitor checks]
  D --> E[Exact credential gateway]
  E --> F[Authenticated receiver transaction]
```

## Observed outcomes

| Final orchestrator outcome across 20 cases | Credential only | Composed controls |
| ------------------------------------------ | --------------: | ----------------: |
| Observed, including cached prior results   |              14 |                 4 |
| Blocked                                    |               0 |                15 |
| Denied                                     |               4 |                 0 |
| Unknown                                    |               2 |                 1 |
| Total actual receiver effects              |              17 |                 7 |

The three intended new-delivery cases complete under both controls: authorized child,
authorized grandchild and operator-approved monitor restart. The fourth composed
`observed` result is the **cached earlier success** in stop-after-delivery: it performs
no new receiver call after stopping. These are predefined engineering cases, not model
attack rates, representative utility estimates or proof that every prevented effect
would have been harmful. The credential-only control deliberately bypasses context,
signal and pipeline checks while retaining exact credential authorization.

Four credential conditions—revocation, expiry, session cancellation and monitor restart
after credential revocation—produce raw receiver/gateway `denied` outcomes under both
controls. The composed adapter translates them to `blocked` for the frozen context
controller's vocabulary. The table's zero composed final `denied` results therefore
**does not mean zero receiver denials**. The canonical report retains `leaf_status`
and complete gateway state so this translation can be audited.

## What composition adds

- Signed matching signal fixtures stop both routes. Missing alert detail and expired
  monitoring hold dispatch. Restoring monitoring with operator approval does not revive
  a revoked credential; the receiver still denies it.
- Revoking an ancestor, changing source, omitting a recorded blocking failure or
  claiming extra authority in a summary cannot grant a child a new permitted action.
  Structured summary discrepancies are evidence, not free-text deception detection.
- Two individually approved actions share one reservation budget. The composed
  shared-budget case retains one effect; credential-only delivery produces two.
- A lost acknowledgment on action A remains unknown and reserves its budget. The
  composed sibling B is blocked, leaving one actual effect; credential-only permits
  B as well, producing two. Reopen does not refund the reservation or resend A.
- In the separate lost-acknowledgment case, both final results remain unknown while
  the raw receiver contains one effect. Retry returns unknown without another send.
  Composed results therefore contain an additional **initial** unknown in the sibling
  case, beyond the single final unknown counted in the table.
- Receiver/revocation outage leaves composed local stop active and remote revocation
  unknown. The credential-only send remains unknown. No local stop is relabeled as a
  successful remote revocation acknowledgment.
- An interrupted multi-control update leaves a durable pipeline hold. This survives
  reopen and prevents further dispatch, including through a route that the update
  never reached. Recovery requires a new reviewed task rather than guessing whether
  all component changes completed.

The seven composed effects comprise three intended new deliveries, the earlier
stop-after-delivery effect, one shared-budget effect, one unknown-before-sibling
effect and one lost-acknowledgment effect. No unknown is silently counted as success
or absence. Reduced delivery counts alone are not a safety or usefulness benchmark.

## Evidence and verification

- [Canonical report](report.json), [archive](evidence.zip), [root](ROOT.sha256),
  [receipt](receipt.json), [protocol](protocol.json), [reproduction guide](README.md).
- **360 complete raw SQLite snapshots**: service, pipeline, context, two immutable
  policy adapters, two signal controllers and two credential gateways for each row.
  Every normalized schema/table is compared with the report. Receiver effects and
  leaf statuses are derived from raw state. No plaintext bearer token is retained.
- Archive: **378,443 bytes**. Manifest SHA-256:
  `7fbcb77fcccc793100eb8f88839dea0a43df8b1701975e9ba1274377ca55d3be`.
- **76 source/data bindings** include the phase 6–8 protocol source sets and all new
  Python files. Frozen/current bytes, exact inventory, summaries and complete fresh
  native replay are checked. Coordinated report/raw alteration fails fresh replay.
- **20 focused tests passed**. Inherited phase 6/7/8 suites passed **24/25/24** tests.
  Repository suite: **5,122 passed**, zero failures and three existing prerequisite
  skips. Ruff and compatibility of 62 pinned packages passed.
- The fresh reviewer found no Critical, Important or Minor findings in the Phase 9
  change and independently passed the initial 17 tests. Three additional probes were
  retained and rerun: interrupted dispatch before/after an actual effect and a partial
  two-route stop. Stack-interruption probes use SystemExit; another test separately
  kills a process during an update. No production source changed after review.
- The retained run's mandatory replay passed. Separate verification and hosted status
  are recorded in the [execution ledger](../COMPOSITION_PHASE_9.md). The source reviewer
  did not review the later retained artifacts or hosted receipts.
- P9-CI01 declaration `d7176bcb` strictly precedes census edit `9a50d5d9`: one exact
  new identity, 44→45, with non-current fields and frozen predecessor files preserved.
  The previous Phase 8 broader readiness run also finished successfully, all 13 jobs.

## Limits and next milestone

The pipeline serializes dispatch and trusted updates using Linux advisory locks.
Already admitted work may finish before an update acquires that lock. A timed-out
request may still execute remotely. Only continuous receiver credential checks supply
the inherited post-revocation commit bound; signal/context updates do not undo effects
or implement distributed cancellation. Trusted storage must preserve the inode and
prevent rollback. Worker isolation does not protect against a malicious parent host.

A downstream signal hold can consume an already-reserved context budget despite no
HTTP call. That conservatism, serialized RPCs and abandoning partially updated tasks
are availability costs. Public deterministic keys, logical clocks, owned HTTP without
TLS, trusted actor routing and synthetic signed signals are lab assumptions. Real
provider delivery/identity, production IAM, wall-clock behavior, model generalization
and independent custody remain unvalidated. Hashes establish byte integrity, not
independence or completeness against a compromised producer.

This composition advances N02/N04/N05/N06 in the [OpenAI needs review](../OPENAI_NEEDS_2026-10-16.md).
It does not cover every need in that map. Phase 8's separate interrupted whole-change
review remains incomplete; reviewing the composition interfaces does not certify all
predecessor internals.

The next bounded study is **fresh held-out model tasks against this combined pipeline**,
with preregistered budgets and reporting of completion, unauthorized effects, false
blocks, unknowns, latency and cost. Start with local Llama; provider comparisons require
an authorized model/account. Outside reproduction and representative provider identity
integration remain separate milestones, not conclusions from these scripted results.

| Planning axis (subjective, not a benchmark) | Score / 10 | Named artifact needed to improve it                   |
| ------------------------------------------- | ---------: | ----------------------------------------------------- |
| Local control interaction coverage          |          7 | Separately operated concurrent multi-service campaign |
| Fresh model evaluation of composition       |          1 | Preregistered held-out captures on this pipeline      |
| Independent custody                         |          1 | Outside operator commitments and reproduction receipt |
