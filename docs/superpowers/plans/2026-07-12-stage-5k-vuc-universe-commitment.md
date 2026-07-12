# Stage 5K — VUC: Verifiable Universe Commitment (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-12-stage-5k-vuc-universe-commitment-design.md`.
> For a skilled engineer with **zero context** on this repo. Every task is TDD: write the failing
> test, run it, watch it fail for the right reason, write the minimal code, watch it pass, format,
> commit. Do not batch tasks. Do not write code before its test.

---

## Global Constraints (verbatim — do not paraphrase)

- **Version** `v2.46.0-stage-5k-vuc`; branch `stage-5k-vuc`; **raw codes 348–363** (16, wrapper 363 last).
  Confirm no newer tag first: `git tag --sort=-creatordate | head -3` (5J was `v2.45.0-stage-5j-vrc`).
- **Codes live in the GLOBAL registry** `tools/simurgh-attestation/stage4h/exitCodes.mjs` — additive
  only. Every 348–363 maps to `RUN_LEVEL_BY_RAW = 1` (including the wrapper 363 — every per-stage
  wrapper 331/315/299/347 is level **1**; only 4H's raw 29 and truly-unknown 999 are level 3; a
  reviewer will claim 363→3, it is FALSE, reject with the `RUN_LEVEL_BY_RAW` receipt). The wrapper
  identifier MUST be suffixed `INTERNAL_OR_ENV_UNAVAILABLE_VUC: 363` (bare `INTERNAL_FAIL_CLOSED`
  collides — see 5B/4X/4Y/4Z/5A/5J).
- **Never probe unknown-code behaviour with a bare literal above the range** — use the repo constant
  `UNKNOWN_RAW_PROBE = 999` (a literal just above the range becomes a real code next stage; that broke
  4R and 4S CI).
- **House partition** (mirror VRC/VPC/VSD): public first-failure `348→360` + policy `362`; audit adds
  `361`; `VUC_POLICY_CODES = [362]`; wrapper `363` applied OUTSIDE the ordered scan.
  `public_checked_raw_codes = [348..360, 362]`; `audit_checked_raw_codes = [348..362]`.
- **Pure core** `vucCore` over `(bundle, cfg, facts)` owns the frozen order; crypto (Ed25519 /
  SPKI-DER) and the anchor state machine are done by the node adapter and injected via `facts` (the 5I
  B11 pattern). Schema checks run BEFORE `makeCtx`, so a malformed bundle/cfg is 348, never a 363 throw.
- **All digests** via the SHARED `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`,
  `sha256Hex`) — never a stage-local hash copy (byte-parity across JS/Python/browser depends on it).
- **Merkle-set profile `simurgh.vuc.merkle_set.v1` is frozen** (spec §2). `leaf_hash =
SHA256(UTF8("simurgh.vuc.leaf.v1") || 0x00 || UTF8(canonicalJson(leaf_payload)))`; `node_hash =
SHA256(UTF8("simurgh.vuc.node.v1") || 0x00 || left_hash_bytes || right_hash_bytes)`; `leaf_payload =
{leaf_id, leaf_type, subject_digest}`; **odd final node promoted UNCHANGED** (RFC-6962 style). Hash
  bytes are the raw 32-byte digests concatenated, NOT hex strings. SHA-256 only. **NFC-reject** (never
  silent-normalize). **Leaf ordering key = the leaf's `leaf_id` compared as raw UTF-8 bytes**
  (`Buffer.compare` in JS, `.encode("utf-8")` byte order in Python); leaves are sorted by this key BEFORE
  the tree is built, and the IDENTICAL key is used in the JS builder, the JS `checkCommitment` root
  recompute, and the Python parity recompute — a mismatch here silently diverges the root. Duplicate
  `leaf_id` AND duplicate `leaf_digest` rejected. Empty tree rejected. `leaf_count ≥ 2` is a
  **release-policy** rule (362), not crypto.
- **Derive both universes, never copy.** `U_vpc` = project the verified 5I partition sections VPC
  actually covered. `U_vrc` = take 5J `required_producer_section` IDs → resolve
  `canonical_path`/`redaction_types` through the verified 5I partition → apply the SAME projection
  `simurgh.vuc.vpc_section_projection.v1`. No producer-supplied mapping table. Equality is checked
  **independently per component** (`U_commit = U_vpc` AND `U_commit = U_vrc`) — **never through a
  union** (a union `U_vpc ∪ U_vrc = U_commit` launders a gap; it is a modelled REJECTED counterexample).
- **`subject_digest = H("simurgh.vuc.section_subject.v1", {partition_digest, section_id, canonical_path,
redaction_types})`** — `section_id` is IN the subject, so two sections with an equal `canonical_path`
  are NOT aliases. Alias detection (359) = duplicate canonical id OR duplicate subject OR >1 mapping.
- **Two-axis anchor state machine** (adapter-derived, offline from bundled receipts):
  `ordering_evidence_state ∈ {verified_immediate, pending_unverified, invalid}` (raw-pending OTS →
  `pending_unverified`); `anchor_finality_state ∈ {pending, confirmed, invalid}` (null finality →
  `pending`, allowed). Acceptance requires `ordering_evidence_state = verified_immediate`. Declaring
  `confirmed` while computed `pending`/`invalid`, OR present-but-invalid finality evidence even under a
  `pending` claim → 360.
- **G13 adequacy-vocabulary belt at schema (348):** an annotation-surface key asserting `complete` /
  `exhaustive` / `all_risks_covered` / `universe_adequate` fails closed. Bounded vocabulary, not a
  semantic proof; the structural guarantee is the Lean `noUniverseAdequacyBit`.
- **`omission_claims[]` is VERDICT-NEUTRAL** — well-formedness at 348; the sig-validated
  `omission_claim_census` is recomputed at audit 361 only. An invalid omission-claim signature is
  EXCLUDED from the census (surfaces as a 361 audit mismatch), it NEVER causes a public-tier failure.
  It does not change the raw-0 verdict.
- **`prior_universe_ref` is optional** (`null | {vuc_bundle_digest, universe_commitment_digest,
ordering_receipt_digest}`); the referenced prior VUC bundle is supplied in cfg and RE-VERIFIED, then the
  `regression_census` (audit 361) reports leaves dropped vs its derived set. Absent input → empty census,
  not a fault. A bare digest cannot reveal dropped leaves (Review-v2 rule 13).
- **Reserved slots are structural unions** `null | reserved_anchor_object`; a non-null branch under the
  current `schema_version` → 362 (do NOT use strict-null in the schema, or it is caught at 348 first).
  `external_registry_anchor` is an ACTIVE optional field (`null | intoto_statement`), verified in the
  audit tier (361 family), NOT a reserved slot.
- **Node version:** the 5I/5J/4H reproduce + digest builders are byte-stable **only under Node 26**
  (`/opt/homebrew/opt/node@26/bin`). Build and `cmp` all evidence under Node 26.
- **Evidence dirs are prettier-ignored** (`.prettierignore`). Add `docs/research/llm-shield/evidence/stage-5k/`
  AND `tests/fixtures/llmShield/stage5k/test-keys/`.
- **`npm test` runs UNIT ONLY** (`tests/unit/**`). The K7 e2e (`tests/e2e/llmShield/stage5k/`) runs via
  `scripts/check.sh` — never shell `rg`/`find` inside a unit test.
- **Neutral commits.** No attribution trailers anywhere (commits, PR, release).
- **Lint gate:** `npm run format:check` must pass (prettier `--check .`) — run `npm run format` before
  each commit. Do NOT hand-edit fixtures prettier will reformat; regenerate them. Use the REPO-local
  prettier (`npx prettier` from repo root), never a global.

## Review-v2 corrections (LOAD-BEARING — these override any inline task text that predates them)

An external line-by-line audit found real contradictions; the spec was amended and these rules are now
binding. Where an older task snippet below conflicts, THIS block wins:

1. **`OK: 0` in `VUC_RAW_CODES`** (every stage enum carries it) — done in Task 0.1. Probe unknown with
   `UNKNOWN_RAW_PROBE`, never a bare `999`.
2. **No `ceremony_id` cycle.** `commitment_session_id = H(universe_commitment_digest, campaign_nonce)` is
   signed into `producer_commitment_statement` **pre-anchor**; `ceremony_id = H(universe_commitment_digest,
ordering_receipt_digest, campaign_nonce)` is formed **after** ordering and carried by challenges / starts
   / bindings. 349 verifies the session id; 353/354 cross-check the ceremony id against the verified receipt.
3. **Reuse the 5I/5J producer key for the commitment** (no separate `producer-commitment` key in v1 — a
   distinct key needs a signed `key_delegation` object under 349, deferred). laneKeys = producer (reused),
   producer-rating (reused), reviewer-a/reviewer-b (reused 5I principals), sequencer (new), verifier (new).
4. **Policy is cryptographically bound.** `policy_digest = H(policy_profile)` is in the commitment
   statement AND `verification_context`; both attestations bind it. **`fixture_sequenced_order_ticket` is
   forbidden under `release`** — Lane A is a **test-profile** pack (raw 0 under test), never release.
5. **Frozen digest encoding:** every stored `leaf_digest`/`subject_digest`/`universe_root`/
   `universe_commitment_digest`/`sibling_hashes[]` is `"sha256:<64 lowercase hex>"`. Strip `sha256:` and
   strict-decode (`^sha256:[0-9a-f]{64}$`, 32-byte check) before any Merkle math. `verifyInclusion` takes
   prefixed strings and validates them; never feed a prefixed string to a raw hex decoder.
6. **Set equality is over the triple `(leaf_id, leaf_type, subject_digest)`** — `universeSetDigest` and
   `U_vpc`/`U_vrc`/`U_commit` and parity vectors all use the triple, so a wrong `leaf_type` fails 357/358.
7. **`checkCommitment` rejects an unsorted `leaves[]`** (349) — it does NOT re-sort then recompute; assert
   `storedLeafIds === byteSorted(storedLeafIds)` first, then recompute the root over the stored order.
8. **349 owns ALL duplicate-ID + unsorted rejections; 359 owns only distinct-id/duplicate-subject +
   many-to-one.** Do not put a duplicate-`leaf_id` arm on 359 (unreachable — 349 runs first).
