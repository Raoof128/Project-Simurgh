# Stage 5I — VPC: Verifiable Panel Coverage (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Version **v2.44.0-stage-5i-vpc** · raw codes **316–331** · branch `stage-5i-vpc`.
> Arc: External Accountability — `VFC (5G) → VSD (5H) → VPC (5I) → VRC (5J) → VUC … (VTC penciled)`.
> VPC = coverage completeness; VRC = rating contest (next rung); VUC = universe commitment;
> VTC = temporal coverage (beast-mode D, split out as its own future rung — a distinct blade).

Thesis being extended: Simurgh is the independent, byte-reproducible VERIFICATION layer for
agent/oversight containment. Every stage adds ONE falsifiable blade. The moat is the Completeness
Invariant (no selective omission) plus academic depth. Honesty guardrail: "the coverage guarantee
held, verifiably" — NEVER "the review was good" or "the model is safe".

---

## §1 — Identity · laws · blade

### The wound (verbatim-anchored, conditional)

RSP v3.4 (effective 8 July 2026) **permits** external review to be divided among multiple
reviewers, provided all parts of the unredacted report are evaluated by at least one external
reviewer:

> "external review of our Risk Reports can involve multiple external reviewers reviewing different
> unredacted sections of the Risk Report, so long as all parts of the unredacted report are
> evaluated by at least one external reviewer." — RSP v3.4

