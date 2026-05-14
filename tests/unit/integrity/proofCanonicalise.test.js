import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicaliseProofPayload } from "../../../src/integrity/proofCanonicalise.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("canonicaliseProofPayload", () => {
  test("sorts top-level keys lexicographically", () => {
    const result = canonicaliseProofPayload({ b: 2, a: 1, c: 3 });
    assert.equal(result, '{"a":1,"b":2,"c":3}');
  });

  test("sorts nested object keys recursively", () => {
    const result = canonicaliseProofPayload({ outer: { z: 1, a: 2 }, alpha: 1 });
    assert.equal(result, '{"alpha":1,"outer":{"a":2,"z":1}}');
  });

  test("preserves array order", () => {
    const result = canonicaliseProofPayload({ list: [3, 1, 2] });
    assert.equal(result, '{"list":[3,1,2]}');
  });

  test("excludes top-level signature only", () => {
    const result = canonicaliseProofPayload({ a: 1, signature: "sig", b: 2 });
    assert.equal(result, '{"a":1,"b":2}');
  });

  test("preserves nested signature key", () => {
    const result = canonicaliseProofPayload({ a: { signature: "nested" }, signature: "top" });
    assert.equal(result, '{"a":{"signature":"nested"}}');
  });

  test("emits no whitespace", () => {
    const result = canonicaliseProofPayload({ a: 1, b: { c: [1, 2] } });
    assert.ok(!/\s/.test(result), `has whitespace: ${result}`);
  });

  test("integers stay integers (no .0)", () => {
    const result = canonicaliseProofPayload({ n: 5 });
    assert.equal(result, '{"n":5}');
  });

  test("empty object and empty array", () => {
    assert.equal(canonicaliseProofPayload({}), "{}");
    assert.equal(canonicaliseProofPayload({ a: [] }), '{"a":[]}');
  });

  test("strings are JSON-encoded with escaping", () => {
    const result = canonicaliseProofPayload({ s: 'hello "world"' });
    assert.equal(result, '{"s":"hello \\"world\\""}');
  });

  test("booleans and null encode correctly", () => {
    assert.equal(canonicaliseProofPayload({ b: true, n: null }), '{"b":true,"n":null}');
  });

  test("golden fixture canonical SHA-256 matches expected hex", () => {
    const fixturePath = join(__dirname, "__fixtures__", "golden-proof.json");
    const expectedPath = join(__dirname, "__fixtures__", "golden-proof.sha256");
    const proof = JSON.parse(readFileSync(fixturePath, "utf8"));
    const expected = readFileSync(expectedPath, "utf8").trim();

    const canonical = canonicaliseProofPayload(proof);
    const actual = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");

    assert.equal(actual, expected, `canonical: ${canonical}`);
  });
});
