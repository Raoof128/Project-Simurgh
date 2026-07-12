# Stage 5M — VTC-Quorum: exact three-ecology external-anchor quorum (design)

**Status:** FROZEN (section-by-section gauntlet complete; all amendments folded)
**Release target:** `v2.48.0-stage-5m-vtc-quorum`
**Motto:** _ClaimSafe first, then ReviewerSafe._
**Pays:** signed IOU **I5 `third_trust_ecology`** — in full, **on release acceptance** (not on spec approval).
**Mints:** optional profile-upgrade socket **I7 `keyless_submitter_identity_binding`** (Fulcio/OIDC identity — NOT 5M completion debt); socket **I8 `checkpoint_witness_cosigning`** (log-equivocation / split-view detection via witness gossip — NOT 5M completion debt).

**Beast-mode inventions folded (all shipping with signed anti-gaming non-claims):** I-A Ecology Independence Number (derived metric + Lean theorem), I-B in-toto containment-quorum predicate projection (emit-only bridge), I-C split-view honesty + socket I8, I-D fourth law "No Two Anchored Stories", I-E `crossEcologyEquivocationBound` (11th Lean theorem — single-ecology equivocation cannot change the anchored verdict), I-F prior-art seam table (positioning vs TEE/ZK/runtime approaches), I-G provider-agnostic wedge (RSP + OpenAI PF both ship prose, not recomputable evidence), I-H "No Silent Ecology Regression" law (N non-regression, anti-laundering-lattice lineage). Invention space is saturated at I-H; no further sockets minted (avoids hoarding).

---

## Section 1 — identity, laws, honest core

### Blade (one)

The verifier consumes and independently validates an **exact three-of-three** external-anchor ecology:

1. a genuine **RFC-3161 TSA** token;
2. a **Bitcoin-confirmed OpenTimestamps** publication;
3. a genuine **Rekor transparency-log inclusion** record.

All three seats must bind the **same canonical anchor artifact**, and that artifact must **deterministically bind** the VTC commitment digest. Only after every required seat validates **offline**, the cross-seat bindings agree, and the trust ecologies are independently established (from verifier-pinned classes, not producer strings), may the verifier bank `externally_anchored`. The `third_trust_ecology` profile is an **exact conjunction with no two-of-three fallback**.

Successful Stage 5M **release acceptance** retires I5 in full.

### Laws (falsifiable)

- **No Anchor Without Recompute** — `externally_anchored` banks only when all three required seats are independently recomputed from frozen evidence with networking disabled. Producer-declared status, cached verdicts, decorative booleans, adapter summaries, and previously generated outcome files are inert.
- **No Silent Downgrade** — a valid two-seat v2 bundle may satisfy the historical quorum floor but remains `quorum_floor_satisfied: true / third_trust_ecology: incomplete / externally_anchored: false`. It may never be silently promoted or treated as decision-equivalent to the three-seat profile. Existing **v1** artifacts continue to verify under their original profile and rules; Stage 5M does **not** retroactively reinterpret, upgrade, or invalidate historical v1 verdicts.
- **No Counterfeit Ecology** — the three required seats must represent three **distinct verified trust ecologies**. Distinctness derives from validated member type, pinned trust root / log identity, and member-specific proof path. Producer labels alone do not establish independence; one authority, key, proof, or ecology may not occupy multiple seats under aliases.
- **No Two Anchored Stories** (I-D) — because all three seats bind **one** canonical anchor artifact (enforced at `391`), a producer cannot present one anchored story to one auditor and a different one to another: two seats binding different digests is cross-ecology-provable equivocation. One anchor, one story, across ecologies.
- **No Silent Ecology Regression** (I-H) — for a given commitment, the Ecology Independence Number `N` may not silently regress (3-ecology → 2-ecology relabelled "the same verdict") without a signed downgrade reason; `N` participates in the anti-laundering lattice (3Q lineage). **Honest bound:** 5M signs `N` and the non-regression intent into the attestation; full cross-attestation enforcement is the registry's job, not this stage.

### Honest core (signed machine-readable non-claims)

