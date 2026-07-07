# Stage 4X — VLR (Verifiable Leakage-Residue) Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** Public-facing: provider-safe
first, then reviewer-safe.

- **Shipped:** 2026-07-08 on branch `stage-4x-vlr`. Target tag
  `v2.33.0-stage-4x-vlr`. Prev: v2.32.0-stage-4w-vsn (main 08597061).
- **Laws:** **A Signed Limitation Must Bleed a Number** · **The Gate Reports
  Its Own Misses** · **A Shrunk Bound Must Be Monotone.**
- **Banner:** 4W signed the prose limitation "the leakage gate is lexical, not
  semantic." 4X converts it into a signed, byte-reproducible **number** and
  shrinks the bound — **v1 misses 6/6 metamorphic paraphrases; v2 shrinks the
  miss to 1/6, the irreducible semantic floor.** No live-model lane, no
  adversarial elicitation — the "novel-attack" strength comes from
  `incident_sourced` provenance, measured reproducibly.

## Core claim (frozen)

For a frozen dual-provenance corpus, each item is a real quantitative **seed**
(v1 catches it) plus a declared **metamorphic relation** from a signed transform
table `vlr.metamorphic.v1`; the paraphrase **residue** is _derived_ as
`applyMR(seed)` — a pure function, so a reviewer reproduces the entire residue
set byte-for-byte. The verifier runs the real frozen `vsn.leakage.v1` and an
additive `vsn.leakage.v2` over every item and emits a signed ledger sealing a
per-item outcome table; the **public tier** verifies the aggregates by
arithmetic (no gate call, 178), the **audit tier** re-runs the gate to check the
sealed outcomes (177). Monotonicity (R′ ⊆ R) is recomputed, never trusted (179);
the frozen-gate binding (176) checks both the v1 ruleset digest and a 4W
source-digest witness over the imported gate files.

## What shipped

- **Raw codes 173–180** (wrapper LAST at `INTERNAL_FAIL_CLOSED_VLR` 180),
  additive in the shared 4H ledger; golden ripple absorbed (both `exit-map.json`,
  the `stage4h/exitWrapper.test.js` level map).
- **Metamorphic residue** — residue is `applyMR(seed)` under a signed table, so
  the headline number is not author-constructible on the residue side (the
  self-gauntlet Finding-2 hardening; Lean `metamorphicResidueReproducible`).
- **Two-tier ledger split** — sealed `per_item_outcomes`; public = arithmetic
  (178), audit = live gate re-run (177). The swapped-pack fixture is
  public-green / audit-red.
- **gateV2** = v1 ∪ a **disjoint** hedge/fraction/bulk lexicon (a machine
  assertion locks the disjointness so Finding 1 — a residue already caught by
  v1 — can never recur). v2 is a **measurement ruleset, not a deployed policy**.
- **Frozen-gate binding + 4W source-digest witness** (176) — the
  read-only-leakage-kernel proof for a stage that RUNS the gate: any edit to the
  4W constants OR the wrapper trips it.
- **Coverage witness** — the seed set exercises every v1 lexical rule (sweep,
  not cherry-pick).
- **Three evidence lanes** — Lane A: byte-stable corpus + ledger + attestation
  and the full 173–180 tamper matrix; Lane B: a genuine two-OS-process blind
  recompute ceremony (process-isolated, not implementation-independent; parent
  proven dumb by a source-negative test); **no Lane C by design** (no adversary).
- **Two-tier Ed25519 attestation** — Merkle root over {corpus, ledger}, signed
  with `stage4x` key; `keyDigest` over the public PEM both sides.
- **Parity** — Python `vlr_parity.py` (second independent gate+ledger impl) and
  a static browser `vlr-verifier.html` (hash-based CSP + a CI hash-consistency
  guard; node:vm parity renders the residue map). Ed25519 stays
  Node-authoritative (parity non-claim).
- **Five Lean theorems, zero sorry** — `boundMonotone`,
  `metamorphicResidueReproducible` (substantive), plus `residueLedgerSound`,
  `frozenGateBinding`, `residueIsRecordedNotFailure` (invariant-locks).

## Honest limitations (signed)

1. **The shipped corpus is a 6-item seed.** The 6/6 → 1/6 number is a
   proof-of-concept over a small frozen corpus, not a large benchmark; scaling
   the corpus is a tracked debt.
2. **Corpus-constructible on the seed side** — the residue is reproducible, but
   seed and MR-table choice are author-declared (public, signed,
   coverage-bounded), not eliminated.
3. **Ground-truth labels are author-declared** under a frozen rubric.
4. **v2 shrinks but never closes** the lexically-reachable residue; an
   irreducible semantic floor remains (measured, not eliminated).
5. **Lane B is process-independent, not institution-independent.**
6. **Ruleset v1 and v2 remain English-centric.**

## Socket ledger (ADR)

`semantic_leakage_adversary_deferred` → **SUPERSEDED_BY**
`semantic_residue_measurement_deferred` → **PAID_BY** `stage-4x-vlr` (measurement,
not an adversary; the superseded socket is never marked PAID directly).
Reserved (open): `irreducible_semantic_residue_deferred` (minted floor),
`multilingual_ruleset_deferred`, `narrative_version_diff_deferred`,
`transparency_report_profile_deferred`, plus the two 4Y/4Z sockets
`residue_over_submitted_narrative_deferred`, `cross_gate_residue_benchmark_deferred`.

## Four-axis scorecard (re-scored post-evidence)

| Axis                     | Spec-time | Shipped | Why the change                                                                                                                          |
| ------------------------ | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | 9.4       | **9.3** | Mechanism landed exactly as designed; trimmed 0.1 for the small shipped corpus.                                                         |
| Frontier                 | 9.2       | **9.0** | Reproducible metamorphic slip-rate is real; the 6-item corpus is a seed, not scale (honest downgrade, cf. 4P).                          |
| Lab/regulator usefulness | 9.7       | **9.6** | Named-actor cluster (Anthropic RSP, NIST CAISI AI 800-2, MLCommons/AISI, ISO 42001); 10 needs real adoption / submitted-narrative (4Y). |
| Constitution             | 9.5       | **9.4** | Publishes its own gate's miss set against itself with a signed floor; trimmed with the corpus-scale caveat.                             |

## Reproduce

```bash
bash scripts/reproduce-llm-shield-stage4x.sh   # Node 26, offline, byte-stable
```

## Gotchas (paid-for; mirror into memory)

- `INTERNAL_FAIL_CLOSED` collides with VSN's 172 — the 4X wrapper is
  `INTERNAL_FAIL_CLOSED_VLR` (180).
- **canonicalJson, not JSON.stringify**, to compare ledger aggregates — the
  on-disk ledger has alphabetical keys (canonicalJson) while a recompute is
  insertion-order; JSON.stringify false-fails 178 only after a disk round-trip
  (the unit test missed it; the evidence verify caught it).
- `monotone` is NOT in the 178 arithmetic key set — 179 owns it (recomputed),
  else a lying flag surfaces as 178 instead of 179.
- gateV2 legitimately imports `uncoveredRegions` (the P2-10 "don't import" note
  was scoped to corpusCore, which doesn't need it).
- Browser CSP is hash-based with a CI hash-consistency test — recompute the
  sha256 of the inline `<script>`/`<style>` after any edit or the guard reds.
