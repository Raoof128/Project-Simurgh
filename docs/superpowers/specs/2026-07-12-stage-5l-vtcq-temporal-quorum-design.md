# Stage 5L — VTC-Q: Verifiable Temporal Commitment with Notary Quorum (design)

> Motto: **BoundarySafe first, then ReviewerSafe.** (Internal doctrine label: _AnthropicSafe first_.)
> Public wording stays provider-agnostic.
> Version **v2.47.0-stage-5l-vtcq** · raw codes **364–383** · branch `stage-5l-vtcq`.
> Arc: External Accountability — `VPC(5I) → VRC(5J) → VUC(5K) → **VTC-Q(5L)** → capstone`.

Thesis being extended: Simurgh is the independent, byte-reproducible VERIFICATION layer for
agent/oversight containment. Every stage adds ONE falsifiable blade. The moat is the Completeness
Invariant (no selective omission) plus academic depth. Honesty guardrail for this stage: "the evaluation
universe was externally committed under the required trust roots before reviewer access became
authorised, verifiably" — NEVER "the committed content was honest, the review adequate, or a human
actually reviewed it."

**What VTC-Q is, in one line.** It externally commits the full ceremony contract (the VUC universe root
plus the review-window, anchor, quorum, trust-domain and declared-release-surface policies) through a
bounded-time RFC-3161 authority AND a structurally distinct Bitcoin/OTS publication root, then makes
reviewer access **cryptographically impossible until that commitment verifies** — the ordering enforced
by a gate-issued capability every declared release must consume. **It does not decide whether the
committed content was honest or the review adequate.**

**The single proposition a hostile reviewer attacks:** _Did the declared temporal ceremony become
externally committed under the required trust roots before any access through the declared reviewer-
release surface became authorised?_ The TSA, the OTS proof and the start-gate are three witnesses to
that one proposition — not three inventions.

---

## §1 — Identity · laws · blade

### The wound

**Regulation — an ordering obligation with no recomputable proof.** The EU AI Act (Reg. (EU) 2024/1689),
Art. 16(f) with Art. 43, creates a legally significant _ordering_ requirement: the Article 43 conformity-
assessment procedure for a relevant high-risk AI system must occur **before** the system is placed on the
market or put into service. The Regulation does **not** prescribe a public, offline-recomputable
cryptographic artifact proving that ordering. VTC-Q explores such an evidence format. (This is a research
hypothesis about a format gap — not a claim that the Regulation mandates VTC-Q.)

**Incident — the backdated-evidence disease (primary-sourced).** SEC Release **34-92361** (2021):
an audit firm and CPAs added audit work papers **after** the PCAOB documentation-completion date and
**backdated** them to appear completed on or before the audit report date, to conceal deficiencies from
the SEC/PCAOB. This is exactly VTC-Q's wound — evidence whose _ordering_ relative to a report was
fabricated — with an enforcement order behind it. The AS 1215 documentation-completion date is the real-
world analogue of the committed review window. Fixture family: `backdated-workpaper` (named after the
real failure it makes impossible). _(SEC.gov blocks automated fetch; the release is human-openable at the
primary source; the fixture asserts the backdating PATTERN, not a specific figure.)_

**Prior-art seam.**

- **C2PA (2.4)** supports trusted RFC-3161 timestamping validated against a configurable TSA trust list —
  but does **not** natively require a heterogeneous Bitcoin+TSA publication quorum, nor make content
  release _consume_ a ceremony-derived capability.
- **in-toto (v1.0)** models ordered supply-chain steps, actor thresholds and signed link metadata. The
  stable specification does **not** natively define VTC-Q's _combined_ relation — a bounded-time
  authority AND a heterogeneous publication quorum AND per-release capability consumption over a censused
  reviewer-access surface. Similar workflows might be constructed through custom layouts and verification
  integrations.
- **OpenTimestamps** anchors to Bitcoin; multiple calendar servers improve submission availability but
  their proofs converge on the **same Bitcoin trust root**, so they must not count as independent quorum
  members (Law 6).

### The blade

> **Externally commit the full ceremony contract, then make reviewer access cryptographically impossible
> until that commitment verifies.**

A signed, offline-recomputable proof that the complete temporal ceremony contract — the VUC universe
root, review-window policy, anchor policy, quorum policy, trust-domain registry and declared reviewer-
access (release) surface — was committed through an RFC-3161 bounded-time authority and a structurally
distinct Bitcoin/OTS publication root before the system authorised access. The ordering is enforced by a
gate-issued capability required at every declared release endpoint.

