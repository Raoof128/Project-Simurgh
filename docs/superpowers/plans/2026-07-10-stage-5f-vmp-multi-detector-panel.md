# Stage 5F — VMP: Verifiable Multi-detector Panel Attestation (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.**
> Spec: `docs/superpowers/specs/2026-07-10-stage-5f-vmp-multi-detector-panel-design.md`.
> Version **v2.41.0**, raw codes **268–282**, branch `stage-5f-vmp`.
> Marker key: **[S§n]** = spec section n. **[Ln]** = verifier law n. **[①②③]** = beast inventions
> folded in. **[Lean]** = proof obligation. **[C]** = Lane C (non-CI). Every code task is
> **test-first**: failing test → watch it fail → minimal code → green → `npm run format` → validate
> with `npm run format:check` (whole-repo, never a glob).
>
> **Scope honesty:** VMP attests **representation-completeness over a heterogeneous detector panel on
> a shared committed corpus** — panel completeness is NOT detection completeness, and **no aggregate
> panel verdict is produced** [S§1]. Offline pinned weights ≠ hosted endpoint (carries
> `live_endpoint_attestation_deferred`). Two-process/two-key ≠ independent-party verification.

## Ground rules (from the gotcha ledger — read before Task 1)

- **All new runtime modules live in `tools/simurgh-attestation/stage5f/`.** Reuse 5E's BYO-adapter and
  capture patterns and 3V-B's verifier by **copying logic in or invoking a hash-bound copy; NEVER
  `import` from `stage5e/`/`stage3vb/`** at runtime, so a later cleanup can't break the build. (The one
  exception is the **bootstrap runner**, Task 12, which runs a hash-bound _vendored copy_ of each
  historical verifier — not the live one.)
- Raw codes are **additive** in `stage4h/exitCodes.mjs` (5E ends at 267; next is 268). Adding 268–282
  regenerates the 4h exit-map golden + fixtures — a deterministic **golden ripple**. Keep the global
  `exitCodeProbeHygiene.test.js` green (`UNKNOWN_RAW_PROBE=999`) and register 268–282. Regen signed 4h
  digest fixtures with `build-stage4h-digest-fixtures.mjs` **under Node 26 from a CLEAN fixture state**.
- `npm test` = unit only. Byte-stable evidence builds **ONLY under Node 26** (`/opt/homebrew/opt/node@26/bin`).
  **Dir byte-stability:** snapshot sorted per-file `sha256`, rebuild into a clean temp dir, diff the
  hash set, then `git diff --exit-code` (never `cmp`).
- Validate formatting with **`npm run format:check`** (whole-repo). Scores are **decimal strings**;
  every verifier comparison is **scaled-integer** (`"0.8123" → 8123`) — no `Number`/`float`/binary-float
  touches a verdict; **no verifier recomputes softmax**. `canonicalJson` throws on BigInt.
- **The neural forward pass NEVER runs in CI.** CI recomputes only arithmetic/geometry + the
  deterministic **input-adapter replay** (Task 10/20). The models run offline only in Lane C (Task 18).
- **Failure-code distinctions are frozen:** replay executes and disagrees → **276**; historical verifier
  executes and rejects → **278**; Python replay / historical kernel / subprocess **cannot execute** →
  **282** (env-unavailable is NEVER misreported as tampering). `evaluatePanel` never fails open.
- **Acyclic Lane B order (frozen):** result/capture records → `result_chain_head_digest`; the Lane-B
  receipt binds `result_chain_head_digest`; the **closeout** record binds `previous_record_digest =
result_chain_head_digest` AND `blind_recompute_receipt_digest`; the attestation binds the final
  closeout digest. Build in this order.
- `.env` gitignored; never commit/print private keys. Fixture keys live **outside** the evidence dir.

---

## Task 0 — Test-key fixtures + external trust pins

