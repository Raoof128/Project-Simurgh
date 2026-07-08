// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — Python parity (plan Task 11). roundHalfEven ties + declaration-digest
// preflight + canonical torture fixture + full-map equality over the clean corpus.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { roundHalfEven } from "../../../../tools/simurgh-attestation/stage4z/core/tensorCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const PY = join(ROOT, "tools/simurgh-attestation/stage4z/python/vwa_parity.py");
const py = (...args) => spawnSync("python3", [PY, ...args], { encoding: "utf8" });

const havePython = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;

test("roundHalfEven tie vectors are byte-identical JS ↔ Python", { skip: !havePython }, () => {
  const vec = [0.5, 1.5, 2.5, -0.5, -1.5, 2.4999999999];
  const js = vec.map(roundHalfEven);
  const pyOut = JSON.parse(py("roundtrip").stdout.trim());
  assert.deepEqual(pyOut, js);
});

test("canonical torture fixture matches JS canonicalJson", { skip: !havePython }, () => {
  const torture = {
    z: "café — naïve ✓",
    a: "900719925474099999", // large decimal string
    neg: "-1500000000",
    nested: { b: 2, a: 1, "": "empty-key" },
    arr: [3, "2", { y: 1, x: 0 }],
  };
  const jsCanon = canonicalJson(torture);
  const pyCanon = py("canonical", JSON.stringify(torture)).stdout.trim();
  assert.equal(pyCanon, jsCanon);
});

test("declaration-digest preflight matches over the corpus", { skip: !havePython }, () => {
  const index = JSON.parse(readFileSync(join(EVID, "index.json"), "utf8")).fixtures;
  for (const fx of index.filter((f) => f.set === "clean")) {
    const path = join(EVID, `${fx.id}.bundle.json`);
    const bundle = JSON.parse(readFileSync(path, "utf8"));
    const pyDigest = py("decl_digest", path).stdout.trim();
    assert.equal(pyDigest, bundle.map.declaration_digest, `${fx.id} declaration digest`);
  }
});

test("Python rebuilds the map byte-for-byte over the clean corpus", { skip: !havePython }, () => {
  const index = JSON.parse(readFileSync(join(EVID, "index.json"), "utf8")).fixtures;
  for (const fx of index.filter((f) => f.set === "clean")) {
    const path = join(EVID, `${fx.id}.bundle.json`);
    const bundle = JSON.parse(readFileSync(path, "utf8"));
    const pyMap = py("map", path).stdout.trim();
    assert.equal(pyMap, canonicalJson(bundle.map), `${fx.id} map parity`);
  }
});
