# Stage 5L — VTC-Q: Verifiable Temporal Commitment with Notary Quorum (closeout)

> Motto: **BoundarySafe first, then ReviewerSafe.** (Internal doctrine: _AnthropicSafe first_.)
> Branch `stage-5l-vtcq`; raw codes **364–383**; spec + plan under `docs/superpowers/`.

## What shipped (in-band, built + verified)

Externally commit the full ceremony contract (VUC universe root + review-window / anchor / quorum /
trust-domain / declared-release policies) through an RFC-3161 bounded-time authority AND a structurally
distinct Bitcoin/OTS publication root, then make reviewer access cryptographically impossible until that
commitment verifies — enforced by a gate-issued capability every declared release must consume.

- **Pure core `vtcqCore`** — all **20 codes 364–383** on the frozen non-numeric spine (380 after 370; 374
  before 375; 373 after 375). One-boundary TDD throughout.
- **Three computed states**: `vtc_core`=0, `vtc_quorum_confirmed`=0, `vtc_quorum_pending`=**372** (honest
  floor-miss, never a success), `false-confirmed-over-pending`=**380**.
- **Offline Bitcoin finality** via a signed checkpoint witness (`observed_tip_height − block_height + 1 ≥
min_confirmations`) — no live node; witness-less path is honestly `pinned_checkpoint_inclusion → 372`.
- **Release causality (No Temporal Release Bypass)**: capability derived from the verified anchor set
  (373), per-release child recompute/replay (376), surface bijection (377/378), gate-authorised releases.
- **Real Ed25519 signed builder + adapter** (facts from verified signatures; the bundle carries no
  booleans), byte-stable Lane-A pack (`evidence/stage-5l/lane-a/`), verify CLI (argv-guarded, absolute-path).
- **Two-tier attestation** (audit ⟹ public under same context + policy_digest).
- **Tri-runtime parity**: Node ↔ Python (stdlib) ↔ browser (WebCrypto) recompute a byte-identical
  `commitment_session_id` / capability root; browser tier honestly claims only adapter-attestation.
- **14 Lean theorems** (Lean 4.15.0, no mathlib, zero `sorry`, no user axioms — collision-resistance and
  `HashInjectiveOn` are explicit hypotheses).
- **K7 all-functions net**: every raw 364–383 uniquely reachable; the four attacks land on 375/376/367/370.
- **Beast-mode folds**: I1 `rsp-prerequisite-gate` fixture (RSO-approval-as-gate; primary-sourced to RSP);
  I3 `scitt_projection_candidate` bridge (emit-only, explicitly NOT RFC-9943-conforming).
- **Reproduce** `scripts/reproduce-llm-shield-stage5l.sh` → ALL PASS (Node 26); **5I/5J/5K reproduce +
  187 unit tests undisturbed**; security-audit 3m/3o pass (fixture keys allowlisted).

**73 stage5l unit + 3 K7 tests green.**

## Honest limitations / remaining

- **`externally_anchored` is NOT yet banked.** The committed `quorum-confirmed` Lane-A fixture is a
  **stub-facts logic fixture** (`otsFinality:confirmed` injected) — CI-green, byte-stable, but **never a
  claim of a real anchored ceremony**. `externally_anchored` requires the real Lane-B capture below.
- **Out-of-band, not run** (inherently multi-day, exactly like 5J/5K): **Lane B** real DigiCert RFC-3161
  capture + real OTS stamp + **real Bitcoin confirmation** of the checkpoint; **Lane C-adv** live Fable-5
  gerrymandering producer (CVP-covered); **Lane D** independent distinct-key party. Until these run,
  VTC-Q ships as **VTC-Core**.
- Full RFC-3161 CMS/X.509 is the adapter's job (OpenSSL-backed, Lane B); the pure core takes the signed
  `tsa_crypto_attestation` as a fact (the 5I/5K B11 pattern).

## Signed non-claims

Declared-release-surface only (no out-of-band copy) · declared trust-domains (not proven-globally-
independent) · capability binding structural, not runtime single-issuance · `genTime` trusts the TSA ·
browser verifies adapter-attestation + structure, not the token independently · proves commit-before-
authorised-**access**, not honest content / adequate review / a human read it.

## Four-axis scorecard (closeout, honest)

- **Novelty 9.2** — temporalCompletenessNoHiddenGap (new theorem class) + SCITT bridge; TSA/OTS/Bitcoin
  are known primitives, the composition is the novelty.
- **Frontier 9.0** (+0.5 **UNBANKED**) — banks toward 9.5 on real `vtc_quorum_confirmed` over an upgraded
  `.ots` **+** live Lane C-adv **+** independent Lane D; I5 (three-ecology quorum) is the boldest lever.
- **Good-for-Anthropic 9.6** — binds the primary-sourced RSP prerequisite-gate as recomputable; names the
  RSO as a concrete actor; SCITT standards-track distribution.
- **Constitution 9.6** — makes temporal completeness + an RSP-clause ordering machine-checkable; every
  claim carries a signed bound; zero model-safety overclaim.

## Ledger

```text
review_window_binding          → PAID (temporal precedence)
externally_anchored (rung)     → REACHED IN LOGIC; banked only at real vtc_quorum_confirmed (Lane B)
campaign_composition_root      → OPEN for capstone
minimum_elapsed_review_binding → MINTED (I4 — VDF "No Instant Review")
third_trust_ecology            → MINTED (I5 — TSA + Bitcoin + transparency-log quorum)
hiding_scope_commitment        → MINTED (I6)
```
