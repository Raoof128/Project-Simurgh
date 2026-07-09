# Stage 5C — VSB (Verifiable Semantic Bypass Ledger) — TDD Implementation Plan

**Motto: AnthropicSafe First, then ReviewerSafe.** Spec:
`docs/superpowers/specs/2026-07-09-stage-5c-vsb-semantic-bypass-ledger-design.md`.
Every task is **test-first**: write the failing test, watch it fail for the _right_ reason,
write the minimal code, green, `npm run format`, commit (neutral message, **no attribution
trailer anywhere**). Build from the 5A/5B skeletons and **import** 4X's engine read-only. Read
the gotcha ledger **before Task 1**.

The gauntlet fixes (F1–F8) are baked into the tasks and marked `[Fn]` — do not regress them.

---

## Gotcha ledger (each cost a real CI round in a prior stage — read first)

1. **Additive-code golden ripple** (4R/4S/4M/4N/5A/5B): adding raw codes **225–239** disturbs
   the `exit-map.json` goldens **and** the inline `RUN_LEVEL_BY_RAW` map in
   `stage4h/exitWrapper.test.js`. Regenerate **only under Node 26**
   (`export PATH="/opt/homebrew/opt/node@26/bin:$PATH"`); confirm the diff is limited to the
   exit-map files + the inline map. Never probe an unknown code with a literal — `UNKNOWN_RAW_PROBE` (999).
2. **`VSB` is safe as an identifier** (not a JS reserved word, unlike `var`); the wrapper suffix
   `_VSB` (`INTERNAL_FAIL_CLOSED_VSB`) mirrors `_VAR`/`_VNC`.
3. **The 4X engine is IMPORTED, never copied or edited** `[F1]`: `import { applyMR, MR_TABLE,
metamorphicTableDigest } from "../../stage4x/core/metamorphicTable.mjs"` and
   `{ scanLeakageV2, checkLeakageV2, v2Digest } from "../../stage4x/core/gateV2.mjs"`. Zero bytes
   of stage4w/4x/4y change. The composed ruleset appends 5C relations; the 4X slice MUST
   byte-equal `metamorphicTableDigest()` (raw 227).
4. **`flagged(text)` is a REDUCTION, not a boolean** `[F3]`. `flagged_4w(text) :=
scanLeakage(text, [], []).length > 0`. **The span map is `[]` (empty), NOT a covering span** —
   verified against `uncoveredRegions` (`leakageGate.mjs:12`): empty map ⇒ whole body is one
   uncovered region ⇒ scanned; a covering span ⇒ zero regions ⇒ nothing scanned ⇒ every base
   `not_applicable` ⇒ a silent dead stage. Task 3 asserts a known-flagged base returns `true`.
5. **`canonicalJson`, never `JSON.stringify`** (4X); it **throws on BigInt** and **rounds
   `Number > 2^53`** (4Z). Slip-rate is an exact **integer** rational pair (`_num`/`_den`), never
   a float `[F8-adjacent]`.
6. **Lane B blinds SEVERITY, not mutation** `[F5]`. A blind-mutator ceremony is theater
   (`applyMR` is a pure frozen function). The child receives `{mr_id, base_id,
mutated_text_digest}` for slipped cells — **never** `mechanism`/`gate_version`/slip-rate —
   and emits `{severity, severity_basis}`. Blindness makes severity adversary-independent.
7. **Browser verifies Ed25519 via WebCrypto** `[F4]`: `crypto.subtle.importKey/verify`, embedded
   `attestation_pub_key_pem`, fail closed `ed25519_not_supported`. Copy the pattern from
   `stage5b/browser/var-verifier.html` — NOT "Node-authoritative".
8. **Torch stays OUT of CI** (4Z/5B): the Prompt Guard adapter imports torch/transformers; it
   must be absent from every `node --test`/pytest glob **and** `scripts/check.sh`. `detectorAdapter`
   validates ceremony shape **without importing torch** (`lanec.test.js` boundary-assert pattern).
9. **Do NOT re-measure the 4X residue to "pay" the socket** `[F2]`. 4X already measures it. 5C
   pays `irreducible_semantic_residue_deferred` by **itemizing + externalizing** only. The
   closeout socket note must say so.
10. **Fixture trips the _claimed_ code, not an easier one** (5A/5B): the corpus builder asserts
    each cell's **exact** `target_raw`; a re-bound+re-signed mutation is required so an earlier
    check does not mask the one under test.
11. **`keyDigest = sha256(raw PEM)`**, `recordDigest = "sha256:" + sha256(canonicalJson(...))`,
    two-stage sign `canonicalJson(parse(bundle))` — copy verbatim from `stage5a/core/*`.
12. **CLI main-guard**: `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`.
13. **`node --test <bare-dir>` fails** — explicit `*.test.js` globs; **`npm test` = unit only**,
    never shell `rg`/`find` in a unit test.
14. **Prettier mangles bare `_`** in Markdown; run `npm run format:check` on spec/plan/README
    before push. **Rebase-merge diverges local main** — after merge `git reset --hard origin/main`
    before tagging.

