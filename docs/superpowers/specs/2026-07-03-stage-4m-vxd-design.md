# Stage 4M / VXD — Verifiable eXternal Disclosure (Design Spec)

**Date:** 2026-07-03 · **Owner:** Raouf · **Status:** Draft, pending owner review
**Builds on:** Stage 4L/CCB `v2.21.0-stage-4l-ccb` (committed windows, cluster assignments,
cardinality commitments, `graph_version_digest` seed), Stage 4K/EBA exposure ledgers, Stage 4H
canonicalization/signing/typed-exit wrapper, Stage 3Q hash-chained registry, Stage 3X public
timeline, Stage 3N closed-world claim compiler, Stage 3O dual-signal/`claim_conflict` lineage.
**Tag target:** `v2.22.0-stage-4m-vxd` (verify on merged `main` before tagging; check
`git tag --sort=-creatordate` first — standing 4J lesson).

---

## 0. Program context (framing, not build scope)

**Master thesis.** AI governance has controls, transparency reports, KYC mandates, third-party
audits, and cross-lab sharing agreements. None of them produce an artifact a third party can
recompute. Simurgh is the replay layer underneath them.

**Why now (verified against live sources 2026-07-03).**

- Enforcement-disclosure figures ("~25,000 fraudulent accounts, 28.8M exchanges") are feeding
  directly into proposed US sanctions legislation while press coverage explicitly flags them as
  "not independently verified", and the accused party's only available response is a flat denial.
  Two formats are missing from the world: one that lets a third party recompute the headline, and
  one that lets the accused contest it with something better than a press release. 4M builds
  both. Synthetic fixtures only; we never reference or dispute any real incident figures.
- EU AI Act Art. 73 (high-risk) and Art. 55(1)(c) (GPAI systemic-risk) serious-incident
  obligations become applicable **2026-08-02**. The European Commission has published draft
  guidance and reporting templates (a general Art. 73 template and a separate GPAI template) —
  all prose forms with 15/10/2-day deadlines and no recomputable field. 4M's projection targets
  the _actual published template structure_, not a hypothetical.
- Contestability of automated enforcement has a large 2025–2026 legal literature (Columbia Law
  Review "The Right to Contest AI"; Lawfare contestability workshops; US state ADMT contest
  rights effective 2026-08-01). All of it is procedural machinery. **No cryptographic
  implementation exists** in which the accused runs the same verifier over the same evidence and
  files a machine-verifiable contest. The respondent path is that implementation.
- The demand signal is quantified in providers' own publications: a frontier lab's transparency
  hub self-reports ~1.45M account bans in H2 2025 with 52,000 appeals and a 3.3% overturn rate —
  ban counts, appeal counts, and overturn rates are all self-attested, and the appeal channel is
  procedurally opaque to the appellant. Privacy-preserving usage-analysis systems (Clio,
  arXiv:2412.13678) explicitly feed enforcement actions (network bans) whose evidence is never
  externally replayable. 4M's disclosure binding + respondent path are the missing evidence
  layer under exactly this class of published statistics. (Cited as public self-published demand
  signal only; fixtures stay synthetic and brand-free.)

**Adjacent lanes (position against, never claim to replace).** The 4L table (ARC credentials,
antidistillation fingerprinting, TEE attested inference, DSA transparency-report research)
carries forward unchanged. Two lanes are load-bearing for 4M specifically:

| Lane                                                                            | Proves                                                                                   | Cannot do                                                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| SCITT ARP (draft-hillier-scitt-arp) "Retroactive Evaluation Subsystem"          | Re-evaluates historical attestations when a policy version transitions (cross-sovereign) | No identity-cluster partition lattice; no monotonicity theorem; no incentive analysis; no respondent  |
| Contestability / right-to-contest legal literature (Columbia LR; Lawfare; ADMT) | Contestability is legally required and normatively grounded                              | Purely procedural; no executable verifier path for the accused; no evidence format                    |
| ADIC replay certificates (GhostDrift, Lean 4 `verifierBool_sound`, 2026)        | AI decisions replayable as certificates; machine-checked **verifier soundness**          | Proves the checker, not a domain property; no identity clusters; no disclosure binding; no respondent |
| Audit games (Blocki et al., IJCAI 2013 lineage)                                 | Stackelberg audit-resource allocation with punishment parameters (equilibrium results)   | Probabilistic deterrence, not structural exclusion; no evidence artifact; no retroactivity            |

