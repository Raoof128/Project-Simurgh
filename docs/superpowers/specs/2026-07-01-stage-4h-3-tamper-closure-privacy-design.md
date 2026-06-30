# Stage 4H.3 - Q6 Tamper Closure And Q7 Bounded-Capacity Privacy

**Date:** 2026-07-01
**Status:** Design-approved; implementation plan not yet written
**Track:** LLM Shield / Verifiable Containment Attestation
**Builds on:** Stage 4H.0 digest and binding foundation; Stage 4H.1
lattice and linear derivation validator; Stage 4H.2 Q0/Q4 discrimination

## Status Boundary

```text
Stage 4H.0: committed digest/binding foundation
Stage 4H.1: committed lattice + linear derivation validator
Stage 4H.2: committed Q0 clean acceptance + Q4 dishonest-producer discrimination
Stage 4H.3: Q6 tamper closure + Q7 bounded-capacity privacy
Full Stage 4H release: only after Q0-Q7 are green
```

This spec is the repo-native design contract for Stage 4H.3. It narrows the
approved Rev 3 milestone to two new falsifiable verifier properties:

```text
Q6: single-delta tamper closure over proof, replay, policy, lattice, binding,
    and signature material
Q7: bounded-capacity metadata export with no unbounded free-form channel
```

If broader Stage 4H material conflicts with this file, this 4H.3 spec controls
this milestone.

## Thesis

Stage 4H.3 proves two bounded properties of the checker, not a new proof engine:

```text
offline, deterministic, model-free re-derivation that falsifies a validly-signed
false claim
```

The first property is verifier tamper closure over the certificate's
claim-covering single-delta neighbourhood. The second property is bounded
certificate capacity: every producer-visible field is either a semantically
necessary enum label or an offline-recomputable, range-checked, typed value.

Stage 4H.3 does not claim multi-field collusion resistance, implicit-flow
security, model safety, execution truth, future-run guarantees, or public
priority.

## Section 1: Architecture

Stage 4H.3 extends the existing Stage 4H verifier under
`tools/simurgh-attestation/stage4h/`. It must reuse the committed 4H.0-4H.2
builder, schema, derivation validator, pack binding, and verifier CLI rather
than adding a parallel verifier path.

The implementation has four units:

```text
exitCodes.mjs
  keeps raw 26 numeric value, renames its semantic bucket to
  proof_structure_invalid, and adds reason constants for 26 and 27

dfiCertificate.mjs
  exposes standalone lattice_digest checking, existing derivation validation,
  and a diagnose entry point for first-failing-step diagnosis

privacyGate.mjs
  validates bounded certificate shape and computes B_total for Q7

tamperClosure.mjs
  builds the Q6 single-delta mutation family and matrix results
```

The verifier CLI must execute a pinned nine-step order and return the first
violation. This is load-bearing: it makes every `(code, reason)` byte-stable and
prevents Q6 and Q7 fixtures from masking each other.

## Section 2: Pinned Verifier Order

Stage 4H.3 replaces the looser 4H.2 order with this explicit order:

```text
1. parse canonical JSON and reject malformed or duplicate keys      -> 20
2. exact schema and unknown-field validation                        -> 20
3. Q7 bounded-capacity privacy gate                                 -> 27
4. Stage 4D signature and Merkle verification                       -> 4D failure
5. base-pack and certificate/manifest binding                       -> 25
6. policy digest equality                                           -> 23
7. premise and replay digest equality                               -> 22
8. structurally complete explicit-flow sink safety                  -> 24
9. lattice digest and derivation completeness/soundness             -> 26
```

The result is the first failing step. For a multi-defect certificate, the
earlier step wins by definition. Tests must cover this tie-break and
`no_short_circuit_masking`: an early passing step must never hide a deeper real
failure.

## Section 3: Raw-Code And Reason Contract

Raw code numbers remain stable. Stage 4H.3 changes the name of raw `26` from
`PROOF_TAMPER_DETECTED` to `PROOF_STRUCTURE_INVALID`, while keeping a
back-compat alias so existing imports do not break.

```text
0  = accepted
20 = schema_invalid
21 = proof_system_unsupported
22 = premise_digest_mismatch
23 = policy_digest_mismatch
24 = explicit_flow_integrity_violation
25 = pack_binding_mismatch
26 = proof_structure_invalid
27 = privacy_leak_detected
28 = checker_not_offline
29 = internal_error_fail_closed
```

