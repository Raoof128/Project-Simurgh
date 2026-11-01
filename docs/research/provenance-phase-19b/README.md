# Phase 19b evidence

Write-anywhere differential lane, stop/lease/outage lane and the Lean model, over the successor
pipeline. See [RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md).

Reproduce (Python 3.12, this checkout; no key, no model; about twelve minutes, the lanes re-execute):

```sh
/opt/anaconda3/bin/python -B tools/assurance-provenance/evidence19b.py verify \
  docs/research/provenance-phase-19b/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19b/ROOT.sha256)"
```

Expected: a receipt with `"verified": true`, `"kill_count": 13`, `"clean_differences": 0`,
`"wired_deterministic_channels": 4`, `"phase_19b_closed": true`.

Tests (about twenty minutes; the evidence tests run the lanes twice):

```sh
cd tools/assurance-provenance && /opt/anaconda3/bin/python -m unittest discover -s tests -v
```

The Lean differential test skips, not passes, when `lean` is not on the path.
