# Stage 4Y — VDR: Verifiable Document Residue (TDD plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.**
> Spec: `docs/superpowers/specs/2026-07-08-stage-4y-vdr-document-residue-design.md`
> Branch: `stage-4y-vdr` · Prev: v2.33.0-stage-4x-vlr (main 63a1ea45) ·
> Target tag: `v2.34.0-stage-4y-vdr`

Execution law: failing test → minimal code → green → `npm run format` →
commit (neutral message, no trailers). `npm test` = unit only; e2e via
`scripts/check-e2e.sh`. Node 26 for byte-stable evidence.

## Read before Task 1 (paid-for gotchas that apply here)

- **Additive codes 181–189 ripple SIX goldens** (Task 1): both `exit-map.json`
  (regenerate via `build-stage4h-digest-fixtures.mjs`), `exitWrapper.test.js`
  inline map, 4K/4H exitWrapper snapshots, `exitCodeProbeHygiene.test.js`
  danger zone, the 4L e2e net. Run 4H/4K/4L/4W/4X e2e nets + prior reproduce
  scripts green before commit. `UNKNOWN_RAW_PROBE` (999), never a hardcoded
  future literal. No `[9x,3]` array probes without the hygiene guard.
- **Prettier corrupts bare `_`** in Markdown prose and downstream backticked
  content — backtick every `snake_case` identifier; keep regexes in one code
  span. Validate with `npm run format` + `npm run format:check`, NEVER a
  hand-picked `npx prettier` subset (the 4V browser-HTML miss).
- **`keyDigest(pem)` = `"sha256:" + sha256(raw PEM string)`**, NOT DER; the
  trailing newline is part of the bytes.
- **Compare ledger/map aggregates with `canonicalJson`, never
  `JSON.stringify`** — disk round-trip alphabetises keys (the 4X 178 gotcha
  the unit test missed and the evidence verify caught).
- **CLI-main guard**:
  `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`.
- **Deterministic signers**: committed fixture keys, never
  `generateKeyPairSync` in a builder. Allowlist keys by PATH REGEX in
  `security-audit-llm-shield-stage3{m,o}.sh` (BOTH), `_vdr` no digits.
- **Evidence dir prettier-ignored** before byte-stable `cmp`. Format the
  generator BEFORE regenerating evidence.
- **Lane B child** may import PURE modules (canonicalJson) — blindness is
  stdin data isolation, not code isolation.
- **Lean 4.15 no mathlib**: structural `def f : List α → Nat | [] => …`, not
  foldr; `getElem?` notation; `simp only [pred] at ih ⊢` before
  `List.filter_cons`.
- **`npm test` unit only; never shell `rg` in a unit test** (Linux CI ENOENT);
  `node --test` needs explicit `*.test.js` globs.
- **Tamper fixtures must make their TARGET check fire FIRST** — recompute
  binding + re-sign after mutation, else an earlier check masks it.
- **Never commit spec/plan to local main before branching**; after
  rebase-merge `git fetch && git reset --hard origin/main` before tagging.

## Repo truths verified during the gauntlet (do not re-derive)

- `stage4w/core/leakageGate.mjs`: `scanLeakage(body, spanMap, capsuleValues)`
  reports at **region** granularity — one hit per uncovered region, first rule
  wins, `break`. With an empty spanMap the whole body is ONE region → at most
  one hit total. **VDR needs its own match-granular extractor** over the frozen
  lexicons; the real gate is the **agreement oracle**, not the span source.
- `stage4w/core/textCore.mjs`: `normaliseBody` = NFC + CRLF→LF +
  trailing-whitespace strip; `checkNormalisation` fails closed on
  `body !== normaliseBody(body)` (raw 164); `isCodePointBoundary(bytes, off)`
  is bounds-safe. **VDR uses only NFC-equality at 183** (documents are
  submitted, not authored — spec Law 2), and an intrinsic byte-mask boundary
  check, importing nothing before 184.
- `exitCodes.mjs:558` reserves "181–189 headroom" — codes are free.
- 4X exports to import read-only: `V2_LEXICON`, `scanLeakageV2`, `v2Digest`,
  `checkLeakageV2` (`stage4x/core/gateV2.mjs`); `MR_TABLE`, `MR_IDS`,
  `applyMR`, `metamorphicTableDigest` (`stage4x/core/metamorphicTable.mjs`);
  `v1RulesetDigest`, `computeSourceWitness` (`stage4x/core/corpusCore.mjs`).
  4W: `LEAKAGE_NUMBER_WORDS`, `LEAKAGE_QUANTIFIERS`, `LEAKAGE_MONTHS`
  (`stage4w/constants.mjs`), `scanLeakage` (oracle).

