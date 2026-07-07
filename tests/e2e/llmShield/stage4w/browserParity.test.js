import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGreenNarrative } from "../../../../tools/simurgh-attestation/stage4w/node/greenNarrative.mjs";
import { buildLaneAFixtures } from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs";
import { evaluateNarrativeSafe } from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const HTML = join(ROOT, "tools/simurgh-attestation/stage4w/browser/vsn-verifier.html");

// Same public-tier surface as Python (Task 13): geometry/binding/locality/slot/leakage.
const EXCLUDED = new Set([
  "signature-tampered",
  "schema-alien-key",
  "payload-smuggled-prompt",
  "judgment-digest-mismatch",
  "judgment-unreferenced",
]);

function loadBrowserCore() {
  const html = readFileSync(HTML, "utf8");
  const m = html.match(/<script id="vsn-core">([\s\S]*?)<\/script>/);
  assert.ok(m, "vsn-core script block not found");
  const ctx = { globalThis: {} };
  ctx.globalThis.globalThis = ctx.globalThis;
  vm.runInNewContext(m[1], ctx.globalThis);
  return ctx.globalThis.VSN;
}

test("browser core matches node public-tier over the corpus (CLI-parity gate)", () => {
  const VSN = loadBrowserCore();
  const g = buildGreenNarrative();
  const capsule = g.capsuleBundle.content;
  // The browser gets the capsule content + the attestation_digest (from the binding under test).
  for (const f of buildLaneAFixtures()) {
    if (EXCLUDED.has(f.name)) continue;
    const node = evaluateNarrativeSafe(g.capsuleBundle, f.narrative, {
      capsulePubKeyPem: g.capsulePubKeyPem,
      ctx: {},
    });
    const capForBrowser = {
      ...capsule,
      attestation_digest: f.narrative.content.binding.attestation_digest,
    };
    const browser = VSN.evaluatePublic(f.narrative, capForBrowser, g.capsulePubKeyPem);
    assert.equal(
      browser.raw,
      node.raw,
      `raw ${f.name}: browser ${browser.raw} vs node ${node.raw}`
    );
  }
});
