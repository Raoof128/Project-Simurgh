import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  riskPointsFor,
  riskVerdict,
  RISK_THRESHOLDS,
} from "../../../src/llmShield/runRiskAccumulator.js";

describe("runRiskAccumulator", () => {
  test("thresholds: 0-2 safe, 3-5 warning, 6+ blocked", () => {
    assert.equal(riskVerdict(0), "safe");
    assert.equal(riskVerdict(2), "safe");
    assert.equal(riskVerdict(3), "warning");
    assert.equal(riskVerdict(5), "warning");
    assert.equal(riskVerdict(6), "blocked");
    assert.equal(RISK_THRESHOLDS.safeMax, 2);
  });
  test("a clean run scores 0", () => {
    assert.equal(
      riskPointsFor({
        inputVerdict: "safe",
        contextVerdict: "accepted",
        toolGateVerdict: "not_requested",
        outputFirewallVerdict: "accepted",
        repeatedWarning: false,
      }),
      0
    );
  });
  test("context rejection + blocked tool accumulate past the block threshold", () => {
    const pts = riskPointsFor({
      inputVerdict: "safe",
      contextVerdict: "rejected",
      toolGateVerdict: "blocked",
      outputFirewallVerdict: "accepted",
      repeatedWarning: false,
    });
    assert.ok(pts >= 6, `expected >= 6, got ${pts}`);
    assert.equal(riskVerdict(pts), "blocked");
  });
  test("a single input warning stays below the block threshold", () => {
    // One soft signal (+2) is safe-tier under the locked weights; escalation
    // requires accumulation (e.g. a repeated warning), so a lone warning must
    // never reach `blocked`.
    const pts = riskPointsFor({
      inputVerdict: "warning",
      contextVerdict: "not_supplied",
      toolGateVerdict: "not_requested",
      outputFirewallVerdict: "accepted",
      repeatedWarning: false,
    });
    assert.equal(pts, 2);
    assert.notEqual(riskVerdict(pts), "blocked");
  });

  test("a repeated warning accumulates into the warning tier", () => {
    const pts = riskPointsFor({
      inputVerdict: "warning",
      contextVerdict: "not_supplied",
      toolGateVerdict: "not_requested",
      outputFirewallVerdict: "accepted",
      repeatedWarning: true,
    });
    assert.equal(riskVerdict(pts), "warning");
  });
});