> **[Gauntlet-2 #1]** Keys go in the **established fixture dir**, not `tools/…/keys/`. Verified: 5E uses
> `tests/fixtures/llmShield/stage5e/test-keys/INSECURE_FIXTURE_ONLY_stage-vda.pem` — the
> `INSECURE_FIXTURE_ONLY_` prefix (underscores included) IS the allowlist convention; the earlier
> `[A-Za-z-]+` regex was wrong. **Test the exact paths against the real priv-key audit before committing.**

Create Ed25519 keys in `tests/fixtures/llmShield/stage5f/test-keys/`:

- `INSECURE_FIXTURE_ONLY_stage-vmp.pem` (attestation key)
- `INSECURE_FIXTURE_ONLY_stage-vmp-ceremony.pem` (Lane B ceremony key)

**External trust pins (Gauntlet-2 seam 3 / #6 / #8):** the trusted fingerprints for BOTH the attestation
key and the ceremony key are supplied to the verifier **from outside the evidence pack** — a separate CLI
arg (`--pinned-fingerprint`, `--ceremony-fingerprint`), an installed trust file, or release-pinned config.
`vmp-pinned-key.json` in the pack is **informational only**; the CLI never trusts it by default (else an
attacker swaps key + re-signs + swaps the pin and it self-authenticates — the exact failure the pin
exists to prevent). Public keys derived from private (never commit `.pub.pem`); the builder **never**
writes/prints/copies a private key into the evidence dir (asserted in Task 16 + Task 24).

## Task 1 — Scaffold + constants (`stage5f/constants.mjs`) [S§2]

> **[Gauntlet P0]** The raw **codes** do NOT live here. Verified against `stage4h/exitCodes.mjs`
> (lines 815–840): 5E's named `VDA_*` codes, `VDA_CHECK_ORDER`, `VDA_AUDIT_CODES`, `VDA_PUBLIC_CODES`,
> and `RUN_LEVEL_BY_RAW` all live in that **global ledger**. So the named `VMP_*` codes + order/tier
> arrays go in `stage4h/exitCodes.mjs` (Task 2); `constants.mjs` holds schemas/enums/reserved-slots/
> `scaleDecimal` and **re-exports** `VMP_RAW_CODES` from exitCodes.mjs. (This corrects a mistaken spec
> §2 pushback — there IS a global ledger; I had read only the 4h-family block at the top of the file.)

Test-first: assert the **exact frozen** exports (codes re-exported from Task 2).

```js
export {
  VMP_RAW_CODES,
  VMP_CHECK_ORDER,
  VMP_AUDIT_CODES,
  VMP_PUBLIC_CODES,
} from "../stage4h/exitCodes.mjs";
export const VMP_SCHEMAS = Object.freeze({
  ATTESTATION: "simurgh.vmp.panel_attestation.v1",
  CAPTURE_CENSUS: "simurgh.vmp.capture_census.v1", // audit-private census + attempt log
  LANEB_RECEIPT: "simurgh.vmp.blind_recompute_receipt.v1",
  BYO_PANEL: "simurgh.vmp.byo_panel.v1",
});
export const DECISION_SEMANTICS = Object.freeze([
  "binary_malicious_softmax",
  "categorical_allow_block",
]);
export const CELL_STATUS = Object.freeze([
  "evaluated",
  "not_applicable",
  "unsupported_input",
  "capture_failed",
  "missing_capture",
]);
export const SCORE_PRECISION = 4; // decimal-string, scaled-int compare
export const AGGREGATE_FORBIDDEN_KEYS = Object.freeze([
  "aggregate_verdict",
  "panel_score",
  "consensus",
  "quorum",
]);
export const VMP_RESERVED_SLOTS = Object.freeze([
  "panel_aggregation_policy_deferred",
  "universe_completeness_deferred",
  "panel_contest_deferred",
  "portable_historical_kernel_deferred",
  "multilingual_ruleset_deferred",
  "live_endpoint_attestation_deferred",
  "unicode_confusables_kernel_hardening_deferred",
  "downstream_efficacy_target_deferred",
]);
```

**[Gauntlet-2 #3/#4]** Score comparison uses **no binary floating-point and no `Number` arithmetic on a
verdict.** Validate each score against `new RegExp(\`^(0\\.\\d{${SCORE_PRECISION}}|1\\.0{${SCORE_PRECISION}})$\`)`(range`0.0000`–`1.0000`, exact width) and compare **lexically** — equal-width zero-padded decimals in
[0,1] sort correctly as strings, so `"0.8123" >= "0.5000"`is exact with zero arithmetic. Export`validateScore(str)`(throws on malformed/out-of-range) and`scoreGte(a, b)`(lexical). (BigInt is
unnecessary — but if any op ever needs subtraction, scale to integer <10⁴, which is exact in`Number`.)

## Task 2 — Exit codes 268–282 in the global ledger (`stage4h/exitCodes.mjs`) [additive; golden ripple]

Mirror 5E's block exactly (lines 810–840 for the pattern). Add, all in `exitCodes.mjs`:

- named `VMP_RAW_CODES` (268 `SCHEMA_INVALID` … 282 `INTERNAL_OR_ENV_UNAVAILABLE`, one meaning per
  code; 280 is the sole audit-only code; 281 is the policy code; 282 the wrapper);
- `VMP_CHECK_ORDER = [268…280]` (frozen first-failure order, incl. audit-only 280; 281 policy + 282
  wrapper applied OUTSIDE the array, like 5E's 267);
- `VMP_AUDIT_CODES = [268…280]`; `VMP_PUBLIC_CODES = [268…279]` (public excludes ONLY 280 — census
  needs the audit-private file);
- `RUN_LEVEL_BY_RAW` entries for 268–282.

Test-first: the global `exitCodeProbeHygiene.test.js` stays green (probe with `UNKNOWN_RAW_PROBE=999`,
never a bare literal); assert each new code is uniquely named and present in `RUN_LEVEL_BY_RAW`.
Regenerate the 4h signed digest fixtures with `build-stage4h-digest-fixtures.mjs` **under Node 26 from a
clean fixture state** (deterministic golden ripple). Run the frozen prior-reproduce list
(`4y,4z,5a,5b,5c,5d,5e`) — all must stay green (additive non-disturbance).

## Task 3 — Schema gate (`stage5f/core/schema.mjs`) [S§2 / 268]

Test-first: valid bundle → `null`; wrong `schema` → 268; unknown top-level key → 268; **any
`AGGREGATE_FORBIDDEN_KEYS` present anywhere → 268** (aggregate-absence enforced structurally, per the
`VerifierCodomainHasNoAggregate` lemma). Export `checkSchema(bundle)`. `BUNDLE_KEYS` is the exact frozen
key set (incl. `detector_universe`, `coverage`, `closeout`).

## Task 4 — Signature gate (`stage5f/core/signature.mjs`) [S§2 / 269]

Test-first: pinned fingerprint mismatch → 269 (checked **first**, before verify); tampered content →
269; valid → `null`. Export `checkSignature(bundle, pinnedKeyFingerprint)` + `keyFingerprint(pem)` +
`signBundle(content, privatePem)` + `contentOf(bundle)` (bundle minus `signature`). Embedded key is
informational only; the external pin decides trust.

## Task 5 — Evidence chain (`stage5f/core/chain.mjs`) [S§3 / 270 / L3]

Test-first: contiguous `0..N` with one record per position, single terminal head, precommit@0, every
record linked via `previous_record_digest`, attestation binds the final closeout digest → `null`; a
fork / duplicate position / gap / result before precommit / closeout not binding the receipt digest → 270. Export `checkChain(bundle)`, `chainHead(records)`, `resultChainHeadDigest(records)` (head **before**
closeout). No wall-clock assertions anywhere.

## Task 6 — Panel plan + universe (`stage5f/core/plan.mjs`) [S§2 / 271 / L3 / L6 / ①]

Test-first: `panel_plan_digest == hash(schema_ver + roster_digest + corpus_digest + applicability_digest

- adapter_manifest_digest + universe_digest)`→ else 271; roster member missing a required field → 271;
roster hash ≠`roster_digest` → 271; **`universe`hashes ≠`universe_digest`→ 271; a roster member not in`detector_universe.candidates` (`roster ⊄ universe`) → 271** (Law 6). Export `checkPlan(bundle)`,
`panelPlanDigest(subdigests)`.

## Task 7 — Corpus binding (`stage5f/core/corpus.mjs`) [S§2 / 272]

Test-first: cases hash to `corpus_digest` → else 272; a cell referencing a `case_id` not in the corpus → 272. Export `checkCorpus(bundle)`.

## Task 8 — Cell matrix + status union (`stage5f/core/matrix.mjs`) [S§2 / 273 / 274 / L1]

Test-first (273): exactly one cell per `(member × case)` — an absent pair → 273, a duplicate → 273;
`|cells| == |roster|·|corpus|`. Test-first (274): status ∈ `CELL_STATUS`; **only `evaluated` carries a
`decision_evidence`** → else 274; `capture_failed` carries a bounded `error_reason` (e.g.
`unexpected_categorical_output`) and no verdict → else 274. Export `checkMatrix`, `checkStatusUnion`.

## Task 9 — Applicability soundness (`stage5f/core/applicability.mjs`) [S§2 / 275 / L4]

Test-first: a `not_applicable` cell **entailed** by `applicability_matrix` → `null`; a `not_applicable`
on an `applicable:true` pair → 275; an `unsupported_input` **entailed** by the member's
`capability_profile` (language/`max_input_tokens`/type) → `null`; a fabricated one → 275. Export
`checkApplicability(bundle)`.

## Task 10 — Adapter binding (`stage5f/core/adapter.mjs`) [S§2 / 276 / L2]

Test-first: for each `evaluated` cell, given a supplied **replay result**
(`{ case_id, member_id, detector_input_digest }` from the Python replay, Task 20), assert
`cell.detector_input_digest === replay.detector_input_digest` and the cell's
`adapter_digest`/`tokenizer_manifest_digest`/`truncation_policy_digest` equal the roster member's → else 276. **If the replay result is absent/undefined → the caller (vmpCore) returns 282, never 276** (Task 15).
Export `checkAdapter(bundle, replayResults)` — pure; consumes results, does not execute.

## Task 11 — Verdict registry (`stage5f/core/verdict.mjs`) [S§2 / 277]

Test-first: closed registry keyed by `decision_semantics`. `binary_malicious_softmax`:
`scaleDecimal(positive_score) >= scaleDecimal(threshold)` ⇒ label `malicious` else `benign`, compared to
the cell's declared label → else 277; **no softmax recomputation**. `categorical_allow_block`: rerun the
pinned parser (`parser_digest`) over the bounded canonical output token, derive `normalised_label`,
compare → else 277. An unknown `decision_semantics`, or any cross-semantics mapping attempt → 277. Export
`checkVerdict(bundle)`, `VERDICT_REGISTRY`.

## Task 12 — Bootstrap provenance (`stage5f/core/bootstrap.mjs` + `node/historicalVerifierRunner.mjs`) [S§2 / 278]

Test-first (pure core): given a runner result `{ imported_from, recorded_raw, ok }`, assert each
`bootstrap_provenance` entry's `{release_tag, commit, bundle_digest, original_schema,
original_key_fingerprint, recorded_raw}` matches and `ok === true` with `recorded_raw` as declared → else
278; **imports are never counted as panel verdicts** (assert they contribute zero cells). Export
`checkBootstrap(bundle, runnerResults)` — pure.
Runner (`node/historicalVerifierRunner.mjs`, impure): loads a **hash-bound vendored copy** of the 5E
(`evaluateVda`) and 3V-B verifier from `stage5f/bootstrap/`, verifies each copy against
`historical-pins.json` (`verifier_source_digest` = full transitive kernel manifest) **before** execution,
runs it, returns the canonical result. If it cannot execute → the caller returns **282** (Task 15).
**[Gauntlet P2] Fallback:** 3V-B's verifier is a top-level script (`verify-stage3vb-external-defense.mjs`),
not a clean module — if vendoring its full transitive kernel proves impractical, 278 downgrades to the
signed **"historical artifact reference binding"** floor (metadata + digest equality only), and the
`bootstrap_provenance` entry sets `provenance_mode: "reference_binding"` so the weaker claim is explicit,
never silently substituted for a verifier re-run. Decide empirically in this task, not in prose.

## Task 13 — Completeness + coverage (`stage5f/core/completeness.mjs`) [S§2 / 279 / 281 / ①③]

Test-first (279): recompute `representation_complete` (must be `true` in a valid bundle),
`evaluation_complete = (all applicable&supported evaluated ∧ capture_failed==0 ∧ missing_capture==0)`,
and the histogram; a declared flag/histogram ≠ recomputed → 279 (renamed `VMP_DERIVED_SUMMARY_MISMATCH`,
frozen `reason` enum — see Gauntlet-2 amendment). **Coverage (①/③):** recompute
`omission_lower_bound == universe_size − panel_size` and the raw **`member_positive_vector`** — for each
case, each member's boolean "returned its **own** declared-positive class" (`malicious` for PG2, `block`
for LG4; no shared "catch", no "exactly one" aggregate); declared ≠ recomputed → 279.
**Inventions A + C (projections, tested against `_validBundle`):** `evaluatedObligationFraction(bundle)`
= evaluated ÷ **applicable-and-supported** obligations, published beside the status histogram (non-claim:
"coverage figure, not a detection rate"); `disagreementLedger(bundle)` = per-case list where the raw
`member_positive_vector` entries differ, surfaced as **observation, never a verdict**. Pure projections —
no new raw code.
Test-first (281): `evaluatePolicy(result)` returns 281 iff `evaluation_complete === false` (strict). Export
`checkCompleteness`, `evaluatePolicy`, `evaluatedObligationFraction`, `disagreementLedger`.

## Task 14 — Audit census bijection (`stage5f/core/census.mjs`) [S§2 / 280 / L5]

Test-first: given `auditPrivate` (the `capture_census.v1`), assert a **bijection over ALL statuses** —
every public cell ↔ exactly one terminal census record and back (a dropped `capture_failed`/
`unsupported_input`/`missing_capture` record → 280, a phantom record → 280); every capture attempt links
to exactly one terminal record; `sha256(canonicalJson(auditPrivate)) === capture_log_digest` → else 280.
Audit-tier only. Export `checkCensus(bundle, auditPrivate)`.

## Task 15 — VMP core evaluator (`stage5f/core/vmpCore.mjs`) [S§2 / frozen order / 282]

Test-first: `evaluatePanel(bundle, opts)` runs the frozen order **268→269→270→271→272→273→274→275→276→277
→278→279**, then (audit) **280**, then policy **281**; returns `{ raw, tier, attestation_valid,
representation_complete, evaluation_complete, policy_accepted }`. `--attestation-only` skips 281.
Structured result even on strict rejection (`raw:281, attestation_valid:true, ...`). **`evaluatePanelSafe`
wraps any throw → 282; a missing replay/runner result (env-unavailable) → 282** (never 276/278/fail-open).
`vmpCore` receives replay + runner results via `opts`; it **never** trusts a bundle field like
`recorded_raw`.

## Task 16 — Build/verify CLIs + byte-stable evidence (`stage5f/node/{build-vmp-evidence,greenBundle,verify-vmp-attestation}.mjs`) [S§3/§5]

Test-first: `greenBundle.mjs` assembles canonical content, signs with the fixture key (external pin),
binds the final closeout digest. `build-vmp-evidence.mjs` writes
`docs/research/llm-shield/evidence/stage-5f/`: `vmp-attestation.json`, `vmp-pinned-key.json`,
`roster-precommit.json` + chain records, `shared-corpus.json` (**safe source bytes**), `capture-census.json`
(digest == `capture_log_digest`), `laneb-receipt.json`. **Asserts no private key bytes appear in the
evidence dir.** `verify-vmp-attestation.mjs`: **strict by default** (→ 281), `--attestation-only`,
`--tier audit`; prints the structured object, non-zero exit preserving `attestation_valid`. Byte-stable:
rebuild into a temp dir, diff sorted `sha256` set, `git diff --exit-code`.

## Task 17 — Lane B ceremony + receipt (`stage5f/laneb/{run-laneb-recompute-ceremony,verify-laneb-receipt}.mjs`) [S§3 / acyclic]

Test-first: process 1 (JS) emits canonical content + `panel_plan_digest` + `cell_matrix_digest` +
`completeness_digest` + `result_chain_head_digest`; process 2 (Python, `laneb/recompute.py`) independently
recomputes and asserts equality. Emit signed `blind_recompute_receipt.v1` (ceremony key) binding those
five digests. `verify-laneb-receipt.mjs`: sig valid + pinned ceremony fingerprint + each digest equals
the public/audit artifact → else fail; assert the closeout record's `blind_recompute_receipt_digest`
matches. Claim string: "two-process/two-key separation, not independent-party verification."

## Task 18 — Lane C offline dual capture (`stage5f/lanec/`) — non-CI [S§3 / C / ③]

`capture_pg2.py` (Prompt Guard 2 86M, local M2) + `capture_lg4.py` (Llama Guard 4 12B, 8-bit/droplet),
each with `requirements-pg2.lock`/`requirements-lg4.lock`. **Acquisition lifecycle:** acquire pinned
snapshots → verify manifests/digests → `HF_HUB_OFFLINE=1`+`TRANSFORMERS_OFFLINE=1` → capture from cache.
Both evaluate the **exact shared corpus** (identical `case_id` + `source_input_digest`). **[Gauntlet P2]
"Disagreement-mining" (③) SELECTS from the precommitted safe base families the cases that happen to
disagree — it does NOT author new potent evasion strings** (AnthropicSafe: same posture as 5E — inputs
only, no generation preserved; categorical output = bounded allow/block token, else
`capture_failed`/`unexpected_categorical_output`; the corpus is committed in the panel plan _before_
capture, so mining cannot be a post-hoc content-generation loop). Each capture emits a hash-bound fragment;
`merge_capture_census.py` checks the common corpus and builds the unified `capture_census.json` (all
statuses). **Transcript-free metadata-and-verdict evidence** into the bundle (not "digest-only"); an
unexpected/refusal output maps to the frozen `capture_failed`/`unexpected_categorical_output` — **there is
no `model_refused` status**. Verdicts recorded honestly, no re-runs. Records the executed run (Frontier
lever) over the **full** committed corpus (no disagreement "mining" — see Gauntlet-2 amendment).

## Task 19 — BYO-Panel adapter contract (`stage5f/node/byoPanelAdapter.mjs` + README) — [②]

Test-first: given a caller's `byo_panel.v1` descriptor (their roster + universe + capability profiles +
adapter manifest) and their captured fragments, produce a valid `panel_attestation.v1` bundle that passes
`evaluatePanel`. README: any team runs VMP on their own detectors offline. Non-claim baked into output +
docs: "a BYO run is the caller's evidence; we verify the contract, we do not endorse the panel."

## Task 20 — Python + browser parity (`stage5f/python/{vmp_parity,vmp_adapter_replay,vmp_bootstrap_verify}.py`, `stage5f/browser/`) [S§3]

Test-first (parity, Node↔Python **full precedence**): same tampered input → same raw across runtimes;
`canonicalJson` byte-equality; scaled-int verdict; completeness/coverage/policy arithmetic. `vmp_adapter_replay.py`:
**pinned-env** deterministic input-adapter replay regenerating `detector_input_digest` (pins
python/transformers/tokenizers/sentencepiece + tokenizer snapshot + chat-template digest + special-token
config + truncation/padding). `vmp_bootstrap_verify.py`: parity historical-verifier runner. Browser
(`browser/verify-vmp-portable.js`, `canonical-json.js`, `index.html` + CSP): **portable surface only**,
returns `{ verification_scope:"portable", portable_valid, full_attestation_status:"not_evaluated",
historical_verifier_execution:false, audit_census_verified:false, raw:null }` — **never `raw:0`**.

## Task 21 — Lean proofs (`proofs/stage5f/PanelCompleteness.lean`) [Lean]

Test-first: zero-`sorry` scan. Prove the **8 theorems + 1 lemma** [S§4]: `CellMatrixBijection`,
`AdapterBindingSound`, `AcceptedChainBindsSinglePlan` (names the assumed crypto trust condition — no
collision-resistance proved), `CensusTerminalBijection` (all statuses), `CompletenessNoLaunder`,
`ApplicabilityStatusSound`, `StrictPolicyMayRejectValidAttestation` (non-equivalence, not independence),
`RosterSubsetUniverseAndBound` (L6: `roster ⊆ universe` ∧ `omission_lower_bound = |universe \ roster|`
exact); lemma `VerifierCodomainHasNoAggregate` (structural codomain, not an impossibility claim). Gated by
`stage-4-lean-proofs.yml` (Lean is **not** in check.sh).

## Task 22 — Per-runtime verification gates + K7 net + tamper matrix (`tests/e2e/llmShield/stage5f/`)

`k7AllFunctions.test.js` exercises every JS export; **per-runtime gates reported separately** (JS K7 /
Python pytest+coverage / CLI command matrix strict|attestation-only|audit asserting the structured
`{...raw:281}` / browser portable-function net / Lean zero-sorry). **Tamper matrix:** one isolated
mutation per load-bearing field class and per raw-code branch 268→282, plus generated unknown-key /
duplicate-cell / chain-fork / roster-not-in-universe / dropped-census-record families. **Invention B —
the Cherry-Pick Test** (named fixture family): a "tempting" panel where dropping detector D would flip
the _reported_ outcome flagged→clean; the fixture asserts the attestation still carries D's cell (fails
273/280 if omitted). Cross-stage invariant: the bootstrap re-run still yields 5E/3V-B's recorded raws.

## Task 23 — Reproduce script + conformance pack (`scripts/reproduce-llm-shield-stage5f.sh`, `stage5f/conformance-pack/`)

**Fail-closed, two-line gates** — never `cmd && echo "OK"` under `set -euo pipefail`. Pack
(`run.sh`/`README.md`/`DROPLET_SETUP.md`) mirrors 5E's independent-party kit with the fail-open fixes +
**full explicit deps** (incl. `exitCodes.mjs`) copied via a fail-closed `copy_path` from the start. Run
under Node 26; confirm the frozen prior-reproduce list still green.

## Task 24 — Security audits, scripts, self-review gate

Priv-key audit (fixture keys allowlisted by path regex, outside evidence dir, none in evidence); overclaim
scan; whole-repo `npm run format:check`; `check.sh` locally (prettier config, `fetch-depth:0` checks,
exit-map ripple). Self-gauntlet the diff: stale paths, checks passing for the wrong reason, fixtures
testing an easier rule than claimed.

## Task 25 — Closeout (MANDATORY order)

K7 + full reproduce green (+ frozen prior scripts) → `check.sh` → PR with honest scope section → CI green
→ rebase-merge → **reset local main to origin/main** → tag `v2.41.0-stage-5f-vmp` → reproduce ON MAIN →
closeout doc with re-scored scorecard (Frontier moves only if Lane C executed) → README banner +
north-star update → memory write (MEMORY.md pointer + project file + gotchas) → Zurvan ingest (search
duplicates first; add an ADR).

---

## Gauntlet round 2 — binding amendments (all verified correct; 3 refined with receipts)

These amend the tasks above and are binding on the implementer.

**Seam 1 — final-evidence build order [#14].** Task 16 implements + unit-tests the builder against
**synthetic fixtures** (fake census/receipt); it does NOT produce shippable evidence. The **real**
evidence is generated LAST, in this exact order (a new closeout sub-step, before Task 25's reproduce):
Lane C capture (Task 18) → `merge_capture_census.py` → result/capture chain → Lane B receipt (Task 17) →
closeout record → signed attestation → byte-stability verify. Nothing signs the final bundle before the
receipt and real census exist.

**Seam 2 — no reconstructed aggregate [#13/#15/additional-5/6/9].** Remove `sole_catcher_cases` and any
"catch"/"catcher" framing from the SIGNED path. Publish instead a raw **`member_positive_vector`** per
case: for each member, the boolean "this member returned **its own declared-positive class**" — no shared
"catch" notion, no "exactly one" aggregate. `disagreementLedger` reports cases where these raw vectors
differ, as **observation, never verdict**. **Invention ③ is reframed to "Full-Corpus Disagreement
Observation":** evaluate the **entire** precommitted safe corpus (no selection/"mining" — that reintroduced
selection bias); disagreement is whatever the full corpus shows, with **no prevalence claim**. Rename
"Cherry-Pick Test" assertion (#15) to: _"D is the only member returning its own declared-positive result
for the case; omitting D erases that member-specific observation"_ — it proves omission **visibility**, not
a clean/flagged panel outcome. Rename PCR → **`evaluated_obligation_fraction`** = evaluated ÷
**applicable-and-supported** obligations, always published beside the status histogram (#5). Rename 279 →
**`VMP_DERIVED_SUMMARY_MISMATCH`** with a frozen `reason` enum (`completeness_flag` / `histogram` /
`omission_bound` / `positive_vector` / `derived_fraction`) — restores one-meaning-per-code (#6).

**Seam 3 — pins outside the pack [#6/#8]:** handled in Task 0. Additionally, the **Lane B receipt (#8)
re-binds `capture_log_digest`** (it was dropped): the receipt binds `{panel_plan_digest, cell_matrix_digest,
completeness_digest, capture_log_digest, result_chain_head_digest}` — otherwise the ceremony doesn't
corroborate the private census. Ceremony-key fingerprint pinned externally (Task 0).

**Schema/matrix hardening.**

- **[#5] Recursive exact-key validation (268):** freeze exact nested schemas for `roster` member, `cell`,
  `decision_evidence`, `coverage`, `detector_universe`, `roster_precommit`, `closeout`; reject unknown keys
  **recursively** (aggregate fields can't hide in a nested object). Lean lemma and schema enforcement are
  **separate controls** (#smaller-137).
- **[additional-1] Uniqueness + non-empty (271–273):** unique `member_id`, unique `case_id`, unique universe
  candidate IDs, unique applicability entries; non-empty roster and corpus. Without these, `|cells| =
|roster|·|corpus|` can pass on a malformed matrix.
- **[additional-2/#11] Status tagged-union (274):** freeze required/forbidden fields per status —
  `evaluated`{decision*evidence, input binding, terminal-census ref; ⊘error}, `capture_failed`{bounded
  error enum, **input binding**, attempt ref; ⊘verdict}, `unsupported_input`{capability derivation/ref;
  ⊘verdict,⊘output}, `not_applicable`{applicability-matrix ref; ⊘verdict,⊘attempt}, `missing_capture`
  {obligation ref + explicit reason; ⊘verdict,⊘attempt}. \*\*Adapter/input binding is required for every
  \_attempted* capture, incl. `capture_failed`\*\* (#11). Bounded error enum, never free text. Remove
  `model_refused` (#additional-10) — it maps to `capture_failed`/a frozen reason. No `model_refused`
  status or semantic exists.

**Verdict + applicability soundness.**

- **[additional-3] PG2 class binding (277):** the member declares `label_map`, `positive_class_index`,
  `positive_label`; the capture fragment proves `positive_score` came from that index (else a producer
  passes the benign-class score and still satisfies the arithmetic).
- **[additional-4] Categorical (277):** if the only accepted outputs are the bounded tokens `allow`/`block`,
  the verifier **validates a bounded token** (+ `parser_digest` over the pinned parser source/manifest) —
  it does NOT claim to replay arbitrary generation parsing. Say so.
- **[#10] Applicability/replay dependency (275/276):** `unsupported_input` justified by **token length**
  must consume **replay-derived** token counts; a missing replay fails **282 before 275** can accept it
  (a producer can't commit a false token count to hide a hard case). Language/type applicability stays
  static from the capability profile.

**Chain / bootstrap / BYO / parity / tamper / release.**

- **[#7] Chain-record binding:** every external chain-record file is bound by the signed bundle — either
  inline, or via an exact sorted **chain-record manifest** with each file digest. **[#8-plan-digest]**
  `panel_plan_digest` is a **domain-separated canonical object digest** (`canonicalJson` of the subdigest
  object), never raw string concatenation; the spec + precommit schema are amended to include
  `universe_digest` (done). **[additional/stable-IDs]** every attempt and terminal census record carries a
  stable `record_id`; the bijection keys on `record_id`, not only `(member_id, case_id)`.
- **[#12] Bootstrap — resolved, not deferred:** default mode is **historical-verifier execution** (both 5E
  `evaluateVda` and 3V-B verify scripts were verified runnable offline). **`reference_binding`** is a
  distinct, explicitly-declared mode (`provenance_mode` field) with its **own claim wording, fixtures, and
  policy** — never a silent mid-build downgrade. The vendored kernel carries its own manifest (entry +
  imports + exit-map + key + schema/constants + dep closure) with a path-containment closure test.
- **[additional-12] BYO profile:** a BYO panel has **no 5E/3V-B bootstrap requirement** (`bootstrap_provenance`
  optional/empty; `provenance_mode: "none"`), supports **only the frozen decision-semantics registry**
  unless a new schema version adds types, and supplies its **own** external pins. State this in the
  `byo_panel.v1` contract + README.
- **[additional-13] Parity capability table:** 268–277, 279–281 are **independently reimplemented** in
  Python; **278's historical-verifier run is a shared vendored kernel invoked via subprocess** (orchestration
  parity, named as such — not independent). Freeze the table in `vmp_parity.py`'s header.
- **[additional-7] Public output fields:** public/`--attestation-only` results always carry
  `audit_census_verified:false` and `full_panel_completeness_verified:false` so "policy accepted" is never
  mistaken for audit completeness. **`--tier audit` is the release-reproduce default** whenever the census
  file is present.
- **[#14/tamper] Three suites (Task 22):** `tamper-matrix` (268–280, integrity) / `policy-fixtures` (281,
  honest rejection) / `environment` (282, throw/unavailable) — an honestly-incomplete panel or a missing
  Python env is **never** labelled "tampering."
- **[additional-16] Release ceremony (Task 25):** after tag → **create the GitHub Release, verify it exists
  and is marked Latest**, confirm tag presence is not mistaken for Release publication (the 5C/5E lesson).
- **Smaller:** keep `greenBundle.mjs` (rejected the rename — it is the established house name, 5E ships
  `stage5e/node/greenBundle.mjs`; renaming for 5F alone breaks the cross-stage convention); reference
  exit-code blocks by exported symbol, not line numbers; Checkpoint A wording → "the **evidence pack**
  (incl. private census) verifies at both tiers," not "public bundle" (done).

---

## Execution order & checkpoints

- **Pure core first (Tasks 3–15):** each is independently testable against `_validBundle.mjs`; build the
  frozen check order incrementally, watching each new code fail then pass.
- **Checkpoint A (after Task 16):** the builder produces, from synthetic fixtures, an **evidence pack (incl.
  private census)** that verifies at both tiers under Node 26.
- **Checkpoint B (after Task 20):** Node↔Python raw-code precedence is identical on the tamper matrix
  (per the parity capability table — 278 is shared-kernel).
- **Checkpoint C (after Task 18, non-CI):** the real dual-detector **full-corpus** capture executes offline;
  census bijection (280) closes over it. This is the Frontier lever — if it does not execute, Frontier is
  scored down at closeout and the reason stated (5A/5C precedent).
- **Final-evidence generation (Seam 1 order):** Lane C → merged census → chain → Lane B receipt → closeout
  → signed attestation → byte-stability, run LAST before reproduce-on-main.
- **Batched question before Task 1:** raise any plan concern as ONE batch; then run task-by-task, stopping
  only for a real blocker or genuine ambiguity.
