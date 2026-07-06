# Stage 4R — Private Custody Corroboration Ceremony (PCCC)

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Date:** 2026-07-06
- **Status:** DESIGN — approved section-by-section; implementation follows the
  written plan, not this doc alone. AMENDED 2026-07-06 (same day, approved):
  Amendment 1 pays the DLEQ debt in-stage (§3.5); Amendment 2 adds the window
  match census (§8.5); Amendment 3 ships the BYO-Operator Kit (§8.6); CERA
  staged for closeout (§8.7).
- **Subtitle:** Two-operator curve25519 match ceremony with no public herd
  token.
- **Roadmap position:** 4R pays 4P's signed
  `private_custody_corroboration_deferred` non-claim (the VOPRF/PSI private
  matching upgrade) and consumes 4Q VFR receipts to gate the EXPORT of match
  results. Aims at the VDCC banner (`NORTH_STAR_VDCC.md`). Raw codes 90–99;
  next stage starts at 100.
- **Branch discipline:** spec and all stage work live on `stage-4r-pccc`,
  never local `main` (4O rebase-merge lesson).
- **Version target:** `v2.27.0-stage-4r-pccc` (re-check
  `git tag --sort=-creatordate` before tagging).

---

## 1. Stage claim and law

### 1.1 Main claim

> Two independent operators can corroborate shared custody-class membership
> without publishing a window-independent, linkable herd token.

### 1.2 The No Public Herd Token Law

> Shared custody-class agreement may be checked, but no reusable public token
> exists that links operators across windows, epochs, or unrelated ceremonies.

The law holds cryptographically (epoch-bound transcripts, no raw exports),
not by policy. Core predicate: `no_public_custody_class_digest_emitted`.

### 1.3 One blade

The match is real crypto; the herd token provably never exists. Everything
else composes shipped machinery: 4P custody classes and disclosure budget,
4N window anchor as epoch, 4Q VFR receipts at the export boundary, 4L
cardinality discipline lifted to match slots.

### 1.4 Naming (reviewer-safe, frozen)

> **PCCC Real-DDH Curve25519 Match Core (Edwards form), DLEQ-verified, with
> epoch-bound unlinkability.**

Never "full VOPRF", never "RFC-9380 compliant hash-to-curve", never
"RFC 9497". (Amendment 1 renamed from "X25519 Match Core": the sigma
protocol needs group access the clamped X25519 API cannot give — §3.5. The
group is unchanged; only the coordinate form is Edwards.)

## 2. Non-claims and signed limitations

### 2.1 Non-claims (early, not buried; signed into the bundle)

```text
not_an_identity_matching_system
not_a_public_membership_registry
not_full_voprf_or_rfc9380_claim
not_a_physical_time_claim
not_proof_of_human_deliberation
not_proof_of_operator_independence_beyond_process_and_key_separation
not_cross_epoch_linkability_claim
```

### 2.2 known_limitations (3U pattern — signed in ink, not footnoted)

The original design carried three deferral pellets
(`transcript_verification_is_cross_attestation_not_dleq_proof`,
`colluding_operators_can_fabricate_match_without_dleq`,
`dleq_or_voprf_upgrade_deferred_to_4r_x`). Amendment 1 (§3.5) PAYS that
debt in-stage — superseded same day, recorded here, never silently deleted.
The signed set is now:

```text
public_tier_remains_digest_level_by_design
dleq_is_fiat_shamir_random_oracle_model
curve_arithmetic_is_reference_grade_not_constant_time
not_a_voprf_rfc9497_protocol
cross_org_operator_b_not_yet_exercised
```

With valid DLEQ proofs the audit tier verifies the ceremony UNILATERALLY: a
single liar dies at commit-reveal, and a colluding pair can no longer
fabricate a match — a fabricated `z` has no valid proof (§6.3).

## 3. Normative match core contract (frozen)

### 3.1 Core shape

```text
Hc = H_to_curve_point("simurgh.pccc.class.v1", epoch, custody_class_digest)

Party A:  mA = a·Hc
Party B:  mB = b·Hc

A computes:  zA = a·mB
B computes:  zB = b·mA

MATCH ⇔ H("simurgh.pccc.match.v1", epoch, pair_id, zA)
      = H("simurgh.pccc.match.v1", epoch, pair_id, zB)
```

