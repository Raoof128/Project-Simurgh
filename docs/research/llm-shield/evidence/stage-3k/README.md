# Stage 3K evidence

Deterministic, key-free, metadata-only adaptive-readiness probe (claiming lanes 3K-A + 3K-B).

**Frozen in Plan 1 (run-independent catalogues):**

- `mutation-operators.json` — the 10 enumerated deterministic mutation operators.
- `action-open-categories.json` — the 5 action-open underspecification categories.

**Frozen by the Plan 2 real run (deterministic key-free run against the real gateway):**

- `manifest.json` — Stage 3J provenance hashes, operator/category catalogues, expected counts, claim boundary.
- `mutation-manifest.json` — 350 metadata-only mutation variants (35 injection tasks × 10 operators).
- `source-case-map.json` — source-case-hash → variant count.
- `action-open-manifest.json` — 35 action-open cases across the five categories.
- `metrics.json` — containment hard gates clean, benign 97/97, targeted ASR 0/385, all `operator_asr_delta` 0.
- `suite-breakdown.json`, `operator-breakdown.json`, `taxonomy.json`.

Claim boundary: full-suite adaptive-style containment probe under a deterministic
key-free harness. NOT adaptive robustness, NOT live-model safety. See
`../../STAGE_3K_CLOSEOUT.md` for the Stage 3L decision (not triggered).
