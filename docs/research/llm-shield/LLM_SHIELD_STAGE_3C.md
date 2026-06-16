<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3C — LLM Shield Hardening (narrative)

Stage 3C is the first and only stage permitted to change the LLM Shield detector.
It hardens the detector against the **frozen** Stage 3B corpus and re-freezes the
baseline, reporting an honest before/after delta.

## What changed

- **`promptCanonicalise.js` (new)** — attack-aware canonical + compact views:
  homoglyph fold, leet/symbol de-stuffing, and base64 decode-for-inspection
  (decoded before any folding, since base64 is case-sensitive). Emits
  transformation `signals[]` (enum codes, never raw text).
- **`promptContextGuard.js` (new)** — a framing-aware _deterministic_ guard
  (heuristics, not semantic understanding) that de-escalates a block-worthy match
  to `warning` only when the matched attack phrase is itself quoted or carried by
  an educational lead-in. A stray quote elsewhere cannot soften a bare attack.
- **`promptFirewall.js` (modified)** — matches the denylist over the canonical and
  separator-stripped compact views, adds deterministic heuristics (role-play,
  structured hidden-instruction channels, translate-then-follow), and emits the
  three-way verdict. An internal `stages` toggle (default all-on; never used by the
  router) powers the ablation.
- **`warning` tier** — new verdict between `safe` and `blocked`: the mock provider
  is still called, but a metadata-only **warning receipt** (`risk_tier: "warning"`,
  `signals[]`) and a dedicated `LLM_INPUT_WARNED` audit event are recorded.

## Verdict mapping

- `blocked` — canonical denylist match, affirmative, outside educational framing;
  provider skipped (non-invocation auditable).
- `warning` — role-play / structured / translate signals, or a canonical match that
  is quoted/educational; provider called, warning receipt + audit event.
- `safe` — no signal.

## Result

Adversarial detection **2/30 → 18/30**; clean-benign **10/10** preserved;
hard-negative blocked false positives **2/5 → 0/5**. Held-out generalization on 12
new post-freeze variants: **7/9** adversarial, 2/2 clean, 0/1 hard-neg FP.

Full numbers, ablation, per-style breakdown, and limitations:
[`STAGE_3C_FINDINGS.md`](./STAGE_3C_FINDINGS.md).
Motivation and literature: [`RELATED_WORK.md`](./RELATED_WORK.md).
Design: `docs/superpowers/specs/2026-06-16-stage-3c-hardening-llm-shield-design.md`.
Plan: `docs/superpowers/plans/2026-06-16-stage-3c-hardening-llm-shield.md`.

## Scope and non-claims

In scope: input-only obfuscation hardening + warning tier, measured against the
frozen corpus. Out of scope (deferred): `contexts[]` provenance (3D), tool gate
(3E), live model (3F), UI, full 100+50 corpus, multi-turn memory.

Stage 3C does not claim to prevent frontier-model jailbreak incidents or
provider-level safety failures. It evaluates an application-layer, pre-provider
boundary against the frozen corpus and records warning/block decisions as
auditable process evidence. Phrase/canonical/heuristic matching is incomplete by
construction.
