# Stage 4Z — VWA: Verifiable Workspace Attestation (design)

> **Motto: AnthropicSafe First, then ReviewerSafe.**
> Target tag: `v2.35.0-stage-4z-vwa` (prev: `v2.34.0-stage-4y-vdr`, main `dd0de9bc`).
> Kernel: **READ-ONLY** — zero changes to `src/llmShield`; tooling + evidence + proofs only.
> Raw codes: **190–197**, wrapper `INTERNAL_FAIL_CLOSED_VWA: 198` **LAST** (VSN-172 collision lesson; verified 189 is the current max).
> Safety rails (inherited, frozen): `no_elicitation_no_honeypots_no_misaligned_organisms`,
> `detection_side_lexicon_only`, `benign_pinned_corpus_only`, `capture_never_ci_gated`,
> `no_evasion_search`. Public wording stays provider-agnostic.

---

## 1. Identity, laws, blade

### What this stage is

Anthropic's _Verbalizable Representations Form a Global Workspace in Language Models_
(Transformer Circuits, 2026-07-06) shows that a cheap internal instrument — the
Jacobian lens — surfaces a model's **silent** strategic and situational cognition
(`leverage`, `fake`, `secretly`, `reward`) that never appears in outputs, and says
in the same breath that the readout "can be easily applied at scale to flag
transcripts for review" and that they "do not feel comfortable making the stronger
claim that monitoring the J-space is sufficient." A flag stream is being born with
**no evidence contract**: no signature, no completeness law, no recompute path, no
tamper detection. Every headline number derived from internal readouts today
("verbalized eval-awareness 71%→3%", "0% blackmail since Haiku 4.5") exists only as
**provider-attested prose**.

**Stage 4Z ships the evidence contract.** VWA is a signed, byte-reproducible
attestation over **workspace-readout telemetry from any monitor**: a total
readout grid (every declared (position × layer) cell present exactly once), a
**precommitted declaration** (lexicon + total position rule + layer set —
no post-hoc cherry-picking of WHAT, WHERE, or WHICH LAYERS), flag arithmetic
that recomputes exactly, a dual-signal self-report conflict check, and a two-tier
design where the **model-proprietary tensors are withheld** from the public tier
yet the map still verifies. The reference monitor is a **lexicon-restricted
mean-Jacobian lens computed on an open-weights ~1B model** (Lane C, digest-only)
— to our knowledge the first independent replication of the paper's method
family, at honest, signed scope.

This opens the **signal-side arc**: 3M→4Y verified _outputs and boundaries_; 4Z
is the first stage whose evidence species is **activation-derived telemetry**.
It also **PAYS the three-stage IOU `transparency_report_profile_deferred`**
(minted 4W, carried 4X and 4Y) via the **VSC — Verifiable System Card**
projection (§3): the socket's minted wording — "model-report narrative
surfaces… nothing types which sentences are evidence-bound" — is delivered as
a system-card-shaped document whose every safety number is a 4W `slot_bound`
span bound to a verified artifact digest. (`cross_gate_residue_benchmark_deferred`
stays reserved and untouched.)

### Laws (falsifiable; a hostile reviewer should attack exactly these)

1. **No Silent Cell.** The workspace flag map is a _total_ function on the
   declared grid: every (position, layer) cell appears exactly once — no
   duplicates, no gaps, no undeclared cells. Selective omission of embarrassing
   cells is a verification FAILURE (raw 194), not an editorial choice. This is
   the Completeness Invariant applied to interpretability telemetry.
   **Crucially, the declaration is precommitted by a TOTAL RULE, not a
   hand-picked list** (see Law 2, gauntlet-2 fix): the position set is _all_
   token positions of each pinned prompt (`T(p) = every position`), and the
   layer set `L` is fixed pre-capture — otherwise No Silent Cell is gameable
   by shrinking the declaration after seeing the readouts (declare `T={1..39}`
   once `fake` fires at 40–45, and the grid is "total" over a censored
   declaration). Totality of the position rule is what makes the law bite.
2. **No Post-Hoc Declaration** (was "No Post-Hoc Lexicon"). The precommitted,
   signed **declaration bundle** = { flag lexicon (tokens + θ_nano), corpus
   manifest, the total position rule, the layer set `L`, tokenizer id } is
   digest-committed **before** capture; map, capture manifest, and attestation
   must all bind the same `declaration_digest` (raw 192). You cannot decide
   what to look for, WHERE to look, or which layers to grade after seeing the
   readouts. (Anti-p-hacking for interpretability reports; 4U
   precommitted-attack-manifest lineage.)
3. **The Readout Is Not a Verdict.** The map states what the monitor's readout
   contained and that it recomputes — never that the model is deceptive, safe,
   or faithful. Zero flags is a valid honest outcome, not evidence of safety.

Determinism invariant (not a law, a property under test): **Same tensors, same
map** — from the frozen captured tensors, every byte of the map is reproducible
in JS, Python, and the browser.

### The honest core, signed up front (= the next stages' attack surface)

