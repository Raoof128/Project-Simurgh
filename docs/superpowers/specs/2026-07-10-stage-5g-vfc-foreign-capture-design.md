# Stage 5G — VFC: Verifiable Foreign Capture (design spec)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Thesis: Simurgh is the independent, byte-reproducible **verification** layer for agent
> containment. Every stage adds ONE falsifiable blade; the moat is the Completeness Invariant
> (no selective omission) plus academic depth. Honesty guardrail: **"boundary held, verifiably" —
> never "model safe"**, and here: **"separation proven to rung N, verifiably" — never "independent."**

- **Stage id:** 5G-VFC · **Version:** `v2.42.0-stage-5g-vfc` · **Date:** 2026-07-10
- **Arc:** External Accountability arc (A→B→C). VFC is A. Next: **VPC** (panel/anchor contest),
  then **VUC** (external universe commitment). Penciled VML/VDE slide after the arc.
- **Raw codes:** additive **283–299** in the global ledger `tools/simurgh-attestation/stage4h/exitCodes.mjs`.
- **Reserved-socket posture:** VFC does **not** "pay a socket" — no independent-party IOU was ever
  minted. It **narrows a standing signed non-claim** already in the repo
  (`stage4r:not_proof_of_operator_independence_beyond_process_and_key_separation`,
  `stage4q:approver_key_separation_is_cryptographic_not_organisational`,
  `stage4x/4y:lane_b_is_process_independent_not_institution_independent`) by turning the
  cryptographically-provable *slice* of it into a typed rung lattice, and mints its own sockets for
  the residual it still cannot prove.

---

## §1 — Identity, Laws, Blade

### The wound
In every stage 3M→5F, Simurgh commits the corpus, runs the detector, signs the capture, **and**
verifies it. A hostile reader's strongest move: *"You could have fabricated the detector outputs —
you graded your own homework."* 5F signed this exact limitation (#4: *"Two-process/two-key ≠
independent-party verification"*) and named the fix as the **→10 Frontier lever: independent-party
evidence _generation_.** VFC is that lever, turned into a blade. The gap hunt (§5) confirms the whole
industry treats producer-vs-grader as a **broken binary** and concedes the binary leaks.

### The blade (one mechanism a reviewer can attack)
VFC extends the Completeness Invariant to **provenance of production**: every foreign capture carries
a **typed producer identity** and a **typed verifier identity**, and the verifier computes a
**Separation Strength** — the *provable* distance between the party that **produced** the evidence and
Simurgh, the party that **verifies** it. You cannot selectively omit *who made* a piece of evidence,
and you cannot imply independence you cannot prove. A reviewer rejects VFC by breaking exactly one
thing: **the producer≠verifier separation proof.**

### The honest core — a monotonic separation-evidence chain (signed up front)
A bare second Ed25519 key is **not** independence — Simurgh could hold both keys. VFC never asserts a
boolean `independent`. It types the separation into a **monotonic lattice** (rung *n* requires every
predicate of rung *n−1*), and the verifier reports *exactly which rung was proven*, failing closed on
any overclaim:

| Rung | `separation_strength`    | Required evidence (cumulative)                                                                     | Honest forgeability statement                                                                                            |
| ---: | ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
|    0 | `distinct_key_only`      | Capture signed by a key distinct from the verifier key                                              | Simurgh could generate another key and produce this evidence                                                              |
|    1 | `challenge_bound`        | Rung 0 **+** producer transcript binds a Simurgh-signed challenge receipt (committed digests match) | Simurgh could still produce it, but could not substitute a transcript lacking the committed challenge                     |
|    2 | `externally_anchored`    | Rung 1 **+** producer key bound to a typed external identity root (Sigstore-OIDC), subject-distinct | Forgery requires control or compromise of the externally-anchored producer identity, or failure of the trust assumptions |

The verifier **computes** `proven_rung`; `claimed_rung > proven_rung` is a hard failure (raw 296). A
lower claim over stronger evidence is accepted; the output reports both `{claimed_rung, proven_rung}`.

### Laws (falsifiable)
- **Law 1 — No Undeclared Self-Production.** Every capture identifies its producer key + identity
  mode and a typed verifier identity; missing/ambiguous producer attribution fails closed.
- **Law 2 — No Challenge Substitution.** Any rung ≥ `challenge_bound` must bind the exact committed
  challenge, panel plan, corpus, and capture digest.
- **Law 3 — No Unsupported Separation Upgrade.** The reported rung equals the highest rung whose
  *complete* predicate set verifies; a distinct key alone can never yield an externally-anchored result.
- **Law 4 — No Identity-Root Substitution.** Externally-anchored evidence must verify under an
  **externally-supplied** trusted root and bind the same producer key + capture digest as the attestation.

