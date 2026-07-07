# Stage 4X — VLR: Verifiable Leakage-Residue (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** (Internal tie-break order;
> public wording stays provider-agnostic.)

**Date:** 2026-07-08 · **Branch:** `stage-4x-vlr` · **Prev:**
v2.32.0-stage-4w-vsn (main 08597061) · **Target tag:** `v2.33.0-stage-4x-vlr`

---

## 1. Identity, laws, blade

**Stage 4X — VLR: Verifiable Leakage-Residue.** The arc declared at 4V was
**4V Contest → 4W Verified-Slot Narrative → 4X Novel-Attack Discovery.** 4X
keeps the target of that arc — 4W's signed limitation that its leakage gate is
**"lexical, not semantic"** — but reaches it the Simurgh way: **not** by
driving a live model to smuggle deception past our own safety gate (that lane
is shaped like the thing this project refuses to be, and is deliberately out
of scope — see §1 "Explicitly out of scope"), and instead by **measuring the
gate's residue against a frozen, dual-provenance corpus and shrinking the
bound.**

**The wound it attacks.** 4W signed the sentence _"paraphrase smuggling
('almost nobody was affected') can evade any lexical detector — we bound
syntactic smuggling only."_ That is prose. A regulator or court filing an
Art-73 narrative through VSN today cannot answer the operational question:
**which misleading claims does `vsn.leakage.v1` actually miss, and how big is
that gap?** A signed limitation with no number is a confession without a
measurement. 4X converts it into a signed, byte-reproducible number and then
makes the number smaller.

**Thesis line:**

```text
4W: the story cannot impersonate evidence (lexically).
4X: here is the exact set of claims the lexical gate misses,
    measured against a frozen corpus — and here is the smaller
    residue after we shrink the bound. Published against ourselves.
```

**The blade (one per stage): a signed, reproducible measurement of the
leakage gate's own residue.** For a frozen corpus of claim-bearing prose, each
item is a real quantitative **seed** the gate catches plus a declared
**metamorphic relation** from a frozen, signed transform table; the paraphrase
**residue** form is _derived_ as a pure function of the seed (not hand-authored),
so a reviewer reproduces the entire residue set byte-for-byte from the seeds and
the signed table. Each item carries a machine-checkable ground-truth label of
whether it _carries a claim_.
The verifier runs the real `vsn.leakage.v1` gate over every item, compares to
the sealed ground truth, and emits a **signed residue ledger**: catch-rate
N/M, the exact residue set R, and per-family breakdown. Then it defines an
**additive `vsn.leakage.v2`** ruleset that catches a named subset of R
lexically (approximate-quantifier and hedge families), re-runs the same
corpus, and emits the **shrunk** residue R′ ⊂ R — with the delta signed. The
irreducible semantic residue (what no lexical ruleset can catch) is measured
and signed, not asserted.

**Dual provenance (both angles, fused).** Every corpus item carries a
`provenance` tag:

- `enumerated` — author-constructed paraphrase families spanning the gap
  top-down (digit→word-quantifier, exact→hedged, percent→fraction-phrase).
  Gives _coverage_: the family taxonomy is auditable and near-complete over
  the lexical gate's declared rule set.
- `incident_sourced` — smuggling _shapes_ lifted from real documented
  failures (court-sanctioned fabricated-citation / false-quotation phrasings;
  the withdrawn-report claim patterns). Gives _grounded discovery_: the misses
  are real-world misses, not only imagined ones. **Only the linguistic shape
  is reused; no third party is named as a claim in shipped evidence, and every
  figure is pinned or softened per the source-precision guard.**

Fusing them answers both reviewer questions at once — _is your test space
principled?_ (enumerated) and _does it reflect what actually goes wrong?_
(incident_sourced) — and the dual-provenance residue map is the new geometry:
nobody publishes their own gate's measured miss set against both a taxonomy
and an incident corpus.

**Laws:**

