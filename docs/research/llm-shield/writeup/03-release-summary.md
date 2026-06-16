<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Release / LinkedIn summary

Two lengths. Both are honest about limits by design — use either as-is.

---

## GitHub release blurb (short)

**Simurgh LLM Shield — Stage 3C: measured hardening, 2/30 → 18/30.**

I built an application-layer boundary that screens input _before_ a model is called and
writes a tamper-evident, metadata-only receipt for every `safe` / `warning` / `blocked`
decision. Then I did the unglamorous part: I froze an adversarial corpus, published the
seed detector's honest failure (2/30 detection), and only then hardened it — without
editing a single test case.

A deterministic canonicalize-then-classify pipeline (Unicode homoglyphs, symbol/leet
de-stuffing, base64 decode-for-inspection) plus a framing-aware context guard improved
detection to **18/30**, kept clean-benign at **10/10**, and _cut_ false positives on
hard negatives from **2/5 to 0/5**. An ablation shows the context guard adds zero
detection — its only job is precision. On held-out variants written after the detector
froze, it generalizes to **7/9**.

Not jailbreak immunity. An application-layer boundary made measurable, reproducible, and
auditable — the posture frontier labs themselves describe (defence-in-depth + monitoring),
instantiated one layer below the model. Reproduce in three commands.

---

## LinkedIn post (longer, first person)

A frontier lab recently said, while pulling two of its own models, that perfect jailbreak
resistance is probably not achievable for _any_ provider, and that the real strategy is
defence-in-depth plus monitoring.

I took that seriously and built the application-layer version of it.

**Simurgh LLM Shield** screens user input before a model is ever called and writes a
tamper-evident, metadata-only receipt for every decision — safe, warning, or blocked —
chained under HMAC. But the part I'm proud of isn't the detector. It's the method.

I shipped it in three honest stages:

🌱 **Seed** — a minimal boundary.
🔬 **Honest failure** — a frozen adversarial corpus that measured my own detector at
**2/30** and published that number instead of hiding it.
🛡️ **Measured hardening** — a deterministic canonicalize-then-classify pipeline that
improved detection to **18/30**, kept benign traffic passing at **10/10**, and reduced
false positives on the hardest "looks-malicious-but-isn't" cases from **2/5 to 0/5** —
without editing a single test case.

Two things I'd want a reviewer to notice:

→ I never set a target number. The goal was "strictly improve under fixed guardrails,"
because a target invites gaming.
→ An ablation shows the false-positive fix contributes **zero** extra detection. Recall
and precision are improved by separate, legible mechanisms — not one lucky knob.

And the limits are stated plainly: this is **not** jailbreak immunity, uses no live
model, and doesn't yet handle untrusted retrieved context or tools. The two attack styles
it still misses (semantic, intent-based) miss on held-out data too — an honest capability
ceiling, not overfitting.

The whole thing reproduces in three commands.

Next: extending the same evidence standard to the harder boundary — distinguishing
trusted user input from untrusted retrieved context before it reaches the model.

#AISafety #PromptInjection #LLMSecurity #AppliedSecurity

---

_Tip: for the LinkedIn version, attach the ablation table or the 2/30 → 18/30 figure.
Keep the non-claims line in — it is what makes the strong numbers credible._
