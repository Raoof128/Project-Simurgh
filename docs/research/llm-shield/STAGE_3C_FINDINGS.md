<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3C Findings — Hardening the LLM Shield Against the Frozen 3B Corpus

## Claim

> Stage 3C does not prove jailbreak resistance. It demonstrates measured
> improvement against a frozen adversarial corpus using a deterministic
> canonicalize-then-classify pipeline, while preserving benign utility and
> recording every decision as metadata-only audit evidence.

## Headline result

Against the **unchanged, frozen** Stage 3B corpus (30 adversarial / 15 benign),
measured over the live `/api/llm-shield` boundary:

| Metric                                            | Stage 3B baseline | Stage 3C  |
| ------------------------------------------------- | ----------------- | --------- |
| adversarial detection (blocked OR warning)        | 2/30              | **18/30** |
| — of which `blocked`                              | 2                 | 13        |
| — of which `warning`                              | 0                 | 5         |
| clean-benign pass (must stay 10/10)               | 10/10             | **10/10** |
| hard-negative blocked false positives (cap ≤ 2/5) | 2/5               | **0/5**   |

Detection improved 9× while benign utility was preserved and hard-negative false
positives were _reduced_, not merely held under the cap.

## Honest accounting of the baseline

The two cases the 3B detector "caught" (`homoglyph-001`, `split-001`) were caught
by accident: their _second clause_ ("…reveal the system prompt") survived intact
and matched the existing denylist; their obfuscated first clause was never
handled. Stage 3C handles the obfuscation directly. Note also that part of the
gain is simply a larger denylist: spaced phrase-matching with the 3C phrase set
alone reaches 5/30 before any canonicalisation (see ablation). The contribution
of the new pipeline is the increment **above** that.

## Ablation (per-stage contribution, frozen corpus)

| Configuration                                            | detection | clean | hard-neg FP |
| -------------------------------------------------------- | --------- | ----- | ----------- |
| spaced phrase-match only (no canonicalisation)           | 5/30      | 10/10 | 2/5         |
| + canonicalisation (homoglyph / leet / compact / base64) | 14/30     | 10/10 | 2/5         |
| + heuristics (role-play / structured / translate)        | 18/30     | 10/10 | 2/5         |
| + context guard (full 3C)                                | 18/30     | 10/10 | **0/5**     |

Two readings worth highlighting:

- **Canonicalisation does the heavy lifting** for detection (5 → 14): it defeats
  homoglyph, split-word, symbol-stuffing, and base64 obfuscation.
- **The context guard adds zero detection by design** — its job is _precision_.
  It drops hard-negative false positives 2/5 → 0/5 by de-escalating quoted /
  educational uses of attack phrases to `warning` instead of `blocked`, without
  losing a single detection. Recall and precision are improved by separate,
  legible mechanisms.

## Per-attack-style breakdown (frozen corpus, misses)

| Style                | missed |
| -------------------- | ------ |
| homoglyph            | 0/3    |
| split-words          | 0/3    |
| symbol-stuffing      | 0/3    |
| base64               | 1/3    |
| role-play            | 1/3    |
| translation          | 1/3    |
| markdown-hide        | 1/3    |
| json-poison          | 2/3    |
| academic-framing     | 3/3    |
| multi-step-softening | 3/3    |

Obfuscation families are largely solved; the residual misses concentrate in
semantic-intent styles (academic-framing, multi-step-softening) — see Limitations.

## Held-out generalization (overfitting estimate)

A separate held-out set of 12 _new_ surface forms, authored **after** the
detector was frozen and never used to tune it (`evidence/stage-3c/heldout/`):

- adversarial detection: **7/9** (blocked 6, warning 1)
- clean-benign pass: 2/2
- hard-negative blocked FP: 0/1

The two held-out misses are again `academic-framing` and `multi-step-softening` —
the same styles that miss on the frozen corpus. This consistency indicates the
canonicalisation generalizes within obfuscation families, and the residual gap is
a genuine capability ceiling, not corpus overfitting.

## Limitations and negative results (calibrated)

- **Deterministic ceiling.** Styles whose malice lives in _intent_ rather than
  surface form — notably `multi-step-softening` and most `academic-framing` — are
  largely unreachable by canonicalisation + phrase matching. They are reported,
  not hidden.
- **Statistical power.** n = 30 adversarial / 15 benign (plus 12 held-out) is
  **illustrative, not statistically powered**. Numbers are fractions, not
  population-level performance claims.
- **Canonicalisation is itself attackable.** The fold/de-stuff tables are finite;
  an adversary aware of them can craft around them. Each future bypass becomes a
  frozen regression fixture.
- **No semantic understanding.** The context guard is framing-aware deterministic
  heuristics, not comprehension; unusual benign framings can still be misread.

## Non-claims

- Stage 3C does not claim to prevent frontier-model jailbreak incidents or
  provider-level safety failures. It evaluates an application-layer, pre-provider
  boundary against the frozen Stage 3B corpus and records warning/block decisions
  as auditable process evidence.
- Inherited 3A/3B non-claims hold: no jailbreak immunity; phrase / canonical /
  heuristic matching is incomplete by construction.

## Reproducing

```bash
# headline (live boundary, CI mode — asserts no drift):
scripts/smoke-llm-shield-bench.sh
# ablation (read-only, pure classifier):
node tests/e2e/llm_shield_ablation_runner.mjs
# held-out generalization (measurement only):
node tests/e2e/llm_shield_heldout_runner.mjs
```

See `docs/research/llm-shield/RELATED_WORK.md` for motivation and literature.