**Program sequence** (this spec builds only the first item): **4M/VXD** (this spec) → 4N
Extraction Seismograph (candidate) → VFR (own stage, never merged here) → OWASP LLM10 / NIST
MEASURE 2.7 docs-only mapping note → 4P/CPC cross-provider corroboration.

---

## 1. Contribution lock

**Defensible claim.** Given the committed 4L evidence (windows, cluster assignments, cardinality
commitments), an offline auditor can verify four things no existing AI enforcement-disclosure
offers: **(a)** that fraud-graph improvements were applied as merge-only coarsenings
(anti-laundering lattice), **(b)** that re-scoring past committed windows under the improved
graph can only _reveal_ budget breaches, never erase them (**anti-monotonicity lemma, proved and
machine-enforced**), **(c)** that a public disclosure's headline figures recompute exactly from
commitments that entered the evidence chain _before_ the disclosure did, and **(d)** that the
accused party can run the same verifier and file a signed, chain-bound contest — due process as
an executable format.

**The four inventions of this stage (keep, do not dilute):**

1. **Monotone merge lattice with budget non-inflation** — laundering a breach by re-clustering
   is structurally rejected, not policed.
2. **Executable anti-monotonicity** — "breaches are monotone under truth" as a verifier
   predicate over real committed windows, plus a written proof and seeded property tests.
3. **Disclosure-claim binding by chain position** — headline numbers must recompute from
   pre-disclosure commitments; ordering is by hash-chain sequence, never wall-clock.
4. **Respondent path** (`--as-respondent`) — adversarial verifiability. Game-theoretic property
   (state in threat model): once a contestable format exists, choosing an uncontestable one is
   itself evidence of weakness — a truthful accuser gains from giving the accused a microscope.

**Positioning line.** 4L proved the budget was enforced _given_ a cluster commitment. 4M proves
the story stays honest _over time and in public_: the graph may improve, the disclosure may make
headlines, the accused may object — and every one of those steps is replayable.

**Non-claims (carried in evidence README, closeout, reviewer checklist, and signed into the
attestation).** All thirteen 4L non-claims verbatim, plus:

```json
[
  "not_legal_compliance_certification",
  "contest_is_recorded_not_adjudicated",
  "merge_evidence_not_verified",
  "retro_rescoring_is_arithmetic_not_new_measurement",
  "disclosure_binding_is_chain_ordering_not_truth",
  "projection_is_output_surface_not_filing"
]
```

Plain English: 4M proves the _structure_ of merges, the _arithmetic_ of re-scoring, the
_ordering_ of commitments versus disclosures, and the _integrity_ of contests. It does not prove
the fraud-graph evidence behind a merge is true, does not adjudicate contests, does not certify
legal compliance with the AI Act, and does not file anything with any regulator.

---

## 2. Formal spine — the anti-monotonicity lemma

**Setting.** Consumers C (as `consumer_id_digest`s). A cluster view is a partition P of C. A
merge event takes Pᵢ → Pᵢ₊₁ where Pᵢ₊₁ **coarsens** Pᵢ (every block of Pᵢ₊₁ is a union of blocks
of Pᵢ). Committed per-window exposure e(c, w) ≥ 0 (Stage 4K ledgers, already signed). Block
exposure is additive: E(B, w) = Σ\_{c∈B} e(c, w). Each cluster commitment carries a declared
budget β(B) (Stage 4L policy).

**Budget non-inflation rule (new, verifier-enforced).** A merge event MUST declare, for every
merged block B′ = B₁ ∪ … ∪ Bₖ, a budget β(B′) ≤ min(β(B₁), …, β(Bₖ)). Any merge event violating
this is rejected (raw 43). This is the anti-laundering condition: a breach cannot be washed by
merging into a bigger-budget cluster.

**Lemma (breaches are monotone under truth).** Fix a committed window w. If block B′ breaches
(E(B′, w) > β(B′)) and B″ ⊇ B′ is any block of any further coarsening in the lattice, then
E(B″, w) ≥ E(B′, w) > β(B′) ≥ β(B″), so B″ breaches too.

_Proof._ E(B″, w) ≥ E(B′, w) by additivity and e ≥ 0; β(B″) ≤ β(B′) by budget non-inflation
applied along the merge chain. ∎

