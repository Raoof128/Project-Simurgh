# Stage 5N — VTC-Delay: closeout

**Blade.** A decision's **finalisation** is bound to two things a producer cannot fake after the fact: a
**dependent SHA-256 chain** of T = 20,000,000 steps seeded from the _real start timestamp token_, and **two
RFC-3161 endpoints** whose genTimes give a conservative elapsed **lower bound**. The verifier **re-runs the
whole chain** — this is deliberately **not** a VDF: no trusted setup, no fast-verify, no hardware claim.
Layered additively on the frozen 5M quorum extension; new codes **396–419**. Motto: _ClaimSafe first, then
ReviewerSafe._

**Two laws.** _No Instant Finalisation_ (the two endpoints must be separated by at least the precommitted
floor) and _No Pre-Input Final Commitment_ (`D_out` must be the exact T-step descendant of a seed that
includes the start token, so it cannot predate its own input).

## What shipped (all green)

- **Pure core** — the frozen first-failure spine `396→418` over injected facts (B11: the core decides, the
  adapter does crypto), plus `419` as the sole fail-closed wrapper, reachable only via a throwing adapter.
- **Real endpoint adapter** — RFC-3161 verification at the token's own genTime (`-attime`), a
  **from-scratch offline OpenTimestamps parser** (leaf → op path → `BitcoinBlockHeaderAttestation`), and
  Rekor via the frozen 5M quorum extension. Expected defects become typed facts, never throws.
- **13 Lean theorems** (core Lean 4.15, no mathlib, zero proof holes, no user axioms) + the
  **theorem-projection gate** that fails the build on any Lean↔runtime drift in codes, order, or domains.
- **Tri-runtime** Node ↔ Python ↔ browser. The browser core is **portable-only and never emits a normative
  raw 0** (`portable_core_verified` / `normative_verdict_available: false`).
- **K7 all-functions net** — every export invoked; all 24 codes `396–419` reachable; cross-stage invariants.
- **Live Lane C-adv** (digest-only): **Claude Sonnet-5** (CVP, non-malice charter) selected **all five**
  temporal-fraud attacks from the frozen mutation DSL; the real verifier **contained every one**
  (401/409/413/417/404). **Fable-5 refused** — sealed as `model_refused`, never re-rolled into a pass.
- **Lane D** — 3 machines / 2 architectures / 2 runtimes (local arm64 Node + two x86_64 syd1 droplets on
  stdlib Python) produced **byte-identical** seed / x0 / terminal / checkpoints.
- **Real Lane B ceremony BANKED at raw 0** over the shipped frozen formulas (below).
- **61 unit + 18 e2e tests + Lean**, all green; `reproduce-llm-shield-stage5n.sh` exit 0; 5I–5M undisturbed.

## Real Lane B ceremony — **BANKED (raw 0)**

Run over the **shipped** modules (`core/{derive,chain}.mjs`, `constants.mjs` — not a copy), so what the
chain confirms is the code that ships. Freshness nonce = **Bitcoin block 957 979**
(`00000000000000000001b1b2…3bd1`, verified at height by two independent endpoints), so the ceremony
provably cannot predate that block.

| Item                 | Value                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| `D_start`            | `36c5aef3…3bb9` (= `start_authorisation_digest`; producer sig is inside)   |
| `start_token_digest` | `1f30934b…ca19` (exact DER of the real DigiCert token)                     |
| `terminal_value`     | `8b4737c0…4df1` (20,000,000 steps, 18.2 s, 10 checkpoints)                 |
| `D_out` (= `D_end`)  | `3c838782…bf0d`                                                            |
| TSA genTimes         | 09:01:07Z → 09:02:39Z (imprint == D verified both ends)                    |
| Rekor                | logIndex 2167349197 / 2167350626, inclusion proofs both                    |
| **Elapsed bound**    | **90,000 ms ≥ 60,000 ms floor** (raw 92 s − 1000 ms uncertainty each side) |

**Status: BANKED — `raw 0`.** Both endpoints Bitcoin-confirmed in **block 957 983**
(`0000000000000000000140d3…f79b`). The production verifier runs end-to-end with **no injected facts** —
real DigiCert tokens, real Bitcoin-confirmed OTS (offline recompute, leaf == subject), real Rekor entries,
and a full 20,000,000-step chain re-run — returning **`raw 0` / `elapsed_lower_bound_ms: 90 000`**.

Two cross-checks that make this more than self-agreement:

- Our OTS parser's extracted merkle root **matches block 957 983 on a public explorer** (byte-reversed for
  display order) — the proof commits to the real chain, not to our own arithmetic.
- The block's timestamp (**09:25:52Z**) falls **after both TSA genTimes**, the ordering the claim requires.

The frozen pack is `evidence/stage-5n/real-laneb/` (public material only; the ceremony private keys were
never copied and are not in the repo). `envelope.json` **is** the exact canonical bytes that verified.
**Pays I4 — PAID.**

### The bug the real ceremony found

