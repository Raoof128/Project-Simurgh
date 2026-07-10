# Stage 5H — VSD: Verifiable Safety-claim Disclosure (design spec)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Thesis: Simurgh is the independent, byte-reproducible **verification** layer for agent
> containment. Every stage adds ONE falsifiable blade; the moat is the Completeness Invariant
> (no selective omission) plus academic depth. Honesty guardrail: **"boundary held, verifiably" —
> never "model safe"**, and here: **"claim right-scaled to reproducibility tier N, verifiably" —
> never "claim true."**

- **Stage id:** 5H-VSD · **Version:** `v2.43.0-stage-5h-vsd` · **Date:** 2026-07-10
- **Arc:** External Accountability arc. VFC (5G) proved _who produced_ evidence. **VSD types
  _at what reproducibility tier a safety claim is disclosed_ and forbids claiming more than that
  tier warrants.** It mints the typed _object_ that **VPC** (contest) will later dispute and
  **VUC** (universe) will later bound: VFC ✓ → **VSD** → VPC → VUC.
- **Raw codes:** additive **300–315** in the global ledger
  `tools/simurgh-attestation/stage4h/exitCodes.mjs` (299 confirmed as the last used code).
- **Reserved-socket posture:** VSD pays no minted IOU. It converts (a) the field's named
  **"evidential inversion"** — _"the most consequential claims in AI safety are often the least
  reproducible"_ (Vishwarupe/Shadbolt/Jirotka/Flechais, arXiv:2605.08192) — and (b) the project's
  own standing **two-tier** attestation assumption (public-structure / audit-rerun, tiers chosen
  by _us_) into a **three-tier disclosure lattice whose tier is _computed_ from artefact
  availability and _constrained_ by claim consequence**. It mints its own residual sockets (§4).

---

## §1 — Identity, Laws, Blade

### The wound

A frontier lab now publishes safety claims as **redacted risk reports with expert-reviewer
access** (RSP v3.0, effective 2026-02-24, primary source: _"Risk Reports… published online (with
some redactions)… expert third-party reviewers… unredacted or minimally-redacted access"_) — the
disclosure regime that **replaced** the dropped hard-limit pause trigger. There is **no
recomputable substrate** underneath it: a reader cannot tell whether a release-justifying claim
rests on public, rerunnable evidence or on withheld artefacts they must simply trust. Oxford names
the disease — the **evidential inversion**: _the most consequential claims are the least
reproducible._ Stanford's FMTI quantifies it — sector transparency **58 → 40/100**, **zero**
developers disclosing train-test overlap. VSD is the substrate: it makes the disclosure **tier
itself** a computed, byte-checkable, right-scaled quantity.

### The blade (one mechanism a reviewer can attack)

Every safety claim carries a **declared consequence** (what the claim is used _for_) and a
verifier-**computed reproducibility tier** (what its artefacts actually _support_, offline). VSD
enforces one inequality — the **Right-Scaling Law**:
`rank(declared_consequence) ≤ rank(max_consequence(proven_tier))`. You cannot make a
threshold-crossing claim on restricted evidence, you cannot _declare_ a tier your artefacts don't
recompute to, and you cannot leave a referenced artefact unaccounted. A reviewer rejects VSD by
breaking exactly one thing: **the proven-reproducibility-tier computation.**

### The honest core — two typed lattices + one inequality (signed up front)