**Consequence (the incentive theorem, stated in the threat model).** Under a monotone lattice
with non-inflating budgets, enforcement and audit-evasion are mutually exclusive strategies:
improving the fraud graph can only surface more past breaches; the only way to make a committed
breach disappear is to tamper with committed evidence, which the verifier detects (raw 44) or a
signature failure exposes. Combined with 4L's cardinality commitment, the singleton-evader who
later merges must surface their own prior misstatement (the "ledgered lie" pays out here).

**Enforcement.** (a) Written proof in `STAGE_4M_THREAT_MODEL.md` (this section, expanded).
(b) Seeded property tests: generated partitions and merge chains (deterministic seeds, no
randomness at verify time) asserting `breaches(P_new, w) ⊇ breaches(P_old, w)` structurally.
(c) The verifier enforces the same superset predicate on every real bundle; violation → raw 44.
(d) **Machine-checked proof (Lean 4):** `proofs/stage4m/AntiMonotonicity.lean` formalizes the
lemma over finite partitions with non-negative exposure and non-inflating budgets, checked in CI
(pinned Lean toolchain; the `.lean` source digest is committed into the evidence manifest so the
theorem text itself is tamper-evident). Positioning vs ADIC: they machine-check that _the
verifier is sound_; 4M machine-checks a _domain property_ — that the world cannot be laundered.
Signed limitation `proof_is_of_model_not_implementation`: the theorem is about the mathematical
model; the bridge to the running `.mjs` is the property suite + verifier predicate, stated
honestly, never blurred.

---

## 3. Raw codes

Raw **39 stays reserved** (v1 `extraction_scope_violation` prose slot in
`tools/simurgh-attestation/stage4h/exitCodes.mjs`) and MUST NOT be used. 4L holds 40–42
untouched. 4M takes **43–46**:

|           Raw | Meaning                                                                                                                                         | Run-level |
| ------------: | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------: |
|             0 | all gates pass (revealed breaches are verified **findings**, not failures — see §4.2)                                                           |         0 |
|        **43** | `merge_event_invalid` — split (non-coarsening), budget inflation, chain break, dangling cluster ref, or schema violation                        |         1 |
|        **44** | `anti_monotonicity_violation` — a previously breached cluster un-breaches under a coarsening: proof of tampered evidence or a forged lattice    |         1 |
|        **45** | `disclosure_claim_conflict` — a disclosure field fails to recompute from its bound commitments, or binds to a commitment sequenced after it     |         1 |
|        **46** | `respondent_contest_invalid` — contest signature invalid, dangling record reference, or non-enum contest type (emitted by the contest verifier) |         1 |
|            28 | checker not offline (inherited Q3)                                                                                                              |         2 |
| 29 / unmapped | internal error / exhaustiveness breach                                                                                                          |         3 |

Wrapper rule: extend `RUN_LEVEL_BY_RAW` with `43→1, 44→1, 45→1, 46→1`; unknown codes still fail
closed to 3; exit only via `stage4CodeForRawCode()`. **Known cost (plan for it, once):** additive
raw codes break the 4K and 4H exit-map goldens — refresh them deliberately in their own commit
(the `b28559c1` lesson), never as a drive-by.

---

## 4. Components and schemas (exact-key, fail-closed on unknown fields)

All modules pure `.mjs` under `tools/simurgh-attestation/stage4m/`. **Zero `src/llmShield`
changes** (enforced by the E2E net's zero-src-diff guard). Own **stage4m Ed25519 key** (no reuse
of 4A–4L keys). Canonicalization: RFC 8785 JCS + SHA-256, same path as 4H/4K/4L. No wall-clock
anywhere: ordering is chain position; merge events carry sequence indices, not timestamps.

### 4.1 `mergeLattice.mjs` — `simurgh.ccb.cluster_merge_event.v1` (the name 4L reserved)

```json
{
  "schema": "simurgh.ccb.cluster_merge_event.v1",
  "sequence": 3,
  "parent_event_digest": "sha256:... | null",
  "old_graph_version_digest": "sha256:...",
  "new_graph_version_digest": "sha256:...",
  "merges": [
    {
      "new_cluster_commitment": "sha256:...",
      "new_budget": 80,
      "merged_cluster_commitments": ["sha256:...", "sha256:..."],
      "merge_basis": ["payment_graph"]
    }
  ],
  "carried_cluster_commitments": ["sha256:..."],
  "raw_identity_exported": false
}
```

