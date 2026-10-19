# OpenAI readiness experiment

**Instrument scope.** This is the original deterministic single-call harness. For the newer
live-model comparison, role correction and credential-free source replay, start with the
[current README](../../README.md). Results from those studies must not be attributed to
this instrument's fixtures. Install root dependencies with `npm ci`; commands below run
from the repository root.

A deterministic local tool-boundary demonstration and an optional, explicitly authorized OpenAI Responses API proposal adapter. The default requires no API key and makes no API calls.

```bash
npm run test:openai
npm run openai:offline -- --out /tmp/simurgh-openai/report.json
npm run openai:verify -- /tmp/simurgh-openai/report.json
```

Use a new output filename for each run. Read [the evaluation protocol](../../docs/openai/EVALUATION.md) for exact controls, metrics, live authorization, proxy configuration, artifact verification, and limitations. An embedded signing key provides self-attestation only; live report replay does not authenticate model provenance.