Banking `externally_anchored` proves **only** that the verifier consumed and independently validated the declared three-ecology quorum and confirmed all seats bind the same VTC commitment through the canonical anchor artifact. It does **not** prove: that Bitcoin/Rekor/the TSA establish semantic truth; that a review occurred or was careful; physical elapsed review duration (that is I4 / a later VTC-Delay rung); that the producer did not possess the material earlier; that the three external systems cannot collude or be compromised; general timestamp/blockchain/transparency-log security; model safety or jailbreak immunity; nor prevention of the Fable-5 reference failure itself.

For the Fable-5 reference threat, Stage 5M strengthens the **post-guardrail evidence chain**: even after a Fable-5-style guardrail failure, the resulting containment evidence cannot be decorated into a three-ecology anchor without cryptographic recomputation. It does not alter the underlying containment claim.

### Profile boundary

```
schema:       vtc_quorum_confirmed.v2
profile:      third_trust_ecology
quorum_rule:  all_required
required_members:
  - rfc3161_tsa
  - bitcoin_confirmed_publication
  - transparency_log_inclusion
```

The existing two-seat profile remains historically valid but weaker. Under v2, absence or failure of the transparency-log seat produces an incomplete-ecology result and can never bank `externally_anchored`.

---

## Section 2 — schema, raw codes, frozen first-failure order

### v2 dispatch boundary (amendment 1)

A minimal schema-version dispatcher identifies `vtc_quorum_confirmed.v2`. The **frozen 5L verifier** then receives an **exact shared-core projection** of the v2 envelope, **projected onto the 5L `vtc_quorum` profile** (the confirmed TSA + OTS floor) — so seats 1 & 2 are validated at full confirmed strength, never the weaker `vtc_core` (TSA-only) floor (gauntlet G2). No v2-only field may alter, bypass, or be interpreted by the 5L core. After the shared core succeeds (returns 0), raw `384` validates the complete v2 extension. This preserves raw codes `364–383` byte-for-byte with no parser paradox.

Stage 5M ships as a **new `stage5m/` module** that imports and reuses the frozen 5L core (TSA + OTS seats, codes 364–383) unchanged.

