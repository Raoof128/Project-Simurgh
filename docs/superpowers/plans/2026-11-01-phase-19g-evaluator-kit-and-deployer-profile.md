# Phase 19g implementation plan — seeded incident drill, deployer profile, incident-record schema, evaluator kit

**Date:** 1 November 2026 · **Design:** [Phase 19 v2.1](../specs/2026-11-01-phase-19-authority-provenance-design.md) §4.9, §6 row 19g ·
**Baseline:** branch `phase-19/authority-provenance` @ `1bbdaa28`.

Two halves. The **recomputable** half is a seeded incident drill on the successor rig with a
deployer incident record generated from receiver snapshots (the artifact the 2024 RSP promised and
3.0 dropped; G20; cluster C row 7). The **attested** half is two documents: the deployer profile
(per agentic harm class the labs measure, the control a deployer must supply and the receiver
evidence that it held) and the embedded-evaluator kit (what frozen Stages 5I and 5J already do,
mapped to the acceptance criteria the three labs publish, addressed to one named evaluator). The
kit's delivery and any reply are attested, not recomputable.

## Files

```
tools/assurance-provenance/
  drill19.py              # the seeded drill: plant, detect, stop, revoke, preserve, in-flight fate, detection-to-action
  incident19.py           # deployer incident record from receiver snapshots (schema + generator + verifier)
  evidence19g.py          # protocol, run, verify, mutations
  tests/test_drill19.py, tests/test_incident19.py, tests/test_evidence19g.py
docs/research/provenance-phase-19g/{protocol.json, report.json, evidence.zip, ROOT.sha256, receipt.json, RESULTS.md, README.md}
docs/research/provenance-phase-19g/DEPLOYER_PROFILE.md
docs/research/provenance-phase-19g/EVALUATOR_KIT.md
docs/research/provenance-phase-19g/incident-record.schema.json
```

## The drill (recomputable)

On a fresh `ProvenanceRig` under the fixed clock, in order, with the logical time of each step:

1. **Plant**: the child proposes the ungranted action `b` (the unauthorized attempt).
2. **Detect**: the gate blocks it; a provenance record names the grant input it lacked.
3. **Stop**: the host latches route `b` (provider error) and holds every route.
4. **Revoke**: the credential is revoked at the receiver and the acknowledgement is recorded.
5. **Preserve**: snapshot digests of every host table and the receiver are taken before and after.
6. **In-flight fate**: an attempt admitted just before the stop is driven to `unknown` (the
   outage-after-reserve shape) and reported as unknown, never as prevented.
7. **Detection-to-action**: logical clock between the plant and the latch, and between the latch
   and the acknowledged revocation.

The drill's receipt reports every step's outcome and the two intervals. A drill in which the
plant lands an effect fails the lane.

## The incident record (recomputable)

`incident19.record(snapshots)` emits a JSON record from receiver and host snapshots alone (no
model, no lab telemetry): what was attempted, what was admitted, what landed, what is unknown,
authority state at each step, detection and action times, and a digest of every source table. A
schema file is committed; the verifier rejects a record whose counts disagree with the snapshots.

## The documents (attested)

- `DEPLOYER_PROFILE.md`: for each harm class the three labs measure (approval-gate bypass,
  unsanctioned third-party contact, credential misuse, sandbox reach-out, constraint circumvention,
  unrequested publication), the control a deployer must supply and the Phase 19 lane that shows
  the receiver evidence of it holding.
- `EVALUATOR_KIT.md`: Stage 5I (grant-bounded coverage equality, adequacy gate) and 5J (append-only
  disagreement) mapped to the stated acceptance criteria of the 15 Oct 2026 independent-evaluators
  update, the Accenture embedded-evaluation programme and OpenAI's third-party assessment
  principles; a signed independence-and-funding disclosure field; what METR would run tomorrow and
  the one blocker.

## Gate for 19g

Drill lane: the plant is blocked, the stop latches, the revocation is acknowledged, the in-flight
attempt is `unknown`, both intervals are reported, the incident record verifies against the
snapshots, three mutations rejected. Documents delivered in the tree; delivery to an evaluator
and any reply are owed as attested items.
