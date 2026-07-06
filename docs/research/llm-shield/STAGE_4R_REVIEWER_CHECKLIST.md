# Stage 4R — PCCC Reviewer Checklist

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Reproduce in one command (Node 26):

```bash
scripts/reproduce-llm-shield-stage4r.sh
```

## What to check

- [ ] RFC 8032 vector gate passes — the in-repo Edwards25519 matches Node Ed25519.
- [ ] JS↔Python parity — two independent implementations agree on tokens
      byte-for-byte; Python independently rejects a forged DLEQ.
- [ ] Two-tier verify: public (digest-level) and audit (DLEQ, unilateral) both
      exit 0; audit rejects a z-tampered packet; public rejects a planted class
      digest (raw 99).
- [ ] Lane B: two real OS processes, four distinct key digests, no scalar leak,
      raw-98 refusal publishes nothing.
- [ ] Lean: 6 theorems, zero `sorry`.
- [ ] Reproduce is byte-stable twice; Lane B is verify-only (refresh needs
      `SIMURGH_REFRESH_STAGE4R_LANEB`).
- [ ] Spec deltas in the closeout are honest and match the code.

## Standards mapping note (not a stage, not a raw code)

PCCC's minimum-disclosure ceremony speaks to **OWASP LLM Top-10 (Sensitive
Information Disclosure)** and **NIST AI RMF MEASURE 2.7**: it corroborates a
shared custody-failure class while emitting only match/no-match + count-level
census, no linkable registry. This is an evidence-format mapping, carrying the
`not_legal_compliance_certification` posture — it is not a compliance claim.

## Ecosystem context

See `docs/superpowers/specs/2026-07-06-stage-4r-pccc-design.md` §20 for the
surveyed gap this fills (FMF information-sharing is legal-trust, not cryptographic
corroboration; incident reports are narrative, not recomputable; antitrust chill
favours minimum-disclosure).

## CERA (staged, not a gate)

The Countersigned External Review Attestation (§8.7) lets an external reviewer
sign the constitution projection with their own key. Constitution stays scored
9.0 until it fires — no self-granted credit.