9. **The 5J builder API is `buildSignedVrcBundle(keys)`** (no section override; it internally calls
   `lanePanelSpec(keys.vpc)` and mints its own consistent synthetic 5I). So the crux fixture's single
   section source is **`lanePanelSpec(keys.vpc)`**: call `buildSignedVrcBundle(keys)` to get a consistent
   5I+5J pair, and project the SAME `lanePanelSpec` sections into the VUC leaves. **Do NOT modify the
   shipped 5J builder** (its default output must stay byte-identical; 5J reproduce stays green).
10. **Fixture facts ≠ adapter facts.** Task 1.2 builds `makeFixtureFacts()` (deterministic booleans for
    the crux fixture); Task 2.1 builds the authoritative `makeAdapterFacts()`. Distinct names so fixture
    facts can never ship as authoritative.
11. **VRC failure code is 347** (its wrapper) or a real VRC code like 333 — **never 331** (that is the VPC
    wrapper). Any `facts.vrc_verdict = 331` in a task below is a typo for `347`.
12. **`core/verificationContext.mjs`** is a required module (build/recompute/validate the context + its
    `policy_digest`; bind into bundle + both attestations; caller booleans never define it). Facts add
    `attestationSigValid`.
13. **`prior_universe_ref { vuc_bundle_digest, universe_commitment_digest, ordering_receipt_digest }`** and
    the referenced prior VUC bundle is supplied in cfg and RE-VERIFIED for the `regression_census` (a bare
    digest cannot reveal dropped leaves).
14. **Omission census reports `{valid_claim_count, invalid_claim_count, invalid_claim_digests}`** and the
    stored census must match all three — an invalid claim is recorded as invalid, never silently dropped
    (audit-tier 361; still public-verdict-neutral).
15. **Novelty stays 9.0** at closeout (two Lean lemmas ≠ first-of-kind; needs the external sweep +
    independent reproduction). **Theorem 11 is `setEqualityDecisionBlindToSectionText`** (narrowed), not a
    whole-verdict blindness claim. The Scope Trilemma ties each branch to a checker predicate, not enum
    exhaustiveness.
16. **Parity covers the full deterministic matrix 348–362** (Tasks 5/6): a shared
    `tests/fixtures/llmShield/stage5k/parity-vectors/` manifest (raw 0 + every reachable deterministic code
    - the public/audit 361 split + commitment/Merkle/projection/set digests), Node ↔ Python agree on all;
      browser agrees over its supported surface. The browser is a **WebCrypto reimplementation** of the
      deterministic surface proven by vectors — NOT a direct import of the `node:crypto`/`Buffer` core.
17. **Set-law (357/358) reachability is honest.** Under the REAL adapter a VRC-only or VPC-only divergence
    normally fails earlier (352/upstream), so do NOT promise real-adapter K7 arms for every per-component
    case. Prove the independent branches with **pure-core unit tests over injected, internally-consistent
    `ctx.U_vpc`/`ctx.U_vrc`** (357 VPC-arm, 357 VRC-arm, 358 VPC-arm, 358 VRC-arm); the K7 artifact arm is a
    commitment-vs-downstream mismatch where both verified components differ from `U_commit`; and a Lean
    counterexample shows union equality is insufficient.
18. **`attach-anchor.mjs` is bespoke, not a 5J copy.** It attaches ordering evidence, verifies + pins the
    ordering receipt, **recomputes `verification_context_digest`**, optionally attaches finality, recomputes
    finality state, then rebuilds + re-signs the affected attestations. "Copy and retarget subject" is
    insufficient because VUC binds the context digest, which 5J does not have.
