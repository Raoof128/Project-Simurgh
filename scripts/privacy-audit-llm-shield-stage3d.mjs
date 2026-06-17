// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3D privacy audit. Fixtures may hold raw payloads/outputs; metrics.json,
// receipt samples, and the 3D receipt builder must be metadata-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

let failures = 0;
const fail = (m) => {
  console.error(`[FAIL] ${m}`);
  failures++;
};
const ok = (m) => console.log(`[PASS] ${m}`);

const ROOT = "docs/research/llm-shield/evidence/stage-3d";
const FIXTURE_ROOT = join(ROOT, "fixtures");

// Collect fixture raw strings (inputs, context contents, mock outputs, turns).
const raw = [];
const pushTurn = (t) => {
  if (typeof t?.input === "string") raw.push(t.input);
  if (typeof t?.mock_provider_output === "string") raw.push(t.mock_provider_output);
  for (const c of t?.contexts ?? []) if (typeof c?.content === "string") raw.push(c.content);
};
for (const cat of await readdir(FIXTURE_ROOT)) {
  const dir = join(FIXTURE_ROOT, cat);
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".json")) continue;
    const fx = JSON.parse(await readFile(join(dir, file), "utf8"));
    pushTurn(fx);
    for (const t of fx.turns ?? []) pushTurn(t);
  }
}

// 1. metrics.json must not contain any raw payload substring.
const metrics = await readFile(join(ROOT, "metrics.json"), "utf8");
const leaked = raw.filter((p) => p.length > 8 && metrics.includes(p));
leaked.length === 0
  ? ok("metrics.json is metadata-only")
  : fail(`metrics.json leaks ${leaked.length} payload(s)`);

// 2. 3D receipt builder exposes no raw-text keys.
const receipt = await readFile("src/llmShield/stage3dReceipt.js", "utf8");
const stripped = receipt.replace(
  /input_hash|normalised_input_hash|output_hash|context_hashes|tool_name_hash/g,
  ""
);
/(^|[^_])\binput\s*:|(^|[^_])\boutput\s*:|\bcontent\s*:/m.test(stripped)
  ? fail("stage3dReceipt.js may expose raw input/output/content")
  : ok("3D receipt is hash-only");

console.log("");
console.log(
  `privacy-audit-llm-shield-stage3d: ${failures === 0 ? "passed" : failures + " failed"}`
);
process.exit(failures === 0 ? 0 : 1);
