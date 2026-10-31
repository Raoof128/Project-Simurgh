# Research-claim audit — 31 October 2026

Every number below was recomputed from the committed archives by scripts that do not use the
repository's own scorer (`evidence.zip` members parsed directly; receiver SQLite snapshots
recounted). Classification: **Frozen observation** (recorded in the archive and recomputed here),
**Fresh reproduction** (executed again in this audit), **Static or formal guarantee**,
**Unverified external assumption**, **Hypothesis or future work**. The seccomp fresh-execution
replay needs Linux x86_64 and was **not** run; nothing here claims it was.

## Transfer study (`docs/research/transfer-phase-17/`)

| Claim                                                                      | Source                      | Recomputed                                                                                                   | Class              | Match |
| -------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------ | ----- |
| `ROOT.sha256` = `2ccf1aac…6389`                                            | `ROOT.sha256`               | sha256 of `manifest.json` inside the zip (the root is the manifest hash, not the zip hash)                   | Frozen observation | yes   |
| Archive hygiene                                                            | `read_pack`                 | 4,167 members, 0 duplicate/absolute/`..`/backslash paths, 0 symlinks, 4,166/4,166 member hashes match        | Fresh reproduction | yes   |
| 96 proposals, 288 branches                                                 | README:62-63                | 48 generations × 2 models; 3 branches per (task, trial)                                                      | Frozen observation | yes   |
| Luna credential-only/composed 24/24 active, 0/24 restricted effects        | README:70-73                | 24/24; 0/24                                                                                                  | Frozen observation | yes   |
| Llama credential-only 23/24 and 17/24; composed 23/24 and 0/24             | README:74-75                | identical                                                                                                    | Frozen observation | yes   |
| Deny-all 0/24; valid active proposals blocked 0 (Luna 0/24, Llama 0/23)    | README:77, RESULTS:18-21    | identical                                                                                                    | Frozen observation | yes   |
| Four earlier effects per model not prevented                               | README:79-80                | `before_effects` = 4 in every control                                                                        | Frozen observation | yes   |
| Task-level 9/12 vs 0/12; Wilson 46.8–91.1 and 0–24.2                       | RESULTS:28-31               | identical                                                                                                    | Frozen observation | yes   |
| Six states, 5/6 vs 0/6; Wilson 43.6–97.0 and 0–39.0 (pass-3 M14 sentences) | README:82-86, RESULTS:32-37 | signal_stop 3, ancestor_revoke 4, pending_alert 4, unknown_prior 4, monitor_expired 2, credential_revoke 0   | Frozen observation | yes   |
| No excluded trials                                                         | `transfer.py:366-425`       | `summary()` has no skip path; declined, malformed and the incomplete active task are in the denominators     | Static             | yes   |
| Matched controls receive identical proposals                               | README:62, BRIEF:12         | one generation id per (task, trial); all 111 new effects equal the captured proposal                         | Frozen observation | yes   |
| Effects come from receiver snapshots                                       | RESULTS                     | recounted from `service.sqlite`/`service-before.sqlite` for 288 + 120 + 16 fixtures: 0 mismatches            | Fresh reproduction | yes   |
| Cost, tokens, attempts, latency, wall time                                 | RESULTS:93-101              | $0.0061306; 22,208 in / 2,252 out; 80 attempts; 1.166/2.396 s; 112.27/501.74 s                               | Frozen observation | yes   |
| Soak: 120 fixtures, 61.45 s, 420 + 20 calls, 1,200 snapshots               | README:106                  | identical                                                                                                    | Frozen observation | yes   |
| Source bindings                                                            | 11 `protocol.json` files    | 713/713 pinned paths match the tree and `HEAD` blobs; freeze commits `4afe9538` and `fbe06eca` are ancestors | Fresh reproduction | yes   |
| Hosted 13-job run at `4afe9538`; native CI at `fbe06eca`                   | README:111, RESULTS:77      | `gh run view` 38961632209 and 38962135213: success; macOS 2+8, Windows 11/11 from archived logs              | Frozen observation | yes   |
| 10 evidence mutations rejected                                             | README:107                  | `validation-logs.zip/mutations.log` has the 10 REJECTED lines; the suite itself was not re-executed here     | Frozen observation | log   |

