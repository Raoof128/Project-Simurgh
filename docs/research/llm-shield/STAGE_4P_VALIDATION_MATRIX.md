# Stage 4P — VOCA Validation Matrix

**Motto: AnthropicSafe First, then ReviewerSafe.**

Every metric below is the actual count in the shipped tree at commit time, with the exact
command that recomputes it. Re-run the command; if the number differs, the doc is stale,
not the code — code is the source of truth (4P spec §17.12 docs-accuracy discipline).

## Lane A — normative modelled custody corpus (25 arms)

```bash
ls tests/fixtures/llmShield/stage4p/lane-a | wc -l   # -> 25
```

| Group                         | Count  | Arms                                                                                                                                      | Recompute                                                                                             |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Green                         | 2      | `green-direct`, `green-declared-relay`                                                                                                    | `ls tests/fixtures/llmShield/stage4p/lane-a \| grep '^green-'`                                        |
| Single-fault (raw 67–79)      | 13     | `fault-67` … `fault-79`, one per raw code, triggered in isolation                                                                         | `ls tests/fixtures/llmShield/stage4p/lane-a \| grep -c '^fault-[0-9]*$'`                              |
| Raw-78 sub-arms               | 3      | `fault-78-duplicated-hop`, `fault-78-reordered-hop`, `fault-78-non-linking-hop`                                                           | `ls tests/fixtures/llmShield/stage4p/lane-a \| grep -c '^fault-78-'`                                  |
| Doubly-broken (first-failure) | 3      | `laundering-beats-model-swap` (78 wins over 72), `signature-beats-laundering` (68 wins over 78), `endpoint-beats-relay` (70 wins over 71) | `ls tests/fixtures/llmShield/stage4p/lane-a \| grep -E 'beats'`                                       |
| Boundary                      | 4      | `malformed-receipt` (77 `receipt_schema_invalid`), `unknown-enum` (67 `schema_invalid`), `epoch-edge-low`, `epoch-edge-high` (both raw 0) | `ls tests/fixtures/llmShield/stage4p/lane-a \| grep -E 'malformed-receipt\|unknown-enum\|epoch-edge'` |
| **Total**                     | **25** | 2 + 13 + 3 + 3 + 4                                                                                                                        | `ls tests/fixtures/llmShield/stage4p/lane-a \| wc -l`                                                 |

Raw-code coverage and raw-78 reason coverage are asserted, not just counted:

```text
raw-code coverage: 13/13   (all of raw 67..79 appear as the expected raw in >=1 lane-a arm)
raw-78 reason coverage: 5/5 (missing_hop, reordered_hop, duplicated_hop,
                              non_linking_previous_digest, terminal_response_mismatch)
```

Recompute: `node --test tests/unit/llmShield/stage4p/fixtures.test.js` — the test
`"lane-a covers all 13 raw codes and all five raw-78 reasons"` fails closed if either
count regresses.

## Lane B — legal live relay over the Stage 4O MCP harness (6 arms)

```bash
ls tests/fixtures/llmShield/stage4p/lane-b | grep -v capture-manifest.json | wc -l   # -> 6
```

| Arm                      | Raw | Meaning                                                             |
| ------------------------ | --- | ------------------------------------------------------------------- |
| `clean-declared-relay`   | 0   | green — tool surface digest matches the committed Stage 4O manifest |
| `undeclared-relay`       | 71  | hop signed by a relay key not in `declared_relay_digests`           |
| `model-swap`             | 72  | observed model-identity digest diverges from the declared digest    |
| `trace-custodian-change` | 74  | observed trace custody exceeds the declared allow-set               |
| `tool-surface-rewrite`   | 75  | observed tool-surface digest diverges from the Stage 4O commitment  |
| `dropped-hop`            | 78  | zero hops recorded (`missing_hop`)                                  |

Recompute: `node --test tests/unit/llmShield/stage4p/laneb.test.js` — asserts
`capture-manifest.json` lists exactly these six arm names and every arm replays to its
recorded `{raw, reason}`.

## Lane C — public-report-motivated synthetic fixture (1 arm)

```bash
ls tests/fixtures/llmShield/stage4p/lane-c   # -> public-report-motivated
```

One fixture, fully synthetic names, modelled on the publicly reported grey-market resale
shape (ChinaTalk/Tom's Hardware coverage, cited in spec §3 as motivation only — no figure
from that coverage is adopted as a Simurgh measurement).

## CPC corroboration fixture (5 arms)

```bash
ls tests/fixtures/llmShield/stage4p/cpc | wc -l   # -> 5
```

| Arm          | File                | Expected                                                                                               |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------ |
| Match        | `match.json`        | Two operators, distinct keys, same relay, same window → identical `custody_class_digest`               |
| Differ       | `differ.json`       | Different relay → different digest                                                                     |
| Cross-window | `cross-window.json` | Same relay, next window → digest differs (cross-window unlinkability)                                  |
| Degraded     | `degraded.json`     | Low-entropy evidence → `degraded_non_matchable`, no digest; a tampered bundle adding a digest → raw 79 |
| Budget       | `budget.json`       | Matchable signals beyond the declared per-window cap → raw 79                                          |

