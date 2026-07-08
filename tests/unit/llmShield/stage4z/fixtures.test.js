// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA fixtures + Lane A evidence (plan Task 8). Every fixture reaches its expected
// code at both tiers; the withheld set skips audit; the corpus rebuilds byte-for-byte.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateVwa } from "../../../../tools/simurgh-attestation/stage4z/core/vwaCore.mjs";
import { build } from "../../../../tools/simurgh-attestation/stage4z/node/build-stage4z-fixtures.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const PUB = readFileSync(
  join(ROOT, "tests/fixtures/llmShield/stage4z/test-keys/INSECURE_FIXTURE_ONLY_vwa.pub.pem"),
  "utf8"
);
const index = JSON.parse(readFileSync(join(EVID, "index.json"), "utf8"));

test("index lists the 12 spec fixtures", () => {
  assert.equal(index.fixtures.length, 12);
});

for (const fx of index.fixtures) {
  test(`fixture ${fx.id}: public tier reaches ${fx.expected_public}`, () => {
    const bundle = JSON.parse(readFileSync(join(EVID, `${fx.id}.bundle.json`), "utf8"));
    const r = evaluateVwa(bundle, { tier: "public", publicKeyPem: PUB });
    assert.equal(r.raw, fx.expected_public, `${fx.id} public: ${JSON.stringify(r)}`);
  });

  test(`fixture ${fx.id}: audit tier reaches ${fx.expected_audit}`, () => {
    const bundle = JSON.parse(readFileSync(join(EVID, `${fx.id}.bundle.json`), "utf8"));
    const r = evaluateVwa(bundle, { tier: "audit", publicKeyPem: PUB });
    if (fx.expected_audit === "SKIPPED")
      assert.equal(r.skipped, true, `${fx.id} should skip audit`);
    else assert.equal(r.raw, fx.expected_audit, `${fx.id} audit: ${JSON.stringify(r)}`);
  });
}

test("corpus is byte-stable: rebuild in place matches the committed evidence", () => {
  // snapshot committed bytes
  const before = {};
  for (const fx of index.fixtures) before[fx.id] = readFileSync(join(EVID, `${fx.id}.bundle.json`));
  const beforeIndex = readFileSync(join(EVID, "index.json"));
  build(); // regenerate
  for (const fx of index.fixtures)
    assert.deepEqual(
      readFileSync(join(EVID, `${fx.id}.bundle.json`)),
      before[fx.id],
      `${fx.id} stable`
    );
  assert.deepEqual(readFileSync(join(EVID, "index.json")), beforeIndex, "index stable");
  // sanity: evidence is canonicalJson (sorted keys, no drift)
  const sample = JSON.parse(before[index.fixtures[0].id].toString());
  assert.equal(canonicalJson(sample), before[index.fixtures[0].id].toString().trimEnd());
});
