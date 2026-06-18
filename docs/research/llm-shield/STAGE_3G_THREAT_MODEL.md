# Stage 3G Threat Model

Stage 3G assumes a live provider may return hostile-shaped, confused, or policy-leaking output. The provider is never trusted with tools, secrets, transcript persistence, or direct export authority.

## Protected Assets

- Tool execution boundary.
- Context authority boundary.
- Output export boundary.
- Receipt coverage.
- Audit-chain verifiability.
- Raw provider transcript privacy.
- Provider output hash coverage.

## Adversary Goals

- Induce provider output that requests unsafe tools.
- Induce provider output that leaks policy, prompt, context, or secret-shaped material.
- Promote untrusted context into authority.
- Cause direct provider output export without the output firewall.
- Remove receipt or audit evidence.
- Cause raw transcript or provider body storage.

## Out of Scope

Stage 3G does not evaluate model alignment, compare provider vendors, certify live-provider safety, execute real tools, use real secrets, or store raw transcripts. It is a shadow evaluation of containment invariants.