1. **A Signed Limitation Must Bleed a Number** — a limitation the project has
   signed in prose (here, 4W's "lexical, not semantic") is not discharged
   until it carries a reproducible measurement. The verifier recomputes the
   catch-rate and residue offline from pinned inputs; a hand-edited total
   fails closed.
2. **The Gate Reports Its Own Misses** — the residue set R is sealed _in the
   attestation itself_, not hidden. A corpus item labelled ground-truth
   claim-bearing that the gate misses is a **recorded residue outcome, not a
   stage failure** (the 4U outcome-vs-integrity distinction). VLR _fails_ only
   when the ledger is unbound, non-reproducible, miscounted, or mislabelled.
3. **A Shrunk Bound Must Be Monotone** — `vsn.leakage.v2` may only _add_
   catches; it must catch a superset of what v1 caught over the corpus (no
   silent regression), so R′ ⊆ R is a signed, checked obligation. A v2 that
   drops a v1 catch fails closed.

**The honest core (signed up front):**

- **This measures a bound; it does not close it.** Even after v2, an
  irreducible semantic residue remains (true paraphrase — "effectively
  everyone" for "all 4,200"). 4X measures and signs that residue; it does not
  claim to eliminate it. A lexical v2 shrinks the gap; it never reaches zero.
- **The corpus is a sample, not the adversary space.** Catch-rate N/M is
  relative to the frozen corpus's declared families, not the universe of
  possible paraphrase (the 4U `corpus_is_relative_to_declared_families` bound,
  restated). `enumerated` items are author-constructed and `incident_sourced`
  items reuse documented _shapes_ — neither is exhaustive.
- **Ground-truth labels are author-declared, not adjudicated.** Whether an
  item "carries a claim" is a signed human label with a frozen rubric, not a
  formal semantic proof. We sign the rubric and the bound.

**Explicitly out of scope (safety boundary, stated in Section 1, not an
appendix):** VLR contains **no live-model lane and no adversarial elicitation
of any kind.** It does not drive a model to smuggle, evade, or deceive; it
does not attack any external system. The entire measurement is static:
author-frozen fixtures + the real v1/v2 gates + a signed ledger, all Lane A
(byte-stable, CI-gated). This is deliberate: a project whose identity is
anti-deception infrastructure must not generate its flagship number by
eliciting deception. The "novel-attack discovery" strength of the arc is
recovered through `incident_sourced` provenance (real documented smuggles),
not through a live adversary.

**Read-only kernel:** zero `src/llmShield` diff; 4A–4W byte-frozen; no
`authorise_*` entry point. `vsn.leakage.v1` is **imported unmodified** from
Stage 4W and never edited (a 4W-frozen assertion guards it); `vsn.leakage.v2`
is a **new additive** ruleset in the 4X namespace that _composes_ v1, never
mutates it. Additive raw codes **173–180** (headroom left by 4W's 173–180
note; wrapper LAST; the exact count is fixed in §2).

**Socket ledger decision (ADR, recorded at spec time).** 4W minted
`semantic_leakage_adversary_deferred`. Stage 4X does **not** run an adversary;
it resolves the underlying debt through signed residue measurement
(`vsn.leakage.v1` catch-rate N/M, exact miss set R, additive `vsn.leakage.v2`
monotone bound-shrink R→R′). The 4W socket name is treated as
**mechanism-overfit** — right in spirit (the unmeasured semantic gap), too
specific in mechanism (adversarial elicitation). Decision:

```text
semantic_leakage_adversary_deferred
  → SUPERSEDED_BY  semantic_residue_measurement_deferred
  → PAID_BY        stage-4x-vlr
```

The superseded socket is **not** marked PAID directly (there was no adversary);
it is marked `superseded`. The replacement socket
`semantic_residue_measurement_deferred` is **PAID by 4X** via signed
catch-rate + exact miss-set residue + provenance-tagged corpus + additive v2
shrink proof. The adversarial route is explicitly declined and out of scope.
A matching Zurvan decision (ADR) is filed at closeout. The next debt
(`irreducible_semantic_residue_deferred`, the true-paraphrase remainder that no
lexical ruleset can reach — a possible future model-as-untrusted-advisory lane
à la 3V, digest-only, never CI-gated) is minted in §4.

---

## 2. Artifacts, raw codes, check order

Three additive artifacts beside the 4W bundle (4A–4W byte-frozen):

### `simurgh.vlr.corpus.v1` — the frozen dual-provenance corpus

```text
{
  schema: "simurgh.vlr.corpus.v1",
  ruleset_binding: {
    v1_ruleset_id: "vsn.leakage.v1",
    v1_ruleset_digest,      // sha256 over the 4W-sealed frozen lexical lists
                            // (number-words ∪ quantifiers ∪ months + rule ids);
                            // MUST equal the digest recomputed from imported 4W
                            // constants → else 176 (the frozen-gate binding)
    v2_ruleset_id: "vsn.leakage.v2",
    v2_ruleset_digest       // sha256 over v1 lists ∪ the additive v2 families
  },
  metamorphic_table_id: "vlr.metamorphic.v1",  // frozen signed transform table (below)
  metamorphic_table_digest,          // sha256 over the sealed MR table
  items: [
    { item_id,                       // unique, stable, sorted
      provenance,                    // "enumerated" | "incident_sourced"
      family,                        // frozen family id (see §2 family table)
      claim_bearing: true,           // ground-truth label under the frozen rubric
      seed_form,                     // a real quantitative-claim snippet v1 is expected to CATCH
      metamorphic_relation,          // MR id drawn from vlr.metamorphic.v1
      residue_form,                  // DERIVED = apply(metamorphic_relation, seed_form); stored for
                                     // convenience, but re-derived and asserted byte-equal at build/verify
                                     // → mismatch fires 175 (residue is a function, not author choice)
      incident_ref }                 // incident_sourced only: pinned/softened shape pointer,
                                     // never a live third-party claim (source-precision guard)
  ],
  declared_item_count,
  rubric_id: "vlr.claim_rubric.v1",  // the frozen ground-truth labelling rubric, sealed in-bundle
  coverage_witness                   // per v1 lexical family: ≥1 seed exercising it (the sweep proof)
}
```

**The metamorphic transform makes the residue reproducible, not authored
(self-gauntlet Finding 2 hardening).** Existing paraphrase-attack benchmarks
validate pairs with an LLM judge — non-deterministic, non-recomputable. VLR
instead binds each item to a **frozen, signed metamorphic relation** and
_derives_ the residue*form as a pure function of the seed. A reviewer re-applies
the sealed `vlr.metamorphic.v1` table to the seeds and reproduces every
residue_form byte-for-byte; the residue side is therefore **not
author-constructible.** The remaining author freedom (seed choice, MR-table
design) is \_public and signed* — auditable, and bounded by the
`coverage_witness` requiring seeds to exercise every v1 lexical family (the
sweep replaces cherry-picking).

### `vlr.metamorphic.v1` — the frozen signed transform table

A deterministic, sealed set of metamorphic relations (MRs), each a pure string
rewrite from a catchable quantitative form to a paraphrase using only DISJOINT-
from-v1 lexicon (so v2 can additively catch it): e.g. `digit_pct → "roughly a
<fraction-word>"`, `exact_all → "essentially the whole <noun>"`, `count →
"a handful of <noun>"`. The table id + digest are sealed inside the signed
corpus (the 4W ruleset-version-sealing discipline) so a future
`vlr.metamorphic.v2` cannot silently re-derive a v1 corpus.

Every item is **spanless** (no declared span map): the whole snippet is an
undeclared region, so the real `vsn.leakage.v1` gate runs over it exactly as it
would over connective prose in a 4W narrative. `caught_form` is expected to fire
170 (a real gate hit); `residue_form` is expected to return clean **while
ground truth says claim-bearing** — that clean-but-claim-bearing outcome _is_
the measured residue. No capsule is required (the collision rule is exercised
by a dedicated `enumerated` family that carries a synthetic pinned capsule).

### `simurgh.vlr.ledger.v1` — the signed residue ledger

```text
{
  schema: "simurgh.vlr.ledger.v1",
  corpus_digest,                     // recordDigest(corpus) — binds ledger to corpus
  per_item_outcomes: [               // SEALED per-item gate outcomes (sorted by item_id):
    { item_id, seed_v1, residue_v1, residue_v2 } ],  // booleans. Public tier verifies the
                                     // aggregates by ARITHMETIC over this table (178, no gate
                                     // call); audit tier re-runs the gate and checks this table
                                     // against the live outcome (177). This split is what makes
                                     // public = arithmetic, audit = real gate recomputation.
  v1: { caught_count, residue_count, total, residue_item_ids: [...] },   // R
  v2: { caught_count, residue_count, total, residue_item_ids: [...] },   // R′
  metamorphic_slip_rate_v1,          // PRIMARY number: of M seeds v1 catches, how many
                                     // apply(MR, seed) SLIP v1 → "M_slip/M". Deterministic +
                                     // reviewer-reproducible from seeds + signed MR table.
  metamorphic_slip_rate_v2,          // same under v2 (the shrink)
  catch_rate_v1,                     // secondary per-family view "N/M", recomputed → else 178
  catch_rate_v2,                     // "N'/M"
  residue_delta: {
    newly_caught_by_v2: [...ids],    // R \ R′  (the bound-shrink)
    irreducible: [...ids] },         // R′ itself (measured, not asserted zero)
  per_family: [ { family, provenance, v1_caught, v1_total, v2_caught, v2_total } ],
  monotone: true                     // v2 caught-set ⊇ v1 caught-set over the corpus → else 179
}
```

`catch_rate` is a projection of the verified per-item outcomes — never
author-filed, so it cannot be gamed except by the gate actually catching more
(the 4W evidence-density discipline). `residue_item_ids` are sorted; the ledger
is a lens over the corpus, not a second source of truth.

### `simurgh.vlr.attestation.v1` — two-tier, Ed25519

One Merkle root over `{corpus, ledger}`, signed with a new `stage4x`
`INSECURE_FIXTURE_ONLY_vlr*.pem` key (path-regex allowlist line added to BOTH
`scripts/security-audit-llm-shield-stage3m.sh` and `...stage3o.sh`). Signs
`canonicalJson(parse(bundle))`; `keyDigest` over the **public** PEM on both
build and verify sides (4V→4W doctrine). Public tier = structure (schema,
signature, corpus completeness, frozen-gate digest, ledger recompute,
monotonicity). Audit tier = re-run the real v1 **and** v2 gates over every item
and re-derive R/R′ from scratch (catches a ledger that matches its own corpus
but diverges from the real gate — 177).

### Raw codes 173–180 (additive in `stage4h/exitCodes.mjs`; wrapper LAST)

| Raw | Reason                        | Fires when                                                                                                                                                                                                        |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 173 | `vlr_schema_invalid`          | strict allowlist keys/types over corpus + ledger + attestation (+ per-item, per-family)                                                                                                                           |
| 174 | `vlr_signature_invalid`       | Ed25519 over `canonicalJson(content)` fails (attestation)                                                                                                                                                         |
| 175 | `vlr_corpus_invalid`          | count ≠ declared; dup/unsorted `item_id`; bad provenance tag; missing/rubric-inconsistent label; **`residue_form` ≠ `apply(metamorphic_relation, seed_form)`**; **`coverage_witness` misses a v1 lexical family** |
| 176 | `vlr_v1_frozen_mismatch`      | `v1_ruleset_digest` ≠ digest recomputed from **imported unmodified** 4W constants (frozen gate)                                                                                                                   |
| 177 | `vlr_gate_recompute_mismatch` | **audit tier only:** a sealed `per_item_outcomes` entry ≠ the live `vsn.leakage.v1`/`v2` re-run                                                                                                                   |
| 178 | `vlr_ledger_mismatch`         | **public tier:** aggregates (slip-rate, catch-rate, R, R′) ≠ arithmetic over sealed `per_item_outcomes`                                                                                                           |
| 179 | `vlr_bound_not_monotone`      | **recomputed** from sealed outcomes: v2 caught-set ⊉ v1 caught-set (R′ ⊄ R), OR `ledger.monotone` disagrees with the recompute (a boolean lie) — **Law 3**, never trusts the stored flag                          |
| 180 | `vlr_internal_fail_closed`    | wrapper: any throw → 180, never a silent pass                                                                                                                                                                     |

Frozen `VLR_CHECK_ORDER` = 173→174→175→176→177→178→179 (wrapper 180 last).
Parse → signature → corpus well-formedness+labels → **frozen-gate binding** →
per-item gate recompute → ledger recompute → **monotonicity** → fail-closed;
monotonic by construction (structural before semantic before ledger before
law). All codes `RUN_LEVEL_BY_RAW` level **1** (a residue-ledger integrity
failure is a harness/structural failure, not a security outcome — a _measured
residue item_ is a recorded outcome, never a raw code). `UNKNOWN_RAW_PROBE`
(999) hygiene per the standing rule; `exitCodeProbeHygiene` danger-zone guard
extended to 180.

**The 176 frozen-gate binding is the read-only-kernel proof for a stage that
runs the gate:** 4X imports `checkLeakage`/`scanLeakage` and the frozen lexical
lists from Stage 4W **unmodified**; 176 fires if the corpus's declared
`v1_ruleset_digest` diverges from the digest recomputed live from those
imported 4W constants. A 4W-freeze assertion test (`import`-and-compare) guards
it in unit + e2e.

### Leakage families (frozen; `enumerated` taxonomy + `incident_sourced` shapes)

`vsn.leakage.v1` residue is measured over these frozen families; each item
declares exactly one. v2 additively catches the ones marked ✓:

**Every residue_form below was checked against the actual v1 lexicon
(`constants.mjs`): it must contain NONE of the v1 number-words (…`half`,
`couple`, `dozen`…), NONE of the v1 quantifiers (`all, none, most, every,
nearly, almost, majority, nobody, no one`), no digit, no `%`/`percent`, no
month. The v2 additions below are all DISJOINT from v1, so `vsn.leakage.v2` =
v1 ∪ v2-lexicon is a strict superset by construction (see the honest 179/​
`boundMonotone` framing).**

| Family id                    | Example caught → residue                            | v2 catches? (disjoint v2 word) |
| ---------------------------- | --------------------------------------------------- | ------------------------------ |
| `digit_to_word_quantifier`   | "23% of users" → "roughly a quarter of the base"    | ✓ (`roughly`, `quarter`)       |
| `exact_to_hedged`            | "all 4,200 accounts" → "essentially the whole base" | ✓ (`essentially`)              |
| `percent_to_fraction_phrase` | "80% of sessions" → "a large fraction of sessions"  | ✓ (`fraction`)                 |
| `date_to_relative`           | "on 3 August" → "earlier that period"               | partial (`earlier`)            |
| `count_to_bulk_phrase`       | "137 incidents" → "a handful of incidents"          | ✓ (`handful`)                  |
| `true_semantic_paraphrase`   | "materially affected" → "not ideal for a subset"    | ✗ **irreducible residue**      |

**Verification note (spec-time, mandatory before freeze):** the earlier drafts
of this table used "effectively **every** account" and "the vast **majority**"
— both already caught by v1 (`every`, `majority` are v1 quantifiers), i.e. NOT
residue. The corpus builder runs the real imported v1 gate over every
residue_form and **asserts `residue_v1 === false`** (it genuinely slips v1); a
residue_form that trips v1 is a construction bug that the builder refuses —
otherwise it would be silently recorded as a catch and inflate the number. This
is a build-step assertion (not 177, which is a verify-time sealed-vs-live check),
and it composes with the machine guard that `V2_LEXICON` is disjoint from every
v1 list.

The `true_semantic_paraphrase` family is the signed floor: v2 cannot catch it
lexically (no disjoint lexical marker exists), so it is measured and sealed into
`residue_delta.irreducible` — the number that discharges 4W's limitation _with a
bound_, not a zero. `v2` is a new additive ruleset (`vsn.leakage.v2` = v1 lists
∪ frozen DISJOINT approx/hedge/fraction/bulk lexicons —
`roughly, approximately, about, around, effectively, essentially, largely,
quarter, third, fifth, fraction, portion, handful, several, swath, chunk`),
**composing** v1, never mutating it.

**Out of VLR's residue scope: the v1 `capsule_value_collision` rule.** It is a
lexical _exact-match_ rule (an undeclared capsule value reproduced verbatim) —
always caught, never a paraphrase phenomenon — so it is **not** a residue family
and carries no corpus items or capsule-values schema slot. VLR measures
paraphrase residue only; the collision rule's behaviour is 4W's, unchanged.

---

## 3. Evidence lanes, attestation, parity, browser

| Lane | Role                                  | Reproducibility tier  |
| ---- | ------------------------------------- | --------------------- |
| A    | deterministic residue corpus + tamper | byte-stable, CI-gated |
| B    | blind two-process recompute ceremony  | byte-stable, CI-gated |
| C    | **absent by design**                  | —                     |

### 3.1 Lane A — deterministic residue corpus

The bulk. A frozen `simurgh.vlr.corpus.v1` (~24–30 items across the six
families, both provenances) plus the ledger and attestation, all byte-stable
and rebuilt-twice-`cmp`-equal. Lane A locks:

- **Byte-stable corpus** with a sealed `corpus_digest`; `evidence/stage-4x`
  fully prettier-ignored (reproduce `cmp`).
- **Frozen `v1_ruleset_digest`** recomputed live from the **imported
  unmodified** 4W constants; divergence → **176**.
- **4W source-digest witness (freeze proof, added before freeze).** 176 proves
  the _ruleset constants_ match, but a reviewer may ask whether the wrapper
  logic around `checkLeakage`/`scanLeakage` drifted. So the evidence manifest
  additionally binds the **file digests** of the imported 4W leakage module(s)
  (`stage4w/core/leakageGate.mjs` and `stage4w/constants.mjs`), computed live at
  build and re-asserted at verify. Any edit to the 4W gate — constants _or_
  wrapper — breaks the witness. This is the read-only-kernel guarantee for a
  stage that _executes_ the frozen gate rather than merely leaving it alone.
- **Raw-code tamper matrix 173–180**: one fixture per code plus trigger
  sub-variants — corpus count/dup/label (175), a swapped `v1_ruleset_digest`
  (176), a ledger whose recorded item outcome disagrees with the real gate
  (177), a hand-edited catch-rate / residue set (178), and a **v2 that drops a
  v1 catch → 179** (the monotonicity tripwire). Mutation fixtures re-signed
  (the 4T/4W `resignBundle` lesson).
- **Residue-map fixture**: the green corpus's sealed `residue_delta`
  (`newly_caught_by_v2`, `irreducible`) is byte-stable and equals an
  independent recount from the per-item gate outcomes.
- **RSP-shaped `incident_sourced` family (the Anthropic-surface fixture)**: a
  small family whose _shape_ is a frontier **Risk-Report / affirmative-safety-
  case** quantitative claim — the hedged-quantifier prose a lab's transparency
  artifact carries ("containment held for the vast majority of red-team
  attempts", "risk remains roughly comparable to prior models"). Only the
  linguistic shape is reused; **no lab, model, or party is named as a claim** in
  shipped evidence (non-claim 8). Zero new code path — a named corpus family
  that re-aims the wedge from court filings to the lab's own externally-reviewed
  transparency surface. It also pre-seeds the `transparency_report_profile`
  stage (VTRP) with an adversary-free residue baseline.
- **Non-ASCII fixture**: a `residue_form` containing multi-byte text
  (سیمرغ + an emoji) on byte boundaries, byte-stable across JS/Python/browser
  (the shared geometry tripwire).

### 3.2 Lane B — blind two-process recompute ceremony (CI-gated, non-adversarial)

Two OS processes prove the residue ledger is reproducible **through an
independent process boundary** — _process-independent, not
institution-independent_ (the child is our code; the claim is that the ledger
survives a blind recompute across a process boundary that cannot reuse the
parent's in-memory state, not that a third party rederived it).

```text
parent (dumb):
  spawn child
  pass ONLY: corpus path + the public v1/v2 ruleset digests over stdin
  receive the child's rebuilt canonical ledger bytes
  compare byte-for-byte against the committed ledger bytes → seal result

child (blind):
  import the REAL frozen 4W gate (checkLeakage/scanLeakage) + constants
  recompute the v1 caught/residue set over the corpus
  apply the v2 additive lexical extension
  rebuild R, R′, irreducible, per-family table
  emit the canonical ledger to stdout
```

Hard rails (blindness negatives sealed): **the child never reads the parent's
ledger; the parent never computes a catch-rate.** The child receives no
`OPERATOR_*` env and no committed-ledger path (env-key regex + argv `.pem`/
ledger-path check, the 4V/4W pattern). Blade proved: the residue number is not
an artifact of one process's in-memory accounting — a blind recompute across a
process boundary reproduces it byte-for-byte.

### 3.3 No Lane C (positive framing, signed)

> Stage 4X intentionally has **no Lane C**. The stage resolves the superseded
> adversarial socket by **signed residue measurement, not adversarial
> elicitation**. Adding a live-model or adversary lane would change the claim
> from _reproducible leakage-residue accounting_ into _behavioural robustness
> evaluation_, which is out of scope — and would smuggle the superseded socket
> back through the side door. The absence of Lane C is a **design property**,
> asserted and checked (a no-live-model hermeticity gate: no model client, no
> fetch/socket/subprocess in the scored path — the 4U/OFFLINE_REASONS gate
> reused), not an omission.

### Attestation — two-tier

`simurgh.vlr.attestation.v1`, one Merkle root over `{corpus, ledger}`, signed
with `INSECURE_FIXTURE_ONLY_vlr.pem` (`stage4x` key).

- **Public tier**: schema, signature, corpus completeness, the frozen-gate
  digest **and source-digest witness**, ledger recompute, monotonicity. No
  engine re-run needed beyond the pure-lexical gate (which is itself
  deterministic and offline).
- **Audit tier**: re-runs the real v1 **and** v2 gates over every corpus item
  and re-derives R/R′ from scratch, plus the Lane B byte-stable reverify —
  catching a ledger that is internally consistent but diverges from the real
  gate (177).

Signs `canonicalJson(parse(bundle))`; `keyDigest` over the **public** PEM on
both build and verify sides (4V→4W doctrine, now standing).

### Parity — three implementations, one geometry

- **Python** `vlr_parity.py`: ports the v1 frozen lexical ruleset **and** the
  v2 additive extension exactly, plus the per-item outcome model and the ledger
  recompute (catch-rate, R, R′, monotonicity). It is the second independent
  implementation of the _gate itself_, so JS↔Python parity over the corpus is a
  real cross-impl check on the residue number (a divergence would be a genuine
  finding). Ed25519 excluded per pattern, stated as a parity non-claim.
- **Browser** `vlr-verifier.html`: static single file, CSP `default-src
'none'`, node:vm parity gate; paste corpus + ledger + pubkey → it **renders
  the residue map itself** — per family, which claims the gate catches, which
  it misses, and the shrink under v2, with the irreducible floor visibly
  marked. This is the public-facing artifact: a regulator sees _exactly which
  misleading phrasings the lexical gate misses_, recomputed in their own
  browser. Signature verification stays Node-authoritative (parity non-claim).
- JS byte offsets via `TextEncoder`; the shared multi-byte fixture is the
  tripwire for all three.

### Wiring (standing gotcha sweep, named now)

- Additive codes 173–180 ripple the known goldens (4H exit maps ×2, 4L e2e
  net, 4K/4H exitWrapper snapshots, 4H inline map, **plus the 4W e2e net** now
  that 4W is a predecessor) — run the full Node-26 e2e nets + **every** prior
  reproduce script (4W included) before push; additive codes must not disturb
  sealed history.
- `evidence/stage-4x` fully prettier-ignored.
- `scripts/reproduce-llm-shield-stage4x.sh` added to `scripts/check-e2e.sh`'s
  REPRODUCE array.
- Validate with `npm run format:check` (project script), never a hand-picked
  glob (the 4V/4W lesson).
- Run `scripts/check.sh` locally as you build.
- Node 26 (`/opt/homebrew/opt/node@26/bin`) for byte-stable reproduce.

---

## 4. Lean, non-claims, limitations, wedge, scorecard

### Lean (`proofs/stage4x/`, Lean 4.15.0, no mathlib, zero sorry)

Wired into `stage-4-lean-proofs.yml` + sorry-grep. Five theorems over a
modelled corpus/gate/ledger algebra. **Honest framing (self-gauntlet):** three
are **invariant-locks** (acceptance ⇒ stated structural property, so a future
edit cannot silently regress it); **two are substantive** —
`residueIsRecordedNotFailure` and `metamorphicResidueReproducible`. We do not
claim five deep discoveries; we claim five locked invariants, two of them
non-obvious.

1. **`residueLedgerSound`** — if the verifier accepts, the signed
   `catch_rate` and residue set R equal the values recomputed from the
   per-item gate outcomes (the ledger is a faithful lens, never a second
   source of truth; a hand-edited total cannot reach GREEN — 178 dominates).
2. **`boundMonotone`** (invariant-lock) — the v2 caught-set over the corpus is
   a **superset** of the v1 caught-set, so R′ ⊆ R. Because `vsn.leakage.v2` is
   _defined_ as `v1 ∪ (disjoint v2 lexicon)`, this holds by construction; the
   theorem + code 179 **lock** that construction so a future v2 that forgets to
   compose v1 (a real implementation-regression bug) cannot be accepted. Honest
   scope: this guards against dropping v1, not against an emergent regression —
   Law 3 is a construction invariant, not an empirical discovery.
3. **`frozenGateBinding`** — an accepted bundle's `v1_ruleset_digest` resolves
   to the digest of the **imported 4W constants**, i.e. acceptance implies the
   measured gate _is_ the frozen 4W gate (176 dominates) — the read-only-kernel
   guarantee for a stage that executes the gate.
4. **`residueIsRecordedNotFailure`** (substantive) — a corpus item that is
   ground-truth claim-bearing and gate-missed yields membership in the residue
   set, **disjoint** from every raw integrity code: measuring a miss never
   raises a fail-closed code (the 4U outcome-vs-integrity distinction,
   formalised — _The Gate Reports Its Own Misses_ is a theorem, not a slogan).
5. **`metamorphicResidueReproducible`** (substantive) — if the verifier
   accepts, every `residue_form` equals `apply(metamorphic_relation, seed_form)`
   under the sealed `vlr.metamorphic.v1` table, so the residue set (and thus the
   slip-rate) is a **function of the seeds and the signed transform, not author
   choice** — the machine-checked answer to self-gauntlet Finding 2 (the residue
   side is not corpus-constructible).

### Non-claims (8, signed)

1. `not_a_claim_of_semantic_leakage_closure` — VLR measures a bound; it does
   not close it.
2. `not_a_claim_that_v2_eliminates_paraphrase_smuggling` — an irreducible
   floor remains and is measured.
3. `not_a_claim_that_catch_rate_is_over_the_full_paraphrase_space` — N/M is
   relative to the frozen corpus's declared families.
4. `not_a_claim_that_ground_truth_labels_are_adjudicated` — author-declared
   under a frozen rubric, digest-sealed, never a semantic proof.
5. `not_a_claim_of_institution_independent_reproduction` — Lane B is
   process-independent, not institution-independent.
6. `not_a_claim_of_model_safety` — the permanent one.
7. `not_a_claim_of_regulatory_compliance` — regulator-useful is not legal
   compliance.
8. `not_a_claim_that_incident_sourced_items_name_or_accuse_any_party` — only
   the linguistic _shape_ of a documented smuggle is reused; no third party is
   a claim in shipped evidence.
9. `not_a_claim_that_slip_rate_is_gate_field_performance` — the metamorphic
   slip-rate is measured over a **frozen seed set under a signed transform
   table**; the residue side is reproducible, but seed and MR-table choice
   remain author-declared (public, signed, coverage-bounded). It is the gate's
   behaviour on _this transform of these seeds_, not its true field performance.

### Known limitations (signed)

1. **Corpus is a sample, not the paraphrase space; residue is reproducible but
   seed choice is bounded-not-eliminated** — the primary metamorphic slip-rate
   is deterministic and reviewer-reproducible (residue = `apply(MR, seed)` under
   the signed `vlr.metamorphic.v1` table; theorem `metamorphicResidueReproducible`),
   so the residue side is **not** author-constructible. Remaining freedom is the
   **seed set** and the **MR-table design** — both _public and signed_, hence
   auditable, and the seed set is bounded by the `coverage_witness` (every v1
   lexical family exercised). This is a materially smaller gaming surface than a
   hand-authored corpus, but not zero: a biased MR table or seed set is possible
   and visible, never hidden (non-claim 9). The honest ceiling on Law 1 — the
   number bleeds, is reproducible, and its residual freedom is signed and
   inspectable.
2. **Ground-truth labels are author-declared** under a frozen rubric — not a
   formal semantic proof.
3. **v2 shrinks but never closes the lexically-reachable residue** — and
   reaches zero for no family that requires meaning.
4. **An irreducible semantic residue remains** — measured into
   `residue_delta.irreducible`, not eliminated (the honest floor).
5. **Lane B is process-independent, not institution-independent** — a blind
   recompute across a process boundary, our code on both sides.
6. **Ruleset (v1 and v2) remains English-centric** — the multi-byte fixture
   proves byte geometry, not multilingual coverage (4W limitation 2 carried).

### Socket ledger (supersession recorded; one debt paid, floor minted)

```text
semantic_leakage_adversary_deferred
  → status: SUPERSEDED_BY semantic_residue_measurement_deferred (mechanism-overfit; no adversary ran)
semantic_residue_measurement_deferred
  → status: PAID_BY stage-4x-vlr
     (signed catch-rate + exact miss-set residue + provenance-tagged corpus + additive v2 monotone shrink)
```

**Reserved (signed) slots minted / carried:**

- `irreducible_semantic_residue_deferred` — **newly minted.** The
  true-paraphrase floor (`residue_delta.irreducible`) that no lexical ruleset
  can reach. A future stage could _estimate_ it with a **model-as-untrusted-
  advisory** lane (the 3V/3V-B pattern: digest-only, non-CI-gated, the model
  is an advisory signal that is itself verified, never an oracle and never
  driven to smuggle) — estimated, never eliminated, and never a live adversary.
- `multilingual_ruleset_deferred` — carried from 4W; v2 is still English.
- `narrative_version_diff_deferred` — carried from 4W (the VNVD stage; 4X's
  dual-provenance corpus becomes its v1↔v2 input for free).
- `transparency_report_profile_deferred` — carried from 4W (the VTRP stage;
  4X leaves it pre-seeded via the RSP-shaped `incident_sourced` family).
- `residue_over_submitted_narrative_deferred` — **newly minted (the 4Y
  candidate).** Today VLR measures the gate over a _frozen corpus_; the next
  rung measures it over **any submitted 4W narrative** — a reviewer pastes a
  real Art-73 filing or an RSP Risk Report and gets its leakage-residue map
  recomputed in-browser. New evidence species (residue over external input, not
  a fixed corpus); the founder-ledger blocker named below is exactly this debt.
  Signed non-claim in advance: _a residue map of a document is not a judgment of
  the document's truth._
- `cross_gate_residue_benchmark_deferred` — **newly minted (the 4Z
  candidate).** Publish the dual-provenance corpus as a **standard benchmark any
  lexical gate can be measured against** — ours, a lab's, a vendor's filter —
  each reporting its own catch-rate under the signed contract (the 3O
  "BYO-gateway" pattern applied to leakage gates: _others produce evidence under
  our contract_). Widest moat-widener on the board; new species (external
  parties produce residue evidence). Signed non-claim in advance: _catch-rate
  over a shared corpus is not a ranking of filter quality._

### Industry wedge (source-map claim, not a compliance claim)

Verified in the **2026-07-08 sweep** (one day after the 4W sweep; figures
below are **as-reported by secondary outlets** — see the source-precision
guard):

- **The closer fit is the _softening_ layer, not the citation cases.** Courts
  are sanctioning _fabricated citations and false quotations_ — but under our
  own stack those are **VSN 167/169** (evidence-locality / false-quotation),
  already structurally unfileable after 4W. VLR's distinct wound is the
  **hedged-quantifier residue**: the phrasing that makes an unsupported or
  fabricated _quantitative_ claim read as innocuous prose ("roughly a
  quarter", "effectively everyone") and slip a **lexical** gate. The
  **KPMG-withdrawal pattern — "industrialized plausibility"** — is this
  residue's exact shape: disputed quantitative claims softened into prose. VLR
  measures precisely which of those the gate misses.
- **The frontier-lab surface (the Anthropic wedge, pinned 2026-07-08).**
  Anthropic's **RSP v3.0 (effective 2026-02-24)** mandates **Risk Reports** that
  "quantify risk across all deployed models", published every 3–6 months and
  submitted for **external expert review**, plus an **affirmative safety case**
  once a model crosses the AI-R&D-4 threshold. These are prose arguments built
  on quantitative claims — the highest-stakes hedged-quantifier documents a lab
  produces — and the external reviewer is handed _text_, with no tool to
  separate evidence-bound claims from voice. VLR + 4W give that reviewer a
  recomputable surface: **the quantitative claims in a Risk Report / safety case
  become machine-separable into evidence-bound, declared-voice, and
  measured-residue, so the case is reviewed by recomputation, not only by
  trust.** This is the constitution-alignment line for the fellows thread —
  _making safety-case claims machine-checkable_ — and it is provider-agnostic in
  public wording (Anthropic named as the pinned instance of a general surface,
  not a target).
- **The national-institute surface (pinned 2026-07-08).** NIST **CAISI** opened
  public comment on draft **AI 800-2, "Practices for Automated Benchmark
  Evaluations of Language Models"**, observing that practices for the
  _"validity, transparency, and reproducibility of AI evaluations are only
  beginning to emerge."_ VLR is a worked example of exactly that: a signed,
  byte-reproducible evaluation with a deterministic corpus. It is also the
  **empirical companion** to NIST's result that _no finite guardrail set is
  universally robust_ — NIST proves the gap must exist; VLR measures and signs
  how large it is for a specific gate, reproducibly. Adjacent: **MLCommons
  AILuminate** (the safety benchmark UK AISI / US CAISI lean on) judges with
  evaluator _models_ and hides held-out prompts "to prevent gaming"; VLR's
  metamorphic residue is reproducible _without_ a model judge or a secret set —
  a deterministic complement, not a competitor. And an **ISO/IEC 42001** auditor
  reviewing "evidence of control implementation" for a content-filter control
  can treat a signed residue map as that evidence.
- **Scale of the underlying fabrication problem (context, reported):** ~1,313
  documented court proceedings involving AI-generated content; ~496 involving
  licensed attorneys across ~106 countries (Charlotin database, as of April
  2026); ~$145K in Q1-2026 sanctions, incl. a ~$109,700 Oregon aggregate and a
  $30,000 Sixth-Circuit penalty (two attorneys, 20+ fake citations, March
  2026). These motivate the _family_ of the disease; the citation-specific
  ones are 4W's surface, the quantitative-softening ones are 4X's.
- **EU Art-73:** draft serious-incident guidance + reporting template
  (consultation closed 2025-11-07); the AI Act applies generally from
  **2 August 2026** (Art-113), final guidance expected in that window. Art-73
  narratives are prose; a regulator running VLR's browser verifier sees
  **exactly which hedged quantitative phrasings the lexical gate misses** in
  such a narrative — recomputed in their own browser.
- **The founder's ledger (named actors + the single blocker each).** Concrete
  parties who could run `vlr-verifier.html` on a residue map tomorrow — we aim
  at all of them, provider-agnostic in public wording:

  | Actor                                                                            | Why VLR                                                                                                                                                                                  | Single blocker                                                                             |
  | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
  | **Anthropic** — RSP v3.0 Risk-Report / affirmative-safety-case external reviewer | separates a safety document's quantitative claims into evidence-bound / voice / measured-residue                                                                                         | residue map is over a corpus, not yet the reviewer's actual submitted document (4Y socket) |
  | **NIST CAISI** — draft **AI 800-2** automated-benchmark-eval practices           | AI 800-2 explicitly seeks _reproducible_ eval practices; VLR is a signed byte-reproducible one, and the empirical companion to NIST's "no finite guardrail is universally robust" result | contribute the metamorphic corpus + slip-rate as a worked reproducible example             |
  | **US CAISI + UK AISI** joint evaluations / **MLCommons AILuminate**              | AILuminate judges with evaluator _models_ and hides held-out prompts; VLR's metamorphic residue is reproducible without a model judge or a secret set                                    | position as a deterministic complement, not a competitor benchmark                         |
  | **ISO/IEC 42001 auditor**                                                        | 42001 audits review "evidence of control implementation"; a content-filter's signed residue map _is_ that evidence for a guardrail control                                               | map VLR output to a 42001 control id (a profile, future)                                   |

  The shared blocker is the same debt: VLR measures the _gate's_ residue over a
  frozen corpus, not yet the _arbitrary submitted document_ each actor holds —
  the `residue_over_submitted_narrative_deferred` (4Y) socket.

**Prior-art seam (pinned 2026-07-08, the positioning anchor).** Two adjacent
literatures concede exactly VLR's gap:

- **Paraphrase-attack benchmarks** (PADBen 2025-11; PARAPHRASUS; ParaphraseBench)
  validate their claim↔paraphrase pairs with an **LLM judge** ("validated using
  LLM judges, >90% precision") — non-deterministic, non-recomputable. A signed
  number over an LLM-judged corpus is unverifiable offline. VLR's metamorphic
  derivation is the reproducible alternative: residue = a pure function of the
  seed under a signed table.
- **Metamorphic testing / CheckList** is the established framework for
  deterministic known-transformation invariance testing — but it is used to
  **find bugs, never to emit a signed, byte-reproducible, offline-recomputable
  measurement of a specific gate's residue.** VLR adds the attestation layer MT
  lacks: a sealed metamorphic transform + a signed slip-rate any reviewer
  recomputes offline.

**To our knowledge no prior pattern emits a signed, byte-reproducible
metamorphic slip-rate for a named lexical safety gate, with a coverage witness
and an additive monotone bound-shrink.** Source-map claim, not a compliance
claim; public wording stays provider-agnostic. Citations pinned or dropped at
plan time (PADBen arXiv 2511.00416; the CheckList / metamorphic-testing line).

**Source-precision guard (BUILD-TIME obligation for VLR — moved earlier than
4W's closeout placement; self-gauntlet Finding 3).** Unlike 4W, VLR seals its
`incident_ref` pointers _inside the signed, frozen_ `simurgh.vlr.corpus.v1`. A
"reported" figure signed into immutable evidence and softened only at closeout
would leave a fuzzy citation notarised forever — the exact irony an
anti-fabrication stage must not commit. Therefore every `incident_ref` is
pinned to its PRIMARY source (the Oregon order itself; the Charlotin database
snapshot; the Commission's Art-73 template page; the RSP v3.0 PDF; the FT/KPMG
statements) **or softened to "reported" BEFORE the corpus is signed**, asserted
by a build-step check, never deferred. Public-doc figures still get the
closeout pass on top.

### Four-axis scorecard

> Design-time internal scorecard, not shipped evidence and not a
> literature-complete novelty claim.

| Axis                     | Score | Why / what moves it higher                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | 9.4   | Signed byte-reproducible **metamorphic** residue attestation for a named lexical gate + coverage witness + monotone bound-shrink + frozen-gate source-digest witness = new verifier geometry, with a clean prior-art seam (MT/CheckList don't attest; paraphrase benchmarks aren't reproducible). Higher: the irreducible floor estimated by an advisory lane.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Frontier                 | 9.2   | The primary number is a **deterministic, reviewer-reproducible metamorphic slip-rate** (residue = a function of seeds under a signed transform), not a hand-authored catch-rate — a stronger, less-gameable frontier claim; grounded discovery via `incident_sourced` provenance, no live adversary (deliberate, safety-first). Higher: multilingual transform table + advisory-estimated floor.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Lab/regulator usefulness | 9.7   | Aims at a NAMED cluster, not one actor: **Anthropic** (RSP v3.0 Risk Reports / affirmative safety cases, 2026-02-24 — hedged-quantifier prose an external reviewer must trust, made machine-separable by VLR + 4W); **NIST CAISI** (draft AI 800-2 explicitly seeks reproducible eval practices — VLR is a worked one, and the empirical companion to NIST's "no finite guardrail is universally robust"); **MLCommons AILuminate / UK AISI + US CAISI** (deterministic complement to model-judged, held-out benchmarks); **ISO/IEC 42001 auditor** (a signed residue map is control-implementation evidence); plus the 2026-08-02 Art-73 window and the KPMG "industrialized plausibility" shape. Higher: residue map over an arbitrary submitted document (the 4Y debt) — real adoption by any one named actor. |
| Constitution             | 9.5   | Making safety-case claims machine-checkable (evidence vs voice vs measured residue) is anti-deception honesty as infrastructure — and publishing your own gate's miss set against yourself, with a signed irreducible floor and no fake zero, models the honesty it verifies. Higher: institution-independent reproduction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Re-score at closeout.

### Mandatory closeout obligations

- K7-style all-functions E2E net (composes every export + full 173–180 tamper
  matrix + cross-stage invariants: frozen-gate binding, source-digest witness,
  ledger recompute, monotonicity, residue-recorded-not-failure) — MANDATORY
  before tag.
- Comprehensive docs-accuracy pass: every doc claim verified against shipped
  code.
- README stage row; north-star update; memory write; reserved slots restated;
  the **socket supersession ADR filed in Zurvan**
  (`semantic_leakage_adversary_deferred` → superseded →
  `semantic_residue_measurement_deferred` PAID by 4X).
- `scripts/check.sh` locally before push; neutral commit/PR/release messages,
  no attribution trailers anywhere.

### The thesis, brutally clear (for the closeout banner)

```text
4X does not close semantic leakage.
4X makes the remaining semantic leakage countable, signed, reproducible,
and smaller under v2 where lexical residue is reachable —
auditable residue, shrunk bound, signed irreducible floor.
```
