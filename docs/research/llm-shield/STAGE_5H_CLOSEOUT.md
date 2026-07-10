# Stage 5H — VSD: Verifiable Safety-claim Disclosure (closeout)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-10-stage-5h-vsd-safety-claim-disclosure-design.md` ·
> Plan: `docs/superpowers/plans/2026-07-10-stage-5h-vsd-safety-claim-disclosure.md`.
> Version **v2.43.0-stage-5h-vsd** · raw codes **300–315** · branch `stage-5h-vsd`.

## What shipped

The verifier extends the Completeness Invariant to the **reproducibility tier of a safety claim**.
Every claim carries a **declared consequence** and a verifier-**computed reproducibility tier**
(`restricted → controlled → public`), and the verifier enforces the **Right-Scaling Law**:
`rank(declared_consequence) ≤ rank(max_consequence(proven_tier))`.

- **Two typed lattices + one inequality.** Tier is COMPUTED from artefact availability + offline
  recompute; `warrant(tier)` is a **typed pair** `(max_consequence, support_quality)` (the source's
  "full" vs "qualified" distinction, preserved). Headline failures: **tier overclaim (311)** and the
  **Evidential-Inversion Detector (312)** — a claim consequence exceeding what its proven tier
  warrants fails closed.
- **Four laws:** No Evidential Inversion / No Tier Without Recompute / No Undeclared Redaction
  (Completeness applied to disclosure) / No Scope Substitution.
- **Three signed objects** (producer claim inventory / secure-review-host receipt / Simurgh
  attestation); no object signs itself; six domain separators, **every one consumed by a named
  check** (no dead domains). External verifier pin + host registry supplied from OUTSIDE the bundle.
- **Presence-driven, fail-closed:** a truthful `restricted`/`contextual` claim verifies raw 0; a
  valid `not_reproduced` receipt is a **tier fact**, never an error; `public`-declared claim with no
  recompute kernel → **315** (never a silent downgrade); `vsdCore` is **pure** (the kernel runs only
  in the Node orchestrator).
- **Lanes:** A (byte-stable synthetic "Redacted Risk Report" — the Oxford worked-example family;
  verifies raw 0 public+audit), B (two-process blind review ceremony — the controlled-tier mechanism
  played for real; the ceremony receipt is the SAME species as the bundle receipt), **C (real
  independent-party disclosure — pack prepared, campaign `pending`; see below)**. **JS↔Python↔browser
  parity** on the deterministic surface, **10 Lean theorems + 1 lemma** (zero `sorry`).
- **Beast inventions:** Inversion Census, Right-Scaling Distance (the field's "evidential inversion"
  as a signed integer), the Frontier-7B fixture family (traceable to the Oxford paper's own worked
  example), Cross-Attestation Chaining (a prior attestation as a claim artefact), Disclosure Debt.

**Tests:** 75 stage5h unit + 11 K7 e2e; reproduce script **ALL PASS** under Node 26 (incl. the Lane C
fail-closed campaign gate + byte-stability sorted-manifest compare). The prior 5F/5G reproduce scripts
still pass and their Lean still compiles (sealed history undisturbed). Additive codes 300–315 rippled
both `exit-map.json` goldens + the exitWrapper inline map — regenerated under Node 26.

## Lane C — real independent-party disclosure (status: pending)

