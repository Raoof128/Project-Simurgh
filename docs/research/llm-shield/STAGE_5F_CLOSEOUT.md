# Stage 5F — VMP: Verifiable Multi-detector Panel Attestation (closeout)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Version **v2.41.0**, branch `stage-5f-vmp`, raw
> codes **268–282**. Spec + plan: `docs/superpowers/specs/2026-07-10-stage-5f-vmp-multi-detector-panel-design.md`,
> `docs/superpowers/plans/2026-07-10-stage-5f-vmp-multi-detector-panel.md`.

## Blade

The Completeness Invariant instantiated on a **detector panel**: a single signed attestation binds N
precommitted released detectors (Prompt Guard 2 86M + Llama Guard 4 12B) to one shared committed corpus,
so every case discloses — for every member — either a verdict or a **typed, policy-checkable
non-result**. Selective omission across detectors becomes impossible to hide. **No aggregate panel
verdict is produced** (panel completeness ≠ detection completeness).

## Six verifier laws (all implemented + tested + Lean-checked)

**(L1)** No Post-Commit Panel Omission · **(L2)** No Silent Exam or Adapter Swap · **(L3)** No Membership
Rewrite · **(L4)** No Post-Hoc Applicability Rewrite · **(L5)** No Dropped Capture Record ·
**(L6) No Gerrymandered Universe** — precommit the detector universe; publish
`Omission Lower Bound = |universe| − |panel|`. Claim-rail: Disagreement Is Not Correctness.

## What shipped (verified, not asserted)

- **Verifier core, codes 268–282** — 13 pure modules + the `evaluatePanel` evaluator with the frozen
  first-failure order and the provenance-mode / 282 env-vs-tampering preflight. **Lexical** decimal-string
  score comparison — no `Number` touches a verdict.
- **Evidence builder + verify CLI** — public + audit both **raw 0**; strict-by-default with
  `--attestation-only`; external trust pin lives OUTSIDE the pack.
- **Lane B** blind-recompute ceremony + signed receipt (five acyclic digests, external ceremony pin,
  closeout inseparability). Two-process/two-key separation — NOT independent-party verification.
- **BYO-Panel adapter** (invention ②) — any team attests its own detectors offline (`provenance_mode:
"none"`, frozen semantics registry only, own pins).
- **Python parity** (independent digest + lexical-verdict reimpl) + **browser portable** verifier
  (`raw: null` capability set — never reads as a full raw 0).
- **Lean** `PanelCompleteness.lean` — 8 theorems + 1 lemma, **compiles clean under lean 4.15, zero
  `sorry`**; wired into `stage-4-lean-proofs.yml`.
- **K7 all-functions net + three tamper suites** (268–280 integrity / 281 policy / 282 environment —
  never conflated). **99 tests green** (70 unit + 29 e2e).
- **Fail-closed 8-step reproduce** (ALL PASS) + **independent-party conformance kit** (ALL PASS).
- **Lane C dual-detector capture harness** (PG2 CPU + LG4 12B 8-bit, isolated env locks, merge asserts
  the shared corpus) — present but **not yet executed** (see limitations).

## Beast inventions folded in

① Roster Coverage Commitment / Omission Lower Bound (Law 6). ② BYO-Panel Adapter Contract.
③ Full-Corpus Disagreement Observation (`heterogeneous_label_vector` = raw `{semantics, label}` per
member — **no boolean, no normalization**). ④ Panel Contest / Rerun Right spun out → next stage (VPC).
Plus the zero-code-path projections: `evaluatedObligationFraction`, the Cherry-Pick Test fixture family.

## Signed limitations (admit irregularity over overclaim)

1. **The committed evidence is a synthetic structural demonstration** over two real detector identities.
   The real dual-detector capture is Lane C (harness complete). An independent team has **reproduced the
   verify-only pack** (below) but has **not** run Lane C (their droplet had no GPU for LG4 12B), so the
   detectors are still not grounded. Lane C on a GPU droplet — **independent-party evidence generation** —
   remains the → 10 Frontier lever. Frontier is held pending that run, not downgraded.

## Independent-party reproduction (post-pack, 2026-07-10)

An **unaffiliated team ran the reviewer pack on their own hardware** — a local machine (Node v22.16.0)
and a **droplet `170.64.167.95` under Node v26.5.0** (scp upload → extract → run → delete). **Both runs:
`ALL PASS`, byte-identical** (step 7 rebuilds the evidence and compares against the shipped bytes, so a
pass means their Node-26 rebuild reproduced our committed digests exactly on foreign hardware). This is
**independent-party _reproduction_ of committed evidence, verify-only** — the verifier, attestation
contract, Lane B ceremony, JS↔Python parity, and byte-stability all hold off our machines. It is **NOT
independent-party evidence generation**: no detector was run (no GPU), so it does not move Frontier. The
run surfaced **no defects** (the pack shipped with the 5E fail-closed + full-dependency lessons already
baked in). 2. **Offline pinned weights ≠ a hosted endpoint** (carries `live_endpoint_attestation_deferred`). 3. **The Omission Lower Bound only bites within a committed universe** — a producer who declares
`universe = roster` truthfully gets bound 0. Universe representativeness is minted
`universe_completeness_deferred`. 4. **Two-process/two-key ≠ independent-party verification.** 5. **Panel completeness is not detection completeness**; heterogeneous semantics are declared, never
reconciled into an aggregate.

## Socket ledger

**PAYS** `multi_detector_panel_deferred` (minted by 5E). **PARTIALLY PAYS**
`roster_representativeness_deferred` (silence surface published; remainder re-minted
`universe_completeness_deferred`). **MINTS** `panel_aggregation_policy_deferred`,
`universe_completeness_deferred`, `panel_contest_deferred` (→ VPC), `portable_historical_kernel_deferred`.
**Carries** `multilingual_ruleset_deferred` (→ 5G VML), `live_endpoint_attestation_deferred`,
`unicode_confusables_kernel_hardening_deferred`, `downstream_efficacy_target_deferred` (→ 5H VDE).

## Four-axis scorecard — re-scored at closeout

| Axis               | Spec-time | Closeout | Why the closeout value                                                                                                                                                              |
| ------------------ | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.4       | **9.4**  | prior-art kill-test executed; the panel-completeness object survives, positioned against four neighbor classes                                                                      |
| Frontier           | 8.7       | **8.7**  | held — Lane C capture is **pending an independent team** (independent-party evidence generation, the → 10 lever); the harness is complete and the synthetic evidence verifies today |
| Good-for-Anthropic | 9.2       | **9.2**  | BYO-Panel contract makes it self-serve; no external pilot has run it yet                                                                                                            |
| Constitution       | 9.2       | **9.2**  | visible silence surface + attestation-truth/policy separation; VPC contest (→ 9.4) spun out                                                                                         |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it does not imply Anthropic
review, adoption, or endorsement._

## Next

An **independent team runs the Lane C dual capture** on their droplet (independent-party evidence
generation → Frontier 9.3–9.4). Then **5G VML** (multilingual, pays the oldest debt), **5H VDE**
(downstream efficacy), and **VPC** (Panel Contest / Rerun Right).
