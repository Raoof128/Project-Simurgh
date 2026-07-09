# Stage 5D VARL — Lane B (key-free two-role ceremony)

**NEVER CI-gated. Deterministic on the watcher side; digest-only public.** Lane B is how the
committed 3-round ledger was _produced_: an **attacker** (a spawned Claude subagent) proposes
evasions of the frozen gate, and a **watcher** (the verifier that owns the gate) recomputes every one
against the pinned gate. Nothing the attacker says is trusted — only the watcher's recompute counts.

## Roles

- **Attacker** — a Claude Code subagent with Bash access to the pinned-gate query helper
  (`node -e` over `verdictAt`). It adaptively hunts exact-quantity-preserving evasions. Its raw
  transcript lives in the **audit-private** ceremony log; the public artifact is digest-only.
- **Watcher** — recomputes `verdictAt(gate_version, mechanism, applyRecipe(base, recipe))` for every
  claimed evasion (the `checkWatcherVerdicts` path, code 245). A claim the watcher cannot reproduce
  is discarded; it never enters the ledger.

## Ceremony (per round)

1. Attacker queries the pinned gate, proposes evasions for the 6 flagged bases.
2. Watcher recomputes each; keeps only the reproduced slips; freezes each to a `recipe` + digest.
3. Defender hardens (a new `proposed_normalizer` gate version); watcher records `closed_count`.
4. Repeat until the defender has no fixed single-pass normalizer that wins (the Trilemma) — the
   final rung is **open** with a signed non-empty residual.

## Honest scope

- Retires **no** debt on trust: the ledger's completeness is only as good as the signed ceremony
  log. Code 253 makes the log tamper-evident and binds it to the public bundle, but it cannot force a
  builder to have logged a round they never ran (spec §5 limitation 7). **The real completeness check
  is re-running this ceremony** and seeing whether new losing rounds appear.
- This lane is **key-free** — it needs no API key and cannot be refused by a model, because the
  attacker is a local subagent engaged in authorized defensive red-teaming of our own detector.
- A version-pinned attacker (provenance, not capability) is **Lane C** (`../lanec`).
