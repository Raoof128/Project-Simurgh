# Stage 5J — VRC: Verifiable Rating Contest (closeout)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-12-stage-5j-vrc-rating-contest-design.md` ·
> Plan: `docs/superpowers/plans/2026-07-12-stage-5j-vrc-rating-contest.md`.
> Version **v2.45.0-stage-5j-vrc** (tag at merge) · raw codes **332–347** · branch `stage-5j-vrc`.

## What shipped

VRC turns RSP v3.4's external-review disagreement into an offline-recomputable relation: it derives, from
VPC's (5I) already-equality-committed coverage relation, an exact **rating-obligation set** and requires
the ledger's active-rating set to **equal** it on both sides (reviewer pairs = C(r), producer sections =
S). Over that set it recomputes, offline, the divergence relation under a signed canonical rating scale,
preserves every divergence as an **append-only contest event**, and fails closed on any silent favourable
override, missing/orphan rating, forged supersession, replayed response, or phantom concurrence.
**Contest recorder, not truth arbiter.**

- **The blade:** two-sided obligation equality + append-only contest history where **suppression of a
  divergence fails closed**. Because the reviewer chain is append-only and reviewer-signed, a producer
  cannot remove a stricter reviewer rating from history — so an erase-by-supersession leaves the
  historical divergence recomputable (342), and a forged _superseded_ entry is caught even when the head
  is honest (341, the fossil attack).
- **Three laws:** No Missing or Orphan Rating (333–337) · No Silent Favourable Override (342–343) · No
  Phantom Concurrence (344).
