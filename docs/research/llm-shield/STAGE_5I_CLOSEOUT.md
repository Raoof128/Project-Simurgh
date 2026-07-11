# Stage 5I — VPC: Verifiable Panel Coverage (closeout)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-11-stage-5i-vpc-panel-coverage-design.md` ·
> Plan: `docs/superpowers/plans/2026-07-11-stage-5i-vpc-panel-coverage.md`.
> Version **v2.44.0-stage-5i-vpc** · raw codes **316–331** · branch `stage-5i-vpc`.

## What shipped

The verifier turns RSP v3.4's split-external-review condition — _"all parts of the unredacted report
are evaluated by at least one external reviewer"_ — into an offline-recomputable relation over a
committed report partition, signed access grants, and reviewer receipts.

- **The blade:** grant-bounded coverage **equality** `⋃C(r) = S` with **computed** reviewer + host
  independence (5G rung lattice re-instantiated), a **no-silent-filter census** (every supplied panel
  member qualifies or the bundle fails closed), and **externally-anchored non-affiliation**.
- **Three laws:** No Section Left Unreviewed (327) · No Phantom Review (323) · No Self-Vouched
  Reviewer (325/326).
- **Beast-mode inventions:** the **Adequacy Gate** (`VPC_ADEQUACY_CLAIMED`, 328) — a coverage verifier
  **structurally unable to certify the review was adequate**; an adequacy/quality assertion in the flat
  annotation surface fails closed **even at full coverage** (`noForbiddenAdequacyAssertion`, honestly a
  bounded-vocabulary check, not a semantic proof). Plus two zero-code projections: the **Coverage
  Depth Census** (`single_reviewer_sections` fragility map) and the **Typed Coverage State**
  (covered / assigned_only / unassigned coordination-theater map).
- **Codes 316–331**, house-partitioned (public 316→328, audit-only 329, policy 330, wrapper 331), all
  → exit 1; frozen first-failure order owned by the pure `vpcCore` (crypto arrives via `facts`, B11).
- **Two roots** (`panel_subject_root` excludes challenge receipts) break the challenge↔root cycle.
- **Three evidence lanes:** **A** byte-stable synthetic pack (committed keys → deterministic Ed25519;
  verifies raw 0 public + audit; byte-stable; `wirecard-*` fixture) · **B** deterministic multi-process
  panel ceremony (per-reviewer child processes, ≥2 reviewers, `∀r C(r) ⊂ S`, `⋃C = S`) · **C** the real
  Opus 4.6 Sabotage Risk Report public structure (37 leaf sections), campaign **COMPLETED** — real
  independent-party ceremony executed (distinct keys, our verifier accepts raw 0).
- **JS ↔ Python ↔ browser parity, byte-identical** on the committed pack (same raw 0, same
  `partition_digest` / `panel_subject_root` / `panel_evidence_root`).
- **9 Lean theorems, zero `sorry`** (rung monotonicity, first-failure uniqueness/soundness, gap↔coverage
  decomposition, no-silent-filter, bounded adequacy, no-phantom, producer binding, coverage soundness).

**Tests:** 37 stage5i unit/e2e green (incl. the K7 all-functions net asserting every raw 316–331
reachable + evidence lock); reproduce script **ALL PASS** (Node 26); the prior 5H reproduce still
passes (sealed history undisturbed); full repo unit suite green **except** the pre-existing Stage-2
`securityHardening` / `ANTHROPIC_API_KEY` baseline (references no VPC code). Additive codes 316–331
rippled both `exit-map.json` goldens + the inline `RUN_LEVEL_BY_RAW` map **and** a 7th hardcoded
consumer (`exitWrapper.test.js`) the trap-list warned about.

## Lane C — real independent-party ceremony (status: COMPLETED 2026-07-11)

The independent droplet team ran the full split-review ceremony with **their own keys** over the
**real Opus 4.6 public structure** (37 leaf sections, `toc-leaf-partition`; per-section
`redaction_types = []`, no invented metadata). Their pack (`evidence/stage-5i/real-structure/`)
**verifies raw 0 (public + audit) under our repo verifier**, with a **verifier key distinct from ours**
(`sha256:8a7d5d15…` ≠ our `sha256:e33e2d3f…`) and distinct reviewer keys — **non-possession is the
point** (we cannot rebuild it). 2 reviewers, each covering a proper subset, union = the full 37-section
structure, `coverage_gap = 0`; `evidence_root sha256:b72ca365…`. The **fail-closed campaign gate** now
requires `completed ⟹ pack present AND verifies raw 0`; `pending` remained honestly labeled until this
ran, and a `completed` claim whose pack fails verification is rejected.

