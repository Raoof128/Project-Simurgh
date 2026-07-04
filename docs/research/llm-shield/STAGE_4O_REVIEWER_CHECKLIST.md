# Stage 4O — VTSA Reviewer Checklist

**Motto: AnthropicSafe First, then ReviewerSafe.**

A reviewer can confirm every 4O claim offline, from bytes, with no network and no trust in
the producer. Requires Node 26.

## One command

```bash
scripts/reproduce-llm-shield-stage4o.sh   # -> "[stage4o] reproduce complete -> raw 0"
```

This regenerates the fixtures into a temp dir and `cmp`s them byte-for-byte, runs the Node

- Python unit suites, the all-functions E2E net, the egress guard, and verifies the
  committed evidence bundle. Any failure routes the exit through `stage4CodeForRawCode`.

## Verify the bundle only

```bash
node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --evidence docs/research/llm-shield/evidence/stage-4o
node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --selective green-unchanged      # included
node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --selective invalid-inclusion-proof  # rejected (exit 3)
```

## What to check by hand

1. **Two keypairs, two roles.** `vtsa-manifest.json` embeds both public keys with
   fingerprints. The manifest key signs commitments (raw 56); the attestation key signs
   the bundle. A bundle-signature failure and a commitment-signature failure are different
   objects.
2. **Digests recompute.** The verifier recomputes the toolset Merkle root, the delta
   digest, the corpus digest, and the attestation digest from bundle bytes. Flip one byte
   in `vtsa-attestation.json` and re-verify — it fails.
3. **Corpus is re-derived, not trusted.** The verifier re-runs every committed arm through
   the real gate/timeline evaluators and compares to the signed corpus.
4. **Selective disclosure.** `--selective <arm>` proves one tool's membership from its
   inclusion proof without reading the rest of `tools[]`.
5. **Constitutional map is claim-checked.** Every `constitutional_alignment` entry's
   `mechanism` is field-equality-checked against the shipped raw codes; every
   `alignment_claim` is drawn from a closed vocabulary. The honesty ceiling is present
   verbatim.
6. **Lean.** `lean proofs/stage4o/MonotoneConsent.lean` type-checks with no `sorry`.
7. **Lane B is external validity only.** `tests/fixtures/llmShield/stage4o/laneb/` is a
   digest-only capture of the public `@modelcontextprotocol/server-filesystem`; it carries
   only digests and enums (egress-guarded).
