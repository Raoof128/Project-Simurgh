// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E-core privacy audit. Scans ONLY generated evidence (metrics.json,
// *-output.txt gate outputs, receipt-samples/**). Deliberately EXCLUDES
// openapi.json (it documents forbidden field NAMES in its descriptions) and
// fixtures/** (synthetic by design). Separately asserts recorded-fixture
// provenance and that the gateway receipt builder exposes no raw-text keys.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

let failures = 0;
const fail = (m) => {
  console.error(`[FAIL] ${m}`);
  failures++;
};
const ok = (m) => console.log(`[PASS] ${m}`);

const ROOT = "docs/research/llm-shield/evidence/stage-3e";
const FORBIDDEN = [
  "raw_input",
  "raw_provider_output",
  "provider_request_body",
  "provider_response_body",
  "api_key",
  "authorization",
  "x-api-key",
  "anthropic_api_key",
  "openai_api_key",
  "system_prompt",
  "developer_prompt",
  "tool_args",
];

// 1. Scan generated evidence only (exclude openapi.json + fixtures/).
const generated = [];
const topLevel = [
  "metrics.json",
  "smoke-output.txt",
  "security-audit-output.txt",
  "privacy-audit-output.txt",
  "docker-smoke-output.txt",
];
for (const f of topLevel) {
  try {
    generated.push([f, await readFile(join(ROOT, f), "utf8")]);
  } catch {
    /* optional */
  }
}
try {
  for (const f of await readdir(join(ROOT, "receipt-samples"))) {
    if (f.endsWith(".json"))
      generated.push([
        `receipt-samples/${f}`,
        await readFile(join(ROOT, "receipt-samples", f), "utf8"),
      ]);
  }
} catch {
  /* optional */
}
// Flag a forbidden token only in KEY/VALUE position (api_key": "...", api_key=...),
// not as a bare word. This avoids false positives on (a) safe accounting fields
// like api_key_leak_count and (b) audit/gate-output prose that names the forbidden
// fields in its own assertion labels ("api_key rejected"). A real leaked
// key/value is always followed by a quote/colon/equals.
let leaks = 0;
for (const [name, content] of generated) {
  for (const key of FORBIDDEN) {
    if (new RegExp(`${key}"?\\s*[:=]`).test(content)) {
      fail(`${name} contains forbidden token "${key}" in key/value position`);
      leaks++;
    }
  }
}
leaks === 0
  ? ok(`generated evidence is metadata-only (${generated.length} file(s) scanned)`)
  : null;

// 2. Recorded fixtures must all be synthetic.
const recordedDirs = ["recorded_fixture", "provider_error", "output_firewall", "tool_request"];
let nonSynthetic = 0;
for (const d of recordedDirs) {
  let files;
  try {
    files = await readdir(join(ROOT, "fixtures", d));
  } catch {
    continue;
  }
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const fx = JSON.parse(await readFile(join(ROOT, "fixtures", d, f), "utf8"));
    if (fx.provenance !== "synthetic") {
      fail(`${d}/${f} provenance is not synthetic`);
      nonSynthetic++;
    }
  }
}
nonSynthetic === 0 ? ok("all recorded fixtures are provenance=synthetic") : null;

// 3. Gateway receipt builder exposes no raw-text keys.
const receipt = await readFile("src/llmShield/gateway/gatewayReceipt.js", "utf8");
const stripped = receipt.replace(
  /input_hash|normalised_input_hash|output_hash|context_hashes|provider_response_hash/g,
  ""
);
/(^|[^_])\binput\s*:|(^|[^_])\boutput\s*:|provider_response_body|\bapi_key\s*:/m.test(stripped)
  ? fail("gatewayReceipt.js may expose raw input/output/body")
  : ok("gateway receipt is hash-only");

console.log("");
console.log(
  `privacy-audit-llm-shield-stage3e: ${failures === 0 ? "passed" : failures + " failed"}`
);
process.exit(failures === 0 ? 0 : 1);
