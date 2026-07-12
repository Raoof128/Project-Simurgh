# Stage 5J — VRC: Verifiable Rating Contest (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Version **v2.45.0-stage-5j-vrc** · raw codes **332–347** · branch `stage-5j-vrc`.
> Arc: External Accountability — `VFC (5G) → VSD (5H) → VPC (5I) → VRC (5J) → VUC … (VTC penciled) → capstone`.
> VPC = coverage completeness; **VRC = rating contest (this rung)**; VUC = universe commitment;
> VTC = temporal coverage (penciled, distinct blade); capstone = composition of the finished rungs.

Thesis being extended: Simurgh is the independent, byte-reproducible VERIFICATION layer for
agent/oversight containment. Every stage adds ONE falsifiable blade. The moat is the Completeness
Invariant (no selective omission) plus academic depth. Honesty guardrail for this stage: "the
rating obligations were complete and no favourable override was silently dropped, verifiably" —
NEVER "the reviewer was right", "the rating was correct", or "the model is safe".

**What VRC is, in one line.** A machine-verifiable **contest-preservation system**: it proves that
ratings were complete over the VPC-committed universe, that historical divergence could not be
erased, and that every favourable override received a bound response. **It does not decide who was
right.**

---

## §1 — Identity · laws · blade

### The wound (verbatim-anchored, conditional)

**Primary wedge: Anthropic RSP v3.4** (effective 8 July 2026). The confirmed verbatim anchor is the
split-review coverage requirement — _"external review of our Risk Reports can involve multiple external
reviewers reviewing different unredacted sections of the Risk Report, so long as all parts of the
unredacted report are evaluated by at least one external reviewer"_ — over Risk Reports that
**quantify risk across all deployed models**. The external-review process is _reported_ to solicit the
reviewer's **areas of disagreement with the report's key claims** and risk-reduction recommendations
(reported-until-pinned — see the guard). So the two halves VRC needs already exist in the process — a
_quantified_ producer risk rating and a reviewer _disagreement_ — but the RSP specifies them as
**prose**, not a machine-recomputable per-section pairing of producer rating against reviewer
disagreement. VRC adds that executable, byte-reproducible pairing.

**Real-world grounding (subject-relevance only, no rating extraction).** Cross-party frontier
evaluation already happens: METR reviewed the Opus 4.6 Sabotage Risk Report, and Anthropic and OpenAI
ran a pilot in which each evaluated the other's public models with in-house misalignment evaluations
and released findings in parallel. The world runs two-party assessments over shared subjects; it
lacks the recomputable divergence ledger VRC defines. (These relationships justify subject choice and
evaluator-class relevance — they populate neither side of a rating pair.)

> Source-precision guard: version **settled — RSP v3.4, effective 8 July 2026**, confirmed from the
> canonical policy page (`https://www.anthropic.com/responsible-scaling-policy`); the split-review
> sentence above is verbatim from it. The **"areas of disagreement" section + 30-day public-commentary
> window is reported-until-pinned** — the canonical page did not surface that exact section text, so it
> must be pinned from the Risk Report template before it hardens into a quoted claim, or kept flagged
> as reported. (An earlier draft's "v3.1" from a CDN PDF was a stale artifact.)

**Secondary wedge: EU GPAI Code of Practice.** The Code is a **voluntary** compliance tool. Its
Safety and Security chapter applies to providers of GPAI models with **systemic risk** that use the
Code as a route to demonstrate compliance. It mandates qualified independent external evaluation and
asks providers to state whether and how external-evaluator input informed the proceed decision. On
the scoped reading it does **not** specify a machine-recomputable provider↔evaluator divergence
ledger. VRC addresses that observed **format gap** (an observation from the scoped sweep — not a
proof-of-absence over the entire EU framework).

**The live cost of absence.** External evaluation exists but does not bite: on the public record, no
model has been blocked, postponed, or constrained as a result of an external evaluation, and nothing
records when a producer's published rating diverged from an evaluator's finding or whether the
divergence was quietly dropped. VPC (5I) proved every section _reached_ an independent reviewer; it
said nothing about what the reviewer _said_ or whether an unfavourable rating survived to the
published report.

### The blade

VRC derives, from VPC's already-equality-committed coverage relation, an exact **rating-obligation
set** and requires the ledger's active-rating set to **equal** it on both sides (reviewer and
producer). Over that committed set it recomputes, offline, the divergence relation under a signed
canonical rating scale, preserves every divergence as an **append-only contest event**, and **fails
closed** on any silent favourable override, missing/orphan rating, forged supersession, replayed
response, or phantom concurrence.