### Predicate

```text
valid_temporal_precedence :=
  commitment_session_valid(vuc_root, campaign_id, all policy digests)   // 365
  ∧ both_anchors_bind_same_raw_bytes(commitment_digest_bytes)           // messageImprint == ots_leaf_digest
  ∧ tsa_token_valid(commitment_digest_bytes)                            // 366/367/368
  ∧ tsa_accuracy_resolved_from_precommitted_policy                      // 369
  ∧ tsa_upper_bound = genTime + resolved_accuracy
  ∧ ots_publication_valid(commitment_digest_bytes, committed_finality)  // 370
  ∧ finality_claimed_equals_computed                                    // 380
  ∧ trust_domains_distinct(ots, tsa)                                    // 371
  ∧ profile_floor_met(profile)                                          // 372
  ∧ committed_window_coherent                                           // 374
  ∧ review_access_authorisation_receipt_complete_and_valid             // 375
  ∧ start_capability_root_derived_from_verified_anchor_set             // 373
  ∧ every_declared_release_consumes_a_unique_valid_child_capability     // 376/377/378
  ∧ every_registered_trust_domain_has_one_typed_result                  // 379
```

Precedence is **structural** (the capability is a function of the verified anchors, so a release
consuming it cannot causally precede the commitment), not a self-asserted wall-clock compare. `genTime`
keeps a real job — an upper bound on when the commitment was made — usable only against an
independently-anchored external event, never a config integer.

### Assurance profiles (one blade, three computed states)

| Computed state         | Result                                                                                   | Rung                             |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| `vtc_core_valid`       | TSA valid, release causality enforced, OTS optional/pending                              | `challenge_bound`                |
| `vtc_quorum_pending`   | Quorum requested but Bitcoin inclusion/finality not yet satisfied                        | raw **372**, typed pending       |
| `vtc_quorum_confirmed` | TSA valid, Bitcoin proof confirmed under committed policy, distinct-domain threshold met | raw **0**, `externally_anchored` |

A pending OTS is **not** quorum — it is an honest unmet profile floor (372), never a success badge.
`externally_anchored` is reached **only** through a real, confirmed, upgraded `.ots` fixture. **OTS-only**
is inadmissible (no bounded-time authority → 372). A stage that ships before the confirmed fixture
reproduces raw 0 may honestly claim **VTC-Core**; it has not banked `externally_anchored`.

### Laws

1. **No Backdated Commitment** — both external proofs bind the exact committed ceremony root (raw bytes).
2. **No Post-Hoc Review Window** — window/anchor/quorum/trust-domain/release policy live inside the
   pre-anchor commitment.
3. **No Clock Shopping** — anchor types, TSA policy, trust roots, algorithms, accuracy source and
   thresholds are fixed before requesting either timestamp; unresolved accuracy fails closed.
4. **No Single-Root Precedence** — neither Bitcoin nor the TSA alone satisfies the Quorum profile.
5. **No Anchor Omission** — every registered quorum member appears as `valid`/`invalid`/`indeterminate`;
   silence is failure, not disappearance.
6. **No Independence Inflation** — several OTS calendars remain one Bitcoin root; several TSA endpoints
   chaining to one declared operator/root remain one TSA trust domain.
7. **No Temporal Release Bypass** — reviewer content cannot be released until a release consumes a unique
   valid child capability derived from the gate receipt that bound the validated quorum evidence.

### Signed honest core (here, not an appendix)

A heterogeneous quorum proves **bounded temporal precedence under declared trust domains and across the
declared, verifier-censused release surface.** It does not prove the committed content was honest, the
review was adequate, the notaries were globally independent, that a human actually reviewed the material,
or that no out-of-band copy existed. Capability binding is verified **structurally** — the attestation
does not prove the runtime gate enforced single-issuance. "Committed before authorised access, verifiably"
≠ "the review was right."

---

## §2 — Artifact · raw codes 364–383 · frozen check order

### Bundle `simurgh.vtcq.bundle.v1`

