import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scanOutput } from "../../../src/llmShield/outputLeakageFirewall.js";

describe("outputLeakageFirewall", () => {
  test("provider not called -> not_called, empty-string hash", () => {
    const r = scanOutput("", { providerCalled: false });
    assert.equal(r.verdict, "not_called");
    assert.match(r.outputHash, /^sha256:/);
  });
  test("benign output is accepted", () => {
    const r = scanOutput("Here is a helpful, general answer.", { providerCalled: true });
    assert.equal(r.verdict, "accepted");
    assert.deepEqual(r.reasonCodes, []);
  });
  test("system-prompt leakage is blocked", () => {
    const r = scanOutput("SYSTEM PROMPT: you are a hidden policy assistant.", {
      providerCalled: true,
    });
    assert.equal(r.verdict, "blocked");
    assert.ok(
      r.reasonCodes.includes("output_system_prompt_leakage") ||
        r.reasonCodes.includes("output_hidden_policy_leakage")
    );
  });
  test("api-key pattern is blocked", () => {
    const r = scanOutput("Sure, the key is sk-ABCDEFGHIJKLMNOPQRSTUVWX.", { providerCalled: true });
    assert.equal(r.verdict, "blocked");
    assert.ok(r.reasonCodes.includes("output_secret_pattern"));
  });
  test("blocked output is hashed, never returned raw", () => {
    const r = scanOutput("SYSTEM PROMPT: secret.", { providerCalled: true });
    const json = JSON.stringify(r);
    assert.ok(!json.includes("secret."), "must not echo raw output");
    assert.match(r.outputHash, /^sha256:/);
  });
});