The outbound pack (`/Users/raoof.r12/Desktop/Raouf/test/simurgh-stage5h-vsd-lanec-pack-20260710/`) is
prepared for the independent droplet team with the **roles split so no party hosts its own claim**:
they act as PRODUCER over their real 5G PG2 capture (cross-attestation chaining — their 5G
attestation becomes a `present[]` artefact by digest; Simurgh's ceremony key hosts that claim) AND as
REVIEW HOST over our Lane-A controlled claim (the real `secure_review_host_independence_deferred`
payment). No independent-party run has returned this session, so the committed
`evidence/stage-5h/lanec/campaign-outcome.json` honestly records `status: "pending"` — and the
reproduce gate is fail-closed on it (a `completed` status would require the real-disclosure dir to
exist and verify raw 0; `pending` requires it to be ABSENT). The Lane C ingest tool is built and
tested (fixture keys standing in) and verifies an assembled attestation raw 0. **Frontier is scored
WITHOUT the real-capture lever**, exactly as 5A/5C did when their real capture was not executed.

## Positioning (the honest statement of record)

VSD is **not category-creating on tier taxonomy** — Oxford (2605.08192) defines the three-tier
disclosure framework, FMTI defines transparency scoring, Brundage (2601.11699) defines the AALs. VSD's
new geometry is narrower and executable: the **computed** tier, the **typed warrant pair**, and the
**fail-closed right-scaling inequality**, per claim, offline, **TEE-free** (both incumbent attested-
audit systems are TEE-rooted — they concede they "trust the hardware vendor"). SCITT is complementary
(a VSD attestation is a registrable Signed Statement; VSD computes what SCITT declares opaque).
Crosswalks deferred; no conformance claimed.

## Signed limitations (admit irregularity over overclaim)

1. **Reproducibility ≠ correctness.** VSD verifies a claim's tier and right-scaling — not that the
   claim is true or the eval well-designed (the behavioural-assurance seam, 2605.15164). → VPC + validity.
2. **The real independent-party capture is NOT executed this session** (`status: pending`); the
   byte-stable Lane-A evidence is a **synthetic** demonstration. → `real_risk_report_pilot_deferred`.
3. **Consequence is producer-declared** — VSD checks it is _supported_, not that it wasn't
   _under-rated_ to duck the floor. → `consequence_self_rating_contest_deferred` (VPC).
4. **The secure-review host is bound, not vouched** — R1 binds that a named pinned host recomputed,
   not that the host is independent/honest. → `secure_review_host_independence_deferred`.
5. **Claim text is bound by bytes, not meaning** (`claim_text_digest`) — the 4W/4X lexical-not-
   semantic seam, inherited. → `claim_text_semantic_binding_deferred`.
6. **Pre-existing, unrelated:** `tests/unit/securityHardening.test.js` (a Stage-2 server/API-key test)
   fails in this environment; it fails MORE at the branch base (2 vs 1) and references none of the VSD
   code — not a VSD regression.

## Socket ledger

**Narrows:** the repo's two-tier attestation posture (tiers now _computed_), and 4W/4X's
lexical-not-semantic seam (inherited on `claim_text_digest`). **Mints:**
`consequence_self_rating_contest_deferred` (→ VPC), `secure_review_host_independence_deferred`,
`withheld_artefact_content_deferred`, `claim_text_semantic_binding_deferred`,
`real_risk_report_pilot_deferred`.

## Four-axis scorecard — re-scored at closeout

| Axis               | Spec-time | Closeout | Why the closeout value                                                                                                                             |
| ------------------ | --------: | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            |       9.3 |  **9.3** | First executable evidential-inversion verifier (computed tier + typed warrant + fail-closed inequality); Oxford remains the acknowledged neighbour |
| Frontier           |       8.5 |  **8.5** | Full verifier + all lanes + parity + Lean shipped; **real independent-party capture NOT executed** (campaign `pending`) — held at spec-time value  |
| Good-for-Anthropic |       9.6 |  **9.6** | Direct substrate for the RSP v3.0 disclosure regime (Risk Reports + expert reviewers + gap docs); ready pack; no external pilot has run it yet     |
| Constitution       |       9.5 |  **9.5** | Mechanises "claims must not outrun their evidence" with a typed fail-closed inequality; the truth-boolean absence is a Lean lemma                  |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it does not imply Anthropic
review, adoption, or endorsement._

## Post-release confirmations (TO-CONFIRM after tag)

- reproduce-on-main (Node 26): **TO-CONFIRM**
- tag commit == reproduced HEAD: **TO-CONFIRM**
- GitHub Release published + marked Latest: **TO-CONFIRM**

## Next

**VPC** (producer/panel contest — pays `consequence_self_rating_contest_deferred` +
`secure_review_host_independence_deferred`) then **VUC** (external universe commitment), completing
the External Accountability arc. The nearest Frontier lever: execute the real Lane-C disclosure with
the droplet team (flip `pending → completed`).
