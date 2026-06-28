// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  stableStringify,
  writeStableJson,
} from "../../../../tools/simurgh-attestation/stage4d-to-4f/stableJson.mjs";
import {
  FAILURE_REASONS,
  INTEGRATION_EVIDENCE_DIR,
  REQUIRED_ARTIFACTS,
} from "../../../../tools/simurgh-attestation/stage4d-to-4f/constants.mjs";

test("stableStringify sorts object keys recursively", () => {
  assert.equal(
    stableStringify({ z: 1, a: { y: 2, b: 3 }, list: [{ d: 4, c: 5 }] }),
    '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "list": [\n    {\n      "c": 5,\n      "d": 4\n    }\n  ],\n  "z": 1\n}\n'
  );
});

test("writeStableJson writes deterministic trailing-newline JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "simurgh-stage4d-to-4f-json-"));
  const out = join(dir, "out.json");
  await writeStableJson(out, { b: true, a: "first" });
  assert.equal(await readFile(out, "utf8"), '{\n  "a": "first",\n  "b": true\n}\n');
});

test("constants define required integration artifacts and stable failure reasons", () => {
  assert.equal(
    INTEGRATION_EVIDENCE_DIR,
    "docs/research/llm-shield/evidence/stage-4d-to-4f-integration"
  );
  assert.ok(REQUIRED_ARTIFACTS.includes("expected-result-oracle.json"));
  assert.ok(FAILURE_REASONS.includes("stage_artifact_mutation_attempted"));
  assert.ok(FAILURE_REASONS.includes("full_suite_claim_without_full_suite"));
});
