# Stage 3P — Threat Model

Stage 3P is a measurement and attestation campaign. Its threat model is about the
**integrity of the measurement**, not about defending a live system. The asset is
the trustworthiness of the signed evidence: a reader must not be able to be misled
about what was measured.

## Adversaries and mitigations

| Adversary / risk                                                    | Mitigation                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A replica masquerades as a real product ("we measured Llama Guard") | Brand-denylist gate over id/name/summary/`non_claims` (separator-normalised); product names allowed only for `vendored_oss`/`live_api` with version + execution mode |
| Evidence smuggles a ranking / "best defence" claim                  | Negation/schema-aware overclaim gate; boring false-guard field names; security audit over published artifacts                                                        |
| A target grades its own homework (claims contained, leaks)          | `claim_conflict`: per-cell `result` vs `observed_canary_leaked` evidence comparison                                                                                  |
| A target claims full coverage it did not achieve                    | `unverified_full_coverage_claim`: full coverage requires every cell `contained`                                                                                      |
| A "bad" target is quietly dropped from the campaign                 | `catalogue_silent_drop`: planned target must appear in `targets[]` or `excluded_targets[]` with reason                                                               |
| A target attestation is swapped/tampered after signing              | Per-target Ed25519 signature + hash-bound catalogue digest binding; full pack hash check                                                                             |
| Matrix tampered while preserving total (e.g. `evasions: 6`)         | Full `matrix_shape` canonical equality in `verifyCatalogueBinding` + consistency audit                                                                               |
| A private key leaks via the repo                                    | Private key lives outside the repo (`~/.simurgh/`); CI is verify-only; only the public key is committed                                                              |
| Harmful content leaks through the corpus                            | Canary-only corpus (`harmful_payload_present: false`); privacy audit forbidden-token scan                                                                            |
| Measurement tooling silently weakens the defence                    | Policy-drift guard (branch-wide merge-base) forbids any `src/llmShield/**` change                                                                                    |
| The overclaim gate disables itself by flagging its own disclaimers  | Allow-listed exact non-claim phrases; the gate fails only on a forbidden token outside an allow-listed phrase / renamed field                                        |

## Trust boundaries

- **Generation** (local, holds the private key) is separated from **verification**
  (CI, public key only). Generation never asserts a signature; only the verifier does.
- **`reference_replica`** evidence proves the contract generalises across
  mechanisms; it makes no claim about any named real system.
- External `--target <url>` runs are `measured_not_certified` and never CI-gated.

## Residual risk (accepted)

- Replica behaviour is a stylised model of a mechanism, not the real product; this
  is explicit in `provenance` and the non-claims.
- The self-proof pack is exempt from the wording audit because it names the
  violations it provokes; its content is generated deterministically from fixed
  fixtures, so there is no overclaim surface.
