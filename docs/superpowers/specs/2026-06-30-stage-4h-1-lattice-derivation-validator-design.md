# Stage 4H.1 - Lattice And Linear Derivation Validator Design

**Date:** 2026-06-30
**Status:** 4H.1 design-locked and build-ready; not implemented, merged, tagged,
or released
**Track:** LLM Shield / Verifiable Containment Attestation
**Builds on:** Stage 4H.0 digest and binding foundation

## Status Boundary

```text
Stage 4H overall: design-locked master track
4H.0: merged digest/binding foundation
4H.1: design-locked and build-ready; not implemented, merged, tagged, or released
Full Stage 4H release: only after Q0-Q7 are green
```

## Active Build Contract

This file is the active 4H.1 build contract. The broader Stage 4H master design
remains background architecture only where it agrees with this milestone spec.
If wording differs, this 4H.1 spec controls implementation scope.

4H.1 must land only the lattice and linear derivation validator on top of the
merged 4H.0 digest/binding foundation. It must not drift into full Stage 4H,
Q0, Q3, Q4, Q6, Q7, tamper/privacy closure, offline hermeticity, release
tagging, or public-priority wording.

## Thesis

Stage 4H.1 adds Stage 4H's first load-bearing derivation check: a fixed-lattice,
linear validator for explicit data-flow integrity over recorded replay evidence.

4H.1 proves only this milestone claim:

```text
For a signed, Stage-4D-verifiable evidence pack and a manifest-bound 4H
certificate, the verifier can recompute explicit-flow graph labels from signed
premises, validate the supplied derivation exactly, accept a clean recorded
explicit-flow graph, and reject structurally valid unsafe explicit flow.
```

It does not claim implicit-flow security, execution truth, model safety, provider
behaviour correctness, future-run guarantees, or public priority.

## Section 1: Architecture

Stage 4H.1 extends the merged 4H.0 digest and binding foundation with a
repo-native linear derivation validator. It does not change 4H.0 canonical
premise projection or any existing digest surface: `base_pack_digest`,
`replay_root`, `premise_digest`, `policy_digest`, and `lattice_digest` remain
byte-stable.

The implementation stays inside `tools/simurgh-attestation/stage4h/`:

```text
constants.mjs
  fixed 2-point integrity lattice and pinned proof-system constants

schema.mjs
  strict certificate/manifest schema plus strict derivation entry shapes

dfiCertificate.mjs
  graph recomputation, label normalization, honest derivation builder,
  and linear derivation validator

verify-stage4h-digest-binding.mjs
  existing 4H.0 verifier path plus Q1 derivation validation after Q2/Q5

build-stage4h-digest-fixtures.mjs
  deterministic Stage-4D-verifiable synthetic clean Q1 fixture generation
  plus real/signed dirty explicit-flow rejection fixture wiring when applicable
```

The fixed lattice has two labels: `trusted` and `untrusted`, with `untrusted`
below `trusted`. 4H.1 normalizes raw Stage 4D labels only inside the
graph/lattice layer:

```text
raw label exactly "trusted" -> trusted
all other raw labels -> untrusted
```

Normalization occurs only inside `recomputeGraph`, `buildDerivation`, and
`validateDerivation`. The raw label remains unchanged in canonical premises and
committed metadata. 4H.0 premise bytes and digests remain unchanged. This keeps
4H.0 stable while making Q1 conservative.

`buildDfiCertificate` is an honest builder, not an acceptance oracle. It emits
structurally valid derivations for clean and dirty packs. The verifier decides
acceptance:

```text
clean honest certificate -> raw 0
dirty honest certificate -> raw 24
tampered/incomplete proof object -> raw 26
```

4H.1 proves explicit-flow integrity over recorded replay evidence only; it does
not claim implicit-flow security, execution truth, model safety, or future-run
guarantees.

## Section 2: Data Flow And Verifier Lifecycle

