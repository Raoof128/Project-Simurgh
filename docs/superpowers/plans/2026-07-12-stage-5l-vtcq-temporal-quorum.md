# Stage 5L — VTC-Q: Verifiable Temporal Commitment with Notary Quorum (implementation plan)

> Motto: **BoundarySafe first, then ReviewerSafe.** (Internal doctrine label: _AnthropicSafe first_.)
> Public wording stays provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-12-stage-5l-vtcq-temporal-quorum-design.md`.
> For a skilled engineer with **zero context** on this repo. Every task is TDD: write the failing test,
> run it, watch it fail for the right reason, write the minimal code, watch it pass, format, commit. Do
> not batch tasks. Do not write code before its test.

---

## Global Constraints (verbatim — do not paraphrase)

- **Version** `v2.47.0-stage-5l-vtcq`; branch `stage-5l-vtcq`; **raw codes 364–383** (20, wrapper 383
  last). Confirm no newer tag first: `git tag --sort=-creatordate | head -3` (5K was
  `v2.46.0-stage-5k-vuc`).
- **Codes live in the GLOBAL registry** `tools/simurgh-attestation/stage4h/exitCodes.mjs` — additive
  only. Every 364–383 maps to `RUN_LEVEL_BY_RAW = 1` (including the wrapper 383 — every per-stage wrapper
  is level **1**; only 4H's raw 29 and truly-unknown 999 are level 3; a reviewer will claim 383→3, it is
  FALSE, reject with the `RUN_LEVEL_BY_RAW` receipt). The wrapper identifier MUST be suffixed
  `INTERNAL_OR_ENV_UNAVAILABLE_VTCQ: 383` (bare `INTERNAL_FAIL_CLOSED` collides — see
  5B/4X/4Y/4Z/5A/5J/5K).
- **Never probe unknown-code behaviour with a bare literal above the range** — use the repo constant
  `UNKNOWN_RAW_PROBE = 999` (a literal just above the range becomes a real code next stage; that broke 4R
  and 4S CI).
- **House partition** (mirror VUC/VRC/VPC): public first-failure `364→380` + policy `382`; audit adds
  `381`; `VTCQ_POLICY_CODES = [382]`; wrapper `383` applied OUTSIDE the ordered scan.
  `public_checked_raw_codes = [364..380, 382]`; `audit_checked_raw_codes = [364..382]`.
- **Pure core** `vtcqCore` over `(bundle, cfg, facts)` owns the frozen order; crypto (Ed25519 / RFC-3161
  CMS/X.509 / the two anchor state machines) is done by the node adapter and injected via `facts` (the
  5I/5K B11 pattern). Schema checks run BEFORE `makeCtx`, so a malformed bundle/cfg is 364, never a 383
  throw.
- **Digest sources (P1 — Node vs mirrors):** the **Node builder and core** use the SHARED
  `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`, `sha256Hex`, `sha256Bytes`) — never a
  stage-local copy. The **Python and browser mirrors** implement the frozen byte contract INDEPENDENTLY
  (Python `hashlib`, browser WebCrypto + local canonical-JSON, as 5K's browser code already does) and must
  pass shared-vector parity tests against the Node core. Do not claim they import the Node module.
- **ONE commitment digest construction (P0-1 — the anchors and the session id are the SAME digest):**
  ```text
  commitment_preimage_bytes = UTF8("simurgh.vtcq.commitment_session.v1") || 0x00 || UTF8(canonicalJson(commitment_payload))
  commitment_digest_bytes   = SHA256(commitment_preimage_bytes)                       // raw 32 bytes
  commitment_session_id     = "sha256:" + hex(commitment_digest_bytes)               // the named id IS hex of those bytes
  ```
  Both anchors bind `commitment_digest_bytes`: the TSA receives it via digest-input mode
  (`tsa.messageImprint.hashedMessage == commitment_digest_bytes`); OTS stamps the exact
  `commitment_preimage_bytes` (or an API seeded with the already-computed digest — **verify the OTS tool is
  configured NOT to hash again**, else the capture command itself double-hashes). `ots_leaf_digest ==
commitment_digest_bytes`. Never stamp a file whose contents are the raw digest unless OTS is set to not
  re-hash. `commitment_payload = {schema_version, campaign_id, vuc_root, review_window_policy_digest,
anchor_policy_digest, quorum_policy_digest, trust_domain_registry_digest, declared_release_surface_digest,
gate_identity_policy_digest}` — **note `gate_identity_policy_digest` is committed (P0-5).**
- **`sha256Bytes` is NOT yet in `canonicalise.mjs` (P0-1)** — Task 1.0 adds `export function
sha256Bytes(input)` (returns the raw 32-byte Buffer) to the shared module with a regression test, before
  any core code uses it. `sha256Hex(x) === hex(sha256Bytes(x))` is asserted.
- **Frozen hash constructions** (spec §2 — parity depends on byte-for-byte identical constructions in the
  JS builder, JS core recompute, Python parity, and browser parity):
  - `H_DS(tag, payload) = SHA256(UTF8(tag) || 0x00 || UTF8(canonicalJson(payload)))`.
  - **`verified_anchor_set_digest` (P0-4) domain `simurgh.vtcq.verified_anchor_set.v1` over the
    profile-appropriate SORTED list of valid anchor records** (Core = [TSA]; Quorum = [TSA, OTS]). This is
    what the capability binds, so Core (TSA-only), TSA+pending-OTS, and TSA+confirmed-OTS all derive
    cleanly without an undefined `ots_proof_digest`.
  - `start_capability_root_digest` domain `simurgh.vtcq.start_capability_root.v1` over
    `{commitment_session_id, verified_anchor_set_digest, gate_public_key_fingerprint, issuance_nonce}`.
  - `release_capability_digest` domain `simurgh.vtcq.release_capability.v1` over
    `{start_capability_root_digest, endpoint_id, release_ordinal, audience_digest, release_payload_digest}`.
  - `release_slot_id` domain `simurgh.vtcq.release_slot.v1` over `{endpoint_id, release_ordinal}` — the
    census bijection key.
  - `ceremony_id` domain `simurgh.vtcq.ceremony_id.v1` over `{commitment_session_id, tsa_token_digest,
ots_proof_digest, receipt_digest}` — **POST-ORDER ONLY, display/index label**.
- **Gate identity is precommitted (P0-5):** `gate_identity_policy_digest = H_DS("simurgh.vtcq.gate_identity.v1",
{gate_public_key_fingerprint, tsa_verifier_public_key_fingerprint})` is in `commitment_payload`, so the
  expected gate fingerprint is fixed pre-anchor and **375 can detect gate-key substitution** against it.
  `issuance_nonce` lives INSIDE the signed `review_access_authorisation_receipt` and is covered by the gate
  signature (never selectable after the fact).
- **CYCLE-FREE IDENTIFIER RULE (load-bearing — repeat of the 5K bug):** `ceremony_id` NEVER appears inside
  `commitment_session_id`, either anchor input, the review-access receipt, or capability derivation. It is
  a post-order label only. A test asserts `ceremony_id` is absent from all four upstream inputs.
- **No private key material in the bundle or any digest.** The gate is identified by
  `gate_public_key_fingerprint` (never `gate_key`). Priv keys live only in the committed
  `INSECURE_FIXTURE_ONLY_*.pem` fixtures.
- **Two-axis-free, three-computed-state model** (spec §1): `vtc_core_valid` (TSA valid + release causality,
  OTS optional/pending) → rung `challenge_bound`, raw 0; `vtc_quorum_pending` (Quorum requested, Bitcoin
  not confirmed) → **raw 372**, typed pending, NOT a success; `vtc_quorum_confirmed` (TSA + confirmed
  Bitcoin under committed policy + distinct-domain threshold) → **raw 0**, rung `externally_anchored`.
  A pending OTS returning raw 0 is a REJECTED counterexample.
- **`380` (finality claimed ≠ computed) and `372` (profile floor) are disjoint:** declared=pending and
  computed=pending → 380 silent; under a Quorum profile with `required_confirmed_publication=true` and
  computed=pending → 372 fires. Declared=confirmed while computed=pending → 380 fires (before 371/372).
- **RFC-3161 verification is OpenSSL-backed in the node/python adapter — NOT a handwritten CMS parser.**
  The adapter runs `openssl ts -verify` (or a vetted dep) AND separately enforces `certificate_valid_at_
