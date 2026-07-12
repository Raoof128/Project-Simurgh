# Stage 5M — VTC-Quorum: implementation plan (TDD, self-contained)

## Header

- **Goal.** Add a new `stage5m/` verifier that consumes an exact three-of-three external-anchor quorum (RFC-3161 TSA + Bitcoin-confirmed OTS + Rekor transparency-log inclusion), all binding one commitment, and only then banks `externally_anchored`. Pays I5.
- **Architecture.** New module layered on the **frozen** 5L core (`vtcqVerify`, codes 364–383 untouched). A minimal dispatcher routes `vtc_quorum_confirmed.v2` bundles: it projects to a native-5L bundle, runs `vtcqVerify`, then runs the 5M extension (codes 384–395). Pure core decides over injected facts (B11); node/python adapters do real crypto; browser verifies the adapter attestation.
- **Tech stack.** Node ESM (repo Node for unit; Node 26 at `/opt/homebrew/opt/node@26/bin` for reproduce/K7/byte-stable). Node-native `crypto` for ECDSA-P256 + Ed25519 (no openssl subprocess in the verifier). Python parity via stdlib `hashlib` + `openssl` CLI subprocess (no pip deps). Lean 4.15.0, no mathlib. OTS via `ots` CLI + `py-opentimestamps 0.4.5`.
- **Execution skill.** Strict TDD: failing test → watch fail → minimal code → watch pass → format → commit, one deliverable per task.
- **Read the frozen spec (`docs/superpowers/specs/2026-07-13-stage-5m-vtc-quorum-design.md`) before Task 0.** This plan is self-contained on interfaces; the spec carries the laws/scorecard.
- **Motto.** Design/doc wording: _ClaimSafe First, then ReviewerSafe_. **Code files carry only the SPDX line + a `// Stage 5M — …` comment** (verified: 5L `.mjs` files carry no motto line); do not put a doctrine label in code.

## Global constraints (verified against the frozen 5L repo — do not re-derive)

- 5L entry: **`vtcqVerify(bundle, cfg, facts, { tier })`** (`stage5l/core/vtcqCore.mjs:21`); returns **`{ raw, reason, ... }`** (never a bare number); catches its own internals → `383`.
- 5L finds anchors **by `anchor_type`** in `bundle.anchors`: `rfc3161_tsa`, **`bitcoin_ots`** (`context.mjs:34-35`); `371`/`372`/`dedupedDomains`/`verifiedAnchorSetDigest` run over **all** `bundle.anchors`.
- **The transparency-log seat lives in v2-only `bundle.transparency_log_seat`, NEVER in `bundle.anchors`** (G-A). The two frozen anchors stay in `bundle.anchors`.
- **v2 bundle commits as a native 5L bundle (G-H):** `schema_version === "simurgh.vtcq.bundle.v1"` (`DOMAINS.bundle`; else 5L `364`), `quorum_policy.profile === "vtc_quorum"` (digested into `ceremony_contract.quorum_policy_digest`; else 5L `365`). Dispatch marker is a **separate** top-level `envelope_schema === "vtc_quorum_confirmed.v2"`. v2 semantic fields (`quorum_profile:"third_trust_ecology"`, `quorum_rule`, `required_members`, `transparency_log_seat`, v2 reserved slots) are v2-only top-level fields. `commitmentPayload = {...ceremony_contract, schema_version, campaign_id, vuc_root}` (`context.mjs:20-24`) excludes them.
- **Projection rewrites NOTHING committed** — drops v2-only top-level fields only.
- **Complete `cfg5L` (checkConfigSchema, `schema.mjs:63`):** `{ schema_version: "simurgh.vtcq.config.v1", profile: "vtc_quorum", policy_digest: <bundle's committed vtcq policy_digest>, accuracy_policy_s: <integer> }`. All four required; no `...`.
- **Checkpoint witness = the TSA-verifier identity** (`adapter.mjs:70`: `safeVerify(tsaVerId, SIG.checkpoint, cbody, sig)`). **No separate witness key.** `accepted_checkpoint_witness_keys` is in `anchor_policy` (digested into the commitment) → the TSA-verifier fingerprint must be **precommitted** (G-G/P0-2).
- **OTS leaf equality (P0-1):** `365` requires `ots_leaf_hex === commitmentDigestHex`. The leaf MUST be the commitment digest itself → OTS is stamped over the raw digest `D` (via `py-opentimestamps DetachedTimestampFile.from_hash`), never over the anchor-file whose sha256 ≠ D.
- **`makeVtcqFacts(bundle, cfg, keys)`** (`adapter.mjs:18`) builds `{tsaCrypto, otsState, checkpointWitnessSigValid}` — reuse verbatim for `facts5L` (G-B).
- **Do NOT add any export to `canonicalise.mjs`** (already exports `canonicalJson` + `sha256Bytes`; adding one trips the 3M 100%-coverage gate). Helpers live in `stage5m/`.
- **v2-only field names avoid `ADEQUACY_FORBIDDEN_KEYS` = {complete, exhaustive, all_risks_covered, review_adequate, universe_adequate}** (`checkBundleSchema` scans recursively).
- Additive raw codes **384–395**; frozen order below. Node 26 for reproduce. No attribution trailers. Evidence prettier-ignored, byte-stable.