Precision for raw `26` lives in reasons, including:

```text
derivation_scope_incomplete
proof_tamper_detected
lattice_digest_mismatch
proof_step_missing
proof_step_unsound
proof_object_carries_no_independently_checkable_derivation
extra_node_label
extra_lattice_step
extra_sink_safety_claim
duplicate_premise_ref
node_label_unjustified
lattice_step_invalid
violation_count_mismatch
```

Q4 remains unchanged:

```text
Q4a forged premise digest -> raw 22
Q4b structurally complete forged-safe dirty derivation -> raw 24
Q4c true partial derivation omission -> raw 26 / derivation_scope_incomplete
```

No new raw verifier codes are introduced in 4H.3.

## Section 4: Q6 Tamper-Closure Matrix

Q6 is a claim-covering single-delta mutation matrix. The clean twin must verify
with raw `0`. Every tampered twin must reject with its expected code and reason.
The gate fails only if any tampered twin returns raw `0`.

```text
tampered_accepted_count must equal 0
```

The matrix has two adversary layers:

```text
Layer A: post-signature crypto tamper
  signature byte flip -> Stage 4D signature_invalid
  Merkle node byte flip -> Stage 4D merkle_root_mismatch

Layer B: re-signed dishonest-producer inconsistency
  base_pack_digest or certificate_digest mutation -> 25 pack_binding_mismatch
  policy bundle mutation -> 23 policy_digest_mismatch
  replay or premise projection mutation -> 22 premise_digest_mismatch
  lattice_digest mutation -> 26 lattice_digest_mismatch
  lattice-step mutation -> 26 proof_step_unsound
  derivation-step deletion -> 26 proof_step_missing
```

Layer B fixtures must be re-signed with the legitimate test key after the
single content mutation, so failures isolate to semantic checks rather than
signature checks. Digest mutations must remain shape-valid
`sha256:<64 lowercase hex>` values. Q6 must never rely on malformed JSON,
unknown keys, free-form values, or any mutation that Q7 should catch first.

The anti-theatre fixture must survive steps 1-7 and fail only at step 9. That
proves the deep lattice/derivation check is load-bearing.

## Section 5: Q7 Bounded-Capacity Privacy Gate

Q7 is a LangSec-style typed-shape gate for the certificate. It does not claim
zero leakage. It reports a bounded capacity:

```text
B_total = sum(log2(|L_i|)) over semantically necessary enum labels
```

With the current two-label integrity lattice, each accepted `label` or
`node_label` contributes one bit. Digests, Merkle roots, node IDs, premise refs,
and summary integers contribute zero producer-chosen bits because they must be
offline-recomputable, pattern-bound, range-checked, or derived from the replay.

The authoritative unknown-key reject is schema step 2 (`20 unknown_field`). Q7
re-applies the same allowlist as defence-in-depth, records auxiliary
`freeform_field_present` information, and owns value-smuggling rejections at
step 3 (`27`).

The Q7 auxiliary allowlist must include the top-level certificate object:

```js
const allowedKeysByPath = {
  certificate: [
    "type",
    "proof_system",
    "claim",
    "scope",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
    "checker_version",
    "summary",
    "derivation",
  ],
  summary: ["sources_checked", "edges_checked", "authority_sinks_checked", "violations"],
  derivation: ["derived_node_labels", "lattice_steps", "sink_safety_claims", "premise_refs"],
  "derived_node_labels[]": ["node", "label", "premise_refs"],
  "sink_safety_claims[]": ["node", "node_label", "safe"],
  "lattice_steps[]": ["op", "node", "inputs", "result"],
};
```

The exact keys above match the current Stage 4H certificate shape. The
manifest's `certificate_digest` remains manifest-owned and must not become a
self-referential certificate field. If the implementation later deliberately
renames derivation fields, the schema and Q7 allowlist must change together in
the same patch and tests must prove the new shape.

Q7 must reject:

```text
non-enum labels
free-form digest or premise-ref values
raw text in summary values
raw text or over-length node IDs
summary integers outside the accepted range
duplicate JSON keys before JSON.parse can erase them
```

Raw text in an object key is schema-owned (`20 unknown_field`). Raw text in a
value position is Q7-owned (`27` with a precise privacy reason).

## Section 6: Two-Lanes-No-Crossfire

Q6 and Q7 are orthogonal lanes:

