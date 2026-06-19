# Simurgh ↔ AgentDojo Adapter (Stage 3H)

In-loop mediating defence that lets AgentDojo evaluate the Simurgh LLM Shield as a real defence.
This package is **transport + enforcement only**. It performs no safety classification — every
allow/block decision comes from the real Node gateway and is never reinterpreted here.

## Configuration

- `SIMURGH_GATEWAY_BASE_URL` — gateway base URL
  (default `http://127.0.0.1:33030/api/llm-shield/gateway`).
- Preflight: `SimurghClient.preflight()` checks the server origin `/health`, falling back to a
  session-create. It raises `GatewayUnavailable` (fail-clear) if the gateway is not running.

## Components

- `simurgh_client.py` — stdlib HTTP client (session, run, verify, preflight).
- `mapping.py` — translates an AgentDojo/canary case into a gateway run payload, and a blocked
  verdict into the metadata-only block sentinel `{ simurgh_blocked, boundary, reason_code, receipt_id }`.
- `defence.py` — `SimurghDefence.mediate(step)` / `.query(step)`: forwards a step to the gateway
  and returns `{ allow, blocked_action }`, enforcing the gateway verdict before AgentDojo executes.
- `evidence_writer.py` — writes Layer-2 external-run evidence under the same metadata-only contract.

## Layers

- **Layer 1 (CI, Node, always-on):** the canary dry-run (`scripts/smoke-llm-shield-stage3h.sh`)
  drives a vendored 30-case fixture through the real gateway. No AgentDojo, no network. The adapter
  logic here is covered by this package's pytest suite.
- **Layer 2 (optional, external):** install AgentDojo (`pip install -e .[agentdojo]`), bind
  `SimurghDefence` into AgentDojo's defence hook, and run the workspace suite with a live provider.
  The adapter wraps raw AgentDojo tool output into the gateway's untrusted context schema
  (`source_type: tool_result`, `trust_level: untrusted`, `purpose: reference`). This run is not
  claimed in CI and corresponds to the future tag `v1.1.0-stage-3h-agentdojo-external-run`.

## Test

```bash
python3 -m pytest tests/ -q
```
