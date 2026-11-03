# Phase 19d evidence

Namespace egress lane. See [RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md).

Verify (Linux with user and network namespaces; elsewhere the command refuses with `host_cannot_namespace`):

```sh
python -B tools/assurance-provenance/evidence19d.py verify \
  docs/research/provenance-phase-19d/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19d/ROOT.sha256)"
```

On a Mac with Docker Desktop:

```sh
docker run --rm --privileged -v "$PWD":/repo:ro -w /repo python:3.12-slim \
  python -B tools/assurance-provenance/evidence19d.py verify \
  docs/research/provenance-phase-19d/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19d/ROOT.sha256)"
```

Expected: `"verified": true`, `"cases": 9`, `"all_hold": true`, `"routes_in_fresh_namespace": []`,
`"live_reader_moved": true`, `"covert_channel_eliminated": false`.
