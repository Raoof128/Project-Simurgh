import { test } from "node:test";
import assert from "node:assert/strict";
import { harnessComputeStage3vbHashes } from "../../../../tools/external-defense-adapters/captureProvenanceHashes.mjs";

const base = {
  rawOutputsConcat: "safe\nunsafe\nS14",
  normalisedVerdict: [{ case_id: "a", verdict: "allow" }],
  adapterConfig: { target: "llama_guard_4_12b" },
  captureProvenance: { model_id: "meta-llama/Llama-Guard-4-12B" },
  captureFileObject: { schema: "simurgh.stage3vb.frozen_lg4_capture.v1", cases: [] },
  captureScriptText: "print('capture')\n",
  promptRenderingSpec: { surface: "user_task" },
};

test("computes exactly seven sha256-prefixed hashes", () => {
  const h = harnessComputeStage3vbHashes(base);
  const keys = Object.keys(h).sort();
  assert.deepEqual(keys, [
    "adapter_config_hash",
    "capture_file_hash",
    "capture_provenance_hash",
    "capture_script_hash",
    "external_normalised_verdict_hash",
    "external_raw_output_hash",
    "prompt_rendering_hash",
  ]);
  assert.equal(
    Object.values(h).every((v) => v.startsWith("sha256:")),
    true
  );
});
test("is deterministic", () => {
  assert.deepEqual(harnessComputeStage3vbHashes(base), harnessComputeStage3vbHashes(base));
});
test("capture_file_hash is canonical (key-order independent)", () => {
  const a = harnessComputeStage3vbHashes(base);
  const b = harnessComputeStage3vbHashes({
    ...base,
    captureFileObject: { cases: [], schema: "simurgh.stage3vb.frozen_lg4_capture.v1" },
  });
  assert.equal(a.capture_file_hash, b.capture_file_hash);
});
