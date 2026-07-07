// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC browser<->CLI parity gate (blocks the tag). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { verifyViewAgainstCommitments } from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { buildView } from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";
import { sectionKey } from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML = join(HERE, "../../../../tools/simurgh-attestation/stage4t/browser/vic-verifier.html");

// Extract the inlined pure core (id="vic-core") and run it in a sandbox.
function loadBrowserCore() {
  const html = readFileSync(HTML, "utf8");
  const m = html.match(/<script id="vic-core">([\s\S]*?)<\/script>/);
  assert.ok(m, "vic-core script block not found");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox);
  assert.ok(sandbox.VIC && sandbox.VIC.verifyViewAgainstCommitments, "VIC core not exposed");
  return sandbox.VIC;
}

const VIC = loadBrowserCore();
const { bundle } = buildGreenBundle();
const capsule = bundle.content;
const commitments = capsule.section_commitments;

test("browser recordDigest matches the CLI canonical digest", async () => {
  const { recordDigest } =
    await import("../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs");
  assert.equal(
    VIC.recordDigest({ b: 2, a: [1, { z: 9, y: 8 }] }),
    recordDigest({ b: 2, a: [1, { z: 9, y: 8 }] })
  );
});

test("browser<->CLI parity over a consistent view and a tampered view", async () => {
  const { deterministicSalt } =
    await import("../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs");
  const realSalts = Object.fromEntries(
    capsule.projected_sections.map((s) => [sectionKey(s), deterministicSalt(sectionKey(s))])
  );
  const good = buildView(capsule, "regulator", [], realSalts);
  const bad = buildView(capsule, "regulator", [], realSalts);
  bad.disclosed[0].section = { ...bad.disclosed[0].section, value: "CONTRADICTION" };

  const cases = [good, bad];
  for (const v of cases) {
    const cli = verifyViewAgainstCommitments(v, commitments);
    const browser = VIC.verifyViewAgainstCommitments(v, commitments);
    assert.deepEqual(
      browser === null ? null : browser.raw,
      cli === null ? null : cli.raw,
      "browser and CLI verdict must match"
    );
  }
});
