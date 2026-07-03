# Stage 4L / CCB — Cluster-Commitment Budgets (Design Spec)

**Date:** 2026-07-03 · **Owner:** Raouf · **Status:** Draft, pending owner review
**Builds on:** Stage 4K/EBA `v2.20.0-stage-4k-eba`, Stage 4H canonicalization/signing/typed-exit wrapper, Stage 4D evidence-pack spine.
**Tag target:** `v2.21.0-stage-4l-ccb` (verify on merged `main` before tagging; check `git tag --sort=-creatordate` first).

---

## 0. Program context (framing, not build scope)

**Master thesis.** AI governance has controls, transparency reports, KYC mandates, third-party
audits, and cross-lab sharing agreements. None of them produce an artifact a third party can
recompute. Simurgh is the replay layer underneath them.

**Why now.** Enforcement claims about coordinated extraction campaigns are feeding directly into
US policy (proposed sanctions amendments) and EU obligations (AI Act Art. 73/55 incident
reporting, enforcement from 2026-08-02) while remaining self-attested and unverifiable. The
canonical framing is Brundage et al. 2020 (*Toward Trustworthy AI Development: Mechanisms for
Supporting Verifiable Claims*, arXiv:2004.07213): Simurgh implements the concrete software
mechanism for verifiable **enforcement** claims that report called for.

**Adjacent lanes (position against, never claim to replace):**

| Lane | Proves | Cannot do |
| --- | --- | --- |
| Anonymous rate-limited credentials (IETF ARC draft; Cloudflare deployment; k-TAA) | Per-credential limits without identity (prevention) | Third-party evidence enforcement held; cluster level; post-hoc disclosure |
| Antidistillation fingerprinting (arXiv:2602.03812) | Student model learned from target (detection, statistical) | Quantify campaign scale; attest provider enforcement |
| TEE attested inference (AEX arXiv:2603.14283; commercial TEE serving) | Per-request computation integrity (hardware trust) | Fleet-wide account-level policy enforcement without infra change |
| SCITT / draft-hillier-scitt-arp (IETF) | Supply-chain claim reconciliation; retroactive policy re-evaluation | Identity-cluster budgets; incentive analysis; extraction domain |
| DSA transparency-report research | Documents that reports are unverifiable | No tooling exists (demand signal, not competition) |

**Program sequence** (this spec builds only the first item):
1. **4L / CCB** — anti-structuring cluster-budget replay (this spec).
2. **4M / VXD** — retroactive re-scoring over signed cluster-merge events (monotone
   anti-laundering lattice; enforcement and audit-evasion become mutually exclusive) + disclosure
   binding + Article-73 template projection as an output surface. Seeded here, specced after 4L ships.
   Formal spine (state in 4L threat model, prove in 4M): cluster assignments are a **partition**
   of consumers; fraud-graph improvements only ever **coarsen** the partition (merge-only
   lattice); exposure is additive over blocks. **Anti-monotonicity lemma:** once any merged
   cluster exceeds its budget in a committed window, every further coarsening containing it also
   exceeds it — retroactive breaches can never be un-discovered by learning more. *Breaches are
   monotone under truth.* This makes the mutual-exclusion incentive argument provable, not
   rhetorical.
   **4M hard requirement — respondent path (adversarial verifiability / due process for the
   accused):** every disclosure carries respondent slots; the accused party can run the same
   offline verifier in `--as-respondent` mode over the public pack, see exactly which committed
   windows and cluster claims implicate them, and file a **signed contest** bound to the same
   digests, chained into the same public timeline as the disclosure. Symmetric honesty: the
   accuser's evidence is replayable, and so is the objection. Game-theoretic property (state in
   4M threat model): once a contestable format exists, choosing an uncontestable one is itself
   evidence of weakness — a truthful accuser gains from giving the accused a microscope. No AI
   enforcement-disclosure format currently offers the accused any verification path.
3. **4N (candidate) — Public Extraction-Telemetry Heartbeat ("Extraction Seismograph").**
   Certificate-Transparency logic applied to extraction pressure: every window, the provider
   publishes to a public append-only log one digest plus three coarse aggregates — total exposure
   mass, the §3.4 cluster-size histogram, and the budget-breach count. No identities, no content;
   three integers and a hash per window. Composes directly from shipped machinery: 3Q hash-chained
   registry + 3X public timeline over 4L window commitments. Changes disclosure from episodic
   prose into an annotation on pre-existing public evidence (a spike on a chart committed before
   the incident was known). Strategic property: **pre-incident commitments cannot be backdated** —
   every uncommitted window is disclosure-credibility a provider can never recover, so the first
   mover gains a credibility asset no competitor can retroactively match.
