// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  surfaceLeaf,
  surfaceRoot,
  surfacePath,
  verifySurfacePath,
} from "../../../../tools/simurgh-attestation/stage4o/core/merkleSurface.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

const entries = [0, 1, 2].map((i) => domainDigest(DOMAINS.TOOL_ENTRY, "t", { i }));

test("root is deterministic and order-sensitive (manifest order is normative)", () => {
  assert.equal(surfaceRoot(entries), surfaceRoot([...entries]));
  assert.notEqual(surfaceRoot(entries), surfaceRoot([...entries].reverse()));
});

test("leaf domain differs from raw entry digest (second-preimage guard)", () => {
  assert.notEqual(surfaceLeaf(entries[0]), entries[0]);
});

test("inclusion path verifies for every leaf across sizes 1..5", () => {
  for (let n = 1; n <= 5; n++) {
    const es = Array.from({ length: n }, (_, i) =>
      domainDigest(DOMAINS.TOOL_ENTRY, "sz", { n, i })
    );
    const root = surfaceRoot(es);
    for (let i = 0; i < n; i++) {
      assert.equal(verifySurfacePath(es[i], surfacePath(es, i), root), true, `n=${n} i=${i}`);
    }
  }
});

test("tampered path, wrong leaf, truncated path all fail", () => {
  const root = surfaceRoot(entries);
  const p1 = surfacePath(entries, 1);
  assert.equal(verifySurfacePath(entries[0], p1, root), false);
  assert.equal(verifySurfacePath(entries[1], p1.slice(1), root), false);
  assert.equal(verifySurfacePath(entries[1], p1, "sha256:" + "0".repeat(64)), false);
});
