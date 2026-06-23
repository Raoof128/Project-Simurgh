// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-B capture-side preflight: the committed frozen-capture replay artifact must cover the
// whole 3L corpus, with unique ids, no missing outputs, no echoed prompts. Fail-closed.
import { readFileSync } from "node:fs";
import { buildStage3lCorpus } from "../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";
import { assertCaptureIntegrity } from "../tools/external-defense-adapters/llamaGuard4Adapter.mjs";

const REPLAY =
  "docs/research/llm-shield/evidence/stage-3v-b/capture-replay/lg4-frozen-capture.json";

export function assertCommittedCaptureIntegrity() {
  const capture = JSON.parse(readFileSync(REPLAY, "utf8"));
  return assertCaptureIntegrity(capture, buildStage3lCorpus());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(assertCommittedCaptureIntegrity(), null, 2));
  } catch (e) {
    console.error("stage3vb capture-integrity preflight:", e.message);
    process.exit(1);
  }
}
