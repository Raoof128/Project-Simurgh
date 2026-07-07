# Stage 4V — VDP Threat Model

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Scope: the counter-capsule contest verifier over a sealed 4T Incident Capsule.
The kernel and 4T/4S/4U verifiers are imported read-only.

## Assets

- The sealed 4T capsule (root + attestation digest) and its evidence census.
- The respondent's counter-capsule (its own Merkle-sealed census + Ed25519 sig).
- The derived conflict map / contest outcome envelope (never filed — recomputed).

## Adversaries and mitigations

| Adversary goal                                                         | Mitigation (code)                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| File a "response" that is unverifiable prose (hearsay defence)         | Judgment prose sealed by digest only; any raw content field is a forbidden payload (159).                    |
| Contest a capsule that was never filed / a superseded version / a view | Five-field binding tuple; any mismatch (153) or set-digest/duplicate mismatch (154) — no map is derived.     |
| Cite evidence outside the respondent's own sealed census               | Referenced-digest census check (156) — Same Rules for the Defence; fails before any conflict map.            |
| Recompute a value from the wrong artifact kind                         | Executable `KIND_EVIDENCE_SOURCE` gate → `DISPUTE_FAILED{recompute_failed}`, never a spurious CONFLICT.      |
| Smuggle a hidden field to bias scoring                                 | Strict top-level + per-verb key allowlists (151 for structural, 159 for prose).                              |
| Poison one section to void the whole answer                            | Two-tier failure: whole-artifact = raw code (no map); per-section = `DISPUTE_FAILED` status (locality gate). |
| Present a favourable pre-computed conflict map                         | Derived-never-filed: a presented map is at most an expected value (160); the verifier recomputes.            |
| Claim the scoring function secretly favours one party                  | Mirror Test: a self-contest MUST return all-`AGREED` (`mirror_contest_all_agreed` + Lean `mirrorAllAgreed`). |
| Bury a failing capsule and answer it quietly                           | Contest-as-subpoena: filing forces 4T re-verification; the capsule's failure is sealed in the envelope.      |
| Learn operator private state via the respondent process                | Lane B respondent runs in a separate OS process with a minimal env; blindness negatives sealed in capture.   |
| Forge a signed attestation over altered fixtures                       | Two-tier attestation: audit tier reruns every Lane A fixture + re-verifies the Lane B capture.               |

## Explicit non-goals (signed)

Not an adjudication of truth, fault, or legal fault; not a finding the
respondent is right; not identity/authority verification; not a multi-round
appeals process; the Python core does not verify Ed25519 (Node authoritative
for 152).
