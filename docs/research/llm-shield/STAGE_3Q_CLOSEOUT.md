# Stage 3Q — Closeout

**Stage:** 3Q — Attestation Registry + Regression Diff
**Status:** Complete; all hard gates green.
**Discipline:** Tooling-only, zero `src/llmShield` change, CI verify-only, dedicated
Stage 3Q Ed25519 key, manifest-derived determinism, anti-laundering lattice,
fail-closed policy-drift guard.

## What 3Q adds to the ladder

3M proved evidence verifies offline; 3N proved claims cannot outrun evidence; 3O
proved others can produce evidence under the contract; 3P bound many differently-built
targets at one point in time. **3Q proves those attestations can age into a
tamper-evident timeline and be compared only against the same target's past —
producing signed regression evidence without cross-target ranking.**

## Deliverables

- **Temporal lib** (`temporalLib.mjs`): strict UTC validation, the anti-laundering
  transition lattice, manifest validation, lineage/corpus gates, regression-diff
  builder (cross-target checked before lineage binding).
- **Registry chain** (`registryChain.mjs`): deterministic build from manifest,
  hash-chain verify, append-continuity verify (preserved-prefix + tail-only).
- **Self-proof dispatch** (`selfProof.mjs`) + 12-fixture pack.
- **CLI** (`registry.mjs`): manifest-check / build / hash / verify-hashes;
  manifest-derived, canonical source digests, no clocks, no null hash tombstones.
- **Signer + three CI verify-only verifiers** (`registry` with 3P-reference checks,
  `append`, `diff` with lattice sanity); dedicated 3Q key.
- **Signed registry evidence** under `docs/research/llm-shield/evidence/stage-3q/`
  (genesis snapshot of the 3P v1.9.0 release; empty diff layer; genesis previous head).
- **Six verification scripts + two smokes**, wired into `check.sh` (`3A–3Q`).
- **Doc quartet** (this closeout + threat model + validation matrix + reviewer
  checklist) and the stage doc.

## Results

- Registry derives deterministically from the timeline manifest; byte-compares clean.
- Registry, append, and diff verifiers all PASS; referenced 3P digests still match.
- Self-proof: clean baseline passes; all 12 fixtures fire their detector;
  `integrity_laundering_successes: 0`.
- Pure libs (`temporalLib`, `registryChain`, `selfProof`) at 100% function coverage;
  CLI/signer/verifier I/O paths smoke-covered (honest E2E).
- Zero `src/llmShield` drift; no private key committed.
- Public key fingerprint: `sha256:97f7eb29d734c59ca4ab2073ba0399e528b9ff72a546a28d04399f53c4e75252`.

## Next

- **Stage 3R** (deferred): live multi-release campaign populating a real long-horizon
  registry across genuine version transitions; public timeline publication; automated
  previous-head continuity across releases.
