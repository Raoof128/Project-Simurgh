# Phase 7 results: context and delegated authority

16 October 2026 (Australia/Sydney). Source/protocol freeze: `a43220d8`.
One retained execution completed **36 rows: 18 cases × two policies** and passed
its mandatory fresh replay. It used the pinned native Agents SDK approval/resume,
isolated workers, two owned loopback receivers per row and a durable controller.
No model inference, live OpenAI compaction, Agents API subagent or provider request occurred.

## Observed outcomes

| Outcome across 18 cases per policy                   | Local-only exact authorization | Integrated context/lineage gate |
| ---------------------------------------------------- | -----------------------------: | ------------------------------: |
| Final delivery observed                              |                             17 |                               5 |
| Final dispatch blocked                               |                              0 |                              12 |
| Final receiver outcome unknown                       |                              1 |                               1 |
| Total receiver effects, including earlier deliveries |                             18 |                               6 |
| Rows with structured summary discrepancies           |                              5 |                               5 |

The integrated controller completed all five intended permitted cases: honest resume,
approved child, approved grandchild, duplicate handoff and a visible nonblocking prior
failure. It blocked all 12 declared hold/authority cases. The receiver outage remained
unknown. These are predefined engineering cases, not model attack rates, semantic
truthfulness scores, generalization evidence or representative utility measurements.

The shared-budget case produces one earlier effect before blocking the sibling's
second action. That accounts for six total effects alongside five observed final
results. The duplicate handoff returns the existing observation without another
receiver effect. Local-only exact authorization permits both individually approved
sibling actions; the integrated controller additionally enforces the one-action
lineage budget. This measures a declared count limit, not recognition of arbitrary
harmful plans assembled from individually permissible steps.

In the fabricated-success case, an earlier delivery attempt is unknown. The summary
claims it was observed, but the authoritative record remains unknown and retains its
budget reservation; the later distinct action is blocked. There are thus two
integrated rows with retained unknown attempts, although only one has an unknown
**final** result. No unknown is converted to success or absence.

## What the controls established

- Forged summary grants do not expand a child's exact action set. Unregistered and
  cross-task peers cannot acquire a grant. Revoked ancestors disable descendants.
- A summary omitting a blocking failure cannot clear it. Known missing input blocks
  dispatch; an explicitly nonblocking prior failure remains visible while work proceeds.
- Checkpoints bind task, source, grants, facts and attempts. Stale, changed-task and
  changed-source checkpoints cannot resume execution. Changing a source label back
  cannot revive old grants; source changes permanently revoke them.
- All five permitted cases survive the context boundary. Honest projection plus a
  valid checkpoint supports useful work; an untrusted note is never interpreted as
  permission. Structured discrepancy reporting also occurs for the stale-checkpoint
  and changed-source cases, so five discrepancies do not mean five detected lies.
- Reservation precedes the remote call. Concurrent sibling tests admit only one
  distinct action; process exit or an unexpected exception leaves a durable unknown
  without automatic resend or refund. The crash/exception probes are regression tests,
  separate from the 36-row published matrix.
- The revocation regression deliberately pauses an admitted call: it may complete
  after revocation while later dispatch blocks. This retains the earlier phases'
  cancellation limit; no undo or distributed cancellation is claimed.

Both policies are supplied identical scripted proposals. The baseline bypasses the
new admission boundary while retaining exact-action hosts. Its higher completion
count does not establish superior safety or user utility. Summary discrepancies are
recorded for both policies; only the integrated policy consults durable context and
lineage state before dispatch. Native SDK approval is a separate local mechanism.

## Evidence and verification

- [Canonical report](report.json), [evidence archive](evidence.zip), [root](ROOT.sha256),
  [receipt](receipt.json), [protocol](protocol.json), [reproduction guide](README.md).
- **108 raw SQLite snapshots**: both receivers plus complete controller state for
  each of the 36 rows. All normalized tables and schemas are bound, including config,
  grants, facts, reservations, revisions and events. Verification also derives the
  report's authoritative projection directly from the raw controller database.
- Archive: **92,947 bytes**. Manifest SHA-256:
  `2eeff1f45fe67c7c192db2cc6ec25984f8125dc1c6f27fc47d7b1d8fb397fdb7`.
- **47 source/data bindings** match the Git source freeze before execution. The
  verifier checks committed and current bytes, exact inventory, raw observations,
  summaries and a fresh native replay. Coordinated raw/report forgery is rejected
  by that replay. Hashes do not establish independent custody or truth of omitted data.
- **25 focused tests passed**, including five probes retained from fresh review.
  The repository suite passed **5,122 tests**, zero failures and three existing
  Chrome/Lean prerequisite skips. Ruff and 62 pinned package compatibility checks pass.
- The fresh reviewer independently passed the original 20 tests and five additional
  adversarial probes. No Critical, Important or Minor findings remained. Author
  testing found source-label restoration reactivating old grants; a failing regression
  preceded the repair. No production code changed after review. Final artifacts and
  hosted results are verified separately by the author/automation, not that reviewer.
- P7-CI01 declaration `66646a89` strictly precedes the live gate census addition
  (42→43). Historical baseline and other fields are unchanged. Existing classification
  limitations are recorded, not represented as repaired.

## Limits, decisions and next phase

This partially addresses N04/N05 in the [OpenAI needs review](../OPENAI_NEEDS_2026-10-16.md).
It does not show that a model recognizes a broken task (N03), follows a truthful
summary, or resists unseen attacks. Free-text deception is not classified. The host
projection compares structured fields; app-owned actor routing and checkpoint
custody must remain outside model control. A compromised host, state rollback,
unmediated tool call or actual shared-credential subagent is outside this result.

The principal design costs are explicit: structured checking leaves semantic deception
unmeasured; the one-action budget does not infer harmful cumulative intent; uncertain
reservations sacrifice availability; source changes require a newly authorized task;
and already admitted effects can finish after revocation. The trusted state is
same-operator evidence, not independent custody. The [design ledger](../CONTEXT_PHASE_7.md)
records the implementation and review decisions, execution and hosted status.

Next is **phase 8: authenticated credential lifecycle**—expiry, rotation, revocation
and existing versus new sessions against an owned receiver. Real provider identity,
outside observation and a fresh model study remain separate milestones. Phase 8 is
not completed by this report.

| Planning axis (subjective, not a benchmark) | Score / 10 | Named evidence needed to improve it                                     |
| ------------------------------------------- | ---------: | ----------------------------------------------------------------------- |
| Local failure and lineage coverage          |          7 | Separately operated concurrent fault campaign                           |
| Model/actual compaction integration         |          1 | Preregistered fresh model handoffs with authentic compaction boundaries |
| Independent custody                         |          1 | Outside operator receiver commitments and reproduction receipt          |
