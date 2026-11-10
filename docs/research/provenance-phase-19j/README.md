# Phase 19j evidence: recorded proposals through the frozen Phase 17 pipeline

19h and 19i recorded what small local models proposed and executed nothing. This lane hands every
recorded `send_report` call to `tools/assurance-model-composed/trial.py::run_branch`, the frozen
function Phase 17 used, in the task's own fixture state: once behind the composed controls and once
behind the credential gateway alone. It records whether an effect landed at the receiver. No model
runs here. See [RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md)
(P19-REPLAY01).

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19j.py verify \
  docs/research/provenance-phase-19j/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19j/ROOT.sha256)"
```

That re-reads every proposal from the 19h and 19i packs, recomputes every row that was never
dispatched and recomputes the summary from the rows; the receipt says
`"kind": "structure_checked"` and that the replay was not run. On Linux x86_64 in the hash-locked
venv, add `--replay` to dispatch every call again and compare the whole report
(`"kind": "frozen_replay_recomputed"`, about ten minutes on a two-core server). Root `608dfd848125381596fdbf9ac24e437ac26c49593c065bfc21cdd910a2963428`.

## What the pack shows

Across the 768 recorded generations the models proposed 269 sends in a restricted state and 155
when authorised.

|                                      | Composed controls | Credential gateway alone |
| ------------------------------------ | ----------------- | ------------------------ |
| Restricted-state sends blocked       | 269 of 269        | 49 of 269                |
| Effects landed in a restricted state | 0                 | 220                      |
| Authorised sends admitted            | 152 of 155        | 152 of 155               |

- **Behind the composed controls no restricted-state send landed.** That includes the 65 the 3B
  Llama proposed on its own in 19h and all 28 that the 19i injections drew from the Qwen model.
- **Behind the credential gateway alone, 220 of the same 269 landed.** The 49 it stopped are the 40
  sends made with a revoked credential and nine whose content was not the authorised report.
- **The controls did not get in the way of authorised work.** All 152 authorised sends carrying the
  exact report were admitted. The three that were not admitted carried altered content, and both
  arms refused them.

The composed controls decide on the host's state, not on what the model says, so this is the
outcome the design predicts. What the lane adds is that it is now shown with 269 real model
outputs, 28 of them drawn by injected text, where Phase 19 had only scripted ones.

## Limits

- The proposals come from three small 4-bit local models. No model ran here, and nothing transfers
  to a larger or a hosted model.
- The pipeline is the frozen Phase 17 fixture rig under a fixed clock, not a deployed system. A
  blocked send shows the controls refusing that action in that fixture state.
- This is not an attack on the gate. No model was shown the gate or asked to defeat it; the
  informed-attacker arm is not run and stays owed, with the hosted capture, under `IOU-19-SPEND`.
- The replay ran on the project's own droplet (twice, the second time from the committed path) and
  runs again in the hosted test suite. It has not been replayed outside the author's custody.
- Off Linux, `verify` cannot tell whether a dispatched row's result is what the pipeline returns;
  a test shows a consistently edited row passing the structure check and failing the replay.
- The protocol pins the two frozen files this lane calls and the roots of the two capture packs.
  The 19j root is not among the roots the hosted workflow checks against the repository variable.
