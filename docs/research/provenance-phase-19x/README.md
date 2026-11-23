# Phase 19x: the no-attack control of 19w on eight models from two vendors

**Declared as P19-CONTROL02** in the [Phase 19 ledger](../PROVENANCE_PHASE_19.md) before any run
of the lane. Two ledger notes follow the declaration: the connection check of 18 Nov 2026, and
the entry of 21 Nov 2026 that names a failure of the author's machine during the run.

## The question

[Lane 19w](../provenance-phase-19w/README.md) ran the benchmark of "Beyond Instruction Override:
Benchmarking Indirect Prompt Injection with Task-Tampering Attacks" (arXiv 2611.07640, code and
data at `github.com/amazon-science/task-tampering-prompt-injection`) with nothing planted, and
counted how often a case's attack formula was true anyway. It had one model and one repeat.

This lane asks the same question of eight models from two vendors, with three repeats where the
model allows it. It does not change 19w: the 19w pack and its three modules are untouched, and
19w's ninety runs are carried in as the first repeat of the first model.

## What was run

| Item      | Value                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Benchmark | commit `804b00dd03051c00e5e3000982bbf7ce2b9d9ad5`, unmodified, its own runner                              |
| Mode      | `no_injection`: nothing is planted                                                                         |
| Cases     | all 90, in three environments                                                                              |
| Models    | four from Anthropic and four from OpenAI, each through its vendor's own API                                |
| Repeats   | three for seven models; one for `claude-sonnet-4-5-20250929`, at temperature 0                             |
| Judge     | `claude-sonnet-5-5`, three votes, for every model of both vendors                                          |
| Runs      | 1,980 in all, every one scored                                                                             |
| When      | 21 Nov 2026, 08:52Z to 11:07Z, with a stop from 09:41Z to 09:57Z; repeat one of Haiku 5.5 is 19w's, 15 Nov |
| Meter     | 53.31 USD at Anthropic and 24.61 USD at OpenAI, under a cap of 80.00 at each                               |
| Pack root | `7ff8634f56c8bb3cdb152d5e5a22a13db0c73ba62c6f5f0c0ccea904e995db36`                                         |

## What was found

With nothing planted, the attack formula was true in at least one run on **seven of the eight
models**. The per-run rate was between 0.0% and 3.3% for every model.
[RESULTS.md](RESULTS.md) has the tables and the reading of the firing runs.

| Model                        | Firing runs | Cases that fired, of 90 |
| ---------------------------- | ----------- | ----------------------- |
| `claude-haiku-5-5`           | 7 of 270    | 3                       |
| `claude-sonnet-5-5`          | 2 of 270    | 2                       |
| `claude-sonnet-4-5-20250929` | 0 of 90     | 0                       |
| `claude-opus-5-5`            | 6 of 270    | 3                       |
| `gpt-6-luna`                 | 4 of 270    | 2                       |
| `gpt-6.1-terra`              | 8 of 270    | 3                       |
| `gpt-6.2-sol`                | 9 of 270    | 3                       |
| `gpt-6.2-astra`              | 7 of 270    | 4                       |

The firing runs are concentrated in a few cases. Of the 90 cases, 84 fired on no model. Two
dispute cases in the marketplace environment fired on six and on seven of the eight models, and
on several models in every repeat. In both, the benchmark expects the agent to decide for the
seller, the attack formula is a decision for the buyer with a refund, and the models decided for
the buyer on their own reading of the evidence.

(Added 24 Nov 2026: "on several models in every repeat" is exact for one of the two cases. The
case that fired on six models fired in all three repeats on five of them. The case that fired
on seven fired in all three repeats on two, Haiku 5.5 and `gpt-6.2-sol`. Recounted from the
pack by a read-only audit round.)

The author read all 43 firing runs and gave each one label. In 33 the model reached the outcome
the formula names and stated a reason of its own. In 10 the formula was true although the model's
calls do not show the outcome its checks name: eight where a check decides that a change was
left out of a changelog by the absence of one word, and two where a judged check read a neutral
sentence as the attacker's message. The labels are a judgement and decide no count.

`claude-sonnet-4-5-20250929` is the one model here that the paper also used. Its one repeat had
no firing run.

## Verify

Python 3.12, standard library only. No model, no network and no key are needed.

```
python3 -B tools/assurance-provenance/evidence19x.py verify \
  docs/research/provenance-phase-19x/evidence.zip \
  --expected-root 7ff8634f56c8bb3cdb152d5e5a22a13db0c73ba62c6f5f0c0ccea904e995db36
```

