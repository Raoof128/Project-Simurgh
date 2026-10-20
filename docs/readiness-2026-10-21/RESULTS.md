# Readiness repair report — 21 October 2026

Simurgh now exposes the current 288-branch study in its shared dashboard/CLI and rejects several
previously accepted Stage 4M evidence mutations. This is a research review candidate, with
remaining verifier and external-validation gaps explicitly retained.

## Implemented and checked

- Stage 4M: signed public roots are checked in both tiers, audit aggregates are recomputed and
  duplicate merge targets are refused. New browser output parses with separate module scopes.
  Six new regression/control tests; full Stage 4M suite 54/54; reproduction 12/12 steps.
- Explorer: 288 branches, 96 distinct model generations, 17 retained Llama unauthorized-effect
  branches and three malformed-proposal branches. Model filters and matched-control isolation
  agree between CLI and dashboard. Historical Phase 10 remains selectable. Twenty tests pass;
  production build succeeds. Imports remain `not_verified_by_explorer`.
- Reproduction harness: unexpected raw-zero negative results fail closed in Stage 4K/4L/4M.
  Four injected branches return exact mapped failure status and cannot print final success.
- Maintenance: the Stage 5P census explicitly admits the completed audit documents while still
  rejecting unapproved runtime literals. Append-only log prefixes remain unchanged; whole-file
  formatting excludes those historical logs. Explorer package/lock carry AGPL license metadata.

## Evaluation and capability observations

The [frozen refusal diagnostic](REFUSAL_PROTOCOL.md) declared four requests and a USD 1 ceiling.
Its first request returned HTTP 401, so it stopped after one reserved attempt (USD 0.25 reserved,
not a claim of billed usage). There are **no new model observations** and the original active
refusal remains unresolved. No failed or skipped arm is replaced by a favorable result.

Eight forced-call local controls completed: active, authorized-reopen and operator-restart each
produced one intended new effect; five restricted states produced no new effect. Unknown-prior
retained its earlier effect. These are internally authored, trusted-host controls, not an outside
red-team campaign or provider-revocation test. [Full retained observations](refusal-results.json)
include every control and the failed model attempt.

Model listing returned HTTP 200; project listing returned HTTP 403. The available credential
therefore did not establish usable inference or administration. No provider key was revoked and
no alert-delivery test was completed. Browser interaction tooling was unavailable; jsdom and
JavaScript parsing do not establish actual browser rendering, accessibility or three-runtime parity.

## Full candidate validation

The first fresh run at `b2bf7dc6` exposed a Stage 5P documentation-census failure and historic log
formatting warnings. Those are retained as failures and repaired under prior declaration
`2068f1a6`. A new complete candidate run is required after that repair; its exact revision and
logs are recorded in the validation receipt alongside this report when complete.

## Reviewer route

1. Inspect [current measured results](../research/transfer-phase-17/RESULTS.md) and retained controls.
2. Use `node tools/simurgh-explorer/cli.mjs summary`, then `records --model llama --kind unauthorized`.
3. Review [all 141 finding dispositions](GAPS.md), [primary-source research](SOURCES.md), and
   the scoped source/test diffs. A repaired subset does not close unrelated historical findings.
4. Run the maintained smoke scripts and follow the [provider/operator handoff](PROVIDER_HANDOFF.md)
   for the evidence this environment cannot supply. Classmate reproduction remains owner-managed.

No OpenAI endorsement, production certification, independent validation or “100% ready” claim
is made. Remaining local verifier work is listed in GAPS.md; external credentials, browser access
and independent operators cannot be manufactured by a local test suite.
