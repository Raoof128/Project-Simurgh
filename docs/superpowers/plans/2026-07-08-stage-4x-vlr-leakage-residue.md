# Stage 4X — VLR: Verifiable Leakage-Residue (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Spec:
> `docs/superpowers/specs/2026-07-08-stage-4x-vlr-leakage-residue-design.md`.
> Prev: v2.32.0-stage-4w-vsn (main 08597061). Target tag:
> `v2.33.0-stage-4x-vlr`. Branch: `stage-4x-vlr`.

TDD throughout: write the failing test, watch it fail, minimal code to green,
`npm run format`, commit (neutral message, no trailers). Node 26 for byte-stable
reproduce (`export PATH="/opt/homebrew/opt/node@26/bin:$PATH"`).

## Read before Task 1 (paid-for gotchas that apply here)

- **Additive codes 173–180 ripple goldens** (bit 4R/4S/4W): after Task 1 run
  `node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
  (regenerates BOTH `exit-map.json`), fix `stage4h/exitWrapper.test.js` inline
  map, the 4K/4H exitWrapper snapshots, **and the 4L + 4W e2e nets**. Then run
  the full Node-26 e2e nets AND every prior reproduce script (4W included).
- **`UNKNOWN_RAW_PROBE` (999)** for any "unknown code" probe; extend the
  `exitCodeProbeHygiene.test.js` danger zone to 180. Never hardcode a future
  literal.
- **Prettier corrupts bare `_` in Markdown prose** and inside regexes — backtick
  every underscore identifier; keep regexes in one code span. Validate with
  `npm run format` + `npm run format:check`, never a hand-picked glob.
- **`keyDigest(pem)` = `"sha256:" + sha256(raw PEM string)`** (verified
  empirically; not SPKI-DER). Feed PEM files verbatim (trailing newline
  included). Sign `canonicalJson(parse(bundle))`.
- **CLI-main guard**:
  `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`.
- **Deterministic signers**: committed fixture keys only, never
  `generateKeyPairSync` in a builder.
- **Two-process child may import pure modules** (canonicalJson) — blindness is
  stdin data-isolation, not code-isolation; that is what gives signature
  byte-parity.
- **Fixture keys allowlisted by PATH REGEX** in BOTH
  `scripts/security-audit-llm-shield-stage3m.sh` and `...stage3o.sh`:
  `INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem` — **no digits in key names** (so
  `INSECURE_FIXTURE_ONLY_vlr.pem`, not `vlr4x`).
- **A tamper fixture must make its TARGET check fire FIRST** — recompute binding
  + re-sign after any content mutation (the resignBundle lesson).
- **`evidence/stage-4x` must be fully `.prettierignore`d** or `cmp` reproduce
  breaks. Format generator files BEFORE regenerating evidence.
- **Lean 4.15, no mathlib**: structural recursive `def` totals, not `foldr`;
  `simp only [pred] at ih ⊢` before `List.filter_cons`.
- Never shell `rg` in a unit test (Linux CI ENOENT). `npm test` gates unit only;
  e2e via `scripts/check-e2e.sh`. Run `bash scripts/check.sh` locally (10-min
  timeout) before push.

## File structure (locked)

```text
tools/simurgh-attestation/stage4x/
  constants.mjs                 schemas, metamorphic table id, families, coverage set,
                                non-claims, limitations, rails, reserved slots
  core/metamorphicTable.mjs     vlr.metamorphic.v1 sealed MR table + applyMR(seed) pure fn
  core/corpusCore.mjs           corpus schema (173) + 175 (well-formedness, MR-derivation,
                                coverage witness) + 176 frozen-gate digest + source-digest witness
  core/residueLedger.mjs        run v1/v2 over items → R/R′/slip-rate/catch-rate/per-family;
                                ledger recompute (178); monotonicity (179)
  core/vlrCore.mjs              frozen check order + evaluateVlr / evaluateVlrSafe (174 sig, 177, 180)
  core/gateV2.mjs               vsn.leakage.v2 = v1 ∪ disjoint lexicon (composes imported v1)
  node/build-stage4x-corpus.mjs        Lane A corpus (seeds + MR + derived residue + coverage)
  node/build-stage4x-attestation.mjs   two-tier attestation + sign
  node/verify-stage4x-attestation.mjs  --tier public|audit
  laneb/recompute-child.mjs + run-laneb-recompute-ceremony.mjs   blind two-process recompute
  python/vlr_parity.py          stdlib parity: v1+v2 gate, MR apply, ledger recompute
  browser/vlr-verifier.html     static, CSP default-src 'none', renders the residue map
