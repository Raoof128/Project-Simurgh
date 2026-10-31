// SPDX-License-Identifier: AGPL-3.0-or-later
// Audit C-8/E-3: the strict canonicaliser refuses the inputs on which the shared canonical form is
// not injective, and is byte-identical to it on everything it accepts.
import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoDuplicateKeys,
  canonicalJson,
  canonicalJsonStrict,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";

test("strict output equals the shared form on accepted input", () => {
  const value = { b: [1, "x", { z: null, a: true }], a: 1.5, n: { 10: 1, 9: 2 } };
  assert.equal(canonicalJsonStrict(value), canonicalJson(value));
});

test("the four non-injective inputs are refused", () => {
  assert.throws(
    () => canonicalJsonStrict(JSON.parse('{"a":1,"__proto__":{"x":1}}')),
    /forbidden_key/
  );
  assert.throws(() => canonicalJsonStrict({ a: 1e400 }), /non_finite/);
  assert.throws(() => canonicalJsonStrict({ a: -0 }), /negative_zero/);
  assert.throws(() => canonicalJsonStrict({ a: 2 ** 53 + 2 }), /unsafe_integer/);
  // The shared form silently collapses each of them:
  assert.equal(canonicalJson(JSON.parse('{"a":1,"__proto__":{"x":1}}')), canonicalJson({ a: 1 }));
  assert.equal(canonicalJson({ a: 1e400 }), canonicalJson({ a: null }));
});

test("duplicate keys at any depth are refused before parsing; escaped quotes are not keys", () => {
  assert.equal(assertNoDuplicateKeys('{"a":1,"b":{"c":1,"d":[{"e":1}]}}'), true);
  assert.throws(() => assertNoDuplicateKeys('{"a":1,"a":2}'), /json_duplicate_key:a/);
  assert.throws(() => assertNoDuplicateKeys('{"a":{"b":1,"b":2}}'), /json_duplicate_key:b/);
  assert.equal(assertNoDuplicateKeys('{"a":"x\\"a\\"","b":"a"}'), true);
  assert.equal(assertNoDuplicateKeys('[{"a":1},{"a":2}]'), true);
  // An escaped spelling of the same name is the same key.
  assert.throws(() => assertNoDuplicateKeys('{"a":1,"\\u0061":2}'), /json_duplicate_key:a/);
  assert.throws(() => assertNoDuplicateKeys('{"\\u00e9":1,"é":2}'), /json_duplicate_key/);
});

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("the maintained verifier passes the committed 3M bundle and refuses the same bundle with a duplicated key", (t) => {
  const ev = "docs/research/llm-shield/evidence/stage-3m";
  const args = (bundle) => [
    "tools/simurgh-attestation/verify-attestation.mjs",
    "--bundle",
    bundle,
    "--signature",
    `${ev}/attestation.signature.json`,
    "--public-key",
    `${ev}/attestation.public-key.json`,
  ];
  const clean = execFileSync(process.execPath, args(`${ev}/attestation.bundle.json`), {
    encoding: "utf8",
  });
  assert.match(clean, /simurgh attestation verify: PASS/);
  assert.match(clean, /bundle_unambiguous: true/);
  const scratch = mkdtempSync(join(tmpdir(), "simurgh-dupkey-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  // Repeat the first top-level key with its own value: JSON.parse and the canonical digest see the
  // same document, so every other check still passes; only the text check can refuse it.
  const text = readFileSync(`${ev}/attestation.bundle.json`, "utf8").trimEnd();
  const m = /^\{\s*("[^"]+")\s*:/.exec(text);
  assert.ok(m, "bundle starts with an object key");
  const key = m[1];
  const valueStart = text.indexOf(":", text.indexOf(key)) + 1;
  // Find the end of the first value by re-parsing progressively longer prefixes.
  let valueEnd = -1;
  for (let i = valueStart + 1; i < text.length; i += 1) {
    try {
      JSON.parse(text.slice(valueStart, i));
      valueEnd = i;
      break;
    } catch {}
  }
  assert.ok(valueEnd > valueStart, "found the first value");
  const dup = `{${key}:${text.slice(valueStart, valueEnd)},${text.slice(1)}`;
  JSON.parse(dup); // still valid JSON
  const path = join(scratch, "attestation.bundle.json");
  writeFileSync(path, dup);
  const result = spawnSync(process.execPath, args(path), { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /bundle_unambiguous: false/);
  assert.match(result.stdout, /bundle_digest_match: true/);
});
