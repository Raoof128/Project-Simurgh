// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR browser verifier (plan Task 13) — CSP hash-consistency + no-egress guard +
// node:vm parity + REAL WebCrypto Ed25519 verify (no Playwright; uses crypto.webcrypto).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { freshFrozenBlock } from "../../../../tools/simurgh-attestation/stage4y/core/frozenBinding.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const HTML = readFileSync(join(ROOT, "tools/simurgh-attestation/stage4y/browser/vdr-verifier.html"), "utf8");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));

const inner = (tag) => {
  const o = HTML.indexOf(`<${tag}>`) + `<${tag}>`.length;
  return HTML.slice(o, HTML.indexOf(`</${tag}>`, o));
};
const b64 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("base64");
const cspHash = (dir) => HTML.match(new RegExp(`${dir} 'sha256-([^']+)'`))[1];

function loadVDR() {
  const sandbox = { crypto: crypto.webcrypto, atob, Promise, console, TextEncoder, TextDecoder };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(inner("script"), sandbox);
  return sandbox.VDR;
}

test("CSP hash-consistency: script-src/style-src track the inline bytes (kills stale-hash ship)", () => {
  assert.equal(cspHash("script-src"), b64(inner("script")), "script CSP hash stale");
  assert.equal(cspHash("style-src"), b64(inner("style")), "style CSP hash stale");
});

test("CSP forbids network + framing surfaces", () => {
  assert.match(HTML, /default-src 'none'/);
  assert.match(HTML, /connect-src 'none'/);
  assert.match(HTML, /form-action 'none'/);
  assert.match(HTML, /img-src 'none'/);
});

test("no-egress: the executable script (comments+strings stripped) has no network sinks", () => {
  const script = inner("script")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
  for (const sink of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "importScripts", "Worker"])
    assert.equal(new RegExp("\\b" + sink + "\\b").test(script), false, `sink ${sink} present in script`);
  // crypto.subtle is allowed (not a network sink); confirm it is used.
  assert.match(inner("script"), /crypto\.subtle/);
});

test("pinned EXPECTED_FROZEN matches the live JS frozen block (cannot go stale)", () => {
  const VDR = loadVDR();
  assert.equal(canonicalJson(VDR.EXPECTED_FROZEN), canonicalJson(freshFrozenBlock()));
});

test("node:vm parity — browser buildMap byte-equals the committed map for a fixture", () => {
  const VDR = loadVDR();
  const id = "incident_report_shaped";
  const text = readFileSync(join(EVID, `${id}.document.txt`), "utf8");
  const audit = rd(`${id}.audit.json`);
  const built = VDR.buildMap(text, audit.redaction_manifest, audit.commitment_salt);
  assert.equal(VDR.canonical(built), canonicalJson(rd(`${id}.map.json`)));
});

test("REAL WebCrypto Ed25519 — public verify passes on a valid attestation, 182 on a tampered one", async () => {
  const VDR = loadVDR();
  const id = "incident_report_shaped";
  const map = rd(`${id}.map.json`);
  const att = rd(`${id}.attestation.json`);
  const pub = readFileSync(
    join(ROOT, "tests/fixtures/llmShield/stage4y/test-keys/INSECURE_FIXTURE_ONLY_vdr.pub.pem"),
    "utf8"
  );
  const good = await VDR.verifyPublic(map, att, pub);
  assert.equal(good.raw, 0, `expected pass, got ${JSON.stringify(good)}`);

  const tampered = { ...att, signature: att.signature.replace(/^../, "00") };
  const bad = await VDR.verifyPublic(map, tampered, pub);
  assert.equal(bad.raw, 182);
});