Verifier rules:

- **Coarsening only:** every old cluster commitment appears exactly once — in exactly one
  `merged_cluster_commitments` list or in `carried_cluster_commitments`. Splits, duplicates,
  omissions, or unknown commitments → raw 43.
- **Budget non-inflation:** `new_budget ≤ min` of constituents' budgets (§2) → else raw 43.
- **Chain integrity:** `parent_event_digest` matches the prior event's digest; `sequence`
  strictly increments; `old_graph_version_digest` equals the parent's `new_graph_version_digest`
  (genesis binds to the `graph_version_digest` in the 4L assignments — this **closes 4L's signed
  limitation `graph_version_not_verified_in_4l`**). Violation → raw 43.
- `merge_basis` uses the 4L `cluster_basis` enum only; raw-identity denylist and
  `raw_identity_exported === false` carry forward verbatim (raw 43 on violation).
- **Cardinality contradiction is a finding, not an error:** if a merge unites consumers a prior
  committed `cluster_cardinality.v1` declared independent, the verifier emits a signed
  `prior_cardinality_contradiction` finding referencing both digests. That is the system working
  — the ledgered lie surfacing — and it feeds §4.2's re-score.

### 4.2 `retroScore.mjs` — `simurgh.vxd.retro_rescore.v1`

For every committed 4L window w and every merge event Pᵢ → Pᵢ₊₁: recompute each new block's
exposure as the **sum of its constituent old blocks' committed totals** (pure arithmetic over
already-signed 4K/4L ledgers — no re-measurement, byte-deterministic), compare against the new
budgets, and emit:

```json
{
  "schema": "simurgh.vxd.retro_rescore.v1",
  "window": "<4L window id>",
  "merge_event_digest": "sha256:...",
  "breached_before": ["sha256:..."],
  "breached_after": ["sha256:...", "sha256:..."],
  "newly_revealed": ["sha256:..."],
  "monotonicity_ok": true,
  "findings": ["prior_cardinality_contradiction:sha256:..."]
}
```

- Verifier recomputes every total from the committed ledgers; any arithmetic mismatch → digest
  failure. `breached_after ⊉ breached_before` → raw **44** (tamper evidence, per §2).
- **A revealed breach exits 0.** Re-scoring is truth-preserving _evidence production_;
  enforcement semantics live in 4L's Q9 (raw 41) and are not re-litigated here. The verifier's
  claim is "this revelation is correctly computed and monotone", not "punish this cluster". The
  falsifier matrix pins the _content_ of `newly_revealed` exactly.

### 4.3 `disclosureBinding.mjs` — `simurgh.vxd.disclosure_claim.v1`

Closed-world claim compiler (3N lineage). A disclosure is a signed set of typed claims; every
claim field binds to commitment digests **and their 3Q chain positions**, all of which must be
sequenced strictly before the disclosure's own chain entry:

```json
{
  "schema": "simurgh.vxd.disclosure_claim.v1",
  "chain_position": 47,
  "claims": [
    {
      "kind": "consumer_count | cluster_count | exposure_total | breach_count | window_range",
      "value": 25,
      "bound_commitments": [{ "digest": "sha256:...", "chain_position": 12 }]
    }
  ],
  "demand_side_evidence_digest": null,
  "prose_history_digest": "sha256:..."
}
```

- Each claim kind has exactly one recomputation rule against the bound commitments; mismatch →
  raw **45**. A bound `chain_position ≥` the disclosure's own → raw **45** (backdating).
- Anything not expressible as an enum'd claim is excluded as `prose_history` (digest-committed,
  never verified — 3N's honest boundary, carried forward).
- `demand_side_evidence_digest` is **present and null** — the reserved pincer slot from 4L. Any
  non-null value fails closed (raw 45). Binding it is explicitly out of scope (§8).

### 4.4 `respondentPath.mjs` — `simurgh.vxd.respondent_contest.v1` + verifier `--as-respondent`

`verify-stage4m.mjs --as-respondent <bundle>` runs the **identical** verification pipeline and
additionally emits a machine-readable implication report: exactly which windows, cluster
commitments, merge events, and disclosure claims reference the respondent-supplied cluster
commitments. From that report the respondent can file:

```json
{
  "schema": "simurgh.vxd.respondent_contest.v1",
  "contested_records": [{ "window": "...", "record_digest": "sha256:..." }],
  "contest_type": "merge_evidence_disputed | assignment_disputed | arithmetic_error_alleged | window_boundary_disputed",
  "respondent_public_key": "ed25519:...",
  "statement_digest": "sha256:...",
  "signature": "..."
}
```

- The contest verifier checks: signature over canonical form, every `record_digest` resolves in
  the bundle, `contest_type` in the closed enum. Violation → raw **46**.
- A **valid contest is appended to the same 3Q-style chain / 3X timeline as the disclosure it
  contests** — symmetric honesty: the accuser's evidence is replayable, and so is the objection.
- `statement_digest` is an opaque commitment to the respondent's free-text argument; the verifier
  never evaluates it (`contest_is_recorded_not_adjudicated`).
- **Optional `simurgh.vxd.contest_acknowledgement.v1`** — a provider-signed receipt that a
  specific contest digest was received, chained after the contest it acknowledges. Purely a
  receipt (`acknowledgement_is_receipt_not_ruling`); it converts "we have an appeals process"
  from an assertion into a chain-verifiable fact — the published-appeals gap (52k appeals, 3.3%
  overturn, all self-attested) is the demand signal. Malformed/dangling acknowledgement → raw 46.

### 4.5 `article73Projection.mjs` — `simurgh.vxd.article73_projection.v1`

Pure output surface over an already-verified bundle. Field groups mirror the Commission's
published serious-incident template structure (incident description, temporal scope, affected
counts, corrective context). Every field is either `{ "value": ..., "source_digest": "sha256:..." }`
— populated **only** from recomputable slots (window ranges, breach counts, cluster counts,
consumer counts, re-score findings) — or the literal string `"not_projected"`. No free text is
ever synthesized. The projection embeds `not_legal_compliance_certification` and
`projection_is_output_surface_not_filing`, and the docs cite the actual Commission template and
its 15/10/2-day deadlines. Golden-file tested byte-for-byte.

### 4.6 Attestation + verifier — `simurgh.vxd.attestation.v1`

Emits: merge-event chain, retro re-score set, disclosure bindings, contest registry, projection,
summary. Two-tier verification (3M lineage): tier 1 signature/digest integrity, tier 2 full
recomputation. Signs `known_limitations`:

- `merge_evidence_not_verified` — we verify merge _structure_, never whether the fraud-graph
  evidence justifying a merge is true. This is the honest edge of the stage.