4H.1 keeps the 4H.0 verifier ordering and adds Q1 only after the signed base
pack, schema, Q2 digests, and Q5 manifest binding have succeeded:

```text
load certificate + manifest
  -> validate strict schema
  -> verify Stage 4D base pack signature, replay material, receipt chain,
     Merkle/signature binding, and existing Stage 4D privacy constraints
  -> recompute 4H.0 premises and digests
  -> verify Q2 premise/base/replay/policy/lattice digests
  -> verify Q5 certificate/manifest binding
  -> recompute 4H.1 graph from premises
  -> validate derivation coverage, lattice steps, sink claims
  -> return Q1/Q2/Q5 typed verifier result
```

4H.1 does not implement the full Stage 4H Q7 privacy gate; Q7 remains
`not_in_scope`.

The 4H.1 graph is recomputed from the existing premise set. Source-label
premises keep their raw Stage 4D labels, but graph nodes use normalized lattice
labels:

```text
source premise raw label: "untrusted_web"
graph label: "untrusted"
certificate derivation label: "untrusted"
```

The graph contains:

```text
source:<source_id> nodes from source_label premises
action:<action_id> nodes from explicit_edge premises and from action-level
  authority_sink premises, so sink actions with no incoming edge are still
  represented in the graph
incoming labels per action node from explicit_edge premises
authority sink action nodes from authority_sink:true replay material
```

The proof object is load-bearing:

```text
derived_node_labels:
  exactly one label for every graph node

lattice_steps:
  exactly one node-bound combine step for every action node with incoming edges

sink_safety_claims:
  exactly one claim for every action-level authority sink node

premise_refs:
  only recomputed premise IDs, no unknown or duplicate refs
```

Missing, duplicate, unknown, or extra proof-object material rejects with raw
`26`. A structurally valid derivation over unsafe explicit flow rejects with raw
`24`.

A clean synthetic signed pack produces an honest derivation with `safe:true` for
all authority sinks and `summary.violations = 0`. A dirty signed pack produces
an honest derivation with `safe:false` for unsafe authority sinks and
`summary.violations > 0`; verification rejects that structurally valid unsafe
flow with raw `24`.

## Section 3: Derivation Semantics And Error Codes

4H.1 validates a small fixed proof language. It is not a theorem prover, SMT
layer, or solver. The only derivation operations in scope are normalized source
labels, node-bound `combine` lattice steps, and action-level sink-safety claims.

The fixed lattice semantics are:

```text
labels: trusted, untrusted
order: untrusted is below trusted
combine([]) = trusted as an internal lattice operation
combine(inputs containing untrusted) = untrusted
combine(all trusted inputs) = trusted
required authority-sink integrity = trusted
```

4H.1 proof objects require `combine` lattice steps only for action nodes with
incoming explicit edges. Extra source-node or no-incoming action steps reject
with raw `26`.

Schema, shape, type, version, digest-format, and strict-key failures reject with
`20 schema_invalid` before derivation semantics run.

Semantic proof-object defects reject with `26 proof_tamper_detected`, including:

```text
unknown_premise_ref
duplicate_premise_ref
duplicate_node_label
extra_node_label
missing derived_node_labels coverage
duplicate_lattice_step
extra_lattice_step
missing lattice_steps coverage
lattice_step_invalid
duplicate_sink_safety_claim
extra_sink_safety_claim
missing sink_safety_claim coverage
node_not_in_graph
sink_not_in_graph
node_label_unjustified
violation_count_mismatch
proof_object_carries_no_independently_checkable_derivation
```

Structurally checkable unsafe flow rejects with
`24 explicit_flow_integrity_violation`, including:

```text
proof_accepts_bad_flow
nonzero sink violations
normalized untrusted reaches action-level authority sink
```

This split is intentional:

```text
20 = the certificate/manifest schema is invalid before semantics
26 = the proof object cannot be trusted
24 = the proof object is checkable and shows unsafe explicit flow
```

