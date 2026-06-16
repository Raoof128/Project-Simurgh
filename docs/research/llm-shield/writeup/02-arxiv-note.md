<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# A Frozen-Benchmark Methodology for Measured Prompt-Injection Boundary Hardening

**Raouf** · raoof.r12@gmail.com

> Compact technical note (Stages 3A–3C of Project Simurgh LLM Shield). This is a
> methodology-and-evaluation note, not a claim of a new state-of-the-art classifier.

## Abstract

We present an application-layer boundary that classifies user input before a language
model is invoked and emits a tamper-evident, metadata-only receipt for every decision,
together with a methodology that makes boundary hardening _measurable_ rather than
asserted. The difficulty is methodological as much as technical: prompt-injection
filters are easy to improve on their own test cases and hard to evaluate honestly,
because the corpus, the success criterion, and the failure baseline are usually written
by the same hand that reports the win. We address this by freezing an adversarial corpus
and its cryptographic detector digests, publishing the seed detector's honest failure
baseline (2/30) before hardening, and adopting a success criterion of _strict improvement
under fixed guardrails_ rather than a target number. A deterministic
canonicalize-then-classify pipeline with a framing-aware context guard and a three-tier
verdict (`safe`/`warning`/`blocked`) then improves adversarial detection from 2/30 to
**18/30** on the frozen corpus while preserving clean-benign pass at 10/10 and _reducing_
hard-negative blocked false positives from 2/5 to 0/5; on a held-out set authored after
the detector froze, detection generalizes to 7/9. The most useful number is the one we
did not optimize: the context guard adds zero detection and exists solely to cut false
positives.

## 1. Introduction

When Anthropic suspended access to two of its most capable models in June 2026, it stated
that it suspects "perfect jailbreak resistance is not currently possible for any model
provider," and described its strategy as defence-in-depth combined with monitoring [1].
The security-engineering reaction emphasized guardrails over kill switches, insistence on
evidence and a remediation path, and treating AI systems as attack surface under the
OWASP LLM Top 10 [2,3]. Both point to the same gap: the application layer needs to _prove
what its safety boundary did_ on each input, not claim the boundary is perfect.

We make three contributions, in increasing order of importance:

- **A boundary with auditable evidence.** An input-only, pre-provider classifier that
  emits HMAC-chained, metadata-only receipts for `safe`/`warning`/`blocked` decisions.
- **A deterministic hardening pipeline.** Canonicalize-then-classify (homoglyph fold,
  leet/symbol de-stuffing, base64 decode-for-inspection) plus a framing-aware context
  guard that separates _recall_ mechanisms from _precision_ mechanisms.
- **A freeze-then-harden methodology.** A frozen corpus with digest-pinned detectors, a
  published failure baseline, a no-target success criterion, an ablation, and a held-out
  generalization probe — designed so a measured improvement cannot silently become a
  goalpost move.

## 2. Threat model and boundary

We protect the boundary _before_ the provider is invoked: preventing an obfuscated
policy-override or system-prompt-exfiltration instruction from reaching the model
unflagged, and producing tamper-evident proof of the decision. The in-scope adversary is
single-turn and fully controls the input string, obfuscating via Unicode homoglyphs,
symbol/space stuffing, base64, role-play framing, structured (JSON/Markdown) hidden
channels, or translate-then-follow wrappers. Out of scope (and deferred to later stages):
untrusted retrieved context, tool/function-call abuse, live-model-specific exploits, and
multi-turn memory poisoning. The audit secret is assumed not attacker-known; raw payloads
exist only in fixtures, and all generated evidence is metadata-only.

## 3. Method

