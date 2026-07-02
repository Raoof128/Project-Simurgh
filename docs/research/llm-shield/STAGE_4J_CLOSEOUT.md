# Stage 4J PCTA — Closeout

**Milestone.** Offline, third-party-reproducible per-tool-call attestation over the Stage 4H
DFI substrate: enforcement was required, a valid signed authority proof accompanied the
action, untrusted context did not become authority (into the declared authority-sink set), and
the host recorded applying exactly the authorized action (`recorded_allowed` — a non-claim
about execution). All gates replay offline under the §0.6 dishonest-producer scope.

## P0–P8 status

All ten matrix rows green and evidence-locked (`evidence/stage-4j/p-gate-results.json`,
emission refuses divergence): P0→0, P1→31, P2→32, P3→33, P4-pre→24, P4→34, P5→35, P6→36,
P7→37, P8→38. Full falsifier-per-gate table: `STAGE_4J_VALIDATION_MATRIX.md`. Reviewer path:
`STAGE_4J_REVIEWER_CHECKLIST.md` (T1–T7). Tests: 27 stage4j unit + 7 comprehensive E2E; full
suite 1229/1229 at closeout; `scripts/reproduce-llm-shield-stage4j.sh` one-command replay,
byte-idempotent across runs.

## Findings made during implementation (kept, not hidden)

1. **P4-pre subsumption.** The plan's original untrusted-authority fixture bound to the dirty
   4H cert; the mandatory re-verify catches that first (raw 24). The matrix now carries BOTH
   containment paths: `dirty-cert-reverify` (24, 4H band) and `untrusted-authority` (34,
   PCTA's own invariant on a clean substrate).
2. **P8 reachability.** Sink membership and P8's flag are the same signal
   (`canonicalPremises.mjs`), so the planned P4-first order made 38 dead code. Decision: run
   P8 before P4 with a receipt null-guard (38-over-34 precedence, documented in the threat
   model), backed by a real signed substrate that passes the full 4H re-verify — a non-claim
   is avoided: "P0–P8 exercised" is literal.
3. **Churn-safe reproduce.** Fixture builds draw fresh keys; the reproduce script regenerates
   only into a temp dir and byte-compares the deterministic matrix, so committed fixtures
   never churn.
4. **Honesty fixes en route.** P3 comment corrected to the implemented epoch-window check
   (nonce-set check deferred, named in the threat model); the digest-space E2E asserts the
   true behaviour (unsigned tamper → 32 because the signature binds digests; re-signed
   mismatch → 35); a CLI-entry guard crash under `node -e` importers was found by the
   reproduce falsifier and fixed.

## Non-claims

The full §0.5 set, restated in `STAGE_4J_THREAT_MODEL.md`: `applied` is recorded-not-executed;
sink membership is declared-not-derived; epoch freshness is pack-local; applied-action reality
and internal-flow reality are the two omission surfaces, their closers (zkTLS/DECO-class
witness; R6/4M-class attested runtime) deferred; the verifier never dispatches — the host owns
allow/deny.

## Deferred work

Multi-proof nonce-set uniqueness; witnessed applied-action transcript; attested runtime for
flow/membership reality; transparency anchor via the witness/DAP line; shellcheck run for the
reproduce script (tool unavailable on the build machine at closeout — script is
`set -euo pipefail`, trap-cleaned, and CI-replayable).

## Release decision

Default posture: tag the code, freeze public wording. §5 citations verified 2026-07-02 —
arXiv 2605.24248 and SSRN 5688982 both real; Meyman/PCD is the nearest prior art, lead with
the wedge. The positioning brief's §10 Measured column is filled only from
`p-gate-results.json` (observed, not asserted); its remaining verification checklist items
(incident dates, 2501.18837) stay open for human sign-off before any external use.