Signed non-claim (unchanged): `public_report_structure_coverage`, **NOT**
`rsp_unredacted_report_compliance`; it does not observe Anthropic's confidential report or actual review
panel, and the affiliation axis is **modeled** — only the reviewer/host **separation** axis
(`challenge_bound`) is real.

## Positioning (the honest statement of record)

VPC is **not category-creating** — RSP v3.4 defines the coverage condition; the EU AI Act Art. 55 + GPAI
Code of Practice mandate independent external evaluation over a risk taxonomy; the third-party-review
literature (arXiv 2505.01643) proposes such review. VPC is the **executable, byte-reproducible verifier**
under all of them. In the scoped prior-art search, no mechanism combines many-to-many grant-bounded
reviewer→section coverage with computed reviewer AND host independence, externally-anchored
non-affiliation, a no-silent-filter census, and independent public recompute. in-toto's `threshold` is
same-step redundancy; SCITT/RFC 9943 registers signed statements (VPC = a registrable profile);
CODEOWNERS/Gerrit give forge-hosted path coverage without computed independence or offline recompute.

## Signed limitations (admit irregularity over overclaim)

1. **Coverage ≠ diligence/correctness.** VPC proves every section was assigned to an independent
   reviewer with access who attested evaluation — NOT that they read carefully or judged correctly. →
   `reviewer_assessment_contest_deferred` (VRC).
2. **`challenge_bound`, not `externally_anchored`.** Separation reached rung 1; a real Sigstore-OIDC
   anchor is unexecuted → `real_sigstore_anchor_execution_deferred` (5G, open).
3. **Lane C is public-structure-only** (real independent-party ceremony EXECUTED — see above); its
   affiliation axis is modeled, and it does not observe the confidential report or Anthropic's real panel.
4. **Producer-committed section universe** — selective/gerrymandered universe not caught here →
   `uncommitted_section_universe_deferred` (VUC).
5. **The adequacy gate is a bounded vocabulary over a bounded surface**, not a semantic-absence proof.
6. **Pre-existing, unrelated:** `tests/unit/securityHardening.test.js` fails in this environment;
   references no VPC code — a baseline exception, not a VPC regression.

## Socket ledger

**PAYS** `producer_affiliation_deferred` (5G) + `secure_review_host_independence_deferred` (5H), each at
the rung achieved (`challenge_bound` separation + externally-pinned affiliation). **CHIPS**
`real_risk_report_pilot_deferred` (real Opus 4.6 structure + executed independent-party ceremony; not
hard-paid — it is the report's public STRUCTURE, not a full real-report claim-with-evidence pilot).
**MINTS** `reviewer_assessment_contest_deferred` (→ VRC) + `uncommitted_section_universe_deferred` (→ VUC).
Ledger flat (2 mints, 2 pays). Penciled future rung: **VTC** (temporal coverage, beast-mode D — a
distinct blade, not minted).

## Four-axis scorecard — re-scored at closeout

| Axis               | Spec-time | Closeout | Why the closeout value                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | --------: | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Novelty            |       9.0 |  **9.0** | First executable coverage verifier that fails closed on a frozen adequacy vocabulary (`noForbiddenAdequacyAssertion`) + computed reviewer/host independence + no-silent-filter census. in-toto is the acknowledged neighbour.                                                                                                                                |
| Frontier           |       9.0 |  **9.3** | Verbatim RSP v3.4 anchor (3 days old) + real Opus 4.6 public structure + 3-runtime byte-identical parity + **real independent-party ceremony EXECUTED** (droplet team, own keys distinct from ours, 37 sections, our verifier accepts raw 0). Short of 9.5: separation is `challenge_bound` (not `externally_anchored`) and the affiliation axis is modeled. |
| Good-for-Anthropic |       9.3 |  **9.3** | Executable verifier for the exact coverage guarantee RSP v3.4 wrote into policy, matched to a named report; multi-regulator (EU AI Act). No process-owner pilot has run it yet.                                                                                                                                                                              |
| Constitution       |       9.2 |  **9.2** | Mechanises "every section reaches a reviewer" — completeness applied to oversight; the adequacy gate makes coverage-≠-diligence a fail-closed code, the purest anti-overclaim.                                                                                                                                                                               |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it implies no Anthropic review,
adoption, or endorsement._

## Next

**VRC** (Verifiable Rating Contest — pays `reviewer_assessment_contest_deferred` +
`consequence_self_rating_contest_deferred`), then **VUC** (universe commitment), completing the External
Accountability arc; **VTC** (temporal coverage) penciled after. Nearest Frontier lever: execute the real
Lane-C ceremony with the droplet team (flip `pending → completed`).
