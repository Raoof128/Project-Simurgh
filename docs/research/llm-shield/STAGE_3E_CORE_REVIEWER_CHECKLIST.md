<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-core — Reviewer Checklist

```
[ ] Stage 3E-core does not claim jailbreak immunity.
[ ] Live providers are disabled by default and fail closed (no adapter in core).
[ ] CI does not require provider keys and performs no network call.
[ ] Mock mode has no network imports.
[ ] recorded_fixture mode is synthetic-only (provenance "synthetic" + output hash match).
[ ] recorded_fixture is selected by opaque case_id via manifest; path selectors rejected.
[ ] Provider-side tools are disabled; no real tool executes.
[ ] Provider output passes through the 3D output firewall before export.
[ ] Tool-shaped provider output passes through the 3D tool gate.
[ ] Raw provider transcripts / request / response bodies / API keys are never stored.
[ ] API keys are never accepted in request bodies, nor written to receipts/logs/metrics/evidence.
[ ] OpenAPI documents Bearer auth and request schemas; mock examples only.
[ ] Docker image runs in mock mode by default and uses a non-root USER.
[ ] gateway router is mounted before the base LLM Shield router.
[ ] Stage 3B benchmark has no drift; Stage 3D gates still pass.
[ ] safetyReceipt.js / stage3dReceipt.js are unchanged.
```

How to verify: run the command block in `STAGE_3E_CORE_CLOSEOUT.md`.
