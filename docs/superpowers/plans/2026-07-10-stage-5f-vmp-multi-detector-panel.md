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
>
> This plan has **no separate amendment layer** — every gauntlet correction is merged into its owning
> task, so the first instruction an implementer reads is the correct one.

## Ground rules (from the gotcha ledger — read before Task 1)

- **All new runtime modules live in `tools/simurgh-attestation/stage5f/`.** Reuse 5E's BYO-adapter and
  capture patterns and 3V-B's verifier by **copying logic in or invoking a hash-bound copy; NEVER
  `import` from `stage5e/`/`stage3vb/`** at runtime. The one exception is the **bootstrap runner**
  (Task 12), which runs a hash-bound _vendored copy_ of each historical verifier.
- Raw codes are **additive** in the global ledger `stage4h/exitCodes.mjs` (5E ends at 267; next is 268).
  Adding 268–282 regenerates the signed 4h digest fixtures — a deterministic **golden ripple**. Keep
  `exitCodeProbeHygiene.test.js` green (`UNKNOWN_RAW_PROBE=999`); regen with
  `build-stage4h-digest-fixtures.mjs` **under Node 26 from a CLEAN fixture state**.
- `npm test` = unit only. Byte-stable evidence builds **ONLY under Node 26** (`/opt/homebrew/opt/node@26/bin`).
  **Dir byte-stability:** snapshot sorted per-file `sha256`, rebuild into a clean temp dir, diff the
  hash set, then `git diff --exit-code` (never `cmp`).
- **Score handling (single design, frozen):** scores are decimal strings; **no binary floating-point
  and no `Number` arithmetic ever touches a verdict.** Verdict comparison is **lexical over validated
  equal-width decimal strings** (`validateScore` + `scoreGte`; no `scaleDecimal`). Counts/fractions are
  exact integers or `{numerator, denominator}` objects — never a serialized float. **No verifier
  recomputes softmax.**
- **The neural forward pass NEVER runs in CI.** CI recomputes only arithmetic/geometry + the
  deterministic **input-adapter replay** (Tasks 10/15/20). Models run offline only in Lane C (Task 18).
- **Failure-code distinctions are frozen:** replay executes and disagrees → **276**; historical verifier
  executes and rejects → **278**; a required replay/runner result **cannot be produced** → **282**
  (env-unavailable is NEVER misreported as tampering, and 282 has its own test suite). `evaluatePanel`
  never fails open.
- **Acyclic Lane B order (frozen):** result/capture records → `result_chain_head_digest`; the Lane-B
  receipt binds `result_chain_head_digest`; the **closeout** record binds `previous_record_digest =
result_chain_head_digest` AND `blind_recompute_receipt_digest`; the attestation binds the final
  closeout digest.
- **Final evidence is generated LAST** (see Task 24b), never during builder implementation.
- `.env` gitignored; never commit/print private keys. Fixture keys live **outside** the evidence dir.

---

## Task 0 — Test-key fixtures + external trust pins

Keys go in the established fixture dir (verified: 5E uses
`tests/fixtures/llmShield/stage5e/test-keys/INSECURE_FIXTURE_ONLY_stage-vda.pem`; the
`INSECURE_FIXTURE_ONLY_` prefix, underscores included, IS the allowlist convention). Create in
`tests/fixtures/llmShield/stage5f/test-keys/`:

- `INSECURE_FIXTURE_ONLY_stage-vmp.pem` (attestation key)
- `INSECURE_FIXTURE_ONLY_stage-vmp-ceremony.pem` (Lane B ceremony key)

**Test the exact paths against the real priv-key audit before committing.** **External trust pins:** the
trusted fingerprints for BOTH keys are supplied to the verifier **from outside the evidence pack** — a
separate CLI arg (`--pinned-fingerprint`, `--ceremony-fingerprint`), an installed trust file, or
release-pinned config. `vmp-pinned-key.json` in the pack is **informational only**; the CLI never trusts
it by default (else an attacker swaps key + re-signs + swaps the pin and it self-authenticates). Public
keys derived from private (never commit `.pub.pem`); the builder **never** writes/prints/copies a private
key into the evidence dir (asserted in Tasks 16 + 25a).

