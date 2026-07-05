# Stage 4Q — VFR Validation Matrix

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Every row is a committed, harness-computed fixture whose decision is recomputed
offline. Frozen check order (receipt path): `80 → 83 → 81 → 82 → 89 → 86 → 84 →
85 → 87 → 88`. The exemption path (Freeze 5) is evaluated right after the
structural tier.

## Lane A — normative corpus (15 cases)

`tests/fixtures/llmShield/stage4q/lane-a/expected-decisions.json`, replayed by
`tests/unit/llmShield/stage4q/fixtures.test.js` and the K7 net.

| case_id                              | mutation                                | raw | reason                                     |
| ------------------------------------ | --------------------------------------- | --- | ------------------------------------------ |
| green_pincer_complete                | none                                    | 0   | accepted                                   |
| green_refusal_bearing                | chain carries a ledgered raw-83 refusal | 0   | accepted                                   |
| green_exempt                         | exemption + policy admits the boundary  | 0   | accepted_exempt                            |
| code_80_envelope_malformed           | envelope has an extra key               | 80  | schema_invalid                             |
| code_81_signature_invalid            | corrupted receipt signature             | 81  | approval_signature_invalid                 |
| code_82_window_straddle_exceeded     | crossing epoch 12, receipt_epoch 10     | 82  | window_straddle_exceeded                   |
| code_83_receipt_missing              | receipt absent (kind=receipt)           | 83  | absent                                     |
| code_84_binding_digest_mismatch      | crossing embeds wrong binding digest    | 84  | approval_binding_digest_mismatch           |
| code_85_approval_not_before_crossing | approval after crossing in chain        | 85  | approval_not_before_crossing               |
| code_86_approver_key_not_distinct    | receipt signed by harness key           | 86  | approver_key_equals_harness_key            |
| code_87_boundary_kind_not_covered    | boundary ∉ requiring list               | 87  | boundary_kind_not_covered                  |
| code_88_display_mismatch             | executed ≠ displayed                    | 88  | display_digest_mismatch                    |
| code_89_census_mismatch              | chain has 2 crossings, census commits 1 | 89  | census_mismatch                            |
| exemption_refused                    | exemption, default empty allowlist      | 87  | approval_exemption_not_permitted_by_policy |
| exemption_conflict                   | both receipt AND exemption supplied     | 84  | binding_kind_conflict                      |

## Lane B — live approval-gated capture (10 arms)

`tests/fixtures/llmShield/stage4q/lane-b/expected-arms.json`, captured via the
SEPARATE approver process, replayed offline by
`tests/unit/llmShield/stage4q/laneb.test.js`.

| arm_id                     | mechanism                                  | raw | reason                            |
| -------------------------- | ------------------------------------------ | --- | --------------------------------- |
| approved_and_ordered       | approver key, ordered chain                | 0   | accepted                          |
| human_at_terminal          | distinct human key + ceremony confirm      | 0   | accepted                          |
| refusal_bearing_run        | ledgered refusal in-chain                  | 0   | accepted                          |
| no_receipt                 | kind=receipt, no receipt                   | 83  | absent                            |
| wrong_embedded_digest      | crossing binds wrong digest                | 84  | approval_binding_digest_mismatch  |
| receipt_after_crossing     | approval after crossing                    | 85  | approval_not_before_crossing      |
| harness_signer_as_approver | approval signed by harness key (mandatory) | 86  | approver_key_equals_harness_key   |
| expired_epoch              | crossing epoch 20, window [10,11]          | 82  | run_epoch_outside_validity_window |
| display_executed_mismatch  | executed ≠ displayed                       | 88  | display_digest_mismatch           |
| census_mismatch            | chain has 2 crossings, census commits 1    | 89  | census_mismatch                   |

The approver process itself refuses a display bait-and-switch (exit 1) BEFORE
signing — a first line of defence; the verifier's raw-88 is the second.

## Cross-language + integrity

- JS↔Python parity: `tools/agentdojo-simurgh-adapter/tests/test_stage4q_parity.py`
  replays the same corpus through pure-Python `friction_surface` and asserts
  identical `{raw, reason}` per case (real Ed25519 via `cryptography`).
- Attestation tamper: `tests/unit/llmShield/stage4q/attestation.test.js` — a
  flipped census digit fails Tier 2; a paraphrased non-claim fails Tier 1.
- Lean: `proofs/stage4q/FrictionPrecedence.lean` machine-checks
  `frictionPrecedence`, `failClosed`, `sameKeyFails`, `frictionCoverage`,
  `noSilentExemption`.
