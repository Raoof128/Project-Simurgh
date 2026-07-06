# Stage 4R — Private Custody Corroboration Ceremony (PCCC)

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Date:** 2026-07-06
- **Status:** DESIGN — approved section-by-section; implementation follows the
  written plan, not this doc alone.
- **Subtitle:** Two-operator X25519 match ceremony with no public herd token.
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

> **PCCC Real-DDH X25519 Match Core with epoch-bound unlinkability.**

Never "full VOPRF", never "RFC-9380 compliant hash-to-curve".

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

```text
transcript_verification_is_cross_attestation_not_dleq_proof
colluding_operators_can_fabricate_match_without_dleq
dleq_or_voprf_upgrade_deferred_to_4r_x
```

A colluding pair can fabricate a match; a single liar cannot (§3.3, §8).

## 3. Normative match core contract (frozen)

### 3.1 Core shape

```text
Hc = H_to_x25519_u("simurgh.pccc.class.v1", epoch, custody_class_digest)

Party A:  mA = X25519(a, Hc)
Party B:  mB = X25519(b, Hc)

A computes:  zA = X25519(a, mB)
B computes:  zB = X25519(b, mA)

MATCH ⇔ H("simurgh.pccc.match.v1", epoch, pair_id, zA)
      = H("simurgh.pccc.match.v1", epoch, pair_id, zB)
```

Implemented with Node core `crypto` (JWK OKP import of the hashed
u-coordinate; `crypto.diffieHellman`) and, for parity, the existing Python
`cryptography` X25519 primitives. ZERO new dependencies. Feasibility probed
2026-07-06: commutes, deterministic, nonzero.

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
                      = H("simurgh.pccc.ephemeral_pub.v1", epoch, role, X25519(a, basepoint))
```

`epoch` sits inside `pair_id`, and `pair_id` sits inside the token domain,
so: **no cross-epoch herd token, and no cross-pair same-epoch herd token.**
Two pairs sharing a custody class in the same epoch still produce unequal
tokens. `ephemeral_scalar_public_digest` is verifier-only sealed-packet
material (§5.3), never public.

## 4. Architecture

```text
Lane A (deterministic corpus)          Lane B (live ceremony)
─────────────────────────────          ──────────────────────
fixture custody-class corpus           operator-a process        operator-b process
(committed 4P evidence classes         (own ephemeral X25519     (own ephemeral X25519
 + synthetic multi-op classes)          + own Ed25519 identity)   + own Ed25519 identity)
        │                                     └── localhost mask exchange ──┘
        ▼                                                  │
pcccCore (pure): hash-to-u ─ double-mask ─ commit/reveal ─ match token ─ transcript
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

Without DLEQ (deferred with VOPRF), an offline verifier cannot unilaterally
prove `z = scalar × peer_mask` was honestly computed. Therefore:

- **Public tier** verifies the disclosure record: schema, signatures, epoch
  binding, digest commitments, herd-token scan, VFR receipt. Digest-level.
- **Audit tier** verifies the ceremony from the sealed transcript packet:
  phase order, commitment openings, token equality/inequality, all-zero
  rejection, absence of raw mask/z material in public evidence, ephemeral
  public-key digest ledger. Still never sees a raw scalar or raw `z`.

Verification is cross-attestation between two keyed parties, not unilateral
crypto proof. A single liar is caught (raw 90 opening subreason, raw 92, raw
93); a colluding pair is out of scope and signed as such (§2.2).

## 5. Schemas (five, versioned; commitments/openings embedded)

### 5.1 The five

1. `simurgh.pccc_mask_message.v1` — Phase 1, per class-slot:
   `{epoch, run_id, pair_id, role, slot_index, mask_u, operator_signature}`.
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
lane_b_verification_kind: "two_party_cross_attestation_without_dleq"
verification_packet_kind: "sealed_transcript_packet_for_offline_verifier"
```

### 5.2 Public record vs audit packet (tier split)

`pccc_match_record` is the only PUBLIC export shape: no `mask_u`, no token,
no `token_nonce`, no raw `z` — digest commitments only. The **sealed audit
packet** (transcript material for the offline verifier) may include masks,
token commitments, and openings — still no raw scalar and no raw `z`.

### 5.3 Sealed-packet contents

Transcripts, phase messages, `ephemeral_scalar_public_digest` ledger.
Epoch-bound by construction (every domain tag carries `epoch`), so even
audit-tier material mints no cross-epoch link token.

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
```

### 6.3 Raw 96 subreasons

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

## 7. Honesty rails (thirteen, spec-time, never retrofitted)

