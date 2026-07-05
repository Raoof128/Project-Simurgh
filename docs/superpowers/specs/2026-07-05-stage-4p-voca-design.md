# Stage 4P — VOCA/CPC: Verifiable Origin-Custody Attestation

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Date:** 2026-07-05
- **Status:** DESIGN — approved section-by-section in brainstorm; awaiting plan
- **Stage identity:** Stage 4P = VOCA/CPC. Delivers the previously reserved CPC
  mechanism (cross-provider corroboration by digest equality) as the custody-class
  corroboration layer of VOCA.
- **Subtitle:** The No-Ghost-Provider Law for proxy-laundered model access.
- **Target version:** `v2.25.0-stage-4p-voca` (verified: latest tag is
  `v2.24.0-stage-4o-vtsa`).
- **Raw codes:** 67–79 (verified free: Stage 4N owns 47–54, Stage 4O owns 55–66).

---

## 1. Frozen claim

> Stage 4P verifies that a model or tool request was routed through a declared
> origin-custody path. Undeclared proxying, declared-vs-observed model identity
> mismatch where evidence exists, account-pool ambiguity, trace-custody expansion,
> unbound relay transforms, tool-surface rewrites, and custody-path laundering are
> refused or ledgered as machine-checkable custody violations under a closed
> raw-code ledger (67–79). Against an uncooperative path, the verifiable outcome is
> the **absence of a valid custody attestation**: 4P makes custody attestation cheap
> for legitimate paths so that its absence is itself the auditable signal.

### 1.1 CPC subclaim

> CPC permits bounded corroboration of shared custody-failure classes through
> digest equality over 4N-window-anchored, entropy-floor-gated evidence digests,
> without committing raw endpoints, prompts, tools, accounts, or hostnames into the
> public evidence bundle, subject to entropy and disclosure-budget rules. A digest
> match shows two evidence bundles share the same committed custody-class digest —
> never legal attribution.

### 1.2 The Origin Custody Law

A request may be accepted only if its recorded custody path is monotone with the
committed custody envelope:

```text
accepted(decision) ⇒ recorded_custody_path ⊑ committed_custody_envelope
otherwise: refused ∨ ledgered_failure   (no silent third path)
```

Plain version: no new provider, relay, account pool, model alias, trace custodian,
or tool-surface custodian may appear after approval unless it is declared, signed,
and delta-bound.

### 1.3 Identity paragraph (frozen)

Stage 4P does not investigate grey-market services, contact illegal endpoints, or
attribute wrongdoing. It verifies declared custody evidence. If a path cannot
produce valid custody evidence, 4P records that absence as the auditable result. A
custody-class match is corroboration of matching committed evidence, not
attribution, accusation, or provider-truth.

### 1.4 The 4L payoff (bounded)

Custody-class digests are the corroborating commitments the reserved 4L
`corroborating_commitments` slot has been waiting for — with two guards:

1. Only entropy-floor-passing custody-class digests populate the slot; low-entropy
   cases emit `degraded_non_matchable` telemetry and do not create CPC commitments.
2. 4P does not rewrite or regenerate old 4L evidence. It emits a forward-compatible
   `corroborating_commitments` field that satisfies the reserved 4L slot schema and
   can be checked by 4P/closeout replay.

## 2. Non-claims (signed into the bundle)

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

Expanded meanings of the six load-bearing additions:

- `not_model_substitution_oracle` — 4P classifies model identity mismatch inside
  controlled/legal evidence lanes; it cannot tell what a hostile hidden upstream
  actually ran.
- `window_anchor_is_public` — the 4N anchor is a **public temporal domain
  separator, not a secret salt**; it does not prevent post-window dictionary
  attacks against low-entropy evidence, which is why the entropy floor exists.
- `match_is_not_attribution` — 3T lineage: a match is not an accusation.
- `disclosure_budget_is_not_privacy_proof` — the budget limits emitted public
  match tokens. It is not an information-theoretic privacy proof and does not
  prevent linkage outside the declared evidence system.
- `not_enforcement_verification` — pincer corroboration (§11.1) is mutual
  consistency between two committed artifacts, not proof either side is truthful.
- `not_legal_compliance_certification` — the vendor custody disclosure (§11.3) is
  an evidence surface, not a certification (4M Article-73 projection lineage).

**Honesty rails:** "custody verified," never "provider honest." No real company
names in synthetic fixtures, evidence payloads, or generated custody examples.
Public sources may be cited in motivation and related work without adopting their
figures as Simurgh claims.

## 3. Motivation and source map

The emerging abuse pattern: discounted AI-API "transfer stations" route users
through pooled or fraudulent accounts, hidden intermediaries, and possibly
substituted models. The user believes `client → official provider → declared
model`; the actual path may be `client → reseller proxy → pooled account → unknown
upstream → unknown trace custody`. The failure is not only unsafe output; the
failure is **unknown custody**. 4P turns grey-market API proxying from an invisible
trust failure into a verifiable origin-custody failure.

