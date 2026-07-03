# Stage 4M / VXD — Threat Model

**Motto (ordering rule):** _AnthropicSafe First, then ReviewerSafe._ Both properties are
mandatory; the order is the tie-break. Provider-safety (no sensitive content or structural
metadata reaching competitors or the adversary) wins ties, and the audience-tier model
reconciles the rest — reviewer-safety is never dropped, it recomputes at the tier that holds the
data.

## 1. What 4M proves

Given the committed 4L evidence (windows, cluster assignments, cardinality commitments), an
offline auditor can verify four things no existing AI enforcement-disclosure offers:

- **(a) Merge-only coarsening** — fraud-graph improvements are applied as a monotone merge
  lattice; splits, budget inflation, chain breaks, and identity leaks are structurally rejected
  (raw 43).
- **(b) Anti-monotonicity** — re-scoring past committed windows under the improved graph can
  only _reveal_ budget breaches, never erase them. Proved below and machine-enforced (raw 44 on
  violation); the theorem is also machine-checked in Lean 4.
- **(c) Disclosure binding** — a public disclosure's headline figures recompute exactly from
  commitments that entered the evidence chain _before_ the disclosure did (ordering is chain
  position, never wall-clock; raw 45 on conflict).
- **(d) Respondent path** — the accused party runs the _same_ verifier and files a signed,
  chain-bound contest; a provider acknowledgement is a chain-verifiable receipt (raw 46 on
  forgery). Due process as an executable format.

## 2. Formal spine — the anti-monotonicity lemma

**Setting.** Consumers C (as opaque cluster-level commitments in 4M — no consumer identifiers
appear in any 4M artifact). A cluster view is a partition; a merge event coarsens it (every new
block is a union of old blocks). Committed per-window exposure e ≥ 0. Block exposure is additive.
Each cluster commitment carries a declared budget.

**Merge image function.** Each valid merge event i induces a total function `image_i` from old
cluster commitments to new: carried clusters map to themselves; merged constituents map to the
new bucket. `image_i` is implemented as `imageMap` in `core/mergeLatticeCore.mjs`. Old and new
commitments are different identifier spaces and are never compared by raw set operations.

**Budget non-inflation rule (verifier-enforced, `validateMergeChain`).** A merge event MUST
declare, for every merged block B′ = B₁ ∪ … ∪ Bₖ, a budget β(B′) ≤ min(β(B₁), …, β(Bₖ)). An
inflationary merge is a raw-43 invalid EVENT regardless of which windows exist.

**Why non-inflation is the right semantics.** In 4M, `budget` is not a per-account allowance or
an additive consumption quota — it is a risk-bound commitment for a provider-declared cluster
view. A later merge is an admission that the prior clusters were aliases of the same underlying
actor or control group; the newly acknowledged single actor may not receive a _larger_ allowance
by virtue of improved graph knowledge. A higher budget for the merged cluster is a new
prospective policy commitment, never a retroactive laundering-safe property of the merge.

**Lemma (breaches are monotone under truth).** Fix a committed window w. If block B′ breaches
(E(B′, w) > β(B′)) and B″ ⊇ B′ is any block of any further coarsening, then E(B″, w) ≥ E(B′, w) >
β(B′) ≥ β(B″), so B″ breaches too. _Proof:_ additivity with e ≥ 0 gives the exposure inequality;
budget non-inflation along the merge chain gives the budget inequality. ∎ Machine-checked in
`proofs/stage4m/AntiMonotonicity.lean` (`anti_monotonicity`), gated by CI
(`.github/workflows/stage-4-lean-proofs.yml`). Signed limitation
`proof_is_of_model_not_implementation`: the theorem is of the model; the bridge to the running
`.mjs` is the property suite (`antiMonotonicity.property.test.js`, 200 seeded cases) plus the
verifier predicate (`verifyRescoreRecord`).

**Incentive theorem (structural exclusion, not probabilistic deterrence).** Under a monotone
lattice with non-inflating budgets, enforcement and audit-evasion are mutually exclusive
strategies: improving the fraud graph can only surface more past breaches; the only way to make a
committed breach disappear is to tamper with committed evidence, which the verifier detects
(raw 44) or a signature failure exposes. This is stronger than the audit-games literature
(Blocki et al., IJCAI 2013), which allocates audit resources for _probabilistic_ deterrence at a
Stackelberg equilibrium — here the evasion strategy set is empty by construction. Combined with
4L's cardinality commitment, the singleton-evader who later merges surfaces their own prior
misstatement (the "ledgered lie" — `singleton_merge_contradiction`).

## 3. Adjacent lanes (position against, never claim to replace)

