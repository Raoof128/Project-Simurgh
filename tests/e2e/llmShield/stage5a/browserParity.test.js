// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC browser verifier (plan Task 13) — CSP hash-consistency + no-egress guard +
// node:vm parity + REAL WebCrypto Ed25519 verify (no Playwright; uses crypto.webcrypto).
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const HTML = readFileSync(
  join(ROOT, "tools/simurgh-attestation/stage5a/browser/vnc-verifier.html"),
  "utf8"
);
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5a");
const rd = (id) => JSON.parse(readFileSync(join(EVID, `${id}.json`), "utf8"));

const inner = (tag) => {
  const o = HTML.indexOf(`<${tag}>`) + `<${tag}>`.length;
  return HTML.slice(o, HTML.indexOf(`</${tag}>`, o));
};
const b64 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("base64");
const cspHash = (dir) => HTML.match(new RegExp(`${dir} 'sha256-([^']+)'`))[1];

function loadVNC() {
  const sandbox = { crypto: crypto.webcrypto, atob, Promise, console, TextEncoder, BigInt };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(inner("script"), sandbox);
  return sandbox.VNC;
}

const CLEAN = [
  "clean_corroborated_absent",
  "eval_awareness_conflict",
  "clean_unnarrated_flags",
  "clean_zero_claims",
  "clean_unreadable_claim",
  "pilot_external_export",
  "provenance_manifest_clean",
];

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
  const VNC = loadVNC();
  for (const id of CLEAN) {
    const bundle = rd(id);
    assert.equal(VNC.checkPublic(bundle), null, `${id} public checks`);
    assert.equal(
      VNC.canonical(VNC.classify(bundle.claim_table, bundle.vwa.map)),
      canonicalJson(bundle.ledger.content.verdicts),
      `${id} verdicts`
    );
    assert.equal(
      VNC.canonical(VNC.tallies(bundle.ledger.content)),
      canonicalJson(bundle.ledger.content.aggregates),
      `${id} tallies`
    );
  }
});

test("node:vm — browser checkPublic FAILS the laundered-verdict tamper (205)", () => {
  const VNC = loadVNC();
  const r = VNC.checkPublic(rd("tamper_two_stories"));
  assert.ok(r && r.raw === 205, `expected 205, got ${JSON.stringify(r)}`);
});

test("REAL WebCrypto Ed25519: verifyPublic resolves clean for a signed bundle", async () => {
  const VNC = loadVNC();
  const r = await VNC.verifyPublic(rd("eval_awareness_conflict"));
  assert.equal(r.raw, 0, `expected verified, got ${JSON.stringify(r)}`);
});
