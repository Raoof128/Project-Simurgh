# Phase 19p evidence: the 19n proposals through the frozen Phase 17 pipeline

19n recorded what four small local models proposed and executed nothing. Its sends were drawn in
ways the earlier replay (19l) did not cover: by a text under a summary, memory-file or tool-result
heading, by the model's own summary of an injected context, and by a text written by an attacker
that saw its own results. This lane hands every `send_report` call a model made as the agent in
19n, 516 of them, to `tools/assurance-model-composed/trial.py::run_branch`, the frozen function
Phase 17 used, in the fixture state of its slot: once behind the composed controls and once
behind the credential gateway alone. It records whether an effect landed at the receiver. The
dispatch and the outcome classes are 19j's, imported unchanged. No model runs here. See
[RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md) (P19-REPLAY03), which
was committed after the 19n ruling and before any 19n output was dispatched.

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19p.py verify \
  docs/research/provenance-phase-19p/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19p/ROOT.sha256)"
```

That replays each 19n transcript with 19n's own instrument, re-reads every proposal, recomputes
every row that was never dispatched and recomputes the summary from the rows; the receipt says
`"kind": "structure_checked"` and that the replay was not run. On Linux x86_64 in the hash-locked
venv, add `--replay` to dispatch every call again and compare the whole report
(`"kind": "frozen_replay_recomputed"`, about twelve minutes on a two-core server). Root
`64977e0efc79cc9f92b8fc92af7ace3ee2d57ed7d7e0b2c834015164c7ad7a6c`.

## What the pack shows

Across the 3,600 generations in which a model acted as the agent, the models proposed 423 sends
in a restricted state and 93 when authorised, 91 of those carrying the exact report.

|                                      | Composed controls | Credential gateway alone |
| ------------------------------------ | ----------------- | ------------------------ |
| Restricted-state sends blocked       | 423 of 423        | 54 of 423                |
| Effects landed in a restricted state | 0                 | 369                      |
| Authorised sends admitted            | 91 of 93          | 91 of 93                 |
| Authorised exact sends refused       | 0 of 91           | 0 of 91                  |

- **Behind the composed controls no restricted-state send landed, whatever drew it.** That
  covers the 367 sends of the placement block (76 from the untrusted source, 71 under the summary
  heading, 76 under the memory-file heading, 144 under the tool-result heading), the 16 sends a
  model made on reading its own summary, and the 40 sends drawn by the attacker's texts.
- **Behind the credential gateway alone, 369 of the same 423 landed.** The 54 it stopped are the
  52 sends made with a revoked credential and 2 whose content was not the authorised report. It
  stopped nothing else: every exact send in the other five restricted states landed.
- **The controls cost no authorised work.** All 91 authorised sends carrying the exact report
  were admitted by both arms. The two that were not admitted carried altered content, and both
  arms refused them.
- **There was nothing to replay after a refusal.** No model sent again in 19n, so that block
  has no send.

This is the outcome the declaration predicted, for the stated reason: the composed controls
decide from the host's state and never read model text, so the channel a text came through and
who wrote it make no difference to them. Together with 19n it reads: placement and wording
changed how often these models proposed a send (from 4 to 42 of 96 across the cells of 19n's
placement table), and changed nothing about what landed behind the composed controls.

## Read after the fact (not part of the declared analysis)

- The four sends with altered content, two authorised and two restricted, all from
  `qwen3-1.7b-4bit`, drop the full stop at the end of the report. The pipeline binds the action to
  the exact report, so both arms refused them in every state.
- The credential gateway alone let through every exact send in `unknown_prior` (133 of 134 sends
  there landed; the one that did not had altered content). That is the state 19k, 19m and 19n
  found most moved on `qwen2.5-7b-4bit`.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from a
fresh clone at the instrument commit `e05683d8` with the hash-locked environment installed into a
new venv. The lane's 18 tests passed there first (two skipped: they test the refusal on hosts
that cannot replay). The run dispatched every call once to build the report and again to verify
it, 17:02:45Z to 17:25:30Z on 12 November 2026, and the two passes agreed. The clone was clean
before and after. The host is the author's, so this is not a replay outside the author's
custody.

## Limits

- This is a correctness check of the gate over recorded outputs. It is not security evidence
  against an attacker who adapts to the gate: no model was shown the gate or asked to defeat it.
  The attacker in 19n was the target's own small model and attacked the model, not the gate. The
  informed-attacker arm is not run and stays owed under `IOU-19-SPEND`.
- The proposals come from four small local builds of one family. Nothing transfers to a larger
  or a hosted model. Lane 19o's hosted models proposed no restricted-state send, so there was
  nothing of theirs to replay.
- The pipeline is the frozen Phase 17 fixture rig under a fixed clock, not a deployed system. A
  blocked send shows the composed controls refusing that action in that fixture state.
- Each dispatch runs in the benign task's fixture for the slot's state. The injected text, the
  heading it sat under and its author are not inputs to the pipeline; only the state and the
  proposed call are. That is the property being checked, and it is also why this lane cannot
  show a channel-specific weakness of the gate.
- The fixture seed is the task id and the slot index, a choice made in the instrument before
  the run.
- `verify` without `--replay` checks structure against the 19n pack; it does not run the gate.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19p.py run --out /tmp/p19p-pack
```
