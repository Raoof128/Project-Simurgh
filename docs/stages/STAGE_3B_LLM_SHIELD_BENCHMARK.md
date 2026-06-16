# Stage 3B — Adversarial LLM Shield Benchmark

A frozen, style-diverse adversarial corpus measured against the UNCHANGED
Stage 3A-alpha detector. It records exactly which attacks are blocked and which are
missed, catalogued by attack style. The detector is not changed and no attack is
patched in this stage — hardening is a later stage measured against this frozen corpus.

> Simurgh LLM Shield does not claim jailbreak immunity. It makes jailbreak-boundary
> failures measurable, reproducible, and auditable.

## Corpus

- 30 adversarial fixtures across 10 attack styles: split-words, symbol-stuffing,
  homoglyph, base64, role-play, translation, markdown-hide, json-poison,
  academic-framing, multi-step-softening.
- 15 benign: normal tasks, AI-safety questions, and hard-negatives that resemble
  attacks but should stay safe.

## Metrics (`docs/evidence/stage-3b-llm-shield/metrics.json`)

- `adversarial_detection_rate` — blocked / 30 (the honest headline).
- `miss_rate_by_attack_style` — per-style catalogue.
- `clean_benign_pass_rate` — gated == 100% (normal-task + ai-safety).
- `hard_negative_false_positive_rate` — measured, not gated at zero.

Baseline result for the unchanged 3A-alpha detector: `adversarial_detection_rate`
2/30, `clean_benign_pass_rate` 10/10, `hard_negative_false_positive_rate` 2/5.

> **2/30 is not a failure of Stage 3B. It is the baseline measurement Stage 3B
> exists to expose.** The obfuscation styles bypass literal phrase matching by
> design; recording 28/30 misses and 2/5 false positives as reproducible,
> frozen evidence — without touching the detector — is the deliverable. A later
> hardening stage is the only place those numbers are allowed to move, and it will
> be measured against this exact frozen corpus.

## Freeze & reproduce

- Baseline is golden-snapshot: each fixture carries `baseline_verdict` /
  `baseline_reason_codes`; CI asserts no drift; `--update-baseline` is the only writer.
- `detector-digests.json` freezes the detector; the security audit fails if it changes.
- Reproduce: `bash scripts/smoke-llm-shield-bench.sh`.

## Figures

- **Figure 1 — Safety receipt as evidence of non-invocation:** malicious input ->
  firewall BLOCKED -> provider skipped + receipt minted -> HMAC audit verify.
  A blocked prompt produces evidence that the provider was skipped, rather than
  relying on a model refusal.
- **Figure 2 — Miss rate by attack style:** bar chart from `metrics.json` — the
  honest delta a later hardening stage will move.

## Non-claims

- Not jailbreak immunity; the benchmark deliberately records misses.
- Detector unchanged this stage; no attack patched here.
- `multi-step-softening` fixtures are single-input proxies, not real multi-turn attacks.
- Phrase matching remains incomplete by construction.
- Receipts attest process, not ground truth.