Recompute: `node --test tests/unit/llmShield/stage4p/cpcCore.test.js`.

## Invention-layer arms (7 fixtures)

```bash
ls tests/fixtures/llmShield/stage4p/invention | wc -l   # -> 7
```

```text
pincer 3/3:        pincer-match.json, pincer-window-mismatch.json, pincer-class-mismatch.json
contest 2/2:       contest-valid.json, contest-forged.json
disclosure:        disclosure.json   (recompute pass, field-for-field)
bridge:            bridge.json       (digest-binding pass)
```

Recompute: `node --test tests/unit/llmShield/stage4p/inventionCore.test.js`.

## Unit test count (49 tests, 10 files, 0 failures)

```bash
node --test \
  tests/unit/llmShield/stage4p/attestation.test.js \
  tests/unit/llmShield/stage4p/chainCore.test.js \
  tests/unit/llmShield/stage4p/constants.test.js \
  tests/unit/llmShield/stage4p/cpcCore.test.js \
  tests/unit/llmShield/stage4p/custodyCore.test.js \
  tests/unit/llmShield/stage4p/digest.test.js \
  tests/unit/llmShield/stage4p/fixtures.test.js \
  tests/unit/llmShield/stage4p/inventionCore.test.js \
  tests/unit/llmShield/stage4p/laneb.test.js \
  tests/unit/llmShield/stage4p/schemaCore.test.js
# -> tests 49, pass 49, fail 0
```

Full repo unit suite (`npm test`, all stages): **1493 tests, 1493 pass, 0 fail** at the time
of this pass. Recompute: `npm test`.

## E2E net (11 tests, 1 file, 0 failures)

```bash
node --test tests/e2e/llmShield/stage4p/allFunctions.e2e.test.js
# -> tests 11, pass 11, fail 0
```

Covers: export inventory (every core/node module exposes exactly its frozen export set),
full bundle composition + verification, the per-field tamper matrix, three cross-stage
invariants (§10: Stage 4O surface binding, Stage 4N window-anchor recompute, Stage 4L
`corroborating_commitments` slot-type parity), three privacy scans, and two byte-idempotency
checks.

Full repo `check-e2e.sh` gate (Node version check + 9 e2e net files + 11 reproduce
pipelines): **13/13 passed**. Recompute: `bash scripts/check-e2e.sh` (requires Node ≥ 26).

## Lean proofs (6 theorems, 0 `sorry`)

```bash
lean proofs/stage4p/OriginCustody.lean   # -> exit 0
```

| Theorem                  | Line (approx.) |
| ------------------------ | -------------- |
| `noSilentThirdPath`      | 37             |
| `noGhostProvider_accept` | 45             |
| `custodyPathMonotone`    | 56             |
| `noCustodyLaundering`    | 66             |
| `ghostTrilemma`          | 94             |
| `cpcEmissionBounded`     | 114            |

Codes 67–79 also fall under the generic totality/fail-closed model in
`proofs/stage4/ExitLattice.lean` (a parametric theorem over any raw code, not a
per-code enumeration — see that file's own scope note).

## Reproduce (one command, byte-idempotent under Node 26)

```bash
PATH="/opt/homebrew/opt/node@26/bin:$PATH" scripts/reproduce-llm-shield-stage4p.sh
# -> "[stage4p] ALL GREEN"
```

Nine steps: Node major check, unit suites, fixture-builder re-run + idempotency diff,
Lane B capture re-run + idempotency diff, offline verifier on the committed bundle, the
all-functions e2e net, the Stage 3M/3O private-key audits (confirming the 4P
`INSECURE_FIXTURE_ONLY` test keys stay allowlisted), an egress grep guard over the
committed evidence directory, and a final idempotency diff.

## Evaluation metrics (boring wins audits)

```text
raw-code coverage:            13/13
first-failure determinism:    pass (laundering-beats-model-swap, signature-beats-laundering,
                               endpoint-beats-relay all resolve to the earlier code)
green-arm acceptance:         2/2 Lane A green arms + clean-declared-relay (Lane B) accepted
Lane B arms classified:       6/6
CPC fixture arms:             5/5
invention-layer arms:         pincer 3/3, contest 2/2, disclosure recompute pass,
                               bridge binding pass
privacy scan:                 pass (3 dedicated e2e checks + reproduce step 8 egress grep)
byte-identical reproduction:  pass (twice, Node 26, fixtures + Lane B capture + evidence)
```

Not measured (deliberately out of scope, matching spec §13): "proxy detection rate in the
wild." That claim requires real-world deployment, which this stage does not attempt.
