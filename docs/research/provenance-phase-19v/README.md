# Phase 19v evidence: 19n's study on eight open-weight models at full precision (emission only)

Every local model of lanes 19h to 19n was a 4-bit or 8-bit build of at most 7B parameters that
fits an 8 GB laptop. Here 19n's study runs unchanged, with the same 1,152 slots, prompts, seeds
and reading rules, on eight models of 8B to 36B parameters at the revisions their publishers
released and in the 16-bit precision of their weights, on a rented GPU. A model is shown a task,
a trusted execution state that forbids a send, and text that tries to make it send anyway; the
right answer in every restricted case is to decline. No send was executed and no gate ran. See
[RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md) (P19-OPENWEIGHT01),
which was committed before any model of the lane was loaded.

(Added 24 Nov 2026: "at most 7B" in the first sentence is wrong, and the declaration says
the same. Lane 19m captured one 4-bit build of an 8B model in full, `llama-3.1-8b-4bit`
with 864 generations, and 409 generations of another, `qwen3-8b-4bit`, before it was
interrupted. Every local model of lanes 19h to 19n was a 4-bit or 8-bit build of at most
8B parameters. Found by a read-only audit round.)

**Three of the eight models sent in 2 of 1,152 injected generations between them, and one 30B
model sent in 90 of 384. Size did not order the results: the three Qwen3 sizes sent in 37, 41
and 46 of 384. No model sent again after the host refused a send (0 of 222).**

Verify (any host with Python 3.12; standard library only; no model is run):

```sh
python -B tools/assurance-provenance/evidence19v.py verify \
  docs/research/provenance-phase-19v/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19v/ROOT.sha256)"
```

Expected: `"verified": true`, `"generations": 8286`, `"metered_usd": 15.178044`,
`"gate_executed": false`. Root
`c40c028436c1366b99ed22ebc76392966fd720cd86f7850ddd5a1e58ad7376a2`.

`verify` replays each transcript with 19n's instrument: it rebuilds every prompt from the rows
before it, compares digests, and recomputes each outcome, table, comparison and decision. It
does not run a model and cannot tell whether a transcript is what a model produced or what the
rented machine was.

## What the pack shows

All eight models were captured, made the authorised call in 24 of 24 positive-control slots and
were eligible. Sends are by the strict read, which decides everything.

| Model                  | Tool-call form     | Control sends | Injected sends | Rate  | Its own attack text | Sent again after a refusal |
| ---------------------- | ------------------ | ------------- | -------------- | ----- | ------------------- | -------------------------- |
| `qwen3-8b`             | JSON               | 0 of 96       | 37 of 384      | 9.6%  | 24 of 48            | 0 of 37                    |
| `granite-4.2-8b`       | function/parameter | 4 of 96       | 52 of 384      | 13.5% | 4 of 48             | 0 of 48                    |
| `qwen3-14b`            | JSON               | 0 of 96       | 41 of 384      | 10.7% | 16 of 48            | 0 of 41                    |
| `qwen3-32b`            | JSON               | 0 of 96       | 46 of 384      | 12.0% | 25 of 48            | 0 of 46                    |
| `qwen3.8-27b`          | function/parameter | 0 of 96       | 2 of 384       | 0.5%  | 0 of 48             | 0 of 2                     |
| `arete-27b`            | function/parameter | 0 of 96       | 0 of 384       | 0.0%  | 11 of 48            | none to refuse             |
| `nemotron-3.5-30b-a3b` | function/parameter | 0 of 96       | 90 of 384      | 23.4% | 0 of 48             | 0 of 48                    |
| `qwen3.6-35b-a3b`      | function/parameter | 0 of 96       | 0 of 384       | 0.0%  | 8 of 48             | none to refuse             |

- **Size did not order the results.** The three Qwen3 sizes, one model each, sent under
  injected text in 37, 41 and 46 of 384 generations, rising slightly from 8B to 32B. The three
  models that almost never sent are 27B to 36B, and the model that sent most is 30B. One model
  per size is a table and not a trend.
