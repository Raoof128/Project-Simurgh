# Stage 5M — VTC-Quorum: closeout

**Blade.** The verifier consumes and independently validates an **exact three-of-three** external-anchor ecology — RFC-3161 TSA + Bitcoin-confirmed OpenTimestamps + Rekor transparency-log inclusion — all binding one commitment `D`, and only then banks `externally_anchored`. Layered additively on the frozen 5L core (codes 364–383 untouched); new codes **384–395**. Motto: _ClaimSafe first, then ReviewerSafe._

## What shipped (all green)

- **Pure core**, all 12 raw codes + two-level state (`computed_ecology_state` vs `outcome_class`), `394` (lie) before `393` (gap).
- **Real Node adapter** — RFC6962 inclusion + checkpoint STH + SET + submitter — validated **offline against the real captured Rekor entry**; expected defects become typed facts (never a throw → never 395).
- **Two-tier attestation** (distinct public/audit domains) + emit-only **in-toto** candidate predicate.
- **11 Lean theorems** (core Lean 4.15, no mathlib, zero `sorry`, no user axioms).
- **Tri-runtime parity** Node ↔ Python ↔ browser (WebCrypto); **independent Lane D** (Python consumes the raw packet itself).
- **Deterministic Lane C corpus** (CI-gated): counterfeit ecology→392, cross-log→388, cross-commitment replay→386, honest floor→393, promoted floor→394.
- **K7 all-functions net** + `reproduce-llm-shield-stage5m.sh` (Node 26), wired into `check-e2e.sh`.
- **Real 3-ecology capture** over commitment `D = c20e70f5…eabb1`: DigiCert token (imprint == `D`, chains to Root G4), Rekor entry (`sha256(hex(D))`), OTS (leaf == `D`).
- **75 unit+e2e tests + Lean**, all green; 5I–5L undisturbed.

## Honest status of `externally_anchored`

**Not yet banked.** The verifier wiring (`verifyVtcQuorum`) drives the *real* frozen 5L core over the *real* signed Lane-B bundle and reaches the **honest pending floor `372`** (`required_confirmed_publication_absent`) — it correctly refuses to bank while the OTS is unconfirmed. Banking to **raw 0** is the signed next step (**Task 1B close**), gated on:

1. the re-captured OTS reaching **Bitcoin confirmation** (a fresh block; the earlier `D` was Bitcoin-confirmed in block 957 774 but had a window bug — see lesson);
2. minting a tsa-verifier-signed `checkpoint_evidence` with the confirmed block values;
3. a live run confirming codes **375–382** (receipt/capability/release/census) pass on the confirmed bundle (only `364–374` are exercised on the pending bundle today).

This is VTC-Core → VTC-Quorum: the first time the stack assembles a full real confirmed bundle for `externally_anchored`. It ships honestly as **pending** until the confirmation lands.

## Lesson banked

The first captured `D` committed `review_window.window_open_not_before = 2000`, which fails `374` (`checkWindowCoherence` requires `window_open_not_before >= tsaUpperBound` — the review window must open *after* the timestamp). Because the window is inside the commitment, `D` had to be **recomputed with a coherent window (`window_open = 1_900_000_000`) and all three anchors re-captured**. Verify a full bundle assembly through the real 5L core *before* trusting a capture's ceremony values.

## Non-claims (signed discipline)

Banking (when it lands) proves only that the verifier consumed and independently validated the declared three-ecology quorum and that all seats bind one commitment via the canonical anchor. It does **not** prove semantic truth of the anchored content, that review was careful, physical elapsed review time, that the producer couldn't hold the material earlier, ecology non-collusion, general TSA/blockchain/log security, or model safety. Bounds: trust-on-pin for all three roots; single-log equivocation about its *own* tree remains **I8** (`checkpoint_witness_cosigning`); no OIDC/Fulcio submitter identity (**I7**); browser verifies the adapter attestation, not the anchor crypto; offline finality vs permanent finality.

## Four-axis scorecard (re-scored honestly at closeout)

| Axis | Pre-build target | Closeout | Note |
| ---- | ---------------- | -------- | ---- |
| Novelty | 9.3 | **9.3** | no-hardware/no-ZK 3-ecology quorum + rewrite-floor + equivocation bound |
| Frontier | 9.5 | **9.0** | real captures + verifier wiring proven, but `externally_anchored` **not yet banked** (pending Bitcoin) — re-score up to 9.5 on Task 1B close |
| Anthropic relevance | 9.6 | **9.6** | provider-agnostic bridge into Sigstore/in-toto both labs' prose reports lack |
| Constitution | 9.5 | **9.5** | rewrite-cost as a signed number across three verified ecologies |

Pays **I5** on release acceptance (banking). Mints **I7** + **I8**. Inventions I-A…I-H folded (Ecology Independence Number, in-toto bridge, split-view honesty, No Two Anchored Stories, equivocation bound, prior-art seam table, provider-agnostic wedge, non-regression law).
