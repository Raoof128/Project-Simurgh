# Stage 4J PCTA — Reviewer Checklist

You do not need to trust us; run these seven things. Each is one committed fixture driven
through the real verifier (`tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs`); the
expected exits are fixed by the exit ledger and refused at evidence-emission time if they
drift.

```bash
V="node tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs --pinned-pubkey tests/fixtures/llmShield/stage4j/pcta-signer.pub --fixture"
```

- **T1** clean authorized call → exit 0
  `$V tests/fixtures/llmShield/stage4j/clean-authorized.json`
- **T2** strip the proof → typed exit 1 (raw 31)
  `$V tests/fixtures/llmShield/stage4j/missing-proof.json`
- **T3** corrupt the signature (or present an unpinned key) → typed 1 (raw 32)
  `$V tests/fixtures/llmShield/stage4j/forged-sig.json`
- **T4** replay a stale-epoch proof → typed 1 (raw 33)
  `$V tests/fixtures/llmShield/stage4j/stale-proof.json`
- **T5** authority from untrusted context (killer invariant) → typed 1 (raw 34), even though the
  proof itself declares clean
  `$V tests/fixtures/llmShield/stage4j/untrusted-authority.json`
- **T6** applied ≠ authorized action digest (re-signed, 4H digest space) → typed 1 (raw 35)
  `$V tests/fixtures/llmShield/stage4j/action-mismatch.json`
- **T7** under-declared authority sink (high-consequence action, `authority_sink:false`, on a
  substrate that PASSES the full 4H re-verify) → typed 1 (raw 38)
  `$V tests/fixtures/llmShield/stage4j/sink-underdeclared.json`

Two additional falsifiers the harness runs for you:

- **P4-pre** — a dirty 4H certificate (real `safe:false` sink) is caught by the mandatory 4H
  re-verify as raw 24, before any PCTA gate; PCTA refuses to be a second signature check.
- **Anti-theatre** — deleting the proof from the clean case must flip 0 → 31; the reproduce
  script fails if deletion is ever accepted.

Reproduce everything (offline, deterministic; requires Node 26):

```bash
PATH=/opt/homebrew/bin:$PATH scripts/reproduce-llm-shield-stage4j.sh
```