## File structure (locked)

```text
tools/simurgh-attestation/stage4y/
  constants.mjs
  core/
    documentBytes.mjs     # 183 intrinsic: UTF-8, NFC-eq, manifest, marker scan
    spanExtractor.mjs     # match-granular v1/v2 extractor over frozen lexicons
    partition.mjs         # precedence, coalesce, total-partition build (185)
    shadow.mjs            # 6-transform replay, applicable/slip counting (187)
    frozenBinding.mjs     # 184 digest block + 4W/4X source-witness
    reconciliation.mjs    # 186 public/private segment + redaction compare
    mapCore.mjs           # buildMap, recomputeMap, checkMapArithmetic (185/188)
    vdrCore.mjs           # frozen order, evaluateVdr(tier), evaluateVdrSafe(189)
    oscalProjection.mjs   # vdr_oscal_projection (zero new codes)
    mapDelta.mjs          # map delta over a version pair (zero new codes)
  node/
    build-stage4y-fixtures.mjs
    build-stage4y-attestation.mjs
    verify-stage4y-attestation.mjs   # --tier public|audit
  laneb/
    recompute-child.mjs
    run-laneb-recompute-ceremony.mjs
  python/
    vdr_parity.py
  browser/
    vdr-verifier.html
proofs/stage4y/DocumentResidue.lean
tests/unit/llmShield/stage4y/*.test.js
tests/e2e/llmShield/stage4y/{k7AllFunctions,laneb,browserParity}.test.js
tests/fixtures/llmShield/stage4y/test-keys/INSECURE_FIXTURE_ONLY_vdr(.pub).pem
scripts/reproduce-llm-shield-stage4y.sh
docs/research/llm-shield/evidence/stage-4y/   (prettier-ignored)
```

---

### Task 1: Raw codes 181–189 + probe hygiene + golden ripple

**Test first** (`exitCodes.test.js`):

- `VDR_RAW_CODES` maps nine names to 181–189;
  `VDR_RAW_CODES.INTERNAL_FAIL_CLOSED_VDR === 189` (`_VDR`-suffixed — VSN owns
  bare `INTERNAL_FAIL_CLOSED: 172`; no bare alias).
- `VDR_CHECK_ORDER` deep-equals `[181,182,183,184,185,186,187,188]` (189
  excluded, asserted last-and-separate).
- Every 181–189 has `RUN_LEVEL_BY_RAW === 1`; `getRunLevel(999) === 3`.
- `VDR_PUBLIC_CODES` deep-equals `[181,182,184,185]`; `VDR_AUDIT_CODES`
  deep-equals `[181,182,183,184,185,186,187,188]` (tier doctrine, machine-fact
  not prose).

**Code** — extend `exitCodes.mjs` additively
(`// Stage 4Y VDR codes (spec §2). Wrapper LAST at 189.`):

```js
export const VDR_RAW_CODES = Object.freeze({
  VDR_SCHEMA_INVALID: 181,
  VDR_SIGNATURE_INVALID: 182,
  VDR_DOCUMENT_BYTES_INVALID: 183,
  VDR_FROZEN_BINDING_MISMATCH: 184,
  VDR_PARTITION_INVALID: 185,
  VDR_RECONCILIATION_MISMATCH: 186,
  VDR_SHADOW_REPLAY_MISMATCH: 187,
  VDR_MAP_RECOMPUTE_MISMATCH: 188,
  INTERNAL_FAIL_CLOSED_VDR: 189,
});
export const VDR_CHECK_ORDER = Object.freeze([181, 182, 183, 184, 185, 186, 187, 188]);
export const VDR_PUBLIC_CODES = Object.freeze([181, 182, 184, 185]);
export const VDR_AUDIT_CODES = Object.freeze([181, 182, 183, 184, 185, 186, 187, 188]);
export const VDR_REASONS_183 = Object.freeze([
  "invalid_utf8",
  "empty_body",
  "not_nfc_normalised",
  "manifest_offset_malformed",
  "manifest_overlap",
  "manifest_mid_code_point",
  "undeclared_redaction_marker",
]);
export const VDR_REASONS_185 = Object.freeze([
  "regions_unsorted",
  "regions_overlap",
  "regions_gap",
  "length_not_conserved",
  "unknown_region_class",
  "aggregates_mismatch",
  "shadow_arithmetic_broken",
]);
```

Add `181:1 … 189:1` to `RUN_LEVEL_BY_RAW`.

