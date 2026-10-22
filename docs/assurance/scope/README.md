# Task scope, indirect requests and durable stopping

This incident-motivated experiment executes actual local HTTP requests against child services over
Unix sockets. A host-owned broker binds exact run, principal, tenant, method, URL and body; records
intent before dispatch; checks a monitoring-health predicate; limits requests; and persists terminal
stops. It extends the [incident review](INCIDENT_RESEARCH.md) with falsifiable local tests.

It is a research component, not installed protection for an existing application. Integrators must
route all relevant requests through it and separately enforce network isolation. The earlier
[workflow recovery](../workflow/README.md) phase remains separate and unchanged.

## Reproduce

Linux/POSIX, Python 3.12 standard library, no packages, API key or Internet service required:

```bash
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=tools/assurance-scope
python -m unittest discover -s tools/assurance-scope/tests -v
python -m simurgh_scope.study run --out /tmp/simurgh-scope-new/report.json
python -m simurgh_scope.study verify /tmp/simurgh-scope-new/report.json
python -m simurgh_scope.study verify docs/assurance/scope/evidence/report.json
```

Use a fresh output path; overwrite is refused. Verification checks source hashes, the exact ordered
case/control set and complete fresh execution, including sink observations. Same-code replay is not
independent implementation verification. No timings or PIDs are presented as reproducible evidence.

## Controls and observed results

The report has **18 authored cases under three controls: 54 rows**. `origin_only` is an intentionally
weak initial-origin allowlist; `scoped` checks exact grants at each redirect; `deny_all` exposes the
cost of rejecting everything. The weak baseline is our implementation, not a vendor system.

| Case group                                                                                                     | Scoped behavior                                                                  | What the control comparison establishes                                                                              |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Public read and scoped write                                                                                   | Both complete with observed service requests                                     | Deny-all loses both useful operations                                                                                |
| Admin read, credential injection, ungranted relay, run/principal/tenant drift, cross-run message, changed body | All eight refuse before the first request                                        | Initial-origin-only admits an out-of-grant request in every case                                                     |
| Redirect to an ungranted destination                                                                           | Original permitted request observed; onward request refused                      | Initial-origin-only follows and reaches the outside fixture                                                          |
| **Approved service relays internally**                                                                         | **Broker reports completion; outside service receives one out-of-grant request** | **Known failure of this boundary; both scoped and initial-origin-only miss it**                                      |
| Monitor unavailable                                                                                            | No dispatch                                                                      | Initial-origin-only still dispatches; the monitor is a host health predicate, not an intent classifier               |
| Budget exhaustion                                                                                              | First useful request completes; second stops                                     | Availability cost: a repeated otherwise permitted request is refused                                                 |
| Missing public data                                                                                            | 404 is observed; run stops and refuses later work                                | No successful answer is fabricated; baseline also stops on this response                                             |
| Lost reply                                                                                                     | Service observes request; broker reports unknown and stops                       | A missing response is not treated as no effect; no automatic retry                                                   |
| Stop/reopen                                                                                                    | Scope violation remains terminal in a new broker instance                        | Initial-origin-only admits the admin request and subsequent public read                                              |
| SIGKILL after durable intent, before send                                                                      | New application process sees pending intent, returns unknown and stops           | No service request observed; conservative recovery sacrifices availability. Deny-all has no intent and is not killed |

The unknown/crash behavior is shared by the two non-deny controls; it is not credited as an advantage
of exact scope. The matrix uses one explicit weak baseline, not a broad comparison with existing
security products. Case outcomes are authored tests, not independent attacks or an attack-success
estimate. The [validation record](VALIDATION.md) records commands and checks.

## Integration contract

`Broker.create(path, policy, mode="scoped")` is trusted host provisioning and refuses replacement.
`Broker(path, policy, transport, monitor=...).execute(request)` dispatches only under that binding.
The transport must return `{status, location}` and must not follow redirects internally. The fixture
transport returns status and Location only; it discards response bodies. It is not a general research
client that returns statistical data. Unknown request fields, including credentials, cannot grant
authority. Granting an unsafe route remains an operator error, shown by the approved-relay case.

The broker deliberately has no agent reset/resume method. A trusted operator must review a stop and
provision a new run outside this API. Missing state is not silently recreated. SQLite plus a POSIX
file lock serializes cooperating callers; policy and mode are hash-bound. After audit/storage errors,
`Refusal` explicitly makes no no-effect claim: an error after dispatch may leave a pending intent.
On reopening that state, recovery reports unknown and stops. This is not an exactly-once connector.

Admission itself first records a pending guard, without consuming the dispatch budget. A failed
stop write after scope/monitor/budget rejection therefore cannot leave the run active. Responses
requiring stopping, and redirects awaiting authorization, also retain pending state until their
decision is durable. Only a committed successful response clears pending. If the initial guard
cannot be persisted, admission and dispatch do not begin.

## Limits that matter

- All network traffic in the fixture is local HTTP over Unix sockets through a closed `.test`
  registry. No real target, credential, exploit, TCP, DNS, TLS or metadata-service access is tested.
- Broker mediation must be mandatory. Raw shell, sockets, DNS, another tool or an approved service's
  own egress can bypass this boundary. The approved-relay negative result makes the last gap visible.
- Host files, policy, lock identity, registry, transport and monitoring predicate are trusted.
  Strings bind fixture identity; they do not authenticate people or workloads. Hashes detect policy
  mismatch, not malicious host edits, rollback or forged authority.
- Service logs are independently read within the same host/trust domain. They are not independent
  operator evidence. The observer stores only synthetic fixture payloads; no privacy guarantee for
  arbitrary production payloads is established.
- SIGKILL is tested after an intent, not power loss or every instruction boundary. Locks serialize
  cooperating processes only. Stop decisions are terminal and conservative; usefulness and overhead
  for real long-running research workflows remain unmeasured.
- Monitoring is dispatch-time and synchronous. It cannot cancel an already in-flight request or
  establish alert delivery, response SLAs, model alignment or incident notification compliance.

See the [design](../../superpowers/specs/2026-10-15-assurance-scope.md) for the scope and gate lifecycle.
