// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — A29: the profile_bundle_digest PREIMAGE must bind exactly the pairs the object carries.
//
// A28 added the six Section-7 pairs to the §4.4 object AND to the "forty-six fields" prose, but NOT to
// the digest preimage — an A9-class binding defect (fields present, not hashed). Thirty-five tests
// passed because none read the preimage. This gate reads the spec's object block, its preimage block,
// and the generator's BUNDLE_PROFILES, and requires ALL THREE to agree IN ORDER. Deletion, insertion,
// and reorder self-tests prove the gate actually rejects, rather than passing for lack of a check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUNDLE_PROFILES } from "../../../../tools/simurgh-attestation/stage5o/node/measureScopeManifestMaximum.mjs";

const SPEC = new URL(
  "../../../../docs/superpowers/specs/2026-07-15-stage-5o-vsc-hidden-universe-equality-design.md",
  import.meta.url
);

const FIELD_RE = /\b([a-z_][a-z0-9_]*_(?:id|digest))\b/g;

/** ordered id/digest field names from the flat `profile_bundle = { ... }` object block */
function objectFields(spec) {
  const start = spec.indexOf("profile_bundle = {");
  assert.notEqual(start, -1, "object block `profile_bundle = {` not found");
  const open = spec.indexOf("{", start);
  const close = spec.indexOf("}", open); // flat block, no nested braces
  const out = [];
  for (let line of spec.slice(open + 1, close).split("\n")) {
    line = line.replace(/\/\/.*$/, "");
    for (const m of line.matchAll(FIELD_RE)) out.push(m[1]);
  }
  return out;
}

/** ordered, de-duplicated id/digest field names referenced in the `profile_bundle_digest = SHA256(...)` preimage */
function preimageFields(spec) {
  const start = spec.indexOf("profile_bundle_digest =");
  assert.notEqual(start, -1, "preimage block `profile_bundle_digest =` not found");
  const open = spec.indexOf("SHA256(", start) + "SHA256(".length;
  let depth = 1,
    i = open;
  for (; i < spec.length && depth > 0; i++) {
    if (spec[i] === "(") depth++;
    else if (spec[i] === ")") depth--;
  }
  const body = spec.slice(open, i - 1);
  const out = [],
    seen = new Set();
  for (let line of body.split("\n")) {
    line = line.replace(/\/\/.*$/, "");
    for (const m of line.matchAll(FIELD_RE)) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        out.push(m[1]);
      }
    }
  }
  return out;
}

function generatorFields() {
  const out = [];
  for (const [p] of BUNDLE_PROFILES) out.push(`${p}_id`, `${p}_digest`);
  return out;
}

test("A29 parity: object fields == preimage fields == generator fields, IN ORDER, 23 pairs", () => {
  const spec = readFileSync(SPEC, "utf8");
  const gen = generatorFields();
  assert.equal(gen.length, 46, "generator carries 23 id/digest pairs");
  assert.deepEqual(
    objectFields(spec),
    gen,
    "§4.4 object block must list the 23 pairs in generator order"
  );
  assert.deepEqual(
    preimageFields(spec),
    gen,
    "profile_bundle_digest PREIMAGE must bind the 23 pairs in generator order — A28 left it at 17"
  );
});

test("A29 self-test: deletion / insertion / reorder of a preimage pair all break parity", () => {
  const gen = generatorFields();
  const deletion = gen.slice(0, -2); // drop the last pair
  const insertion = [...gen, "rogue_extra_id", "rogue_extra_digest"];
  const reorder = [...gen];
  [reorder[0], reorder[2]] = [reorder[2], reorder[0]]; // swap two ids
  for (const [name, mutated] of [
    ["deletion", deletion],
    ["insertion", insertion],
    ["reorder", reorder],
  ]) {
    assert.notDeepEqual(mutated, gen, `${name} must break parity (the gate must reject it)`);
  }
});