**Golden ripple (same commit):**
`node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`;
update `exitWrapper.test.js` inline map + 4K/4H snapshots; extend
`exitCodeProbeHygiene.test.js` danger zone to 189. Run 4H/4K/4L/4W/4X e2e nets
green before commit.

**DoD:** unit green; both `exit-map.json` regenerated; prior e2e nets green.

---

### Task 2: Constants

**Test first** (`constants.test.js`): schema id strings frozen
(`simurgh.vdr.document.v1`, `simurgh.vdr.map.v1`, `simurgh.vdr.audit.v1`,
`simurgh.vdr.attestation.v1`); `VDR_REGION_CLASSES` deep-equals
`["caught_v1","caught_v2_only","redacted","unflagged"]`;
`VDR_CLASS_PRECEDENCE` orders `redacted > caught_v1 > caught_v2_only >
unflagged`; `VDR_REDACTION_MARKERS` contains the U+2588 run pattern id and
`[REDACTED]`; `VDR_NON_CLAIMS` length **11** (`[10]` ===
`not_a_claim_that_conservative_marker_detection_covers_prose_mentions`);
`VDR_KNOWN_LIMITATIONS` length **8**, `[6]` ===
`span_extractor_is_stage4y_code_gate_agreement_machine_checked_not_assumed`,
`[7]` === `literal_marker_detection_is_conservative_prose_must_escape_or_declare`;
`VDR_RAILS` length 5; `VDR_PAID_SLOT === "residue_over_submitted_narrative_deferred"`;
`VDR_MINTED_SLOTS` === `["submitted_document_pilot_deferred"]`;
`VDR_RESERVED_SLOTS` contains the five carried-forward slots (no
`residue_over_submitted_narrative_deferred` — it is PAID, asserted absent).

**Code** (`stage4y/constants.mjs`): export the above, all `Object.freeze`,
SPDX header. No `authorise_*` import.

**DoD:** unit green; PAID slot absent from reserved; SPDX present.

---

### Task 3: `documentBytes` — 183 intrinsic checks (no 4W/4X imports)

**Test first** (`documentBytes.test.js`):

- `checkDocumentBytes(bytes, manifest)` returns `null` for valid NFC UTF-8;
  `183 invalid_utf8` for a lone `0x80`; `183 empty_body` for length 0;
  `183 not_nfc_normalised` for a decomposed é (`e` + combining acute) —
  asserting VDR does **not** silently normalise.
- CRLF body: returns `null` (VDR maps submitted bytes as-is — the deliberate
  divergence from 4W; a positive test that pins the design decision).
- Manifest checks: overlapping declared regions → `183 manifest_overlap`;
  a region boundary mid-code-point → `183 manifest_mid_code_point` (intrinsic
  `(byte & 0xC0) !== 0x80` mask, NOT the 4W helper — import-order rule);
  non-integer/negative offset → `183 manifest_offset_malformed`.
- Marker scan: a U+2588 run OUTSIDE any declared region →
  `183 undeclared_redaction_marker`; the SAME run INSIDE a declared region →
  `null` (declared redaction is legitimate).
- **Conservative-detection non-claim (reviewer P1-6):** marker detection is
  intentionally conservative and literal — a document that discusses the marker
  strings AS PROSE (e.g. the token `[REDACTED]` in a sentence about redaction)
  must either escape them or declare the region. Signed as
  `VDR_KNOWN_LIMITATIONS[7]`
  (`literal_marker_detection_is_conservative_prose_must_escape_or_declare`) and
  as a non-claim; a unit test asserts a prose-mention fixture fails 183 to make
  the conservatism explicit rather than surprising.

**Code** (`core/documentBytes.mjs`): validate UTF-8 by round-trip
(`TextDecoder("utf-8", {fatal:true})`), NFC equality via `s === s.normalize("NFC")`
on the decoded string, manifest arithmetic, marker scan over raw bytes with a
declared-region mask. Zero imports from 4W/4X.

**DoD:** unit green; the seven `VDR_REASONS_183` reachable; no cross-stage import.

---

### Task 4: `spanExtractor` — match-granular v1/v2 over frozen lexicons + gate-agreement

**Test first** (`spanExtractor.test.js`):

- `extractSpans(body)` returns `[{start_byte, end_byte, class}]` sorted, with
  `class ∈ {caught_v1, caught_v2_only}`, offsets on code-point boundaries.
- A body with `"42%"` and `"roughly"` yields a `caught_v1` span at the `42%`
  and a `caught_v2_only` span at `roughly` (v2 lexicon imported from 4X).
