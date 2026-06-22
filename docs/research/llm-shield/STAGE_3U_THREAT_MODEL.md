# Stage 3U — Threat Model

## What 3U defends against

The overclaim risk in attesting a detector judgment, sharpened by red-team findings. 3U
converts two discovered weaknesses (A10 volume false-fire, A9 metadata smuggling) into
frozen, signed, reproducible evidence — while keeping the honest non-claim that a match is
not an accusation.

## Reference threat (context only, never the claim)

Anthropic-style capability-extraction / distillation-abuse campaigns (Feb 2026). Named labs
appear only in explanatory documentation; never in evidence artifacts.

## Trust boundaries

| Boundary                  | Rule                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Live traffic / identity   | Out of scope. No live traffic, IPs, accounts, emails, full timestamps.             |
| Raw content               | Never stored. Grammar-enforced metadata-only (A9).                                 |
| Gateway / `src/llmShield` | Untouched. Tooling-only; policy-drift fail-closed.                                 |
| Stage 3T (v1)             | Frozen. v1-freeze guard fails on any 3T module/evidence change; 3T must reproduce. |
| Intent / attribution      | Never claimed. Sacred non-claim embedded + audited.                                |
| Detector tuning           | Frozen. Threshold + family-strength + grammar are part of `detector_id`.           |

## Attacks and the wall that stops each

| Attack                                           | Wall                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Volume drives a false extraction finding (A10)   | volume is contextual; ≥2 STRONG families required; A10 regression set + self-proof |
| Raw payload hidden in a tag field (A9)           | metadata grammar (enum/regex); `metadata_grammar_violation`                        |
| Invalid synthetic hash / full timestamp smuggled | grammar regex rejects; self-proof fixtures                                         |
| Swap the metadata set under a valid signature    | `meta_set_digest_binding` + both result-digest bindings                            |
| Tune threshold / reclassify volume post-hoc      | identity locks (`*_change_requires_new_detector_id`) + version-lock fixtures       |
| One phenomenon counted twice                     | distinct-family split (`structural-double-count-trap`)                             |
| Accusatory / attribution wording                 | renderer throws `intent_language_rejected`; security audit                         |
| Named lab leaking into evidence                  | security audit scans all evidence for named labs                                   |
| Quietly rewrite Stage 3T history                 | v1-freeze guard + `verify-stage3t --reproduce`                                     |
| Forged / detached signature                      | Ed25519 verify over canonical attestation                                          |

## The sacred non-claim

> A detector match is not an accusation. It is a reproducible metadata-pattern result for
> manual review.

## Documented limitations (named, not hidden)

A second red-team round (round 2) attacked the v2 hardening itself. The crypto core held
again and the self-proof was confirmed to catch a reintroduced A10 (volume-as-strong → 3
escalations). Two residual limitations were found and are named here and in the
attestation's `known_limitations[]`:

- **Strong+strong benign escalation is broad (R2-A).** 3U fixes the _volume_ false-fire
  class only. ANY two strong families can co-occur in benign heavy use — researcher
  (CoT + one task = behavioural + targeting), developer (shared template + one task =
  structural + targeting), CoT + shared prompt (behavioural + structural) — all escalate.
  3U does not claim benign heavy use is safe in general.
- **Hash fields are opaque 256-bit slots (R2-B).** The grammar bounds hash fields to
  `^sha256:[0-9a-f]{64}$` — _shape_, not authenticity. A verifier without the preimage
  cannot confirm a hash is a real digest of bounded input, so each hash field can carry 256
  bits of arbitrary hex. The A9 grammar closes free-text-in-tags; it does not turn a
  client-supplied hash into a trusted digest. In a real deployment these hashes must be
  computed by the gateway, not accepted from the client.
