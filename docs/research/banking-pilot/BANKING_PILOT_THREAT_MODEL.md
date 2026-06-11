# Banking Shield Threat Model

## Scope

This threat model covers Stage B1 Phase A only. Phase B and Phase C are roadmap items and have no implemented routes or human-pilot state in this change.

## Assets

- Metadata-only accepted session state.
- HMAC audit-chain integrity.
- Banking pilot scoped bearer tokens.
- Privacy assertions in reports.
- Generated Phase A evidence files.
- Sonnet sanitised payload fixtures.

## Actors And Controls

| Actor                        | Risk                                                       | Phase A Control                                                                      |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Curious operator             | Over-collection through UI or reports                      | Explicit JSON bodies, metadata-only report builder, privacy audit                    |
| Malicious tester             | Submit credentials, OTPs, account data, or payment details | Recursive forbidden-field guard and scenario allowlists                              |
| Tampering client             | Unknown fields or invalid categories                       | Unknown-field rejection and strict category validation                               |
| Replay attacker              | Reuse or mix tokens across sessions                        | HMAC-scoped banking token, path/body session matching, one-submit rule               |
| Prompt-injection attempt     | Sensitive data routed to Sonnet                            | Runtime narrative off by default, local sanitiser fixture, no raw payload forwarding |
| Overclaiming researcher      | Fraud or compliance claims                                 | Fixed recommendation wording and non-claims docs                                     |
| Reviewer adversary           | Challenge audit evidence                                   | HMAC chain, verify endpoint, generated evidence pack, claim audit                    |
| Storage-abuse attacker       | Use unauthenticated rejection path as storage              | Auth is required before session-bound rejected attempts append to audit              |
| Prototype-pollution attacker | Submit `__proto__`, `prototype`, or `constructor`          | Structural pollution key rejection                                                   |

## Security Requirements

- JSON request body limit: 16 KB.
- Recursive payload scan max depth: 20.
- Forbidden field responses may include field names only.
- Audit entries for rejected attempts record route, reason, and field name only.
- Tokens must not include real banking data or raw submitted payloads.
- `/audit` must not expose HMAC keys or token secrets.
- `/verify` returns verification metadata only.

## Residual Risks

Phase A is an in-memory synthetic demo. It does not provide production authentication, rate limiting, bank integration, payment controls, account protection, or fraud prevention.

## Future Hardening

Before Phase B or C, add endpoint rate limiting using the existing Simurgh rate-limit helper pattern, review governance/ethics requirements, and re-run the threat model with human-participant assumptions.
