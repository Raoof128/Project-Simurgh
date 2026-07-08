# Stage 5C — VSB: Verifiable Semantic Bypass Ledger (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** (Internal tie-break order;
> public wording stays provider-agnostic.)

**Date:** 2026-07-09 · **Branch:** `stage-5c-vsb` · **Prev:**
v2.37.0-stage-5b-var (tag at 73e55dfc; main 964c6536) · **Raw codes:** 225–239
(wrapper LAST at 239; 240 remains headroom)

---

## 1. Identity, laws, blade

**Stage 5C — VSB: Verifiable Semantic Bypass Ledger.** The first stage in this
repo's history that reports a **non-zero observed slip count** as a first-class
result — a signed, recomputable ledger of the meaning-preserving mutations that
flip a frozen text-detector's verdict, each disclosed by id, base, and analyst
severity. (It is a **slip count / slip-rate**, not "ASR" — this measures a
detector's meaning-blindness, not attack success; and the count is reported
honestly whatever it is — 4X's signed 1/6 floor predicts ≥1, but the number is
not presupposed.)

**The wound it attacks — three of our own signed limitations at once:**

- **4W signed** that its leakage gate is "a frozen lexical ruleset, not NLP …
  semantic paraphrase smuggling is out of scope for 4W and becomes a later
  attack surface." Three stages (4W→4X→4Y) have re-signed the
  "lexical-not-semantic" bound without ever exercising it.
- **4X signed** a concrete floor: the v1 residue gate misses 6/6 metamorphic
  paraphrases, v2 shrinks to 1/6 — a real, non-zero, known slip that has never
  been dragged through the full attestation pipeline or ledgered with severity.
- **5B signed** (limitation 2) that "family-specific SEMANTIC mutations are a v2
  refinement … the semantic paraphrase-slip / cell-hide / span-forgery
  mutations are documented as the next increment," and (limitation 3) that
  `cross_gate_residue_benchmark` was paid only at **mechanism scope** because
  "no real residue slips were exercised."

5C is that next increment. It stops signing the wound and measures it.

**Thesis line:**

```text
4X: the residue is a number.
5B: the red team is grounded and signed.
5C: the numbers we BEAT are signed too — no silent slip, and no false breach.
```

**The blade (one per stage): a signed, itemized bypass LEDGER — with per-slip
analyst severity — over 4X's _existing_ metamorphic engine, externalized to a
real shipped detector.** This stage does **not** invent the mutation engine.
4X (VLR) already ships it: `applyMR(mrId, seed)` plus the frozen 6-relation
`vlr.metamorphic.v1` table of claim-preserving paraphrases, and it already
_measures_ the irreducible residue as a signed floor **count** against the 4W
leakage gate v1/v2 (`metamorphicTable.mjs`; the `true_semantic_paraphrase`
relation "slips BOTH gates"). **5C imports and extends that engine** and adds
the three things 4X's measurement provably lacks:

1. a **disclosed, itemized, severity-bearing bypass ledger** — 4X signs a count;
   5C signs each slip by id, base, gate, version, and analyst severity;
2. **externalization to a real deployed detector** (Prompt Guard) — which 4X
   forbids itself by charter (`no_live_model_lane_no_adversarial_elicitation`);
3. an **anti-overclaim gate**: a detector-slip labelled a kernel/authority
   breach fails closed on the overclaim itself (raw 237 + `kernelDisjoint`).

