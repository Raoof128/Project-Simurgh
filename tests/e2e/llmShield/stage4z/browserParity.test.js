// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA browser verifier (plan Task 12) — CSP hash-consistency + no-egress guard +
// node:vm parity + REAL WebCrypto Ed25519 verify (no Playwright; uses crypto.webcrypto).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const HTML = readFileSync(
  join(ROOT, "tools/simurgh-attestation/stage4z/browser/vwa-verifier.html"),
  "utf8"
);
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const rd = (id) => JSON.parse(readFileSync(join(EVID, `${id}.bundle.json`), "utf8"));

const inner = (tag) => {
  const o = HTML.indexOf(`<${tag}>`) + `<${tag}>`.length;
  return HTML.slice(o, HTML.indexOf(`</${tag}>`, o));
};
const b64 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("base64");
const cspHash = (dir) => HTML.match(new RegExp(`${dir} 'sha256-([^']+)'`))[1];

function loadVWA() {
  const sandbox = {
    crypto: crypto.webcrypto,
    atob,
    Promise,
    console,
    TextEncoder,
    TextDecoder,
    BigInt,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(inner("script"), sandbox);
  return sandbox.VWA;
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
  for (const sink of [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "sendBeacon",
    "importScripts",
    "Worker",
  ])
    assert.equal(new RegExp("\\b" + sink + "\\b").test(script), false, `sink ${sink} present`);
  assert.match(inner("script"), /crypto\.subtle/); // allowed (not a network sink)
});

test("node:vm parity — browser checkPublic recompute equals committed for the clean corpus", () => {
  const VWA = loadVWA();
  for (const id of [
    "synthetic_clean_multihop",
    "synthetic_clean_injection_detect",
    "synthetic_clean_zero_flags",
  ]) {
    const bundle = rd(id);
    assert.equal(VWA.checkPublic(bundle), null, `${id} public checks`);
    assert.equal(
      VWA.canonical(VWA.recountFlags(bundle.map.cells)),
      canonicalJson(bundle.map.aggregates)
    );
  }
});

test("REAL WebCrypto Ed25519 — public verify passes on valid, 191 on tampered/flag-flip", async () => {
  const VWA = loadVWA();
  const pub = readFileSync(
    join(ROOT, "tests/fixtures/llmShield/stage4z/test-keys/INSECURE_FIXTURE_ONLY_vwa.pub.pem"),
    "utf8"
  );
  const bundle = rd("synthetic_clean_injection_detect");
  const good = await VWA.verifyPublic(bundle, pub);
  assert.equal(good.raw, 0, `expected pass, got ${JSON.stringify(good)}`);

  const tampered = {
    ...bundle,
    attestation: {
      ...bundle.attestation,
      signature: bundle.attestation.signature.replace(/^../, "00"),
    },
  };
  const bad = await VWA.verifyPublic(tampered, pub);
  assert.equal(bad.raw, 191);

  // a flag-flip fixture reaches 196 through the browser public path too.
  const flip = rd("tamper_flag_flip");
  const flipR = await VWA.verifyPublic(flip, pub);
  assert.equal(flipR.raw, 196);
});
