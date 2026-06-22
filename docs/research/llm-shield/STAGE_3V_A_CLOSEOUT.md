# Stage 3V-A — Closeout

**Shipped:** Stage 3V-A — Recorded External-Signal Containment Attestation.
**Tag:** `v2.5.0-stage-3v-a-recorded-external-signal-attestation`.
**Public key fingerprint:** `sha256:6e122e19dbeedf74f033eb9548a027480a1461df3acf5b5736d01a07fa381739`.

## What shipped

A tooling-only, offline evidence machine that wraps a deterministic recorded-fixture external
verdict as an **untrusted advisory signal**, replays it against the frozen Stage 3L run-set,
and emits a signed, metadata-only `simurgh.vca.external_defense_run.v1` bundle with a two-tier
(portable + `--reproduce`) verifier and a full tamper suite.

- Generic `ExternalDefenseAdapter` contract + one working recorded-fixture adapter (no stubs).
- Harness-computed hashes close the Stage 3U R2-B residual (`adapter_supplied_hash_forbidden`).
- Advisory-invariance is structural (containment tail = real `evaluateStage3lCase()`).
- 22 hard gates; zero unsafe outcomes; metadata-only evidence; own Ed25519 key.
- Zero `src/llmShield` changes (policy-drift guarded).

## Coverage

100% function coverage on the pure 3V libs + branch tests on throw paths. Verifier/runner CLIs
are subprocess-covered by the smoke + audits (3U precedent).

## Next

**Stage 3V-B (v2.6.0):** plug a real **Llama Guard** run into the *same* contract — live or
captured verdicts — proving the identical machinery wraps a real OSS defence. No contract
change required (verified by the Fix-3 `target:"llama_guard"` compatibility test).

> 3U proved the evidence survived red-team pressure. 3V-A proves the evidence machine can wrap
> an external signal, with harness-computed hashes closing the last signed limitation. 3V-B
> points the same instrument at Llama Guard.
