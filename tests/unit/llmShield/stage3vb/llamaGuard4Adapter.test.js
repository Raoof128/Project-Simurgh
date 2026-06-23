import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStage3lCorpus } from "../../../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";
import {
  ADAPTER_CONFIG,
  labelToVerdict,
  frozenCaptureObservations,
  buildExternalDefenseManifest,
  renderLlamaGuard4PromptSpec,
  assertCaptureIntegrity,
} from "../../../../tools/external-defense-adapters/llamaGuard4Adapter.mjs";

const corpus = buildStage3lCorpus();
const okCapture = {
  cases: corpus
    .map((fx) => ({
      case_id: fx.case_id,
      raw_lg4_output: fx.case_id.includes("benign")
        ? "safe"
        : fx.case_id.includes("direct_input_attack")
          ? "unsafe\nS14"
          : "safe",
    }))
    .sort((a, b) => a.case_id.localeCompare(b.case_id)),
};

test("ADAPTER_CONFIG is frozen and input-only", () => {
  assert.equal(ADAPTER_CONFIG.target, "llama_guard_4_12b");
  assert.equal(ADAPTER_CONFIG.surface, "input_only");
  assert.equal(Object.isFrozen(ADAPTER_CONFIG), true);
});
test("labelToVerdict maps grammar labels", () => {
  assert.equal(labelToVerdict("safe"), "allow");
  assert.equal(labelToVerdict("unsafe"), "block");
  assert.equal(labelToVerdict("unknown"), "abstain");
});
test("frozenCaptureObservations validates one obs per case", () => {
  const obs = frozenCaptureObservations(okCapture);
  assert.equal(obs.length, 180);
  assert.equal(
    obs.every((o) => o.adapter_schema === "simurgh.external_defense_adapter.v1"),
    true
  );
  assert.equal(
    obs.every((o) => o.raw_output_ref === "local-only"),
    true
  );
});
test("malformed raw output normalises to error verdict", () => {
  const cap = {
    cases: okCapture.cases.map((c, i) => (i === 0 ? { ...c, raw_lg4_output: "???" } : c)),
  };
  const obs = frozenCaptureObservations(cap);
  const bad = obs.find((o) => o.case_id === cap.cases[0].case_id);
  assert.equal(bad.normalised_verdict, "error");
  assert.equal(bad.error_code, "malformed_output");
});
test("manifest histograms verdicts", () => {
  const m = buildExternalDefenseManifest(frozenCaptureObservations(okCapture));
  assert.equal(m.observation_count, 180);
  assert.equal(m.schema, "simurgh.stage3vb.external_defense_manifest.v1");
});
test("prompt rendering spec is frozen", () => {
  const s = renderLlamaGuard4PromptSpec();
  assert.equal(s.surface, "user_task");
  assert.equal(Object.isFrozen(s), true);
});
test("capture integrity passes for a complete capture", () => {
  const r = assertCaptureIntegrity(okCapture, corpus);
  assert.equal(r.raw_capture_cases, 180);
  assert.equal(r.matches_stage3l_case_ids, true);
  assert.equal(r.missing_outputs, 0);
  assert.equal(r.duplicate_outputs, 0);
  assert.equal(r.raw_prompts_exported, false);
});
test("capture integrity throws on missing case", () => {
  const cap = { cases: okCapture.cases.slice(0, 179) };
  assert.throws(() => assertCaptureIntegrity(cap, corpus), /capture_integrity_failed/);
});
test("capture integrity throws when a prompt is echoed", () => {
  const cap = {
    cases: okCapture.cases.map((c, i) =>
      i === 0 ? { ...c, raw_lg4_output: corpus[0].user_task } : c
    ),
  };
  assert.throws(
    () => assertCaptureIntegrity(cap, corpus),
    /capture_integrity_failed:raw_prompt_echoed/
  );
});
