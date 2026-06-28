# Stage 4D Decision-Replay Evidence Pack

Stage 4D produces a metadata-only, completeness-checked, decision-replayable Evidence Pack for gateway-mediated high-risk agent actions. It verifies offline and does not claim model safety.

Stage 4D verifies the containment record for a bounded gateway-mediated run. It does not prove model safety, policy correctness, or coverage of unmediated actions.

Completeness is proven with respect to gateway-mediated high-risk actions observed by the mediator. Actions that bypass the gateway are out of scope until non-bypassable enforcement lands in R6 / 4M.

## Reviewer command

```bash
npm ci
scripts/reproduce-stage4d.sh
```

Expected:

```text
Stage 4D Decision-Replay Evidence Pack: PASS
pack_signature: PASS
tamper: PASS
observation_binding: PASS
completeness: PASS
decision_replay: PASS
privacy: PASS
offline_verify: PASS
golden_determinism: PASS
```

## Test Fixture Key

The deterministic private key under `tools/simurgh-attestation/stage4d/fixtures/keys` is a test fixture key only. It exists so a clean clone can reproduce the committed Stage 4D golden bytes. It is not a production signing key, and it is not copied into this evidence folder.

## Non-claims

The pack does not prove model safety, jailbreak immunity, policy correctness, coverage of unmediated actions, kernel-level enforcement, live model identity, production certification, or ground truth outside the mediated surface.
