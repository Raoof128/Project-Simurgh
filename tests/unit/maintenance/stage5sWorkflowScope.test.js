import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(".github/workflows/stage-5s-checks.yml", "utf8");
const block = workflow.split("      - name: Write surface\n")[1]?.split("      - name:")[0];

test("historical Stage 5S write authority covers its own push and PR branches", () => {
  assert.ok(block, "the write-surface step must remain present");
  const condition = block.match(/^\s+if: (.+)$/m)?.[1];
  assert.ok(condition, "historical authority must not judge every successor PR");
  const stage = "stage-5s-vwq-verifiable-witness-quorum";
  for (const [head_ref, ref_name, expected] of [
    [stage, "123/merge", true],
    ["", stage, true],
    ["openai-readiness", "138/merge", false],
    ["fix/ci-readme-header", "139/merge", false],
    ["", "main", false],
  ]) {
    assert.equal(runInNewContext(condition, { github: { head_ref, ref_name } }), expected);
  }
  assert.match(block, /checkWriteSurface\.mjs --range "origin\/main\.\.\.HEAD"/);
});

test("successors retain Stage 5S tests, proof verification and full reproduction", () => {
  for (const name of [
    "Unit and e2e suites",
    "Lean proofs (repo-wide gate, floor 39)",
    "Reproduce",
  ]) {
    const step = workflow.split(`      - name: ${name}\n`)[1]?.split("      - name:")[0];
    assert.ok(step, `${name} must remain present`);
    assert.doesNotMatch(step, /^\s+if:/m, `${name} must run on successor branches`);
    assert.match(step, /^\s+run:/m);
  }
});
