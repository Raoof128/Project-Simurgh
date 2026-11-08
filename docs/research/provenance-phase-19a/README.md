# Phase 19a evidence

Projection pack over the Phase 17 archive for the `composed_frozen` arm. See
[RESULTS.md](RESULTS.md) for the tables and [the declaration](../PROVENANCE_PHASE_19.md) for scope.

Reproduce (any host with Python 3.12 and this checkout; no key, no model):

```sh
/opt/anaconda3/bin/python -B tools/assurance-provenance/evidence.py verify \
  docs/research/provenance-phase-19a/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19a/ROOT.sha256)"
```

Expected: a JSON receipt with `"verified": true`, `"generations": 96`, `"branches": 288`,
`"kind": "hash_bound_projection"`. On Linux x86_64 inside the hash-locked venv, add `--replay` to
chain the frozen Phase 17 replay first; the receipt then reads `frozen_replay_chained`.

Tests:

```sh
cd tools/assurance-provenance && /opt/anaconda3/bin/python -m unittest discover -s tests -v
```

Files: `protocol.json` (source pins, archive root, rule constants), `report.json` (the projection),
`evidence.zip` (report plus three sidecar members), `ROOT.sha256`, `receipt.json`.
