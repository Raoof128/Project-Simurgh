# Phase 19e evidence

Capture instrument without spend. See [RESULTS.md](RESULTS.md) and
[the declaration](../PROVENANCE_PHASE_19.md). No model was called; `receipt.json` says
`model_inference: false`, `spend: 0`, `capture_status: not_run`.

Verify (any host with Python 3.12):

```sh
python -B tools/assurance-provenance/evidence19e.py verify \
  docs/research/provenance-phase-19e/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19e/ROOT.sha256)"
```

Expected: `"verified": true`, `"framed_messages": 144`, `"scripted_control": {"evaluable": true,
"recovered": true, ...}`, `"capture_status": "not_run"`, `"spend": 0`.

`spend-declaration.json` is the `IOU-19-SPEND` declaration (models, scope, budget cap, stop rule,
authorisation `required_not_given`). The capture runs only after the owner authorises it.