| Source                                                              | Role                                                                                                                                               | Position                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zilan Qian, ChinaTalk (2026-05-05) + Tom's Hardware coverage        | Motivating wound: grey-market Claude API resale via proxy networks, stolen credentials, model substitution, data harvesting                        | Cited as motivation only; no figure adopted as a Simurgh measurement                                                                                                                                                                            |
| CISPA Helmholtz audit of 17 proxy services (reported via the above) | Peer-institution empirical anchor for model substitution (proxy "Gemini-2.5" scored 37% vs ~84% official on a medical benchmark)                   | Cited as motivation; not reconstructed                                                                                                                                                                                                          |
| AEX (arXiv:2603.14283)                                              | Closest prior art: signed attestation binding request projections to responses via trusted issuers; supports intermediaries, transforms, streaming | AEX attests the request-output relation **given** a trusted issuer and concedes it "doesn't solve the problem of confirming an endpoint is genuinely official." 4P attests whether the custody path itself stayed inside the declared envelope. |
| IETF RATS (RFC 9334)                                                | Attestation vocabulary: evidence, appraisal, attesters, verifiers, epochs                                                                          | 4P applies attestation to custody paths, not device state                                                                                                                                                                                       |
| in-toto / SLSA                                                      | Signed supply-chain provenance                                                                                                                     | 4P treats a live model/tool request as the artifact whose custody chain must verify                                                                                                                                                             |
| W3C Trace Context / OpenTelemetry                                   | Trace propagation                                                                                                                                  | Trace headers identify requests; 4P asks whether the path was authorised and signed                                                                                                                                                             |
| C2PA                                                                | Content provenance analogy                                                                                                                         | Provenance for model access, not media edits                                                                                                                                                                                                    |
| Brundage et al. 2020 (arXiv:2004.07213)                             | "Verifiable claims" framing                                                                                                                        | Simurgh = concrete mechanism for verifiable enforcement claims                                                                                                                                                                                  |

Novelty claim, kept narrow: **not** "first LLM API attestation" — potentially first
origin-custody attestation for proxy-laundered LLM access with entropy-gated,
4N-window-anchored corroboration evidence.

## 4. Threat model

### In scope

| Adversary                         | Example                                                                 | Raw code |
| --------------------------------- | ----------------------------------------------------------------------- | -------- |
| Undeclared proxy                  | Reseller endpoint forwards to unknown upstream                          | 71       |
| Model substitute (evidence lanes) | Declared model digest vs observed digest diverge                        | 72       |
| Account-pool ambiguity            | Rotating/farmed accounts without declared boundary                      | 73       |
| Trace-custody expansion           | Prompts/outputs retained by undeclared relay                            | 74       |
| Relay transform                   | Proxy rewrites request/response without a receipted, declared transform | 76       |
| Tool-surface rewrite              | Proxy changes tool definitions vs the 4O commitment                     | 75       |
| Custody laundering                | Relay chain omits, reorders, or duplicates hops                         | 78       |
| CPC misuse                        | Below-floor digest emitted, budget exceeded, bad 4N anchor              | 79       |

### Out of scope

```text
breaking TLS
detecting every covert proxy
provider-internal fraud investigation
proving true upstream execution
law-enforcement attribution
buying or testing illegal proxy access
```

## 5. Architecture

Standard Simurgh stage shape; **zero `src/llmShield` changes** (custody
verification is offline over recorded evidence).

```text
request
  → origin custody envelope (committed)
  → relay hop receipt chain (signed per hop)
  → response custody receipt
  → offline custody verifier (closed raw-code ledger 67–79)
  → signed VOCA attestation (+ bounded CPC signals)
```

```text
tools/simurgh-attestation/stage4p/
  core/custodyCore.mjs        pure functions only: schema validation, digests,
                              chain-link check, entropy gate, CPC emission rule,
                              normative check order
  node/build-stage4p-attestation.mjs
  node/verify-stage4p-attestation.mjs
  laneb/                      local custody relay inserted into the 4O MCP harness
proofs/stage4p/OriginCustody.lean
tests/fixtures/llmShield/stage4p/    (evidence dirs fully prettier-ignored)
tests/e2e/llmShield/stage4p/
scripts/reproduce-llm-shield-stage4p.sh
```

Signing: Ed25519, new `stage4p` key, canonicalJson; the attestation signs
`canonicalJson(parse(bundle))` (3M prettier/merge-safety lesson). Any fixture keys
carry `INSECURE_FIXTURE_ONLY` (3M/3O whole-repo private-key audits allowlist).

## 6. Data model

Evidence stores **digests and enums only**. No raw endpoints, prompts, hostnames,
API keys, account IDs, or model secrets. All schemas exact-key validated; both
missing and extra keys fail closed.

### 6.1 `simurgh.origin_custody_envelope.v1`