- `no_merge_no_reveal` — the retro layer answers 4L's F9 singleton evasion **only when a merge
  event arrives**; a provider that never improves its graph never triggers a reveal (the
  cardinality commitment is the standing deterrent, 4N's heartbeat the future pressure).
- `demand_side_evidence_digest_reserved_unbound` — the pincer slot exists, nothing fills it.
- `basis_digests_opaque_slots` — carried from 4L (3U R2-B lineage).
- `respondent_key_binding_out_of_band` — we verify the contest is internally consistent and
  signed; binding the respondent key to a real-world identity is outside the format.
- `proof_is_of_model_not_implementation` — the Lean theorem is about the mathematical model;
  the property suite + verifier predicate are the stated bridge to the running code.
- `acknowledgement_is_receipt_not_ruling` — an acknowledgement proves receipt of a contest,
  never its merit.
- `browser_verifier_is_projection_not_normative` — the Node verifier is normative; the HTML is
  a parity-gated projection of it.

All digests bound acyclically into `signed-pack-manifest.json`; verifier recomputes everything,
never trusts committed JSON.

### 4.7 `verify-stage4m.html` — single-file browser verifier ("the microscope, handed over")

A self-contained HTML file (no network, no build-time CDN, no framework) embedding the same
verification logic: drag a bundle onto the page, watch every digest, signature (WebCrypto
Ed25519), lattice rule, re-score sum, and disclosure binding recompute locally — usable by a
staffer, journalist, or respondent with zero toolchain. Rules:

- Generated deterministically from the same source modules by a build script; the emitted HTML's
  digest is committed into the evidence manifest (tamper-evident artifact, 3W witness lineage).
- **Parity is gated:** the browser verifier and `verify-stage4m.mjs` MUST produce identical
  verdicts and identical finding sets on every fixture in the falsifier matrix (V16).
- It renders verdicts and findings only — no advice, no adjudication language; the same
  non-claims block is displayed verbatim in the page footer.
- Node verifier remains the normative implementation; the HTML is a projection of it
  (`browser_verifier_is_projection_not_normative` signed limitation).

### 4.8 Fixture hygiene (hard rules, carried forward)

Synthetic magnitudes only (3–100 consumers, totals ≤ a few hundred); no real incident figures,
lab, or company names — brand-denylist audit (3P lineage). No `verified_*` field names (3S).
Deterministic fixtures + evidence JSON in `.prettierignore`; `npm run format:check` before push;
recompute byte-hash manifests AFTER formatting (4K/3T lessons). No `rg` in unit tests (4L CI
lesson); e2e wired into `check-e2e.sh` since `npm test` is unit-only.

---

## 5. Falsifier matrix (each arm has exactly ONE expected outcome)

| #           | Falsifier                   | Action                                                                                                    | Expected                                                                                                                          |
| ----------- | --------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| V1          | clean chain                 | valid merge chain + re-score + matching disclosure + projection, one-command reproduce                    | exit 0; `newly_revealed` empty                                                                                                    |
| **V-CROWN** | **revealing merge**         | 4L F9 fixture (100 singletons, committed `"1": 100`) + merge event uniting them under non-inflated budget | exit 0; `newly_revealed` = exactly that cluster; `prior_cardinality_contradiction` finding present — the retroactive answer to F9 |
| V2          | attempted split             | merge event splitting a committed cluster                                                                 | raw 43                                                                                                                            |
| V3          | budget inflation laundering | merged budget > min of constituents                                                                       | raw 43                                                                                                                            |
| V4          | chain break                 | wrong `parent_event_digest` / non-incrementing sequence / genesis not bound to 4L `graph_version_digest`  | raw 43                                                                                                                            |
| V5          | anti-monotonicity tamper    | edit a committed old-window ledger so a `breached_before` cluster un-breaches after the merge             | raw 44                                                                                                                            |
| V6          | disclosure match            | headline claims recompute exactly from pre-disclosure commitments                                         | exit 0                                                                                                                            |
| V7          | disclosure conflict         | claim says 10, recomputation says 12                                                                      | raw 45                                                                                                                            |
| V8          | disclosure backdating       | claim bound to a commitment with `chain_position` after the disclosure's own                              | raw 45                                                                                                                            |
| V9          | pincer slot violation       | non-null `demand_side_evidence_digest`                                                                    | raw 45                                                                                                                            |
| V10         | valid contest               | respondent verifies bundle `--as-respondent`, files signed contest against V-CROWN records                | exit 0; contest chained into the same timeline                                                                                    |
| V11         | forged contest              | contest with invalid signature                                                                            | raw 46                                                                                                                            |
| V12         | dangling contest            | contest referencing a record digest not in the bundle                                                     | raw 46                                                                                                                            |
| V13         | projection tamper           | edit one projected field after signing                                                                    | signature/digest failure                                                                                                          |
| V14         | post-sign merge tamper      | flip one byte of a signed merge event                                                                     | signature/digest failure                                                                                                          |
| **V15**     | **no-merge control**        | 4L F9 fixture with NO merge event                                                                         | exit 0; nothing revealed — documented negative control for the signed `no_merge_no_reveal` limitation                             |
| V16         | browser parity              | run `verify-stage4m.html` logic against every fixture above (headless)                                    | verdicts + finding sets byte-identical to the Node verifier                                                                       |
| V17         | acknowledgement forgery     | contest acknowledgement with invalid signature or dangling contest digest                                 | raw 46                                                                                                                            |
| V18         | proof-text tamper           | edit `AntiMonotonicity.lean` after manifest commit                                                        | manifest digest failure; CI Lean check red on broken proof                                                                        |

Any red arm coming back green, or V-CROWN/V15 deviating from their pinned outcomes, is a stage
failure.

---

## 6. Build steps

Branch: `stage-4m-vxd` off clean `main`. Neutral commit messages, no assistant attribution
(standing rule). One commit per step.

- **M1 — merge-event schema + lattice validator.** Exact-key validation, coarsening check,
  budget non-inflation, chain integrity, genesis binding to 4L `graph_version_digest`,
  cardinality-contradiction finding. Done when: V2/V3/V4 red; clean chain validates;
  byte-identical canonical digests across two builds.
- **M2 — retroactive re-scorer.** Pure-arithmetic re-scoring over committed 4K/4L ledgers;
  monotonicity predicate; findings plumbing. Done when: V-CROWN pins exactly; V5 → 44; V15
  control documented; 4L Q9 and 4K Q8 results byte-unchanged.
- **M3 — property tests + machine-checked proof.** Seeded generated partitions/merge chains
  asserting the superset predicate structurally; written proof drafted into the threat model;
  `proofs/stage4m/AntiMonotonicity.lean` checked under a pinned Lean 4 toolchain in CI (own
  workflow job; failure blocks release, absence of the toolchain locally never blocks
  `npm test`). Done when: property suite green and deterministic across two runs; Lean check
  green; V18 red on a deliberately broken proof.
- **M4 — disclosure-claim binding.** Closed-world claim kinds, chain-position ordering,
  prose_history exclusion, reserved-null pincer slot. Done when: V6 green; V7/V8/V9 → 45.
- **M5 — respondent path.** `--as-respondent` implication report; contest schema, signing,
  chain append; contest verifier; optional acknowledgement receipt. Done when: V10 green and
  chained; V11/V12/V17 → 46.
- **M6 — Article-73/55 projection.** Template-shaped surface, recomputable-slots-only rule,
  `not_projected` defaults, golden files. Done when: V13 red; projection byte-stable.
- **M6b — browser verifier.** Deterministic build of `verify-stage4m.html` from the source
  modules; digest committed to manifest; headless parity harness. Done when: V16 parity exact on
  all fixtures; page renders non-claims verbatim.
- **M7 — attestation + one-command reproduce.** stage4m key; manifest binding (incl. `.lean` and
  `.html` digests); exit-map golden refresh for 4K/4H in its own commit;
  `scripts/reproduce-llm-shield-stage4m.sh`: scrub/pin env → rebuild 4K/4L fixtures → build merge
  chain → re-score → disclosure → contest → projection → browser build →
  full falsifier matrix (V1–V18) → byte-stable golden diff (two runs, Node 26) → clean tree
  after. Exit only via `stage4CodeForRawCode`.
- **M8 — MANDATORY full E2E net (K7-style) + reviewer docs.** Composes **every** stage4m export
  through the real pipeline: build → sign → verify (both roles) → falsifier sweep; tamper matrix
  over every emitted artifact; cross-stage invariants (4L Q9, 4K Q8, 4H chain byte-unchanged;
  zero-src-diff guard; wrapper exhaustiveness incl. unknown-code→3). In the release gate from day
  one, never a bolt-on (standing rule 2026-07-02). Docs: `STAGE_4M_THREAT_MODEL.md` (lemma proof;
  incentive theorem positioned against audit-games equilibria — structural exclusion, not
  probabilistic deterrence; SCITT-ARP + ADIC + contestability positioning; transparency-hub
  appeals statistics as public demand signal; citations verified before merge),
  `STAGE_4M_REVIEWER_CHECKLIST.md`, `STAGE_4M_CLOSEOUT.md`, evidence README. Overclaim grep
  (pure-JS scan, 4L lesson) extended with: `breaches? (prevented|impossible)`,
  `contest.*(upheld|adjudicated|resolved)`, `legally compliant|Article 73 certified|regulator
approved`, `identity (proven|confirmed)` — matches only inside explicit non-claims.

### File structure

Create: `tools/simurgh-attestation/stage4m/{constants,mergeLattice,retroScore,disclosureBinding,respondentPath,article73Projection,build-stage4m-fixtures,build-stage4m-attestation,verify-stage4m,build-browser-verifier}.mjs`,
`proofs/stage4m/AntiMonotonicity.lean` (+ pinned toolchain file + CI job),
`scripts/reproduce-llm-shield-stage4m.sh`, `tests/unit/llmShield/stage4m/*.test.js`,
`tests/e2e/llmShield/stage4m/*.test.js` (explicit globs — bare-dir `node --test` fails),
`tests/fixtures/llmShield/stage4m/`, `docs/research/llm-shield/evidence/stage-4m/`, the three
stage docs. Modify: `stage4h/exitCodes.mjs` (codes 43–46 only) + the 4K/4H exit-map goldens
(dedicated commit). 4L evidence docs only to point at the 4M pack; Q9 semantics untouched.

---

## 7. Acceptance gates

| Gate                 | Requirement                                                                                                     | Falsifier              |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| M-G1 lattice         | coarsening-only, budget non-inflation, chain integrity, genesis bound to 4L                                     | V2/V3/V4 red           |
| M-G2 monotonicity    | lemma proved in docs, property-tested, verifier-enforced on real bundles                                        | V5 red                 |
| M-G3 re-score truth  | every re-scored total recomputes from committed ledgers; V-CROWN reveals exactly one cluster with contradiction | V-CROWN pinned         |
| M-G4 disclosure      | claims recompute from strictly-prior chain positions; closed world; pincer slot null                            | V7/V8/V9 red           |
| M-G5 respondent      | `--as-respondent` yields identical verification + implication report; valid contest chains; invalid rejected    | V10 green, V11/V12 red |
| M-G6 projection      | recomputable-slots-only; `not_projected` default; template-shaped; signed non-claims embedded                   | V13 red                |
| M-G7 byte stability  | two full runs byte-identical (Node 26); clean tree after reproduce                                              | golden diff red        |
| M-G8 offline         | no network/model/clock dependency; ordering by chain position only                                              | offline audit red      |
| M-G9 honesty         | non-claims + signed known_limitations (incl. `no_merge_no_reveal`); overclaim grep clean; brand denylist clean  | grep red               |
| M-G10 E2E net        | M8 full-chain net green; 4L/4K/4H byte-unchanged; zero-src-diff guard green                                     | any net arm red        |
| M-G11 proof + parity | Lean check green in CI; `.lean` + `.html` digests in manifest; browser verdicts identical to Node               | V16/V18 red            |

Done when: V1/V6/V10/V15 exit 0 with pinned contents; V2/V3/V4→43; V5→44; V7/V8/V9→45;
V11/V12/V17→46; V13/V14 signature-fail; V16 parity exact; V18 red; V-CROWN reveals exactly the
merged singleton cluster with its `prior_cardinality_contradiction` finding; one command
reproduces offline; release gates pass on merged `main` before tagging.

---

## 8. Out of scope (explicitly deferred, seeded here)

- **Demand-side pincer binding** — filling `demand_side_evidence_digest` with a real
  antidistillation-fingerprint match report format. The slot stays reserved-null (V9 enforces
  it); binding waits until an external format is stable enough to be falsifiable. Rationale: a
  seam we cannot recompute would be the one mushy joint in an otherwise tight stage.
- **Contest adjudication** — any ruling on whether a contest is _correct_. Permanently out of
  lane (`contest_is_recorded_not_adjudicated`); Simurgh is the pen, never the judge (3S lineage).
- **4N Extraction Seismograph** — public per-window heartbeat; composes from 3Q/3X plus 4L
  windows plus this stage's merge chain. The `no_merge_no_reveal` limitation is its demand
  signal. **SCITT-compatible receipts** (COSE-enveloped signed statements anchorable in IETF
  transparency services) belong here, not in 4M — 4M carries a docs-level SCITT mapping note only.
- **DSA statement-of-reasons projection** — a second projection surface
  (`simurgh.vxd.dsa_sor_projection.v1`) targeting the DSA Transparency Database's harmonised
  machine-readable templates (Implementing Regulation in force 2025-07-01; academic literature
  documents the database as self-reported and unverifiable). Same recomputable-slots-only rule as
  §4.5 — would make VXD a regulation-agnostic projection layer. **OWNER DECISION: fold into 4M
  (adds ~1 golden surface) or ship in the docs companion / 4M-b.** Not blocking; §4.5 is the
  template pattern either way.
- **ZK compliance lane** — proving cluster-budget compliance in zero knowledge (zkAudit lineage,
  arXiv:2510.26576) would hide cluster structure entirely but replaces third-party recomputation
  with proof-system trust — a different trust model than Simurgh's replay lane, noted as
  complementary future work (`VXD-ZK`), never a silent swap.
- **Public falsification challenge** — releasing the signed bundle with a standing "find a
  monotonicity violation" invitation is a release-notes/closeout idea, not spec content.
- **VFR** — verifiable friction receipts; own stage, never merged into 4M (standing rule).
- **4P/CPC** — cross-provider corroboration by digest equality; consumes the still-reserved
  `corroborating_commitments`. 4M's merge chain gives it the epoch hooks
  (`graph_version_digest` lineage) for cross-pack cluster-view non-equivocation
  (`cluster_view_equivocation`, deferred v1 from 4L).
- **Live regulator filing** — the projection is an output surface; transmitting it anywhere is a
  human act outside the evidence format.
