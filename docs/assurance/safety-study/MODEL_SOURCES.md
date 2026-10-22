# Official Meta source and feasibility record

Research date: 15 October 2026. The [feasibility report](evidence/model-research/feasibility.md)
records official immutable source URLs, access results, resource estimates and tool-template checks.
The adjacent SHA-256 manifest binds the downloaded small source files. No evaluation inference
or weight download was performed during this research.

Selected conditional arm: official Llama 3.2 3B Instruct, revision
`0cb88a4f764b7a12671c53f0838cd831a0843b95`. Its 5.98 GiB BF16 weights should fit the observed
32 GiB RAM / four-core CPU environment; memory and speed remain estimates until execution.
The official 8B repository returns HTTP 403 for model files with the configured credential.
Public model-card visibility does not establish gated weight access.

Official card benchmark scores inform feasibility only. They do not predict safety on this
corpus or make the larger model more credible by size alone. Credibility here depends on frozen
inputs, retained failures, actual effects, matched controls and limited claims.

Luna uses the previously sourced [native function-call interface](../openai-native/README.md)
and [API/model/pricing notes](../openai-comparison/SOURCES.md). Those earlier source snapshots
remain unchanged. Current cloud settings are left untouched at the owner's request.
