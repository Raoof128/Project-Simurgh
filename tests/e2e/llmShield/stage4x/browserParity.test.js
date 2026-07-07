// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR browser verifier (plan Task 12) — CSP hash-consistency guard + node:vm parity.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeLedgerFromLiveGate } from "../../../../tools/simurgh-attestation/stage4x/core/residueLedger.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const HTML = readFileSync(
  join(ROOT, "tools/simurgh-attestation/stage4x/browser/vlr-verifier.html"),
  "utf8"
);
const corpus = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-4x/corpus.json"), "utf8")
);

const inner = (tag) => {
  const o = HTML.indexOf(`<${tag}>`) + `<${tag}>`.length;
  return HTML.slice(o, HTML.indexOf(`</${tag}>`, o));
};
const b64 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("base64");
const cspHash = (dir) => HTML.match(new RegExp(`${dir} 'sha256-([^']+)'`))[1];

test("CSP hash-consistency: script-src/style-src hashes track the inline bytes (kills stale-hash ship)", () => {
  assert.equal(cspHash("script-src"), b64(inner("script")), "script CSP hash stale");
  assert.equal(cspHash("style-src"), b64(inner("style")), "style CSP hash stale");
});

test("CSP forbids network + framing surfaces", () => {
  assert.match(HTML, /default-src 'none'/);
  assert.match(HTML, /connect-src 'none'/);
});

test("node:vm parity — browser recompute reproduces the JS slip-rate + floor", () => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(inner("script"), sandbox);
  const r = sandbox.VLR.recompute(corpus);
  const js = computeLedgerFromLiveGate(corpus);
  assert.equal(r.metamorphic_slip_rate_v1, js.metamorphic_slip_rate_v1);
  assert.equal(r.metamorphic_slip_rate_v2, js.metamorphic_slip_rate_v2);
  assert.deepEqual(r.irreducible, js.v2.residue_item_ids);
});