```json
{
  "schema": "simurgh.origin_custody_envelope.v1",
  "run_epoch": 12,
  "declared_endpoint_digest": "sha256:...",
  "provider_family": "openai|anthropic|local|self_hosted|unknown",
  "provider_identity_digest": "sha256:...",
  "model_identity_digest": "sha256:...",
  "relay_policy": "direct_only|declared_relays_allowed",
  "declared_relay_digests": ["sha256:..."],
  "declared_transform_digests": ["sha256:..."],
  "account_boundary": "single_declared|declared_pool|unknown_disallowed",
  "trace_custody": "provider_only|declared_relay|no_trace_retained|unknown_disallowed",
  "tool_surface_digest": "sha256:...",
  "valid_from_epoch": 10,
  "valid_until_epoch": 20
}
```

### 6.2 `simurgh.custody_hop_receipt.v1` (previous-link only — no forward digests)

```json
{
  "schema": "simurgh.custody_hop_receipt.v1",
  "hop_index": 1,
  "previous_receipt_digest": "sha256:...",
  "relay_identity_digest": "sha256:...",
  "transform_digest": "sha256:...",
  "input_digest": "sha256:...",
  "output_digest": "sha256:...",
  "signature": "base64..."
}
```

Chain rules:

```text
hop_receipt_digest        = H(unsigned hop receipt)
custody_path_digest       = H(ordered list of hop_receipt_digest values)
genesis hop:                previous_receipt_digest == custody_envelope_digest
for hop i > 0:              hop[i].previous_receipt_digest == hop_receipt_digest(hop[i-1])
terminal hop:               output_digest == response_digest
```

### 6.3 `simurgh.custody_receipt.v1` (response custody receipt)

```json
{
  "schema": "simurgh.custody_receipt.v1",
  "request_digest": "sha256:...",
  "response_digest": "sha256:...",
  "custody_path_digest": "sha256:...",
  "model_identity_digest": "sha256:...",
  "relay_chain_digest": "sha256:...",
  "trace_custody_observed": "provider_only|declared_relay|unknown",
  "tool_surface_digest": "sha256:...",
  "receipt_epoch": 12,
  "signature": "base64..."
}
```

### 6.4 `simurgh.custody_class_signal.v1` — two exact-key variants

Matchable:

```json
{
  "schema": "simurgh.custody_class_signal.v1",
  "signal_mode": "matchable",
  "failure_class": "undeclared_proxy_hop",
  "stage4n_window_anchor_digest": "sha256:...",
  "evidence_kind": "relay_spki_sha256",
  "windowed_evidence_commitment": "sha256:...",
  "custody_class_digest": "sha256:...",
  "entropy_floor_bits": 96,
  "disclosure_budget_max_signals_per_window": 4,
  "public_linkability": "bounded"
}
```

`windowed_evidence_commitment` is the **published, window-bound** commitment the
verifier needs to recompute `custody_class_digest` — without it, CPC would be
trust-the-builder. The **raw** `observed_evidence_digest` (`H(relay SPKI)`, 128-bit)
is NEVER published: it is window-independent, so publishing it would let anyone
link two operators across windows by digest equality and defeat §9 arm 3. Binding
the window into the published commitment keeps CPC both verifier-grade and
cross-window-unlinkable.

Degraded:

```json
{
  "schema": "simurgh.custody_class_signal.v1",
  "signal_mode": "degraded_non_matchable",
  "coarse_failure_class": "undeclared_proxy_hop",
  "stage4n_window_anchor_digest": "sha256:...",
  "entropy_floor_bits": 96,
  "observed_entropy_bits": 0,
  "public_linkability": "none"
}
```

Rules: a matchable signal MUST contain `custody_class_digest`; a degraded signal
MUST NOT; both variants exact-key validate; violations are raw 79.

### 6.5 CPC digest construction (two-step, verifier-grade)

```text
windowed_evidence_commitment =                         # PUBLISHED
  sha256(canonicalJson({
    domain: "SIMURGH_STAGE4P_WINDOWED_EVIDENCE_V1",
    stage4n_window_anchor_digest,
    observed_evidence_digest                           # PRIVATE input, never published
  }))

custody_class_digest =                                 # PUBLISHED
  sha256(canonicalJson({
    domain: "SIMURGH_STAGE4P_CUSTODY_CLASS_V1",
    stage4n_window_anchor_digest,
    failure_class,
    evidence_kind,
    windowed_evidence_commitment,
    entropy_floor_bits,
    disclosure_budget_max_signals_per_window
  }))
```

The verifier recomputes `custody_class_digest` from the published
`windowed_evidence_commitment` and asserts equality — a forged or mismatched
digest is raw 79 `custody_class_recompute_mismatch`. It cannot derive
`windowed_evidence_commitment` (that needs the private `observed_evidence_digest`),
which is exactly what preserves cross-window unlinkability. The 4N anchor is a
**public temporal domain separator / window nonce** — it prevents timeless
precomputation and cross-window linkage, not post-window dictionaries against
low-entropy evidence (see `window_anchor_is_public`).