Group operations run on an in-repo Edwards25519 REFERENCE implementation
(pure BigInt JS + pure Python, ~200 lines each, ZERO new dependencies),
cross-validated against RFC 8032 test vectors and Node core Ed25519 (§14).
Amendment 1 moved the core off the X25519 API: the clamped X25519 interface
exposes scalar-mult only, which blocks the Chaum-Pedersen sigma protocol;
the group is unchanged (curve25519), only the coordinate form is Edwards.
Feasibility probed 2026-07-06 twice: X25519 double-masking (commutes,
deterministic, nonzero) and pure-BigInt Edwards DLEQ (honest proof
verifies, forged mask rejected, z-line proof verifies, 42 ms for three
prove+verify cycles).

### 3.2 Hard locks

1. **Ephemeral scalars per match window.** No scalar reuse. Lane B scalars
   are never written to disk and die with the process. Lane A uses committed
   `INSECURE_FIXTURE_ONLY` scalars as a labelled exception (§9.1).
2. **Epoch-bound class point.** `epoch = stage4n_window_anchor_digest` —
   the 4N heartbeat anchor, verbatim. No second clock. The same custody class
   in another epoch never produces the same public material.
3. **Reject all-zero outputs.** RFC 7748 small-order/all-zero edge cases fail
   closed at raw 94 before any token is formed.
4. **Never export raw `mA`, `mB`, `z`.** Public evidence carries only:
   `match` bool, `epoch`, `pair_id_hash`, `pair_match_commitment`, operator
   signatures, transcript hash, machine-readable non-claims.

### 3.3 Commit-before-reveal (mandatory phase ceremony)

Token comparison without commitments would let a dishonest party copy the
peer's revealed token. The ceremony therefore has four normative phases:

```text
Phase 1: signed masks exchanged
Phase 2: signed token commitments exchanged
Phase 3: token openings revealed
Phase 4: tokens compared and transcript signed
```

```text
token_commitment =
  H("simurgh.pccc.token_commit.v1",
    epoch, run_id, pair_id, role, peer_mask_digest, token, token_nonce)
```

The verifier checks: each commitment opens correctly; commitment order
precedes token reveal; both commitments bind role + peer mask digest.
Phase failures are raw 90 subreasons (§6.2) — zero new codes.

### 3.4 Derived identifiers

```text
pair_id               = H("simurgh.pccc.pair.v1", epoch, sorted_operator_key_digests)
pair_match_commitment = H("simurgh.pccc.match_commit.v1", epoch, pair_id, match, transcript_digest)
ephemeral_scalar_public_digest
                      = H("simurgh.pccc.ephemeral_pub.v1", epoch, role, a·G)
```

`epoch` sits inside `pair_id`, and `pair_id` sits inside the token domain,
so: **no cross-epoch herd token, and no cross-pair same-epoch herd token.**
Two pairs sharing a custody class in the same epoch still produce unequal
tokens. `ephemeral_scalar_public_digest` is verifier-only sealed-packet
material (§5.3), never public.

### 3.5 DLEQ proofs — the debt paid in-stage (Amendment 1)

Each operator attaches TWO Chaum-Pedersen DLEQ proofs to the sealed audit
packet (never the public bundle):

```text
DLEQ_mask: log_G(epk) == log_Hc(mask)        same scalar built my mask
DLEQ_z:    log_G(epk) == log_peer_mask(z)    same scalar built my z
```

Non-interactive via Fiat-Shamir: SHA-512 challenge under domain
`"simurgh.pccc.dleq.v1"`, binding
`{G, relation base point, epk, target point, R1, R2, epoch, run_id,
pair_id, role}`. The audit verifier checks both proofs per operator,
recomputes both tokens from the packet-carried `z` values, and decides
match/non-match UNILATERALLY. Consequences:

- a fabricated `z` has no valid `DLEQ_z` → raw 93 subreason (§6.3);
- `z` moves INTO the sealed packet (§5.3) — still never public, still
  epoch-bound;
- prover-side scalar arithmetic is reference-grade BigInt, not constant
  time — railed; acceptable because the prover is our own operator process
  and the verifier touches packet/public values only.

## 4. Architecture