```text
no_public_herd_token
transcript_verification_is_cross_attestation_not_dleq_proof
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

## 9. Lane A — deterministic corpus, full tamper matrix

### 9.1 Fixture scalar quarantine

Lane A fixture operators use committed `INSECURE_FIXTURE_ONLY` X25519
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
| Raw custody_class_digest or window-independent token planted in public bundle | 99                                         |
| Fifth signal in window (4P budget max 4)                                      | 97                                         |
| Export attempted with no / pincer-failing VFR receipt                         | 98 + ledgered refusal expected-GREEN       |

The commit-reveal payoff is that the token-copy liar and the claim liar are
DIFFERENT failures at different phases; both rows cite the Lean theorems.

## 10. Lane B — live ceremony

### 10.1 Shape

Two real OS processes (`laneb/operator.mjs --role a|b`), each with its own
ephemeral X25519 scalar (never on disk, destroyed with the process) and its
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
Lean proves symbolic phase-order and domain-separation laws.
Node/Python exercise real X25519 byte behaviour.
No theorem claims DDH hardness, RFC9380 compliance, or DLEQ proof.
```

Five theorems:

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

## 12. Components

```text
tools/simurgh-attestation/stage4r/
  core/pcccCore.mjs            pure: hash-to-u, double-mask wrap, commit/reveal,
                               match token, transcript schema/digest,
                               check order 90–99, herd-token scan, budget rule,
                               slot cardinality rule
  node/build-stage4r-attestation.mjs
  node/verify-stage4r-attestation.mjs   (two-tier, --offline)
  laneb/operator.mjs           one binary, role by flag: --role a|b
  laneb/ceremony.mjs           orchestrates processes + VFR export crossing
  python/pccc_kernel.py        parity kernel (X25519 via existing `cryptography`)
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
4. Phase 2: each commits to its token (binding role + peer mask digest).
5. Phase 3: openings revealed; openings must match commitments.
6. Phase 4: tokens compared; both operators sign the transcript — match or
   non-match, both first-class.
7. Export crossing: VFR receipt demanded and pincer-checked (key separation
   §4.2) → only then does `pair_match_commitment` (+ contest-hook fields)
   enter the public bundle. Refusal → raw 98, ledgered, nothing published.
8. Attestation signs canonicalJson of the full run set; verifier recomputes
   offline at both tiers.

## 14. Cross-stage invariants (pinned in K7)

- Match universe ⊆ committed 4P custody-class digests (entropy-floor rule
  imported).
- Epoch == committed 4N window anchor digest.
- The VFR receipt verifies under the SHIPPED 4Q verifier, unmodified.
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
offline verify — audit tier (sealed transcript packet)
JS↔Python parity (hash-to-u, double-mask on fixture scalars, tokens, digests)
Lean 5 theorems — exit 0
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

## 16. Four-axis pre-score (frozen at 9.0 flat; closeout re-scores)

- **Novelty 9.0** — DH-PSI is old (Private Join & Compute, Password
  Monitor — named in the signed source map as prior_art_limiting_rows); the
  claimed first is the composition: commit-before-reveal cross-attestation +
  no-herd-token law + friction-gated export + slot cardinality, as signed
  recomputable evidence.
- **Frontier 9.0** — real crypto between real processes, offline-
  recomputable at two tiers.
- **Good-for-Anthropic 9.0** — providers corroborate shared custody-failure
  classes without building a linkable registry; the exact "to 9.5" the 4Q
  closeout named.
- **Constitution 9.0** — makes "cooperate on safety signals without creating
  surveillance infrastructure" machine-checkable; signed
  constitution_projection.

**No drift above 9.0** until at least one of: DLEQ/VOPRF upgrade; cross-org
operator B; external clause-map review; real cross-org pilot.

## 17. Deferred, by name

```text
DLEQ / VOPRF upgrade                 4R.x seed, signed in known_limitations
>2-party ceremonies                  pairwise only in 4R
contest adjudication                 hook only (§8.4)
registry chaining                    waits
HTTP resale-shape substrate          unchanged from roadmap
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
2. Hash-to-u + double-mask wrap + degenerate-point rejection (core, with
   the Node JWK-OKP probe as the seed test).
3. Commit-reveal phase machine + transcript build/verify (core).
4. Slot cardinality + budget + herd-token scan rules (core).
5. Lane A corpus builder + full tamper matrix fixtures.
6. Two-tier offline verifier (+ sealed packet reader).
7. Python parity kernel.
8. Lane B operator + ceremony orchestrator + real 4Q approver crossing;
   one-time capture ceremony; verify-only reproduce wiring.
9. Attestation build/sign/verify; adopted-inventions blocks (source map,
   constitution projection, contest hook fields).
10. Lean theorems.
11. Golden bumps (§14), reproduce script, K7 net, scans, docs, closeout.