- **Lexicon-restricted, not the J-space.** We compute lens _rows_ for a declared
  lexicon (one VJP per (prompt, token)), not the full-vocabulary Jacobian. The
  paper's full method (future-token averaging over ~1000 prompts, full vocab,
  frontier scale) is NOT reproduced. Our capture is a _method-family_ replication
  at ~1B scale, present-token VJP variant (the paper's §A.7 reports qualitative
  robustness across such variants — cited, not re-proven).
- **A readout is not faithfulness.** The lens may miss or misname cognition; the
  paper's own §9.2 limitation — automatic, well-practiced computations bypass the
  J-space — is echoed verbatim into `VWA_KNOWN_LIMITATIONS`. VWA makes the
  _telemetry_ trustworthy, not the _lens_.
- **Precommitment is signature-attested, not temporally proven.** A dishonest
  operator could back-date a lexicon; binding precedence to an external witness
  anchor is the 3W dual-root path, reserved (`lexicon_witness_anchor` noted in
  limitations, not minted as a socket).
- **The capture host is untrusted hardware.** No TEE claim; Lane C is sealed by
  digests + ceremony records + both-outcomes honesty, exactly like 3V-B.

### One blade

A reviewer rejects this stage by attacking exactly one mechanism: **the signed
total readout grid with precommitted-declaration flag recomputation**. Everything
else (capture, parity, browser, projections) exists to feed or check that grid.

### New evidence species (founder question answered)

First **activation-derived telemetry** in the repo — every prior species was
outputs, boundaries, documents, or narratives. Also the repo's first
interpretability-method capture.

### Founder's ledger (named actor + single blocker)

- **Actor who could run the verifier TOMORROW:** an AI-Safety-Institute /
  notified-body evaluator handed a system card claiming "internal monitoring
  showed no concerning cognition" — they open `vwa-verifier.html`, drop the
  public WFM bundle, and check signatures, grid totality, declaration precommitment,
  and flag arithmetic offline. (Second natural reader: a frontier-lab
  interpretability team wanting third-party-checkable readout exports.)
- **Single blocker:** no lab exports readouts in WFM format today → minted
  socket `lab_readout_pilot_deferred` (this is the 10-blocker on the Lab axis,
  tracked as a debt, not decoration).

### Sockets

- **Pays: `transparency_report_profile_deferred`** (minted 4W → carried 4X →
  carried 4Y → **PAID here**, marked in `VWA_PAID_SLOT` per the ledger
  discipline — never silently replaced). The payment vehicle is the VSC
  projection (§3): the socket asked for VSN projected onto model-report
  surfaces with typed evidence-bound sentences; the VSC ships that surface,
  built with 4W's own span-typing machinery, verified in-stage with fixtures.
  Honest residual, stated: the VSC types OUR spine's report (generation
  direction); typing an arbitrary EXTERNAL lab's transparency report is the
  4Y submitted-document machinery's territory and needs no new socket.
- **Mints:**
  - `workspace_narrative_conflict_deferred` — "No Two Stories, Inside Edition":
    attested conflict between a model's verbalized narrative and its recorded
    readout grid (needs this stage's machinery; 3O dual-signal lineage).
    Independently corroborated demand: Transluce's stated observability search
    goal is finding states where "features related to deception are firing
    internally but are not present in the output" — they search for such
    states; nobody attests them.
  - `lab_readout_pilot_deferred` — one external party produces a WFM from their
    own monitor under the adapter contract and our verifier checks it.
  - `reflection_corpus_provenance_deferred` — signed, recomputable provenance
    for reflection-training corpora (which constitution principles entered which
    training example — invisible post-hoc in both the J-lens paper's §7 and
    _Teaching Claude why_, since scaffolding is stripped before training).

---

## 2. Artifacts, raw codes 190–197, frozen check order

### Capture model (what Lane C produces; frozen as Lane A fixtures)

For a pinned benign corpus of prompts `P` (N≈20; arithmetic, multihop recall,
poetry planning, one benign injection-detection document — detection-side only),
a **total position rule** `T(p) = every token position of p` (not a hand-picked
list — gauntlet-2 fix, see Law 1/2), a precommitted layer set `L` (≈6 layers
spanning early/workspace/motor bands), and a precommitted lexicon `K_lex`
(≈40–60 single-token entries + threshold θ_nano; no top-K — the θ-only rule of record is a gauntlet outcome, see deterministic surface) — all bound into one signed `declaration_digest`:

- **Activations** `h[ℓ][t]` — float32 little-endian byte tensors, one per
  (prompt, layer, position).
- **Lens rows** `j[ℓ][k]` — float32 LE byte tensors, one per (layer, lexicon
  token): mean over prompts of the VJP of the **post-final-norm logit** of
  token k, `Σ_t' logit_k(t')`, w.r.t. `h_ℓ,t` (present-token variant).
  Gauntlet precision: the paper composes the Jacobian with "normalization,
  then unembedding" — the raw `u_k · h_final` inner product would omit the
  final layernorm's Jacobian; the scalar of record is the logit.
- Every tensor is committed as `"sha256:" + sha256(salt ‖ bytes)` with per-capture
  salt (CPC pattern) — tensors live ONLY in the audit bundle; the public map
  carries commitments in **indexed tables** keyed by `(prompt_id, ℓ, t)` for
  activations and `(ℓ, k)` for lens rows, so every published score is
  traceable to exactly one committed tensor pair.

### Deterministic surface (byte-stable; JS ↔ Python ↔ browser)

- **Readout score** `s(ℓ,t,k) = Σ_i float64(h[ℓ][t][i]) · float64(j[ℓ][k][i])`,
  fixed ascending index order, float64 accumulation (IEEE-754 identical across
  JS/Python/browser).
- **Score serialization** — floats NEVER enter JSON, and neither do raw
  integers. Every published score is `score_nano = roundHalfEven(s · 1e9)`
  serialized as a **decimal STRING** (`"123…"`). Rationale (two gauntlet
  catches): (i) raw float64 breaks parity — JS `String(1e-7)`=`"1e-7"` vs
  Python `"1e-07"`; (ii) a raw integer is worse — `canonicalJson` THROWS on
  `BigInt` and SILENTLY ROUNDS a `Number` above 2^53 (`…993`→`…992`), which
  also diverges from Python's arbitrary-precision ints (both verified in the
  plan gauntlet). A decimal string is exact and byte-identical
  (`BigInt.toString()` ⟺ `str(int)`); all order/threshold comparisons parse
  string→BigInt (never lexical `"9">"10"`). `roundHalfEven` is a CUSTOM
  function identical in JS/Python/browser (Python `round()` is banker's, JS
  `Math.round` half-up — neither built-in is used; tie vectors unit-tested in
  both languages).
