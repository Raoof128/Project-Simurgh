# Stage 4H - Proof-Carrying Explicit Data-Flow Integrity Design

**Date:** 2026-06-29
**Status:** Design-locked and build-ready; not implemented, merged, tagged, or
released until Q0-Q7 pass in the repository.
**Track:** LLM Shield / Verifiable Containment Attestation
**Builds on:** Stage 4D decision-replay evidence pack, Stage 4E
browser-agent containment run, Stage 4F containment-utility Pareto, and Stage
4G adaptive red-team campaign.

## Thesis

Stage 4H emits a per-run, signed-pack-bound proof-carrying certificate for
explicit data-flow integrity over a replayed agent decision record. The offline
checker recomputes canonical premises from the evidence pack, then validates a
supplied derivation over those premises.

The certificate is designed to make a recorded containment claim independently
checkable and tamper-evident under a dishonest-producer threat model. It does
not prove model safety, execution truth, full semantic non-interference, or
implicit-flow security.

Stage 4H claims:

```text
post-hoc, third-party-reproducible, signed-pack-bound explicit-flow integrity
certification over a recorded agent run after guardrail failure, under a
dishonest-producer threat model
```

The Cohen/MVAR full text remains a blocker before any public priority wording.
The design must not use public priority claims.

## Section 1: Architecture

Stage 4H will be implemented as a repo-native verifier stage over existing 4D
evidence packs, not as a parallel proof system, so the certificate remains
signed-pack-bound, replay-derived, and compatible with the Stage 4 gate
contract.

The core implementation lives under `tools/simurgh-attestation/stage4h/`:

```text
schema.mjs
canonicalPremises.mjs
packBinding.mjs
dfiCertificate.mjs
verifyDfiCertificate.mjs
exitCodes.mjs
```

`schema.mjs` defines the strict `simurgh.vca.dfi_certificate.v1` shape and
rejects unknown fields at every schema-owned level, including derivation and
summary objects. `canonicalPremises.mjs` reads the 4D pack through a narrow pack
adapter and emits stable metadata-only premise records. It must not depend on
incidental file ordering, formatting, or non-canonical JSON layout.
`packBinding.mjs` verifies `base_pack_digest`, `certificate_digest`,
`signed_pack_manifest_digest`, Merkle anchoring, and Ed25519 signature binding.
`dfiCertificate.mjs` builds a valid certificate from recomputed premises and
derivation material. `verifyDfiCertificate.mjs` performs the per-certificate
offline checks used by Q1-Q7, while the Stage 4H test harness composes Q0-Q7
across clean, dirty, tampered, privacy, and offline fixtures. `exitCodes.mjs`
owns the internal verifier codes and Stage 4 wrapper mapping.

Python is not authoritative for certificate bytes, hashes, or verification. If
any fixture orchestration is needed, it stays secondary and feeds committed
metadata-only replay material into the Node checker path.

The checker's trusted base is the external public key, pinned policy/lattice
digests, local verifier code, and the stated crypto assumptions. Its only
authoritative run input is the signed 4D pack; all proof premises are
recomputed from that input.

## Section 2: Data Flow And Certificate Lifecycle

Stage 4H follows this pipeline:

```text
4D signed base-pack view
  -> base-pack verification
  -> canonical premise projection
  -> premise IDs + premise_digest
  -> derivation construction
  -> DFI certificate
  -> certificate_digest
  -> signed pack manifest binding
  -> offline verifier result
```

The base-pack view is the replay/evidence material excluding the 4H
certificate, so `base_pack_digest` is acyclic and stable.

The initial step is ordinary Stage 4D verification: validate the pack signature,
external public key fingerprint, Merkle material, receipt chain, replay
material, and privacy constraints before 4H treats the pack as an authoritative
run input. If the base 4D pack does not verify, 4H fails closed before
certificate validation.

`canonicalPremises.mjs` then projects the replayed record into stable premise
records: source integrity labels, replay nodes, explicit data edges, authority
sinks, policy digest, lattice digest, replay root, and base pack digest. Each
premise receives a stable `premise_id` derived from JCS-canonical metadata. The
complete premise set is JCS-canonicalized and hashed to `premise_digest`.