```text
Lane A (deterministic corpus)          Lane B (live ceremony)
─────────────────────────────          ──────────────────────
fixture custody-class corpus           operator-a process        operator-b process
(committed 4P evidence classes         (own ephemeral scalar     (own ephemeral scalar
 + synthetic multi-op classes)          + own Ed25519 identity)   + own Ed25519 identity)
        │                                     └── localhost mask exchange ──┘
        ▼                                                  │
pcccCore (pure): hash-to-point ─ double-mask ─ DLEQ ─ commit/reveal ─ token ─ transcript
        │                                                  │
        ▼                                                  ▼
   match records                              signed ceremony capture
        └──────────────┬───────────────────────────────────┘
                       ▼
        VFR export gate (real 4Q receipt bound to the export crossing)
                       ▼
        public evidence bundle (digest-level)  +  sealed audit packet
                       ▼
        offline verifier (two-tier) + signed PCCC attestation
```

### 4.1 Match universe

The committed 4P custody-class digests (entropy-floor-passing only; the 4P
entropy floor and disclosure-budget rules import unchanged) plus synthetic
classes engineered for known-match, known-non-match, and liar arms.

### 4.2 Export boundary (friction gates export, not matching)

Computing a match writes nothing public. The only path into the public
bundle crosses the VFR gate: a real `simurgh.vfr_approval_receipt` (4Q
schema, unmodified) bound to the export action, `pair_match_commitment`,
boundary kind, 4N window, and run id, passing the full 4Q pincer. No receipt
or a pincer-failing receipt → raw 98, fail closed, ledgered refusal as
expected-GREEN evidence.

**Raw-98 lock:** a refused export leaves NO `pccc_match_record` in the
public bundle. The refusal is ledgered inside `ceremony_capture` /
attestation evidence only. The gate must never publish what it refused.

**Approver key separation (4Q pincer + one extra tooth):** the VFR approver
key must be distinct — compared by public-key digest, not label — from ALL
of: `operator_a_identity_key`, `operator_b_identity_key`,
`ceremony_harness_key`, `attestation_signing_key`. Neither matching party
can self-approve the export crossing.

### 4.3 Two-tier verification (honesty split)

- **Public tier** verifies the disclosure record: schema, signatures, epoch
  binding, digest commitments, herd-token scan, VFR receipt. Digest-level
  BY DESIGN — signed as `public_tier_remains_digest_level_by_design`.
- **Audit tier** verifies the ceremony from the sealed transcript packet
  UNILATERALLY (Amendment 1): phase order, commitment openings, both DLEQ
  proofs per operator (§3.5), token recomputation from packet `z` values,
  token equality/inequality, all-zero rejection, absence of raw mask/z
  material in PUBLIC evidence, ephemeral public-key digest ledger. Never
  sees a raw scalar.

A single liar is caught at commit-reveal (raw 90 opening subreason, raw 92,
raw 93); a colluding pair cannot fabricate a match without producing a
valid DLEQ over a false relation — excluded up to Fiat-Shamir/ROM
assumptions, which are signed in §2.2.

## 5. Schemas (seven, versioned; commitments/openings embedded)

### 5.1 The seven

1. `simurgh.pccc_mask_message.v1` — Phase 1, per class-slot:
   `{epoch, run_id, pair_id, role, slot_index, mask_point, operator_signature}`.
   Never names the custody class.
2. `simurgh.pccc_match_transcript.v1` — the ceremony record embedding all
   four phases with per-phase domain tags: commitment objects (§3.3),
   opening objects `{token, token_nonce}`, `match` bool, normative
   phase-order vector, both operator signatures over the whole transcript.
3. `simurgh.pccc_match_record.v1` — the ONLY public export shape:
   `{match, epoch, pair_id_hash, pair_match_commitment, transcript_digest,
vfr_receipt_digest, respondent_notice_hash, contest_pointer_hash,
matched_against_operator_commitment, contest_route_available,
signatures}`. Non-matches export under the identical schema.
4. `simurgh.pccc_ceremony_capture.v1` — Lane B roll-up: privacy-clean
   process metadata (§10.3), key digests, per-slot transcript digests, slot
   cardinality commitment (§8.1), ledgered refusals, the VFR crossing.
5. `simurgh.pccc_attestation.v1` — signs canonicalJson of the full run set
   (4P two-stage digest pattern). Carries as first-class fields:

```text
lane_a_verification_kind: "deterministic_replay_with_fixture_scalars"
lane_b_verification_kind: "two_party_ceremony_dleq_audit_verified"
verification_packet_kind: "sealed_transcript_packet_for_offline_verifier"
window_match_census:      { epoch, matches, non_matches, refusals }   (§8.5)
```

