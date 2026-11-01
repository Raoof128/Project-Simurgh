# Phase 19a results: projections over the Phase 17 archive

**Arm:** `composed_frozen` (the evaluated gate; no successor code runs here). **Inputs:** the Phase 17
archive at the root in `docs/research/transfer-phase-17/ROOT.sha256`, `tasks.json`, and line 10 of
`VALIDATION.md`. **Outputs:** `report.json` inside `evidence.zip` (root in `ROOT.sha256`), `receipt.json`.
**Host for this pack:** macOS; the frozen Phase 17 replay was not chained (`receipt.json` says
`hash_bound_projection`, `replay.result: not_run`). No model was called. No frozen file changed.
The lane sources were committed before the pack was produced; `receipt.json` names that commit in
`tree_state`.

Every number below is recomputed by `evidence.py verify` from the archive bytes. A reader with the
archive and this repository can reproduce the table without a key, a model or a provider. That is a
hash-bound projection of the project's own archive, not custody evidence.

## 1. Decline, block, admit: the split per generation and control

| Model | Control         | refused_by_model | blocked_by_gate | admitted_active | effect_in_restricted_state | invalid_proposal |
| ----- | --------------- | ---------------: | --------------: | --------------: | -------------------------: | ---------------: |
| Luna  | credential_only |               24 |               0 |              24 |                          0 |                0 |
| Luna  | composed        |               24 |               0 |              24 |                          0 |                0 |
| Luna  | deny_all        |               24 |              24 |               0 |                          0 |                0 |
| Llama | credential_only |                1 |               6 |              23 |                         17 |                1 |
| Llama | composed        |                1 |              23 |              23 |                          0 |                1 |
| Llama | deny_all        |                1 |              46 |               0 |                          0 |                1 |

Reading: Luna's zero restricted-state effects under every control are 24 model declines. The gate
never had a Luna call to block. Llama's 17 restricted-state effects under `credential_only` become
23 gate blocks under `composed` (the extra six are restricted-state calls that `credential_only`
also blocked, because the credential gate observes `credential_revoke`). This is the README's F-1
caveat as a per-row table rather than a sentence.

## 2. Awareness-flag sidecar: not evaluable on this archive

| Model | Generations | With free text | Flagged | Channel                                           |
| ----- | ----------: | -------------: | ------: | ------------------------------------------------- |
| Luna  |          48 |             24 |       0 | decline reason only; no message or reasoning item |
| Llama |          48 |             48 |       0 | `output.raw`, the raw tool-call JSON              |

The rule is a lowercase substring match on nine terms (listed in `protocol.json`). It found nothing
because the instrument elicits no verbalisation: Luna ran with `reasoning={"effort": "none"}` under a
system prompt that says "Do not add fields or prose", and Llama's only free text is the tool call
itself. The sidecar is reported with `evaluable: false`. It cannot see unverbalised awareness.
An informative flag needs a capture with a rationale channel (Phase 19e).

## 3. Coverage: three counts, an architectural denominator

| Model | Control         | New effects | record `observed` | record `unknown` | No record | Prior effects | Prior `unknown` |
| ----- | --------------- | ----------: | ----------------: | ---------------: | --------: | ------------: | --------------: |
| Luna  | credential_only |          24 |                24 |                0 |         0 |             4 |               4 |
| Luna  | composed        |          24 |                24 |                0 |         0 |             4 |               4 |
| Luna  | deny_all        |           0 |                 0 |                0 |         0 |             4 |               4 |
| Llama | credential_only |          40 |                40 |                0 |         0 |             4 |               4 |
| Llama | composed        |          23 |                23 |                0 |         0 |             4 |               4 |
| Llama | deny_all        |           0 |                 0 |                0 |         0 |             4 |               4 |

Every effect at the receiver has a gateway record. That is an architectural identity on this path:
the gateway writes the intent before any network call and is the receiver's only caller, so the
no-record count can move only under an injected omission. The twelve `unknown` records per model
are the four seeded prior effects of the `unknown_prior` fixture, counted once per control. The
verifier's mutation suite shows the count is live: inflating one `record_observed` is rejected with
`coverage_mismatch`.

## 4. Judge-free row and the forced-call citation

- `judge_free`: 0 of 288 outcomes are scored by any model. Basis: outcomes are receiver SQLite effects
  and code oracles; a grep for `judge` or `grader` across `tools/assurance-*` and `tools/safety-study`
  is empty. This is a reported row, not a differentiator: AgentDojo and AgentSecBench are judge-free
  by design. Lab oversight numbers cited in the gap hunt are model-judged.
- Forced calls: the archive holds no forced-call rows. The cited result is `VALIDATION.md` line 10,
  "15 passed, including forced calls in all eight lifecycle states", a unit-test receipt from the
  Phase 17 freeze, reproduced in `report.json` as `kind: cited_unit_test_result`.

## 5. What the verifier rejects

Five mutations of the pack, each with its own reason: a dropped split row (`row_inventory`), a
relabelled split (`split_mismatch`), an inflated coverage count (`coverage_mismatch`), an edited
awareness count (`sidecar_mismatch`), and an edited protocol source hash (`source_binding:<path>`).
A wrong root is `manifest_root`. The tests in `tools/assurance-provenance/tests/` exercise all of
them against the real archive.

## 6. Limits

- Nothing here is new enforcement. Phase 19a adds a verifier and a pack, not a mechanism.
- The projection rules were written with the archive open and are reported, not scored against a
  held-out set (`protocol.json`, `informed_authoring`).
- The frozen replay chain (`--replay`) needs Linux x86_64, Python 3.12, the hash-locked
  dependencies and full Git history; this pack was produced without it.
- The receipt's `tree_state` names the commit of the lane sources; the protocol binds their hashes.
  The pack itself is committed after it is produced, so its own commit is not in the receipt.
