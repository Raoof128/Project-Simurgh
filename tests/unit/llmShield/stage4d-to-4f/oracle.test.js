// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  evaluateOracle,
  resultReason,
} from "../../../../tools/simurgh-attestation/stage4d-to-4f/oracle.mjs";

async function writeJson(root, rel, value) {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("resultReason reads first_failure.reason", () => {
  assert.equal(
    resultReason({ first_failure: { reason: "replayed_decision_mismatch" } }),
    "replayed_decision_mismatch"
  );
  assert.equal(resultReason({ failed_reason: "missing_cell" }), "missing_cell");
  assert.equal(resultReason({}), null);
});

test("evaluateOracle accepts clean green and red expected failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-oracle-"));
  await writeJson(root, "clean.json", { ok: true, exit_code: 0, first_failure: null });
  await writeJson(root, "red.json", {
    ok: false,
    exit_code: 1,
    first_failure: { reason: "replayed_decision_mismatch" },
  });
  const result = await evaluateOracle({
    root,
    expectations: [
      {
        stage: "4D",
        arm: "clean",
        artifact_kind: "clean",
        path: "clean.json",
        expected_exit: 0,
        expected_reason: null,
      },
      {
        stage: "4E",
        arm: "red",
        artifact_kind: "red_arm",
        path: "red.json",
        expected_exit: 1,
        expected_reason: "replayed_decision_mismatch",
      },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(
    result.entries.every((entry) => entry.pass),
    true
  );
});

test("evaluateOracle rejects red arm success and wrong reason", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-oracle-bad-"));
  await writeJson(root, "red-success.json", { ok: true, exit_code: 0, first_failure: null });
  await writeJson(root, "wrong-reason.json", {
    ok: false,
    exit_code: 1,
    first_failure: { reason: "grid_hash_mismatch" },
  });
  const result = await evaluateOracle({
    root,
    expectations: [
      {
        stage: "4F",
        arm: "red-success",
        artifact_kind: "red_arm",
        path: "red-success.json",
        expected_exit: 1,
        expected_reason: "missing_cell",
      },
      {
        stage: "4F",
        arm: "wrong-reason",
        artifact_kind: "red_arm",
        path: "wrong-reason.json",
        expected_exit: 1,
        expected_reason: "missing_cell",
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.reason),
    ["unexpected_red_arm_success", "unexpected_red_arm_reason"]
  );
});