The prover may help construct the derivation: derived node labels, lattice
steps, sink-safety claims, and references to premise IDs. It may not define,
override, supplement, or reinterpret premises. Any prover-supplied premise-like
material is rejected. The checker validates derivation references only against
recomputed premise IDs.

The verifier requires the derivation to do checkable work: deleting
`derived_node_labels`, `lattice_steps`, or `sink_safety_claims` must change the
verdict from accept to reject for the clean positive fixture.

`dfiCertificate.mjs` emits the strict certificate object containing the claim,
scope, digests, checker version, derivation, and metadata-only summary. The
certificate carries `base_pack_digest` and `premise_digest`, but it does not
self-bind. `certificate_digest = SHA-256(JCS(certificate))` is computed outside
the certificate and written into the signed pack manifest. The verifier
recomputes this digest from the parsed, schema-valid certificate object, not
from producer-supplied digest fields. `packBinding.mjs` verifies the acyclic
two-level binding: base pack digest inside the certificate, certificate digest
inside the signed manifest, and signature coverage over the manifest.

The offline verifier recomputes all premises from the signed base-pack view and
recomputes all binding digests from the schema-valid certificate object and
signed manifest. It then validates the derivation linearly. Its final output is
a typed result:

```json
{
  "ok": true,
  "code": 0,
  "stage4_code": 0,
  "gate": "Q0-Q7",
  "certificate_digest": "sha256:...",
  "premise_digest": "sha256:...",
  "base_pack_digest": "sha256:..."
}
```

For rejection:

```json
{
  "ok": false,
  "code": 24,
  "stage4_code": 1,
  "gate": "Q1",
  "falsifier": "proof_accepts_bad_flow"
}
```

## Section 3: Q-Gates, Falsifiers, And Exit-Code Semantics

Stage 4H distinguishes raw verifier outcomes from harness outcomes.
`verifyDfiCertificate.mjs` returns raw verifier codes `0` and `20-29` for one
input. The Stage 4H harness interprets that raw result against the fixture
expectation. Harness-synthesised code `19 clean_run_falsely_rejected` is emitted
only when a clean fixture was expected to accept but the raw verifier returned
non-zero.

A dirty fixture returning `24 explicit_flow_integrity_violation` is verifier
success when that rejection was expected. A dirty fixture returning `0` is
harness failure because the checker accepted a bad flow.

Raw verifier codes:

```text
0   ok
20  schema_invalid
21  proof_system_unsupported
22  premise_digest_mismatch
23  policy_digest_mismatch
24  explicit_flow_integrity_violation
25  pack_binding_mismatch
26  proof_tamper_detected
27  privacy_leak_detected
28  checker_not_offline
29  internal_error_fail_closed
```

Harness-synthesised code:

```text
19  clean_run_falsely_rejected
```

Stage 4 wrapper mapping:

```text
0      -> 0 pass
19     -> 1 soundness failure
20-27  -> 1 soundness failure
28     -> 2 environment failure
29     -> 3 nondeterminism/internal failure
```

Q4 is split into two deterministic laundering fixtures:

```text
Q4a forged_premise_digest:
  dirty replay with clean forged premise digest must reject with raw code 22

Q4b clean_derivation_over_dirty_replay:
  dirty replay with clean-looking derivation over recomputed dirty premises must
  reject with raw code 24
```

Q3 is harness-enforced. The harness blocks or monkey-patches network, clock,
RNG, provider, prover-callback, and mutable external-service primitives. If any
blocked primitive is invoked, the harness emits code `28 checker_not_offline`.

For every fixture, the reproduce script records both layers:

```json
{
  "fixture": "q4b_clean_derivation_over_dirty_replay",
  "raw_verifier_code": 24,
  "expected_codes": [24],
  "harness_ok": true,
  "stage4_code": 0
}
```

The full gate set is:

```text
Q0 clean positive fixture accepts, else harness emits 19
Q1 bad explicit flow rejects; derivation deletion rejects
Q2 premise digest mismatch rejects with 22
Q3 offline violation emits 28
Q4a forged premise digest rejects with 22
Q4b clean-looking dirty derivation rejects with 24
Q5 pack binding mismatch rejects with 25
Q6 proof/replay/policy/lattice/manifest/signature tamper rejects with 22, 23,
   25, or 26 by mutation class
Q7 privacy leakage rejects with 27
```