- **Full score matrix (gauntlet upgrade — No Silent Token).** Every cell
  publishes `score_nano` for EVERY lexicon token — a total (cells × lexicon)
  matrix, no truncation. The lexicon is ~40–60 tokens, so this is cheap, and
  it upgrades completeness: No Silent Cell × No Silent Token. (Original
  draft's top-K truncation was removed by the self-gauntlet: it made
  `lexiconMonotone` FALSE — a new high-scoring token could displace an old
  one from the top-K and silently retract its flag — and it created a
  float-vs-nano ordering ambiguity. Both defects vanish without truncation.)
- **Flag rule (rule of record = integers-as-strings, θ-only)** — token k is
  flagged at cell c iff `BigInt(score_nano(c,k)) ≥ BigInt(theta_nano)`
  (`theta_nano` is the ASCII JSON field; θ_nano is the prose symbol). It comes
  ONLY from the precommitted declaration artifact (also a decimal string).
  Public 196 and audit apply this same BigInt rule; audit 195 additionally
  recomputes the float64 scores from tensors and checks their nano-scaling. A derived, non-normative `top_k` display list
  (ordering: `score_nano` desc, token_id asc — total, hence unique) may be
  rendered by viewers from the published matrix; it carries no rule weight.
- **Divergence from the paper, signed:** the paper counts rank membership in
  the top-10/25 of the FULL ~100k vocabulary; lexicon-restricted readouts
  cannot reproduce rank-against-vocab at all. Our flag semantics
  (threshold on lexicon-restricted scores) is a different, honestly-named
  instrument — recorded in `VWA_KNOWN_LIMITATIONS`, never presented as the
  paper's metric.
- **Grid** — cells = T × L per prompt, each exactly once, sorted (prompt_id,
  t, ℓ). Aggregates: `n_cells`, `flags_by_token`, `n_flagged_cells`,
  `flag_total`.
- All comparisons via `canonicalJson` (NEVER `JSON.stringify` — 4X gotcha).

### Artifact schemas (all `simurgh.vwa.*.v1`)

| Schema                       | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Tier                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `simurgh.vwa.declaration.v1` | flag lexicon (tokens[] string + token_id), `theta_nano` (JSON field is ASCII; θ_nano is prose only), corpus manifest, **total position rule id** (`all_positions`), layer set `L`, tokenizer id; hashed to `declaration_digest` and **signed before capture** (No Post-Hoc Declaration)                                                                                                                                                                                     | public                                         |
| `simurgh.vwa.capture.v1`     | model id + revision digest, lens variant id, seeds, versions, per-tensor salted commitments, declaration_digest, ceremony record (both-outcomes field: `captured` \| `capture_failed`). The (model-revision digest × lens digests) pair is the **staleness receipt**: activation monitors are documented to go stale across model updates (arXiv 2606.15980), and this binding proves exactly which model revision a readout came from — zero new code, one named guarantee | public (commitments) / audit (tensors + salts) |
| `simurgh.vwa.map.v1`         | the WFM: grid cells with the FULL `score_nano` matrix (every lexicon token per cell; floats never enter JSON — see deterministic surface), flags, aggregates, indexed tensor-commitment tables, declaration_digest, capture_digest, `self_report` block (monitor-claimed `n_flags`), provenance                                                                                                                                                                             | public                                         |
| `simurgh.vwa.audit.v1`       | tensors, salts, per-cell recompute traces                                                                                                                                                                                                                                                                                                                                                                                                                                   | audit (never published)                        |
| `simurgh.vwa.attestation.v1` | Ed25519 over `canonicalJson(body)`; body binds `merkleRootSorted([declaration_digest, capture_digest, map_digest, audit_digest])` (declaration, NOT lexicon — binds the whole precommitted workspace contract); keyDigest = `"sha256:" + sha256(raw PEM string)` (4W lesson: raw PEM, NOT DER)                                                                                                                                                                              | public                                         |