Anti-theatre is enforced per section. Deleting `derived_node_labels`,
`lattice_steps`, or `sink_safety_claims` individually must flip a clean positive
fixture from accept to reject with `26`. Extra entries also reject, so coverage
means exactly once, not at least once.

The clean positive Q1 fixture must contain at least one source node, at least
one action node with incoming explicit edges, and at least one action-level
authority sink, so each derivation section is load-bearing.

## Section 4: Fixtures, Evidence, And Test Layout

4H.1 adds Q1 fixtures without changing the 4H.0 canonical premise projection.
Existing Q2/Q5 tests remain green and assert byte stability of 4H.0
`base_pack_digest`, `replay_root`, `premise_digest`, `policy_digest`, and
`lattice_digest`. Certificate and manifest digests may change only because
regenerated certificates now include honest derivation material.

Fixtures live under:

```text
tests/fixtures/llmShield/stage4h/
```

4H.1 adds a Stage-4D-verifiable synthetic clean positive fixture:

```text
q1-clean-base-pack.json
q1-clean-base-pack.sig
q1-clean-signer.pub
q1-clean-dfi-certificate.json
q1-clean-signed-pack-manifest.json
```

It adds a real signed dirty fixture when the current Stage 4D pack normalizes to
unsafe explicit flow:

```text
q1-real-dirty-base-pack.json
q1-real-dirty-base-pack.sig
q1-real-dirty-signer.pub
q1-real-dirty-dfi-certificate.json
q1-real-dirty-signed-pack-manifest.json
```

If the current real Stage 4D pack is no longer dirty under 4H.1 normalization,
the implementation must generate a replacement Stage-4D-verifiable signed dirty
fixture and use that for both dirty rejection and forged-safe tests.

Every Q1-specific certificate mutation gets its own matching signed manifest so
the verifier passes Q5 and reaches Q1:

```text
q1-forged-safe-dirty-certificate.json
q1-forged-safe-dirty-signed-pack-manifest.json

q1-theatre-stripped-derived-labels-certificate.json
q1-theatre-stripped-derived-labels-signed-pack-manifest.json

q1-theatre-stripped-lattice-steps-certificate.json
q1-theatre-stripped-lattice-steps-signed-pack-manifest.json

q1-theatre-stripped-sink-claims-certificate.json
q1-theatre-stripped-sink-claims-signed-pack-manifest.json
```

Mutated certificate manifests bind to the same relevant base pack:

```text
forged-safe-dirty -> binds to q1-real-dirty-base-pack, or the replacement signed
  dirty fixture when needed
theatre-stripped-* -> binds to q1-clean-base-pack unless explicitly testing
  dirty-proof stripping
```

Expected CLI results are recorded separately:

```text
expected-results/q1-clean-cli-results.json
expected-results/q1-real-dirty-cli-results.json
expected-results/q1-forged-safe-cli-results.json
expected-results/q1-theatre-stripped-derived-labels-cli-results.json
expected-results/q1-theatre-stripped-lattice-steps-cli-results.json
expected-results/q1-theatre-stripped-sink-claims-cli-results.json
expected-results/q1-unbound-certificate-mutation-cli-results.json
```

The fixture result mapping is:

```text
q1-clean -> raw 0
q1-real-dirty -> raw 24
q1-forged-safe-dirty -> raw 24
q1-theatre-stripped-derived-labels -> raw 26
q1-theatre-stripped-lattice-steps -> raw 26
q1-theatre-stripped-sink-claims -> raw 26
certificate changed without matching manifest -> raw 25
```

This distinguishes two cases:

```text
certificate changed without matching manifest -> Q5 raw 25
rebuilt dishonest proof object with matching manifest -> Q1 raw 24 or 26
```

The clean positive fixture must contain at least one source node, one action
node with incoming explicit edges, and one action-level authority sink, so every
derivation section is load-bearing.

Evidence under:

```text
docs/research/llm-shield/evidence/stage-4h/
```

is updated to Stage 4H.1 and records both clean and dirty Q1 outcomes:

```text
certificate.json
signed-pack-manifest.json
verifier-results.json
q-gate-results.json
README.md
```

`q-gate-results.json` reports Q1/Q2/Q5 pass and Q0/Q3/Q4/Q6/Q7 `not_in_scope`,
and identifies the base packs used for clean acceptance and dirty rejection.

All new fixtures and evidence remain metadata-only: no raw prompts, raw outputs,
tool args, provider transcripts, secrets, absolute local paths, or host
identifiers.

Tests are split as:

```text
tests/unit/llmShield/stage4h/derivation.test.js
  lattice semantics, normalization, graph recomputation, validator cases

tests/unit/llmShield/stage4h/schema.test.js
  strict derivation entry schema

tests/unit/llmShield/stage4h/reproduce.test.js
  committed fixture/evidence presence, metadata-only scan, CLI smoke tests

existing Q2/Q5 tests
  remain green and byte-stability-sensitive
```

## Section 5: Security Model, Failure Precedence, And Testing

4H.1 remains fail-closed and preserves the verifier ordering from Section 2.
The verifier does not run later phases after an earlier phase fails:

```text
strict schema
-> Stage 4D base-pack verification
-> recompute premises, replay root, base pack digest, policy digest, lattice digest
-> Q2 digest verification
-> Q5 certificate/manifest binding
-> Q1 derivation validation
-> fail-closed internal error handling
```

This yields deterministic precedence:

```text
schema/shape/type/version/digest-format failure -> 20
premise/base/replay digest mismatch -> 22
policy/lattice digest mismatch -> 23
manifest/certificate binding mismatch -> 25
proof-object defect -> 26
unsafe explicit flow -> 24
unexpected exception -> 29
```

Each phase writes a typed result and returns immediately on failure. This
prevents malformed inputs from accidentally producing later, less precise codes.

Security controls:

```text
Strict schemas:
  unknown top-level fields and unknown derivation-entry fields reject with 20

Signed input authority:
  base packs must pass existing Stage 4D verifyEvidencePack before 4H.1
  recomputes premises, graph nodes, graph labels, or derivation checks

Premise authority:
  raw Stage 4D labels stay in recomputed premises
  normalized lattice labels are derived only by local verifier code

Proof-object integrity:
  unknown, duplicate, missing, extra, padded, or semantically invalid derivation
  material rejects with 26

Explicit-flow integrity:
  structurally valid derivations over unsafe recorded explicit flow reject with 24

Acyclic binding:
  certificate_digest remains outside the certificate and inside the signed manifest;
  every Q1-mutated certificate fixture has a matching manifest when the test must
  reach Q1

Metadata-only evidence:
  fixtures and outputs must not contain raw prompts, raw outputs, tool args,
  provider transcripts, secrets, environment variables, absolute paths, stack traces,
  or host identifiers
```

Testing layers:

```text
Unit:
  lattice operations
  label normalization
  graph recomputation
  strict derivation schema
  honest builder output
  validator positive and negative cases
  20/24/26 code split

Fixture/CLI:
  q1-clean -> raw 0
  q1-real-dirty -> raw 24
  q1-forged-safe-dirty -> raw 24
  q1-theatre-stripped-derived-labels -> raw 26
  q1-theatre-stripped-lattice-steps -> raw 26
  q1-theatre-stripped-sink-claims -> raw 26
  certificate changed without matching manifest -> raw 25

Reproduce:
  rebuild deterministic fixtures/evidence
  run Q1/Q2/Q5 verifier smokes
  assert q-gate status
  assert metadata-only evidence
  preserve Q0/Q3/Q4/Q6/Q7 as not_in_scope

Repo gates:
  Stage 4H reproduce
  node --test tests/unit/llmShield/stage4h/*.test.js
  npm test
  npm run format:check
  git diff --check
  overclaim scan
```

