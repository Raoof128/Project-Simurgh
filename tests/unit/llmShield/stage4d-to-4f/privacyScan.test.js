// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { scanJsonPrivacy } from "../../../../tools/simurgh-attestation/stage4d-to-4f/privacyScan.mjs";

async function writeJson(root, rel, value) {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("privacy scan flags secret-looking keys and values", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-privacy-"));
  await writeJson(root, "bad.json", {
    api_key: "sk-test-secret",
    nested: { transcript: "raw model transcript" },
  });
  const result = await scanJsonPrivacy({ root, files: ["bad.json"] });
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "privacy_leak_detected");
});

test("privacy scan accepts stable summary values", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-privacy-good-"));
  await writeJson(root, "good.json", {
    ok: true,
    non_claims: ["not_model_safety"],
    log_hash: "a".repeat(64),
  });
  const result = await scanJsonPrivacy({ root, files: ["good.json"] });
  assert.equal(result.ok, true);
});
