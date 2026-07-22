// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — A30: the §5.2.2 census maxima are GENERATOR-DERIVED, not hand-carried, and the frozen
// §5.2 result-census field name matches the generator. Before A30 the maxima were "<derived>" and the
// result census field was the doubled `reported_reported_result_census_digest`; this gate FAILS on
// that spec (census-from-spec mismatch + <derived> mismatch) and passes on the corrected one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  generateCensusMaxima,
  EXECUTION_CENSUS_KEYS,
  RESULT_CENSUS_KEYS,
  EXECUTION_ENTRY_KEYS,
  RESULT_ENTRY_KEYS,
} from "../../../../tools/simurgh-attestation/stage5o/node/measureCensusMaxima.mjs";

const SPEC = new URL(
  "../../../../docs/superpowers/specs/2026-07-15-stage-5o-vsc-hidden-universe-equality-design.md",
  import.meta.url
);
const GEN = new URL(
  "../../../../tools/simurgh-attestation/stage5o/node/measureCensusMaxima.mjs",
  import.meta.url
);

/** ordered identifiers of a flat `<name> = { ... }` block (comments stripped) */
function extractBlockKeys(spec, blockName) {
  const start = spec.indexOf(`${blockName} = {`);
  assert.notEqual(start, -1, `block "${blockName} = {" not found in the working tree`);
  const open = spec.indexOf("{", start);
  const close = spec.indexOf("}", open);
  const keys = [];
  for (let line of spec.slice(open + 1, close).split("\n")) {
    line = line.replace(/\/\/.*$/, "").trim();
    for (let frag of line.split(",")) {
      frag = frag.trim();
      const m = frag.match(/^([a-z_][a-z0-9_]*)/);
      if (m) keys.push(m[1]);
    }
  }
  return keys;
}

test("gate 3 — dual-ledger: production encoder == structural ledger for both censuses", () => {
  const m = generateCensusMaxima();
  assert.equal(m.exec.encoderTotal, m.exec.ledgerTotal, "execution census views disagree");
  assert.equal(m.result.encoderTotal, m.result.ledgerTotal, "result census views disagree");
});

test("the derived maxima, pinned (the script is the authority; change the schema and these move)", () => {
  const m = generateCensusMaxima();
  assert.equal(m.MAX_EXECUTION_CENSUS_CANONICAL_BYTES_V1, 19191389);
  assert.equal(m.MAX_RESULT_CENSUS_CANONICAL_BYTES_V1, 19191387);
});

test("census-from-spec: §5.2 schemas match the generator (catches the doubled field name)", () => {
  const spec = readFileSync(SPEC, "utf8");
  assert.deepEqual(
    extractBlockKeys(spec, "execution_record_census"),
    [...EXECUTION_CENSUS_KEYS],
    "execution_record_census keys drifted from the generator"
  );
  assert.deepEqual(
    extractBlockKeys(spec, "reported_result_census"),
    [...RESULT_CENSUS_KEYS],
    "reported_result_census keys drifted — e.g. a doubled `reported_reported_...` field"
  );
  assert.deepEqual(extractBlockKeys(spec, "execution_entry_i"), [...EXECUTION_ENTRY_KEYS]);
  assert.deepEqual(extractBlockKeys(spec, "result_entry_i"), [...RESULT_ENTRY_KEYS]);
});

test("§5.2.2 constants equal the generator maxima (no `<derived>` placeholder survives)", () => {
  const spec = readFileSync(SPEC, "utf8");
  const grab = (name) => {
    const m = spec.match(new RegExp(name + '\\s*=\\s*"([^"]*)"'));
    assert.ok(m, `${name} not found in §5.2.2`);
    return m[1];
  };
  const m = generateCensusMaxima();
  assert.equal(
    grab("MAX_EXECUTION_CENSUS_CANONICAL_BYTES"),
    String(m.MAX_EXECUTION_CENSUS_CANONICAL_BYTES_V1)
  );
  assert.equal(
    grab("MAX_RESULT_CENSUS_CANONICAL_BYTES"),
    String(m.MAX_RESULT_CENSUS_CANONICAL_BYTES_V1)
  );
});

test("gate 2 — anti-oracle: no expected maximum appears in the generator source", () => {
  const src = readFileSync(GEN, "utf8");
  for (const forbidden of ["19191389", "19,191,389", "19191387", "19,191,387", "19191396"]) {
    assert.ok(!src.includes(forbidden), `generator must DERIVE, not assert ${forbidden}`);
  }
});