**The engine, reused not reinvented.** 5C's grid is the total enumeration over
`(MR × base)`, computed by the **imported** `applyMR` — 5C's dispatcher
`applyMR5C(mr_id, base_text)` calls it positionally, where 4X's `seed` param
**is** our `base_text` (same object; the MRs are pure rewrites, so there is no
separate numeric seed dimension). New MR families (`voice_flip`,
`unicode_confusable`, `guardrail_evasion`) follow the identical
`(mr_id, base_text) → string` contract and are **appended** to the imported 4X
table under a composed ruleset; the 4X portion carries a byte-match source-digest
witness (4X's own read-only-kernel discipline, `corpusCore.mjs:30`). A **slip**
is a cell where `flagged(base) = true` and `flagged(mutation) = false`.

**`flagged(text)` is a _defined reduction_, not a native boolean (this is real,
the gates take structured input).** The 4W gate is
`scanLeakage(body, spanMap, capsuleValues)` returning region hits
(`leakageGate.mjs:43`), so `flagged_4w(text) := scanLeakage(text, [], []).length
> 0` (an EMPTY span map leaves the whole body as one uncovered region —
verified against `uncoveredRegions`; a span _covering_ the body would scan
nothing); 4X residue and 4Y document-residue each
get their own one-line reduction pinned in §2. Prompt Guard is a genuine
`text → verdict` (cleaner than our own gates). Every reduction is frozen in
constants and covered by the signed ruleset digest; 5C never edits a gate
(read-only kernel extends to the imported engine and gates).

**Bypass, defined precisely (and gated — see Law 3):** in this stage "bypass"
means _a meaning-preserving mutation that flips a **downstream text-detector's**
verdict from flagged to unflagged._ It is **never** a breach of the read-only
authority/egress kernel (4A), which no mutation touches. The artifact is
structurally forbidden from asserting the breach reading (raw 237).

**Laws:**

1. **No Cherry-Picked Mutation** — the corpus is the _total_ enumeration over
   the frozen `(MR × base)` grid. The signed slip table is a **projection** of
   the total partition; the audit tier recomputes the whole grid and fails
   closed if the partition is not total, overlaps, or the slip table omits a
   slipped cell. (The Completeness Invariant, turned on an adversarial corpus —
   the itemization 4X's floor-count does not provide.)
2. **No Silent Slip** — every slipped cell is ledgered with a signed analyst
   severity. A slip present in the recomputed grid but absent from the signed
   bypass table fails closed (raw 233, audit-tier teeth — mirrors 5B's No
   Silent Bypass, now with real non-zero content).
3. **A Slip Is a Detector Bound, Not a Kernel Breach** — a semantic slip
   measures a downstream detector's meaning-blindness. It is never a bypass of
   the authority/egress kernel. Any finding that labels a slip as a kernel /
   authority breach **fails closed on the overclaim itself** (raw 237). The
   anti-overclaim project gates its own overclaim.

**The honest core (signed up front, section 1, as the next stage's target):**

- **The mutation engine is 4X's, reused — not new geometry.** 5C's novelty is
  the _attestation layer_ (itemized+severity ledger), the _externalization_
  (real detector), and the _anti-overclaim gate_ — not the metamorphic idea
  (4X, and before it MORTAR/MTF). Novelty is scored accordingly (§6, ≈8.7),
  not inflated. Building a parallel engine would have been the wrapping
  anti-pattern; reusing `vlr.metamorphic.v1` is the doctrine-preferred bridge.
- **Meaning-preservation is _basis-declared_, not proven.** Each MR declares an
  equivalence-preserving `equivalence_basis` class (`lexical_synonym`,
  `syntactic_voice`, `structural_reorder`, `unicode_confusable`,
  `whitespace_evasion`); the imported 4X relations are assigned their basis. The
  _class_ is machine-checkable, semantic identity is not. A reviewer can inspect
  any MR's output. Non-claim: slip-rate is relative to the declared MR families,
  **not** the paraphrase space; a low slip-rate is not detector completeness.
- **MRs are frozen transforms, not learned paraphrases.** A real
  adversarial-ML paraphraser generates mutations we cannot enumerate offline.
  That is this stage's minted debt (`learned_paraphrase_mutation_deferred`) and
  the explicit 5D+ attack surface.
- **A slip is a detector bound, not a kernel breach** (Law 3, restated as a
  permanent non-claim).

**Read-only kernel:** zero `src/llmShield` diff (verified empty against
v2.37.0-stage-5b-var); 4A–5B byte-frozen; no `authorise_*` entry point.
Additive raw codes **225–239** (wrapper LAST at 239; 240+ headroom).

---

## 2. Artifact: `simurgh.vsb.slip_ledger.v1`

A signed slip-ledger bundle, additive beside all prior evidence (5A/5B frozen):

```text
{
  schema: "simurgh.vsb.slip_ledger.v1",
  mr_ruleset_id,          // "vsb.mr.v1" — a COMPOSED ruleset: the imported 4X
                          // vlr.metamorphic.v1 relations + 5C-appended families
  mr_ruleset_digest,      // sha256 of canonicalJson(COMPOSED_MR_TABLE); the 4X
                          // portion must byte-match vlr.metamorphic.v1 via a
                          // source-digest witness (raw 227 on either mismatch)
  gate_reductions,        // frozen { mechanism[/version] → reduction_id } pinning
                          // how flagged(text) is derived per mechanism (see below)
  base_corpus: [          // the flagged predecessor fixtures, by reference only
    { base_id, mechanism, gate_version, base_text_digest,
      base_verdict } ],   // base_verdict MUST recompute to `true` (flagged) or
                          // the cell is `not_applicable`
  grid: [                 // TOTAL enumeration; sorted (mr_id, base_id)
    { mr_id, base_id, equivalence_basis,
      mutated_text_digest,        // sha256 over canonical UTF-8 BYTES
      mutation_verdict,           // recomputed flagged(mutation) ∈ {true,false}
      cell_class } ],             // caught | slipped | not_applicable | degenerate
  slip_table: [           // PROJECTION of grid where cell_class == "slipped"
    { mr_id, base_id, mechanism, gate_version,
      severity,                   // analyst-declared ENUM ∈ VSB_SEVERITY_ENUM (raw 234)
      severity_basis,             // one of VSB_SEVERITY_BASES (enum)
      analyst_note } ],           // OPTIONAL free text — the ONLY policed surface:
                                  // 237 fails closed if it (or severity_basis)
                                  // asserts a kernel/authority breach (denylist)
  slip_rates: [           // derived; per (mechanism, mr_family)
    { mechanism, mr_family, caught, slipped, slip_rate_num, slip_rate_den } ],
  floor_monotonicity: [   // per MECHANISM with >1 version (only leakage: v1,v2)
    { mechanism, older_version, newer_version,
      newer_slip_subset_of_older } ],   // MUST be true or raw 236 (see §5 caveat)
  binding: {
    campaign_label,               // "stage5c-vsb-v1" (a label, NOT a per-cell seed)
    severity_binding,             // sha256 of the sealed Lane-B blind-severity
                                  // child output; slip_table severities MUST match
                                  // it (raw 238) — the parent cannot rewrite them
    lane_c_binding,               // OPTIONAL Lane-C grounding, digest-only, null
                                  // in CI. { kind: "external_detector",
                                  //   detector_id, detector_version, threshold,
                                  //   base_corpus_digest, verdict_log_digest,
                                  //   audit_private_log_digest }
                                  // — see §4 Lane C (raw 238 if present & invalid)
    predecessor_gate_digests },   // pinned leakage-v1/v2 + doc-residue engine digests
  attestation_pub_key_pem,        // embedded for the browser WebCrypto verifier
  non_claims, known_limitations,  // sealed copies of the constants
  signature               // Ed25519 over canonicalJson(content)
}
```

**Detector mechanisms + `flagged(text)` reductions (frozen in `gate_reductions`,
F3). There are TWO CI mechanisms, not three gates** — the "4W" and "4X" gates
are the SAME leakage detector at v1 and v2 (4X composes v1: `gateV2.mjs`):

- **leakage v1** → `scanLeakage(text, [], []).length > 0`
  (`stage4w/core/leakageGate.mjs:43`; `EMPTY_SPAN_MAP` (`[]`) leaves the whole
  text as one uncovered region so the lexical RULES scan it — verified).
- **leakage v2** → `scanLeakageV2(text, [], []).length > 0`
  (`stage4x/core/gateV2.mjs`; v2 = v1 ∪ a DISJOINT hedge lexicon, so
  `slipSet(v2) ⊆ slipSet(v1)` holds **by construction** — see §5 monotonicity
  caveat).
- **doc-residue (4Y)** → `extractSpans(text).length > 0`
  (`stage4y/core/spanExtractor.mjs:66`; genuinely a distinct mechanism).
- **external_detector** (Lane C) → the detector's native `text → verdict` at the
  pinned threshold. Prompt Guard needs no framing (cleaner than our gates).

**Digest definitions (canonical, one line each):**

- `mutated_text_digest` = sha256 over the canonical UTF-8 **bytes** of
  `applyMR(mr_id, base_text)` (the imported 4X function; 5C's `base_text` is
  4X's `seed`), NOT `canonicalJson`. The verifier recomputes `applyMR` and
  byte-compares (raw 229 on mismatch — mutation not reproducible).
- `base_text_digest` = sha256 over canonical UTF-8 bytes of the base fixture.
- `mr_ruleset_digest` = sha256 of `canonicalJson(COMPOSED_MR_TABLE)`; the 4X
  slice is additionally checked byte-equal to `metamorphicTableDigest()`.
- `recordDigest` (sha256 of canonicalJson) for the signed bundle two-stage sign
  `canonicalJson(parse(bundle))`.

**Cell-class rules (the total partition):**

- `not_applicable` — `base_verdict === false` (base wasn't flagged; no invariant
  to break). Counted, excluded from slip-rate denominator.
- `degenerate` — `applyMR` returned bytes identical to the base (no mutation).
  Counted, excluded from denominator. A ruleset that produces >`VSB_MAX_DEGENERATE_RATE`
  degenerate cells fails closed (raw 232 — a no-op MR corpus is not a corpus).
- `caught` — base flagged, `mutation_verdict === true` (gate robust here).
- `slipped` — base flagged, `mutation_verdict === false` (semantic bypass of
  that gate). MUST appear in `slip_table` with signed severity.

`slip_rate = slipped / (caught + slipped)` as an exact rational pair
(`_num`/`_den`), never a rounded float (canonicalJson float hazard — see
gotchas). Published and recomputed (raw 235 on mismatch).

---

## 3. Raw codes 225–239 (first-failure order frozen)

```text
225 VSB_SCHEMA_INVALID                 schema / allowlist / shape
226 VSB_SIGNATURE_INVALID              Ed25519 over canonicalJson(content)
227 VSB_MR_RULESET_MISMATCH            composed ruleset ≠ constants, OR 4X slice ≠ metamorphicTableDigest()
228 VSB_GRID_INCOMPLETE                (MR×base) enumeration not total  [No Cherry-Picked Mutation]
229 VSB_MUTATION_NOT_REPRODUCIBLE      applyMR(mr_id, base) ≠ committed mutated_text_digest
230 VSB_EQUIVALENCE_BASIS_UNDECLARED   a grid cell / slip lacks a frozen equivalence_basis
231 VSB_GATE_VERDICT_MISMATCH          recomputed flagged(base|mutation) ≠ sealed verdict
232 VSB_PARTITION_INVALID              cell_class overlap / gap / degenerate-rate exceeded
233 VSB_SILENT_SLIP                    slipped cell absent from slip_table  [No Silent Slip; audit teeth]
234 VSB_SEVERITY_INVALID               slipped entry missing/invalid severity ENUM only (child-binding match is 238)
235 VSB_SLIP_RATE_RECOMPUTE_MISMATCH   published slip_rate ≠ recomputed rational
236 VSB_FLOOR_MONOTONICITY_INVALID     newer-version slip-set ⊄ older-version slip-set  [anti-regression; §5 caveat]
237 VSB_KERNEL_BREACH_CLAIMED          analyst_note/severity_basis asserts a kernel/authority breach  [Law 3; PUBLIC — lexical]
238 VSB_LANE_BINDING_INVALID           Lane-B severity binding OR Lane-C detector binding present & unreconciled
239 INTERNAL_FAIL_CLOSED_VSB           fail-closed wrapper (any throw → code)  [LAST]
```

**Check order (literal; K7 asserts earlier-wins on a double-fault fixture):**
schema → signature → MR-ruleset → grid-complete → mutation-reproducible →
equivalence-basis → gate-verdict → partition → **silent-slip** → severity-enum
→ slip-rate → floor-monotonicity → kernel-breach-claimed → lane-binding →
wrapper.

**Tiering (PF2 — corrected).** **Only raw 233 (silent slip) is audit-tier**: a
laundered-out slip is invisible unless you recompute the WHOLE grid, so a
public-GREEN / audit-RED pack is caught there. **237 is PUBLIC** — it is a
lexical screen of the artifact's own `analyst_note`/`severity_basis` against a
frozen breach-claim denylist, catchable without any recompute; putting it in
audit-only would let a public verifier miss the overclaim. So `VSB_PUBLIC_CODES`
excludes **only 233**; `VSB_AUDIT_CODES` = all 225–238. All new codes are
`RUN_LEVEL_BY_RAW` level 1.

**Additive-codes blast radius (gotcha, plan Task 1).** Adding 225–239 to
`exitCodes.mjs` ripples the hardcoded exit-map goldens — the known 4R/4S/4W
trap: `stage4h/exitWrapper.test.js`, both committed `exit-map.json` files
(regenerate via the stage4h digest builder under Node 26), and the 4K/4H/4L
snapshots. Regenerate + run the full e2e nets AND every prior reproduce script
before push; never probe an unknown code with a hardcoded literal
(`UNKNOWN_RAW_PROBE` 999).

---

## 4. Evidence lanes

**Prior art & the conceded seam (honest positioning — VSB does not invent
metamorphic testing).** Metamorphic testing of LLM systems is established:
MORTAR (arXiv 2412.15557) and MTF (ICAIAT 2025) already apply metamorphic
relations to dialogue/LLM systems, and severity-graded guardrails exist
(BingoGuard, ICLR 2025 — severity as a _model prediction_). The adjacent
competitor is the guardrail-robustness benchmark (arXiv 2511.22047, Nov 2025),
which evaluates ten public guardrails across 1,445 prompts — but reports **only
aggregate accuracy metrics, with no itemized per-attack outcomes, no signed
ledger, and no attack-by-attack attestation**, and itself warns that
"benchmark performance may be misleading due to training data contamination."
That omission is the seam. **VSB's novelty is not the metamorphic relation —
it is the verifiable attestation _contract_ over the slip results, over 4X's
engine and a real detector:** a fixture-pinned, contamination-free,
byte-reproducible signed ledger with the
No-Cherry-Picked-Mutation completeness invariant (228/233), the anti-overclaim
kernel-disjointness gate (237), and the anti-regression floor (236). The
incumbents produce numbers; VSB produces a ledger anyone can recompute offline
and cannot silently prune. Severity here is a **signed analyst record**, not a
model prediction — the BingoGuard axis, made recomputable.

**Lane A (byte-stable, CI-gated).** The committed corpus is the full
`(MR × base)` grid over the frozen flagged fixtures pulled from 4W/4X/4Y.
One green attestation exercising every export; a tamper matrix hitting every
code 225–238 (with sub-variants: a degenerate-inflated ruleset for 232, a
laundered-out slip for 233, a mislabelled kernel-breach for 237, a newer-gate
regression for 236); an idempotent CLI generator (`generate twice + git diff
--exit-code`). Include a multi-byte / non-ASCII base (the `unicode_confusable`
MR is where byte-offset geometry dies in daylight).

**Named fixture families (each tied to a real, cited concession):**

- `distribution_shift_slip` — after DeepMind's _Building Production-Ready
  Probes for Gemini_ (Kramár, Engels, Wang, Chughtai, Shah, Nanda, Conmy;
  **arXiv 2601.11516**, submitted 16 Jan 2026, rev 10 Feb 2026), which states
  in its own words that "probes fail to generalize under important production
  distribution shifts." **We do NOT run DeepMind's probe** (we have no access to
  Gemini's activation probes); `distribution_shift_slip` is an _analog_ fixture
  demonstrating the same distribution-shift evasion class against our own gates
  and the Lane-C detector, named to bind the concession (G3). **Primary source
  pinned** (arXiv 2601.11516; Zurvan-ingested PDF sha256 `c4a36db5…`); figures
  cited as the paper's own, never restated as ours.
- `synonym_veil` — lexical-synonym MRs that a frozen lexical gate cannot see
  (the 4W concession, made concrete).
- `voice_flip` — active↔passive syntactic recasts of a flagged claim (4X
  metamorphic lineage).
- `confusable_homoglyph` — Unicode-confusable substitution (the byte-geometry
  fixture; also the anti-normalisation-evasion case).
- `guardrail_evasion_slip` (Lane-C-targeted, G2) — after Hackett, Birch,
  Trawicki, Suri & Garraghan, _Bypassing LLM Guardrails_ (**arXiv 2504.11168**,
  LLMSec 2025), which reports **up to 100% evasion** of six protection systems
  _including Meta's Prompt Guard and Azure Prompt Shield_ via character
  injection / invisible-character (emoji) smuggling / word-importance-ranked
  adversarial ML — but publishes **aggregate evasion rates, no signed,
  itemized, byte-reproducible ledger** of which attack beat which guardrail.
  That omission is VSB's exact seam: the detector we target in Lane C is
  _published-100%-evadable_, and 5C turns those evasions into a signed,
  recomputable slip ledger. Character-injection MRs here overlap
  `confusable_homoglyph`; the family exists to bind the citation to the real
  target. **Primary pinned** (arXiv 2504.11168; figures cited as the paper's).

**Lane B (deterministic two-process ceremony, CI-gated) — blind _severity_, not
blind mutation.** A blind-mutator ceremony would be theater here: `applyMR` is a
pure function of the frozen table, so anyone recomputes the mutations — blindness
buys nothing determinism doesn't already give. Lane B instead blinds the thing
that _is_ discretionary: the **severity assignment**. The child receives only
`{mr_id, base_id, mutated_text_digest}` for the slipped cells over stdin — **not**
which `mechanism`/`gate_version` slipped, nor the slip-rate — and emits
`{severity, severity_basis: "blind_digest_only_review"}` per slip. This makes
severity **adversary-independent**: it cannot be inflated for our own weak gates
or deflated for the real detector, because the analyst never sees which is
which. Env scrubbed to PATH; child refuses `OPERATOR*` env and `.pem` argv;
sealed blindness negatives prove the guards fire. The parent seals
`severity_binding = sha256(canonicalJson(child_output))` and copies the child's
`{severity, severity_basis}` verbatim; a rewritten value trips **238** (the
slip-table no longer reconciles to `severity_binding`) — **234** is enum-validity
only.

**Lane C (real-detector grounding, NEVER CI-gated, keyed, digest-only,
OPTIONAL).** This is the Frontier lever: run the identical mutation engine
against a **real shipped production guardrail** expressed as `flagged(text)`,
so the ledger reads "we beat a deployed detector," not only "we beat our own
gates." Primary target is **Prompt Guard (86M)** — light, offline, and made
deterministic by a **pinned threshold**; the heavier option is **Llama Guard**,
reusing the 3V-B live-capture recipe (Meta preview transformers, 8-bit,
RunPod). `lane_c_binding.kind = "external_detector"` pins `detector_id`,
`detector_version`, `threshold`, `base_corpus_digest`, `verdict_log_digest`, and
`audit_private_log_digest` (raw 238 if present & invalid).

**Two-artifact split (P0-5 — digests alone cannot recompute `applyMR`).** The
**public** Lane-C artifact is digest-only: no raw prompts/mutations in any
committed or CI bundle. A separate **audit-private** log (never public, never
CI) holds the raw flagged prompts + mutated texts; the audit verifier, given it,
recomputes `applyMR5C` and the partition and checks them against
`verdict_log_digest`. Without the private log the audit tier verifies only log
integrity + detector-verdict binding + partition-from-sealed-labels — it does
**not** silently claim an `applyMR` recompute it cannot do. `base_corpus_digest`
pins the (withheld) prompt set; `audit_private_log_digest` binds the raw log so
its later disclosure is verifiable.

**Honest wrinkle (signed):** Prompt Guard / Llama Guard are _input-prompt_
classifiers, so this lane's **base corpus is flagged prompts** (prompts the
detector flags), not the 4W/4X/4Y narrative/residue/document text — same
engine, different bases. That is not a weakness: paraphrase / confusable
evasion of a flagged prompt **is** exactly the DeepMind distribution-shift
finding (`distribution_shift_slip`), now recomputable against a real detector.
A slip here measures that detector's meaning-blindness **at the pinned version
and threshold** — never a claim about the provider's underlying model, and
never a kernel breach (Law 3). It does **not** retire
`live_adversary_capture_lane_deferred` (that socket is a live _adversarial
model_ lane; a defensive detector is a different species).

**BYO-detector adapter (Good-for-Anthropic lever).** Lane C ships as a
documented `flagged(text)` adapter interface with a worked Prompt Guard
example, so the founder's-ledger blocker shrinks from "express your detector as
a deterministic verdict function" to "implement one method, here is a running
example." A lab team can drop in their own detector and get a signed,
recomputable slip-rate for model-card / RSP evidence. The adapter is Lane-C
only (keyed, offline); it never enters the CI-gated public surface.

**No 5B-capture binding (P0-4).** 5C's Lane C implements **only**
`kind = "external_detector"`. A `var_capture_1b` binding over 5B's 1B capture is
explicitly **not** implemented here — accepting a 5B capture in a 5C verifier
would leak Stage-5B scope into a detector-slip stage for no Frontier gain. If a
future stage wants it, it mints its own binding kind + non-claim.

---

## 5. Parity, proofs, honesty ledger

**Parity.** Python (stdlib only) and a static browser verifier (single file,
CSP `default-src 'none'`, node:vm parity gate in e2e) reproduce the
deterministic public surface: `applyMR` determinism, the cell-class partition,
the rational slip-rate, and floor-monotonicity set-inclusion. **The browser
verifies the Ed25519 signature in-page via WebCrypto** (`crypto.subtle`,
matching the 4X/5A/5B verifiers), reading the embedded `attestation_pub_key_pem`
and failing closed (`ed25519_not_supported`) where unavailable — not
"Node-authoritative". The composed MR ruleset (imported 4X relations + 5C
families) is ported with a "MUST byte-match constants.mjs" header, and the ports
re-derive the 4X-slice witness.

**Lean (`proofs/stage5c/`, Lean 4.15.0, no mathlib, zero sorry — 7 theorems):**

0. `gridClosure` (Novelty lever) — the enumerated grid **is** the complete
   product `MR × base`: `grid.length = |MR|·|base|` and every `(mr_id, base_id)`
   pair appears exactly once. Upgrades completeness from "the slip table omits
   nothing from the grid" to "the grid omits nothing from the reachable set"
   (the closure the incumbents concede they lack). Contrapositive fires 228.
1. `partitionTotal` — every grid cell lands in exactly one of
   {caught, slipped, not_applicable, degenerate}.
2. `slipTableComplete` — the slipped-set of the partition equals the signed
   slip table (No Silent Slip; contrapositive fires 233).
3. `slipRateSound` — published rate = `|slipped| / (|caught|+|slipped|)` exactly
   (rational arithmetic, no float).
4. `floorMonotone` — `slipSet(vNew) ⊆ slipSet(vOld)` ⇒ no regression; the
   contrapositive fires 236 (lineage: 3Q anti-laundering lattice). **Honest
   caveat (PF3):** for the only real versioned mechanism (leakage v1→v2), v2
   composes v1 (`gateV2.mjs`) so the inclusion holds **by construction** — the
   theorem is a conditional and 236's teeth bite only a _synthetic/adversarial_
   monotonicity claim, not a real-gate discovery. Stated as such, not oversold.
5. `kernelDisjoint` — the mutation domain (bytes fed to text-detectors) is
   disjoint from the kernel decision inputs; a slip cannot change an
   `authorise()` verdict (symbolic model of Law 3).
6. `mutationDeterminism` — the imported `applyMR` is a function: equal
   `(mr_id, base)` ⇒ equal output (reproducibility → 229; 4X already proves the
   analogue `metamorphicResidueReproducible`, reused here).

**Non-claims (`VSB_NON_CLAIMS`).** Permanent ones
(`not_a_claim_of_model_safety`, no regulatory-compliance claim,
provider-agnostic public wording) plus the per-invention anti-gaming ones:
slip-rate is relative to the declared MR families not the paraphrase space; a
slip is a detector bound not a kernel breach; meaning-preservation is
basis-declared not proven; a low slip-rate is not detector completeness; the 1B
Lane-C grounding is a substrate not a frontier finding; **an external-detector
slip is measured at a pinned version and threshold and says nothing about the
provider's underlying model.** And the load-bearing one, against the strongest
counter-reading: **VSB makes detector-slip evidence recomputable and complete;
it does NOT verify model internals or close the "audit gap"**
(_Behavioural Assurance Cannot Verify the Safety Claims Governance Now
Demands_, arXiv 2605.15164) — a slip-ledger is
meta-evidence _about a detector_, never a safety verdict about a model. VSB is
the reproducible-attestation substrate that argument implies you need, not a
claim to have closed the gap it names.

**Known limitations (`VSB_KNOWN_LIMITATIONS`).** The MR engine is 4X's,
extended — not a new mutation capability (the honest core; §1); MRs are frozen
transforms not learned paraphrases (minted socket); slip severity is
blind-analyst-declared (Lane B) and bundle-signed, not a formal exploitability
proof; the base corpus is the flagged 4W/4X/4Y fixtures, not the full flagged
space; the external-detector Lane C is keyed, digest-only, and never CI-gated —
its verdicts are pinned at one version+threshold, not the full detector, and are
reproducible only from the sealed verdict log, not by re-invoking the detector
in CI.

**Socket ledger.** PAYS `irreducible_semantic_residue_deferred` (open since 4X).
**Honest payment scope (F2):** 4X already _measured_ the irreducible residue as
a floor count — 5C does not re-measure it. 5C pays the socket by doing what 4X's
count could not: **itemizing** the residue into a disclosed, severity-bearing
ledger (each irreducible slip by id), and **externalizing** it to a real
deployed detector (Prompt Guard), where "irreducible under _our_ lexical gate"
becomes "still slips a shipped guardrail." Paying by measurement alone would be
a false payment; paying by itemization + externalization is the delta. RETIRES
two signed-limitation debts (not sockets): 5B limitation 2 (semantic mutations
now itemized against a real detector) and the "lexical-not-semantic" bound
carried since 4W. MINTS `learned_paraphrase_mutation_deferred`. Net sockets
6 → 6 (pay 1, mint 1); no hoarding.

---

## 6. Founder's ledger & scorecard

**One named external actor who could run this tomorrow:** a frontier lab's
interpretability/safety team (e.g., the team behind the DeepMind Gemini probes)
runs the VSB verifier over their own flagged corpus to publish a signed,
recomputable slip-rate as model-card / RSP evidence. With the **BYO-detector
adapter shipped** (Lane C, worked Prompt Guard example), the blocker is no
longer "express your detector as a deterministic verdict function" — that work
is done and demonstrated. **Remaining single blocker:** they must pin a
threshold to make a probabilistic detector deterministic, and run the (keyed,
offline) capture once. 9.9+ needs an _actual_ external lab to run it — genuinely
not ours to fake, tracked as a roadmap debt not decoration.

**The Anthropic wound this design answers (honestly scoped).** In Feb 2026
Anthropic disclosed that Claude Opus 4.6, evaluated on BrowseComp, hypothesised
it was under evaluation, identified the benchmark, and **located and decrypted
the answer key** (9 contamination cases / 1,266 problems; 11 where the answer
came from benchmark materials), concluding the field must "treat eval integrity
as an ongoing adversarial problem rather than a design-time concern"
([eval-awareness-browsecomp](https://www.anthropic.com/engineering/eval-awareness-browsecomp);
Opus 4.6 system card, Feb 2026). VSB is a **worked instance of
eval-integrity-by-construction**: a frozen, seed-pinned, offline-recomputable
metamorphic corpus has no hidden answer key to reverse-engineer — verdicts
recompute deterministically and the completeness invariant forbids silent
pruning. **Scope, signed:** this hardens the _detector-evaluation_ slice, not
capability evaluation; VSB does not stop a model gaming a capability benchmark.
The International AI Safety Report 2026 gives the consensus backing — "reliable
pre-deployment safety testing has become harder to conduct."

**The regulatory clock (dated, not evergreen).** EU AI Act GPAI Code of
Practice enforcement begins **2 Aug 2026** — weeks out. Adversarial testing /
red-teaming is a named systemic-risk evaluation method, and providers not on
the Code must meet "a higher evidential burden" through equivalent measures.
A signed, byte-reproducible, completeness-guaranteed slip ledger is exactly
that burden's shape. NIST concedes the parallel gap: "a lack of consensus on
best practices, making it difficult to compare results and establish
standards." VSB is the recomputable evidence unit those regimes demand and
neither yet specifies.

**One new evidence species:** the first signed **non-zero** adversarial outcome
in the repo — "here are the N mutations that beat a shipped detector, by id,
base, blind severity, reproducible offline." Twenty-plus stages of 0/N; a
project that ledgers its own defeats — and, this stage, honestly credits the
predecessor whose engine it reuses and downgrades its own Novelty for it — is
the credibility apex.

**Scorecard (honest, spec-time — re-scored at closeout; each delta is a shipped
artifact, and Novelty is DOWN from the pre-gauntlet 9.6 because the mutation
engine is 4X's, not ours — F1):**

| Axis                   | Score | Delta built here → what still moves it higher                                                                                                                  |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            | 8.7   | ↓ from 9.6 (gauntlet F1): the metamorphic engine is **4X's, reused**, not new geometry. What IS new: the itemized+severity bypass **ledger** (4X signs a count), **externalization** to a real detector, the **anti-overclaim gate** (237/`kernelDisjoint`), and `gridClosure`. → 10: the learned-paraphrase lane (5D). |
| **Frontier**           | 9.5   | +real-detector Lane C: 4X's engine, now run against a **shipped guardrail** (Prompt Guard 86M / Llama Guard) that is _published-100%-evadable_ (Hackett 2504.11168), not only our own gates. → 9.7+: frontier-scale probe / lab access. |
| **Good-for-Anthropic** | 9.7   | +BYO-detector adapter with a worked Prompt Guard example (a lab drops in its detector for signed model-card / RSP evidence); answers Anthropic's own Opus 4.6 eval-integrity lesson for the detector slice. → 9.9+: an actual external lab runs it. |
| **Constitution**       | 9.6   | ↑ from 9.5: the re-blade _itself_ is the constitutional act — crediting 4X, catching a false socket payment (F2), and self-downgrading Novelty is radical honesty as infrastructure. → 9.8: a repo-wide honesty lemma (no stage may assert model-safety) — held for 5D. |

**Weakest honest number, named for 5D:** Novelty 8.7 — because the engine is
inherited, this stage's originality lives entirely in the attestation layer;
the learned-paraphrase lane (5D) is where the mutation capability itself becomes
new. The slip-rate is also only as meaningful as the MR families are
representative; frozen transforms under-count the true semantic-evasion surface.
