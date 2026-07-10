# Stage 5F — VMP: Verifiable Multi-detector Panel Attestation (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.**
> Public wording stays provider-agnostic. Honesty guardrail: "boundary held, verifiably" —
> never "model safe". Honest core: **a single signed attestation binds N precommitted released
> detectors to one shared committed case set, such that every case discloses — for every member —
> either a verdict or a typed, policy-checkable non-result. Panel completeness is not detection
> completeness. No aggregate panel verdict is produced.**

**Date:** 2026-07-10 **Track:** LLM-Shield / adversarial evidence-layer verification
**Builds on:** 5E VDA (real offline pinned-weight third-party detector capture; external key pin;
score/threshold binding; forbidden-claim honesty gate), 3V-B (live Llama Guard 4 12B capture),
5C VSB (imported engine + non-zero honest ledger), 4W VSN (completeness-as-a-law lineage),
4H (Node-26 byte-stable digest builder + `exitCodes` family).
**Version:** v2.41.0 **Raw codes:** 268–282 (additive; frozen `VMP_RAW_CODES`).
**Blade:** the Completeness Invariant instantiated on a **detector panel** — selective omission
across detectors becomes impossible to hide.
**Gauntlet:** brainstorm + Sections 1–6 each reviewed and locked; five Section-1 locks, eight
Section-2 locks, eight Section-3 locks, six Section-4 locks (incl. one corrected impossible
theorem), ten Section-5 blocking fixes (incl. one reviewer claim rejected with repo receipts), and a
Section-5 Lane-B digest-cycle fix, and a second beast pass. Beast-mode inventions (folded in): Panel
Completeness Ratio, the Cherry-Pick Test, Detector Disagreement Ledger, ① Roster Coverage Commitment /
Omission Lower Bound (Law 6), ② BYO-Panel Adapter Contract, ③ Adversarial Disagreement Mining. Invention
④ Panel Contest / Rerun Right is spun out to the next stage (VPC).

Folds the blade into one law family: (1) a **precommitted panel plan** (roster + corpus +
applicability + adapters) bound before capture in a signed evidence chain; (2) a **typed non-result
union** so silence cannot launder a dropped detector; (3) an **all-status census bijection** so no
capture attempt disappears; (4) a **semantics-tagged verdict registry** so heterogeneous detectors
are declared, never reconciled into a fake "2/2 safe"; (5) **attestation-truth vs consumer-policy
separation** so a truthful incomplete panel stays verifiable while the default CLI refuses to call it
clean.

---

## 1. Identity, laws, blade

**Blade (one).** A single signed attestation binding **N precommitted released detectors** to **one
shared committed case set**, such that every case discloses, for every member, either a verdict or a
**typed, policy-checkable non-result** — making selective omission across a detector panel impossible
to hide. A hostile reviewer can reject the stage by attacking exactly one mechanism: panel
representation-completeness.

**Simurgh sentence.** _A detector panel may disagree, abstain, or fail — but it may not quietly
forget a member._

**Six verifier laws (falsifiable):**

