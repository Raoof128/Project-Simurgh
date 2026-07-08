// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR browser verifier parity (plan Task 14) — node:vm + REAL WebCrypto Ed25519 verify,
// no Playwright. Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeAsr } from "../../../../tools/simurgh-attestation/stage5b/core/asrCore.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const HTML = readFileSync(
  join(ROOT, "tools/simurgh-attestation/stage5b/browser/var-verifier.html"),
  "utf8"
);
const bundle = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-5b/attestation.json"), "utf8")
);

const inner = (tag) => {
  const o = HTML.indexOf(`<${tag}>`) + `<${tag}>`.length;
  return HTML.slice(o, HTML.indexOf(`</${tag}>`, o));
};

function loadVAR() {
  const sandbox = { crypto: crypto.webcrypto, atob, Promise, console, TextEncoder, BigInt };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(inner("script"), sandbox);
  return sandbox.VAR;
}

test("browser canonical + ASR match Node", () => {
  const VAR = loadVAR();
  assert.equal(VAR.computeAsr(bundle.findings), computeAsr(bundle.findings));
  assert.equal(VAR.computeAsr(bundle.findings), "0/46");
});

test("browser WebCrypto Ed25519 verifies the real attestation GREEN", async () => {
  const VAR = loadVAR();
  const r = await VAR.verifyVar(bundle);
  assert.equal(r.error, null);
  assert.equal(r.sigOk, true);
  assert.equal(r.asrMatches, true);
  assert.equal(r.ok, true);
});

test("browser flags a tampered attestation (signature fails, not a silent pass)", async () => {
  const VAR = loadVAR();
  const b = structuredClone(bundle);
  b.attestation.aggregates.asr = "9/46";
  const r = await VAR.verifyVar(b);
  assert.equal(r.ok, false); // asrMatches false AND/OR sig invalid
});
