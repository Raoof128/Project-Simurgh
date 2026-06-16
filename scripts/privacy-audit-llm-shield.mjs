// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3B LLM Shield privacy audit. Fixtures may contain raw payloads; generated
// evidence (metrics, receipts) and the shield source must NOT leak raw payloads,
// and mock-only modules must not import network/provider SDKs.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

let failures = 0;
const fail = (m) => {
  console.error(`[FAIL] ${m}`);
  failures++;
};
const ok = (m) => console.log(`[PASS] ${m}`);

const ROOT = "docs/research/llm-shield/evidence/stage-3b";
const FIXTURE_ROOT = join(ROOT, "fixtures");

// Collect fixture payloads.
const payloads = [];
for (const cls of await readdir(FIXTURE_ROOT)) {
  const dir = join(FIXTURE_ROOT, cls);
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".json")) continue;
    payloads.push(JSON.parse(await readFile(join(dir, file), "utf8")).payload);
  }
}

// 1. metrics.json must not contain any raw payload substring.
const metrics = await readFile(join(ROOT, "metrics.json"), "utf8");
const leaked = payloads.filter((p) => p.length > 8 && metrics.includes(p));
leaked.length === 0
  ? ok("metrics.json is metadata-only")
  : fail(`metrics.json leaks ${leaked.length} payload(s)`);

// 2. Receipt builder exposes no raw-text keys.
const receipt = await readFile("src/llmShield/safetyReceipt.js", "utf8");
/(^|[^_])\binput\s*:|output\s*:/m.test(receipt.replace(/input_hash|normalised_input_hash/g, ""))
  ? fail("safetyReceipt.js may expose raw input/output")
  : ok("receipt is hash-only");

// 3. Mock-only module imports no network/provider SDK.
const mock = await readFile("src/llmShield/mockLlmProvider.js", "utf8");
/(anthropic|openai|node:https?|node-fetch|\bfetch\()/i.test(mock)
  ? fail("mockLlmProvider.js imports network/provider")
  : ok("mock provider has no network imports");

// 4. No prompt logging in shield source.
for (const f of await readdir("src/llmShield")) {
  if (!f.endsWith(".js")) continue;
  const src = await readFile(join("src/llmShield", f), "utf8");
  if (/console\.(log|info|debug)\([^)]*\b(input|prompt|payload)\b/i.test(src)) {
    fail(`possible prompt logging in ${f}`);
  }
}
ok("no prompt logging in shield source");

console.log("");
if (failures > 0) {
  console.error(`privacy-audit-llm-shield: ${failures} failure(s)`);
  process.exit(1);
}
console.log("privacy-audit-llm-shield: PASS");
