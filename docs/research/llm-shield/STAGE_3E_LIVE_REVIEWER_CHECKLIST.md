<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-live — Reviewer Checklist

> A live provider call is an observed gateway event, not a proof of model safety.

- [ ] Stage does not claim live-provider jailbreak resistance.
- [ ] Any public incident is referenced as incident _class_ only; no payload reproduced.
- [ ] Anthropic is the only live provider; OpenAI-compatible remains deferred.
- [ ] Live mode disabled by default.
- [ ] Missing env / key / model / wrong provider all fail closed.
- [ ] SDK is lazy-imported only after live validation.
- [ ] No static `@anthropic-ai/sdk` import under `src/llmShield/gateway/`.
- [ ] Dynamic SDK import appears only in `anthropicProviderAdapter.js`.
- [ ] No provider-side tools; no `toolRunner` / `betaZodTool`.
- [ ] No MCP / computer-use / web-search / code-execution fields in the request builder.
- [ ] No `cache_control` unless `SIMURGH_LIVE_PROMPT_CACHE_ENABLED=true`.
- [ ] API keys accepted only from server env; client-supplied keys rejected.
- [ ] Raw Anthropic request/response bodies are not stored.
- [ ] Context reaches the provider only via the deterministic bounded `minimal_summary`.
- [ ] Raw incoming context cap (8000) is separate from the provider-summary cap (500/ctx, 2 KB).
- [ ] Rejected context skips the provider.
- [ ] Provider output passes the output firewall (including refusals).
- [ ] Tool-shaped output passes the tool gate and is never executed.
- [ ] Live-call caps (session / minute / day) active; request timeout enforced.
- [ ] Optional live tests skip unless explicit env; CI requires no live key.
- [ ] 3B benchmark shows no drift; 3D and 3E-core gates still pass.
- [ ] Receipt schema remains `"3E"` with additive live fields only.
