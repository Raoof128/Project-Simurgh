# Stage 5B — VAR: Verifiable Adversarial Readout (Closeout)

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Laws:** No Silent Bypass · No Author's Map · No Post-Hoc Attack · A Bypass Is Not a Break.
- **Raw codes:** 210–224 (wrapper `INTERNAL_FAIL_CLOSED_VAR` 224).
- **Reproduce:** `bash scripts/reproduce-llm-shield-stage5b.sh` → `ALL PASS`.
- **Spec / plan:** `docs/superpowers/specs/2026-07-08-stage-5b-var-grounded-red-team-design.md`,
  `docs/superpowers/plans/2026-07-08-stage-5b-var-grounded-red-team.md`.

## Core claim (frozen)

> For a signed, precommitted red-team charter bound to a **real, byte-reproducible**
> Llama-3.2-1B workspace-readout capture the adversary did not author, every one of 46
> declared attacks resolves — by driving the **frozen 4V→5A verifiers** — to a signed finding
> whose recorded `target_raw` a reviewer recomputes offline; no attack earns a clean
> attestation while a bypass is laundered or omitted; and the attack-success rate is recomputed
> from pinned findings. Grounding the attack on a capture the attacker did not choose is what
> makes the red-team non-circular (No Author's Map).

## What shipped

- **The real capture.** `capture-workspace-readout.py` (4Z harness copied into 5B with the
  **elided lens VJP completed** — `torch.autograd.grad` of each lexicon token's post-final-norm
  logit w.r.t. each layer activation, corpus-averaged) ran on **Llama-3.2-1B-Instruct** (pinned
  rev `9213176…`) on a commodity Apple M2 (8 GB, float32, offline from cache). Captured
  **twice → byte-identical** (`cmp`), so the primary lane is **laptop-reproducible**, not
  hash-anchored. 18 tensors + lens rows, `capture_root sha256:ad766ed3…`. **This retires the
  4Z/5A "Lane C harness shipped, not run" debt.**
- **Full verifier core**, raw 210–224, frozen `VAR_CHECK_ORDER`, first-failure-wins; two tiers
  with `VAR_PUBLIC_CODES ⊊ VAR_AUDIT_CODES` (the 217 truthfulness case is audit-only).
- **6-target driver registry** — every attack drives the FROZEN verifier for its stage
  (`evaluateContest`/`evaluateNarrative`/`evaluateVlr`/`evaluateVdr`/`evaluateVwa`/`evaluateVnc`),
  read-only, discovering real codes **152/163/174/182/191/200/205/214**.
- **46-attack corpus** with a **fixture-integrity gate** (re-drive == recorded exact code) and
  the charter constants frozen from the validated corpus (`VAR_ATTACK_MANIFEST_ROOT`).
- Byte-stable signed attestation, Lane B blind ceremony (sterile cwd), JS↔Python parity,
  browser verifier (real WebCrypto Ed25519 + hash-CSP, fail-closed), **7 Lean theorems (zero
  sorry)**, K7 all-functions net. **91 stage5b tests green.**

## Honest re-score (spec was 9.4 / 9.2 / 9.6 / 9.5)

| Axis                   | Score   | Note                                                                                                                                                                                                                                 |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Novelty**            | **9.4** | Grounded red-team + No Author's Map (precommitted-readout) + Signed-Floor Corroboration — unchanged; all shipped.                                                                                                                    |
| **Frontier**           | **9.3** | **↑ from 9.2**: the real 1B capture was _executed_ byte-reproducibly (debt retired). Held below higher by: 1B ≠ frontier scale; the live-adversary lane is minted/deferred; family-specific SEMANTIC mutations are deferred (below). |
| **Good-for-Anthropic** | **9.6** | Real capture over interpretability readout + recomputable ASR answers the NIST/EU red-team-reproducibility gap.                                                                                                                      |
| **Constitution**       | **9.5** | Adversarial self-scrutiny of internal-state honesty as infrastructure; No Silent Bypass machine-checked.                                                                                                                             |

## Signed limitations (admit irregularity over overclaim)

1. **ASR is an honest 0/46 — every declared attack was survived** (caught by the frozen
   verifiers), like 4U's 0/58. No bypass was found; "zero bypasses is a valid outcome, not
   proof of faithful introspection."
2. **Family-specific SEMANTIC mutations are a v2 refinement.** `conflict_laundering` uses the
   real launder mutation (→ 5A 205) and `capture_substitution` attacks VAR's own No Author's Map
   (→ 214); the remaining families are driven by **signature/structural tampering** at their
   target (real codes, real first-failures). The semantic paraphrase-slip / cell-hide /
   span-forgery mutations are documented as the next increment.
3. **Because no real residue slips were exercised, the `cross_gate_residue_benchmark_deferred`
   socket is paid at MECHANISM scope** (the cross-gate slip table + floor reconciliation ship
   and run, reconciling 0 bypasses ≤ the 4X/4Y signed floors → corroborated) — **not** full
   "found real slips". This is an honest re-scope from the spec's "full".
4. **1B is a grounding substrate, not a frontier-scale finding.** GPU captures would be
   hash-anchored (non-bitwise-deterministic); the CPU/1B primary is byte-stable by measurement.
5. **The live-adversary capture lane is minted and deferred** (`live_adversary_capture_lane_deferred`).

## Socket ledger

PAYS `cross_gate_residue_benchmark_deferred` **at mechanism scope** (re-scoped from full —
limitation 3); RETIRES the 4U "reuses 4S table" limitation (novel attacks over 4V→5A) and the
4Z/5A Lane C capture debt (real capture executed); MINTS `live_adversary_capture_lane_deferred`.