6. `simurgh.pccc_dleq_proof.v1` — sealed-packet member (§3.5):
   `{relation_kind: "mask" | "z", epoch, run_id, pair_id, role, R1, R2, s}`.
   Never appears in the public bundle.
7. `simurgh.pccc_operator_invitation.v1` — BYO-Operator Kit contract
   (§8.6): a signed invitation binding `{epoch_policy, schema_versions,
verifier_digest, invitee_key_digest_slot}` so an external organisation
   can run operator B with its own keys and produce a capture the shipped
   verifier checks.

### 5.2 Public record vs audit packet (tier split)

`pccc_match_record` is the only PUBLIC export shape: no `mask_point`, no token,
no `token_nonce`, no raw `z` — digest commitments only. The **sealed audit
packet** (transcript material for the offline verifier) may include masks,
token commitments, openings, `z` values, and DLEQ proofs (Amendment 1) —
still no raw scalar, ever.

### 5.3 Sealed-packet contents

Transcripts, phase messages, `z` values, DLEQ proofs,
`ephemeral_scalar_public_digest` ledger. Epoch-bound by construction (every
domain tag carries `epoch`), so even audit-tier material mints no
cross-epoch link token.

## 6. Raw codes 90–99 (frozen) and check order

### 6.1 The block

| Raw | Failure                               |
| --: | ------------------------------------- |
|  90 | `pccc_transcript_schema_invalid`      |
|  91 | `operator_identity_signature_invalid` |
|  92 | `match_claim_conflict`                |
|  93 | `ddh_transcript_mismatch`             |
|  94 | `small_order_or_all_zero_fail_closed` |
|  95 | `cross_epoch_replay_detected`         |
|  96 | `ephemeral_key_reuse_detected`        |
|  97 | `disclosure_budget_exceeded`          |
|  98 | `vfr_export_gate_failed`              |
|  99 | `public_herd_token_violation`         |

### 6.2 Raw 90 subreasons (zero new codes)

```text
pccc_token_commitment_missing
pccc_token_commitment_opening_invalid
pccc_phase_order_invalid
slot_cardinality_commitment_missing
slot_cardinality_mismatch
slot_terminal_record_missing
window_match_census_mismatch
```

### 6.3 Raw 93 and 96 subreasons

Raw 93 `ddh_transcript_mismatch` (Amendment 1 adds the DLEQ family):

```text
token_recompute_mismatch
dleq_mask_proof_invalid
dleq_z_proof_invalid
```

Raw 96 `ephemeral_key_reuse_detected`:

```text
mask_reuse_detected
ephemeral_public_digest_reuse_detected
```

### 6.4 Normative check order (masking semantics as in 4Q)

```text
90 → 91 → 94 → 95 → 96 → 93 → 92 → 99 → 97 → 98
```

Structure → identity → degenerate crypto → cross-epoch replay → reuse inside
the accepted epoch/run ledger → token mismatch → false claim conflict →
herd-token disclosure scan → budget → VFR export gate last (its refusal is
the ledgered expected-GREEN). Earlier failures mask later checks. Replay is
checked BEFORE reuse so a cross-epoch replay with identical mask bytes is
diagnosed as replay, not reuse.

### 6.5 Honest detection semantics (recorded evidence, not omniscience)

- **95** — any message whose epoch ≠ ceremony epoch, or identical mask/token
  bytes across epochs within the committed run set.
- **96** — ledger checks within the committed run set: identical mask bytes
  in two transcripts (`mask_reuse_detected`), or identical
  `ephemeral_scalar_public_digest` across class slots
  (`ephemeral_public_digest_reuse_detected`). The digest is epoch-bound, so
  96's detection scope is same-epoch; cross-epoch anomalies surface as 95.

## 7. Honesty rails (sixteen, spec-time, never retrofitted)

