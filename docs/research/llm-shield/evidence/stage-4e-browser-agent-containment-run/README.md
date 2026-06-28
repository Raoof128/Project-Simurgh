# Stage 4E: Browser-Agent Containment Run

Stage 4E is the reviewer-facing demonstration built on the Stage 4D decision-replay evidence spine. It shows one bounded browser-agent prompt-injection scene: a benign task remains useful, an injected untrusted page attempts an unauthorised authority sink, the mediated gateway blocks it, and the resulting evidence pack verifies offline.

## Reproduce

Run from the repository root:

```bash
scripts/reproduce-stage4e.sh
```

The harness runs offline recorded-fixture mode, regenerates the Stage 4E artifacts, checks the committed golden files byte-for-byte, and confirms:

- Arm A honest attack run verifies green.
- Arm B1 lying decision record verifies red with `replayed_decision_mismatch`.
- Arm C observed-but-unreceipted action verifies red with `missing_receipt_for_observed_action`.
- Arm D byte tamper verifies red with `receipt_signature_invalid`.

Exit codes follow the contract: `0` all gates pass, `1` containment or verifier gate failure, `2` environment/setup error, `3` golden mismatch.

## Proof Sketches

Replay-soundness: each receipt commits to policy hashes, sink registry hashes, lattice hashes, resolved-argument digests, policy-feature digests, taint digests, context digests, and the recorded decision. The verifier re-derives these values from committed pack material and replays deterministic `decide()`. If a receipt records a decision that differs from the replayed decision over its committed inputs, verification fails at the decision-replay layer.

Emission-completeness detection: the observation log and completeness manifest bind the ordered observed actions to the ordered receipt set. If a mediated action remains in the observation log but the corresponding receipt is omitted, `observed_action_count != receipt_count` and offline verification fails.

Threat model: the agent, webpage, and gateway record producer are untrusted. The signer process and offline verifier are the trust anchors. Stage 4E proves honesty of the committed mediated record, not truth of unobserved execution.

## Non-Claims

Stage 4E does not prove model safety, policy correctness, jailbreak immunity, production certification, execution truth for a lying executor, or coverage of fully unmediated actions that produce neither an observation event nor a receipt. It is one reproducible scenario, not a statistical benchmark.