## Section 4: Components, Files, And Test Layout

Stage 4H is delivered in small repo-native slices. The initial implementation
slice, 4H.0, lands schema, canonical premises, digest binding, and Q2/Q5 tests
only. It does not include the derivation validator. That keeps the 4H.0 PR
focused on byte stability, acyclic binding, and reviewer-checkable digest
semantics.

Tool modules:

```text
tools/simurgh-attestation/stage4h/
  schema.mjs
  canonicalPremises.mjs
  packBinding.mjs
  dfiCertificate.mjs
  verifyDfiCertificate.mjs
  exitCodes.mjs
```

Unit tests:

```text
tests/unit/llmShield/stage4h/
  schema.test.js
  premiseBinding.test.js
  packBinding.test.js
  dfiDerivation.test.js
  qGates.test.js
```

E2E/replay tests:

```text
tests/e2e/llmShield/
  stage4hDfiReplay.test.js
```

Scripts:

```text
scripts/smoke-llm-shield-stage4h.sh
scripts/security-audit-llm-shield-stage4h.sh
scripts/privacy-audit-llm-shield-stage4h.mjs
scripts/reproduce-llm-shield-stage4h.sh
```

Fixtures and goldens:

```text
tests/fixtures/llmShield/stage4h/
  clean-base-pack.json
  clean-dfi-certificate.json
  clean-signed-pack-manifest.json
  dirty-explicit-flow-base-pack.json
  forged-premise-digest-certificate.json
  dirty-clean-looking-derivation-certificate.json
  tampered-pack-binding/
  tampered-proof/
  expected-results/
```

All fixtures are metadata-only and must not contain raw prompts, raw outputs,
tool arguments, provider transcripts, secrets, or live credentials.

Evidence output:

```text
docs/research/llm-shield/evidence/stage-4h/
  certificate.json
  signed-pack-manifest.json
  verifier-results.json
  q-gate-results.json
  tamper-results.json
  privacy-report.json
  README.md
```

Documentation:

```text
docs/research/llm-shield/LLM_SHIELD_STAGE_4H_PROOF_CARRYING_DFI.md
docs/research/llm-shield/STAGE_4H_THREAT_MODEL.md
docs/research/llm-shield/STAGE_4H_VALIDATION_MATRIX.md
docs/research/llm-shield/STAGE_4H_REVIEWER_CHECKLIST.md
docs/research/llm-shield/STAGE_4H_CLOSEOUT.md
```

Milestone split:

```text
4H.0 schema, base-pack view, canonical premises, premise_digest,
     certificate_digest, Q2/Q5 tests
4H.1 lattice model, derivation validator, Q1, anti-theatre deletion test
4H.2 Q0 clean fixture, Q4a forged premise digest, Q4b dirty replay with
     clean-looking derivation
4H.3 tamper matrix and privacy gate, Q6/Q7
4H.4 offline harness and raw/harness/stage4 exit-code mapping, Q3
4H.5 reproduce script, committed evidence, reviewer docs, closeout
```

`dfiCertificate.mjs` may exist in 4H.0 only as a strict certificate builder for
digest fixtures. It must not pretend to prove DFI until 4H.1 adds derivation
validation and Q1.

## Section 5: Security Model, Error Handling, And Testing Strategy

Stage 4H fails closed at every boundary: invalid base pack, invalid schema,
non-canonical digest, unknown field, forged premise, bad derivation, privacy
leak, offline violation, or binding mismatch.

Security controls:

```text
Base-pack trust:
  verify Stage 4D pack before 4H validation; reject invalid signature, broken receipt chain,
  bad Merkle material, replay mismatch, key substitution, or privacy failure

Schema strictness:
  reject unknown fields at every schema-owned level; enforce bounded strings,
  arrays, object depth, and digest formats

Premise authority:
  recompute all premises from the signed base-pack view; reject prover-supplied
  premise-like material

Canonicalization:
  use RFC 8785 JCS plus SHA-256 for premise_digest, certificate_digest, and
  manifest-bound digests

Pack binding:
  enforce acyclic base_pack_digest -> certificate_digest ->
  signed_pack_manifest_digest binding; verify Ed25519 signature and Merkle
  anchoring

Derivation soundness:
  validate each derived node label, lattice step, sink-safety claim, and premise
  reference against recomputed premises and pinned lattice/policy digests

Offline hermeticity:
  block network, model/provider clients, prover callbacks, wall-clock
  dependence, RNG, hidden local services, and mutable external state

Privacy:
  allow labels, hashes, IDs, counts, gate names, and reason codes only; reject
  raw prompts, raw outputs, tool args, provider transcripts, secrets, or
  credentials
```

Failure precedence is deterministic:

```text
schema
-> base-pack verification
-> pack binding
-> premise digest
-> policy/lattice digest
-> derivation soundness
-> privacy
-> offline harness
-> internal error
```

Base-pack verification failures reuse the Stage 4H code table:

```text
malformed pack/schema -> 20
key/signature/Merkle/manifest binding failure -> 25
replay/premise mismatch discovered during projection -> 22
base-pack privacy leak -> 27
```

Q3 is harness-enforced. The harness blocks or monkey-patches `fetch`, `http`,
`https`, `net`, `tls`, `dns`, `child_process`, provider/model clients,
`Date.now`, `performance.now`, `process.hrtime`, `crypto.randomBytes`,
`crypto.randomUUID`, and WebCrypto random APIs. File reads are limited to
committed fixtures and declared inputs. Writes are limited to the Stage 4H
output directory. Monkey-patching must occur before importing verifier modules
in tests that exercise import-time behavior.

Error handling is structured and non-leaky. Every failure returns a typed raw
verifier or harness code, a stable `gate`, and a short `falsifier` where
applicable. Failures must not expose raw pack content, prompt text, tool
arguments, stack traces with local secrets, environment variables, or provider
metadata. Unexpected exceptions are caught at the CLI boundary and mapped to
`29 internal_error_fail_closed`, with sanitized diagnostics.

Committed evidence files must never contain raw stack traces, absolute local
paths, environment variables, tokens, provider metadata, or host-specific
machine identifiers.

Testing strategy:

```text
Unit tests:
  schema validation, unknown-field rejection, bounded inputs, digest formats
  premise projection byte stability and JCS hashing
  pack binding acyclicity and signature coverage
  derivation validator positive/negative cases
  privacy scanner against certificates and verifier outputs
  exit-code mapping and harness expectation logic

Fixture tests:
  clean base pack accepts
  dirty explicit-flow base pack rejects
  forged premise digest rejects with 22
  dirty replay with clean-looking derivation rejects with 24
  deleted derivation rejects for the clean positive fixture
  tampered proof/replay/policy/lattice/manifest/signature fails closed

E2E/reproduce tests:
  run the full Stage 4H harness from committed fixtures
  write q-gate-results, tamper-results, privacy-report, and verifier-results
  assert byte-stable outputs on repeated runs
  map raw verifier codes to harness outcomes and Stage 4 run-level codes

Audit scripts:
  smoke confirms happy-path and expected dirty rejections
  security audit exercises tamper and laundering fixtures
  privacy audit scans all committed Stage 4H evidence outputs
```

Fixtures and evidence are metadata-only from the initial slice onward. They must
not contain raw prompts, raw outputs, tool arguments, provider transcripts,
secrets, live credentials, absolute local paths, or host-specific machine
identifiers.

## Section 6: Implementation Order And PR Boundaries

Each PR lands one milestone only. A milestone cannot claim completion until its
gate, falsifier, evidence output, and reproduce wiring are present. If a
milestone needs scaffolding for a later milestone, that scaffolding must be
inert, tested as inert, and documented as non-claiming.

A milestone may report later Q-gates as pending or not-in-scope, but must not
mark them green before their milestone lands.

Milestone boundaries:

