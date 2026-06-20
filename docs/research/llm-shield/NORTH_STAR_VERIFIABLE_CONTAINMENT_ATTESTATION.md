# North Star — Verifiable Containment Attestation (VCA)

**Status:** Positioning / direction note. Not a spec. No implementation until brainstormed and
specced per the normal flow.
**Date:** 2026-06-20

## The crown-jewel sentence

> **Simurgh does not claim that model refusal will never fail. It provides verifiable containment
> evidence for what happened next.**

Use this verbatim in README, papers, and any Anthropic-/regulator-facing material.

## The lane

Do **not** compete to be "first at stopping jailbreaks." The filter/refusal layer is crowded and
is exactly the layer that failed in the Fable 5 incident. Be first at making **containment after
the filter fails** a _verifiable, measured property_ — rarer, cleaner, and more valuable.

The category to own is **Verifiable Containment Attestation** — not "AI firewall," not "jailbreak
detector," not "LLM guardrail" (all crowded). The claim:

> A provider-agnostic attestation layer that proves, for a bounded run, whether untrusted context
> gained authority, whether unauthorised tools executed, whether unsafe export occurred, and
> whether the evidence itself verifies offline.

## Why this is the open door

- **OWASP** frames prompt injection, insecure output handling, and excessive agency as core
  LLM/agent risks, and its agent guidance recommends external input validation, least-privilege
  tools, memory/context isolation, structured outputs, signed/verified communications, and
  monitoring — which maps almost directly onto Simurgh's context guard, tool gate, output
  firewall, and audit receipts.
- **AgentDyn (arXiv 2602.03117):** existing defences in dynamic, open-ended agent tasks are
  _either not secure enough or significantly over-defensive_. The unsolved problem is the
  trade-off, not raw blocking.
- **Firewalls paper (arXiv 2510.05244):** current benchmarks are saturated by simple defences;
  stronger benchmarks and adaptive attacks are needed.
- **PISmith (arXiv 2603.13026):** SOTA prompt-injection defences remain vulnerable to adaptive
  attacks across many benchmarks.

Industry is converging on the _what_ (the layers). Nobody owns the _proof_. Simurgh already emits
deterministic, metadata-only, cryptographically chained evidence per decision — the unfair
advantage.

## Definition of "first" (narrow, falsifiable)

> First open, provider-agnostic, metadata-only containment **attestation** prototype with
> deterministic evidence for context, tool, output, and audit boundaries **after input-filter
> failure**.

Never claim "first AI safety system to stop jailbreaks." That is unfalsifiable and false.

## How to go beyond industry

1. **Turn receipts into a public, offline verifier.** Move from "trust our logs" to "verify our
   proof." A reviewer runs `node verifier.mjs attestation.json` and gets a PASS/FAIL with the
   containment counts and audit-chain validity — no trust in Simurgh required.
2. **Publish the security–utility frontier**, not just ASR=0. The killer artifact plots targeted
   ASR (security) against benign pass-rate / over-defence (utility) with receipt + audit coverage
   (evidence). Directly attacks the AgentDyn insecure-vs-over-defensive problem.
3. **Keep 3L incident-shaped, never payload-leaking.** "We do not reproduce the jailbreak; we
   model the failure chain." Safer, more professional, and respectable to provider/enterprise
   reviewers given the Fable 5 details are contested public reporting, not a clean technical
   disclosure.
4. **Build the "regulator packet."** Fable 5's lesson: when confidence collapsed, the only tool
   was a government-ordered kill switch. The packet reframes that to: _"Before you pull the model,
   ask — was the blast radius contained?"_ Contents: attestation schema, offline verifier, Stage
   3L metrics, security–utility curve, non-claims, reproduction commands, evidence-leakage audit,
   policy-drift proof. Plugs into NIST AI RMF Govern/Map/Measure/Manage thinking without
   pretending to be a full compliance product.

## Proposed roadmap (subject to per-stage brainstorm + spec)

> **Naming note:** Stage 3L's closeout reserved "Stage 3M" for a _remediation fork if 3L failed_.
> 3L passed all hard gates, so that fork is not triggered and will not be. "Stage 3M" is hereby
> repurposed for Verifiable Containment Attestation. If a future 3L regression ever needs
> remediation, label it explicitly (e.g. "3L-remediation"), not 3M.

- **Stage 3M — Verifiable Containment Attestation.** Deliver: `attestation.schema.json`, an
  offline verifier, a signed evidence bundle, a policy-digest manifest, an audit-chain verifier,
  and a claim-boundary checker. Turns the existing receipt/audit chain into a portable artifact.
- **Stage 3N — Security–Utility Frontier.** Run Simurgh against AgentDojo, AgentDyn-style dynamic
  tasks, 3K adaptive mutations, and 3L incident-shaped cases. Target: ASR=0, over-defence 0 or
  measured, benign utility retained, receipt/audit coverage 100%.
- **Stage 3O — Bring-Your-Own-Gateway Benchmark.** `simurgh-benchmark --target <url>/run` →
  `containment-attestation.json`, so others test their own gateway against the benchmark. Simurgh
  becomes the measuring stick.

## Non-claims (hold the line)

- Stay in lane: layers 2–4 (context/tool/output isolation) + proof + audit. Do **not** become a
  content-harm/refusal classifier — that is the layer that failed Fable 5.
- No jailbreak-immunity claim; no "model X is safe/unsafe" claim.
- "First" must be demonstrated by verifiable artifacts and measured curves, never asserted.

## References

- OWASP Top 10 for LLM Applications — https://owasp.org/www-project-top-10-for-large-language-model-applications/
- AgentDyn — https://arxiv.org/abs/2602.03117
- Firewalls / stronger benchmarks — https://arxiv.org/abs/2510.05244
- PISmith — https://arxiv.org/abs/2603.13026
- Fable 5 incident (contested public reporting) — https://cybersecuritynews.com/anthropics-claude-fable-5-jailbroken/ ; https://snyk.io/blog/fable-mythos-suspension-security-takeaways/
- NIST AI Risk Management Framework — https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
