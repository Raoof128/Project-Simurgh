// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVxdCore } from "../../../../tools/simurgh-attestation/stage4m/node/verify-stage4m.mjs";

const FIX = "tests/fixtures/llmShield/stage4m";
const PUB = `${FIX}/vxd-signer.pub`;
const expected = JSON.parse(readFileSync(`${FIX}/expected-results/vxd-matrix.json`, "utf8"));

test("committed bundle matrix reproduces exactly (raw + reason)", async () => {
  for (const [name, exp] of Object.entries(expected)) {
    const r = await runVxdCore({
      bundleDir: `${FIX}/bundles/${name}`,
      pinnedPubkeyPath: PUB,
      tier: "a",
    });
    assert.equal(r.rawCode, exp.raw, `${name}: raw (got reason ${r.reason})`);
    assert.equal(r.reason, exp.reason, `${name}: reason`);
  }
});

test("V-CROWN pins: newly_revealed + contradiction finding", async () => {
  const r = await runVxdCore({
    bundleDir: `${FIX}/bundles/crown-reveal`,
    pinnedPubkeyPath: PUB,
    tier: "a",
  });
  assert.equal(r.rawCode, 0);
  assert.equal(r.verdict.newly_revealed.length, 1);
  assert.equal(
    r.verdict.findings.filter((f) => f.startsWith("singleton_merge_contradiction:")).length,
    1
  );
});

test("V19 tier-P: ledger files absent -> exit 0 with honest not_in_tier", async () => {
  const t = mkdtempSync(join(tmpdir(), "vxd-tier-p-"));
  try {
    cpSync(`${FIX}/bundles/clean-chain`, t, { recursive: true });
    for (const f of ["windows.json", "merge-events.json", "rescore-records.json"])
      rmSync(join(t, f));
    const r = await runVxdCore({ bundleDir: t, pinnedPubkeyPath: PUB, tier: "p" });
    assert.equal(r.rawCode, 0, `reason ${r.reason}`);
    const byName = Object.fromEntries(r.verdict.checks.map((c) => [c.name, c.status]));
    assert.equal(byName.windows_valid, "not_in_tier");
    assert.equal(byName.attestation_roots, "not_in_tier");
    assert.equal(byName.manifest_signature, "ok");
    assert.equal(byName.disclosure_binding, "ok");
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("V20 tier equivocation: attestation root != recomputed ledger root -> raw 22", async () => {
  const t = mkdtempSync(join(tmpdir(), "vxd-tier-eq-"));
  try {
    cpSync(`${FIX}/bundles/clean-chain`, t, { recursive: true });
    // The public tier commits a windows_root; here it disagrees with the audited ledger.
    const att = JSON.parse(readFileSync(join(t, "vxd-attestation.json"), "utf8"));
    att.windows_root = `sha256:${"0".repeat(64)}`;
    writeFileSync(join(t, "vxd-attestation.json"), `${JSON.stringify(att, null, 2)}\n`);
    const r = await runVxdCore({ bundleDir: t, pinnedPubkeyPath: PUB, tier: "a" });
    assert.equal(r.rawCode, 22, `reason ${r.reason}`);
    assert.equal(r.reason, "attestation_chain_mismatch");
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("--as-respondent implication report over crown-reveal", async () => {
  const r = await runVxdCore({
    bundleDir: `${FIX}/bundles/crown-reveal`,
    pinnedPubkeyPath: PUB,
    tier: "a",
    respondentClustersPath: `${FIX}/bundles/crown-reveal/respondent-clusters.json`,
  });
  assert.equal(r.rawCode, 0);
  assert.ok(r.implicationReport.referenced.length >= 1);
  assert.deepEqual(r.implicationReport.not_referenced_in_bundle, []);
});