### 6.6 Deterministic entropy buckets (no probabilistic guessing)

```text
evidence_kind ∈ {
  relay_spki_sha256                       → observed_entropy_bits = 128
  relay_signing_public_key_sha256         → observed_entropy_bits = 128
  declared_relay_instance_key_sha256      → observed_entropy_bits = 128
  self_hosted_relay_public_key_sha256     → observed_entropy_bits = 128
  low_entropy_or_unknown                  → observed_entropy_bits = 0
}
```

The entropy gate is a **precondition of digest construction in `custodyCore`**:
no code path computes a public `custody_class_digest` from below-floor evidence.
The builder cannot emit what the core will not construct; the verifier
independently re-derives the gate (raw 79).

Disclosure budget: `disclosure_budget_max_signals_per_window` is a declared
integer cap on matchable CPC signals per (operator key, 4N window). The verifier
counts emitted matchable signals for that tuple; exceeding the cap is raw 79.
Q8/4K framing: **enforcement of a declared budget, not prevention of linkage.**

### 6.7 Stage 4O surface binding

```text
stage4o_surface_commitment_digest =
  sha256(canonicalJson({
    domain: "SIMURGH_STAGE4P_STAGE4O_SURFACE_BINDING_V1",
    stage4o_manifest_digest,
    stage4o_toolset_digest,
    stage4o_manifest_epoch
  }))

raw 75 check: custody_receipt.tool_surface_digest === stage4o_surface_commitment_digest
```

## 7. Raw-code ledger 67–79

| Raw | Name                             | Mechanism                                              |
| --- | -------------------------------- | ------------------------------------------------------ |
| 67  | custody_envelope_missing         | fails_closed_when_custody_envelope_absent_or_malformed |
| 68  | custody_signature_invalid        | binds_custody_evidence_to_an_accountable_signer        |
| 69  | custody_epoch_invalid            | keeps_envelope_freshness_logical_and_reviewable        |
| 70  | endpoint_origin_mismatch         | prevents_silent_substitution_of_the_declared_endpoint  |
| 71  | undeclared_proxy_hop             | makes_every_relay_hop_a_declared_and_signed_event      |
| 72  | model_identity_mismatch          | ledgers_declared_vs_observed_model_identity_divergence |
| 73  | account_pool_ambiguity           | prevents_undeclared_account_boundary_expansion         |
| 74  | trace_custody_violation          | prevents_silent_trace_custody_expansion                |
| 75  | custody_surface_rewrite          | binds_custody_to_the_stage4o_committed_tool_surface    |
| 76  | relay_transform_unbound          | makes_every_relay_transform_a_receipted_event          |
| 77  | custody_receipt_binding_mismatch | binds_each_receipt_to_the_request_it_records           |
| 78  | custody_path_laundering          | prevents_hiding_custody_hops_by_omission_or_reorder    |
| 79  | cpc_emission_violation           | prevents_public_match_tokens_below_the_entropy_floor   |

### 7.1 Normative check order (first failure wins)

```text
67 → 68 → 69 → 78 → 70 → 71 → 72 → 73 → 74 → 75 → 76 → 77 → 79
```

78 runs immediately after structural validity because an omitted/reordered hop can
mask every downstream mismatch (same precedence argument as 4O drift-laundering).
Determinism is testable: the tamper matrix includes doubly-broken arms asserting
exactly the earlier code fires. Raw 78 re-derives the chain linkage and catches:
missing hop, reordered hop, duplicated hop (same relay/transform/input/output
content replayed in the chain — detected via a content-only replay digest, not the
previous-link receipt digest), non-linking previous digest, terminal response
mismatch.

**Epoch split (raw 69 vs raw 77):** raw 69 is an **envelope-only** property —
`run_epoch ∈ [valid_from_epoch, valid_until_epoch]` — needing no receipt. The
`receipt_epoch === run_epoch` consistency is a **receipt-binding** property and is
checked at raw 77 (after the receipt is schema-validated), so a malformed receipt
fails 77 `receipt_schema_invalid`, never 69.

### 7.2 Exit mapping and schema failures

- All 13 raw codes map to run-level 1.
- Unknown **4P raw codes** map to run-level 3.
- Invalid schema IDs, unknown enum values, missing keys, extra keys, or malformed
  digest fields inside a 4P custody object fail closed as **raw 67** with reason
  `schema_invalid` — unless the object is a malformed receipt, which fails as
  **raw 77** with reason `receipt_schema_invalid`.

### 7.3 Known blast radius (budgeted, not discovered)

13 additive raw codes will break at least six goldens: the 4h exit-map fixture +
evidence + inline wrapper map, 4k/4l unit wrappers, the 4l full-chain e2e (e2e-only
— `npm test` will not catch it), and the 4n/4o nets. Regeneration is an explicit
plan task.