19. **Evidence is (re)built AFTER Lean (Task group 7).** The audit attestation binds `lean_source_digest`
    (and `non_claims_digest`/`limitations_digest`), so the committed Lane-A pack must be regenerated and
    recommitted once those artifacts are final — do the final `build-vuc-evidence` + `cmp` in Task 8/9, not
    in Task 2.2 (2.2's pack uses placeholder digests that are overwritten).
20. **Fable-5 containment Lane A arm (#32, deterministic, payload-redacted).** Add one 357 arm named for the
    containment scenario: a producer proposes a narrowed declared universe omitting one consequence-bearing
    section; the anchored original universe is larger; No Shrinking Universe returns 357. No live model, no
    jailbreak content — this keeps VUC tied to Simurgh's containment core. (The live variant is Lane C-adv.)

## Read before Task 1 (paid-for lessons)

- `.claude/skills/simurgh-stage-craft/references/gotcha-ledger.md` — every entry cost ≥1 red CI round.
- **Additive codes ripple SEVEN consumers**, not just the enum. After adding 348–363 to
  `exitCodes.mjs`, regenerate/patch ALL of:
  1. `tools/simurgh-attestation/stage4h/exitCodes.mjs` (`RUN_LEVEL_BY_RAW`, the three `VUC_*` order arrays)
  2. `docs/research/llm-shield/evidence/stage-4h/exit-map.json` (golden)
  3. `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` (golden)
  4. `tests/unit/llmShield/exitCodeProbeHygiene.test.js`
  5. `tests/unit/llmShield/stage4h/exitWrapper.test.js`
  6. `tests/unit/llmShield/stage4h/closeout.test.js`
  7. `tests/unit/llmShield/stage4h/reproduce.test.js`
     Regenerate the two goldens with `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
     (Node 26) — do NOT hand-edit. **The 4H digest builder is non-hermetic in this env**: it churns ~17
     unrelated fixtures even on a clean tree. Run it on a clean tree, then `git add` ONLY the two
     `exit-map.json` diffs and revert the rest (`git checkout -- <the others>`). Golden lock: both
     exit-maps must carry 348–363 → 1.
- `resign()` / signing helpers MUTATE; `structuredClone` before tampering a fixture (fixture aliasing
  bit 5I and again 5J). `_validBundle()` MUST return `structuredClone(...)`.
- Compare recomputes with `canonicalJson(a) === canonicalJson(b)`, never `===` on objects.
- **`constants.mjs` lives at the STAGE ROOT** (`stage5k/constants.mjs`, like 5I/5J), NOT in `core/` —
  else `../stage4h/exitCodes.mjs` resolves to `stage5k/stage4h`. Core modules import `../constants.mjs`.
- **Priv-key allowlist:** add the stage5k test-keys line to BOTH
  `scripts/security-audit-llm-shield-stage3m.sh` AND `scripts/security-audit-llm-shield-stage3o.sh`
  (both allowlist by PATH REGEX; role names have NO digits):
  `stage5k/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem`.
- **Merkle hash bytes are raw digests**, not hex. `node_hash` concatenates the two 32-byte `Buffer`s.
  In Python, `hashlib.sha256(...).digest()` (not `.hexdigest()`) for internal nodes.
- **`scores`/decimal-carrying fields are STRINGS** if any appear (canonicalJson throws on BigInt; the
  5Z lesson) — VUC's `commit_first_margin` distances are plain integers, safe; keep them `Number`.

---

## File map (every file; one responsibility each)

**Stage root — `tools/simurgh-attestation/stage5k/`**

- `constants.mjs` — STAGE ROOT (not `core/`); re-exports `VUC_*` from `../stage4h/exitCodes.mjs`;
  `DOMAINS` (the `simurgh.vuc.*` domain-separation tags); `MERKLE` profile ids; `ADEQUACY_FORBIDDEN_KEYS`
  (G13 belt); `ANCHOR_STATE` enums; `VUC_RESERVED_ARTIFACT_SLOTS` (2 fields → 362) + `VUC_MINTED_SOCKETS`;
  reuse the `RUNG` lattice (copy from 5J constants); policy profiles (`release`/`test`).

**Core (pure) — `tools/simurgh-attestation/stage5k/core/`**

- `result.mjs` — `R(raw, reason, extra)` / `OK(ctx)` (copy 5J verbatim).
- `digests.mjs` — re-export `canonicalJson`, `sha256Hex`; `domainDigest`, `artifactDigest`,
  `identityDigest` (copy 5J; identity binds subject+fingerprint only).
- `merkle.mjs` — the frozen `simurgh.vuc.merkle_set.v1`: `leafHash`, `nodeHash`, `merkleRoot(leaves)`,
  `buildInclusion(leafHashes, idx)` and `verifyInclusion(proof, leafHashHex, rootHex)` (co-developed;
  strict `sha256:<64hex>` encoding). Pure, Buffer-based, odd-node-promoted.
- `verificationContext.mjs` — `buildVerificationContext(...)`, `verificationContextDigest(...)`,
  `checkVerificationContext(ctx)`: recompute the six evidence roots + `policy_digest`, validate pinned
  keys/checkpoints, bind the digest into the bundle and BOTH attestations. Caller booleans never define it.
- `projection.mjs` — `sectionSubjectDigest({partition_digest, section_id, canonical_path,
redaction_types})`; `projectSection(section, partition_digest) → {leaf_id, leaf_type, subject_digest}`;
  `universeSetDigest(leaves)` (canonical set digest for parity comparison).
- `schema.mjs` — `checkBundleSchema(bundle) → 348 | null` AND `checkConfigSchema(cfg) → 348 | null`
  (two TOTAL functions, both catch parse/canonical failures and RETURN 348, never throw): shape,
  canonical form, uniqueness, required objects, reserved-slot union typing, the G13
  `ADEQUACY_FORBIDDEN_KEYS` screen, `omission_claims[]`/`prior_universe_ref` well-formedness.
- `commitment.mjs` — `checkCommitment(ctx) → 349 | null`: canonicalization, dup `leaf_id`/`leaf_digest`,
  per-leaf `leaf_digest` recompute, `universe_root` recompute, `universe_commitment_digest` recompute,
  producer commitment signature (via facts).
- `anchor.mjs` — `checkAnchorSubject(ctx) → 350 | null`; `checkOrdering(ctx) → 351 | null`;
  `checkFinalityOverclaim(ctx) → 360 | null`. Consumes the adapter-derived `ordering_evidence_state` /
  `anchor_finality_state` from facts.
- `downstream.mjs` — `checkDownstream(ctx) → 352 | null`: `vpc_ref`/`vrc_ref` equal the re-verified
  5I/5J bundles (digests + roots), and both upstream verdicts are 0 (from facts).
- `starts.mjs` — `checkStartCensus(ctx) → 353 | null` (missing/extra/dup start; assignment mismatch;
  wrong reviewer; missing producer rating-start; sigs); `checkPrecedence(ctx) → 354 | null` (each start
  bound to verified ordering via a valid sequencer challenge chain; prev-link contiguity; bound to THIS
  commitment).
- `bindings.mjs` — `checkExecutionBindings(ctx) → 355 | null`: reviewer + producer execution bindings
  chain to their starts and carry the EXACT coverage-receipt / rating-entry sets (full history), sigs.
- `inclusion.mjs` — `checkInclusion(ctx) → 356 | null`: each committed leaf has a valid inclusion proof
  (index-fixed composition, correct `tree_size`); proof-subject census = leaf set (no missing/extra/dup).
- `setlaws.mjs` — `checkShrinking(ctx) → 357 | null` (per component: every committed leaf ∈ U_vpc AND ∈
  U_vrc, exactly once); `checkPhantom(ctx) → 358 | null` (per component: every evaluated leaf ∈ U_commit);
  `checkAlias(ctx) → 359 | null` (distinct `leaf_id`s with a duplicate `subject_digest` / >1 mapping —
  duplicate-`leaf_id` is 349's, unreachable here).
- `projections.mjs` — `checkProjections(ctx) → 361 | null` (audit): recompute `bijection_census`,
  `per_component_universe_state`, `inclusion_coverage`, `review_start_census`, `regression_census` (G4/G7),
  `commit_first_margin` (G1), `omission_claim_census` (G8, sig-validated), `projection_root`; plus the
  `external_registry_anchor` in-toto bridge (sig + subject = commitment digest + recompute).
- `policy.mjs` — `checkReservedSlots(ctx) → 362 | null` (non-null reserved slot; non-release
  `composition_profile`; `leaf_count < 2` under release).
- `signatures.mjs` — `verifyContent`, `fingerprint` (copy 5J verbatim; Ed25519 over SPKI-DER).
- `context.mjs` — `makeCtx(bundle, cfg, facts)`: re-verify 5I + 5J anchors (verdicts arrive via facts),
  derive `U_vpc` and `U_vrc` via `projection.mjs`, build digest→object maps, resolve sequencer chain
  heads, stash `anchorSubjectMismatch` etc. NEVER throws on bad upstream (returns state the checks read).
- `vucCore.mjs` — the orchestrator; owns the frozen order 348→362 + wrapper 363 (shape below).
- `attestation.mjs` — `buildPublicAttestation(ctx)`, `buildAuditAttestation(ctx, publicDigest)`,
  `verifyAttestation(...)` (copy 5J shapes; fields per spec §3).
- `independence.mjs` — reuse the `RUNG` lattice for Lane C (copy 5J `independence.mjs`; `strongestRung`,
  `anchorBindingValid`, refuses upgrade above `distinct_key_only` without injected `anchorVerified`).

**Node — `tools/simurgh-attestation/stage5k/node/`**

(Signing/verification primitives live in `core/signatures.mjs`; the node layer only orchestrates.)

- `adapter.mjs` — B11: re-verify embedded 5I (via `stage5i`) AND 5J (via `stage5j`) bundles, resolve
  every VUC Ed25519 signature + the two anchor states into `facts`.
- `laneKeys.mjs` — deterministic committed keys (producer-commitment, producer-rating, ≥2 reviewer,
  sequencer, verifier); **letters-only role filenames** (allowlist regex). Reuse 5J's producer/reviewer
  keys where the principals must match; new keys for sequencer + producer-commitment + verifier. (Seeded
  Task 1.2.)
- `buildSignedBundle.mjs` — mint a SYNTHETIC 5I VPC bundle AND a SYNTHETIC 5J VRC bundle over ONE shared
  `SECTIONS` source (the 5I/5J BUILDERS as code, never a shipped artifact), then build a valid `vuc_bundle`
  - external-config over them so `U_commit=U_vpc=U_vrc` by construction. (Seeded Task 1.2; widened + emits
    attestations in Task 2.2.)
- `build-vuc-evidence.mjs` — `buildLaneAEvidence(dir)`: write `bundle.json`, `external-config.json`,
  `public-attestation.json`, `audit-attestation.json` (byte-stable).
- `verify-vuc-attestation.mjs` — CLI (`--tier public|audit`, optional dir arg); handles absolute-path dir.
- `verify-byte-stability.mjs` — build twice into temp dirs, assert every file byte-identical (copy 5J).
- `lanec-gate.mjs` — `evaluateCampaign(pack) → {campaign_state, ordering_state, finality_state,
sigstore_chip_state, rung}` (copy 5J shape).
- `attach-anchor.mjs` — attach a real Sigstore/Rekor anchor + recompute rung (copy 5J).
- `verify-witness.mjs` — run `ots verify` on the finality receipt; map to `anchor_finality_state`.

**Python — `tools/simurgh-attestation/stage5k/python/`**

- `vuc_parity.py` — stdlib-only independent reimplementation of the deterministic surface (canonicalJson
  byte-equality, the domain digests, Merkle leaf/node/root with raw-byte concatenation, the projection,
  `U_vpc`/`U_vrc` set digests, the commitment digest, the census recomputes). Predicate view, no sig-verify.

**Browser — `tools/simurgh-attestation/stage5k/browser/`**

- `canonical-json.mjs` — copy 5J.
- `vuc-portable.mjs` — the shared JS core packaged for WebCrypto; verifies bundled sigs/facts it supports;
  unsupported anchor path declared, not simulated (no Rekor/Bitcoin contact).

**Lane C — `tools/simurgh-attestation/stage5k/lanec/`**

- `run-droplet-ceremony.mjs` — independent-party commit-first ceremony over the real 37-section Opus
  structure under the **exact committed 5I reviewer principals + the reused producer identity** (fresh
  ceremony records + signatures, NOT fresh keys — fresh reviewer keys would be principal substitution);
  emits `ANCHOR_ME.txt` (= `universe_commitment_digest`) for the anchor step. (Independence here is at the
  verifier/anchor, not the reviewer principals, since VUC builds on the committed 5I panel.)

**Proofs — `proofs/stage5k/`**

- `UniverseCommitment.lean` — 11 theorems (spec §4), zero `sorry`, no hidden `axiom`.
- `lean-toolchain` — `leanprover/lean4:v4.15.0` (copy 5J).

**Tests — `tests/unit/llmShield/stage5k/`**

- `_validBundle.mjs` (returns `structuredClone`), `constants.test.js`, `schema.test.js`, `merkle.test.js`,
  `commitment.test.js`, `anchor.test.js`, `starts.test.js`, `bindings.test.js`, `inclusion.test.js`,
  `setlaws.test.js`, `projections.test.js`, `vucCore.test.js`, `exitCodes.test.js`, `laneA.test.js`,
  `laneb.test.js`, `lanec.test.js`, `parity.test.js`, `browser.test.js`, `independence.test.js`,
  `attestation.test.js`, `signing.test.js`.

**Tests — `tests/e2e/llmShield/stage5k/`**

- `k7AllFunctions.test.js` — every export reachable + tamper matrix (every 348–363) + cross-stage invariants.

**Scripts / evidence**

- `scripts/reproduce-llm-shield-stage5k.sh`; `.prettierignore` (+2 lines); the two security-audit scripts
  (+1 line each); `docs/research/llm-shield/evidence/stage-5k/` (Lane A pack + `real-structure/`).

---

## Interfaces (exact signatures — a task implementer sees only their own task)

```text
// core/result.mjs
R(raw:Number, reason:String, extra:Object={}) → { raw, reason, ...extra }
OK(ctx) → { raw:0, ctx }

// core/merkle.mjs   (Buffers throughout; hashes are raw 32-byte Buffers)
leafHash(leaf_payload:{leaf_id,leaf_type,subject_digest}) → Buffer(32)
nodeHash(left:Buffer(32), right:Buffer(32)) → Buffer(32)
merkleRoot(leafHashes:Buffer[]) → Buffer(32)              // odd final node promoted unchanged; throws on []
verifyInclusion({leaf_index,tree_size,sibling_hashes:hex[]}, leafHashHex, rootHex) → Boolean

// core/projection.mjs
sectionSubjectDigest({partition_digest,section_id,canonical_path,redaction_types}) → "sha256:…"
projectSection(section, partition_digest) → {leaf_id, leaf_type:"vpc_section", subject_digest}
universeSetDigest(leaves:[{leaf_id,subject_digest}]) → "sha256:…"   // sorted, canonical

// core/schema.mjs
checkBundleSchema(bundle) → {raw:348,reason} | null
checkConfigSchema(cfg)   → {raw:348,reason} | null

// core/context.mjs
makeCtx(bundle, cfg, facts) → ctx      // never throws; stashes derived state + first-cheap mismatches

// each check: (ctx) → {raw:N,reason} | null
checkCommitment, checkAnchorSubject, checkOrdering, checkDownstream, checkStartCensus,
checkPrecedence, checkExecutionBindings, checkInclusion, checkShrinking, checkPhantom, checkAlias,
checkFinalityOverclaim, checkProjections(audit), checkReservedSlots

// core/vucCore.mjs
vucVerify(bundle, cfg, facts, {tier="public"}={}) → {raw, reason?, ctx?}

// node/adapter.mjs
makeAdapterFacts(bundle, cfg) → facts   // {vpc_verdict, vrc_verdict, orderingState, finalityState,
                                        //  producerCommitmentSigValid, startSigValid{}, bindingSigValid{},
                                        //  sequencerSigValid{}, omissionSigValid{}, …}

// facts contract the pure core consumes (test-only booleans OK):
facts = {
  vpc_verdict:Number, vrc_verdict:Number,
  orderingState:"verified_immediate"|"pending_unverified"|"invalid",
  finalityState:"pending"|"confirmed"|"invalid",
  producerCommitmentSigValid:Boolean,
  startSigValid:{[challenge_digest]:Boolean}, producerStartSigValid:Boolean,
  sequencerSigValid:{[challenge_digest]:Boolean},
  bindingSigValid:{[binding_digest]:Boolean},
  omissionSigValid:{[claim_id]:Boolean},          // audit-only consumer
  registryAnchorSigValid:Boolean|null,            // audit-only
}
```

---

## Task group 0 — codes, constants, exit-map ripple (scaffold)

### Task 0.1 — register raw codes 348–363 in the global registry

**Test first** — `tests/unit/llmShield/stage5k/exitCodes.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VUC_RAW_CODES,
  VUC_PUBLIC_CHECK_ORDER,
  VUC_AUDIT_CHECK_ORDER,
  VUC_AUDIT_ONLY_CODES,
  VUC_POLICY_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VUC codes are OK:0 + the contiguous 348..363 block", () => {
  assert.equal(VUC_RAW_CODES.OK, 0);
  const allocated = Object.values(VUC_RAW_CODES)
    .filter((n) => n !== 0)
    .sort((a, b) => a - b);
  assert.deepEqual(
    allocated,
    Array.from({ length: 16 }, (_, i) => 348 + i)
  );
  assert.equal(VUC_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VUC, 363);
});

