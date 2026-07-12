# Stage 5K — VUC: Verifiable Universe Commitment (closeout)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-12-stage-5k-vuc-universe-commitment-design.md`.
> Plan: `docs/superpowers/plans/2026-07-12-stage-5k-vuc-universe-commitment.md`.
> Branch `stage-5k-vuc`. Raw codes **348–363**. Extends the External Accountability arc
> `VPC(5I) → VRC(5J) → **VUC(5K)** → VTC → capstone`.

## The blade

VUC proves the ceremony could not quietly **swap, shrink, or reinterpret what "everything" means after
commitment**: an authorship-bound, externally-ordered universe commitment (a canonical Merkle-set), chained
to exact reviewer/producer start obligations and fresh execution outputs, with **independent** equality
against each downstream component:

```text
U_commit = U_vpc   (independently)
U_commit = U_vrc   (independently — never through a union)
```

Honesty guardrail: "the declared evaluation universe was fixed before the accepted oversight ceremony and
was neither narrowed nor expanded later, verifiably" — **NEVER** "the universe was the right/complete one."
**Mints `universe_adequacy_deferred`.**

## What shipped (all green)

- **Pure `vucCore`** — 12 ordered checks (349–360) + audit projections (361) + policy (362) + fail-closed
  wrapper (363), frozen first-failure order; `348` schema before `makeCtx`. Pure over `(bundle, cfg, facts)`;
  crypto + the two-axis anchor state done by the node adapter (B11).
- **Cycle-free identifiers** — `commitment_session_id = H(commitment, nonce)` signed pre-anchor;
  `ceremony_id = H(commitment, ordering_receipt, nonce)` formed post-order.
- **Frozen Merkle-set** `simurgh.vuc.merkle_set.v1` — raw-byte node hashing, odd-node promoted, strict
  `sha256:<hex>` encoding, `buildInclusion`/`verifyInclusion` proven across tree sizes 1–9.
- **Real Ed25519 end-to-end** — `buildSignedVucBundle` mints the full signed ceremony over ONE
  `lanePanelSpec` section source (shipped 5J builder UNCHANGED), so `U_commit = U_vpc = U_vrc` **by
  construction**; the adapter re-verifies the embedded 5I + 5J bundles to earn the upstream verdicts.
- **Split attestations** — public never certifies projections; audit binds the public digest +
  `projection_root` + `computed_finality_state` under the same `verification_context_digest` AND
  `policy_digest` (audit ⟹ public).
- **Byte-stable Lane-A pack** (`docs/research/llm-shield/evidence/stage-5k/`, 4 files) — public + audit raw 0,
  build-twice-cmp identical.
- **Node ↔ Python parity** — stdlib-only reimplementation byte-agrees on `universe_root`,
  `universe_commitment_digest`, and the `U_commit`/`U_vpc`/`U_vrc` set digests.
- **11 Lean theorems** (`proofs/stage5k/`, Lean v4.15.0, no mathlib) — zero unfinished goals, no user
  axioms; `commitmentBinding` depends on NO axioms (collision-resistance is a passed hypothesis).
- **K7 all-functions e2e** — every export exercised, full tamper reachability 349–363, cross-stage
  invariant (embedded 5I + 5J verdicts 0).
- **Beast package** — Scope Trilemma (`noSilentScopeChange`), blind set-equality theorem, regression /
  commit-first-margin / omission-claim censuses (audit 361, verdict-neutral), G13 adequacy-vocabulary belt,
  in-toto/SCITT bridge (`external_registry_anchor`).

**Tests:** 54 stage5k unit + 5 K7 e2e green; reproduce ALL PASS (Node 26); **5I + 5J reproduce undisturbed.**

## Deferred to a follow-up (honest)

- **Lane B** (multi-party content-blind-sequencer ceremony), **Lane C** (real externally-anchored commit-first
  ceremony + droplet package + Lane C-adv live gerrymandering producer), and **browser** WebCrypto parity are
  NOT yet built. The core blade, Lane A evidence, parity, Lean, and K7 are complete; these lanes add
  independent-execution and adversarial evidence and are the natural next increment.

## Four-axis scorecard (closeout, honest)

| Axis                   |                 Score | Note                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            |               **9.0** | First declared-universe-to-evaluated-universe equality + sequencer-chain precedence + reviewer/producer execution bindings over a Merkle-set commitment. The beast package deepens it, but two Lean lemmas are not a first-of-kind proof (needs the external prior-art sweep + a novelty source-map + independent reproduction). |
| **Frontier**           |               **9.0** | Targets scope-gerrymandering under Art. 55 + the Wirecard/MITRE-ATT&CK-scope wound. The +0.4 to 9.4 is **unbanked** — it requires Lane C-adv AND a real commit-first anchored ceremony to execute (deferred).                                                                                                                    |
| **Good-for-Anthropic** |               **9.4** | Answers "did the review cover the committed whole, fixed before the ceremony?" Omission-Claim gives a regulator a recorded voice; blind set-equality verifies a confidential report's scope from digests. Grounded in Anthropic's own MITRE ATT&CK V18 scope disclosure.                                                         |
| **Constitution**       | **9.4** (VUC ceiling) | The purest Completeness-Invariant deepening — no selective omission at the universe level — without claiming adequacy.                                                                                                                                                                                                           |

## Socket ledger

**PAYS** `uncommitted_section_universe_deferred` (5I). **MINTS** `universe_adequacy_deferred`. **CHIP** on
`real_sigstore_anchor_execution_deferred` remains open (no real anchor executed). Arc spine reserved
(typed-null, 362-guarded): `review_window_binding` (VTC), `campaign_composition_root` (capstone).

## Prior-stage note

5J's OpenTimestamps public witness is **Bitcoin-confirmed** (blocks 957642 and 957644; `campaign-outcome.json`
and release notes updated; main `96265f2a`). VUC embeds and reuses the sealed 5I and 5J packs unchanged.
