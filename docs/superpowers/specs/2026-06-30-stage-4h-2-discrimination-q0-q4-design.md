# Stage 4H.2 - Discrimination Fixtures For Q0 And Q4

**Date:** 2026-06-30
**Status:** Design-approved; implementation plan not yet written
**Track:** LLM Shield / Verifiable Containment Attestation
**Builds on:** Stage 4H.0 digest and binding foundation; Stage 4H.1 lattice and
linear derivation validator

## Status Boundary

```text
Stage 4H.0: committed digest/binding foundation
Stage 4H.1: committed lattice + linear derivation validator
Stage 4H.2: design-approved discrimination milestone
Full Stage 4H release: only after Q0-Q7 are green
```

This spec is the repo-native design contract for Stage 4H.2. It formalises the
approved Rev 3 handoff without widening its scope. If broader Stage 4H material
conflicts with this file, this 4H.2 spec controls this milestone.

## Thesis

Stage 4H.2 proves verifier discrimination, not new data-flow semantics.

Stage 4H.1 proved that the checker can validate an explicit-flow derivation.
Stage 4H.2 proves the checker distinguishes clean recorded explicit-flow
evidence from dishonest-producer laundering attempts:

```text
clean recorded explicit-flow evidence -> accept
laundered dirty recorded explicit-flow evidence -> reject
```

The pincer is the claim:

```text
reject-everything checker: passes Q1/Q4, fails Q0
accept-everything checker: passes Q0, fails Q4
real verifier: passes Q0 and Q4
```

The Fable-5 anchor remains bounded: the model or jailbreak path may be dirty,
but tool authority must not be laundered into a clean certificate. 4H.2 proves
that property offline on signed recorded fixtures under a dishonest-producer
threat model.

## Current 4H.1 Behaviour Reused

The current Stage 4H verifier already provides the load-bearing components that
4H.2 reuses:

```text
tools/simurgh-attestation/stage4h/dfiCertificate.mjs
  normalizeIntegrityLabel
  recomputeGraph
  buildDerivation
  validateDerivation

tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs
  strict schema
  Stage 4D base-pack verification
  Q2 premise digest checks
  Q5 signed manifest binding
  Q1 derivation validation

tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
  deterministic signed fixture builder and expected-result writer
```

4H.2 must not reimplement the verifier in parallel. It extends the existing
Stage 4H builder, verifier CLI, tests, and evidence surfaces.

## Locked Raw-Code Ledger

4H.2 locks the raw-code boundary between forged premises, malformed proof
objects, and structurally checkable unsafe flow.

| Raw  | Layer               | Meaning                                                                                                                    | Reasons                                                                                                                                                                                                                    |
| ---- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Accept              | The clean fixture verifies and has no unsafe explicit flow                                                                 | Q0 clean acceptance                                                                                                                                                                                                        |
| `22` | Premise             | The certificate lies about recomputed evidence                                                                             | `premise_digest_mismatch`                                                                                                                                                                                                  |
| `24` | Unsafe-flow verdict | A structurally complete proof is checkable and proves unsafe explicit flow                                                 | `proof_accepts_bad_flow`                                                                                                                                                                                                   |
| `26` | Proof structure     | The proof object is incomplete, padded, duplicated, internally inconsistent, or cites material outside recomputed premises | `derivation_scope_incomplete`, `proof_object_carries_no_independently_checkable_derivation`, `extra_*`, `duplicate_*`, `unknown_premise_ref`, `node_label_unjustified`, `lattice_step_invalid`, `violation_count_mismatch` |

The final wording to carry into docs and evidence is:

```text
Q2 catches forged premises with raw 22.
Q4 catches laundering over honest premises:
- Q4b: structurally complete forged-safe derivation over honest dirty premises -> raw 24
- Q4c: selective or incomplete derivation scope over dirty premises -> raw 26
Q4a is the boundary marker: forged clean premise digest over dirty replay still dies at Q2 with raw 22.
Q0 proves the verifier is not reject-all.
Q6 remains not_in_scope for 4H.2. Raw 26 is not exclusive to Q6.
```

`proof_accepts_bad_flow` remains the only raw `24` case in 4H.2. Structural and
inconsistent-derivation defects use raw `26`.

## Locked Check Order

The observed raw code for laundering fixtures depends on check order. 4H.2 pins
the order:

