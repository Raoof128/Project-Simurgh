# Current-study explorer repair authority

Owner-approved readiness work, declared before implementation. Finding R02: the explorer default
omits the 288-branch transfer study and generation identities do not distinguish models.
The default becomes transfer Phase 17; `--study phase10` retains the historical 144-row view.
Both use the same browser-safe interpretation. Imports remain unverified. ZIP reads are bounded,
select only the two known JSON members, and never extract paths or expose database credentials.
Full source inventories require every model/task/trial/control identity, not merely matching counts.
Filtered exports explicitly retain their original denominator. Malformed proposals remain visible.

| Exact path                                          | Operation | Purpose                                                                            |
| --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `tools/simurgh-explorer/core.mjs`                   | modify    | R02 study/model identities, malformed outcomes, filtering and selection validation |
| `tools/simurgh-explorer/index.mjs`                  | modify    | R02 choose current or historical source                                            |
| `tools/simurgh-explorer/transfer.mjs`               | add       | R02 validate complete capture and derive selected outcomes                         |
| `tools/simurgh-explorer/read-transfer.py`           | add       | R02 bounded, non-extracting ZIP reader                                             |
| `tools/simurgh-explorer/cli.mjs`                    | modify    | R02 explicit study/model options                                                   |
| `tools/simurgh-explorer/src/App.jsx`                | modify    | R02 model selection and matching-control isolation                                 |
| `tools/simurgh-explorer/tests/query.test.mjs`       | modify    | R02 preserve historical compatibility tests                                        |
| `tools/simurgh-explorer/tests/integration.test.mjs` | modify    | R02 preserve historical compatibility tests                                        |
| `tools/simurgh-explorer/tests/ui.test.mjs`          | modify    | R02 historical and current UI behavior                                             |
| `tools/simurgh-explorer/tests/transfer.test.mjs`    | add       | R02 inventory, tamper, model and CLI parity checks                                 |
| `tools/simurgh-explorer/README.md`                  | modify    | R02 current usage and honest scope                                                 |
| `tools/simurgh-explorer/package.json`               | modify    | R03 license metadata                                                               |
| `tools/simurgh-explorer/package-lock.json`          | modify    | R03 matching license metadata                                                      |

The active phase is this repair; protected surfaces are the paths above. Successor work retains
these tests. Maintenance requires a prior exact-path extension; migration requires replacement
contracts. Passing requires positive controls plus missing/duplicate/mismatched inventory refusals.
No new global blocking gate is introduced. Existing captures, reports and protocols remain frozen.