genTime`, `status_evidence_required_by_policy`, `status_evidence_digest_bound`, `policy_OID_allowed`,
  `timestamping_EKU_present`, `ESSCertIDv2_binding_valid`. Custom code extracts ONLY `messageImprint /
genTime / accuracy / policyOID` for the pure-core binding checks. The crypto result is a signed
  `tsa_crypto_attestation` binding `{token_raw_digest, cert_chain_digest, status_evidence_digest,
policy_digest, adapter_identity, adapter_version, computed_crypto_result}`.
- **Browser tier is labelled honestly.** It verifies structure + the `tsa_crypto_attestation` (pinning the
  8 fields in spec §3), NOT the RFC-3161 token independently. Its claim string is
  `"adapter-attestation and structural binding verified"`. A test asserts the browser module NEVER claims
  independent RFC-3161 verification.
- **`accuracy` fails closed:** if `genTime` accuracy is absent from the token AND unresolved from the
  precommitted policy → **369**, never a silent zero margin.
- **Embedded VUC is re-verified** by the adapter (which re-verifies its embedded 5J → 5I); `vuc_root` is
  the verified 5K `universe_commitment_digest`. 5I/5J/5K reproduce scripts MUST stay byte-identical.
- **Reserved slot `campaign_composition_root` is a structural union** `null | reserved_object`; a non-null
  branch under the current `schema_version` → 382 (do NOT strict-null in the schema, or it is caught at
  364 first).
- **Node 26** at `/opt/homebrew/opt/node@26/bin` for the byte-stable evidence + reproduce (4H digest
  builder is byte-stable ONLY under Node 26). Evidence dirs + test-keys are prettier-ignored.
- **Validate locally** with targeted `npm test` globs + `npm run format:check` + the two security-audit
  scripts (3m, 3o) — NOT the full `check.sh` (it buffers all output and regenerates the banking-pilot
  fixture; revert that unrelated file if it drifts). Run `scripts/reproduce-llm-shield-stage5l.sh` under
  Node 26 before any completion claim.

---

## Gauntlet corrections (LOAD-BEARING — these override any inline task text that predates them)

These are the frozen outcomes of the 8-round spec gauntlet. Where an inline task step conflicts, THESE win.

1. **Ceremony contract, not just the VUC root.** Both anchors bind `commitment_digest_bytes` derived over
   the FULL policy set (window, anchor, quorum, trust-domain-registry, declared-release-surface). A test
   proves that swapping any one policy digest after anchoring → 365.
2. **`review_access_authorisation_receipt`** (not `review_start_receipt`) — the mechanism proves access
   was AUTHORISED, never that a human read anything.
3. **Structural release causality, not a wall-clock compare.** There is NO `review_access_lower_bound`.
   Precedence = a release consumes a unique child capability derived from the verified anchor set (373 +
   376 + 377). A test proves a release whose child is not derivable from the anchors → 377.
4. **Profile floor = a bounded-time authority.** Core requires ≥1 TSA; OTS-only → 372. Quorum requires
   ≥2 structurally-distinct roots incl. a confirmed publication root.
5. **No "valid forever."** 368 is policy-relative: cert invalid at `genTime` OR committed-LTV status
   evidence absent/invalid. 369 fails closed on unresolved accuracy.
6. **`375` broadened** to "review-access receipt invalid": required binding missing, gate signature
   invalid, signing-key fingerprint mismatched, OR receipt context not bound to the committed ceremony.
   `gate-key substitution → 375` (K7 attack), NOT 365.
7. **Capability tree** (kills the one-use/array contradiction): a `start_capability_root` derives a UNIQUE
   `release_capability_digest` per `(endpoint_id, release_ordinal)`. 376 owns malformed / not-ceremony-
   bound / duplicate-child (**replay across a different `commitment_session_id` / `start_capability_root_
