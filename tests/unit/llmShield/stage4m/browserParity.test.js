// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { webcryptoVerifyEd25519 } from "../../../../tools/simurgh-attestation/stage4m/browser/browser-adapter.mjs";
import { buildBrowserVerifierHtml } from "../../../../tools/simurgh-attestation/stage4m/browser/build-browser-verifier.mjs";
import { runVxdCore } from "../../../../tools/simurgh-attestation/stage4m/node/verify-stage4m.mjs";

const FIX = "tests/fixtures/llmShield/stage4m";
const PUB = `${FIX}/vxd-signer.pub`;
const expected = JSON.parse(readFileSync(`${FIX}/expected-results/vxd-matrix.json`, "utf8"));

test("V16: browser-adapter verdicts are byte-identical to node verdicts on every bundle", async () => {
  for (const name of Object.keys(expected)) {
    const nodeSide = await runVxdCore({
      bundleDir: `${FIX}/bundles/${name}`,
      pinnedPubkeyPath: PUB,
      tier: "a",
    });
    const browserSide = await runVxdCore({
      bundleDir: `${FIX}/bundles/${name}`,
      pinnedPubkeyPath: PUB,
      tier: "a",
      verifySigOverride: webcryptoVerifyEd25519,
    });
    assert.equal(canonicalJson(browserSide.verdict), canonicalJson(nodeSide.verdict), name);
  }
});

test("built HTML is deterministic and embeds the exact core sources", () => {
  const h1 = buildBrowserVerifierHtml();
  const h2 = buildBrowserVerifierHtml();
  assert.equal(h1, h2);
  // core logic is embedded (function bodies present, import/export stripped)
  assert.ok(h1.includes("export function breachedClusters") === false, "export keyword stripped");
  assert.ok(h1.includes("function breachedClusters"), "retroScoreCore embedded");
  assert.ok(h1.includes("function verifyBundleCore"), "verdictCore embedded");
  assert.ok(h1.includes("not_legal_compliance_certification"), "non-claims rendered in footer");
  // no external network URLs (SPDX/license lines aside)
  const scrubbed = h1.replace(/SPDX-License-Identifier[^\n]*/g, "");
  assert.ok(!/https?:\/\/(?!localhost)/.test(scrubbed), "no external URLs");
});