```text
Q7 must stay silent on every pure-Q6 tamper arm.
Q6 semantic layers must stay silent on every pure-Q7 privacy arm.
```

Tests must prove both directions. This protects the diagnostic contract from
fixtures that accidentally fail for the wrong reason.

The practical rule is:

```text
Q6 fixtures mutate only non-sensitive, offline-recomputable fields.
Q7 fixtures mutate only certificate shape or value-capacity surfaces.
```

## Section 7: Evidence And Gate Results

Stage 4H evidence under
`docs/research/llm-shield/evidence/stage-4h/` must move to 4H.3 scope and
regenerate byte-stable outputs:

```text
tamper-results.json
privacy-report.json
q-gate-results.json
verifier-results.json
README.md
```

Expected gate status after implementation:

```text
Q0: pass
Q1: pass
Q2: pass
Q3: not_in_scope
Q4: pass
Q5: pass
Q6: pass
Q7: pass
```

The evidence README must state:

```text
Stage 4H.3 proves single-delta tamper closure and bounded-capacity metadata
export. It does not prove multi-field collusion resistance, implicit-flow
security, model safety, execution truth, or full Stage 4H completion. Q3 remains
not in scope for 4H.3.
```

It must use bounded-leakage wording and report `B_total`; it must not claim
zero leakage.

## Section 8: Tests And Reproduce Surface

The implementation plan must add focused unit coverage:

```text
privacyGate.test.js
  positive control, every Q7 negative, B_total, duplicate keys, summary range

tamperClosure.test.js
  Q6 matrix, tampered_accepted_count, layer isolation, anti-theatre step-9 arm

diagnosticSoundness.test.js
  first-failing-step tie-break, no_short_circuit_masking, clean acceptance,
  two-lanes-no-crossfire

reproduce.test.js
  Q6 and Q7 pass, Q3 stays not_in_scope, CLI smoke covers new audit scripts
```

The reproduce script must include:

```text
scripts/security-audit-llm-shield-stage4h.sh
scripts/privacy-audit-llm-shield-stage4h.mjs
```

The final banner should report Stage 4H.3 Q6 tamper closure and Q7 bounded
capacity as passing only after both audits and existing 4H verifier checks are
green.

## Section 9: Security Review

Security risks and required mitigations:

```text
Duplicate-key confusion
  JSON.parse silently keeps the last duplicate key. Detect duplicates from raw
  JSON text or a parser/tokenizer that preserves object-scope key events before
  parsing into objects.

Schema/Q7 ownership confusion
  Unknown keys must be schema-owned with raw 20. Q7 may flag auxiliary evidence
  but must not override schema's earlier verdict.

Digest-shape masking
  Q6 digest mutations must preserve sha256 shape so Q7 cannot hijack a semantic
  digest-arm verdict.

Producer-chosen opaque bytes
  Forbid non-recomputable salts, blobs, nonces, raw prompts, raw outputs, tool
  args, secrets, absolute paths, hostnames, or transcript fragments in fixtures,
  evidence, and reports.

Verifier theatre
  The clean positive control must pass. The anti-theatre deletion arm must pass
  steps 1-7 and fail only at step 9.

Overclaim drift
  The claim remains exactly explicit_data_flow_integrity. Scope must keep
  implicit_flow_security false. Q3 remains not_in_scope.
```

The final verification pass must include the Stage 4H reproduce script, targeted
Stage 4H unit tests, repository test/format/diff checks, metadata/privacy scans,
and an overclaim scan for zero-leakage, implicit-flow, multi-field closure, and
public-priority wording.

## Section 10: Out Of Scope

Do not implement in 4H.3:

```text
Q3 offline-hermeticity harness
20-29 to 0/1/2/3 full wrapper wiring beyond existing mapping
multi-field collusive tamper closure
implicit-flow or control-dependence claims
model-safety, execution-truth, or future-run claims
release tagging or full Stage 4H closeout
SMT, Lean, Coq, solver, model, provider, browser, or network dependencies
changes to canonicalPremises.mjs that alter 4H.0 digest surfaces
```

Full Stage 4H release remains a later milestone after Q3 and any remaining
wrapper/release hygiene are complete.

## Implementation Handoff

The next step is a task-by-task implementation plan using the
`superpowers:writing-plans` skill. The plan must preserve this spec's pinned
order, raw-code ledger, Q6/Q7 lane separation, top-level Q7 certificate
allowlist, bounded-leakage wording, Q3 non-scope boundary, and no-release
boundary.