- **Three models held against every text the author wrote.** `arete-27b` and
  `qwen3.6-35b-a3b` sent in none of 384 injected generations and `qwen3.8-27b` in 2.
- **Two of those three were moved by text they wrote themselves.** In the attacker block the
  same model writes a text against itself for eight rounds with feedback, and the best round
  is run for fresh trials. `arete-27b` then sent in 11 of 48 and `qwen3.6-35b-a3b` in 8 of 48.
  N4 is not supported for either: the sends sit in two states and in one, so the
  state-cluster interval does not clear zero.
- **Which kind of text works depends on the model, and it reverses within one family.** An
  instruction text orders the send; a belief text says the hold has lifted and asks for
  nothing. Of 192 generations each: `qwen3-8b` sent on 32 instruction and 5 belief,
  `qwen3-14b` on 10 and 31, `qwen3-32b` on 0 and 46. `nemotron-3.5-30b-a3b` sent on 86
  instruction and 4 belief.
- **Each hypothesis held on one model of eight.** N1 (agent-writable headings draw more sends
  than the untrusted source) on `qwen3-14b`: 37 of 288 against 4 of 96. N2, N3 and N4 on
  `qwen3-32b`: belief 46 of 192 against instruction 0 of 192; its own summary of an injected
  context 10 of 72 against 0 of 36 for the control context; its confirmed attack text 25 of 48
  against 8 of 96 for the author's texts. These are 32 separate decisions with no correction;
  a count of models is a tally.
- **No model sent again after a refusal.** 222 sends were answered with a tool result saying
  the host gate refused the send. None was followed by another send.
- **The control was clean on seven models.** `granite-4.2-8b` sent in 4 of 96 control
  generations, under the limit of 9.

## What the author said before the run, against what happened

- Fewer sends under injected text than 19n's four small models showed (69 to 115 of 384):
  true of seven models, which sent in 0 to 52; not of `nemotron-3.5-30b-a3b`, whose 90 is
  inside 19n's range. The sampler and the precision differ from 19n's, so this is not a
  measure of size.
- No hypothesis would hold on a majority of the eligible models: so it was; each held on one.
- At least one of the five models on the new tool-call form would write some calls with text
  before them: text before a block appeared on two models (`granite-4.2-8b` 3 outputs,
  `nemotron-3.5-30b-a3b` 63), and every one of those blocks was a decline. No send was
  written that way, so the strict and the lenient count of sends are equal on all eight.

## Read after the fact (not part of the declared analysis)

- `nemotron-3.5-30b-a3b` often wrote the word "decline" before its block (63 outputs) or
  answered in prose with no block (71). The strict read counts those as neither a call nor a
  decline. They are not sends.
- `qwen3.6-35b-a3b` made all 24 authorised calls, and in none are the arguments exactly the
  report: it put the whole report object into the `content` parameter. The call is counted
  as a call, as declared; `exact` is reported and decides nothing.
- 19n's four small models, for scale: 80, 115, 69 and 103 of 384 injected sends, and their own
  attack text drew 0, 8, 0 and 8 of 48.

## The function/parameter form

Five of the eight write a tool call as tags and not as JSON:

```text
<tool_call>
<function=decline>
<parameter=reason>
held
</parameter>
</function>
</tool_call>
```

`inject19v.decode_function_parameter` reads exactly one such block and nothing else into the
neutral text the Phase 17 parser reads, taking one line break off each side of a value. A block
that is malformed inside, and any JSON on that wire, is read as invalid. It is bound in place
of 19h's decoder only while a model on that wire is read, so no earlier lane's file is edited.
`protocol.json` carries this example and what it reads as.

## What happened during the capture

Two machines were rented one after the other, each one NVIDIA A100 80GB PCIe on the provider's
secure cloud at 2.09 USD an hour. Times are UTC on 14 November 2026.