1. **No Post-Commit Panel Omission.** For every committed case, every member of the precommitted
   roster has exactly one typed cell. A member cannot be removed or silenced after roster
   commitment. Only `evaluated` may carry a verdict. _(Public label: "No Cherry-Picked Panel
   Member"; the formal claim is post-commit.)_
2. **No Silent Exam or Adapter Swap.** Every `evaluated` cell binds the common source input **and**
   the declared detector-specific transformation (adapter/tokenizer/truncation), each hash-bound to
   the panel plan.
3. **No Membership Rewrite.** The roster/plan commitment appears earlier than all results in the
   recorded evidence chain (never a wall-clock claim).
4. **No Post-Hoc Applicability Rewrite.** Applicability and supported-input rules are committed
   before capture; `not_applicable`/`unsupported_input` must be entailed by them.
5. **No Dropped Capture Record.** Every public cell (any status) maps to exactly one terminal census
   record and back; every capture attempt resolves to exactly one terminal record.
6. **No Gerrymandered Universe** _(beast invention ①, the pre-commit twin of Law 1)._ The panel plan
   binds a precommitted **detector universe** (a registry of candidate detector IDs); the verifier
   checks `roster ⊆ universe`, and the attestation publishes the **Omission Lower Bound** =
   `|universe| − |panel|`, the signed **silence surface**. **Honest scope (signed):** this catches
   omission _within a committed universe_; it does **not** force the universe to be representative —
   a producer who declares `universe = roster` truthfully gets bound 0, so the number is only
   informative relative to a universe the producer had a reason (or a mandate) to declare. Universe
   representativeness itself is minted `universe_completeness_deferred`, not claimed here.

**Signed claim-rail (non-claim, not a verifier law):** **Disagreement Is Not Correctness.** Agreement,
disagreement, abstention, and failure are reported, never converted into a panel-safety verdict.

**Signed honest core / bounds (stated up front = 5G+'s attack surface):**

- **Panel completeness ≠ detection completeness.** We prove every member is represented on every
  committed case, not that the panel catches every attack.
- **Heterogeneous semantics are declared, not reconciled.** `benign/malicious` and `allow/block` are
  bound to typed `decision_semantics`; we never map one onto the other.
- **Offline pinned weights ≠ a hosted endpoint** (carries `live_endpoint_attestation_deferred`).
- **Bootstrap provenance vs shared-corpus evidence are separate claims:** imported 5E/3V-B captures
  prove custody only; panel verdicts come from the new shared corpus both members evaluate.
- **Roster precommit + coverage commitment (Law 6) prevent post-result omission and quantify the
  silence surface — but coverage is not representativeness.** A large universe with a small honest
  panel is still honest; we publish the gap, we do not prove the universe itself is complete.

**Beast inventions folded in (this stage).** ① **Roster Coverage Commitment / Omission Lower Bound**
(Law 6 above): the thing in-toto/C2PA structurally cannot express — they prove steps happened; they
cannot measure what a panel was _selected to exclude_. ② **BYO-Panel Adapter Contract**: any safety
team points VMP at their own detectors offline, zero Simurgh involvement — removes the "one blocker"
and turns the standing-10 lever into a single command. Non-claim: _a BYO run is the caller's
evidence, not ours; we verify the contract, we do not endorse the panel._ ③ **Adversarial
Disagreement Mining**: the shared corpus is built to expose inter-detector blind spots (cases where
exactly one member catches), and the attestation surfaces the **sole-catcher structure** — the
Cherry-Pick Test made real with live models. Non-claim: _a sole-catcher is a coverage fact on this
corpus, never a ranking._ (④ Panel Contest Cells / the Rerun Right is a **different blade** — spun out
to the next stage, VPC.)

**AnthropicSafe framing.** The shared corpus extends the already-published safe base families (5E's
8 bases + benign probes), not novel potent attack strings; detectors score **inputs only**; no target
model generates; the categorical detector's output is a bounded safe token (allow/block) — no harmful
generation is produced or preserved. Same posture as 5E.

**Socket ledger.** **PAYS** `multi_detector_panel_deferred` (minted by 5E). **PARTIALLY PAYS**
`roster_representativeness_deferred` — the Coverage Commitment (Law 6) publishes the silence surface;
full representativeness (proving the universe itself is complete) remains open, re-minted as
`universe_completeness_deferred`. **MINTS** `panel_aggregation_policy_deferred` (weighting/quorum/fusion
— deliberately out of scope in v1), `universe_completeness_deferred`, `panel_contest_deferred`
(→ next stage VPC, beast invention ④), `portable_historical_kernel_deferred` (browser cannot run
historical verifiers). **Carries** `multilingual_ruleset_deferred` (→ 5G VML),
`live_endpoint_attestation_deferred`, `unicode_confusables_kernel_hardening_deferred`,
`downstream_efficacy_target_deferred` (→ 5H VDE).

---

## 2. Artifact schema + raw codes + frozen check order

**Schema id:** `simurgh.vmp.panel_attestation.v1`. Public tier = structure + declared completeness;
audit tier adds the census bijection. One additive raw-code block, fail-closed wrapper **last**.

**Public bundle shape:**

```jsonc
{
  "schema": "simurgh.vmp.panel_attestation.v1",
  "attestation_pub_key_pem": "...",
  "roster_precommit": {
    // Law 3: precedes every result IN THE RECORDED CHAIN
    "record_type": "panel_precommit",
    "chain_position": 0,
    "previous_record_digest": null,
    "record_digest": "sha256:...",
    "signature": "base64",
    "panel_plan_digest": "sha256:...", // = hash(schema_version + roster + corpus + applicability + adapter_manifest + universe)
    "roster_digest": "sha256:...",
    "corpus_digest": "sha256:...",
    "applicability_digest": "sha256:...",
    "adapter_manifest_digest": "sha256:...",
    "universe_digest": "sha256:...", // Law 6: the precommitted candidate-detector universe
  },
  "detector_universe": {
    // Law 6: registry of candidate detector IDs the panel was drawn from
    "universe_digest": "sha256:...",
    "candidates": ["prompt_guard_2_86m", "llama_guard_4_12b", "..."],
  },
  "roster": [
    // frozen membership; each member fully declared
    {
      "member_id": "prompt_guard_2_86m",
      "model_id": "meta-llama/Llama-Prompt-Guard-2-86M",
      "hf_revision": "a8ded8e...",
      "detector_role": "prompt_injection_classifier",
      "decision_semantics": "binary_malicious_softmax",
      "reference_threshold": "0.5000",
      "adapter_digest": "sha256:...",
      "tokenizer_manifest_digest": "sha256:...",
      "truncation_policy_digest": "sha256:...",
      "capability_profile": {
        "supported_languages": ["en"],
        "max_input_tokens": 512,
        "accepted_input_type": "text",
        "required_runtime_features": [],
      },
    },
    {
      "member_id": "llama_guard_4_12b",
      "detector_role": "content_safety_classifier",
      "decision_semantics": "categorical_allow_block",
      "...": "...",
    },
  ],
  "applicability_matrix": [{ "member_id": "...", "case_class": "...", "applicable": true }],
  "corpus": {
    "corpus_digest": "sha256:...",
    "cases": [{ "case_id": "...", "case_class": "...", "source_input_digest": "sha256:..." }],
  },
  "cells": [
    // exactly one per (member × case)
    {
      "case_id": "...",
      "member_id": "...",
      "status": "evaluated",
      "shared_input_digest": "sha256:...",
      "detector_input_digest": "sha256:...",
      "adapter_digest": "sha256:...",
      "tokenizer_manifest_digest": "sha256:...",
      "truncation_policy_digest": "sha256:...",
      "decision_evidence": {
        "kind": "binary_softmax",
        "positive_score": "0.8123",
        "threshold": "0.5000",
      },
    },
    {
      "case_id": "...",
      "member_id": "...",
      "status": "not_applicable",
      "applicability_ref": "...",
    },
    { "case_id": "...", "member_id": "...", "status": "missing_capture" },
  ],
  "completeness": {
    // DECLARED; verifier recomputes and refuses to let it lie
    "representation_complete": true, // invariant: 273 guarantees ⇒ must be true
    "evaluation_complete": false,
    "cell_status_histogram": {
      "evaluated": 30,
      "not_applicable": 2,
      "unsupported_input": 0,
      "capture_failed": 0,
      "missing_capture": 1,
    },
  },
  "coverage": {
    // Law 6 (invention ①): silence surface + sole-catcher structure (invention ③) — both DECLARED, recomputed
    "universe_size": 5,
    "panel_size": 2,
    "omission_lower_bound": 3, // = universe_size − panel_size
    "sole_catcher_cases": [{ "case_id": "...", "only_member": "prompt_guard_2_86m" }],
  },
  "bootstrap_provenance": [
    // custody-only; NEVER counted as panel verdicts
    {
      "member_id": "prompt_guard_2_86m",
      "imported_from": "stage-5e",
      "release_tag": "v2.40.0-stage-5e-vda",
      "commit": "6457d48c...",
      "bundle_digest": "sha256:...",
      "original_schema": "...",
      "original_key_fingerprint": "sha256:...",
      "recorded_raw": 0,
    },
    { "member_id": "llama_guard_4_12b", "imported_from": "stage-3v-b", "...": "..." },
  ],
  "closeout": {
    // terminal chain record (see Lane B, §3)
    "record_type": "panel_closeout",
    "chain_position": "N",
    "previous_record_digest": "result_chain_head_digest",
    "record_digest": "sha256:...",
    "blind_recompute_receipt_digest": "sha256:...",
  },
  "capture_provenance": { "capture_log_digest": "sha256:..." },
  "non_claims": ["panel completeness is not detection completeness", "..."],
  "signature": "base64", // Ed25519 over canonicalJson(content); binds final closeout digest
}
```

Categorical cells carry `decision_evidence` of `{ "kind": "categorical_generation",
"normalised_label": "block", "raw_output_digest": "sha256:...", "parser_digest": "sha256:..." }` over a
**bounded canonical output token**. The private **`capture-census.json`** holds the per-cell attempt
log; its canonical digest equals `capture_log_digest`.

**Decision-semantics enum (closed registry):** `binary_malicious_softmax`, `categorical_allow_block`.
**Cell-status enum:** `evaluated`, `not_applicable`, `unsupported_input`, `capture_failed`,
`missing_capture`. Only `evaluated` carries a verdict; `capture_failed` carries bounded error
provenance (e.g. `unexpected_categorical_output`) and no verdict.

**Raw codes (additive 268→282), each bound to a law/bound:**

| Code | Check                                                                                                                                                                                                          | Enforces                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 268  | schema id + no unknown keys; no aggregate-verdict field (`aggregate_verdict`/`panel_score`/`consensus`/`quorum`)                                                                                               | structural gate; aggregate-absence                    |
| 269  | signature — **external-pinned fingerprint first**, then Ed25519 over canonical content (embedded key informational only)                                                                                       | not self-authenticating (5E lesson)                   |
| 270  | precommit receipt + **linear chain closure** (positions `0..N` unique/contiguous, one per position, no forks, single terminal head, attestation binds it)                                                      | Law 3                                                 |
| 271  | panel-plan integrity — `panel_plan_digest = hash(schema_ver + 5 subdigests incl. universe)`; roster fully declared + hashes to `roster_digest`; **`roster ⊆ universe`** (universe hashes to `universe_digest`) | Law 3 + Law 6                                         |
| 272  | corpus binding — cases hash to `corpus_digest`; cells reference only committed cases                                                                                                                           | exam integrity                                        |
| 273  | cell-matrix bijection — exactly one typed cell per (member × case), none absent/duplicated                                                                                                                     | Law 1                                                 |
| 274  | status-union validity — status ∈ enum; only `evaluated` has a verdict; `capture_failed` has bounded error prov, no verdict                                                                                     | typed non-results                                     |
| 275  | applicability/capability — `not_applicable` ⟸ matrix; `unsupported_input` ⟸ capability profile                                                                                                                 | Law 4                                                 |
| 276  | shared-input + adapter **replay** — `detector_input_digest = digest(applyCommittedAdapter(source, adapter, tokenizer, truncation))`; digests match roster                                                      | Law 2                                                 |
| 277  | semantics-specific verdict recompute via closed registry (scaled-int softmax compare / pinned parser); **no softmax recomputation**; no cross-semantics mapping                                                | heterogeneous semantics declared, not reconciled      |
| 278  | bootstrap provenance — run pinned historical verifiers (5E/3V-B) on imported artifacts under their pinned roots; expect `recorded_raw`                                                                         | custody-only imports                                  |
| 279  | declared `completeness` flags + histogram **and `coverage` (omission_lower_bound = universe−panel; sole_catcher_cases)** match recomputed values                                                               | missing-capture + silence surface cannot be laundered |
| 280  | _(audit only)_ census bijection — all public cells (every status) ↔ all terminal census records; every attempt → one terminal; census hashes to `capture_log_digest`                                           | Law 5                                                 |
| 281  | strict completeness **policy** — `VMP_EVALUATION_INCOMPLETE_POLICY` (default CLI rejects `evaluation_complete=false`)                                                                                          | consumer sufficiency                                  |
| 282  | fail-closed wrapper (`evaluatePanelSafe`); also the **infrastructure-unavailable** code (Python replay / historical kernel / subprocess cannot execute)                                                        | never fail open; env-unavailable ≠ tampering          |

**Frozen first-failure order:** 268 → 269 → 270 → 271 → 272 → 273 → 274 → 275 → 276 → 277 → 278 →
279, then (audit only) 280, then policy 281, wrapper 282. Structure/auth before semantics; corpus
before cell marking ("verify the exam before marking the answers"); census-omission audit-only;
policy after truth; wrapper catches any throw and any unavailable environment.

**Failure-code distinctions (frozen):** replay executes and output disagrees → **276**; historical
verifier executes and rejects/mismatches → **278**; Python replay / historical kernel / subprocess
**cannot execute** → **282** (never 276/278).

**Missing-capture semantics — (b) honest-flag + policy, strict-by-default CLI.** The core verifier
answers "is this signed statement authentic, consistent, and truthful about its incompleteness?" — a
truthful incomplete bundle returns raw 0. The CLI is **strict by default**:

```
verify-stage5f bundle.json                 # strict: rejects evaluation_complete=false  → raw 281
verify-stage5f bundle.json --attestation-only   # truth-only: honest incomplete → raw 0
```

Output is never a bare PASS — it is structured `{ attestation_valid, representation_complete,
evaluation_complete, policy_accepted, raw }`; a strict rejection still shows the evidence was
truthful (`{ attestation_valid: true, ..., evaluation_complete: false, policy_accepted: false,
raw: 281 }`). Code 281 (honestly insufficient) is distinct from 279 (dishonest declaration).

**Completeness definitions (frozen):**

```text
representation_complete = every (roster-member × case) pair has exactly one cell   // 273 guarantees ⇒ true in a valid bundle
evaluation_complete     = every applicable & mechanically-supported obligation is `evaluated`
                          AND capture_failed == 0 AND missing_capture == 0
```

A legal precommitted `not_applicable`/`unsupported_input` does **not** break evaluation-completeness.

---

## 3. Evidence lanes + attestation + parity

**Lane A — offline CI verification + byte-stable rebuild (no neural execution).**

- Verifies the committed attestation at **public** and **audit** tiers; strict CLI default rejects
  `evaluation_complete=false` (raw 281), `--attestation-only` accepts a truthful incomplete panel.
- Rebuilds evidence into a **clean temp dir / detached worktree**; snapshots sorted per-file
  SHA-256; compares paths, sizes, hashes; runs `git diff --exit-code` against the committed evidence
  dir (not `cmp`), under **Node 26**.
- **Replays the deterministic input adapters (276)** via the pinned Python replay (env manifest
  validated); the pure core consumes the result. Node fails **closed** (raw 282) if the replay
  cannot execute — it never downgrades to structural-only and returns 0.
- **Re-runs the pinned parser (277)** over each categorical cell's committed canonical output token;
  softmax cells recompute the threshold decision by **scaled-integer** comparison.
- **Bootstrap provenance (278)** runs the historical 5E/3V-B verifiers from a detached worktree at
  the exact commit, checked against the pinned source manifest (full transitive kernel).
- **Tamper matrix:** one isolated mutation per load-bearing field class and per raw-code branch
  268→282, plus generated unknown-key / duplicate-cell / chain-fork families.

**Lane B — deterministic two-process/two-key ceremony (frozen evidence, no model).**

- Blind recompute: process 1 (JS) emits canonical content + `panel_plan_digest` + census bijection;
  process 2 (Python, for implementation diversity) independently recomputes and asserts equality.
- **Chain-linearity closure** (raw 270): positions `0..N` unique/contiguous, single terminal head,
  every record reachable from the precommit.
- Emits a signed **`simurgh.vmp.blind_recompute_receipt.v1`** binding
  `{ panel_plan_digest, cell_matrix_digest, capture_log_digest, completeness_digest,
result_chain_head_digest }` with a **distinct** ceremony key. `laneb/verify-laneb-receipt.mjs`
  checks its signature + pinned fingerprint + digest equality with the public/audit artifacts.
- **Acyclic binding (frozen):** result/capture records → `result_chain_head_digest`; receipt binds
  `result_chain_head_digest`; the **closeout** record binds `previous_record_digest =
result_chain_head_digest` **and** `blind_recompute_receipt_digest`; the principal attestation binds
  the final closeout digest. No cycle.
- **Claim:** two-process/two-key separation, **not** independent-party verification.

**Lane C — fresh non-CI _offline pinned-weight_ dual-detector capture (NOT a live endpoint).**

- Isolated environments: `capture_pg2.py` (Prompt Guard 2 86M, local M2) and `capture_lg4.py`
  (Llama Guard 4 12B, 8-bit / GPU droplet), each with its own `requirements-*.lock`; both evaluate
  the **exact shared corpus** (identical `case_id` + `source_input_digest`). `merge_capture_census.py`
  checks the common corpus and builds the unified census (all statuses).
- **Transcript-free, metadata-and-verdict evidence:** source inputs referenced through the committed
  safe-corpus artifact; no free-form model generation is preserved. `capture_failed` /
  `unexpected_categorical_output` for any non-{allow,block} output.
- **Digest-only into the bundle, never CI-gated;** verdicts and any `model_refused` recorded
  honestly, no re-runs for a prettier number.
- **Acquisition lifecycle (frozen):** (1) download pinned snapshots in an explicit acquisition phase,
  (2) verify manifests/digests, (3) set `HF_HUB_OFFLINE=1` + `TRANSFORMERS_OFFLINE=1`, (4) capture
  entirely from the verified cache. "Download if blocked" lives in setup, never inside the ceremony.
- **Signed bound:** offline pinned weights ≠ hosted endpoint — carries
  `live_endpoint_attestation_deferred` untouched.

**Attestation.** Ed25519 over `canonicalJson(content)`; **external-pinned fingerprint checked first**
(269). Two tiers: public = structure + declared completeness; audit = census-bijection recompute.
Fresh `stage5f` attestation key (`INSECURE_FIXTURE_ONLY_stage-vmp.pem`, committed outside the
evidence dir for deterministic rebuild, path-regex allowlisted, excluded from production trust; the
builder never writes/prints/copies the key into evidence); separate ceremony key for Lane B.

**Parity (JS ↔ Python ↔ browser) — the deterministic surface only.** Agree on `canonicalJson`
byte-equality, raw-code **precedence** (Node↔Python full), `decision_evidence` structure + parser
dispatch, and all digest/completeness/policy arithmetic (**scaled-integer** comparison; no verifier
recomputes softmax; no binary float touches a verdict). Do **not** agree on neural floating-point
execution (Lane C, captured once). The browser covers the **portable surface only** and returns
`{ verification_scope: "portable", portable_valid: true, full_attestation_status: "not_evaluated",
historical_verifier_execution: false, audit_census_verified: false, raw: null }` — never `raw: 0`.

**Honest lane bounds (signed):** Lane A proves arithmetic + input-derivation + parser + historical
custody, not the model; Lane C proves a pinned-weight offline run, not a deployment; parity proves
canonical agreement, not FP reproducibility of inference.

---

## 4. Lean + non-claims + limitations + wedge + scorecard

**Lean core (`proofs/stage5f/PanelCompleteness.lean`, zero `sorry`, Lean 4.15) — 8 theorems + 1
lemma:**

1. `CellMatrixBijection` — `cells ≃ roster × corpus` ⇒ `|cells| = |roster|·|corpus|`, exactly one
   cell per obligation. _(Law 1)_
2. `AdapterBindingSound` — `detector_input_digest = digest(applyCommittedAdapter(source, adapter,
tokenizer, truncation))` and those digests equal the plan-bound ones. _(Law 2)_
3. `AcceptedChainBindsSinglePlan` — a linear contiguous accepted chain with precommit@0 and a
   terminal-head binding ⇒ all result records reference the same `panel_plan_digest`. External
   claim names the assumed cryptographic trust condition (no collision-resistance is proved). _(Law 3)_
4. `CensusTerminalBijection` — **all** public cells (every status) ↔ **all** terminal census records;
   every attempt resolves to exactly one terminal record. _(Law 5)_
5. `CompletenessNoLaunder` — one `missing_capture` forces `evaluation_complete=false`; the declared
   flag equals `true` only when the recomputed predicate holds.
6. `ApplicabilityStatusSound` — `not_applicable`/`unsupported_input` legal iff entailed by the
   committed matrix / capability profile. _(Law 4)_
7. `StrictPolicyMayRejectValidAttestation` — `attestation_valid` does **not** imply `policy_accepted`;
   strict-default rejects truthful incompleteness, `--attestation-only` accepts the same structurally
   valid bundle (non-equivalence, not independence).
8. `RosterSubsetUniverseAndBound` — an accepted bundle has `roster ⊆ universe` and the published
   `omission_lower_bound = |universe| − |panel|` is exact (`= |universe \ roster|`) ⇒ a member outside
   the committed universe, or an understated silence surface, is rejected. _(Law 6, invention ①)_

- Lemma `VerifierCodomainHasNoAggregate` — the Stage-5F verifier's **output type** contains no
  aggregate panel-verdict field (a structural codomain statement about our code, **not** a claim that
  no aggregation function can mathematically exist; aggregate-absence is otherwise enforced by schema
  at 268).

**Signed non-claims.** Panel completeness ≠ detection completeness · no aggregate panel verdict is
produced (representation only) · agreement/disagreement is never correctness · heterogeneous
semantics are declared, never mapped · two-process/two-key ≠ independent-party verification · offline
pinned weights ≠ hosted endpoint · bootstrap imports = historical custody, not fresh evidence · the
committed corpus is not claimed representative or saturating · roster precommit prevents _post-result_
omission, not biased _initial_ selection · reproducibility covers the deterministic surface, not
neural FP · recorded-chain precedence ≠ physical/wall-clock pre-existence · a valid signature +
historical-verifier pass prove integrity _under the pinned verifier_, not empirical truth · the
**public tier does not recompute the private census bijection without the audit file** · no detector,
provider, or vendor is ranked or labelled safe/unsafe.

**Signed limitations (up front = 5G+'s attack surface):**

1. Two detectors, small shared corpus — a seed panel, not a saturation study.
2. Initial roster-selection bias is unaddressed — mints `roster_representativeness_deferred`.
3. Offline ≠ endpoint — carries `live_endpoint_attestation_deferred`.
4. Adapter-replay reproducibility is library-version-scoped (pinned; a different
   `transformers`/`tokenizers` build could differ).
5. No downstream-efficacy link — carries `downstream_efficacy_target_deferred` (→ 5H VDE).
6. English-only — carries `multilingual_ruleset_deferred` (→ 5G VML).

**Regulator/lab wedge (gap hunt executed 2026-07-10; source-precision guarded).** The disease in the
wild: safety write-ups often identify selected detectors without a standard machine-checkable roster,
common-case contract, and capture census — e.g. an eval-reporting study reports that some providers
give "insufficient documentation … vague statements lacking methodological detail" for their safety
evaluations (reported, arXiv 2503.17388). VMP makes selective omission un-hideable.
**Regulatory (grounded obligation):** the EU AI Act GPAI **Code of Practice** (Art. 56, published
2025-07-10; obligations from 2025-08-02) **mandates** adversarial testing (red-teaming) before
deployment, before each major update, and at least annually, plus detailed technical documentation
shared with regulators — but the summaries reviewed specify **no machine-checkable panel-completeness
format**. The obligation exists; the recomputable completeness contract does not. (Full Code /
Safety-and-Security-chapter primary text to be pinned before any hard absence claim.)
**Standards seam (primaries pinned):** C2PA attestations are "claims about the security properties of
a device, program, or execution environment" — they vouch for _who/what created the asset_ and
**explicitly do not cover** AI model evaluation, detector-panel performance, or per-case test
completeness (spec.c2pa.org 1.4, attestations). in-toto attests "verifiable claims about any aspect of
how a piece of software is produced" — its completeness object is **supply-chain pipeline steps /
artifacts**, not detector×case obligations (in-toto/attestation). SCITT registers signed supply-chain
statements. None specifies evaluation-panel membership + per-case census completeness — their scope is
simply different.
**Prior-art kill-test (Novelty source map).** The claim survives, narrowed and positioned against four
neighbor classes it is _not_: (a) multi-detector **defense systems** that stack scanners but produce
no attestation (LlamaFirewall arXiv 2505.03574; OpenAI Guardrails); (b) **guardrail
orchestration/aggregation** that scores or selects across guardrails — exactly the axis VMP defers via
`panel_aggregation_policy_deferred` (Best-of-N Guardrail Orchestration arXiv 2606.01513); (c) **ensemble
benchmarks** that report an aggregate risk score, not a per-case recomputable census (AILuminate /
MLCommons arXiv 2503.05731); (d) **supply-chain / lifecycle provenance** attestation whose completeness
object is pipeline steps or artifacts (in-toto, C2PA, SCITT, Atlas arXiv 2502.19567). The uncovered
combination — _representation-completeness over a heterogeneous **detector panel** on a shared committed
corpus, with roster precommit + typed non-results + all-status census bijection_ — is 5F's blade.
**Founder's ledger — one external actor who could run it tomorrow:** a lab safety-eval team already
stacking Prompt Guard + Llama Guard, or a red-team vendor. **One identified technical blocker:** no
shared-corpus precommit + census-bijection format exists — exactly what 5F ships (integration,
governance, and incentive blockers also exist). **Standing 10 lever:** that team runs the verifier on
their own panel (tracked debt).

**Four-axis scorecard — spec-time current / closeout target:**

| Axis               | Current | Closeout target                                                                                              |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| Novelty            | 9.4     | 9.5 after pinning the EU Code primary text + a third detector family                                         |
| Frontier           | 8.7     | 9.4 after the fresh dual-detector disagreement-mined capture _executes_ (else scored down — 5A/5C precedent) |
| Good-for-Anthropic | 9.2     | 9.5 after an external safety-team pilot actually runs the BYO-Panel contract                                 |
| Constitution       | 9.2     | 9.4 once the Panel Contest / Rerun Right (invention ④) ships as the next stage (VPC)                         |

_Movement from the beast pass (2026-07-10): Novelty 9.1 → **9.4** (invention ① Roster Coverage
Commitment / Omission Lower Bound — the completeness object in-toto/C2PA structurally cannot express);
Good-for-Anthropic 8.8 → **9.2** (invention ② BYO-Panel contract makes it self-serve, not gated on us);
Constitution 9.1 → **9.2** (① publishes a visible silence surface). Frontier stays 8.7 until the
disagreement-mined dual capture (invention ③) executes. "Good-for-Anthropic" measures potential
usefulness to assurance teams; it does not imply Anthropic review, adoption, or endorsement._ Tracked
debts (guard on the teeth): execute the fresh dual Lane-C capture (Frontier); pin the EU Code primary
text + add a third detector (Novelty); an external team runs the BYO-Panel contract (Good-for-Anthropic,
the standing 10 lever); ship VPC contest (Constitution).

---

## 5. Module map + K7 net + build-risk ledger

**Core (pure, deterministic) — `tools/simurgh-attestation/stage5f/`**

| Module                   | Responsibility                                                                                                                                                                                                                                                                                       | Code     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `constants.mjs`          | `VMP_SCHEMAS`, `DECISION_SEMANTICS` + `CELL_STATUS` enums, `VMP_RESERVED_SLOTS`, `scaleDecimal`, precision (4dp); **re-exports** the named codes from the global ledger `stage4h/exitCodes.mjs` (where `VMP_RAW_CODES` + `VMP_CHECK_ORDER`/`AUDIT`/`PUBLIC` + `RUN_LEVEL_BY_RAW` live, mirroring 5E) | —        |
| `core/schema.mjs`        | schema id + exact-key/unknown-key + aggregate-field rejection                                                                                                                                                                                                                                        | 268      |
| `core/signature.mjs`     | external-pinned fingerprint first, then Ed25519 (embedded key informational only)                                                                                                                                                                                                                    | 269      |
| `core/chain.mjs`         | linear chain: positions `0..N`, precommit@0, closeout, `previous_record_digest` linkage, single terminal head                                                                                                                                                                                        | 270      |
| `core/plan.mjs`          | `panel_plan_digest` over 5 subdigests + schema ver; roster integrity; **`roster ⊆ universe`** + universe binding (Law 6)                                                                                                                                                                             | 271      |
| `core/corpus.mjs`        | `corpus_digest`, case + `case_class` binding                                                                                                                                                                                                                                                         | 272      |
| `core/matrix.mjs`        | cell-matrix bijection; status-union legality                                                                                                                                                                                                                                                         | 273, 274 |
| `core/applicability.mjs` | applicability-matrix + capability-profile entailment                                                                                                                                                                                                                                                 | 275      |
| `core/adapter.mjs`       | pure structural binding of `detector_input_digest` + adapter/tokenizer/truncation to plan (consumes replay result)                                                                                                                                                                                   | 276      |
| `core/verdict.mjs`       | closed registry: `binary_softmax` (scaled-int compare) + `categorical_generation` (pinned parser)                                                                                                                                                                                                    | 277      |
| `core/bootstrap.mjs`     | pure — validates pin records + runner results                                                                                                                                                                                                                                                        | 278      |
| `core/completeness.mjs`  | representation/evaluation recompute + histogram; **`coverage` recompute (omission_lower_bound + sole_catcher_cases, inventions ①/③)**; strict policy gate                                                                                                                                            | 279, 281 |
| `core/census.mjs`        | audit bijection (all statuses ↔ all terminal records; every attempt → one terminal)                                                                                                                                                                                                                  | 280      |
| `core/vmpCore.mjs`       | evaluator — frozen order 268→282; `evaluatePanel`/`evaluatePanelSafe`; receives impure runner results via orchestration, never trusts a decorative `recorded_raw`                                                                                                                                    | 282      |

**Node CLI — `stage5f/node/`:** `build-vmp-evidence.mjs` (byte-stable builder), `greenBundle.mjs`
(Ed25519 sign, external pin), `verify-vmp-attestation.mjs` (strict default → 281; `--attestation-only`;
`--tier audit`; structured output), `historicalVerifierRunner.mjs` (loads/runs the hash-bound
historical copy), `byoPanelAdapter.mjs` (invention ②: BYO-Panel contract — point VMP at your own
detectors offline; verifies the contract, endorses nothing).

**Python — `stage5f/python/`:** `vmp_parity.py` (canonicalJson byte-equality + full raw-code
precedence + scaled-int verdict + completeness/policy arithmetic), `vmp_adapter_replay.py`
(pinned-env deterministic input-adapter replay), `vmp_bootstrap_verify.py` (parity historical-verifier
runner).

**Lane B — `stage5f/laneb/`:** `run-laneb-recompute-ceremony.mjs`, `verify-laneb-receipt.mjs`,
`README.md`.

**Lane C — `stage5f/lanec/`:** `capture_pg2.py`, `capture_lg4.py`, `merge_capture_census.py`,
`requirements-pg2.lock`, `requirements-lg4.lock`, `capture-result.json`, `README.md`.

**Bootstrap pins — `stage5f/bootstrap/historical-pins.json`** `{stage, release_tag, commit,
verifier_source_digest (full transitive kernel manifest), key_fingerprint, artifact_digest,
recorded_raw}` for 5E + 3V-B.

**Browser — `stage5f/browser/`:** `verify-vmp-portable.js`, `canonical-json.js`, `index.html` + CSP;
exposes the explicit capability set (portable surface only; `raw: null`).

**Keys — `stage5f/keys/INSECURE_FIXTURE_ONLY_stage-vmp.pem`** (outside evidence dir; path-regex
allowlisted; excluded from production trust).

**Evidence — `docs/research/llm-shield/evidence/stage-5f/`:** `vmp-attestation.json`,
`vmp-pinned-key.json`, `roster-precommit.json` + chain records, `shared-corpus.json` (actual safe
source **bytes**), `capture-census.json` (single canonical private census + attempt log; digest ==
`capture_log_digest`), `laneb-receipt.json` (prettier-ignored, Node-26 byte-stable).

**Proofs — `proofs/stage5f/PanelCompleteness.lean`** (7 theorems + 1 lemma) + `lean-toolchain`.

**Tests — `tests/unit/llmShield/stage5f/`:** `_validBundle.mjs` + one per core module
(`schema/signature/chain/plan/corpus/matrix/applicability/adapter/verdict/bootstrap/completeness/
census/vmpCore`) + `constants`, `greenBundle`, `exitCodes`. **`tests/e2e/llmShield/stage5f/`:**
`parity`, `browserParity` (portable surface only), `k7AllFunctions`.

**Reproduce + pack:** `scripts/reproduce-llm-shield-stage5f.sh` (**fail-closed**, two-line gates — no
`cmd && echo` under `set -e`) and `stage5f/conformance-pack/{run.sh,README.md,DROPLET_SETUP.md}`
mirroring 5E's independent-party kit with fail-open fixes + full explicit deps baked in from the
start.

**Verification split into per-runtime gates (K7 cannot cover JS+Python+shell in one net):**
(i) **K7 JS all-functions net**; (ii) **Python coverage + pytest** (`vmp_parity`,
`vmp_adapter_replay`, `vmp_bootstrap_verify`); (iii) **CLI command matrix** (strict /
`--attestation-only` / `--tier audit`, asserting the structured `{...raw:281}` result); (iv) **browser
portable-function net**; (v) **Lean declaration + zero-`sorry` scan**. Cross-stage invariants: 5F's
bootstrap re-run still yields 5E/3V-B's recorded raws, and the frozen prior-reproduce list
`reproduce-llm-shield-stage{4y,4z,5a,5b,5c,5d,5e}.sh` all stay green under the additive codes.

**Build-risk ledger (paid-for lessons, read before Task 1):**

1. Additive codes 268→282 ripple the **global** `exitCodeProbeHygiene.test.js` + per-stage exit-map
   goldens — add additively above the block, use `UNKNOWN_RAW_PROBE(999)` not a hardcoded "unknown"
   probe (4R/4S).
2. Additive codes historically broke 5–6 goldens — run full Node-26 e2e + every frozen prior
   reproduce script before claiming green.
3. **Node 26** (`/opt/homebrew/opt/node@26/bin`) required for byte-stability; the 4H digest builder
   runs only under Node 26 from a clean state.
4. Scores are **decimal strings** (`canonicalJson` throws on BigInt — 4Z/5A); evidence dirs
   prettier-ignored; watch underscore-emphasis corruption in docs.
5. **Reproduce/pack fail-open:** never `cmd && echo "OK"` under `set -euo pipefail` — two lines; the
   pack builder copies every dep (incl. `exitCodes.mjs`) with a fail-closed `copy_path` (both real 5E
   independent-party findings).
6. Lane C acquisition lifecycle (acquire → verify → `HF_HUB_OFFLINE=1`/`TRANSFORMERS_OFFLINE=1` →
   capture from cache); LG4 12B needs memory (8-bit / droplet); `hf download` if cdn-lfs blocked (5B).
7. `node --test <bare-dir>` fails → explicit `*.test.js` glob (4K).
8. `check.sh` locally before push (prettier config, `fetch-depth:0` committed-state checks, exit-map
   ripple) — 4U cost 4 red rounds; Lean is **not** in check.sh, gated by `stage-4-lean-proofs.yml` (4R).

---

## 6. Gap-hunt plan + beast-mode inventions + TDD handoff

**Gap-hunt — EXECUTED 2026-07-10 (Novelty 8.4→9.1; source map in §4 wedge).** Verdict: the blade
survives the kill-test, narrowed and positioned against four neighbor classes (defense systems /
guardrail aggregation / ensemble benchmarks / supply-chain provenance). C2PA + in-toto primaries
pinned (scope explicitly excludes evaluation-panel/per-case completeness); the EU AI Act GPAI Code of
Practice **mandates** adversarial testing + documentation with no machine-checkable completeness
format (primary Code text still to be pinned for a hard-absence claim). Four fronts, each with a
kill-criterion; no absence claim ships until primary text is read:

1. **Mechanism prior-art kill-test.** Queries: "multi-detector attestation," "detector panel
   completeness," "recomputable evaluation panel," "no cherry-picked detector," "ensemble guardrail
   evidence." Only claim "first recomputable multi-detector _completeness_ attestation (roster
   precommit + shared-corpus + all-status census bijection)" if nothing prior does all three; else
   narrow to the exact uncovered combination.
2. **Regulation (primary sources).** EU AI Act GPAI Code of Practice + NIST AI 600-1 — do they
   specify machine-checkable evaluation-panel completeness? Pin the clause text.
3. **Standards seam.** C2PA / in-toto / SCITT / RATS scope statements — read their own words on
   evaluation-panel membership + per-case census completeness.
4. **In-the-wild disease.** Public model cards / safety write-ups reporting a single detector or a
   favorable subset (marked "reported"; motivation, not a counted claim).

**Beast-mode inventions — all folded in (each ships its own anti-gaming non-claim):**

Zero-new-code-path projections/fixtures over already-verified data:

- **A — Panel Completeness Ratio (PCR)** _(derived projection)._ Fraction of `(member × case)`
  obligations reaching `evaluated`, per-member and campaign-wide. Non-claim: "PCR is a coverage
  figure, not a detection rate; completeness is not correctness."
- **B — The Cherry-Pick Test** _(named fixture family)._ A "tempting" panel where dropping detector
  D would flip the _reported_ outcome flagged→clean; the attestation must still carry D's cell
  (exercises 273 + 280). Names the disease it makes impossible.
- **C — Detector Disagreement Ledger** _(projection; the claim-rail made visible)._ Per-case list of
  where members disagree, surfaced as **evidence, never a verdict**. Non-claim: "disagreement is
  surfaced, never adjudicated."

Second beast pass (blade-deepeners, minimal surface):

- **① Roster Coverage Commitment / Omission Lower Bound** _(Law 6; one sub-digest in the plan +
  `roster ⊆ universe` folded into 271; the bound is a projection)._ Precommit the detector _universe_
  you drew from; publish `|universe| − |panel|` as the signed silence surface — the completeness
  object in-toto/C2PA structurally cannot express. Non-claim: "coverage is not representativeness."
- **② BYO-Panel Adapter Contract** _(reuses 5E's BYO-adapter pattern; `node/byoPanelAdapter.mjs`)._
  Any team points VMP at their own detectors offline. Non-claim: "a BYO run is the caller's evidence,
  not ours; we verify the contract, we do not endorse the panel."
- **③ Adversarial Disagreement Mining** _(corpus-design + the `sole_catcher_cases` projection)._ The
  shared corpus is built to expose inter-detector blind spots; the attestation surfaces sole-catcher
  cases. Non-claim: "a sole-catcher is a coverage fact on this corpus, never a ranking."

**Spun out (different blade → next stage VPC):** **④ Panel Contest Cells / the Rerun Right** — a
dissenting party files a signed counter-cell against the same `shared_input_digest`; the attestation
becomes contestable by re-running one cell (4V VDP "contest-as-subpoena" lineage). Mints
`panel_contest_deferred`.

**TDD handoff contract.** The plan is written for a zero-context engineer: file map → tasks, each a
failing-test-first cycle with complete code and exact commands. **Global Constraints copied verbatim**
into the plan header: schema `simurgh.vmp.panel_attestation.v1`; named `VMP_RAW_CODES` 268→282 defined
in the global ledger `stage4h/exitCodes.mjs` (with `VMP_CHECK_ORDER`/`AUDIT`/`PUBLIC` + `RUN_LEVEL_BY_RAW`,
mirroring 5E) and guarded by `exitCodeProbeHygiene.test.js`; `panel_plan_digest = hash(schema_version + roster +
corpus + applicability + adapter_manifest + universe)` with `roster ⊆ universe` (Law 6); **acyclic Lane
B order** (result_chain_head → receipt →
closeout → attestation); decimal-string scores + scaled-int comparison; **Node 26**; the
`INSECURE_FIXTURE_ONLY` key policy; the 276/278/282 failure-code distinctions; fail-closed
reproduce/pack. Per-task **Interfaces blocks**. The build-risk ledger is read before Task 1. Frozen
prior-reproduce list `4y,4z,5a,5b,5c,5d,5e` must stay green.
