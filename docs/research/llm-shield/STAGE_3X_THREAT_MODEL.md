# Stage 3X Threat Model

## What 3X proves

- The signed timeline index re-derives byte-for-byte and its Ed25519 signature verifies against the
  committed public key, with no network.
- Under `--reproduce`: every rung's `merge_commit` re-resolves from its tag, every evidence-root
  digest recomputes, and the `chain_summary` recomputes — all matching the signed index.
- Chain-level: each of the 10 evidence-root rungs' `evidence-hashes.json` still hashes to the signed
  `evidence_root_digest` (manifest unchanged since signing).
- Deep: the 5 current-format manifests re-walk every listed file under hardened containment.
- Stage-native: 3V/3V-B/3W reproduce scripts pass.

## What 3X does NOT prove

- Uniform 12/12 full reproduction (explicitly disclaimed; `claims_uniform_full_reproduction:false`).
- That legacy/cross-stage manifests (3N/3O/3P/3Q/3S) deep-walk — they are root-pinned only.
- Anything about live model origin: `live_capture_origin_self_reported` is unchanged; no GPU-capture
  proof; no model re-execution.

## Adversary attempts and the gate that stops each

| Attempt                                       | Stopped by                                                           |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Edit a rung `evidence_root_digest`            | signature + `--reproduce` recompute (`evidence_root_digest_edited`). |
| Edit a `tag`                                  | signature (`tag_edited`).                                            |
| Edit a `merge_commit`                         | signature + `merge_commits_recomputed` (`merge_commit_edited`).      |
| Edit a `public_key_fingerprint`               | signature (`public_key_fingerprint_edited`).                         |
| Flip a `replay_tier`                          | signature (`replay_tier_flipped`).                                   |
| Tamper the timeline signature                 | signature verify fails (`signature_tampered`).                       |
| Verify with the wrong key                     | fingerprint + signature mismatch (`wrong_public_key`).               |
| Remove the signature sidecar                  | verifier fails closed (`signature_sidecar_missing`).                 |
| EH manifest lists itself                      | generic verifier `self_inclusion` (`eh_self_inclusion`).             |
| EH key with raw `..` (survives normalisation) | raw-segment guard `unsafe_path` (`eh_path_traversal`).               |
| EH key escaping the stage dir                 | inside-dir containment `outside_stage_dir`.                          |
| EH bound file missing                         | `digest_mismatch` (`eh_bound_file_missing`).                         |
| Change `src/llmShield` under a tooling stage  | policy-drift guard (`origin/main...HEAD`).                           |

All exercised in `tests/e2e/llm_shield_stage3x_tamper_runner.mjs`; counters stay zero.
