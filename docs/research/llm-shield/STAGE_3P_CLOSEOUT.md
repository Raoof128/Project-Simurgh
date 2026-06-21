# Stage 3P — Closeout

**Stage:** 3P — Cross-Defence Containment Attestation
**Status:** Complete; all hard gates green.
**Discipline:** Tooling-only, zero `src/llmShield/**` change, CI verify-only,
dedicated Stage 3P Ed25519 key, canary-only corpus.

## What 3P adds to the ladder

3M proved evidence verifies offline; 3N proved claims cannot outrun evidence; 3O
proved others can produce evidence under the contract. **3P proves the contract
binds many, differently-built targets — each independently and campaign-wide
verifiable — without ranking them.**

## Deliverables

- **Discrimination matrix corpus** — `tools/simurgh-benchmark/crossDefenceMatrix.mjs`:
  5 boundaries × 5 evasions × 6 = 150 canaries + 30 controls = 180, frozen and seeded.
- **Contract library** — `crossDefenceLib.mjs`: evidence-based cell scoring,
  provenance/brand gate, negation/schema-aware overclaim gate, coverage-claim
  checking, hard gates.
- **Catalogue library** — `crossDefenceCatalogue.mjs`: canonical digest binding,
  silent-drop gate (with `excluded_targets`), self-proof dispatch.
- **Seven deterministic replica targets** with distinct coverage fingerprints
  (baseline leaks all → full-gateway contains all).
- **CLI** — `simurgh-crossdefence.mjs`: coverage evidence, catalogue body,
  self-proof, hashes (no null tombstones).
- **Signer + two CI verify-only verifiers** — dedicated Stage 3P key,
  `verify-stage3p-target.mjs` / `verify-stage3p-catalogue.mjs`.
- **Signed campaign evidence** under `docs/research/llm-shield/evidence/stage-3p/`.
- **Five audit scripts + two smokes**, wired into `check.sh` (`3A–3P`).
- **Doc quartet** (this closeout + threat model + validation matrix + reviewer
  checklist) and the stage doc.

## Results

- Coverage profiles distinct per mechanism; matrix discriminates as intended.
- Self-proof: clean baseline passes; all five adversarial detectors fire.
- Every per-target attestation + the catalogue verify PASS; full-pack hashes match.
- Pure libs (`crossDefenceMatrix`, `crossDefenceLib`, `crossDefenceCatalogue`) at
  100% function coverage; replica/CLI I/O paths are smoke-covered (honest E2E
  coverage, not padded).
- Zero `src/llmShield` drift; canary-only; no private key committed.
- Public key fingerprint: `sha256:b1d14ba110f65808331a68f26188b6ed626bb6e76df653ce47d9e7a2f0c73caf`.

## Next

- **Stage 3Q — Attestation registry + regression diff** (deferred): append-only
  registry of signed attestations with cross-version weakening detection.
- Optional opt-in `--target <url>` campaigns against real `vendored_oss`/`live_api`
  targets, run out-of-band, bundles committed and CI-verified.