```jsonc
{
  "schema_version": "simurgh.vtcq.bundle.v1",
  "campaign_id": "...",
  "commitment_session_id": "sha256:...", // = "sha256:"+hex(commitment_digest_bytes); commitment_digest_bytes = SHA256(UTF8("simurgh.vtcq.commitment_session.v1")||0x00||UTF8(canonicalJson(commitment_payload)))
  "ceremony_id": "sha256:...", // POST-order display label ONLY: H_DS(commitment_session_id, tsa_token_digest, ots_proof_digest, receipt_digest)
  "vuc": {
    /* embedded, re-verified → vuc_root */
  },

  "ceremony_contract": {
    // = commitment_payload; commitment_session_id is its digest
    "review_window_policy_digest": "sha256:...",
    "anchor_policy_digest": "sha256:...", // PRECOMMITTED POLICY only (no block hash): {network, min_confirmations, accepted_checkpoint_witness_keys, checkpoint_evidence_schema, accepted_ots_operations, maximum_checkpoint_age}
    "quorum_policy_digest": "sha256:...", // profile + threshold + required_confirmed_publication, precommitted
    "trust_domain_registry_digest": "sha256:...",
    "declared_release_surface_digest": "sha256:...",
    "gate_identity_policy_digest": "sha256:...", // H_DS(gate_pubkey_fp, tsa_verifier_pubkey_fp) — committed so 375 detects gate-key substitution
  },

  "anchors": [
    {
      "anchor_type": "rfc3161_tsa",
      "trust_domain": "...",
      "token_der_ref": "...",
      "tsa_token_digest": "sha256:...",
      "cert_chain_ref": "...",
      "accuracy_source": "token|policy",
      "tsa_crypto_attestation": {
        "token_raw_digest": "sha256:...",
        "cert_chain_digest": "sha256:...",
        "status_evidence_digest": "sha256:...",
        "policy_digest": "sha256:...",
        "adapter_identity": "...",
        "adapter_version": "...",
        "computed_crypto_result": "valid|invalid|indeterminate",
        "sig": "...",
      },
      "verifier_result": null,
    }, // MUST be null on input (364 otherwise); the verifier derives it
    {
      "anchor_type": "bitcoin_ots",
      "trust_domain": "...",
      "ots_proof_ref": "...",
      "ots_proof_digest": "sha256:...",
      // POST-inclusion evidence — bound by the receipt, NOT by commitment_session_id (the block doesn't exist pre-anchor):
      "checkpoint_evidence": {
        "block_hash": "...",
        "block_height": 0,
        "block_merkle_root": "...",
        "observed_tip_height": 0,
        "observed_at_epoch_s": 0,
        "witness_key_fingerprint": "...",
        "signature": "...",
      },
      "verifier_result": null,
    },
  ],

  "review_access_authorisation_receipt": {
    "binds": [
      "commitment_session_id",
      "verified_anchor_set_digest",
      "checkpoint_evidence_digest",
      "quorum_policy_digest",
      "declared_release_surface_digest",
      "start_capability_root_digest",
    ],
    "start_capability_root_digest": "sha256:...", // H_DS.start(commitment_session_id, verified_anchor_set_digest, gate_public_key_fingerprint, issuance_nonce) — anchor-set, so Core (TSA-only) derives cleanly
    "gate_public_key_fingerprint": "...",
    "issuance_nonce": "...",
    "sig": "...", // NO private key material anywhere; issuance_nonce covered by sig
  },

  "declared_releases": [
    {
      "endpoint_id": "...",
      "release_ordinal": 0,
      "audience_digest": "sha256:...",
      "consumption_record": {
        "release_capability_digest": "sha256:...", // H_DS.release(root_digest, endpoint_id, release_ordinal, audience_digest, release_payload_digest)
        "release_payload_digest": "sha256:...",
        "sig": "...",
      },
    },
  ],

  "projections": {
    /* audit recompute → projection_root, 381 */
  },
  "reserved_slots": { "campaign_composition_root": null }, // 382 rejects non-null
  "signatures": { "sequencer": "...", "gate": "...", "tsa_verifier": "..." },
}
```

Hash constructions (pinned for parity — ONE commitment digest, domain-separated):

- `H_DS(tag, payload) = SHA256(UTF8(tag) || 0x00 || UTF8(canonicalJson(payload)))`.
- `commitment_preimage_bytes = UTF8("simurgh.vtcq.commitment_session.v1") || 0x00 || UTF8(canonicalJson(commitment_payload))`;
  `commitment_digest_bytes = SHA256(commitment_preimage_bytes)` (raw 32 bytes);
  `commitment_session_id = "sha256:" + hex(commitment_digest_bytes)`. Both anchors bind
  `commitment_digest_bytes` (TSA via digest-input mode; OTS stamps `commitment_preimage_bytes` or a
  pre-hashed digest — NEVER re-hashing). `commitment_payload` includes `gate_identity_policy_digest`.
