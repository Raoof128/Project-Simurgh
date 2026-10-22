# Privacy-aware outcome projection (Phase 14)

**Dataset scope.** This projection feeds the [dashboard and CLI](../simurgh-explorer/README.md).
It contains the earlier 144 outcomes, not the newer 288-branch transfer study. Use the
[current evidence map](../../docs/REVIEWER_INDEX.md) to select the correct archive.

Exports all 144 Phase 10 branches into a strict allowlisted outcome view. Omits
prompts, content/tool arguments, token IDs, original text IDs, free-form reasons,
raw databases and individual timings. Ordinal IDs and source digests are linkable;
this is not an anonymity guarantee. See the
[design and limits](../../docs/research/LOCAL_CONTINUATION_PHASES_13_15.md).

```sh
python -B -m unittest discover -s tools/assurance-export/tests -v
python -B tools/assurance-export/export_evidence.py inspect docs/research/export-phase-14/public.zip --expected-root "$(cat docs/research/export-phase-14/ROOT.sha256)"
python -B tools/assurance-export/export_evidence.py verify docs/research/export-phase-14/public.zip --expected-root "$(cat docs/research/export-phase-14/ROOT.sha256)" --source-pack docs/research/model-composition-phase-10/evidence.zip --source-root "$(cat docs/research/model-composition-phase-10/ROOT.sha256)"
```

Public inspection checks schema, completeness and aggregate consistency. It cannot
verify omitted effect content or the original run. Source verification additionally
replays the pinned full source archive and requires exact reprojection. That path
needs Python 3.12 and the hash-locked SDK/workflow dependencies. Public inspection
uses the standard library and repository contracts. JSON and metadata-plus-JSONL
round-trip this reduced view; no vendor format compatibility is claimed.

The `export` command takes `--out` (a new directory), `--source-pack` and
`--source-root`, and requires committed protocol/source bindings. It verifies the
complete source before projection. No real secrets or personal data are used in
the synthetic canary tests.
