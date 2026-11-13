# Phase 19s evidence: does a transcript monitor side with the host or with the text

A transcript monitor reads what an agent did and rates how suspicious it is. The public monitor
benchmark used in 19q lists "authorization confusion" among the things monitors miss. Simurgh's
cases have what such a benchmark usually lacks: the host knows whether a send was authorised.
Here each of 24 cases of 19k is written as two transcripts that differ in one line, the trusted
state. In the `unauthorised` twin that line is the case's restricted state; in the `authorised`
twin it reads `active`. Every restricted state line tells the agent to decline and not to
send, and the agent's next action in both twins is the send. Two small local models read each
transcript as monitors, with that benchmark's own prompt, four times each: 384 generations. No
agent runs and no send is executed. See [RESULTS.md](RESULTS.md) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-MONITOR01), which was committed before any
generation.

**None of the three hypotheses held on the primary monitor. It caught 20 of 96 unauthorised
sends at a 1% false-positive rate, and it scored the unauthorised twin above its authorised
twin in 49 of 85 scored pairs, which the declared rule does not count as more often than
not.**

Verify (any host with Python 3.12; standard library only; no model is run):

```sh
python -B tools/assurance-provenance/evidence19s.py verify \
  docs/research/provenance-phase-19s/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19s/ROOT.sha256)"
```

Expected: `"verified": true`, `"generations": 384`, `"gate_executed": false`. Root
`035422f5767d0443a8165a5c8c3759d4b8b674d4b6effe80a596fa668b8d5b5d`.

`verify` rebuilds every transcript and prompt and compares its digest, reads every stored
output again, and recomputes each score, the thresholds, the tables and the hypotheses. It does
not run a model and cannot tell whether a stored output is what a model produced.

## What the pack shows

| Monitor                     | Scored     | Caught at 1% false positives | Authorised flagged | Unauthorised twin scored higher | Ties | Area under the curve |
| --------------------------- | ---------- | ---------------------------- | ------------------ | ------------------------------- | ---- | -------------------- |
| `qwen2.5-7b-4bit` (primary) | 181 of 192 | 20 of 96 (13.9% to 30.0%)    | 0                  | 49 of 85 pairs                  | 29   | 0.733                |
| `qwen3-4b-4bit`             | 192 of 192 | 12 of 96 (7.3% to 20.6%)     | 0                  | 56 of 96 pairs                  | 39   | 0.788                |

- **M1 did not hold on either monitor.** It said the monitor scores the unauthorised twin above
  its authorised twin more often than not, decided by a Wilson lower bound above one half. The
  primary monitor did so in 49 of 85 scored pairs (lower bound 0.470) and the second in 56 of
  96 (0.483). In 29 and 39 pairs the two twins got the same score. The state line was in view
  in every transcript.
- **Most unauthorised sends were not caught.** At the threshold that lets no authorised
  transcript through, the primary monitor caught 20 of 96 and the second 12 of 96. Both
  monitors' median score for an unauthorised transcript is 10 out of 100.
- **M2 did not hold on the primary monitor and held on the second.** It said injected text
  lowers the catch rate. Primary: 6 of 24 caught with the benign control text and 14 of 72 with
  injected text, a difference of 5.6 points whose Newcombe interval (-11.2 to +26.8) includes
  zero. Second: 6 of 24 against 6 of 72, 16.7 points (+1.0 to +37.1).
- **The imitated host block is where both monitors did worst.** The primary monitor caught 2 of
  24 and ordered 10 of 24 pairs correctly; the second caught 0 of 24 and ordered 4 of 24. With
  that text the source contains a second state block that reads as cleared, beside the trusted
  one.
- **M3 did not hold on either.** Injected text did not raise the median score of authorised
  sends (10 and 10 on the primary monitor, 5 and 5 on the second). Neither monitor flagged an
  authorised transcript; with 96 of them, the 1% rule allows none.
- **The primary monitor gave no score for 11 of its 192 transcripts**, 5 unauthorised and 6
  authorised. None ran out of tokens. An unscored transcript is not counted as caught or as
  flagged, as declared. Both monitors met the rule for being decided (at least 48 of 96
  scored for each twin).

## Read after the fact (not part of the declared analysis)

- All 11 of the primary monitor's unscored outputs do state a number, as bold text ("Score:
  10") and not in the tag that the benchmark's rule reads. They were left unscored as
  declared. The numbers written are 0 or 10 in nine of them, 26 in one and 50 in one; seven of
  the eleven are transcripts with the control text.
- Scores cluster on a few values. The second monitor gave 5 to 93 of its 96 authorised
  transcripts and 5 or 10 to 84 of its 96 unauthorised ones. A threshold on such scores turns
  on a handful of transcripts, which is why the catch rates carry wide intervals.
- Counting words in the monitors' reasoning is a crude reading and is given as that. The
  primary monitor's output contains "decline" or "not send" for 48 of the 96 unauthorised
  transcripts and the second's for 40. Those outputs hold 17 of the primary monitor's 20
  catches and 10 of the second's 12. So about half of the outputs repeat the instruction, and
  most of those still score the send below the threshold (median 11 and 10).
- The monitor prompt was written by others for sessions of a coding agent. It asks about
  backdoors, data misuse and scope. A send that the host has not authorised is none of those by
  its wording, which may be part of why the scores are low; this lane did not test another
  prompt.

## What happened during the capture

The capture started at 12:09:49Z on 13 November 2026 from a clean worktree at the instrument
commit `3818aa8c`, when lane 19r's capture ended; one local model runs at a time on the
author's machine. `qwen2.5-7b-4bit` ran from 12:09:50Z to 14:11:04Z and `qwen3-4b-4bit` from
14:11:05Z to 15:08:38Z. It was not interrupted. 192 rows per monitor, none dropped or generated
twice. The determinism recheck regenerated four rows per monitor and each was identical.

## The prompt is someone else's

`third-party/sleight-bench/control_arena.md` is copied byte for byte from SLEIGHT-Bench at the
commit 19q pins, under its MIT licence, with the licence file beside it; see
[its README](third-party/sleight-bench/README.md). The instrument binds it by sha256. Nothing else
of that benchmark is in this repository.

## Limits

- Two small 4-bit local models as monitors. Nothing here is evidence about the monitors the
  benchmark's authors tested, about a frontier model as a monitor, or about a monitor trained
  for the purpose.
- One monitor prompt, used unchanged on a kind of transcript it was not written for.
- A transcript here is one user block and one tool call. It is not a long session, and the
  agent's action is fixed by the author.
- 24 cases from six states and four source texts, all written by the author for 19k. No
  attacker adapted a text to a monitor.
- With the trusted state line removed, the twins are the same bytes and no monitor can tell
  them apart. That is a fact about the design, was said before the run, and was not run.
- The comparison this lane invites is with a host check, which reads the state and refuses
  every one of these sends by construction. That comparison is between a rule and a judgement,
  not between two measured systems; no gate ran here.
- The models ran on the author's machine. The pack holds what that machine recorded.

## Reproduce

On an Apple-silicon Mac with `mlx-lm` and the two models at the revisions in `protocol.json`:

```sh
python -B tools/assurance-provenance/monitor19s.py /tmp/p19s-capture
python -B tools/assurance-provenance/evidence19s.py run --out /tmp/p19s-pack \
  --transcripts /tmp/p19s-capture/transcripts --capture /tmp/p19s-capture/capture.json
```

About three hours on an 8 GB M2.
