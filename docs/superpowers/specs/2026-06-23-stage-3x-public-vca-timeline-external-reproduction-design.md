# Stage 3X — Public VCA Timeline & External Reproduction Packet — Design Spec

> Status: APPROVED (2026-06-23). Next step: writing-plans.
> Builds on shipped Stage 3W (v2.7.0, merge commit `db66bee`). Tooling-only, offline-primary.

## Crown sentence

**Stage 3X does not claim new containment capability or uniform full reproduction across all
historical rungs. It demonstrates that the public VCA release chain is tag-and-commit pinned,
tier-classified by actual replay surface, partially evidence-hash re-verifiable offline, and
externally reproducible through a single reviewer command.**

## Signed headline (README/writeup)

3X turns the VCA chain into a public replay map: all 12 rungs are tag-and-commit pinned, 10/12 are
evidence-hash re-verifiable offline, 3/12 have full reproduce paths, and 2/12 are index-only with
signed reasons.

## Doctrine / non-claims

- 3X is **packaging-as-evidence**, not marketing. No new model run, no new guard comparison, no new
  provider, no "we prove the GPU capture", no production-readiness claim.
- 3X does **not** reduce `live_capture_origin_self_reported`.
- 3X does **not** claim uniform 12/12 full reproduction.
- Offline verification is primary and network-free.
- Neutral outward text: **no "Claude Code" tag** in any PR body or release note.

## Locked decisions

| Item                     | Choice                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Stage name               | Stage 3X — Public VCA Timeline & External Reproduction Packet                          |
| Tag                      | `v2.8.0-stage-3x-public-vca-timeline-external-reproduction`                            |
| Model                    | mixed-tier timeline + generic evidence-hashes verifier                                 |
| Signed root              | own 3X Ed25519 key                                                                     |
| Primary reviewer command | `scripts/reproduce-vca-chain.sh`                                                       |
| Per-push gate            | generic EH verification (10 dirs) + timeline verifier + tamper + policy-drift + audits |
| Reviewer replay          | full tier-appropriate delegated replay (incl. the 3 reproduce scripts)                 |
| Sacred non-claim         | no uniform 12/12 full reproduction                                                     |

## 1. Replay tiers

- **`reproduce`** (`3V`, `3V-B`, `3W`): a full stage-specific reproduce/verifier script exists and is
  run by `scripts/reproduce-vca-chain.sh`.
- **`evidence_hashes`** (`3N`, `3O`, `3P`, `3Q`, `3S`, `3T`, `3U` + the three above): the stage's
  `evidence-hashes.json` exists and is re-walked by the generic verifier to confirm every listed
  digest still matches committed bytes.
- **`index_only`** (`3M`, `3R`): no generic evidence-hash replay surface; bound by tag, merge commit,
  headline, and available public-key/signature metadata.
  - `3M`: `index_only_reason: "index_only_for_3x_chain_hashing"` — predates the project-wide
    `evidence-hashes.json` pattern (it keeps its own historical verifier; the limitation is 3X-chain
    integration, not stage weakness).
  - `3R`: `index_only_reason: "index_only_source_feature_stage_no_evidence_directory"` — a source
    feature stage under `src/llmShield/gateway`, not an evidence-directory stage.

## 2. Generic evidence-hashes verifier (pure lib)

`tools/simurgh-attestation/verifyEvidenceHashesLib.mjs` — `verifyEvidenceHashes(stageDir)` →
`{ ok, checked, mismatches }`, never throws, no network. Rules:

1. Load `<stageDir>/evidence-hashes.json`.
2. Reject if the map includes `evidence-hashes.json` itself (self-inclusion → `ok:false`).
3. Reject absolute paths or `..` path traversal in any key (→ `ok:false`).
4. Recompute `sha256Hex` for every listed file.
5. Require exact digest equality.
6. Emit `ok:true`/`ok:false`; never throw.

## 3. Signed timeline index (own 3X key)

`tools/simurgh-attestation/stage3xTimelineLib.mjs` produces the in-toto-adjacent index object
`simurgh.vca.public_timeline.v1`. Per-rung entry:

