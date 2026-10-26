# Evidence mutation test lane — 26 October 2026

Owner-requested repair following the strict independent review of PR #140. This declaration
precedes implementation.

## Observed gap

The README row "Evidence mutation checks: 10 deliberate mutations rejected" and the matching
`docs/research/transfer-phase-17/VALIDATION.md` row rest on `mutation_checks.py` and
`mutations.log` inside `docs/research/transfer-phase-17/validation-logs.zip`. That script is not
run by any test or workflow, hard-codes `/workspace/Project-Simurgh`, and passes `replay=False` to
every verifier call, so the ten rejections exercise the structural validators only. In-tree,
`tools/assurance-transfer/tests/test_transfer.py::test_archive_duplicate_and_wrong_root_reject`
covers two of them. Re-running the logged script against `6140f3e5` rejects all ten with the logged
reason codes; the claim is true but not regression-protected, and its stated scope is wider than
what was exercised.

A second gap, recorded as F3 in the review: a tampered archive whose manifest and root are both
recomputed passes `read_pack` by design, and no committed check shows that the replay layer then
rejects it.

## Authorized operations

| Exact path                                                            | Operation | Purpose                                                                                                                                                   |
| --------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/evidence-mutations/mutations.py`                               | add       | Unpinned port of the ten logged mutations, root resolved from `__file__`; plus a consistently re-signed role archive builder for the replay check.        |
| `tools/evidence-mutations/tests/test_mutations.py`                    | add       | One test per mutation with its exact reason code; the re-signed archive passes `read_pack` everywhere and is rejected by the replay on Linux x86_64 only. |
| `.github/workflows/evidence-mutations.yml`                            | add       | Run the suite on `ubuntu-latest` with the hash-locked requirements, so the replay check executes where seccomp exists.                                    |
| `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` | modify    | Only if the census classifies a new step as a completeness gate: re-pin `current` by set. `baseline` is never touched.                                    |
| `README.md`                                                           | modify    | The "Evidence mutation checks" row names the committed tests and their scope.                                                                             |
| `docs/research/transfer-phase-17/VALIDATION.md`                       | modify    | Append a dated note below the table. The recorded rows are not edited.                                                                                    |
| `AGENT.md`, `CHANGELOG.md`                                            | append    | Accurately attributed change and verification log.                                                                                                        |

## Gate lifecycle for `evidence-mutations.yml`

- **active_phase:** from this maintenance onward, on changes to the new tool, either evidence
  directory, or the workflow itself.
- **protected_surface:** the rejection of the ten logged mutations with their recorded reason
  codes, and the replay-layer rejection of a consistently re-signed role archive.
- **next_phase_behaviour:** a stage that changes a reason code or adds a mutation updates the
  tests in the same change and re-pins `current` if the census moves.
- **maintenance_behaviour:** expected reason codes are literal in the tests; a changed code fails.
- **sunset_or_migration_condition:** retire when the two evidence archives are superseded, in the
  same change that retires them from the README.
- **anti_vacuity_condition:** a mutation that is accepted fails its own named test; the replay
  check reports SKIPPED off Linux x86_64 and never passes silently.

## Limits

No hash-pinned source is edited: every path listed under `sources` in any
`docs/research/*/protocol.json` must show an empty diff. The logged `validation-logs.zip` and the
recorded `VALIDATION.md` rows stay byte-identical. No verifier, protocol or archive changes.
