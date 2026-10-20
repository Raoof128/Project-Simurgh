// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { parse } from "acorn";
import { runVxdCore } from "../../../../tools/simurgh-attestation/stage4m/node/verify-stage4m.mjs";
import { buildVxdManifest } from "../../../../tools/simurgh-attestation/stage4m/node/build-stage4m-attestation.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { validateMergeChain } from "../../../../tools/simurgh-attestation/stage4m/core/mergeLatticeCore.mjs";
import { buildBrowserVerifierHtml } from "../../../../tools/simurgh-attestation/stage4m/browser/build-browser-verifier.mjs";
const FIX = "tests/fixtures/llmShield/stage4m";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, x) => writeFileSync(p, JSON.stringify(x));
async function withBundle(fn) {
  const dir = mkdtempSync(join(tmpdir(), "vxd-readiness-"));
  try {
    cpSync(`${FIX}/bundles/clean-chain`, dir, { recursive: true });
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const verify = (dir, tier = "p", key = `${FIX}/vxd-signer.pub`) =>
  runVxdCore({ bundleDir: dir, pinnedPubkeyPath: key, tier });
test("M106 positive control: public artifacts verify without private ledgers", () =>
  withBundle(async (dir) => {
    for (const p of ["windows.json", "merge-events.json", "rescore-records.json"])
      rmSync(join(dir, p));
    assert.equal((await verify(dir)).rawCode, 0);
  }));
test("M106 public tier rejects mutually consistent altered disclosure and chain", () =>
  withBundle(async (dir) => {
    const d = read(join(dir, "disclosure.json"));
    const chain = read(join(dir, "chain.json"));
    const old = recordDigest(d);
    d.claims.find((c) => c.kind === "consumer_count").value += 100;
    chain.entries.find((e) => e.digest === old).digest = recordDigest(d);
    write(join(dir, "disclosure.json"), d);
    write(join(dir, "chain.json"), chain);
    const r = await verify(dir);
    assert.equal(r.rawCode, 22);
    assert.equal(r.reason, "attestation_chain_mismatch");
  }));
test("M106 public tier rejects suppression of signed public evidence", () =>
  withBundle(async (dir) => {
    rmSync(join(dir, "disclosure.json"));
    rmSync(join(dir, "chain.json"));
    const r = await verify(dir);
    assert.equal(r.rawCode, 22);
    assert.equal(r.reason, "attestation_chain_mismatch");
  }));
test("M106 audit tier recomputes signed producer aggregates", () =>
  withBundle(async (dir) => {
    const attestation = read(join(dir, "vxd-attestation.json"));
    attestation.aggregates.exposure_mass_total += 1;
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const pem = publicKey.export({ type: "spki", format: "pem" });
    write(join(dir, "vxd-attestation.json"), attestation);
    write(
      join(dir, "vxd-manifest.json"),
      buildVxdManifest({ attestation, privateKey, publicKeyPem: pem })
    );
    writeFileSync(join(dir, "key.pub"), pem);
    const r = await verify(dir, "a", join(dir, "key.pub"));
    assert.equal(r.rawCode, 22);
    assert.equal(r.reason, "attestation_aggregates_mismatch");
  }));
test("M106 disjoint merges cannot produce the same new cluster identity", () => {
  const D = (n) => `sha256:${n.repeat(64)}`;
  const clusters = ["1", "2", "3", "4"].map(D);
  const genesis = {
    graphVersionDigest: D("a"),
    clusters,
    budgets: Object.fromEntries(clusters.map((c) => [c, 5])),
  };
  const event = {
    schema: "simurgh.ccb.cluster_merge_event.v1",
    sequence: 1,
    parent_event_digest: null,
    old_graph_version_digest: D("a"),
    new_graph_version_digest: D("b"),
    merges: [clusters.slice(0, 2), clusters.slice(2)].map((c) => ({
      new_cluster_commitment: D("c"),
      new_budget: 5,
      merged_cluster_commitments: c,
      merge_basis: ["payment_graph"],
    })),
    carried_cluster_commitments: [],
    raw_identity_exported: false,
  };
  const r = validateMergeChain([event], genesis);
  assert.equal(r.ok, false);
  assert.equal(r.detail, "new_cluster_collision");
});
test("M54 generated browser verifier has a valid complete module", () => {
  const html = buildBrowserVerifierHtml();
  const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => parse(scripts[0][1], { ecmaVersion: "latest", sourceType: "module" }));
});
