# Stage 4Z — VWA: Verifiable Workspace Attestation — Implementation Plan

> Spec: `docs/superpowers/specs/2026-07-08-stage-4z-vwa-workspace-attestation-design.md`.
> Motto in every header: **AnthropicSafe First, then ReviewerSafe.**
> Kernel READ-ONLY (zero `src/llmShield`). Raw codes **190–198** (wrapper LAST).
> TDD: failing test → minimal code → green → `npm run format` → commit. Neutral
> messages, **no attribution trailers anywhere**. Node 26 for any evidence build.

## Read before Task 1 (paid-for gotchas that apply here)

- **Additive codes 190–198 ripple the same goldens as 4Y did** (Task 1): both
  `exit-map.json` (regenerate via `build-stage4h-digest-fixtures.mjs` **under
  Node 26 ONLY** — Node 22 re-signs ~20 stage-4h files and masquerades as a 4Z
  ripple), `exitWrapper.test.js` inline map, 4K/4H exitWrapper snapshots,
  `exitCodeProbeHygiene.test.js` danger zone, the 4L e2e net. Run
  4H/4K/4L/4W/4X/4Y e2e nets + prior reproduce scripts green before commit.
  `UNKNOWN_RAW_PROBE` (999), never a hardcoded future literal. Use `[19x,3]`
  array probes only with the hygiene guard.
- **Prettier corrupts bare `_`** in Markdown prose and downstream backticked
  content — backtick every `snake_case`/`score_nano`/`theta_nano` identifier.
  Validate with `npm run format` + `npm run format:check`, NEVER a hand-picked
  `npx prettier` subset (the 4V browser-HTML miss).
- **ASCII identifiers only in JSON/code (reviewer nice-fix 1).** The JSON field
  and every JS/Python/Lean identifier is **`theta_nano`** (ASCII), never the
  Greek `θ_nano` — Greek in JSON keys breaks grep/shell/prettier/Lean tooling.
  `θ_nano` appears ONLY in prose and math comments in the spec/plan; the wire
  format and code are `theta_nano`.
- **`keyDigest(pem)` = `"sha256:" + sha256(raw PEM string)`**, NOT DER; the
  trailing newline is part of the bytes (4W lesson).
- **Compare maps/aggregates with `canonicalJson`, never `JSON.stringify`** —
  disk round-trip alphabetises keys (the 4X 178 gotcha).
- **`roundHalfEven` is CUSTOM in all three runtimes.** Python `round()` is
  banker's but on floats gives surprises near .5·1e-9; JS `Math.round` is
  half-up. Implement one explicit algorithm; unit-test the tie vectors
  `{0.5, 1.5, 2.5, -0.5, 2.4999999999}` × `1e9` in BOTH JS and Python and
  assert identical integers (Task 3 + Task 11 preflight).
- **Floats NEVER enter JSON — and neither do raw integers (plan-gauntlet P0).**
  `canonicalJson` **throws on `BigInt`** and **silently rounds a `Number` above
  2^53** (`9007199254740993` → `…992`), which ALSO diverges from Python's
  arbitrary-precision ints. Therefore `score_nano` and `theta_nano` are serialized
  as **decimal STRINGS** (`"123456789012345"`), exact and identical in JS
  (`BigInt.toString()`) and Python (`str(int)`). All comparisons parse
  string→BigInt first (`score_nano ≥ theta_nano` is a BigInt compare, NEVER a
  string compare — `"9" > "10"` lexically). Verified: `canonicalJson({s:123n})`
  throws; `canonicalJson({s:9007199254740993})` yields `…992`.
- **Floats NEVER enter JSON.** Every published score is `score_nano` (a decimal
  string as above). The map carries the FULL (cells × lexicon) matrix — no
  top-K truncation (the gauntlet D1 fix; truncation makes `lexiconMonotone`
  false).
- **CLI-main guard**:
  `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`.