**Corrections made (no number changed):** README and RESULTS now say the credential-only control
cannot observe stop, lease or alert state, so the 17/24 → 0/24 difference mostly measures how
often Llama emits the exact call (F-1); RESULTS records that the archive binds the model by the
worker's manifest hash (`d3118936…`, revision `0cb88a4f`, `weights_downloaded: false`) and
`ready: true` rather than an independent weight hash, and lists the sampling settings
(bf16 CPU, temperature 0.7, top_p 0.9, max_new_tokens 256, seed 171000) (F-2, pass-3 M16).

**Unverified external assumptions:** the Hugging Face LFS hashes identify the weights the worker
loaded; the OpenAI model id names a fixed model; the trusted host, provisioning, storage and
receiver are honest (stated in README and SECURITY.md).

## Provider-role correction (`docs/research/provider-role-phase-17b/`)

| Claim                                                                                                                    | Recomputed                                                                                           | Match |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----- |
| `ROOT.sha256` = `721871be…6225`; 86 members clean                                                                        | manifest hash and member hashes                                                                      | yes   |
| Original: 8/8 declined including 3 authorised                                                                            | original capture byte-equal to the transfer archive's `workflows.json`                               | yes   |
| Corrected: 2/3 authorised completed, 5/5 restricted declined, one active refusal unresolved, one earlier effect retained | reopen and operator_restart `call/observed/1 effect`; six declined; unknown_prior `before_effects` 1 | yes   |
| Model declines are not enforcement blocks                                                                                | `declined` and `blocked` are distinct statuses; no `call` among the five restricted outcomes         | yes   |

## Historical LLM Shield claims still cited

| Claim                                  | Evidence                                                | Recomputed                                                       | Note                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage 1-LIVE ASR 9/140 → 0/140         | `stage-1-live/…/authority-gate/*-per-case-rows.json`    | baseline 9/140, authority 0/140, benign 7/10 → 6/10, uua 91 → 80 | The gate was tuned on the same 140 cases (pass-3). The egress gate in that harness grounds addresses by substring (B-4), which the fixed attacker address does not exploit. |
| Stage 3L reference library containment | `tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs` | not a measurement                                                | `receipt_exported` and `audit_verified` hard-coded; 120 input-miss cases are 5 tuples × 24; `unsafe_tool_executed` cannot fire (B-7).                                       |

## Formal claims (Lean)

All 39 files compile under Lean 4.15.0; the kernel axiom census over 308 theorems reports only
`propext`, `Quot.sound` and `Classical.choice`. Theorem-versus-claim notes from the E review:

| Theorem                                         | Proves                                                 | Claimed                               | Gap                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Stage4.fail_closed`                            | unmapped code → 3                                      | "any unmapped raw code → run-level 3" | JS matches; `[0]` coerces to 0, not a downgrade path                                                                                                   |
| `Stage4.total`                                  | a disjunction its own case split satisfies             | "total and fail-closed"               | near-tautology; only `fail_closed` carries the claim                                                                                                   |
| `anti_monotonicity` (4M)                        | one breached member plus non-inflation → merged breach | "breaches are monotone under truth"   | JS checks non-inflation against window[0]; a missing genesis budget makes `Math.min` NaN and an inflationary merge validates (hand-built genesis only) |
| `Stage4N.omission_detectable`                   | contrapositive about `wellFormed`                      | "silence is never invisible"          | conditional on a verifier that knows the true schedule; the 4N CLI omits manifest authentication                                                       |
| `Stage4N.expected_present`                      | restates its hypothesis                                | temporal completeness                 | tautology                                                                                                                                              |
| `Vsr.delegationAcyclic`                         | two edges give `Reaches a a ∧ Reaches b b`             | "a cycle discharges nothing"          | docstring does not match the statement; the JS DFS is stronger                                                                                         |
| `Vsr.admissibilityBlocks`                       | `baselineExit ≠ 0 → receiptValid = false`              | green-red-green                       | matches `harness.mjs`; two consumers use weaker predicates                                                                                             |
| `Vwq.ProducerCannotSelfWitness`                 | accepted statements have a distinct key digest         | producer exclusion                    | takes `signatureVerified` as input; the JS never verifies it (E-2)                                                                                     |
| `Vwq.QuorumShortfallCannotSuppressEquivocation` | status ignores witnesses                               | equivocation not laundered            | true by shape                                                                                                                                          |

A proof over a simplified model is not a proof of the deployed runtime; the rows above name the
places where the runtime takes a different input than the model.
