# Stage 5F VMP — independent-party conformance kit

Verify-only. Confirms the committed multi-detector panel attestation is authentic, representation- and
(at audit tier) evaluation-complete, byte-stable, and corroborated by the Lane B two-process ceremony
and the independent Python parity verifier — **without re-running any detector**.

## Run

```bash
node --version            # Node 26 for byte-stability
bash tools/simurgh-attestation/stage5f/conformance-pack/run.sh "$(pwd)"
```

Expected: `Stage 5F VMP conformance: ALL PASS`.

## What it proves (and does not)

- Proves: signature under an externally pinned key; the panel plan / roster ⊆ universe / omission bound;
  the cell-matrix bijection and typed non-results; adapter-input binding; the semantics-specific verdict
  recompute (lexical, no float); the audit census bijection; and cross-runtime (JS↔Python) agreement.
- Does NOT prove: the detectors themselves. The committed evidence is a **synthetic structural
  demonstration** over two real detector identities; a real dual-detector capture is Lane C (see
  `../lanec/README.md`), which needs a droplet and has not yet been executed.
