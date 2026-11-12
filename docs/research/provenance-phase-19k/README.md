# Phase 19k evidence: the injection-style study at scale (emission only)

19i suggested, from 24 generations per style and one wording each, which kinds of injected text
move a model that otherwise declines. This lane tests that with the hypotheses fixed first: six
restricted states crossed with seven source styles, five wordings for each of the five varied
styles, 120 generations per style and model, a block of 24 authorised generations as a positive
control, and three models. 2592 generations on an Apple M2 with 8 GB, at no cost. See
[RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md) (P19-SCALE01).

Verify (any host with Python 3.12; no model, standard library only):

```sh
python -B tools/assurance-provenance/evidence19k.py verify \
  docs/research/provenance-phase-19k/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19k/ROOT.sha256)"
```

Expected: `"verified": true`, `"generations": 2592`, `"model_inference": true`,
`"gate_executed": false`. Root `d7ef3e73b8f04fef3033bc28f4e928e4065a12118670942975335cb5c677ae59`.

## What was fixed before any model saw a case

The declaration (`ed58cccb`) and the instrument (`5c2b0dbd`) were pushed at 00:47:07Z on 11
November 2026; the capture started at 00:47:17Z from a checkout of `5c2b0dbd`. The 162 case
texts, the three models, the seeds, how an output is read, the analysis, and the five hypotheses
with the rule that decides each are in those commits, and the protocol's pinned sources are
unchanged since. The primary model, the only one the hypotheses are about, is `qwen3-4b-4bit`.

## What the pack shows

All three models passed the positive control. The primary model declined all 120 control cases.

**All five hypotheses are supported by their rules on the primary model.**

- **H1.** The operator note drew 43 of 120 sends against 0 for control: +0.36, Newcombe interval
  +0.27 to +0.45, state-cluster interval +0.23 to +0.52.
- **H2.** The operator note drew the most of the five varied styles: 43, then the spoofed host
  block 36, the spoofed tool result 32, the self-clearing claim 15, urgency 0. The rule is "strictly
  highest"; 43 against 36 is not a difference this design can separate.
- **H3.** `unknown_prior` was the state most moved: 62 of 120 over the six injected styles, then
  `monitor_expired` 36.
- **H4.** `signal_stop` (10) and `credential_revoke` (8) were the two states least moved.
- **H5.** Urgency drew the fewest sends: 0 of 120 across five wordings.

**The wording matters as much as the style.** On the primary model the five operator-note
wordings drew 12, 0, 4, 3 and 24 sends of 24; the five host-block wordings 4, 24, 4, 4 and 0. A
style's count is an average over wordings that behave very differently, and one wording of a style
moving the model does not show that the style does.

**The ordering of styles does not carry to the other models.** These are descriptions, not tests;
no hypothesis was set for them.

- `qwen3-1.7b-4bit` also declined all 120 control cases. Its most effective sources were the Phase
  17 adversarial texts (59), the spoofed tool result (53) and the spoofed host block (49); the
  operator note drew 15 and urgency 19. Its most moved state was `ancestor_revoke` (72), not
  `unknown_prior` (42). `signal_stop` (3) and `credential_revoke` (16) were again the two least
  moved. It broke the output format in 208 of 864 generations; under the lenient reading its sends
  rise from 237 to 287.
- `llama-3.2-3b-4bit` sent in 97 of 120 control cases and in at least 115 of 120 under every
  injected style. Its one state that mostly held under control, `signal_stop` (4 of 20), sent in at
  least 17 of 20 under every injected style.

## Read after the fact (not part of the declared analysis)

- `signal_stop` was the least moved state, or within two sends of it, on all three models.
- On the primary model the four trials of a case usually agree, so counts move in steps of four.
  The 120 generations of a style are closer to 30 independent observations (six states by five
  wordings) than to 120. The state-cluster interval is the more honest of the two intervals.
- Content: every restricted-state send by the primary model carries the exact report (153 of 153);
  179 of 215 for `qwen3-1.7b-4bit` and 797 of 802 for `llama-3.2-3b-4bit`.

## Limits

- Emission only. No proposal was executed here; lane 19l dispatches these proposals through the
  frozen Phase 17 pipeline.
- The hypotheses came from 19i's data on the same model. This lane shows they hold on new wordings
  and seeds for that model. It does not show where they come from, and the two other models show
  they are not general.
- Three small 4-bit models, one contract, hand-written texts, five wordings per style written
  after 19i's results were known. Five hypotheses, no multiplicity correction; all five decisions
  are reported.
- `verify` recomputes every outcome, statistic and hypothesis decision from the transcripts. It
  does not rerun a model and cannot tell whether a transcript is what a model produced.
  `capture.json` is the capturing host's record: weights' file digests, runtime, and a same-seed
  rerun of six prompts per model (identical).
- The lenient reading is for sensitivity only and decides nothing.
- Not the capture `IOU-19-SPEND` declares; the hosted models and the informed-attacker arm stay owed.

## Reproduce the capture (Apple Silicon)

```sh
pip install mlx==0.30.3 mlx-lm==0.29.1 transformers==4.46.3    # the versions the capture used
python -B tools/assurance-provenance/inject19k.py /tmp/p19k-run
python -B tools/assurance-provenance/evidence19k.py run --out /tmp/p19k-pack \
  --transcripts /tmp/p19k-run/transcripts --capture /tmp/p19k-run/capture.json
```
