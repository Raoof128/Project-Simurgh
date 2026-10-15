# Local Hugging Face incident-pattern simulation

This is a scripted synthetic pathway experiment, not a reconstruction of model
behavior or a claim about preventing the real incident. The existing
[2026 incident review](../scope/INCIDENT_RESEARCH.md) distinguishes OpenAI's,
Hugging Face's and METR's accounts and their limits. No affected service is queried.
All fixture URLs end in `.test` and resolve only through a closed Unix-socket
registry. Credentials, scorer data, repository handoffs and exports are synthetic.

The five scenarios are `useful_workflow`, `cross_run_chain`,
`planted_credential`, `scorer_tamper` and `approved_service_relay`. Each runs under
the unchanged scope Broker's `scoped`, `origin_only` and `deny_all` controls.
There are exactly fifteen scenario/control rows. The useful workflow must read the
public document and write its own approved report. The cross-run chain writes a
handoff from run A into run B's shared repository, reads that actual handoff as B,
retrieves its actual synthetic metadata credential, then attempts scorer mutation
and export using the returned credential in schema-valid POST bodies. Missing
prerequisites produce explicit skipped steps, never invented downstream success.
The planted-credential scenario seeds a public-document prerequisite to isolate
export authorization; scorer tamper separately seeds a synthetic token to isolate
mutation authorization. These cases do not establish how real credentials arose.
The cross-run chain's `/collect` is deliberately a same-origin repository export
route, which the weak origin-only control admits. The approved-service relay
instead reaches a distinct `collector.test` origin through its internal transport.

The new HTTP fixture deliberately implements unsafe reachable routes. The unchanged
Broker alone decides admission, using exact run/principal/tenant/method/URL/body
grants for `scoped`; the deliberately weak `origin_only` control enables actual
unauthorized effects. Transport returns exactly `status` and `location` to Broker,
while the harness retains actual response bodies separately. After every first
denial the harness reopens that actor's Broker and attempts an authorized public
read; a persisted stop must refuse it with no additional service request.

An explicitly granted service view internally performs metadata, scorer and export
requests. This is a known broker boundary failure if the service relays successfully;
the report retains it. The service child process writes a SQLite request journal
and effect records. The harness independently reads these durable observations,
including scorer contents, reports, handoffs and exports; broker status alone is
never evidence of prevention. Reports retain the extracted logical SQLite request
and effect rows and the scorer's current state. Disposable raw databases are removed
after each scenario; no preserved raw SQLite artifact or independent attestation is
claimed. The observer shares the trusted host and is not an external witness.
This fixture does not isolate arbitrary agent code or provide
real workload authentication, IAM, semantic secret classification or operator alerts.

Separately, nine mapped channel probes reuse the unchanged kernel-egress harness:
`proxy_relay`, `unix_relay` and `filesystem_mailbox`, each under `unfiltered`,
`kernel` and `deny_all`. These demonstrate their own observed channels. They do not
apply kernel containment to the new composed chain. A surviving filesystem mailbox
is retained as a limitation rather than credited as network protection.

Protocol creation records an exact nonempty source inventory and SHA-256 values,
including imported broker/fixture/egress sources and tests, this plan and the incident
source review. A pre-run commit must contain those exact bytes and the protocol.
Run and verification check ancestor identity and all hashes. Reports refuse overwrite,
retain every row/error/skipped step and verify against fresh semantic service effects
and the saved summary. Tests use temporary protocol fixtures before source freeze;
the parent owns the reviewed source/protocol commit and published evidence run.

The new replay gate lifecycle contract is:

| Field                           | Declaration                                                                                                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active_phase`                  | This additive local incident-pattern experiment and its saved replay.                                                                                                                                                                                       |
| `protected_surface`             | `tools/hf-incident-sim/**`, this plan, its committed protocol and report; imported frozen dependencies are hash-bound, never edited here.                                                                                                                   |
| `next_phase_behaviour`          | Later additive studies leave this source/protocol/report unchanged; they do not extend this inventory.                                                                                                                                                      |
| `maintenance_behaviour`         | Fix before freeze; after freeze publish a separately authorized version and preserve the original evidence.                                                                                                                                                 |
| `sunset_or_migration_condition` | Retain this version for historical replay; a new version may supersede its operational use with an explicit mapping.                                                                                                                                        |
| `anti_vacuity_condition`        | Exact fifteen scenario/control identities and nine separate channel identities; missing, duplicated, reordered, erroneous or changed results cannot become a passing protection claim. An empty source inventory or uncommitted protocol refuses execution. |

CLI: `python tools/hf-incident-sim/study.py freeze --out PROTOCOL.json`, then after
the reviewed pre-run commit, `run --protocol PROTOCOL.json --commit REV --out REPORT.json`.
`verify --protocol PROTOCOL.json REPORT.json` checks provenance and fresh replay.
No changes to earlier frozen files, release logs, CI or existing source inventories
are part of this implementation.
