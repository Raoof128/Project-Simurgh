# Stage 3W — Witnessed VCA Release Provenance — Design Spec

> Status: APPROVED (2026-06-23). Next step: writing-plans.
> Builds on shipped Stage 3V-B (v2.6.0, merge commit `b645d80`). Tooling-only.

## Crown sentence

**Stage 3W does not claim the live model execution is independently reproducible. It demonstrates
that a sealed VCA release can be independently witnessed, hash-bound, replay-verified, and signed
as a provenance object — by two roots that never depend on each other.**

## Locked doctrine

- 3W does **not** reduce `live_capture_origin_self_reported` (the 3V-B caveat stays signed and
  unchanged).
- 3W does **not** prove the original GPU capture and does **not** re-execute Llama Guard 4.
- 3W does **not** make Sigstore part of offline verification.
- 3W **does** prove that sealed 3V-B release evidence can be independently witnessed by (1) a local,
  offline-verifiable Simurgh Ed25519 root, and (2) a GitHub OIDC/Sigstore-rooted CI witness that
  **actually re-runs the verifier gates before attesting**.

## Locked decisions

| Item | Choice |
|---|---|
| Stage name | Stage 3W — Witnessed VCA Release Provenance |
| Tag | `v2.7.0-stage-3w-witnessed-vca-release-provenance` |
| Witness claim | verify-and-attest verdict (one CI witness artifact) |
| Layer coupling | independent corroboration (digest equality, no signature nesting) |
| Offline root | Simurgh Ed25519, primary, network-free, replay-verifiable |
| Online root | GitHub OIDC/Sigstore, additive only |
| Workflow | new `.github/workflows/stage-3w-witness.yml` |
| Action | `actions/attest-build-provenance@v3` (release-hardening option: pin to full commit SHA before final tag) |
| CI invariant | observed verdicts MUST be computed from actual command results, never echoed |
| Sacred non-claim | no reduction of `live_capture_origin_self_reported` |

## 1. Architecture — two independent roots, one set of bytes

- **Offline root (developer):** an in-toto-shaped `simurgh.vca.release_witness` bundle signed with a
  new 3W Ed25519 key, fully offline-verifiable with a committed public key, no network.
- **Online root (CI):** a deterministic `github-witness-verdict.json` that a clean GitHub runner
  regenerates, **verifies for real**, asserts byte-identical to the committed file, and signs via
  `actions/attest-build-provenance` (OIDC / Sigstore / Rekor).
- The two roots **corroborate by digest equality**, never by signature nesting. Offline verification
  never touches the network and never requires `gh attestation verify`.

## 2. Subjects (what both roots bind)

The sealed 3V-B digests: `attestation.bundle.json`, `attestation.signature.json`,
`capture-replay/lg4-frozen-capture.json`, `evidence-hashes.json`; plus the 3V-B tag
(`v2.6.0-stage-3v-b-...`), merge commit `b645d80`, and release URL.

The offline bundle additionally binds the **deterministic witness-verdict file as a subject** —
i.e. the bytes of `github-witness-verdict.json`. It does **NOT** bind the online Sigstore
attestation over that file (that would be circular). Both roots thus also converge on the
witness-verdict file by digest, without either signing the other.