**Canonicalization.** From the normalized input we derive two views. The _canonical_ view
folds a small, audited table of Unicode confusables to ASCII and applies leet/symbol
substitutions in word context (`!|→i`, `1→i`, `0→o`, …), leaving digits without letter
neighbours untouched. Base64-looking blobs are decoded _before_ folding (base64 is
case-sensitive and leet-folding would corrupt blob digits) and appended for inspection
only — never executed. The _compact_ view strips all non-alphanumerics, so separator- and
symbol-stuffed attacks rejoin to their real spellings. Each transformation that fires is
recorded as an enum signal (e.g. `homoglyph_fold`, `symbol_destuff`, `base64_decoded`),
never as raw text.

**Classification.** A negation-aware denylist is matched over both views, augmented with
deterministic heuristics for role-play framing, structured hidden-instruction channels,
and translate-then-follow wrappers. This design is _consistent with_ OWASP LLM01:2025's
input/output filtering and string-checking guidance and directly targets its documented
encoded/multilingual scenario [3]; Unicode-injection canonicalization is recognized
industry prior art [4]. We claim no novelty for canonicalization itself.

**Context guard and verdicts.** A framing-aware _deterministic_ guard (heuristics, not
semantic understanding) de-escalates a block-worthy match to `warning` only when the
_matched_ attack phrase is itself quoted or the utterance carries an educational lead-in;
a stray quoted word elsewhere cannot soften a bare attack. Verdicts: `blocked` (denylist
match outside educational framing; provider skipped), `warning` (weaker/contextual
signals, or a quoted/educational match; provider still called, warning receipt emitted),
`safe` (no signal). A three-class output reflects that not every instruction-looking
input is malicious, consistent with recent detection work [5].

## 4. Evaluation

**Corpus (frozen).** 30 adversarial cases across 10 obfuscation styles (3 each) and 15
benign cases (5 normal, 5 AI-safety questions, 5 hard negatives that quote attack phrases
in educational framing). Each fixture stores `ground_truth` (what the case _is_) and a
separately re-snapshotted `baseline_verdict` (what the detector _does_); detector source
files are pinned by SHA-256 digests. The corpus payloads are never edited during
hardening — only the recorded baseline is re-snapshotted through a reviewed update path.

**Success criterion.** Strictly improve adversarial detection above the frozen 2/30
baseline while preserving clean-benign pass at 10/10 and holding hard-negative blocked
false positives ≤ 2/5. No fixed target is set, to avoid detector-gaming. Detection counts
`blocked` _or_ `warning` (a warning on an attack is a catch); a benign false positive
counts `blocked` only (a warning on a benign is acceptable friction).

**Headline (Table 1).**

| Metric                                    | Seed (3B) | Hardened (3C) |
| ----------------------------------------- | --------- | ------------- |
| adversarial detection (blocked ∨ warning) | 2/30      | **18/30**     |
| — blocked / warning                       | 2 / 0     | 13 / 5        |
| clean-benign pass                         | 10/10     | **10/10**     |
| hard-negative blocked FP                  | 2/5       | **0/5**       |

We note honestly that the seed's two detections were incidental: their second clause
matched the denylist while the obfuscated first clause was unhandled. Part of the 3C gain
is also a larger denylist (spaced matching alone reaches 5/30); the pipeline's
contribution is the increment above that, isolated by the ablation.

**Ablation (Table 2).** Per-stage, on the frozen corpus:

| Configuration            | detection | clean | hard-neg FP |
| ------------------------ | --------- | ----- | ----------- |
| spaced phrase-match only | 5/30      | 10/10 | 2/5         |
| + canonicalization       | 14/30     | 10/10 | 2/5         |
| + heuristics             | 18/30     | 10/10 | 2/5         |
| + context guard (full)   | 18/30     | 10/10 | **0/5**     |

Canonicalization is responsible for most of the recall gain; the context guard adds no
detection and improves only precision. The two mechanisms are decoupled and individually
legible.

**Held-out generalization.** On 12 new surface forms authored after the detector froze
and never used to tune it, adversarial detection is **7/9**, clean 2/2, hard-neg FP 0/1.
The two misses are `academic-framing` and `multi-step-softening` — the same semantic
styles that miss on the frozen corpus — indicating a genuine capability ceiling rather
than corpus overfitting.

