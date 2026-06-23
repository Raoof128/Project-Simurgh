// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-B corpus preflight: every Stage 3L case must expose exactly one non-empty feedable
// user-input string (user_task). Fail-closed. No synthetic fallback is ever used.
import { buildStage3lCorpus } from "../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

export function assertFeedableInputs() {
  const corpus = buildStage3lCorpus();
  const missing = corpus
    .filter((fx) => !(typeof fx.user_task === "string" && fx.user_task.trim().length > 0))
    .map((fx) => fx.case_id);
  if (missing.length > 0) throw new Error(`feedable_input_preflight_failed:${missing.join(",")}`);
  return {
    stage3l_cases: corpus.length,
    feedable_input_cases: corpus.length - missing.length,
    missing_input_cases: missing.length,
    input_surface: "user_task",
    synthetic_render_used: false,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(assertFeedableInputs(), null, 2));
  } catch (e) {
    console.error("stage3vb feedable-input preflight:", e.message);
    process.exit(1);
  }
}
