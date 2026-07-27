# `altered-family` — the corpus C1's verifier must refuse

A copy of family `F1` in which the vulnerable control's defect has been **repaired**. Nothing else
differs. The point is not that the repair is bad — it is that the bytes C1 committed are no longer
the bytes on disk, and a verifier that shrugs at this cannot detect a family swapped after the
commitment.

Used by:

```bash
node tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs \
  --against tests/fixtures/llmShield/stage5r/altered-family/   # must exit non-zero
```
