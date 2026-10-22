# Assurance lab implementation plan

**Goal:** Turn the approved industry-gap research into a reproducible real-effects experiment.
**Architecture:** Trusted fixture authority → conventional policy control → child-process file sink;
compare the executor trace with a checkpoint and read-back disk effects.
**Tech stack:** Node.js built-ins, node:test, existing npm/Prettier/Actions tooling; no new dependency.
**Spec:** [Approved bounded design](../specs/2026-10-15-assurance-lab.md).

## Global constraints

Preserve historical evidence and the original OpenAI source hashes. Use the existing isolated
cloud checkout on openai-readiness, as onboarding directs. No paid calls, deployment or release.
Owner's prior commit/push authorization persists. Update both change logs with honest attribution.
The complete AGENT/CHANGELOG preflight was delegated and returned before implementation.

## Task 1 — executable effects and reconciliation

- [ ] Write failing tests in tests/unit/assuranceLab for real child PID, persisted writes,
      exact-action binding, duplicate rejection, immutable authority, structural input rejection,
      omitted/fabricated traces and missing observation. Run and observe RED.
- [ ] Implement tools/assurance-lab/core.mjs, sink.mjs and sink-worker.mjs.
- [ ] Run focused tests. Expected: all pass; child directories cleaned on close and errors.

Interfaces: createPolicy(authority, mode).allows(action); startSink() → execute(action), snapshot(),
close(); evaluate(authority, trace, observation) → independent policy/evidence outcomes.

## Task 2 — controlled study and replay

- [ ] Write corpus/control/replay tests first; observe RED.
- [ ] Implement corpus.mjs, study.mjs and cli.mjs. Seventeen fixture identities × three controls.
- [ ] Assert bypass exploitability, exact-policy preservation, deny-all utility loss, four effective
      evidence mutations, explicit no-op exclusion and both fault cases. Verify modified report fails.
- [ ] Run tests and a fresh report/replay. Expected: exact fixture matrix and honest unknowns.

Interfaces: runStudy() → deterministic schema, sourceManifest, cases, summaries;
verifyReport(report) → fresh study equality or error. CLI run --out PATH refuses overwrite;
CLI verify PATH propagates failure. All report checks inspect the full result, not just a green flag.

## Task 3 — reviewer evidence and CI

- [ ] Write docs/assurance/README.md, INDUSTRY_GAPS.md and evidence/report.json; retain source
      provenance for the cited industry research. Explain fairness, trust and open milestones.
- [ ] Add package commands, scoped workflow checks, README/reviewer-index/roadmap navigation.
      If needed, rederive only the existing mutable workflow census current set.
- [ ] Run focused/full tests, original saved-artifact verification, formatting, diff checks and
      fresh report verification. Record actual counts and skips; update AGENT.md and CHANGELOG.md.

## Task 4 — review and delivery

- [ ] Fresh whole-change reviewer checks the design and code; regressions precede any needed fixes.
- [ ] Commit reviewed implementation, push openai-readiness and verify remote SHA.

## Review focus

Check malformed authority and report input, input aliases/getters, post-commit mutation, unknown
being scored as safe, IPC child failure/timeouts/cleanup, path escape, duplicate IDs, incomplete
case inventories, checkpoints treated as independent identity, and fair baseline information.
Check all new claims against executed effects; no provider SDK execution or durable replay claim.

## Design scorecard

Subjective targets follow the spec: reproducibility 8/10, empirical realism 4/10,
differentiation 3/10, integration readiness 3/10. They are not achieved scores or acceptance ratings.
