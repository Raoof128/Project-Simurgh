# Phase 19a implementation plan — projection verifier over the Phase 17 archive

**Date:** 1 November 2026 · **Design:** [Phase 19 v2.1](../specs/2026-11-01-phase-19-authority-provenance-design.md) §4.6, §4.7, §6 row 19a ·
**Baseline:** `main` @ `30fe9e4b` · **Arm:** `composed_frozen` only. No new runtime mechanism.

Written for an engineer with no prior context. Every step names exact paths; the code in each step
is complete. Order is test-first: write the failing test, run it, watch it fail for the stated
reason, then write the minimum code, run again, watch it pass.

## Constraints that shape every step

- The frozen study modules (`tools/assurance-transfer/*`, `tools/assurance-model-composed/*`) import
  the Agents SDK at module load and cannot be imported on a host without the hash-locked venv. 19a
  therefore ships its own pack reader (same checks as `transfer_study.read_pack`) and imports the
  frozen `verify_files(replay=True)` lazily, only when `--replay` is given on Linux x86_64.
- Every frozen tool directory hashes its own `*.py` files into a `protocol.json`; 19a adds files only
  under `tools/assurance-provenance/` and `docs/research/provenance-phase-19a/`.
- Rows must be deterministic from the archive bytes so `verify` can recompute them.
- Python: `/opt/anaconda3/bin/python` (3.12) locally; stdlib only.
- Nothing is committed by this plan. The receipt records `tree_state: "uncommitted"` until the owner
  commits; the protocol binds source hashes, not a commit.

## Inputs (read-only)

- `docs/research/transfer-phase-17/evidence.zip` (4,167 members; root in `ROOT.sha256`)
- `docs/research/transfer-phase-17/tasks.json` (24 tasks: `id, family, kind, state, expected`)
- `docs/research/transfer-phase-17/VALIDATION.md` line 10 (forced-call citation)
- Archive shapes: `luna.json` / `llama.json` with `generations` (`id, task_id, trial, proposal{status,name?,arguments?}`, Luna `call.response.output`, Llama `output.raw`) and `rows` (`task_id, trial, control, generation, status, before_effects, new_effects, effects`); snapshots `<model>/snapshots/<task>-<trial>-<control>-<kind>.sqlite` with kinds `a-gateway, b-gateway, a-port, b-port, a-signal, b-signal, context, pipeline, service-before, service`. Receiver effects: `service.sqlite effects(key,...)`; gateway records: `*-gateway.sqlite intents(key,payload,status)`.

## Outputs

- `tools/assurance-provenance/projection.py` — pure functions: `read_pack`, `free_text`, `awareness_sidecar`, `split_rows`, `coverage_rows`, `judge_free`, `forced_call_citation`, `report`.
- `tools/assurance-provenance/evidence.py` — `check_protocol`, `run`, `verify`, CLI.
- `tools/assurance-provenance/tests/test_projection.py`, `tests/test_evidence.py` (unittest).
- `docs/research/provenance-phase-19a/{protocol.json, report.json, evidence.zip, ROOT.sha256, receipt.json, RESULTS.md, README.md}`.
- `docs/research/PROVENANCE_PHASE_19.md` — declaration with the six lifecycle fields and the P19-CI01 row (the workflow and census re-pin are a separate, later task).

## Steps

1. **Failing projection tests.** `tests/test_projection.py` asserts: the pack reader rejects a wrong root with `manifest_root`; `free_text` returns the decline reason for a Luna decline and `output.raw` for Llama; `awareness_sidecar` on the real archive reports `evaluable: False`-compatible counts (`flagged == 0` for Luna; `generations_with_free_text` equals the count of non-empty channels); `split_rows` yields 144 rows per model whose `split` values are drawn from the fixed vocabulary and whose counts match the archive (Luna: 24 `refused_by_model` per control, 24 `admitted_active` under `credential_only` and `composed`, 24 `blocked_by_gate` under `deny_all`); `coverage_rows` reports `no_record == 0` for every control and `record_unknown == 12` per model summed over controls; `judge_free` reports `model_scored_outcomes == 0`; `forced_call_citation` quotes line 10. Run: `cd tools/assurance-provenance && /opt/anaconda3/bin/python -m unittest discover -s tests -v` → fails with `ModuleNotFoundError: projection`.
2. **Minimum `projection.py`** until step 1 passes.
3. **Failing evidence tests.** `tests/test_evidence.py` asserts: `run` writes the seven outputs; `verify` returns `verified: True` with `kind: hash_bound_projection` on a non-Linux host; three mutations of a copied pack are rejected with distinct reasons: delete one split row → `row_inventory`; relabel one split → `split_mismatch`; inflate one coverage count → `coverage_mismatch`; a wrong root → `manifest_root`; a protocol source edit → `source_binding:…`.
4. **Minimum `evidence.py`** until step 3 passes.
5. **Produce the evidence pack** with `run --out docs/research/provenance-phase-19a` and verify it with `verify`; check `receipt.json`.
6. **Docs:** `RESULTS.md`, `README.md`, and the declaration `docs/research/PROVENANCE_PHASE_19.md`. Run `npx prettier --write` on new markdown.
7. **Not in this plan:** `.github/workflows/assurance-provenance.yml` plus the 5Q census re-pin (one commit, after the declaration is committed), and the Linux replay chain run on a CI runner.