Its first true end-to-end run returned **404 `rekor_artifact_mismatch`**. `defaultFactsAdapter` hardcoded
`rekor_artifact_hash: null`, which `subjectCheck` compares against `sha256(utf8(role_subject_hex))` — so
**every real envelope would have failed 404/414 forever**; the production path could not return 0 at all.
Unit tests missed it because they inject facts or call `runEndpointChild` directly; only a run over real
Rekor evidence reaches that line. The hash is now **extracted from the log entry's own body**, never
asserted by the producer, and fails closed to `null`. This is the single strongest argument for Lane B
existing: a real ceremony against real anchors found a bug that 61 unit tests and 13 Lean theorems did not.

The lesson generalises. The Lean theorems are sound — they model the **pure core over injected facts**, and
the bug was in the **adapter that manufactures those facts**, which is exactly the seam a symbolic model
cannot see. Hermetic tests injected the same facts the adapter should have produced, so they agreed with
each other and with the proofs, and all three were wrong together. Only real evidence broke the tie.

## Independent verification (external, unprompted)

An independent two-machine pack (local + droplet **Nexus**, x86_64) re-derived **`D_out` = `3c838782…bf0d`
from scratch — exact match**, reproduced 10/10 negative controls and `x_T` on **Python 3.14.6** (a version
outside the set we had documented — parity is wider than claimed), and verified the TSA imprints, Rekor
logIndexes and elapsed arithmetic offline. It also found four real defects, all verified and fixed:

1. **`btc-watch.sh` wrote `*.confirmed.ots` every round regardless of outcome** — files named "confirmed"
   carrying zero Bitcoin attestations. In a project whose thesis is that nothing overclaims, the filename
   itself was the overclaim. Fixed: the upgrade runs on a neutral probe and the claim-bearing name is
   created **only** when a real attestation is present. **A filename is a claim.**
2. **`phase-a/b.mjs` hardcoded an absolute path**, so a stray re-run would silently overwrite the anchored
   subjects. Fixed: fail-closed guard + `STAGE5N_LANEB_DIR` making the reviewer's copy-route first-class.
3. `GATE_REPORT.md` text stale vs its own artifacts. Fixed.
4. The gate-capture pack reads a foreign scratchpad path — **open**, low priority (superseded by Lane B).

The reproduce script then caught a **latent CI breakage** of its own: the proofs header named a proof hole
in prose, which the CI hole-guard greps for and would have failed the PR on.

## Non-claims (signed discipline)

Green proves only that finalisation was **delayed** past the precommitted floor by two independently
anchored timestamps, and that `D_out` is the exact T-step descendant of a seed containing the start token.
It does **not** prove human attention, deliberation, decision-formation time, review quality, work
exclusivity, hardware-independent delay, universal non-parallelisability, decision correctness, regulatory
compliance, TSA clock correctness, or model safety. The full frozen list is `NON_CLAIMS` (17 entries),
signed into every attestation. **"Receipt, not passport."**

Bounds carried forward: the elapsed bound is only as good as the TSA's genTime (DigiCert returns
`Accuracy: unspecified`, hence the ±1000 ms guard); the overclaim gate is **lexical, not semantic**; census
replay is **relative to a declared census**; the browser core verifies no anchor crypto; OTS retains a
residual canonical-chain pin.

## Four-axis scorecard (re-scored from shipped evidence — no floor, no mandatory increase)

| Axis                | Pre-build target | Closeout | Note                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty             | 9.4              | **9.4**  | fresh-input-bound dependent chain + dual-endpoint interval; a delay proof that is honestly _not_ a VDF                                                                                                                                                                                                                 |
| Frontier            | 9.4              | **9.4**  | **BANKED: raw 0 over real anchors, both endpoints in Bitcoin block 957 983, merkle root cross-checked against a public explorer.** Plus live Sonnet-5 5/5 contained, 3-machine Lane D, and an external party re-deriving `D_out` exactly. The real ceremony also found a production bug no unit test or theorem caught |
| Anthropic relevance | 9.7              | **9.7**  | makes "a human actually had time to look" a recomputable receipt rather than a prose assertion                                                                                                                                                                                                                         |
| Constitution        | 9.6              | **9.6**  | delay as a signed number, with the strongest false reading ("reviewed carefully") structurally unassertable                                                                                                                                                                                                            |

Frontier was scored **9.1 while the bank was pending** and moved to 9.4 **only after** both endpoints
confirmed and the full envelope verified to raw 0 through the real `otsVerify.mjs` — the condition written
down in advance, met, and then paid. It was never pre-credited.

Pays **I4 — PAID** (banked at raw 0, Bitcoin block 957 983). Mints no new socket: 5N's declared successor
work (`public_beacon` freshness, semantic overclaim beyond the lexical gate) is already carried as signed
limitations rather than new IOUs.

**What would move it higher.** Frontier → 9.6 needs a **second, independent producer** running their own
ceremony against this verifier and banking raw 0 — Lane D proved the _deterministic surface_ travels, not
yet a whole ceremony. Anthropic relevance → 9.9 needs one real external reviewer (a lab or regulator)
running `verifyVtcDelay` on evidence we did not produce. Both are buildable artifacts, not aspirations.