4. **VFR** — verifiable friction receipts, its own later stage (never merged into 4M; letter
   assigned in the roadmap reconciliation).
5. **Docs-only companion PR** — "Q8/Q9 as the evidence contract for OWASP LLM10:2025 /
   NIST AI RMF MEASURE 2.7" mapping note + roadmap reconciliation (one canonical taxonomy).
6. **4P / CPC** — cross-provider corroboration by digest equality (FMF sharing gap). Seeded here.

---

## 1. Contribution lock

**Defensible claim.** Given a provider's committed cluster assignments, an offline auditor can
recompute that extraction-exposure budgets were enforced at the **cluster** level — catching
**structuring** (one campaign decomposed into many sub-threshold accounts) that per-account
accounting provably misses — without raw identity leaving the provider.

**Structuring (term of art, use throughout).** The adversary decomposes one large extraction
campaign into many sub-threshold accounts, organizations, payment paths, or proxy routes so each
account appears compliant while the campaign exceeds the declared extraction budget. The term
comes from compute-KYC / BIS regulatory language and ties 4L to live policy vocabulary.

**Positioning line vs prevention tech.** ARC-style anonymous rate-limited credentials *prevent*
per-credential overuse privately; CCB is the **auditable evidence layer** that prevention lacks —
it proves, replayably, what the enforcement actually was.

**Non-claims (carried in evidence README, closeout, reviewer checklist, and signed into the
attestation):**

```json
[
  "not_sybil_closure",
  "not_structuring_closure_without_provider_binding",
  "not_identity_truth",
  "provider_cluster_graph_assumed",
  "not_capability_transfer_proof",
  "budget_is_declared_policy_not_safety_bound",
  "raw_identity_not_exported",
  "ledger_is_metadata_only",
  "attestation_assumes_reviewer_runtime",
  "not_model_safety",
  "not_kernel_sandboxing",
  "determinism_not_statistical_robustness",
  "complements_not_replaces_prevention_credentials"
]
```

Plain English: CCB proves budget enforcement *given* a provider-supplied cluster commitment. It
does not prove the cluster graph is complete or correct, does not identify real-world actors,
does not solve cross-cluster collusion, does not show a student model learned anything, and does
not replace provider fraud detection or prevention credentials. It makes the provider's
cluster-budget claim replayable and falsifiable.

---

## 2. Gate Q9 — Cluster-Commitment Budget

Q8 (Stage 4K, raw 30) is untouched. Q9 is additive. **Zero `src/llmShield` changes.**

### 2.1 Raw codes

Raw **39 is reserved** in `tools/simurgh-attestation/stage4h/exitCodes.mjs` (v1
`extraction_scope_violation` prose slot) and MUST NOT be used. 4L takes **40–42**:

| Raw | Meaning | Run-level |
| ---: | --- | ---: |
| 0 | all gates pass | 0 |
| **40** | `cluster_commitment_missing` — an exposure-bearing consumer lacks an assignment for the window | 1 |
| **41** | `cluster_budget_exceeded` — cluster cumulative exposure exceeds declared cluster budget | 1 |
| **42** | `cluster_assignment_mismatch` — duplicate/extra assignment, digest that fails to recompute, or schema-invalid assignment (including raw-identity keys) | 1 |
| 28 | checker not offline (inherited Q3) | 2 |
| 29 / unmapped | internal error / exhaustiveness breach | 3 |

Wrapper rule: extend `RUN_LEVEL_BY_RAW` with `40→1, 41→1, 42→1`; unknown codes still fail closed
to 3; exit only via `stage4CodeForRawCode()`.

### 2.2 Predicate

For each signed pack window:

```
events      = committed exposure events from Stage 4K (keyed by consumer_id_digest)
assignments = committed cluster assignments (this stage)
policy      = cluster budget policy (this stage)

For every exposure-bearing consumer_id_digest:
  exactly one assignment for (consumer_id_digest, window)   — missing → raw 40
  duplicate / extra / dangling assignment                    — raw 42
  assignment cluster_commitment recomputes; schema exact-key — else raw 42

For every cluster_commitment:
  cluster_weighted_total = Σ weighted_total over assigned consumers
  cluster_weighted_total >  B_cluster → raw 41
  cluster_weighted_total == B_cluster → pass (boundary matches Q8 semantics)
```

Per-account totals are preserved in the attestation for the reviewer contrast table (F8).

### 2.3 Join contract with 4K

