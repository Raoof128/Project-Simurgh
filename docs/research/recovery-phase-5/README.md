# Guarded recovery and local incident response

This engineering experiment tests whether an exact approved task can recover from
mechanically invalid or blocked proposals without widening authority. It also tests
revocation while a legitimate send is in flight. It uses new scripted cases, not
new Llama responses or a held-out model benchmark. Phase 3's 31 unsuccessful attacked
branches remain part of the unchanged published model result.

The [design](../RECOVERY_PHASE_5.md) predeclares 13 cases under three policies and
three in-flight drills. The complete action is already stored in trusted host
policy. Recovery copies that action once and submits it through the same native SDK,
isolated worker and exact permission check. It cannot invent an answer to an open-ended
task, obtain a new grant, or authorize itself from model text.

## Policies and outcomes

- `baseline`: ordinary enforced dispatch with no fallback or automatic monitor stop.
- `recover`: one durable-budget fallback after an invalid or blocked proposal. Read
  the existing host grant again; current revocation and identity checks still apply.
- `stop`: detect a valid action that differs from an existing grant, record attribution,
  revoke authority and prevent subsequent dispatch. Invalid syntax and absent approval
  remain blocked but are not classified as attacks.

All three preserve explicit decline and generation/runtime errors. Unknown outcomes
permit only lookup of the original effect. A committed effect with a lost response can
be reconciled; an unavailable observer remains unknown; an empty lookup is recorded as
not observed without automatically sending again. Recovery itself cannot bypass this rule.

Each policy is tested against authorized work, destination/content/run substitution,
malformed output, explicit decline, revocation, missing approval, revocation before
fallback, lost reply, receiver outage, false receipt and repeated idempotent delivery.
These include intentionally uncompletable tasks; aggregate completion is an engineering
case count, not an estimated real-user success rate.

The concurrency drill uses events to hold a legitimate RPC in flight while revocation
is requested. Automatic mismatch detection triggers `stop`; the other policies use an
explicit simulated operator stop. The effect may commit before revocation acquires the
shared dispatch lock. After revocation completes, later dispatch is blocked. The stop
cannot undo that committed effect. Manual and automatic timings are different triggers,
not a fair policy-speed comparison or a deployment SLA.

## Run and verify

Use the phase 4 guide's Python 3.12/Linux x86_64 environment and both hash-pinned
SDK/workflow dependency locks. No provider key, GPU, model download or real service
is needed. From a full-history checkout containing the frozen protocol:

```sh
export PYTHONDONTWRITEBYTECODE=1
python -m unittest discover -s tools/assurance-recovery/tests -v
python tools/assurance-recovery/evidence.py run --out /tmp/simurgh-phase5-new-run
python tools/assurance-recovery/evidence.py verify \
  docs/research/recovery-phase-5/evidence.zip \
  --expected-root "$(cat docs/research/recovery-phase-5/ROOT.sha256)"
```

Choose an unused output directory. Verification checks source hashes, the committed
protocol, exact row identities, summary calculations, raw receiver effects and receipt
keys, then **reexecutes all 42 fixtures** and compares every non-timing event/result.
Timing values must be valid and ordered but need not equal a new execution. Verification
requires the SDK runtime and local process/SQLite/socket/seccomp support. Missing
prerequisites are failures, never successes or silently excluded cases.

The archive contains a report with event traces and 42 raw receiver snapshots. Its root
must come from a trusted separate record or trusted checkout. Reading a digest from the
same untrusted archive is insufficient. The host/operator controls these observations;
retention and hash checks are not independent attestation. Failed runs retain their
working directories and a failure receipt; preserve them before a corrected attempt.

## What remains open

Broader model utility needs a separately frozen, independently authored corpus and
new inference. Semantic output policies, real IAM/vendor connectors, independently
controlled observers and cancellation across distributed services are unvalidated.
These scripted tests do not demonstrate prevention of any historical real incident.
No outside operator has supplied a reproduction receipt.