## 8. Lanes

### Lane A — normative modelled custody corpus (the claim source, fully offline)

Arms: 2 green (direct official; declared relay), 13 single-fault (one per raw code,
triggered in isolation), ~6 doubly-broken (first-failure determinism, e.g.
laundering + model swap → 78 not 72), plus boundary arms (epoch edges; unknown
enum → 67/77 per §7.2). All fixture digests **harness-computed, never hand-typed**
(3V-A lesson). Distinct byte patterns for placeholder digests (4M CL(i) collision
gotcha).

### Lane B — legal live relay over the 4O MCP harness

```text
client → local custody relay → 4O MCP/mock provider → manifest-bound tool surface
```

Lane B reuses the Stage 4O live MCP capture harness and inserts a local custody
relay between the client and the 4O MCP/mock provider. The relay capture is frozen
as a digest-only fixture. CI never touches the network. The 4P tool-surface check
runs against the committed 4O manifest/toolset digest, making the 4O→4P binding a
real cross-stage invariant rather than a modelled convenience.

Six frozen captures: clean declared relay (green), undeclared relay inserted (71),
model digest swapped (72), trace custodian changed (74), tool surface rewritten
(75 — against the actual 4O manifest), dropped hop (78).

### Lane C — public-report-motivated synthetic fixture

Lane C is public-report-motivated, not an incident reconstruction, unless the
public record provides enough concrete custody-path facts to build the class
without guessing. One fixture modelled on the publicly reported resale shape
(proxy marketed as premium model, substituted upstream) with fully synthetic
names, ledgering as 71/72 classes. If the facts are insufficient, the green
outcome is `public_report_custody_data_insufficient`. Guessing is the failure,
not the gap.

## 9. CPC corroboration fixture (two-operator synthetic, five arms)

| Arm                        | Setup                                                                                             | Expected                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Match                      | Operators A and B, distinct signing keys, same synthetic hidden relay (same SPKI), same 4N window | identical `custody_class_digest`                                                         |
| Differ                     | Operator C, different relay                                                                       | different digest                                                                         |
| Cross-window unlinkability | Same relay, next 4N window                                                                        | digests differ                                                                           |
| Degraded                   | `evidence_kind: low_entropy_or_unknown`                                                           | `degraded_non_matchable`, no digest; a tampered bundle carrying a digest anyway → raw 79 |
| Budget                     | Matchable signals beyond the declared per-window cap                                              | raw 79                                                                                   |

Frozen rule: Stage 4P emits public CPC match tokens only when evidence is
high-entropy, 4N-window-anchored, and within the declared per-window signal cap.
Otherwise, it emits degraded non-matchable telemetry only.

## 10. Cross-stage bindings (all real, none modelled)

1. **4O:** `tool_surface_digest` checked against `stage4o_surface_commitment_digest`
   (raw 75), exercised live via Lane B.
2. **4N:** `stage4n_window_anchor_digest` must be an inclusion-verifiable entry of
   the 4N heartbeat chain (raw 79 arm).
3. **4L:** entropy-passing CPC digests populate a forward-compatible
   `corroborating_commitments` field satisfying the reserved 4L slot schema.
   4P does not rewrite or regenerate old 4L evidence.
4. **3T:** the optional `custody_extraction_bridge` (§11.4) binds a CPC
   custody-class digest to a 3T extraction-attestation digest — digest binding of
   two independently verifiable artifacts, never causal proof.

```text
4N = public temporal anchor
4O = committed tool surface
4P = custody-class corroboration
```

## 11. Invention layer (U1–U5)

**Closed-ledger rule:** none of these artifacts adds a raw code. Artifact-level
failures map to existing semantics — signature failures reject as 68-class,
window/epoch failures as 69-class, emission-rule violations as raw 79. The
ledger stays 67–79 and the §7.3 blast radius does not grow.

### 11.1 U2 — Dual-side enforcement pincer

The documented credibility gap: provider enforcement claims against proxy
networks are self-attested prose. 4P's CPC layer builds the demand side
(operator herd evidence); this artifact adds the supply-side counterpart:

```json
{
  "schema": "simurgh.enforcement_window_commitment.v1",
  "stage4n_window_anchor_digest": "sha256:...",
  "custody_class_digest": "sha256:...",
  "action_class": "account_cluster_ban|rate_restriction|key_revocation|other_declared",
  "count_commitment": "sha256:...",
  "signer_public_key": "base64...",
  "signature": "base64..."
}
```

Corroboration rule: a custody class is **pincer-corroborated** in window W iff a
provider `enforcement_window_commitment` and at least one operator matchable CPC
signal commit the same `custody_class_digest` under the same 4N window anchor.
Neither side reveals raw data; `count_commitment` is a commitment, not a revealed
figure — no third-party incident figure is ever adopted. Fixtures are synthetic
on BOTH sides. Non-claim: `not_enforcement_verification`.