```text
no_public_herd_token
audit_tier_is_dleq_verified_public_tier_is_digest_level
public_record_is_digest_level_full_verification_requires_audit_packet
lane_a_uses_insecure_fixture_only_scalars_for_byte_reproducibility
lane_b_scalars_are_ephemeral_per_match_window_and_never_written_to_disk
match_is_custody_class_corroboration_not_identity_attribution
hash_to_group_is_ad_hoc_domain_separated_not_rfc9380
scalar_reuse_and_replay_checks_are_recorded_evidence_not_omniscience
friction_gates_export_not_matching
epoch_is_4n_window_anchor_not_physical_time
non_matches_are_first_class_evidence_no_selective_omission
commit_before_reveal_blocks_single_liar_token_copy
fixture_scalar_quarantine_enforced_by_path_allowlist
curve_arithmetic_is_reference_grade_not_constant_time
dleq_is_fiat_shamir_random_oracle_model
census_counts_are_window_scoped_and_cardinality_committed
```

## 8. Adopted inventions (zero new raw codes)

### 8.1 Slot cardinality commitment (4L move, lifted to matching)

`ceremony_capture` commits the COUNT of class slots attempted. Every slot
must terminate in exactly one of:

```text
exported_match_record
exported_non_match_record
ledgered_export_refusal
```

Omitting an embarrassing non-match (or match) breaks the cardinality check —
raw 90 subreasons (§6.2). The liar must ledger the lie.

### 8.2 Signed novelty source map (4Q invention reused)

With `prior_art_limiting_rows` (reviewer-neutral term — NOT "kill-shot"):
Google Private Join and Compute (deployed DH-PSI for aggregate statistics —
no signed attestation, no completeness commitment, no export friction),
Microsoft Password Monitor (OPRF for credential checking), Apple PSI (content
matching, withdrawn), SCITT/in-toto (artifact notarization, no private
matching). The composition — commit-before-reveal cross-attestation +
no-herd-token law + friction-gated export + slot cardinality, as signed
recomputable evidence — is the claimed first, stated falsifiably.

### 8.3 Signed constitution projection (4Q invention reused)