---

## File layout (new stage dir `tools/simurgh-attestation/stage5c/`)

```
stage5c/
  constants.mjs
  core/mrRuleset.mjs        # [F1] import 4X applyMR/MR_TABLE + append 5C families; composed
                            #      digest; 4X-slice byte-witness (227); equivalence_basis (230)
  core/gateReductions.mjs   # [F3] flagged(text) per gate: 4w scanLeakage(_,[],[]), 4x v1/v2, 4y
  core/gridCore.mjs         # total (MR×base) grid, cell-class partition (228,229,231,232)
  core/slipLedger.mjs       # slip_table projection; No Silent Slip (233); severity enum (234);
                            #      kernel-breach overclaim gate (237)
  core/slipRateCore.mjs     # rational slip-rate (235); floor-monotonicity slipSet⊆ (236)
  core/vsbCore.mjs          # 225 schema, 226 signature, evaluateVsb (VSB_CHECK_ORDER), 238, 239
  node/greenBundle.mjs      # green + tampered bundles over frozen 4w/4x/4y reductions
  node/build-stage5c-corpus.mjs      # (MR×base) grid + integrity gate; freeze in Task 9B
  node/build-stage5c-fixtures.mjs    # signed bundles, every code at owning tier
  node/build-stage5c-attestation.mjs
  node/verify-stage5c-attestation.mjs
  laneb/severity-child.mjs           # [F5] blind severity child
  laneb/run-laneb-vsb-ceremony.mjs
  lanec/detectorAdapter.mjs          # [F8] BYO flagged(text) interface + boundary asserts
  lanec/promptguard-adapter.py       # worked Prompt Guard example (heavy deps; Lane C only)
  lanec/run-vsb-lanec.py             # --dry-run; verdict log digest-only
  lanec/README.md
  python/vsb_parity.py
  browser/vsb-verifier.html          # [F4] WebCrypto Ed25519
  browser/inject-csp.mjs
proofs/stage5c/SemanticBypass.lean   # 7 theorems
proofs/stage5c/lean-toolchain
```

**Nothing is copied that must be edited.** The 4X engine + gates are imported; the 4Z-style
capture harness is not reused (Lane C is a detector adapter, not a model capture).

**Marker key:** `[Fn]` = a fix from the **spec** gauntlet (F1–F8); `[PFn]` / `[P0-n]` / `[P1-n]` =
a fix from the **plan** gauntlet / external review. These are distinct from the numbered gotcha
entries above — do not conflate.

---

## Self-review gate (run and check off BEFORE Task 1)

- **Spec coverage:** every spec §1–§6 element maps to ≥1 task.
- **Type consistency:** bundle / slip / cell / lane schemas use ONE field-name set —
  `mechanism`, `gate_version`, `mr_family`, `base_id`, `mr_id` (never `gate_family`); slip entries
  are `{mr_id, base_id, mechanism, gate_version, severity, severity_basis, analyst_note?}`.
- **Tier consistency:** each raw code's owning tier is asserted; **233 audit-only**, **237 public**.
- **First-failure reachability:** every negative fixture reaches its CLAIMED raw (not an earlier
  one) — re-bound + re-signed after content mutation.
- **CI boundary:** no `torch`/`transformers` in `npm test`, pytest, `scripts/check.sh`, or
  `check-e2e.sh`; Lane C heavy deps live under `lanec/` only.
- **Claim boundary:** no doc says jailbreak immunity, kernel-breach proven, model safety, or "ASR"
  for the slip count; 236 is never called an observed real-gate regression.
- **Engine reuse:** `COMPOSED_MR_TABLE` 4X slice byte-equals `MR_TABLE`; basis lives in a separate
  map; `applyMR5C(mr_id, base_text)` (never a stray `seed` param).

---

## Task 1 — Constants + exit codes 225–239 (spec §1, §2, §3)

**Test first** (`stage5c/constants.test.js`, `.../exitCodes.test.js`):

- `VSB_SCHEMAS` (P1-103 — all artifact schemas, not just the ledger):
  `{ SLIP_LEDGER: "simurgh.vsb.slip_ledger.v1", ATTESTATION: "simurgh.vsb.attestation.v1",
LANEB_SEVERITY: "simurgh.vsb.laneb_severity.v1", LANEC_VERDICT_LOG: "simurgh.vsb.lanec_verdict_log.v1" }`;
  domains frozen.
- `VSB_MECHANISMS` deep-equals `["leakage","doc_residue"]` (PF3 — the CI mechanisms; "4W"/"4X"
  are leakage v1/v2, NOT two families) with `VSB_LEAKAGE_VERSIONS = ["v1","v2"]` and
  `VSB_MECHANISM_VERSIONS = { leakage: ["v1","v2"], doc_residue: ["v1"] }` (P1-162 — `doc_residue`
  gets a frozen `gate_version = "v1"`); the Lane-C `external_detector` is a third, non-CI
  mechanism. `VSB_MR_FAMILIES_ADDED` = `["voice_flip","unicode_confusable","guardrail_evasion"]`
  (appended; 4X families inherited, Task 2).