## Two-level state contract (P0 #97-100)

```
computed_ecology_state ∈ { confirmed, incomplete }         # confirmed iff 3 seats present+valid ∧ crossSeat ∧ distinct(=3)
outcome_class          ∈ { ecology_confirmed, ecology_incomplete, false_anchored }
ecology_confirmed  : computed=confirmed                                   → raw 0    externally_anchored=true  N=3
ecology_incomplete : computed=incomplete ∧ ¬declared_externally_anchored  → raw 393  externally_anchored=false N<3
false_anchored     : computed=incomplete ∧  declared_externally_anchored  → raw 394
```
A **present-but-invalid** seat yields its specific `385–392`; `394`/`393` only apply when no specific seat code fired. These exact field names are used in core, attestation, and Lean.

## Frozen first-failure order

```
dispatch on bundle.envelope_schema (absent→v1 route; exact v2→continue; any other present value→run core then 384)
→ vtcqVerify(projectToFiveL(bundle), cfg5L, facts5L, {tier})  [364…383 inherited; 383 propagates]
→ 384 v2 extension schema (envelope_schema, quorum_profile, quorum_rule, required_members exactly-3,
       no extra anchor in bundle.anchors, no adequacy key, transparency_log_seat well-formed OR absent)
→ 385 Rekor entry structure            (skipped if seat_present=false)
→ 386 canonical-anchor artifact binding (skipped if seat_present=false)
→ 387 RFC6962 inclusion proof           (skipped if seat_present=false)
→ 388 authenticated checkpoint/pinned log identity (skipped if seat_present=false)
→ 389 SET verification                  (skipped if seat_present=false)
→ 390 submitter authenticity/expected key binding (skipped if seat_present=false)
→ 391 exact cross-seat anchor agreement (over present seats)
→ 392 verifier-derived trust-ecology distinctness (over present valid seats)
→ 394 false externally_anchored promotion
→ 393 honest third-ecology incompleteness
```
`395` is the **outer fail-closed boundary** wrapping projection + both adapters + dispatch; it never masks a derived code and is never in an ordinary check-order array.

## File map (exact paths + responsibility)

```
tools/simurgh-attestation/stage4h/exitCodes.mjs   # +VTCQUORUM_RAW_CODES 384-395 + 5 explicit arrays + RUN_LEVEL
tools/simurgh-attestation/stage5m/
  constants.mjs core/{result,schema,rekorSeat,crossSeat,state,dispatch,vtcQuorumCore}.mjs
  node/{rekorAdapter,facts,verify,attestation,intoto,buildEvidence,verifyAttestation,capture}.mjs
  python/vtcq_quorum_parity.py   browser/{canonical-json,vtcq-quorum-portable}.mjs
proofs/stage5m/EcologyQuorum.lean  proofs/stage5m/lean-toolchain  proofs/stage5m/lakefile.toml
tests/unit/llmShield/stage5m/*.test.js + _valid.mjs
tests/e2e/llmShield/stage5m/k7AllFunctions.test.js
tests/fixtures/llmShield/stage5m/test-keys/INSECURE_FIXTURE_ONLY_<suffix>.pem   # suffix [A-Za-z-]+ only
docs/research/llm-shield/evidence/stage-5m/{lane-a,real-laneb,real-lanec,real-laned}/ (+ EVIDENCE_MANIFEST.json)
docs/research/llm-shield/STAGE_5M_CLOSEOUT.md
scripts/reproduce-llm-shield-stage5m.sh
# MODIFY: .prettierignore (evidence + test-keys globs); scripts/check.sh + scripts/check-e2e.sh (5m unit+e2e+lean);
#   scripts/security-audit-llm-shield-stage3m.sh + …stage3o.sh (stage5m key allowlist line);
#   .github/workflows/*lean* (enumerate proofs/stage5m); README.md (banner); AGENT.md + CHANGELOG.md (Raouf: entry)
```