The producer **declares** a target tier per claim; the verifier **computes** `proven_tier`,
failing closed on any overclaim (mirrors VFC's `proven_rung`). Higher = more independently
checkable:

| Tier | `reproducibility_tier` | Required evidence (verifier-checked)                                                                                                                                                                         | Maps to   |
| ---: | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
|   R0 | `restricted`           | Public statement of the claim + reason for restriction + right-scaling note                                                                                                                                  | Oxford T3 |
|   R1 | `controlled`           | R0 **+** artefacts available to a **named secure-review host** who counter-signs a recompute result (Lane B ceremony species) **+** public method summary + typed redaction justifications + scope statement | Oxford T2 |
|   R2 | `public`               | R1's public parts **+** all rerun artefacts public (withheld list EMPTY) **and** Simurgh **recomputes offline byte-stably** to the committed output digest                                                   | Oxford T1 |

Consequence is typed too — `contextual (C0) → supporting (C1) → threshold_crossing (C2)` — and
**warrant is a typed pair, not a scalar** (the source distinguishes _"full ordinary empirical
support"_ (T1) from _"strong but qualified empirical support"_ (T2); flattening that distinction
would discard typed information):

| Proven tier     | `max_consequence`       | `support_quality` |
| --------------- | ----------------------- | ----------------- |
| R0 `restricted` | C0 `contextual`         | `descriptive`     |
| R1 `controlled` | C2 `threshold_crossing` | `qualified`       |
| R2 `public`     | C2 `threshold_crossing` | `full`            |

- Law 1 bites on `max_consequence` only (C2-on-R0 fails closed); `support_quality` is a
  **reported, signed field** — a C2 claim proven at R1 verifies but is permanently typed
  `qualified`, never `full`. A lab cannot launder a reviewer-only recompute into the same
  standing as a publicly rerunnable one; the difference travels with the claim.
- The live boundary is taken verbatim from the source, both halves: restricted evidence permits
  _"limited contextual or descriptive use only"_ (which excludes C1 `supporting`) and is _"not
  sufficient for threshold-crossing or release-justifying claims"_ (which excludes C2) — so
  **C1/C2 on R0 = evidential inversion, fail closed.** `declared_tier > proven_tier` is a
  separate hard failure (tier overclaim).
- Anti-gaming non-claim signed with the pair: `support_quality` describes **checkability class,
  not evidential strength of the finding** — a full-support weak result is still weak.

### Laws (falsifiable)

- **Law 1 — No Evidential Inversion.** A claim's declared consequence may not exceed
  `max_consequence(proven_tier)`; a threshold-crossing claim on restricted evidence fails closed.
- **Law 2 — No Tier Without Recompute.** A claim declaring `public` must recompute offline
  byte-stably to the committed output; failure lowers `proven_tier` (never silently accepted).
- **Law 3 — No Undeclared Redaction.** Every artefact a claim references is either present, or
  enumerated as withheld with a typed justification + tier; an unaccounted artefact fails closed.
  (The Completeness Invariant, applied to disclosure.)
- **Law 4 — No Scope Substitution.** The scope statement (checkpoint / environment / pipeline /
  uncertainty) is bound into the claim digest; the evaluated system cannot be swapped after
  commitment.

### Signed non-claims / bounds (named as the arc's next attack surfaces)

- **Reproducibility ≠ correctness.** VSD verifies the _tier and right-scaling_ of a claim —
  **not that the claim is true or the eval well-designed** (the behavioural-assurance seam,
  arXiv:2605.15164). → next: VPC + downstream validity work.
- **Consequence is producer-declared.** VSD checks a declared consequence is _supported_, not
  that the producer didn't _under-rate_ consequence to duck the floor. → socket
  `consequence_self_rating_contest_deferred` (VPC).
- **The secure-review host is bound, not vouched.** R1 binds _that a named pinned host recomputed
  and counter-signed_ — not that the host is independent or honest. → socket
  `secure_review_host_independence_deferred` (VFC-rung / VPC).
- **Withheld content is typed, not read.** VSD enforces redaction _completeness_, not the
  _content_ of a withheld artefact. → socket `withheld_artefact_content_deferred`.
- **Claim text is bound by bytes, not meaning.** `claim_text_digest` pins the claim's bytes; a
  lab can restate the claim in prose beyond the digest (4W/4X's lexical-not-semantic seam,
  inherited honestly). → socket `claim_text_semantic_binding_deferred`.

Public metaphor allowed: _"a claim may not outrun its evidence."_ Signed claim: _tier and
right-scaling verified — not truth._

### Founder's ledger

New evidence **species**: first **disclosure-tier attestation** (evidence about a claim's
_reproducibility class_, not its content), and the first stage whose object is a _published
safety claim_ (risk-report-shaped). **Concrete external actor:** the third-party reviewer a
frontier lab commits to appoint for its Risk Reports. **Single blocker:** a claim-inventory
schema + one published claim expressed as a VSD artifact — buildable (Lane C-2 stages it;
`real_risk_report_pilot_deferred` tracks the residual as debt).

---

## §2 — Artifact schema, raw codes, frozen check order

### Three signed objects (who-signs-what mirrors 5G; no object signs itself)

Each object splits into a `….content.v1` sub-object;
`digest = sha256("simurgh.vsd.<obj>.v1\n" ‖ canonicalJson(content))`,
`signature = sign(key, canonicalJson(content))`; digest/signature fields live in the **wrapper
only**. Domain separators: `simurgh.vsd.{claim_inventory, claim, review_receipt,
recompute_recipe, disclosure_attestation, inventory_census}.v1` — **every listed domain is
consumed by a named check; no dead domains** (scope statement and artefact manifest live INSIDE
the claim's domain-digested content and get no separator of their own).

```text
① simurgh.vsd.claim_inventory.v1          ← the PRODUCER (lab) signs — the census of claims
   content { inventory_id, producer_identity_digest, report_ref { title_digest, period },
             claims[]: {
               claim_id, claim_text_digest,
               declared_consequence ∈ {contextual, supporting, threshold_crossing},
               declared_tier ∈ {restricted, controlled, public},
               method_summary_digest?             (required iff tier ≥ controlled — the R1 public-summary leg),
               scope_statement { checkpoint_kind, environment, pipeline_components[],
                                 uncertainty_note }            ← bound INTO claim digest (Law 4)
               artefact_manifest {
                 present[]:  { artefact_id, digest },           ← committed in the pack
                 withheld[]: { artefact_id, justification_type ∈
                               {safety_hazard, third_party_confidential, security_sensitive},
                               available_at_tier, reason } },   ← Law 3: enumerate or fail
               recompute?   { recipe_digest, committed_output_digest },   (required iff tier ≥ controlled;
                              recipe_digest = domainDigest(DOMAIN.recompute_recipe, recipe) —
                              the domain is consumed here, never artifactDigest)
               restriction? { reason, right_scaling_note } } }  (required iff tier=restricted)
   wrapper { …content, inventory_digest, producer_signature }

② simurgh.vsd.review_receipt.v1           ← a SECURE-REVIEW HOST signs (one per controlled claim)
   content { claim_digest, inventory_digest, host_identity_digest, host_key_fingerprint,
             recomputed_output_digest,        ← the HOST's rerun of THAT claim's committed recipe
             verdict ∈ {reproduced, not_reproduced} }
   wrapper { …content, receipt_digest, host_signature }
   (a receipt attests a rerun of the claim's OWN recipe — no claim may borrow another claim's
    recompute evidence)

③ simurgh.vsd.disclosure_attestation.v1   ← SIMURGH signs the attestation-of-record
   { claim_inventory: ①, review_receipts[]: ②,
     producer_identity { identity_subject, public_key_pem, key_fingerprint },
     verifier_identity { identity_subject, public_key_pem, key_fingerprint },
     artefacts_ref[] { artefact_id, path, digest },              ← the present artefacts, committed
     verdict_table[] { claim_id, proven_tier, support_quality, max_consequence_warranted,
                       inverted, right_scaling_distance },       ← verifier-computed, recomputable
     inventory_census_digest,
     attestation_signature }
```

Rules baked in (5E/5G rules carried): **external verifier pin** `{key_fp, identity_subject,
identity_digest}` supplied from outside the bundle, checked first; **external host registry**
(pinned secure-review host keys/subjects) supplied from outside the bundle, **never** a pack
default — an R1 receipt from an unpinned host fails closed; fingerprints recomputed from PEM
(shared SPKI-DER `fingerprintPublicKey` in `tools/simurgh-attestation/canonicalise.mjs`) before
any signature verifies; `withheld[]` entries carry **no content, only typed justification**
(AnthropicSafe: redacted material never enters the bundle); a `verdict` of `not_reproduced` is
**evidence, not an error** — it lowers `proven_tier`, it is never suppressed — and by the same
rule an **honest recompute-output mismatch is a tier fact, not an integrity error**: it caps
`proven_tier` below `public` and surfaces as 311 (overclaim) when `public` was declared;
302 additionally binds `identityDigest(producer_identity) == inventory.producer_identity_digest`
(the signed inventory names the key that signed it); unknown embedded trust/registry fields
fail 300.

### Raw codes — additive 300–315, frozen first-failure order, wrapper LAST

| Raw | Name                                         | Fires when                                                                                                                                                                                           | Owner module                 |
| --: | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 300 | `VSD_SCHEMA_INVALID`                         | shape/required keys missing; unknown embedded trust/registry fields; duplicate `claim_id`                                                                                                            | core/schema.mjs              |
| 301 | `VSD_ATTESTATION_TRUST_OR_SIGNATURE_INVALID` | reason∈{external_pin_missing, external_pin_mismatch, attestation_signature_invalid}                                                                                                                  | core/attestationTrust.mjs    |
| 302 | `VSD_INVENTORY_SIGNATURE_INVALID`            | producer sig over ① fails (fp recomputed from PEM first)                                                                                                                                             | core/inventorySignature.mjs  |
| 303 | `VSD_CLAIM_OUTSIDE_INVENTORY`                | verdict_table or a receipt references a `claim_id`/`claim_digest` not in the signed inventory                                                                                                        | core/inventoryMembership.mjs |
| 304 | `VSD_SCOPE_UNBOUND`                          | scope statement absent, or claim digest doesn't cover it (Law 4)                                                                                                                                     | core/scopeBinding.mjs        |
| 305 | `VSD_ARTEFACT_UNACCOUNTED`                   | a referenced `artefact_id` is neither `present[]` nor `withheld[]` (Law 3 — Completeness)                                                                                                            | core/artefactLedger.mjs      |
| 306 | `VSD_REDACTION_UNTYPED`                      | a `withheld[]` entry lacks typed justification / `available_at_tier`                                                                                                                                 | core/artefactLedger.mjs      |
| 307 | `VSD_ARTEFACT_DIGEST_MISMATCH`               | a `present[]` artefact's recomputed digest ≠ committed                                                                                                                                               | core/artefactLedger.mjs      |
| 308 | `VSD_REVIEW_HOST_UNPINNED`                   | controlled evidence present/required and the SUPPLIED registry is empty or lacks the host (registry not supplied at all = environment failure → 315, never 308)                                      | core/reviewReceipt.mjs       |
| 309 | `VSD_REVIEW_RECEIPT_INVALID`                 | host sig over ② fails; receipt's `claim_digest`/`inventory_digest` don't match                                                                                                                       | core/reviewReceipt.mjs       |
| 310 | `VSD_RECOMPUTE_RECIPE_INVALID`               | recipe-integrity: recomputed `recipe_digest` ≠ committed; recipe grammar violated; recipe reads an artefact not in its declared `present[]` inputs; constant-output form (Law 2's anti-gaming floor) | core/recompute.mjs           |
| 311 | `VSD_TIER_OVERCLAIM`                         | `declared_tier` > `proven_tier` (incl. `public` declared + honest recompute-output mismatch)                                                                                                         | core/tierOverclaim.mjs       |
| 312 | `VSD_EVIDENTIAL_INVERSION`                   | `declared_consequence` > `max_consequence(proven_tier)` (**Law 1 — headline**)                                                                                                                       | core/inversion.mjs           |
| 313 | `VSD_AUDIT_CENSUS_MISMATCH`                  | audit-tier: inventory↔verdict-table bijection / artefact census / committed `verdict_table` ≠ recomputed table (audit-only)                                                                          | core/census.mjs              |
| 314 | `VSD_POLICY_REJECTED`                        | strict policy: configured floor above the structural warrant (e.g. C2 requires `public`)                                                                                                             | core/policy.mjs              |
| 315 | `INTERNAL_OR_ENV_UNAVAILABLE_VSD`            | fail-closed wrapper (LAST); recompute kernel cannot execute                                                                                                                                          | core/vsdCore.mjs             |

- `VSD_PUBLIC_CHECK_ORDER = [300…312]` · `VSD_AUDIT_CHECK_ORDER = [300…313]`
- `VSD_AUDIT_ONLY_CODES = [313]` · `VSD_POLICY_CODES = [314]` · wrapper `315`
- `RUN_LEVEL_BY_RAW` 300–315 all `1`; kernel **read-only**; 315 the only env code, fails closed.
- Multi-claim semantics are **check-major** (the frozen first-failure order is over CHECKS): for
  each check in `VSD_PUBLIC_CHECK_ORDER`, evaluate all claims in inventory order; the first
  check that fails anywhere determines `raw` (first failing claim recorded in `trust_reason`).
  Audit tier evaluates **all** claims and emits the full `verdict_table` (no forward pass
  past 313).
- **Gauntlet note (313-that-was):** a `declared_support_quality` field was cut. `support_quality`
  is a bijective function of `proven_tier`, so a declared copy is statically determined by
  `declared_tier` — a check on it could only ever fail for a reason schema (300) already owns.
  A check that cannot fail for a fresh reason is a fake check; the field and its code die here.

### Conditional tier semantics (frozen — the 5G presence-driven model carried)

- `restricted` declared, restriction block present, consequence `contextual` → **raw 0** (a
  truthful restricted claim VERIFIES; it is rejected only by stricter policy 314 — never
  mislabelled malformed);
- controlled evidence (receipts) present → host pin + receipt must fully validate, else
  **308/309**; a **valid** receipt with `verdict: not_reproduced` is never 309 — it is a tier
  fact (proven < controlled), surfacing as 311/312 only if declarations exceed the capped tier;
- `public` declared → the recompute runs; **recipe-integrity violation → 310** (Law 2's
  anti-gaming floor: the recipe must be the committed recipe, read every artefact it declares
  as input, and admit no constant-output form); **honest output mismatch → tier capped below
  `public` → 311** (declared > proven); recompute kernel unavailable → **315**, never 310/311;
- `declared_tier > proven_tier` → **311**; consequence above warrant of `proven_tier` → **312**;
- **policy default is the structural warrant itself** — a no-op by design (`policy_evaluated`
  always reported; 314 exists as the configuration point for stricter local floors, exactly
  like 5G's DEFAULT_MIN_RUNG posture);
- **`vsdCore` is PURE** — the Node orchestrator runs `recomputeKernelRunner` (pinned in-repo
  deterministic recipe interpreter — no arbitrary code execution, 3T-style frozen recipe) and
  populates `ctx.recomputeResult`; public-tier claim present + `recomputeResult` null → 315.

### Tier computation (verifier-computed; declared fields inspected last)

```text
tierR0 = claim well-formed ∧ scope bound ∧ artefact ledger complete (Laws 3+4 are the FLOOR,
         every tier; typed redactions are floor too — an untyped redaction is 306, never a
         tier discriminator)
tierR1 = tierR0 ∧ method_summary_digest present ∧ review receipt valid under pinned host
              ∧ receipt.verdict == reproduced      (the receipt reruns THIS claim's recipe)
tierR2 = tierR0 ∧ method_summary_digest present ∧ withheld[] EMPTY
              ∧ offline recompute byte-matches committed output
         (EXPLICIT: R2 does NOT require an R1 receipt — Simurgh's own offline rerun outranks a
          host's; the public fixture claim carries no receipt and proves R2)
proven_tier = highest satisfied
support_quality = {R0: descriptive, R1: qualified, R2: full}   (computed, reported, signed)
max_consequence = {R0: contextual, R1: threshold_crossing, R2: threshold_crossing}
declared_tier > proven_tier → 311 ; declared_consequence > max_consequence(proven_tier) → 312
```

Result shape: `{raw, tier, record_authentic (¬{300,301,302,303}), attestation_valid (raw∈{0,314}),
verdict_table, inventory_census_verified (null on public tier), policy_evaluated (true ONLY when
the policy check actually ran; false when an earlier failure preempted it), policy_accepted (null
when bypassed/preempted), trust_reason}`. When `record_authentic` is false (raw ∈ {300–303}),
`verdict_table = []` — no downstream computation runs over an unauthenticated record.

---

## §3 — Evidence lanes, attestation tiers, parity

### Lanes (frozen A/B/C contract)

- **Lane A — CI byte-stable, synthetic.** Fixture keypairs: `verifier` (Simurgh), a **distinct**
  `producer` (synthetic lab), and a **distinct** `review-host`. External config supplied from
  **outside** the evidence dir: verifier pin `{key_fp, subject, identity_digest}` + **host
  registry** (pinned host key fps/subjects). The synthetic inventory is the **Oxford fixture
  family** (§6-C): a redacted-risk-report with three claims — `frontier7b-cbrn-threshold` (C2
  declared / `controlled`, host receipt `reproduced`), `frontier7b-harmbench-public` (C1 /
  `public`, recompute recipe over a committed eval-results artefact, byte-matches),
  `frontier7b-monitoring-context` (C0 / `restricted`, restriction + right-scaling note) —
  **raw 0 both tiers**. The recompute recipe is a **pinned in-repo deterministic aggregation**
  (score summary over the committed results JSON → committed output digest) — no arbitrary code
  execution, 3T frozen-recipe style. Tamper matrix exercises **every code 300–315**, including:
  inversion fixture (C2 on `restricted`), tier-overclaim via honest output mismatch (`public`
  declared, recipe output perturbed → 311), recipe-integrity gaming (constant-output recipe /
  undeclared input → 310), undeclared redaction (referenced artefact dropped from both
  ledgers), **the Maverick fixture** (scope swap: checkpoint_kind edited post-signature — named
  for the real evaluated-checkpoint ≠ released-checkpoint incident, §5), unpinned host, **the
  FrontierMath-holdout fixture** (valid-but-`not_reproduced` receipt → proven R0 → 311/312
  cascade — named for the real independent-recompute-gap incident, §5), kernel-null (315).
- **Lane B — two-process / three-key ceremony, deterministic (sidecar).** In VSD, **the Lane B
  ceremony IS the controlled-tier mechanism played for real**: process-2 holds the **review-host
  ceremony key**, blind-recomputes every domain-separated digest, re-verifies producer +
  attestation signatures (fp from PEM), independently reruns the R2 recipe and recomputes
  `proven_tier` + `support_quality` + inversion verdict per claim, and signs
  `simurgh.vsd.review_receipt.v1` — the receipt in the bundle and the ceremony receipt are the
  **same species**, which is the point: R1 is not a trust assertion, it is a rerun that happened.
  Ceremony transcript committed; deterministic, rerunnable.
- **Lane C — real disclosure (never CI-gated, digest-only/verify-only).** Two threads, both
  honest: **(C-1, the Frontier lever)** the independent droplet team acts as a **real producer**:
  they file a signed claim inventory over the eval they _actually ran_ in 5G (their PG2 foreign
  capture becomes a `present[]` artefact backing a C1/`public` claim — **cross-stage evidence
  chaining**: a prior Simurgh attestation as a committed artefact inside a NEW claim's manifest;
  3X composed our attestations into a signed timeline, this is the first time one backs a
  foreign claim), AND counter-sign an R1 receipt as a **real unaffiliated review host over OUR
  committed Lane-A claim** — paying `secure_review_host_independence_deferred` partially at
  birth. **Roles are split so no party hosts its own claim** (producer==host for the same claim
  would be grading-own-homework wearing an R1 badge): the team produces THEIR claim (Simurgh's
  ceremony key hosts it — host independent of producer, not of verifier, noted in evidence) and
  hosts OURS. Both are requested of the team; **either alone still seals the lane honestly**
  (what ran is what is signed; a decline is recorded, never re-rolled). **(C-2, the wedge
  demonstrator)** one claim from a **real published frontier-lab risk report** (public PDF;
  public wording stays provider-agnostic: "a frontier lab's February 2026 risk report") expressed
  as a VSD inventory at its honest tier — withheld artefacts enumerated from the report's own
  redaction notices — demonstrating the inversion detector on real-world material. Verify-only in
  reproduce; both outcomes sealed (a detected inversion is a successful demonstration, not an
  accusation — **"a tier is not a verdict on truth"**). **Lane C absence is fail-closed** (harder
  than 5G's if-exists-skip, a latent softness this stage repairs): a committed
  `campaign-outcome.json` with `status ∈ {completed, pending, declined, no_show,
environment_failed}` is REQUIRED — `completed` requires the real-disclosure dir and a raw-0
  verify; any other status forbids completed evidence; a missing record fails the reproduce (no
  silent absence; 5G's campaignOutcome semantics reused). `pending` is the honest state when the
  outbound pack is prepared but no independent-party run has returned yet (this stage ships at
  `pending`; the real capture is a post-tag activity, as in 5G).

### Attestation tiers (two-tier)

- **Public tier:** structure + signatures + pin + first-failure walk of `[300…313]`; reports
  `{raw, record_authentic, verdict_table (up to first failure), trust_reason}`.
- **Audit tier:** full rerun — every claim evaluated (no stop-at-first for the table), artefact
  census + inventory↔verdict bijection (314), full `verdict_table` with per-claim
  `{proven_tier, support_quality, max_consequence_warranted, inverted, right_scaling_distance}`.

### Parity capability matrix (frozen)

| Surface                                       | JS (Node 26)        | Python (stdlib-only)     | Browser (WebCrypto) |
| --------------------------------------------- | ------------------- | ------------------------ | ------------------- |
| canonicalJson + domain digests                | ✓                   | ✓ byte-agrees            | ✓                   |
| tier lattice + warrant + inversion arithmetic | ✓                   | ✓ byte-agrees            | ✓                   |
| Ed25519 signature verification                | ✓                   | — (JS's job)             | ✓                   |
| recompute kernel (recipe interpreter)         | ✓ orchestrator-only | —                        | — (`raw:null`)      |
| verdict_table recomputation                   | ✓                   | ✓ (digest+lattice slice) | ✓ (sans recompute)  |

Browser verifier: CSP no-egress, `raw:null` (advisory), same as 5G. Python: `vsd_parity.py`,
independent stdlib-only reimplementation, byte-agreement asserted in K7.

### Byte-stability

Deterministic builder (fixed nonces, fixed synthetic timestamps, sorted claim order); evidence
built twice into clean dirs and compared by **sorted manifest** (path + sha256 per file — catches
added/omitted files that pairwise `cmp` misses) plus `git diff --exit-code` on the committed
copy; evidence dir prettier-ignored; `pin.json` + `host-registry.json` OUTSIDE the evidence dir. 4H digest goldens regenerated under Node 26
(codes 300–315 ripple BOTH `exit-map.json` files + the exitWrapper inline map — known 5F/5G
gotcha, budgeted).

---

## §4 — Lean, scorecard, module map, sockets

### Lean (`proofs/stage5h/DisclosureTier.lean`, Lean 4.15 core, zero `sorry`, wired into `stage-4-lean-proofs.yml`)

Ten theorems + one lemma:

1. `tierMonotonicity` — R2 predicates ⊇ R1 ⊇ R0 (lattice is cumulative).
2. `warrantMonotone` — warrant is monotone in tier (no tier increase lowers max_consequence).
3. `inversionSound` — verdict accepted → `declared_consequence ≤ max_consequence(proven_tier)`
   (Law 1).
4. `tierOverclaimSound` — verdict accepted → `declared_tier ≤ proven_tier`.
5. `truthfulRestrictedVerifies` — a well-formed restricted claim with contextual consequence is
   accepted (reachability; policy-only rejection).
6. `notReproducedCapsTier` — receipt verdict ≠ reproduced → proven_tier < controlled.
7. `redactionCompleteness` — every referenced artefact is present ∨ withheld-typed (Law 3 as a
   totality theorem — the 4Y byte-partition move, applied to artefact ledgers).
8. `scopeBindingSound` — scope swap changes the claim digest (Law 4).
9. `noFullWithoutRecompute` — `support_quality = full` → recompute matched ∧ withheld = ∅.
10. `publicTierRequiresEmptyWithheld` — proven = public → withheld list empty.

- Lemma `verifierCodomainHasNoTruthBoolean` — the verdict codomain contains
  `{tier, quality, inversion}` and **no** `claim_true` field (the honesty guardrail as a
  type-level fact; sibling of 5G's no-independence-boolean lemma).

### Four-axis scorecard (honest spec-time / closeout target)

| Axis               | Now     | Target | What moves it higher (buildable artifacts, named)                                                                                                                                                                                                             |
| ------------------ | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | **9.3** | 9.3    | First executable evidential-inversion verifier (computed tier + warrant inequality + fail-closed). Oxford invented the tiers (credited); the incumbents are TEE-rooted. Higher (9.6) = crosswalk artifact `oxford_tier_conformance.md` reviewed by an author. |
| Frontier           | **8.5** | 9.3    | 9.3 = Lane C-1 executed (real independent producer + real unaffiliated host receipt). 9.6 = C-2 on a real published risk-report claim. 10 = a lab or reviewer files a real inventory.                                                                         |
| Good-for-Anthropic | **9.6** | 9.6    | Direct substrate for the RSP v3.0 disclosure regime (Risk Reports + expert reviewers + gap documentation). 10 = an actual Risk-Report reviewer runs the verifier (out of our hands; not scheduled — honest).                                                  |
| Constitution       | **9.5** | 9.5    | Mechanises "claims must not outrun their evidence" with a typed, fail-closed inequality; truth-boolean absence is a theorem.                                                                                                                                  |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it does not imply
Anthropic review, adoption, or endorsement._

### Module map (single owner per code)

`tools/simurgh-attestation/stage5h/`

- `constants.mjs` — TIER/CONSEQUENCE/QUALITY enums + `warrant()` + rank helpers + DOMAIN +
  `VSD_SCHEMAS` + `DEFAULT_POLICY` + `VSD_RESERVED_SLOTS`
- `core/digests.mjs` (+ identityDigest/artifactDigest) · `core/signatures.mjs` (shared SPKI-DER
  `fingerprintPublicKey` + domain-separated verifyContent)
- `core/schema.mjs` (300) · `core/attestationTrust.mjs` (301) · `core/inventorySignature.mjs`
  (302) · `core/inventoryMembership.mjs` (303) · `core/scopeBinding.mjs` (304) ·
  `core/artefactLedger.mjs` (305/306/307) · `core/reviewReceipt.mjs` (308/309) ·
  `core/recompute.mjs` (310) · `core/tierLattice.mjs` (pure computation, incl. computed
  `support_quality`) · `core/tierOverclaim.mjs` (311) · `core/inversion.mjs` (312) ·
  `core/census.mjs` (313) · `core/policy.mjs` (314) · `core/rightScalingDistance.mjs` (§6-B
  projection) · `core/inversionCensus.mjs` (§6-A projection) · `core/disclosureDebt.mjs` (§6-E
  projection) · `core/campaignOutcome.mjs` (Lane C outcome record; no raw code — throws, 5G
  semantics: only `completed` may carry disclosure evidence) · `core/vsdCore.mjs` (315 wrapper;
  **PURE** — kernel in orchestrator)
- `node/recomputeKernelRunner.mjs` · `node/buildBundle.mjs` (deterministic synthetic) ·
  `node/build-vsd-evidence.mjs` · `node/verify-vsd-attestation.mjs` (orchestrator;
  `process.exitCode = raw===0 ? 0 : 1`)
- `laneb/ceremony.mjs` · `laneb/run-laneb-review-ceremony.mjs`
- `lanec/build-real-disclosure.mjs`
- `python/vsd_parity.py` · `browser/vsd-portable.mjs` + `browser/index.html`
- `proofs/stage5h/DisclosureTier.lean`
- fixtures `tests/unit/llmShield/stage5h/_validBundle.mjs` (deterministic; `resign()` re-signs
  ALL THREE objects — 5F mutation gotcha) + `_ctx.mjs`
- `tests/e2e/llmShield/stage5h/k7AllFunctions.test.js` (every export + tamper matrix +
  cross-stage invariants + parity byte-agreement) — **MANDATORY before tag**
- `scripts/reproduce-llm-shield-stage5h.sh` (fail-closed TWO-LINE gates — the 5E fail-open
  lesson; Lane C verify-only conditional step; byte-stability step)
- 3m/3o priv-key audit allowlist line for stage5h test keys (known red-CI gotcha, budgeted).

### Evidence-artifact map

`docs/research/llm-shield/evidence/stage-5h/` — `vsd-attestation.json`, `claim-inventory.json`,
`review-receipts.json`, `artefacts/` (present artefacts incl. eval-results JSON),
`recompute-recipe.json`, `inventory-census.json`; Lane B `laneb/` transcript + receipt; Lane C
`real-disclosure/` (verify-only). External: `stage5h/pin.json` + `stage5h/host-registry.json`
(prettier-ignored additions).

### Sockets (mint 5, pay/narrow 2 — anti-hoarding ledger)

**Narrows:** the repo's own two-tier attestation posture (tiers chosen by us → tier now
_computed_); 4W/4X's `lexical-not-semantic` seam explicitly inherited on `claim_text_digest`.
**Pays partially at birth (Lane C-1):** `secure_review_host_independence_deferred` gets its first
real unaffiliated host receipt. **Mints:**

- `consequence_self_rating_contest_deferred` (→ VPC)
- `secure_review_host_independence_deferred` (residual: host _pinned_, not proven independent)
- `withheld_artefact_content_deferred`
- `claim_text_semantic_binding_deferred`
- `real_risk_report_pilot_deferred` (the founder's-ledger blocker, tracked as debt)

---

## §5 — Gap hunt (wedge + prior-art kill-test, executed 2026-07-10)

**The wound, primary-pinned.** A frontier lab's RSP v3.0 (effective 2026-02-24, primary:
anthropic.com/news/responsible-scaling-policy-v3) replaced its hard-limit pause trigger with a
disclosure regime: _"Risk Reports will be published online (with some redactions) every 3-6
months"_; _"expert third-party reviewers… unredacted or minimally-redacted access"_; reports
documenting _"any gaps."_ That regime's three access levels + gap inventory are **structurally
the Oxford three-tier framework + claim inventory — with no recomputable substrate.** VSD is the
substrate.

**The named disease (verbatim, arXiv:2605.08192, Vishwarupe/Shadbolt/Jirotka/Flechais):** _"the
artefacts needed to evaluate them are routinely withheld, producing an evidential inversion: the
most consequential claims in AI safety are often the least reproducible."_ Their T1/T2/T3 +
claim inventory + scope statements + federated colloquium are **governance proposals**
(checklists, panels, sanctions) — the paper contains **no verifier, no digests, no fail-closed
semantics.** VSD instantiates their machinery as executable checks; the tier taxonomy is
**credited to them, not claimed** (the 5G/OVERT honesty lesson, applied at spec time this round).

**Quantified (FMTI 2025, Wan et al., Stanford CRFM, primary PDF crfm.stanford.edu/fmti):**
sector transparency **58 → 40/100**; **0 companies** disclose train-test overlap;
"reproducibility" and "third-party involvement" named among the weakest dimensions.

**Incidents in the wild (the disease happening without VSD — fixture-named):**

- **The Maverick incident (scope substitution = Law 4, live).** Meta submitted an experimental,
  preference-optimized Llama-4 Maverick variant to LMArena (ranked near the top) while shipping a
  different production model that ranked far lower once evaluated (reported: #2 → #32; primary =
  LMArena's April 2025 policy statement; the January 2026 "fudged a little bit" admission is
  reported, secondary). The checkpoint evaluated was not the checkpoint released — **exactly what
  a digest-bound scope statement (checkpoint_kind) makes impossible.** Lane A's scope-swap tamper
  is named **the Maverick fixture**.
- **The FrontierMath incident (undisclosed access + independent recompute gap).** A benchmark
  vendor's primary funder had access to problems and solutions — undisclosed to contributors —
  with only a 50-question holdout for independent verification (primary pinned:
  epoch.ai/blog/openai-and-frontiermath — Epoch's own clarification, incl. _"restricted from
  disclosing the partnership until around the time o3 launched"_). Reported (secondary): a
  claimed ~25–26% score vs ~10% on independent evaluation. The holdout-set safeguard IS the
  controlled-tier mechanism (a named host reruns and counter-signs); the announced score without
  it is `support_quality: descriptive` presented as `full`. Lane A's
  valid-but-`not_reproduced`-receipt tamper is named **the FrontierMath-holdout fixture**.
- **Self-graded eval hubs (lab surface).** A frontier lab publishes a safety-evaluations webpage
  of self-reported scores; contemporaneous criticism (reported): _no independent oversight,
  relies entirely on internal testing._ Numbers without artefacts, tiers, or recompute paths —
  an untyped R0 presented with the visual authority of R2. VSD types that distinction instead of
  arguing it.

**Regulatory clock (two jaws):** EU AI Act GPAI **transparency rules + Commission enforcement
powers both land 2026-08-02** (Model Documentation Form; 10-year retention). And the GPAI Code
of Practice **Safety & Security chapter** requires a **Safety and Security Model Report**
submitted to the AI Office before release — _"a detailed account of model evaluations…
evaluation strategies, and evaluation results"_ — while the **published** version carries only
_"high-level summaries."_ Detailed-to-regulator / summary-to-public / rest-withheld is the tier
lattice again, mandated, with no recomputable substrate. A recomputable disclosure artifact
ships weeks before the obligation bites.

**Prior-art kill-test (each neighbour's seam, in their own words):**

| Neighbour                                   | What it is                                    | The conceded seam                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oxford three-tier (arXiv:2605.08192)        | governance framework + venue sanctions        | no executable verifier — panels and checklists, human-enforced                                                                                                                                                                                                                                                         |
| Attestable Audits (arXiv:2506.23706)        | TEE benchmark attestation                     | _"requires the participating parties to trust the hardware vendor… in our case AWS"_                                                                                                                                                                                                                                   |
| Bicakci attested bundle (arXiv:2604.25200)  | TEE-signed eval bundle                        | binds TEE measurement, "depends on manufacturer integrity"; no consequence/tier lattice; no offline byte-recompute                                                                                                                                                                                                     |
| Brundage et al. AALs (arXiv:2601.11699)     | audit assurance-level taxonomy                | open problem #4: _"achieving technical readiness for high AI Assurance Levels"_ — the executable layer doesn't exist                                                                                                                                                                                                   |
| FMTI (arXiv:2512.10169)                     | annual transparency **scoring**               | human-scored index, yearly cadence, not per-claim, not cryptographic, not fail-closed                                                                                                                                                                                                                                  |
| Behavioural-assurance position (2605.15164) | argues testing can't verify governance claims | names the gap; proposes direction, not a verifier — and marks VSD's own bound (reproducibility ≠ validity)                                                                                                                                                                                                             |
| IETF SCITT (draft-ietf-scitt-architecture)  | append-only registry of signed statements     | content-opaque by design: _"Issuers can make false Statements either intentionally or unintentionally; registering a Statement only proves it was produced by an Issuer"_ (§9.2); _"The Statement is considered opaque to Transparency Service"_ (§3) — provenance/logging, no tier computation, no warrant inequality |
| Self-graded eval hubs (lab webpages)        | self-published safety-score dashboards        | no artefacts, no cryptographic binding, no independent recompute path (criticism reported: _no independent oversight_) — the disease, not a competitor                                                                                                                                                                 |

**VSD's uncontested axis:** TEE-free · offline · byte-reproducible · per-claim · fail-closed ·
consequence-vs-tier inequality. No neighbour occupies any two of the last three.

**Positioning honesty (the statement of record):** VSD is **not category-creating on tier
taxonomy** — Oxford defines the tiers, FMTI defines transparency scoring, Brundage defines
assurance levels. VSD's new geometry is narrower and executable: the **computed** tier, the
**typed warrant pair**, and the **fail-closed right-scaling inequality**, per claim, offline,
TEE-free. SCITT is **complementary, not competitive**: a VSD attestation is exactly the kind of
Signed Statement a SCITT Transparency Service could register — VSD computes precisely what SCITT
declares opaque (a bridge note, deliberately not minted as a socket). Crosswalks deferred; no
conformance claimed.

---

## §6 — Beast inventions (folded in; each with its anti-gaming non-claim in the same breath)

- **A — Inversion Census.** A signed projection over the audit `verdict_table`: the
  (consequence × proven-tier) occupancy grid of an entire report — "3 threshold-crossing claims:
  1 public, 2 controlled, 0 restricted." One glance shows where a report's most consequential
  claims sit on the reproducibility lattice; the count of inverted cells is the headline scalar.
  Zero new code paths (pure projection of already-verified data). _Non-claim: the census
  measures disclosure geometry, not report quality — a report with zero C2 claims is not thereby
  "safer."_
- **B — Right-Scaling Distance.** Per claim:
  `max(0, rank(declared_consequence) − rank(max_consequence(proven_tier)))`. Zero =
  right-scaled; the report-level sum is its **inversion magnitude** — the field's "evidential
  inversion" turned into a signed number (the 4X move: yesterday's adjective, today's integer).
  _Non-claim: distance 0 ≠ claim true; it measures entitlement alignment, not correctness._
- **C — The Frontier-7B fixture family.** Lane A's synthetic report is the Oxford paper's own
  worked example ("Constitutional Refusal Training Reduces CBRN Uplift on Frontier-7B…", claims
  C1/C2/C3) — the first Simurgh fixture family **named after and traceable to a published
  academic worked example**, making the spec independently checkable against its source.
  _Non-claim: fixture fidelity to the example ≠ endorsement by its authors; no conformance
  claimed._
- **D — Cross-Attestation Chaining (Lane C-1).** A prior stage's real attestation (5G's foreign
  capture) enters a claim's `present[]` artefact manifest by digest — evidence _about_ evidence,
  verifiable end-to-end. Honest lineage: 3X already composed Simurgh attestations into a signed
  timeline; the new geometry here is a prior attestation serving as a **committed artefact
  backing a foreign party's claim**, not chronology. _Non-claim: chaining binds bytes of the
  prior attestation, not the truth of the claim it now supports._
- **E — Disclosure Debt.** Every `withheld[]` entry's `available_at_tier` makes redactions
  **typed IOUs**: the signed ledger of what would become checkable at which access level. A pure
  projection ("this report's debt: 4 artefacts, 3 payable at controlled"). _Non-claim: debt
  enumeration ≠ justification validity — the verifier checks the ledger is complete and typed,
  not that a `safety_hazard` justification is warranted
  (`withheld_artefact_content_deferred`)._

---

## Self-gauntlet ledger (executed 2026-07-10 — 14 findings, all resolved in-text)

Resolved into the spec above (receipts):

1. **[FIXED] Law-1 boundary quoted narrower than enforced.** The C1-on-R0 exclusion was
   justified only by the threshold-crossing half of the source quote; §1 now cites both halves
   (_"limited contextual or descriptive use only"_ excludes C1).
2. **[FIXED] 310 re-owned; Law 2 contradiction dissolved.** Law 2 said mismatch "lowers
   proven_tier" while old-310 made it a hard integrity failure. Now: honest output mismatch =
   **tier fact** → 311 via declared>proven; **310 = recipe-integrity only** (committed-recipe
   digest, declared-input coverage, no constant-output form) — which also settles the old
   recipe-gaming question with a frozen rule instead of a plan-time TODO.
3. **[CUT] 313 `VSD_SUPPORT_QUALITY_OVERCLAIM` + the `declared_support_quality` field.**
   `support_quality` is a bijective function of `proven_tier`; a declared copy is statically
   determined by `declared_tier`, so the check could only fail for a reason schema already owns.
   A check that cannot fail for a fresh reason is a fake check. Span is now **300–315**
   (16 codes); census/policy/wrapper renumbered 313/314/315.
4. **[FIXED] Dead tier-discriminator.** `redaction justifications typed` appeared in tierR1 but
   is a hard 306 floor — it could never discriminate R0 from R1. Removed; floor noted.
5. **[FIXED] Phantom R1 requirement.** §1's R1 row required a "public method summary" that no
   schema field carried; `method_summary_digest` added to claim content + tierR1.
6. **[FIXED] Multi-claim first-failure order was ambiguous** (claim-major vs check-major).
   Pinned **check-major**: the frozen order is over checks; claims iterate inventory-order
   inside each check.
7. **[FIXED] Unverifiable committed `verdict_table`.** 301 catches edits, but nothing forced the
   signed table to equal the recomputation; audit census (313) now includes table equality.
8. **[FIXED] Producer-identity binding unstated.** 302 now explicitly binds
   `identityDigest(producer_identity) == inventory.producer_identity_digest`.
9. **[FIXED] Dead domains.** `scope_statement`/`artefact_manifest` separators had no consuming
   check; cut. Rule added: every listed domain is consumed by a named check.
10. **[FIXED] Policy default had no stated semantics.** Pinned: default = structural warrant
    (honest no-op; 314 is the configuration point), 5G DEFAULT_MIN_RUNG posture.
11. **[FIXED] §6-D "first cross-stage composition" overclaimed vs 3X.** 3X composed our
    attestations into a signed timeline; wording narrowed to "first prior attestation as a
    committed artefact backing a foreign claim," 3X credited.
12. **[FIXED] Lane C-1 "and/or" ambiguity.** Pinned: both requested; either alone seals the
    lane honestly; declines recorded, never re-rolled.
13. **[FIXED] `not_reproduced` cascade legs.** Semantics frozen in §2: valid-negative receipt is
    never 309; it caps tier, surfacing 311/312 only if declarations exceed the cap. The three
    legs (declared controlled → 311; declared restricted + C0 → raw 0; declared restricted +
    C1/C2 → 312) are the FrontierMath-holdout fixture family.
14. **[OPEN — closeout review] Lane C-2 wording vs. evidence bytes.** Public wording stays
    provider-agnostic while the evidence dir will contain a real report's digests. 5G precedent
    (a real vendor named in evidence, banners neutral) says acceptable; confirm at closeout.
