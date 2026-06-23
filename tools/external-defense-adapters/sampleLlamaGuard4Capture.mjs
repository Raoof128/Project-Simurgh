// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic CI-safe SAMPLE capture in real Llama Guard 4 grammar. Machinery-only: used to
// build and test the 3V-B machine without a GPU. The real release REPLACES this artifact with
// the RunPod capture (live:true). Never tag v2.6.0 from a sample.
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { buildStage3lCorpus } from "../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

const REPLAY_PATH =
  "docs/research/llm-shield/evidence/stage-3v-b/capture-replay/lg4-frozen-capture.json";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

function sampleOutput(caseId) {
  if (caseId.includes("benign")) return "safe";
  if (caseId.includes("direct_input_attack")) return "unsafe\nS14";
  const n = Number(caseId.slice(-3)) || 0;
  return ["safe", "unsafe\nS1", "safe"][n % 3];
}

export function buildSampleCapture() {
  const cases = buildStage3lCorpus()
    .map((fx) => ({ case_id: fx.case_id, raw_lg4_output: sampleOutput(fx.case_id) }))
    .sort((a, b) => a.case_id.localeCompare(b.case_id));
  return {
    schema: "simurgh.stage3vb.frozen_lg4_capture.v1",
    live: false,
    capture_environment: "sample_deterministic",
    contains_raw_prompts: false,
    contains_hf_token: false,
    contains_secrets: false,
    capture_provenance: {
      model_id: "meta-llama/Llama-Guard-4-12B",
      hf_model_commit: "sample-deterministic",
      hf_model_snapshot_digest: "sha256:" + "0".repeat(64),
      tokenizer_config_digest: "sha256:" + "0".repeat(64),
      chat_template_hash: "sha256:" + "0".repeat(64),
      transformers_version: "sample",
      torch_version: "sample",
      cuda_version: "sample",
      gpu: "sample-no-gpu",
      python_version: "sample",
      captured_at_utc: "1970-01-01T00:00:00Z",
      capture_origin: "self_reported_capture_environment",
      model_weights_digest_source: "capture_environment_self_reported",
      model_weights_recomputed_by_verifier: false,
    },
    cases,
  };
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("--write")) {
  await mkdir(dirname(REPLAY_PATH), { recursive: true });
  await writeFile(REPLAY_PATH, stable(buildSampleCapture()));
  console.log("stage3vb: wrote SAMPLE capture-replay artifact to", REPLAY_PATH);
}
