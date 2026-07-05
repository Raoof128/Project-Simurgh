# Stage 4Q — VFR Threat Model

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Stage 4Q proves that an approval-gate friction checkpoint preceded a protected
authority crossing, and — under No Silent Exemption — that any _unbound_ crossing
carries a signed, policy-falsifiable exemption. Raw codes 80–89. The theorems are
over the RECORDED-run decision model, not physical time.

## Adversary model (three faces)

- **Dishonest builder** — backdates approvals, launders chain order, mints
  approvals with the harness key, replays receipts/exemptions across runs, or
  hides crossings from the census. Each maps to a raw code and a tamper arm:
  chain-order laundering → 89; approval-after-crossing → 85; harness-as-approver
  → 86; cross-run/policy replay of an exemption → 88; hidden crossing (census) → 89. The verifier recomputes chain positions, digests, and the census itself; it
  never trusts recorded positions.
- **Careless integrator** — omits the receipt, ships an expired window, embeds
  the wrong binding digest, or leaves a crossing _silently unbound_. 83 / 82 / 84;
  and Freeze 5 turns "silently unbound" into an explicit signed exemption that
  policy judges (87) rather than a gap.
- **Skeptical reviewer** — trusts nothing recorded. The two-tier verifier
  recomputes every digest, the census, and both replays offline; BYO-approver
  proves the machinery has no hidden dependence on the project's approver key.

## Residual risks (stated, not hidden) — each carried by a rail

1. The Lane B approver is a synthetic fixture-signer, not a human approval UX —
   `not_human_intent_proof`.
2. The pincer proves RECORDED-RUN order, not physical time —
   `pincer_ordering_is_recorded_run_order_not_physical_time_truth`.
3. Key separation is cryptographic, not organisational: one local operator holds
   both keys during capture —
   `approver_key_separation_is_cryptographic_not_organisational`.
4. VFR proves friction PRECEDED the crossing, never that friction HELPED —
   `friction_receipt_is_enforcement_evidence_not_prevention`.
5. `approval_display_digest` commits what was RENDERED, never what the approver
   understood — `display_digest_is_rendering_commitment_not_comprehension_proof`.
6. A No Silent Exemption claim is only as trustworthy as the harness key that
   signs it: it makes the no-approval state explicit and policy-falsifiable, but
   does not itself prove the exemption was appropriate —
   `exemption_claim_is_falsifiable_declaration_not_self_granted_bypass`.

## Out of scope (deferred, by name)

Delay/cooldown and the rest of the friction vocabulary; authority surfaces beyond
the five frozen boundary kinds; real approval UX; HTTP resale-shape substrate;
production VOPRF/PSI. The reviewer note (OWASP-LLM10 / NIST MEASURE 2.7) is a
signed mapping for reproducibility, NOT a compliance claim.