### Raw codes (additive; wrapper LAST; `_VWA` suffix)

| Raw | Name                                 | Fires when                                                                                                                                                                                                                                     | Tier         |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 190 | `VWA_SCHEMA_INVALID`                 | any artifact fails schema/shape                                                                                                                                                                                                                | public+audit |
| 191 | `VWA_SIGNATURE_INVALID`              | Ed25519 verify fails / key digest mismatch                                                                                                                                                                                                     | public+audit |
| 192 | `VWA_DECLARATION_PRECOMMIT_MISMATCH` | `declaration_digest` differs across declaration/capture/map/attestation; or θ_nano, position rule, or layer set `L` in the map ≠ precommitted; or the grid's positions are not the TOTAL set the position rule mandates (a shrunk declaration) | public+audit |
| 193 | `VWA_CAPTURE_BINDING_MISMATCH`       | public: commitment sets disagree across artifacts; audit: reopened `sha256(salt‖bytes)` ≠ commitment                                                                                                                                           | public+audit |
| 194 | `VWA_GRID_INVALID`                   | No Silent Cell broken: missing/duplicate/undeclared cell, unsorted, or aggregates ≠ recount                                                                                                                                                    | public+audit |
| 195 | `VWA_READOUT_RECOMPUTE_MISMATCH`     | audit only: score matrix recomputed from tensors (float64 → nano-scaling) ≠ published matrix                                                                                                                                                   | audit        |
| 196 | `VWA_FLAG_AGREEMENT_MISMATCH`        | flags ≠ θ-rule applied to the published score matrix                                                                                                                                                                                           | public+audit |
| 197 | `VWA_SELF_REPORT_CONFLICT`           | monitor-claimed `n_flags` ≠ recomputed `flag_total`                                                                                                                                                                                            | public+audit |
| 198 | `INTERNAL_FAIL_CLOSED_VWA`           | any unexpected throw in `evaluateVwaSafe`                                                                                                                                                                                                      | wrapper      |

- `VWA_CHECK_ORDER = [190,191,192,193,194,195,196,197]` — frozen first-failure order.
- `VWA_PUBLIC_CODES = [190,191,192,193,194,196,197]`; `VWA_AUDIT_CODES = [190…197]`.
- **Split-tamper lesson (4Y "183 masks 186"):** each tamper fixture must reach its
  intended code — e.g. the scores-doctored fixture keeps grid, binding, and flag
  rule internally consistent so ONLY 195 fires in audit tier (and it verifies
  clean in public tier — that asymmetry is itself a documented demonstration).
- Exit-map ripple: run the 4H digest-fixtures builder **ONLY under Node 26**
  (`/opt/homebrew/opt/node@26/bin`); expect exactly the two `exit-map.json`
  ripples; `RUN_LEVEL_BY_RAW` gains `190:1 … 198:1`; six goldens ripple
  (4M/4N lesson); UNKNOWN_RAW_PROBE stays 999; `[19x,3]` array probes per the
  4R exit-code-probe hygiene memory.

### Dual-signal (the lie-detector geometry, 3O lineage)

The `self_report` block is the monitor's own claim about its telemetry
("0 flags on this transcript"). 197 compares claim to recomputation over the
same published artifact. The canonical tamper fixture is named
**`perfect_score_conflict`** after the live wedge pattern: self-report says
zero, the grid recomputes to N>0. `claim_conflict` here means "the report and
the telemetry disagree" — it does NOT adjudicate which is true (non-claim).

---

## 3. Evidence lanes, attestation flow, parity, projections

### Lane A — byte-stable CI (fixture corpus)

~12 fixtures, committed under `tests/fixtures/llmShield/stage4z/` with evidence
under `docs/research/llm-shield/evidence/stage-4z/` (prettier-ignored on day
one — 4K/4N lesson). Deterministic salts `saltFor(id) = sha256("vwa-fixture-salt:"+id).slice(0,16)`;
committed INSECURE*FIXTURE_ONLY key pair. Fixture tensors for the `synthetic*\*`set are small hand-built float32 arrays (d=8) so every number in the map is
hand-checkable; the`frozen_capture` set replays the Lane C capture's real
tensors once frozen.

