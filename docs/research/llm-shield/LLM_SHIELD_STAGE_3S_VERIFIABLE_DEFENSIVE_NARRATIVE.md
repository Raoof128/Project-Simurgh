# LLM Shield — Stage 3S: Verifiable Defensive-Narrative Pipeline

> **Stage 3S proves that defensive narratives can be AI-drafted without becoming
> AI-trusted: the gateway contains generation, the claim checker verifies every slot, and
> humans review a signed narrative artifact rendered only from evidence-bound claims.**
> _AI drafts. Simurgh verifies. Humans review._ 🛡️

**Release target:** `v2.2.0-stage-3s-verifiable-defensive-narrative`
**Type:** Tooling-only (measurement/attestation discipline). **Zero `src/llmShield`
change — policy-drift guarded.** CI deterministic / offline / verify-only; the real gateway
is exercised through the existing `recorded_fixture` path; live Fable opt-in only.

## What it redeems

The letter's "Fable ingests secure telemetry via prompt-cached pipelines to generate
real-time defensive security narratives" — made honest. The model writes within a bounded
schema; a deterministic checker decides what survives; nothing the model emits becomes
evidence or a finding.

> 3R changed the gateway security path. **3S proves a new evidence pipeline can be built
> _around_ the gateway without changing the shield itself.**

## Pipeline (four steps, two leashes)

```text
signed telemetry / gateway receipts / VCA attestations
  → deterministic evidence digest                 (the source of truth)
  → bounded, prompt-cache-ready provider-safe context  (500/ctx, 2 KB, control-stripped)
  → 3E gateway run (recorded_fixture in CI / live Fable opt-in)
      → model emits STRUCTURED slots → gateway output firewall + tool gate + receipt + HMAC audit
  → 3S claim checker (field-equality vs the digest; no prose NLP)
  → deterministic renderer (verified slots only)
  → Stage 3S Ed25519 signature on the verified artifact
```

## Two-layer containment (named invariant)

> **The gateway receipt proves the slot-drafting attempt passed through the gateway
> containment path. It does NOT prove the narrative claims are true.**
>
> **The 3S verifier proves the rendered narrative did not outrun the evidence digest.**

Receipt ≠ truth of claims. Claim checker = truth boundary.

## The two sacred walls

1. **The model gets a pen, not a passport.** No model-generated text becomes evidence;
   only the signed digest is evidence; only verifier-approved slots may render. The model
   output must be **exactly one** JSON object of type
   `simurgh.defensive_narrative.model_slots.v1`; arrays, code fences, prefixes/suffixes
   ("Sure, here is the JSON:"), and multiple objects are rejected as
   `narrative_schema_violation`. No wrapper, no vibes.

2. **Stage 2.5 wall — no automatic finding.** The narrative may state integrity signals,
   provenance, confidence boundaries, and manual-review recommendations only — never an
   automatic misconduct finding. Allowed vocabulary is a fixed set (`manual_review_recommended`,
   `proof_missing`, `chain_valid`, `fallback_observed`, …); forbidden wording (`cheated`,
   `guilty`, `misconduct confirmed`, `malicious`, …) is rejected. No courtroom cosplay. ⚖️

## Evidence binding

- **Receipt-binding:** `model-slots.json` is derived from the gateway run's `output_text`;
  its `gateway_output_hash` must equal the gateway receipt's `output_hash`. Nobody can swap
  the slots after the gateway run.
- **Source-binding:** `evidence-digest.json` carries `source_inputs[]` (kind/path/digest,
  a file-byte sha256); the consistency audit verifies each source exists, matches, and that
  the digest re-derives byte-identically.
- **Signature:** a dedicated Stage 3S Ed25519 key signs the canonical verified artifact;
  CI is verify-only and never holds the private key.

## Determinism

The gateway runs once at authoring time (`build --update`); its receipt (with a per-run
timestamp/session id) is captured as committed evidence. CI **verify** re-derives only the
deterministic parts — digest, verified artifact, self-proof — and checks the receipt-binding
against the committed receipt. It never re-runs the gateway. (`anthropicMessageBuild` sets
no `cache_control` by default, so the context is **prompt-cache-ready**, not cached in CI.)

## Self-proof — the teeth

`clean-supported-narrative`, `unsupported-signal-claim`, `severity-overclaim`,
`privacy-overclaim`, `missing-evidence-ref`, `field-value-conflict`,
`freeform-prose-injection`, `manual-review-wall`, `renderer-determinism`. Summary
distinguishes attempted-and-caught from rendered: `narrative_claim_conflict_attempts > 0`,
`narrative_claim_conflicts_rendered: 0`, `automatic_findings_rendered: 0`,
`privacy_overclaims_rendered: 0`.

## Non-claims

- Descriptive defensive evidence, never an attack aid; no automatic misconduct finding; no
  "model is safe" claim.
- The model drafts; only verifier-approved, evidence-bound slots render; nothing the model
  emits becomes evidence.
- Metadata-only; live providers opt-in and `measured_not_certified`; CI deterministic and
  offline.

## Out of scope (deferred)

- Multi-session / fleet narratives; live long-horizon streaming.
- Any change to gateway/firewall/receipt/audit code (that was 3R's lane).

## External anchors

- [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- AgentDyn (arXiv:2602.03117); Firewalls (arXiv:2510.05244); PISmith (arXiv:2603.13026); OWASP AI Agent Security; NIST AI RMF.