The overclaim scan rejects wording that implies non-interference, full
non-interference, implicit-flow proof/security, jailbreak-proof behavior,
jailbreak resistance, model safety, `model-safe`, execution truth, future-run
guarantees, public priority, or green Q0/Q3/Q4/Q6/Q7 gates. 4H.1 may claim Q1
only for explicit data-flow integrity over recorded replay evidence.

## Section 6: Implementation Order And PR Boundary

4H.1 lands as one milestone PR only. It may claim Q1/Q2/Q5, but Q0/Q3/Q4/Q6/Q7
stay `not_in_scope`. It must not include the offline hermeticity harness, full
laundering harness, tamper matrix, privacy gate, or reviewer docs beyond the
Stage 4H.1 evidence update.

Implementation order:

```text
1. Reconcile onto merged origin/main in a clean worktree
2. Add fixed lattice constants and strict derivation-entry schema
3. Add label normalization, graph recomputation, honest derivation builder,
   and linear validator
4. Add unit tests for lattice semantics, normalization, coverage, anti-theatre,
   20/24/26 code split, and builder honesty
5. Generate Stage-4D-verifiable synthetic clean Q1 pack and matching certificate/manifest
6. Wire real Stage 4D pack as dirty Q1 rejection fixture when normalization exposes unsafe flow
7. Add matching manifests for every Q1-mutated certificate that must reach Q1
8. Wire Q1 into the verifier after Q2 and Q5
9. Regenerate evidence and update q-gate results to Q1/Q2/Q5 pass only
10. Run reproduce, unit tests, repo gates, diff check, and overclaim scan
```

The PR is complete only when:

```text
q1-clean -> raw 0
q1-real-dirty -> raw 24, when applicable
q1-forged-safe-dirty -> raw 24
q1-theatre-stripped-derived-labels -> raw 26
q1-theatre-stripped-lattice-steps -> raw 26
q1-theatre-stripped-sink-claims -> raw 26
certificate changed without matching manifest -> raw 25
Q1/Q2/Q5 -> pass
Q0/Q3/Q4/Q6/Q7 -> not_in_scope
```

If the current real Stage 4D pack is no longer dirty under 4H.1 normalization,
the implementation must generate a replacement Stage-4D-verifiable signed dirty
fixture and use that for both dirty rejection and forged-safe tests.

4H.1 must not alter the 4H.0 canonical premise projection or claim any of:

```text
implicit-flow security
full semantic non-interference
model safety
jailbreak immunity
execution truth
future-run guarantee
public priority
```

The implementation should use task-sized commits. No commit should leave tests
red. If synthetic Stage 4D pack generation requires changes to Stage 4D helper
use, those changes must be narrowly scoped to fixture generation and must still
pass existing Stage 4D verification.

4H.1 should not be tagged or released from the feature branch; tag/release only
after merge to `main` and a clean `main` closeout run.

## Section 7: Final Summary And Non-Claims

Stage 4H.1 adds Stage 4H's first load-bearing derivation check: a fixed-lattice,
linear validator for explicit data-flow integrity over recorded replay evidence.

The 4H.1 reviewer story is:

```text
clean signed pack accepts
dirty signed pack rejects with 24
dishonest safe claim over dirty flow rejects with 24
stripped proof object rejects with 26
unbound certificate mutation rejects earlier with 25
```

Design status:

```text
4H.0 digest and binding foundation: merged
4H.1 lattice + linear derivation validator: design-locked, build-ready,
  not implemented, not merged, not tagged, not released
Q1/Q2/Q5: intended scope after implementation
Q0/Q3/Q4/Q6/Q7: not_in_scope for 4H.1
```

4H.1 does not claim:

```text
implicit-flow security
control-dependence security
full semantic non-interference
model safety
jailbreak immunity
execution truth
future-run guarantees
policy correctness
provider behaviour correctness
coverage of missing, unrecorded, or incorrectly recorded edges
public priority
```

The Cohen/MVAR full-text blocker remains preserved before any public priority
wording. 4H.1 should not be tagged or released from the feature branch;
tag/release only after merge to `main` and a clean `main` closeout run.
