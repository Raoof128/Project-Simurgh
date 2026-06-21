# Stage 3Q — Attestation Registry + Regression Diff — Design

**Status:** Approved design (brainstorm complete). Implementation follows the normal
writing-plans → executing-plans flow.
**Date:** 2026-06-21
**Anchors:** `docs/research/llm-shield/NORTH_STAR_VERIFIABLE_CONTAINMENT_ATTESTATION.md`,
Stage 3M (offline verifier), 3N (claim-checked ledger), 3O (BYO-gateway benchmark),
3P (cross-defence attestation campaign).

## Crown sentence

> **Stage 3Q proves that signed containment attestations can be preserved as an
> append-only timeline and compared only against the same target's past, producing
> signed regression evidence — without cross-target ranking.**

Locked identity: _a deterministic, manifest-derived temporal attestation layer: one
signed hash-chained registry of snapshots plus signed same-target regression diffs,
with self-proof that timeline tampering, cross-target comparison, corpus mismatch,
integrity failure, and clock gremlins are rejected._

## The VCA ladder

| Stage  | What it proves                                                          |
| ------ | ---------------------------------------------------------------------- |
| 3M     | the evidence bundle verifies offline (Ed25519)                        |
| 3N     | the claims made _from_ that evidence cannot outrun it                 |
| 3O     | others can produce evidence under the same contract                   |
| 3P     | the contract binds many, differently-built targets at one point in time |
| **3Q** | **attestations age into a tamper-evident timeline; weakening surfaces as a signed same-target regression** |

3Q is the temporal rung. It is tooling, not a defence, and ships **no
`src/llmShield/**` change** (policy-drift guard enforced).

## The temporal non-ranking wall (verbatim)

> **Temporal diff, not leaderboard. Stage 3Q may compare a target only against its
> own previous signed snapshot. It must not compare different target lineages, rank
> targets by regressions, or export cross-target superiority claims.**

Hard invariant: a regression diff is valid only when
`before.target_lineage_id == after.target_lineage_id`; otherwise
`cross_target_diff_violation` fires. Lineage is a first-class field, never encoded
only in a versioned id:

```json
{
  "target_lineage_id": "keyword-filter-replica",
  "target_version": "v2",
  "target_snapshot_id": "keyword-filter-replica@v2"
}
```

## Inherited discipline

