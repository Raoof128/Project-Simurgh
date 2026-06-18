# Security Audit Hardening Patch

Date: 2026-06-18 (Australia/Sydney)

## Summary

Closed all six reportable security audit findings:
explicit-only demo mode, bearer-only instructor authentication,
removal of raw answer localStorage persistence, versioned HMAC
student digests, bounded academic timelines, and paired-state
daemon proof enforcement.

## Finding Closure Detail

| Finding                                                                         | Severity | Closure                                                                                                                       |
| ------------------------------------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Demo mode disables instructor auth when `ANTHROPIC_API_KEY` is missing          |     High | Closed. Demo mode is explicit only via `SIMURGH_DEMO_MODE=1`; non-demo startup without `ANTHROPIC_API_KEY` exits fail-closed. |
| Typed exam answers persisted in `localStorage`                                  |   Medium | Closed. Raw answer draft restore/write/remove logic was removed from the public exam client.                                  |
| Instructor token accepted in URLs and printed in startup logs                   |   Medium | Closed. Instructor APIs are bearer-only outside demo mode; startup logs print `/instructor` without tokens.                   |
| Student identifiers hashed with unsalted SHA-256 and exported                   |   Medium | Closed. Academic student identifiers now use versioned HMAC digests, `v1:<hex>`, with a deployment pepper path.               |
| Localhost daemons sign caller-supplied proof fields without local pairing state |   Medium | Closed. Linux, macOS, and Windows daemon `/proof` handlers now require prior paired session/exam state.                       |
| Academic timelines grow without eviction                                        |      Low | Closed. Timeline storage now has a per-session cap and participates in session eviction.                                      |

## Verification

- `npm test`: `594/594` passed.
- `npm run format:check`: passed.
- `npm audit --audit-level=high`: `0` vulnerabilities.
- Linux daemon proof endpoint tests: `4/4` passed.
- macOS daemon tests: `8/8` passed.
- Windows daemon tests: locally blocked by missing .NET 8 SDK.
- Static old-pattern search: no executable matches for query-token instructor auth, raw answer `localStorage` persistence, or raw SHA-256 student hashing.

## Local Verification Gap

Windows daemon verification is pending on this local workstation because the installed .NET SDK is `7.0.307` while the Windows daemon projects target `.NET 8.0`.

Expected CI/Windows runner requirement: .NET SDK `8.x`.

This is an environment-only local blocker, not evidence of a source regression.

## Reviewer Note

This patch turns the security audit into closure evidence: the highest-severity finding was fixed first, every reportable finding has a focused regression path, and unrelated banking evidence-fixture churn from earlier gate runs was restored.