- **Beast-mode inventions:** the **Override Trilemma** (`noSilentOverridePath`, no fourth branch) ·
  **`noCorrectnessBit`** (the state space has no correct/incorrect value — the artifact is structurally
  unable to assert who was right) · the **reviewer rebuttal** (`contested_reviewer_maintains`, the
  reviewer's signed last word; silence ≠ agreement) · **Downgrade Depth** (severity-rank delta, num+den)
  · the **content-blind ledger authority** (sequences by digest, never sees a rating value) · the
  **in-toto/SCITT bridge** (subject = `contest_layer_root`).
- **Codes 332–347**, house-partitioned (public 332→344, audit-only 345, policy 346, wrapper 347), all →
  run-level 1; frozen first-failure order owned by the pure `vrcCore` (crypto arrives via `facts`).
- **Two split attestations:** the public object never certifies projections (`projection_status:
"not_verified"`, no `projection_root`); the audit object binds the public one by digest and adds
  `projection_root`. `audit ⟹ public` (theorem 9).
- **Three evidence lanes:** **A** byte-stable Fable-5-scenario pack (committed keys → deterministic
  Ed25519; verifies raw 0 public + audit; byte-stable; committed == fresh rebuild) · **B** deterministic
  multi-role ceremony (distinct keys per role, 5-state census A–E, content-blind ledger authority) · **C**
  the campaign gate (`completed ⟹ pack present AND verifies raw 0 under a DISTINCT verifier key`) —
  **real independent-party ceremony EXECUTED**: a droplet party ran the ceremony over the real Opus 4.6
  public structure (**37 leaf sections**, 39 reviewer pairs, 3 divergences) with **their own keys**; the
  pack **byte-verifies raw 0 (public + audit) under our repo verifier** with a verifier key distinct from
  ours (`sha256:db92f06d…` ≠ ours `sha256:6a5e0288…` — non-possession is the point). Two runs (local Node
  22 + a **remote Ubuntu droplet under Node 26** with a second distinct key `sha256:6eb29ff1…`), both raw
  0; run 1 is byte-committed at `evidence/stage-5j/real-structure/`. Independence rung: **`distinct_key_only`**.
- **Node JS ↔ independent Python semantic parity, byte-identical** on the committed pack (same verdict +
  `rating_obligation_root` / `rating_ledger_root` / `contest_layer_root` / `projection_root`), plus a
  browser WebCrypto portable verifier (packaging/execution parity over the same decision logic).
- **11 Lean theorems, zero `sorry`** (obligation soundness, contest completeness, quantified override,
  per-tier first-failure uniqueness/soundness, reviewer-statement binding, chain topology, non-comparable
  exclusion, fossil-attack supersession authority, tier monotonicity, the Override Trilemma,
  `noCorrectnessBit`).

**Tests:** 79 stage5j unit + 4 K7 e2e green (K7 asserts every raw 332–347 reachable + evidence lock; a
locked test re-verifies the committed **real-structure** independent-party pack at raw 0).
Full repo unit suite green (exit 0). Prior **5I reproduce still raw 0** (sealed history undisturbed). The
5J reproduce script is **ALL PASS** under Node 26. Both priv-key audit scripts (3m + 3o) pass with the
stage5j test-keys allowlisted.

## Positioning (the honest statement of record)

VRC is **not** category-creating on attestation — in-toto/SCITT/C2PA register single-party signed
statements (C2PA concedes it certifies formation/tamper/attribution, "not the semantic truth of the
assertions"). To our knowledge, based on the documented prior-art sweep, VRC is the **first executable,
byte-reproducible verifier of a two-party rating divergence over a committed subject where omission of the
divergence fails closed**. It sits under RSP v3.4's external-review-disagreement process and the EU GPAI
Code's external-evaluation mandate, both of which name disagreement but leave it un-recomputable.

## Signed limitations (admit irregularity over overclaim)

1. **Contest ≠ correctness.** VRC proves divergence was surfaced, obligations complete, suppression fails
   closed — NOT that any rating is correct → `rating_truth_oracle_deferred`.
2. **Response recorded ≠ justified.** A bound response is required; its justification is not checked →
   `response_adequacy_deferred`.
3. **VPC-committed universe.** Completeness is relative to `S` as committed by 5I, not the real-world
   report/eval surface → VUC.
4. **Logical, not temporal.** Epoch order is a signed logical sequence; wall-clock timeliness → VTC.
5. **Single committed rating scale**, no cross-scale comparison in v1.
6. **Real independent-party Lane C EXECUTED at rung `distinct_key_only`; the `externally_anchored` RAILS
   are built.** The droplet party emitted real ratings under fresh keys we do not hold (byte-verified
   raw 0, 37 real sections, a remote droplet run under Node 26). The rung machinery is shipped
   (`core/independence.mjs` reuses the VFC lattice; `lanec/attach-anchor.mjs` + the runner's `ANCHOR_ME.txt`;
   the gate computes the strongest proven rung), and it **refuses to upgrade on the structural binding
   alone** — `externally_anchored` requires the injected `anchorVerified` (our online `cosign verify-blob`
   against Fulcio+Rekor). So true 9.5 is **one operator step away**: the droplet operator runs
   `cosign sign-blob` with their real OIDC identity and sends the `sigstore-bundle.json`. Until a real
   anchor is verified, the score honestly stays 9.4. → `real_sigstore_anchor_execution_deferred` open.
7. Parity is JS↔Python **semantic** + browser packaging, not cross-runtime crypto-impl parity.
8. The **"Areas of disagreement" RSP section wording is reported-until-pinned** (the canonical policy page
   surfaced the split-review sentence, not that exact section text).

## Socket ledger

**PAYS** `reviewer_assessment_contest_deferred` (5I) + `consequence_self_rating_contest_deferred` (5H).
**MINTS** `rating_truth_oracle_deferred` + `response_adequacy_deferred`. Flat: 2 pays / 2 mints. Arc spine
reserved (typed-null, 346-guarded): `universe_commitment_anchor` (VUC), `review_window_binding` (VTC),
`campaign_composition_root` (capstone). Cross-scale mapping is a signed limitation, not a minted socket.

## Four-axis scorecard — re-scored at closeout

| Axis               | Spec-time | Closeout | Why the closeout value                                                                                                                                                                                                                                                                                    |
| ------------------ | --------: | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            |       9.2 |  **9.5** | Override Trilemma + `noCorrectnessBit` theorem classes, content-blind sequencer, Downgrade Depth — all built and Lean-proven. → 9.6 on a broader prior-art sweep + independent reproduction.                                                                                                              |
| Frontier           |       9.0 |  **9.4** | Real Ed25519 e2e + byte-stable pack + 3-runtime parity + **real independent-party Lane C EXECUTED** (droplet party, own keys distinct from ours, 37 real Opus sections, byte-verified raw 0, a remote Node-26 droplet run). Short of 9.5: independence is `distinct_key_only`, not `externally_anchored`. |
| Good-for-Anthropic |       9.4 |  **9.5** | Reviewer rebuttal completes both-sides due process; maps to the RSP v3.4 external-review process over quantified Risk Reports. Caps at 9.5 with no real process-owner pilot.                                                                                                                              |
| Constitution       |       9.4 |  **9.6** | Reviewer rebuttal + `noCorrectnessBit` make the contest fuller (both sides heard, silence ≠ agreement) **without** claiming truth. Binding review quality/truth belongs to a later rung.                                                                                                                  |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it implies no Anthropic review,
adoption, or endorsement._

## Next

**VUC** (external universe commitment — pays `uncommitted_section_universe_deferred`), then **VTC**
(temporal coverage), then the **capstone** composing the finished External-Accountability rungs. Real
Lane C is now EXECUTED (`distinct_key_only`); the remaining Frontier levers are a real Sigstore/OIDC
anchor to lift Lane C to `externally_anchored` (`real_sigstore_anchor_execution_deferred`) and the
live-Fable-5 adversarial demo.