## Task 1 — Scaffold + constants (`stage5f/constants.mjs`)

Codes do NOT live here — they live in the global ledger (Task 2). `constants.mjs` holds schemas, enums,
reserved slots, and the score helpers, and **re-exports** the code arrays from `stage4h/exitCodes.mjs`.

```js
export {
  VMP_RAW_CODES,
  VMP_CHECK_ORDER,
  VMP_AUDIT_CODES,
  VMP_PUBLIC_CODES,
} from "../stage4h/exitCodes.mjs";
export const VMP_SCHEMAS = Object.freeze({
  ATTESTATION: "simurgh.vmp.panel_attestation.v1",
  CAPTURE_CENSUS: "simurgh.vmp.capture_census.v1",
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
export const PROVENANCE_MODES = Object.freeze(["historical_verifier", "reference_binding", "none"]);
export const SCORE_PRECISION = 4;
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

Score helpers (lexical only, no arithmetic on a verdict): `validateScore(str)` throws unless
`new RegExp(\`^(0\\.\\d{${SCORE_PRECISION}}|1\\.0{${SCORE_PRECISION}})$\`)`matches (range`0.0000`–`1.0000`,
exact width); `scoreGte(a, b)` validates both then compares **lexically** (`a >= b`) — equal-width
zero-padded decimals in [0,1] sort correctly as strings. There is no `scaleDecimal`.

## Task 2 — Raw codes 268–282 in the global ledger (`stage4h/exitCodes.mjs`)

Mirror 5E's block (its named `VDA_*` codes + `VDA_CHECK_ORDER` + `VDA_AUDIT_CODES`/`VDA_PUBLIC_CODES` +
`RUN_LEVEL_BY_RAW` are the template). Add the **exact frozen named map** (one meaning per code):

```
268 VMP_SCHEMA_INVALID              275 VMP_APPLICABILITY_INVALID       281 VMP_EVALUATION_INCOMPLETE_POLICY
269 VMP_SIGNATURE_INVALID           276 VMP_ADAPTER_BINDING_INVALID     282 INTERNAL_OR_ENV_UNAVAILABLE_VMP
270 VMP_CHAIN_INVALID               277 VMP_VERDICT_INVALID
271 VMP_PANEL_PLAN_INVALID          278 VMP_BOOTSTRAP_PROVENANCE_INVALID
272 VMP_CORPUS_BINDING_INVALID      279 VMP_DERIVED_SUMMARY_MISMATCH
273 VMP_CELL_MATRIX_INVALID         280 VMP_CENSUS_BIJECTION_INVALID
274 VMP_CELL_STATUS_INVALID
```

Arrays (naming mirrors 5E — `*_AUDIT_CODES`/`*_PUBLIC_CODES` mean "codes executed in that tier," NOT
"tier-only"; the audit-only set is `{280}`):

