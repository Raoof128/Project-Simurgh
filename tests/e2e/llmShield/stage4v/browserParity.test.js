import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { corpusDocument } from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs";
import { evaluateContestPublic } from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const HTML = join(ROOT, "tools/simurgh-attestation/stage4v/browser/vdp-verifier.html");
const EXCLUDED = new Set(["signature-invalid", "subpoena-capsule-tampered"]);

function loadBrowserCore() {
  const html = readFileSync(HTML, "utf8");
  const m = html.match(/<script id="vdp-core">([\s\S]*?)<\/script>/);
  assert.ok(m, "vdp-core script block not found");
  const ctx = { globalThis: {} };
  ctx.globalThis.globalThis = ctx.globalThis;
  vm.runInNewContext(m[1], ctx.globalThis);
  return ctx.globalThis.VDP;
}

test("browser core matches node public-tier over the corpus (CLI-parity gate)", () => {
  const VDP = loadBrowserCore();
  const doc = corpusDocument();
  for (const c of doc.cases) {
    if (EXCLUDED.has(c.name)) continue;
    const capsule = c.capsule_override ?? doc.reference_capsule_bundle;
    const expectedMap = c.eval_opts?.expectedConflictMap;
    const node = evaluateContestPublic(capsule, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      ...(c.eval_opts ?? {}),
    });
    const browser = VDP.evaluateContestPublic(
      capsule,
      c.counter_capsule,
      doc.capsule_pubkey_pem,
      expectedMap
    );
    assert.equal(browser.raw, node.raw, `raw ${c.name}`);
    assert.equal(recordDigest(browser.envelope), recordDigest(node.envelope), `envelope ${c.name}`);
  }
});
