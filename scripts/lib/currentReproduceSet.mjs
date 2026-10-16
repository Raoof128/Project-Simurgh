// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export const BASELINE = "docs/research/llm-shield/evidence/stage-5s/prior-reproduce-set.json";
export const CURRENT = "docs/research/maintenance-phase-16/prior-reproduce-set.v2.json";
export const SELF = "reproduce-llm-shield-stage5s.sh";
export function validateCurrentSet(manifest, baselineBytes, discovered) {
  assert.equal(manifest.schema, "simurgh.prior-reproduce-set.v2");
  assert.equal(
    createHash("sha256").update(baselineBytes).digest("hex"),
    manifest.baseline_sha256,
    "historical baseline digest changed"
  );
  const historical = JSON.parse(baselineBytes).scripts;
  for (const list of [historical, manifest.scripts, discovered]) {
    assert.ok(Array.isArray(list) && list.length > 0, "empty inventory refused");
    assert.equal(new Set(list).size, list.length, "duplicate script refused");
    assert.ok(
      list.every(
        (s) => typeof s === "string" && /^reproduce-[a-zA-Z0-9-]+\.sh$/.test(s) && s !== SELF
      ),
      "invalid script identity"
    );
  }
  assert.ok(
    historical.every((s) => manifest.scripts.includes(s)),
    "historical member omitted"
  );
  const added = discovered.filter((s) => !manifest.scripts.includes(s));
  const removed = manifest.scripts.filter((s) => !discovered.includes(s));
  assert.deepEqual(
    { added, removed },
    { added: [], removed: [] },
    "REFUSED — the prior set drifted from its pin"
  );
  return [...manifest.scripts].sort();
}
export function currentScripts(root = ".") {
  const bytes = readFileSync(resolve(root, BASELINE));
  const manifest = JSON.parse(readFileSync(resolve(root, CURRENT), "utf8"));
  const discovered = readdirSync(resolve(root, "scripts"))
    .filter((s) => /^reproduce-.*\.sh$/.test(s) && s !== SELF)
    .sort();
  return validateCurrentSet(manifest, bytes, discovered);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(currentScripts().join("\n"));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