- **Gate-agreement oracle** (the P0 gauntlet fix; corpus broadened per
  reviewer P1-6): the agreement corpus is GENERATED, not a handful — one
  claim-bearing body per v1 family (`digit`; `percent`; `number_word` sampled
  across the full `LEAKAGE_NUMBER_WORDS` list; `month` across `LEAKAGE_MONTHS`;
  `quantifier` across `LEAKAGE_QUANTIFIERS`), one per `V2_LEXICON` word, plus
  negative controls (claim-free prose, punctuation-only, whitespace-only). For
  EVERY generated body, `extractSpans(body).some(s => s.class ===
"caught_v1")` **===** `scanLeakage(body, [], []).length > 0`. A disagreement
  is a failing test — the invariant the whole partition rests on.
- Overlap raw material: `"roughly 40"` yields overlapping v1(`40`) and
  v2(`roughly`) candidate spans — extractor returns BOTH; precedence is
  Task 5's job, asserted here only that both are present.

**Code** (`core/spanExtractor.mjs`): import `LEAKAGE_NUMBER_WORDS`,
`LEAKAGE_QUANTIFIERS`, `LEAKAGE_MONTHS` (4W) — extractor MUST also carry the
digit rule `/[0-9]/` and percent `/%|\bpercent\b/` so its "any v1 match" agrees
with the gate's rule set — plus `V2_LEXICON` (4X). Build match-granular regexes;
the trickiest sub-task (flag, not a defect) is mapping JS string match indices
(UTF-16 code units) to **original UTF-8 byte offsets** — build a code-unit→byte
prefix table once from the decoded string, index into it. Import `scanLeakage`
for the oracle test only (not the hot path). Export `extractSpans`,
`gateAgrees(body)`.

**DoD:** unit green; agreement holds over the generated corpus across every v1
family, every `V2_LEXICON` item, and the negative controls; both overlap
candidates surfaced.

---

### Task 5: `partition` — precedence, coalesce, total partition (185)

**Test first** (`partition.test.js`):

- `buildPartition(byteLength, spans, manifest)` → sorted, contiguous, gap-free
  regions covering `[0, byteLength)`; Σ lengths === byteLength.
- Precedence: `"roughly 40"` overlap → the `40` bytes are `caught_v1`, the
  `roughly` bytes `caught_v2_only`, no byte double-counted; a v2 span fully
  inside a redacted manifest region → those bytes are `redacted` (redacted
  wins).
- Coalesce: two adjacent `unflagged` byte-runs merge into one region.
- Edge (from `minimal_edge`): redaction at offset 0; redaction at EOF;
  multi-byte code point straddling a would-be region edge stays whole.
- `checkPartition(map)` → `185` for each `VDR_REASONS_185`: unsorted, overlap,
  gap, length-not-conserved, unknown class, aggregates≠recount,
  shadow-arithmetic-broken (N/A/K/K′ don't reconcile).

**Code** (`core/partition.mjs`): byte-wise class assignment by precedence rank,
then maximal-run coalesce; `checkPartition` recomputes every aggregate and
compares with `canonicalJson` (never `JSON.stringify`). Export `buildPartition`,
`checkPartition`, `PRECEDENCE_RANK`.

**DoD:** unit green; all seven 185 reasons reachable; conservation holds on
edge fixture.

---

### Task 6: `shadow` — 6-transform replay, applicable/slip counting (187)

**Shadow unit = caught REGION text, not the bare token span (gauntlet P1-3).**
`applyMR`'s transforms are sentence-designed (e.g. `exact_to_hedged` needs
`"all 1,234"`, not a bare `"1,234"`), and the 4W gate is region-granular, so
shadow replays over the enclosing caught region's text. The match-granular
extractor (Task 4) is ONLY for partition COLORING; the shadow's `n` counts
caught REGIONS. Spec §1 reconciled to name the region as the shadow span.

**There is NO single-text `checkV1`/`checkV2` predicate (gauntlet P0-1):** both
`scanLeakage(body, spanMap, capsuleValues)` and `scanLeakageV2(...)` are
region-granular. Call them with the variant as the WHOLE body, empty spanMap,
empty capsuleValues — the same oracle idiom as Task 4:
`slips_v1 = scanLeakage(variant, [], []).length === 0`,
`slips_v2 = scanLeakageV2(variant, [], []).length === 0`.

**Test first** (`shadow.test.js`):

- `computeShadow(region_text)` runs all 6 `MR_TABLE` transforms; a transform
  leaving the region byte-identical → `{applicable:false}`; applicable variants
  carry `{applicable:true, mr_id, variant_text, slips_v1, slips_v2}` with the
  slip idiom above.