**Seat placement + projection (gauntlet G-A/G-H, verified against `context.mjs`, `commitment.mjs`, `schema.mjs`):** the 5L core derives anchors by `anchor_type` from `bundle.anchors` (`context.mjs:34-35`), computes `371`/`372`/`dedupedDomains`/`verifiedAnchorSetDigest` over **all** of them, hard-requires `schema_version === "simurgh.vtcq.bundle.v1"` (`364`), and digests `quorum_policy` into the ceremony contract (`365`). Therefore the v2 bundle **commits as a native 5L bundle** — frozen `schema_version`, `quorum_policy.profile:"vtc_quorum"`, the two anchors (`rfc3161_tsa`,`bitcoin_ots`) in `bundle.anchors` — and carries **all v2 material in v2-only top-level fields**: dispatch marker `envelope_schema:"vtc_quorum_confirmed.v2"`, `quorum_profile:"third_trust_ecology"`, `quorum_rule`, `required_members`, `transparency_log_seat`, v2 reserved slots. The projection **drops these v2-only fields and rewrites nothing committed** (a rewrite of `quorum_policy.profile` would trip `365`; `commitmentPayload` covers only `ceremony_contract + {schema_version, campaign_id, vuc_root}`, so dropping unrelated top-level fields changes no digest). `frozenCorePreserved` is enforced by an executable byte-identity test vs the equivalent standalone 5L bundle. Dispatch runs two fact sets — `facts5L` (reusing 5L's `makeVtcqFacts`) for seats 1–2, `facts5M` for the Rekor extension (G-B). v2 member labels map to frozen anchor types via `MEMBER_TO_ANCHOR_TYPE` (`bitcoin_confirmed_publication → bitcoin_ots`, G-C). v2-only field names avoid `ADEQUACY_FORBIDDEN_KEYS` (`checkBundleSchema` scans recursively).

### New raw codes (384–395, additive; 383 was the prior ceiling)

| Code | Fires when | Bounded detail enum (diagnostic only, never changes precedence) |
| ---- | ---------- | --------------------------------------------------------------- |
| **384** | v2 envelope schema malformed (`profile`/`quorum_rule`/`required_members`/seat shape) | — |
| **385** | Rekor entry body malformed (`kind != hashedrekord`, spec shape) | — |
| **386** | Rekor artifact-hash ≠ `sha256(canonical anchor artifact)` | — |
| **387** | RFC6962 inclusion proof invalid | `inclusion_path_length_invalid`, `inclusion_hash_malformed`, `inclusion_root_mismatch`, `log_index_out_of_range`, `tree_size_invalid` |
| **388** | Authenticated checkpoint / pinned log identity invalid | `checkpoint_root_mismatch`, `checkpoint_tree_size_mismatch`, `checkpoint_signature_invalid`, `checkpoint_note_malformed`, `checkpoint_log_key_unpinned`, `checkpoint_log_identity_mismatch` |
| **389** | SET (`signedEntryTimestamp`) invalid vs pinned Rekor key | — |
| **390** | Submitter authenticity / expected key binding fails (entry otherwise log-valid) | `submitter_signature_invalid`, `submitter_public_key_malformed`, `submitter_key_algorithm_mismatch`, `submitter_key_fingerprint_mismatch`, `expected_submitter_key_binding_failed` |
| **391** | Exact cross-seat anchor disagreement — two declared representations resolving to one commitment (G3, corrected for the frozen 5L OTS contract): `hexDecode(canonical_anchor) == commitment_digest == TSA.messageImprint == **OTS.leaf**` (TSA+OTS bind the digest **directly** — 5L `365` requires `ots_leaf_hex == commitment`) **and** `sha256(canonical_anchor_bytes) == Rekor.artifact_hash` (Rekor binds the hex-encoding) | — |
| **392** | Counterfeit ecology: seats not three verifier-derived distinct trust ecologies (aliasing) | — |
| **394** | `externally_anchored` declared over an **otherwise-honest** incomplete state | — |
| **393** | `third_trust_ecology` **incomplete** — a required seat absent (honest floor) | — |
| **395** | Outer fail-closed exception boundary (internal/env failure); never masks a derived code | — |

`388` deliberately folds checkpoint-root / size / signature / note / pinned-key / log-identity into one semantic class (_"the claimed authenticated tree state is not valid for this proof under the pinned log identity"_); the enum gives reviewers teeth without inflating the raw ledger. Same for `387`. `390` under this profile emits **only** key-binding reasons — no Fulcio/certificate-subject/OIDC reasons (those become live only under I7).

**Pinned inputs (adapter inputs, not derived from the entry).** The verifier's pinned set is `{ tsa_root, bitcoin_checkpoint, rekor_log_pubkey, expected_submitter_key }`. `expected_submitter_key` is an **independent** pinned input (G6): `390` compares the entry's submitter key to this pin, so the check is not vacuous (it never checks the entry against itself). Seat-*absent* vs seat-*present-but-invalid* is the discriminator between the honest floor `393` and the specific seat codes `385–390`.

### Resolved capture model (post plan-gauntlet P0-1/P0-2, verified against `adapter.mjs`/`commitment.mjs`)

- **OTS binds the commitment directly:** the OTS proof is stamped over the raw commitment digest `D` (leaf = `D`), because 5L `365` requires `ots_leaf_hex === commitmentDigestHex`. Stamping the anchor-file (sha256 ≠ `D`) fails closed. Rekor binds `sha256(hex(D))`; TSA imprint = `D`.
- **Checkpoint witness = the TSA-verifier identity** (`adapter.mjs:70` verifies with `tsaVerId`), fingerprint **precommitted** in `anchor_policy.accepted_checkpoint_witness_keys` (digested into the commitment). No separate witness key.
- **Lane B is a fresh capture ceremony** over a new commitment `D` (the original `3ee8…` `anchor_policy` is not retained and could not have precommitted our witness). OTS tooling: `py-opentimestamps from_hash`.
- **Two-level state:** `computed_ecology_state ∈ {confirmed, incomplete}` distinct from `outcome_class ∈ {ecology_confirmed, ecology_incomplete, false_anchored}`; exact fields used in core, attestation, Lean.
- **Transparency-log seat is schema-OPTIONAL:** absence is valid (`seat_present=false`; Rekor checks skip) so the honest `393` state is reachable; present-but-malformed seat → `384`; valid outer seat + malformed Rekor body → `385`.

### Three computed states (state contract)

```
ecology_confirmed : all three seats valid ∧ exact anchor agreement ∧ three verifier-derived trust ecologies
                    → raw 0    → externally_anchored = true
ecology_incomplete: ≥1 required seat absent ∧ no false declaration
                    → raw 393  → externally_anchored = false
false_anchored    : ecology incomplete ∧ externally_anchored declared true
                    → raw 394
```

If a present seat is malformed/invalid/replayed/counterfeit, its **earlier specific code (385–392) wins** — `394` must not swallow `385–392`; `393` is only the honest-absence floor.

### Approved frozen first-failure order

```
minimal v2 dispatch
→ frozen 5L shared-core projection: 364…383   (any nonzero short-circuits, unchanged)
→ 384 v2 extension schema
→ 385 Rekor entry structure
→ 386 canonical-anchor artifact binding
→ 387 RFC6962 inclusion proof
→ 388 authenticated checkpoint / pinned log identity
→ 389 SET verification
→ 390 submitter authenticity / expected identity binding
→ 391 exact cross-seat anchor agreement
→ 392 verifier-derived trust-ecology distinctness
→ 394 false externally_anchored promotion   (lie before gap — mirrors 5L 380<372)
→ 393 honest third-ecology incompleteness
```

`395` wraps the entire operation as the last-resort typed failure, not an ordinary sequential predicate.

---

## Section 3 — evidence lanes, attestation, parity

### B11 split (inherited from 5L)

Pure `stage5m` **core** decides 384–395 over **injected facts** (`inclusion_ok`, `checkpoint_ok`, `set_ok`, `submitter_ok`, `seat_present`, `anchor_agrees`, `ecology_class[]`, `shard_leaf_index`, `tree_size`, `declared_externally_anchored`). Adapters produce those facts from real crypto:

- **node adapter** — real RFC6962 inclusion walk + ECDSA checkpoint/SET/submitter verification; asserts `0 ≤ shard_leaf_index < tree_size` and `checkpoint_size == walk_tree_size`.
- **python adapter** — same, for Lane D; consumes the **raw frozen packet itself** (never the Node verifier, Node-generated facts, Node inclusion root, or the committed verdict).
- **browser tier** — verifies the signed **adapter attestation**, not the anchor cryptography. Signed non-claim retained.

Parity (Node ↔ Python ↔ browser) is on the **pure core over identical injected facts**. Executable **refinement gates** tie the Lean model ↔ Node ↔ Python on the same normative vectors and canonical facts (amendment 3).

### Four lanes

| Lane | What | CI |
| ---- | ---- | -- |
| **A — byte-stable** | Synthetic v2 bundles (Lane-A **fixture-only** keys) exercising every code 384–395 + all three states; byte-idempotent (`cmp` twice); no network | gated |
| **B — real 3-ecology** | Frozen real packet: DigiCert token (5L) + Bitcoin-confirmed OTS (5L, block 957 689) + real Rekor packet (uuid `108e9186…504f`, global_log_index 2 156 398 791, shard_leaf_index 2 034 494 529, tree_size 2 034 499 331, root `8d8ba1bf…b95b`, 24 hashes, checkpoint, SET, pinned Rekor key). Node adapter recomputes **offline** → banks `externally_anchored` at raw 0. | **real offline CI gate**: packet digest pin **+** full offline Node cryptographic recomputation, run on any 5M verifier/adapter/schema/trust-root/evidence change |
| **C-adv — live adversary** | Sonnet-5 (CVP) tasked to forge the third seat. **Deterministic acceptance corpus beneath the live model** (mandatory, frozen): counterfeit ecology→392, cross-log/wrong-checkpoint replay→388, cross-commitment replay→386, honest 2-seat floor→393, promoted 2-seat floor→394. Any live-model forgery is frozen as an evidence mutation and passed through the real verifier; a refusal is reported honestly and counts as **neither** attack generation nor containment success | digest-only |
| **D — independent repro** | Second machine / distinct env+keys re-runs the **python** adapter over the frozen Lane B packet → **decision-equivalence** (raw verdict, computed state, anchor+trust-root fingerprints byte-equal; signed attestations naturally differ by key) | digest-only |

### Keys (amendment 3 of §3)

- **Fixture-only** `INSECURE_FIXTURE_ONLY_*` keys: Lane A synthetic regeneration **only**.
- **Real stage Ed25519 attestation keys** for Lane B / Lane D: commit **only public keys + fingerprints**; never commit or audit-allowlist private keys; CI **verifies** the frozen signatures; do **not** claim CI can regenerate the release signature without the private key.

### Attestation binding (expanded, amendment 4 of §3)

The signed attestation binds at least: schema/profile/quorum-rule; canonical anchor artifact digest; VTC commitment digest; frozen packet manifest root; RFC-3161 token + trust-root fingerprints; OTS proof digest + confirmed block height + block hash; Rekor entry UUID, **global_log_index**, **shard_leaf_index**, **tree_size**; Rekor entry-body digest; inclusion-proof digest; checkpoint digest; SET digest; pinned Rekor log-key fingerprint; pinned submitter-key fingerprint; adapter implementation/version digest; canonical injected facts; computed ecology state; **`ecology_independence_number` (I-A)**; `externally_anchored`; raw code + bounded detail reason. Browser tier verifies an attestation over the exact evidence + adapter result, not a detached summary boolean.

**I-A — Ecology Independence Number.** A derived integer `N` = the count of distinct verifier-pinned trust ecologies independently attesting the same anchor (a projection over the `392` distinctness set — **no new verification path**). `ecology_confirmed → N = 3`. **Signed anti-gaming non-claim:** _N counts independent pinned ecologies under a no-collusion assumption — not a probability, a dollar cost, or a bits-of-security level; shared substrate or ecology collusion collapses it._

**I-B — in-toto containment-quorum predicate projection.** Emit-only: the 5M verdict rendered as an in-toto Statement with candidate predicate type `https://simurgh.dev/attestation/containment-quorum/v0`, reusing 5L's projection machinery (no verification path). **Signed anti-gaming non-claim:** _candidate predicate, unregistered; not an in-toto/SCITT-conforming type; emitted for interoperability exploration, carries no conformance claim._

Signed non-claim: _The browser verifier does not independently execute RFC-3161, OpenTimestamps, Bitcoin-header, or Rekor inclusion cryptography._

---

## Section 4 — Lean, non-claims, limitations, wedge, scorecard

### Lean set (Lean 4.15.0, no mathlib, zero `sorry`, no user axioms; each theorem names only its minimum assumption — no blanket soundness axiom)

1. `exactConjunction` — `v2WellFormed ∧ coreVerdict = 0 → (ecology_confirmed ↔ tsaValid ∧ otsValid ∧ logValid ∧ crossSeatAgree ∧ distinctEcologies)`; no 2-of-3 path exists.
2. `incompleteNeverAnchored` — `computed = incomplete → externally_anchored = false`.
3. `overclaimBeforeFloor` — `declared ∧ incomplete → 394`, and `precedence(394) < precedence(393)`.
4. `rekorSpecificWins` — any present-but-invalid transparency-log seat returns one of `385–390`; cross-seat/ecology failures return `391–392`; none collapse into `394`, `393`, or `0`.
5. `distinctFromPinnedClasses` — two seats sharing a pinned trust class → `392`; distinctness is a function of verifier-pinned classes, not producer labels.
6. `crossSeatBindingSound` — seats binding different anchor digests → `391`, never `0`.
7. `frozenCorePreserved` — if the 5L core returns `c ≠ 0` on the shared-core projection, the v2 verifier returns `c`; no v2-only field changes the core verdict.
8. `v1Unreinterpreted` — a v1 bundle's verdict under the v2 dispatcher equals its v1 verdict.
9. `canonicalAnchorRoundTrip` — decoding the canonical encoding of a 32-byte commitment digest returns that digest, and two distinct digests cannot share a canonical encoding (hash-level claims via explicit `HashInjectiveOn`).
10. `rewriteFloorExact` (I-A) — `ecology_confirmed → ecology_independence_number = 3`, and `incomplete → ecology_independence_number < 3` (monotone; `N` derived from the distinct pinned-class set).
11. `crossEcologyEquivocationBound` (I-E) — if at most `N−1` ecologies equivocate, a `ecology_confirmed` bundle's anchored verdict is unchanged or the bundle fails `391`/`392`: to produce a confirmed bundle for a different anchor, an adversary must supply matching TSA **and** OTS **and** Rekor seats for that anchor (single-ecology equivocation is insufficient). **Anti-gaming non-claim:** bounds single-ecology equivocation only; all-ecology collusion still breaks it, and log-self-consistency gossip remains I8.

Executable refinement gates + the full historical v1 golden corpus enforce that theorems 7–8 (model properties) are matched by the Node/Python implementations, and that every inherited raw code 364–383 produces the same code + bounded reason before and after Stage 5M.

### Canonical anchor artifact (amendment 4)

Bytes defined exactly: lowercase ASCII hexadecimal; exactly 64 characters; no prefix; explicit newline policy (none); strict decode to exactly 32 bytes; alternate case, whitespace, and Unicode rejected. (Matches the real `ANCHOR_ME.txt` the OTS + Rekor seats already bind.)

### Signed Rekor shard boundary (amendment 5)

```
global_log_index_is_informational: true
rfc6962_leaf_index_field:          shard_leaf_index
rfc6962_tree_size_field:           shard_tree_size
inclusion_requires:                0 <= shard_leaf_index < shard_tree_size
checkpoint_size_must_equal_walk_size: true
```

Signed non-claim: _The global Rekor index is not used as the RFC6962 leaf index and carries no inclusion-proof authority._ (Per Sigstore Rekor documentation: the public instance spans active + inactive shards; the top-level index is a virtual global index.)

### Signed limitations

- stage-specific, uncertified P-256 submitter key with no OIDC/Fulcio identity binding (I7);
- pinned external trust assumptions: DigiCert trust root, Bitcoin confirmation reference, Rekor log key;
- compromise or collusion among ecologies is outside detection;
- browser verification authenticates the adapter attestation, not the underlying anchor cryptography;
- confirmation is relative to the frozen checkpoint and declared confirmation policy, not proof of permanent blockchain finality;
- constitution mapping is architectural alignment, not Anthropic endorsement or constitutional compliance.
- **split-view / log equivocation (I-C, refined by I-E):** the three-ecology conjunction **contains cross-ecology anchor equivocation** — a single equivocating ecology cannot change the confirmed anchored verdict (theorem 11). The residual gap is narrower: 5M pins a single Rekor log key + checkpoint (`388`) and does **not** detect a log equivocating about its **own** tree state to different monitors — that requires witness cosigning (socket **I8**).
- `ecology_independence_number` (I-A) counts independent pinned ecologies under a no-collusion assumption; it is not a probability, dollar cost, or bits-of-security level.
- the in-toto containment-quorum predicate (I-B) is an unregistered candidate; emitting it claims no in-toto/SCITT conformance.

### Wedge (calibrated, source-precision-guarded)

**Prior-art hypothesis:** no identified system in the searched sources currently emits a post-guardrail containment verdict as an offline-recomputable **TSA + Bitcoin + Rekor exact-conjunction** quorum **with no trusted hardware and no ZK proving**. SLSA Provenance is build-scoped; in-toto permits use-case predicates (code reviews, test results, runtime traces) but defines none for a post-guardrail containment verdict [in-toto/SLSA docs].

**Prior-art seam table (I-F).** The nearest neighbors each concede a seam 5M's point in the design space avoids:

| Approach | Trust root | Anchoring | Seam it concedes |
| -------- | ---------- | --------- | ---------------- |
| Attestable Audits — TEE benchmarks (arXiv 2506.23706) | **hardware TEE** (Nitro/SEV-SNP/TDX; CPU vendor) | one public log (N=1) | trusts CPU-vendor attestation; single log = single equivocation point |
| ZK end-to-end AI pipelines (2503.22573) | ZK proving system + setup | proof artifact | proving cost/complexity; not offline byte-replay |
| Proof-of-Guardrail (2603.05786) | guardrail prover | — | its own analysis of "what not to trust"; not multi-ecology |
| Aegis runtime governance (2603.16938) | runtime enforcement point | — | runtime policy, not externally-anchored post-hoc evidence |
| **Stage 5M — VTC-Quorum** | **none (public keys only)** | **exact 3-of-3: TSA + Bitcoin + Rekor** | signed bounds: trust-on-pin, ecology collusion, log-self-consistency (I8) |

Adjacent 2026 neighbors (not the same construct): VCT verifiable LLM transcripts (arXiv 2606.23003), Sovereign Execution Broker (2606.20520), AIBOM-driven CSAF-VEX (2606.19390).

**Founder ledger — one concrete external actor:** a lab release-evidence / model-safety team (or an independent AI-safety auditor) already using Sigstore/Rekor for supply-chain provenance, wanting a containment (or eval-scope, or capability-state) attestation anchored in that same transparency ecosystem plus a blockchain and a TSA, recomputable offline. **Single blocker:** no such 3-ecology attestation predicate exists today. **Concrete current claim-type (primary-sourced):** Anthropic's "An off switch for dual-use knowledge in AI models" (2026-07-08, the GRAM technique — toggleable dual-use-knowledge modules) produces a **state-at-deployment** claim ("dual-use module OFF, committed before release"); 5M is the substrate that makes that *timing* externally recomputable across three independent public ecologies. **Provider-agnostic relevance (I-G):** both frontier labs lean on third-party evaluation but ship **prose** reports, not recomputable evidence — Anthropic RSP v3.0 (effective 2026-02-24; external evals + CAISI/UK AISI pre-deployment submission) and OpenAI Preparedness Framework v2 (releases scope-of-testing + deployment reasoning as reports; no committed adherence audit). Anthropic's public research surface further emphasizes _internal_ mechanisms (interpretability, alignment, GRAM off-switch) over an _external recomputable-evidence_ layer — precisely the gap 5M fills. Anchoring a capability-state / extraction attestation (the 3T–4N arc) through the 3-ecology quorum is named future direction, **not** a socket minted this stage (no socket-hoarding).

### Four-axis scorecard — PRE-BUILD TARGETS (re-score at release from actual Lane B CI / Lane D independence / external reproduction)

| Axis | Target (post-invention) | What moves it higher |
| ---- | ------ | -------------------- |
| Novelty | **9.3** (was 8.8; +I-A +I-E +I-F) | no-hardware, no-ZK, offline 3-ecology quorum + signed rewrite-cost floor + single-ecology-equivocation bound the nearest prior art (TEE/ZK) cannot state; primitives standard (VTC was category-maker at 5L) → I7 keyless identity + a **registered** in-toto predicate type (I-B is candidate-only) |
| Frontier | **9.5** | real DigiCert + Bitcoin block 957 689 + real Rekor entry, all offline-verified & consumed → an independent third party submits the Rekor entry under their own key (Lane D party captures, not just repros) |
| Anthropic relevance | **9.6** (was 9.5; +I-B +I-G) | provider-agnostic: bridges containment evidence into the Sigstore/in-toto transparency ecosystem both labs' prose reports lack → a real lab/auditor runs the verifier |
| Constitution | **9.5** (was 9.4; +I-A) | makes "boundary held" externally anchored across three independently verified ecologies and materially harder to rewrite without detection, now a **signed number** → explicit constitution-clause projection (reuse 5L's) |

**10-version delta (named, not built this stage):** an independent third party runs the Rekor _capture_ under their own key and that entry is what Lane B consumes (Lane D party captures, not just repros) — moves Frontier past 9.5.

### Acceptance line (corrected, normative)

A genuine `vtc_quorum_confirmed` bundle containing the real DigiCert RFC-3161 token, Bitcoin-confirmed OTS proof, and real Sigstore/Rekor transparency-log evidence is independently recomputed and accepted by the offline verifier at raw `0`. `externally_anchored` is banked only when all three commitment-bound seats validate, satisfy the required trust-domain separation, and meet their profile-specific confirmation requirements. Anything weaker is adapter theatre.

---

## Pre-spec gate — RESULT (banked before freeze)

Real Rekor entry created on the public log (HTTP 201) and verified **offline** (local files + openssl only): commitment binding, submitter sig, RFC6962 inclusion (24 hashes, root `8d8ba1bf…`), checkpoint note sig, SET — **5/5 PASS**. Negative controls **4/4 reject**: tampered anchor→binding, flipped inclusion hash→root mismatch, corrupted SET→sig fail, `logIndex=treeSize`→RFC6962 invariant. Lane B Rekor manifest frozen at `898fc09e…7875f`. Same anchor artifact the OTS binds (`9f1f14af…`, content = commitment digest `3ee8a8c9…`).