```text
required_reviewer_pairs   = {(s,r) : s ∈ C(r)}     -- derived from the verified 5I coverage relation
required_producer_sections = S                      -- the VPC-committed section universe

active_reviewer_pairs      = required_reviewer_pairs   -- exact equality, both sides
active_producer_sections   = required_producer_sections
```

Divergence, defined over _contemporaneous active heads_ at each logical transition (not arbitrary
historical cross-products):

```text
D = { (s,r) | at some epoch, the active producer head on s is strictly more favourable
              than reviewer r's active comparable head on s, under the committed rating scale }
```

Each element of `D` is materialised as an append-only **contest event** that cannot be erased by a
later supersession, and must carry exactly one valid bound producer response.

**Contest recorder, not truth arbiter.**

### The three laws (falsifiable)

1. **No Missing or Orphan Rating.** Every required `(s,r)` has exactly one active reviewer-signed
   rating entry (value may be `abstain`/`not_assessed`, but signed by _that reviewer_); every
   committed section has exactly one active producer-signed self-rating; and every active rating maps
   to its required subject. Exact equality on both sets. _(raw 333–337)_
2. **No Silent Favourable Override.** Where a producer head is strictly more favourable than a
   reviewer head under the scale's `severity_direction`, an append-only contest event exists and
   acceptance requires a signed producer response receipt bound to that event's full
   `contest_event_digest`. A later rating may change the _current_ comparison but cannot delete,
   overwrite, or discharge an earlier contest event. _(raw 342–343)_
3. **No Phantom Concurrence.** A `reviewer_concurrence_backed` state requires that reviewer's
   signature over the `contest_event_digest`. A producer response is not concurrence; silence is not
   concurrence. _(raw 344)_

### Rating-state vocabulary (two orthogonal fields)

```text
comparison_state : non_comparable | comparable_uncontested | comparable_contested
contest_state    : not_applicable | contested_unanswered | contested_response_recorded
                                   | reviewer_concurrence_backed | contested_reviewer_maintains
```