```json
{
  "stage": "3U",
  "tag": "v2.4.0-stage-3u-red-team-hardened-extraction-attestation",
  "merge_commit": "<git rev-parse tag^{commit}>",
  "headline": "Red-team-hardened extraction attestation",
  "replay_tier": "evidence_hashes",
  "evidence_dir": "docs/research/llm-shield/evidence/stage-3u",
  "evidence_root_digest": "sha256:<sha256 of that stage's evidence-hashes.json>",
  "public_key_fingerprint": "sha256:...",
  "full_reproduce_available": false,
  "evidence_hashes_available": true,
  "index_only_reason": null,
  "replay_surface_reason": "Stage 3U exposes a committed evidence-hashes.json; 3X re-verifies every listed digest offline.",
  "non_claims": ["does_not_reduce_live_capture_origin_self_reported", "..."]
}
```

`index_only` rungs (Amendment 1 — human-readable reason):

```json
{
  "stage": "3M",
  "replay_tier": "index_only",
  "full_reproduce_available": true,
  "evidence_hashes_available": false,
  "index_only_reason": "index_only_for_3x_chain_hashing",
  "replay_surface_reason": "Stage 3M predates the project-wide evidence-hashes.json pattern; 3X binds its tag, merge commit, headline, public key fingerprint, and available attestation metadata, but does not claim generic evidence-hash replay for this rung."
}
```

```json
{
  "stage": "3R",
  "replay_tier": "index_only",
  "full_reproduce_available": false,
  "evidence_hashes_available": false,
  "index_only_reason": "index_only_source_feature_stage_no_evidence_directory",
  "replay_surface_reason": "Stage 3R was a source feature stage under src/llmShield/gateway rather than an evidence-directory stage; 3X binds its tag, merge commit, and headline but does not claim evidence-directory replay."
}
```

Top-level index blocks (Amendment 2 — machine-readable summaries):

```json
{
  "schema": "simurgh.vca.public_timeline.v1",
  "stage": "3X",
  "chain_summary": {
    "rungs_total": 12,
    "tag_commit_pinned": 12,
    "evidence_hashes_reverified": 10,
    "full_reproduce_available": 3,
    "index_only": 2
  },
  "claim_summary": {
    "claims_uniform_full_reproduction": false,
    "claims_new_containment_capability": false,
    "claims_live_model_reexecution": false,
    "claims_external_origin_truth": false
  },
  "rungs": [
    /* per-rung entries above, ordered 3M..3W */
  ],
  "non_claims": [
    "does_not_reexecute_live_models",
    "does_not_prove_original_gpu_capture",
    "does_not_reduce_live_capture_origin_self_reported",
    "does_not_claim_production_readiness",
    "does_not_claim_general_jailbreak_resistance",
    "does_not_claim_uniform_12_12_full_reproduction"
  ]
}
```

Signed into `timeline.signature.json` (schema `simurgh.vca.public_timeline.signature.v1`) over
`canonicalJson(index)` with the 3X Ed25519 key.

## 4. Reviewer command + results artifact

`scripts/reproduce-vca-chain.sh`:

1. Verify the 3X signed timeline index (signature + fingerprint).
2. For each rung: re-resolve tag→merge_commit (git, offline), recompute evidence_root_digest, compare
   to the signed index.
3. Run the tier-appropriate replay: `reproduce` → run that stage's reproduce script; `evidence_hashes`
   → `verifyEvidenceHashes(dir)`; `index_only` → tag/commit pin only.
4. Collect per-rung PASS/FAIL.
5. Emit `docs/research/llm-shield/evidence/stage-3x/vca-chain-reproduction-results.json`:

```json
{
  "schema": "simurgh.vca.chain_reproduction_results.v1",
  "timeline_verified": true,
  "rungs_total": 12,
  "rungs_passed": 12,
  "rungs_failed": 0,
  "offline_only": true,
  "network_required": false,
  "results": [
    {
      "stage": "3M",
      "replay_tier": "index_only",
      "tag_commit_pinned": true,
      "evidence_root_digest_matched": null,
      "reproduce_passed": null
    },
    {
      "stage": "3U",
      "replay_tier": "evidence_hashes",
      "tag_commit_pinned": true,
      "evidence_root_digest_matched": true,
      "reproduce_passed": null
    },
    {
      "stage": "3W",
      "replay_tier": "reproduce",
      "tag_commit_pinned": true,
      "evidence_root_digest_matched": true,
      "reproduce_passed": true
    }
  ],
  "non_claims": [
    "does_not_reexecute_live_models",
    "does_not_prove_original_gpu_capture",
    "does_not_reduce_live_capture_origin_self_reported",
    "does_not_claim_production_readiness",
    "does_not_claim_general_jailbreak_resistance"
  ]
}
```