Assignments reference exposure subjects by **`consumer_id_digest`** using the **same salted
derivation** as `stage4k/extractionLedger.mjs` (`sha256:` over `FIXTURE_SALT\0id`). No new
`subject_digest` field. The fixture builder MUST derive assignment digests from the same salt
context as the 4K fixture rebuild, or L2 completeness cannot join.

---

## 3. Schemas (exact-key, fail-closed on unknown fields)

### 3.1 `simurgh.ccb.cluster_assignment.v1`

```json
{
  "schema": "simurgh.ccb.cluster_assignment.v1",
  "window": "<window-id, matches 4K window>",
  "consumer_id_digest": "sha256:...",
  "cluster_commitment": "sha256:...",
  "binding_level": "cluster",
  "cluster_basis": ["payment_graph", "traffic_shape", "device_commitment"],
  "basis_digests": { "payment_graph": "sha256:..." },
  "binding_policy_digest": "sha256:...",
  "graph_version_digest": "sha256:...",
  "raw_identity_exported": false
}
```

Rules:
- `cluster_basis` enum only: `payment_graph`, `traffic_shape`, `device_commitment`,
  `network_bucket`, `org_binding`, `reseller_path`. Nothing else.
- Raw-identity keys rejected by name and alias: `email`, `name`, `ip`, `phone`, `card`,
  `address`, `device_id`, `account_id`, `org_name`, `user_id`, `plaintext`, `raw`.
- `raw_identity_exported` must be exactly `false`.
- `cluster_commitment` = digest over the canonical (RFC 8785 JCS + SHA-256, same path as 4H/4K)
  assignment payload minus signatures.
- **`graph_version_digest` is the 4M seed**: digest of the provider's cluster-graph version that
  produced this assignment. 4L only checks presence + format; 4M's merge events will bind to it.
  The schema name `simurgh.ccb.cluster_merge_event.v1` is RESERVED (documented, not implemented).
- **Dropped from the draft:** `confidence_bucket` — nothing consumed it; decorative confidence
  fields invite greenwashing.
- `basis_digests` are opaque 256-bit slots the verifier cannot recompute — carried forward as a
  signed known limitation (Stage 3U R2-B lineage), not silently accepted.

### 3.2 `simurgh.ccb.cluster_budget_policy.v1`

As drafted: window, `weights_digest` (MUST equal the 4K weights digest — weights never silently
change), `budgets[]` of `{cluster_commitment, B_cluster, binding_level, policy_digest}`, plus the
non-claims block.

### 3.3 `simurgh.ccb.cluster_budget_attestation.v1`

As drafted (q9_status, ledger/policy digests, per-cluster totals with per-account contrast
preserved), plus:

- `known_limitations` (SIGNED, 3U pattern): `singleton_cluster_evasion_not_detected_but_ledgered`
  (F9 — see §3.4: evasion is not detected, but it forces a signed cardinality claim),
  `basis_digests_opaque_slots` (R2-B lineage), `graph_version_not_verified_in_4l`.
- `corroborating_commitments: []` — reserved empty array, the 4P/CPC hook. 4L validates it is
  present and empty; any non-empty value fails closed.
- `falsifiers` summary keyed to F1–F9 below.

### 3.4 `simurgh.ccb.cluster_cardinality.v1` — the cardinality commitment ("the liar must ledger the lie")

Every window, the builder recomputes the **cluster-size histogram** from the assignment ledger
and commits it as a first-class signed artifact:

```json
{
  "schema": "simurgh.ccb.cluster_cardinality.v1",
  "window": "<window-id>",
  "assignment_ledger_digest": "sha256:...",
  "histogram": { "1": 100, "2": 0, "5": 1 },
  "cluster_count": 101,
  "consumer_count": 105
}
```

Rules:
- Histogram keys are cluster sizes (stringified integers), values are counts; zero-count sizes
  MAY be omitted except size `1`, which MUST always be present (even as `"1": 0`) — singleton
  count is the load-bearing claim.
- The verifier recomputes the histogram from the assignment ledger; any inconsistency (counts,
  `cluster_count`, `consumer_count`, or `assignment_ledger_digest` mismatch) → raw 42.
- `cluster_cardinality_digest` is bound into the signed pack manifest alongside the attestation.

**Why this exists.** It does not detect singleton-cluster evasion (F9 remains expected-green).
It converts evasion into a **signed, falsifiable public claim**: a provider that under-clusters
must put "these 100 accounts are 100 independent actors" on the permanent record. When a later
merge event (4M), a fingerprint match, or partner corroboration contradicts it, that is a
provable prior misstatement, not a vague miss. Evasion is not prevented; it is *ledgered*.

