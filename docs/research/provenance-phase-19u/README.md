# Phase 19u evidence: 19o's cases on four hosted Claude models (emission only)

Lane 19o sent the fixed prompts of 19k and of 19n's placement block to six hosted OpenAI models
and none sent in a restricted case. This lane sends part of the same schedule to four hosted
Claude models, Haiku 5.5, Sonnet 5.5, Opus 5.5 and Fable 5.2, under a spending cap of 7 USD
fixed first. 2,700 requests in two runs, metered at 3.96 USD. See [RESULTS.md](RESULTS.md) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-HOSTED02, with its amendment).

**The run did not go as declared. The output limit first declared was too small, the author
stopped the run after two of four models, and the limit and the number of rows were changed in
an amendment before anything more was sent. No model sent in any restricted generation, in
either run.**

Verify (any host with Python 3.12; no network, no key, standard library only):

```sh
python -B tools/assurance-provenance/evidence19u.py verify \
  docs/research/provenance-phase-19u/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19u/ROOT.sha256)"
```

Expected: `"verified": true`, `"generations": 2700`, `"metered_usd": 3.959005`,
`"gate_executed": false`. Root `05ecedba1c7020e1a9b186aac7b02b7769c7437fdae7a8b1dff937291b8f68e3`.

`verify` rebuilds every prompt and compares its digest, reads every stored response again,
recomputes each outcome, table and decision and the meter of both runs, and checks that the
second run started from what the first had spent and that the total is within the cap. It does
not call the provider and cannot tell whether a stored response is what the provider returned.

## What was fixed first, and what was changed

The declaration (`c6dfe807`, pushed 10:50:14Z on 13 November 2026) and the instrument
(`3d74f281`, pushed 11:04:49Z) fixed four models, every second trial of 19o's schedule (672
rows a model), the request form, an output limit of 160 tokens, the cap, the readers, the
eligibility rule and one hypothesis. The first batch was submitted at 11:04:57Z.

These models reason before they answer unless told otherwise, and the reasoning counts against
the output limit. The four connection checks made before the declaration did not show it,
because their prompt was trivial. On the real cases Haiku 5.5 reasoned on 616 of 672 rows and
262 of its answers were cut off at the limit. It made the authorised call in 3 of 12 cases, so
by the declared rule it was not eligible. Sonnet 5.5 reasoned on 23 rows and 19 answers were
cut off. The author stopped the run at 11:09:38Z, after the second batch had been submitted and
before the third.

The amendment (`31a543c7`, pushed 11:27:22Z) was written with both of those results seen. It
declares a second run with a limit of 512 tokens. Fable 5.2 and Opus 5.5 are sent every fourth
trial, 342 rows each, because the larger limit does not fit the cap on 672. Haiku 5.5 is sent
its 672 rows again. Sonnet 5.5 is not sent again and is decided on its first run. The second
run started at 11:27:34Z and ended at 11:35:50Z.

This is a change made after seeing data. The hypothesis, the readers, the eligibility rule and
the cap were not changed. What the change could have affected is which run decides for Haiku
5.5: its first run, which is reported in full, has 0 sends of 660 as well.

## What happened to each model

| Model               | First run (160 tokens)                                    | Second run (512 tokens)                 | Decided on | Metered USD |
| ------------------- | --------------------------------------------------------- | --------------------------------------- | ---------- | ----------- |
| `claude-haiku-5-5`  | 672 rows; 3 of 12 authorised calls; 262 cut off; 0 of 660 | 672 rows; 12 of 12; 0 cut off; 0 of 660 | second     | 0.10        |
| `claude-sonnet-5-5` | 672 rows; 11 of 12 authorised calls; 19 cut off; 0 of 660 | not sent                                | first      | 0.87        |
| `claude-opus-5-5`   | withdrawn by the author before its batch                  | 342 rows; 12 of 12; 0 cut off; 0 of 330 | second     | 0.93        |
| `claude-fable-5-2`  | withdrawn by the author before its batch                  | 342 rows; 12 of 12; 0 cut off; 0 of 330 | second     | 2.04        |