### Signed non-claims / bounds (named as the arc's next attack surfaces)
- Separation proves *production separation-evidence*, **not correctness** — an independent party can
  still run a bad detector (correctness stays 5F's `heterogeneous_label_vector` observation).
- Rung 2 proves the key is bound to a subject recognised by a configured external trust root and
  distinct from the verifier subject; it does **not** prove unaffiliated humans, non-collusion, or
  truthful organisational governance (→ contest surface for **VPC**).
- Challenge-binding proves the transcript answers *this* committed challenge; it is **not** wall-clock
  freshness and does **not** prove absence of undisclosed reruns.
- Process/key separation is **not** institution-independent (`lane_b_is_process_independent_not_institution_independent`).
- Offline pinned weights under a foreign key ≠ a live hosted endpoint (carries `live_endpoint_attestation_deferred`).

Public metaphor allowed: *"don't grade your own homework."* Signed claim: *distinct-key, challenge,
and external-root evidence — not proof of organisational independence.*

---

## §2 — Artifact schema, raw codes, frozen check order

### Three signed objects (separation of who-signs-what is the point)
No object hashes or signs itself: each splits into a `…​.content.v1` sub-object;
`digest = sha256("simurgh.vfc.<obj>.v1\n" ‖ canonicalJson(content))`,
`signature = sign(key, canonicalJson(content))`; digest/signature fields live in the **wrapper only**.

```text
① simurgh.vfc.challenge_receipt.v1        ← Simurgh signs BEFORE capture (issuer tool; writes no capture)
   content { challenge_id, nonce(≥256-bit), panel_plan_digest, corpus_digest,
             detector_snapshot_digest, verifier_identity_digest }
   wrapper { …content, challenge_record_digest, verifier_signature }

② simurgh.vfc.producer_transcript.v1      ← the foreign producer signs
   content { challenge_record_digest, capture_digest, producer_identity_digest,
             producer_key_fingerprint, anchor_evidence_digest? (ABSENT at rung ≤1, never null) }
   wrapper { …content, producer_signature }

③ simurgh.vfc.foreign_capture.v1          ← Simurgh signs the attestation-of-record
   { challenge_receipt: ①, producer_transcript: ②,
     verifier_identity { identity_subject, public_key_pem, key_fingerprint, anchor_type, anchor_subject },
     producer_identity { identity_subject, public_key_pem, key_fingerprint,
                         anchor_type ∈ {none, sigstore_oidc}, anchor_subject },
     capture (simurgh.vfc.capture.v1) { producer_identity_ref, detector_snapshot_digest,
                                        corpus_digest, cells[...] },   ← single PG2 detector
     panel_plan_ref/corpus_ref/detector_snapshot_ref { path, digest },  ← committed artifacts in the pack
     anchor_evidence? { anchor_type:"sigstore_oidc",
                        sigstore_bundle { schema_version, cert, sct, inclusion_proof, dsse_statement },
                        binds { producer_identity_digest, producer_key_fingerprint,
                                capture_digest, challenge_record_digest } },
     separation_claim { claimed_rung },
     attestation_signature }
```

Rules baked in: **public keys present** (`public_key_pem` on every identity; verifier recomputes the
fingerprint from the PEM before verifying any signature); **external verifier trust pin** supplied
from *outside* the bundle, checked first (5E rule); the **Sigstore-certified key IS the transcript
signing key** (`fp(Fulcio cert pubkey) == producer_identity.key_fingerprint == fp(public_key_pem)`);
`capture_digest` covers the **whole** capture object; the external trusted root is **never** read from
the bundle; unknown embedded trust-root fields fail 283.

### Raw codes — additive 283–299, frozen first-failure order, wrapper LAST

| Raw | Name                                         | Fires when                                                                                          | Owner module            |
| --: | -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------- |
| 283 | `VFC_SCHEMA_INVALID`                         | shape/required keys missing; any unknown embedded trust-root field                                  | core/schema.mjs         |
| 284 | `VFC_ATTESTATION_TRUST_OR_SIGNATURE_INVALID` | reason∈{external_pin_missing, external_pin_mismatch, attestation_signature_invalid}                  | core/attestationTrust.mjs |
| 285 | `VFC_CHALLENGE_RECEIPT_INVALID`              | verifier sig over ① fails; `challenge_record_digest` recompute ≠ receipt; `verifier_identity_digest` ≠ top-level | core/challengeReceipt.mjs |
| 286 | `VFC_PRODUCER_ATTRIBUTION_MISSING`           | producer identity/key absent, or a cell doesn't resolve to `capture.producer_identity_ref` (Law 1)  | core/producerTranscript.mjs |
| 287 | `VFC_PRODUCER_SIGNATURE_INVALID`             | producer sig over ② fails (fingerprint recomputed from PEM first)                                    | core/producerTranscript.mjs |
| 288 | `VFC_CAPTURE_DIGEST_MISMATCH`                | `transcript.capture_digest` ≠ recomputed digest of the whole capture object                         | core/captureDigest.mjs  |
| 289 | `VFC_KEY_NOT_DISTINCT`                       | producer key fp == verifier key fp (rung-0 floor)                                                   | core/keySeparation.mjs  |
| 290 | `VFC_CHALLENGE_UNBOUND`                      | rung≥1: transcript omits `challenge_record_digest` (Law 2)                                           | core/challengeBinding.mjs |
| 291 | `VFC_CHALLENGE_MISMATCH`                     | bound `challenge_record_digest` ≠ ①'s, or ①'s committed digests ≠ recomputed panel_plan/corpus/detector | core/challengeBinding.mjs |
| 292 | `VFC_SUBJECT_NOT_DISTINCT`                   | rung-2: anchored producer subject == externally-configured verifier subject                         | core/subjectSeparation.mjs |
| 293 | `VFC_EXTERNAL_TRUST_CONFIGURATION_INVALID`   | rung-2 requested but external trust config absent, or root fp not in local allowlist (fail-closed)  | core/anchorBinding.mjs  |
| 294 | `VFC_ANCHOR_EVIDENCE_INVALID`                | rung-2: Sigstore bundle fails under configured root / frozen issuer·audience·subject mismatch       | core/anchorBinding.mjs  |
| 295 | `VFC_ANCHOR_BINDING_MISMATCH`                | rung-2: DSSE statement doesn't bind producer id digest + key fp + capture digest + challenge digest | core/anchorBinding.mjs  |
| 296 | `VFC_SEPARATION_OVERCLAIM`                   | `claimed_rung` > `proven_rung` (Law 3 — headline anti-gaming blade)                                  | core/overclaim.mjs      |
| 297 | `VFC_AUDIT_CENSUS_MISMATCH`                  | audit-tier: capture-census bijection / corpus coverage disagrees (audit-only, **no forward pass**)  | core/census.mjs         |
| 298 | `VFC_POLICY_REJECTED`                        | strict policy: `proven_rung` < configured minimum (default = `challenge_bound`)                      | core/policy.mjs         |
| 299 | `INTERNAL_OR_ENV_UNAVAILABLE_VFC`            | fail-closed wrapper (LAST); Sigstore kernel cannot execute                                           | core/vfcCore.mjs        |

- `VFC_PUBLIC_CHECK_ORDER = [283…296]` · `VFC_AUDIT_CHECK_ORDER = [283…297]`
- `VFC_AUDIT_ONLY_CODES = [297]` · `VFC_POLICY_CODES = [298]` · wrapper `299`
- `RUN_LEVEL_BY_RAW` 283–299 all `1`; kernel **read-only**; 299 the only env code, fails closed.

### Conditional rung-2 semantics (frozen)
- no anchor, `claimed ≤ 1`, policy-min `≤ 1` → `proven ∈ {0,1}`, **no 293–295 failure**;
- anchor supplied → it must fully validate, else **293/294/295**;
- `claimed = 2` **or** policy-min `= 2` with trust config absent/invalid → **293**;
- `claimed > proven` → **296**; honest but below policy → **298**.

### Rung computation (verifier-computed; `claimed_rung` inspected last)
```text
rung0 = producer_sig_valid ∧ producer_key ≠ verifier_key
rung1 = rung0 ∧ challenge_receipt_valid ∧ transcript_binds(challenge_record_digest) ∧ committed_digests_match
rung2 = rung1 ∧ external_trust_configured ∧ sigstore_bundle_valid_under_root
             ∧ anchor_binds(producer_id_digest, producer_key_fp, capture_digest, challenge_record_digest)
             ∧ subject_distinct
proven_rung = highest satisfied ; claimed_rung > proven_rung → 296
```

---

## §3 — Evidence lanes, attestation tiers, parity

### Lanes (frozen A/B/C contract)
- **Lane A — CI byte-stable, synthetic.** Fixture keypairs: `verifier` (Simurgh), a **distinct**
  `producer`, and a **mock Sigstore trust root** (fixture Fulcio+Rekor, fixed synthetic times).
  External trust config (verifier pin `{key_fp, subject, identity_digest}` + Fulcio/Rekor allowlist)
  supplied from **outside** the evidence dir. Exercises **all three rungs** and **every code 283–299**,
  including fail-closed traps (self-referential-digest rejection, internal-root→283, missing/mismatched
  pin→284, unlinked-Sigstore-key→295, overclaim→296, and the full conditional rung-2 matrix).
- **Lane B — two-process / three-key ceremony, deterministic (sidecar).** Keys: (1) Simurgh
  attestation/verifier key, (2) ceremony key, (3) the **external** producer key. Process-2
  independently recomputes every domain-separated digest, re-verifies all three signatures
  (fingerprint recomputed from PEM), recomputes `proven_rung`, and signs
  `simurgh.vfc.blind_recompute_receipt.v1`:
  ```json
  { "schema":"simurgh.vfc.blind_recompute_receipt.v1",
    "challenge_record_digest":"sha256:...", "capture_digest":"sha256:...",
    "producer_transcript_digest":"sha256:...", "producer_identity_digest":"sha256:...",
    "attestation_content_digest":"sha256:...", "recomputed_proven_rung":"challenge_bound",
    "ceremony_key_fingerprint":"sha256:...", "signature":"base64..." }
  ```
  Verified under an **externally-supplied ceremony pin**. This receipt is a **sidecar** — reproducibility
  evidence only; its removal does **not** invalidate the principal attestation (VFC deliberately chooses
  the weaker sidecar design, unlike 5F's bound receipt). Signed non-claim: process/key separation, **not**
  institution-independent.
- **Lane C — real foreign capture, non-CI, the Frontier lever.** A separately-reported actor receives
  the committed corpus + challenge receipt via the standalone `foreign-capture-pack/`, runs **PG2 86M on
  their CPU**, signs the producer transcript with **their** key, and returns **only** the capture package
  (never touches any Simurgh private material). We verify → **`proven_rung = 1` (challenge_bound)**.
  Fenced claim: *operationally produced by a separately reported actor; cryptographically proves
  distinct-key, challenge-bound production; the actor, account, and environment are operationally
  reported but not externally authenticated at rung 1.* Closeout states exactly who controlled which
  account/key/environment. Real keyless-Sigstore rung-2 → `real_sigstore_anchor_execution_deferred`.
- **Lane C-reflexive (Invention D) — the Mirror.** Simurgh's own release conformance artifact is
  submitted to a foreign producer (the reproduction team) as the producer-of-record → rung-1 reflexive
  attestation: Simurgh stops grading its own homework *about whether it grades its own homework.* Both
  outcomes sealed honestly; a no-show is a campaign record + `reflexive_foreign_capture_execution_deferred`,
  never an overclaim. Non-claim: reflexive attestation hits the same rung ceiling — it does not bootstrap
  independence we don't have.

**Campaign outcomes** `simurgh.vfc.campaign_outcome.v1` status ∈ `{completed, declined, no_show,
environment_failed}` — only `completed` yields a producer transcript + proven rung; a non-`completed`
campaign never passes through `evaluateForeignCapture` as malformed capture. **Absence-of-reruns** is a
signed non-claim, not a proof (mints `undisclosed_rerun_detection_deferred`).

### Attestation tiers (two-tier)
- **Public** — `VFC_PUBLIC_CHECK_ORDER [283…296]`: structure + three signatures + rung computation.
- **Audit** — `VFC_AUDIT_CHECK_ORDER [283…297]`: adds **297** capture-census bijection over
  `simurgh.vfc.capture_census.v1` `{challenge_record_digest, corpus_digest, attempt_records,
  terminal_records, capture_digest}` — one terminal per committed case; no dup/omission; every attempt →
  one terminal; every cell ↔ one terminal; census digest bound by the attestation. **No neural forward
  pass during audit.**
- **Policy** — **298** strict `proven_rung ≥ minimum` (**default `challenge_bound`**); `--attestation-only`
  reports `proven_rung` without applying 298. Release reproduction = audit tier + min rung 1.

Output shape: `{ attestation_valid, claimed_rung, proven_rung, minimum_required_rung, policy_accepted, raw }`.

### Parity capability matrix (frozen)
| Surface                            |            JS |                        Python |                       Browser |
| ---------------------------------- | ------------: | ----------------------------: | ----------------------------: |
| Canonical JSON + domain digests    |   Independent |                   Independent |                   Independent |
| Ed25519 signatures                 |        native |           independent library |                     WebCrypto |
| Rungs 0 and 1                      |          full |                          full |                 portable full |
| Sigstore/Fulcio/Rekor validation   | shared kernel |     shared kernel/orchestration |                            no |
| Anchor binding after kernel result |          full |                   independent |                            no |
| Audit census                       |          full |                          full |         only if census present |
| Policy gate                        |          full |                          full |                      portable |
| Raw-code parity                    |          full | full (shared-kernel provenance noted) |          none, `raw:null` |

Sigstore bundle verification is a **vendored kernel** (`node/sigstoreKernelRunner.mjs`) invoked in one
place — out of scope for pure-arithmetic parity (as 5F scoped raw-278). Browser returns:
```json
{ "verification_scope":"portable", "portable_valid":true, "proven_rung_portable":"challenge_bound",
  "rung2_status":"not_evaluated", "full_attestation_status":"not_evaluated", "raw":null }
```
Browser **never** reports a complete `proven_rung` when a Sigstore anchor exists but wasn't evaluated;
enforces **CSP no-egress**.

### Byte-stability
Build into two clean temp dirs → sorted `{path,size,sha256}` manifests → compare manifests →
`git diff --exit-code` against committed fixtures (catches missing/extra files, not just content).
Evidence dir prettier-ignored; the Sigstore trust-root manifest is **not** ignored (compared by
`canonicalJson` digest, format-independent).

---

## §4 — Lean, scorecard, module map

### Lean (`proofs/stage5g/ForeignCapture.lean`, lean 4.15, zero `sorry`, wired into `stage-4-lean-proofs.yml`)
**10 theorems + 1 lemma**, each fenced to a **model predicate**, never a real-world security claim. (The
Anchoring Trilemma is **not** a Lean theorem — see §6; pre-issued credentials falsify its naive statement,
so it ships as a signed design observation with stated assumptions.)

| Theorem | Proves (and only this) |
| --- | --- |
| `rungMonotonicity` | `requirements(rung2) ⊇ requirements(rung1) ⊇ requirements(rung0)` (+ dual `satisfies` antitone) |
| `overclaimSound` | `claimed_rung > proven_rung ⇒ raw = 296` |
| `rung0RequiresDistinctKey` | rung-0 acceptance ⇒ producer key ≠ verifier key |
| `challengeBindingSound` | digest/challenge consistency — not physical time, not rerun-absence |
| `captureDigestBindsContext` | accepted capture digest binds producer id ref + detector snapshot + corpus + cells |
| `subjectAnchorBindingSound` | binds an accepted external subject — not unaffiliated humans, not non-collusion |
| `externalRootRequiredForRung2` | the rung-2 acceptance predicate requires an externally-supplied trust value — not Fulcio/Rekor security |
| `attestationTrustRequiresExternalPin` | acceptance of any VFC attestation requires an externally-supplied Simurgh verifier fingerprint (raw 284) |
| `producerTranscriptBindsIdentity` | a valid transcript binds `producer_identity_digest`; identity can't be re-skinned onto a genuine signature |
| `strictPolicyMayRejectValidLowerRung` | a truthful rung-0 attestation may be structurally valid while strict rung-1 policy returns raw 298 |
| lemma `verifierCodomainHasNoIndependenceBoolean` | the verifier result type has **no boolean `independent`** — only the typed rung ladder + raw codes |

### Four-axis scorecard (honest current / closeout target; beast A+B+C folded in)
| Axis               | Current | Closeout target | What moves it (buildable debt) |
| ------------------ | ------: | --------------: | ------------------------------ |
| Novelty            | **8.7** | 9.0 | strong adjacent prior art exists (OVERT graded AAL, Attestable Audits enclaves), while the **per-capture challenge-bound separation lattice + explicit overclaim rejection** remain differentiated; → 9.0 contingent on the closeout crosswalk confirming neither OVERT Profile nor Attestable Audits computes an equivalent per-artifact producer/verifier separation value |
| Frontier           | **8.3** | 9.3 | real foreign rung-1 capture (Lane C); +Lane C-reflexive (D); → 9.5 real keyless-Sigstore rung-2 |
| Good-for-Anthropic | **8.8** | 9.3 | external usability evidence; Anchored-Subject Diversity surfaces monoculture (A); a careful **OVERT crosswalk + optional CAP-SRP receipt export** positions VFC as complementary to emerging standards (aligning beats competing) |
| Constitution       | **9.3** | 9.4 | strict defaults + signed non-claims shipped; VPC lets a challenger contest the anchored subject |

*"Good-for-Anthropic" describes potential assurance usefulness and does not imply Anthropic review,
adoption, or endorsement.*

### Module map (one responsibility each; single owner per code)
```text
stage4h/exitCodes.mjs      MODIFY: VFC_RAW_CODES 283–299, the 4 arrays, RUN_LEVEL_BY_RAW 283–299=1
stage5g/constants.mjs      re-export codes; RUNG enum + rungGte; ANCHOR_TYPES{none,sigstore_oidc};
                            domain separators; VFC_SCHEMAS; VFC_RESERVED_SLOTS
stage5g/core/
  schema.mjs → 283           attestationTrust.mjs → 284         challengeReceipt.mjs → 285
  producerTranscript.mjs → 286–287   captureDigest.mjs → 288    keySeparation.mjs → 289
  challengeBinding.mjs → 290–291     subjectSeparation.mjs → 292  anchorBinding.mjs → 293–295
  rungLattice.mjs → consumes verified predicates → proven_rung   overclaim.mjs → 296
  census.mjs → 297           policy.mjs → 298                    campaignOutcome.mjs → campaign enum
  diversity.mjs → Anchored-Subject Diversity Index (Invention A, projection over verified data)
  signatures.mjs → low-level Ed25519 / PEM→fingerprint utility ONLY (owns no policy)
  vfcCore.mjs → evaluateForeignCapture / …Safe (throws → 299)
stage5g/node/
  issue-vfc-challenge.mjs   verify-vfc-challenge.mjs   build-vfc-evidence.mjs
  verify-vfc-attestation.mjs (CLI: --tier --attestation-only --min-rung --dir --verifier-pin --trust-root)
  sigstoreKernelRunner.mjs (vendored offline kernel; can't execute → 299)
stage5g/laneb/   ceremony.mjs   run-laneb-recompute-ceremony.mjs (sidecar receipt)
stage5g/lanec/   capture_pg2.py (single detector)   build-real-evidence.mjs
stage5g/foreign-capture-pack/  run.sh  verify-challenge.py  capture_pg2.py  sign-transcript.py
                               requirements.lock  README.md  OUTPUT_CONTRACT.md
stage5g/python/vfc_parity.py   independent digest + rung + Ed25519 (Sigstore = shared-kernel note)
stage5g/browser/  index.html  canonical-json.mjs  vfc-portable.mjs  (CSP no-egress)
proofs/stage5g/ForeignCapture.lean
tests/unit/llmShield/stage5g/  _validBundle.mjs (+resign) + suites: integrity/overclaim 283–297,
                               policy 298, env/throw 299; browserParity.test.js; K7 all-functions net
tests/unit/llmShield/stage4h/exitWrapper.test.js   MODIFY golden RUN_LEVEL_BY_RAW 283–299
scripts/reproduce-llm-shield-stage5g.sh            fail-closed, two-line gates, manifest byte-check
scripts/security-audit-llm-shield-stage3m.sh       ADD stage5g test-keys allowlist line
scripts/security-audit-llm-shield-stage3o.sh       ADD stage5g test-keys allowlist line
.prettierignore   ADD docs/research/llm-shield/evidence/stage-5g/ + tools/simurgh-attestation/stage5g/pin.json
docs/superpowers/plans/…, docs/research/llm-shield/STAGE_5G_CLOSEOUT.md, README banner
```

### Evidence-artifact map
```text
challenge-receipt.json  panel-plan.json  shared-corpus.json  detector-snapshot-manifest.json
producer-identity.json  producer-transcript.json  foreign-capture.json  capture-census.json
vfc-attestation.json  laneb-recompute-receipt.json  campaign-outcome.json
```
Config OUTSIDE the evidence dir, never a pack default: fixture trust config (Lane A) · release verifier
pin (`stage5g/pin.json`) · real external actor material.

### Sockets
**Mints:** `real_sigstore_anchor_execution_deferred`, `foreign_panel_capture_deferred`,
`dns_anchor_backend_deferred`, `undisclosed_rerun_detection_deferred`,
`reflexive_foreign_capture_execution_deferred`, `producer_affiliation_deferred` (→ VPC),
`overt_vfc_crosswalk_deferred` (determine which VFC evidence predicates could support particular OVERT
controls/profile requirements — **not** a rung→AAL equivalence),
`cap_srp_receipt_bridge_deferred` (an **export adapter** emitting CAP-SRP-style receipts — no core-schema change).
**Carries:** `live_endpoint_attestation_deferred`.
**Closeout crosswalk / comparison tasks (source-precision guard):** OVERT Protocol Profile 1.0 — does it
compute a per-artifact producer/verifier separation value? · "Attestable Audits" full text (openreview
o0wbWJnCb1) — enclave-rooted, compare trust model · arXiv 2606.26298 (independently-attested preconditions
from separate authoritative sources; accessible) · EU AI Act **Annex VI = conformity assessment based on
internal control** (provider self-verifies), primary = EUR-Lex Reg. (EU) 2024/1689.

---

## §5 — Gap hunt (wedge + prior-art kill-test, executed 2026-07-10)

**Kill-test result (revised after the OpenAI/lab sweep — honesty correction):** VFC is **not**
category-creating. A published open standard, **OVERT**, already defines graded assurance levels for
independent AI-runtime attestation. VFC's honest lane is narrower and still real: **an executable,
byte-reproducible, Lean-proved verifier for one specific property — the producer of _evaluation
evidence_ ≠ its verifier — with a concrete challenge-bound + Sigstore-anchored + overclaim-checked
mechanism, complementary to (and bridgeable to) OVERT/CAP-SRP.**

| Standard / effort | What it is | Relation to VFC |
| --- | --- | --- |
| **OVERT** (overt.is, open standard v1.1) | Broad runtime-governance attestation architecture + assurance framework. **AAL-1** policy documentation · **AAL-2** process records · **AAL-3** operator-controlled automated monitoring · **AAL-4** independently-verifiable cryptographic runtime evidence via an independent third-party trust architecture. Conformance is assessed **per control**, not as one global independence score. *"Self-attestation is not compliant."* **Protocol Profile 1.0 pins concrete machinery** (SHA-256, HMAC/HKDF, deterministic CBOR, Ed25519, BLS, closed schemas, domain separation, integer-safe canonicalisation). | **Closest neighbour.** Same independence thesis + graded levels + offline receipts, **and a pinned mechanism** (correction: OVERT is *not* mechanism-agnostic). But OVERT attests that **controls executed** across a governance surface, per control; VFC computes/enforces the **producer/verifier separation strength for one evaluation _capture_**. Overlapping ideas, **not identical objects**. A careful **crosswalk** is future work (`overt_vfc_crosswalk_deferred`) — **not** a direct rung→AAL mapping (rungs 0/1/2 are one separation dimension; AAL-1…4 are broader evidence classes, only AAL-4 being third-party cryptographic). |
| **CAP-SRP / VeritasChain** | Cryptographic proof of **refusal / non-generation** (signed events, hash-chain + Ed25519, optional Merkle/external anchor); EU AI Act Art. 12. | Different event family (generation requests + outcomes/refusals). A possible **receipt-export interoperability target** (`cap_srp_receipt_bridge_deferred`, an export adapter — not a core-schema change, and VFC does **not** claim CAP-SRP conformance). |
| **"Attestable Audits"** (openreview o0wbWJnCb1) | AI-safety benchmarks executed **inside hardware secure enclaves**, producing cryptographic proofs (sourced from the abstract). | Distinct trust root: enclave/hardware attestation vs VFC's **no-hardware-trust, offline byte-reproducible** verification. Full-text comparison task at closeout (does it compute a per-artifact producer/verifier separation value?). |
| **SLSA / in-toto** | *"there is no option but to trust the builder"*; L3 *"does not cover compromise of the build platform itself."* | No graded producer↔verifier separation — trusts the builder outright. |
| **RATS (IETF)** | Attester/Verifier/Relying-Party roles; independence is between **appraisal policies**, not a graded producer≠verifier proof. |
| **SCITT (IETF)** | *"An Issuer may be the owner or author… **or an independent third party**"* — undifferentiated. |
| **Sigstore / Fulcio** | VFC's rung-2 **anchor mechanism**, not a competitor. |

**Final positioning (the honest statement of record):**
> **VFC is not category-creating.** OVERT already defines a broad, tiered architecture for increasingly
> verifiable AI-runtime governance evidence, including independent third-party cryptographic attestation
> at AAL-4. VFC addresses a narrower object: the provenance of evaluation captures. It ships an
> executable, byte-reproducible and formally modelled verifier that computes the strongest
> producer/verifier separation rung supported by a particular capture and rejects unsupported upgrades.
> VFC is complementary to OVERT, Attestable Audits and CAP-SRP, but does not claim conformance or direct
> equivalence to their assurance levels or receipt models.

**What remains differentiated (contingent on the closeout crosswalk):** the specific per-capture
mechanism — precommitted challenge receipt → producer transcript → Sigstore-anchored rung →
**verifier-computed overclaim rejection (296)** — plus the **Anchoring Trilemma** (Invention B) and
**Anchored-Subject Diversity** (Invention A), and the executable + Lean + real-capture instantiation.
These remain differentiated *unless* the OVERT Protocol Profile or Attestable Audits is confirmed to
already compute an equivalent producer/verifier separation value per evaluation artifact.

**In-repo prior art (distinguished — VFC does not repeat these):**

| Prior stage | What it did | Why VFC is a different blade |
| --- | --- | --- |
| **3Y** third-party injection corpus | independently-**authored attacks** driven through real boundaries (external **input** provenance) | 3Y varies *who wrote the attack*; VFC types *who produced the evidence* vs *who verifies it* |
| **3O / 3P** BYO-gateway + threat model | a third-party **target** is a black box; `claim_conflict` catches "a target grades its own homework (claims contained, leaks)" via a **canary dual-signal** | 3O/3P detect a *lying target* by an independent observation; VFC proves *cryptographic producer≠verifier separation*, typed by strength — complementary, not the same mechanism |
| **5E / 5F** `byo_target` / `attester_provenance` | bind a foreign **detector identity** | in 5E/5F **we** still run and verify the capture; VFC proves a foreign **producer of the capture evidence** |
| **3W** witnessed release provenance | dual-root **OIDC/Sigstore witness** over **our own** release | VFC **reuses** 3W's OIDC/Sigstore machinery, applied to the **producer** identity of foreign evidence, and grades it by rung |

The kill-test therefore survives **in-repo** too: no prior Simurgh stage made the producer-of-the-evidence
≠ verifier separation a **typed, verifier-computed cryptographic rung**. VFC is first at that, here.

**Lab surface (provider-agnostic reading):** the public research surface (frontier red-team analysis,
interpretability, capability evals) publishes no *verifiable independent-evaluation primitive* — the
absence itself concedes the wedge; a recomputable evidence substrate for "who verified this claim" is
named as a direction, not shipped. *(Anthropic research index, read 2026-07-10.)*

**Regulation:** EU AI Act **Annex VI = conformity assessment based on internal control** — the provider
itself verifies its quality-management system, technical documentation, development process and
post-market monitoring (i.e. self-verification for most high-risk systems); the GPAI Code of Practice
asks for independent external evaluation but is **voluntary**; notified-body independence is an
accreditation status, not a per-attestation cryptographic artifact. Annex VI is a self-verification
*procedure*, **not** a legal requirement for producer/verifier separation. *(primary: EUR-Lex Reg. (EU)
2024/1689, Annex VI.)*

**Incidents in the wild:** Stanford HAI — *"…no major foundation model developers currently offer
comprehensive protections for third-party evaluation"*; Forbes (Jun 2026) — *"The Illusion of the Honor
System"*; and the honesty-validating finding — *"even when third-party evaluations occur, they can have
their own conflicts of interest… auditors want to retain large clients."* The world already knows
**"third party" ≠ "independent"** — which is exactly why VFC types the distinction.

**The wedge:** self-assessment regimes and much of the discourse treat producer-vs-grader as a
**binary** that everyone concedes leaks. VFC contributes a **per-capture, verifier-computed,
byte-reproducible separation-strength lattice with explicit overclaim rejection** — **not** category
creation (OVERT already frames tiered independent attestation), but the executable, formally-modelled
per-evaluation-artifact instantiation that the standards-level neighbours do not ship.

**Founder's ledger — one external actor + the single blocker:** the reproduction team that ran the 5F
pack on their droplet is the named actor; the single blocker to a real Lane C is running the
`foreign-capture-pack/` (PG2 on CPU — no GPU needed) under their own key.

**Sources:** OVERT standard v1.1 (overt.is) · CAP-SRP / VeritasChain (github.com/veritaschain/cap-srp) ·
"Attestable Audits" (openreview.net/forum?id=o0wbWJnCb1) · arXiv 2606.26298 (abs accessible) ·
SLSA verifying-artifacts · IETF RATS WG · SCITT architecture draft · Stanford HAI third-party-research
brief · Forbes honor-system · FLI AI Safety Index Summer 2025 · OpenAI external-testing / Preparedness
Framework v2 · EUR-Lex Reg. (EU) 2024/1689 Annex VI · Anthropic research index (read 2026-07-10).

---

## §6 — Beast inventions (all four folded in; each with its anti-gaming non-claim)

- **A — Anchored-Subject Diversity Index** (`core/diversity.mjs`; projection over verified
  `{proven_rung, producer_subject_digest}` across a campaign). Surfaces **producer monoculture** as a
  signed number. *Non-claim:* counts distinct **anchored subjects**, never distinct humans/orgs — one
  operator can hold many; diversity is an observation, not an independence score.
- **B — The Anchoring Trilemma** (**signed design observation, NOT a Lean theorem**). Under the assumption
  that "external anchor" needs a fresh online interaction at capture time, no rung achieves {offline
  producer, external anchor, no online-root trust at verify} simultaneously — the rung ceiling as a
  tradeoff. *Signed caveat:* pre-issued credentials (anchored offline, verified offline against a
  pre-committed root) can relax this, so it is an observation with stated assumptions, not a proof.
  *Non-claim:* a statement about evidence availability, not a security guarantee about
  Fulcio/Rekor.
- **C — The Homework Corpus** (named fixture family): `honor_system_self_graded` (→289),
  `notified_body_unanchored` (→296), `retained_auditor` (validly rung-2 yet the non-claim says ≠
  non-collusion) — self-grading failures drawn from the record.
- **D — Reflexive Mirror Capture** (Lane C-reflexive, §3). Simurgh's own release evidence gets a foreign
  rung-1 producer. *Non-claim:* reflexive attestation hits the same rung ceiling; it does not bootstrap
  independence we don't have. Execution moves Frontier/Constitution; a no-show is a signed campaign
  record + `reflexive_foreign_capture_execution_deferred`.