- **Tooling-only. Zero `src/llmShield/**` change.** The policy-drift guard uses the
  CI-safe `main...HEAD` three-dot form with `|| true` (the Stage 3P CI lesson:
  `origin/main` + `HEAD~1` fallback dies on GitHub's shallow checkout).
- **CI is deterministic, offline, and verify-only.** CI never holds a private key.
- **Metadata-only.** No harmful payloads, secrets, or credentials.
- **Dedicated Stage 3Q Ed25519 key.** It signs only 3Q artifacts (registry +
  regression diffs); 3L/3M/3O/3P keys never sign 3Q and the 3Q key never signs
  theirs. Private key lives at `~/.simurgh/3q-ed25519.pem` (override
  `SIMURGH_3Q_PRIVATE_KEY_PATH`); only the public key is committed.
- Reuse the 3M canonicalisation primitives (`canonicalJson`, `sha256Hex`,
  `fingerprintPublicKey`) — not the key identity.

---

## Determinism model — the clock is evidence, not entropy

A committed **`timeline-manifest.json`** is the source of truth. `registry build`
deterministically derives `registry.json` from it; CI re-derives and byte-compares
(exactly like 3P). **All time-bearing fields are committed manifest inputs, never
generated values** — the build tool must reject a missing/invalid timestamp and must
never call `Date.now()`, `new Date()`, or `performance.now()`.

> **3Q timestamps are signed evidence only because they are committed manifest
> inputs, not generated runtime values. Reproducibility comes from deriving the
> registry from the manifest and byte-comparing the committed result.**

### `timeline-manifest.json` (`simurgh.temporal.timeline_manifest.v1`)

```json
{
  "type": "simurgh.temporal.timeline_manifest.v1",
  "stage": "3Q",
  "registry_id": "stage-3q-containment-registry",
  "snapshots": [
    {
      "entry_index": 0,
      "snapshot_id": "stage-3p-release-v1",
      "snapshot_label": "v1.9.0-stage-3p-cross-defence-containment-attestation",
      "created_at_utc": "2026-06-21T00:00:00Z",
      "catalogue_digest": "sha256:...",
      "catalogue_path": "docs/research/llm-shield/evidence/stage-3p/catalogue/attestation-catalogue.json",
      "corpus_digest": "sha256:...",
      "target_attestations": [
        {
          "target_lineage_id": "keyword-filter-replica",
          "target_version": "v1",
          "target_snapshot_id": "keyword-filter-replica@v1",
          "target_attestation_digest": "sha256:...",
          "target_attestation_path": "docs/research/llm-shield/evidence/stage-3p/targets/keyword-filter-replica/containment-attestation.json"
        }
      ]
    }
  ]
}
```

---

## Registry substrate — single signed ledger + internal hash chain

One signed `registry.json`. Each entry is `{ entry_body, entry_digest }` where
`entry_digest = sha256(canonicalJson(entry_body))` and
`entry_body.previous_entry_digest` chains to the prior entry's `entry_digest`
(genesis = `"GENESIS"`). A sibling `registry.signature.json` (Ed25519) signs the
whole canonical ledger.

**Honesty upgrade:** the file proves _internal_ chain integrity; **append-only
continuity** is proven by comparing against a committed `previous-registry-head.json`.

### `registry.json` (`simurgh.temporal.registry.v1`)

```json
{
  "type": "simurgh.temporal.registry.v1",
  "stage": "3Q",
  "registry_id": "stage-3q-containment-registry",
  "append_model": "single_signed_ledger_with_internal_hash_chain",
  "cross_target_ranking_exported": false,
  "entries": [
    {
      "entry_body": {
        "entry_index": 0,
        "entry_kind": "snapshot",
        "previous_entry_digest": "GENESIS",
        "snapshot": {
          "snapshot_id": "stage-3p-release-v1",
          "snapshot_label": "v1.9.0-stage-3p-cross-defence-containment-attestation",
          "created_at_utc": "2026-06-21T00:00:00Z",
          "catalogue_digest": "sha256:...",
          "catalogue_path": "docs/research/llm-shield/evidence/stage-3p/catalogue/attestation-catalogue.json",
          "corpus_digest": "sha256:...",
          "target_attestations": []
        }
      },
      "entry_digest": "sha256:..."
    }
  ],
  "head": {
    "head_entry_index": 0,
    "head_entry_digest": "sha256:...",
    "entry_count": 1
  },
  "non_claims": [
    "Temporal diff, not leaderboard.",
    "This registry does not rank targets.",
    "This registry records signed attestation snapshots over time.",
    "Append-only continuity is verified against the previous signed registry head when available."
  ]
}
```

### `previous-registry-head.json` (`simurgh.temporal.previous_registry_head.v1`)

```json
{
  "type": "simurgh.temporal.previous_registry_head.v1",
  "stage": "3Q",
  "previous_registry_digest": "sha256:...",
  "previous_head_entry_index": 0,
  "previous_head_entry_digest": "sha256:...",
  "previous_entry_count": 1,
  "previous_signature_digest": "sha256:..."
}
```

Genesis form: `previous_head_entry_digest: "GENESIS"`, `previous_entry_count: 0`.

### Verification mode 1 — offline current-ledger

```text
1.  registry signature verifies under the Stage 3Q public key.
2.  entries are ordered by entry_index (contiguous from 0).
3.  first entry_body.previous_entry_digest == "GENESIS".
4.  every entry_digest == sha256(canonicalJson(entry_body)).
5.  every entry_body.previous_entry_digest == the previous entry's entry_digest.
6.  head.head_entry_digest == the last entry_digest.
7.  head.entry_count == entries.length.
8.  referenced 3P catalogue / target attestation digests match committed files if present.
9.  no cross-target ranking fields exported.
10. non-claims present.
```

### Verification mode 2 — append-continuity (vs previous head)

```text
1. old head digest == the FIRST newly appended entry's previous_entry_digest.
2. all previous entries are canonically unchanged.
3. new entries are appended only at the tail (entry_index continues contiguously).
4. no previous entry was removed or reordered.
5. the new signed head verifies.
```

---

## Regression diff — manifest-derived, same-target only

A committed **`diff-manifest.json`** selects the comparison pairs (so neither the
pair nor the diff timestamp is invented). Each `regression-diff.json` is
deterministically derived from `diff-manifest.json` + the referenced committed
attestations, byte-compared in CI, and signed locally with the 3Q key.

### `diff-manifest.json` (`simurgh.temporal.diff_manifest.v1`)

```json
{
  "type": "simurgh.temporal.diff_manifest.v1",
  "stage": "3Q",
  "diffs": [
    {
      "diff_id": "keyword-filter-replica-v1-to-v2",
      "target_lineage_id": "keyword-filter-replica",
      "before_target_snapshot_id": "keyword-filter-replica@v1",
      "after_target_snapshot_id": "keyword-filter-replica@v2",
      "before_attestation_digest": "sha256:...",
      "after_attestation_digest": "sha256:...",
      "corpus_digest": "sha256:...",
      "created_at_utc": "2026-06-21T00:00:00Z"
    }
  ]
}
```

### `regression-diff.json` (`simurgh.temporal.regression_diff.v1`)

```json
{
  "type": "simurgh.temporal.regression_diff.v1",
  "stage": "3Q",
  "diff_id": "keyword-filter-replica-v1-to-v2",
  "target_lineage_id": "keyword-filter-replica",
  "before": { "target_version": "v1", "attestation_digest": "sha256:..." },
  "after": { "target_version": "v2", "attestation_digest": "sha256:..." },
  "comparison_scope": {
    "same_target_lineage_only": true,
    "cross_target_comparison": false,
    "same_corpus_digest_required": true
  },
  "cell_transitions": {
    "direct_input::plain_marker": {
      "before": "contained",
      "after": "allowed",
      "transition": "regressed"
    }
  },
  "summary": {
    "regressed_cells": 1,
    "improved_cells": 0,
    "unchanged_cells": 24,
    "non_comparable_cells": 0,
    "integrity_failure_cells": 0,
    "cross_target_rank_exported": false
  }
}
```

### Transition enum + anti-laundering lattice

Transition ∈ `improved | unchanged | regressed | non_comparable | integrity_failure`.

```text
contained → allowed   (same lineage, same corpus, valid evidence)  → regressed   [only path]
allowed  → contained  (same lineage, same corpus, valid evidence)  → improved    [only path]
same value → same value                                            → unchanged
either side not_applicable                                         → non_comparable
different corpus_digest                                            → non_comparable
either side verification_failed / invalid signature               → integrity_failure
different target_lineage_id                                        → cross_target_diff_violation (rejected)
```

> **Anti-laundering invariant:** integrity failures and corpus mismatches must never
> be classified as containment regressions or improvements, in either direction.
> Only `contained → allowed` can produce `regressed`; only `allowed → contained` can
> produce `improved`.

---

## Self-proof — the teeth (both layers)

Unit tests on every gate **and** an end-to-end self-proof pack
(`self-proof-results.json`, `simurgh.temporal.self_proof_results.v1`) driven by
frozen fixtures. **Self-proof fixtures never pollute the real registry or real
regression diffs.**

| Fixture                    | Input condition                                    | Expected detector / result             |
| -------------------------- | -------------------------------------------------- | -------------------------------------- |
| `clean-baseline`           | valid manifest, registry, same-target diff         | accepted                               |
| `genuine-regression`       | same lineage, same corpus, `contained → allowed`   | `regressed`                            |
| `genuine-improvement`      | same lineage, same corpus, `allowed → contained`   | `improved` (never `regressed`)         |
| `cross-lineage-diff`       | `keyword-filter-replica` vs `tool-gate-replica`    | `cross_target_diff_violation`          |
| `corpus-mismatch`          | same lineage, different `corpus_digest`            | `non_comparable` (never `regressed`)   |
| `before-integrity-failure` | before snapshot invalid signature / verify failure | `integrity_failure` (never `regressed`)|
| `after-integrity-failure`  | after snapshot invalid signature / verify failure  | `integrity_failure` (never `improved`) |
| `tampered-past-entry`      | registry entry body edited after digest            | `registry_chain_violation`             |
| `removed-entry-append`     | new registry omits an old entry vs previous head   | `append_continuity_violation`          |
| `reordered-entry-append`   | new registry reorders old entries vs previous head | `append_continuity_violation`          |
| `missing-created-at`       | manifest row lacks `created_at_utc`                | `manifest_timestamp_violation`         |
| `invalid-created-at`       | timestamp not UTC / no trailing `Z`                | `manifest_timestamp_violation`         |

### `self-proof-results.json` summary

```json
{
  "type": "simurgh.temporal.self_proof_results.v1",
  "stage": "3Q",
  "purpose": "prove_stage_3q_temporal_integrity_detectors_fire",
  "pollutes_real_registry": false,
  "pollutes_real_diffs": false,
  "fixtures": [],
  "summary": {
    "clean_baseline_passed": true,
    "all_expected_detectors_fired": true,
    "integrity_laundering_attempts": 2,
    "integrity_laundering_successes": 0,
    "unexpected_accepts": 0,
    "unexpected_rejections": 0
  }
}
```

`integrity_laundering_successes` MUST be 0.

---

## File layout & tooling

```text
tools/simurgh-temporal/
  temporalLib.mjs        # classifyCellTransition, compareCoverageProfiles,
                         # enforceSameTargetLineage, enforceSameCorpusDigest,
                         # validateTimelineManifest, validateUtcTimestamp,
                         # validateDiffManifest, detectCrossTargetRankingExport,
                         # buildRegressionDiff
  registryChain.mjs      # buildRegistryFromManifest, verifyRegistryHashChain,
                         # verifyAppendContinuity
  selfProof.mjs          # evaluateTemporalSelfProofFixture
  registry.mjs           # CLI: manifest-check / build [--update] / hash / verify-hashes
  sign-3q-registry.mjs   # local signer (SIMURGH_3Q_PRIVATE_KEY_PATH, ~/.simurgh/3q-ed25519.pem)
  verify-stage3q-registry.mjs   # CI verify-only (offline current-ledger)
  verify-stage3q-append.mjs     # CI verify-only (append-continuity vs previous head)
  verify-stage3q-diff.mjs       # CI verify-only (regression-diff signature + lattice)

docs/research/llm-shield/evidence/stage-3q/
  registry/   timeline-manifest.json, registry.json, registry.signature.json,
              previous-registry-head.json, registry-head-digest.txt, verify-registry-output.json
  diffs/      diff-manifest.json, <lineage>/<before>__to__<after>/regression-diff.json (+ .signature.json, verify-diff-output.json)
  keys/       stage3q-public-key.json, stage3q-key-fingerprint.txt
  self-proof/ self-proof-results.json, verify-self-proof-output.json, fixtures/
  evidence-hashes.json

tests/unit/llmShield/temporal/
  temporalLib.test.js, registryChain.test.js, temporalSelfProof.test.js, temporalVerify.test.js

docs/research/llm-shield/
  LLM_SHIELD_STAGE_3Q_ATTESTATION_REGISTRY_REGRESSION_DIFF.md
  STAGE_3Q_CLOSEOUT.md / STAGE_3Q_THREAT_MODEL.md / STAGE_3Q_VALIDATION_MATRIX.md / STAGE_3Q_REVIEWER_CHECKLIST.md
```

### Six 3Q verification scripts (wired into `scripts/check.sh`, section `3A–3Q`)

```text
scripts/smoke-llm-shield-stage3q.sh                 # verify-only orchestrator
scripts/smoke-llm-shield-stage3q-self-proof.sh      # asserts every detector fired + integrity_laundering_successes == 0
scripts/security-audit-llm-shield-stage3q.sh        # overclaim/ranking wording (self-proof dir exempt)
scripts/privacy-audit-llm-shield-stage3q.mjs        # metadata-only, no forbidden tokens
scripts/policy-drift-guard-llm-shield-stage3q.sh    # main...HEAD three-dot, no src/llmShield change
scripts/consistency-audit-llm-shield-stage3q.mjs    # registry derivable from manifest; diffs derivable; 3Q key only
```

## Testing strategy

- 100% function coverage on the pure libs (`temporalLib`, `registryChain`,
  `selfProof`) via `node --test --experimental-test-coverage
  --test-coverage-functions=100` (scoped `--test-coverage-include`).
- CLI / signer / verifier I/O paths are smoke-covered (honest E2E, not padded).
- Determinism: `registry build` + diff derivation re-run and byte-compared against
  committed output.

## Non-claims

- Temporal diff, not a leaderboard; no cross-target ranking or superiority.
- Integrity failures and corpus mismatches are never regressions/improvements
  (anti-laundering, both directions).
- A registry snapshot is self-contained + offline-verifiable; append-only continuity
  is proven against the previous signed head, not asserted.
- Timestamps are signed evidence only because they are committed manifest inputs, not
  runtime values.

## Out of scope (deferred)

- **Stage 3R** (future): live multi-release campaign populating a real long-horizon
  registry; public timeline publication.

## External anchors

- AgentDojo (NeurIPS 2024), arXiv:2406.13352
- AgentDyn, arXiv:2602.03117 — defences insecure or over-defensive in dynamic environments
- Firewalls, arXiv:2510.05244 — public benchmarks saturate; stronger benchmarks needed
- PISmith, arXiv:2603.13026 — defences remain vulnerable to adaptive attacks
- Anthropic browser-use defences — no agent is immune; measure, don't certify
- OWASP AI Agent Security Cheat Sheet; NIST AI RMF (AI 100-1)