Tests: pincer arms 3/3 — match (same class + window ⇒ corroborated),
window-mismatch (no corroboration), class-mismatch (no corroboration).

### 11.2 U3 — Relay respondent path v1

```json
{
  "schema": "simurgh.relay_contest.v1",
  "contested_custody_class_digest": "sha256:...",
  "stage4n_window_anchor_digest": "sha256:...",
  "relay_identity_digest": "sha256:...",
  "counter_evidence_digest": "sha256:...",
  "signature": "base64..."
}
```

Rules: a contest must be signed by the key whose digest is
`relay_identity_digest`; it chains append-only into the same timeline (3Q
lineage) and never deletes or mutates the contested signal; the verifier includes
contests in replay. 4M line, verbatim: once a contestable format exists, choosing
an uncontestable one is evidence of weakness.

Constitution mapping: model-identity custody makes the constitution's
honesty-about-identity clauses enforceable at infrastructure level — "users know
which model they are actually talking to" becomes a recomputable property of the
custody chain, not an aspiration.

Tests: contest arms 2/2 — valid contest chains and appears in replay; a contest
signed by a key not matching `relay_identity_digest` is rejected.

### 11.3 U4 — Vendor custody disclosure projection

Industry gap: enterprise AI subprocessor lists are prose; middleware re-routes
silently; no procurement team can recompute the claim.
`simurgh.vendor_custody_disclosure.v1` is an **output projection** (4M
Article-73 pattern) with fields `declared_provider_family`,
`declared_relay_count`, `trace_custody_class`, `verification_result`,
`attestation_digest` — every field recomputable from the attestation, nothing
added. Non-claim: `not_legal_compliance_certification`. This makes the
router/aggregator ecosystem attestable: an honest aggregator can prove it is a
declared relay, and silence becomes the signal.

Test: projection recomputes field-for-field from the attestation; a projection
carrying any field not derivable from the attestation fails closed.

### 11.4 U5 — Custody–extraction bridge

One optional attestation field:

```json
{
  "custody_extraction_bridge": {
    "cpc_custody_class_digest": "sha256:...",
    "stage3t_attestation_digest": "sha256:...",
    "bridge_mode": "digest_binding_only"
  }
}
```

Binds upstream custody evidence (how they got in) to downstream extraction
evidence (what they took — 3T/3U lineage) by digest. The verifier checks both
referenced digests verify independently before accepting the binding. One
synthetic fixture arm. The bridge is a digest binding, **not causal proof**.

U1 (`GhostTrilemma`) lives in the Lean section (§12).

## 12. Lean proofs

`proofs/stage4p/OriginCustody.lean` — self-contained core Lean 4 (no mathlib),
leanprover/lean4:v4.15.0, gated by the existing `.github/workflows/stage-4-lean-proofs.yml`
(name verified in-repo).

| Theorem                  | Statement                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NoGhostProvider_accept` | accepted decision ⇒ recorded_custody_path ⊑ committed_custody_envelope                                                                                                                          |
| `NoSilentThirdPath`      | ∀ decision, accepted ∨ refused ∨ ledgered                                                                                                                                                       |
| `NoCustodyLaundering`    | a hop chain verifies iff it is exactly the committed ordered chain; omission, reorder, duplication, or non-linking previous digest breaks verification (induction over the previous-link chain) |
| `CustodyPathMonotone`    | no custodian (provider, relay, account boundary, trace custodian, tool surface) appears post-approval unless declared and delta-bound                                                           |
| `CpcEmissionBounded`     | a matchable signal exists ⇒ entropy floor met ∧ per-window count ≤ declared cap                                                                                                                 |

`CpcEmissionBounded` is deliberately **not** named "non-disclosure": we prove
emission gating, not non-disclosure. Codes 67–79 also enter
`proofs/stage4/ExitLattice.lean` totality/fail-closed coverage.

U1 — `GhostTrilemma`, the sixth theorem and the stage's centrepiece:

```text
For any recorded exchange mediated by an undeclared relay r, exactly one holds:
  vanish       r produces no valid hop → chain linkage fails → absence/71/78, ledgered
  forge        r signs a hop with a declared key it does not own → excluded by the
               signature-soundness assumption
  self_ledger  r signs with its own key → r's relay_identity_digest enters the
               evidence permanently