`abstain` / `not_assessed` / cross-scale / out-of-dimension ⇒ `non_comparable` + `not_applicable`;
they satisfy the presence obligation but are **excluded from the comparable-pair denominator**. Both
`reviewer_concurrence_backed` (reviewer accepts the producer response) and `contested_reviewer_maintains`
(reviewer's signed last word: dissent survives the response — beast-mode G8) are terminal and
reachable **only** from `contested_response_recorded`; they are mutually exclusive per (event,
reviewer). Reviewer silence after a response stays `contested_response_recorded` — silence is never
read as agreement.

### Signed bound (up front — the next rungs' targets)

VRC proves _divergence was surfaced, obligations were complete on both sides, and suppression fails
closed_ — NOT that any rating is **correct** (no truth oracle → `rating_truth_oracle_deferred`), NOT
that a recorded response is **adequate/justified** (→ `response_adequacy_deferred`), NOT that the
section universe is complete relative to the real-world report/eval surface/risk domain (→ VUC), NOT
that review was **timely** (logical epoch order only → VTC). Cross-scale comparison is forbidden in
v1 (deliberately — mappings are disguised truth-adjudication).

### New evidence species

A signed **contested-rating ledger** keyed to VPC coverage — the repo's first artifact where _active
favourable-overwrite suppression_ is the thing that fails closed (not absence, not omission of a
document, but the active erasure of a recorded divergence).

---

## §2 — Artifact schema · raw partition · frozen check order

All digests over `canonicalJson`. The pure `vrcCore` owns the frozen first-failure order; crypto
(Ed25519 / SPKI-DER) arrives via injected `facts` (the 5I B11 pattern), so a malformed bundle is
332, never a 347 throw.

### Upstream binding (derive, never copy)

```text
vpc_ref {
  vpc_bundle_digest    // digest over the verified 5I attestation.content — binds the whole upstream
  panel_subject_root   // 5I attestation.content.panel_subject_root
  panel_evidence_root  // 5I attestation.content.panel_evidence_root
  partition_digest     // 5I attestation.content.partition_digest   ← the committed section universe S
}
producer_ref {
  producer_identity_digest  // REUSE 5I partition.content.producer_principal.producer_identity_digest
  producer_key_fingerprint  // SPKI-DER fingerprint of the producer signing key
}
```

The verifier loads the verified 5I bundle by these anchors and **derives** `S` (leaves under
`partition_digest`), `C(r)` (from 5I `coverage_receipts[]` — each `reviewer_principal` covering its
`evaluated_sections` — under `panel_subject_root`/`panel_evidence_root`), and reviewer keys (from the
receipts' identity refs). No independently trusted copy of the relation is accepted.

### Artifact (`vrc_bundle`)

```text
vrc_bundle {
  schema_version                    // pinned; gates reserved-slot activation
  vpc_ref { … }                     // above
  producer_ref { … }                // above
  rating_scale {                    // the "more favourable" lock — signed
    rating_scale_id, rating_scale_version
    severity_direction              // which ordinal end is "more severe"
    ordinal_ranks { label: rank }   // finite, committed
    comparable_dimensions[]         // explicit; anything outside → non_comparable
    sig(scale_authority)
  }
  rating_obligation_root            // commit over { required_reviewer_pairs, required_producer_sections = S }
  epoch_tickets[] {                 // signed logical sequence (NOT wall-clock)
    ledger_epoch, previous_epoch_ticket_digest, entry_type, entry_digest, ledger_id
    sig(ledger_authority)
  }
  reviewer_ratings[] {              // append-only chain per (s,r)
    entry_digest, chain_subject="reviewer:s:r", revision, supersedes_digest,  // null only at genesis
    section_id, reviewer_id, rating_scale_digest, dimension_id,
    value_kind,                     // ordinal | abstain | not_assessed
    value,                          // present only when ordinal
    ledger_epoch, sig(reviewer)
  }
  producer_ratings[] {              // append-only chain per s (same entry shape, chain_subject="producer:s")
    …, sig(producer)
  }
  contest_history[] {               // append-only; never erased
    contest_event_digest = H(section_id, reviewer_id, producer_rating_digest,
                             reviewer_rating_digest, rating_scale_digest, ledger_epoch)
  }
  producer_responses[] {
    contest_event_digest,           // FULL event digest (anti-replay)
    response_body_digest, ledger_epoch, sig(producer)
  }
  concurrences[] {
    contest_event_digest, reviewer_id, concurrence_claim, concurrence_epoch, sig(reviewer)
  }
  reviewer_rebuttals[] {            // beast-mode G8 — the reviewer's signed last word (dual of concurrence)
    contest_event_digest, reviewer_id, rebuttal_claim, rebuttal_epoch, sig(reviewer)
  }
  projections {                     // untrusted outputs; recomputed exactly (audit tier)
    divergence_census
    favourable_skew { favourable_count, comparable_pair_count }
    concurrence_backing { backed_claim_count, total_concurrence_claim_count }
    downgrade_depth { total_rank_delta, contested_pair_count }   // beast-mode G1 — the number nobody publishes
    projection_root
  }
  // active optional bridge (beast-mode G3) — NOT a reserved slot: when present, an in-toto/SCITT
  // statement whose subject MUST recompute to contest_layer_root; verified in the audit tier (345
  // family). When null it is simply absent. Non-claim: registration proves the statement was logged,
  // not that the rating is true.
  external_registry_anchor   : null | intoto_statement
  // arc spine — reserved slots, structural union so 346 is reachable (strict-null would be caught at 332 first)
  universe_commitment_anchor : null | reserved_anchor_object   // VUC pays
  review_window_binding      : null | reserved_anchor_object   // VTC pays
  campaign_composition_root  : null | reserved_anchor_object   // capstone consumes
}
```

**Derived state** (computed by pure `vrcCore`, never stored as trusted input): each `(s,r)` gets
orthogonal `comparison_state` + `contest_state` as in §1. The **active head** of a chain is the
unique valid head after topology validation (one genesis, contiguous revisions, no fork, no cycle, no
detached entry, no cross-subject supersession, exactly one head).

**No cross-scale.** Every ordinal rating binds the exact top-level `rating_scale_digest`; a mismatch
is 338. No signed scale-mapping machinery exists in 5J.

### Raw codes 332–347 — house-partitioned (public → audit → policy → wrapper), all exit 1

| Raw | Tier       | Meaning                                                                                                                                                                                    |
| --: | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 332 | public     | rating-ledger schema invalid                                                                                                                                                               |
| 333 | public     | VPC anchor mismatch (`vpc_ref`/`producer_ref` ≠ referenced verified 5I bundle)                                                                                                             |
| 334 | public     | rating-obligation root mismatch (reviewer pairs = C(r) **and** producer sections = S)                                                                                                      |
| 335 | public     | required rating missing (reviewer pair or producer section)                                                                                                                                |
| 336 | public     | orphan rating (out-of-panel reviewer / out-of-universe section / non-required subject)                                                                                                     |
| 337 | public     | rating-chain topology invalid or active head ambiguous (incl. broken epoch-ticket chain)                                                                                                   |
| 338 | public     | rating scale invalid, unsigned, or `rating_scale_digest` mismatch across compared entries                                                                                                  |
| 339 | public     | non-canonical comparison (ordinal comparison attempted on a `non_comparable` pair)                                                                                                         |
| 340 | public     | reviewer rating signature invalid                                                                                                                                                          |
| 341 | public     | producer rating signature invalid                                                                                                                                                          |
| 342 | public     | **contest-event census mismatch** (`stored ≠ recomputed_historical`) or a required event has no response object — _No Silent Favourable Override_                                          |
| 343 | public     | producer response object present but invalid (signature / binding / uniqueness / subject / epoch / anti-replay)                                                                            |
| 344 | public     | **phantom reviewer statement** — a concurrence _or_ rebuttal state without a valid reviewer sig over the `contest_event_digest`, or both asserted by one reviewer on one event (ambiguous) |
| 345 | audit-only | projection census mismatch (Divergence Census / Favourable-Skew num+denom / Concurrence-Backing recompute)                                                                                 |
| 346 | policy     | reserved future slot activated (non-null reserved branch under current `schema_version`)                                                                                                   |
| 347 | wrapper    | fail-closed catch-all (test-only injected unmapped throw)                                                                                                                                  |

342 is the suppression code (census equality + response presence); 343 is the forged-receipt code
(a present response that fails validation). Legitimate producer revision is allowed: a supersession
that preserves the earlier contest event and its answered receipt verifies **raw 0**.

### Frozen first-failure order (tier-parameterised)

```text
public_order : 332 → 333 → 334 → 335 → 336 → 337 → 338 → 339 → 340 → 341 → 342 → 343 → 344 → 346 → 347
audit_order  : 332 → 333 → 334 → 335 → 336 → 337 → 338 → 339 → 340 → 341 → 342 → 343 → 344 → 345 → 346 → 347
```

Order is **house-partitioned** (public checks, then the audit-only projection recompute, then the
policy-house reserved-slot check, then the wrapper) and, _within_ the public house,
structural-before-crypto — 346 is late because it is a policy-house check, not because it is
expensive.

---

## §3 — Evidence lanes · two-tier attestation · parity

### Two domain-separated attestations

```text
vrc_public_attestation {
  object_type: "simurgh.vrc.public_attestation.v1"
  tier: "public"
  vpc_bundle_digest, vrc_bundle_digest
  rating_obligation_root, rating_ledger_root, contest_layer_root
  verdict_raw, checked_raw_range: [332..344, 346]
  projection_status: "not_verified"
  verifier_identity, signature
}
vrc_audit_attestation {
  object_type: "simurgh.vrc.audit_attestation.v1"
  tier: "audit"
  public_attestation_digest, vrc_bundle_digest, projection_root
  verdict_raw, checked_raw_range: [332..346]
  verifier_identity, signature
}
```

with

```text
rating_ledger_root  = H(reviewer_ratings, producer_ratings)
contest_layer_root  = H(epoch_tickets, contest_history, producer_responses, concurrences, reviewer_rebuttals)
```

The public tier never certifies projections (`projection_status: "not_verified"`); the audit tier
chains to it via `public_attestation_digest`. Two-root design so the contest layer cannot cycle the
top-level digest.

### Lane A — byte-stable synthetic Fable-5 laundering pack (CI-gated)

Committed test-keys → deterministic Ed25519. Scenario: after a Fable-5 input-filter miss, the
producer publishes a _favourable_ self-rating on a section; an external reviewer publishes a
_stricter_ consequence rating. Base pack verifies **raw 0** (public + audit), byte-stable (build
twice, `cmp`). Fable-5 is a **deterministic adversarial fixture**, not evidence of a real rating
dispute.

**Full raw-code reachability (the K7 net — every code 332–347 uniquely classified):**

| Raw | Negative arm (downstream hashes/sigs repaired so it reaches _exactly_ this first-failure)                                                   |
| --: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 332 | malformed schema                                                                                                                            |
| 333 | altered 5I anchor                                                                                                                           |
| 334 | valid-looking but false obligation root                                                                                                     |
| 335 | missing reviewer rating **and** (separate arm) missing producer rating                                                                      |
| 336 | validly signed orphan subject                                                                                                               |
| 337 | forked chain / two valid heads                                                                                                              |
| 338 | invalid scale signature or digest                                                                                                           |
| 339 | coerced abstention into ordinal comparison                                                                                                  |
| 340 | invalid reviewer signature                                                                                                                  |
| 341 | invalid producer-rating signature                                                                                                           |
| 342 | aligned producer supersession that omits the earlier required contest event **and** (separate arm) a required event with no response object |
| 343 | present-but-invalid / replayed response                                                                                                     |
| 344 | unbacked concurrence **and** (separate arm) unbacked rebuttal (phantom reviewer statement)                                                  |
| 345 | projection mismatch — audit rejects while public accepts                                                                                    |
| 346 | reserved slot activated (non-null branch)                                                                                                   |
| 347 | test-only injected dependency throws unexpectedly                                                                                           |

**Positive control (proves VRC is not "ratings may never change"):** producer revises its rating
_after_ responding, preserving the historical contest event and receipt → **raw 0**.

### Lane B — deterministic multi-party rating ceremony (runs in CI as a ceremony)

Per-party child processes — ≥1 producer, ≥2 reviewers, a ledger authority — each signing its own
ratings/tickets under its own key. Asserts key distinctness:

```text
ledger_authority_key ≠ producer_key ; ledger_authority_key ≠ every reviewer_key ; producer_key ≠ every reviewer_key
```

Exercises every derived state across ≥5 sections:

| Section | Scenario                                                                          | Expected `comparison_state / contest_state`           |
| ------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| A       | comparable, same rating                                                           | `comparable_uncontested / not_applicable`             |
| B       | divergence, producer response only                                                | `comparable_contested / contested_response_recorded`  |
| C       | divergence, response, then reviewer concurrence **on the existing contest event** | `comparable_contested / reviewer_concurrence_backed`  |
| D       | reviewer abstains / not assessed                                                  | `non_comparable / not_applicable`                     |
| E       | divergence, response, then reviewer **rebuttal** (maintains dissent)              | `comparable_contested / contested_reviewer_maintains` |

Verifier accepts raw 0. Deterministic (fixed keys/seeds), reproducible. The signed bound is logical
record order (epoch tickets), not wall-clock timing.

**Content-blind ledger authority (beast-mode G10).** The ledger authority sequences entries by
`entry_digest` and **never sees a rating value** — so the party that establishes logical order is
provably unable to favour either side. The ceremony asserts `ledger_authority_content_blind` (the
authority's inputs are digests only). _Non-claim:_ content-blindness of the sequencer does not prove
the sequence is complete — chain contiguity (`previous_epoch_ticket_digest`) does.

### Lane C (real independent-party ceremony) + the adversarial demonstration (kept separate, digest-only, never CI-gated)

**Lane C — the real ceremony (`completed ⟹ raw 0`).** Because `required_reviewer_pairs = {(s,r) : s ∈ C(r)}`,
a fresh reviewer key introduced only in VRC is an orphan → 336. Lane C therefore **reuses the exact
two `reviewer_principal` identities and section assignments committed in the referenced real 5I
bundle** over the real Opus 4.6 Sabotage Risk Report public structure (37 leaf sections). 5I committed
coverage receipts, **not ratings** — so each reviewer here emits **new VRC ratings** over its
`evaluated_sections`; producer ratings come from the research producer under the reused
`producer_identity_digest` (explicitly **not** Anthropic self-ratings); VFC `externally_anchored`
evidence is attached. The pack **must verify raw 0** to mark the campaign `completed`; a pack that
fails can be _sealed_ as an outcome but is never `completed`. Executable when the independent party
signs the reviewer ratings (they hold the 5I reviewer keys); until then, `pending`. (Alternative
route: a fresh verified VPC bundle with new reviewers — reuse is the plan of record.)

**The adversarial demonstration (beast-mode G11 — Lane-A family, NOT a completed Lane C).** Separately,
a **live Fable-5** (CVP-approved) acts as the producer, instructed to _self-rate as favourably as
defensibly possible_ against a stricter reviewer rating. Its outcome is sealed: VRC catches the
override (a verifier-demonstration **trophy**, raw 342), the spin is confined to a recorded responded
contest (**system works**, raw 0), or the model refuses (`model_refused`). Because a `342` is not raw
0, it is a sealed demonstration — a Frontier signal alongside the Lane A laundering fixture — and
**never** a completed campaign. _Non-claim:_ a caught override is a verifier demonstration, **not**
evidence of any real provider's misconduct.

**Independence** is claimed on VFC's ladder (`distinct_key_only | challenge_bound |
externally_anchored`), targeting **`externally_anchored`** via 5G's foreign-capture machinery (the
external party generates and uses its own keys, plus the signed access grant and challenge receipt).
Honest claim: _the evidence supports externally anchored foreign key control under the VFC protocol_
— not metaphysical proof that no operator ever touched a private key.

**Lane C non-claims (signed):**

```text
not_anthropic_self_rating
not_metr_rating
not_reconstruction_of_private_review
not_evidence_of_real_provider_reviewer_disagreement
real_public_subject_structure_only
real_independent_reviewer_signatures
externally_anchored_key_control_is_not_competence   // nor substantive independence, absence of
                                                    // undisclosed conflicts, or rating correctness
```

The METR/Anthropic relationship (METR reviewed the Opus 4.6 SRR; discovered vulnerabilities did not
severely undermine major report claims) justifies the **subject choice and evaluator-class
relevance** only — it populates neither side of the rating pair. Campaign gate reuses 5I's:
`completed ⟹ pack present AND verifies raw 0`; `pending` stays honestly labelled until executed.

### Parity

**Node JS ↔ independent Python semantic parity, plus browser packaging/execution parity over the
same JS core** (a browser running the same JavaScript is not a third implementation language). The
parity record compares, byte-identically on the committed Lane A pack:

```text
verdict_raw, vpc_bundle_digest, partition_digest, rating_obligation_root,
rating_ledger_root, contest_layer_root, projection_root, derived_state_census
```

Injected crypto `facts` test the **pure decision core**, not cross-runtime cryptographic
implementation parity; real signature verification gets separate Node / Python / browser signature
smoke coverage where supported.

---

## §4 — Lean · non-claims · limitations · wedge · scorecard

### Lean theorem set (Stage-5J core, zero `sorry`)

1. **Obligation-equality soundness** — `verdict = OK ⟹ active_reviewer_pairs = required_reviewer_pairs ∧ active_producer_sections = S`.
2. **Contest-event completeness** —
   `recomputed_historical_contest_events = recompute(producer_rating_history, reviewer_rating_history, epoch_tickets)`
   and `OK ⟹ stored_contest_events = recomputed_historical_contest_events`. Historical divergence is
   preserved by **both** signed rating histories plus the epoch chain, not the reviewer chain alone.
3. **No-silent-favourable-override (quantified over history)** —
   `OK ⟹ ∀ event ∈ recomputed_historical_contest_events, ∃! response, valid_response(response) ∧ response.contest_event_digest = digest(event)`.
   `∃!` because 343 already rejects duplicate/replayed responses.
4. **First-failure uniqueness/soundness (per tier)** — for `tier ∈ {public, audit}` with its frozen
   order: `verdict = OK ↔ every in-tier check passes`, and `verdict = raw_n ⟹ raw_n is the earliest failed in-tier check`.
   Raw 347 is host-language totalisation modelled explicitly as an `Except`/`Result` transformation
   around the wrapper — Lean does not claim arbitrary JS/Python exceptions cannot escape unless the
   wrapper itself is the modelled boundary.
5. **Reviewer-statement binding (static, both directions)** —
   `reviewer_concurrence_backed(event) ⟹ ∃ response, concurrence, valid_response_for(response, event) ∧ valid_reviewer_concurrence_for(concurrence, event)`
   and symmetrically
   `contested_reviewer_maintains(event) ⟹ ∃ response, rebuttal, valid_response_for(response, event) ∧ valid_reviewer_rebuttal_for(rebuttal, event)`;
   the two terminal states are mutually exclusive per (event, reviewer). The
   `contested_response_recorded → {concurrence | maintains}` transitions are retained only because the
   Lean model defines and proves that transition relation.
6. **Rating-chain topology** — a valid chain has a unique active head (genesis + contiguous + acyclic
   - no fork + no cross-subject supersession).
7. **Non-comparable exclusion** — `non_comparable` pairs are never in the `comparable_pair_count`
   denominator.
8. **Supersession authority (over all history)** —
   `OK ⟹ (∀ entry ∈ reviewer_history, signed_by_assigned_reviewer(entry) ∧ same_subject_supersession(entry)) ∧ (∀ entry ∈ producer_history, signed_by_bound_producer(entry) ∧ same_subject_supersession(entry))`.
   Covers every accepted historical entry, closing the fossil attack (a forged historical entry
   manufacturing a historical contest while the active head stays honestly signed).
9. **Tier monotonicity** — `audit_accepts ⟹ public_attestation_valid ∧ public_accepts` (audit is
   public + 345).
10. **No Silent Override Path — the Override Trilemma (beast-mode G6, flagship).** For any comparable
    pair, exactly one branch holds: (a) producer head not strictly more favourable → no contest event;
    (b) producer head strictly more favourable **and** a valid bound answered contest event exists →
    `OK`; (c) strictly more favourable **and** the event is omitted/replayed/forged → `verdict ∈ {342, 343}`.
    `noSilentOverridePath` proves there is **no fourth branch** — a favourable override with no
    recomputable trace is unreachable.
11. **No Correctness Bit (beast-mode G13, the thematic heart).** The verdict is a pure function of
    obligation-completeness, contest-preservation, and signature-validity, and the state space
    `comparison_state × contest_state` contains **no correct/incorrect value by construction**.
    `noCorrectnessBit` proves no verdict and no state can assert that either party was right — the
    artifact is _structurally_ unable to make the correctness claim (the 5C `kernelDisjoint` pattern
    applied to rating contests; the stage is named _Contest_ for exactly this reason).

Lean proves the decision core; **it does not prove first-of-kind novelty** (see the source map).

### Signed non-claims

Contest ≠ correctness (`rating_truth_oracle_deferred`); recorded response ≠ justified
(`response_adequacy_deferred`); rating-completeness is over the **VPC-committed** universe, not the
real-world report (→ VUC); logical epoch order ≠ wall-clock timeliness (→ VTC); cross-scale
comparison forbidden in v1 (mappings are disguised truth-adjudication); C2PA-style association ≠
semantic truth (C2PA concedes a valid signature certifies formation/tamper/attribution, not the
semantic truth of assertions — VRC's exact posture).

Beast-mode amplifier non-claims: **downgrade depth** measures the _size_ of divergence, not whether
the producer was wrong; a **reviewer rebuttal** records that dissent survived the response, not that
the reviewer is right; **in-toto/SCITT registration** proves the statement was logged, not that the
rating is true; a **content-blind sequencer** does not prove the sequence is complete (chain
contiguity does); a **caught live-producer override** is a verifier demonstration, not evidence of a
real provider's misconduct.

### Signed limitations

1. Truth oracle deferred — VRC records contest, cannot adjudicate correctness.
2. Response adequacy deferred — a bound response is required, its _justification_ is not checked.
3. **VPC-committed universe** — completeness is relative to `S` as committed by 5I, not the full
   real-world report/eval surface/risk domain (→ VUC).
4. Logical-not-temporal — epoch order is a signed logical sequence; wall-clock timeliness is VTC's.
5. Single committed rating scale, no cross-scale comparison in v1.
6. Lane C independence reaches `externally_anchored` under VFC, but externally-anchored key control
   does **not** prove reviewer competence, substantive independence, absence of undisclosed
   conflicts, or rating correctness; the broader affiliation axis stays modelled.
7. Parity is JS↔Python **semantic** + browser packaging, not cross-runtime crypto-impl parity.

### Novelty source map (required — Lean cannot prove this)

- **Search date:** to be pinned at plan time (sweep executed 2026-07-12; re-run before tag).
- **Databases/standards reviewed:** Anthropic RSP v3.4 (split-review coverage requirement; Risk Reports
  quantify risk; reported areas-of-disagreement; Frontier Safety Roadmaps); Anthropic–OpenAI pilot
  cross-evaluation; EU GPAI Code of Practice
  (Commission page + final text); in-toto attestation framework; IETF SCITT charter/specs; C2PA v2.4
  (security + harms-modelling); PCAOB attestation standards; NRC non-concurrence directive; arXiv:
  third-party evaluation (2505.01643), _Frontier AI Auditing: Toward Rigorous Third-Party Assessment_
  (2601.11699), _NeurIPS Should Require Reproducibility Standards for Frontier AI Safety Claims_
  (2605.08192), _A Methodology for Quantitative AI Risk Modeling_ (2512.08844), _Reasons to Doubt the
  Impact of AI Risk Evaluations_ (2408.02565).
- **Closest mechanisms & why each lacks the property:** in-toto/SCITT/C2PA register _single-party_
  signed statements (no two-party divergence with suppression failing closed; C2PA explicitly
  disclaims semantic truth); in-toto `threshold` is same-step redundancy; CODEOWNERS/Gerrit give
  forge-hosted path coverage without computed independence or offline recompute; NRC/PCAOB
  non-concurrence is human-process, not recomputable.
- **Falsification path:** exhibit a published mechanism that binds many-to-many
  reviewer↔producer rating divergence over a _committed_ subject, preserves divergence append-only,
  and fails closed on omission/override/replay/phantom-concurrence with offline byte-reproducible
  recompute. If found, the novelty claim is withdrawn.

### Socket ledger

**PAYS** `reviewer_assessment_contest_deferred` (5I) + `consequence_self_rating_contest_deferred`
(5H). **MINTS** `rating_truth_oracle_deferred` + `response_adequacy_deferred`. Flat: 2 pays / 2
mints. Cross-scale mapping recorded as a **signed limitation**, not a minted socket (ledger hygiene).
Arc spine reserved (typed-null structural union): `universe_commitment_anchor` (VUC),
`review_window_binding` (VTC), `campaign_composition_root` (capstone) — the current verifier rejects
any non-null branch with 346 until the paying stage bumps `schema_version`.

### Founder's ledger

The external actor who could run VRC tomorrow: an AI-Safety-Institute / GPAI-Code auditor comparing
a lab's published risk rating against its commissioned external reviewer's rating. The single blocker:
no committed, signed rating pairs to recompute over — which VRC's schema defines. Category framing:
**not** category-creating on attestation (in-toto/SCITT/C2PA exist); **to our knowledge, based on the
documented prior-art sweep, the first executable and byte-reproducible verifier of two-party rating
divergence over a committed subject where omission of the divergence fails closed.**

### Beast-mode amplifiers (all amplify the single blade; all fit the frozen 332–347 block)

| #   | Gen | Invention                                                                                                                        | Cost                               | Boosts                              |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| 1   | G6  | **Override Trilemma** — `noSilentOverridePath` (no fourth branch)                                                                | zero-code (theorem 10)             | Novelty                             |
| 2   | G13 | **`noCorrectnessBit`** — artifact structurally unable to assert who was right                                                    | zero-code (theorem 11)             | Constitution                        |
| 3   | G8  | **Reviewer rebuttal** — the reviewer's signed last word (`contested_reviewer_maintains`)                                         | zero new code (widened 344)        | Constitution, Good-for-Anthropic    |
| 4   | G1  | **Downgrade Depth** — the severity-rank number nobody publishes                                                                  | zero new code (345 projection)     | Novelty, Constitution               |
| 5   | G10 | **Content-blind ledger authority** — sequencer sees digests only                                                                 | zero-code (Lane B property)        | Novelty                             |
| 6   | G3  | **in-toto/SCITT bridge** — subject = `contest_layer_root`                                                                        | active optional field (345 family) | Frontier (distribution)             |
| 7   | G11 | **Real Lane C ceremony** (reviewers emit real ratings, raw 0 → completed) + a separate **adversarial Fable-5 demo** (342 trophy) | live lane (digest-only)            | Frontier (conditional on execution) |

### Four-axis scorecard (spec-time, honest — beast-mode package folded in)

| Axis                   | Was |           Now | Basis / what still moves it                                                                                                                                                                                                                                                                                               |
| ---------------------- | --: | ------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            | 9.2 |       **9.5** | Override Trilemma theorem class + `noCorrectnessBit` + content-blind sequencer + Downgrade Depth — all built in-stage. → 9.6 only if a broader prior-art sweep + independent reproduction confirm the composition is first-of-kind.                                                                                       |
| **Frontier**           | 9.0 | **9.2 → 9.5** | 9.2 at spec time; **9.5 earned only when the real Lane C ceremony executes** (reused 5I reviewers emit real ratings over the Opus 4.6 structure, verifies raw 0, `externally_anchored`), with the adversarial Fable-5 demo as an additional sealed signal. Written conditional to guard the scorecard's teeth — not free. |
| **Good-for-Anthropic** | 9.4 |       **9.5** | Reviewer rebuttal completes both-sides-last-word due process; maps to the RSP v3.4 external-review process (reported areas-of-disagreement) over quantified Risk Reports. Caps at 9.5 with no real process-owner pilot.                                                                                                   |
| **Constitution**       | 9.4 |       **9.6** | Reviewer rebuttal + `noCorrectnessBit` make the contest _fuller_ (both sides heard, silence ≠ agreement) **without** claiming truth — a legitimate completeness deepening, not a ceiling breach. Binding review quality/truth still belongs to a later rung.                                                              |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it implies no Anthropic
review, adoption, or endorsement. The Novelty 9.5 and Constitution 9.6 are honest at spec time (their
artifacts are definitely built); the Frontier 9.5 is conditional on executing the real Lane C
ceremony — until then it is 9.2, not grade-inflated._