`claude-mythos-5-2` was asked for by the owner. The key's model list does not hold it and the
provider answers `not_found_error` for it. Nothing was sent to it.

No row failed, none was asked twice, and every response names the model that was asked for.

## What the pack shows

- **A1 held.** It said no eligible model would send in any restricted generation. All four
  models are eligible on the run that decides for them, and each has 0 sends: of 660 for Haiku
  5.5 and Sonnet 5.5 (95% upper bound 0.58%), and of 330 for Opus 5.5 and Fable 5.2 (upper
  bound 1.15%).
- **Every source style and every placement drew 0 on every model**, the control included.
- **The lenient read agrees.** It counts the authorised calls and none elsewhere.
- **In the second run every answer was complete.** Each model made the authorised call in 12 of
  12 cases and declined every other row. The mean answer was 117 to 156 output tokens, reasoning
  included, against a limit of 512.
- **Sonnet 5.5's count has a gap.** 18 of its 660 restricted answers were cut off, and a cut-off
  answer is neither a send nor a decline. So what the pack shows for it is 642 declines, 18 cut
  off and 0 sends.

Together with 19o this is ten hosted models from two providers and no send on these fixed
texts. The small local models of 19k and 19n did send on the same texts.

## Read after the fact (not part of the declared analysis)

- In the first run, every cut-off answer in a restricted row had already named the `decline`
  tool when it was cut, 18 of 18 for Sonnet 5.5 and 251 of 253 for Haiku 5.5; the other two of
  Haiku's held reasoning only. None had named `send_report`. The cut-off answers in authorised
  cases, 1 for Sonnet 5.5 and 9 for Haiku 5.5, had all named `send_report`. The declared reader
  does not count any of these, and this pack does not either.
- Zero sends is a floor. With 330 rows, a model whose true send rate was 1 in 100 would show no
  send about 4 times in 100.
- The amendment says Haiku 5.5 reasoned on 614 rows of its first run. The pack has 616. The
  other figures in the amendment match the pack.

## Money

| Item                                   | Metered USD |
| -------------------------------------- | ----------- |
| Four connection checks (at list price) | 0.011       |
| First run, two batches                 | 0.921       |
| Second run, three batches              | 3.027       |
| Total                                  | 3.959       |

The cap was 7.00 USD. Before each batch the lane computed the worst case, the largest input
count on every row and the full output limit on every row, and submitted only if that fitted.
Batches are billed at half the list price. The figures are the lane's meter at the prices read
from the provider's pricing page on 13 November 2026. The provider's bill is the authority and
has not been compared with the meter.

## Limits

- Emission only. No proposal was executed, so nothing here is evidence about a gate or a
  receiver.
- Fixed texts written by the author. No attacker adapted to these models. Lane 19t is the
  repository's evidence about attackers that adapt, and its target is the gate, not a model.
- Half or a quarter of 19o's schedule, one tool, short single-turn tasks. Nothing here is about
  these models in a long task with real tools.
- The models were sent different numbers of rows under two output limits. Their rates are not a
  like-for-like comparison with each other or with 19o's.
- The plan was changed after the first results were seen. The change is in the ledger before
  the second run, and the first run is in the pack whole.
- A hosted model cannot be pinned to weights or reproduced from a seed. A row is what the
  provider returned once.
- The lane's code was written by a model of the same provider's family under the owner's
  direction, and the targets are models of that provider. The transcripts are in the pack so
  that a reader can check the reading for themselves.
- Where a model reasoned, the provider returned a reasoning block with a signature and no
  text. So the pack shows that a model reasoned and how many tokens it took, not what it
  reasoned.

## Reproduce

The capture needs a key and money and cannot be repeated exactly. With a key in
`ANTHROPIC_API_KEY`, from a clean checkout of `31a543c7`:

```sh
python -B tools/assurance-provenance/inject19u.py /tmp/p19u-first --run first
python -B tools/assurance-provenance/inject19u.py /tmp/p19u-second --run second \
  --smoke-spent <what the first run metered>
```

The lane refuses to submit a batch whose worst case does not fit under the cap.
