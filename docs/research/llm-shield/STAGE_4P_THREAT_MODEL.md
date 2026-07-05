# Stage 4P — VOCA Threat Model

**Motto: AnthropicSafe First, then ReviewerSafe.**

Stage 4P — Verifiable Origin-Custody Attestation — verifies that a model or tool request
was routed through a declared origin-custody path recorded as signed evidence. It does
**not** detect every covert proxy, prove real upstream execution, or investigate
grey-market services. This document names the adversaries and maps each to the raw code
that contains it, matching the shipped ledger in
`tools/simurgh-attestation/stage4h/exitCodes.mjs` (`VOCA_RAW_CODES`).

## Trust boundary

All 4P claims apply only to the recorded custody evidence supplied to
`verifyCustody` (`tools/simurgh-attestation/stage4p/core/custodyCore.mjs`): the origin
custody envelope, the previous-link hop-receipt chain, and the response custody receipt.
The verifier is offline and recomputes every digest, chain link, and CPC digest from bundle
bytes; it never trusts a claimed value. Zero `src/llmShield` changes ship with this stage
(confirmed: no diff under `src/llmShield` since `v2.24.0-stage-4o-vtsa`) — custody
verification is entirely offline over recorded evidence.

## Adversaries and containment (in scope)

| Adversary                             | Move                                                                                | Contained by                                                                                           | Raw |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --- |
| **Omitter**                           | supplies no custody envelope, or a malformed one                                    | envelope absent or fails exact-key/enum validation                                                     | 67  |
| **Forger**                            | forges or replays a signature over the envelope, a hop, or the receipt              | injected Ed25519 result flag false for envelope/hop/receipt signature                                  | 68  |
| **Replayer**                          | replays a stale envelope outside its validity window                                | `run_epoch ∉ [valid_from_epoch, valid_until_epoch]`                                                    | 69  |
| **Endpoint swapper**                  | silently substitutes the declared endpoint                                          | observed endpoint digest ≠ declared endpoint digest                                                    | 70  |
| **Undeclared proxy**                  | reseller endpoint forwards to an unknown upstream hop                               | relay identity digest not in `declared_relay_digests`, or a hop under `direct_only`                    | 71  |
| **Model substitute (evidence lanes)** | declared model digest vs observed digest diverge                                    | observed or receipt model-identity digest ≠ declared digest                                            | 72  |
| **Account-pool launderer**            | rotating/farmed accounts without a declared pool boundary                           | pool observed but envelope declares `account_boundary` other than `declared_pool`                      | 73  |
| **Trace-custody expander**            | prompts/outputs retained by an undeclared relay                                     | observed trace custody not in the declared custody's allow-set                                         | 74  |
| **Tool-surface rewriter**             | proxy changes tool definitions vs the Stage 4O commitment                           | receipt or observed tool-surface digest ≠ `stage4o_surface_commitment_digest`                          | 75  |
| **Unbound transformer**               | proxy rewrites request/response without a receipted, declared transform             | observed transform digest not in `declared_transform_digests`                                          | 76  |
| **Binding forger**                    | supplies a receipt that does not bind to the request/response/path/epoch it records | receipt digests / `receipt_epoch` fail recompute against the request, response, and chain              | 77  |
| **Custody launderer**                 | relay chain omits, reorders, or duplicates hops                                     | previous-link chain check fails: missing, reordered, duplicated, non-linking, or terminal-mismatch hop | 78  |
| **CPC misuser**                       | below-floor digest emitted, budget exceeded, bad 4N anchor, forged recompute        | entropy floor, disclosure budget, window-anchor membership, or digest recompute fails                  | 79  |

Normative first-failure check order (`VOCA_CHECK_ORDER`,
`tools/simurgh-attestation/stage4h/exitCodes.mjs`):

```text
67 → 68 → 69 → 78 → 70 → 71 → 72 → 73 → 74 → 75 → 76 → 77 → 79
```

Raw 78 (custody-path laundering) runs immediately after structural/signature/epoch
validity because an omitted or reordered hop can mask every downstream content mismatch —
the same precedence argument as Stage 4O's drift-laundering check. This is exercised by the
`laundering-beats-model-swap` (78 wins over 72) and `signature-beats-laundering` (68 wins
over 78) doubly-broken fixture arms.

Verifier artifact/internal failures (a malformed bundle at the attestation-integrity layer,
not a per-arm custody verdict) route through the existing harness path
(`RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED` = 29 → run-level 3); they never allocate a
new 4P code.

## Out of scope

```text
breaking TLS
detecting every covert proxy
provider-internal fraud investigation
proving true upstream execution
law-enforcement attribution
buying or testing illegal proxy access
```

## What 4P does not defend against (signed non-claims)

The 16 non-claims below are signed byte-for-byte, in this frozen order, into every VOCA
attestation bundle (`VOCA_NON_CLAIMS`, `tools/simurgh-attestation/stage4p/constants.mjs`;
verified present and in-order in the committed
`docs/research/llm-shield/evidence/stage-4p/voca-attestation.json`):

```text
not_provider_identity_oracle
not_proxy_blocking_system
not_grey_market_investigation
not_law_enforcement_claim
not_model_safety_claim
not_proof_of_actual_provider_execution
not_detection_of_all_proxies
not_a_replacement_for_provider_abuse_detection
not_model_substitution_oracle
http_resale_shape_deferred_to_4p1
window_anchor_is_public
match_is_not_attribution
private_custody_corroboration_deferred
disclosure_budget_is_not_privacy_proof
not_enforcement_verification
not_legal_compliance_certification
```

See `STAGE_4P_REVIEWER_CHECKLIST.md` for where each non-claim is enforced in code
(file/function per non-claim).

## The frozen safety rail

Signed verbatim into every VOCA attestation bundle (`SAFETY_RAIL`,
`tools/simurgh-attestation/stage4p/constants.mjs`), matching 4P spec §18:

> Stage 4P proves properties of recorded custody evidence. It does not prove physical
> network truth, provider honesty, real-world attribution, or model execution identity
> outside the evidence supplied to the verifier.

Stage 4P classifies custody evidence, not provider truth. A cooperative path can prove its
declared custody envelope. An uncooperative path can only fail to produce valid custody
evidence, which 4P records as the auditable result — the absence of a valid custody
attestation is itself the auditable signal, not a detection claim about the uncooperative
path's real-world behaviour.