- `verified_anchor_set_digest = H_DS("simurgh.vtcq.verified_anchor_set.v1", sorted valid anchor records)`;
  capability root `= H_DS("simurgh.vtcq.start_capability_root.v1", {commitment_session_id,
verified_anchor_set_digest, gate_public_key_fingerprint, issuance_nonce})`; child `= H_DS(
"simurgh.vtcq.release_capability.v1", {start_capability_root_digest, endpoint_id, release_ordinal,
audience_digest, release_payload_digest})` (distinct tags ⇒ no root↔child substitution).
- `release_slot_id = H_DS("simurgh.vtcq.release_slot.v1", {endpoint_id, release_ordinal})` — census key.
- Bitcoin `confirmed` is verified offline against the signed `checkpoint_evidence`: OTS Merkle path →
  `block_merkle_root`, `witness_key_fingerprint ∈ accepted_checkpoint_witness_keys`, signature valid, and
  `observed_tip_height - block_height + 1 ≥ min_confirmations`. No live Bitcoin node. Absent a witness, the
  honest state is `pinned_checkpoint_inclusion` (raw 372, never dressed as confirmed).
- All wall-clock values are **integer epoch seconds, UTC**; `accuracy` resolves to integer seconds rounded
  UP; comparisons integer-only, identical across JS/Python/browser.
- `ceremony_id` is **post-order only** — never inside `commitment_session_id`, either anchor input, the
  receipt, or capability derivation.

Config `simurgh.vtcq.config.v1` carries the precommitted policy only: accepted TSA roots/intermediate
fingerprints, policy OIDs, `id-kp-timeStamping` EKU requirement, ESSCertIDv2 rule, digest algs, accuracy
source, LTV policy, Bitcoin finality params, quorum profile + threshold + `required_confirmed_publication`;
`policy_digest` pinned out-of-band and cryptographically bound. **No `review_access_lower_bound`.**

### Raw codes 364–383 (ownership-disjoint)

| Code | Fires when                                                                                                                                                                                                   | Owns / boundary                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 364  | bundle/config malformed                                                                                                                                                                                      | schema belt, never throws                             |
| 365  | recomputed `commitment_session_id`/ceremony digests ≠ stored; a policy digest unbound                                                                                                                        | **any** committed-digest binding failure              |
| 366  | TSA token parse invalid (non-canonical DER)                                                                                                                                                                  | structural decode                                     |
| 367  | TSA CMS sig / pinned-fingerprint / EKU / policy-OID / ESSCertIDv2 invalid; adapter attestation `token_raw_digest` mismatch                                                                                   | crypto validity                                       |
| 368  | TSA cert invalid at `genTime`, or status evidence required by committed LTV policy absent/invalid                                                                                                            | temporal cert validity (policy-relative)              |
| 369  | `accuracy` unresolved from precommitted policy                                                                                                                                                               | fail-closed                                           |
| 370  | OTS proof / Merkle path / header / chain / checkpoint structurally invalid                                                                                                                                   | structural anchor (pending/confirmed sub-state)       |
| 380  | declared finality state ≠ computed state                                                                                                                                                                     | finality overclaim                                    |
| 371  | distinct anchor entries collapse to one declared trust domain                                                                                                                                                | inflation detector                                    |
| 372  | profile floor unmet: no bounded-time authority · required publication absent · threshold unmet · required-confirmed absent                                                                                   | pure arithmetic + profile                             |
| 374  | fires **iff NOT `window_coherent`**, where `window_coherent := window_open_not_before ≥ tsa_upper_bound ∧ window_close_after > window_open_not_before ∧ required_anchor_profile == committed_anchor_profile` | committed-window coherence (not the precedence proof) |
| 375  | **review-access receipt invalid:** required binding missing, gate signature invalid, signing-key fingerprint mismatched, or receipt context not bound to the committed ceremony                              | receipt identity + integrity                          |
| 373  | `start_capability_root` not derived from the verified anchor set                                                                                                                                             | structural precedence (runs after 375)                |
| 376  | capability malformed, not ceremony-bound, or duplicate child (`release_slot_id` collision / replay across a different `commitment_session_id`)                                                               | capability structure + child uniqueness               |
| 377  | a present declared release fails to bind a valid child capability                                                                                                                                            | record-level (No Temporal Release Bypass)             |
| 378  | release set incomplete/extra vs `declared_release_surface` (over `release_slot_id`)                                                                                                                          | set-level census                                      |
| 379  | a member of the committed trust-domain registry has no typed result (silence ≠ indeterminate)                                                                                                                | anchor omission (bounded registry)                    |
| 381  | audit projection mismatch                                                                                                                                                                                    | _audit-only_                                          |
| 382  | `campaign_composition_root` non-null                                                                                                                                                                         | _policy_                                              |
| 383  | wrapper fail-closed (internal/env)                                                                                                                                                                           | _last_                                                |

