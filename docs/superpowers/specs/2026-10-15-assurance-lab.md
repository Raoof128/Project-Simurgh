# Real-effects assurance experiment

Approved direction: the owner's request to proceed with the comparative evidence experiment.
This is its first bounded implementation milestone, not a numbered historical stage or release.

## Question and scope

Can a precommitted exact-action policy prevent unauthorized disposable file writes, and can
trusted sink observations expose discrepancies in an otherwise plausible execution trace?
Compare conventional controls fairly; equal performance is a valid result. This experiment
does not establish a new mechanism or a deployment advantage.

The workload writes synthetic patch/report records to a fresh temporary directory through a
Node child process. The observer reads the persisted records back after requests complete.
The process boundary separates executor bookkeeping from disk observation but shares one host,
operator and implementation. Neither hostile host execution nor independent custody is covered.
No shell execution, arbitrary resource paths, external network, model calls or real data are used.

## Contracts

- An action has exactly eight bounded string fields: id, run, principal, tenant, operation,
  resource, content and policyRevision. Operation is write; resource is patch or report.
- Fixture authority is committed in memory before execution. Its revision and approved exact
  actions bind all fields; each action id authorizes at most one effect in that session.
  A subsequent fixture approval cannot amend this snapshot. This is not authenticated human IAM.
- Controls are bypass, exact-policy and deny-all. All share structural validation and the same
  sink. Replay prevention is session-local; crash durability and multiple enforcers are untested.
- The oracle counts effects independently against the committed authority, including duplicates.
  It also reports whether required benign effects completed. No aggregate safety percentage.
- Trace-only sees authority and reported events. Checkpoint comparison additionally sees the
  trusted sink count/digest. Reconciliation additionally sees all read-back effects. The latter
  two have more information than trace-only; any difference is not a same-information win.
- Missing observation or intentional sink failure produces unknown. Observed policy violations,
  evidence mismatch and consistency are distinct fields. Unknown is never a clean containment.
- Authorization mutations must change proposals; trace mutations must change actual produced
  evidence. A deliberate no-op remains invalid and excluded from applied-attack denominators.
- The initial corpus is 17 authored cases: three benign workflows, seven authorization attacks,
  four trace mutations, one deliberate no-op and two infrastructure faults. No held-out claim.
- Reports retain every case/control pair, authority, proposal, trace and observation, plus source
  hashes. Verification checks exact schema/content through fresh execution; it is reproducibility,
  not independent authentication of the historical machine. Nondeterministic timing is omitted.

## Gates and lifecycle

| Field                         | Declaration                                                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive assurance-lab v1 development and maintenance                                                                                                                                                                      |
| protected_surface             | tools/assurance-lab/**, tests/unit/assuranceLab/**, docs/assurance/\*\* and their package/CI wiring                                                                                                                        |
| next_phase_behaviour          | Reproduce this corpus only; new studies use a new schema or explicit migration and cannot silently change these results                                                                                                    |
| maintenance_behaviour         | Reviewed changes to this open namespace require tests, source-manifest refresh, fresh report and both change logs; frozen historical paths retain their own authority rules                                                |
| sunset_or_migration_condition | Replace this gate only with a documented schema migration retaining the old report and verifier source revision                                                                                                            |
| anti_vacuity_condition        | Assert exact corpus identities, actual disk effects, exploitable bypass attacks, preserved benign work, deny-all utility loss, effective mutations, explicit fault outcomes, and rejection of altered/omitted report cases |

## Design scorecard

Subjective design targets, not measurements: reproducibility 8/10 (fresh disk replay); empirical
realism 4/10 (real local writes, synthetic tasks); differentiation 3/10 (fair checkpoint comparator,
no novelty result); integration readiness 3/10 (Node interface only). Higher ratings require
external reproduction, realistic held-out tasks, an incremental benefit and tested SDK adapters.

## Deferred evidence

OpenAI Agents SDK and LangGraph adapters, independently authored attacks, real connector sinks,
durable atomic replay/approval state, revocation and concurrent authorization, operator-independent
observations, end-to-end overhead and willingness-to-adopt research remain future milestones.
