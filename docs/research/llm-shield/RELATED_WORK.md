<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Simurgh LLM Shield — Related Work and Motivation

This document situates the Simurgh LLM Shield (Stages 3A–3F) within current
AI-security practice and literature. It is referenced from the per-stage design
docs in `docs/superpowers/specs/`. It is descriptive, not a claim of novelty
over any cited work; where it draws a parallel, it states the parallel precisely.

## 1. Motivating event — Fable 5 / Mythos 5 suspension (June 2026)

On 9 June 2026 Anthropic released Claude Fable 5 and Mythos 5. On 12 June 2026
it disabled both models for **all** users after the US government issued an
export-control directive barring access by any foreign national; Anthropic
stated it could not filter foreign nationals from US users in real time and so
shut both models down entirely to comply. The directive was reportedly triggered
by a suspected **narrow, non-universal** jailbreak — described by Anthropic as
"asking the model to read a specific codebase and fix any software flaws" — which
on Anthropic's own review surfaced "a small number of previously known, minor
vulnerabilities" that other public models can also find. More than 80 security
executives signed a 14 June open letter asking Commerce to lift the directive.

Two statements from Anthropic's own notice anchor this project's framing:

> "We suspect that perfect jailbreak resistance is not currently possible for
> any model provider."

> "Anthropic adopted a defense in depth strategy with Fable 5 … combine this
> with thorough monitoring to quickly detect and shut down any successful
> attacks."

**Why this matters for Simurgh.** A frontier lab states that perfect resistance
is not currently achievable and falls back to _defence-in-depth + monitoring +
rapid mitigation_. Simurgh LLM Shield is an application-layer instantiation of
exactly that posture, one layer below the model: it does not claim to prevent
jailbreaks, but it makes the pre-provider boundary **measurable against a frozen
corpus** and records every decision as **auditable, metadata-only evidence**.

Sources:

- Anthropic, "Statement on the US government directive to suspend access to Fable 5 and Mythos 5" — https://www.anthropic.com/news/fable-mythos-access
- TIME — https://time.com/article/2026/06/13/anthropic-fable-mythos-ban-US-security/
- Fortune — https://fortune.com/2026/06/13/anthropic-disables-fable-mythos-export-controls-national-security-threat/
- Al Jazeera — https://www.aljazeera.com/news/2026/6/13/us-orders-anthropic-to-disable-ai-models-for-all-foreign-nationals

## 2. Security-team guidance maps onto the Shield's design

Snyk's analysis of the suspension ("What the Fable 5 and Mythos 5 suspension
means for security teams") recommends, among other things: **guardrails over
kill switches** ("constrain actions, watch behavior, and intervene narrowly"),
**insisting on evidence and a remediation path**, **defence-in-depth plus
monitoring**, and **treating AI systems as attack surface** under the OWASP LLM
Top 10. The Shield's mechanisms line up with these recommendations:

| Post-incident guidance (Snyk)                     | Simurgh LLM Shield mechanism                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Guardrails over kill switches; intervene narrowly | `safe` / `warning` / `blocked` tri-state — narrow intervention, not a blanket model shutoff                               |
| Insist on evidence and a remediation path         | HMAC audit chain + metadata-only receipts (evidence); every bypass becomes a frozen regression fixture (remediation path) |
| Defence-in-depth + monitoring                     | Application-layer, pre-provider boundary measured against a frozen corpus                                                 |
| Treat AI as attack surface; OWASP LLM Top 10      | Stage 3C canonicalisation targets OWASP LLM01:2025's documented encoded/multilingual injection scenario                   |

Source: Snyk — https://snyk.io/blog/fable-mythos-suspension-security-takeaways/

## 3. Standards and prior art

- **OWASP LLM01:2025 (Prompt Injection).** Recommends layered defences
  including input/output filtering and string-checking against non-allowed
  content, and documents multilingual and encoded injection scenarios. Stage
  3C's canonicalize-then-classify design is _consistent with_ this guidance and
  directly targets the documented encoded/multilingual scenario. We do **not**
  claim OWASP endorses any specific canonicalisation algorithm.
  https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- **Canonicalisation of unicode prompt injections (US patent filing).** Cited as
  evidence that Unicode-injection canonicalisation is an **identified industry
  technique** (prior art), not as proof of effectiveness.
  https://patents.justia.com/inventor/jason-martin

## 4. Detection literature (positioning, not competition)

Simurgh is an _evidence/audit layer_, not a competing state-of-the-art
classifier. Recent work supports the design choices rather than being
out-performed by them:

- **PromptSleuth** (semantic intent invariance) argues that detection should key
  on intent because surface attack forms vary widely — supporting the Shield's
  honest non-claim that phrase/canonical matching is incomplete by construction.
  https://arxiv.org/abs/2508.20890
- **WAInjectBench** shows detectors struggle in web-agent settings — supporting
  measured, corpus-anchored evaluation over blanket efficacy claims.
  https://arxiv.org/pdf/2510.01354
- **AlignSentinel** uses a three-class framing — supporting the Shield's
  `safe` / `warning` / `blocked` tri-state: not every instruction-looking input
  is malicious.
  https://arxiv.org/pdf/2602.13597

## 5. What Simurgh LLM Shield does and does not claim

- **Does:** make the pre-provider input boundary measurable against a frozen
  adversarial corpus; record every `safe` / `warning` / `blocked` decision as
  metadata-only, HMAC-chained audit evidence; turn each discovered bypass into a
  frozen regression fixture.
- **Does not:** claim jailbreak immunity, prove provider-level safety, or prevent
  frontier-model safety incidents. Detection by phrase/canonical/heuristic
  matching is incomplete by construction.
