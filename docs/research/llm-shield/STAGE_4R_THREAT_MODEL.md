# Stage 4R — PCCC Threat Model

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Stage 4R lets two operators corroborate shared custody-class membership without
publishing a linkable herd token. This model enumerates who can attack what, and
which raw code (90–99) catches it. Detection is recorded-evidence over the
committed run set, never omniscience.

## Assets

- **Custody-class privacy from the public.** No `custody_class_digest`, mask, `z`,
  or window-independent token in the public bundle (herd-token scan, raw 99).
- **Cross-window / cross-epoch unlinkability.** Epoch is bound into `pair_id` and
  every token domain, so no reusable public token links operators across windows
  (Lean `noPublicHerdTokenForLinkMaterial`).
- **Match integrity.** A match reflects real shared class membership, not a
  fabrication (commit-reveal + DLEQ, raws 90/92/93).

## Adversaries and the code that catches them

| Adversary                 | Move                                             | Caught by            |
| ------------------------- | ------------------------------------------------ | -------------------- |
| Malformed producer        | bad schema / phase order / opening / cardinality | 90                   |
| Impersonator              | forged operator signature                        | 91                   |
| Claim liar                | valid transcript, tokens differ, claims match    | 92                   |
| Token-copy liar           | opens with the peer's token to fake agreement    | 90 (opening-invalid) |
| Fabricating operator      | forged `z` with no valid DLEQ                    | 93                   |
| Degenerate-point injector | small-order / all-zero mask or `z`               | 94                   |
| Replayer                  | re-uses a transcript from another epoch          | 95                   |
| Nonce-reuser              | reuses a scalar / mask within an epoch           | 96                   |
| Over-discloser            | more than the per-window budget of signals       | 97                   |
| Ungated exporter          | exports a match with no valid VFR receipt        | 98                   |
| Herd-token leaker         | plants a class digest / raw token in the public  | 99                   |

## Out of scope (signed as non-claims / limitations)

- **Colluding pair** who both agree to output a match: bounded by Fiat-Shamir /
  ROM assumptions, not eliminated (`dleq_is_fiat_shamir_random_oracle_model`).
- **Production cryptography.** The Edwards25519 / DLEQ modules are a reference
  research verifier, not constant-time, not a deployment
  (`in_repo_curve_crypto_is_reference_verifier_not_production_deployment`).
- **Identity attribution.** A match is custody-class corroboration, never a claim
  about who an operator is (`match_is_custody_class_corroboration_not_identity_attribution`).
- **Physical time.** Ordering is recorded-run order anchored to the 4N window, not
  a wall clock (`epoch_is_4n_window_anchor_not_physical_time`).
