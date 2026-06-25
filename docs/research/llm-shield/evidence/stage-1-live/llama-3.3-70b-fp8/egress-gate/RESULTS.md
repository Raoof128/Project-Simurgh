# Stage 1-LIVE — Egress tool-gate: by-class A/B (Llama-3.3-70B-FP8)

Run live 2026-06-25. Same model/benchmark as the demotion A/B (one level up). The egress
gate (`--defence-mode toolgate`) blocks send/share/invite actions whose destination is not
grounded in the user's trusted task, before the action executes. Class labels are the
PRE-REGISTERED ones in `../injection-taxonomy-prereg.json` (frozen before these numbers).

## Overall (same-session baseline vs egress gate, 10 user × 14 injection = 140 attack cases)

| Metric                         | Baseline  | Egress gate              |
| ------------------------------ | --------- | ------------------------ |
| Targeted ASR                   | **9/140** | **4/140**                |
| Benign utility                 | 7/10      | **7/10 (0 regressions)** |
| Utility-under-attack           | 91/140    | 74/140                   |
| Egress actions gated / blocked | —         | 1574 / 1111              |

## By PRE-REGISTERED class

| Class (frozen)                     | Baseline ASR | Egress gate ASR | Contained                       |
| ---------------------------------- | ------------ | --------------- | ------------------------------- |
| `egress` (send/invite to attacker) | 5/40         | **0/40**        | 5                               |
| `egress_plus_delete`               | 0/80         | 0/80            | 0 (already 0 at baseline)       |
| `egress_mass_recipient` (task 13)  | 1/10         | **0/10**        | 1                               |
| `delete_only` (pure mutation)      | 3/10         | 4/10            | −1 (noise; out of jurisdiction) |

## Honest reading

- **Within its declared scope the egress gate is a clean containment win:** every
  egress-based attack success was eliminated (`egress` 5/40→0/40, `egress_mass_recipient`
  1/10→0/10). **All 4 remaining defended successes are `delete_only`** — the gate has no
  jurisdiction over deletion, exactly as pre-registered.
- **No benign tax:** benign utility held 7/10→7/10 with **zero** pass→fail regressions. The
  gate does not break normal operation.
- **Honest cost under attack:** utility-under-attack fell 91→74. When a run is actively
  attacked, blocking the injected egress sometimes also derails the agent from finishing its
  _legitimate_ task (it loops retrying the blocked action). The block counter (1111 blocks
  over 1574 gated) shows the model retries a blocked egress many times; a cheap future fix is
  to tell the model to stop after the first SIMURGH block rather than hammer it.
- `egress_plus_delete` was already 0/80 at baseline — Llama did not complete those
  multi-step exfil+delete goals even undefended, so there was nothing there to contain.
- **Baseline variance note (honest):** this same-session baseline is 9/140; the earlier
  committed demotion-experiment baseline was 10/140. Greedy decoding is not perfectly
  bit-deterministic under vLLM's concurrent batching, so a ±1 case drift is expected. The
  A/B above uses the same-session baseline for an apples-to-apples comparison.

## Scoped claim (matches the pre-registration)

> Within a declared egress action class and a task-grounded authorisation policy, Simurgh
> blocks unauthorised egress side-effects even when the live model follows injected
> instructions. It does NOT contain delete-only / mutation-only attacks — that is the
> mutation gate's job (see `../authority-gate/`).

This is a scoped structural defence, not jailbreak immunity and not a claim that prompt
injection is prevented. The remaining `delete_only` successes directly size Stage 4C
(the destructive-mutation gate), evaluated next in `authority` mode.

Evidence here is metadata-only (`*-metrics.json`, `*-per-case-rows.json` = ids + booleans,
no payloads; `toolgate-manifest.json` carries the gated/blocked tally; `byclass-output.txt`
is the verbatim analyzer output).