- `VMP_CHECK_ORDER = [268…280]` (frozen first-failure order, incl. audit-only 280; **281 policy + 282
  wrapper are applied OUTSIDE the array**, like 5E's 267);
- `VMP_AUDIT_CODES = [268…280]` (full set run in the audit tier);
- `VMP_PUBLIC_CODES = [268…279]` (public excludes ONLY 280 — census needs the audit-private file);
- comment: `// audit-only = VMP_AUDIT_CODES \ VMP_PUBLIC_CODES = [280]`.

`RUN_LEVEL_BY_RAW`: **268–282 all map to run level `1`** (mirrors 5E's 255–267, incl. the wrapper). 282
doubles as the env-unavailable code; its tampering-vs-environment distinction is carried by the code
number + its dedicated test suite (Task 22), not by a different run level.

Test-first: `exitCodeProbeHygiene.test.js` stays green (probe with `UNKNOWN_RAW_PROBE=999`, never a bare
literal); assert every 268–282 code is uniquely named and present in `RUN_LEVEL_BY_RAW`. Regen the 4h
signed digest fixtures under Node 26 from a clean state. Run the frozen prior-reproduce list
(`4y,4z,5a,5b,5c,5d,5e`) — all green (additive non-disturbance).

## Task 3 — Schema gate (`stage5f/core/schema.mjs`) [268]

Test-first: valid bundle → `null`; wrong `schema` → 268; **recursive exact-key validation** — freeze the
exact nested schema for `roster` member, `cell`, `decision_evidence`, `coverage`, `detector_universe`,
`roster_precommit`, `closeout`, and reject any unknown key at **any depth** → 268 (aggregate fields can't
hide in a nested object); any `AGGREGATE_FORBIDDEN_KEYS` anywhere → 268. Export `checkSchema(bundle)`.
(The Lean `VerifierCodomainHasNoAggregate` lemma and this recursive schema check are **separate
controls** — the lemma is about our output type, this is input validation.)

## Task 4 — Signature gate (`stage5f/core/signature.mjs`) [269]

Test-first: externally-supplied pinned fingerprint mismatch → 269 (checked **first**, before verify);
tampered content → 269; valid → `null`. Export `checkSignature(bundle, pinnedKeyFingerprint)` +
`keyFingerprint(pem)` + `signBundle(content, privatePem)` + `contentOf(bundle)`. The embedded key is
informational; the external pin decides trust.

## Task 5 — Evidence chain (`stage5f/core/chain.mjs`) [270 / L3]

Test-first: contiguous `0..N`, one record per position, single terminal head, precommit@0, every record
linked via `previous_record_digest`, attestation binds the final closeout digest → `null`; fork /
duplicate position / gap / result before precommit / closeout not binding the receipt digest → 270. Every
chain-record file is bound by the signed bundle via an exact **sorted chain-record manifest** (each file
digest) — validated here. Export `checkChain(bundle)`, `resultChainHeadDigest(records)` (head **before**
closeout). No wall-clock assertions.

## Task 6 — Panel plan + universe (`stage5f/core/plan.mjs`) [271 / L3 / L6 / ①]

`panel_plan_digest = sha256(DOMAIN_SEP || canonicalJson({ schema, roster_digest, corpus_digest,
applicability_digest, adapter_manifest_digest, universe_digest }))` — a domain-separated canonical
**object** digest, never string concatenation. Test-first → 271 on: digest mismatch; a roster member
missing a required field; roster hash ≠ `roster_digest`; universe hash ≠ `universe_digest`; **a roster
member ∉ `detector_universe.candidates` (`roster ⊄ universe`, Law 6)**; **non-unique** `member_id` or
universe candidate ID; **empty** roster. Export `checkPlan(bundle)`, `panelPlanDigest(obj)`.

## Task 7 — Corpus binding (`stage5f/core/corpus.mjs`) [272]

Test-first → 272 on: cases hash ≠ `corpus_digest`; a cell referencing an uncommitted `case_id`;
**non-unique** `case_id`; **empty** corpus. Export `checkCorpus(bundle)`.

## Task 8 — Cell matrix + status union (`stage5f/core/matrix.mjs`) [273 / 274 / L1]

Test-first (273): exactly one cell per `(member × case)` — absent pair → 273, duplicate → 273;
`|cells| == |roster|·|corpus|` (holds only with the Task 6/7 uniqueness). Test-first (274): freeze the
**exact tagged union** —

| Status              | Required                                                | Forbidden               |
| ------------------- | ------------------------------------------------------- | ----------------------- |
| `evaluated`         | `decision_evidence`, input binding, terminal-census ref | error reason            |
| `capture_failed`    | bounded error enum, **input binding**, attempt ref      | verdict                 |
| `unsupported_input` | capability derivation/ref                               | verdict, capture output |
| `not_applicable`    | applicability-matrix ref                                | verdict, attempt        |
| `missing_capture`   | obligation ref + explicit reason                        | verdict, attempt        |

Bounded error enum (e.g. `unexpected_categorical_output`), never free text. Export `checkMatrix`,
`checkStatusUnion`.

## Task 9 — Applicability soundness (`stage5f/core/applicability.mjs`) [275 / L4]

**Consumes replay results** (produced by orchestration before the pure sequence, Task 15).
`checkApplicability(bundle, replayResults)`: a `not_applicable` cell entailed by `applicability_matrix` →
`null`, else 275; an `unsupported_input` justified by **language/type** entailed by the static
`capability_profile` → `null`; an `unsupported_input` justified by **token length** must match the
**replay-derived** token count → else 275 (a producer can't commit a false token count to hide a hard
case). If a required replay result is absent, the caller (Task 15) returns **282 before 275 runs**.

## Task 10 — Adapter binding (`stage5f/core/adapter.mjs`) [276 / L2]

Test-first: for **every attempted-capture cell** (`evaluated` AND `capture_failed`), assert
`cell.detector_input_digest === replay.detector_input_digest` and the cell's
`adapter_digest`/`tokenizer_manifest_digest`/`truncation_policy_digest` equal the roster member's → else 276. A missing replay result → the caller returns 282 (never 276). Export `checkAdapter(bundle, replayResults)`
— pure, consumes results.

## Task 11 — Verdict registry (`stage5f/core/verdict.mjs`) [277]

Closed registry keyed by `decision_semantics`. `binary_malicious_softmax`: the member declares
`label_map`, `positive_class_index`, `positive_label`; the cell's `decision_evidence` proves
`positive_score` came from `positive_class_index`; verdict = `scoreGte(positive_score, threshold)` ?
`malicious` : `benign`, compared to the declared label → else 277 (**lexical compare, no softmax
recompute, no `Number`**). `categorical_allow_block`: the only accepted outputs are the bounded tokens
`allow`/`block`; the verifier **validates a bounded token** (+ `parser_digest` over the pinned parser
source/manifest) and derives the label — it does NOT claim to replay arbitrary generation parsing. Unknown
`decision_semantics` or any cross-semantics mapping → 277. Export `checkVerdict(bundle)`, `VERDICT_REGISTRY`.

## Task 12 — Bootstrap provenance (`stage5f/core/bootstrap.mjs` + `node/historicalVerifierRunner.mjs`) [278]

**Resolved (not deferred):** default `provenance_mode = "historical_verifier"` — both 5E `evaluateVda`
and the 3V-B verifier were verified runnable offline. `reference_binding` is a distinct, explicitly
**declared** mode (never a silent downgrade). Pure core `checkBootstrap(bundle, runnerResults)`: for
`historical_verifier`, assert each entry's `{release_tag, commit, bundle_digest, original_schema,
original_key_fingerprint, recorded_raw}` matches and the runner `ok===true` with `recorded_raw` as
declared → else 278; for `reference_binding`, assert metadata + digest equality only (weaker claim);
imports contribute **zero cells**. Runner (`historicalVerifierRunner.mjs`, impure): loads the hash-bound
vendored copy from `stage5f/bootstrap/`, verifies it against `historical-pins.json`
(`verifier_source_digest` = full transitive-kernel manifest: entry + imports + exit-map + key +
schema/constants + dep closure, with a path-containment closure test) **before** execution, runs it,
returns the canonical result. Cannot execute → caller returns 282 (Task 15).

## Task 13 — Completeness + coverage (`stage5f/core/completeness.mjs`) [279 / 281 / ①③]

Test-first (279 = `VMP_DERIVED_SUMMARY_MISMATCH`, frozen `reason` enum
`completeness_flag`|`histogram`|`omission_bound`|`label_vector`): recompute `representation_complete`
(must be `true`), `evaluation_complete = (all applicable&supported evaluated ∧ capture_failed==0 ∧
missing_capture==0)`, the histogram, `omission_lower_bound == universe_size − panel_size`, and the raw
**`heterogeneous_label_vector`** — for each case, each member's `{semantics, label}` **raw typed label**
(NO boolean, NO shared "positive", NO cross-detector normalization). Declared ≠ recomputed → 279.
**Projections (A/C, tested against `_validBundle`):** `evaluatedObligationFraction(bundle)` =
`{numerator: evaluated, denominator: applicable-and-supported}` (exact integers, published beside the
status histogram; non-claim "coverage figure, not a detection rate"); `heterogeneousLabelVector(bundle)`
= the raw per-member typed labels (non-claim "raw typed labels, never a disagreement verdict, aggregate,
or prevalence claim"). Test-first (281): `evaluatePolicy(result)` returns 281 iff
`evaluation_complete===false` (strict). Export `checkCompleteness`, `evaluatePolicy`,
`evaluatedObligationFraction`, `heterogeneousLabelVector`.

## Task 14 — Audit census bijection (`stage5f/core/census.mjs`) [280 / L5]

Test-first: given `auditPrivate` (`capture_census.v1`), a **bijection over ALL statuses** keyed on stable
`record_id` — every public cell ↔ exactly one terminal census record and back (a dropped
`capture_failed`/`unsupported_input`/`missing_capture` record → 280, a phantom → 280); every capture
attempt links to exactly one terminal record; `sha256(canonicalJson(auditPrivate)) === capture_log_digest`
→ else 280. Audit-tier only. Export `checkCensus(bundle, auditPrivate)`.

## Task 15 — VMP core evaluator (`stage5f/core/vmpCore.mjs`) [frozen order / 282]

**Orchestration preflight (before the pure sequence):** the CLI produces replay results (Task 20) and, if
`provenance_mode !== "none"`, runner results (Task 12). `evaluatePanel(bundle, opts)` then runs the frozen
order **268→269→270→271→272→273→274→275→276→277→278→279**, then (audit) **280**, then policy **281**.
Returns `{ raw, tier, attestation_valid, representation_complete, evaluation_complete, policy_accepted,
bootstrap_mode, audit_census_verified, full_panel_completeness_verified }`. `--attestation-only` skips 281.
**Provenance-mode preflight (frozen):** `historical_verifier` requires runner results (missing → 282);
`reference_binding` requires reference results (missing → 282); `none` (BYO) requires **no** runner. A
required **replay** result missing → 282. `evaluatePanelSafe` wraps any throw → 282. `vmpCore` never
trusts a bundle field like `recorded_raw`.

## Task 16 — Build/verify CLIs (`stage5f/node/{build-vmp-evidence,greenBundle,verify-vmp-attestation}.mjs`)

> Implements + unit-tests the builder against **synthetic fixtures** (fake census/receipt) — it does NOT
> produce shippable evidence (that is Task 24b). `greenBundle.mjs` keeps the house name (5E ships
> `stage5e/node/greenBundle.mjs`).

Test-first: `greenBundle.mjs` assembles canonical content, signs with the fixture key, binds the final
closeout digest. `build-vmp-evidence.mjs` writes the evidence pack (Task 24b lists files) and **asserts no
private key bytes appear in the evidence dir**. `verify-vmp-attestation.mjs`: **strict by default** (→ 281),
`--attestation-only`, `--tier audit`; external pins via `--pinned-fingerprint`/`--ceremony-fingerprint`;
prints the structured object (public/`--attestation-only` results always carry
`audit_census_verified:false` + `full_panel_completeness_verified:false`; a `reference_binding` bundle
carries `bootstrap_mode:"reference_binding"`, `historical_verifier_executed:false`, and is
`policy_accepted:false` under strict → distinguishable from a `historical_verifier` raw 0). Byte-stable:
temp-dir rebuild, sorted-`sha256` diff, `git diff --exit-code`.

## Task 17 — Lane B ceremony + receipt (`stage5f/laneb/{run-laneb-recompute-ceremony,verify-laneb-receipt}.mjs`) [acyclic]

Test-first: process 1 (JS) emits canonical content; process 2 (Python, `laneb/recompute.py`) independently
recomputes and asserts equality. Emit signed `blind_recompute_receipt.v1` (ceremony key) binding **six
load-bearing digests**: `{panel_plan_digest, cell_matrix_digest, completeness_digest, capture_log_digest,
result_chain_head_digest}` **plus the canonical-content digest**. `verify-laneb-receipt.mjs`: sig valid +
**externally-pinned ceremony fingerprint** + each digest equals the public/audit artifact; assert the
closeout record's `blind_recompute_receipt_digest` matches. Claim: "two-process/two-key separation, not
independent-party verification."

## Task 18 — Lane C offline dual capture (`stage5f/lanec/`) — non-CI [C / ③]

`capture_pg2.py` (Prompt Guard 2 86M, local M2) + `capture_lg4.py` (Llama Guard 4 12B, 8-bit/droplet),
each with `requirements-pg2.lock`/`requirements-lg4.lock`. **Acquisition lifecycle:** acquire pinned
snapshots → verify manifests/digests → `HF_HUB_OFFLINE=1`+`TRANSFORMERS_OFFLINE=1` → capture from cache.
Both evaluate the **entire precommitted safe corpus** — **no disagreement selection/"mining"** (that
reintroduces selection bias); disagreement is whatever the full corpus shows, published later as the raw
`heterogeneous_label_vector`, with no prevalence claim. AnthropicSafe: the corpus extends 5E's published
safe base families (inputs only, no generation preserved); a non-{allow,block}/refusal output maps to
`capture_failed`/`unexpected_categorical_output` (**there is no `model_refused` status**). Each capture
emits a hash-bound fragment with stable `record_id`s; `merge_capture_census.py` checks the common corpus
and builds the unified `capture_census.json` (all statuses). **Transcript-free metadata-and-verdict
evidence**; verdicts recorded honestly, no re-runs. Records the executed run (Frontier lever).

## Task 19 — BYO-Panel adapter contract (`stage5f/node/byoPanelAdapter.mjs` + README) — [②]

Test-first: given a caller's `byo_panel.v1` descriptor (roster + universe + capability profiles + adapter
manifest) and captured fragments, produce a valid `panel_attestation.v1` with `provenance_mode:"none"`
(no 5E/3V-B bootstrap requirement), the **frozen decision-semantics registry only** (new detector types
need a new schema version), and the caller's **own** external pins, that passes `evaluatePanel`. README
non-claim: "a BYO run is the caller's evidence; we verify the contract, we do not endorse the panel."

## Task 20 — Python + browser parity (`stage5f/python/{vmp_parity,vmp_adapter_replay,vmp_bootstrap_verify}.py`, `stage5f/browser/`)

Freeze a **parity capability table** in `vmp_parity.py`'s header: codes **268–277, 279–281 are
independently reimplemented** in Python; **278's historical-verifier run is a shared vendored kernel
invoked via subprocess (orchestration parity, not independent)**. Test-first: same tampered input → same
raw across runtimes on the independently-reimplemented surface; `canonicalJson` byte-equality; lexical
verdict; completeness/coverage/policy arithmetic. `vmp_adapter_replay.py`: **pinned-env** deterministic
input-adapter replay regenerating `detector_input_digest` (pins python/transformers/tokenizers/sentencepiece

- tokenizer snapshot + chat-template digest + special-token config + truncation/padding). Browser
  (`browser/verify-vmp-portable.js`, `canonical-json.js`, `index.html` + CSP): **portable surface only**,
  returns `{ verification_scope:"portable", portable_valid, full_attestation_status:"not_evaluated",
historical_verifier_execution:false, audit_census_verified:false, raw:null }` — never `raw:0`.

## Task 21 — Lean proofs (`proofs/stage5f/PanelCompleteness.lean`) [Lean]

Zero-`sorry` scan. Prove **8 theorems + 1 lemma** [S§4]: `CellMatrixBijection`, `AdapterBindingSound`,
`AcceptedChainBindsSinglePlan` (names the assumed crypto trust condition — no collision-resistance
proved), `CensusTerminalBijection` (all statuses), `CompletenessNoLaunder`, `ApplicabilityStatusSound`,
`StrictPolicyMayRejectValidAttestation` (non-equivalence), `RosterSubsetUniverseAndBound` (L6:
`roster ⊆ universe` ∧ `omission_lower_bound = |universe \ roster|` exact); lemma
`VerifierCodomainHasNoAggregate` (structural codomain). Gated by `stage-4-lean-proofs.yml`.

## Task 22 — Verification gates + three tamper suites (`tests/e2e/llmShield/stage5f/`)

Per-runtime gates reported separately: JS K7 all-functions net / Python pytest+coverage / CLI command
matrix (strict|attestation-only|audit) / browser portable-function net / Lean zero-sorry. **Three
separate suites (never conflated):**

- `tamper-matrix` — one isolated mutation per **integrity** raw branch **268–280**, plus unknown-key
  (recursive) / duplicate-cell / chain-fork / roster-not-in-universe / dropped-census-record families;
- `policy-fixtures` — **281** (honest incompleteness rejection), NOT tampering;
- `environment` — **282** (throw / missing replay / missing runner), NOT tampering.

**Cherry-Pick Test (invention B, member-specific — no aggregate):** a fixture where a member D returns its
own declared-positive label for a case; the assertion is _"omitting D erases that member-specific
observation"_ (fails 273/280 if omitted) — it proves omission **visibility**, never a clean/flagged panel
outcome. Cross-stage invariant: the bootstrap re-run still yields 5E/3V-B's recorded raws.

## Task 23 — Reproduce script + conformance pack (`scripts/reproduce-llm-shield-stage5f.sh`, `stage5f/conformance-pack/`)

**Fail-closed, two-line gates** — never `cmd && echo "OK"` under `set -euo pipefail`. `--tier audit` is
the reproduce default whenever the census file is present. Pack (`run.sh`/`README.md`/`DROPLET_SETUP.md`)
mirrors 5E's independent-party kit with the fail-open fixes + **full explicit deps** (incl.
`exitCodes.mjs`) via a fail-closed `copy_path`. Run under Node 26; frozen prior-reproduce list stays green.

## Task 24 — Security audits, scripts, self-review gate

Priv-key audit (fixture keys allowlisted, outside evidence dir, none in evidence — test exact paths against
the real audit); overclaim scan; whole-repo `npm run format:check`; `check.sh` locally. Self-gauntlet the
diff.

## Task 24b — Final evidence generation (LAST, before closeout) [Seam-1 order]

Run the real pipeline in this exact order: Lane C capture (Task 18) → `merge_capture_census.py` →
result/capture chain + manifest → Lane B receipt (Task 17) → closeout record → signed attestation →
byte-stability verify. Writes `docs/research/llm-shield/evidence/stage-5f/`: `vmp-attestation.json`,
`vmp-pinned-key.json` (informational), `roster-precommit.json` + chain records, `shared-corpus.json` (safe
source **bytes**), `capture-census.json` (digest == `capture_log_digest`), `laneb-receipt.json`. Nothing
signs the final bundle before the receipt and real census exist.

## Task 25 — Closeout (MANDATORY order)

K7 + full reproduce green (+ frozen prior scripts) → `check.sh` → PR with honest scope section → CI green →
rebase-merge → **reset local main to origin/main** → tag `v2.41.0-stage-5f-vmp` → **reproduce on the
tagged tree** → push tag → **create the GitHub Release, verify it exists and is marked Latest** (5C/5E
lesson: tag ≠ Release; publish only AFTER the tagged tree reproduces) → reproduce ON MAIN → closeout doc
with re-scored scorecard (Frontier moves only if Lane C executed) → README banner + north-star update →
memory write (MEMORY.md pointer + project file + gotchas) → Zurvan ingest (search duplicates first; ADR).

---

## Execution order & checkpoints

- **Pure core first (Tasks 3–15):** each independently testable against `_validBundle.mjs`; build the
  frozen check order incrementally, watching each new code fail then pass.
- **Checkpoint A (after Task 16):** the builder produces, from synthetic fixtures, an **evidence pack
  (incl. private census)** that verifies at both tiers under Node 26.
- **Checkpoint B (after Task 20):** Node↔Python raw-code precedence identical on the tamper matrix, per
  the capability table (278 is shared-kernel).
- **Checkpoint C (after Task 18, non-CI):** the real dual-detector **full-corpus** capture executes
  offline; census bijection (280) closes over it — the Frontier lever (else scored down at closeout).
- **Final evidence (Task 24b):** generated LAST, in Seam-1 order, before reproduce-on-main.
- **Batched question before Task 1:** raise any concern as ONE batch; then run task-by-task, stopping only
  for a real blocker or genuine ambiguity.