- Aggregation: `n_caught_regions`, `a_applicable_variants` (sum of applicable
  across regions), `k_slip_v1`, `k_slip_v2` — slips counted over APPLICABLE
  only (no-op transforms cannot pad the denominator; a test with an all-no-op
  region asserts it contributes 0 to A).
- `checkShadowReplay(auditRecords)` → `187` when a recomputed `variant_digest`,
  `applicable` flag, or slip outcome ≠ sealed record, or N/A/K/K′ don't
  recount.
- Antitone spot-check: for every span, `slips_v2 ⟹ slips_v1` (v2 ⊇ v1 catch)
  — the data-level shadow of the Lean `shadowSlipAntitone`.

**Code** (`core/shadow.mjs`): import `MR_TABLE`, `MR_IDS`, `applyMR`,
`metamorphicTableDigest` (4X), `scanLeakageV2`/v1 gates.
`variant_digest = "sha256:" + sha256(utf8(variant_text))` — the repo-wide
digest convention (verified: `gateV2.mjs:68`, `corpusCore.mjs:25`,
`metamorphicTable.mjs:80`, `recordDigest`); NO bare hex anywhere (reviewer
P1-4). Export `computeShadow`, `aggregateShadow`, `checkShadowReplay`.

**DoD:** unit green; applicable-only denominator enforced; antitone holds.

---

### Task 7: `frozenBinding` (184) + `reconciliation` (186)

**Test first** (`frozenBinding.test.js`, `reconciliation.test.js`):

- `checkFrozenBinding(map)` → `null` when `map.frozen` deep-equals live
  `{v1RulesetDigest(), v2Digest(), metamorphicTableDigest(),
sourceWitness()}`; `184` when any digit is wrong; `184 four_wx_source_drift`
  when a witnessed 4W/4X source file's byte-digest changed. **Do NOT reuse 4X's
  `computeSourceWitness` (gauntlet P0-2): it is hardcoded to
  `FOUR_W_SOURCE_FILES` — only `stage4w/core/leakageGate.mjs` +
  `stage4w/constants.mjs` — so it covers NEITHER `stage4x/core/gateV2.mjs` NOR
  `metamorphicTable.mjs`, and 184 could never trip on 4X drift.** Write a fresh
  stage-4y `sourceWitness()` (readFileSync + sha256, DI seam via `rootDir`)
  over an explicit `FOUR_WX_SOURCE_FILES` list: the two 4W files ABOVE plus
  `stage4x/core/gateV2.mjs` and `stage4x/core/metamorphicTable.mjs`.
- `checkReconciliation(map, audit)` → `null` when a `counterpart_segment_map`
  exists and both sides agree on redaction regions + unredacted segment class
  sequence (public) + segment content digests (audit); `186` for each
  disagreement.
- **Absence is not failure:** a map with `reconciliation: null` (no counterpart)
  returns `null`, never 186 — the vacuous-fail hole the gauntlet found.

**Code** (`core/frozenBinding.mjs`, `core/reconciliation.mjs`): import
`v1RulesetDigest` (4X corpusCore), `v2Digest` (4X gateV2),
`metamorphicTableDigest` (4X metamorphicTable) — content digests, unmodified;
plus a fresh `sourceWitness()` over `FOUR_WX_SOURCE_FILES` (four files). Export
`checkFrozenBinding`, `sourceWitness`, `FOUR_WX_SOURCE_FILES`,
`checkReconciliation`.

**DoD:** unit green; source drift trips 184; unpaired map passes 186.

---

### Task 8: `mapCore` + `vdrCore` — build, recompute, frozen order, tier gate, wrapper

**Test first** (`mapCore.test.js`, `vdrCore.test.js`):

- `buildMap(bytes, manifest, {salt})` → a `simurgh.vdr.map.v1` (public) +
  `simurgh.vdr.audit.v1` (sealed) pair; `document_commitment ===
"sha256:" + sha256(salt ‖ bytes)`. **Content-free scan with a digest allowlist
  (reviewer P0-1):** the public map may contain 64-hex ONLY at the approved
  digest fields — `document_commitment`, `frozen.{v1_ruleset_digest, v2_digest,
metamorphic_table_digest, source_witness_digest}`, and the map/audit
  commitments; the test strips those fields, then asserts the remainder
  contains NO 64-hex and NO fixture-text substring. (Scanning for "any 64-hex"
  would fail by design — the commitment and frozen digests are legitimately
  hex.)
- `recomputeMap(bytes, manifest, {salt})` byte-equals the committed map via
  `canonicalJson` (188 path); a 1-byte document mutation → `188`; a salt that
  doesn't reopen the commitment → `188`; a poisoned extractor disagreeing with
  the gate oracle → `188 gate_agreement_violated`.