```text
schema
-> Stage 4D verification (verifyEvidencePack)
-> Q2 premise_digest verification
-> Q5 two-level pack binding
-> derivation coverage / premise-ref exactness   (structural -> raw 26)
-> sink-safety verdict                           (semantic   -> raw 24)
```

Consequences:

```text
Q4a forged clean premise digest over dirty replay
  -> fails Q2
  -> raw 22

Q4b structurally complete forged-safe derivation over honest dirty premises
  -> passes Q2, Q5, and coverage
  -> fails sink-safety verdict
  -> raw 24

Q4c true partial derivation omission over honest dirty premises
  -> passes Q2 and Q5
  -> fails coverage before sink-safety
  -> raw 26
```

## Fixture Design

4H.2 uses a synthetic minimal one-edge delta. The real Stage 4E browser-agent
replay remains out of scope for this milestone and may become later integration
evidence.

### Q0 Clean Positive Fixture

`q0-clean-disconnected-untrusted` contains an untrusted source that exists in
the replay but does not reach an authority sink:

```text
doc1 (untrusted) -> action:a0 (non-sink)
sys  (trusted)   -> action:a1 (authority sink)
```

Expected result:

```text
Q0 clean fixture -> accepted -> raw 0
```

The harness must treat any non-zero raw verifier result for this clean fixture
as `clean rejected unexpectedly` and map it to harness code `19`.

### Q4 Dirty One-Edge Delta Base Pack

`q4-dirty-one-edge-delta` is the sibling dirty pack. It is identical to Q0
except for one explicit edge from the untrusted source to the authority sink:

```text
doc1 (untrusted) -> action:a0 (non-sink)
doc1 (untrusted) -> action:a1 (authority sink)
sys  (trusted)   -> action:a1 (authority sink)
```

The dirty pack is signed and Stage-4D-verifiable. All Q4 laundering fixtures
derive from this dirty base pack.

### Q4a Forged Premise Digest

`q4a-forged-premise-digest` uses the dirty replay but forges the certificate
`premise_digest` to the clean projection. The signed manifest is regenerated to
match the forged certificate so Q5 does not mask the Q2 failure.

Expected result:

```text
q4a-forged-premise-digest -> rejected -> raw 22
```

### Q4b Forged-Safe Complete Derivation

`q4b-clean-derivation-over-dirty-replay` uses honest dirty premises and a
structurally complete derivation, but it forges the sink-safety claim to
`safe:true`.

Expected result:

```text
q4b-clean-derivation-over-dirty-replay -> rejected -> raw 24
reason: proof_accepts_bad_flow
```

This case proves Q4 over honest premises. Q2 has already passed; the lie is in
the safe claim over a dirty recorded flow.

### Q4c True Partial Coverage Omission

`q4c-derivation-scope-omission` uses honest dirty premises and omits only the
`lattice_step` for `action:a1`, the violating authority sink. It retains
`action:a0`'s `lattice_step`, so the section is non-empty. This is true partial
coverage, not a stripped-section theatre case.

Expected result:

```text
q4c-derivation-scope-omission -> rejected -> raw 26
reason: derivation_scope_incomplete
```

## Evidence And Gate Results

The fixture builder must regenerate byte-stable goldens for all 4H.2 fixtures
and expected results. The evidence files under
`docs/research/llm-shield/evidence/stage-4h/` must move from 4H.1 scope to
4H.2 scope:

```text
Q0: pass
Q1: pass
Q2: pass
Q3: not_in_scope
Q4: pass
Q5: pass
Q6: not_in_scope
Q7: not_in_scope
```

The `q-gate-results.json` evidence must list Q0 and Q4 expected raw codes:

```json
{
  "Q0": {
    "q0-clean-disconnected-untrusted": 0
  },
  "Q4": {
    "q4a-forged-premise-digest": 22,
    "q4b-clean-derivation-over-dirty-replay": 24,
    "q4c-derivation-scope-omission": 26
  }
}
```

The evidence README must say that 4H.2 proves discrimination through Q0 and Q4.
It must not imply full Stage 4H completion.

## E2E Smoke Requirement

4H.2 must extend the existing reviewer-grade Stage 4H E2E smoke so the real
fixture builder and real verifier CLI process cover:

