#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q privacy scan (4Q spec §4.3, frozen wording):
//   Committed 4Q fixtures and evidence must contain digests, enums, schema names, public
//   keys, and synthetic fixture labels only. They must not contain raw prompts, raw tool
//   arguments, raw endpoints, hostnames, account IDs, API keys, private keys, email
//   addresses, or real user approvals. Public keys are allowed only in explicit public-key
//   fields or test-key allowlisted paths.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  "tests/fixtures/llmShield/stage4q/lane-a",
  "tests/fixtures/llmShield/stage4q/lane-b",
  "tests/fixtures/llmShield/stage4q/invention",
  "docs/research/llm-shield/evidence/stage-4q",
];
const SINGLE = ["tests/fixtures/llmShield/stage4q/stage4n-anchor.json"];
// test-keys/*.pem are committed insecure fixtures allowlisted by the 3M/3O key audits.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const URL = /https?:\/\/[A-Za-z0-9.-]+/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const B64 = /^[A-Za-z0-9+/]{44,}={0,2}$/; // single-line base64 blob
const ALLOWED_OPAQUE_KEYS = new Set(["signature"]);

const failures = [];

function walk(value, path, file) {
  if (typeof value === "string") {
    const key = path[path.length - 1];
    // opaque base64 permitted only in a signature field
    if (B64.test(value) && !DIGEST.test(value) && !ALLOWED_OPAQUE_KEYS.has(key)) {
      failures.push(`${file}: opaque base64 at ${path.join(".")} (only 'signature' may hold one)`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, [...path, String(i)], file));
    return;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) walk(value[k], [...path, k], file);
  }
}

function scanFile(file) {
  const raw = readFileSync(file, "utf8");
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(raw))
    failures.push(`${file}: private key material`);
  if (EMAIL.test(raw)) failures.push(`${file}: email-like string`);
  if (URL.test(raw)) failures.push(`${file}: http(s) endpoint (no live endpoints permitted)`);
  try {
    walk(JSON.parse(raw), [], file);
  } catch {
    // non-JSON committed under these roots is unexpected; flag it
    failures.push(`${file}: not parseable as JSON`);
  }
}

function collect(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p);
    else if (p.endsWith(".json")) scanFile(p);
  }
}

for (const r of ROOTS) collect(r);
for (const f of SINGLE) scanFile(f);

if (failures.length) {
  process.stderr.write(
    "stage4q privacy scan: FAILED\n" + failures.map((f) => "  - " + f).join("\n") + "\n"
  );
  process.exit(1);
}
process.stdout.write(
  "stage4q privacy scan: passed (digests / enums / schemas / public keys only)\n"
);
