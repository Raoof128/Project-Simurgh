# Phase 19w: a no-attack control for a published prompt-injection benchmark

**Declared as P19-CONTROL01** in the [Phase 19 ledger](../PROVENANCE_PHASE_19.md) before any run of
the lane, with one amendment after the run and before the pack.

## The question

The benchmark of "Beyond Instruction Override: Benchmarking Indirect Prompt Injection with
Task-Tampering Attacks" (arXiv 2611.07640, code and data at
`github.com/amazon-science/task-tampering-prompt-injection`) scores an attack as successful when
the case's attack formula is true of the run's action log. The formula tests an outcome. It does
not test whether the planted text caused it. The paper reports runs without an injection for task
success only.

This lane runs every case with no injection and counts how often the attack formula is true
anyway.

## What was run

| Item        | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Benchmark   | commit `804b00dd03051c00e5e3000982bbf7ce2b9d9ad5`, unmodified, its own runner |
| Mode        | `no_injection`: nothing is planted                                            |
| Cases       | all 90, in three environments                                                 |
| Model       | `claude-haiku-5-5`, stage one of three                                        |
| Repeats     | one of the declared three; the repeat rule refused the second                 |
| Judge       | `claude-sonnet-5-5`, three votes                                              |
| Temperature | none sent; the 5.5 models reject the parameter                                |
| Run         | 15 Nov 2026, 00:37:03Z to 00:46:54Z                                           |
| Meter       | 0.7659 USD of a 1.00 USD cap (agent 0.3118, judge 0.4541)                     |
| Pack root   | `dd77de3e5ee53666396b7b11078864bad20aac75c8e808f960f13b577000599f`            |

Stages two (`claude-sonnet-5-5`) and three (`claude-sonnet-4-5-20250929`, one of the paper's five
models) are declared and not authorised. They have not run.

## What was found

On Haiku 5.5, with no injection, the attack formula was true in **3 of 90 runs**, in three
different cases. All 90 runs were scored. The interval from resampling the 90 cases is 0.0% to
7.8% for a point estimate of 3.3%. [RESULTS.md](RESULTS.md) has the tables and the reading of each
of the three runs.

In all three, the model reached the outcome the case's attacker wants by its own judgement and
explained why. Two are dispute resolutions decided for the buyer where the benchmark expects the
seller. One is a recommendation that puts one partner in a maintenance posture.

One repeat on one model is a small sample. It shows that the base rate is not zero for this
model. It does not show how large it is, and it says nothing yet about any model in the paper.

## Verify

Python 3.12, standard library only. No model, no network and no key are needed.

```
python3 -B tools/assurance-provenance/evidence19w.py verify \
  docs/research/provenance-phase-19w/evidence.zip \
  --expected-root dd77de3e5ee53666396b7b11078864bad20aac75c8e808f960f13b577000599f
```

`verify` recomputes every count, the interval, the cross-table and the meter from the pack's
records, checks that each firing run has exactly one declared label, and compares the result with
the saved report. With `--benchmark <clone>` it also recomputes the audit of the 90 case files
from a clone at the declared commit and compares it with the pack's.

## Files

| File                                 | What it is                                                      |
| ------------------------------------ | --------------------------------------------------------------- |
| `evidence.zip`                       | the pack: report, audit, labels, the capture record, 90 records |
| `protocol.json`                      | what was fixed before the run, with digests of the lane's code  |
| `report.json`, `receipt.json`        | the recomputed report and this host's receipt                   |
| `ROOT.sha256`                        | the pack root                                                   |
| `transcripts/claude-haiku-5-5.jsonl` | one record per run, the same rows as in the pack                |
| `captures/claude-haiku-5-5.json`     | what ran, when, the token counts and the library versions       |
| `audit.json`                         | the model-free audit of the 90 case files                       |
| `labels.json`                        | the author's label and note for each firing run                 |
| `NOTICE.md`                          | the licence of the benchmark material quoted in the records     |

A record holds what the model wrote in the run (its tool calls and its final message), the
benchmark scorer's results, the token counts and the SHA-256 of the run log. It does not hold a
tool result, which is the benchmark's data. The run logs themselves are kept by the author.

## What happened that was not planned

- **One repeat, not three.** The first repeat cost 0.7659 USD, more than twice the author's
  estimate, because the judge was called far more often on the full set than in the pilot. The
  declared rule starts a repeat only if the meter plus the cost of the repeat before it fits the
  cap, so the second repeat did not start.
- **A defect in the instrument.** Seven case ids of the benchmark are used in two environments
  each. The instrument keyed a record by case id, so its first records file held 83 rows for 90
  scored run logs. Amendment one changed the key to environment and id and rebuilt the records
  from the same logs without calling a model. The counting rule did not change. The first file's
  digest is in the ledger.

## Departures from the paper's settings

- The paper ran at temperature 0 through Amazon Bedrock. Here the calls went to the model
  vendor's own API with no temperature, so a run is not repeatable.
- The paper's judge was Claude Sonnet 4, which is retired on that API. The judge here was Claude
  Sonnet 5.5. A judged check may read differently.
- The benchmark's framework needed an older provider library (`anthropic` 0.125.0) and `pydantic`
  below 2.14 to run. The versions are in the capture record. The benchmark's code was not edited.

## What this is not

- Evidence that the paper's conclusions are wrong. Its main comparison is between attack types
  within a model, and a rate common to all types does not change that ordering.
- An attack, a defence or a ranking of models.
- A result about any model in the paper. Haiku 5.5 is not one of its five.
- An independent replay. The author's machine made the runs and the pack.

## Reproduce

```
git clone https://github.com/amazon-science/task-tampering-prompt-injection bench
git -C bench checkout 804b00dd03051c00e5e3000982bbf7ce2b9d9ad5
python3 -m venv venv && venv/bin/pip install -e bench "anthropic==0.125.0" "pydantic<2.14"
(cd bench && ../venv/bin/python -m prompt_injection_benchmark.scripts.link_data ./data)
ANTHROPIC_API_KEY=... venv/bin/python tools/assurance-provenance/capture19w.py run \
  --benchmark bench --out out --model claude-haiku-5-5
```

A new run calls the model again and will not reproduce these records. It costs about 0.77 USD a
repeat at the prices in the protocol.