- `evaluateVdr(bundle, {tier, publicKeyPem})`: frozen order
  181→182→183→184→185→186→187→188; **public tier SKIPS 183/186/187/188**
  (assert a bundle that is public-clean but audit-dirty returns `{raw:0}` at
  public and the audit code at audit — the swapped-pack test, 4X P0-1 style).
- `evaluateVdrSafe` returns `189` on a thrown poisoned callback past the
  signature gate (the fail-closed reach recipe).

**Code** (`core/mapCore.mjs`, `core/vdrCore.mjs`): `checkSignature` (182,
`keyDigest` over public PEM, verify over `canonicalJson(body)`); ordered
`evaluateVdr` with tier gating; `evaluateVdrSafe` try/catch → 189. Salt lives
only in the audit bundle.

**DoD:** unit green; content-free scan passes; swapped-pack proves the tier
split; wrapper reached.

---

### Task 9: Build fixtures + Lane A evidence (byte-stable)

**Fixture manifest (reviewer P0-2 — enumerated, no floating count).** The
tamper fixture is SPLIT (reviewer P0-3): 183 masks 186 in the ordered run, so
one document cannot test both. Ten fixture documents:

| fixture_id                       | set      | bytes_committed | audit_committed | purpose / target                                  |
| -------------------------------- | -------- | --------------- | --------------- | ------------------------------------------------- |
| `incident_report_shaped`         | clean    | yes             | yes             | Art-73-template shape, clean pass                 |
| `risk_report_shaped_private`     | clean    | yes             | yes             | unredacted half of the reconciliation pair        |
| `risk_report_shaped_public`      | clean    | yes             | yes             | redacted half; drives 186 clean pass              |
| `consulting_report_shaped_v1`    | clean    | yes             | yes             | version pair (map-delta), clean                   |
| `consulting_report_shaped_v2`    | clean    | yes             | yes             | version pair (map-delta), clean                   |
| `withdrawn_policy_shaped`        | clean    | yes             | yes             | hedged-quantitative clean pass                    |
| `minimal_edge`                   | clean    | yes             | yes             | boundary geometry (offset 0 / EOF / MB)           |
| `botched_marker_shaped`          | tamper   | yes             | yes             | **targets 183** (undeclared marker) FIRST         |
| `reconciliation_mismatch_shaped` | tamper   | yes             | yes             | marker-clean, signed; **targets 186** FIRST       |
| `withheld_document`              | withheld | **no**          | no              | public-tier-only structural-binding demonstration |

**Deterministic salts (reviewer P0-5):** fixture salts are committed test
salts derived deterministically from `fixture_id`
(`salt = sha256("vdr-fixture-salt:" + fixture_id)`), never random — else
`sha256(salt ‖ bytes)` breaks byte-stability. Real submissions may use random
salts sealed audit-side (noted in the fixture README).

**Test first** (`fixtures.test.js`) — three disjoint fixture sets, no fixture
in two (reviewer P0-2): **(a) clean** (`incident_report_shaped`, both
`risk_report_shaped_*`, both `consulting_report_shaped_*`,
`withdrawn_policy_shaped`, `minimal_edge`) verify at public AND audit tier
`{raw:0}`; **(b) tamper** (`botched_marker_shaped` → `183
undeclared_redaction_marker` FIRST; `reconciliation_mismatch_shaped`,
marker-clean and correctly signed, passes 181–185 then fires `186` FIRST) are
EXCLUDED from the clean-pass set and each must fail its target raw code first;
**(c) withheld** (`withheld_document`) verifies public-tier `{raw:0}` with NO
document bytes present and is ABSENT from the audit-tier list. The manifest
table above is the single source of truth — the test derives all three sets by
iterating it (each row tagged `clean|tamper|withheld`), so the count and the
set membership can never drift.

**Code** (`node/build-stage4y-fixtures.mjs`): SEEDS keyed by `fixture_id`; the
`incident_report_shaped` structured on the Commission Art-73 template shape;
the risk-report private/public pair with manifest + segment map;
`consulting_report_shaped_v1/_v2` version pair. Committed fixture key,
deterministic salts. Build twice, `cmp` byte-stable. Evidence →
`docs/research/llm-shield/evidence/stage-4y/` (prettier-ignored). Build-time
assertions: gate-agreement over every fixture; public maps content-free
(digest-allowlist scan).

**DoD:** unit green; evidence byte-stable across two builds; each tamper
fixture hits its target check FIRST.

---

### Task 10: Attestation (two-tier) + sign/verify CLI

