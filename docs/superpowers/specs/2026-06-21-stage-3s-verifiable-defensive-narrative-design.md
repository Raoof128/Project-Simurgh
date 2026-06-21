# Stage 3S — Verifiable Defensive-Narrative Pipeline — Design

**Status:** Approved design (brainstorm complete). Implementation follows the normal
writing-plans → executing-plans flow.
**Date:** 2026-06-21
**Tag target:** `v2.2.0`.
**Anchors:** `docs/research/llm-shield/NORTH_STAR_VERIFIABLE_CONTAINMENT_ATTESTATION.md`,
Stage 2.5 telemetry (signed, metadata-only, "no automatic finding"), 3E gateway +
`recorded_fixture` path, 3N claim-checking, 3R fallback, the VCA ladder. Grounded in the
real Claude Fable 5 contract.

## Crown sentence

> **Stage 3S proves that defensive narratives can be AI-drafted without becoming
> AI-trusted: the gateway contains generation, the claim checker verifies every slot, and
> humans review a signed narrative artifact rendered only from evidence-bound claims.**
> _AI drafts. Simurgh verifies. Humans review._ 🛡️

## What it redeems

The letter's "Fable ingests secure telemetry via prompt-cached pipelines to generate
real-time defensive security narratives" — made honest. The model writes within a bounded
schema; a deterministic checker decides what survives; nothing the model emits becomes
evidence or a finding.

## Scope discipline (tooling-only)

3R changed the gateway security path. **3S proves a new evidence pipeline can be built
_around_ the gateway without changing the shield itself.** Therefore:

```text
tools-only (tools/simurgh-narrative/)
zero src/llmShield/** change — policy-drift guarded
CI deterministic / offline / verify-only
real gateway exercised through the EXISTING recorded_fixture path
live Fable opt-in only (measured_not_certified)
dedicated Stage 3S Ed25519 key
```

> **Stage 3S must not modify `src/llmShield/**`. The policy-drift guard fails if gateway,
> firewall, receipt, audit, or provider code changes in this stage.\*\*

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

Note on caching: `anthropicMessageBuild.js` sets **no `cache_control` by default**, so the
context is described as **prompt-cache-ready / prompt-cache-compatible**, not as actually
cached in CI.

## Two-layer containment (named invariant)

> **The gateway receipt proves the slot-drafting attempt passed through the gateway
> containment path. It does NOT prove the narrative claims are true.**
>
> **The 3S verifier proves the rendered narrative did not outrun the evidence digest.**

Receipt ≠ truth of claims. Claim checker = truth boundary.

## The two sacred walls

1. **The model gets a pen, not a passport.** No model-generated text becomes evidence;
   only the signed digest is evidence; only verifier-approved slots may render. Free
   prose / markdown / mixed output never renders directly.

   > In CI, the recorded fixture's `output_text` must be valid structured-slot JSON only.
   > Any non-JSON, free prose, markdown, explanation text, or mixed output is rejected as
   > `narrative_schema_violation`. (Applies equally to live model output.)
   >
   > The output must contain **exactly one** JSON object with
   > `type: "simurgh.defensive_narrative.model_slots.v1"`; arrays, markdown code fences,
   > explanatory prefixes/suffixes (e.g. "Sure, here is the JSON:"), and multiple JSON
   > objects are all rejected. No wrapper, no vibes — just the object.

2. **Stage 2.5 wall — no automatic finding.** The narrative may state integrity signals,
   provenance, confidence boundaries, and manual-review recommendations only. It must
   never state or imply an automatic misconduct finding.
   - **Allowed vocabulary:** `no_issue_observed`, `integrity_signal_present`,
     `manual_review_recommended`, `evidence_incomplete`, `proof_missing`, `proof_valid`,
     `proof_replayed`, `chain_valid`, `chain_invalid`, `fallback_observed`,
     `containment_boundary_triggered`, `provider_refusal_observed`.
   - **Forbidden wording:** `cheated`, `guilty`, `misconduct confirmed`, `malicious`,
     `intentional`, `fraud`, `proved wrongdoing`, `caught`. No courtroom cosplay. ⚖️

## Three-layer schema

### 1. Evidence digest (deterministic, signed-data-derived)

```json
{
  "type": "simurgh.defensive_narrative.evidence_digest.v1",
  "session_hash": "sha256:...",
  "source_inputs": [
    {
      "kind": "gateway_receipt",
      "path": "docs/research/llm-shield/evidence/stage-3r/...",
      "digest": "sha256:..."
    },
    {
      "kind": "vca_attestation",
      "path": "docs/research/llm-shield/evidence/stage-3q/...",
      "digest": "sha256:..."
    }
  ],
  "audit_chain_valid": true,
  "daemon_proof_counts": { "valid": 12, "missing": 1, "replayed": 0 },
  "gateway": { "fallback_used": true, "fallback_bypass_successes": 0, "output_firewall_blocks": 0 },
  "vca": { "attestation_verified": true, "claim_conflicts": 0 },
  "privacy": {
    "raw_pixels_captured": false,
    "raw_window_titles_captured": false,
    "typed_content_captured": false
  }
}
```

> **Source-binding:** the consistency audit verifies, for every `source_inputs[]` entry,
> that the source file exists and its digest matches, and that `evidence-digest.json`
> re-derives byte-identically from those committed sources.

### 2. Model structured slots (gateway-mediated; recorded_fixture in CI / live Fable opt-in)