## 3. Offline bundle shape (in-toto Statement v1)

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "predicateType": "https://project-simurgh.dev/predicates/vca-release-witness/v1",
  "subject": [
    { "name": "stage-3v-b/attestation.bundle.json", "digest": { "sha256": "..." } },
    { "name": "stage-3v-b/attestation.signature.json", "digest": { "sha256": "..." } },
    { "name": "stage-3v-b/capture-replay/lg4-frozen-capture.json", "digest": { "sha256": "..." } },
    { "name": "stage-3v-b/evidence-hashes.json", "digest": { "sha256": "..." } },
    { "name": "stage-3w/github-witness-verdict.json", "digest": { "sha256": "..." } }
  ],
  "predicate": {
    "stage": "3W",
    "witnessed_stage": "3V-B",
    "release_commit": "b645d80",
    "tag": "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
    "release_url": "https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
    "offline_reproduce_passed": true,
    "live_release_gate_passed": true,
    "model_reexecuted_in_ci": false,
    "online_witness": {
      "provider": "github_artifact_attestations",
      "workflow": ".github/workflows/stage-3w-witness.yml",
      "subject": "docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json",
      "required_for_offline_verification": false
    },
    "non_claims": [
      "does_not_reduce_live_capture_origin_self_reported",
      "does_not_prove_live_capture_origin",
      "does_not_reexecute_llama_guard_4",
      "sigstore_not_required_for_offline_verification",
      "does_not_rank_external_defences"
    ]
  }
}
```

The bundle is signed with the 3W Ed25519 key into `attestation.signature.json`
(schema `simurgh.vca.release_witness.signature.v1`) over `canonicalJson(bundle)` — canonical, not
bytes, so prettier/merge cannot break it (same discipline as 3M–3V-B).

## 4. CI witness verdict (Amendment 1 — observed, not echoed)

Committed `docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json`:

```json
{
  "schema": "simurgh.stage3w.github_witness_verdict.v1",
  "witness_claim": "verify_and_attest_verdict",
  "verification_mode": "ci_observed_not_echoed",
  "witness_root": "github_oidc_sigstore",
  "repo": "Raoof128/Project-Simurgh",
  "commit": "b645d80",
  "tag": "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
  "verified_stage": "3V-B",
  "expected": {
    "stage3vb_verifier": "PASS",
    "stage3vb_reproduce": "PASS",
    "stage3vb_live_release_gate": "PASS",
    "stage3vb_evidence_hashes_match": true,
    "model_reexecuted_in_ci": false
  },
  "ci_observed": {
    "stage3vb_verifier": "PASS",
    "stage3vb_reproduce": "PASS",
    "stage3vb_live_release_gate": "PASS",
    "stage3vb_evidence_hashes_match": true,
    "model_reexecuted_in_ci": false
  },
  "expected_equals_observed": true,
  "subjects": {
    "stage3vb_attestation_bundle_sha256": "sha256:...",
    "stage3vb_signature_sha256": "sha256:...",
    "stage3vb_capture_replay_sha256": "sha256:...",
    "stage3vb_evidence_hashes_sha256": "sha256:..."
  },
  "non_claims": [
    "does_not_prove_live_capture_origin",
    "does_not_reexecute_llama_guard_4",
    "does_not_reduce_live_capture_origin_self_reported",
    "does_not_rank_external_defences"
  ]
}
```

The `subjects` digests + `expected` block are deterministic and authored at commit time. CI
**recomputes** `ci_observed` from actual command exit results and the recomputed digests, then
asserts the regenerated file is **byte-identical** to the committed one (so a divergent reality
fails the workflow). This is the hard invariant: observed verdicts are computed from real command
results, never echoed.

## 5. CI witness workflow (Amendment 3 — additive, online)

`.github/workflows/stage-3w-witness.yml`:

```yaml
permissions:
  id-token: write
  attestations: write
  contents: read