```

"The proxy must either vanish, break cryptography, or write itself into the
evidence." Proved as a case analysis over the previous-link chain, under the same
recorded-model boundary. This is the machine-checked laundering-cost structure of
proxy-mediated model access — absence-as-signal upgraded from prose to theorem.

**Signed proof boundary (4J/4O lineage):** the proofs are over the recorded
custody model, not physical network truth.

## 13. Testing matrix and E2E net

| Layer            | Tests                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Schema           | Exact-key validation both variants; bad enums fail closed per §7.2; no raw-identifier leakage |
| Digest           | Domain separation; canonicalJson parity; same value under different domain differs            |
| Hop chain        | Missing/reordered/duplicated/non-linking hop → 78; genesis and terminal rules                 |
| Custody law      | Each raw code in isolation; first-failure order on doubly-broken arms                         |
| Transforms       | Declared transform passes; undeclared transform → 76                                          |
| Model identity   | Declared digest passes; swapped digest → 72                                                   |
| Account boundary | Declared pool passes; undeclared pool → 73                                                    |
| Trace custody    | provider_only declared but relay retained → 74                                                |
| Tool surface     | Digest differs from 4O commitment → 75                                                        |
| CPC              | Five-arm fixture (§9); entropy gate unbypassable in core                                      |
| E2E              | Full signed bundle verifies offline; tamper fails; byte-idempotency holds                     |

**K7-style all-functions E2E net (mandatory before tag):** composes every stage4p
export — core validation, all digest constructors, chain-link check, entropy gate,
CPC construction, check order, builder, verifier, Lane B replay — plus the
per-field tamper matrix, signature tamper, all cross-stage invariants (§10), and
the invention-layer arms (§11),
then the full-chain regression (regenerated 4h exit-map golden, 4k/4l wrappers,
4l full-chain e2e green). The 4P e2e net is explicitly wired into
`scripts/check-e2e.sh` (name verified in-repo; `npm test` gates unit only).

**Privacy scan:** no raw endpoint, hostname, prompt, account ID, private key
material, API key, secret token, or raw relay identifier in any evidence byte;
public verification keys are allowed only in explicit `signer_public_key` fields.

### Evaluation metrics (boring wins audits)

```text
raw-code coverage: 13/13
first-failure determinism: pass (all doubly-broken arms)
green-arm acceptance: all Lane A green arms accepted (exact counts fixed in the
                      implementation plan and frozen into the attestation)
Lane B arms classified: 6/6
CPC fixture arms: 5/5
invention-layer arms: pincer 3/3, contest 2/2, disclosure recompute pass,
                      bridge binding pass