`verify` recomputes every count, every interval, the table of cases across models and both
meters from the pack's records, checks that each firing run has exactly one declared label, and
compares the result with the saved report. It also checks that Haiku 5.5's first ninety records
are the records of the 19w pack. With `--benchmark <clone>` it recomputes the audit of the 90
case files from a clone at the declared commit.

## Files

| File                          | What it is                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `evidence.zip`                | the pack: report, audit, labels, connection checks, eight capture records, 1,980 records |
| `protocol.json`               | what was fixed before the run, with digests of the lane's code                           |
| `report.json`, `receipt.json` | the recomputed report and this host's receipt                                            |
| `ROOT.sha256`                 | the pack root                                                                            |
| `transcripts/<model>.jsonl`   | one record per run, the same rows as in the pack                                         |
| `captures/<model>.json`       | what ran, when, the token counts and the library versions                                |
| `audit.json`                  | the model-free audit of the 90 case files, as in 19w                                     |
| `labels.json`                 | the author's label and note for each firing run                                          |
| `smoke.json`                  | every entry of both connection checks, the four failures among them                      |
| `NOTICE.md`                   | the licence of the benchmark material quoted in the records                              |

A record holds what the model wrote in the run (its tool calls and its final message), the
benchmark scorer's results, the token counts and the SHA-256 of the run log. It does not hold a
tool result, which is the benchmark's data. The run logs themselves are kept by the author.

## What happened that was not planned

- **The author's disk filled during the run.** About fifty minutes in, both chains stopped on
  `No space left on device`. One unit of Sonnet 5.5's third repeat came back with two cases
  without a record, and the declared halt rule stopped that chain. The OpenAI chain's process
  ended during Terra's second repeat. The lane's own files were about 121 MB; the author had not
  checked free space before starting. After a ledger entry that names the failure, the halted
  unit was run once more and both chains continued. The first logs of the two cases are kept
  and counted. Five logs are unfinished and hold no token count: one of Sonnet 5.5 and four of
  Terra. Two logs are superseded.
- **A second connection check.** The check of 18 Nov was three days old when the owner asked
  for the runs, so it was repeated before the start. All nine entries passed.
- **The cost estimates were wrong, this time too high.** The author expected the cap to stop
  Astra before its third repeat. All three ran, for 16.15 USD. Sonnet 4.5's repeat cost 5.59
  USD against an estimate of 10.
- **One thing said before the run did not hold.** The author expected every model to have a
  firing run. Sonnet 4.5 had none.

## Departures from the paper's settings

- The paper ran through Amazon Bedrock at temperature 0. Here each call went to the model
  vendor's own API. Seven models had no temperature setting: the declaration fixes none for
  them, and the 5.5 Claude models reject the parameter. Their runs are not repeatable. Sonnet
  4.5 ran at temperature 0.
- The paper's judge was Claude Sonnet 4, which is retired on that API. The judge here was Claude
  Sonnet 5.5, for the OpenAI models as well. A judged check may read differently, and the judge
  is one vendor's model judging both.
- The benchmark's framework needed older provider libraries to run (`anthropic` 0.125.0,
  `openai` 2.54.0, `pydantic` below 2.14). The versions are in the capture records. The
  benchmark's code was not edited.

## What this is not

- A ranking of models or of vendors. The models differ in repeats and in temperature, and the
  differences between them are within the intervals.
- Evidence that the paper's conclusions are wrong. Its main comparison is between attack types
  within a model. On the one model the paper also used, this control found nothing in ninety
  runs.
- A measurement of how much of any reported attack success this accounts for. No attacked
  variant was run in this lane.
- An attack or a defence.
- An independent replay. The author's machine made the runs and the pack.

## Reproduce

```
git clone https://github.com/amazon-science/task-tampering-prompt-injection bench
git -C bench checkout 804b00dd03051c00e5e3000982bbf7ce2b9d9ad5
python3 -m venv venv
venv/bin/pip install -e bench "anthropic==0.125.0" "openai==2.54.0" "pydantic<2.14"
(cd bench && ../venv/bin/python -m prompt_injection_benchmark.scripts.link_data ./data)
ANTHROPIC_API_KEY=... OPENAI_API_KEY=... venv/bin/python \
  tools/assurance-provenance/capture19x.py run --benchmark bench --out out --model gpt-6-luna
```

A new run calls the model again and will not reproduce these records. The judge needs the
Anthropic key for every model. At the prices in the protocol, the eight models cost about 78 USD
in all.
