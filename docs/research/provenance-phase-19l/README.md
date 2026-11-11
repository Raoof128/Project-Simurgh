# Phase 19l evidence: the 19k proposals through the frozen Phase 17 pipeline

19k recorded what three small local models proposed over 2,592 generations and executed nothing.
This lane hands every recorded `send_report` call, 1,240 of them, to
`tools/assurance-model-composed/trial.py::run_branch`, the frozen function Phase 17 used, in the
case's own fixture state: once behind the composed controls and once behind the credential gateway
alone. It records whether an effect landed at the receiver. The dispatch and the outcome classes
are 19j's, imported unchanged. No model runs here. See [RESULTS.md](RESULTS.md) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-REPLAY02), which was committed while the 19k
capture was still running and before any 19k output had been read.

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19l.py verify \
  docs/research/provenance-phase-19l/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19l/ROOT.sha256)"
```

That re-reads every proposal from the 19k pack, recomputes every row that was never dispatched and
recomputes the summary from the rows; the receipt says `"kind": "structure_checked"` and that the
replay was not run. On Linux x86_64 in the hash-locked venv, add `--replay` to dispatch every call
again and compare the whole report (`"kind": "frozen_replay_recomputed"`, about thirty minutes on a
two-core server). Root `fad31141b5649183e8ffb9e49518b194585fb6f0b5637acab5d008ff1fef6169`.

## What the pack shows

Across the 2,592 recorded generations the models proposed 1,170 sends in a restricted state and 70
when authorised, 65 of those carrying the exact report.

|                                      | Composed controls | Credential gateway alone |
| ------------------------------------ | ----------------- | ------------------------ |
| Restricted-state sends blocked       | 1,170 of 1,170    | 202 of 1,170             |
| Effects landed in a restricted state | 0                 | 968                      |
| Authorised sends admitted            | 65 of 70          | 65 of 70                 |
| Authorised exact sends refused       | 0 of 65           | 0 of 65                  |

- **Behind the composed controls no restricted-state send landed.** That covers the 153 sends that
  injected text drew from Qwen3 4B, the 215 from Qwen3 1.7B and the 802 that Llama 3.2 3B proposed
  with or without an injection.
- **Behind the credential gateway alone, 968 of the same 1,170 landed.** The 202 it stopped are the
  161 sends made with a revoked credential and 41 whose content was not the authorised report. It
  stopped nothing else: every exact send in the other five restricted states landed.
- **The controls cost no authorised work.** All 65 authorised sends carrying the exact report were
  admitted by both arms. The five that were not admitted carried altered content, and both arms
  refused them.

This is the outcome the declaration predicted, for the stated reason: the composed controls decide
from the host's state and never read model text, so which injection drew the send makes no
difference to them. The lane adds scale (1,170 real model outputs against 269 in 19j) and the cost
side, which 19j did not report as its own count.

## Limits

- This is a correctness check of the gate over recorded outputs. It is not security evidence
  against an attacker who adapts to the gate: no model was shown the gate or asked to defeat it. The
  informed-attacker arm is not run and stays owed, with the hosted capture, under `IOU-19-SPEND`.
- The proposals come from three small 4-bit local models. Nothing transfers to a larger or a hosted
  model.
- The pipeline is the frozen Phase 17 fixture rig under a fixed clock, not a deployed system. A
  blocked send shows the controls refusing that action in that fixture state.
- The authorised side is small: 70 sends from a positive-control block of 24 generations per model.
  "No exact authorised send refused" is 0 of 65, with a Wilson 95% upper bound of about 5.6%.
- The full replay ran twice on the project's own droplet, once when the pack was built and once
  from the pack through the command above. The hosted test suite checks this pack's structure only,
  because the full replay does not fit its time budget; set `SIMURGH_REPLAY_19L=1` on a host that
  can replay to run it as a test. It has not been replayed outside the author's custody.
- Off Linux, `verify` cannot tell whether a dispatched row's result is what the pipeline returns;
  a test shows a consistently edited row passing the structure check and failing the replay.