```text
Q0 clean acceptance -> raw 0
Q4a forged premise digest -> raw 22
Q4b forged-safe complete derivation -> raw 24
Q4c partial derivation omission -> raw 26
```

This smoke must exercise the committed fixture files through
`verify-stage4h-digest-binding.mjs`, not only unit-level helper calls. The E2E
coverage artifact should list the Q0/Q4 matrix alongside the existing Q1/Q2/Q5
coverage and retain metadata-only assertions.

## Files And Ownership

Modify during implementation:

```text
tools/simurgh-attestation/stage4h/dfiCertificate.mjs
tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs
tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
tests/unit/llmShield/stage4h/derivation.test.js
tests/unit/llmShield/stage4h/reproduce.test.js
tests/e2e/llmShield/stage4hFullSmoke.test.js
scripts/reproduce-llm-shield-stage4h.sh
docs/research/llm-shield/evidence/stage-4h/q-gate-results.json
docs/research/llm-shield/evidence/stage-4h/verifier-results.json
docs/research/llm-shield/evidence/stage-4h/e2e-smoke-coverage.json
docs/research/llm-shield/evidence/stage-4h/README.md
```

Create during implementation:

```text
tests/unit/llmShield/stage4h/discrimination.test.js
tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.json
tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.sig
tests/fixtures/llmShield/stage4h/q4-dirty-one-edge-delta-base-pack.json
tests/fixtures/llmShield/stage4h/q4-dirty-one-edge-delta-base-pack.sig
tests/fixtures/llmShield/stage4h/q4a-forged-premise-digest-certificate.json
tests/fixtures/llmShield/stage4h/q4a-forged-premise-digest-signed-pack-manifest.json
tests/fixtures/llmShield/stage4h/q4b-clean-derivation-over-dirty-replay-certificate.json
tests/fixtures/llmShield/stage4h/q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json
tests/fixtures/llmShield/stage4h/q4c-derivation-scope-omission-certificate.json
tests/fixtures/llmShield/stage4h/q4c-derivation-scope-omission-signed-pack-manifest.json
tests/fixtures/llmShield/stage4h/expected-results/discrimination-results.json
```

Signature naming must follow the current 4H.1 convention:

```text
<base-pack>.sig
```

not:

```text
<base-pack>.json.sig
```

## Security And Privacy Constraints

4H.2 must remain deterministic, offline, metadata-only, and key-safe.

Implementation must not introduce:

```text
raw prompts
raw model outputs
raw tool arguments
provider transcripts
API keys
private keys
absolute local paths
network dependencies
browser/provider/model dependencies
SMT, Lean, Coq, solver, or theorem-prover dependencies
```

The verifier must remain producer-independent. It trusts only recomputed signed
base-pack evidence, the public keys supplied to the verifier, and the local
checker implementation. Producer-supplied proof material never defines
premises.

## Non-Claims

4H.2 does not claim:

```text
implicit-flow security
control-dependence security
model safety
execution truth
provider behaviour correctness
future-run guarantees
full Stage 4H completion
public priority
jailbreak immunity
general jailbreak resistance
production readiness
```

Q3 offline hermeticity, Q6 tamper closure, and Q7 privacy redaction remain out
of scope and must stay `not_in_scope` or pending. Raw `26` is allowed in 4H.2
for proof-object defects; using raw `26` here does not pull Q6 into scope.

No release tag should be created from the 4H.2 feature branch. Tagging is a
separate closeout decision after the relevant Stage 4H gates are reviewed.

## Acceptance Criteria

4H.2 is accepted when:

```text
1. Q0 clean fixture verifies through the real CLI with raw 0.
2. Q4a verifies through the real CLI with raw 22.
3. Q4b verifies through the real CLI with raw 24 and proof_accepts_bad_flow.
4. Q4c verifies through the real CLI with raw 26 and derivation_scope_incomplete.
5. q-gate-results.json marks Q0 and Q4 pass while Q3/Q6/Q7 remain not_in_scope.
6. The reviewer-grade E2E smoke covers the Q0/Q4 CLI matrix.
7. Reproduce script rebuilds fixtures and evidence byte-stably.
8. Metadata-only scans remain clean.
9. Prettier, targeted Stage 4H tests, and the repo gate pass.
10. No implementation claims exceed Q0/Q1/Q2/Q4/Q5.
```
