# Stage-4 Authority Chain — Release Notes

**Tag:** `v2.12.0-stage-4c-authority-chain-reproducible` (commit `97a8d5f`)
**Component tags:** `v2.10.0-stage-4a-lite`, `v2.11.0-stage-4b-intent`, `v2.12.0-stage-4c-provenance`

## Summary

The Stage-4 authority chain is **independently reproducible from source and verifies offline
using only public keys**. Its evidence ladder preserves the bounded Stage 1-LIVE result
through digest binding and differential equivalence — without private keys, live-model
access, or working-tree state.

This is an evidence-architecture arc. No `src/llmShield` change; no live model was re-run.

## What shipped

- **Stage 4A-lite — capability-kernel equivalence.** The two hard-coded gate families
  (egress, destructive mutation) become one minimal capability kernel; `gate_tool_call` is a
  thin shim proven **byte-identical** to the preserved pre-refactor gate by an exhaustive
  differential test. The frozen Stage 1-LIVE result (`9/140 → 0/140` within the declared
  taxonomy) is carried forward **only** through this equivalence — not through live replay.
- **Stage 4B — laundering-resistant recovery.** Typed intent sources (meeting participants,
  contact group) recover the documented over-block; metrics use per-target malice, so a
  legitimate participant in an otherwise-malicious call is correctly allowed. Model-free:
  4 recovered, 3/3 contained, **0 laundering**.
- **Stage 4C — provenance-gated containment.** Intent entries are gated by provenance; a
  provenance-blind implementation would launder the poisoned-participant attack (2 exposed),
  and provenance-gating contains all of them (**0 laundering**, full containment in the
  declared taxonomy), with the legitimate recovery preserved.

## Fresh-clone E2E (verified)

| Check | Result |
| --- | --- |
| Regenerate all 10 evidence files from source | byte-identical to committed |
| Manifest digest chain 4A→1-LIVE, 4B→4A, 4C→4B | all bind correctly |
| Adapter unit suite | 128 passed |
| Signed bundle reproduce-verify (signature + digest + rebuild), 3 stages | 3/3 verify |
| Node tamper-test suites (stage4a/b/c) | 27 passed |
| Negative control — tampered headline result | rejected |
| Differential equivalence · empty `src/llmShield` · no private key committed | all pass |

## What this is

- fresh-clone independently reproduced
- public-key verified
- tamper-evident
- bounded to the declared taxonomy (egress + destructive mutation)
- digest-bound to frozen Stage 1-LIVE evidence

## What this is NOT

- not third-party audited; not formally verified; not production-ready
- not jailbreak immunity; does not block all attacks
- not a live per-action replay; the signed per-action evidence is over model-free corpora,
  and the live result is inherited through differential equivalence, not live-model replay
- 4C provenance labels are modelled, not derived from a live trust tracker (deferred)