test("house partition: public 348..360+362, audit adds 361, policy 362, wrapper 363", () => {
  assert.deepEqual(
    VUC_PUBLIC_CHECK_ORDER,
    [348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360]
  );
  assert.deepEqual(
    VUC_AUDIT_CHECK_ORDER,
    [348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361]
  );
  assert.deepEqual(VUC_AUDIT_ONLY_CODES, [361]);
  assert.deepEqual(VUC_POLICY_CODES, [362]);
});

test("every VUC raw code is a run-level-1 rejection (wrapper included)", () => {
  for (let c = 348; c <= 363; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1);
  assert.equal(stage4CodeForRawCode(363), 1); // NOT 3 — per-stage wrapper convention
  assert.equal(stage4CodeForRawCode(UNKNOWN_RAW_PROBE), 3); // unknown still 3 — never a bare 999 literal
});
```

Run `node --test tests/unit/llmShield/stage5k/exitCodes.test.js` → fails (no `VUC_*` exports).

**Minimal code** — append to `tools/simurgh-attestation/stage4h/exitCodes.mjs` after the VRC block
(mirror the VRC comment banner + arrays):

```js
// Stage 5K — VUC: Verifiable Universe Commitment. Additive codes 348–363. Declared-universe →
// evaluated-universe equality (per component), sequencer-chain commit-first precedence, exact
// reviewer/producer execution bindings over a Merkle-set commitment. No Shrinking Universe / No Phantom
// Section / No Post-Hoc Commitment Record. Public first-failure 348→360; audit adds projection 361;
// policy 362 + wrapper 363 OUTSIDE the ordered scan (house convention, cf. VRC_*).
export const VUC_RAW_CODES = Object.freeze({
  OK: 0, // every stage enum carries OK:0 (VPC/VRC convention) — CODES.OK must not be undefined
  VUC_SCHEMA_INVALID: 348,
  VUC_COMMITMENT_INVALID: 349,
  VUC_ANCHOR_SUBJECT_INVALID: 350,
  VUC_ORDERING_NOT_VERIFIED_IMMEDIATE: 351,
  VUC_DOWNSTREAM_BINDING_INVALID: 352,
  VUC_START_CENSUS_INVALID: 353,
  VUC_POST_HOC_COMMITMENT_RECORD: 354,
  VUC_EXECUTION_BINDING_INVALID: 355,
  VUC_INCLUSION_PROOF_INVALID: 356,
  VUC_SHRINKING_UNIVERSE: 357,
  VUC_PHANTOM_SECTION: 358,
  VUC_ALIAS_VIOLATION: 359,
  VUC_ANCHOR_FINALITY_OVERCLAIM: 360,
  VUC_PROJECTION_MISMATCH: 361, // audit-only (bijection/per-component/inclusion/start census/
  //                               regression/commit-first-margin/omission census/in-toto bridge)
  VUC_RESERVED_SLOT_ACTIVATED: 362, // policy — non-null reserved branch / non-release profile / leaf_count<2
  INTERNAL_OR_ENV_UNAVAILABLE_VUC: 363, // fail-closed wrapper (run level 1)
});
export const VUC_PUBLIC_CHECK_ORDER = Object.freeze([
  348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360,
]);
export const VUC_AUDIT_CHECK_ORDER = Object.freeze([
  348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361,
]);
export const VUC_AUDIT_ONLY_CODES = Object.freeze([361]);
export const VUC_POLICY_CODES = Object.freeze([362]);
```

Then in `RUN_LEVEL_BY_RAW`, after the `347: 1,` line, add `348: 1, … 363: 1,` (all 16, with the same
banner comment noting 363 is level 1 like the other per-stage wrappers). Run the test → green. Commit
`feat(5k): register VUC raw codes 348–363 in the global exit registry`.

### Task 0.2 — the exit-map goldens + hardcoded consumers

**Test first** — extend `exitCodes.test.js` with a golden-lock assertion:

```js
import { readFileSync } from "node:fs";
test("both exit-map goldens carry 348..363 → 1", () => {
  for (const p of [
    "docs/research/llm-shield/evidence/stage-4h/exit-map.json",
    "tests/fixtures/llmShield/stage4h/expected-results/exit-map.json",
  ]) {
    const m = JSON.parse(readFileSync(p, "utf8"));
    for (let c = 348; c <= 363; c++)
      assert.equal(m[String(c)] ?? m.map?.[String(c)], 1, `${p}:${c}`);
  }
});
```

(Adjust the accessor to the golden's actual shape — open one first.) Run → fails.

**Minimal code:** regenerate the goldens on a **clean tree** under Node 26:
`/opt/homebrew/opt/node@26/bin/node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`.
Then `git status`: **add ONLY the two `exit-map.json` diffs**, `git checkout --` the ~17 churned
unrelated fixtures (non-hermetic builder). Update the three hardcoded consumers if they enumerate ranges:
`exitCodeProbeHygiene.test.js`, `stage4h/exitWrapper.test.js`, `stage4h/closeout.test.js`,
`stage4h/reproduce.test.js` (open each; extend any explicit code-list/expected-count to include 348–363).
Run the 4H suite `node --test tests/unit/llmShield/stage4h/*.test.js` + the probe hygiene test → green.
Commit `chore(5k): ripple exit-map goldens + consumers for 348–363`.

### Task 0.3 — `constants.mjs` at the stage root

**Test first** — `tests/unit/llmShield/stage5k/constants.test.js`: assert `CODES.VUC_SCHEMA_INVALID
=== 348`; `DOMAINS.leaf === "simurgh.vuc.leaf.v1"`, `DOMAINS.node`, `DOMAINS.section_subject`,
`DOMAINS.commitment`; `ADEQUACY_FORBIDDEN_KEYS.has("universe_adequate")`; `ANCHOR_STATE.ordering`
includes `verified_immediate`; `rungGte("challenge_bound","distinct_key_only")`; `POLICY_PROFILES.release.
require_dual_equality === true`. Run → fails.

**Minimal code** — `tools/simurgh-attestation/stage5k/constants.mjs` (mirror 5J; re-export codes,
add the VUC domains + belt + anchor enums; copy `RUNG`/`rungGte` verbatim):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC. Constants + the VFC separation-rung lattice (Lane C). Lives at the STAGE ROOT so
// `../stage4h/exitCodes.mjs` resolves; core modules import via `../constants.mjs`.
export {
  VUC_RAW_CODES as CODES,
  VUC_PUBLIC_CHECK_ORDER,
  VUC_AUDIT_CHECK_ORDER,
  VUC_AUDIT_ONLY_CODES,
  VUC_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

export const DOMAINS = Object.freeze({
  leaf: "simurgh.vuc.leaf.v1",
  node: "simurgh.vuc.node.v1",
  section_subject: "simurgh.vuc.section_subject.v1",
  commitment: "simurgh.vuc.commitment.v1",
  producer_commitment: "simurgh.vuc.producer_commitment.v1",
  review_start_challenge: "simurgh.vuc.review_start_challenge.v1",
  review_start_record: "simurgh.vuc.review_start_record.v1",
  producer_rating_start: "simurgh.vuc.producer_rating_start.v1",
  review_execution_binding: "simurgh.vuc.review_execution_binding.v1",
  producer_execution_binding: "simurgh.vuc.producer_execution_binding.v1",
  omission_claim: "simurgh.vuc.omission_claim.v1",
  attestation_public: "simurgh.vuc.public_attestation.v1",
  attestation_audit: "simurgh.vuc.audit_attestation.v1",
});
export const MERKLE = Object.freeze({ profile: "simurgh.vuc.merkle_set.v1", hash: "sha-256" });

// G13 belt — an adequacy assertion in the flat annotation surface fails closed at schema (348). The
// structural guarantee is the Lean noUniverseAdequacyBit; this is the lexical screen (bounded vocab).
export const ADEQUACY_FORBIDDEN_KEYS = Object.freeze(
  new Set(["complete", "exhaustive", "all_risks_covered", "universe_adequate"])
);

export const ANCHOR_STATE = Object.freeze({
  ordering: Object.freeze(["verified_immediate", "pending_unverified", "invalid"]),
  finality: Object.freeze(["pending", "confirmed", "invalid"]),
});

// Structural union slots raw 362 rejects when non-null — NOT the socket-ledger IOUs.
export const VUC_RESERVED_ARTIFACT_SLOTS = Object.freeze([
  "review_window_binding", // VTC pays
  "campaign_composition_root", // capstone consumes
]);
export const VUC_MINTED_SOCKETS = Object.freeze(["universe_adequacy_deferred"]);

// VFC separation-rung lattice (copy 5J). Ordinal only, never a measurement.
const RUNG_ORDER = ["distinct_key_only", "challenge_bound", "externally_anchored"];
export const RUNG = Object.freeze({
  order: Object.freeze([...RUNG_ORDER]),
  index: (r) => {
    const i = RUNG_ORDER.indexOf(r);
    if (i < 0) throw new Error(`invalid rung ${JSON.stringify(r)}`);
    return i;
  },
});
export function rungGte(a, b) {
  return RUNG.index(a) >= RUNG.index(b);
}

export const POLICY_PROFILES = Object.freeze({
  release: Object.freeze({
    profile_id: "vuc-release-v1",
    min_leaves: 2,
    require_dual_equality: true,
  }),
  test: Object.freeze({ profile_id: "vuc-test-v1", min_leaves: 1, require_dual_equality: true }),
});
```

Run → green. Commit `feat(5k): VUC constants (domains, Merkle profile, G13 belt, anchor enums)`.

---

## Task group 1 — the pure core, check by check (each grows `vucCore`)

> Pattern for EVERY task in this group: (1) write the failing unit test in the check's test file, tamper a
> `structuredClone` of the raw-0 `_validBundle()` to the target defect, assert the exact raw; (2) watch it
> fail; (3) write the minimal check; (4) wire it into `vucCore.mjs` at its frozen position; (5) watch the
> valid fixture stay green and the tamper hit its code; (6) format; (7) commit.
>
> **`_validBundle()` is a by-construction crux fixture, not an incremental shell** (a Merkle root + a web
> of Ed25519 signatures cannot be hand-grown field-by-field). Task 1.2 builds the **crux-fixture ceremony
> builder** — `laneKeys` (deterministic test keys) + a minimal `buildSignedBundle` that mints a synthetic
> 5I VPC bundle AND a synthetic 5J VRC bundle AND the VUC layer over **one shared `SECTIONS` source**, so
> `U_commit = U_vpc = U_vrc` holds by construction — and `_validBundle.mjs` returns a `structuredClone` of
> its raw-0 output. Every check task (1.3+) tampers that. `buildSignedBundle` + `laneKeys` are seeded here
> and only _extended_ in Task group 2 (evidence-pack writer, attestations, byte-stability). **Do NOT reuse
> the committed 5J evidence bundle as upstream** — it embeds its own synthetic 5I, which will not match the
> committed 5I partition and desyncs `U_vpc`/`U_vrc`; mint both fresh from the one `SECTIONS` source.

### Task 1.0 — result / digests / signatures / merkle / projection primitives + the `vucCore` skeleton

Copy `result.mjs`, `digests.mjs`, `signatures.mjs` from `stage5j/core/` verbatim (adjust the header
comment to 5K). Then:

**Test first** — `tests/unit/llmShield/stage5k/merkle.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leafHash,
  nodeHash,
  merkleRoot,
  verifyInclusion,
  buildInclusion,
} from "../../../../tools/simurgh-attestation/stage5k/core/merkle.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { createHash } from "node:crypto";

const H = (...bufs) => {
  const h = createHash("sha256");
  for (const b of bufs) h.update(b);
  return h.digest();
};
const leaf = (i) => ({
  leaf_id: `s${i}`,
  leaf_type: "vpc_section",
  subject_digest: `sha256:${i.toString().repeat(4)}`,
});

test("leafHash is domain-framed over canonicalJson(leaf_payload)", () => {
  const lp = leaf(1);
  const expect = H(
    Buffer.from("simurgh.vuc.leaf.v1", "utf8"),
    Buffer.from([0]),
    Buffer.from(
      canonicalJson({
        leaf_id: lp.leaf_id,
        leaf_type: lp.leaf_type,
        subject_digest: lp.subject_digest,
      }),
      "utf8"
    )
  );
  assert.ok(leafHash(lp).equals(expect));
});

test("odd final node is promoted unchanged", () => {
  const l = [leaf(1), leaf(2), leaf(3)].map(leafHash);
  const root = nodeHash(nodeHash(l[0], l[1]), l[2]); // l[2] promoted, not self-hashed
  assert.ok(merkleRoot(l).equals(root));
});

test("empty tree throws", () => assert.throws(() => merkleRoot([])));

// The 1..9 property test — co-develops the sibling builder (buildInclusion) and verifyInclusion so the
// promoted-odd levels agree. This is the real reachability guarantee, not prose.
for (let n = 1; n <= 9; n++) {
  test(`inclusion round-trips for EVERY leaf, tree_size=${n}`, () => {
    const hashes = Array.from({ length: n }, (_, i) => leafHash(leaf(i)));
    const rootHex = "sha256:" + merkleRoot(hashes).toString("hex");
    for (let idx = 0; idx < n; idx++) {
      const proof = buildInclusion(hashes, idx); // { leaf_index, tree_size, sibling_hashes:[sha256:..] }
      const leafHex = "sha256:" + hashes[idx].toString("hex");
      assert.equal(verifyInclusion(proof, leafHex, rootHex), true, `size ${n} idx ${idx}`);
      // negative arms
      assert.equal(
        verifyInclusion({ ...proof, leaf_index: (idx + 1) % n }, leafHex, rootHex),
        false
      ); // wrong index
      assert.equal(verifyInclusion({ ...proof, tree_size: n + 1 }, leafHex, rootHex), false); // wrong size
      if (proof.sibling_hashes.length) {
        assert.equal(
          verifyInclusion(
            { ...proof, sibling_hashes: proof.sibling_hashes.slice(1) },
            leafHex,
            rootHex
          ),
          false
        ); // missing sibling
        assert.equal(
          verifyInclusion(
            { ...proof, sibling_hashes: [...proof.sibling_hashes, rootHex] },
            leafHex,
            rootHex
          ),
          false
        ); // extra sibling
        const bad = [...proof.sibling_hashes];
        bad[0] = "sha256:" + "e".repeat(64);
        assert.equal(verifyInclusion({ ...proof, sibling_hashes: bad }, leafHex, rootHex), false); // wrong sibling
      }
      assert.equal(
        verifyInclusion({ ...proof, sibling_hashes: ["deadbeef"] }, leafHex, rootHex),
        false
      ); // malformed (not sha256:64hex)
    }
  });
}
```

Run → fails.

**Minimal code** — `tools/simurgh-attestation/stage5k/core/merkle.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — frozen Merkle-set profile simurgh.vuc.merkle_set.v1. Hashes are raw 32-byte Buffers;
// node_hash concatenates the two child digests (NOT hex). Odd final node promoted UNCHANGED (RFC-6962).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { DOMAINS } from "../constants.mjs";

const NUL = Buffer.from([0]);
const sha = (...bufs) => {
  const h = createHash("sha256");
  for (const b of bufs) h.update(b);
  return h.digest();
};
const RE = /^sha256:([0-9a-f]{64})$/; // frozen encoding — lowercase, prefixed
const dec = (s) => {
  const m = typeof s === "string" && s.match(RE);
  return m ? Buffer.from(m[1], "hex") : null;
}; // 32 bytes or null
const enc = (buf) => "sha256:" + buf.toString("hex");

export function leafHash({ leaf_id, leaf_type, subject_digest }) {
  const payload = canonicalJson({ leaf_id, leaf_type, subject_digest });
  return sha(Buffer.from(DOMAINS.leaf, "utf8"), NUL, Buffer.from(payload, "utf8"));
}
export function nodeHash(left, right) {
  return sha(Buffer.from(DOMAINS.node, "utf8"), NUL, left, right);
}
export function merkleRoot(leafHashes) {
  if (!Array.isArray(leafHashes) || leafHashes.length === 0) throw new Error("empty merkle tree");
  let level = leafHashes;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]); // odd promoted
    }
    level = next;
  }
  return level[0];
}
// Sibling-path builder — co-developed with verifyInclusion (the 1..9 property test binds them).
export function buildInclusion(leafHashes, leaf_index) {
  const tree_size = leafHashes.length;
  const sibling_hashes = [];
  let idx = leaf_index,
    level = leafHashes;
  while (level.length > 1) {
    const promoted = idx === level.length - 1 && level.length % 2 === 1;
    if (!promoted) sibling_hashes.push(enc(idx % 2 === 0 ? level[idx + 1] : level[idx - 1]));
    const next = [];
    for (let i = 0; i < level.length; i += 2)
      next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]);
    idx = Math.floor(idx / 2);
    level = next;
  }
  return { leaf_index, tree_size, sibling_hashes };
}
export function verifyInclusion({ leaf_index, tree_size, sibling_hashes }, leafHashHex, rootHex) {
  if (!Number.isInteger(leaf_index) || !Number.isInteger(tree_size) || tree_size < 1) return false;
  if (leaf_index < 0 || leaf_index >= tree_size) return false;
  if (!Array.isArray(sibling_hashes)) return false;
  let acc = dec(leafHashHex);
  const root = dec(rootHex);
  if (!acc || !root) return false; // strict sha256:<64hex>, 32-byte
  let idx = leaf_index,
    size = tree_size,
    si = 0; // sibling cursor — advances ONLY on non-promoted levels
  while (size > 1) {
    const promoted = idx === size - 1 && size % 2 === 1; // last node on an odd level → no sibling this level
    if (!promoted) {
      const sib = dec(sibling_hashes[si++]);
      if (!sib) return false; // too few, or malformed/non-canonical
      acc = idx % 2 === 0 ? nodeHash(acc, sib) : nodeHash(sib, acc);
    }
    idx = Math.floor(idx / 2);
    size = Math.ceil(size / 2);
  }
  return si === sibling_hashes.length && acc.equals(root); // reject leftover siblings
}
```

> The `promoted` test (`idx === size - 1 && size % 2 === 1`) is the whole subtlety: a leaf that is the last
> node on an odd-sized level is carried up with NO sibling. The `si` cursor + the final
> `si === sibling_hashes.length` guard make the builder and verifier agree on exactly which levels emit a
> sibling. Still co-develop the builder against this with the 1..9 property test — do not trust either alone.

> NOTE for the implementer: the promoted-odd path makes the inclusion walk subtle. Write the
> `sibling_hashes` BUILDER (in `buildSignedBundle.mjs`, Task 1.2) and `verifyInclusion` against each
> other with a property test over tree sizes 1..9 BEFORE relying on either. If the two disagree, fix the
> builder+verifier together (settle empirically, never by prose). Do not loosen `verifyInclusion` to pass.

Then seed `tools/simurgh-attestation/stage5k/core/projection.mjs` (`sectionSubjectDigest`,
`projectSection`, `universeSetDigest`) with a test asserting the exact domain-framed subject digest.
**Do NOT create `vucCore.mjs` yet** — it imports modules that do not exist until 1.1/1.2, so it cannot even
parse. `vucCore` is seeded in Task 1.1.

Commit `feat(5k): core primitives — result, digests, signatures, frozen Merkle-set, projection`.

### Task 1.1 — schema check 348 (+ G13 adequacy belt), the `_validBundle` shell, and the `vucCore` skeleton

**Test first** — `tests/unit/llmShield/stage5k/schema.test.js`: a hand-built minimal `vuc_bundle` +
`cfg` returns `null` from both `checkBundleSchema`/`checkConfigSchema`; each of these returns `{raw:348}`:
missing `universe_commitment`; non-array `leaves`; a reserved slot set to a non-union value;
an `omission_claims` entry missing a required field (see the enriched shape below); `prior_universe_ref`
present but missing `ordering_receipt_digest`; **an annotation key `universe_adequate: true`** (G13 belt); a
bundle that `JSON.parse(JSON.stringify(...))` cannot round-trip (returns 348, does not throw). Run → fails.

**Minimal code** — `core/schema.mjs`: two total functions wrapped in `try/catch → R(348, …)`. Validate
required top-level objects, array-ness, union typing of `review_window_binding` /
`campaign_composition_root` (`null | object`), `external_registry_anchor` (`null | object`),
`prior_universe_ref` (`null | {vuc_bundle_digest, universe_commitment_digest, ordering_receipt_digest}`), each `omission_claims[]`
entry's required fields — the **enriched §2 shape** `{claim_id, claimant_principal_digest,
omitted_subject_description_digest, claimant_basis_digest, universe_commitment_digest,
ordering_evidence_digest, producer_response_digest|null, sig(claimant)}` (well-formedness only here — the
sig-validated census is audit-tier 361, and `omission_claims` NEVER cause a public-tier verdict change) —
and screen the flat `annotations` object keys against `ADEQUACY_FORBIDDEN_KEYS`.
Build `_validBundle.mjs` returning `structuredClone(BASE)` where `BASE` is the minimal schema-valid shell
(objects filled by later tasks). Then **create `vucCore.mjs`** — the schema-only skeleton (imports ONLY
`result` + `schema`; `makeCtx` and the checks are added in Tasks 1.2/1.4+):

```js
import { R, OK } from "./result.mjs";
import { checkBundleSchema, checkConfigSchema } from "./schema.mjs";
// makeCtx + checks imported and wired starting Task 1.3 (349), in strict frozen order through 1.11
export function vucVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b348 = checkBundleSchema(bundle);
  if (b348) return b348;
  if (cfg === undefined) return R(363, "external_config_unavailable");
  const c348 = checkConfigSchema(cfg);
  if (c348) return c348;
  try {
    return OK(null); // makeCtx + ordered scan + audit/policy blocks land in 1.3–1.11
  } catch (e) {
    return R(363, "internal_or_env_unavailable", { error: String(e) });
  }
}
```

Test `vucVerify` returns raw 0 on `_validBundle()` and 348 on the tampers. Run → green. Commit
`feat(5k): 348 schema + G13 adequacy belt + vucCore skeleton`.

### Task 1.2 — crux-fixture ceremony builder (`laneKeys` + minimal `buildSignedBundle` + `_validBundle`), then `makeCtx`

> Build the checks in **strict frozen numeric order** (349 → 350 → 351 → 352 → …). This task builds the
> two pieces of shared substrate every later task needs: the raw-0 ceremony to tamper, and `makeCtx`.
> Neither wires a step into `vucCore` (the 352 check is wired in Task 1.4).

**Part A — the ceremony builder (test first).** `tests/unit/llmShield/stage5k/laneA.test.js` (crux
assertion): `buildSignedBundle()` returns `{bundle, cfg}` where, over one `const SECTIONS = [...3–4
sections...]`, the three set digests are equal —
`universeSetDigest(bundle.universe_commitment.leaves) === universeSetDigest(ctx.U_vpc) ===
universeSetDigest(ctx.U_vrc)` — and `vucVerify(bundle, cfg, makeAdapterFacts(bundle,cfg), {tier:"audit"})`
is not yet meaningful (checks land later) but the schema passes (raw 0 from the skeleton). Run → fails.

**Part A code** — `node/laneKeys.mjs` (deterministic Ed25519 committed keys; **letters-only role
filenames**, see Task 2.1 for the allowlist regex) and `node/buildSignedBundle.mjs`: from the single
`SECTIONS` source, mint a synthetic 5I VPC bundle (call the 5I builder as code) and a synthetic 5J VRC
bundle (call the 5J builder as code), then build the VUC layer — Merkle commitment (`merkleRoot` over
leaves sorted by the `leaf_id` byte key), inclusion proofs (the `sibling_hashes` builder, co-developed with
`verifyInclusion` per the 1..9 property test), sequencer challenges, reviewer + producer starts + execution
bindings, sign everything with the committed keys. `tests/unit/llmShield/stage5k/_validBundle.mjs` returns
`structuredClone(buildSignedBundle())` (+ a `resign(obj, role)` helper for the tamper arms). Run → green.

**Part B — `makeCtx` (test first).** Unit-test `makeCtx` DIRECTLY against `_validBundle()`'s cfg: with
`facts.vpc_verdict:0, vrc_verdict:0`, `ctx.downstreamMismatch === null` and `ctx.U_vpc`/`ctx.U_vrc` are
`{leaf_id, subject_digest}` arrays derived through `projectSection` (NOT copied from the bundle); tamper
`vpc_ref.partition_digest` → `ctx.downstreamMismatch` is `{raw:352}`; `facts.vrc_verdict=347` → `{raw:352}`.
Run → fails.

**Part B code** — `context.mjs` `makeCtx(bundle, cfg, facts)`: read `cfg.vpc_bundle`/`cfg.vrc_bundle`,
derive the covered 5I partition sections and the 5J `required_producer_section` IDs, resolve each through
the verified 5I partition, `projectSection` both into `ctx.U_vpc`/`ctx.U_vrc`; stash `ctx.downstreamMismatch`
(`R(352,…)` or `null`) when `vpc_ref`/`vrc_ref` ≠ the re-verified bundles or either verdict ≠ 0. Never
throws. **Do not touch `vucCore.mjs`.** Run → green. Commit `feat(5k): crux-fixture ceremony builder +
makeCtx (U_commit=U_vpc=U_vrc by construction)`.

### Task 1.3 — 349 commitment (+ producer authorship)

**Test first** — `commitment.test.js`: valid commitment → no 349; dup `leaf_id` → 349; dup `leaf_digest`
→ 349; a leaf whose `leaf_digest` ≠ `leafHash` recompute → 349; tampered `universe_root` → 349; tampered
`universe_commitment_digest` → 349; a **non-NFC** `leaf_id` → 349; `facts.producerCommitmentSigValid=false`
→ 349; a `producer_commitment_statement` signed over the wrong `universe_commitment_digest` → 349. Run → fails.

**Minimal code** — `commitment.mjs` `checkCommitment(ctx)`: reject non-NFC (`s.normalize("NFC")!==s`),
dup ids/digests; recompute every `leaf_digest` via `leafHash`; recompute `universe_root` via `merkleRoot`
over `leaves` sorted by the UTF-8 byte-sort key; recompute `universe_commitment_digest` via
`H(DOMAINS.commitment, {schema_version, composition_profile, producer_identity_digest,
canonicalization_profile, tree_profile, hash_algorithm, leaf_count, universe_root})`; require
`facts.producerCommitmentSigValid` AND the statement's `universe_commitment_digest` equals the recompute.
**This is the FIRST ctx-based check — introduce the ctx machinery in `vucCore` now:** import `makeCtx`
(from Task 1.2) and `checkCommitment`, and inside the `try` write `const ctx = makeCtx(bundle, cfg, facts);
const steps = [() => checkCommitment(ctx)]; for (const s of steps) { const r = s(); if (r) return r; }
return OK(ctx);`. Later tasks append to `steps` in numeric order. Run → green. Commit `feat(5k): 349
universe commitment + producer authorship (ctx scan introduced)`.

### Task 1.4 — 350 anchor subject · 351 ordering `verified_immediate` · 352 downstream binding

**Test first** — `anchor.test.js` + `downstream.test.js` via `vucVerify`: anchor `subject_digest ===
universe_commitment_digest` → no 350; mismatch or malformed anchor → 350. `facts.orderingState=
"verified_immediate"` → no 351; `"pending_unverified"` (raw-pending OTS) → 351; `"invalid"` → 351. Matching
refs + both verdicts 0 → no 352; tampered `vpc_ref.partition_digest` → 352; `facts.vrc_verdict=347` → 352.
Run → fails.

**Minimal code** — `anchor.mjs` `checkAnchorSubject` (350) + `checkOrdering` (351, reads
`facts.orderingState`); `downstream.mjs` `checkDownstream(ctx)` returns `ctx.downstreamMismatch` (built in
Task 1.2). Wire the three steps into `vucCore` in order **after 349**: `() => checkAnchorSubject(ctx)`,
`() => checkOrdering(ctx)`, `() => checkDownstream(ctx)` — the `steps` array is now `[349, 350, 351, 352]`.
Run → green. Commit `feat(5k): 350 anchor subject + 351 ordering + 352 downstream binding`.

### Task 1.5 — 353 start census · 354 sequencer-chain precedence (headline)

**Test first** — `starts.test.js`: full valid start set (≥2 reviewer starts + producer rating-start,
each bound to a sequencer challenge for THIS commitment, valid sigs) → no 353/354; drop a required
reviewer start → 353; wrong reviewer principal → 353; **missing producer rating-start** → 353; invalid
start sig (`facts.startSigValid[d]=false`) → 353; a start bound to the **wrong sequencer challenge**
(challenge for a different `universe_commitment_digest`) → **354**; a broken `previous_sequencer_record_digest`
prev-link → 354; a start whose challenge chains to ordering evidence that is not `verified_immediate` → 354.
Run → fails.

**Minimal code** — `starts.mjs` `checkStartCensus` (353) then `checkPrecedence` (354): the census
compares the reviewer-principal set against the derived C(r) reviewer set and requires the single producer
rating-start; precedence walks each start → its `challenge` → `ordering_receipt_digest`, asserting
`sequencerSigValid`, contiguous `previous_sequencer_record_digest`, `universe_commitment_digest` ===
this commitment, and the ordering state verified_immediate. Wire 353 then 354. Run → green. Commit
`feat(5k): 353 start census + 354 No Post-Hoc Commitment Record`.

### Task 1.6 — 355 execution bindings (full history)

**Test first** — `bindings.test.js`: reviewer + producer execution bindings that chain to their starts
and carry the EXACT `coverage_receipt_digests` / `rating_entry_digests` sets (full history) → no 355; drop
one historical reviewer rating entry from a binding → 355; **omit a historical producer rating entry** →
355; a coverage-receipt set ≠ expected → 355; invalid binding sig → 355. Run → fails.

**Minimal code** — `bindings.mjs` `checkExecutionBindings`: for each reviewer binding assert chain to a
verified start + exact set equality (via `canonicalJson` of sorted digest arrays) against the coverage
receipts and rating entries the 5J bundle records for that principal; same for the producer binding over
FULL producer history + `vrc_public_attestation_digest`; require `facts.bindingSigValid`. Wire at 355.
Run → green. Commit `feat(5k): 355 execution bindings over full history`.

### Task 1.7 — 356 inclusion proofs

**Test first** — `inclusion.test.js`: a full valid `inclusion_proofs[]` (one per committed leaf, correct
`tree_size`, index-fixed siblings) → no 356; a mis-indexed proof → 356; wrong `tree_size` → 356; a
duplicated proof subject → 356; a missing proof (leaf with no proof) → 356; an extra proof (subject not in
the leaf set) → 356. Run → fails.

**Minimal code** — `inclusion.mjs` `checkInclusion`: census the proof subjects against the leaf set
(no missing/extra/dup), then `verifyInclusion` each against `universe_root`. Wire at 356. Run → green.
Commit `feat(5k): 356 inclusion proofs (index-fixed, subject census)`.

### Task 1.8 — 357 shrinking · 358 phantom · 359 alias (the set laws)

**Test first** — `setlaws.test.js`, the headline arms, each per component:

- **357 (No Shrinking Universe):** a committed leaf absent from `U_vpc` → 357; a separate arm absent from
  `U_vrc` → 357 (regenerate + re-sign the downstream fixture so the ONLY failing law is shrinking —
  the earlier checks must stay green, proving 357 is reached on its own).
- **358 (No Phantom Section):** an evaluated leaf in `U_vpc` absent from `U_commit` → 358; a separate
  `U_vrc` phantom arm → 358.
- **359 (alias):** duplicate canonical id across leaves → 359; duplicate `subject_digest` with distinct
  ids → 359; a section mapping to >1 leaf → 359.
  Run → fails.

**Minimal code** — `setlaws.mjs`: `checkShrinking` (∀ committed leaf: ∈ U_vpc exactly once AND ∈ U_vrc
exactly once); `checkPhantom` (∀ evaluated leaf in each component ∈ U_commit); `checkAlias` (dup id / dup
subject / multi-map). **Independent per component — never union U_vpc ∪ U_vrc.** Wire 357→358→359. Run →
green. Commit `feat(5k): 357/358/359 set laws — shrinking, phantom, alias (per component)`.

### Task 1.9 — 360 anchor finality overclaim

**Test first** — `anchor.test.js` (extend): `claimed_finality_state="pending"` with
`facts.finalityState="pending"` → no 360; `claimed="confirmed"` with computed `"pending"` → 360;
`claimed="confirmed"` with computed `"invalid"` → 360; **present-but-invalid finality evidence under a
`pending` claim** (`facts.finalityState="invalid"`) → 360; `claimed="pending"` with computed
`"confirmed"` → no 360 (may accept). Run → fails.

**Minimal code** — `anchor.mjs` `checkFinalityOverclaim` (reads `bundle.claimed_finality_state` +
`facts.finalityState`). Wire at 360 (last public check before policy). Run → green. Commit
`feat(5k): 360 anchor finality overclaim`.

### Task 1.10 — 361 projections + censuses + in-toto bridge (audit-only)

**Test first** — `projections.test.js` (audit tier): valid bundle at `tier:"audit"` → raw 0 and
`ctx.projections.projection_root` recomputes; tamper the stored `projections.projection_root` → 361;
tamper `regression_census` given a `prior_universe_ref` that dropped a leaf → 361 if stored ≠
recompute; a `commit_first_margin` distribution ≠ recompute → 361; an `omission_claims` entry with
`facts.omissionSigValid[id]=false` that is nonetheless counted in the stored census → 361 (invalid claim
must be EXCLUDED from the recompute); an `external_registry_anchor` in-toto statement whose subject ≠
`universe_commitment_digest` → 361; invalid in-toto signature → 361. **Public tier must NOT run any of
this** (a bundle failing only 361 returns raw 0 at `tier:"public"`). Run → fails.

**Minimal code** — `projections.mjs` `checkProjections(ctx)`: recompute `bijection_census`,
`per_component_universe_state`, `inclusion_coverage`, `review_start_census`, `regression_census` (leaves in
`prior_universe_ref`'s universe absent from the current one; empty when the input is null),
`commit_first_margin` (per-start sequencer distance min/median over the signed chain), `omission_claim_census`
(only claims with `facts.omissionSigValid[id]===true`), assemble `projection_root =
artifactDigest({...})`; compare to stored via `canonicalJson`. Then the bridge: if
`external_registry_anchor !== null`, require `facts.registryAnchorSigValid` AND `statement.subject ===
universe_commitment_digest` AND the recompute matches. Wire `if (tier==="audit") { const p =
checkProjections(ctx); if (p) return p; }` AFTER 360, BEFORE policy. Run → green. Commit
`feat(5k): 361 audit projections + regression/commit-first/omission censuses + in-toto bridge`.

### Task 1.11 — 362 policy / reserved slots · 363 wrapper finalize

**Test first** — `vucCore.test.js`: a non-null `review_window_binding` reserved slot → 362; a
`composition_profile:"vpc_only"` under release → 362; `leaf_count < 2` under release → 362; a `facts`
object whose access throws (inject a getter that throws) → **363** (wrapper, not a crash); `cfg===undefined`
→ 363. And the golden vector: the full valid `_validBundle()` → raw 0 at BOTH tiers. Run → fails.

**Minimal code** — `policy.mjs` `checkReservedSlots` (362); ensure `vucVerify` wires policy after the
audit block and the `try/catch → R(363, …)` wraps everything after the two schema calls (already seeded in
1.0). Confirm the ordered scan is exactly `[349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360]`,
THEN the audit-only `361` block (`if (tier==="audit")`), THEN policy `362` (both tiers), with `348` before
the try and `363` as the catch. Run → green. Commit `feat(5k): 362 policy/reserved + 363 fail-closed
wrapper; core complete`.

---

## Task group 2 — adapter, attestations, Lane A pack, byte-stability

### Task 2.1 — `node/adapter.mjs` (B11)

> `node/laneKeys.mjs` was seeded in Task 1.2. `node/buildSignedBundle.mjs` calls a hand-rolled facts
> assembly there; this task extracts the real `makeAdapterFacts` and points the builder + tests at it.

**Test first** — `signing.test.js`: `makeAdapterFacts(validBundle, validCfg)` yields `vpc_verdict===0`,
`vrc_verdict===0`, `orderingState==="verified_immediate"`, `producerCommitmentSigValid===true`, and the
sig maps all-true; flipping any signature in the bundle flips exactly its fact. Run → fails.

**Minimal code** — `adapter.mjs` mirrors 5J: import `vpcVerify`+`vpcAdapterFacts` (5I) AND
`vrcVerify`+`vrcAdapterFacts` (5J); re-verify both embedded bundles to earn the verdicts; resolve every
VUC signature by ROLE via `cfg.key_registry`; derive `orderingState`/`finalityState` from bundled receipts
(fixture ordering → `verified_immediate`; raw OTS → `pending_unverified`). The committed keys already live
in `laneKeys.mjs` (Task 1.2). **Key filenames MUST be letters-only role names** —
`INSECURE_FIXTURE_ONLY_reviewer-a.pem`, `…reviewer-b.pem`, `…sequencer.pem`, `…producer-commitment.pem`,
`…producer-rating.pem`, `…verifier.pem` — because the priv-key allowlist regex is
`INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem` (NO digits; `reviewer-1` would fail the security audit, the 5I/5J
gotcha). Run → green. Commit `feat(5k): B11 adapter + committed lane keys`.

### Task 2.2 — attestations + `buildSignedBundle` + `build-vuc-evidence` + byte-stability

> **Widening the highest-risk builder.** `buildSignedBundle` (the 3-leaf spike from Task 1.2) threads ONE
> section identity through THREE synthetic bundles: 5I partition → 5J `required_producer_section` IDs → VUC
> leaves, all from the single `const SECTIONS`. When you widen `SECTIONS` to the release universe here,
> re-run the `U_commit = U_vpc = U_vrc` equality assertion (sorted `subject_digest` lists) after each size
> bump and confirm raw 0 at both tiers — a divergence surfaces as 352/357/358 that looks like a core bug
> but is a builder desync. Never introduce a second section literal.

**Test first** — `attestation.test.js`: `buildPublicAttestation`/`buildAuditAttestation` produce the
spec-§3 fields; `verifyAttestation` accepts them and `audit ⟹ public` under the same
`verification_context_digest`; tamper the public digest the audit binds → reject. `laneA.test.js`:
`buildLaneAEvidence(tmp)` then `verify-vuc-attestation.mjs --tier public|audit` on it → raw 0;
`verify-byte-stability.mjs` → identical. Run → fails.

**Minimal code** — `attestation.mjs` (copy 5J shapes, VUC fields). `buildSignedBundle.mjs` already exists
(Task 1.2, over the shared `SECTIONS` source) — widen its `SECTIONS` to the release universe here and have
it emit the attestations. `build-vuc-evidence.mjs` `buildLaneAEvidence(dir)` writes the four files;
`verify-vuc-attestation.mjs` CLI (handle absolute dir arg); `verify-byte-stability.mjs` (copy 5J). Build the
committed pack into `docs/research/llm-shield/evidence/stage-5k/` under Node 26; add the evidence dir +
test-keys dir to `.prettierignore`. Run → green; `cmp` twice. Commit
`feat(5k): split attestations, Lane A pack, byte-stability`.

---

## Task group 3 — Lane B (multi-party protocol separation)

**Test first** — `laneb.test.js`: distinct-key child processes (producer-commitment, producer-rating,
≥2 reviewers, a **content-blind sequencer** that sees digests only, verifier) run the
`commit → order → start → execution → output` chain; the assembled pack verifies raw 0; the sequencer
never receives leaf content (assert it only ever got digests); sequencer + reviewer keys are distinct.
Run → fails. **Minimal code** — `laneb` harness spawning `node` child processes (mirror 5J `laneb.test.js`

- any helper). Reserve CI ports in the 33xxx band if any socket is used (EADDRINUSE lesson). Run → green.
  Commit `feat(5k): Lane B multi-party commit-first ceremony (content-blind sequencer)`.

---

## Task group 4 — Lane C gate, anchor rails, droplet runner

### Task 4.1 — `lanec-gate.mjs` + `independence.mjs`

**Test first** — `lanec.test.js`: `evaluateCampaign` returns `campaign_state="completed"` ONLY when the
pack verifies raw 0 AND `ordering_state="verified_immediate"`; `sigstore_chip_state="earned"` ONLY with a
verified real anchor; `strongestRung` refuses to exceed `distinct_key_only` without injected
`anchorVerified`. Run → fails. **Minimal code** — copy 5J `lanec-gate.mjs` + `independence.mjs`, retarget
to VUC roots (`universe_commitment_digest` is the `ANCHOR_ME` subject). Run → green. Commit
`feat(5k): Lane C gate + separation-rung independence`.

### Task 4.2 — `attach-anchor.mjs` + `verify-witness.mjs` + droplet runner

Copy 5J `attach-anchor.mjs` / `verify-witness.mjs` (retarget subject) and write
`lanec/run-droplet-ceremony.mjs`: an independent-party commit-first ceremony over the real 37-section Opus
structure with FRESH keys, emitting `ANCHOR_ME.txt = universe_commitment_digest`. Unit-test the runner
produces a pack that verifies raw 0 under the repo verifier with distinct verifier fingerprints. Commit
`feat(5k): Lane C anchor rails + independent-party droplet ceremony runner`.

---

## Task group 5 — Python parity

**Test first** — `parity.test.js`: shell `python3 tools/simurgh-attestation/stage5k/python/vuc_parity.py`
against the committed Lane-A pack; assert it prints `raw:0` and byte-identical `universe_root`,
`universe_commitment_digest`, `projection_root`, `U_vpc`/`U_vrc` set digests to the Node verifier. Run →
fails. **Minimal code** — `vuc_parity.py` (stdlib-only): `canonical` (sort_keys, `(",",":")`,
`ensure_ascii=False`), `leaf_hash`/`node_hash` using `hashlib.sha256(...).digest()` with **raw-byte**
concatenation, `merkle_root` (odd promoted), the section-subject digest, projection, set digests,
commitment digest, and the census recomputes; predicate view (no sig-verify). Run → green. Commit
`feat(5k): Python parity verifier (byte-identical roots)`.

---

## Task group 6 — Browser parity

**Test first** — `browser.test.js`: load `browser/vuc-portable.mjs` under a WebCrypto shim, verify the
committed pack it supports, assert it declares (not simulates) the Rekor/Bitcoin anchor path and matches
`verdict_raw`/roots. Run → fails. **Minimal code** — `browser/canonical-json.mjs` (copy 5J);
`browser/vuc-portable.mjs` packaging the shared JS core for WebCrypto. Run → green. Commit
`feat(5k): browser portable verifier (WebCrypto, anchor path declared)`.

---

## Task group 7 — Lean proofs (11 theorems, zero sorry)

**Test** — the reproduce script runs `lean UniverseCommitment.lean`; locally: `cd proofs/stage5k && lean
UniverseCommitment.lean` exits 0, and `grep -REn '\bsorry\b|\badmit\b' proofs/stage5k` is empty; `#print
axioms` on all 11 names shows no unexpected axiom.

**Minimal code** — `proofs/stage5k/lean-toolchain` = `leanprover/lean4:v4.15.0`;
`proofs/stage5k/UniverseCommitment.lean` (`namespace Simurgh.Stage5K`, core Lean 4, no mathlib), the 11
theorems from spec §4:

1. `commitmentBinding` — take `injectiveOnCommitments` as a **hypothesis parameter** (SHA-256 collision
   resistance), NOT a global `axiom`; equal commitment digests ⟹ equal preimage records. (The 5K version
   of the VRC lesson: never claim hash injectivity as an axiom.)
2. `projectionDeterminism` — `project` is a Lean function; both `U_vpc`/`U_vrc` resolve through it.
3. `independentEquality` — `OK ⟹ U_commit = U_vpc ∧ U_commit = U_vrc`; model the union
   `U_vpc ∪ U_vrc = U_commit` with `U_vpc ⊊ U_commit` as a REJECTED counterexample lemma.
4. `precedenceSoundness` — reviewer AND producer; no wall-clock predicate.
5. `executionCompleteness` — exact `bound = expected`, every output bound `∃!` (full fossil closure).
6. `firstFailurePerTier` — reuse the 5J `firstFailure`/`firstFailureUnique`/`firstFailureSound` proof
   idiom verbatim (`Option.some.injEq` for uniqueness; the induction with `simp only [firstFailure,
Option.some.injEq] at h; subst h` for the false branch). Model per tier; 363 as the external wrapper.
7. `anchorTwoAxisSoundness` — the four acceptance rules; use `decide`/`of_decide_eq_true` for the finite
   state comparisons (NOT `==`/`Nat.eq_of_beq_eq_true`).
8. `auditMonotone` — `audit_accepts ⟹ public_valid ∧ public_accepts`.
9. `noUniverseAdequacyBit` — non-interference `verify(input,a)=verify(input,b)`; the output type has no
   `adequate` constructor.
10. `noSilentScopeChange` (Scope Trilemma) — model `scopeAdjusted(u₀,u₁)` and prove the total disjunction
    where **each branch is tied to a checker predicate** (Review-v2 rule 15, NOT bare enum exhaustiveness):
    `(retainsEqualityObligation ∧ shrinkChecked357) ∨ (requiresNewCommitmentAndOrdering ∧ phantomChecked358)
∨ postSignalReject354`.
11. `setEqualityDecisionBlindToSectionText` (narrowed) — the **set-equality decision** is a function of the
    projected leaf triples + protocol state, not the raw section text: prove `projectedTriples a =
projectedTriples b ∧ protocolState a = protocolState b ⟹ setEqualityVerdict a = setEqualityVerdict b`
    (congruence on the projection input). NOT a whole-verdict blindness claim.

Commit `feat(5k): Lean core — 11 theorems incl. Scope Trilemma + blind verification (zero sorry)`.

---

## Task group 8 — K7 net, reproduce, allowlists, prior-stage regression

### Task 8.1 — K7 all-functions e2e net

**Test** — `tests/e2e/llmShield/stage5k/k7AllFunctions.test.js`: (a) every exported function in
`stage5k/core`, `stage5k/node`, `stage5k/browser` is imported and exercised at least once; (b) the tamper
matrix drives **every raw 348–363** to its exact first-failure (the spec §3 list — one repaired-to-target
fixture per code, including the separate VPC and VRC arms for 357/358, the in-toto wrong-subject vs
invalid-sig arms for 361, and the throwing-`facts` arm for 363); (c) cross-stage invariants: the embedded
5I + 5J verifiers still return raw 0 on the packs VUC embeds; `audit ⟹ public`. Run → drive to green.
Commit `test(5k): K7 all-functions e2e net + full tamper matrix`.

### Task 8.2 — reproduce script + prior-stage regression + allowlists

- `scripts/reproduce-llm-shield-stage5k.sh` (copy the 5J script; verify committed pack public+audit raw 0,
  byte-stability, Lane B props, Lane C gate, Lean 11 theorems, Python parity, committed==fresh rebuild;
  Node 26). Make executable; add to `scripts/check.sh` if it enumerates per-stage reproduce scripts.
- Add the test-keys allowlist line to `security-audit-llm-shield-stage3m.sh` AND `-stage3o.sh`.
- Run the PRIOR reproduce scripts to prove additive changes disturbed nothing sealed:
  `bash scripts/reproduce-llm-shield-stage5i.sh` and `-stage5j.sh` → ALL PASS (5J's script asserts "11
  theorems" and its own pack; VUC must not perturb it). **Note:** 5J's Lane C public witness is now
  **Bitcoin-confirmed** (blocks 957642+957644, committed on main `96265f2a`, release notes updated) — the
  `real-structure/` pack still verifies raw 0; VUC embeds/reuses it unchanged, do not re-stamp it.
- `bash scripts/check.sh` locally (the full gate — prettier, git-clean, unit, e2e) → green.
  Commit `chore(5k): reproduce script, priv-key allowlists, prior-stage regression green`.

---

## Task group 9 — closeout

- **Docs-accuracy pass:** the **frozen design spec is the source of truth**. Compare implementation, tests,
  and docs against it (raw-code meanings, field names, the Merkle formula, the 11 theorem names). If code
  violates the spec, **fix the code**; if a doc misdescribes conforming code, fix the doc; any intentional
  design change requires a reviewed spec amendment. Never make the system "correct" by editing prose.
- `docs/research/llm-shield/STAGE_5K_CLOSEOUT.md` — the four-axis scorecard **re-scored honestly**:
  Novelty **9.0** (the beast package deepens the composition but does NOT establish first-of-kind — that
  needs the external prior-art sweep + a novelty source-map + independent reproduction); Frontier **9.0**
  until Lane C-adv + a real commit-first anchored ceremony execute (do NOT bank 9.4 at closeout unless
  they ran); Good-for-Anthropic 9.4; Constitution 9.4. State the pending Frontier delta as a tracked debt.
- **Prior-stage anchor check (generalizable):** before tagging, confirm no earlier release still carries a
  _pending_ external anchor that has since landed. (5J's OpenTimestamps witness landed 2026-07-12 → its
  release + `campaign-outcome.json` were flipped to `bitcoin_confirmed`; verify via `ots info` + a
  public-explorer merkle-root cross-check, since `verify-witness.mjs`'s `ots verify` needs a Bitcoin node.)
- README banner → VUC latest (v2.46.0); fold 5J into `<details>Prior`; badge to `v2.46.0-stage-5k-vuc`.
- **Re-verify the MITRE V18 / "doesn't yet cover the autonomous actions" quotes verbatim against the live
  `anthropic.com/research/attack-navigator` page** before the closeout asserts them (source-precision
  guard); pin the KPMG/Wirecard primary before any fixture names it.
- Memory: MEMORY.md pointer + `project_stage-5k-vuc.md` with the paid-for gotchas (Merkle raw-byte concat;
  odd-node promotion in both builder+verifier; 7-consumer exit-map ripple; non-hermetic 4H builder;
  omission-claim verdict-neutrality; 363→run-level-1; constants at STAGE ROOT; priv-key allowlist 3m+3o).
- Zurvan: search for duplicates first, then ingest what's missing + a decision ADR.

---

## Closeout gate (all must be green before tag)

```text
[ ] node --test tests/unit/llmShield/stage5k/*.test.js         → all green
[ ] bash scripts/reproduce-llm-shield-stage5k.sh               → ALL PASS (Node 26)
[ ] bash scripts/reproduce-llm-shield-stage5i.sh / -5j.sh      → ALL PASS (sealed history intact)
[ ] node --test tests/e2e/llmShield/stage5k/k7AllFunctions.test.js → every 348–363 reachable
[ ] cd proofs/stage5k && lean UniverseCommitment.lean          → 0; grep sorry/admit empty
[ ] python3 .../vuc_parity.py                                  → byte-identical roots
[ ] npm run format:check                                       → clean
[ ] bash scripts/check.sh                                      → green
[ ] both exit-map goldens carry 348–363 → 1; only the 2 exit-map diffs kept from the 4H builder
```

Tag `v2.46.0-stage-5k-vuc` only after CI green + rebase-merge + `git reset --hard origin/main` +
reproduce ON MAIN.