Maps the ceremony to constitution clauses ("cooperate on safety signals
without building surveillance infrastructure"), naming machine-check per row.

### 8.4 Contest-path disclosure hook (4M flavour, stub ONLY)

Fields in `pccc_match_record`: `respondent_notice_hash`,
`contest_pointer_hash`, `matched_against_operator_commitment`,
`contest_route_available`. Explicitly NOT in 4R: contest state machine,
adjudication, new contest raw codes, registry chaining, multi-stage appeal.
Call it: contest-path disclosure hook, not contest adjudication.

### 8.5 Window match census — the corroboration seismograph (4N + 4L)

The attestation carries a count-only `window_match_census`
`{epoch, matches, non_matches, refusals}`, cardinality-committed against
the slot ledger (mismatch → raw 90 subreason `window_match_census_mismatch`).
A privacy-preserving cross-operator corroboration statistic per window —
the Article-73 trend signal with no registry and no linkable token. Counts
only; nothing in the census identifies a pair, class, or operator.

### 8.6 BYO-Operator Kit (3O move, lifted to ceremonies)

`simurgh.pccc_operator_invitation.v1` plus a single-file operator
(`byo/operator-kit.mjs`) so an external organisation can run operator B
with its OWN keys and produce a capture the shipped verifier checks. Ships
as schema + tooling + docs; an actual cross-org run is a post-tag pilot,
not a 4R gate — signed as `cross_org_operator_b_not_yet_exercised`.

### 8.7 CERA — Countersigned External Review Attestation (staged, closeout)

A minimal schema letting an external reviewer countersign the constitution
projection with their own key; the countersignature becomes replayable
evidence that the clause-map review happened. Staged for closeout; NOT a
4R gate; zero raw codes. Constitution score may not move until it fires
(§16).

## 9. Lane A — deterministic corpus, full tamper matrix

### 9.1 Fixture scalar quarantine

Lane A fixture operators use committed `INSECURE_FIXTURE_ONLY` curve25519
scalars (path-regex compliant for the 3M/3O audits: no digits in the name
portion). Enforced by TWO gates wired into reproduce:

```text
fixture_scalar_path_allowlist:
  tests/fixtures/llmShield/stage4r/**
  docs/research/llm-shield/evidence/stage-4r/lane-a/**

forbidden_live_scalar_scan:
  docs/research/llm-shield/evidence/stage-4r/lane-b/**
  public bundle
  signed attestation
```

### 9.2 Tamper matrix (every raw code has at least one arm)

| Arm                                                                           | Expected                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| Honest match on a shared committed 4P custody class                           | GREEN, exported with VFR receipt           |
| Honest non-match                                                              | GREEN, exported under the identical schema |
| Phase-order violation / missing commitment / bad opening                      | 90 (subreasons)                            |
| Slot cardinality mismatch / missing terminal record                           | 90 (subreasons)                            |
| Operator signature tampered                                                   | 91                                         |
| All-zero / small-order mask injected                                          | 94                                         |
| Epoch-W transcript replayed into W+1                                          | 95                                         |
| Same fixture scalar across two slots (both 96 subreasons)                     | 96                                         |
| Mask tampered mid-ceremony → openings valid, tokens disagree                  | 93                                         |
| Token-copy liar: commits own token, opens with peer's copied token            | 90 `pccc_token_commitment_opening_invalid` |
| Claim liar: valid transcript, tokens unequal, still claims match              | 92                                         |
| DLEQ forged: proof over a false relation (fabricated `z`)                     | 93 `dleq_z_proof_invalid`                  |
| `z` tampered in sealed packet → token recompute disagrees                     | 93 `token_recompute_mismatch`              |
| Census counts tampered vs slot ledger                                         | 90 `window_match_census_mismatch`          |
| Raw custody_class_digest or window-independent token planted in public bundle | 99                                         |
| Fifth signal in window (4P budget max 4)                                      | 97                                         |
| Export attempted with no / pincer-failing VFR receipt                         | 98 + ledgered refusal expected-GREEN       |

The commit-reveal payoff is that the token-copy liar and the claim liar are
DIFFERENT failures at different phases; both rows cite the Lean theorems.

## 10. Lane B — live ceremony

### 10.1 Shape

Two real OS processes (`laneb/operator.mjs --role a|b`), each with its own
ephemeral curve25519 scalar (never on disk, destroyed with the process) and its
own Ed25519 identity key, exchanging signed phase messages over localhost.
`laneb/ceremony.mjs` orchestrates, including the VFR export crossing against
the REAL 4Q approver process — 4R composes 4Q's Lane B, not a mock.

Committed arms (minimum, sufficient — no stage obesity):

```text
honest match
honest non-match
raw-98 negative: export attempt without valid VFR receipt (mandatory)
```

### 10.2 Reproduce is verify-only (frozen)

```text
scripts/reproduce-llm-shield-stage4r.sh verifies committed Lane B ceremony
captures. It does not regenerate live ephemerals or rebuild signatures.
```

An optional refresh path exists OUTSIDE normal reproduce, gated by
`SIMURGH_REFRESH_STAGE4R_LANEB=1`. Default CI/reviewer path: verify only.

### 10.3 Privacy-clean process metadata

`ceremony_capture` carries NO raw `pid`, `argv`, `env`, `hostname`, or
absolute temp paths. Digests and role labels only:

```text
process_instance_digest
role
operator_key_digest
ceremony_start_digest
```

## 11. Lean proof obligations (`proofs/stage4r/NoPublicHerdToken.lean`)

Scope header (exact):

```text
Lean proves symbolic phase-order, domain-separation, and proof-binding laws.
Node/Python exercise real curve25519 byte behaviour.
No theorem claims DDH hardness, RFC9380/RFC9497 compliance, or that Lean
verified the real curve arithmetic.
```

Six theorems:

1. `noPublicHerdTokenForLinkMaterial` — for all link-bearing public digests
   produced under the PCCC domains {`pair_id_hash`, `pair_match_commitment`,
   `transcript_digest`, VFR-bound export digest}, equality across accepted
   records implies same epoch or hash collision. (Prose may say
   "NoPublicHerdToken"; the theorem is scoped to link material.)
2. `matchSound` — same epoch/pair, honest computation: token equality ↔
   class equality.
3. `zeroFailClosed` — degenerate output ⇒ refuse at 94; no token is ever
   formed from zero.
4. `commitPrecedesReveal` — acceptance ⇒ phase order held ∧ every opening
   matches its binding commitment.
5. `singleLiarExcluded` — with binding commitments and phase order, a party
   that commits before the peer reveals cannot equal-by-copy; token equality
   is decided only between independently committed tokens.
6. `dleqBindsSingleScalar` — in the symbolic model, an accepted transcript
   with valid DLEQ proofs implies one scalar witness links epk, mask, and
   `z` per operator; hence a fabricated match implies a forged proof or a
   hash collision (colluding fabrication excluded symbolically).

## 12. Components

```text
tools/simurgh-attestation/stage4r/
  core/edwards25519.mjs        pure BigInt reference group: add, mul, on-curve,
                               hash-to-point (try-and-increment + cofactor clear)
  core/dleq.mjs                Chaum-Pedersen prove/verify, Fiat-Shamir SHA-512
  core/pcccCore.mjs            pure: hash-to-point wrap, double-mask, commit/reveal,
                               match token, transcript schema/digest,
                               check order 90–99, herd-token scan, budget rule,
                               slot cardinality + window census rules
  node/build-stage4r-attestation.mjs
  node/verify-stage4r-attestation.mjs   (two-tier, --offline)
  laneb/operator.mjs           one binary, role by flag: --role a|b
  laneb/ceremony.mjs           orchestrates processes + VFR export crossing
  byo/operator-kit.mjs         BYO single-file operator + invitation check
  python/pccc_kernel.py        parity kernel (pure-Python Edwards25519 + DLEQ)
proofs/stage4r/NoPublicHerdToken.lean
tests/unit/llmShield/stage4r/  + tests/e2e/llmShield/stage4r/
tests/fixtures/llmShield/stage4r/
docs/research/llm-shield/evidence/stage-4r/   (lane-a/ + lane-b/)
scripts/reproduce-llm-shield-stage4r.sh
```

Harness signing key OUT OF REPO at `~/simurgh-keys/stage4r.pem` (4Q
pattern); reproduce re-verifies, never rebuilds signatures.
`evidence/stage-4r/**` is prettier-ignored BEFORE the first evidence write.

## 13. Data flow (one match, end to end)

1. Ceremony opens: both operators read the current 4N window anchor → epoch.
2. Phase 1: each derives `Hc`, masks with its ephemeral scalar, signs and
   sends its mask.
3. Each applies its scalar to the peer's mask; all-zero `z` → raw 94 before
   any token exists.
4. Each attaches its two DLEQ proofs (§3.5) to the sealed-packet material.
5. Phase 2: each commits to its token (binding role + peer mask digest).
6. Phase 3: openings revealed; openings must match commitments.
7. Phase 4: tokens compared; both operators sign the transcript — match or
   non-match, both first-class.
8. Export crossing: VFR receipt demanded and pincer-checked (key separation
   §4.2) → only then does `pair_match_commitment` (+ contest-hook fields)
   enter the public bundle. Refusal → raw 98, ledgered, nothing published.
9. Attestation signs canonicalJson of the full run set (census included);
   verifier recomputes offline at both tiers, audit tier unilaterally.

## 14. Cross-stage invariants (pinned in K7)

- Match universe ⊆ committed 4P custody-class digests (entropy-floor rule
  imported).
- Epoch == committed 4N window anchor digest.
- The VFR receipt verifies under the SHIPPED 4Q verifier, unmodified.
- Edwards25519 reference arithmetic cross-validated against RFC 8032 test
  vectors AND Node core Ed25519-derived checks; both 2026-07-06 probes
  (X25519 commutativity, Edwards DLEQ round-trip) archived as seed tests.
- Known golden breakage from additive codes 90–99 (budget for ALL of these):
  4H exit-map.json + 4H exitWrapper inline map, 4K/4H exitWrapper snapshots,
  4L e2e net golden, and the 4P constants probe
  (`tests/unit/llmShield/stage4p/constants.test.js` "unknown" probe, bumped
  to 90 by 4Q) — bump to 100.

## 15. Gates (ALL green before tag; K7 net mandatory, standing rule)

```text
unit suites (constants, digest, schema, pcccCore, phases, fixtures, laneb,
  attestation)
scripts/reproduce-llm-shield-stage4r.sh — twice, byte-stable, committed
  tree, Node 26
offline verify — public tier (digest-level)
offline verify — audit tier (sealed packet, DLEQ-verified, unilateral)
Edwards25519 reference group vs RFC 8032 vectors + Node Ed25519 checks
JS↔Python parity (group ops, hash-to-point, double-mask on fixture
  scalars, DLEQ prove/verify round-trip, tokens, digests)
window match census recompute vs slot ledger
Lean 6 theorems — exit 0
K7 all-functions net (frozen export inventory, composed replay +
  check-order masking, byte-idempotency, cross-stage invariants §14,
  attestation both tiers)
privacy scan + forbidden-live-scalar scan + herd-token scan
3M/3O private-key audits (fixture keys on the path allowlist)
docs-accuracy pass LAST (verify every doc claim against shipped code)
npm run format:check green BEFORE merge (4Q post-merge lesson)
```

CI notes: `npm test` gates tests/unit only — wire stage-4r e2e into
check-e2e; never shell `rg` in a unit test (Linux ENOENT); overclaim-scan
trips on honest negations — phrase accordingly.

## 16. Four-axis pre-score (amended 2026-07-06; closeout re-scores)

The original freeze capped all axes at 9.0 until one of four unlocks fired.
Amendment 1 FIRES unlock #1 (the DLEQ upgrade) inside the stage; the census
and kit strengthen two more without claiming them. Amended honest pre-score:

- **Novelty 9.5** — the paid-debt composition: dependency-free,
  DLEQ-verified private custody corroboration with a cryptographic
  no-herd-token law, friction-gated export, and slot cardinality. DH-PSI
  itself is old (Private Join & Compute, Password Monitor — named as
  prior_art_limiting_rows). Held from 10: the source map has not survived
  external prior-art review.
- **Frontier 9.5** — unilateral audit-tier verifiability from pure
  reference arithmetic; count-only cross-operator census. Held from 10:
  operator B is still ours; constant-time prover deferred.
- **Good-for-Anthropic 9.5** — consumes 4Q receipts (the 4Q closeout's
  named "to 9.5") AND ships the kit that turns a cross-org pilot into a
  send-one-link exercise. Held from 10: no external organisation has run
  it yet.
- **Constitution 9.0** — unchanged until CERA (§8.7) is countersigned by a
  real external reviewer; no self-granted credit.

**Residual no-drift rule:** Constitution stays ≤ 9.0 until CERA fires;
nothing exceeds 9.5 until a real cross-org run or an external
prior-art/clause-map review lands.

## 17. Deferred, by name

DLEQ was REMOVED from this list — paid in-stage by Amendment 1.

```text
full VOPRF (RFC 9497) protocol       still out — PCCC is DH-PSI + DLEQ, not a VOPRF
constant-time prover arithmetic      reference-grade, railed; hardening later
>2-party ceremonies                  pairwise only in 4R
contest adjudication                 hook only (§8.4)
registry chaining                    waits
HTTP resale-shape substrate          unchanged from roadmap
cross-org pilot EXECUTION            kit ships in 4R; the run is post-tag
CERA countersignature                staged at closeout, not a gate
```

OWASP-LLM10 / NIST MEASURE 2.7 mapping = a reviewer-checklist NOTE, not a
stage and not a raw code.

## 18. Closeout criteria (frozen)

> All Stage 4R-specific gates green under Node 26 (§15). The known
> pre-existing check.sh RED (worktrees/.history + untracked artifacts) is
> documented separately and not counted as a 4R gate.

Then: PR rebase-merge (neutral body, no attribution trailer); re-check
`git tag --sort=-creatordate`; tag `v2.27.0-stage-4r-pccc`; four-axis
re-score with the novelty source map attached; reviewer checklist verified
against shipped behaviour with any spec deltas recorded; memory updated.
Raw codes 90–99 consumed; next stage starts at 100.

## 19. Suggested implementation shape (feeds writing-plans)

1. Constants, digest core, schema validation, check order 90–99 (core).
2. Edwards25519 reference group (add/mul/on-curve) + RFC 8032 vector gate.
3. Hash-to-point + double-mask + degenerate-point rejection (both
   2026-07-06 probes as seed tests).
4. DLEQ prove/verify + forged-relation negative vectors (core).
5. Commit-reveal phase machine + transcript build/verify (core).
6. Slot cardinality + window census + budget + herd-token scan rules (core).
7. Lane A corpus builder + full tamper matrix fixtures (incl. DLEQ arms).
8. Two-tier offline verifier (+ sealed packet reader, DLEQ audit checks).
9. Python parity kernel (group ops + DLEQ + tokens).
10. Lane B operator + ceremony orchestrator + real 4Q approver crossing;
    one-time capture ceremony; verify-only reproduce wiring.
11. BYO-Operator Kit (invitation schema + single-file operator + docs).
12. Attestation build/sign/verify; adopted-inventions blocks (source map,
    constitution projection, contest hook, census).
13. Lean theorems (six).
14. Golden bumps (§14), reproduce script, K7 net, scans, docs, closeout
    (+ CERA staging note).
