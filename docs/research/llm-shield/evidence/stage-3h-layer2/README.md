# Stage 3H-L2 Evidence

Metadata-only evidence for the required sampled AgentDojo workspace external run.

- `sample-manifest.json` freezes the 10 benign task IDs and 20 security case IDs before execution.
- `run-manifest.json` records AgentDojo, Simurgh, runtime, sample hash, and provider/model provenance.
- `agentdojo-native-results.json` records baseline and Simurgh-defended AgentDojo metrics with counts.
- `simurgh-containment-results.json` records defended-run containment metrics only.
- `simurgh-run-index.json` maps defended AgentDojo run IDs to Simurgh receipt IDs or explicit non-call reasons.

Raw AgentDojo trajectories, prompts, tool outputs, provider outputs, tokens, API keys, and hidden instructions must not be committed here.