**Merkle over DIGESTS, not artifact bytes (reviewer P0-4).** The attestation
binds `merkleRootSorted([map_digest, audit_digest])` where both are declared
digest fields. **Public verify recomputes `map_digest` from the map bytes it
holds, reads `audit_digest` from the signed attestation body (does NOT need the
audit artifact), and checks the Merkle root** — so a withheld audit bundle
still verifies at public tier. Public thus proves "this map is bound, under a
valid signature, to SOME committed audit digest"; the audit tier proves that
digest matches the actual audit bytes. (Honest split, no fake teeth.)

**Test first** (`attestation.test.js`): `build-stage4y-attestation` signs
`canonicalJson(body)`; binds `map_digest`, `audit_digest`,
`merkleRootSorted([map_digest, audit_digest])`; `verify-stage4y-attestation
--tier public` returns exit 0 over map+attestation ALONE (no audit bundle on
disk); `--tier audit` needs the audit bundle. **Substitution split (reviewer
P0-8):** an unsigned/re-bytes substituted map (signature no longer valid) →
`182`; a re-signed map whose recompute disagrees (audit tier) → `188`. Both
asserted separately. Withheld-bundle public verify still exit 0.

**Code** (`node/build-stage4y-attestation.mjs`,
`node/verify-stage4y-attestation.mjs`): recompute `map_digest = recordDigest(map)`,
read `audit_digest` from the attestation body, Merkle binding check before
`evaluateVdr` (4X verifier shape); CLI-main guard exact; `--tier` arg parse.

**DoD:** unit green; public verify works bytes-absent; 182 vs 188 split proven.

---

### Task 11: Lane B — blind two-process recompute ceremony

**Test first** (`tests/e2e/.../laneb.test.js`): child recomputes each fixture's
map from a PARENT-MADE TEMP COPY path + frozen digest block; parent compares
`canonicalJson` byte-for-byte; child refuses `OPERATOR_*` env (exit 2); child
refuses a `committed_map`/`ledger_path` stdin key (exit 2); `withheld_document`
is EXCLUDED (no bytes); transcript records the three blindness negatives false.

**Code** (`laneb/recompute-child.mjs`, `laneb/run-laneb-recompute-ceremony.mjs`):
child reads `{document_path, frozen_digest_block}` only; static scan test
asserts the child source never references the evidence dir. Parent copies each
document into scratch, passes the temp path.

**DoD:** e2e green; blindness negatives enforced statically + at runtime;
withheld doc skipped.

---

### Task 12: Python parity (`vdr_parity.py`, stdlib) + digest preflight

**Test first** (`parity.test.js` shelling `python3`): Python's recomputed
`v1RulesetDigest`/`v2Digest`/`metamorphicTableDigest` from its OWN ported
tables **equal** the JS frozen block (preflight — fail BEFORE map compare);
Python full-map (public fields) equals JS `canonicalJson` map over all Lane A
fixtures; a divergence prints `{error: "map_mismatch", fixture, ...}` exit 3.

**Code** (`python/vdr_parity.py`): port intrinsic 183, extractor, precedence
partition, shadow (`apply_mr`), public arithmetic. `json.dumps(obj,
sort_keys=True, separators=(",", ":"), ensure_ascii=False)` byte-matches
`canonicalJson` (= `JSON.stringify` of sorted-key normal form, which emits raw
UTF-8 — `ensure_ascii=False` is REQUIRED and is the established 4X pattern,
`vlr_parity.py` line 111; gauntlet P1-4). Ed25519 excluded (Node
authoritative).

**DoD:** parity green over all fixtures; digest preflight gates the compare.

---

### Task 13: Browser verifier + no-egress guard

**Ed25519 decision (reviewer P1-7) — deliberate upgrade over 4X.** 4X kept
signatures Node-authoritative in-browser (`vlr-verifier.html:35`). VDR's
browser IS the headline artifact aimed at external reviewers, so it verifies
182 **in-page via WebCrypto** (`crypto.subtle.importKey`/`verify` with
`{name:"Ed25519"}` — available offline, needs no network, no CSP relaxation).
If `crypto.subtle` Ed25519 is unsupported in the viewer's browser, the UI shows
an explicit **"signature not verified in this browser — verify via CLI"** state,
NEVER a silent green pass (fail-visible, not fail-open). Tested in the Node
vm-parity harness via `crypto.webcrypto.subtle` (no Playwright dependency —
same style as the 4X vm-parity test).