- `VSB_EQUIVALENCE_BASES` (P1-108 — enumerate exactly, spec §1) =
  `["lexical_synonym","syntactic_voice","structural_reorder","unicode_confusable","whitespace_evasion"]`.
  `VSB_SEVERITY_ENUM = ["informational","low","moderate","high"]`; `VSB_SEVERITY_BASES` frozen
  (incl. `"blind_digest_only_review"` — the Lane-B blind child's basis, P0-6);
  `VSB_BREACH_CLAIM_DENYLIST` (frozen tokens 237 screens in **`analyst_note`** — the only free-text
  field; `severity_basis` is enum-constrained so needs no screen, P0-6).
- `VSB_CELL_CLASSES` = `["caught","slipped","not_applicable","degenerate"]`. `VSB_MAX_DEGENERATE_RATE`
  (P1-111 — explicit shape): `{ num, den }`, integers, `0 <= num <= den`, `den > 0`; the degenerate
  fraction is `degenerate / total_grid_cells` (P1-191 — denominator is ALL grid cells).
- `VSB_NON_CLAIMS` (incl. the audit-gap non-claim `[F1/gap]` and the kernel-breach non-claim),
  `VSB_KNOWN_LIMITATIONS` (incl. "engine is 4X's, reused"), `VSB_RAILS` — frozen, spec order.
- **Socket ledger** `[F2]`: `VSB_PAID_SLOTS = ["irreducible_semantic_residue_deferred"]`,
  `VSB_PAID_SLOT_SCOPES` = `{ irreducible_semantic_residue_deferred: "itemize_and_externalize" }`
  (NOT `"full"` — honest scope), `VSB_MINTED_SLOTS = ["learned_paraphrase_mutation_deferred"]`.
  `VSB_RESERVED_SLOTS` (P1-115 — enumerate exactly, assert no dupes, length 6): `["multilingual_ruleset_deferred",
"narrative_version_diff_deferred", "submitted_document_pilot_deferred", "frontier_readout_conflict_deferred",
"live_adversary_capture_lane_deferred", "learned_paraphrase_mutation_deferred"]` — **excludes** the paid
  `irreducible_semantic_residue_deferred`, **includes** the minted slot.
- exitCodes: `VSB_RAW_CODES` = 225…239; `VSB_CHECK_ORDER` = [225…238] (wrapper 239 excluded);
  `RUN_LEVEL_BY_RAW[225..239] === 1`. Code **238** is `VSB_LANE_BINDING_INVALID` (Lane-B severity
  **and** Lane-C detector); **234** is `VSB_SEVERITY_INVALID` (enum only). `[PF4]`
- **Tier split is NOT identity** `[PF2]`: `VSB_AUDIT_CODES` = all 225…238; `VSB_PUBLIC_CODES`
  a **strict subset** EXCLUDING **only 233** (silent slip — invisible without a whole-grid
  recompute). **237 IS public** — it is a lexical screen of the artifact's own
  `analyst_note`, catchable with no recompute. Assert `VSB_PUBLIC_CODES ⊊
VSB_AUDIT_CODES`, `233 ∉ VSB_PUBLIC_CODES`, **`237 ∈ VSB_PUBLIC_CODES`**.
- **Full raw-code map (P2 — freeze all 15 names, spec §3 order):** `225 VSB_SCHEMA_INVALID`,
  `226 VSB_SIGNATURE_INVALID`, `227 VSB_MR_RULESET_MISMATCH`, `228 VSB_GRID_INCOMPLETE`,
  `229 VSB_MUTATION_NOT_REPRODUCIBLE`, `230 VSB_EQUIVALENCE_BASIS_UNDECLARED`,
  `231 VSB_GATE_VERDICT_MISMATCH`, `232 VSB_PARTITION_INVALID`, `233 VSB_SILENT_SLIP`,
  `234 VSB_SEVERITY_INVALID`, `235 VSB_SLIP_RATE_RECOMPUTE_MISMATCH`, `236 VSB_FLOOR_MONOTONICITY_INVALID`,
  `237 VSB_KERNEL_BREACH_CLAIMED`, `238 VSB_LANE_BINDING_INVALID`, `239 INTERNAL_FAIL_CLOSED_VSB`.
  (Names are the spec §3 set of record — do NOT rename to a reviewer's variant; spec↔plan↔code
  must be one string.)
- **Tier data contract (P1-122 / P0-5).** _Public tier_ receives the signed bundle: `grid`,
  `slip_table`, `slip_rates`, `floor_monotonicity`, all digests, `analyst_note` — and re-derives
  everything **except** the whole-grid slip-set recompute (so it cannot catch a laundered-out slip
  → 233 is audit-only). _Audit tier_ additionally receives the full **base corpus raw texts**
  (Lane A committed; Lane C via the audit-private log, Task 13), recomputes `applyMR5C` + every
  `flagged()` verdict + the complete partition, and recompares the slip-set (233) and severities
  against `severity_binding` (238). Public trusts the table; audit proves it.

**Code:** `stage5c/constants.mjs` + extend `stage4h/exitCodes.mjs`. **Golden ripple** — regen
`exit-map.json` under Node 26; update inline `exitWrapper.test.js` map (gotcha 1).

**Commit:** `feat(5c): VSB constants + raw codes 225-239`.

---

## Task 2 — mrRuleset.mjs: import + extend 4X engine, composed digest, 4X-slice witness (227, 230) (spec §1, §2) `[F1]`

**Test first** (`mrRuleset.test.js`):

- `import { applyMR, MR_TABLE, metamorphicTableDigest }` from stage4x — `COMPOSED_MR_TABLE` =
  `[...MR_TABLE, ...VSB_RELATIONS_5C]` where the 4X objects are spread **untouched** (P0-2 — NO
  field is added to them; a basis field on an imported object would break the slice byte-match).
  5C relation objects use the **same shape** as 4X (`{ id, family, pattern }`). `MR_IDS_5C` = 4X
  ids ⧺ new ids, no duplicates.
- **`equivalence_basis` lives in a SEPARATE frozen map** (P0-2), never on the relation objects:
  `MR_EQUIVALENCE_BASIS_BY_ID = Object.freeze({ <every 4X id + every 5C id> → basis })`. This is
  how the 4X slice stays byte-identical AND every id has a basis.
- Each 5C relation is a pure **`(mr_id, base_text) → mutated_text`** function (P0-1 — standardize
  on `base_text`, matching Task 4; the imported 4X `applyMR(mrId, seed)` is called positionally,
  its `seed` param **is** our `base_text`). Any deterministic variation derives from canonical
  `(mr_id, base_id, base_text)`, **never** ambient randomness. Families: `voice_flip`
  (active↔passive recast), `unicode_confusable` (homoglyph substitution — multi-byte),
  `guardrail_evasion` (character/invisible-char injection, the Hackett family). `applyMR5C`
  dispatches 4X ids to imported `applyMR`, 5C ids to the new relations.
- **227**: `composedRulesetDigest()` = `sha256(canonicalJson(COMPOSED_MR_TABLE))`; a separate
  assert that `canonicalJson(COMPOSED_MR_TABLE.slice(0, MR_TABLE.length)) === canonicalJson(MR_TABLE)`
  **and** its digest equals `metamorphicTableDigest()` — a byte change to the composed table OR
  drift of the imported 4X slice trips 227 (read-only-engine witness, cf. 4X `corpusCore.mjs:30`).
- **230**: every `mr_id` in `COMPOSED_MR_TABLE` has a `MR_EQUIVALENCE_BASIS_BY_ID[id] ∈
VSB_EQUIVALENCE_BASES`; a missing/invalid basis → 230.
- Determinism: `applyMR5C(id, base_text)` twice ⇒ identical bytes.

**Code:** `stage5c/core/mrRuleset.mjs`. **Commit:** `feat(5c): composed MR ruleset over imported 4X engine + slice witness`.

---

## Task 3 — gateReductions.mjs: flagged(text) per mechanism (no new code — pure reductions) (spec §1, §2) `[F3]`

**Test first** (`gateReductions.test.js`):

- `flagged("leakage","v1", text) := scanLeakage(text, [], []).length > 0` — imported from
  `stage4w/core/leakageGate.mjs`. **Empirical assert:** a base with a digit returns `true`; the
  same base after `true_semantic_paraphrase` (quantity dropped) returns `false` (a real slip). A
  **covering** span map returns `false` for the digit base — the negative that proves `[]` is
  required (gotcha 4).
- `flagged("leakage","v2", text) := scanLeakageV2(text, [], []).length > 0`
  (`stage4x/core/gateV2.mjs`) — v2 composes v1 (superset), so its slip-set ⊆ v1's **by
  construction** (PF3; Task 6 caveat).
- `flagged("doc_residue", text) := extractSpans(text).length > 0`
  (`stage4y/core/spanExtractor.mjs:66` — genuinely distinct mechanism, verified).
- `GATE_REDUCTIONS` is a frozen `{ mechanism[/version] → reduction_id }` map sealed into the
  bundle; an unknown reduction id → 231 at verify.
- Multi-byte base included (the `unicode_confusable` geometry case).

**Code:** `stage5c/core/gateReductions.mjs` (pure imports, zero gate edits). **Commit:**
`feat(5c): per-gate flagged(text) reductions (empty-spanmap 4W scan)`.

---

## Task 4 — gridCore.mjs: total (MR×base) grid + cell-class partition (228, 229, 231, 232) (spec §1, §2)

**Test first** (`gridCore.test.js`):

- `buildGrid(bases, mrIds)` enumerates the **full** `(MR × base)` product, sorted `(mr_id,
base_id)`. **228**: a grid missing any pair, or with a duplicate, fails closed.
- **229**: each cell's `mutated_text_digest` = `sha256(bytes(applyMR5C(mr_id, base_text)))`;
  verify recomputes and byte-compares — a tampered digest trips 229.
- Cell-class rule (spec §2): `not_applicable` if `flagged(base)=false`; `degenerate` if
  `applyMR5C` returned bytes identical to base; else `caught`/`slipped` by `flagged(mutation)`.
- **231** (moved here from Task 3, P1-71): the verifier recomputes `flagged(mechanism, version,
text)` for each cell's base and mutation and compares to the sealed `base_verdict` /
  `mutation_verdict`; any mismatch fails closed. (gateReductions supplies the pure `flagged()`;
  gridCore owns the sealed-verdict comparison.)
- **232**: partition overlap/gap, or `degenerate / total_grid_cells` > `VSB_MAX_DEGENERATE_RATE`
  (P1-191), fails closed (a no-op ruleset is not a corpus). Test a deliberately degenerate MR set.

**Code:** `stage5c/core/gridCore.mjs`. **Commit:** `feat(5c): total (MR×base) grid + cell-class partition`.

---

## Task 5 — slipLedger.mjs: No Silent Slip + severity + anti-overclaim (233, 234, 237) (spec §1, §3)

**Test first** (`slipLedger.test.js`):

- `projectSlips(grid)` = every `slipped` cell → a slip_table entry (`mr_id, base_id, mechanism,
gate_version, severity, severity_basis, analyst_note?`).
- **233** (audit teeth, No Silent Slip): a slip_table with a slipped grid-cell **omitted** →
  fails closed at the audit tier; public tier (which trusts the table) does NOT catch it — assert
  public-GREEN / audit-RED. (233 is the ONLY audit-only code — PF2.)
- **234** `[PF4]` **enum only**: a slipped entry with a missing/invalid `severity` (∉
  `VSB_SEVERITY_ENUM`) fails closed. This is a pure presence/enum check — the child-binding match
  is **238**, NOT 234 (Task 12). No per-item signature.
- **237** `[PF1/PF2/Law 3]` **anti-overclaim — PUBLIC, and now reachable**: the schema (spec §2)
  permits an **optional `analyst_note` free-text field** — the ONLY policed surface. 237 lexically
  screens `analyst_note` against `VSB_BREACH_CLAIM_DENYLIST` and fails closed on any
  kernel/authority-breach assertion. (`severity_basis` is a frozen ENUM emitted by the blind child
  — P0-6 — so it cannot carry breach text and is not screened.) Without `analyst_note` 225's
  allowlist would reject an injected field first and 237 would be dead (gauntlet PF1). Test:
  (a) clean/absent note → raw 0; (b) a note claiming "bypassed the authority kernel" → 237 at the
  **public** tier (no grid recompute); (c) K7 builds this fixture (possible only because
  `analyst_note` is an allowed key).

**Code:** `stage5c/core/slipLedger.mjs`. **Commit:** `feat(5c): slip ledger — No Silent Slip, severity, anti-overclaim gate`.

---

## Task 6 — slipRateCore.mjs: rational slip-rate + floor-monotonicity (235, 236) (spec §2, §5)

**Test first** (`slipRateCore.test.js`):

- `slipRates(grid)` per `(mechanism, mr_family)`: `{caught, slipped, slip_rate_num,
slip_rate_den}` where `den = caught + slipped`, integers only (gotcha 5). **235**: a published
  rate ≠ recomputed pair fails closed; the `den = 0` case (all `not_applicable`) yields
  `0/0 → rate 0` explicitly (Lean edge, Task 15).
- **236** `[anti-regression; PF3 caveat]`: for a mechanism with >1 version (only **leakage**
  v1/v2), assert `slipSet(v2) ⊆ slipSet(v1)`. **Honest note:** v2 composes v1 (`gateV2.mjs`), so
  this holds **by construction** for the real gate — the positive fixture (6→1 shrink) can't fail,
  and 236's teeth bite ONLY a **synthetic** bundle asserting a non-superset v2. The test carries
  both: the real (constructive) positive and a hand-built regression negative. Do not describe
  236 as a real-gate discovery.

**Code:** `stage5c/core/slipRateCore.mjs`. **Commit:** `feat(5c): rational slip-rate + floor-monotonicity`.

---

## Task 7 — vsbCore.mjs: schema, signature, evaluateVsb frozen order, lane binding, wrapper (225, 226, 238, 239) (spec §3)

**Test first** (`vsbCore.test.js`):

- **225** schema: any malformed `simurgh.vsb.*`; strict allowlist on the **outer** bundle keys
  (a field beside `content` is not signature-covered → allowlist stops smuggling). The schema
  **permits** the optional `analyst_note` string on slip entries (so 237, not 225, owns it — PF1).
- **226** signature invalid.
- `evaluateVsb(bundle, {tier, detectorPubKeys})` runs `VSB_CHECK_ORDER` 225→238, **first-failure
  wins**; a clean bundle → raw 0. Reachability assert: a bundle whose grid is incomplete returns
  **228 after** 225/226/227, not earlier.
- **238** `[PF4]` **generalized lane binding** — fires on EITHER: (a) `severity_binding` present
  but the slip_table `{severity, severity_basis}` don't reconcile to the sealed Lane-B
  blind-severity child output (the parent rewrote them); or (b) `lane_c_binding` present but
  unbound/invalid (missing `verdict_log_digest`, or `kind ≠ "external_detector"` — P0-4: 5C
  implements **only** `external_detector`; `var_capture_1b` is dropped, no 5B-capture scope in a
  5C verifier). **Absent** bindings (CI default for Lane C) → no spurious code (optional-artifact
  skip); the Lane-B `severity_binding` is present whenever the ceremony ran.
- **239** `evaluateVsbSafe` wraps try/catch → `INTERNAL_FAIL_CLOSED_VSB`. Reaching it needs a
  throw PAST the signature gate — poison a ctx callback (gotcha), not a malformed bundle.

**Code:** `stage5c/core/vsbCore.mjs` (mirror `stage5a/core/vncCore.mjs`). **Commit:**
`feat(5c): vsbCore — schema/signature/evaluateVsb frozen order + lane binding + wrapper`.

---

## Task 8 — greenBundle.mjs: drive the frozen 4W/4X/4Y reductions (spec §4)

**Test first** (`greenBundle.test.js`): builds a green `simurgh.vsb.slip_ledger.v1` over a small
base set, driving the **imported** gate reductions read-only; `evaluateVsb` → raw 0 both tiers;
`slip_rates`/`floor_monotonicity` recompute; the composed ruleset digest + 4X-slice witness hold.
**"Green" = a valid, complete, honestly-partitioned artifact — NOT "zero slips"** (P1-audit-8): a
green bundle whose grid contains real `slipped` cells (correctly ledgered) still verifies raw 0.
Green is about integrity, not about the slip count being zero.

**Code:** `stage5c/node/greenBundle.mjs`. **Commit:** `feat(5c): green slip-ledger bundle builder`.

---

## Task 9 — build-stage5c-corpus.mjs: (MR×base) grid + integrity gate (spec §2, §4)

**Test first** (`corpus.test.js`): the committed base corpus draws flagged fixtures from 4W/4X/4Y

- the named families (`distribution_shift_slip` **analog** `[F6]`, `synonym_veil`, `voice_flip`,
  `confusable_homoglyph`, `guardrail_evasion_slip`). Integrity gate: every cell's recomputed
  `cell_class` and (for slips) `target_raw` match; the grid is total (228); degenerate-rate ≤ cap.

### Task 9B — freeze counts/rates/digest from the validated corpus (5B lesson)

Freeze `VSB_FAMILY_COUNTS`, the per-`(gate,family)` slip-rate table, and `COMPOSED_RULESET_DIGEST`
in constants **only after** the integrity gate passes — never hand-authored. Re-run the corpus
build + assert parity.

**Commit:** `feat(5c): (MR×base) corpus + integrity gate` / `chore(5c): freeze counts+rates from validated corpus`.

---

## Task 10 — build-stage5c-fixtures.mjs: signed bundles, every code at owning tier (spec §4)

**Test first** (`fixtures.test.js`): a green bundle (raw 0) + a tamper matrix hitting **every**
code **at its owning tier** (public: 225–232, 234–238; audit: 225–238; **233 is audit-only**,
asserted as public-GREEN/audit-RED; 239 is wrapper-only via `evaluateVsbSafe`, not in
`VSB_CHECK_ORDER`), re-bound + re-signed so the target check fires first (gotcha 10). Named
negatives: laundered-out slip → **233** (public-GREEN/audit-RED), breach `analyst_note` → **237**
(public), rewritten severity → **238**, degenerate-inflated ruleset → **232**, synthetic
newer-version regression → **236**, multi-byte `unicode_confusable` base for byte-geometry.
Signature-tamper fixtures deliberately NOT re-signed.

**Commit:** `feat(5c): signed fixtures — full tamper matrix at owning tier`.

---

## Task 11 — CLIs + byte-stability (spec §4)

**Test first**: `build-stage5c-attestation.mjs` (named CLI, main-guard gotcha 12) and
`verify-stage5c-attestation.mjs`. **Byte-stability procedure (P1-306, explicit):** build once →
snapshot the sha256 of every emitted evidence file → build again → assert each hash is unchanged →
`git diff --exit-code` on the evidence dir. Evidence dir added to `.prettierignore` (format the
generator BEFORE the final build). Test keys only as
`tests/fixtures/llmShield/stage5c/test-keys/INSECURE_FIXTURE_ONLY_<name>.pem` (no digits) +
allowlist line in **both** `security-audit-llm-shield-stage3m.sh` and `...stage3o.sh`.

**Commit:** `feat(5c): attestation + verify CLIs; byte-stable evidence`.

---

## Task 12 — Lane B blind-severity ceremony (spec §4) `[F5]`

**Test first** (`laneb.test.js`, two-OS-process): `severity-child.mjs` receives **only**
`{mr_id, base_id, mutated_text_digest}` for slipped cells over stdin — asserts it **cannot** see
`mechanism`/`gate_version`/slip-rate (a `child_input_profile` seals this). **Child output schema
(P0-6, explicit):** per slip `{ mr_id, base_id, mutated_text_digest, severity ∈ VSB_SEVERITY_ENUM,
severity_basis: "blind_digest_only_review" }` — the child emits **both** `severity` and
`severity_basis` (the blind basis is a fixed enum value, so nothing is half-child/half-parent).
Env scrubbed to PATH; child refuses `OPERATOR*` env and `.pem` argv, and (P2 — direct child
negatives) a test drives the child with a poisoned env/argv and asserts refusal. The parent seals
`binding.severity_binding = sha256(canonicalJson(child_output))` and copies the child's
`{severity, severity_basis}` into the signed slip table verbatim. **A rewritten severity or basis
trips 238** (`[PF4]` — the slip-table entries no longer reconcile to `severity_binding`), NOT 234
(enum-validity only). Test the rewrite negative → 238.

**Commit:** `feat(5c): Lane B blind-severity ceremony + blindness negatives`.

---

## Task 13 — Lane C real-detector adapter (NEVER CI-gated) (spec §4) `[F8]`

**Test first** (`lanec.test.js`): `detectorAdapter.mjs` defines the BYO `flagged(text)` interface
and validates a `lane_c_binding` **shape** (`external_detector` kind: `detector_id`,
`detector_version`, `threshold`, `verdict_log_digest`) **without importing torch** — boundary
assert that torch/transformers appear in **no** CI glob. `promptguard-adapter.py` (worked Prompt
Guard 86M example, pinned threshold) and `run-vsb-lanec.py --dry-run` live under `lanec/` and are
excluded from pytest/`check.sh`; **absent** Lane-C binding in CI → no code (238 optional-skip).

- **Base corpus is DIFFERENT** `[PF5]`: Prompt Guard is an _input-prompt_ classifier, so Lane C's
  grid runs over a **flagged-prompt** base corpus (prompts PG flags), NOT the 4W/4X/4Y bases — the
  same `(MR × base)` engine over different bases (spec §4 honest wrinkle).
- **Two artifacts (P0-5, final — hashes can't be reversed):** Lane C emits BOTH:
  1. **Public artifact** — `lane_c_binding`, `verdict_log_digest`, `base_corpus_digest`,
     `audit_private_log_digest`, and digest-only rows `{base_id, mr_id, base_text_digest,
mutated_text_digest, detector_verdict}`. **No raw prompts.**
  2. **Audit-private artifact** (excluded from CI and public evidence) — raw flagged-prompt base
     texts + raw mutated texts (or enough raw base text to recompute each mutation via
     `applyMR5C`), plus verdict labels/digests.
     **Public** verifies digest binding + shape only. **Audit** (given the private artifact)
     recomputes `applyMR5C`, verifies each `mutated_text_digest`, recomputes the partition from the
     sealed `detector_verdict` labels, and **does NOT re-invoke Prompt Guard**. Without the private
     artifact the audit tier verifies log integrity + verdict binding + partition-from-labels only —
     it never claims an `applyMR5C` recompute it cannot do. This matches the Task 1 tier data contract.

**Commit:** `feat(5c): Lane C detector adapter + Prompt Guard example (digest-only, non-CI)`.

---

## Task 14 — Python parity (stdlib only) (spec §5)

**Test first** (`vsb_parity.py` via the parity e2e): reproduces the deterministic public surface —
`applyMR5C` (composed table byte-match + 4X-slice witness), cell-class partition, rational
slip-rate, floor-monotonicity set-inclusion. Header comment "MUST byte-match constants.mjs". No
Ed25519 in Python (Node/browser authoritative).

**Commit:** `feat(5c): Python parity (stdlib-only public surface)`.

---

## Task 15 — Browser verifier: WebCrypto Ed25519 (spec §5) `[F4]`

**Test first** (`browser` e2e via `node:vm`): single-file `vsb-verifier.html`, CSP
`default-src 'none'`, inlines everything. **Verifies the Ed25519 signature in-page via
`crypto.subtle`** reading the embedded `attestation_pub_key_pem`, failing closed
`ed25519_not_supported`; recomputes partition + slip-rate + floor-monotonicity. `inject-csp.mjs`
stamps the CSP after prettier (gotcha). Copy the WebCrypto pattern from `stage5b/browser/`.
**One real-browser smoke (P2):** `node:vm` proves the JS logic but NOT real WebCrypto Ed25519 —
run the verifier once in Chromium via the existing Stage-5B browser harness (or Playwright) and
assert a green verify + a tampered-signature red, so the WebCrypto path is exercised for real.

**Commit:** `feat(5c): static browser verifier (WebCrypto Ed25519, hash-CSP)`.

---

## Task 16 — Lean: 7 theorems (spec §5)

**Test first** (CI wiring in `.github/workflows/stage-4-lean-proofs.yml`; `lake build` green +
**an explicit no-`sorry` grep guard**, P1-379: the CI step greps the proof dir for `sorry`,
`admit`, and `sorry`-adjacent escapes (`Classical.choice` used to discharge a goal) and fails the
job on any hit — `lake build` succeeding does NOT by itself guarantee zero `sorry`):

1. `gridClosure` — `grid.length = |MR|·|base|`, every `(mr,base)` once (contrapositive → 228).
2. `partitionTotal` — every cell in exactly one class.
3. `slipTableComplete` — slipped-set = signed slip table (→ 233).
4. `slipRateSound` — `rate = slipped/(caught+slipped)`, with the guarded `den=0 ⇒ rate=0` branch
   (Lean edge, 5B lesson).
5. `floorMonotone` — `slipSet(vNew) ⊆ slipSet(vOld)` ⇒ no regression (→ 236; 3Q lineage).
6. `kernelDisjoint` — the mutation/detector-input domain is disjoint from kernel decision inputs;
   a slip cannot change an `authorise()` verdict (symbolic model of Law 3 → 237).
7. `mutationDeterminism` — `applyMR5C` is a function (→ 229; reuses 4X's
   `metamorphicResidueReproducible` shape).

Lean 4.15 idioms: structural recursive totals; hand the IH to `omega` via `have ih := thm xs`;
`simp only [decide_eq_true_eq]`.

**Commit:** `proof(5c): seven Lean theorems (zero sorry)`.

---

## Task 17 — K7 all-functions net + reproduce + read-only assertion (spec §5)

**Test first** (`tests/e2e/llmShield/stage5c/k7AllFunctions.test.js`):

- Every `stage5c` export exercised at least once.
- **Tamper matrix:** flip each bound field (composed ruleset digest, 4X-slice witness, a grid
  cell, a slip omission, a rewritten severity, a slip-rate, a monotonicity claim, a
  breach-asserting `analyst_note`, the severity/lane binding) → assert the **correct first-failure**
  raw (frozen order; e.g. omission→233 audit, rewritten-severity→238, breach-note→237 public).
- **Cross-stage invariant:** prior green artifacts (4W/4X/4Y/4Z/5A/5B) still verify raw 0.
- **Read-only predecessor assertion** `[F1/P1-410]`: `git diff` every imported `stage4w/4x/4y`
  file against **`$(git merge-base HEAD origin/main)`** (a fixed baseline, not moving `origin/main`)
  → **byte-identical**. Sole exception: `stage4h/exitCodes.mjs` — assert the diff is a **pure
  append** by comparing the pre-existing 0–224 block byte-for-byte against the baseline and
  requiring only 225–239 lines added below it.

**Code:** `scripts/reproduce-llm-shield-stage5c.sh` (public+audit verify, byte-stability, Lane B,
Python, browser+K7) + wire into `scripts/check-e2e.sh` REPRODUCE array. **Re-run the prior
reproduce scripts explicitly** (P1-410) — at minimum `reproduce-llm-shield-stage4h/4w/4x/4y/4z/5a/5b.sh`
under Node 26 — additive codes must not disturb sealed history.

**Commit:** `test(5c): K7 all-functions net + reproduce + check-e2e wiring`.

---

## Task 18 — Closeout (spec §6; feedback: four-axis + full-E2E)

- Full `bash scripts/check.sh` green locally (Node 26; ~7–10 min); docs-accuracy pass re-verifies
  every documented claim against shipped code (paths, exports, digests, codes).
- `STAGE_5C_CLOSEOUT.md` with the **honest re-score** (spec-time Novelty 8.7 / Frontier 9.5 /
  Good-for-Anthropic 9.7 / Constitution 9.6 — re-score against what shipped; may go DOWN) and the
  **observed slip count and slip-rate** (P1-426 — the recomputed number, per mechanism, whatever
  it is; may be zero or non-zero; **not** "ASR", which is attack success not detector slip).
- **Docs claim gate** (P1-230): the closeout MUST NOT describe 236/floor-monotonicity as an
  observed real-gate regression — for leakage v1→v2 the inclusion holds by construction (PF3); say
  so. And the anti-overclaim non-claims (no jailbreak immunity, no kernel breach, no model safety)
  are re-verified against the shipped text.
- **Socket note** `[F2]`: PAYS `irreducible_semantic_residue_deferred` at
  `itemize_and_externalize` scope (NOT "measure" — 4X already did); MINTS
  `learned_paraphrase_mutation_deferred`; RETIRES the 4W lexical bound + 5B-lim-2 **only if the
  shipped evidence actually exercises them** (do not write "retires" on faith — P1-audit-18).
- README banner + north-star update; memory (MEMORY.md pointer + `project_stage-5c-vsb.md` with
  new gotchas); Zurvan ingest (**search duplicates first**) + a decision ADR.
- Append any new build traps to the gotcha ledger (notably: empty-spanmap-not-covering `[F3]`,
  4X-engine-import-witness + separate-basis-map `[F1/P0-2]`, blind-severity-not-mutation `[F5]`,
  Lane-C two-artifact split `[P0-5]`).

**Tag** `v2.38.0-stage-5c-vsb` (re-check `git tag --sort=-creatordate` first); reproduce **on main**.

**Commit:** `docs(5c): closeout + re-score + README banner + memory`.
