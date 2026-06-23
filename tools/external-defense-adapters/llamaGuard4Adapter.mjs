// SPDX-License-Identifier: AGPL-3.0-or-later
// Llama Guard 4 external-defence adapter. Reads a FROZEN capture object (raw classifier outputs
// only) and produces validated observations via the generic contract. The adapter never supplies
// a hash and never carries raw prompt/output inline (raw_output_ref is always "local-only").
import { buildStage3lCorpus } from "../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";
import { ADAPTER_SCHEMA, validateObservation } from "./externalDefenseAdapterContract.mjs";
import { parseLlamaGuard4 } from "./llamaGuard4OutputGrammar.mjs";

export const ADAPTER_CONFIG = Object.freeze({
  target: "llama_guard_4_12b",
  surface: "input_only",
  model_id: "meta-llama/Llama-Guard-4-12B",
  decode: Object.freeze({ do_sample: false, temperature: 0, max_new_tokens: 64 }),
  version: "lg4-1",
});

export function labelToVerdict(label) {
  if (label === "safe") return "allow";
  if (label === "unsafe") return "block";
  return "abstain";
}

export function frozenCaptureObservations(capture) {
  const cases = Array.isArray(capture?.cases) ? capture.cases : [];
  return cases
    .map((c) => {
      const { label, error_code } = parseLlamaGuard4(c.raw_lg4_output);
      const verdict = error_code === "malformed_output" ? "error" : labelToVerdict(label);
      return validateObservation({
        adapter_schema: ADAPTER_SCHEMA,
        target: ADAPTER_CONFIG.target,
        case_id: c.case_id,
        raw_output_ref: "local-only",
        normalised_verdict: verdict,
        confidence_bucket: "not_reported",
        latency_bucket_ms: "0-100",
        error_code,
      });
    })
    .sort((a, b) => a.case_id.localeCompare(b.case_id));
}

export function buildExternalDefenseManifest(observations) {
  const byVerdict = {};
  for (const o of observations)
    byVerdict[o.normalised_verdict] = (byVerdict[o.normalised_verdict] ?? 0) + 1;
  return {
    schema: "simurgh.stage3vb.external_defense_manifest.v1",
    adapter_config: ADAPTER_CONFIG,
    observation_count: observations.length,
    verdict_histogram: byVerdict,
    case_ids: observations.map((o) => o.case_id).sort(),
  };
}

export function renderLlamaGuard4PromptSpec() {
  // Binds the rendering DECISION. The exact input strings are bound by input_manifest_hash and
  // the template itself by capture_provenance.chat_template_hash.
  return Object.freeze({
    surface: "user_task",
    wrapper: "llama_guard_4_official_chat_template",
    role: "user",
  });
}

export function assertCaptureIntegrity(capture, corpus = buildStage3lCorpus()) {
  const cases = Array.isArray(capture?.cases) ? capture.cases : [];
  const ids = cases.map((c) => c.case_id);
  const unique = new Set(ids);
  const corpusIds = new Set(corpus.map((fx) => fx.case_id));
  const userTasks = new Set(corpus.map((fx) => fx.user_task));
  const missingOutputs = cases.filter(
    (c) => !(typeof c.raw_lg4_output === "string" && c.raw_lg4_output.length > 0)
  ).length;
  const duplicate = ids.length - unique.size;
  const matches = unique.size === corpusIds.size && [...unique].every((id) => corpusIds.has(id));
  const promptEchoed = cases.some((c) => userTasks.has(c.raw_lg4_output));
  if (cases.length !== corpus.length)
    throw new Error(`capture_integrity_failed:case_count(${cases.length}!=${corpus.length})`);
  if (duplicate > 0) throw new Error("capture_integrity_failed:duplicate_case_ids");
  if (!matches) throw new Error("capture_integrity_failed:case_ids_mismatch");
  if (missingOutputs > 0) throw new Error("capture_integrity_failed:missing_outputs");
  if (promptEchoed) throw new Error("capture_integrity_failed:raw_prompt_echoed");
  return {
    raw_capture_cases: cases.length,
    unique_case_ids: unique.size,
    matches_stage3l_case_ids: matches,
    missing_outputs: missingOutputs,
    duplicate_outputs: duplicate,
    raw_prompts_exported: promptEchoed,
  };
}
