# Official larger Meta Llama feasibility

Checked 2026-10-15 UTC. Recommendation: **meta-llama/Llama-3.2-3B-Instruct**, pinned to `0cb88a4f764b7a12671c53f0838cd831a0843b95`. This is a practical increase from the installed 1B model; its official config, tokenizer template, weight index, and first weight shard HEAD request are accessible with the existing HF binding. No weights or paid inference were requested by this research.

| Model | Immutable revision | BF16 parameters | Safetensors bytes | Weight-file access |
| --- | --- | ---: | ---: | --- |
| Llama-3.2-3B-Instruct | `0cb88a4f764b7a12671c53f0838cd831a0843b95` | 3,212,749,824 | 6,425,529,048 (5.98 GiB), 2 shards | First shard HEAD 200; config/template/index 200 |
| Llama-3.1-8B-Instruct | `0e9e39f249a16976918f6564b8830bc894c89659` | 8,030,261,248 | 16,060,556,376 (14.96 GiB), 4 shards | First shard HEAD 403; config/template/index 403 |

Both repositories are manually gated. Both public model APIs and official README cards returned 200. Public metadata availability does not establish permission to download gated weights. The observed 8B 403 is an access blocker for the current binding; no alternate identity, mirror, or gate workaround was attempted. The complete 8B config/template could not be inspected, so its exact template behavior remains unverified.

## Resource fit (estimates, not measured inference)

Observed cgroup limits: 32 GiB RAM, CPU quota equivalent to 4 cores; parent reports no GPU. Free disk at research time: 23.98 GiB. Cgroup memory usage was 6.66 GiB during the check and includes other current work.

- 3B BF16 parameters occupy approximately 5.98 GiB. With batch size 1 and 4,096-token context its configured 28 layers, 8 KV heads, and 128 head dimension imply 0.4375 GiB for an unquantized BF16 KV cache. A rough steady resident-memory planning budget is 8–12 GiB, with loading peaks implementation-dependent. FP32 parameters alone require 11.97 GiB; a rough total budget is 14–18 GiB at short context. These are estimates; monitor actual peak RSS and cgroup memory.
- 8B BF16 parameters occupy approximately 14.96 GiB; rough total planning budget 18–24 GiB at short context, before other concurrently running jobs. FP32 parameters alone require 29.92 GiB, so FP32 is unsuitable for a 32 GiB limit. Its weight download would leave roughly 9 GiB disk if no duplicate copies are created. Access is currently blocked regardless of resource fit.
- Download only the Transformers safetensors shards and required JSON/tokenizer files; do not also download `original/*` or copy a complete cache into a second directory. Reuse one cache/snapshot path. On a four-core CPU, 3B is materially cheaper than 8B; throughput must be benchmarked locally before setting evaluation size. No tokens/second claim is made here.
- Start with batch size 1, capped 2K–4K input context, and short output budgets. The advertised 128K context is not a sensible operating target for this instance: 3B BF16 KV cache alone would be approximately 14 GiB at 128K, before weights, activations, and other processes. Load one model at a time.

## Official config and tool compatibility

3B config: `LlamaForCausalLM`, `torch_dtype=bfloat16`, hidden size 3072, intermediate size 8192, 28 layers, 24 attention heads, 8 KV heads, head dimension 128, vocabulary 128256, tied word embeddings, max positions 131072, Llama-3 rope scaling factor 32. EOS IDs: 128001, 128008, 128009. The card documents Transformers >=4.43.0; actual environment compatibility should be confirmed with the installed versions and a smoke generation.

Its exact official chat template accepts `tools`/`custom_tools`, with JSON Schema function definitions. Default `tools_in_user_message=true` inserts definitions and calling instructions into the first user message; `false` puts them in the system header. Model output uses `{"name": ..., "parameters": {...}}`, while assistant history uses Transformers `tool_calls` entries with `function.name` and a dictionary-valued `function.arguments`. Tool replies use role `tool`, rendered as `ipython`. This is textual generation: a wrapper must parse, validate, and dispatch tool calls; `generate()` does not execute them.

The template explicitly rejects more than one tool call per assistant turn. A synthetic inert-fixture Jinja render validated tool definitions, generation prefix, assistant argument serialization, `ipython` result rendering, and rejection of parallel calls: all five checks passed. These checks establish formatting only, not tool-selection reliability or safety outcomes. Fix `date_string` for reproducible prompts. Use the actual chat template rather than hand-built headers and retain stop-token behavior.

The 8B official README documents tool use with `tokenizer.apply_chat_template(messages, tools=[...], add_generation_prompt=True)`, assistant `tool_calls`, and role `tool` results. Its gated tokenizer template was unavailable, so identical detailed behavior is not assumed.

The 3B official card reports BFCL V2 scores 25.7 for 1B BF16, 67.0 for 3B BF16, and 67.1 for 8B. This supports testing 3B as a more capable tool-using baseline, but these are vendor benchmark results and predict neither local unsafe-action frequency nor this study's conclusions. Greater capability does not guarantee a more informative unsafe baseline. Preserve null findings and distinguish refusal, malformed output, capability failure, and control-blocked action.

## Reproducible official sources

- [3B immutable card](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct/blob/0cb88a4f764b7a12671c53f0838cd831a0843b95/README.md)
- [3B immutable config](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct/resolve/0cb88a4f764b7a12671c53f0838cd831a0843b95/config.json)
- [3B immutable tokenizer config and template](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct/resolve/0cb88a4f764b7a12671c53f0838cd831a0843b95/tokenizer_config.json)
- [3B immutable weight index](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct/resolve/0cb88a4f764b7a12671c53f0838cd831a0843b95/model.safetensors.index.json)
- [8B immutable card](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/blob/0e9e39f249a16976918f6564b8830bc894c89659/README.md)
- [3B public API](https://huggingface.co/api/models/meta-llama/Llama-3.2-3B-Instruct?blobs=true)
- [8B public API](https://huggingface.co/api/models/meta-llama/Llama-3.1-8B-Instruct?blobs=true)

Sanitized API-derived metadata, downloaded official small files, template check results, and SHA-256 hashes are saved beside this report. API URLs above resolve current metadata; use the recorded commit revisions for reproducibility. Existing HF authentication was passed only within the process. Proxy settings and TLS verification were preserved. No repository files were edited.
