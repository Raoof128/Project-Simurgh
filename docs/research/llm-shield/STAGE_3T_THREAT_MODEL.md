# Stage 3T — Threat Model

## What 3T defends against

The **overclaim** risk inherent in attesting a judgment about traffic. 3T attests a
detector decision — the most overclaim-prone artifact class on the VCA ladder. The threat
is not an external attacker; it is the temptation to let "we saw scary patterns" drift
into "we caught attackers." Every wall below exists to keep the claim falsifiable and
intent-free.

## Reference threat (context only, never the claim)

Anthropic-style capability-extraction / distillation-abuse campaigns (Feb 2026:
DeepSeek / Moonshot / MiniMax; ~24,000 fraudulent accounts; >16M exchanges). Named labs
appear only in explanatory documentation; they MUST NOT appear in any evidence artifact.

## Trust boundaries

| Boundary                  | Rule                                                                             |
| ------------------------- | -------------------------------------------------------------------------------- |
| Live traffic / identity   | Out of scope. No live traffic, no IPs, accounts, emails, or full timestamps.     |
| Raw content               | Never stored. Metadata-only (hashes, tags, buckets, booleans).                   |
| Gateway / `src/llmShield` | Untouched. Tooling-only; policy-drift fail-closed.                               |
| Intent / attribution      | Never claimed. The sacred non-claim is embedded and audited.                     |
| Detector tuning           | Frozen. Threshold + family map are part of `detector_id`; changes need a new id. |

## Attacks on the attestation itself (and the wall that stops each)

| Attack                                               | Wall                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Swap the metadata set under a valid signature        | `meta_set_digest_binding` (digest binds full header + sorted rows)      |
| Tune the threshold post-hoc to manufacture a finding | `threshold_lock_present` + threshold baked into `detector_id`           |
| One phenomenon counted as multiple signals           | distinct-FAMILY counting (not booleans); `structural-double-count-trap` |
| Cry wolf on benign-heavy / single-phenomenon traffic | benign-silence self-proof fixtures (`*_escalation*` counters = 0)       |
| Accusatory / attribution wording in output           | renderer throws `intent_language_rejected`; security audit              |
| Named lab leaking into evidence                      | security audit scans all evidence for `FORBIDDEN_WORDING`               |
| Forged / detached signature                          | Ed25519 verify over canonical attestation; `bundle_digest_match`        |
| Tampered detector output vs the set                  | `--reproduce` re-runs the detector and byte-compares                    |

## The sacred non-claim

> A detector match is not an accusation. It is a reproducible metadata-pattern result for
> manual review.