## 5. Related work

Our position is that of an _evidence/audit layer_, not a competing classifier. PromptSleuth
argues detection should key on semantic intent because surface attack forms vary widely,
which supports our explicit non-claim that phrase/canonical matching is incomplete [5].
WAInjectBench shows detectors struggle in web-agent settings, supporting corpus-anchored,
measured evaluation over blanket efficacy claims [6]. Three-class framings in recent
detection work support our `safe`/`warning`/`blocked` tier [7]. OWASP LLM01:2025 documents
the layered defences and encoded/multilingual scenarios we target [3], and
Unicode-injection canonicalization is established prior art [4].

## 6. Limitations

**Deterministic ceiling.** Styles whose malice lives in intent rather than surface form —
`multi-step-softening` and most `academic-framing` — are largely unreachable by
canonicalization plus phrase matching, on both the frozen and held-out sets.
**Statistical power.** n = 30 adversarial / 15 benign (+12 held-out) is illustrative, not
statistically powered; results are fractions, not population-level claims.
**Canonicalization is attackable.** The fold/de-stuff tables are finite; an adversary
aware of them can craft around them, which is why each future bypass becomes a frozen
regression fixture. **No semantic understanding.** The context guard is framing-aware
heuristics; unusual benign framings can still be misread.

## 7. Conclusion

The contribution is a posture, demonstrated end to end: publish the failure, freeze the
evidence, harden without moving the goalposts, and keep every decision auditable. Against
a frozen corpus this turned 2/30 into 18/30 with no loss of benign utility and a reduction
in false positives, with a held-out probe to estimate overfitting. The same methodology
extends to the harder boundaries — untrusted context, tool use, live models — which are
the natural next stages.

## Non-claims

We do not claim jailbreak immunity or provider-level model safety; no live model is used;
untrusted context, tools, and multi-turn memory are out of scope. Detection is
deterministic and incomplete by construction. Receipts attest process, not ground truth.

## Reproducibility

```
scripts/smoke-llm-shield-bench.sh              # headline, asserts no drift
node tests/e2e/llm_shield_ablation_runner.mjs  # per-stage ablation
node tests/e2e/llm_shield_heldout_runner.mjs   # held-out generalization
```

## References

All references below were verified against their live sources during preparation; none
were generated from memory. The three arXiv entries were confirmed against their
abstract pages (title, authors, date) on 2026-06-16.

[1] Anthropic. _Statement on the US government directive to suspend access to Fable 5 and
Mythos 5._ https://www.anthropic.com/news/fable-mythos-access
[2] Snyk. _When a Government Pulls an AI Model: takeaways for security teams._
https://snyk.io/blog/fable-mythos-suspension-security-takeaways/
[3] OWASP Gen AI Security Project. _LLM01:2025 Prompt Injection._
https://genai.owasp.org/llmrisk/llm01-prompt-injection/
[4] _Canonicalization of unicode prompt injections_ (US patent filing; cited as industry
prior art, not efficacy evidence). https://patents.justia.com/inventor/jason-martin
[5] M. Wang, Y. Zhang, and G. Gu. _PromptSleuth: Detecting Prompt Injection via Semantic
Intent Invariance._ arXiv:2508.20890, 2025. https://arxiv.org/abs/2508.20890
[6] Y. Liu, R. Xu, X. Wang, Y. Jia, and N. Z. Gong. _WAInjectBench: Benchmarking Prompt
Injection Detections for Web Agents._ arXiv:2510.01354, 2025.
https://arxiv.org/abs/2510.01354
[7] Y. Jia, R. Wang, X. Wang, C. Xiang, and N. Gong. _AlignSentinel: Alignment-Aware
Detection of Prompt Injection Attacks._ arXiv:2602.13597, 2026.
https://arxiv.org/abs/2602.13597
