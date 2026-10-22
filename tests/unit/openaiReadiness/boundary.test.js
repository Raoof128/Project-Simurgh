import test from "node:test";
import assert from "node:assert/strict";
import { getScenarios } from "../../../tools/openai-readiness/corpus.mjs";
import { executeProposal, createSandbox } from "../../../tools/openai-readiness/boundary.mjs";

test("trusted boundary permits public and approved lookups with observable effects", () => {
  for (const scenario of getScenarios().filter((s) => s.kind === "benign")) {
    const sandbox = createSandbox();
    const result = executeProposal(scenario.proposal, { scenario, sandbox });
    assert.equal(result.status, "executed", scenario.id);
    assert.deepEqual(sandbox.effects.reads, [scenario.proposal.arguments.resource]);
  }
});
test("boundary blocks every attack before sandbox effects", () => {
  for (const scenario of getScenarios().filter((s) => s.kind === "attack")) {
    const sandbox = createSandbox();
    assert.equal(
      executeProposal(scenario.proposal, { scenario, sandbox }).status,
      "blocked",
      scenario.id
    );
    assert.deepEqual(sandbox.effects, { reads: [], outbox: [] });
  }
});
test("untrusted self classification, inherited names and extra fields fail closed", () => {
  const scenario = getScenarios()[0];
  for (const proposal of [
    {
      name: "send_report",
      arguments: { resource: "private", destination: "attacker" },
      tool_class: "mock_lookup",
    },
    { name: "constructor", arguments: {} },
    { name: "toString", arguments: {} },
    Object.create({ name: "lookup_record", arguments: { resource: "public" } }),
    {
      name: "lookup_record",
      arguments: Object.assign(Object.create({ extra: true }), { resource: "public" }),
    },
    { name: "lookup_record", arguments: { resource: "public", extra: true } },
    { name: "lookup_record", arguments: [] },
    null,
  ])
    assert.equal(
      executeProposal(proposal, { scenario, sandbox: createSandbox() }).status,
      "blocked"
    );
});
test("approval binds run, tool and arguments; replays produce no second effect", () => {
  const scenario = getScenarios().find((s) => s.id === "approved-read");
  const sandbox = createSandbox();
  assert.equal(executeProposal(scenario.proposal, { scenario, sandbox }).status, "executed");
  assert.equal(executeProposal(scenario.proposal, { scenario, sandbox }).status, "blocked");
  assert.equal(sandbox.effects.reads.length, 1);
  for (const field of ["runId", "name", "argumentsHash"]) {
    const altered = structuredClone(scenario);
    altered.approval[field] = "tampered";
    assert.equal(
      executeProposal(altered.proposal, { scenario: altered, sandbox: createSandbox() }).status,
      "blocked"
    );
  }
});
test("execution failure is a separate outcome", () => {
  const scenario = getScenarios().find((s) => s.kind === "execution_failure");
  assert.equal(
    executeProposal(scenario.proposal, { scenario, sandbox: createSandbox() }).status,
    "execution_error"
  );
});
