# Stage 4R — PCCC Validation Matrix

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Every raw code and subreason has at least one committed arm in the Lane A corpus
(`evidence/stage-4r/lane-a/corpus.json`), self-checked at build time and
re-verified by the offline audit tier and the K7 net.

| Raw | Subreason                              | Lane A case     | Expected          |
| --: | -------------------------------------- | --------------- | ----------------- |
|   0 | —                                      | green_match     | GREEN (match)     |
|   0 | —                                      | green_non_match | GREEN (non-match) |
|  90 | pccc_phase_order_invalid               | phase_order     | 90                |
|  90 | pccc_token_commitment_missing          | commit_missing  | 90                |
|  90 | pccc_token_commitment_opening_invalid  | token_copy_liar | 90                |
|  90 | slot_cardinality_mismatch              | cardinality     | 90                |
|  90 | window_match_census_mismatch           | census          | 90                |
|  91 | operator_identity_signature_invalid    | bad_sig         | 91                |
|  92 | match_claim_conflict                   | claim_liar      | 92                |
|  93 | dleq_mask_proof_invalid                | dleq_mask       | 93                |
|  93 | dleq_z_proof_invalid                   | dleq_z          | 93                |
|  93 | token_recompute_mismatch               | token_recompute | 93                |
|  94 | small_order_or_all_zero_fail_closed    | small_order     | 94                |
|  95 | cross_epoch_replay_detected            | replay          | 95                |
|  96 | mask_reuse_detected                    | mask_reuse      | 96                |
|  96 | ephemeral_public_digest_reuse_detected | eph_reuse       | 96                |
|  97 | disclosure_budget_exceeded             | budget          | 97                |
|  98 | vfr_export_gate_failed                 | vfr             | 98                |
|  99 | public_herd_token_violation            | herd            | 99                |

Lane B (`evidence/stage-4r/lane-b/ceremony-capture.json`) adds three real
two-process arms: honest match (exported), honest non-match (exported), and the
mandatory raw-98 export refusal (nothing published).

Coverage is machine-checked: `tests/unit/llmShield/stage4r/fixturesCorpus.test.js`
asserts the required set is present and every case evaluates to its committed
verdict; the K7 net re-runs the whole composed pipeline.