# steps:
#  1. checkout
#  2. run 3V-B offline gates: verifier, reproduce, live-release gate, evidence-hash check
#  3. regenerate github-witness-verdict.json from real results; assert byte-identical to committed
#  4. actions/attest-build-provenance@v3 over the committed github-witness-verdict.json
# Release-hardening option (write it down): pin actions/attest-build-provenance to a full commit SHA.
```

This workflow is **separate** from `stage-1-checks.yml`. The offline quality gate never depends on
Sigstore, OIDC, or network attestation. `gh attestation verify` belongs in reviewer docs, not the
core verifier.

## 6. Components / files

**Reuse, do not modify:** `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`,
`sha256Hex` already prefixes `sha256:`, `fingerprintPublicKey`), `tools/simurgh-attestation/keygen.mjs`.

**New pure libs (100% function-coverage gated):**
- `tools/simurgh-attestation/stage3wWitnessLib.mjs` — `computeStage3vbSubjects()` (read committed
  3V-B files, return name→sha256), `buildWitnessVerdict(observed)` (deterministic verdict JSON),
  `buildReleaseWitnessStatement(subjects, witnessVerdictDigest)` (in-toto statement).

**New runner / attestation (subprocess-covered, excluded from function-coverage gate):**
- `tools/simurgh-attestation/build-3w-witness.mjs` — CLI: build [--update] | hash | verify |
  write-hashes | verify-hashes (mirrors 3V-B runner; reads committed 3V-B evidence + witness-verdict).
- `tools/simurgh-attestation/sign-3w-witness.mjs` — local signer (`SIMURGH_3W_PRIVATE_KEY_PATH`,
  default `~/.simurgh/3w-ed25519.pem`).
- `tools/simurgh-attestation/verify-stage3w-witness.mjs` — two-tier verifier (portable +
  `--reproduce`), fails closed (`ok:false`, never throws).
- `tests/e2e/llm_shield_stage3w_tamper_runner.mjs` — negative self-proof.
- `tests/unit/llmShield/stage3w/*.test.js`.

**New scripts (offline gates wired into `check.sh` after the 3V-B section):**
- `scripts/{smoke,security-audit,privacy-audit,consistency-audit,policy-drift-guard,reproduce}-llm-shield-stage3w.*`.
- Smoke reserved port `33210` via `boot_server` (consistent with 3V-A/3V-B pattern).

**New CI:** `.github/workflows/stage-3w-witness.yml` (online; NOT in check.sh).

**Evidence:** `docs/research/llm-shield/evidence/stage-3w/` — `attestation.bundle.json`,
`attestation.signature.json`, `github-witness-verdict.json`, `provenance.json`,
`evidence-hashes.json`, `self-proof-results.json`, `keys/stage3w-public-key.json` +
`keys/fingerprint.txt`, `README.md`.

**Docs:** `docs/research/llm-shield/LLM_SHIELD_STAGE_3W_WRITEUP.md` +
`STAGE_3W_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

## 7. Verifier + tamper suite

Two-tier offline verifier: portable (signature over `canonicalJson(bundle)`, fingerprint, type,
witnessed_stage 3V-B, model_reexecuted_in_ci false) + `--reproduce` (re-derive bundle byte-stable;
recompute all 3V-B subject digests from committed files and the witness-verdict digest; explicit
`subjects_recomputed` / `witness_verdict_recomputed` booleans). Fails closed.

Tamper suite (≥9), all rejected, counters zero: edit a 3V-B subject digest; edit `release_commit`;
edit `tag`; edit `github-witness-verdict.json` (so its digest no longer matches the bound subject);
flip a `ci_observed` boolean; tamper the offline signature; wrong public key; remove a file;
inject a forbidden raw field.

## 8. Invariants (carried)

- Tooling-only: **zero `src/llmShield/**` change**; policy-drift fail-closed three-dot
  (`origin/main...HEAD`, real-base fallback).
- Offline core verifies with the committed public key and **no network**; Sigstore is
  additive-online-only and never a dependency of offline verification.
- `sha256Hex` already prefixes `sha256:` — never double-prefix. Run `npm run format:check` and
  prettier on ALL new files, then `write-hashes` AFTER prettier (evidence README + JSON are hashed).
- Deep-freeze enums/configs. Verifier never throws. Security-audit accusatory/named-lab scan scoped
  to machine `.json`. No raw prompts / no LG4 output beyond the approved 3V-B replay artifact.
- 100% function coverage on the pure lib(s) + branch tests on throw paths; CLIs subprocess-covered
  and excluded from the function-coverage gate (3T/3U/3V-A/3V-B precedent).
- Own 3W Ed25519 key (`~/.simurgh/3w-ed25519.pem`, mode 0600, never committed; only the public key
  is committed). Neutral commit messages, no Co-Authored-By trailer.
- Tag `v2.7.0-stage-3w-witnessed-vca-release-provenance`.

## 9. What 3W does NOT do

No new model runs; no comparison against other guards; no claim that RunPod really ran LG4; no
reduction of `live_capture_origin_self_reported`; Sigstore never gates offline verification.
