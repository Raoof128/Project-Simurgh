# Stage 4K — Verifiable Extraction-Budget Attestation (EBA) — Design Spec

**Date:** 2026-07-02 · **Owner:** Raouf · **Rev:** 2 (amended from the 2026-07-01 ACPR draft; 8 review amendments folded in — see §7)
**Status:** Design approved pending user review.
**Next step:** `writing-plans` turns this design into the task-by-task TDD implementation plan (K1→K6). This spec is the WHAT/WHY; the plan is the HOW.

---

## 1. Milestone

Stage 4K / Banger EP9 — **Verifiable Extraction-Budget Attestation (EBA)**: a distillation / model-extraction guard that reframes distillation defense from provider-internal prevention into a **third-party-reproducible attestation of enforcement under a dishonest producer**.

It adds one new gate — **Q8, extraction-budget** (new raw code `30 extraction_budget_exceeded`, filling the slot the shipped 4J spec explicitly reserved for EBA) — as a **conceptual sibling of Q7**: Q7 is the shipped structural bounded-leakage/allowlist privacy gate over the certificate; Q8 applies the same bounded-capacity _idea_ to cross-session supervision exposure, with **zero shared mechanism and zero changes to Q7's code**. (Do not describe Q8 as "extending" or "generalizing" Q7 anywhere public — there is no code lineage, and a reviewer who checks will find none.)

**Builds on:** shipped 4D receipt spine + Merkle (`stage4d/merkle.mjs`); 4H canonicalization / Ed25519 signing / total fail-closed exit wrapper; the 3T–3U capability-extraction detector seed (`tools/simurgh-extraction/`), now given a signed per-consumer enforcement artifact on the 4-series spine.

## 2. Frontier framing (why this is publishable, not just another distillation defense)

Every existing defense — output watermarking, prediction perturbation (ModelGuard), query-pattern anomaly detection (Praetorian, GuardNet), rate limiting, Anthropic's own account-network campaign detection — lives **inside the trusted provider** and produces **no independently checkable artifact**. SLSA / in-toto attest a _builder_, not a per-consumer extraction-exposure claim. EBA applies the wedge that carried 4D–4J:

- **Q8 as a falsifiable checker property, not an internal throttle**: the producer emits a canonical, **metadata-only** supervision-exposure ledger (high-value-response class counts per bound consumer); the checker re-derives, offline and in one command, that cumulative exposure stayed under each consumer's declared budget. Over-budget is a hard fail (`30` → run-level `1`), witnessed by a negative self-proof.
- **Metadata-only ledger** — counts + digests, never raw prompts/outputs, safe to publish alongside the signed pack.
- **Rides the shipped spine** — reuses the 4D emitter and 4H canonicalization/signing/wrapper unchanged; minimal new machinery.

**Frozen claim (ACPR session `7b88984f`, q=0.93/conf=0.88):** _A verifiable extraction-budget attestation makes distillation-exposure a per-consumer, signed-pack-bound, third-party-reproducible predicate — the producer emits a canonical, metadata-only supervision-exposure ledger, canonically hashed and digest-bound into an Ed25519-signed manifest with a total fail-closed typed-exit wrapper; an independent auditor re-derives offline, in one command, that cumulative exposure to each bound consumer stayed under its declared budget — and over-budget + ledger-deletion anti-theatre falsifiers prove the budget gate is load-bearing._

**Trust-boundary honesty (pre-conceded):** a producer who also controls consumer-identity assignment or the reviewer's runtime could game the ledger; the attestation is meaningful only when identities are cryptographically bound and the reviewer runs their **own** checker on the signed pack.

## 3. Prior-art table (credit, then place the wedge)

| Prior system                                 | What it does                                       | Why it fails the EBA conjunction                                                             |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| LLM output watermarking                      | embeds a detectable signal in outputs              | downstream + removable; no enforcement, no per-consumer budget, no independent recomputation |
| Output/prediction perturbation (ModelGuard)  | perturbs outputs to lower extraction fidelity      | provider-internal; utility cost; no signed, third-party-recomputable enforcement artifact    |
| Query-pattern anomaly detection              | flags systematic extraction query patterns         | provider-internal, heuristic; nothing an outside auditor can recompute or falsify            |
| Anthropic distillation-campaign detection    | account-network analysis + access controls         | trusted, provider-internal, non-reproducible; no third-party-checkable receipt               |
| Rate limiting / throttling                   | caps request volume per key                        | volume ≠ high-value supervision exposure; no typed signed ledger; resets across accounts     |
| Reproducible/attested builds (SLSA, in-toto) | signed provenance + one-command build verification | attest a _builder_, not a per-consumer extraction-exposure claim under a dishonest producer  |