- **Deterministic signers**: committed fixture keys, never
  `generateKeyPairSync` in a builder. Allowlist keys by PATH REGEX in
  `security-audit-llm-shield-stage3{m,o}.sh` (BOTH), `_vwa` **no digits**,
  continuation-`\` intact (4Y lesson).
- **Evidence dir prettier-ignored** before byte-stable `cmp`. Format the
  generator BEFORE regenerating evidence.
- **Lane B child** may import PURE modules (`canonicalJson`, `buildMap`);
  blindness is stdin data isolation, not code isolation. `self_report` is
  passed as INPUT (a claim is not the answer — gauntlet D3).
- **Lean 4.15 no mathlib**: structural `def f : List α → Nat | [] => …`, not
  foldr; `getElem?` notation; `simp only [pred] at ih ⊢` before
  `List.filter_cons`.
- **`npm test` unit only; never shell `rg` in a unit test** (Linux CI ENOENT);
  `node --test` needs explicit `*.test.js` globs.
- **Tamper fixtures must make their TARGET check fire FIRST** — recompute
  binding + re-sign after mutation, else an earlier check masks it
  (split-tamper lesson; fixture 9 keeps grid/binding/flag consistent so ONLY
  195 fires in audit and it verifies CLEAN in public).
- **Lane C is OFFLINE and NEVER CI-gated.** `lanec/*.py` (torch) is not in any
  `node --test` glob and not in `check.sh`; it produces frozen tensors + a
  ceremony record consumed by Task 8. Both outcomes sealed (`captured` |
  `capture_failed`); a `capture_failed` seal still ships on synthetic fixtures.
- **Never commit spec/plan to local main before branching**; after
  rebase-merge `git fetch && git reset --hard origin/main` before tagging.

## Repo truths verified during the gauntlet (do not re-derive)

- `stage4m/core/canonical.mjs` exports: `canonicalJson`, `sha256Hex`,
  `recordDigest = sha256(canonicalJson(v))`, `merkleRootSorted(digests)`
  (arbitrary arity, sorts leaves, odd-promote, validates `DIGEST_RE`),
  `DIGEST_RE = /^sha256:[a-f0-9]{64}$/`.
- `stage4w/constants.mjs`: `SPAN_TYPES = ["slot_bound","judgment","unverified_prose"]`.
- `stage4w/core/narrativeCore.mjs`: `buildNarrative`, `evaluateNarrative`;
  `narrativeBinding.mjs`: `narrativeBodyDigest(body)=sha256:…`,
  `spanMapDigest(spanMap)=recordDigest(spanMap??[])`; `leakageGate.mjs`:
  `scanLeakage(body, spanMap, capsuleValues)` (region-granular).
- **4W `slot_bound` span schema (verified):** `["span_id","start_byte",
"end_byte","type", ...,"evidence_digest","recompute_kind","claimed_value"]`;
  `evaluateNarrative` ALREADY, per slot_bound span, looks up
  `sealed[s.evidence_digest]`, checks `artifact.kind ===
KIND_EVIDENCE_SOURCE[s.recompute_kind]`, and asserts
  `fn(artifact, ctx) === s.claimed_value` (else `recompute_mismatch`). **VSC
  reuses this recompute HARNESS and these exact field names** — but the
  per-artifact `recompute_kind → fn` registry does NOT yet cover 4T/4U/4X/4Y/4Z
  artifact kinds, so VSC MUST register them (new glue, ZERO new raw codes, zero
  new verification geometry). The "spine" is heterogeneous, so VSC builds a
  VSC-specific `sealed` index over the named artifacts rather than passing one
  incident capsule to `evaluateNarrative`.
- `exitCodes.mjs`: max raw is **189** (`INTERNAL_FAIL_CLOSED_VDR`); 190+ free.
  `UNKNOWN_RAW_PROBE = 999`. `RUN_LEVEL_BY_RAW` + `getRunLevel`.
- `stage4y/node/verify-stage4y-attestation.mjs:45`: withheld set skips audit
  tier via `if (fx.set === "withheld" && tier === "audit") continue;` — VWA
  copies this verbatim in spirit.
- Digest builder: `stage4h/build-stage4h-digest-fixtures.mjs` (Node 26 only).

## File structure (locked)

```text
tools/simurgh-attestation/stage4z/
  constants.mjs
  core/
    tensorCore.mjs        # float32-LE decode, float64 dot, roundHalfEven→score_nano, commitments
    gridCore.mjs          # grid = all-positions × L build, full cells×lexicon matrix, θ-flag rule, aggregates (194/196)
    declarationCore.mjs   # declaration bundle (lexicon+θ+corpus+position-rule+L) precommit digest (192)
    captureCore.mjs       # capture manifest, salted commitments, binding (193), staleness receipt
    mapCore.mjs           # buildMap, recomputeReadout (195), selfReportConflict (197)
    vwaCore.mjs           # schema (190), signature (191), frozen order, evaluateVwa(tier), evaluateVwaSafe (198)
    systemCard.mjs        # VSC projection — PAYS transparency_report_profile (zero new codes)
  node/
    build-stage4z-fixtures.mjs
    build-stage4z-attestation.mjs
    verify-stage4z-attestation.mjs   # --tier public|audit
  laneb/
    recompute-child.mjs
    run-laneb-recompute-ceremony.mjs
  lanec/
    capture-workspace-readout.py     # OFFLINE torch; NEVER CI; frozen tensors + ceremony
    README.md                         # RunPod recipe, both-outcomes sealing, pinned revision
  python/
    vwa_parity.py                     # stdlib second impl + roundHalfEven parity
  browser/
    vwa-verifier.html                 # WebCrypto Ed25519, hash-CSP, no egress
proofs/stage4z/WorkspaceAttestation.lean
tests/unit/llmShield/stage4z/*.test.js
tests/e2e/llmShield/stage4z/{k7AllFunctions,laneb,browserParity}.test.js
tests/fixtures/llmShield/stage4z/test-keys/INSECURE_FIXTURE_ONLY_vwa(.pub).pem
scripts/reproduce-llm-shield-stage4z.sh
docs/research/llm-shield/evidence/stage-4z/   (prettier-ignored)
docs/research/llm-shield/JLENS_COMPOSITION.md
```

---

### Task 1: Raw codes 190–198 + probe hygiene + golden ripple

**Test first** (`exitCodes.test.js` additions):

- `VWA_RAW_CODES` maps nine names to 190–198;
  `VWA_RAW_CODES.INTERNAL_FAIL_CLOSED_VWA === 198` (`_VWA`-suffixed — no bare
  alias; VSN owns bare `INTERNAL_FAIL_CLOSED: 172`).
- `VWA_CHECK_ORDER` deep-equals `[190,191,192,193,194,195,196,197]` (198
  excluded, asserted last-and-separate).
- Every 190–198 has `RUN_LEVEL_BY_RAW === 1`; `getRunLevel(999) === 3`.
- `VWA_PUBLIC_CODES` deep-equals `[190,191,192,193,194,196,197]`;
  `VWA_AUDIT_CODES` deep-equals `[190,191,192,193,194,195,196,197]`;
  `VWA_PUBLIC_CODES` ⊆ `VWA_AUDIT_CODES` (asserted, mirrors Lean
  `publicSubsetAudit`).

**Implement:** append `VWA_RAW_CODES`, orders, tier sets, `190:1…198:1` in
`RUN_LEVEL_BY_RAW`, to `stage4h/exitCodes.mjs`. Regenerate BOTH `exit-map.json`
via `build-stage4h-digest-fixtures.mjs` **under Node 26**; update
`exitWrapper.test.js` inline map + 4K/4H snapshots + `exitCodeProbeHygiene`
danger zone + 4L e2e expected set.

**Verify:** `node --test tests/unit/llmShield/**/exit*.test.js`; run
4H/4K/4L/4W/4X/4Y e2e nets. **Golden-ripple check (reviewer patch 2):** the
regenerated GOLDENS must be limited to the two `exit-map.json` files plus
expected snapshot/inline-map updates; the intentional raw-code registration
edits (`exitCodes.mjs`, tests, probe-hygiene danger zone, 4L expected set) are
allowed and reviewed as code, not flagged as golden drift.

### Task 2: Constants

**Test first** (`constants.test.js`): schema strings
`simurgh.vwa.{declaration,capture,map,audit,attestation}.v1`; `VWA_SPAN_TYPES`
re-exported identical to 4W `SPAN_TYPES`; `VWA_NON_CLAIMS` (11 entries),
`VWA_KNOWN_LIMITATIONS` (9), `VWA_RAILS` (5) frozen & non-empty;
`VWA_PAID_SLOT === "transparency_report_profile_deferred"`; `Object.isFrozen`
on each. **Exact slot arrays (reviewer patch 3 — named, not "the three"):**

```js
VWA_MINTED_SLOTS = Object.freeze([
  "workspace_narrative_conflict_deferred",
  "lab_readout_pilot_deferred",
  "reflection_corpus_provenance_deferred",
]);
// 4Y reserved set MINUS the paid slot, PLUS the three minted above:
VWA_RESERVED_SLOTS = Object.freeze([
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "cross_gate_residue_benchmark_deferred",
  "submitted_document_pilot_deferred",
  "workspace_narrative_conflict_deferred",
  "lab_readout_pilot_deferred",
  "reflection_corpus_provenance_deferred",
]);
```

Assert `transparency_report_profile_deferred` is ABSENT from
`VWA_RESERVED_SLOTS` (it is paid) and equals `VWA_PAID_SLOT`.

**Implement:** `stage4z/constants.mjs`. Re-import `SPAN_TYPES` from 4W (single
source of truth). `VWA_NANO = 1_000_000_000n` scale constant.

**Verify:** unit green; `grep` shows the paid slot removed from
`VWA_RESERVED_SLOTS`.

### Task 3: `tensorCore` — float decode, dot, `roundHalfEven`, commitments

**Test first** (`tensorCore.test.js`):

- `decodeF32LE(bytes)` on a hand-built 8-float buffer returns the exact
  values (compare to a Python-emitted golden buffer committed as a fixture);
  a buffer whose length is not a multiple of 4, or that decodes to a **NaN or
  ±Inf** value, throws (`non_finite_tensor`) — non-finite scores have no
  deterministic `score_nano`, so they are rejected at decode AND at capture
  (Task 13), never silently mapped.
- `dotF64(a, b)` accumulates in fixed ascending order; a reordered input that
  would change a naive sum is asserted to match the fixed-order golden.
- `roundHalfEven(x)` on `{0.5,1.5,2.5,-0.5,-1.5,2.4999999999}` returns
  `{0,2,2,0,-2,2}`; `scoreNano(s)` returns a **decimal STRING** of
  `roundHalfEven(s*1e9)` (BigInt internally → `.toString()`) — asserted a
  string of `/^-?\d+$/`, never a float or a bare number (P0 above).
  `cmpNano(a,b)` parses both to BigInt and returns -1/0/1 (used by the flag
  rule and top-K display; NEVER string comparison).
- **Safe-range fail-closed guard (reviewer patch 4, rationale corrected).**
  `scoreNano` throws `non_finite_score` if `!Number.isFinite(s)` and
  `score_nano_out_of_range` if the rounded candidate is not
  `Number.isSafeInteger` (|value| > 2^53). NOTE: this is NOT a determinism fix
  — the gauntlet PROVED `BigInt(largeFloat)` is identical in JS and Python on
  the same f64. It is a **meaningfulness** guard: above 2^53 the f64 ULP > 1,
  so the nano-scale's low digits are float-quantization artifacts, not real
  precision. Failing closed keeps every published `score_nano` in the
  exactly-representable regime, so the number means what it says. For our
  benign 1B regime (logits O(10), dot over 2048 dims → O(1e3), ×1e9 → O(1e12)
  ≪ 2^53≈9e15) the guard never trips; it fires only on a pathological capture,
  which should abort, not publish illusory precision. Unit-test one in-range
  and one out-of-range vector.
- `tensorCommitment(salt, bytes) === "sha256:"+sha256(salt‖bytes)`.
- `commitmentTable(entries)` builds an indexed table keyed by
  `(prompt_id,ℓ,t)` / `(ℓ,k)`; lookups are unique.

**Implement:** `core/tensorCore.mjs`, pure, ZERO stage4w/4x imports (only
`stage4m/canonical` for sha256).

**Verify:** unit green; the committed golden f32 buffer is produced by a tiny
Python snippet recorded in the test comment (parity anchor for Task 11).

### Task 4: `gridCore` — grid, full matrix, θ-flag rule, aggregates (194/196)

**Test first** (`gridCore.test.js`):

- `buildGrid(decl)` expands the **total position rule** (`T(p)=every position`
  of each pinned prompt) × the precommitted layer set `L` into cells sorted
  `(prompt_id,t,ℓ)`, each exactly once; a decl with a duplicate, gap, or a
  position set that is NOT the full token count of the prompt → `checkGrid`
  returns `{raw:194}` (No Silent Cell). `buildGrid` takes prompt token counts
  from the capture, so a shrunk position list cannot pass (gauntlet-2 A).
- `buildMatrix(cells, lexicon, scoreFn)` yields, per cell, a `score_nano` for
  EVERY lexicon token; a map missing one token → `{raw:194}` (No Silent
  Token — `matrixTotal`).
- `flagsFor(matrix, theta_nano)` flags token iff `cmpNano(score_nano, theta_nano) >= 0`
  (BigInt compare of the decimal strings); flags that disagree with the rule
  applied to the published matrix → `{raw:196}`.
- `aggregatesFor` recomputes `n_cells,flags_by_token,n_flagged_cells,
flag_total`; a doctored aggregate → `{raw:194}`.
- **`lexiconMonotone` behavioural test:** adding a token to the lexicon never
  removes an existing flag (guards the D1 fix in code, not just Lean).

**Implement:** `core/gridCore.mjs`. θ-only rule; a derived non-normative
`top_k` display list may be produced but carries no rule weight.

**Verify:** unit green incl. the monotonicity property.

### Task 5: `declarationCore` (192, No Post-Hoc Declaration) + `captureCore` (193) + staleness receipt

**Test first** (`declarationCore.test.js`, `captureCore.test.js`):

- `declarationDigest(decl) = recordDigest(canonical {lexicon, theta_nano, corpus
manifest, position_rule_id:"all_positions", layer_set, tokenizer})`;
  `checkPrecommit` fails `{raw:192}` when the digest differs across
  declaration/capture/map/attestation, when `theta_nano`/position-rule/`L` in the
  map ≠ precommitted, **or when the grid's positions are not the total set the
  rule mandates** (the shrink-declaration attack — gauntlet-2 A; the check
  cross-references prompt token counts from the capture).
- `captureManifest` carries model-revision digest × lens digests (the
  **staleness receipt**); `checkCaptureBinding` public: commitment sets
  disagree → `{raw:193}`; audit: reopened `sha256(salt‖bytes)` ≠ commitment →
  `{raw:193}`.
- both-outcomes field validates to `captured | capture_failed`.

**Implement:** `core/declarationCore.mjs`, `core/captureCore.mjs`.

**Verify:** unit green; a declaration that drops positions after capture → 192
(new fixture `tamper_shrunk_declaration`); tamper a single salt → 193 in audit,
clean in public.

### Task 6: `mapCore` — build, readout recompute (195), self-report conflict (197)

**Test first** (`mapCore.test.js`):

- `buildMap(capture, lexicon, decl, {selfReport, provenance})` → the public
  WFM (grid + full `score_nano` matrix + flags + aggregates + commitments +
  digests + `self_report` + provenance) and the sealed audit bundle (tensors,
  salts, per-cell traces).
- `recomputeReadout(audit)` (audit tier): recomputed matrix from tensors
  (float64 → `scoreNano`) ≠ published → `{raw:195}`.
- `checkSelfReport(map)`: `self_report.n_flags !== flag_total` → `{raw:197}`
  (the `perfect_score_conflict` geometry; does NOT adjudicate truth).

**Implement:** `core/mapCore.mjs`. Uses `tensorCore`+`gridCore`; scalar of
record = **post-final-norm logit** (documented; capture provides it).

**Verify:** unit green; the `perfect_score_conflict` mini-fixture fires 197.

### Task 7: `vwaCore` — schema (190), signature (191), frozen order, tier gate, wrapper (198)

**Test first** (`vwaCore.test.js`):

- `attestationBody` binds
  `merkleRootSorted([declaration_digest,capture_digest,map_digest,audit_digest])`
  — **`declaration_digest`, NOT `lexicon_digest`** (reviewer patch 1): the root
  must bind the full precommitted workspace contract (lexicon + θ + corpus +
  position rule + `L` + tokenizer), else it underbinds. `signAttestation`/
  `checkSignature` round-trip; wrong key or `keyDigest` (raw PEM, not DER) →
  `{raw:191}`.
- `evaluateVwa(bundle,{tier,publicKeyPem,counterpart})` runs the FROZEN order
  190→197 with tier gating (`VWA_PUBLIC_CODES` vs `VWA_AUDIT_CODES`); returns
  the first failing raw or 0.
- schema violation anywhere → `{raw:190}` first.
- `evaluateVwaSafe` wraps any throw as `{raw:198}`.
- **withheld set:** audit tier returns SKIPPED (not an error) — mirrors 4Y.

**Implement:** `core/vwaCore.mjs`.

**Verify:** unit green; first-failure order asserted by a table test
(one fixture per code reaching exactly its code).

### Task 8: Build fixtures + Lane A evidence (byte-stable, 12 fixtures)

**Test first** (`fixtures.test.js`): load `index.json`; each fixture's
`evaluateVwa` returns the expected `(public/audit)` code from spec §3 Lane A
table (rows 1–12). `withheld_tensors` → public 0, audit SKIPPED.

**Implement:** `node/build-stage4z-fixtures.mjs`. `synthetic_*` use hand-built
d=8 float32 tensors (every number hand-checkable); `frozen_capture` replays
the Lane C tensors once Task 13 lands (until then, a placeholder synthetic
stands in and is swapped at closeout). Deterministic
`saltFor(id)=sha256("vwa-fixture-salt:"+id).slice(0,16)`; committed
`INSECURE_FIXTURE_ONLY_vwa` key. **`self_report.n_flags` for every CLEAN
fixture is set to the builder's own recomputed `flag_total`** (not hard-zeroed
— gauntlet-2 D: fixture 2 legitimately has `fake`/`injection` flags, so a
hard-zero self_report would fire 197 on a clean fixture); the
`perfect_score_conflict` fixture is the ONLY one where `self_report.n_flags ≠
flag_total`. Writes evidence + `index.json`.

**Verify:** build twice, `cmp` every evidence file (byte-stable). Golden
`verify` outputs for both tiers. Add `docs/research/llm-shield/evidence/stage-4z/`
to `.prettierignore` BEFORE first byte-stable build.

### Task 9: Attestation (two-tier) + sign/verify CLI

**Test first** (`attestation.test.js`): `build-stage4z-attestation.mjs`
produces a signed bundle; `verify-stage4z-attestation.mjs --tier public|audit`
iterates `index.json`, asserts expected code per set, skips audit for withheld.

**Implement:** the two `node/` CLIs with the main-guard. Add the `_vwa`
path-regex allowlist line to `security-audit-llm-shield-stage3{m,o}.sh` (BOTH),
continuation-`\` intact.

**Verify:** both audit scripts still pass; CLI `--tier` both green.

### Task 10: Lane B — blind two-process recompute ceremony

**Test first** (`e2e/…/laneb.test.js`): ceremony reproduces the committed map
byte-for-byte from the **full capture-input set** = everything the map is a
pure function of EXCEPT the answer: `{tensors, salts, declaration bundle,
capture manifest fields (model/revision/lens digests/seeds/versions),
self_report, provenance}`. Rule of thumb (gauntlet-2 C): if the committed
public map binds a field (it binds `declaration_digest`, `capture_digest`,
commitments, `self_report`), the child needs that field's _inputs_ — salts and
the capture manifest were both missing in the first draft and would mismatch
every run. The committed **map/audit are NEVER passed** (still the answer).
Blindness negatives — child exits 2 on any `OPERATOR_*` env and on any of
`{committed_map, map_path, audit_path}` in stdin.

**Implement:** `laneb/recompute-child.mjs` (imports pure `mapCore`; refuses
answer keys), `laneb/run-laneb-recompute-ceremony.mjs` (temp-copy isolation).
The full capture-input set (incl. `self_report`, `salts`, capture manifest)
passed as INPUT data (gauntlet D3 + plan-2 C); map/audit never passed.

**Verify:** e2e green; negatives exit 2.

### Task 11: Python parity (`vwa_parity.py`, stdlib) + `roundHalfEven` preflight + digest preflight

**Test first** (`e2e/…/parity` via a node test that shells Python — guarded,
e2e only): (a) `roundHalfEven` tie vectors match JS byte-for-byte; (b)
declaration digest match JS BEFORE any map compare; (c) full-map equality over
the corpus; (d) **canonical-JSON torture fixture (reviewer nice-fix 2)** — one
object combining non-ASCII text, a large decimal-string `score_nano`, a
negative nano score, and nested keys requiring recursive sort; assert
`canonicalJson` is byte-identical across JS, Python, AND the browser inline
impl (catches canonical drift early, cheaply).

**Implement:** `python/vwa_parity.py` stdlib only: `struct.unpack` f32-LE,
fixed-order float64 dot, explicit `round_half_even`, `score_nano`, θ-flag rule,
grid recount, salted commitments, canonical JSON
(`json.dumps(...,sort_keys=True,separators=(",",":"),ensure_ascii=False)`).
Ed25519 excluded (Node authoritative).

**Verify:** digests match byte-for-byte (record the hashes in the closeout).

### Task 12: Browser verifier + no-egress guard

**Test first** (`e2e/…/browserParity.test.js`): headless page recomputes grid
totality, matrix, flags, conflict, and verifies the Ed25519 signature via
**WebCrypto**; results equal the Node public-tier verdict on every fixture.
CSP-consistency guard asserts the inlined-script sha256 equals the `script-src`
hash.

**Implement:** `browser/vwa-verifier.html` — port 4Y's proven Ed25519 path
verbatim: `pemToDer(pubPem)` → `crypto.subtle.importKey("spki", der,
{name:"Ed25519"}, false, ["verify"])` → `crypto.subtle.verify({name:"Ed25519"},
key, sig, canonicalJson(body))`, with the `if (typeof crypto === "undefined" ||
!crypto.subtle)` degradation guard (4Y `vdr-verifier.html:490`). Inlined sha256

- canonicalJson + grid/matrix/flag/conflict recompute (BigInt string compares,
  no floats); hash-CSP; `EXPECTED_FROZEN` pinned; reset `/g` regex `lastIndex`;
  recompute CSP via Node injection (never `/`-delimited sed). Strict CSP → zero
  external requests (asserted by a request-interception count of 0).

**Verify:** e2e green; recompute CSP hash after any edit.

### Task 13: Lane C capture harness (OFFLINE, sealed, never CI)

**CI-safe schema test (reviewer patch 6):** add `lanec.test.js` — a static
test that validates the sealed ceremony JSON shape for BOTH outcomes
(`captured` | `capture_failed`), asserts the required fields (model id,
revision digest, lens digests, seeds, versions, salted commitments,
`position_rule_id:"all_positions"`), and asserts `lanec/` appears in NO
`node --test` glob and NOT in `check.sh` (the offline boundary). **No tensor
loading, no torch, no model** — schema + boundary only, so malformed ceremony
JSON can't sneak through while the compute stays offline.

**No unit test for the capture itself** (offline torch). Deliverable:
`lanec/capture-workspace-readout.py`

- `lanec/README.md`. Produces, on a pinned Llama-3.2-1B-Instruct revision:
  per-`(prompt,ℓ,t)` activations (ALL token positions — the total position rule)
- per-`(ℓ,k)` post-final-norm-logit VJP lens rows (fp32, fixed seeds),
  salted-committed, plus a ceremony record with
  timestamps/versions/`captured|capture_failed`. **Rejects any non-finite
  (NaN/±Inf) tensor value** before sealing (gauntlet-2 E) — a blown-up gradient
  aborts the capture rather than producing an undefined `score_nano`. Benign
  pinned corpus only; rails frozen; no elicitation/honeypots/organisms/evasion-search. After a `captured`
  run, freeze the tensors into the `frozen_capture` fixture (Task 8 swap) and
  rerun post-processing forever in Lane A. A `capture_failed` seal ships on
  synthetic fixtures — honesty over heroics.

**Verify:** offline; record the ceremony digest + outcome in the closeout.
`grep` confirms `lanec/` is in NO `node --test` glob and NOT in `check.sh`.

**MANDATORY rerun cascade after the `frozen_capture` swap (reviewer patch 5).**
A `captured` run replaces the Task 8 synthetic placeholder with the real frozen
tensors — after which the following MUST be regenerated/re-run IN ORDER, or the
final artifacts still prove the placeholder, not the capture:
`Task 8 (rebuild fixtures + evidence, byte-stable cmp)` → `Task 9 (re-sign
attestation)` → `Task 10 (Lane B re-ceremony)` → `Task 11 (Python parity)` →
`Task 12 (browser parity)` → `Task 15 (K7 + reproduce-all)`. A `capture_failed`
seal skips the cascade and ships on the synthetic fixtures (honestly labelled).

### Task 14: Lean — six theorems, zero sorry

**Test first:** `stage-4-lean-proofs.yml` gains
`lean proofs/stage4z/WorkspaceAttestation.lean` + sorry-grep.

**Implement:** `gridConservation`, `matrixTotal`, `flagAgreement`,
`lexiconMonotone` (the D1 payoff — false under truncation, true here),
`conflictSound` (substantive); `publicSubsetAudit` (lock). Lean 4.15 core,
structural totals, zero `sorry`.

**Verify:** `lean` compiles locally; sorry-grep clean.

### Task 15: VSC projection (PAYS the socket) + composition memo + K7 + reproduce + closeout

**Test first** (`systemCard.test.js`): `renderVsc(spine)` emits a
system-card-shaped doc whose every safety number is a 4W-schema `slot_bound`
span (`evidence_digest`+`recompute_kind`+`claimed_value`) over the spine
artifacts (4T/4U/4X/4Y/4Z); `verifyVsc` reuses the 4W recompute harness with a
VSC `sealed` index + a registered `recompute_kind → fn` per artifact kind, and
runs `scanLeakage` over the narrative (`unverified_prose` stays typed, never
laundered); a flipped `evidence_digest` OR a doctored `claimed_value` →
`recompute_mismatch`. Byte-stable render fixture. Assert `VWA_PAID_SLOT` is
marked and removed from reserved.

**Implement:** `core/systemCard.mjs`. **Zero new raw codes and zero new
verification geometry — but NOT zero new code** (plan-gauntlet P1 correction):
the per-artifact `recompute_kind → fn` registry is new glue over the reused 4W
harness. Map sections to the EU GPAI Model Documentation Form structure (pin
field-level mapping from the fillable form at build time) and Art 55(1)(a).
Write `docs/research/llm-shield/JLENS_COMPOSITION.md` (paper↔Simurgh mapping;
provider-named in research doc, provider-agnostic in artifacts).

**Then:** K7 all-functions e2e net (every export + tamper matrix + cross-stage
invariants incl. `VWA_PUBLIC_CODES ⊆ VWA_AUDIT_CODES` and paid-slot ledger);
`scripts/reproduce-llm-shield-stage4z.sh` (verify-only: both tiers + parity +
Lane B + browser-parity + K7); `check-e2e.sh` line
`"Stage 4Z VWA|scripts/reproduce-llm-shield-stage4z.sh"`; rerun ALL prior
reproduce scripts green; `check.sh` locally; docs-accuracy pass; README banner;
re-score scorecard at closeout.

**Verify:** full `npm test` + all e2e nets + all reproduce scripts green under
Node 26.

---

## Task dependency order

1 → 2 → 3 → 4 → 5 → 6 → 7 → (8, 14 parallel) → 9 → 10 → 11 → 12 → 13 (offline,
any time after 8) → 15 (needs 8–12 + the spine artifacts). Lane C (13) freezes
into 8's `frozen_capture` fixture at closeout; until then a synthetic stand-in
keeps CI green. **If the capture succeeds, the Task 13 rerun cascade
(8→9→10→11→12→15) is MANDATORY before tag** — else the shipped artifacts prove
the placeholder, not the capture (reviewer patch 5).

## Closeout ledger (fill at the end)

- [ ] codes 190–198 shipped; exactly two `exit-map.json` ripples (Node 26)
- [ ] 12 Lane A fixtures byte-stable (`cmp` clean, built twice)
- [ ] Lane B blind ceremony + negatives (exit 2) green
- [ ] Python parity: `roundHalfEven` tie vectors + digest preflight + full-map
      equality — record hashes
- [ ] Browser: WebCrypto verify + 0 external requests; CSP hash pinned
- [ ] Lane C: ceremony digest + outcome (`captured` | `capture_failed`)
- [ ] 6 Lean theorems, zero sorry, CI green
- [ ] VSC PAYS `transparency_report_profile_deferred` (`VWA_PAID_SLOT` marked;
      removed from reserved); 3 sockets minted; net debt +2 stated
- [ ] all prior reproduce scripts green (sealed history undisturbed)
- [ ] K7 net green; `check.sh` clean; docs-accuracy pass
- [ ] scorecard re-scored honestly (Ledger 9.5; Frontier per capture outcome)
- [ ] memory + Zurvan (search dupes first; decision ADR)