That is a set-cover coverage condition over a review panel. Today nothing proves it held. External
review of frontier risk reports already happens (METR reviewed the Claude Opus 4.6 Sabotage Risk
Report on an unredacted basis and Anthropic revised the report on METR's feedback, 3 Mar 2026), but
that review is **prose** — an executive summary plus PDFs, holistic and unsigned. There is no
offline-recomputable artifact proving that every section was evaluated by at least one reviewer.

### The blade (one geometry)

Over a committed section partition `S` and signed reviewer coverage receipts, the verifier computes
the coverage union and enforces, fail-closed:

```
∀r: C(r) ⊆ G(r) ⊆ S        (grant-bounded)
S ⊆ ⋃ C(r)                 (policy target)
⟹ ⋃ C(r) = S               (computed equality)
coverage_gap = S ∖ ⋃C(r) = ∅   (acceptance)
```

The new object is a **coverage lattice with a policy-mandated equality target, an access-scoping
constraint, and computed reviewer + host independence** — not review logging. in-toto's `threshold`
expresses same-step redundancy (k functionaries, matching artifacts); VPC expresses many-to-many
grant-bounded coverage whose union equals `S`. That composition is the contribution.

**Beast-mode inventions (one code, two projections — each ships its own bound):**

- **A. The Adequacy Gate (`VPC_ADEQUACY_CLAIMED`, 328).** VPC proves coverage and is *structurally
  unable to certify that the review was adequate* — a bundle asserting adequacy/quality/thoroughness
  fails closed **even at full coverage**. The coverage-≠-diligence bound becomes a fail-closed code +
  Lean theorem (`adequacyUnprovable`), not a disclaimer. The purest "admit irregularity over overclaim"
  — and exactly the Wirecard line (their sin was *claimed* adequacy).
- **B. Coverage Depth Census — the fragility map.** A derived projection nobody publishes: per-section
  reviewer multiplicity + the `single_reviewer_sections` set ("this claim rested on one reviewer's
  eyes"). Zero new code path. Non-claim: depth counts independent eyes, not diligence.
- **C. Typed Coverage State — the coordination-theater map.** Per-section `covered / assigned_only
  (promised-undelivered) / unassigned` — surfaces panels that squeak past `⋃C=S` while a grantee
  silently never reported. Zero new code path. Non-claim: `assigned_only` ≠ a coverage gap.

### The three laws (each falsifiable by a hostile reviewer)

1. **No Section Left Unreviewed** — every section in the committed partition appears in ≥1 valid
   receipt attesting *evaluation*; any gap fails closed.
2. **No Phantom Review** — `receipt.sections ⊆ access_grant.sections ⊆ committed_partition`; a
   receipt claiming a section outside its signed grant is void.
3. **No Self-Vouched Reviewer** — reviewer & host separation is *computed* on 5G's rung lattice
   (`distinct_key_only → challenge_bound → externally_anchored`); organisational non-affiliation
   derives from externally-pinned affiliation evidence. A producer-authored affiliation claim
   cannot establish independence regardless of key distinctness.

### Signed bound (up front — the next rung's target)

> VPC proves every committed section has ≥1 valid, access-authorised, independently attributable
> reviewer attestation **of evaluation**. It does **not** prove reviewer diligence, analytical
> quality, correctness, motive-neutrality, or completeness beyond the committed section universe.

### Socket ledger (at the shipped `challenge_bound` release posture)

- **PAYS** `producer_affiliation_deferred` (5G) + `secure_review_host_independence_deferred` (5H) —
  each **at the rung actually achieved** (`challenge_bound` for separation; externally-pinned for
  affiliation). Closeout states the reviewer and host rung independently.
- **CHIPS** `real_risk_report_pilot_deferred` (5H) via real Lane C (public structure only).
- **MINTS** `reviewer_assessment_contest_deferred` (→ VRC) + `uncommitted_section_universe_deferred`
  (→ VUC). Ledger flat: 2 mints, 2 pays.
- **REMAINS OPEN** `real_sigstore_anchor_execution_deferred` (5G) + `consequence_self_rating_contest_deferred`
  (5H) → VRC.

---

## §2 — Artifact schema · raw codes · frozen check order

### §2.1 Signed objects (four in-bundle classes + one external assertion + reused 5G evidence)

No signature field is included in the content covered by that same signature (reviewers signing
their own receipts is role-correct, not self-signing).

```
A. sectionPartitionCommitment    DOMAIN.partition   (producer/coordinator key)
   { source_report:{ title, source_digest, redaction_taxonomy:["misuse_risk","commercial_proprietary"] },
     partition_procedure:{ id:"toc-leaf-partition", version:"1" },
     producer_principal:{ identity_subject, public_key_pem, key_fingerprint,
                          anchor_type, anchor_subject, producer_identity_digest, subject_distinct },
     sections:[ { section_id, canonical_path, redaction_types:[] } … ] }   // canonical (NFC+path), dedup'd
   partition_digest = domainDigest(DOMAIN.partition,
       { source_report, partition_procedure, producer_principal, sections })   // excludes itself

B. accessGrant (1 per reviewer)  DOMAIN.grant       (issuer key)
   { reviewer_principal:{ key_fingerprint },
     review_host_identity_ref:{ identity_subject, key_fingerprint, identity_digest },   // resolves vs host registry
     host_independence_evidence_digest, granted_sections:[…],                            // G(r) ⊆ S
     partition_digest, issued_by:{ key_fingerprint } }

C. coverageReceipt (1 per reviewer)  DOMAIN.receipt (reviewer key)
   { reviewer_principal:{ key_fingerprint },
     review_host_identity_ref:{ identity_subject, key_fingerprint, identity_digest },
     grant_digest, evaluated_sections:[…], reviewer_attests_evaluated:<bool>,           // schema accepts false
     independence_evidence:{ separation_evidence_digest,
                             affiliation_assertion_digest, host_independence_evidence_digest } }
     // NO declared rung — verifier recomputes vpcSeparation(separation_evidence); any embedded value is display-only

D. panelCoverageAttestation      DOMAIN.attestation (Simurgh verifier key ≠ all other roles)
   { partition_digest, policy_digest, panel_evidence_root, trust_context_digest,
     counted_reviewers:[ { key_fingerprint, reviewer_separation_strength,
                           host_separation_strength, independence_valid } ],
     coverage_union:[…sorted…], coverage_gap:[…], equality_holds, verdict,
     coverage_depth:{ per_section:{…}, min_depth, single_reviewer_sections:[…] },   // BEAST B (projection)
     section_states:{ covered:[…], assigned_only:[…], unassigned:[…] } }            // BEAST C (projection)
   // PROHIBITED (any presence → 328 VPC_ADEQUACY_CLAIMED): adequate | sufficient | thorough |
   // review_quality | approved | endorsed | certified_safe — VPC refuses to carry an adequacy assertion.

External signed object (fifth domain — real, not a receipt field):
   affiliationAssertion   DOMAIN.affiliation   (externally-pinned issuer key)
   { subject_key_fingerprint, subject_identity_digest, producer_identity_digest,
     relationship:"independent_of_producer", anchor_lineage_digest, partition_digest,
     issued_by:{ identity_subject, key_fingerprint } }
```

**Externally-supplied config (outside the bundle):** `affiliation_anchor_registry` (pinned issuers +
anchor lineages), `reviewer_key_registry`, `host_registry`, `verifier_key_pin`, and the pinned
`policy`. Full identity is embedded **once** at the partition root (`producer_principal`); everywhere
else is a pinned reference.

**Policy schema** (governs the release claim via `policy_digest`):

```
{ required_reviewer_separation, required_host_separation,   // = challenge_bound at release
  min_reviewers, require_nontrivial_partition,
  min_distinct_hosts, require_distinct_anchor_lineage }     // beast-mode B/C
```

Release profile `vpc-release-challenge-bound-v1`:
`required_reviewer_separation = required_host_separation = challenge_bound`, `min_reviewers ≥ 2`,
`require_nontrivial_partition = true`, `require_distinct_anchor_lineage = true`.
Test profile `vpc-test-externally-anchored-v1` exercises the rung-2 verifier path with **disjoint,
synthetic-deterministic** anchors that cannot appear in the Lane C registry; it proves verifier
support only and pays nothing.

**Five domain separators, each consumed by a named check** (no dead domains): `partition.v1`→320,
`grant.v1`→321/322, `receipt.v1`→323/324, `affiliation.v1`→326, `attestation.v1`→329.

**Independence is computed, never declared.** VPC **re-instantiates** 5G's rung-lattice *pattern*
(`rungLattice.mjs` composing `checkKeySeparation` → `checkChallengeBinding` → `checkAnchorBinding`)
for the reviewer and host principals — it is NOT a drop-in import (5G's checks are bound to VFC's
producer/capture bundle shape). `vpcSeparation(evidence) → rung` is a new function following that
proven structure; identity digests reuse the real `identityDigest(identity, role)` helper. Any rung
value embedded in a receipt is display-only and ignored.

### §2.2 Object-graph + census closure (no silent filtering)

```
R_candidate = reviewers with exactly one valid receipt AND exactly one matching valid grant
              (grant_digest resolves to exactly one; grant.reviewer==receipt.reviewer;
               grant.host==receipt.host; every evidence-ref digest resolves exactly once;
               no duplicate/orphan grant or receipt)
checks 324, 325, 326 run over EVERY r ∈ R_candidate   (a weak member is a typed failure, not a quiet drop)
only if all pass:  R_eligible = R_candidate
coverage:  ⋃ C(r) for r ∈ R_eligible ONLY              (never from the attestation's declared set)
```

Hard rejects (raw 316): duplicate `section_id` / `canonical_path` (after NFC + path canonicalization),
duplicate grant/receipt entries, non-canonical array order, unknown redaction enums.

### §2.3 Role-collision matrix

Two distinct issuer roles: `grant_issuer` (accessGrant `issued_by`) and `affiliation_issuer`
(affiliationAssertion `issued_by`). `affiliation_issuer == producer` would let the producer vouch for
their own reviewer's independence — the exact self-vouch VPC bans — so it is prohibited AND the pinned
`affiliation_anchor_registry` MUST exclude the producer identity (enforced in 326).

```
Prohibited:  verifier ≠ {producer, grant_issuer, affiliation_issuer, reviewer, host}
             reviewer ≠ {producer, grant_issuer}       host ≠ producer
             affiliation_issuer ≠ producer   (and ∉ producer-controlled: pinned registry excludes producer)
Allowed (listed, not inferred):  reviewer == host  ⟹  host_separation is non-additive
```

`require_distinct_anchor_lineage` (release): no two counted reviewers share an `anchor_lineage_digest`.

### §2.4 Raw codes 316–331 (house-partitioned; wrapper LAST; `UNKNOWN_RAW_PROBE=999` above the block)

Global `exitCodes.mjs` (not stage-local); ripples the 2 `exit-map.json` goldens + the exitWrapper
inline map. **Plan MUST enumerate the full ripple surface empirically** (`grep` every file embedding
the code array / a code count) before Task 1 — repo history shows additive codes broke 5–6 goldens
total, wider than exit-maps alone. Codes 316–330 map to exit 1; 331 → exit 3.

**Public first-failure scan (316→328):**

| Raw | Name | Law |
| --: | --- | --- |
| 316 | `VPC_MALFORMED_BUNDLE` | (schema / canonical form / uniqueness / required objects) |
| 317 | `VPC_EXTERNAL_CONFIG_INVALID` | (empty/malformed cfg or policy_digest mismatch; *undefined/unavailable* → 331) |
| 318 | `VPC_EMPTY_PANEL` | (zero candidate reviewers) |
| 319 | `VPC_SIGNATURE_OR_ROLE_BINDING_INVALID` | (sig invalid / signer≠role / prohibited collision) |
| 320 | `VPC_PARTITION_COMMITMENT_INVALID` | (partition_digest ≠ recompute over source+procedure+producer) |
| 321 | `VPC_OBJECT_GRAPH_OR_REFERENCE_INVALID` | (ref resolution, role match, no dup/orphan — derives census, no attestation compare) |
| 322 | `VPC_GRANT_EXCEEDS_PARTITION` | `G(r) ⊄ S` |
| 323 | `VPC_RECEIPT_EXCEEDS_GRANT` | **No Phantom Review** (`C(r) ⊄ G(r)`) |
| 324 | `VPC_NON_EVALUATION_RECEIPT` | (counted receipt lacks `reviewer_attests_evaluated == true`) |
| 325 | `VPC_UNDER_SEPARATED_PRINCIPAL` | No Self-Vouched Reviewer (reviewer or host `separation < required`) |
| 326 | `VPC_SELF_VOUCHED_AFFILIATION` | **No Self-Vouched Reviewer** (subject ∧ producer-bound ∧ partition-bound ∧ relationship ∧ issuer externally pinned ∧ `affiliation_issuer ≠ producer`) |
| 327 | `VPC_SECTION_LEFT_UNREVIEWED` | **No Section Left Unreviewed** (`coverage_gap ≠ ∅`) — headline |
| 328 | `VPC_ADEQUACY_CLAIMED` | **No Adequacy Overclaim** (BEAST A — any adequacy/quality/thoroughness/certification assertion present → fail closed, *even when coverage holds*) |

**Audit-only `[329]`:** `VPC_ATTESTATION_MISMATCH` — declared `{counted_reviewers, coverage_union,
coverage_gap, equality_holds, verdict, coverage_depth, section_states, panel_evidence_root,
trust_context_digest}` ≠ recompute.
**Policy `[330]`:** `VPC_POLICY_REJECTED` — `min_reviewers`, `require_nontrivial_partition`,
`min_distinct_hosts`, `require_distinct_anchor_lineage` (NOT rung; 325 owns that).
**Wrapper (outside scan):** 331 `INTERNAL_OR_ENV_UNAVAILABLE_VPC`.

`⋃C ⊆ S` (invented sections) needs no own code — 322 + 323 make it transitive.

### §2.5 Frozen first-failure check order (code order = check order)

```
Public scan
 1 316  schema, canonical forms (NFC+path), uniqueness, required objects
 2 317  external registries, pins, policy_digest valid & internally consistent
 3 318  ≥1 receipt/reviewer candidate
 4 319  signatures, signer-role bindings, prohibited collisions
 5 320  partition commitment digest recomputes (binds source+procedure+producer_principal)
 6 321  object graph + reference closure (derives R_candidate; no attestation compare)
 7 322  ∀r: G(r) ⊆ S
 8 323  ∀r: C(r) ⊆ G(r)                                   ← No Phantom Review
 9 324  ∀ r∈R_candidate: reviewer_attests_evaluated == true
10 325  ∀ r∈R_candidate: reviewer AND host separation recompute & ≥ policy
11 326  ∀ r∈R_candidate: affiliation subject/producer/partition/issuer/relationship valid  ← No Self-Vouched Reviewer
12 327  ⋃C(r) over R_eligible == S                        ← No Section Left Unreviewed (headline)
13 328  no adequacy/quality/thoroughness/certification assertion present  ← No Adequacy Overclaim (fails even if 327 passed)
── outside the public scan ──
A 329  (audit) declared attestation {roots, census, union, gap, verdict, depth, states} == recompute
P 330  (policy) min_reviewers, non-trivial partition, min_distinct_hosts, distinct anchor lineage
W 331  (wrapper) total fail-closed
```

The public result's verdict and coverage fields are **verifier-derived**; the signed attestation
fields are declarations only until audit check 329 confirms exact equality.

**Tier/phase semantics (pinned):** the full pipeline is the frozen total order
`316→328 (public) → 329 (audit-only) → 330 (policy) → 331 (wrapper)`, first-failure-wins across all
phases (this is the ordered predicate list T7 quantifies). **Policy (330) runs in BOTH tiers** — the
anti-sockpuppet checks (`min_reviewers`, `require_distinct_anchor_lineage`, `require_nontrivial_partition`,
`min_distinct_hosts`) gate the public verdict, not just audit; only 329 is audit-exclusive. A
public-tier verify therefore evaluates `316→328` then `330` (skipping 329).

---

## §3 — Evidence lanes · attestation · parity · Lean surface

### §3.1 Three lanes (A byte-stable CI · B deterministic ceremony · C live, digest-only)

**Lane A — byte-stable synthetic panel (CI-gated).** 8-section partition `S`; 3 independent
reviewers (distinct keys + externally-pinned affiliation); grants partitioning `S`; union `= S` →
verifies **raw 0 public + audit**. Tamper matrix, each fixture `structuredClone → mutate one fact →
re-sign every affected object + attestation → assert the intended first raw code` (so mutations do
not collapse into 319):

```
drop a section from all coverage        → 327     receipt claims section outside grant   → 323
affiliation issuer absent from registry → 326     under-separated reviewer/host          → 325
attestation census/union/depth mismatch → 329     duplicate section_id (post-NFC)        → 316
3 reviewers, policy.min_reviewers = 4   → 330     policy not matching policy_digest      → 317
reviewer_attests_evaluated = false      → 324     orphan receipt / unresolved grant      → 321
verifier key == host key                → 319     two reviewers share anchor_lineage     → 330
covered panel asserts "review adequate" → 328     (adequacy overclaim fails even at ⋃C=S)
```

**Fixtures named after real incidents (the failures VPC makes impossible).** The `wirecard-*`
family models the EY/Wirecard sign-off (EY signed audits whose evidence came from the audited party's
own screenshots, not an independent source): a coverage receipt whose `affiliation_issuer` traces to
the producer → **326**, and a receipt claiming a section its grant never covered → **323**. Wirecard
also carries a *diligence* failure ("signed off without doing the work") — that dimension is
explicitly **VRC's**, not VPC's, and citing it sharpens the coverage-≠-diligence bound rather than
overclaiming it.

Plus the **test-only rung-2 fixture** (`vpc-test-externally-anchored-v1`, disjoint synthetic
anchors) proving verifier support for `externally_anchored` — pays nothing. Built twice, `cmp`
byte-identical. Evidence dir prettier-ignored.

**Lane B — deterministic multi-process panel ceremony.** Processes `issuer + reviewerA + reviewerB +
verifier`; `≥2` reviewers, `∀r: C(r) ⊂ S`, `⋃C = S`; each reviewer sees only its signed grant. Fixed
keys/seeds ⇒ reproducible. Not in `npm test`; **run by the Stage 5I reproduce script and enforced by
CI/release** (an ungated ceremony rots). The ceremony receipt is the same species as the bundle
receipt.

**Lane C — real Opus 4.6 structure (live generation, verify-only, completed-campaign gated).**
Section partition derived from the **public structure** of the published Claude Opus 4.6 Sabotage
Risk Report via the frozen `toc-leaf-partition` procedure over a **committed offline source snapshot**
(source/TOC snapshot + original report digest + deterministic parser + canonical partition output —
URL+digest alone is not offline-reproducible). `producer_principal` is a **modeled, honestly-labeled**
identity. Redaction taxonomy is **report-level** (`redaction_taxonomy`); per-section `redaction_types`
stays `[]` unless the public report visibly ties a redaction to a section. The droplet team plays
`≥2` independent review hosts/reviewers (own keys ≠ verifier), files grants + receipts with `⋃C = S`,
recompute byte-identical on the deterministic surface. The **challenge is issued and signed by the
Simurgh verifier key** (freshness); the coverage receipts are signed by the droplet reviewer/host
keys we do not hold (independence). Challenge evidence is bound to **this** ceremony
(`partition_digest, policy_digest, reviewer/host identity, campaign_id, panel_evidence_root`) — never
a reused 5G challenge. **Two axes, reported separately and honestly:** reviewer & host **separation**
reach a REAL `challenge_bound` (distinct droplet keys binding our fresh challenge); the **affiliation**
axis is exercised with a **MODELED anchor** — there is no real third-party organisational-affiliation
authority attesting independence from a *modeled* producer, so Lane C does not claim real
externally-anchored non-affiliation (that path needs a real producer + a real affiliation authority). `campaign-outcome.json` (`status/campaign_id/evidence_root`): `completed` ⟹ dir + sigs +
external config + verify all present; missing record fails; non-completed states carry typed reasons;
the release gate requires `completed`.

**Non-observation (signed):** Lane C proves `public_report_structure_coverage`, **never**
`rsp_unredacted_report_compliance`. We do not model, reproduce, or attest METR's review, nor
Anthropic's confidential report or actual review panel; METR is cited only as published evidence
that external review of this report occurred.

### §3.2 Attestation — two-tier, evidence-graph-bound

Public tier verifies 316→328 + verdict; audit tier adds 329. `panel_evidence_root` = canonical
sorted manifest over {partition, grant, receipt, affiliation-assertion, reviewer-separation,
host-separation digests}; `trust_context_digest` = over {policy, reviewer/host/affiliation-anchor
registries, verifier pin}. Signature = `Ed25519(DOMAIN.attestation ‖ canonicalJson(attestationContent))`.
Byte-stable surface = `{partition_digest, policy_digest, panel_evidence_root, trust_context_digest,
canonical(counted_reviewers), coverage_union, coverage_gap, equality_holds, verdict, coverage_depth,
section_states}`. The two **projections are recomputed and root-bound** (BEAST B/C): `coverage_depth`
(per-section reviewer multiplicity + `min_depth` + `single_reviewer_sections` — the fragility map) and
`section_states` (per-section `covered`/`assigned_only`/`unassigned` — the coordination-theater map)
are derived over `R_eligible`, checked by 329, never a separate claim. Reviewer sigs differ per key ⇒
never byte-compared.

### §3.3 Parity — `vpcCore` pure, owns the raw order

Per-runtime adapters (Node `crypto` / browser SubtleCrypto / Python `cryptography`) **only** parse
keys, verify signatures, resolve registries → normalized crypto facts. `vpcCore` owns the frozen
316–330 evaluation order, census, the rung-lattice separation computation (`vpcSeparation`),
union/gap/verdict, and the depth/state projections. Canonical key input
= **SPKI-DER digest** (PEM normalized before fingerprint compare — avoids the newline ghost). Parity:
**exact 316–330** across Node/Python/browser; 331 is runtime-specific wrapper behaviour (env-dependent,
not required identical). Browser implements the full portable ordered verifier — no `raw: null`.

### §3.4 Lean surface (11 theorems + reused L1, zero `sorry`)

```
T1  coverage soundness      verify=covered ⟹ ⋃_{r∈R_eligible} C(r) = S
T2  no phantom review       covered ⟹ ∀r∈R_eligible: C(r) ⊆ G(r)
T3  no silent filter        covered ⟹ R_eligible = R_candidate
T4  affiliation (strong)    r∈R_eligible ⟹ affiliationValid r partition producer pinnedRegistry
                            (subject ∧ producer ∧ partition ∧ pinned-issuer ∧ relationship)
T5  producer binding        covered ⟹ ∀r∈R_eligible:
                              referencedAffiliationAssertion(r).producer_identity_digest
                                = partition.producer_principal.producer_identity_digest
T6  equality decomposition  let U=⋃C(r); U⊆S (from T2 ∘ G⊆S); gap=S∖U; (U=S ↔ gap=∅)
T7  firstFailureUnique      over the frozen predicate list, the first-failing predicate ⟹ a unique raw code
T8  census recompute (audit) 329 pass ⟹ counted_reviewers = canonical(R_eligible)
T9  two-tier monotonicity   auditPass ⟹ publicPass   (strictness witnessed constructively by the raw-329 fixture)
T10 evidence-root binding   auditPass ⟹ declared {panel_evidence_root, trust_context_digest, depth, states} = recomputed
T11 adequacyUnprovable      (BEAST A) covered ∧ verify=0 ⟹ the bundle asserts NO adequacy/quality predicate;
                            coverage ⊬ adequacy — the artifact is structurally unable to certify review quality
L1  separation monotone     the vpcSeparation rung lattice is monotone — PROVED FRESH for VPC's
                            reviewer/host principals, following (not importing) 5G's lemma structure
```

The **depth and state projections carry no theorem** — they are reported derivations, not gated
claims (BEAST B/C); their only guarantee is recomputation-equality under 329.

---

## §4 — Non-claims · signed limitations · wedge · scorecard

### §4.1 Non-claims (each invention ships its bound in the same breath)

- **Coverage is access + attestation-of-evaluation, not diligence, quality, correctness, or
  motive-neutrality.** (Headline bound → VRC.)
- **`challenge_bound` ≠ `externally_anchored`.** Separation reached `challenge_bound`; organisational
  non-affiliation was established via externally-pinned affiliation evidence — two axes, reported
  separately, never merged.
- **`public_report_structure_coverage` ≠ `rsp_unredacted_report_compliance`.** Lane C does not observe
  Anthropic's confidential report or actual review process, and does not model METR's review.
- **Redaction taxonomy is report-level**, not per-section, unless the public report visibly ties a
  redaction to a section.
- **The rung-2 fixture proves verifier support, not real anchored execution** (synthetic-deterministic,
  disjoint anchors, pays nothing).
- **Anti-sockpuppet is enforced, not assumed:** at `min_reviewers ≥ 2` the release policy rejects
  reviewers sharing a principal key (321) or an anchor lineage (330) — a failure in-toto's `threshold`
  and CODEOWNERS accept.
- **The adequacy gate is structural, not a disclaimer (BEAST A).** VPC is *unable to certify* that a
  review was adequate, sufficient, thorough, or good; a bundle asserting any such predicate fails
  closed (328), even at full coverage. Coverage ⊬ adequacy is a code + Lean theorem, not a footnote.
- **Coverage depth counts independent eyes, not diligence (BEAST B).** `single_reviewer_sections` marks
  where oversight is thin — a fragility map — NOT that thin sections are wrong or deep sections right.
- **A section state of `assigned_only` is not a coverage gap (BEAST C).** It flags a grant with no
  returned receipt (coordination fragility, possibly covered by another reviewer); only `unassigned`
  left uncovered trips 327. The state map diagnoses theater; it does not itself fail.
- **Not category-creating.** RSP v3.4 defines the coverage rule; VPC is its executable, byte-reproducible
  verifier. Public wording stays provider-agnostic.

### §4.2 Signed limitations

1. Coverage ≠ diligence/correctness/quality of review → `reviewer_assessment_contest_deferred` (VRC).
2. Reviewer & host separation reached **`challenge_bound`**, not `externally_anchored` →
   `real_sigstore_anchor_execution_deferred` stays open. (Path (a): a real Lane C Sigstore-OIDC anchor,
   offline-cross-binding verified, rungs recomputing as `externally_anchored`, would pay it.)
3. Lane C is **public-structure-only**; the confidential partition and real reviewer signatures were
   not observed. Its **affiliation axis is modeled** (no real third-party organisational-affiliation
   authority for a modeled producer) — only the reviewer/host **separation** axis (`challenge_bound`)
   is real. Real externally-anchored non-affiliation needs a real producer + a real affiliation
   authority (a process-owner pilot).
4. Section universe is **producer-committed** — selective/gerrymandered universe is not caught here →
   `uncommitted_section_universe_deferred` (VUC).
5. Producer's declared **consequence self-rating is not contested** here →
   `consequence_self_rating_contest_deferred` (VRC).
6. **Coverage is not timestamped.** VPC does not prove a section was evaluated *before* release — a
   receipt could be back-dated post-incident. This is deliberately a **separate blade** (beast-mode D,
   temporal binding to the 4N heartbeat has its own attack surface) → penciled future rung **VTC**, not
   a minted socket (ledger hygiene).

(Closeout baseline & environmental exceptions — e.g. any pre-existing unrelated failing test — are
recorded in release evidence, not here.)

### §4.3 The wedge

> RSP v3.4 permits external review to be split across multiple reviewers provided every part of the
> unredacted report is evaluated by at least one reviewer. VPC turns that policy condition into an
> offline-recomputable relation over a committed report partition, signed access grants and reviewer
> receipts. It additionally rejects beyond-grant coverage, silently excluded panel members,
> under-separated reviewer or host identities, and producer-vouched affiliation. Lane C exercises this
> mechanism over the public structure of the Claude Opus 4.6 Sabotage Risk Report; it does not observe
> Anthropic's confidential report or actual review process.

**Not an Anthropic-only wound — multi-regulator, provider-agnostic.** The EU AI Act (Art. 55) +
GPAI Code of Practice (Safety & Security chapter) require systemic-risk providers to run model
evaluation including adversarial red-teaming that "may include independent external experts," and the
Code expects independent third-party red-teamers covering a fixed capability taxonomy — a coverage
scope over risks, mirroring VPC's coverage over sections; systemic-risk enforcement is reported to
begin **August 2026**. Twelve labs have published safety frameworks (Anthropic RSP, OpenAI
Preparedness, DeepMind Frontier Safety v3.1). The academic literature already names the gap:
_"Third-party compliance reviews for frontier AI safety frameworks"_ (arXiv 2505.01643) argues it
"often remains unclear whether frontier AI companies actually adhere to their frameworks"; STREAM
(2510.20927) and the AI Transparency Atlas (2512.12443) **score** model-card completeness; the FLI AI
Safety Index (Summer 2025) finds evaluation/limitations/risk sections "frequently omitted." VPC is the
recompute layer under all of these — the thing that turns "was every part reviewed?" into a signed,
offline-recomputable answer.

**Prior-art seam (scoped search):** no mechanism combines many-to-many grant-bounded reviewer→section
coverage + computed reviewer AND host separation + externally-anchored non-affiliation + no-silent-filter
census + independent public recompute of a signed attestation. in-toto's `threshold` = same-step
redundancy; SCITT/RFC 9943 registers signed statements (VPC = a registrable profile); CODEOWNERS/Gerrit
give forge-hosted path coverage without computed independence or offline recompute; C2PA binds asset
provenance; RATS attests platform state; STREAM / AI Transparency Atlas **score** completeness but emit
no signed coverage attestation with anti-phantom/anti-sockpuppet independence; the third-party-review
literature (2505.01643) **proposes** such review but supplies no byte-reproducible verifier.

**Founder's ledger — one actor, one blocker:** an assurance/governance team (or an external reviewer)
validating that a real split-review met the RSP guarantee could run `vpcCore` tomorrow; the single
blocker is emission of real signed grants + receipts from the review process (the format exists; the
process owner must produce the receipts).

### §4.4 Four-axis scorecard (spec-time, post-sweep; re-scored honestly at closeout)

| Axis | Spec-time | Rationale / what moves it higher |
| --- | ---: | --- |
| **Novelty** | **9.0** | Composition is unprecedented in the scoped search AND ships a new object no neighbour has: a coverage verifier structurally unable to certify its own adequacy (`adequacyUnprovable` theorem, beast-mode A), plus the depth/state projections nobody publishes. Discount held because the primitives (set-cover, threshold sigs) are known. → **9.3** if a broader sweep confirms no equivalent composition and the adequacy-gate theorem class proves genuinely first-of-kind for oversight. |
| **Frontier** | **9.0** | Anchor 3 days old, real named report corpus, real Lane C `challenge_bound` execution planned with the independent droplet team. → **9.4** on executing real Lane C; higher on the (a) Sigstore upgrade. |
| **Good-for-Anthropic** | **9.3** | Direct substrate for RSP v3.4's split-review regime with a named report; discount because Lane C is real-structure not a process-owner pilot. → **9.6** on completed Lane C + a concrete SCITT/profile integration mapping; → **10** on a real assurance-team or external-reviewer pilot. |
| **Constitution** | **9.2** | Mechanises "every section reaches a reviewer" — completeness applied to oversight itself; no selective review. → **9.5** when bound to review quality/truth (VRC). |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it implies no Anthropic
review, adoption, or endorsement._

---

## References (primary, pinned)

- Anthropic (2026) _Responsible Scaling Policy, version 3.4_, effective 8 July 2026.
- Anthropic (2026) _Sabotage Risk Report: Claude Opus 4.6_, published 11 Feb 2026 (revised 3 Mar 2026).
- METR (2026) _Review of the Anthropic Sabotage Risk Report: Claude Opus 4.6_, 12 Mar 2026.
- IETF (2026) _RFC 9943: An Architecture for Trustworthy and Transparent Digital Supply Chains_ (SCITT).
- in-toto (2024) _Specification v0.9_ — layout, functionaries, threshold, step verification.
- C2PA (2026) _Technical Specification v2.4_. IETF (2023) _RFC 9334: RATS Architecture_.
- EU (2024) _AI Act, Article 55_ + GPAI Code of Practice, Safety & Security chapter (systemic-risk
  enforcement reported from Aug 2026). DeepMind _Frontier Safety Framework v3.1_; OpenAI _Preparedness Framework_.
- arXiv **2505.01643** _Third-party compliance reviews for frontier AI safety frameworks_;
  **2510.20927** _STREAM_ (ChemBio eval reporting); **2512.12443** _AI Transparency Atlas_ (model-card
  completeness scoring). FLI _AI Safety Index, Summer 2025_.
- Wirecard/EY audit sanction (BaFin/APAS, 2023): €500k fine + 2-year public-interest audit ban;
  evidence sourced from the audited party — the real-world coverage/independence failure (reported).