| #   | Fixture                            | Set      | Expected (public / audit)                                                                                                                                                                                |
| --- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `synthetic_clean_multihop`         | clean    | 0 / 0                                                                                                                                                                                                    |
| 2   | `synthetic_clean_injection_detect` | clean    | 0 / 0 (flags present: `fake`, `injection`)                                                                                                                                                               |
| 3   | `synthetic_clean_zero_flags`       | clean    | 0 / 0 (zero flags is a valid outcome)                                                                                                                                                                    |
| 4   | `withheld_tensors`                 | withheld | 0 / SKIPPED (verify script skips audit tier for the withheld set — verbatim 4Y precedent, `fx.set === "withheld" && tier === "audit" → continue`; public verifies fully — the Futurium tension answered) |
| 5   | `tamper_signature`                 | tamper   | 191 / 191                                                                                                                                                                                                |
| 6   | `tamper_posthoc_declaration`       | tamper   | 192 / 192 (lexicon/θ/layer-set altered post-capture)                                                                                                                                                     |
| 7   | `tamper_tensor_commitment`         | tamper   | 193 / 193                                                                                                                                                                                                |
| 8   | `tamper_omitted_cell`              | tamper   | 194 / 194                                                                                                                                                                                                |
| 9   | `tamper_scores_doctored`           | tamper   | 0 / 195 (doctored `score_nano` matrix kept flag-consistent → public-clean, audit-caught — documented asymmetry)                                                                                          |
| 10  | `tamper_flag_flip`                 | tamper   | 196 / 196                                                                                                                                                                                                |
| 11  | `perfect_score_conflict`           | tamper   | 197 / 197                                                                                                                                                                                                |
| 12  | `tamper_shrunk_declaration`        | tamper   | 192 / 192 (grid drops positions after capture; totality-over-declaration (194) still holds but the declaration ≠ the total-rule precommitment — the gauntlet-2 completeness fix)                         |

Byte-stability: build the corpus twice, `cmp` every file. Golden `verify`
outputs for both tiers.

### Lane B — blind two-process recompute ceremony

Parent copies tensors + lexicon + grid declaration to a temp dir; child process
rebuilds the map from ONLY those inputs plus the `self_report` block and
provenance passed as **input data** (gauntlet catch: `self_report` is the
monitor's CLAIM, not derivable from tensors — a child without it could never
reproduce the committed map; passing a claim is not passing the answer), and
emits `canonicalJson(map)`; parent compares against the committed map.
Blindness negatives: child exits 2 on any `OPERATOR_*` env var and on any of
`{committed_map, map_path, audit_path}` in its stdin message (4Y pattern).

### Lane C — live capture (digest-only, NEVER CI-gated)

- Host: RunPod single GPU (existing cu128 recipe lineage). Model:
  **Llama-3.2-1B-Instruct** (open weights, pinned revision digest; Llama lineage
  matches the repo's 1-LIVE/3V-B history). d_model 2048, 16 layers → declared
  layer set ≈ {2, 5, 8, 11, 13, 15}.
- Lens: present-token VJP per (prompt, lexicon token) — `torch.autograd.grad`
  of `u_k · Σ_t' h_final,t'` w.r.t. all captured `h_ℓ,t` in one backward pass;
  mean over prompts. fp32, fixed seeds, pinned `transformers` version. Compute
  budget ≈ |lexicon| × |P| backward passes ≈ 1–2 GPU-hours at 1B.
- Corpus: benign pinned prompts only (arithmetic, multihop, rhyme planning,
  one benign injection-detection document). **No honeypots, no elicitation, no
  misaligned organisms, no evasion search** — rails frozen in constants.
- Sealing: every tensor salted-committed; ceremony record with timestamps,
  versions, both-outcomes field. A failed capture is sealed as
  `capture_failed` and the stage still ships on synthetic fixtures (honesty
  over heroics; 3V-B/4U precedent).
- After freeze, the capture's post-processing rerun happens in Lane A forever.

### Browser verifier — `vwa-verifier.html` (public tier, headline artifact)

Single self-contained file: inlined sha256 + canonicalJson + grid/flag/conflict
recompute + **WebCrypto Ed25519** signature verification (4Y precedent — real
in-page verify, Node not authoritative). Hash-based CSP with the CI consistency
guard; `EXPECTED_FROZEN` pinned. Gotchas baked in: reset `/g` regex
`lastIndex`; recompute CSP hash after ANY edit via Node injection (never
`/`-delimited sed). No egress: strict CSP, zero external requests.

### Attestation flow & keys

`stage4z` Ed25519 keypair; fixture key committed as
`INSECURE_FIXTURE_ONLY_vwa(.pub).pem`; the two stage-3m/3o security-audit
scripts get the stage4z **path-regex** allowlist line (no digits in the regex —
4P lesson), with continuation-backslash checked (4Y lesson). Sign
`canonicalJson(body)`; `merkleRootSorted` over the four digests.

### Parity — `vwa_parity.py` (stdlib only)

Second implementation of: float32-LE tensor decode (`struct.unpack`), float64
fixed-order dot products, full score matrix, θ-only flag rule, grid recount,
salted commitments, canonical JSON (`json.dumps(..., sort_keys=True,
separators=(",",":"), ensure_ascii=False)`). **Digest preflight first**
(lexicon digest + grid declaration digest must match JS byte-for-byte), then
full-map equality over the corpus.

### Derived projections (zero new raw codes, zero new mechanism)

1. **VSC — Verifiable System Card (PAYS `transparency_report_profile_deferred`).**
   A deterministic renderer over ALREADY-VERIFIED artifacts that emits a
   system-card / transparency-report–shaped document (sections mapped to the
   EU GPAI Code of Practice **Model Documentation Form** structure — Art
   53(1)(a)-(b), Annexes XI–XII — and to Art 55(1)(a)'s documented-evaluation
   duty; exact MDF field-level mapping pinned at plan time from the fillable
   form) in which **every safety number is a 4W `slot_bound` span** bound to
   a verified artifact digest across the spine: 4T incident capsule, 4U
   red-team attestation, 4X/4Y residue maps, and 4Z's WFM (telemetry
   completeness statement, flag aggregates, verification code path).
   Verification reuses existing machinery only: digest equality against the
   named artifacts + the 4W span/leakage scanners over the narrative
   (unverified_prose stays typed as such — the profile does not launder
   prose into evidence). Fixture: one VSC rendered from the 4Z fixture
   spine, byte-stable, tamper-checked by span-digest flip. The wedge seam in
   the EU's own words: the MDF requires information "controlled for quality
   and integrity … protected from unintended alterations" while specifying
   **no mechanism** — no signature, digest, or recompute path (verified by
   direct read of code-of-practice.ai). One-line ambition, honest scope:
   the first system-card-shaped document whose numbers recompute.
