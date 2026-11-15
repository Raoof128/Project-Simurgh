# Phase 19 full test suite — results

- **Operator:** Jacob
- **Date:** 2026-11-15
- **Commit:** `c24b47ce9f159b2424ed800f9ebbc41eb1795c5e`
- **Host:** Ubuntu 26.04.1 LTS, x86_64
- **Python:** CPython 3.12.16 (uv-managed standalone build)
- **Lean:** 4.15.0 on PATH
- **Tests:** 723
- **Skips:** 18

## 1. HANDOFF recipe (verify-set interpreter)

```sh
cd tools/assurance-provenance
PATH="$HOME/.elan/bin:$PATH" ../../.venv-verify/bin/python -m unittest discover -s tests -v
```

**Result:** `Ran 723 tests in 1369.971s` — **FAILED (errors=2, skipped=18)**, elapsed 22:51.88.

Both errors are the same import failure:

```text
ModuleNotFoundError: No module named 'agents'
```

The failing tests are:

- `test_evidence19j_committed.CommittedPackTests.test_the_frozen_replay_reproduces_the_committed_report`
- `test_replay19.HostTests.test_the_frozen_pipeline_blocks_a_restricted_send_and_admits_an_active_one`

Cause: `tools/assurance-provenance/requirements-verify.lock` does not install `openai-agents`, although the frozen replay path imports `agents` through `tools/assurance-workflow/simurgh_workflow/native.py`. The full hash-locked set does install `openai-agents==0.23.1`.

## 2. Full hash-locked set

```sh
cd tools/assurance-provenance
PATH="$HOME/.elan/bin:$PATH" ../../.venv/bin/python -m unittest discover -s tests -v
```

**Result:** `Ran 723 tests in 1487.242s` — **OK (skipped=18)**, elapsed 24:48.82.

Both tests that errored under the verify set pass under the full set.

## Skipped tests

| Test | Reason |
|---|---|
| `test_evidence19d.OffHostTests.test_run_refuses_off_linux` | refusal test is for hosts that cannot namespace |
| `test_evidence19j.Evidence19jTests.test_replay_refuses_off_linux_without_a_stand_in` | refusal test is for hosts that cannot replay |
| `test_evidence19l.Evidence19lTests.test_replay_refuses_off_linux_without_a_stand_in` | refusal test is for hosts that cannot replay |
| `test_evidence19l_committed.CommittedPackTests.test_the_frozen_replay_reproduces_the_committed_report` | the full 19l replay runs on Linux x86_64 when `SIMURGH_REPLAY_19L=1` |
| `test_evidence19p.Evidence19pTests.test_replay_refuses_off_linux_without_a_stand_in` | refusal test is for hosts that cannot replay |
| `test_evidence19p_committed.CommittedPackTests.test_the_frozen_replay_reproduces_the_committed_report` | the full 19p replay runs on Linux x86_64 when `SIMURGH_REPLAY_19P=1` |
| `test_evidence19q_committed.CommittedPackTests.test_every_row_recomputes_from_the_dataset` | set `SIMURGH_SLEIGHT_DATASET` and `SIMURGH_SLEIGHT_KEY` |
| `test_evidence19t.Evidence19tTests.test_run_and_replay_need_a_gate_or_the_replay_host` | this host can replay |
| `test_evidence19t_committed.CommittedPackTests.test_every_attempt_reruns_to_the_same_report` | set `SIMURGH_REPLAY_19T=1` on Linux x86_64 in the hash-locked environment |
| `test_inject19v.SamplerTests.test_a_low_temperature_takes_the_top_token` | needs torch |
| `test_inject19v.SamplerTests.test_a_seed_fixes_the_draw` | needs torch |
| `test_inject19v.SamplerTests.test_the_kept_set_stops_at_the_token_that_reaches_top_p` | needs torch |
| `test_inject19v.SamplerTests.test_the_processor_leaves_one_token` | needs torch |
| `test_inject19v.SamplerTests.test_ties_keep_the_lower_token_id_first` | needs torch |
| `test_lanes19d.OffHostTests.test_run_all_refuses_without_namespace` | this host can namespace; the refusal test is for others |
| `test_replay19.HostTests.test_refuses_off_linux` | refusal test is for hosts that cannot replay |
| `test_replay19l.Replay19lTests.test_refuses_off_linux` | refusal test is for hosts that cannot replay |
| `test_replay19p.Replay19pTests.test_refuses_off_linux` | refusal test is for hosts that cannot replay |

## Conclusion

The full suite passes on this host when run with the full hash-locked environment: **723 tests, 0 failures, 0 errors, 18 skips**. The verify-set recipe named in `HANDOFF.md` for the test suite is incomplete for this purpose: it lacks `openai-agents`, so the two frozen-replay tests error before running.