---

## Task 0 — exit codes + constants + fixture/real keys (foundation, keys FIRST per P0 #156)

**Interfaces.** `VTCQUORUM_RAW_CODES`(OK:0,384–395); five explicit arrays: `VTCQUORUM_PUBLIC_CHECK_ORDER=[384,385,386,387,388,389,390,391,392,394,393]`, `VTCQUORUM_AUDIT_CHECK_ORDER=[...public..., <audit-only>]`, `VTCQUORUM_AUDIT_ONLY_CODES=[]` (none this stage unless projections added), `VTCQUORUM_POLICY_CODES=[]`, `VTCQUORUM_WRAPPER=395`; `RUN_LEVEL_BY_RAW` 384–395→1.
1. Test `exitCodes.test.js`: 384–395 unique, disjoint from 364–383; public order is the 11-permutation with 394 before 393 and **395 NOT in it**; RUN_LEVEL all 1. Fail → add block additively (mirror `VTCQ_*`). Keep the non-hermetic 4h builder reading only its existing two exit-maps.
2. `constants.mjs`: `ENVELOPE_SCHEMA="vtc_quorum_confirmed.v2"`, `PROFILE="third_trust_ecology"`, `QUORUM_RULE="all_required"`, `REQUIRED_MEMBERS=["rfc3161_tsa","bitcoin_confirmed_publication","transparency_log_inclusion"]`, `MEMBER_TO_ANCHOR_TYPE={rfc3161_tsa:"rfc3161_tsa",bitcoin_confirmed_publication:"bitcoin_ots",transparency_log_inclusion:"transparency_log_seat"}`, `ECOLOGY_CLASSES=Object.freeze(["rfc3161","bitcoin","rekor"])` (verifier constants, never from bundle), `PINNED_INPUT_KEYS` (exact types below), `MINTED_SOCKETS=["keyless_submitter_identity_binding","checkpoint_witness_cosigning"]` (**strings**; I7+I8, both non-debt per spec), `RESERVED_ARTIFACT_SLOTS`, `ADEQUACY_FORBIDDEN_KEYS` (import/re-export 5L's). Freeze-tests + assert OTS label→`bitcoin_ots`.
   `PINNED_INPUT_KEYS` types: `{ tsa_root_fpr:string, tsa_verifier_pubkey_fpr:string, bitcoin_min_confirmations:number, rekor_log_pubkey_fpr:string, expected_submitter_key_fpr:string, vtcq_policy_digest:string, accuracy_policy_s:number }`.
3. **Keys now (P0 #156):** create Lane-A `INSECURE_FIXTURE_ONLY_gate/sequencer/tsaverifier/submitter.pem` (suffix letters only) + a `laneKeys`-style loader in `stage5m/node/`. Real Lane-B/D Ed25519 keypairs generated to **scratchpad/gitignored**; commit only their public keys + fingerprints under `evidence/stage-5m/real-laneb/keys/`. Prettier-ignore both globs; add the `stage5m` allowlist line to **both** audit scripts (regex `^tests/fixtures/llmShield/stage5m/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$`, move trailing `|| true`). Commit.

## Task 1 — capture spike (LONG POLE — run early so Bitcoin confirms during the build)

`node/capture.mjs` + a small ceremony builder (reuse 5L `digests.mjs` to compute the commitment):
1. Generate the real TSA-verifier + attestation Ed25519 keys (scratchpad). Build the ceremony contract + `anchor_policy` with `accepted_checkpoint_witness_keys=[tsaVerifierFpr]`, `min_confirmations` (honest, e.g. 6), `quorum_policy.profile="vtc_quorum"`, `schema_version="simurgh.vtcq.bundle.v1"`. Compute commitment **`D`** = `commitmentDigestBytes(payload)` (5L formula).
2. Anchor `D`: (a) DigiCert TSA over `D` (`openssl ts`, imprint=`D`); (b) **OTS stamp `D` directly** — `py-opentimestamps`: `DetachedTimestampFile.from_hash(OpSHA256(), D_bytes)` then submit to calendars → `.ots`; (c) Rekor `hashedrekord` over `sha256(hex(D))` (the canonical anchor file = 64-hex of D) with the submitter key. Freeze all raw material.
3. **Poll OTS upgrade** until Bitcoin-confirmed (`ots upgrade`; hours). Cross-check the block vs mempool.space. Build `checkpoint_evidence` signed by the TSA-verifier key (`SIG.checkpoint` domain), with `witness_key_fingerprint=tsaVerifierFpr`, `observed_tip_height`, honest `block_height/hash`.
4. Freeze the full packet under `evidence/stage-5m/real-laneb/` + `EVIDENCE_MANIFEST.json` listing **every filename, byte length, SHA-256**. This is the reproducible Lane-B input (replaces the scratchpad path, P0 #27). Commit evidence (no private keys).
   *If the OTS has not confirmed by Task 9, Task 9 blocks on it; the rest of the build proceeds on Lane-A synthetic facts.*

## Task 2 — pure core: schema 384 (corrected ownership, P0 #74)

`core/schema.mjs checkV2Schema(bundle)` runs **after** the 5L core returns 0. Returns `R(384,…)` iff: `envelope_schema!=="vtc_quorum_confirmed.v2"`; `quorum_profile!=="third_trust_ecology"`; `quorum_rule!=="all_required"`; `required_members`≠exactly the 3-set; `bundle.anchors` is not exactly the two expected types (a smuggled extra anchor that *survived* the core → 384, reachable); any v2-only field carries an `ADEQUACY_FORBIDDEN_KEYS` key; **or `transparency_log_seat` is present-but-malformed** (absent is VALID — sets `seat_present=false`). It does **NOT** own `schema_version`/`quorum_policy.profile` (those are inherited `364`/`365`). Tests: valid v2 → 0; each malformation → 384; **wrong schema_version → inherited 364; wrong quorum_policy.profile → inherited 365; absent seat → 0 (seat_present=false)**; `complete:true` inside a v2 field → 384.

## Task 3 — pure core: Rekor seat 385–390 over injected facts (fully specified, P1 #78-85)

`core/rekorSeat.mjs checkRekorSeat(facts)`. **If `facts.seat_present===false` → return null (skip).** Else first of:
- 385 `entry_body_malformed` if `facts.rekor.kind!=="hashedrekord"` or spec shape invalid.
- 386 `artifact_hash_mismatch` if `facts.rekor.artifact_hash!==facts.anchor_sha256`.
- 387 `inclusion_invalid`, detail ∈ frozen enum `{inclusion_path_length_invalid,inclusion_hash_malformed,inclusion_root_mismatch,log_index_out_of_range,tree_size_invalid}` from `facts.inclusion_reason`.
- 388 `checkpoint_invalid`, detail ∈ `{checkpoint_root_mismatch,checkpoint_tree_size_mismatch,checkpoint_signature_invalid,checkpoint_note_malformed,checkpoint_log_key_unpinned,checkpoint_log_identity_mismatch}`.
- 389 `set_invalid` if `facts.set_ok===false`.
- 390 `submitter_binding`, detail ∈ `{submitter_signature_invalid,submitter_public_key_malformed,submitter_key_algorithm_mismatch,submitter_key_fingerprint_mismatch,expected_submitter_key_binding_failed}`; fires on `facts.submitter_ok===false` OR `facts.entry_submitter_fpr!==facts.expected_submitter_fpr`.
**Any detail value not in the frozen enum → fail closed (390/388/387 with `detail:"unknown"`, never pass-through free text.)** Facts schema (exact fields/types) documented at top of file. Tests: one isolated per code + per detail; unknown detail → fail closed.

## Task 4 — pure core: cross-seat 391 + distinctness 392 (P1 #91, P0 #90 via capture)

`core/crossSeat.mjs`:
- `checkCrossSeat(facts)` → 391 unless **both** levels hold: `hexDecode(facts.canonical_anchor)===facts.commitment && facts.tsa_imprint===facts.commitment && facts.ots_leaf===facts.commitment` (TSA+OTS bind D directly) **AND** `facts.ots_target_present? true : true` … precisely: `sha256(facts.canonical_anchor_bytes)===facts.rekor_artifact_hash`. (Two declared representations resolving to one commitment.)
- `checkDistinctEcologies(facts)` → 392 if `new Set(facts.present_valid_ecology_classes).size < 3`. `present_valid_ecology_classes` is built **in adapter code from `ECOLOGY_CLASSES` constants** keyed by seat identity — never copied from the bundle.
Tests: mismatch at each binding level → 391; two seats same class → 392.

## Task 5 — pure core: state machine (two-level, P0 #97-100)

`core/state.mjs`: `ecologyIndependenceNumber(facts)` = count of distinct `ECOLOGY_CLASSES` among present+valid seats (plain `number`). `computedEcologyState(facts)` → `"confirmed"|"incomplete"`. `checkState(facts)`: `declared ∧ incomplete → R(394)`; `incomplete → R(393)`; else null. Emits `{computed_ecology_state, outcome_class, ecology_independence_number}`. Tests: confirmed→0/N=3/ecology_confirmed; seat absent+¬declared→393/N<3/ecology_incomplete; seat absent+declared→394/false_anchored; present-invalid seat→its 385–392 (not 394/393).

## Task 6 — dispatch + frozen spine (P0 #105-113, #107, #110)

`core/dispatch.mjs`:
- `projectToFiveL(bundle)`: return a shallow clone with the v2-only top-level fields **deleted** (`envelope_schema,quorum_profile,quorum_rule,required_members,transparency_log_seat`, v2 reserved slots); `anchors`, `quorum_policy`, `schema_version`, `ceremony_contract` untouched. Rewrites nothing committed.
- `dispatchVtcQuorum(bundle, facts5L, facts5M, {tier})`: (1) marker: `envelope_schema` absent → route to `vtcqVerify(bundle,...)` (v1Unreinterpreted); exactly `"vtc_quorum_confirmed.v2"` → continue; **any other present value → run core then return 384** (P1 #107). (2) `const c = vtcqVerify(projectToFiveL(bundle), cfg5L, facts5L, {tier}); if (c.raw!==0) return c;` (383 propagates). (3) extension: 384→385→386→387→388→389→390→391→392→394→393→`OK{...state}`.
Tests: full order; **projection-equivalence — deleting ONLY `transparency_log_seat` / v2-only top-level fields does not change the `vtcqVerify` verdict of `projectToFiveL(bundle)` (byte-identical to the standalone 5L bundle)** (P0 #105 corrected wording); pending-OTS 5L bundle → 372 short-circuits before 384; v1 bundle → its 5L verdict; unknown marker "v3" → core then 384.

## Task 7 — node adapter: real crypto (P0 #110/#122, P1 #118-121)

`node/rekorAdapter.mjs` (Node-native `crypto`, no network). **Inline verified gate algorithm:** leaf `H=SHA256(0x00 || canonical_body_bytes)`; node `H=SHA256(0x01 || left || right)`; walk with `shard_leaf_index`/`tree_size` (iterative, consume all hashes); checkpoint note = text up to `\n\n`, signed msg = `body+"\n"`, sig = base64 line after `— `, strip 4-byte key hint → DER ECDSA verified vs pinned Rekor key; SET = ECDSA over `canonicalJson({body,integratedTime,logID,logIndex})`; submitter = ECDSA(sha256) over anchor bytes. All ECDSA via `crypto.verify("sha256", msg, pubPem, derSig)`.
`node/facts.mjs makeVtcQuorumFacts(bundle, pinned)`: builds **facts5M only**, in `try/catch` — **expected evidence defects become typed facts** (`inclusion_ok=false,inclusion_reason="log_index_out_of_range"` when `shard_leaf_index>=tree_size`; `checkpoint_ok=false,reason="checkpoint_tree_size_mismatch"` when `ckpt_size!==tree_size`; malformed DER → `set_ok=false`), **never an assert→395**. Assertions reserved for programmer invariants only.
`node/verify.mjs verifyVtcQuorum(bundle, pinned, keys, {tier})`: wrap **projection + both adapters + dispatch** in one outer `try` → `R(395,"internal_or_env_unavailable")` only for genuinely unexpected throws (P0 #110):
```
const facts5L = makeVtcqFacts(projectToFiveL(bundle), cfg5L(bundle), keys);  // REUSE 5L adapter
const facts5M = makeVtcQuorumFacts(bundle, pinned);
return dispatchVtcQuorum(bundle, facts5L, facts5M, {tier});
```
Real-path tests over the **Task-1 Lane-B packet**: 0/confirmed/N=3. Negative controls (packet mutations) for **385,386,387(`shard_leaf_index=tree_size`),388,389,390,391,392,393,394** (P1 #128) — each a typed code, none a 395.

## Task 8 — attestation (two-tier, P0 #132) + in-toto (P1 #132)

`node/attestation.mjs`:
- `buildPublicAttestationPayload(bundle,verdict)` — binds the structural set (schema/profile/quorum-rule, canonical-anchor digest, commitment `D`, packet manifest root, TSA+roots fpr, OTS digest+block height+hash, Rekor uuid+global_log_index+shard_leaf_index+tree_size, body/inclusion/checkpoint/SET digests, pinned Rekor+submitter fpr, adapter version digest, `computed_ecology_state`, `outcome_class`, `ecology_independence_number` (plain number, not BigInt), `externally_anchored`, raw+detail).
- `buildAuditAttestationPayload(bundle,verdict)` — adds the injected facts + `public_attestation_digest = sha256(canonicalJson(publicPayload))`.
- Domain tags: `SIG.stage5m_public`, `SIG.stage5m_audit` (distinct). Ed25519 sign/verify each. Tests: sign→verify per tier; tamper any bound field → fail; audit binds the public digest.
`node/intoto.mjs`: exact Statement `{_type:"https://in-toto.io/Statement/v1", subject:[{name:"vtc-quorum", digest:{sha256:<D hex>}}], predicateType:"https://simurgh.dev/attestation/containment-quorum/v0", predicate:{...verdict..., non_conformance:"unregistered candidate; not in-toto/SCITT-conforming"}}`. Test: exact shape + non-claim present.

## Task 9 — Lane B real offline CI gate (P0 #140-144)

Preflight (P0 last row): recompute `commitment_session_id` from the frozen `ceremony_contract`+policies in `real-laneb/` and assert it equals the captured `D`; assert `EVIDENCE_MANIFEST.json` digests match on-disk bytes. Then the gate = **manifest digest pin + full offline Node recompute** (`verifyVtcQuorum`) → **0 / confirmed / N=3 / externally_anchored=true**, wired into `check-e2e.sh` on any 5M code/evidence change. Negative: drop `checkpoint_evidence` → inherited **372**, not anchored (proves the witness is load-bearing). Real attestation signature committed (public key only) and **verified** in CI; do not claim CI regenerates it. Commit.

## Task 10 — Python parity + Lane D (P0 #148)

`python/vtcq_quorum_parity.py`: **stdlib `hashlib`** for RFC6962/merkle; **`openssl` CLI subprocess** for ECDSA-P256 (`openssl dgst -sha256 -verify`) and Ed25519 (`openssl pkeyutl -verify`) — **no pip deps**; document the exact offline commands. (a) pure-core parity over identical injected facts → same 384–395 verdict as Node; (b) Lane-D: consume the **raw** `real-laneb/` packet itself (never Node facts/root/verdict) → decision-equivalence (`raw`, `computed_ecology_state`, `outcome_class`, `ecology_independence_number`, anchor+root fingerprints byte-equal; Ed25519 attestation signed with a **distinct** Lane-D key so signatures differ). Commands + expected exit 0 written literally.

## Task 11 — browser tier (P1 #148)

`browser/vtcq-quorum-portable.mjs`: pure core (identical 384–395) + verifies the **public adapter attestation** via WebCrypto — `crypto.subtle.importKey("raw"/"spki", …, {name:"Ed25519"})`, `verify` over the canonical payload bytes; DER→raw conversion documented where needed. Signed non-claim: browser does not execute RFC-3161/OTS/Bitcoin/Rekor crypto. Node test harness drives it. Parity test: Node↔Python↔browser same verdict on shared vectors.

## Task 12 — Lean proofs (11 theorems, statements inlined, P0 #152)

`proofs/stage5m/{EcologyQuorum.lean, lean-toolchain (4.15.0), lakefile.toml}`; enumerate the dir in the Lean CI workflow. Model: `Facts` (booleans + `List EcologyClass`), `verdict : Facts → Nat`. Theorems (each names only its minimum assumption; `HashInjectiveOn` explicit; zero `sorry`, no user axioms):
1. `exactConjunction`: `v2WellFormed ∧ coreVerdict=0 → (outcome_class = ecology_confirmed ↔ tsaValid ∧ otsValid ∧ logValid ∧ crossSeatAgree ∧ distinct=3)`.
2. `incompleteNeverAnchored`: `computed_ecology_state=incomplete → externally_anchored=false`.
3. `overclaimBeforeFloor`: `declared ∧ incomplete → verdict=394` ∧ `orderIndex 394 < orderIndex 393`.
4. `rekorSpecificWins`: present-invalid log seat → `verdict ∈ {385..390}`; cross/ecology → `{391,392}`; never `{0,393,394}`.
5. `distinctFromPinnedClasses`: two seats same pinned class → `verdict=392`.
6. `crossSeatBindingSound`: seats binding different commitments → `verdict=391`, never 0.
7. `frozenCorePreserved`: `coreVerdict=c≠0 → verdict=c` (extension never runs).
8. `v1Unreinterpreted`: `envelope_schema absent → verdict = coreVerdict`.
9. `canonicalAnchorRoundTrip`: `hexDecode(hexEncode d)=d ∧ (d₁≠d₂→hexEncode d₁≠hexEncode d₂)`.
10. `rewriteFloorExact`: `outcome_class=ecology_confirmed → N=3` ∧ `incomplete → N<3`.
11. `crossEcologyEquivocationBound`: fixing ≥2 ecologies' seats, flipping the third's anchor either leaves `outcome_class`/anchored unchanged or forces `verdict ∈ {391,392}`. Compile exit 0.

## Task 13 — deterministic Lane C corpus (CI-GATED, before K7, P0 #158-160)

`tests/unit/llmShield/stage5m/laneC.test.js` — frozen packet mutations, **CI-gated unit tests**: counterfeit ecology→392, cross-log/wrong-checkpoint→388, cross-commitment replay→386, honest 2-seat floor (seat absent)→393, promoted 2-seat floor→394. This is a mandatory gate, not digest-only.

## Task 14 — K7 + reproduce + CI wiring (P0 #156)

`tests/e2e/llmShield/stage5m/k7AllFunctions.test.js`: every exported 5M function + tamper matrix + cross-stage invariants (5I–5L reproduce undisturbed). **Reach 395 via a test-only injected throwing dependency** (e.g. a stub adapter that throws), never a bundle field (P0 #136). `scripts/reproduce-llm-shield-stage5m.sh` (Node 26): unit + parity + Lane-A `cmp`-twice idempotence + Lane-B offline gate + attestation verify + Lane C + privacy scan + key audits + K7. **Wire 5M into `scripts/check-e2e.sh` (and `check.sh` unit list) and the Lean workflow** so it is a real CI gate. Literal commands + expected exit 0 in the script. Split `cmd && echo` onto separate lines under `set -e`; write-hashes after prettier. Run reproduce twice → byte-identical.

## Task 15 — documentation + acceptance (P1 #162-164)

`STAGE_5M_CLOSEOUT.md` with: threat model; validation matrix (every raw code → test); reviewer checklist; **signed novelty/non-claim source-map**; **non-claim audit** (overclaim scan finds only negated uses); **known-limitations** (trust-on-pin, ecology collusion, I8 split-view, no OIDC/I7, offline-finality-vs-permanence). Update `README.md` banner, `AGENT.md` + `CHANGELOG.md` (`Raouf:` entry). Re-score scorecard from real Lane B CI / Lane D / external repro.

## Closeout

K7 + full reproduce green (+ 5I–5L undisturbed) → `check.sh` + `check-e2e.sh` local → PR (honest scope) → CI green → rebase-merge → reset local main → tag `v2.48.0-stage-5m-vtc-quorum` → reproduce ON MAIN → closeout re-score → memory + Zurvan (search dupes first + ADR). I5 marked **PAID** on release acceptance.
