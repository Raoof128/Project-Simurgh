# Phase 19g evidence

Seeded incident drill and deployer incident record. See [RESULTS.md](RESULTS.md),
[DEPLOYER_PROFILE.md](DEPLOYER_PROFILE.md), [EVALUATOR_KIT.md](EVALUATOR_KIT.md) and
[the declaration](../PROVENANCE_PHASE_19.md).

Verify (Python 3.12 with the verify set in `tools/assurance-provenance/requirements-verify.lock`,
as [the handoff](../provenance-phase-19f/HANDOFF.md) describes; the drill runs on the fixture rig):

```sh
python -B tools/assurance-provenance/evidence19g.py verify \
  docs/research/provenance-phase-19g/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19g/ROOT.sha256)"
```

Expected: `"verified": true`, `"plant_verdict": "blocked"`, `"plant_landed": false`,
`"stop_latched": true`, `"revocation_acknowledged": true`, `"in_flight_reported_as": "unknown"`,
`"incident": {"claimed_prevented": 0, ...}`, `"digests_compared": false`.

`incident-record.json` is the deployer incident record the drill generated, in the shape of
`incident-record.schema.json` (the verifier checks the counts, the digest inventory and the
constants; no JSON-Schema validator runs in the repository). Its schema fixes `claimed_prevented`
at zero and `model_telemetry_used` at false, and names its two interval fields as scripted steps.