(`null` = not applicable for that tier; honest, not a failure.)

## 5. Components / files

**Pure libs (100% function-coverage gated):**

- `tools/simurgh-attestation/verifyEvidenceHashesLib.mjs`.
- `tools/simurgh-attestation/stage3xTimelineLib.mjs` (`VCA_RUNGS` frozen table, `buildTimelineIndex()`,
  `buildChainSummary()`).

**Runner / attestation (subprocess-covered, excluded from function-coverage gate):**

- `tools/simurgh-attestation/build-3x-timeline.mjs` — CLI build/hash/verify/write-hashes/verify-hashes.
- `tools/simurgh-attestation/sign-3x-timeline.mjs` — local signer (`SIMURGH_3X_PRIVATE_KEY_PATH`,
  default `~/.simurgh/3x-ed25519.pem`).
- `tools/simurgh-attestation/verify-stage3x-timeline.mjs` — two-tier verifier (portable + `--reproduce`
  recomputes evidence_root_digests + merge_commits + chain_summary), fails closed.
- `tests/e2e/llm_shield_stage3x_tamper_runner.mjs` — ≥9 cases.
- `tests/unit/llmShield/stage3x/*.test.js`.

**Reviewer command:** `scripts/reproduce-vca-chain.sh` (full delegated replay; emits results artifact).

**Offline gate scripts (wired into `check.sh` after 3W):**
`scripts/{smoke,security-audit,privacy-audit,consistency-audit,policy-drift-guard,reproduce}-llm-shield-stage3x.*`.
Smoke reserved port `33220` via `boot_server`. The 3X gate runs: timeline verify, generic-EH across the
10 EH dirs, 3X tamper, audits, policy-drift, coverage. The full 3-script delegated replay is the
reviewer command, NOT the per-push gate.

**Evidence:** `docs/research/llm-shield/evidence/stage-3x/` — `timeline.index.json`,
`timeline.signature.json`, `vca-chain-reproduction-results.json`, `evidence-hashes.json`,
`self-proof-results.json`, `keys/stage3x-public-key.json` + `keys/fingerprint.txt`, `README.md`.

**Docs:** `docs/research/llm-shield/LLM_SHIELD_STAGE_3X_WRITEUP.md` +
`STAGE_3X_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`, with a top-level reviewer
packet section (the single-command path for an external reviewer with no private context).

## 6. Tamper suite (≥9, all rejected, counters zero)

Edit a rung `evidence_root_digest`; edit a `tag`; edit a `merge_commit`; edit a
`public_key_fingerprint`; flip a `replay_tier`; tamper the timeline signature; wrong public key; remove
a file; plus generic-EH self-proofs: an `evidence-hashes.json` that lists itself → `ok:false`, and a
path-traversal key (`../x`) → `ok:false`.

## 7. Invariants (carried)

- Tooling-only: **zero `src/llmShield/**` change\*\*; policy-drift fail-closed three-dot.
- Offline-primary; no network anywhere in the gate or the core verifier.
- `sha256Hex` already prefixes `sha256:` — never double-prefix. `npm run format:check` + prettier, then
  `write-hashes` AFTER prettier. `evidence-hashes.json` excludes itself.
- Generic EH verifier rejects self-inclusion + absolute/`..` paths; verifier fails closed, never throws.
- Deep-freeze the rung table/enums. Security-audit accusatory/named-lab scan scoped to machine `.json`.
- 100% function coverage on the two pure libs; CLIs subprocess-covered.
- Own 3X Ed25519 key (`~/.simurgh/3x-ed25519.pem`, 0600, never committed; only public key committed).
- Neutral commit messages, no Co-Authored-By trailer, **no "Claude Code" tag** in PR/release text.
- Tag `v2.8.0-stage-3x-public-vca-timeline-external-reproduction`.

## 8. What 3X does NOT do

No new model run; no guard comparison; no new provider; no GPU-capture proof; no production-readiness
claim; no reduction of `live_capture_origin_self_reported`; no uniform 12/12 reproduction claim; the
heavy delegated replay never enters the ordinary push gate.
