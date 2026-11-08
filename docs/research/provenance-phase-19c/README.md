# Phase 19c evidence

Forked receiver and its lanes. See [RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md).

```sh
/opt/anaconda3/bin/python -B tools/assurance-provenance/evidence19c.py verify \
  docs/research/provenance-phase-19c/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19c/ROOT.sha256)"
```

Expected: `"verified": true`, `"new_reasons": 8`, `"route_variants": 7`,
`"strawman_admits_at_least_one": true`, `"pays_G22": false`, `"transport_forked": false`. Runs in
seconds; no key, no model.
