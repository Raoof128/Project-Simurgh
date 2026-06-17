# Stage 3E-core — LLM Shield Industry Gateway — Evidence

No-network gateway evidence: 70 synthetic fixtures (10 per category), the OpenAPI
contract, runner-generated metrics, receipt samples, and captured gate outputs.

## Categories

| Category           | Drives                                                          |
| ------------------ | --------------------------------------------------------------- |
| `mock_gateway`     | mock-mode default path (scenario field)                         |
| `recorded_fixture` | synthetic provider-shaped replay (selected by opaque `case_id`) |
| `live_disabled`    | `provider_mode:"live"` → fail-closed contract                   |
| `provider_error`   | synthetic `error`-kind output → metadata-only mapping           |
| `output_firewall`  | synthetic `leaky_text` → blocked before export                  |
| `tool_request`     | synthetic `tool_request` → blocked, never executed              |
| `rate_limit`       | over-cap input → denial-of-wallet guard                         |

## Provenance & selection invariants

- `recorded_fixture` mode is **not a transcript replay system — it is a synthetic
  provider-shaped fixture replay system.** Every recorded fixture carries
  `"provenance": "synthetic"` and a `provider_output_hash` equal to
  `hashPrompt(synthetic_provider_output)`. There is no capture/import pipeline.
- Fixtures are selected by an **opaque `case_id`** (`^3e_[a-z_]+_\d{3}$`) resolved
  through `fixture-manifest.json`. Path-like selectors are rejected.
- Raw synthetic text lives only under `fixtures/**`; generated evidence is
  metadata-only.

## Reproduce

```bash
node tests/e2e/llm_shield_stage3e_fixture_runner.mjs            # assert all 70
node tests/e2e/llm_shield_stage3e_fixture_runner.mjs --metrics  # also write metrics.json
```

See `docs/superpowers/specs/2026-06-17-stage-3e-core-llm-shield-industry-gateway-design.md`
and `docs/research/llm-shield/LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY.md`
(non-claims) for scope and limitations.