## 4. Architecture

New module dir `tools/simurgh-attestation/stage4k/`, reusing the committed 4D emitter and 4H canonicalization/signing/wrapper **unchanged**.

- **Part A (ledger + budget gate):** frozen metadata-only exposure-accounting function `E(consumer, window)`; cumulative per-bound-consumer budget gate emitting raw `30`; shared-wrapper extension `30 → 1` (total, fail-closed to `3` preserved).
- **Part B (attestation + reproduce + closeout):** canonical `extraction-attestation.json` digest-bound into a **stage4k-owned signed manifest** (4J pattern — see §0.6); one-command reproduce with over-budget + ledger-deletion anti-theatre falsifiers and a byte-stable golden; reviewer appendix + closeout.

**Invariant preserved:** Q0–Q7 semantics, `canonicalPremises.mjs`, and the pinned 4H pipeline order are untouched; Q8 is **additive**, not a reorder. PCTA (P0–P8, codes 31–38) is untouched.

**Tech stack:** Node.js ESM, `node:test`, `node:assert/strict`, committed 4D/4H modules, POSIX shell for reproduce, Prettier. Determinism pins unchanged (`TZ=UTC`, `LC_ALL=C`, `LANG=C`, `SOURCE_DATE_EPOCH=0`, `PYTHONHASHSEED=0`). Crypto pins unchanged (canonical JSON = the repo's JCS-equivalent `canonicalJson`, SHA-256, 4D Merkle, Ed25519). **Node 26 required** for byte-stable reproduce (nvm default 22 breaks the digest chain — 4H/4J lesson; the reproduce script asserts the major version).

---

## §0. Locked ledgers (read before writing any fixture or script step)

### 0.1 Exposure-accounting function `E(consumer, window)` — frozen, metadata-only [Part A]

_Why:_ if `E` is heuristic, the attestation is theatre. It MUST be precommitted, deterministic, and **content-free**, so any reviewer recomputes a byte-identical ledger and the ledger itself leaks nothing.

| High-value supervision class | What is counted (metadata only)                      | Frozen weight `w` |
| ---------------------------- | ---------------------------------------------------- | ----------------- |
| `final_answer`               | count of served final answers                        | 1                 |
| `reasoning_trace`            | count of served exposed reasoning / CoT traces       | 3                 |
| `tool_use_trajectory`        | count of served tool-use trajectories                | 2                 |
| `reward_like_judgment`       | count of served reward-model-like judgments/rankings | 4                 |

**Locked rules:**

- `E(consumer, window)` returns `{ consumer_id_digest, window, session_ids, class_counts, weighted_total }` with `weighted_total = Σ class_counts[c]·w[c]`. Class list + weights are **frozen constants** in `constants.mjs`. Weights are **declared policy, not measurement** (carry `weights_are_declared_policy`, §0.5).
- **Cross-session is literal, not narrative:** the v1 fixture event stream spans **multiple session ids per consumer**; `E` aggregates them into ONE cumulative ledger entry per consumer per window, and `session_ids` records the aggregated sessions (as digests). The headline "cross-session cumulative" is thereby backed by code. Multi-_window_ composition (ledger append/merge across windows) is **deferred and named** — v1 is cumulative-within-a-declared-window over a multi-session stream.
- **Content-free:** counts + digests only — never raw prompts, outputs, tool args, transcripts, or plaintext identities.
- **Consumer digest is pseudonymous, not anonymous:** `consumer_id_digest = sha256(FIXTURE_SALT || consumer_id)` with `FIXTURE_SALT` a **pinned constant in `constants.mjs`** (a random salt would break the byte-stable golden; a committed salt provides NO protection against brute-forcing guessable IDs). Carry `consumer_digest_is_pseudonymous_not_anonymous` (§0.5); never present the salt as identity protection.
- Canonical JSON (repo `canonicalJson`) + SHA-256; deterministic key order; no timestamps beyond the declared `window` label. `E` is pure and offline — no network, no model, no clock.

### 0.2 Extraction-budget gate + new exit code `30` [Part A]

| Raw code        | Meaning                                                                        | Run-level (wrapper) |
| --------------- | ------------------------------------------------------------------------------ | ------------------- |
| `0`             | all gates incl. Q8 pass (every consumer under budget)                          | `0`                 |
| `30`            | `extraction_budget_exceeded` (Q8) — some bound consumer's `weighted_total > B` | `1`                 |
| `19`–`27`       | Q0–Q7 outcomes (4H band, unchanged)                                            | `1`                 |
| `28`            | `checker_not_offline` (unchanged)                                              | `2`                 |
| `31`–`38`       | PCTA P1–P8 outcomes (4J band, unchanged)                                       | `1`                 |
| `29` / unmapped | internal error / exhaustiveness breach                                         | `3` (fail-closed)   |

**Locked rules:**

- Extend `RUN_LEVEL_BY_RAW` with `30: 1`; `stage4CodeForRawCode()` stays **total** and **fails closed to `3`** on unknown codes. All existing mappings (4H band, `28→2`, `29→3`, 4J band `31–38→1`) unchanged.
- **Raw `30` means exactly one thing:** a bound consumer's cumulative `weighted_total > B`. A harness that fails its own falsifier (over-budget fixture NOT caught, deletion NOT fail-closed) is an **internal error: `29 → 3`** — never `30`. Gate semantics and harness self-test are separate channels.
- Boundary `weighted_total === B` **passes** (budget is inclusive).
- **Unknown signal class fails closed:** any event whose `signal_class` is not in the frozen class list is a schema violation — the verifier rejects with `29 → 3`, never silently skips or zero-weights it.
- **Raw `39` is reserved (prose-only, not in the v0 ledger)** for `extraction_scope_violation` — the v1 authorized-distillation scope check (see §8 / EBA+ doc). v0 does not implement or emit it; reserving it now prevents a future stage from folding scope violations into `30`.
- **Known mechanical gotcha (from 4J):** extending `RUN_LEVEL_BY_RAW` trips the 4H `exitWrapper` exhaustiveness test (it pins the exact object — update the pin, non-weakening) AND regenerates both derived `exit-map.json` copies (`docs/research/llm-shield/evidence/stage-4h/` + `tests/fixtures/llmShield/stage4h/expected-results/`). Commit all three together in the same ledger commit.

### 0.3 One-command pipeline contract — `scripts/reproduce-llm-shield-stage4k.sh` (frozen step order) [Part B]

| #   | Pipeline step                                                                                              | On failure → typed exit                                                            |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Scrub + pin env (incl. Node 26 major assert); assert none survive                                          | `2`                                                                                |
| 2   | Regenerate exposure fixtures + ledger **into a temp dir only** (`STAGE4K_FIXTURE_OUT`)                     | `3`                                                                                |
| 3   | Verify stage4k signed manifest (Ed25519 + recomputed attestation digest)                                   | `1` (raw `25` reused: pack-binding mismatch; digest recompute mismatch → raw `22`) |
| 4   | Recompute `E(consumer, window)` for every consumer; byte-diff against the **committed** ledger             | `3`                                                                                |
| 5   | Q8 budget check: every consumer `weighted_total ≤ B`                                                       | `1` (`30`)                                                                         |
| 6   | Replay Q0–Q7 on the referenced 4H substrate (containment record still verifies)                            | `1` (offending raw code)                                                           |
| 7   | Byte-stable golden diff (run twice into two temp dirs; diff canonical ledger + attestation JSON)           | `3`                                                                                |
| 8   | Anti-theatre: (a) over-budget fixture → assert `30`; (b) delete ledger in a temp copy → assert fail-closed | `29 → 3` if not load-bearing                                                       |
| 9   | Emit `extraction-summary.json`; exit via `stage4CodeForRawCode`                                            | `0` on all-green                                                                   |

**Locked rules:**

- **Churn-safe reproduce (4J lesson):** fixture builds draw a fresh Ed25519 key per run, so rebuilds are non-idempotent. The reproduce script NEVER rewrites committed fixtures — it regenerates into `STAGE4K_FIXTURE_OUT` temp dirs and **byte-compares the deterministic artifacts** (ledger, attestation, exposure matrix) against the committed ones.
- The script's final exit is ALWAYS routed through the wrapper (Node one-liner over `stage4CodeForRawCode`) — never a bare `exit 1`; every step goes through a `set -euo pipefail`-safe `run_step` helper so a failing command can never exit before the raw code is set.
- Evidence-refusal rule (4J pattern): the evidence emitter exits non-zero if any observed verdict diverges from the expected matrix — evidence contradicting the contract is never written.
- shellcheck is **not installed on this machine**: run it best-effort/CI-side; absence is named in the closeout deferred-work section, never silently skipped.
- All stage4k CLIs use the 4J CLI-entry guard: `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)` — `node -e` importers must never crash.
- Offline enforcement reuses `runOffline` / `scanForModelClients` from the 4H offline harness.

### 0.4 Reviewer 5-minute path (baked into the appendix) [Part B]

| Reviewer test               | Action                                 | Expected                                                       |
| --------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| T1 — clean reproduces       | run the one command                    | exit `0`; every consumer under budget; Q0–Q7 pass              |
| T2 — ledger recomputes      | recompute `E` from the fixture stream  | byte-identical to the committed ledger                         |
| T3 — signature load-bearing | corrupt the stage4k manifest signature | exit `1`                                                       |
| T4 — budget enforced        | run the over-budget consumer fixture   | exit `1` (raw `30`)                                            |
| T5 — gate not theatre       | delete the exposure ledger (temp copy) | fail-closed typed exit (`3`, or a rejecting `1`); never `0`    |
| T6 — ledger leaks nothing   | grep the ledger for raw content        | only counts + digests; no prompts/outputs/plaintext identities |

### 0.5 Honesty ceiling / non-claims (state up front, verbatim in README + closeout)

- **Signal ≠ capability.** `E` measures _supervision signal exposed_, not _capability transferred_ into a student model (black-box, unmeasurable). Carry `not_capability_transfer_proof`.
- **No Sybil closure.** Budgets bind to _bound_ identities; splitting queries across accounts defeats a per-consumer budget unless identity is cryptographically bound — ties to R8 provenance. Carry `not_sybil_collusion_closure`.
- **Budget is declared policy, not a safety theorem.** The attestation proves the deployment _enforced_ the declared `B`, not that `B` is "safe." Carry `budget_is_declared_policy_not_safety_bound`.
- **Weights are declared policy.** The class weights (1/3/2/4) are frozen declared constants, not an information-theoretic leakage measure (that upgrade is v2 Lever 4). Carry `weights_are_declared_policy`.
- **Synthetic substrate.** v1 events are **synthetic fixture streams** (3T posture: "offline tooling over synthetic metadata"), not a live deployment's ledger. Carry `substrate_is_synthetic_fixture_stream`.
- **Pseudonymous, not anonymous.** The salted consumer digest is deterministic with a committed salt; it prevents casual plaintext exposure, nothing more. Carry `consumer_digest_is_pseudonymous_not_anonymous`.
- **Attestation trust boundary.** Meaningful only when the reviewer runs their **own** checker on the signed pack and identities are provider-independently bound. Carry `attestation_assumes_reviewer_runtime`.
- **Metadata-only.** The ledger leaks no content. Carry `ledger_is_metadata_only`.
- **Single-window scope.** Cross-session aggregation is in scope; cross-_window_ ledger composition is deferred and named.
- Plus the carried stage-4 non-claims: not model safety, not execution truth, determinism ≠ statistical robustness.

### 0.6 Attestation binding + evidence-pack ledger [Part B]

- **Stage4k-owned manifest + fresh 4K key (4J pattern — do NOT modify the shipped 4H `buildSignedPackManifest`):** `buildEbaManifest({ ledgerDigest, attestationDigest, budgetPolicyDigest, runRoot, privateKey })`, Ed25519 over `canonicalJson` with domain separator `SIMURGH_STAGE4K_EBA_MANIFEST_V1\0`. Mint a **fresh stage-4K Ed25519 keypair** (every stage 3M→4J has its own; 4J's key is not reused). Acyclic: the attestation excludes its own digest + the manifest signature; the verifier **recomputes** `ledger_digest` and the attestation digest from local output before trusting anything committed.
- `docs/research/llm-shield/evidence/stage-4k/`: `extraction-ledger.json` (per-consumer class counts + digests), `budget-policy.json` (declared `B` + frozen weights), `extraction-attestation.json`, `extraction-summary.json` (byte-stable golden), `eba-manifest.json`, `README.md` (full non-claims block + R8/Sybil deferral).
- Q8 conjunction evidence recorded verbatim so "caught over-budget" is never read as "clean run": `{ "clean_run_all_under_budget": true, "over_budget_double_caught": true, "over_budget_double_raw_code": 30, "q8_status": "pass" }`.
- Every file metadata-only.

---

## 5. Scope guard

**Do implement:** frozen metadata-only `E(consumer, window)` with multi-session aggregation + pinned fixture salt; cumulative per-bound-consumer budget gate (Q8) + raw code `30`; shared-wrapper extension (`30 → 1`, total, fail-closed, exhaustiveness pin + both exit-maps recommitted); stage4k-owned signed manifest + fresh 4K key with recompute-before-trust; the §0.3 one-command reproduce (churn-safe temp regen, wrapper-routed exits); over-budget + ledger-deletion falsifiers + byte-stable golden; reviewer appendix (T1–T6) + `STAGE_4K_CLOSEOUT.md`; evidence pack (§0.6).

**Do NOT implement (out of scope / later):** any change to Q0–Q7 semantics, `canonicalPremises.mjs`, PCTA P0–P8, or any pinned pipeline order (Q8 is additive); Sybil/multi-account closure or cryptographic identity binding (R8); capability-transfer measurement; cross-window ledger composition; kernel isolation (R6/4M); SMT/solver/model/provider/network dependencies; ZK/DP/QIF/VKD upgrades (v2 levers, §8).

**Wording freeze (hard):** NO "first distillation-proof …" or "first producer-independent …" public-priority wording anywhere — including the v2 Lever-6 phrasing, which is **frozen until a real prior-art sweep clears it** (the roadmap has been burned once on "first" claims; signed-receipt prior art existed). Overclaim guard (rg-based closeout test) scans for `capability.transfer|distillation.proof|first .*(distillation|extraction)|prevents distillation|model.safe|sybil.*(closed|solved)` — matches allowed only inside explicit `non_claims`/`not_in_scope`/deferral text.

**New claim in this milestone = Q8 (extraction-budget) only.** Q0–Q7 must remain `pass`. Zero `src/llmShield` changes (policy-drift guard stays clean).

## 6. File structure

**Create:**

- `tools/simurgh-attestation/stage4k/constants.mjs` — frozen class list + weights + `FIXTURE_SALT` + `EXTRACTION_REASONS` + manifest domain.
- `tools/simurgh-attestation/stage4k/extractionLedger.mjs` — `computeExposure(consumer, window)`, `buildLedger(events)` (multi-session aggregation), `canonicalizeLedger()`.
- `tools/simurgh-attestation/stage4k/extractionBudgetGate.mjs` — `checkBudgets(ledger, policy)` → `{ ok, offending, rawCode }` (`30` on breach; `===B` passes).
- `tools/simurgh-attestation/stage4k/ebaManifest.mjs` — `buildEbaManifest` / `verifyEbaManifest` (fresh 4K key, domain-separated, acyclic).
- `tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs` — synthetic multi-session event streams (under-budget, over-budget, boundary) honoring `STAGE4K_FIXTURE_OUT`.
- `tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs` — recompute ledger + digests, run Q8, replay-reference the 4H substrate, exit via wrapper; CLI-entry guard.
- `tools/simurgh-attestation/stage4k/emit-stage4k-evidence.mjs` — evidence emitter with divergence refusal.
- `scripts/reproduce-llm-shield-stage4k.sh` — the §0.3 pipeline.
- `tests/unit/llmShield/stage4k/` — `extractionLedger.test.js` (determinism, content-free grep, weighted_total, multi-session aggregation), `extractionBudgetGate.test.js` (under `0` / over `30` / boundary passes), `exitWrapper.pcta-eba.test.js` (`30→1`, totality, existing bands unchanged), `ebaManifest.test.js`, `closeout.test.js` (overclaim guard, evidence completeness, metadata-only grep, T1–T6 doc pins).
- `tests/e2e/llmShield/stage4kFullSmoke.test.js` — full matrix + falsifiers + byte-stable temp regeneration.
- `docs/research/llm-shield/STAGE_4K_CLOSEOUT.md`, `STAGE_4K_REVIEWER_CHECKLIST.md`.
- `tests/fixtures/llmShield/stage4k/` — consumers/{under-budget,over-budget,boundary}.json, expected-results/exposure-matrix.json, eba-signer.pub.
- `docs/research/llm-shield/evidence/stage-4k/` per §0.6.

**Modify:**

- `tools/simurgh-attestation/stage4h/exitCodes.mjs` — add `30` + `RUN_LEVEL_BY_RAW[30]=1` (shared wrapper; reused, not forked).
- `tests/unit/llmShield/stage4h/exitWrapper.test.js` — exhaustiveness pin gains `30` (non-weakening).
- Both derived `exit-map.json` copies — regenerate + commit with the ledger change.

## 7. Amendments folded from the 2026-07-02 review (traceability)

1. §0.2 exit table now includes the shipped 4J band `31–38→1` (draft predated 4J landing).
2. Salt pinned as fixture constant + `consumer_digest_is_pseudonymous_not_anonymous` non-claim (random salt broke the golden; committed salt is not privacy).
3. "Cross-session cumulative" made literal: multi-session event streams aggregated per consumer; cross-window composition deferred and named.
4. Attestation binding via stage4k-owned manifest + fresh 4K Ed25519 key (4J pattern); shipped 4H manifest builder untouched.
5. Q8-red condition purified: raw `30` = over-budget only; falsifier failures are `29 → 3`.
6. `substrate_is_synthetic_fixture_stream` non-claim added (3T posture).
7. 4J operational lessons inherited: `STAGE4K_FIXTURE_OUT` churn-safe reproduce, Node 26 assert, CLI-entry `process.argv[1] &&` guard, shellcheck-unavailable named honestly, exhaustiveness-pin + exit-map recommit gotcha.
8. Lever-6 "first …" phrasing frozen pending prior-art sweep; added to the overclaim-guard regex.
   Plus framing: Q8 is a **conceptual sibling** of Q7, never "generalizes Q7."

## 8. Expansion path: EBA+ (v1) and v2 candidates — explicitly out of v0

**The named v1/v2 expansion path is `docs/research/llm-shield/STAGE_4K_EBA_PLUS_ARCHITECTURE.md` ("EBA+ — Attested Distillation-Control Plane", DRAFT — its §18 source ledger is unverified and gates any external use).** Where that document and this spec disagree, this spec is normative for v0.

**v1 (EBA+, each with its honesty guard named):** authorized-distillation scope ledger — scope violations emit **raw `39 extraction_scope_violation`** (reserved in §0.2, never folded into `30`); signal-surface expansion (`stored_completion`, `fine_tune_file`, `batch_export`, `external_egress`) as a **versioned E-v2** (3T→3U additive pattern; PCTA owns egress _authority_, EBA owns signal _exposure_ — no shared surface claims); consumer-binding ledger — cluster digests are **declared, trusted inputs** (4C modelled-labels lesson), never presented as Sybil detection; countermeasure receipts — **producer self-reports, recorded-not-verified** (3O self-report/oracle distinction); ZDR-compatible mode fixture.

**v2 (only after v0/v1):** ZK proof-of-exposure (retires `attestation_assumes_reviewer_runtime` — sharpest lever); verifiable-DP accounting; query-complexity-grounded `B`; QIF-grounded `E` (retires `weights_are_declared_policy`); VKD retrieval-completeness (omission closure, ties EP7 transparency log); producer-independent positioning claim (gated on prior-art sweep). Sources logged in the ACPR session notes (2026-07-01) + the EBA+ §18 source ledger.

## 9. Self-review checklist (must all hold at closeout)

- `E` frozen, deterministic, content-free, byte-stable across two runs; multi-session aggregation tested.
- Q8 red **iff** some bound consumer exceeds `B`; boundary `==B` passes; clean fixture raw `0`; falsifier failures route `29→3`.
- Wrapper total + fail-closed; `30→1`; 4H band, `28/29`, and 4J band unchanged; exhaustiveness pin updated; both exit-maps recommitted.
- Attestation digest acyclic and recomputed-before-trust; fresh 4K key; domain-separated signature.
- One command runs all nine §0.3 steps, exits only via the wrapper; T1–T6 all produce expected results; falsifiers load-bearing (never `0`).
- Byte-stable golden: two full runs byte-identical on summary + ledger + attestation; committed fixtures never rewritten.
- Q0–Q7 remain pass; only new claim = Q8; overclaim guard green; zero `src/llmShield` changes.
- Evidence pack complete per §0.6, all metadata-only; non-claims verbatim in README + closeout.
