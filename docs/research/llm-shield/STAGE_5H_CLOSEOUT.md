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
  independent-party disclosure — EXECUTED, campaign `completed`; see below)**. **JS↔Python↔browser
  parity** on the deterministic surface, **10 Lean theorems + 1 lemma** (zero `sorry`).
- **Beast inventions:** Inversion Census, Right-Scaling Distance (the field's "evidential inversion"
  as a signed integer), the Frontier-7B fixture family (traceable to the Oxford paper's own worked
  example), Cross-Attestation Chaining (a prior attestation as a claim artefact), Disclosure Debt.

**Tests:** 75 stage5h unit + 11 K7 e2e; reproduce script **ALL PASS** under Node 26 (incl. the Lane C
fail-closed campaign gate + byte-stability sorted-manifest compare). The prior 5F/5G reproduce scripts
still pass and their Lean still compiles (sealed history undisturbed). Additive codes 300–315 rippled
both `exit-map.json` goldens + the exitWrapper inline map — regenerated under Node 26.

## Lane C — real independent-party disclosure (status: COMPLETED 2026-07-10)

The independent droplet team executed **both split roles** on their own machines with their own
Ed25519 keys (a local host **and** the droplet `170.64.167.95`, Node v26.5.0).

- **REVIEW-HOST role (the load-bearing result).** Two unaffiliated hosts independently reran **our**
  committed Lane-A controlled recipe (`aggregate_mean` over `redteam-summary`) from `review-target/`
  and **reproduced our committed output digest `sha256:9f10dc0d…` BYTE-FOR-BYTE**, then counter-signed
  R1 receipts with keys **distinct from the Simurgh verifier**. The committed
  `evidence/stage-5h/real-disclosure/` is **our disclosed claim carrying the real droplet host
  receipt** (host fp `sha256:8c12ec8c…` ≠ verifier fp `sha256:6a5f0962…`); it **verifies raw 0
  audit** under its own external pin + host registry. This is the real
  `secure_review_host_independence_deferred` payment — an unaffiliated party recomputed a
  Simurgh-disclosed claim's evidence and cryptographically attested the reproduction.
- **PRODUCER role (honest bound).** Both hosts also filed signed producer claims (inventory_digest +
  Ed25519 signature independently verified, distinct keys per host) — but over the pack's
  **placeholder `refusal_rate: 0.94` artefact, NOT a real eval**. That half demonstrates cross-party
  producer signing only; ingesting it lands `311` (its declared tier isn't structurally supported by
  the placeholder), so it is **not** used as the completed evidence.

`campaign-outcome.json` records `status: "completed"`, and the reproduce gate is fail-closed on it
(completed ⇒ the real-disclosure dir must exist and verify raw 0). Verify-only: the receipt is signed
by a key we do not hold (non-possession is the point). Independent operational note: the team
generated fresh keys per host and removed the droplet artefacts after fetching each result.

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
2. **Real independent-party reproduction IS executed** (review-host role, two hosts, byte-identical,
   distinct keys — see Lane C). Remaining bounds: the CI-byte-stable Lane-A evidence is still a
   **synthetic** demonstration; the independent PRODUCER runs used **placeholder** data, not a real
   eval; and no **real published risk-report** claim (C-2) has been ingested yet. →
   `real_risk_report_pilot_deferred`.
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

| Axis               | Spec-time | Closeout | Why the closeout value                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------: | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            |       9.3 |  **9.3** | First executable evidential-inversion verifier (computed tier + typed warrant + fail-closed inequality); Oxford remains the acknowledged neighbour                                                                                                                                                                         |
| Frontier           |       8.5 |  **9.2** | **Real independent-party reproduction EXECUTED** — two unaffiliated hosts (own keys, local + droplet) reran our claim's recipe, reproduced `sha256:9f10dc0d…` byte-for-byte, counter-signed R1; real-disclosure verifies raw 0. Short of 9.5: producer-side data was placeholder; no real published-report claim (C-2) yet |
| Good-for-Anthropic |       9.6 |  **9.6** | Direct substrate for the RSP v3.0 disclosure regime (Risk Reports + expert reviewers + gap docs); ready pack; no external pilot has run it yet                                                                                                                                                                             |
| Constitution       |       9.5 |  **9.5** | Mechanises "claims must not outrun their evidence" with a typed fail-closed inequality; the truth-boolean absence is a Lean lemma                                                                                                                                                                                          |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it does not imply Anthropic
review, adoption, or endorsement._

## Post-release confirmations (2026-07-10)

- reproduce-on-main (Node 26): **ALL PASS** (incl. Lane C completed-campaign gate + byte-stability).
- tag commit == reproduced HEAD: **MATCH** — `v2.43.0-stage-5h-vsd` @ `f0b0ae52c2fe9b02506e12ee773f7affd1897cbc`.
- GitHub Release published + marked **Latest**: **CONFIRMED** (verified via `gh release list`).

## Next

**VPC** (producer/panel contest — pays `consequence_self_rating_contest_deferred` +
`secure_review_host_independence_deferred`) then **VUC** (external universe commitment), completing
the External Accountability arc. The nearest Frontier lever: execute the real Lane-C disclosure with
the droplet team (flip `pending → completed`).
