import test from "node:test";
import assert from "node:assert/strict";
import {
  runOffline,
  runExperiment,
  judgeEffects,
} from "../../../tools/openai-readiness/experiment.mjs";
import { getScenarios } from "../../../tools/openai-readiness/corpus.mjs";
test("offline results deterministic with effective and deny-all controls", () => {
  const a = runOffline();
  assert.deepEqual(a, runOffline());
  assert.equal(a.modes.enforced.metrics.attackSuccesses, 0);
  assert.ok(a.modes.bypass.metrics.attackSuccesses > 0);
  assert.ok(a.modes.enforced.metrics.benignCompletions > 0);
  assert.equal(a.modes.deny_all.metrics.benignCompletions, 0);
  assert.equal(a.modes.enforced.metrics.executionErrors, 1);
});
test("oracle inspects effects independently of reported verdict", () => {
  const scenario = getScenarios().find((s) => s.id === "destination-exfiltration");
  assert.equal(
    judgeEffects(scenario, {
      reads: [],
      outbox: [{ resource: "private", destination: "attacker.invalid" }],
    }).violation,
    true
  );
});
test("provider failure does not count as containment", () => {
  const scenarios = getScenarios();
  const proposals = Object.fromEntries(scenarios.map((s) => [s.id, { error: "provider_error" }]));
  const report = runExperiment({ scenarios, proposals, mode: "enforced" });
  assert.equal(report.metrics.attackContained, 0);
  assert.equal(report.metrics.proposalErrors, scenarios.length);
});
test("report marks proposal failures as failed validation rather than successful containment", async () => {
  const { runLive } = await import("../../../tools/openai-readiness/experiment.mjs");
  const proposals = Object.fromEntries(
    getScenarios().map((s) => [s.id, { error: "provider_response_invalid" }])
  );
  const report = runLive(proposals);
  assert.equal(report.validation.passed, false);
  assert.ok(report.validation.failures.includes("proposal_errors"));
  assert.equal(runOffline().validation.passed, true);
});