| Lane                                                              | Proves                                                      | Cannot do                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SCITT ARP (draft-hillier-scitt-arp)                               | Retroactive re-evaluation on policy-version transition      | No identity-cluster lattice; no monotonicity theorem; no incentive result; no respondent     |
| ADIC (GhostDrift, Lean 4 `verifierBool_sound`, 2026)              | Machine-checked **verifier soundness** for replay certs     | Proves the checker, not a domain property; no clusters; no disclosure binding; no respondent |
| Contestability literature (Columbia LR "The Right to Contest AI") | Contestability is legally required and normatively grounded | Purely procedural; no executable verifier path for the accused                               |
| Audit games (Blocki et al., IJCAI 2013)                           | Stackelberg audit-resource allocation with punishment       | Probabilistic deterrence, not structural exclusion; no evidence artifact; no retroactivity   |

**Demand signal (public, self-published).** A frontier lab's transparency hub self-reports
~1.45M account bans in H2 2025 with 52,000 appeals and a 3.3% overturn rate — all self-attested,
with an appeal channel opaque to the appellant; Clio (arXiv:2412.13678) feeds enforcement actions
whose evidence is never externally replayable. 4M's disclosure binding + respondent path are the
missing evidence layer under exactly this class of published statistics. Cited as demand signal
only; all 4M fixtures are synthetic and brand-free.

## 4. Data-egress model (the 4A–4L audience-model audit finding, dated 2026-07-03)

A retro-audit of the stage-4 line (2026-07-03) found it fully reviewer-safe and strongly
content-safe (4D `privacy.mjs` walker, 4H `privacyGate.mjs` allowlist, 4K pseudonymity
limitation, 4L identity denylist) but with **no audience model and no structural-egress
treatment**: every prior artifact assumed a single vetted reviewer. 4M is the first stage whose
artifacts are public and adversarially received, so the audience model becomes part of the format
here — by design, not retrofit.

**Three tiers.**

- **Tier P (public):** aggregates and roots only — chain digest, cardinality histogram, breach
  count, total exposure mass, merge-event digests, disclosure claims bound to committed roots.
  Verifiable by anyone (incl. the browser verifier): chain integrity + claim ordering. NO cluster
  topology, NO per-cluster volumes. The attestation IS the Tier-P payload; an aggregate-only leak
  guard in `buildVxdAttestation` refuses any cluster commitment that would enter it.
- **Tier A (auditor):** full ledgers for a vetted auditor. Every Tier-P root MUST recompute as
  the Merkle root over the Tier-A records (V20: the public story can never diverge from the
  audited one).
- **Tier R (respondent):** seeded via sorted-leaf Merkle roots; the slice machinery (inclusion +
  non-membership proofs) is the follow-up stage (signed `tier_r_slice_machinery_deferred`). 4M v0
  respondent path operates on a vetted full bundle.

**Structural-egress statement.** Even at Tier P the artifact's shape reveals cluster count, a
size histogram, and merge cadence (≈ detection latency). These residuals are aggregated, not
per-identity. Publishing enforcement evidence always feeds the adversary _something_ — tiers and
aggregation bound the channel, they never close it (signed
`disclosure_is_adversary_feedback_bounded_not_eliminated`). Consumer-level identifiers
(`consumer_id_digest`, `session_id`, raw-identity keys) never appear in any 4M artifact (V21);
cluster commitments legitimately persist across windows — that is the retro-score join, not a
leak.

## 5. Non-claims (signed into the attestation, verbatim)

All thirteen 4L non-claims (`not_sybil_closure`,
`not_structuring_closure_without_provider_binding`, `not_identity_truth`,
`provider_cluster_graph_assumed`, `not_capability_transfer_proof`,
`budget_is_declared_policy_not_safety_bound`, `raw_identity_not_exported`,
`ledger_is_metadata_only`, `attestation_assumes_reviewer_runtime`, `not_model_safety`,
`not_kernel_sandboxing`, `determinism_not_statistical_robustness`,
`complements_not_replaces_prevention_credentials`) plus six 4M additions:
`not_legal_compliance_certification`, `contest_is_recorded_not_adjudicated`,
`merge_evidence_not_verified`, `retro_rescoring_is_arithmetic_not_new_measurement`,
`disclosure_binding_is_chain_ordering_not_truth`, `projection_is_output_surface_not_filing`.

Plain English: 4M proves the _structure_ of merges, the _arithmetic_ of re-scoring, the
_ordering_ of commitments versus disclosures, and the _integrity_ of contests. It does not prove
the fraud-graph evidence behind a merge is true, does not adjudicate contests, does not certify
legal compliance with the AI Act, and does not file anything with any regulator.
