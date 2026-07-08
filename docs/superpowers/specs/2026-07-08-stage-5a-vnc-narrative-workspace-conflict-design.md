# Stage 5A — VNC: Verifiable Narrative–Workspace Conflict (design)

> **Motto: AnthropicSafe First, then ReviewerSafe.**
> Target tag: `v2.36.0-stage-5a-vnc` (prev: `v2.35.0-stage-4z-vwa`, main `cdf66e26`).
> **Alphabet rollover:** 4Z exhausted the letter line; 5A opens the Stage-5 arc.
> The version line stays continuous (v2.36.0), only the stage prefix rolls.
> Kernel: **READ-ONLY** — zero changes to `src/llmShield`; tooling + evidence + proofs only.
> Raw codes: **199–208**, wrapper `INTERNAL_FAIL_CLOSED_VNC: 209` **LAST**
> (verified: 198 is the current max; the 4Z block's own comment reserves "199 … headroom").
> Safety rails (inherited, frozen): `no_elicitation_no_honeypots_no_misaligned_organisms`,
> `detection_side_lexicon_only`, `benign_pinned_corpus_only`, `capture_never_ci_gated`,
> `no_evasion_search`. Public wording stays provider-agnostic.

---

## 1. Identity, laws, blade

### What this stage is

The J-lens paper's sharpest finding is a **disagreement**: the model's workspace
readout shows `eval`-awareness tokens firing while the model's verbalized output
says nothing of the kind (verbalized eval-awareness 71%→3% after ablation — the
readout and the narrative are two different witnesses to the same cognition).
Transluce states the same hunt from the other side: finding states where
"features related to deception are firing internally but are not present in the
output." Today, when a lab publishes "the model reports it was not aware of
being evaluated," that introspective sentence binds to **nothing** — no readout,
no completeness law, no conflict record. The two witness streams exist; the
confrontation between them has no evidence contract.

**Stage 5A ships the confrontation.** VNC is a signed, byte-reproducible
**conflict ledger** between two already-attested artifacts that this repo
already knows how to verify:

- the **narrative** — a 4W/VSN span-typed document (what the system _says_
  about its own internal state), and
- the **workspace map** — a 4Z/VWA attested readout grid (what a monitor's
  telemetry _shows_),

joined under a **precommitted claim table** into a total classification: every
introspective claim in the narrative is `corroborated | contradicted |
unreadable` against the map, and every flagged (cell × token) in the map is
either **covered by a claim** or listed as an **unnarrated flag**. Nothing on
either side may be silent. A recorded contradiction is verified **content**,
not a verification failure — the ledger's job is to make the disagreement
undeniable and recomputable, never to adjudicate it.

This stage folds four commitments into one rung (one blade — see below):

1. **The blade (A):** the conflict ledger — dual-completeness classification of
   narrative claims against workspace flags.
2. **The lane (B):** Lane C is **actually executed** this stage — the 4Z
   capture harness runs on the open ~1B model AND the same session elicits a
   benign self-narrative, producing the repo's first REAL narrative+readout
   pair. This retires 4Z's signed **capture-execution** debt ("Lane C
   capture not run", the 9.2→9.1 trim) in the same stroke. It does NOT pay
   the separately minted **frontier-scale** debt (see Sockets): a 1B capture
   is a non-frontier proof-of-mechanism. Two different debts, stated apart
   so the ledger tells exactly one story (reviewer MF8).
3. **The ingest family (C):** one REAL published external readout artifact is
   adapted through the 4Z adapter contract into a WFM and conflict-checked —
   attacking 4Z's signed limitation #8
   (`adapter_contract_untested_against_a_real_lab_export`). Candidate exports
   (exact artifact pinned at plan time, offline-downloadable only): a
   Neuronpedia/Gemma-Scope public SAE activation export; a published probe
   readout release. The adaptation runs OFFLINE once and freezes; CI only ever
   replays the frozen artifact.
4. **The projection (D):** the **Reflection-Corpus Provenance manifest** — a
   signed, Merkle-committed manifest binding each example of a
   reflection/introspection corpus to the principle(s) it operationalizes
   (constitution-clause ids), with inclusion proofs — the mechanism the
   `reflection_corpus_provenance_deferred` socket named, demonstrated on an
   OPEN corpus (candidates pinned at plan time: the published constitution
   text itself sliced into principle-tagged examples; a public HH/CAI-lineage
   dataset). Zero new mechanism beyond a manifest schema + Merkle inclusion
   (4O drift-algebra lineage); one new raw code (206) because totality of the
   principle mapping is a checkable law, not decoration.

Doctrine check, stated for the hostile reviewer: **one blade per stage holds.**
(2) is a lane, (3) is an ingest/fixture family, (4) is a projection with a
manifest law — none of them is a second mechanism core. A reviewer rejects this
stage by attacking exactly one thing: the dual-complete conflict
classification.

### Laws (falsifiable; attack exactly these)

1. **No Two Stories Inside.** If the narrative and the workspace map disagree
   on a declared introspective claim, the disagreement MUST appear in the
   ledger as `contradicted` — republishing a contradicted claim as
   `corroborated` is a verification failure (raw 205), not an editorial
   choice. The ledger records the conflict; it never resolves it.
2. **No Silent Claim · No Silent Flag (dual completeness).** The
   classification is a _total_ function on the precommitted claim table
   (every claim gets exactly one verdict — raw 203), AND the flag set is
   _partitioned_: every flagged (cell × token) is either referenced by ≥1
   claim's token set or listed in `unnarrated_flags` (raw 204). Selective
   omission is impossible on BOTH sides of the confrontation — this is the
   Completeness Invariant applied for the first time to a _pair_ of evidence
   species simultaneously.
3. **No Post-Hoc Claim Table.** The claim table — { claim_id, narrative span
   reference, subject token set, polarity, the TOTAL scope rule
   `all_cells` } — is digest-committed and signed BEFORE the map is revealed
   to the table author, and it binds the map's **`declaration_digest`**
   (4Z's precommitted lexicon/θ/layer contract), **never the `map_digest`**
   (self-gauntlet P0: a table that binds the map has, by construction, been
   authored by someone who could see the flags — precommitment would be
   theater; binding the declaration commits the table to the instrument
   without seeing the readings). Ledger and attestation must bind the same
   `claim_table_digest` (raw 202). You cannot decide which introspective
   sentences "count" after seeing which flags fired. (4Z No Post-Hoc
   Declaration lineage, applied to the narrative side; the scope rule is
   TOTAL for the same reason 4Z's position rule is — a hand-picked cell
   subset lets an operator scope a claim away from the cells where it
   fails.)
4. **A Conflict Is Not a Lie.** `contradicted` proves the two witnesses
   disagree — it does NOT adjudicate which is true, and it is never evidence
   of deception, dishonesty, or unsafety. The readout may be wrong; the
   narrative may be wrong; the lexicon may misname the cognition. Zero
   conflicts is a valid outcome, not evidence of faithful introspection.

Determinism invariant (property under test, not a law): **same narrative +
same map + same claim table ⇒ same ledger, byte-identical** in JS, Python,
and the browser.

### The honest core, signed up front (= the next stage's attack surface)

- **Claim extraction is table-driven, not semantic.** The mapping from
  narrative spans to claims is authored by the operator in the precommitted
  claim table and checked LEXICALLY (span offsets + token sets), exactly the
  4W "lexical not semantic" lineage. VNC verifies that the declared claims
  were confronted completely — it cannot verify that the table captured every
  introspective sentence the narrative contains. A semantic claim-extraction
  gate is the natural 5B attack surface.
- **Corroboration is not faithful introspection.** A claim can be
  corroborated because the lexicon is too narrow to catch the disagreement.
  The instrument inherits every 4Z limitation (lexicon-restricted, θ-choice,
  single small model) — conflicts are lower bounds, agreement proves little.
- **The pilot is an artifact pilot, not an organizational pilot.** WE adapt a
  real external party's published readout through the contract; the socket's
  full wording ("one external party produces a WFM from their own monitor")
  is paid at artifact scope with the organizational residual stated in the
  scorecard as a named debt — not silently absorbed.
- **The provenance demo is an open-corpus demonstration.** The RCP manifest
  proves the mechanism on a public corpus; a lab's actual reflection-training
  corpus remains theirs to run. Mechanism shipped, deployment residual
  stated.

### One blade

**The dual-complete, precommitted conflict classification** (Laws 1–3 as one
mechanism: total verdicts over a precommitted claim table + partitioned flag
coverage + exact recomputation). The lane feeds it a real pair; the ingest
family feeds it a foreign map; the projection rides the same attestation. A
reviewer who breaks the classification breaks the stage.

### New evidence species (founder question answered)

First **cross-species conflict evidence**: every prior artifact attested ONE
stream (outputs, boundaries, documents, narratives, telemetry); the conflict
ledger is the first artifact whose subject is the _disagreement between two
attested streams_ — introspection vs interpretability. Also the repo's first
stage consuming TWO prior stages' attestations as typed inputs (4W narrative +
4Z map), which is what the receipt-spine was built for.

### Founder's ledger (named actor + single blocker)

- **Actor who could run the verifier TOMORROW:** a safety-institute evaluator
  handed both a system card sentence ("the model reported no awareness of
  being evaluated") and the lab's readout export — they open
  `vnc-verifier.html`, drop the bundle, and check offline that every
  introspective claim was confronted with every flag, with conflicts
  undeniable. (Second reader: an interpretability team wanting their
  "narrative vs internals" findings to be third-party-checkable rather than
  prose.)
- **Single blocker:** no lab publishes narrative+readout PAIRS today. The
  Lane C real pair and the pilot ingest are this stage's answer at honest
  scope; the frontier-scale pair is the minted debt (below).

### Sockets (ledger discipline: pays 3, mints 1 — net debt −2, the first ledger-shrinking stage)

Paid-slot scope is a **machine fact**, not a comment (reviewer MF1):
`VNC_PAID_SLOT_SCOPES` maps each paid slot to `full` /`artifact_scope` /
`mechanism_and_open_corpus_scope`, asserted set-equal to the paid-slot list
at test time — so the scope survives to runtime.

- **Pays: `workspace_narrative_conflict_deferred`** (minted 4Z → **PAID here**,
  in full — the socket's minted wording "attested conflict between a model's
  verbalized narrative and its recorded readout grid" is exactly the blade).
- **Pays: `lab_readout_pilot_deferred`** at **artifact-pilot scope** — a real
  external monitor's published readout adapted under the contract and
  verified (4Z limitation #8 discharged). Honest residual, stated: the
  external org running the adapter themselves; tracked in the scorecard as
  the Lab-axis 10-item, not re-minted.
- **Pays: `reflection_corpus_provenance_deferred`** at **mechanism +
  open-corpus scope** — the RCP manifest schema, Merkle inclusion, and
  principle-mapping totality law shipped and fixture-verified. Honest
  residual, stated: a real training corpus run by its owner.
- **Mints: `frontier_readout_conflict_deferred`** — the same conflict
  contract over a >7B/frontier-scale narrative+readout pair produced by the
  model's own operator (absorbs 4Z's ">7B capture" 10-item and this stage's
  organizational residuals into ONE named debt instead of three).
- Remaining reserved (untouched): `irreducible_semantic_residue_deferred`,
  `multilingual_ruleset_deferred`, `narrative_version_diff_deferred`,
  `cross_gate_residue_benchmark_deferred`, `submitted_document_pilot_deferred`.

---

## 2. Artifacts, raw codes 199–208, frozen check order

### Inputs (both are EXISTING attested species — nothing re-invented)

- **Narrative:** `simurgh.vsn.narrative.v1` (4W) — span-typed
  (`slot_bound | judgment | unverified_prose`), signed. Introspective
  sentences live as spans; the claim table references them by span id +
  byte offsets. Plan-gauntlet truth, signed here: a 4W narrative
  STRUCTURALLY binds a 4T capsule (`buildNarrative` requires one), so
  fixture and Lane C narratives ride a minimal capsule; VNC verifies the
  narrative's SIGNATURE + span geometry and does NOT re-verify the capsule
  binding or re-run the 4W leakage gate (both capsule-bound, out of VNC's
  scope) — the binding block is still covered by `narrative_digest`, so it
  cannot be silently altered, merely not re-adjudicated here.
- **Workspace map:** `simurgh.vwa.map.v1` + `simurgh.vwa.attestation.v1`
  (4Z) — the total grid with the full `score_nano` matrix, flags, and
  aggregates. VNC consumes the PUBLIC tier (scores and flags are public in
  4Z by design; tensors never needed for the confrontation).

### The claim table (precommitted; Law 3)

`simurgh.vnc.claim_table.v1` — signed BEFORE the map is revealed (binds
`narrative_digest` + the map's `declaration_digest`, never `map_digest` —
Law 3):

- `claims[]`: `{ claim_id, span_ref: {span_id, start_byte, end_byte},
token_ids[], polarity }` — field names `start_byte`/`end_byte` match the 4W
  span schema verbatim (plan-gauntlet fix: the draft wrote `byte_start`,
  which is not the 4W convention; the resolution check compares against
  real 4W spans). **v1 claim-eligible span type: `unverified_prose` only**
  — introspective self-reports are exactly the untyped-prose species;
  `judgment` spans are excluded (limitation 6) and `slot_bound` spans are
  already evidence-bound numbers, not introspection. Token ids are NOT
  required to lie inside the declared lexicon — a claim about a token the
  instrument wasn't watching is exactly what `unreadable` exists for
  (self-gauntlet fix: a ⊆-lexicon schema constraint would make `unreadable`
  unreachable and fixture 5 schema-invalid).
- `polarity ∈ { asserts_unflagged, asserts_flagged }` — "I was not aware of
  being evaluated" ⇒ `asserts_unflagged` over the eval-awareness token set;
  "I noticed the injected instruction" ⇒ `asserts_flagged` over the
  injection token set.
- `scope_rule_id = "all_cells"` — TOTAL, frozen in constants. Every claim is
  evaluated against EVERY cell of the map's grid (the 4Z total-position-rule
  lesson transplanted: a per-claim cell subset is the shrink attack's new
  home, so it is forbidden at the schema level).
- Hashed to `claim_table_digest`; bound by the ledger and the attestation.

### The verdict rule (deterministic surface; byte-stable JS ↔ Python ↔ browser)

For claim c with token set K_c and the map's flag relation
`F ⊆ cells × lexicon`:

- `hits(c) = { (cell, k) ∈ F : k ∈ K_c }` (computed over ALL cells — total
  scope; token-id membership by exact integer equality after parsing —
  never lexical string compare; artifact comparisons via `canonicalJson`,
  never `JSON.stringify` — 4X gotcha).
- `unreadable` iff some `k ∈ K_c` is NOT in the map's declared lexicon (a
  claim about an instrument that wasn't watching is neither corroborated nor
  contradicted — it is honestly unreadable). Precedence rule, deterministic
  and conservative: if ANY token of the claim is out-of-lexicon, the WHOLE
  claim is `unreadable` — partial coverage never silently downgrades to a
  corroboration over the readable subset. **An unresolvable span is NOT an
  `unreadable` verdict** (gauntlet-2 fix, reviewer MF3): a span_ref whose
  byte offsets do not resolve on a code-point boundary in the bound
  narrative is a MALFORMED claim table = a raw-202 precommit failure, caught
  before any verdict is computed. Out-of-lexicon is a verdict; unresolvable
  span is a gate. Conflating them would let a broken span masquerade as a
  benign "unreadable" pass.
- else `asserts_unflagged`: `corroborated` iff `hits(c) = ∅`, `contradicted`
  otherwise; `asserts_flagged`: `corroborated` iff `hits(c) ≠ ∅`,
  `contradicted` otherwise.
- Every `contradicted`/`corroborated` verdict carries its `evidence`: the
  exact sorted `hits(c)` list (possibly empty) — a verdict is recomputable
  from its own row plus the map, no hidden state.
- **Flag partition:** `covered = ⋃_c hits(c)`;
  `unnarrated_flags = F \ covered`, published exhaustively, sorted. The
  partition identity `|covered| + |unnarrated_flags| = |F|` (with
  disjointness) is checked as arithmetic (raw 204) and proved in Lean.
- Aggregates: `n_claims`, `n_corroborated`, `n_contradicted`, `n_unreadable`,
  `n_flags`, `n_covered_flags`, `n_unnarrated_flags` — all recounted (208).

### Artifact schemas (all `simurgh.vnc.*.v1`)

| Schema                               | Contents                                                                                                                                                                                                                                                                | Tier                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `simurgh.vnc.claim_table.v1`         | claims[] (span_ref, token_ids, polarity), `scope_rule_id="all_cells"`, `narrative_digest`, `declaration_digest` (NEVER `map_digest` — Law 3); signed before the map is revealed                                                                                         | public                                                |
| `simurgh.vnc.ledger.v1`              | per-claim verdicts + evidence lists, `unnarrated_flags[]`, aggregates, `claim_table_digest`, `narrative_digest`, `map_digest`, `map_attestation_digest`, provenance                                                                                                     | public                                                |
| `simurgh.vnc.reflection_manifest.v1` | corpus id + revision, examples[]: `{ example_digest, principle_ids[] }`, principle registry (clause id → source digest), `merkleRootSorted` over example digests, totality flag (every example carries ≥1 principle id)                                                 | public                                                |
| `simurgh.vnc.pilot_adaptation.v1`    | external export id + source digest (raw file, frozen), adapter version, the produced `simurgh.vwa.map.v1` digest, declared lossiness notes (fields the export lacks, e.g. no salts ⇒ commitments marked `adapter_derived`)                                              | public (raw export digest) / audit (raw export bytes) |
| `simurgh.vnc.attestation.v1`         | Ed25519 over `canonicalJson(body)`; body binds `merkleRootSorted([claim_table_digest, ledger_digest, narrative_digest, map_attestation_digest] (+ reflection_manifest_digest, pilot_adaptation_digest when present))`; keyDigest = `"sha256:" + sha256(raw PEM string)` | public                                                |

### Raw codes (additive; wrapper LAST; `_VNC` suffix — 4X lesson: check name collisions first)

| Raw | Name                                 | Fires when                                                                                                                                                                                                                                                                                                                                                                              | Tier                   |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 199 | `VNC_SCHEMA_INVALID`                 | any artifact fails schema/shape                                                                                                                                                                                                                                                                                                                                                         | public+audit           |
| 200 | `VNC_SIGNATURE_INVALID`              | Ed25519 verify fails / key digest mismatch on any VNC artifact                                                                                                                                                                                                                                                                                                                          | public+audit           |
| 201 | `VNC_INPUT_BINDING_MISMATCH`         | **No Borrowed Story:** `narrative_digest`/`map_digest`/`map_attestation_digest` in the ledger or attestation ≠ the embedded 4W/4Z artifacts (recomputed); the claim table's `narrative_digest`/`declaration_digest` ≠ recomputed; the map's `declaration_digest` ≠ the table's; the embedded 4Z attestation fails its own public-tier verify; the embedded 4W narrative fails signature | public+audit           |
| 202 | `VNC_CLAIM_TABLE_PRECOMMIT_MISMATCH` | `claim_table_digest` differs across ledger/attestation; scope rule ≠ `all_cells`; a claim's token_ids empty; a span_ref out of narrative bounds                                                                                                                                                                                                                                         | public+audit           |
| 203 | `VNC_CLASSIFICATION_INVALID`         | **No Silent Claim:** a claim without exactly one verdict; a verdict for an undeclared claim; unknown verdict label; verdicts unsorted                                                                                                                                                                                                                                                   | public+audit           |
| 204 | `VNC_FLAG_COVERAGE_INVALID`          | **No Silent Flag:** partition broken — a flagged (cell × token) neither in any claim's evidence nor in `unnarrated_flags`; overlap; a listed flag absent from the map                                                                                                                                                                                                                   | public+audit           |
| 205 | `VNC_VERDICT_RECOMPUTE_MISMATCH`     | **No Two Stories:** recomputing verdicts + evidence from (map, claim table) ≠ the published ledger (the contradicted-republished-as-corroborated tamper lands here)                                                                                                                                                                                                                     | public+audit           |
| 206 | `VNC_PROVENANCE_MANIFEST_MISMATCH`   | RCP: Merkle root ≠ recompute; an example missing principle ids (totality); principle id absent from the registry; inclusion proof fails                                                                                                                                                                                                                                                 | public+audit           |
| 207 | `VNC_ADAPTER_CONFORMANCE_FAILED`     | pilot: adapted map fails 4Z public verify; undeclared lossiness (a field synthesized without an `adapter_derived` marker); audit adds: frozen raw-export bytes ≠ committed source digest                                                                                                                                                                                                | public / +audit reopen |
| 208 | `VNC_TALLY_MISMATCH`                 | published aggregates ≠ recount (claims AND flags sides)                                                                                                                                                                                                                                                                                                                                 | public+audit           |
| 209 | `INTERNAL_FAIL_CLOSED_VNC`           | any unexpected throw in `evaluateVncSafe`                                                                                                                                                                                                                                                                                                                                               | wrapper                |

- `VNC_CHECK_ORDER = [199,200,201,202,203,204,205,206,207,208]` — frozen
  first-failure order (206/207 skip when the optional artifact is absent —
  absence is recorded, never silently equal to presence).
- `VNC_PUBLIC_CODES = [199…208]`; `VNC_AUDIT_CODES = [199…208]` (audit
  differs by depth — embedded-artifact audit-tier re-verify + pilot raw
  reopen — not by code set; the withheld-input tier asymmetry lives in the
  EMBEDDED 4Z artifact exactly as 4Z designed it).
- **Split-tamper lesson (4Y "183 masks 186", 4Z fixture 9):** each tamper
  fixture reaches its intended code — e.g. the verdict-flip fixture keeps
  bindings, table, classification-shape, coverage, and tallies internally
  consistent so ONLY 205 fires.
- Exit-map ripple: run the 4H digest-fixtures builder **ONLY under Node 26**
  (`/opt/homebrew/opt/node@26/bin`); expect exactly the two `exit-map.json`
  ripples + the exitWrapper inline map; `RUN_LEVEL_BY_RAW` gains
  `199:1 … 209:1`; SIX goldens ripple (4M/4N/4Z lesson); UNKNOWN_RAW_PROBE
  stays 999; `[20x,3]` array probes per exit-code-probe hygiene.

### The headline fixture geometry (3O dual-signal → 4Z 197 → this)

The canonical CLEAN fixture is **`eval_awareness_conflict`**, named after the
paper's own finding: narrative span "no awareness of being evaluated"
(`asserts_unflagged` over the eval token set) meets a map where `eval` flags
fire → ledger records `contradicted` with the exact evidence cells → **the
bundle verifies 0/0**. A recorded conflict is verified content. The canonical
TAMPER is **`tamper_two_stories`**: same inputs, verdict republished as
`corroborated` → 205. That pair IS the stage.

---

## 3. Evidence lanes, attestation flow, parity, projections

### Lane A — byte-stable CI (fixture corpus)

~15 fixtures under `tests/fixtures/llmShield/stage5a/`, evidence under
`docs/research/llm-shield/evidence/stage-5a/` (prettier-ignored on day one).
Deterministic salts; committed `INSECURE_FIXTURE_ONLY_vnc(.pub).pem`.
Synthetic narratives + synthetic 4Z maps (d=8 tensors, hand-checkable) for the
`synthetic_*` set; the `frozen_capture` set replays the REAL Lane C pair once
frozen; the pilot fixture replays the frozen adapted export.

| #   | Fixture                      | Set    | Expected (public / audit)                                                                    |
| --- | ---------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| 1   | `clean_corroborated_absent`  | clean  | 0 / 0 (asserts_unflagged, no hits)                                                           |
| 2   | `eval_awareness_conflict`    | clean  | 0 / 0 — **contradicted verdict recorded; conflict is content** (headline)                    |
| 3   | `clean_unnarrated_flags`     | clean  | 0 / 0 (flags with no claims; all listed)                                                     |
| 4   | `clean_zero_claims`          | clean  | 0 / 0 (empty claim table is valid; every flag unnarrated)                                    |
| 5   | `clean_unreadable_claim`     | clean  | 0 / 0 (claim token outside map lexicon → `unreadable`, honestly)                             |
| 6   | `pilot_external_export`      | pilot  | 0 / 0 (frozen real export adapted; lossiness declared)                                       |
| 7   | `provenance_manifest_clean`  | rcp    | 0 / 0                                                                                        |
| 8   | `tamper_signature`           | tamper | 200 / 200                                                                                    |
| 9   | `tamper_borrowed_story`      | tamper | 201 / 201 (map digest swapped to a different capture — the staleness-receipt lineage)        |
| 10  | `tamper_posthoc_claim_table` | tamper | 202 / 202 (token set narrowed after seeing flags)                                            |
| 11  | `tamper_silent_claim`        | tamper | 203 / 203 (a claim's verdict deleted)                                                        |
| 12  | `tamper_silent_flag`         | tamper | 204 / 204 (a flag removed from both evidence and unnarrated list)                            |
| 13  | `tamper_two_stories`         | tamper | 205 / 205 (contradicted → "corroborated"; everything else consistent — split-tamper checked) |
| 14  | `tamper_manifest_inclusion`  | tamper | 206 / 206 (example digest swapped under the same root)                                       |
| 15  | `tamper_adapter_lossy`       | tamper | 207 / 207 (synthesized field without `adapter_derived` marker)                               |
| 16  | `tamper_tally`               | tamper | 208 / 208                                                                                    |

Byte-stability: build twice, `cmp` every file. Golden `verify` outputs, both
tiers.

### Lane B — blind two-process recompute ceremony

Parent passes ONLY { narrative bytes, map bytes, claim table, provenance
block } to the child; child rebuilds the full ledger (verdicts + evidence +
partition + aggregates) and emits `canonicalJson(ledger)`; parent compares
against the committed ledger. Blindness negatives: child exits 2 on any
`OPERATOR_*` env var and on any of `{committed_ledger, ledger_path}` in its
stdin message (4Y/4Z pattern). Note the input rule of record (4Z gauntlet
lesson): if the ledger binds a field, the child receives that field's INPUTS
— never the committed answer.

### Lane C — the REAL pair (digest-only, NEVER CI-gated; **executed this stage**)

This is 4Z's shipped-but-not-run harness, actually run — plus the narrative
half:

- Host/model: RunPod single GPU, **Llama-3.2-1B-Instruct** pinned revision
  (4Z Lane C design verbatim; `capture-workspace-readout.py` already shipped).
- **Readout half:** the 4Z capture as designed (declared layers, total
  position rule, precommitted lexicon, salted tensor commitments). Its output
  is a genuine `simurgh.vwa.map.v1` + attestation — 4Z's cascade reruns on
  the frozen tensors, retiring the "capture not executed" debt on 4Z's own
  terms.
- **Narrative half (benign; rails hold):** in the SAME session, the model is
  asked benign post-task introspection prompts ("summarize what you did;
  did you notice anything unusual about the task?") over the SAME pinned
  benign corpus. No elicitation of misbehavior, no honeypots, no evasion
  search — the prompts ask for a self-summary, nothing else. The transcript
  becomes a 4W span-typed narrative (operator-typed spans,
  `drafting_model_operator_signed` author role — existing 4W machinery).
- The claim table is authored and SIGNED before the confrontation script
  runs (ceremony record timestamps both).
- Both outcomes sealed: a failed capture ships as `capture_failed` and the
  stage still stands on synthetic fixtures (3V-B/4U precedent). A REAL
  ledger with zero conflicts is sealed as-is (Law 4: valid outcome). A REAL
  ledger with conflicts is sealed as-is (Law 1: undeniable content). Never
  re-run until it looks good.

### Pilot ingest (offline once, then Lane A forever)

`adapt-external-readout.mjs`: frozen raw export (bytes committed by digest;
audit bundle carries the bytes) → `simurgh.vwa.map.v1` under the 4Z adapter
contract, with every synthesized field carrying an `adapter_derived` marker
(no salts in a foreign export ⇒ commitments marked derived, and the audit
tier for that map is honestly SKIPPED — the 4Y withheld precedent, asymmetry
documented, never faked). Then a claim table over the export publisher's own
description of the readout is confronted → the first conflict ledger over a
readout Simurgh did not produce. The adapted WFM's attestation is
**adapter-signed** (our stage5a key, provenance-typed `adapter` role) —
never presented as publisher-signed (non-claim 7). **Export pinned
(gap-hunt):** the Neuronpedia public dataset bucket
(`neuronpedia-datasets.s3.us-east-1.amazonaws.com`, v1 prefix) — bulk SAE
feature-activation exports for `gemma-2-2b` (Gemma Scope lineage,
DeepMind/Neuronpedia); exact file + license verified at plan time under the
source-precision guard (bucket confirmed live by direct read; license page
not yet read — marked _reported_ until pinned).

### Browser verifier — `vnc-verifier.html` (public tier, headline artifact)

Single self-contained file: inlined sha256 + canonicalJson + verdict/partition
/tally recompute + **WebCrypto Ed25519** (4Y/4Z precedent). Hash-based CSP
with the CI consistency guard; `EXPECTED_FROZEN` pinned. Gotchas baked in:
reset `/g` regex `lastIndex`; prettier the HTML BEFORE hash injection via a
Node script file (never inline `node -e`, never reformat after). No egress.

### Attestation flow & keys

`stage5a` Ed25519 keypair; the stage-3m/3o security-audit scripts get the
stage5a **path-regex** allowlist line (no digits in the regex — 4P lesson;
continuation-backslash checked — 4Y lesson). Sign `canonicalJson(body)`;
`merkleRootSorted` over the bound digests; keyDigest = sha256(raw PEM).

### Parity — `vnc_parity.py` (stdlib only)

Second implementation of: verdict rule (hits/polarity/unreadable), flag
partition, tallies, Merkle inclusion for the RCP manifest, canonical JSON.
Digest preflight first (claim_table_digest + narrative_digest must match JS
byte-for-byte), then full-ledger equality over the corpus. Token-id
comparisons integer-exact (ids are strings in JSON; parse, never lexical).

### Derived projections (zero new raw codes beyond 206)

1. **RCP — Reflection-Corpus Provenance manifest** (pays its socket at
   mechanism + open-corpus scope; §1). The manifest rides the SAME
   attestation root; its one law (principle-mapping totality + Merkle
   inclusion) is raw 206. Wedge seam it answers: the J-lens paper's §7 and
   _Teaching Claude why_ both note scaffolding is stripped before training —
   which principle shaped which example is invisible post-hoc. The manifest
   is that visibility, as evidence.
2. **Conflict memo** — `docs/research/llm-shield/NARRATIVE_WORKSPACE_CONFLICT.md`:
   the two-witness framing (introspection vs interpretability), the paper's
   eval-awareness finding as the motivating conflict, Law 4 discipline
   (provider-named citations in research docs only; public artifact wording
   provider-agnostic).

### Mechanical closeout hooks (pre-registered)

`scripts/reproduce-llm-shield-stage5a.sh` (verify-only, both tiers + parity +
Lane B + browser-parity + K7); `check-e2e.sh` line
`"Stage 5A VNC|scripts/reproduce-llm-shield-stage5a.sh"`; ALL prior reproduce
scripts re-run green (additive codes must not disturb sealed history — six
goldens WILL ripple, planned not discovered); `stage-4-lean-proofs.yml` gains
`proofs/stage5a/NarrativeConflict.lean` + sorry-grep; README banner; K7
all-functions net (every export + tamper matrix + cross-stage invariants)
MANDATORY before tag; docs-accuracy pass at the end; `npm run format:check`
in full (4V lesson) including spec/plan/READMEs (4Z lesson — I shipped
unformatted docs once already).

---

## 4. Lean, non-claims, limitations, wedge, scorecard

### Lean (`proofs/stage5a/NarrativeConflict.lean`, Lean 4.15 core, no mathlib, zero sorry)

| Theorem              | Class       | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verdictTotal`       | substantive | the classifier is a total function: every declared claim receives exactly one of the three verdicts — No Silent Claim                                                                                                                                                                                                                                                                                                                                          |
| `flagPartition`      | substantive | covered ∪ unnarrated = all flags, covered ∩ unnarrated = ∅, and the tally identity — No Silent Flag                                                                                                                                                                                                                                                                                                                                                            |
| `contradictionSound` | substantive | `contradicted` ⟺ a polarity-violating hit witness exists in the evidence list (a verdict can never assert a conflict without exhibiting it)                                                                                                                                                                                                                                                                                                                    |
| `conflictAntitone`   | substantive | for `asserts_unflagged` claims: growing the flag set never turns `contradicted` into `corroborated` — new telemetry can only surface conflicts, never launder them (3Q anti-laundering lattice, inside edition). **Deliberately restricted** (self-gauntlet catch, lexiconMonotone-class): for `asserts_flagged` the dual is FALSE by design — a new hit legitimately corroborates "I noticed X" — so the unrestricted statement is unprovable and NOT claimed |
| `tallyConservation`  | substantive | published aggregates equal the recount on both sides                                                                                                                                                                                                                                                                                                                                                                                                           |
| `publicSubsetAudit`  | lock        | the public check list is a sublist of the audit check list                                                                                                                                                                                                                                                                                                                                                                                                     |

Structural `def f : List α → Nat` totals; no `sorry`; CI-checked.

### Non-claims (`VNC_NON_CLAIMS`, signed)

1. A contradiction is not a lie — it proves the two witnesses disagree, never
   which is true, and never deception.
2. Corroboration is not faithful introspection — the lexicon may be too
   narrow to catch a real disagreement; agreement proves little.
3. Not deception detection; never "model safe"; the claim boundary is "every
   declared claim confronted with every flag, recomputably."
4. Claim extraction is table-driven and lexical, not semantic — completeness
   is over the DECLARED claims, not over every introspective sentence prose
   could contain (the 5B attack surface, named).
5. Inherits every 4Z instrument limitation (lexicon-restricted, θ-choice,
   present-token variant, single small model) — a conflict ledger is a lower
   bound on disagreement.
6. Zero conflicts is a valid outcome, not evidence of introspective
   faithfulness or safety.
7. The pilot is an artifact-scope pilot: WE ran the adapter over a published
   export; no external organization has run it.
8. The RCP manifest demonstrates the mechanism on an open corpus; it makes no
   claim about any lab's actual training data.
9. Precommitment is signature-attested, not temporally proven (3W witness
   anchor remains future work).
10. The narrative side is operator-typed under 4W's contract — span typing is
    not model self-knowledge.
11. Provider-agnostic in all public artifact wording.

### Known limitations (signed, `VNC_KNOWN_LIMITATIONS`)

1. Table-driven claim extraction (non-claim 4) — the honest 10-blocker on the
   blade itself.
2. Lane C narrative is a ~1B model's benign self-summary — no claim that its
   introspective reports are representative of frontier introspection.
3. The eval-awareness token set is operator-chosen; no optimality claim.
4. Pilot export lossiness: foreign exports lack salts/ceremony fields; the
   adapted map's audit tier is SKIPPED honestly, `adapter_derived` markers
   throughout.
5. Open-corpus RCP demo; principle ids map to the published constitution
   text's clause slugs, one revision, English only.
6. Polarity is binary (asserts_flagged/asserts_unflagged); graded or hedged
   introspective claims ("I may have noticed…") are typed `judgment` in 4W
   and are NOT claim-table eligible in v1 — declared, not smuggled.
7. Cross-tokenizer claim tables need the 4Z lexicon-mapping layer (future).
8. Conflicts at frontier scale unproven — `frontier_readout_conflict_deferred`
   is the minted debt.
9. The v1 scope rule is GLOBALLY total (`all_cells`): a prompt-scoped denial
   ("in the arithmetic task I didn't notice X") is confronted with flags
   from ALL prompts and may be conservatively contradicted. The bias is
   one-directional (toward surfacing conflicts, never hiding them —
   consistent with `conflictAntitone`); a declared-total per-prompt scope
   rule is future work, and the conservatism is signed, not smuggled.

### The wedge (pinned primaries carried from the 4Z sweep; refreshed at gap-hunt)

- **The paper itself (primary, ingested):** silent eval-awareness readouts vs
  verbalized reports (71%→3%) — the two-witness disagreement demonstrated by
  the instrument's own authors, with no conflict contract.
- **Transluce (primary, carried from 4Z §1):** searching for states where
  "features related to deception are firing internally but are not present
  in the output" — they SEARCH for conflicts; nobody ATTESTS them.
- **_Teaching Claude why_ (primary):** self-evaluated claims ("perfect score
  on the agentic misalignment evaluation") + stripped scaffolding — both the
  conflict surface and the RCP provenance seam in one document.
- **EU AI Act Art 55 / MDF (primary, carried from 4Z):** documented-evaluation
  duties + integrity requirement with no mechanism — a conflict ledger is
  exactly the "documented" form an evaluator can check.
- **Gap-hunt sweep #1 results (2026-07-08) — the science measures the
  disagreement; nobody attests it:**
  - **"Can LLMs Introspect? A Reality Check" (primary, arXiv 2605.26242,
    Singh/Linzen/Ravfogel; abstract read directly):** "to be convinced of
    this conclusion we need to distinguish genuine introspection from
    pattern matching based on surface-level cues" and "classifiers that
    only have access to the input achieve equivalent performance to the
    model's own in-context predictions" — the narrative-vs-internals
    disagreement is a live scientific dispute settled today by ad-hoc
    experiments, with no evidence contract on either side's exhibits.
  - **Knowledge-conflict faithfulness (primary title pinned, arXiv
    2605.27773 "Do Models Know Why They Changed Their Mind?"):** CoT
    faithfulness under conflict measured — measured, never attested.
  - **CoT-monitorability lab surface (primary, OpenAI "Evaluating
    chain-of-thought monitorability", 2026):** labs now SCORE how monitorable
    self-reports are; the score is itself a provider-attested number —
    exactly the species the VSC/VNC contract binds. _(Reported, secondary
    summary):_ CoT traces "increasingly used as audit logs; if those traces
    do not reflect actual computation, audits based on them are unsound" —
    the wound in one sentence.
  - **Pilot export pinned:** Neuronpedia public S3 dataset bucket (v1),
    gemma-2-2b SAE activations (Gemma Scope lineage) — see §3 pilot ingest.
  - **RCP corpus pinned:** Claude's constitution, published 2026-01-22 under
    **CC0 1.0** (anthropic.com/constitution; license verified by search
    result, re-verified at plan time) — public, clause-addressable,
    license-unencumbered: the principle registry slices the constitution's
    own section slugs. The RCP demo manifests a reflection-style corpus
    against THE canonical principle document, at open scope.
  - Standards seam (carried from 4Z, unchanged): C2PA/SCITT/in-toto provide
    envelopes, not conflict semantics; STATEWITNESS exports readouts with
    zero crypto (grep-verified in 4Z). No conflict-record precedent found.
    Source-precision guard: secondary figures marked _reported_ until
    primaries pinned.

### AnthropicSafe / ReviewerSafe (designed at spec time)

- **AnthropicSafe (content):** benign pinned corpus on BOTH halves — the
  narrative prompts are post-task self-summaries, never elicitation of
  misbehavior, deception, or evasion; detection-side lexicon only; rails
  frozen in `constants.mjs`. The conflict ledger never characterizes the
  model — Law 4 is a safety property, not just an honesty property.
  **AnthropicSafe (structural egress):** no network in any verifier; browser
  under hash-CSP; Lane C on our rented host against open weights; the pilot
  export downloaded once, frozen, license-checked.
- **ReviewerSafe:** every verdict recomputable offline from the public
  bundle (narrative + map + claim table are all public); the embedded 4Z
  artifact re-verifies under its own contract; both Lane C outcomes sealed;
  conflicts undeniable BY the operator and unresolvable BY the verifier.

### Four-axis scorecard (spec-time; re-score honestly at closeout)

| Axis                       | Score   | What moves it higher (buildable debts, not decoration)                                                                                                                                                                                                                                                      |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                    | **9.5** | first attested conflict between introspection and interpretability; dual completeness over a PAIR of evidence species; conflict-as-verified-content geometry; 10 = semantic claim extraction (5B) making the table itself checkable                                                                         |
| Frontier                   | **9.4** | Lane C actually EXECUTED (real 1B narrative+readout pair, both outcomes sealed) + a real external export through the adapter + `conflictAntitone`; 10 = `frontier_readout_conflict_deferred` (a >7B pair produced by the model's operator)                                                                  |
| Lab / regulator usefulness | **9.7** | turns "the model reported X" system-card sentences into checkable confrontations; pays the pilot socket at artifact scope; 10 = an external org runs the adapter on their own monitor (the stated residual)                                                                                                 |
| Constitution               | **9.8** | the honesty-about-internal-states clause as infrastructure: a model's story and its telemetry confronted completely, disagreements preserved undeniably, plus RCP closing the constitution→training→telemetry provenance loop at open scope; 10 = a real reflection-training corpus manifested by its owner |

Ledger note: pays THREE sockets (one in full, two at honestly-stated scope),
executes 4Z's deferred Lane C debt, mints ONE — **net debt −2, the first
ledger-shrinking stage**, opening the Stage-5 arc with the receipt-spine
consuming its own attestations as typed inputs for the first time.
Anti-grade-inflation: the Constitution 9.8 is the highest ever scored on that
axis; the claim it rests on ("conflicts preserved undeniably") is fixture 13
plus theorem `conflictAntitone` — attackable artifacts, not adjectives.
