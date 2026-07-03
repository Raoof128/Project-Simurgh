// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runCcbCore } from "../../../../tools/simurgh-attestation/stage4l/verify-stage4l.mjs";

const FIX = "tests/fixtures/llmShield/stage4l";
const PUB = `${FIX}/ccb-signer.pub`;
const run = (bundleDir) => runCcbCore({ bundleDir, pinnedPubkeyPath: PUB });
const mutate = (name, fn) => {
  const dir = mkdtempSync(join(tmpdir(), "ccb-"));
  cpSync(`${FIX}/bundles/${name}`, dir, { recursive: true });
  fn(dir);
  return dir;
};
const editJson = (p, fn) => {
  const j = JSON.parse(readFileSync(p, "utf8"));
  fn(j);
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
};

test("committed bundle matrix reproduces exactly", async () => {
  const matrix = JSON.parse(readFileSync(`${FIX}/expected-results/cluster-matrix.json`, "utf8"));
  for (const [name, expected] of Object.entries(matrix)) {
    const r = await run(`${FIX}/bundles/${name}`);
    assert.equal(r.rawCode, expected.raw, `${name}: got ${r.rawCode} (${r.reason})`);
    assert.equal(r.typed, expected.typed, name);
  }
});

test("F9 singleton-evasion is green AND its cardinality ledgers the shape", async () => {
  const r = await run(`${FIX}/bundles/singleton-evasion`);
  assert.equal(r.rawCode, 0);
  const card = JSON.parse(
    readFileSync(`${FIX}/bundles/singleton-evasion/cluster-cardinality.json`, "utf8")
  );
  assert.equal(card.histogram["1"], 100);
});

test("F5 commitment byte-flip -> 42", async () => {
  const dir = mutate("clean-under", (d) =>
    editJson(`${d}/cluster-assignments.json`, (a) => {
      a[0].cluster_commitment = `sha256:${"0".repeat(64)}`;
    })
  );
  assert.equal((await run(dir)).rawCode, 42);
});

test("F6 budget lowered after signing -> digest failure (22), never 41", async () => {
  const dir = mutate("clean-under", (d) =>
    editJson(`${d}/cluster-budget-policy.json`, (p) => {
      for (const k of Object.keys(p.budgets)) p.budgets[k] = 1;
    })
  );
  const r = await run(dir);
  assert.equal(r.rawCode, 22);
});

test("F7 raw-identity key injected -> 42, pinned", async () => {
  const dir = mutate("clean-under", (d) =>
    editJson(`${d}/cluster-assignments.json`, (a) => {
      a[0].email = "smuggled@example.invalid";
    })
  );
  const r = await run(dir);
  assert.equal(r.rawCode, 42);
});

test("F10 cardinality tamper -> 42", async () => {
  const dir = mutate("clean-under", (d) =>
    editJson(`${d}/cluster-cardinality.json`, (c) => {
      c.histogram["1"] = 999;
    })
  );
  assert.equal((await run(dir)).rawCode, 42);
});

test("manifest signature bit-flip -> 25", async () => {
  const dir = mutate("clean-under", (d) =>
    editJson(`${d}/ccb-manifest.json`, (m) => {
      m.signature = m.signature.slice(0, -4) + "AAA=";
    })
  );
  assert.equal((await run(dir)).rawCode, 25);
});

test("unreadable bundle fails closed to 29", async () => {
  const r = await run("tests/fixtures/llmShield/stage4l/bundles/does-not-exist");
  assert.equal(r.rawCode, 29);
  assert.equal(r.typed, 3);
});