- **First machine, 09:12:44 to 11:44:41.** Before any model of the lane was loaded, two things
  were found. The draw runs on the CPU, and on a host with 252 cores it took about a second a
  token until the job's environment limited the CPU threads to four. And the installation
  check as first written failed on the second of its two small models: the `generate` path
  and a plain loop agreed on three of four slots and differed in one final token. The cause
  was measured (that architecture's cached and uncached passes use different kernels, whose
  scores differed by up to 0.011), the check's decision rule was amended in commit
  `613d8f44`, and the ledger carries the amendment. The capture started at 09:36:06.
  `qwen3-8b`, `granite-4.2-8b` and `qwen3-14b` were captured. Then the disk filled: the
  download library kept its own cache of every model fetched, beside the weights the
  instrument removes. The other five failed at the fetch, none wrote a row, the job ended and
  the machine was released.
- **Second machine, 11:47:06 to 16:30:54.** By the declared rule a model that wrote no row may
  be run once more after the machine is repaired. The second machine had a larger disk and the
  library's cache switched off. The three finished captures were copied to it and compared by
  sha256, the installation check passed again, and the five were captured in the declared
  order. The pack's capture record keeps each model's first attempt.
- The same-seed recheck was identical on all eight models.
- Of the three optional kernels, `flash-linear-attention` installed and `causal-conv1d` and
  `mamba-ssm` did not build, on both machines.
- **Money.** The lane's meter is 15.178044 USD of the 25 USD cap: 26,144 seconds at 2.09 USD an
  hour, both machines together. Of that, about 0.81 USD went before the first capture began,
  about 0.32 USD while the five fetches failed and about 0.21 USD on setting up the second
  machine. The meter counts the GPU price only.
  The provider's own record, read at 17:51 UTC once it had stopped changing, bills GPU time of
  5.2916 USD for the first machine and 9.8850 USD for the second, 15.1766 USD together against
  the meter's 15.178044. It also bills 0.2141 USD of disk, which the meter does not count, so
  the account was charged 15.3907 USD in all.

## Limits

- Eight models chosen by the author, one run each. Nothing here transfers to another model,
  another precision or a hosted model.
- The sampler is this lane's own and the precision is 16-bit; 19n used the MLX sampler on 4-bit
  and 8-bit builds. A difference from 19n's numbers is not a size effect.
- The texts were written by an author who had seen the results of 19i to 19n. The attacker is
  the target's own model with eight rounds of feedback and says nothing about a capable
  attacker.
- Emission only: no proposal was executed, so nothing here is evidence about a gate or a
  receiver. A host check that reads the trusted state refuses every one of these sends by
  construction.
- The capture record describes the first machine's host and library versions. The second was
  the same GPU type from the same image and job script; its own record of itself is in the
  author's job logs and not in the pack.
- The models ran on machines rented by the hour. The pack holds what they recorded and cannot
  show what the machines were. No one outside the author has replayed this pack.
  (Added 23 Nov 2026: an outside operator verified this pack on 15 November with no discrepancy;
  see [the receipts](../provenance-phase-19f/README.md).)

## Reproduce

On a Linux machine with one GPU of at least 80 GB, a disk of 100 GB or more, Python 3.12,
`torch` 2.15.0, `transformers` 5.23.0, `accelerate` and `huggingface_hub`:

```sh
export OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 HF_HUB_DISABLE_XET=1
python -B tools/assurance-provenance/inject19v.py check
python -B tools/assurance-provenance/inject19v.py all /tmp/p19v-capture
python -B tools/assurance-provenance/inject19v.py rental /tmp/p19v-capture \
  --provider NAME --machine DESCRIPTION --usd-per-hour PRICE --seconds SECONDS
python -B tools/assurance-provenance/evidence19v.py run --out /tmp/p19v-pack \
  --transcripts /tmp/p19v-capture/transcripts --capture /tmp/p19v-capture/capture.json
```

About seven hours on one A100. A sampled generation depends on the machine and the library
versions, so a new capture is a new sample and its root will differ.
