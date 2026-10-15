# Incident-driven task scope and durable stopping

Extend the authorized next phase with an additive, key-free experiment inspired by the 2026
Hugging Face and Australian public-statistics incidents. Research sources are recorded separately;
fixtures are authored abstractions, not exploit reproductions or measurements of those systems.

## Design and alternatives

A Python standard-library broker accepts exact requests under a host-owned, precommitted policy.
Bind run, principal, tenant, HTTP method, complete canonical logical URL and body. Unknown fields,
including discovered credentials, cannot expand authority. Recheck every redirect. Persist request
intents, completions, a finite request budget and terminal stop reasons in local SQLite before
dispatch. A pending intent on restart becomes unknown and stops further dispatch; there is no
automatic retry or agent-accessible reset. Cooperating processes serialize with a POSIX file lock.
Opening missing or incompatible state refuses; only explicit host provisioning creates a run.
Admission also persists a pending guard before evaluating scope, so an unavailable stop audit cannot
reactivate the run. Non-success responses and redirects retain pending until a durable decision;
only a committed successful response clears it. Pending recovery is deliberately conservative.

Transport resolves reserved `.test` origins exclusively through a closed host-owned Unix socket
registry. Child HTTP services record received requests separately from broker decisions. A relay
fixture makes an actual onward local request; a redirect fixture returns an actual Location header.
No TCP/DNS fallback, real credentials, live targets, model calls or new Python packages.

Compare exact scope with a deliberately weak initial-origin-only baseline and deny-all. Include
authorized reads and writes so blanket denial has visible utility cost. The origin baseline is our
own negative control, not a characterization of a vendor. An allowed route that relays internally
is an explicit negative result: per-hop checks see redirects, not hidden service-side requests.

An OS firewall exercise would test a different boundary and requires separately provisioned
isolation and external observation. A prompt-only instruction cannot supply this dispatch guarantee.
Exact allowlists and persistent circuit breakers are established mechanisms; the contribution is a
reproducible incident-motivated failure matrix with visible utility costs and remaining gaps.

## Acceptance and boundaries

Pin named cases and controls, replay the entire matrix when verifying a report, reject omitted,
extra, duplicate or changed rows and bind source hashes. Exercise direct escalation, credential
injection, redirects, explicit relay routes, cross-run communication, principal/tenant/run drift,
budget exhaustion, unavailable monitoring, transport ambiguity, restart after stopping and an actual
SIGKILL after dispatch intent. Unit tests additionally cover malformed authority, corrupt/missing
state, policy substitution and concurrent callers. Record sink observations, not just decisions.

Monitoring here means a host-provided dispatch health predicate and durable local audit writes;
it does not classify model intent or prove a remote SOC is staffed. The host, policy, socket registry
and database are trusted. No hostile-host, rollback, power-loss, distributed identity, DNS containment,
general sandbox, arbitrary tool mediation, statistical generalization or production-readiness claim.
An agent with raw networking or shell access can bypass the broker. Stops are terminal for this run;
review and provisioning a new run are trusted operator work outside this API.

## Gate lifecycle

| Field                         | Declaration                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| active_phase                  | Additive incident scope v1                                                                                                                                   |
| protected_surface             | tools/assurance-scope/**, docs/assurance/scope/**, scoped CI and entry-point links                                                                           |
| next_phase_behaviour          | Verify this bounded matrix only; future controls get new evidence                                                                                            |
| maintenance_behaviour         | Regression first, refresh this phase's own source-bound report; preserve prior phases                                                                        |
| sunset_or_migration_condition | Explicit versioned replacement preserving old evidence and migration tests                                                                                   |
| anti_vacuity_condition        | Exact case/control identity set, actual child service observations, useful-work controls, explicit known failure, pending-intent SIGKILL and complete replay |

Earlier tool sources and six saved reports stay byte-identical. Only the standing mutable workflow
census `current` set may be rederived for the new CI step; baseline19 remains frozen.