```text
4H.0 - Digest and binding foundation
  Scope:
    schema.mjs
    canonicalPremises.mjs
    packBinding.mjs
    exitCodes.mjs
    strict certificate builder for digest fixtures
    clean base-pack view fixture
    Q2 premise digest tests
    Q5 pack binding tests
  Must not claim:
    DFI soundness
    derivation validity
    dishonest-producer resistance beyond forged digest rejection
    anti-theatre proof object semantics
  Done when:
    schema rejects unknown fields
    premise_digest is byte-stable
    base_pack_digest is acyclic
    certificate_digest is manifest-bound
    Q2/Q5 fixtures are committed and reproduce-wired
    Q1/Q3/Q4/Q6/Q7 are reported only as pending or not-in-scope

4H.1 - Derivation validator
  Scope:
    fixed integrity lattice
    derived node labels
    lattice order/join validation
    sink-safety claims
    premise reference validation
    anti-theatre derivation-deletion test
  Done when:
    clean derivation accepts
    malformed or tampered derivation material fails with 26
    valid-looking derivation that proves a dirty explicit-flow run rejects with
    24
    deleting derivation material changes clean fixture from accept to reject

4H.2 - Completeness and laundering gates
  Scope:
    Q0 clean positive fixture
    Q4a forged_premise_digest fixture
    Q4b clean_derivation_over_dirty_replay fixture
    harness expectation records
  Done when:
    clean fixture accepts with raw 0
    19 is produced only by the harness when the clean fixture was expected to
    accept but raw verifier output was non-zero
    Q4a rejects with 22
    Q4b rejects with 24
    dirty raw 24 is recorded as harness success

4H.3 - Tamper and privacy closure
  Scope:
    tampered pack binding fixtures
    tampered proof fixtures
    policy/lattice/replay/signature mutations
    privacy scanner
    Q6/Q7 results
  Done when:
    every mutation fails closed with deterministic expected code
    no committed Stage 4H evidence leaks raw content, paths, tokens, provider
    metadata, or host identifiers

4H.4 - Offline hermeticity and wrapper mapping
  Scope:
    Q3 monkey-patched harness
    raw verifier code to harness outcome mapping
    harness outcome to Stage 4 run-level mapping
    sanitized internal-error handling
  Done when:
    blocked primitive usage emits 28
    raw/harness/stage4 results are recorded for every fixture
    Q3 patching occurs before verifier imports in tests that exercise
    import-time behavior

4H.5 - Reproduce closeout and reviewer docs
  Scope:
    scripts/reproduce-llm-shield-stage4h.sh
    smoke, security, and privacy audit scripts
    committed evidence outputs
    validation matrix, threat model, reviewer checklist, closeout docs
    scripts/check.sh integration decision
  Done when:
    one command rebuilds or verifies committed Stage 4H evidence
    repeated runs are byte-stable
    Q0-Q7 are green
    reviewer docs match the actual gates and non-claims
    Stage 4H is added to scripts/check.sh if the reproduce gate remains fast
    and deterministic for normal CI; otherwise it is documented as a required
    release/checklist command outside the default check path
```

A milestone PR must not rename the research claim, broaden the property beyond
explicit data-flow integrity, introduce solver/theorem-prover dependencies,
require network/model/provider access in the verifier path, or claim public
priority beyond the locked ACPR wording.

## Section 7: Final Design Summary And Non-Claims

Stage 4H proves a property of a recorded replayed evidence pack, not the model,
not the live system, and not reality.

Design status: Stage 4H is design-locked and build-ready, but not implemented,
merged, tagged, or released until Q0-Q7 pass in the repo.

The final design is a repo-native proof-carrying explicit data-flow integrity
verifier over Stage 4D base-pack views. It recomputes canonical premises from
signed replay material, validates a supplied derivation against those premises,
binds the certificate back into the signed pack manifest, and reports Q0-Q7
through deterministic raw verifier, harness, and Stage 4 exit-code layers.

Stage 4H does not claim:

```text
model safety
jailbreak immunity
execution truth
full semantic non-interference
implicit-flow security
policy correctness
future-run guarantees
coverage of unmediated actions
coverage of missing, unrecorded, or incorrectly recorded data-flow edges
PCC-style cheap-check-of-expensive-proof efficiency
public priority status
```

The certificate is useful because it is replay-bound, tamper-evident,
independently checkable, and resistant to prover-side premise laundering within
the signed-pack replay threat model. Its value is forensic auditability and
falsifiability, not broad safety proof.
