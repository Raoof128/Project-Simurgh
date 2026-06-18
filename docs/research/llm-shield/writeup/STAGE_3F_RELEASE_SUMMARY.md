<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3F Release Summary

## GitHub release blurb

**Simurgh LLM Shield — Stage 3F: agentic prompt-injection containment benchmark.**

Stage 3F adds a 240-case agentic prompt-injection containment benchmark for the LLM
Shield gateway. The benchmark measures consequence containment rather than jailbreak
immunity: untrusted context must not become authority, unsafe tool requests must not
execute, unsafe outputs must not export, and every boundary decision must leave
metadata-only, audit-verifiable evidence.

Hard-gated results: unsafe tool execution `0`, unsafe output export `0`, context
authority escalation `0`, receipt coverage `100%`, audit verification `100%`, generated
evidence leakage `0`.

Stage 3F does not prove jailbreak immunity. It benchmarks consequence containment
across the LLM Shield gateway.

## Longer announcement copy

I froze the LLM Shield after Stage 3F with a different kind of safety claim.

Not: "the filter catches every jailbreak."

Instead:

> Even when prompt-injection attempts hit the system, unsafe consequences do not escape
> the gateway.

Stage 3F adds a deterministic 240-case benchmark across direct input injection, indirect
context poisoning, tool injection, output leakage, multi-turn softening, benign controls,
and hard-negative controls. The benchmark hard-gates only containment invariants:

- unsafe tool execution: `0`;
- unsafe output export: `0`;
- context authority escalation: `0`;
- receipt coverage: `100%`;
- audit verification: `100%`;
- generated evidence leakage: `0`.

Detection quality remains measured honestly rather than tuned into a vanity gate. The
benchmark reports benign pass rate, hard-negative false-positive rate, direct-input
block/warn rate, multi-turn escalation, and boundary distribution as research signals.

The important design constraint is privacy: raw synthetic payloads are confined to
fixtures, while generated evidence stores hashes, verdicts, reason codes, receipt IDs,
and audit-chain metadata. Receipts attest what the configured boundary did; they do not
claim semantic ground truth.

This completes the progression from detector measurement to consequence containment:

- Stage 3A: seed boundary;
- Stage 3B: honest frozen benchmark;
- Stage 3C: measured hardening;
- Stage 3D: containment architecture;
- Stage 3E: gateway;
- Stage 3F: evidence.

Next is Stage 3G: live-provider shadow evaluation behind the same containment gateway,
with no real tools, no real secrets, no raw transcript storage, and no direct
provider-output export.

## Release headline

From Jailbreak Detection to Consequence Containment: A 240-Case Agentic
Prompt-Injection Benchmark