### Frozen first-failure spine

```text
364 schema → makeCtx → 365 bindings → 366 TSA-parse → 367 TSA-crypto/identity
→ 368 validity+committed-LTV → 369 accuracy → 370 OTS-structural → 380 finality-claimed-vs-computed
→ 371 domain-dedup → 372 profile-floor → 374 window-coherence → 375 receipt-valid
→ 373 capability-derivation → 376 capability-structure+child-uniqueness → 377 release child-binding
→ 378 release-census → 379 anchor-census → [audit] 381 → 382 policy → 383 wrapper
```

Partition: public `364–380` · audit `381` · policy `382` · wrapper `383`; all `RUN_LEVEL_BY_RAW = 1`.
Pure core is injected `facts` (the 5I/5K B11 pattern): the node adapter verifies Ed25519, runs RFC-3161
CMS/X.509 verification, resolves the two anchor states, and hands booleans in. Schema (364) runs before
`makeCtx` so a malformed bundle is 364, never a 383 throw.

---

## §3 — Evidence lanes · two-tier attestation · parity

### Four lanes

| Lane                      | What                                                                                                                                                                                                                                                                                                                                    | Gate                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **A** — byte-stable CI    | STUB-facts logic bundles; fixtures assert their raw code: `core-positive → 0`, `quorum-pending-typed → 372`, `quorum-confirmed-stub → 0` (injected `otsFinality:confirmed` — NEVER publishable as `externally_anchored` proof), `false-confirmed-over-pending → 380`, **`rsp-prerequisite-gate → 0` (I1)**. Full tamper matrix 364–383. | CI-gated                    |
| **B** — real capture      | Genuine RFC-3161 token from DigiCert (normative) over the real `commitment_digest_bytes`; real OTS stamp + signed `checkpoint_evidence`. Offline re-verify. **The ONLY source of the real `quorum-confirmed` evidence** (`externally_anchored` claimed only here). FreeTSA as interop/adversarial fixture.                              | not CI-gated                |
| **C** — live adversarial  | Fable-5-style producer attempts backdating, favourable-clock selection, anchor omission, window rewrite, stale-anchor replay → sealed as trophies (373/374/375/377/378/379/380 fire); CVP-covered.                                                                                                                                      | digest-only, never CI-gated |
| **D** — independent party | External party runs the ceremony with **its own gate/sequencer/TSA-verifier keys** and its own TSA+OTS paths → distinct-key reproduction + de-identified witness (the distinct-key independence VUC's verify-only Lane C could not provide).                                                                                            | digest-only                 |

### Release sequence (banks `externally_anchored` honestly)

1. Capture the deterministic ceremony root (`commitment_digest_bytes`).
2. Obtain the RFC-3161 token and the initial OTS proof; record `finality=pending`.
3. Reproduce `vtc_quorum_pending → raw 372` (honest floor miss).
4. Wait for Bitcoin confirmation under the committed policy.
5. Upgrade and freeze the `.ots` fixture.
6. Reproduce `vtc_quorum_confirmed → raw 0` (`externally_anchored`).
7. Tag Stage 5L. **Shipping before step 6 claims VTC-Core only.**

### Two-tier attestation (5K pattern, `audit ⟹ public`)

- **public** (`simurgh.vtcq.public_attestation.v1`): ceremony structure — `commitment_session_id`, quorum
  profile, anchor types + trust domains, finality **sub-state**, capability→anchor binding. Never certifies
  censuses/projections.
- **audit** (`simurgh.vtcq.audit_attestation.v1`): binds public digest + `projection_root` + computed
  quorum/finality state under the same context + `policy_digest`.
- **SCITT projection bridge (I3)** — `simurgh.vtcq.scitt_statement.v1`, named `scitt_projection_candidate`:
  a signed projection of the public attestation (subject = `commitment_session_id`), **SCITT-INSPIRED, NOT
  an RFC 9943-conforming Signed Statement** (RFC 9943, Jun 2026, mandates COSE_Sign1/CBOR; this emitter is
  JSON — a conforming COSE/CBOR projection + pinned media type is deferred). Like the prior in-toto/C2PA
  bridges — a projection of already-signed data, no new crypto path. Honest bound: a SCITT receipt proves
  append-only registration at a point in time, **not** global honesty; the bridge emits, it does not
  register.

### Parity + crypto architecture

Pure deterministic core is parity-checked across Node ↔ Python ↔ browser: canonical-JSON, `H_DS`, TSTInfo
**field decode** (`messageImprint`/`genTime`/`accuracy`/`policyOID`), all binding checks, structural
precedence (373), dedup + threshold (371/372), census arithmetic over `release_slot_id` (377/378/379).

Full RFC-3161 CMS/X.509 verification runs in the **normative Node + Python adapter, OpenSSL-backed
(`openssl ts -verify`) or a vetted dependency — not a handwritten CMS parser.** `openssl ts -verify` alone
is not the whole LTV verifier; the adapter separately enforces `certificate_valid_at_genTime`,
`status_evidence_required_by_policy`, `status_evidence_digest_bound`, `policy_OID_allowed`,
`timestamping_EKU_present`, `ESSCertIDv2_binding_valid`. Custom code extracts only the fields above. The
crypto result is a signed `tsa_crypto_attestation`.

**Browser tier — labelled honestly.** It pins `tsa_verifier_public_key_fingerprint`, `adapter_identity`,
`adapter_version`, `token_raw_digest`, `cert_chain_digest`, `status_evidence_digest`, `policy_digest`,
`computed_crypto_result`, and verifies structure + the adapter attestation. Its claim is
**"adapter-attestation and structural binding verified"** — NOT "RFC-3161 independently verified
in-browser." Reviewer pack ships an `openssl ts -verify` path for independent corroboration.

---

## §4 — Lean · K7 · limitations · wedge · scorecard

### Lean (`proofs/stage5l/`, v4.15.0)

Zero `sorry`, **no user axioms; collision resistance and `HashInjectiveOn` are explicit theorem
hypotheses, never global axioms.**

| Theorem                                                                       | Guarantee                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `acceptedAnchorsBindCommittedPolicySet`                                       | accept ⟹ recomputed session id = stored ∧ both anchor imprints = `commitment_digest_bytes` ⟹ the committed policy set was bound by the anchors                                                                                                                                                                                                                                     |
| `messageImprintBindsRawBytes`                                                 | accept ⟹ `tsa.messageImprint.hashedMessage = commitment_digest_bytes = ots_leaf_digest` (raw 32 bytes)                                                                                                                                                                                                                                                                             |
| `boundedAuthorityFloor`                                                       | accept ⟹ ≥1 valid bounded-time authority; OTS-only inadmissible                                                                                                                                                                                                                                                                                                                    |
| `quorumRequiresConfirmedDistinctRoots`                                        | `vtc_quorum_confirmed` raw 0 ⟹ ≥threshold distinct committed domains ∧ confirmed publication; pending ⟹ 372                                                                                                                                                                                                                                                                        |
| `confirmedRequiresPolicyEvidence`                                             | declared `confirmed` accepted ⟹ computed confirmed under committed policy; pending cannot upgrade without evidence (reorg-aware)                                                                                                                                                                                                                                                   |
| `receiptCompleteBeforeCapability`                                             | capability derivation defined ⟹ receipt complete and valid (375 before 373)                                                                                                                                                                                                                                                                                                        |
| `acceptedReleaseImpliesVerifiedAnchorSet`                                     | protocol-enforced ordering, not physical causality: for every release on the declared, censused surface, acceptance ⟹ the gate receipt bound the exact anchor artifacts that independently passed the committed policies. Hyps: `valid_tsa_anchor`, `valid_ots_anchor`, `valid_gate_signature`, `gate_policy_requires_verified_anchors`, `release_consumes_valid_child_capability` |
| `childCapabilityInputsDistinct` (+ `childCapabilityDistinctUnderNoCollision`) | distinct `(endpoint_id, release_ordinal)` ⟹ distinct inputs (structural); distinct outputs only under `HashInjectiveOn encoded_release_capability_inputs`                                                                                                                                                                                                                          |
| `releaseCensusBijection`                                                      | over `release_slot_id`: declared surface ↔ consumption records is a bijection over unique slots                                                                                                                                                                                                                                                                                    |
| `anchorOmissionTotality`                                                      | every member of the committed trust-domain registry has exactly one typed result (bounded totality — not across unknown external notaries)                                                                                                                                                                                                                                         |
| `capabilityDomainSeparation`                                                  | distinct root/child domain tags ⟹ no substitution under an explicit no-cross-domain-collision hypothesis                                                                                                                                                                                                                                                                           |
| `auditImpliesPublic`                                                          | audit valid ⟹ public valid under same context + `policy_digest`                                                                                                                                                                                                                                                                                                                    |
| `temporalCompletenessNoHiddenGap` **(I2)**                                    | accept ⟹ every declared event in the `commit → anchor → gate → release` timeline is anchored and censused; no gap in the declared timeline can be hidden (extends the Completeness Invariant into time; over the _declared_ timeline only)                                                                                                                                         |

### K7 all-functions net (MANDATORY before tag)

Every export invoked · **tamper matrix: each raw 364–383 uniquely reachable** (a fixture firing exactly
that code, no earlier), asserting the frozen spine · the three computed states + `false-confirmed-over-
pending → 380` · **four mandatory attacks, each reaching its own raw (not swallowed by 365):**
`gate-key substitution → 375` (vs the committed `gate_identity_policy_digest`), `child-capability replay
across a different commitment_session_id → 376`, `TSA adapter-attestation with swapped token_raw_digest →
367`, `confirmed Bitcoin proof under wrong chain/checkpoint policy → 370 (before 380)` · cross-stage:
embedded VUC `vuc_root` re-verified, **5I/5J/5K reproduce
scripts undisturbed** · parity: Node/Python/browser pure-core agreement on a shared vector, browser tier
verifies the adapter attestation (labelled) · two-tier: public never certifies projections, `audit ⟹
public` · profile matrix: OTS-only rejected · Core · Quorum-pending(372) · Quorum-confirmed(0).

### Signed limitations

Declared-release-surface only (no out-of-band copy/side-channel) · declared trust-domains (not proven-
globally-independent operators) · capability binding structural, not runtime single-issuance · `genTime`
trusts the TSA (declared assumption) · **browser verifies adapter-attestation + structure, not the
RFC-3161 token independently** · `externally_anchored` only at confirmed Bitcoin finality under committed
policy — pre-confirmation is VTC-Core · TSA LTV is policy-relative (not a universal package) · proves
commit-before-authorised-access, not honest content / adequate review / a human read it.

### Wedge (source-precise)

- **EU AI Act (Reg. 2024/1689, Art. 16(f)/43):** a legally significant ordering requirement — Art. 43
  conformity assessment before a high-risk system is placed on the market / put into service — with **no**
  prescribed public, offline-recomputable cryptographic artifact proving that ordering. VTC-Q explores
  such a format.
- **C2PA (2.4):** trusted RFC-3161 timestamping against a configurable TSA trust list, but no native
  heterogeneous Bitcoin+TSA quorum and no release-consumes-capability edge.
- **in-toto (v1.0):** ordered steps + actor thresholds + signed links; the stable spec does not natively
  define VTC-Q's combined relation. Similar workflows might be built via custom layouts.
- **Anthropic RSP (I1, primary-sourced; current version v3.4, updated 2026-07-08; the prerequisite-gate
  rule is stable since v3.0):** capability/safety evaluations must occur **"before deployment"** as a
  **"prerequisite gate"**; **Risk Reports are published _in advance of_ deployment**; **the Responsible
  Scaling Officer must approve deployment decisions.** This is VTC-Q's
  structure in prose — RSO-approval = `review_access_authorisation_receipt`, risk-report-before-deploy =
  commit-before-release ordering. The `rsp-prerequisite-gate` fixture family makes that ordering
  recomputable. Concrete pre-deployment artifacts whose commit-before-deploy ordering VTC-Q applies to
  (from anthropic.com/research): a dual-use-knowledge "off switch" (pre-deployment intervention), Frontier
  Red Team capability evaluations (N-day exploits, cyber-threat mapping). Honest bound: models the RSP
  _ordering_ commitment; does not audit the Risk Report's content, the evaluation's adequacy, nor whether
  the declared universe covered internal signals (e.g. a model's non-verbalised "global workspace") —
  that adequacy question is exactly what the VUC→VTC-Q arc defers and never claims.
- **Founder's ledger** — concrete actors who could run the verifier tomorrow: an EU AI Act **notified
  body / conformity assessor**, or a lab **Responsible Scaling Officer** binding the RSP prerequisite gate;
  single blocker: producers don't yet emit the ceremony bundle.
- **IETF SCITT (now RFC 9943, Jun 2026, I3):** a Transparency Service issues receipts proving a claim was
  registered at a point in time — VTC-Q emits a `scitt_projection_candidate` (the SCITT-inspired bridge
  above; a conforming COSE/CBOR Signed Statement is deferred); the standards-track surface is the
  distribution channel, and a SCITT receipt as a _third_ trust ecology is minted as `third_trust_ecology`
  (I5).
- **`candidate_first_at` (confirmed against the swept surface, not an exhaustive literature proof):**
  across Anthropic's transparency/third-party-testing hub, CAISI + UK AISI pre-deployment evaluation,
  C2PA 2.4, in-toto v1.0, OpenTimestamps and RFC 9162 CT, **no verifier-enforced heterogeneous temporal
  quorum with a per-release capability-consumption edge exists.** Anthropic advocates "rigorous pre-launch
  evaluations… which allows experts and the public to verify safety claims" — an ordering obligation with
  no recomputable artifact; VTC-Q supplies the format. _Adjacent prior art (does not collide):_ Merkle
  inclusion/exclusion ZK (e.g. CoSMeTIC, arXiv 2601.12136) and frontier-framework evaluations (arXiv
  2512.01166) — neither defines the temporal-quorum + release-gate relation. Novelty stays **9.0** (a
  citable formal treatment moves it higher).

### Four-axis scorecard (internal, spec-time self-assessment — re-scored after beast-mode I1/I2/I3)

| Axis                   | Score                       | What moves it higher                                                                                                                                                                                                                           |
| ---------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            | **9.2** (was 9.0)           | +`temporalCompletenessNoHiddenGap` (I2, new theorem class extending the moat into time) + SCITT bridge (I3). → build I4 (VDF minimum-review-duration) or I5 (3-ecology quorum) for 9.5                                                         |
| **Frontier**           | **9.0** (+0.5 **UNBANKED**) | banks toward 9.5 when `vtc_quorum_confirmed` reproduces raw 0 over a real upgraded `.ots` **+** live Lane C-adv **+** independent Lane D; **I5 (third_trust_ecology)** is the boldest lever (first 3-ecology heterogeneous eval-timing quorum) |
| **Good-for-Anthropic** | **9.6** (was 9.4)           | +I1: binds the specific, primary-sourced **RSP** prerequisite-gate (RSO approval + risk-report-before-deploy; current v3.4, rule stable since v3.0) as recomputable; names the RSO as a concrete actor; SCITT standards-track distribution     |
| **Constitution**       | **9.6** (was 9.4)           | +I2 makes the temporal-completeness property machine-checkable; makes an RSP-clause ordering machine-checkable; every claim carries a signed bound; zero model-safety overclaim                                                                |

### Signed non-claims for the folded inventions

- **I1** models the RSP _ordering_ commitment as recomputable; does NOT audit the Risk Report's content or the evaluation's adequacy.
- **I2** temporal completeness is over the _declared_ timeline only (no out-of-band event).
- **I3** a SCITT receipt proves append-only registration at a point in time, NOT global honesty; the bridge emits a Statement, it does not register it.

### Ledger

```text
review_window_binding          → PAID (temporal precedence)
externally_anchored (rung)     → FIRST VERIFIER-ENFORCED REACH at vtc_quorum_confirmed
campaign_composition_root      → OPEN for capstone
minimum_elapsed_review_binding → MINTED (I4 — VDF minimum-review-duration; "No Instant Review"; new blade)
third_trust_ecology            → MINTED (I5 — TSA + Bitcoin + transparency-log/SCITT quorum; "No Single Ecology")
hiding_scope_commitment        → MINTED (I6 — binding+hiding universe commitment; AnthropicSafe structural egress)
```

Socket discipline: VTC-Q pays one (`review_window_binding`), reaches one rung (`externally_anchored`), and
mints three named debts pointing at the capstone and the two bold next blades (I4, I5). Minting three while
paying one is acceptable ONLY because each minted socket is a falsifiable, buildable blade with a named
mechanism — not a vision placeholder.
