// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — parity e2e (plan Tasks 14/15). Motto: AnthropicSafe First, then ReviewerSafe.
// Runs the browser verifier's logic (real WebCrypto Ed25519) in node:vm and the Python parity
// against the committed green bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const BUNDLE = join(REPO, "docs/research/llm-shield/evidence/stage-5c/green-slip-ledger.json");
const HTML = join(REPO, "tools/simurgh-attestation/stage5c/browser/vsb-verifier.html");
const PARITY = join(REPO, "tools/simurgh-attestation/stage5c/python/vsb_parity.py");

function loadBrowserModule() {
  const html = readFileSync(HTML, "utf8");
  const script = html.match(/<script id="vsb">([\s\S]*?)<\/script>/)[1];
  const module = { exports: {} };
  const ctx = vm.createContext({
    crypto: webcrypto,
    TextEncoder,
    atob: (b) => Buffer.from(b, "base64").toString("binary"),
    module,
    document: undefined,
  });
  vm.runInContext(script, ctx);
  return module.exports;
}

test("browser verifier: committed green bundle VERIFIES (WebCrypto Ed25519 + arithmetic)", async () => {
  const { verify } = loadBrowserModule();
  const bundle = JSON.parse(readFileSync(BUNDLE, "utf8"));
  const r = await verify(bundle);
  // r.errs is created inside the vm realm — compare by value, not deepEqual (cross-realm proto).
  assert.equal(r.ok, true, JSON.stringify([...(r.errs || [])]));
  assert.equal([...r.errs].length, 0);
});

test("browser verifier: a tampered signature fails closed (real WebCrypto verify)", async () => {
  const { verify } = loadBrowserModule();
  const bundle = JSON.parse(readFileSync(BUNDLE, "utf8"));
  bundle.mr_ruleset_id = "tampered"; // content changed → signature no longer matches
  const r = await verify(bundle);
  assert.equal(r.ok, false);
  assert.ok(r.errs.includes("signature_invalid"));
});

test("python parity: committed green bundle reproduces the public surface", () => {
  const res = spawnSync("python3", [PARITY, BUNDLE], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /PARITY OK/);
});
