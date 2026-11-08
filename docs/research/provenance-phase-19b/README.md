# Phase 19b evidence

Write-anywhere differential lane, stop/lease/outage lane and the Lean model, over the successor
pipeline. See [RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md).

Reproduce (Python 3.12, this checkout; no key, no model; the lanes re-execute: about twelve minutes
on the authoring Mac, under three on the hosted runner; `lean` 4.15 on the path for the differential):

```sh
python -B tools/assurance-provenance/evidence19b.py verify \
  docs/research/provenance-phase-19b/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19b/ROOT.sha256)"
```

Expected: a receipt with `"verified": true`, `"kill_count": 13`, `"clean_differences": 0`,
`"wired_deterministic_channels": 4`, `"approval_forgeries": 8`, and `"phase_19b_closed": true` on a
host with `lean` (the receipt describes the verifying host: without `lean` the Lean fields are
`null` and `phase_19b_closed` is `false` there).

Tests (about thirty minutes on the authoring Mac; the evidence tests run the lanes twice):

```sh
cd tools/assurance-provenance && python -m unittest discover -s tests -v
```

The Lean differential test skips, not passes, when `lean` is not on the path.