privacy scan: pass
byte-identical reproduction: pass (twice, Node 26)
```

Do **not** measure "proxy detection rate" in the wild; that claim requires
real-world deployment.

## 14. Reproduce and CI discipline

- `scripts/reproduce-llm-shield-stage4p.sh` (naming verified against the
  4H–4O lineage): one command, offline, egress-gated, byte-idempotent twice under
  Node 26 (`/opt/homebrew/opt/node@26/bin`).
- `tests/fixtures/llmShield/stage4p/` and any `evidence/stage-4p` dirs fully
  prettier-ignored (4N reproduce-cmp gotcha).
- No shelling `rg` in unit tests (Linux CI lacks it).
- Overclaim-scan phrasing care on honest negations (4N gotcha).
- Spec/plan committed on a branch, never local main (4O rebase-merge gotcha).
- Neutral commit/PR/release messages throughout.

## 15. Four-axis scorecard (honest; re-score at closeout)

| Axis               | Score   | Why / what moves it higher                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | **9.0** | U1 `GhostTrilemma` (the laundering-cost trichotomy as a machine-checked theorem) and the U2 dual-side pincer are firsts; 4N-window-anchored, entropy-gated custody-class corroboration is new (AEX attests request-output relations and concedes the endpoint-trust gap; RATS/SCITT/in-toto do not touch LLM proxy custody). The envelope/receipt machinery itself is AEX/in-toto-adjacent — that honesty costs a point. Higher: 4P.1 VOPRF/PSI private matching; a genuine second operator corroborating in the wild. |
| Frontier           | **9.0** | The wound is live (May-2026 grey-market coverage; CISPA 17-proxy audit) and nobody has a recomputable evidence format for it. U4 turns prose subprocessor lists into recomputable custody disclosures and makes the router/aggregator ecosystem attestable — an unclaimed gap. Not higher because Lane B is MCP-shaped; HTTP resale shape deferred to 4P.1.                                                                                                                                                            |
| Good-for-Anthropic | **9.5** | The U2 pincer is the missing-appendix format for self-attested enforcement claims: provider commitments and operator herd evidence corroborate by digest equality with no raw data revealed. Directly the Claude grey-market story, answered in Anthropic's interest without disputing or adopting anyone's figures. 10 requires a real operator/provider pilot — adoption cannot be self-awarded.                                                                                                                     |
| Constitution       | **9.0** | Respondent path now IN scope (contestable format) and model-identity custody makes the identity-honesty clauses enforceable infrastructure. Tensions (public anchor, budget-not-privacy-proof) signed as non-claims rather than hidden. 10 requires the contested case exercised for real. Remaining gaps across all axes are pilot-shaped, not design-shaped.                                                                                                                                                         |

**Closeout source discipline:** any closeout score citing AEX, ChinaTalk, Tom's
Hardware, CISPA, RATS, SCITT, or in-toto must include a source-map entry and must
not adopt third-party incident figures as Simurgh measurements.

## 16. Deferred to 4P.1 (signed as limitations, not silently dropped)

```text
http_resale_shape_deferred_to_4p1        HTTP proxy-custody extension (resale shape)
private_custody_corroboration_deferred   VOPRF/PSI private matching upgrade
```

The accused-relay respondent path, originally deferred, moved IN scope as §11.2.

## 17. Suggested implementation shape (feeds writing-plans)

1. Constants, digest core, schema validation (core).
2. Hop-chain verification + check order + raw-code matrix (core).
3. CPC layer: entropy gate, digest construction, budget counting (core).
4. Builder + verifier + signed bundle (node).
5. Lane A corpus + Lane C fixture.
6. Lane B relay over the 4O harness; frozen captures.
7. CPC five-arm fixture.
8. Invention layer (§11): enforcement pincer commitment, relay contest, vendor
   disclosure projection, extraction bridge — schemas + fixture arms.
9. Golden regenerations (§7.3 blast radius).
10. Lean proofs (six theorems incl. `GhostTrilemma`) + exit-lattice extension.
11. K7 E2E net + reproduce script + privacy/overclaim scans.
12. Docs (threat model, validation matrix, reviewer checklist) + docs-accuracy
    pass verifying every doc claim against shipped code.
13. Closeout: four-axis re-score.

## 18. Final safety rail (frozen)

Stage 4P proves properties of recorded custody evidence. It does not prove
physical network truth, provider honesty, real-world attribution, or model
execution identity outside the evidence supplied to the verifier.

Stage 4P classifies custody evidence, not provider truth. A cooperative path can
prove its declared custody envelope. An uncooperative path can only fail to
produce valid custody evidence, which 4P records as the auditable result.

## 19. Closeout re-score (post-implementation)

Evidence checked before scoring: `npm test` 1493/1493; `bash scripts/check-e2e.sh`
13/13; `lean proofs/stage4p/OriginCustody.lean` exit 0 (six theorems, no `sorry`);
Lane A 25/25 arms (13/13 raw-code coverage, 5/5 raw-78 reasons); Lane B 6/6 arms,
tool-surface digest verified against the real Stage 4O manifest commitment
function (not a modelled copy); Lane C 1 fixture (71-class, synthetic); CPC 5/5
arms; invention layer pincer 3/3, contest 2/2, disclosure recompute pass, bridge
binding pass; zero `src/llmShield` diff since `v2.24.0-stage-4o-vtsa`; the offline
verifier (`verify-stage4p.mjs --offline`) passes against the committed bundle with
no keygen step. No task report (1–13) records a descoped capability — the only
deviations logged were fixture-hex-character bugs (Tasks 4, 6) and one field-shape
judgment call (Task 11, `cpc_signals` representative-signal construction), all
resolved without weakening any claim.

| Axis               | Spec | Closeout | Delta notes                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.0  | **9.0**  | `GhostTrilemma` proved exactly as specced (six theorems, `lean` exit 0, no `sorry`); the U2 dual-side pincer shipped and tests green (3/3). No descoping — held at spec.                                                                                                                                                                                                                                                          |
| Frontier           | 9.0  | **9.0**  | Lane B shipped MCP-shaped as declared, binding against Stage 4O's own `manifestCore.mjs` function rather than a copy — a real cross-stage invariant, not modelled. HTTP resale shape remains correctly deferred to 4P.1 (signed non-claim, not new descoping). Held at spec.                                                                                                                                                      |
| Good-for-Anthropic | 9.5  | **9.0**  | The U2 pincer and U4 vendor-disclosure projection shipped and are recomputable, but both sides of every fixture (pincer, contest, disclosure) remain synthetic — no real operator or provider corroborated a class in this stage. That gap was already named in the spec as the ceiling on 10; scoring a fraction below the spec's 9.5 to reflect that the pilot dependency is unchanged by implementation, not newly discovered. |
| Constitution       | 9.0  | **9.0**  | The respondent path (§11.2) shipped with 2/2 contest arms (valid chain + wrong-signer rejection) exercised in fixtures, matching the spec's own caveat that 10 requires the contested case exercised for real. No regression from spec. Held at spec.                                                                                                                                                                             |

**Reading the one delta:** Good-for-Anthropic moves from 9.5 to 9.0, not because
anything shipped short of the plan, but because the spec's own 9.5 assumed the
pincer/disclosure mechanism's persuasiveness before it existed; with the mechanism
now built and reviewed, the honest ceiling is the same one the spec already named
("10 requires a real operator/provider pilot — adoption cannot be self-awarded") —
closeout scoring applies that ceiling one increment earlier than the pre-
implementation estimate did, rather than after a hypothetical pilot attempt.

Source discipline honoured: AEX / ChinaTalk / Tom's Hardware / CISPA / RATS / SCITT /
in-toto cited via §3 source map only; no third-party incident figure adopted.
