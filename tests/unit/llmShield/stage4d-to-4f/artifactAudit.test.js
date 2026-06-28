// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  auditStableArtifacts,
  compareSnapshots,
  snapshotFiles,
} from "../../../../tools/simurgh-attestation/stage4d-to-4f/artifactAudit.mjs";

async function writeText(root, rel, text) {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

test("artifact audit rejects volatile fields and raw logs", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-audit-"));
  await writeText(
    root,
    "bad.json",
    JSON.stringify(
      {
        timestamp: "2026-06-29T00:00:00Z",
        stdout: "raw output",
        path: "/Users/example/project",
      },
      null,
      2
    )
  );
  const result = await auditStableArtifacts({ root, files: ["bad.json"] });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.reason),
    ["volatile_artifact_field", "raw_log_in_stable_artifact", "volatile_artifact_field"]
  );
});

test("snapshot comparison detects stage artifact mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-snapshot-"));
  await writeText(root, "stage/file.json", '{"ok":true}\n');
  const before = await snapshotFiles({ root, files: ["stage/file.json"] });
  await writeText(root, "stage/file.json", '{"ok":false}\n');
  const after = await snapshotFiles({ root, files: ["stage/file.json"] });
  const result = compareSnapshots(before, after);
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "stage_artifact_mutation_attempted");
});
