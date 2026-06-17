import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3D_SCENARIOS,
  SCENARIO_NAMES,
  isValidScenario,
  getScenario,
} from "../../../src/llmShield/stage3dMockScenarios.js";

describe("stage3dMockScenarios", () => {
  test("exposes exactly the six committed scenarios", () => {
    assert.deepEqual([...SCENARIO_NAMES].sort(), [
      "benign",
      "context_poisoning",
      "hard_negative",
      "multi_turn_softening",
      "policy_leak",
      "tool_escalation",
    ]);
  });

  test("tool_escalation carries a tool_request; benign does not", () => {
    assert.ok(getScenario("tool_escalation").tool_request);
    assert.equal(getScenario("benign").tool_request, null);
  });

  test("isValidScenario rejects unknown names", () => {
    assert.equal(isValidScenario("benign"), true);
    assert.equal(isValidScenario("rm_-rf"), false);
  });

  test("no scenario output echoes a realistic secret/provider prompt", () => {
    for (const name of SCENARIO_NAMES) {
      const out = getScenario(name).output;
      assert.ok(!/sk-[a-z0-9]{20,}/i.test(out), `${name} must not contain a real-looking key`);
    }
  });

  test("STAGE3D_SCENARIOS is frozen", () => {
    assert.ok(Object.isFrozen(STAGE3D_SCENARIOS));
  });
});
