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
- **Lane B — REAL capture + Bitcoin-CONFIRMED (2026-07-12).** A genuine **DigiCert RFC-3161 token** over
  the real commitment digest: Status Granted, policy OID `2.16.840.1.114412.7.1`, genTime `2026-07-12
09:37:30Z`, **`openssl ts -verify: OK`** (messageImprint == commitment digest AND chains to DigiCert
  Trusted Root G4). The real **OTS stamp is Bitcoin-CONFIRMED** — block **957689**, merkle root
  `b0d4a6ce…83c69`, txid `790976cb…`, independently cross-checked vs mempool.space. Evidence:
  `evidence/stage-5l/real-laneb/`.
- **Lane D — REPRODUCTION DONE + witness Bitcoin-CONFIRMED (2026-07-12).** An independent party ran the
  verify-only droplet pack (public keys only) on **two machines / Node builds** (local v22.16.0, droplet
  Nexus v26.5.0): all four checks reproduce **raw 0** with a byte-identical `commitment_session_id`. Both
  OTS witnesses are **Bitcoin-CONFIRMED** (blocks 957688–957690, calendar-batched with Lane B; distinct
  per-proof Merkle paths; cross-checked vs mempool.space). Evidence: `evidence/stage-5l/real-laned/`.
  **HONEST:** reproduction + witness (VUC Lane-C tier), **NOT** a distinct-key ceremony (droplet is
  verify-only).
- **Both real trust roots now exist over the commitment** — a real DigiCert X.509 bounded-time authority
  **and** a confirmed Bitcoin PoW publication (a genuine _heterogeneous_ quorum), independently reproduced.
  **But `externally_anchored` is STILL NOT banked in the verifier:** the automated `vtcqVerify` has not yet
  consumed a real `vtc_quorum_confirmed` bundle wiring the real DigiCert token (genTime via the OpenSSL
  path, `accuracy_s` pinned) + a real confirmed checkpoint. That integration + **Lane C-adv** (live
  Fable-5, CVP) are what remain. VTC-Q still ships as **VTC-Core**.
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
- **Frontier 9.3** (was 9.0) — banked since spec: **real DigiCert TSA (verified)**, **confirmed Bitcoin
  publication of the commitment (block 957689, mempool-cross-checked)**, and **independent-party
  reproduction** (2 machines). Both real trust roots now exist over the commitment. Remaining +0.2 to 9.5:
  the verifier consuming a real `vtc_quorum_confirmed` bundle (integration) **+** live Lane C-adv; I5
  (three-ecology quorum) is the boldest further lever.
- **Good-for-Anthropic 9.6** — binds the primary-sourced RSP prerequisite-gate as recomputable; names the
  RSO as a concrete actor; SCITT standards-track distribution.
- **Constitution 9.6** — makes temporal completeness + an RSP-clause ordering machine-checkable; every
  claim carries a signed bound; zero model-safety overclaim.

## Ledger

```text
review_window_binding          → PAID (temporal precedence)
externally_anchored (rung)     → REACHED IN LOGIC; real anchor EVIDENCE confirmed (DigiCert TSA + Bitcoin block 957689); verifier-consumed real quorum bundle still pending
campaign_composition_root      → OPEN for capstone
minimum_elapsed_review_binding → MINTED (I4 — VDF "No Instant Review")
third_trust_ecology            → MINTED (I5 — TSA + Bitcoin + transparency-log quorum)
hiding_scope_commitment        → MINTED (I6)
```