digest`** — P0-6; NOT across `ceremony_id`, which is absent from capability derivation). Census 378 is a
   bijection over `release_slot_id`.
8. **Raw-code ownership (disjoint):** 365 owns ALL committed-digest binding failures; 374 fires **iff NOT
   `window_coherent`**, where (P0-7c — this is the COHERENT condition; 374 is its negation):
   ```text
   window_coherent := window_open_not_before >= tsa_upper_bound
                   && window_close_after > window_open_not_before
                   && required_anchor_profile == committed_anchor_profile
   ```
   371 = "an anchor PAIR resolves to one declared domain" (fires before 372); 372 = pure profile/threshold
   arithmetic on the deduped set; 377 = a PRESENT release fails to bind its child; 378 = SET completeness
   over `release_slot_id`; 379 = a member of the COMMITTED trust-domain registry has no typed result
   (**for TSA-only Core the registry holds only the TSA domain, OR OTS carries a typed
   `not_required_by_profile` result — P1 core-registry rule** — so optional OTS never trips 379).
9. **Check order:** `… → 370 → 380 → 371 → 372 → 374 → 375 → 373 → 376 → 377 → 378 → 379 → [audit]381 →
382 → 383` (380 right after 370; 374 before 375; 375 before 373).
10. **Lean strength (no over-claiming):** protocol-ordering not physical causality
    (`acceptedReleaseImpliesVerifiedAnchorSet`); collision resistance + `HashInjectiveOn` are EXPLICIT
    hypotheses (`childCapabilityInputsDistinct` structural, `childCapabilityDistinctUnderNoCollision`
    conditional); `anchorOmissionTotality` bounded to the committed registry; theorem header says "no user
    axioms; collision resistance is an explicit theorem hypothesis" — never "depends on no axioms".
11. **`externally_anchored` only through a real confirmed upgraded `.ots` fixture** (release sequence,
    spec §3). Shipping before that reproduces raw 0 → claim VTC-Core only. No "reached" in tag notes until
    the confirmed fixture is byte-stable.
12. **Incident fixture** `backdated-workpaper` grounded in SEC Release 34-92361 (asserts the backdating
    PATTERN, not a figure). Novelty stays 9.0 (`candidate_first_at` confirmed against the swept surface,
    not an exhaustive proof).

---

## Plan-gauntlet corrections P1–P10 (LOAD-BEARING — override any inline task text)

Frozen outcomes of the plan line-by-line gauntlet. Where an inline task conflicts, THESE win.

- **P1 — split the anchor policy (precommitted) from the checkpoint evidence (post-inclusion) to kill the
  future-information cycle (P0-2).** The Bitcoin block containing a fresh OTS commitment does NOT exist
  when the pre-anchor ceremony contract is formed, so its hash/root CANNOT be precommitted. The committed
  `anchor_policy` therefore precommits only a POLICY:
  ```text
  precommitted_bitcoin_policy { network, min_confirmations, accepted_checkpoint_witness_keys,
                                checkpoint_evidence_schema, accepted_ots_operations, maximum_checkpoint_age }
  ```
  After inclusion, a signed `checkpoint_evidence` is attached (bound by the receipt + capability, NOT by
  `commitment_session_id`):
  ```text
  checkpoint_evidence { block_hash, block_height, block_merkle_root, observed_tip_height,
                        observed_at_epoch_s, witness_key_fingerprint, signature }
  ```
  The offline verifier accepts `confirmed` iff: the OTS Merkle path resolves to `block_merkle_root`, the
  `witness_key_fingerprint ∈ accepted_checkpoint_witness_keys`, the signature verifies, and (P0-3, below)
  the confirmation count checks out. Corroborated out-of-band vs mempool.space (proven 5J/5K pattern — 5K's
  real anchor block **957665**, `block_merkle_root=c61b3919…e49e54`). `verify-witness.mjs` does the
  path→root + witness-sig + count check; no Bitcoin node. (Adds to Global Constraints, spec §2 schema,
  Task 1.4, `verify-witness.mjs`.)
- **P2 — `confirmed` LOGIC is tested via stubbed facts; only the real EVIDENCE pack waits for Bitcoin.**
  All group-1 + K7 tests inject `otsFinality:"confirmed"` as a hand-built fact → CI is green at ship,
  byte-stable. The Lane A _real_ confirmed evidence fixture (a genuine upgraded `.ots`) is the ONLY thing
  gated on real confirmation; `externally_anchored` as a shipped **evidence claim** waits for it, the
  verifier LOGIC does not.
- **P3 — `ceremony_id` gets a positive derivation test + explicit builder ordering.** Task 1.1 builder
  order is: `commitment → anchors → receipt → ceremony_id = H_DS.ceremony_id(commitment_session_id,
tsa_token_digest, ots_proof_digest, receipt_digest)`. `receipt_digest = sha256Hex(canonicalJson(receipt))`
  INCLUDING its gate `sig`. Add a test that `ceremony_id` recomputes equal, alongside the absence test.
- **P4 — Task 1.1 reuses the shipped `buildSignedVucBundle(keys)` UNCHANGED** to produce the embedded VUC;
  `vuc_root = embedded.universe_commitment_digest`. (5K reused 5J's builder the same way.)
- **P5 — `vuc_root` is a ctx value.** `makeCtx` extracts `vucRoot` from `bundle.vuc.universe_commitment_
digest` (pure read); the adapter supplies `vucVerified:bool`. Add `vucRoot` to the ctx and Interfaces.
- **P6 — `makeCtx` tolerates unresolved accuracy (no throw).** If accuracy is unresolved, `tsaUpperBound =
null`; 369 owns the failure; 374 (the only consumer) runs AFTER 369 so never sees null. Stated ordering
  invariant — a throw here would mask 369 as 383.
- **P7 — the active `profile` is the COMMITTED one, not bundle-declared.** The profile lives in the
  committed `quorum_policy` (inside `commitment_session_id`) AND cfg's `policy_digest`; `makeCtx` checks
  they match → mismatch is **365**. Never run a producer-declared profile (clock-shopping the floor).
- **P8 — define the three under-specified digests.** `audience_digest = H_DS("simurgh.vtcq.audience.v1",
{audience_descriptor})`. Lane A's committed-LTV policy WAIVES external status evidence
  (`status_evidence_required=false`, `status_evidence_digest = sha256Hex(canonicalJson(null))`) so the
  fixture is offline/byte-stable; Lane B may capture a real OCSP response and flip the policy.
- **P9 — group-1 unit tests use hand-built stubbed `facts` ONLY.** Real `openssl ts -verify` lives solely
  in the group-2 integration test behind the env flag. Never shell openssl/ots from a unit test.
- **P10 — add Task 2.3: the verify CLIs + byte-stability runner.** `verify-vtcq-attestation.mjs` /
  `verify-byte-stability.mjs` with the CLI-main argv guard and an absolute-path-arg ingest test (the 5I
  droplet fix).

### Second pass (S1–S6)

- **S1 — PIN THE WALL-CLOCK REPRESENTATION (new parity landmine; VTC-Q is the FIRST core with time).**
  All times are **integer seconds since the Unix epoch, UTC**. `genTime` (ASN.1 GeneralizedTime) and
  `accuracy` are adapter-extracted facts; the pure core resolves `accuracy` to **integer seconds rounded
  UP** (conservative) and computes `tsa_upper_bound = genTime_epoch_s + accuracy_s`. The 374 window
  bounds (`window_open_not_before`, `window_close_after`) are integer epoch seconds. **All comparisons are
  integer-only** and byte-identical in JS / Python / browser. No floats, no ISO strings in the compared
  values. (This is the 5K leaf-ordering-byte discipline applied to time — a Global Constraint.)
- **S2 — `min_confirmations` IS machine-verified against the signed checkpoint witness (P0-3, corrects the
  earlier "never counts" wording).** The verifier does not observe the live chain, but it does not merely
  trust a human either: the signed `checkpoint_evidence` carries `block_height` and `observed_tip_height`,
  and 370/finality verifies:
  ```text
  observed_tip_height - block_height + 1 >= min_confirmations
  ```
  against a `witness_key_fingerprint ∈ accepted_checkpoint_witness_keys` whose signature verifies. The
  trust anchor is the checkpoint witness's signed tip-observation (corroborable out-of-band vs
  mempool.space), NOT an unverifiable "someone looked." If a deployment declines a witness, the honest
  result is named **`pinned_checkpoint_inclusion`** (path→root only), which does NOT satisfy the confirmed
  Quorum floor and stays raw **372** — never dressed as confirmed finality.
- **S3 — RESOLVED:** `buildSignedVucBundle(keys, { campaign_nonce })` is exported (verified); VTC-Q calls
  it unchanged with its own nonce.
- **S4 — OTS checks are conditional on a declared OTS anchor.** Under `vtc_core` with a TSA-only bundle,
  370 and 371 must skip cleanly (no OTS anchor → nothing to structurally verify / no pair to dedup), not
  fire spuriously. Only 372 (profile floor) governs whether the absent publication root matters.
- **S5 — `makeCtx` carries BOTH the committed profile (from `quorum_policy`) and the cfg profile plus a
  `profileMatch` boolean; it picks neither before 365.** 365 owns the mismatch. 372 uses the committed
  profile. A pre-365 throw here would mask the mismatch as 383.
- **S6 — schema (364) requires every `anchor.verifier_result === null`** — a producer must not pre-fill a
  verifier-derived field; non-null on input → 364.

### Beast-mode (I1–I3 fold into this stage; I4–I6 mint as sockets)

- **I1 — `rsp-prerequisite-gate` fixture family** (Task 2.4): a Core-profile bundle modelling the RSP
  prerequisite gate — the gate receipt = RSO deployment approval, a `declared_release` = the deployment, the
  committed window = "Risk Report published in advance of deployment." Asserts `→ raw 0`. Zero new crypto.
  Non-claim: models the ORDERING, not the report's content/adequacy. **(P1 — pin the source as RSP current
  version v3.4, updated 2026-07-08; the eval-before-deployment prerequisite-gate commitment is stable since
  v3.0, so the fixture models that stable rule.)**
- **I2 — Lean `temporalCompletenessNoHiddenGap`** (Task group 7 → **14 theorems** total): accept ⟹ every
  declared event in `commit → anchor → gate → release` is anchored + censused; no hidden gap in the
  _declared_ timeline. Reuses the 379/378 census machinery as its model; no new runtime code.
- **I3 — SCITT projection bridge** (Task 2.5): `node/scitt-bridge.mjs` emits
  `simurgh.vtcq.scitt_statement.v1`, a signed projection of the public attestation. **(P1 — SCITT is now
  RFC 9943 (Jun 2026), whose Signed Statements are COSE_Sign1/CBOR. This emitter is named
  `scitt_projection_candidate` and is explicitly SCITT-INSPIRED, NOT an RFC-9943-conforming Signed
  Statement.** A conforming COSE/CBOR projection + pinned media type is deferred.) Emit-only; a test asserts
  it re-verifies to the public attestation digest and performs no verification of its own. Non-claim: a
  SCITT receipt proves append-only registration, not honesty.
- **Minted sockets** (Task 0.3 constants `RESERVED_ARTIFACT_SLOTS`): `minimum_elapsed_review_binding`
  (I4 — VDF "No Instant Review"), `third_trust_ecology` (I5 — TSA+Bitcoin+SCITT quorum, "No Single
  Ecology"), `hiding_scope_commitment` (I6 — binding+hiding universe commitment). A non-null branch for any
  under the current `schema_version` → **382**. These are NOT built in 5L; they are named debts.

## Read before Task 1 (paid-for lessons)

- **Golden exit-map ripple**: adding 364–383 to `exitCodes.mjs` breaks the exit-map goldens AND the
  hardcoded consumers (`exitWrapper.test.js` hardcodes the full `RUN_LEVEL_BY_RAW` map — add all 20;
  ~7-consumer ripple as 5J/5K). The non-hermetic 4H digest builder will churn ~17 fixtures — keep ONLY the
  2 exit-map.json diffs, revert the rest.
- **priv-key allowlist**: add `stage5l/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem` to BOTH
  `scripts/security-audit-llm-shield-stage3m.sh` and `stage3o.sh` (allowlist by PATH REGEX, no digits).
  Keys are letters-only (`gate`, `sequencer`, `tsaverifier`; producer/reviewer REUSE 5J/5K).
- **prettier** mangles `+`/`-` at markdown wrap points into stray list items and underscore-emphasis in
  identifiers — keep evidence + test-keys prettier-ignored; reword docs to avoid `+` at line-wrap.
- **`npm test` = unit only**; never shell `rg`/`openssl` inside a unit test (Lane B/adapter crypto is
  gated behind an explicit env flag and lives in integration tests, never the default unit run).
- **constants at the STAGE ROOT** (`tools/simurgh-attestation/stage5l/constants.mjs`), re-exporting the
  `VTCQ_*` code arrays from the global registry.

---

## File map (every file; one responsibility each)

```text
tools/simurgh-attestation/stage4h/exitCodes.mjs         (EDIT) +VTCQ_RAW_CODES 364–383, orders, RUN_LEVEL
tools/simurgh-attestation/stage5l/constants.mjs          DOMAINS, MERKLE-free, PROFILES, RUNG, reserved slots
tools/simurgh-attestation/stage5l/core/result.mjs        R(raw,reason,detail) / OK(ctx)
tools/simurgh-attestation/stage5l/core/schema.mjs        checkBundleSchema / checkConfigSchema → 364
tools/simurgh-attestation/stage5l/core/context.mjs       makeCtx: derive commitment_session_id, tsa_upper_bound, deduped domains, profile
tools/simurgh-attestation/stage5l/core/commitment.mjs    365 bindings (+ messageImprintBindsRawBytes)
tools/simurgh-attestation/stage5l/core/tsa.mjs           366 parse · 367 crypto/attestation · 368 validity/LTV · 369 accuracy
tools/simurgh-attestation/stage5l/core/ots.mjs           370 structural · 380 finality-claimed-vs-computed
tools/simurgh-attestation/stage5l/core/quorum.mjs        371 inflation · 372 profile floor
tools/simurgh-attestation/stage5l/core/window.mjs        374 committed-window coherence
tools/simurgh-attestation/stage5l/core/receipt.mjs       375 receipt valid+identity
tools/simurgh-attestation/stage5l/core/capability.mjs    373 derivation · 376 structure+child-uniqueness
tools/simurgh-attestation/stage5l/core/release.mjs        377 child-binding · 378 census · 379 anchor-omission
tools/simurgh-attestation/stage5l/core/projections.mjs   381 audit projections + censuses
tools/simurgh-attestation/stage5l/core/policy.mjs        382 reserved slots
tools/simurgh-attestation/stage5l/core/vtcqCore.mjs      frozen spine 364→383
tools/simurgh-attestation/stage5l/node/laneKeys.mjs      gate/sequencer/tsaverifier + reused 5J/5K keys
tools/simurgh-attestation/stage5l/node/tsaAdapter.mjs    OpenSSL-backed CMS/X.509 + tsa_crypto_attestation
tools/simurgh-attestation/stage5l/node/adapter.mjs       B11 facts (re-verify 5K, resolve sigs, anchor states)
tools/simurgh-attestation/stage5l/node/buildSignedBundle.mjs   the full signed ceremony (Core + Quorum profiles)
tools/simurgh-attestation/stage5l/node/attestation.mjs   public + audit attestations
tools/simurgh-attestation/stage5l/node/scitt-bridge.mjs  (I3) emit simurgh.vtcq.scitt_statement.v1 (emit-only)
tools/simurgh-attestation/stage5l/node/build-vtcq-evidence.mjs / verify-vtcq-attestation.mjs / verify-byte-stability.mjs
tools/simurgh-attestation/stage5l/lanec/{gate.mjs, attach-anchor.mjs, verify-witness.mjs, run-droplet-ceremony.mjs}
tools/simurgh-attestation/stage5l/python/vtcq_parity.py  stdlib pure-core parity
tools/simurgh-attestation/stage5l/browser/{canonical-json.mjs, vtcq-portable.mjs}  WebCrypto + adapter-attestation tier
proofs/stage5l/TemporalQuorum.lean + lean-toolchain      14 theorems (I2 folded; input/output distinctness split)
tools/simurgh-attestation/canonicalise.mjs               (EDIT) +sha256Bytes (P0-1)
tests/unit/llmShield/stage5l/*.test.js                   exitCodes, constants, schema, tsa, ots, quorum, window,
                                                         receipt, capability, release, vtcqCore, attestation,
                                                         parity, browser, laneb, lanec, scitt-bridge
tests/e2e/llmShield/stage5l/k7AllFunctions.test.js       every export + tamper 364–383 + 4 attacks + profile matrix
tests/fixtures/llmShield/stage5l/test-keys/              INSECURE_FIXTURE_ONLY_{gate,sequencer,tsaverifier}.pem
tests/fixtures/llmShield/stage5l/logic/                  STUB-facts fixtures (core/quorum-pending/quorum-confirmed-stub/false-confirmed) — never publishable as proof
docs/research/llm-shield/evidence/stage-5l/              real-laneb/ (real DigiCert+OTS, incl. quorum-confirmed) + real-lanec/ + real-laned/ (independent party)
docs/research/llm-shield/STAGE_5L_CLOSEOUT.md
scripts/reproduce-llm-shield-stage5l.sh
```

---

## Interfaces (exact signatures — a task implementer sees only their own task)

```js
// core/vtcqCore.mjs
export function vtcqVerify(bundle, cfg, facts, { tier = "public" } = {}); // → {raw, reason, ctx?} | OK(ctx)

// core/context.mjs — makeCtx returns the FULL ctx (P0-10 / P5,P6,P7,S1,S5); it NEVER throws on unresolved accuracy.
export function makeCtx(bundle, cfg, facts); // → {
//   bundle, cfg, facts,
//   vucRoot,                       // pure read of bundle.vuc.universe_commitment_digest (P5)
//   commitmentSessionId,           // recomputed "sha256:"+hex(commitment_digest_bytes)
//   commitmentDigestBytes,         // raw 32-byte Buffer (P0-1)
//   tsaUpperBound,                 // int epoch s = genTime_s + accuracy_s, or null if unresolved (P6; 369 owns null)
//   committedProfile, cfgProfile, profileMatch,   // (P7; 365 owns mismatch)
//   dedupedDomains,                // deduped declared trust domains (371/372)
//   computedFinality,              // "pending" | "confirmed" | "invalid" (from checkpoint_evidence path+witness+count)
//   verifiedAnchorSetDigest        // H_DS over sorted valid anchor records (P0-4; capability binds this)
// }

// each check: (ctx) => R|null. facts shape (P0-10 — complete; times are INTEGER epoch seconds, S1):
//   facts = {
//     ed25519Valid: {...}, receiptSigValid: bool, gateSigValid: bool, releaseSigValid: {[release_slot_id]: bool},
//     vucVerified: bool,
//     tsaCrypto: { [tsa_token_digest]: { parseOk, canonicalDer, genTime_s, accuracy_s|null, policyOID, certValidAtGenTime,
//        ltvOk, essV2Ok, cryptoResult:"valid|invalid|indeterminate",
//        attestation: { token_raw_digest, cert_chain_digest, status_evidence_digest, policy_digest,
//                       adapter_identity, adapter_version, computed_crypto_result, sig } } },
//     otsState:    { [ots_proof_digest]: "verified_immediate|pending_unverified|invalid" },
//     otsFinality: { [ots_proof_digest]: "pending|confirmed|invalid" },  // derived from checkpoint_evidence (P0-2/3)
//   }

// node/tsaAdapter.mjs — dependency-injected, NOT hidden global key loading (P0-10)
export function verifyTsaToken({ tokenDer, certChain, policy, statusEvidence, expectedTokenDigest,
  expectedChainDigest, tsaVerifierSigningKey, adapterIdentity, adapterVersion }); // → signed tsa_crypto_attestation

// node/buildSignedBundle.mjs
export function buildSignedVtcqBundle(keys, { profile="vtc_quorum", finality="pending", campaign_nonce="vtcq-lane-a-nonce" } = {});
```

---

## Task group 0 — codes, constants, exit-map ripple (scaffold)

### Task 0.1 — register raw codes 364–383 in the global registry

Failing test `tests/unit/llmShield/stage5l/exitCodes.test.js`: assert `VTCQ_RAW_CODES` maps `OK:0` +
364→383 with the exact identifiers (spec §2 table), `VTCQ_PUBLIC_CHECK_ORDER = [364..380]`,
`VTCQ_AUDIT_CHECK_ORDER = [364..381]`, `VTCQ_POLICY_CODES = [382]`, wrapper `383` with identifier
`INTERNAL_OR_ENV_UNAVAILABLE_VTCQ`, and every 364–383 → `RUN_LEVEL_BY_RAW = 1`. Watch fail. Add to
`exitCodes.mjs` additively. Run; watch pass.

### Task 0.2 — the exit-map goldens + hardcoded consumers

Regenerate the exit-map goldens; add 364–383 to `exitWrapper.test.js`'s hardcoded `RUN_LEVEL_BY_RAW`. The
4H digest builder will churn ~17 fixtures — `git checkout` all but the 2 exit-map.json diffs. Verify the
6+ hardcoded consumers pass.

### Task 0.3 — `constants.mjs` at the stage root

Test: `DOMAINS` (the 8 frozen `simurgh.vtcq.*` tags: commitment*session, verified_anchor_set,
start_capability_root, release_capability, release_slot, ceremony_id, gate_identity, scitt_statement),
`PROFILES` (`vtc_core` {min_bounded_authorities:1, require_publication:false}, `vtc_quorum`
{min_bounded_authorities:1, require_publication:true, threshold:2, required_confirmed_publication:true}),
`RUNG` lattice `[distinct_key_only, challenge_bound, externally_anchored]`, and (P0-8 — reconciled with the
minted-socket block) **`RESERVED_ARTIFACT_SLOTS = [campaign_composition_root, minimum_elapsed_review_binding,
third_trust_ecology, hiding_scope_commitment]`** (a non-null branch for ANY under the current
`schema_version` → 382), re-exported `VTCQ*\*` code arrays. Watch fail; write; pass.

---

## Task group 1 — the pure core, check by check (each grows `vtcqCore`)

**TDD STEP TEMPLATE (P0-11 — every task below is executed as this exact five-step cycle; one raw boundary
per cycle, never batch two codes into one red-green):**

1. **Red** — write the named failing test asserting `vtcqVerify(fixtureFor(code), cfg, stubFacts).raw ===
<code>` (build the tamper fixture with `structuredClone` then mutate the ONE field).
2. **Watch fail** — `node --test tests/unit/llmShield/stage5l/<file>.test.js`; confirm it fails because the
   check does not yet exist (not a fixture typo).
3. **Green (minimal)** — add ONLY the one check function to its `core/*.mjs` and wire it at its frozen slot
   in `vtcqCore.mjs`.
4. **Watch pass** — rerun the one test file; then rerun the whole `stage5l` unit glob to confirm no earlier
   code's fixture now stops at the new check (ordering regression).
5. **Format + commit** — `npm run format` (repo-local prettier); commit `feat(5l): raw <code> …` (no
   trailer).
   Each `### Task 1.x` names its test(s) and the ONE code it lands; expand it into the five steps at execution.

### Task 1.0a — add `sha256Bytes` to the shared module (P0-1, prerequisite)

Failing test `tests/unit/.../canonicalise-sha256bytes.test.js`: `sha256Bytes("abc")` returns a 32-byte
Buffer and `sha256Hex(x) === Buffer.from(sha256Bytes(x)).toString("hex")`. Watch fail. Add
`export function sha256Bytes(input)` to `tools/simurgh-attestation/canonicalise.mjs`. Watch pass. Commit.
Re-run 5I/5J/5K unit suites to confirm the additive export disturbs nothing.

### Task 1.0 — result primitives + `vtcqCore` skeleton + schema 364 (+ no-adequacy belt)

`result.mjs` (`R`, `OK`), `schema.mjs` (`checkBundleSchema`/`checkConfigSchema` → 364, never throw; reject
an adequacy-vocabulary key belt as 5K's G13), and the `vtcqVerify` skeleton that runs schema → `makeCtx` →
[] → policy → wrapper. Test: malformed bundle → 364; **`cfg === undefined` → 364** (P0-7a —
`checkConfigSchema(undefined)` returns 364; a missing config is an input failure, NOT wrapper 383; 383 is
reserved strictly for an internal exception AFTER valid schema); skeleton over a minimal valid bundle →
`notEqual(raw, 364)`.

### Task 1.1 — crux ceremony builder (`laneKeys` + minimal `buildSignedVtcqBundle`) + `makeCtx`

Build the deterministic Core+Quorum bundle over ONE key set (gate/sequencer/tsaverifier + reused 5J/5K
producer/reviewers), embedding a verified 5K bundle. `makeCtx` derives `commitment_session_id` (recompute),
`tsa_upper_bound = genTime + resolved_accuracy`, deduped trust domains, active profile, computed finality.
Test: builder → a bundle whose `commitment_session_id` recomputes equal; `makeCtx` populates the fields.

### Task 1.2 — 365 commitment bindings (+ `messageImprintBindsRawBytes`)

Test: tamper any policy digest post-anchor → 365; `messageImprint != commitment_digest_bytes` → 365;
`ots_leaf_digest != commitment_digest_bytes` → 365; assert `ceremony_id` absent from
`commitment_session_id`, both anchor inputs, receipt, capability. Write `commitment.mjs`.

**Task 1.3 is split into four one-boundary cycles (P0-11 — no batching); all facts hand-built stubs (P9),
never real `openssl`. All four land in `core/tsa.mjs`.**

### Task 1.3a — 366 TSA parse

Test `tsa.test.js › "non-canonical DER → 366"`: stub `facts.tsaCrypto[d].parseOk=false` (or
`canonicalDer=false`) → `raw===366`. Minimal `checkTsaParse(ctx)`; wire at slot 366.

### Task 1.3b — 367 TSA crypto / attestation binding

Test `› "invalid CMS sig → 367"` and `› "swapped token_raw_digest → 367"`: stub `cryptoResult="invalid"`,
and separately `attestation.token_raw_digest !== tsa_token_digest` → `raw===367`. Minimal `checkTsaCrypto`.

### Task 1.3c — 368 validity + committed LTV

Test `› "cert invalid at genTime → 368"` and `› "committed-LTV status evidence absent → 368"`: stub
`certValidAtGenTime=false`, then `ltvOk=false` under a policy that requires status evidence → `raw===368`.

### Task 1.3d — 369 accuracy fail-closed

Test `› "accuracy absent from token AND policy → 369"`: stub `accuracy_s=null` with no policy accuracy
source → `raw===369`; and a resolvable-accuracy fixture → passes 369. Minimal `checkTsaAccuracy`.

### Task 1.4 — OTS 370 structural · 380 finality-claimed-vs-computed

Test: `otsState=invalid` → 370; declared `confirmed` while `otsFinality=pending` → 380; declared=pending &
computed=pending → passes both (→ later 372 under Quorum); wrong chain/checkpoint policy → 370 (before 380).
Write `ots.mjs`.

### Task 1.5 — quorum 371 inflation · 372 profile floor

Test: two anchors, one declared trust domain → 371; OTS-only (no bounded-time authority) → 372;
`vtc_quorum` with computed pending → 372 typed pending; `vtc_core` with only a TSA → passes; Quorum with 2
distinct confirmed roots → passes. Write `quorum.mjs`.

### Task 1.6 — 374 committed-window coherence

Test: `window_open_not_before < tsa_upper_bound` → 374; `window_close_after ≤ window_open_not_before` →
374; `required_anchor_profile != committed_anchor_profile` → 374. Write `window.mjs`.

### Task 1.7 — 375 receipt valid + identity (broadened)

Test: missing a required binding → 375; `receiptSigValid=false` → 375; gate fingerprint mismatch
(gate-key substitution) → 375; receipt context not bound to `commitment_session_id` → 375. Write
`receipt.mjs`. **Runs BEFORE 373.**

### Task 1.8 — capability 373 derivation · 376 structure + child uniqueness

Test: `start_capability_root_digest` not = `H_DS.start(verified anchor set)` → 373; malformed child → 376;
child replay across a different `ceremony_id` → 376; two releases sharing a `release_slot_id` → 376. Write
`capability.mjs`.

### Task 1.9 — release 377 child-binding · 378 census · 379 anchor-omission

Test: a present release whose child ≠ derivable from the root → 377; a declared endpoint with no
consumption record (over `release_slot_id`) → 378; an extra release outside the declared surface → 378; a
committed trust-domain-registry member with no typed result → 379. Write `release.mjs`.

### Task 1.10 — 381 projections + censuses (audit-only)

Recompute bijection/per-profile/quorum/finality/release-slot censuses → `projection_root`; compare to
stored. Test: audit tier mismatch → 381; public tier never runs it. Write `projections.mjs`.

### Task 1.11 — 382 policy / reserved slots · 383 wrapper finalize

Test: `campaign_composition_root` non-null → 382; a thrown internal error → 383. Wire the frozen spine
(gauntlet rule 9) into `vtcqCore.mjs`. Full ordered-scan test over a golden bundle → raw 0 (Core) and raw
0 (Quorum-confirmed), 372 (Quorum-pending).

---

## Task group 2 — adapter, attestations, Lane A pack, byte-stability

### Task 2.1 — `tsaAdapter.mjs` (OpenSSL-backed) + `adapter.mjs` (B11)

`verifyTsaToken` shells `openssl ts -verify` (gated behind an integration-env flag) AND enforces the six
LTV checks, emitting a signed `tsa_crypto_attestation`. `adapter.mjs` re-verifies the embedded 5K bundle,
resolves Ed25519 sigs, derives `otsState`/`otsFinality`, and assembles `facts`. Integration test (not the
default unit run) over the Lane B captured token.

### Task 2.2 — attestations + evidence + byte-stability

Public + audit attestations (`audit ⟹ public`). `build-vtcq-evidence.mjs`. **Separate LOGIC fixtures from
EVIDENCE fixtures (P1 rule + P2):**

- **Logic fixtures** `tests/fixtures/llmShield/stage5l/logic/`: `core-positive→0`, `quorum-pending-typed→
372`, **`quorum-confirmed-stub→0`** (injects `otsFinality:"confirmed"` + a stub `checkpoint_evidence` via
  hand-built facts — CI-green at ship, byte-stable, NEVER publishable as proof of `externally_anchored`),
  `false-confirmed-over-pending→380`. Full tamper matrix.
- **Evidence fixtures** `docs/research/llm-shield/evidence/stage-5l/real-laneb/quorum-confirmed/`: the ONLY
  place a genuine upgraded `.ots` + signed `checkpoint_evidence` lives; produced by Lane B, gated on real
  Bitcoin confirmation. `externally_anchored` is claimed ONLY from here.
  Byte-stability: build twice, `cmp`.

### Task 2.3 — verify CLIs + byte-stability runner (P0-10 / P10)

`verify-vtcq-attestation.mjs` and `verify-byte-stability.mjs`, each with the CLI-main argv guard
(`if (import.meta.url === pathToFileURL(process.argv[1]).href)`). Failing test: invoke each with an
**absolute-path** dir arg (the 5I droplet fix) → expected `tier=public raw=0` / `tier=audit raw=0` and
`exit 0`; a tampered pack → the asserted raw + non-zero exit. Exact commands + expected exit codes in the
test.

### Task 2.4 — I1 `rsp-prerequisite-gate` fixture (beast-mode fold)

A `vtc_core` bundle modelling RSP's prerequisite gate: the gate receipt = RSO deployment approval, a
`declared_release` = the deployment, the committed window = "Risk Report published in advance of
deployment." Failing test asserts `→ raw 0` and that the release consumes a valid child capability. Zero
new crypto. Non-claim comment in the fixture: models ORDERING, not report content/adequacy.

### Task 2.5 — I3 SCITT projection bridge (beast-mode fold)

`node/scitt-bridge.mjs` emits `simurgh.vtcq.scitt_statement.v1` — **named `scitt_projection_candidate`,
SCITT-INSPIRED, explicitly NOT an RFC 9943-conforming Signed Statement** (P1 — RFC 9943, Jun 2026, mandates
COSE_Sign1/CBOR; a plain JSON object is not conformant). Emit-only. Test: the bridge re-verifies to the
public attestation digest and performs no verification of its own. Non-claim: proves append-only
registration when registered, not honesty. (An RFC-9943 COSE/CBOR projection is deferred; pin the media
type when built.)

---

## Task group 3 — Lane B (real capture)

`build-lane-b` captures a genuine DigiCert RFC-3161 token over the real `commitment_digest_bytes` + a real
OTS stamp; re-verifies offline; freezes the fixtures Lane A pins. FreeTSA as an interop/adversarial
fixture. Never CI-gated. Record `docs/research/llm-shield/evidence/stage-5l/real-laneb/`.

---

## Task group 4 — Lane C gate, anchor rails, droplet runner, incident fixture

`lanec/gate.mjs` (`evaluateCampaign`), `attach-anchor.mjs` (attaches the post-inclusion signed
`checkpoint_evidence`, P0-2), `verify-witness.mjs` (OTS upgrade + Merkle-path→`block_merkle_root` +
witness-sig + `observed_tip_height - block_height + 1 >= min_confirmations`, P0-3), `run-droplet-ceremony.mjs`
(verify-only pack). Adversarial sealing: backdating / favourable-clock / anchor-omission / window-rewrite /
stale-replay / **`backdated-workpaper` (P0-8 incident fixture, named after SEC Rel. 34-92361 — a release
whose committed window is incoherent with the anchor)** fire 373/374/375/377/378/379/380 as trophies.
CVP-covered.

## Task group 4b — Lane D (independent-party ceremony, P0-8)

An external party runs the ceremony with ITS OWN gate/sequencer/TSA-verifier keys and its own TSA+OTS
paths; sends back the verify log + upgraded `.ots` + `checkpoint_evidence` (never a `.pem`). Records
`docs/research/llm-shield/evidence/stage-5l/real-laned/` with a de-identified outcome JSON. Digest-only,
never CI-gated. This is the distinct-key independence VUC's Lane C could not provide (VTC-Q's gate CAN be
re-keyed by the independent party).

---

## Task group 5 — Python parity

`python/vtcq_parity.py` (stdlib): `H_DS`, `commitment_digest_bytes` (raw bytes via `hashlib.sha256().
digest()`), all binding + census + structural-precedence checks. Shared vector test asserts byte-identical
results vs the JS pure core. CMS crypto is an adapter fact (not re-implemented).

---

## Task group 6 — Browser parity

`browser/vtcq-portable.mjs` (WebCrypto async): the pure-core surface + the `tsa_crypto_attestation`
verification tier. Test asserts the module's claim string is `"adapter-attestation and structural binding
verified"` and NEVER `"RFC-3161 independently verified"`. CSP no-egress.

---

## Task group 7 — Lean proofs (14 theorems, zero sorry)

`proofs/stage5l/TemporalQuorum.lean` — **14 theorems** (P1 — the split of input-distinctness from
conditional-output-distinctness makes it 14, not 13). List EXPLICITLY, do not say "the theorems from §4":

1. `acceptedAnchorsBindCommittedPolicySet` 2. `messageImprintBindsRawBytes` 3. `boundedAuthorityFloor`
2. `quorumRequiresConfirmedDistinctRoots` 5. `confirmedRequiresPolicyEvidence`
3. `receiptCompleteBeforeCapability` 7. `acceptedReleaseImpliesVerifiedAnchorSet` (protocol ordering, NOT
   causality) 8. `childCapabilityInputsDistinct` 9. `childCapabilityDistinctUnderNoCollision` (hyp
   `HashInjectiveOn`) 10. `releaseCensusBijection` 11. `anchorOmissionTotality` 12. `capabilityDomainSeparation`
4. `auditImpliesPublic` 14. `temporalCompletenessNoHiddenGap` (I2). Header: "zero sorry, no user axioms;
   collision resistance and `HashInjectiveOn` are explicit theorem hypotheses." Compile exit 0.

---

## Task group 8 — K7 net, reproduce, allowlists, prior-stage regression

### Task 8.1 — K7 all-functions e2e net

Every export invoked; tamper matrix 364–383 each UNIQUELY reachable (assert the frozen spine); the four
mandatory attacks (`gate-key-substitution→375` [detected vs the committed `gate_identity_policy_digest`],
`child-capability-replay-across-a-different-commitment_session_id→376`, `TSA-adapter-attestation-with-
swapped-token_raw_digest→367`, `confirmed-under-wrong-chain/checkpoint→370`);
the three computed states + `false-confirmed→380`; profile matrix (OTS-only rejected, Core, Quorum-pending
372, Quorum-confirmed 0); parity + two-tier + cross-stage (5K `vuc_root` re-verified).

### Task 8.2 — reproduce script + prior-stage regression + allowlists

`scripts/reproduce-llm-shield-stage5l.sh` (Node 26) → ALL PASS. Run 5I/5J/5K reproduce → byte-identical.
Add the `stage5l/test-keys` regex to `stage3m.sh` + `stage3o.sh`.

---

## Task group 9 — closeout (P0-9 — a git tag is IMMUTABLE; do not mutate the evidence claim after tagging)

K7 + reproduce green + prior-stage reproduce undisturbed → targeted `npm test` + `format:check` +
security-audit 3m/3o → PR (honest scope) → CI green → rebase-merge → reset local main to origin. **Then pick
ONE tag path:**

- **Preferred — single honest VTC-Quorum release:** merge → **wait for OTS Bitcoin confirmation** → freeze
  the upgraded `.ots` + signed `checkpoint_evidence` → reproduce `vtc_quorum_confirmed → raw 0` → update
  README + closeout (re-scored) → **THEN tag `v2.47.0-stage-5l-vtcq`** → reproduce on the detached tag →
  release notes claim `externally_anchored`.
- **Alternative — Core-first:** tag `v2.47.0-stage-5l-vtcq` NOW as **VTC-Core only** (no `externally_anchored`
  claim) → later, when Bitcoin confirms, publish a NEW version/tag `v2.48.0-...-quorum-confirmed`. **Never**
  edit the v2.47.0 evidence claim after it is tagged.
  Then: memory (MEMORY.md pointer + `project_stage-5l-vtcq.md`) → Zurvan (search first, add ADR).

## Closeout gate (all must be green before tag)

- [ ] K7 net green; every raw 364–383 uniquely reachable; 4 attacks land on their own code
- [ ] three computed states correct (pending = 372, never raw 0)
- [ ] Node/Python/browser parity on a shared vector; browser claims only adapter-attestation
- [ ] 13 Lean theorems compile, zero sorry, explicit CR/injectivity hypotheses
- [ ] 5I/5J/5K reproduce byte-identical
- [ ] `externally_anchored` claimed ONLY if the confirmed `.ots` fixture reproduces raw 0; else VTC-Core
- [ ] no attribution trailer anywhere; public motto = BoundarySafe first
- [ ] tag path chosen (wait-then-tag Quorum, OR Core-first + later tag); evidence NEVER edited post-tag