```json
{
  "type": "simurgh.defensive_narrative.model_slots.v1",
  "source": {
    "gateway_receipt_digest": "sha256:...",
    "gateway_output_hash": "sha256:...",
    "model_slots_digest": "sha256:..."
  },
  "slots": [
    {
      "slot_id": "fallback_observed",
      "evidence_ref": "gateway.fallback_used",
      "operator": "==",
      "expected_value": true,
      "severity": "manual_review_recommended",
      "wording": "fallback_observed"
    }
  ]
}
```

> **Receipt-binding invariant:** `model-slots.json` MUST be byte/canonically derived from
> the gateway run's `output_text`, and its `gateway_output_hash` MUST match the gateway
> receipt's provider-response/output hash. A `model-slots.json` whose digest does not match
> the stored `gateway-receipt.json` is rejected — nobody can swap the slots after the
> gateway run.

### 3. Verified rendered artifact (deterministic renderer only)

```json
{
  "type": "simurgh.defensive_narrative.verified_artifact.v1",
  "claim_check_passed": true,
  "unsupported_slots_rejected": 0,
  "automatic_finding_made": false,
  "rendered_summary": "One provider fallback event was observed. The fallback did not bypass Simurgh containment and is recorded for manual review."
}
```

## Claim checker (field-equality, no prose NLP)

For every slot: `evidence_ref` must exist in the digest; `operator` must be in the allowed
set; the field-equality / numeric relation must hold against the digest; `wording` must be
in the allowed vocabulary; `severity` must be an allowed non-finding value; no forbidden
wording anywhere. Any failure → the slot is rejected (`unsupported_slots_rejected`), and a
slot that asserts something the digest contradicts → `narrative_claim_conflict`. The
renderer emits prose only from surviving slots.

## Generation modes

- **CI:** `provider_mode = recorded_fixture`; the committed fixture's `output_text` is the
  deterministic structured-slot JSON; no network; claim checker verifies; artifact
  byte-compared; signature verify-only.
- **Live (opt-in):** `provider_mode = live`; live Fable drafts slots; `measured_not_certified`;
  3R fallback available if configured; output still claim-checked; unsupported slots
  rejected. Live Fable can help write; it cannot decide truth.

## Self-proof — the teeth

| Fixture                     | Must prove                                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| `clean-supported-narrative` | supported slots pass and render                                                   |
| `unsupported-signal-claim`  | a slot claiming a signal not in the digest → rejected                             |
| `severity-overclaim`        | a slot escalating to finding/confirmed misconduct → rejected                      |
| `privacy-overclaim`         | a slot claiming raw pixels/titles/typed content captured → rejected               |
| `missing-evidence-ref`      | a nonexistent `evidence_ref` → rejected                                           |
| `field-value-conflict`      | a slot says fallback used when the digest says false → `narrative_claim_conflict` |
| `freeform-prose-injection`  | model output that isn't pure slot JSON → `narrative_schema_violation`             |
| `manual-review-wall`        | the narrative uses only manual-review / non-finding language                      |
| `renderer-determinism`      | the same verified slots render a byte-identical narrative                         |

Summary (distinguishes attempted-and-caught from rendered, so the teeth visibly fired):

```json
{
  "narrative_claim_conflict_attempts": 1,
  "narrative_claim_conflicts_rendered": 0,
  "unsupported_slots_rejected": 6,
  "automatic_findings_rendered": 0,
  "privacy_overclaims_rendered": 0
}
```

## Architecture & files

```text
tools/simurgh-narrative/
  evidenceDigest.mjs       # buildEvidenceDigest(inputs) — deterministic, signed-data-derived
  narrativeContext.mjs     # buildNarrativeContext(digest) — bounded prompt-cache-ready block
  claimChecker.mjs         # verifySlots(slots, digest) — field-equality, vocabulary, walls
  renderer.mjs             # renderNarrative(verifiedSlots) — deterministic prose
  selfProof.mjs            # runNarrativeSelfProof() — 9 fixtures, summary
  simurgh-narrative.mjs    # CLI: build [--update] / hash / verify-hashes (drives gateway via recorded_fixture)
  sign-3s-narrative.mjs    # local signer (SIMURGH_3S_PRIVATE_KEY_PATH ~/.simurgh/3s-ed25519.pem)
  verify-stage3s-narrative.mjs  # CI verify-only

docs/research/llm-shield/evidence/stage-3s/
  digest/evidence-digest.json
  model-slots/model-slots.json, gateway-receipt.json
  verified/verified-narrative-artifact.json (+ .signature.json)
  keys/stage3s-public-key.json, stage3s-key-fingerprint.txt
  self-proof/self-proof-results.json
  evidence-hashes.json

tests/unit/llmShield/narrative/{evidenceDigest,claimChecker,renderer,narrativeSelfProof}.test.js
docs/research/llm-shield/{LLM_SHIELD_STAGE_3S_*, STAGE_3S_CLOSEOUT/THREAT_MODEL/VALIDATION_MATRIX/REVIEWER_CHECKLIST}.md
scripts/{smoke,security-audit,privacy-audit,policy-drift-guard,consistency-audit}-llm-shield-stage3s.* + check.sh wiring (3A–3S)
```

## Testing

- 100% function coverage on the pure libs (`evidenceDigest`, `claimChecker`, `renderer`,
  `selfProof`); CLI/signer/verifier + the gateway run are smoke-covered (honest E2E).
- Determinism: digest + verified artifact re-derived and byte-compared; renderer
  byte-identical.
- Policy-drift guard: fails on any `src/llmShield/**` change.

## Non-claims

- Descriptive defensive evidence, never an attack aid; no automatic misconduct finding;
  no "model is safe" claim.
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
