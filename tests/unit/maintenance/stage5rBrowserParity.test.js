// SPDX-License-Identifier: AGPL-3.0-or-later
// Phase 16 successor: fresh parity without modifying Stage 5R's historical receipt.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import {
  buildManifest,
  checkRuntime,
} from "../../../tools/simurgh-attestation/stage5r/core/parityManifest.mjs";
import { answerManifest } from "../../../tools/simurgh-attestation/stage5r/browser/vpf-portable.mjs";
import { browserResult, findBrowser } from "../../../scripts/lib/browserExecutable.mjs";
const manifestPath = "docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json";
const manifest = buildManifest();
const expected = Object.fromEntries(
  manifest.entries.map((e) => [e.id, e.vectors.map((v) => v.expected)])
);
const assertParity = (answers) =>
  assert.deepEqual(checkRuntime({ manifest, answers }), { ok: true, mismatches: [], missing: [] });

test("Stage 5R successor binds all 5 manifest entries / 17 vectors to core, Node portable and Python", async () => {
  assert.deepEqual(manifest, JSON.parse(readFileSync(manifestPath, "utf8")));
  assert.equal(manifest.entry_count, 5);
  assert.equal(manifest.vector_count, 17);
  assertParity(expected);
  assertParity(await answerManifest(manifest));
  const python = execFileSync(
    "python3",
    ["-B", "tools/simurgh-attestation/stage5r/python/vpf_parity.py", manifestPath],
    { encoding: "utf8" }
  );
  assertParity(JSON.parse(python));
});

test("Stage 5R successor refuses missing and substituted runtime answers", () => {
  assert.throws(() => assertParity({}));
  const wrong = structuredClone(expected);
  wrong[manifest.entries[0].id][0] = "deliberately-wrong-answer";
  assert.throws(() => assertParity(wrong));
  const missing = structuredClone(expected);
  delete missing[manifest.entries[0].id];
  assert.throws(() => assertParity(missing));
});

test("Stage 5R successor executes every vector in a real browser", async (t) => {
  const chrome = findBrowser();
  if (!chrome) {
    t.skip("browser absent: three-runtime parity unproven");
    return;
  }
  const module = readFileSync("tools/simurgh-attestation/stage5r/browser/vpf-portable.mjs");
  const script = `import { answerManifest } from './vpf-portable.mjs';
    try { document.getElementById('out').textContent = JSON.stringify({runtime:'browser', answers:await answerManifest(${JSON.stringify(manifest)})}); }
    catch(error) { document.getElementById('out').textContent = JSON.stringify({error:String(error)}); }`;
  const files = new Map([
    [
      "/index.html",
      [
        "text/html",
        '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'"><pre id="out">running…</pre><script type="module" src="./run.mjs"></script>',
      ],
    ],
    ["/run.mjs", ["text/javascript", script]],
    ["/vpf-portable.mjs", ["text/javascript", module]],
  ]);
  const server = createServer((req, res) => {
    const entry = files.get(req.url);
    if (!entry) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", entry[0]);
    res.end(entry[1]);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const result = await browserResult(
      chrome,
      `http://127.0.0.1:${server.address().port}/index.html`
    );
    assert.equal(result.runtime, "browser");
    assertParity(result.answers);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