### 3.5 Fixture hygiene (hard rules)

- **Synthetic magnitudes only** (e.g., 3–100 consumers, totals ≤ a few hundred). No real incident
  figures, no lab/company names — brand-denylist check in the security audit (3P lineage).
- No `verified_*` field-name prefixes anywhere; verification is established by recomputation, not
  naming (3S pattern).
- Deterministic fixtures + evidence JSON go into `.prettierignore` (4K lesson: prettier collapses
  single-element arrays); run `npm run format:check` before push and recompute byte-hash
  manifests AFTER formatting (3T lesson).

---

## 4. Falsifier matrix (each arm has exactly ONE expected outcome)

| # | Falsifier | Action | Expected |
| --- | --- | --- | --- |
| F1 | clean | one-command reproduce | exit 0 |
| **F-STRUCTURE** | **crown**: structuring | 100 accounts × 1 exposure, every account under B_account, shared commitment over B_cluster | raw 41 |
| F2b | single fat account | 1 account × total 100 / B 80 | raw 41 |
| F2c | boundary | total == B_cluster | exit 0 |
| F3 | missing assignment | delete one consumer's assignment | raw 40 |
| F4 | duplicate assignment | assign one consumer to two clusters | raw 42 |
| F5 | commitment tamper | flip one byte of a cluster_commitment | raw 42 |
| F6 | post-sign budget tamper | lower B_cluster after signing | signature/digest failure |
| F7 | raw-identity leak | add `email` key to an assignment | raw 42 (pinned; no "or") |
| F8 | per-account control | account-only checker on the F-STRUCTURE fixture | PASSES (documented negative control: the failure mode 4L exists to fix) |
| **F9** | **singleton-cluster evasion** | 100 accounts, 100 singleton clusters, each under budget | **PASSES Q9 — expected-green arm, signed into `known_limitations`**; MUST also show the emitted cardinality commitment recording `"1": 100` (the evasion is ledgered; 4M's retroactive layer is its answer) |
| F10 | cardinality tamper | edit histogram (or its counts/digest) after build | raw 42 |

Any red arm coming back green, or F8/F9 coming back red, is a stage failure.

---

## 5. Build steps

Branch: `stage-4l-ccb` off clean `main`. Neutral commit messages, no assistant attribution
(standing rule). One commit per step.

- **L1 — schema + privacy guard.** Exact-key validation, enum basis, raw-identity denylist,
  `raw_identity_exported === false`, JCS canonicalization, byte-identical commitments across two
  builds. Done when: clean validates; unknown field / raw-identity key / `true` flag all fail.
- **L2 — assignment-ledger completeness.** Exact bijection with 4K exposure consumers per window;
  `assignment_ledger_digest`. Done when: F3→40; F4/extra/dangling/digest-tamper→42.
- **L3 — cluster aggregation gate + cardinality commitment.** `aggregateClusterExposure()` +
  `checkClusterBudgets()` + `computeClusterCardinality()` (histogram recomputed from the
  assignment ledger, §3.4); boundary == passes; reuse 4K weights digest; preserve per-account
  totals. Done when: F-STRUCTURE and F2b→41; F2c/F1 pass; F8 control documented; F10→42;
  Q0–Q8 semantics unchanged.
- **L4 — attestation + signed-pack binding.** Emit assignment ledger, policy, attestation,
  `cluster-cardinality.json`, summary; own **stage4l Ed25519 key** (no reuse of 4A–4K keys);
  bind `cluster_budget_attestation_digest` AND `cluster_cardinality_digest` into
  `signed-pack-manifest.json` acyclically; verifier recomputes everything, never trusts
  committed JSON. Done when: F5/F6/F10 red; clean pack verifies offline.
- **L5 — one-command reproduce + falsifiers.** `scripts/reproduce-llm-shield-stage4l.sh`:
  scrub/pin env → rebuild 4K fixtures → rebuild 4L assignments → verify manifest → completeness →
  Q9 → replay Q0–Q8 unchanged → falsifier matrix (F1–F9) → byte-stable golden diff (two runs,
  Node 26) → emit summary → exit via `stage4CodeForRawCode`. Clean tree after reproduce.
- **L6 — reviewer docs.** `STAGE_4L_THREAT_MODEL.md` (structuring; adjacent-lanes table;
  Brundage/ARC/fingerprinting/TEE/SCITT citations; one paragraph stating the partition-lattice
  anti-monotonicity lemma from §0 with proof deferred to 4M), `STAGE_4L_REVIEWER_CHECKLIST.md`,
  `STAGE_4L_CLOSEOUT.md`, evidence README. Overclaim grep (extended with structuring terms) must
  match only inside explicit non-claims:

  ```bash
  rg -n "sybil.*(solved|closed)|structuring.*(solved|closed|prevented)|identity.*(proven|truth)|prevents distillation|capability transfer proven|raw identity exported|non-bypassable|model safe|first .*sybil" \
    docs/research/llm-shield tools/simurgh-attestation/stage4l tests/fixtures/llmShield/stage4l scripts/reproduce-llm-shield-stage4l.sh
  ```
- **L7 — MANDATORY full E2E net (K7-style).** Composes **every** stage4l export through the real
  pipeline: build → sign → verify → falsifier sweep, plus tamper matrix over every emitted
  artifact, plus cross-stage invariants (4K bundle digests still verify; Q8 result byte-identical
  with and without 4L present; wrapper exhaustiveness incl. unknown-code→3). In the release gate
  from day one, never a bolt-on (standing rule 2026-07-02).

### File structure

Create: `tools/simurgh-attestation/stage4l/{constants,clusterCommitment,clusterAssignmentLedger,clusterBudgetGate,build-stage4l-fixtures,build-stage4l-attestation,verify-stage4l}.mjs`,
`scripts/reproduce-llm-shield-stage4l.sh`, `tests/unit/llmShield/stage4l/*.test.js`,
`tests/e2e/llmShield/stage4l/*.test.js` (explicit globs — bare-dir `node --test` fails),
`tests/fixtures/llmShield/stage4l/`, `docs/research/llm-shield/evidence/stage-4l/`, the three
stage docs. Modify: `stage4h/exitCodes.mjs` (codes 40–42 only). 4K evidence docs only to point at
the 4L pack; Q8 semantics untouched.

---

## 6. Acceptance gates

| Gate | Requirement | Falsifier |
| --- | --- | --- |
| L-G1 schema | exact-key, metadata-only, denylist enforced | F7 red |
| L-G2 completeness | exact bijection with 4K consumers | F3/F4 red |
| L-G3 aggregation | cluster totals recompute from exposure ledger | F5 red |
| L-G4 enforcement | cluster total ≤ B_cluster; boundary passes | F-STRUCTURE red |
| L-G5 binding | attestation + cardinality digests bound in manifest; own key | F6/F10 red |
| L-G6 byte stability | two full runs byte-identical (Node 26) | golden diff red |
| L-G7 offline | no network/model/clock dependency | offline audit red |
| L-G8 honesty | non-claims + signed known_limitations incl. F9; overclaim grep clean; brand denylist clean | grep red |
| L-G9 E2E net | L7 full-chain net green; Q0–Q8 byte-unchanged | any net arm red |

Done when: F1/F2c exit 0; F2b + F-STRUCTURE exit 41; F3→40; F4/F5/F7/F10→42; F6 signature-fails;
F8 passes as control; F9 passes, is signed as a limitation, AND its cardinality commitment
records the singleton count; no raw identity in evidence; one command reproduces offline;
release gates pass on merged `main` before tagging.

---

## 7. Out of scope (explicitly deferred, seeded here)

- **4M/VXD**: signed `cluster_merge_event.v1` (reserved name), monotone merge lattice,
  retroactive re-scoring of past committed windows (proving the anti-monotonicity lemma from §0
  as its formal core), disclosure-claim binding, Article-73 template projection (with
  `not_legal_compliance_certification`). Consumes `graph_version_digest` and the §3.4 cardinality
  commitments (a merge event that contradicts a prior committed histogram is the "ledgered lie"
  surfacing). Reserved field name for the 4M attestation: `demand_side_evidence_digest` — binds
  demand-side evidence (e.g., an antidistillation-fingerprint match report) to the supply-side
  exposure ledgers in one signed disclosure, so a future disclosure carries both halves of the
  pincer. 4L defines the name only.
- **VFR**: separate stage; never merged into 4M.
- **OWASP LLM10 / NIST MEASURE 2.7 mapping note**: docs-only companion PR (carries Q8's
  "enforcement of declared budget, NOT prevention" non-claim into the mapping table).
- **4P/CPC**: consumes `corroborating_commitments`.
- **Roadmap reconciliation**: one canonical taxonomy (4L→4M/VXD→VFR→4P/CPC→4Q/ACB) resolving the
  §9 draft labels; lands with the program brief in L6 or the docs companion PR.