**Test first** (`tests/e2e/.../browserParity.test.js`, `browserNoEgress.test.js`):
extract the inline VDR logic, run public-mode checks over a fixture map, assert
the same `{raw}` as `evaluateVdr` public — including a REAL WebCrypto Ed25519
verify of the fixture attestation (valid → pass; tampered → 182); the
unsupported-subtle branch renders the explicit unverified state (asserted, not
a pass). `browserNoEgress` asserts CSP `default-src 'none'`, no `connect-src`
beyond none, `form-action 'none'`, `img-src` data-only. **Sink scan runs over
the EXECUTABLE script only, not the whole HTML (reviewer P1-5):** extract the
`<script>` block bodies, strip comments and string literals, THEN assert none
of `fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|Worker`
nor external `src`/`href` remain — so the words appearing in prose, comments,
or the on-page limitations text cannot false-fail the test (`crypto.subtle` is
NOT a network sink — allowed). Hash-consistency test recomputes inline
script/style sha256 and matches the CSP.

**Code** (`browser/vdr-verifier.html`): offline single file; public mode
(map+attestation → 181/182[WebCrypto]/184/185, render partition bar + shadow
aggregates); audit mode (+bytes → 183/186/187/188 in-page, bytes never leave).
Hash-based CSP.

**DoD:** browser parity green (incl. real Ed25519 verify + unsupported-branch
state); no-egress green; CSP hashes consistent.

---

### Task 14: Lean — six theorems, zero sorry

**Test**: `lean proofs/stage4y/DocumentResidue.lean` compiles; sorry-grep
clean. Theorems: `partitionConservation`, `classifyTotal`,
`shadowSlipAntitone`, `extractorGateAgreement` (substantive);
`redactionCounted`, `mapDeterministic` (locks). Structural `def` totals, no
foldr; model the region list + precedence classifier + gate predicate.

**Code**: wire into `.github/workflows/stage-4-lean-proofs.yml` +
sorry-grep; keep `lean-not-in-check.sh` true.

**DoD:** compiles, zero sorry, workflow wired.

---

### Task 15: OSCAL + map-delta projections, K7, reproduce, closeout

- **`oscalProjection.mjs`** (`oscalProjection.test.js`): render a verified
  map's aggregates as an OSCAL Assessment-Results `observations` block;
  validate against the OSCAL JSON shape (no network). Zero new raw codes.
- **`mapDelta.mjs`** (`mapDelta.test.js`): diff two verified maps
  (`consulting_report_shaped_v1/_v2`) → region-class + shadow deltas; assert it
  does NOT emit a signed attestation (does not pay
  `narrative_version_diff_deferred`).
- **K7 all-functions e2e net** (`k7AllFunctions.test.js`): every export called;
  tamper matrix (each of 181–189 provoked, wrapper via poisoned callback);
  cross-stage invariants (frozen digests match live 4W/4X; gate-agreement over
  every fixture); public⊂audit tier containment.
- **`scripts/reproduce-llm-shield-stage4y.sh`**: verify-only, Node 26, offline,
  byte-stable; wire `"Stage 4Y VDR|scripts/reproduce-llm-shield-stage4y.sh"`
  into `scripts/check-e2e.sh`. Add `_vdr` allowlist line to
  `security-audit-llm-shield-stage3{m,o}.sh` (both). Add evidence dir to
  `.prettierignore`.
- **Docs-accuracy closeout pass**: `STAGE_4Y_CLOSEOUT.md` with re-scored
  scorecard; README banner row; every documented digest/field re-verified
  against shipped code.
- **Final gate**: `bash scripts/check.sh` (10-min timeout) + full e2e nets +
  ALL prior reproduce scripts (4H/4K/4L/4W/4X) green.

**DoD:** K7 green; reproduce byte-stable on branch; check.sh green; prior
history undisturbed.

---

## Task dependency order

```text
1 (codes) → 2 (constants) → 3 (documentBytes) → 4 (extractor+oracle)
→ 5 (partition) → 6 (shadow) → 7 (frozenBinding+reconciliation)
→ 8 (mapCore+vdrCore) → 9 (fixtures/evidence) → 10 (attestation)
→ 11 (Lane B) → 12 (Python parity) → 13 (browser) → 14 (Lean)
→ 15 (projections+K7+reproduce+closeout)
```

3, 4 are independent after 2; 6 needs 4; 7 is independent after 2; 8 needs
3–7; everything from 9 needs 8. Lean (14) can start after 5/6 land the shapes.

## Closeout ledger (fill at the end)

- Re-score the four axes honestly (trim if a dependency didn't move).
- Append any new gotcha to `references/gotcha-ledger.md` + memory.
- Zurvan: search duplicates first; ingest only what's missing; add the ADR
  (VDR pays `residue_over_submitted_narrative_deferred`).