proofs/stage4x/{lean-toolchain, LeakageResidue.lean}
scripts/reproduce-llm-shield-stage4x.sh
docs/research/llm-shield/STAGE_4X_CLOSEOUT.md
tests/unit/llmShield/stage4x/*.test.js
tests/e2e/llmShield/stage4x/{k7AllFunctions,laneb,browserParity}.test.js
```

Import the frozen 4W gate UNMODIFIED: `checkLeakage`, `scanLeakage` from
`../../stage4w/core/leakageGate.mjs` (`checkLeakage` handles the spanless case
internally via its own `uncoveredRegions` — do NOT import `uncoveredRegions`
separately; ceremonial imports are reviewer-goblin bait, P2-10);
`LEAKAGE_NUMBER_WORDS`, `LEAKAGE_QUANTIFIERS`, `LEAKAGE_MONTHS`,
`LEAKAGE_RULESET_ID` from `../../stage4w/constants.mjs`. `canonicalJson` from
`../../stage4m/core/canonical.mjs`. Task 8 asserts the spanless path explicitly:
`checkLeakage(residue_form, [], caps)` covers the full prose body (confirms VLR
rides the same 4W unspanned-region path, P2-10).

---

### Task 1: Raw codes 173–180 + probe hygiene + golden ripple

**Test first** (`tests/unit/llmShield/stage4x/exitCodes.test.js`):

- `VLR_RAW_CODES` maps the eight names to 173–180;
  `VLR_RAW_CODES.INTERNAL_FAIL_CLOSED_VLR === 180` (name is `_VLR`-suffixed to
  avoid colliding with VSN's existing `INTERNAL_FAIL_CLOSED: 172`; do not leave
  a bare `INTERNAL_FAIL_CLOSED` alias floating — P1-4).
- `VLR_CHECK_ORDER` deep-equals `[173,174,175,176,177,178,179]` (wrapper 180
  excluded from the order array, asserted last-and-separate — mirror 4W).
- Every code 173–180 has `RUN_LEVEL_BY_RAW === 1`.
- `getRunLevel(999) === 3` (unknown default) still holds; `UNKNOWN_RAW_PROBE`
  exported `=== 999`.

**Code** — extend `tools/simurgh-attestation/stage4h/exitCodes.mjs` additively
(comment `// Stage 4X VLR codes (spec §2). Wrapper LAST at 180.`):

```js
export const VLR_RAW_CODES = Object.freeze({
  VLR_SCHEMA_INVALID: 173,
  VLR_SIGNATURE_INVALID: 174,
  VLR_CORPUS_INVALID: 175,
  VLR_V1_FROZEN_MISMATCH: 176,
  VLR_GATE_RECOMPUTE_MISMATCH: 177,
  VLR_LEDGER_MISMATCH: 178,
  VLR_BOUND_NOT_MONOTONE: 179,
  INTERNAL_FAIL_CLOSED_VLR: 180,
});
export const VLR_CHECK_ORDER = Object.freeze([173, 174, 175, 176, 177, 178, 179]);
export const VLR_REASONS_175 = Object.freeze([
  "count_mismatch", "duplicate_item_id", "unsorted_item_id", "bad_provenance",
  "missing_label", "rubric_inconsistent_label",
  "residue_form_not_mr_derived", "coverage_witness_incomplete",
]);
```

Add `173:1 … 180:1` to `RUN_LEVEL_BY_RAW`.

**Golden ripple (do immediately, same commit):**
`node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`;
update `stage4h/exitWrapper.test.js` inline map + 4K/4H exitWrapper snapshots;
extend `exitCodeProbeHygiene.test.js` danger zone to 180. Run 4H/4K/4L/4W e2e
nets green before commit.

**DoD:** unit green; both `exit-map.json` regenerated; prior e2e nets green.

---

### Task 2: Constants

**Test first** (`constants.test.js`): schema id strings frozen; `SPAN`-free;
`VLR_FAMILIES` has the six ids; `VLR_V1_COVERAGE_FAMILIES` lists the v1 lexical
families that `coverage_witness` must hit (`digit`, `number_word`, `percent`,
`month`, `quantifier`); `VLR_NON_CLAIMS` length 9, `[8]` is
`not_a_claim_that_slip_rate_is_gate_field_performance`; `VLR_KNOWN_LIMITATIONS`
length 6; `VLR_RESERVED_SLOTS` contains `irreducible_semantic_residue_deferred`,
`residue_over_submitted_narrative_deferred`, `cross_gate_residue_benchmark_deferred`,
`multilingual_ruleset_deferred`, `narrative_version_diff_deferred`,
`transparency_report_profile_deferred`; `VLR_SUPERSEDED_SLOTS` maps
`semantic_leakage_adversary_deferred → semantic_residue_measurement_deferred`.

**Code** (`stage4x/constants.mjs`): export the above, all `Object.freeze`.
Schemas: `simurgh.vlr.corpus.v1`, `simurgh.vlr.ledger.v1`,
`simurgh.vlr.attestation.v1`, `vlr.metamorphic.v1`, `vlr.claim_rubric.v1`.

**DoD:** unit green; SPDX header; no `authorise_*` import.

---

### Task 3: `gateV2` — vsn.leakage.v2 (composes v1, disjoint additions)

**Test first** (`gateV2.test.js`):

- `V2_LEXICON` is **disjoint** from every v1 list — assert
  `intersection(V2_LEXICON, [...numberWords, ...quantifiers, ...months]) === ∅`
  (this is the machine guard that Finding 1 never recurs).
- `checkLeakageV2(body, [], caps)` returns a hit whenever `checkLeakage` (v1)
  does — superset property on a table of inputs.
- `checkLeakageV2` additionally hits on `"roughly a quarter"`, `"a handful"`,
  `"essentially"`, `"a large fraction"`; v1 returns null on those.
- v2 returns null on `"materially affected"` / `"not ideal for a subset"` (the
  irreducible floor).

**Code** (`core/gateV2.mjs`): import v1 `scanLeakage` + lists; define
`V2_LEXICON = Object.freeze(["roughly","approximately","about","around",
"effectively","essentially","largely","quarter","third","fifth","fraction",
"portion","handful","several","swath","chunk"])`. `scanLeakageV2 = v1 hits ∪
word-regex over V2_LEXICON` (re-implement the 4W `wordRe` shape locally; it is
gate-local in 4W, not exported). `checkLeakageV2` → 170-style `{ hit: true }` /
null. Export `V2_LEXICON`, `scanLeakageV2`, `checkLeakageV2`, `v2Digest()`
(sha256 over v1 lists ∪ V2_LEXICON, canonical).

**Honesty note (P2-9, sign into a rail/non-claim):** `vsn.leakage.v2` is a
**measurement ruleset for shrinking the residue bound — NOT a proposed deployed
policy.** It exists to quantify how much of R is lexically reachable; it does
not claim these words should be blocked in production. State this in a rail
`v2_is_a_measurement_ruleset_not_a_deployed_policy`.

**DoD:** disjointness test green (locks Finding 1); superset test green (locks
Finding 5 by construction).

---

### Task 4: `metamorphicTable` — signed **claim-bearing residue transform** + `applyMR`

**Framing (P2-9):** an MR is a **claim-bearing residue transform**, not a
numeric-equivalence transform. Its contract is: the output is still a
*claim-looking quantitative phrase* (preserves the `claim_bearing` class) that
slips v1 — NOT that it is numerically faithful to the seed. So `"80%" →
"a large fraction"` is legal (claim-bearing preserved) without asserting 80% ≈
"a large fraction". Seed selection SHOULD keep the rewrite plausible per family,
but correctness rests only on claim-bearing + slip, which are machine-checked.

**Test first** (`metamorphicTable.test.js`):

- `MR_TABLE` id `vlr.metamorphic.v1`; each MR is `{ id, family, apply }` where
  `apply` is a pure `string → string`.
- `applyMR(mrId, seed)` is deterministic (same output twice) and pure (no
  Date/rand).
- For each MR fixture seed→expected: `applyMR` equals `expected` byte-for-byte.
- **Round-trip residue property**: for every `(seed, mrId)` in the canonical
  fixture set, `checkLeakage(seed)` fires (v1 catches the seed) AND
  `checkLeakage(applyMR(mrId, seed))` is null (v1 misses the residue) AND
  `checkLeakageV2(applyMR(mrId, seed))` fires (v2 catches it) — except the
  `true_semantic_paraphrase` MR, where v2 also returns null (floor).
- `metamorphicTableDigest()` stable across two calls.

**Code** (`core/metamorphicTable.mjs`): MR relations are frozen string rewrites,
e.g. `digit_to_word_quantifier`: replace a leading `\d+%?` token with
`"roughly a quarter"` template; `count_to_bulk_phrase`: `\d+ <noun>` →
`"a handful of <noun>"`; `true_semantic_paraphrase`: a fixed lexical-marker-free
rewrite. Keep each MR a total function; `applyMR` throws on unknown id (caught
upstream → 175). `metamorphicTableDigest = sha256(canonicalJson(serialisable
table))` (serialise id+family+source-pattern, not the JS closure).

**DoD:** round-trip property green — this is the executable proof that residue
is a function (Finding 2 / theorem 5 foundation).

---

### Task 5: `corpusCore` — schema (173), well-formedness (175), frozen-gate (176) + source-digest witness

**Test first** (`corpusCore.test.js`):

- `validateCorpusSchema` → 173 on unknown key / bad type / missing
  `metamorphic_table_digest` / bad item shape.
- `checkCorpusWellFormed` → 175 with the right reason for: count≠declared, dup
  id, unsorted id, bad provenance, missing/`claim_bearing!==true` label,
  **`residue_form !== applyMR(item.metamorphic_relation, item.seed_form)`**,
  and **coverage_witness missing a `VLR_V1_COVERAGE_FAMILIES` entry**.
- `checkFrozenGate(corpus)` → 176 when `corpus.ruleset_binding.v1_ruleset_digest`
  ≠ digest recomputed live from imported 4W constants; null when equal.
- **Source-digest witness** (with a DI test seam — P1-5):
  `computeSourceWitness({ rootDir = defaultRepoRoot } = {})` hashes the file
  bytes of the imported 4W modules (`stage4w/core/leakageGate.mjs`,
  `stage4w/constants.mjs`) via `fs.readFileSync` + sha256;
  `checkSourceWitness(corpus, { rootDir } = {})` → 176 (reason
  `four_w_source_drift`) if the corpus's sealed witness ≠ live. Production uses
  the default root; the test passes a temp `rootDir` with a mutated copy →
  mismatch, and the real root → match.

**Code** (`core/corpusCore.mjs`): implement the four exports. `v1RulesetDigest =
sha256(canonicalJson({ id: LEAKAGE_RULESET_ID, numberWords: LEAKAGE_NUMBER_WORDS,
quantifiers: LEAKAGE_QUANTIFIERS, months: LEAKAGE_MONTHS }))`. Source witness
resolves the two 4W files under `rootDir` (default = repo root from
`import.meta.url`), so the test can inject a temp root.

**DoD:** 176 fires on both a constants-digest swap AND a wrapper-source drift
(the self-gauntlet Finding hardening).

---

### Task 6: `residueLedger` — sealed-outcome vs live-gate split, slip-rate, 178, 179

**The two-tier split (P0-1, load-bearing).** The ledger carries a **sealed
per-item outcome table** so the public tier can verify by ARITHMETIC without
re-running the gate, and the audit tier re-runs the gate to verify the sealed
table. Ledger gains:

```text
per_item_outcomes: [ { item_id, seed_v1, residue_v1, residue_v2 } ]  // booleans, sorted
```

Two ledger builders, cleanly separated:

- `computeLedgerFromLiveGate(corpus)` — runs `checkLeakage`(v1) and
  `checkLeakageV2` over each item's `seed_form` AND `residue_form`, produces
  `per_item_outcomes` + all aggregates. **Audit/build only.**
- `computeLedgerFromSealedOutcomes(ledger.per_item_outcomes)` — pure ARITHMETIC:
  derives `v1/v2.residue_item_ids` (R, R′), `metamorphic_slip_rate_*`,
  `catch_rate_*`, `residue_delta`, `monotone` from the sealed booleans, NO gate
  call. **Public tier.**

**Test first** (`residueLedger.test.js`):

- On the green corpus, `computeLedgerFromLiveGate` and
  `computeLedgerFromSealedOutcomes` (fed the former's `per_item_outcomes`) agree
  on every aggregate.
- `metamorphic_slip_rate_v1` = `"<residue>/<catchable-seeds>"` (residue = items
  with `residue_v1===false && claim_bearing`; catchable = items with
  `seed_v1===true`); `catch_rate_v1`/per-family secondary.
- `residue_delta.newly_caught_by_v2 = R \ R′`, `irreducible = R′`.
- **178 (public, arithmetic)**: `checkLedgerArithmetic(signedLedger)` recomputes
  every aggregate from the sealed `per_item_outcomes` → 178 on any mismatch. Does
  NOT run the gate.
- **177 (audit, live)**: `checkOutcomesAgainstGate(corpus, signedLedger)` re-runs
  the gate per item and → 177 when any sealed `per_item_outcomes` entry ≠ live
  gate. This is what makes the swapped-pack **public-green / audit-red** fixture
  (Task 10) real.
- **179 monotonicity as a blade, not a sticker (P1-6)**: `checkMonotone(ledger)`
  RECOMPUTES `caughtSetV2 ⊇ caughtSetV1` and `R′ ⊆ R` from the sealed outcomes,
  then fires 179 if the relation fails **OR** if `ledger.monotone !==
  recomputedMonotone` (a ledger that lies `monotone:true` while `R′ ⊄ R` fails).
  Two fixtures: set-relation-fails, and boolean-lie.
- **`residueIsRecordedNotFailure`**: `computeLedgerFromLiveGate` on an
  all-residue corpus returns populated R with NO throw and NO raw code.

**Code** (`core/residueLedger.mjs`): both builders pure; R is DERIVED, never read
from a hand-filled corpus field. Sorted id arrays. `checkMonotone` never trusts
the stored boolean.

**DoD:** the two builders agree; 177/178 are cleanly separated (only 177 calls
the gate); both monotonicity fixtures (relation-fail + boolean-lie) fire 179.

---

### Task 7: `vlrCore` — frozen check order + evaluate (174 sig, 177, 180 wrapper)

**Test first** (`vlrCore.test.js`):

- `evaluateVlr(bundle, { tier })` runs the frozen order; returns `{ raw: 0 }` on
  green. **Tier-precise order (P0-1):**
  - `tier: "public"` → 173 → 174 → 175 → 176 → 178 (arithmetic over sealed
    outcomes) → 179 (monotone recompute over sealed outcomes). **No gate call;
    177 is NOT run.**
  - `tier: "audit"` → all public checks, then **177** (`checkOutcomesAgainstGate`
    re-runs v1/v2 per item). 177 sits after 176 in the canonical
    `VLR_CHECK_ORDER` array, but is *gated off* in public tier.
- Each tamper fixture returns its expected raw and NO later check masks it
  (first-failure table, one per code).
- **174**: bad attestation signature → 174 (Ed25519 over `canonicalJson(content)`,
  `keyDigest` over public PEM).
- **177 audit-only**: the swapped-pack bundle (sealed outcomes internally
  consistent, arithmetic clean, validly re-signed) is **public-green, audit-red**.
- `evaluateVlrSafe` wraps in try/catch → 180 on any throw (poison a ctx callback
  to force it — the fail-closed wrapper lesson).

**Code** (`core/vlrCore.mjs`): compose Tasks 3–6; the `tier` param gates whether
177's live `checkOutcomesAgainstGate` runs. Public tier is pure arithmetic +
structure; audit tier adds the live gate recompute. Signature check reuses the
shared attestation lib.

**DoD:** full 173–180 first-failure table green; wrapper reaches 180 via a
forced throw.

---

### Task 7.5: `incident_sourced` gap-hunt sweep (before signing the corpus, P2-8)

Not code — a discipline gate that stops `incident_sourced` degrading into
`vibes_sourced`. Runs before Task 8 signs anything:

- Collect candidate `incident_sourced` smuggle **shapes** (abstracted phrasing
  patterns only).
- Reject any unpinned non-primary reference unless explicitly marked `"reported"`.
- Reject any party/lab/model name in the committed corpus (denylist grep).
- Reject any raw payload / real defamatory claim text — shape only.
- Freeze only abstracted smuggle-shape phrasings; write the source map BEFORE
  signing.

**DoD:** a signed source map exists; the denylist grep over the corpus is clean;
every `incident_ref` is primary-pinned or `"reported"`.

### Task 8: Build corpus + Lane A fixtures

**Test first** (`fixtures.test.js`): the built corpus verifies to raw 0; every
`residue_form` equals `applyMR(...)`; coverage witness complete; the six
families present with both provenances; the **RSP-shaped `incident_sourced`
family** present (shape only, no party named — grep the corpus for a denylist of
lab/model names → none); the non-ASCII fixture (`سیمرغ` + emoji) is byte-stable;
sealed `residue_delta` equals an independent recount. Tamper matrix: one fixture
per 173–180 (build via mutate-then-resign helper).

**Code** (`node/build-stage4x-corpus.mjs` + `build-stage4x-fixtures.mjs`):
deterministic; committed fixture key `INSECURE_FIXTURE_ONLY_vlr.pem`; write to
`evidence/stage-4x/` (prettier-ignored). Pin every `incident_ref` PRIMARY source
or set `"reported"` **before signing** (spec Finding-3 build-time guard) — a
build assertion refuses an un-pinned non-"reported" ref.

**DoD:** corpus + fixtures byte-stable (build twice, `cmp`).

---

### Task 9: Lane B — blind two-process recompute ceremony

**Independence claim, stated honestly (P1-7).** Lane B proves **process-isolated
recomputation**, NOT independent-implementation and NOT institution-independence
(the child imports our own `computeLedgerFromLiveGate`). The claim is only that
the ledger survives a blind recompute across a process boundary that cannot reuse
the parent's state.

**Test first** (`tests/e2e/llmShield/stage4x/laneb.test.js`, verify-only):
- spawn `recompute-child.mjs`, feed corpus path + public v1/v2 digests over
  stdin, receive canonical ledger bytes, assert byte-equal to committed ledger;
- **blindness negatives sealed**: child env carried no `OPERATOR_*`, no
  committed-ledger path, no argv `.pem`;
- **source-negative (parent is dumb)**: grep `run-laneb-recompute-ceremony.mjs`
  source and assert it imports NONE of `leakageGate`, `gateV2`, `residueLedger`,
  `computeLedgerFromLiveGate` — the parent only spawns + byte-compares;
- a sealed capture manifest asserts
  `{ parent_computed_catch_rate:false, child_received_committed_ledger_path:false,
  child_received_operator_env:false }`.

**Code**: `laneb/recompute-child.mjs` imports the real gate +
`computeLedgerFromLiveGate`, recomputes from the corpus, emits canonical ledger
to stdout; `run-laneb-recompute-ceremony.mjs` is the dumb parent (spawn +
byte-compare only). Child may import pure modules (canonicalJson) —
data-isolation via stdin only.

**DoD:** ceremony byte-stable; blindness + parent-source negatives asserted.

---

### Task 10: Attestation (two-tier) + sign/verify

**Test first** (`attestation.test.js`): Merkle root over `{corpus, ledger}`
(ledger now includes the sealed `per_item_outcomes` table); public tier passes
on green (schema/sig/corpus/frozen-gate/source-witness/178-arithmetic/179-
monotone, **no gate call**); audit tier additionally runs `checkOutcomesAgainstGate`
and catches the 177 swapped-pack fixture (sealed outcomes arithmetically
consistent but diverging from the real gate — validly re-signed → **public-green,
audit-red**, the P0-1 payoff). `keyDigest` over public PEM on both sides.

**Code**: `node/build-stage4x-attestation.mjs`,
`node/verify-stage4x-attestation.mjs --tier public|audit`. Reuse
`attestationLib.mjs` / `canonicalise.mjs`.

**DoD:** public-green/audit-red swapped-pack fixture green.

---

### Task 11: Python parity

**Test first** (`parity.test.js`): run `python/vlr_parity.py` over the shared
corpus; assert its v1+v2 outcomes, MR applications, slip-rate, R/R′ match the JS
ledger exactly. This is **implementation parity of the gate + ledger, not
signature parity** — Ed25519 is excluded and stated as a parity non-claim (the
Node CLI stays authoritative for signatures). JS↔Python is a real second gate
impl → a divergence is a finding. Non-ASCII fixture identical bytes.

**Code** (`python/vlr_parity.py`): stdlib only; port v1 lists, V2_LEXICON, MR
table, `applyMR`, ledger recompute.

**DoD:** parity green incl. multi-byte geometry.

---

### Task 12: Browser verifier (static, CSP none, renders residue map)

**CSP done honestly (P0-3).** `default-src 'none'` ALONE blocks inline JS in a
real browser — the bare form is a "CSP-none dragon costume". 4W shipped
`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'`
(verified). VLR goes **stricter with hash-based script-src** plus a CI guard so
a stale hash cannot ship:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'sha256-…'; style-src 'sha256-…';
           img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'" />
```

**Test first** (`tests/e2e/llmShield/stage4x/browserParity.test.js`):
1. **CSP hash-consistency guard**: extract the inline `<script>` bytes, compute
   `sha256`, assert it equals the `script-src 'sha256-…'` in the meta tag (so any
   edit to the script that isn't reflected in the CSP hash **fails CI** — kills
   the brittleness footgun). Same for the inline style.
2. node:vm parity gate — load the inlined JS, feed corpus+ledger, assert it
   reproduces slip-rate + R/R′ + per-family AND renders the residue map (family
   rows, caught vs residue, v2 shrink, irreducible floor marked).
3. `connect-src 'none'` present (no exfiltration surface); signature
   verification stays Node-authoritative (parity non-claim).

**Code** (`browser/vlr-verifier.html`): single static file; exactly one inline
`<script>` and one inline `<style>` whose sha256 hashes are embedded in the CSP;
a small build note documents regenerating the hashes (the test enforces it).

**DoD:** vm parity green; no external fetch.

---

### Task 13: Lean — five theorems, zero sorry

**Code** (`proofs/stage4x/LeakageResidue.lean`, Lean 4.15, no mathlib): model a
corpus/gate/ledger algebra with structural recursive totals. Theorems:
`residueLedgerSound`, `boundMonotone` (invariant-lock), `frozenGateBinding`,
`residueIsRecordedNotFailure` (substantive), `metamorphicResidueReproducible`
(substantive — accepted ⇒ `residue_form = applyMR(mr, seed)`). Wire into
`stage-4-lean-proofs.yml` + sorry-grep. Add `lean-toolchain`.

**DoD:** `lake build` clean; zero `sorry`; workflow lists the stage.

---

### Task 14: K7 all-functions e2e net + reproduce + check wiring

**Read-only check, carved correctly (P0-2).** A literal "4A–4W byte-frozen"
assertion FALSE-FAILS, because Task 1 additively edits shared
`stage4h/exitCodes.mjs` and regenerates golden maps. The honest assertion is a
**read-only leakage kernel**, not read-only-everything:
- the 4W leakage files (`stage4w/core/leakageGate.mjs`, `stage4w/constants.mjs`)
  are byte-identical (via the source-digest witness);
- `src/llmShield` has zero diff; no `authorise_*` entry added;
- shared `stage4h/exitCodes.mjs` changed ONLY by the additive Stage-4X block;
  pre-existing raw-code blocks byte-identical;
- golden-fixture churn allowed ONLY for the expected 173–180 raw-code-map ripple.

**Code**: `tests/e2e/llmShield/stage4x/k7AllFunctions.test.js` composes every
VLR export, the full 173–180 tamper matrix, and cross-stage invariants
(frozen-gate binding, source-digest witness, MR-derivation, sealed-vs-live
ledger split, monotonicity recompute, residue-recorded-not-failure, and the
carved read-only-leakage-kernel check above).
`scripts/reproduce-llm-shield-stage4x.sh` (verify-
only: rebuild corpus, recompute ledger, re-verify both tiers, re-verify Lane B,
epoch-tamper → integrity failure; guarded Lean step). Add the script to
`scripts/check-e2e.sh` REPRODUCE array. Add `evidence/stage-4x` to
`.prettierignore`. Add key path-regex to BOTH `security-audit-stage3{m,o}.sh`.

**DoD:** K7 green; reproduce byte-stable twice; **all prior reproduce scripts
still green** (additive change disturbs no sealed history).

---

### Task 15: Docs + closeout accuracy pass, then final gate

- `STAGE_4X_CLOSEOUT.md` — **re-score the four axes HONESTLY against what
  shipped, not the pre-baked spec estimates** (P2 polish). The spec-time
  estimates were Novelty 9.4 / Frontier 9.2 / Lab 9.7 / Constitution 9.5;
  confirm or adjust each against the real slip-rate number and the evidence that
  actually landed (a downgrade is a feature, cf. 4P). Record the socket
  supersession ADR; reserved slots incl. 4Y/4Z. README stage row; north-star
  touch.
- **Docs-accuracy pass**: every doc claim (codes table, digest formulas, export
  names, family examples vs real v1 lexicon) verified against shipped code.
- **Zurvan**: file the socket-supersession decision
  (`semantic_leakage_adversary_deferred` → superseded →
  `semantic_residue_measurement_deferred` PAID by 4X); search duplicates first.
- Memory: `project_stage-4x-vlr.md` + MEMORY.md pointer with new gotchas.
- `bash scripts/check.sh` locally (10-min timeout) → green; PR (neutral copy);
  CI green; rebase-merge; `git fetch && git reset --hard origin/main`; tag
  `v2.33.0-stage-4x-vlr`; reproduce ON MAIN.

**DoD:** tag pushed; reproduce green on main; memory + Zurvan written.

---

## Task dependency order

1 → 2 → 3 → 4 → 5 → 6 → 7 (core complete) → 7.5 (sweep gate) → 8 → 9 → 10 → 11 →
12 → 13 → 14 → 15. Tasks 3–6 are pure and independently testable; 7 composes
them; 7.5 is the pre-signing discipline gate; 8–12 are evidence/parity; 13 is
proofs; 14–15 gate and ship.
