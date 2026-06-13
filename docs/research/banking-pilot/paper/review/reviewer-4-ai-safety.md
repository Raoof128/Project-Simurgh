# Reviewer 4: AI Safety Review

Stage: B5-R independent-style model-assisted review.
Input scope: `banking-shield-paper-v1.0.md`, full paper audit, claim audit, and
documented gate results only.
Reviewer stance: AI safety reviewer.
Review status: simulated adversarial review, not formal peer review.

## Summary Recommendation

Accept for preprint after narrowing the AI contribution. The deterministic AI
privacy firewall is valuable precisely because it does not rely on live-model
behaviour. The paper should avoid sounding as if a live LLM safety problem has
been solved.

## Major Concerns

1. "AI privacy firewall" is a strong label for a deterministic mock provider.
   The paper defines this, but the abstract should include "AI-style" or
   "deterministic mock" near the first use.

2. The no-egress claim is strong and useful, but it is a static source-property
   claim over listed modules. Do not generalise it to runtime network policy,
   host-level egress blocking, or future live providers.

3. The output claim guard is denylist-based. The paper correctly says no false
   negative class is claimed, but the abstract should not imply complete
   prevention of unsafe claims.

4. The receipt design is a strong contribution, but receipts attest process
   state and gate outcomes, not truth or safety. Keep that distinction explicit.

5. Future live provider integration should be framed as losing determinism and
   requiring replay logs, provider egress controls, and external review.

## Minimum Fixes Before Preprint

1. In the abstract, call the explanation layer "AI-style" and the provider
   "deterministic mock" in the same sentence.
2. Replace broad "static gate proving the absence of network primitives" with
   "static source gate over the four AI-firewall modules."
3. Add one sentence that the firewall establishes a provider-independent
   contract, not a validated live-LLM safety result.
4. Keep "no live LLM has been filtered" in limitations.

## Final Reviewer Note

The AI contribution is credible if scoped as contract-first safety engineering:
allowlist inputs, deterministic provider, output schema/claim scan, receipts,
and no-egress source checks. It should not be marketed as live LLM guardrail
validation.
