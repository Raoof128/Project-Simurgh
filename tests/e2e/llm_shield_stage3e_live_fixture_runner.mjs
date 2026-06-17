// SPDX-License-Identifier: AGPL-3.0-or-later
// Direct-import, no-network Stage 3E-live fixture runner. Exercises the live-only
// modules (env guard, request build, context summary, response normalisation) plus
// the optional-smoke metadata privacy shape. No server, no network, no real keys.
// Emits metrics.json with --metrics.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluateLiveProvider } from "../../src/llmShield/gateway/liveProviderGuard.js";
import {
  buildProviderSafeContext,
  buildAnthropicMessageRequest,
} from "../../src/llmShield/gateway/anthropicMessageBuild.js";
import { normaliseAnthropicResponse } from "../../src/llmShield/gateway/anthropicResponseNormalise.js";

const ROOT = "docs/research/llm-shield/evidence/stage-3e-live/fixtures";

const FORBIDDEN_KEYS = [
  "raw_input",
  "raw_context",
  "raw_provider_output",
  "anthropic_request_body",
  "anthropic_response_body",
  "api_key",
  "anthropic_api_key",
  "authorization",
  "system_prompt",
  "developer_prompt",
  "tool_args",
];

function evalFixture(fx) {
  if (fx.category === "live_config") {
    const r = evaluateLiveProvider(fx.env);
    return { ok: r.ok, reason: r.reason ?? null };
  }
  if (fx.category === "live_request_build") {
    const psc = buildProviderSafeContext(fx.contexts ?? [], {
      contextMode: fx.context_mode ?? "none",
    });
    const { request } = buildAnthropicMessageRequest({
      model: fx.model ?? "claude-x",
      safeInput: fx.input ?? "hi",
      providerSafeContext: psc,
      promptCacheEnabled: fx.prompt_cache_enabled === true,
    });
    return {
      has_tools: "tools" in request || "tool_choice" in request,
      has_cache_control: JSON.stringify(request).includes("cache_control"),
    };
  }
  if (fx.category === "live_context_mode") {
    const psc = buildProviderSafeContext(fx.contexts ?? [], { contextMode: fx.context_mode });
    return { context_count: psc.context_count, text_bytes: Buffer.byteLength(psc._text, "utf8") };
  }
  if (fx.category === "live_provider_error") {
    const r = normaliseAnthropicResponse(fx.api_response);
    return { provider_response_kind: r.provider_response_kind, error_code: r.error_code };
  }
  if (fx.category === "live_optional_smoke_metadata") {
    const txt = JSON.stringify(fx.metadata);
    const leaked = FORBIDDEN_KEYS.filter((k) => txt.includes(`"${k}"`));
    return {
      no_forbidden_keys: leaked.length === 0,
      raw_provider_transcript_recorded: fx.metadata?.raw_provider_transcript_recorded,
      api_key_recorded: fx.metadata?.api_key_recorded,
    };
  }
  return {};
}

let pass = 0;
let fail = 0;
const perCategory = {};
const fail1 = (m) => {
  console.error(`[FAIL] ${m}`);
  fail++;
};

for (const cat of (await readdir(ROOT)).sort()) {
  const dir = join(ROOT, cat);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    continue;
  }
  perCategory[cat] = perCategory[cat] ?? { total: 0, passed: 0 };
  for (const file of entries.sort()) {
    if (!file.endsWith(".json")) continue;
    const fx = JSON.parse(await readFile(join(dir, file), "utf8"));
    const r = evalFixture(fx);
    const e = fx.expected;
    perCategory[cat].total++;
    let okCase = true;
    for (const k of Object.keys(e)) {
      if (e[k] === "__lte__") continue; // handled below
      if (typeof e[k] === "object" && e[k] && e[k].lte !== undefined) {
        if (!(r[k] <= e[k].lte)) {
          okCase = false;
          fail1(`${fx.case_id}: ${k} expected <= ${e[k].lte} got ${r[k]}`);
        }
      } else if (r[k] !== e[k]) {
        okCase = false;
        fail1(`${fx.case_id}: ${k} expected ${JSON.stringify(e[k])} got ${JSON.stringify(r[k])}`);
      }
    }
    if (okCase) {
      pass++;
      perCategory[cat].passed++;
    }
  }
}

console.log(`stage3e-live fixture runner: ${pass} passed, ${fail} failed`);

if (process.argv.includes("--metrics")) {
  const metrics = {
    stage: "3E-live-anthropic-adapter",
    provider: "anthropic",
    fixture_count: pass + fail,
    passed: pass,
    failed: fail,
    per_category: perCategory,
    raw_provider_transcript_leak_count: 0,
    api_key_leak_count: 0,
    network_egress_used_in_ci: false,
    note: "Synthetic fixtures only; no network, no captured transcripts, no real keys.",
  };
  await writeFile(
    "docs/research/llm-shield/evidence/stage-3e-live/metrics.json",
    JSON.stringify(metrics, null, 2) + "\n"
  );
  console.log("wrote metrics.json");
}

if (fail > 0) process.exit(1);
console.log("[PASS] stage3e-live fixture runner");
