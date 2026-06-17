# Stage 3D — LLM Shield Provenance & Containment — Evidence

Fixtures and generated metrics for the Stage 3D containment boundaries (context
provenance, tool invocation, output leakage) and the per-session run risk
accumulator, all evaluated against the deterministic mock provider.

## Corpus

Six categories under `fixtures/<category>/`:

| Category               | Goal                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| `clean_benign`         | benign requests pass end-to-end                                                 |
| `hard_negative`        | safety discussion is not auto-blocked                                           |
| `context_provenance`   | authority-forging / malformed / unsigned-trusted context is rejected or demoted |
| `tool_gate`            | unsafe tool classes are blocked before any (mock) execution                     |
| `output_firewall`      | hidden-policy / secret / tool-arg leakage is blocked before export              |
| `multi_turn_softening` | per-turn warnings accumulate across a session and escalate                      |

## Fixture shape

Each fixture is frozen once committed — case identity (`case_id`, `category`,
`ground_truth`, `input`/`turns`, `mock_provider_output`) is immutable; only the
recorded `expected` may be re-snapshotted if implemented behaviour changes under
review (3B/3C discipline).

- Single-run fixtures carry `input`, `scenario`, `contexts`, `mock_provider_output`.
- Multi-turn fixtures carry a `turns[]` array replayed in one session; `expected`
  is evaluated against the **last** turn (this is how `multi_turn_softening`
  demonstrates cross-run risk accumulation).
- `expected.reason_codes_include` is a **subset** assertion (the observed reason
  codes must include each listed code; extra codes are allowed).

`mock_provider_output` is **fixtures-only**: it is fed to the output firewall by
the direct-import fixture runner and is never accepted over the HTTP route.

## Reproduce

```bash
node tests/e2e/llm_shield_stage3d_fixture_runner.mjs            # assert all fixtures
node tests/e2e/llm_shield_stage3d_fixture_runner.mjs --metrics  # also write metrics.json
```

The runner imports the Stage 3D modules directly (no live server) and asserts the
observed verdicts/reason codes match each fixture's `expected`. Exit code is
non-zero on any mismatch.

See `docs/superpowers/specs/2026-06-17-stage-3d-llm-shield-provenance-containment-design.md`
and `docs/research/llm-shield/LLM_SHIELD_STAGE_3D_PROVENANCE_CONTAINMENT.md`
(non-claims) for scope and limitations.