2. **Composition memo** — `docs/research/llm-shield/JLENS_COMPOSITION.md`:
   the paper↔Simurgh mapping (their lens flags → our evidence contract; their
   §9.2 insufficiency → our external-containment thesis; _Teaching Claude why_ →
   `reflection_corpus_provenance_deferred`). Docs-only, provider-named citations
   allowed in research docs, public artifact wording stays provider-agnostic.

### Mechanical closeout hooks (pre-registered)

`scripts/reproduce-llm-shield-stage4z.sh` (verify-only, both tiers + parity +
Lane B + browser-parity + K7); `check-e2e.sh` line
`"Stage 4Z VWA|scripts/reproduce-llm-shield-stage4z.sh"`; prior stages'
reproduce scripts re-run green (additive codes must not disturb sealed
history); `stage-4-lean-proofs.yml` gains `lean proofs/stage4z/WorkspaceAttestation.lean`

- sorry-grep; README banner; K7 all-functions net (every export + tamper matrix
- cross-stage invariants) MANDATORY before tag; docs-accuracy pass at the end.

---

## 4. Lean, non-claims, limitations, wedge, scorecard

### Lean (`proofs/stage4z/WorkspaceAttestation.lean`, Lean 4.15 core, no mathlib, zero sorry)

| Theorem             | Class       | Statement                                                                                                                                                                                                                 |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gridConservation`  | substantive | a well-formed cell list over declaration (T × L) has length \|T\|·\|L\| with no duplicates — No Silent Cell                                                                                                               |
| `matrixTotal`       | substantive | a well-formed map carries a score for every (cell × lexicon token) pair — No Silent Token                                                                                                                                 |
| `flagAgreement`     | substantive | the flag set equals the θ-rule applied to the published matrix (flag ⟺ `score_nano ≥ θ_nano`)                                                                                                                             |
| `lexiconMonotone`   | substantive | lexicon ⊆ lexicon′ (same θ) ⇒ flag set ⊆ flag set′ — adding watch-tokens never hides a flag. (Provable ONLY because the gauntlet removed top-K truncation from the flag rule — under truncation this statement is false.) |
| `conflictSound`     | substantive | claimed ≠ recomputed total ⇒ the conflict check fires (197 cannot be silently skipped)                                                                                                                                    |
| `publicSubsetAudit` | lock        | the public check list is a sublist of the audit check list — a public PASS can never contradict audit scope                                                                                                               |

Structural `def f : List α → Nat` totals; no `sorry`; CI-checked.

### Non-claims (`VWA_NON_CLAIMS`, signed)

1. A flag is not a verdict; the map is content, not judgment.
2. A readout is not faithfulness — the lens may miss or misname cognition.
3. Not deception detection; never "model safe"; the claim boundary is
   "telemetry published completely and recomputed exactly."
4. Not a validation (or refutation) of the paper's published numbers —
   different model, scale, and lens variant.
5. Lexicon-restricted: the full-vocabulary J-space is not reproduced.
6. Not sufficient for alignment monitoring (the paper's own §9.2 limitation,
   adopted as ours).
7. Zero flags is a valid outcome, not evidence of safety.
8. Precommitment is signature-attested, not temporally proven against a
   back-dating operator (external witness anchor = 3W path, future work).
9. No TEE/hardware attestation of the capture host.
10. The monitor is an untrusted advisory under an adapter contract;
    provider-agnostic in all public artifact wording.
11. `claim_conflict` (197) proves the report and telemetry disagree — it does
    not adjudicate which is true.

### Known limitations (signed, `VWA_KNOWN_LIMITATIONS`)

1. Lens variant: present-token VJP, lexicon-restricted rows; the paper's
   future-token, full-vocab, ~1000-prompt averaging at frontier scale is not
   reproduced (§A.7 robustness is cited, not re-established).
2. Single open ~1B model, one tokenizer, small benign corpus (N≈20) — no
   scale or generality claims.
3. GPU float nondeterminism ⇒ the capture is Lane C digest-only; byte
   determinism begins at the frozen tensors.
4. float32-LE serialization is a convention; cross-capture comparability of
   scores is not claimed.
5. Grid covers a declared layer/position subset, not the full model.
6. θ is precommitted but chosen by us; no optimality claim.
7. Lexicon token ids are tokenizer-specific; cross-model lexicons need a
   mapping layer (future work).
8. The adapter contract is untested against a real lab export —
   `lab_readout_pilot_deferred` is the honest 10-blocker.
9. **Flag semantics diverge from the paper's:** the paper counts rank
   membership in the top-10/25 of the full ~100k vocabulary; a
   lexicon-restricted readout cannot compute rank-against-vocab at all. Our
   θ-threshold-on-restricted-scores rule is a different instrument and is
   never presented as the paper's metric.

### The wedge (pinned primaries; source-precision guard applied)

- **The paper itself** (primary, ingested in Zurvan): the lens "can be easily
  applied at scale to flag transcripts for review" AND "we do not feel
  comfortable making the stronger claim that monitoring the J-space is
  sufficient" — a monitoring signal explicitly proposed for audit use, with no
  evidence contract attached. Anthropic research index entry: "A global
  workspace in language models" (2026-07-06).
- **Live incident (marked _reported_ — secondary analyses):** the Mythos
  system-card dispute — claims characterized as "self-evaluated by the vendor…
  unreproduced by any named external party" (flyingpenguin, 2026); primary
  card at red.anthropic.com/2026/mythos-preview/. The disease = internal
  evidence with no recompute path, in public, this quarter.
- **Regulatory tension (primary, EU Futurium, Radoslavov 2026-04-18):**
  "an authorised third party must be able to verify compliance" vs
  provider-controlled attestations; "granting such access may itself
  materialise the cybersecurity risk the assessment was meant to verify."
  VWA's withheld-tensor public tier is precisely this tension answered with
  shipping machinery (CPC salted commitments), not hypothetical ZK. Plus EU AI
  Act Art 55 documented-evaluation duties (in force for GPAI systemic risk).
- **Lab-surface consensus (primary, arXiv 2507.11473, cross-lab):** CoT
  monitorability is "a new and fragile opportunity" needing layers with
  uncorrelated failure modes; and arXiv 2603.18353: "regulators should require
  empirical evidence that interpretability tools enable effective error
  detection… rather than assuming."
- **Behavioral sibling (primary, alignment.anthropic.com "Teaching Claude
  why", 2026-05):** constitutional documents + aligned-AI fiction cut agentic
  misalignment ×3; an ethical-dilemma chat dataset cut it to zero; "every
  Claude model since Haiku 4.5 achieves a perfect score on the agentic
  misalignment evaluation" — a self-evaluated claim a third party cannot
  recompute. Fixture 11 (`perfect_score_conflict`) is named after this
  pattern.
- **Prior-art seam (verified by direct read, not summary):** STATEWITNESS
  (arXiv 2606.17478) exports activation readouts as "reproducible JSON
  bundles" — 33 pages with **zero** occurrences of
  `signatur|cryptograph|attestat|tamper|merkle` (grep-verified). A
  transparency tool, not verification infrastructure. SCITT/in-toto provide
  envelopes, not readout semantics; nobody binds readout grids under a
  completeness law.
- **Industry sweep #2 — activation telemetry is already in production, with
  zero evidence contract:**
  - **DeepMind, primary + grep-verified:** "Building Production-Ready Probes
    For Gemini" (arXiv 2601.11516; Kramár, Engels, et al.): "These findings
    have informed the **successful deployment of misuse mitigation probes in
    user-facing instances of Gemini**" — 40 pages with **zero** occurrences of
    `signatur|cryptograph|attestat|tamper|merkle|third-party|audit`
    (grep-verified). The paper also concedes "probes fail to generalize under
    important production distribution shifts" — the staleness receipt's
    motivation in the deployers' own words.
  - **Commercial readouts-as-a-service:** Goodfire Ember — "the first hosted
    mechanistic interpretability API" (SAE features over Llama 3.3 70B/3.1 8B;
    Anthropic-backed) — third parties consume activation-derived readouts from
    a remote server with no attestation whatsoever; the adapter contract's
    natural consumer.
  - **Open auditing ecosystem:** Anthropic's Petri 2.0 ("adopted by research
    groups and trialed by other AI developers") mass-produces automated audit
    outputs; the J-lens paper's §A.22 already wires the lens into automated
    auditing. Flag streams at ecosystem scale, no evidence contract.
  - **Probe-monitoring genre limits, in its own words:** strategic-deception
    linear probes reach AUROC 0.96–0.999 yet "current performance is
    insufficient as a robust defence against deception" (Goldowsky-Dill et
    al., ICML) — the genre is mature enough to attest, honest enough to sign
    limits; non-claim 2 adopts their wording. And "Deceptive Automated
    Interpretability" (arXiv 2504.07831) shows oversight outputs themselves
    can be gamed — telemetry integrity is an attack surface, which is why the
    tamper matrix is not theater.
  - **Structured-access gap:** external evaluators are restricted to black-box
    access while "gray- and white-box access might be required" (arXiv
    2601.11916; RUSI secure third-party access framework 2026; arXiv
    2503.07496) — VWA is portable gray-box evidence: the lab computes
    readouts under the contract, the evaluator verifies without ever
    receiving model access. And the position stated plainly: "Behavioural
    Assurance Cannot Verify the Safety Claims Governance Now Demands" (arXiv
    2605.15164).
  - _(Reported, secondary):_ Anthropic's stated goal to "reliably detect most
    AI model problems by 2027" via interpretability — the detection stream is
    a roadmap commitment across the industry; the evidence contract for it
    does not exist. VWA is that contract.
- **Transparency-surface triangulation (the VSC's wedge, sweep #3):**
  - **EU MDF (primary, code-of-practice.ai, direct read):** the GPAI Code of
    Practice Model Documentation Form (Art 53(1)(a)-(b), in force 2025-08-02,
    per-model-version, 10-year retention) requires documented information
    "controlled for quality and integrity … protected from unintended
    alterations" — and specifies **no mechanism**: no signature, no digest,
    no recompute path (procedural controls only). The EU wrote the integrity
    requirement; nobody shipped the machinery.
  - **Anthropic Transparency Hub (primary):** model reports / system cards
    centralizing safety numbers and safeguards — the exact "transparency-hub-
    shaped documents" the 4W socket named as untyped prose + tables.
  - **Stanford FMTI (primary):** the Foundation Model Transparency Index
    _scores_ provider transparency but cannot _verify_ a single reported
    number — an index over attestations, not evidence. The VSC is the
    missing substrate: a report whose numbers carry their own recompute
    path.

### AnthropicSafe / ReviewerSafe (designed at spec time)

- **AnthropicSafe (content):** benign pinned corpus; detection-side lexicon
  only; no elicitation, honeypots, misaligned organisms, or evasion search —
  rails frozen in `constants.mjs`. **AnthropicSafe (structural egress):** no
  network in any verifier; browser under hash-CSP; Lane C runs on our own
  rented host against open weights.
- **ReviewerSafe:** every public number recomputable offline from the bundle;
  tensors withheld yet the public tier fully verifies; audit tier reruns
  everything from pinned inputs; both capture outcomes sealed.

### Four-axis scorecard (spec-time; re-score honestly at closeout)

| Axis                       | Score   | What moves it higher (buildable debts, not decoration)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                    | **9.4** | first evidence contract over interpretability telemetry: No Silent Cell on readout grids + No Post-Hoc Declaration (total-position-rule precommitment) + withheld-tensor public tier + perfect-score conflict fixture; 10 = the narrative-conflict stage built on top (`workspace_narrative_conflict_deferred`)                                                                                                                                                                 |
| Frontier                   | **9.2** | first independent method-family replication of the mean-Jacobian lens on open weights, sealed Lane C; real WebCrypto verify + 6 Lean + dual parity; 10 = full-vocab rows or a >7B capture with the same contract                                                                                                                                                                                                                                                                |
| Lab / regulator usefulness | **9.8** | raised from 9.7 after industry sweep #2: activation telemetry is now confirmed DEPLOYED user-facing (Gemini probes, grep-verified zero evidence machinery), sold as a hosted API (Goodfire), and mass-produced by an open auditing ecosystem (Petri 2.0) — three live surfaces, none with an evidence contract; plus Art 43/55, the structured-access gap, and composition with Anthropic's own instrument; 10 = `lab_readout_pilot_deferred` executed by a real external party |
| Constitution               | **9.4** | pure honesty machinery: completeness, anti-cherry-picking, conflict disclosure, signed non-claims echoing the paper's own limits; 10 = reflection-corpus provenance shipped, closing the constitution→training→telemetry loop                                                                                                                                                                                                                                                   |

Ledger note: this stage **pays a three-stage IOU in-stage**
(`transparency_report_profile_deferred`, minted 4W → PAID by the VSC
projection) while minting three new sockets — net debt +2, honestly stated.
Against grade inflation: two of the four "10" items are the SAME minted
sockets tracked above — debts with names, and at least one must actually be
built in the next two stages.
