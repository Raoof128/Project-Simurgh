// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 19.5 — cross-runtime parity over the deterministic surface.
//
// Two things can make a parity claim worthless, and both are tested here:
//
//   a vector set of easy cases   any three implementations agree on ASCII with LF endings. The
//                                vectors must contain the cases where runtimes ACTUALLY diverge,
//                                or "they agreed" is a fact about the sample.
//
//   a mirror agreeing with       three mirrors agreeing prove they share an author. The portable
//   other mirrors                module must agree with the SHIPPED core, and that is asserted
//                                here in-process rather than only in the driver.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import * as portable from "../../../../tools/simurgh-attestation/stage5q/browser/vsr-portable.mjs";
import { disagreements } from "../../../../tools/simurgh-attestation/stage5q/node/runCrossRuntimeParity.mjs";
import {
  canonicalSourceBytes,
  sourceSpanDigest,
} from "../../../../tools/simurgh-attestation/stage5q/core/sourceDigest.mjs";
import {
  makeFunctionId,
  parseFunctionId,
} from "../../../../tools/simurgh-attestation/stage5q/core/functionId.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { merkleRoot } from "../../../../tools/simurgh-attestation/stage5k/core/merkle.mjs";

const VECTORS = "tools/simurgh-attestation/stage5q/python/parity-vectors.json";
const PAGE = "tools/simurgh-attestation/stage5q/browser/index.html";
const PORTABLE = "tools/simurgh-attestation/stage5q/browser/vsr-portable.mjs";
const RECEIPT = "docs/research/llm-shield/evidence/stage-5q/parity/cross-runtime-parity.json";

const doc = JSON.parse(readFileSync(VECTORS, "utf8"));

// ------------------------------------------------------------------------------------------------
// The vectors must be able to catch a divergence.
// ------------------------------------------------------------------------------------------------

test("the vectors cover the cases where runtimes ACTUALLY diverge", () => {
  const why = doc.vectors.map((v) => `${v.id} ${v.why}`).join(" | ");
  for (const [what, pattern] of [
    ["CRLF", /CRLF/],
    ["lone CR", /lone CR/],
    ["non-ASCII bytes", /non-ASCII/],
    ["unicode key ordering", /locale/],
    ["odd Merkle promotion", /PROMOTED/],
    ["Merkle order sensitivity", /not commutative/],
    ["a symbol containing the separator", /contains ':'/],
  ]) {
    assert.match(why, pattern, `no vector exercises ${what}`);
  }
});

test("every vector carries a `why` — a vector nobody can justify is a vector nobody will maintain", () => {
  for (const v of doc.vectors) {
    assert.ok(typeof v.why === "string" && v.why.length > 20, `${v.id} has no real justification`);
  }
});

test("vector ids are unique", () => {
  const ids = doc.vectors.map((v) => v.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the surface's exclusions are DECLARED, not discovered later", () => {
  // Floats and non-BMP escaping genuinely differ between JSON.stringify and json.dumps. A parity
  // claim that quietly avoided them would be a claim whose boundary nobody could see.
  const excluded = doc.excluded_from_the_surface.join(" ");
  assert.match(excluded, /[Ff]loating-point/);
  assert.match(excluded, /non-BMP/);
});

// ------------------------------------------------------------------------------------------------
// The portable mirror must agree with the SHIPPED core.
// ------------------------------------------------------------------------------------------------

test("portable canonicalSourceBytes == core, on every source vector", () => {
  for (const v of doc.vectors.filter((x) => x.kind === "canonical_source_bytes")) {
    const bytes = Uint8Array.from(v.bytes);
    assert.deepEqual(
      [...portable.canonicalSourceBytes(bytes)],
      [...canonicalSourceBytes(Buffer.from(bytes))],
      v.id
    );
  }
});

test("portable sourceSpanDigest == core, on every digest vector", async () => {
  for (const v of doc.vectors.filter((x) => x.kind === "source_span_digest")) {
    const bytes = Uint8Array.from(v.bytes);
    assert.equal(
      await portable.sourceSpanDigest(bytes),
      sourceSpanDigest(Buffer.from(bytes)),
      v.id
    );
  }
});

test("portable function ids == core, including a symbol that contains the separator", () => {
  for (const v of doc.vectors.filter((x) => x.kind === "function_id")) {
    assert.equal(portable.makeFunctionId(v.parts), makeFunctionId(v.parts), v.id);
  }
  for (const v of doc.vectors.filter((x) => x.kind === "parse_function_id")) {
    const a = portable.parseFunctionId(v.id_text);
    const b = parseFunctionId(v.id_text);
    assert.equal(a.stageId, b.stageId);
    assert.equal(a.modulePath, b.modulePath);
    assert.equal(a.symbol, b.symbol);
  }
});

test("portable canonicalJson == the shared canonicaliser", () => {
  for (const v of doc.vectors.filter((x) => x.kind === "canonical_json")) {
    assert.equal(portable.canonicalJson(v.value), canonicalJson(v.value), v.id);
  }
});

test("portable merkleRootHex == stage5k's merkleRoot, promotion and all", async () => {
  for (const v of doc.vectors.filter((x) => x.kind === "merkle_root")) {
    const expected = merkleRoot(v.leaves.map((h) => Buffer.from(h, "hex"))).toString("hex");
    assert.equal(await portable.merkleRootHex(v.leaves), expected, v.id);
  }
});

test("the Merkle root is ORDER-SENSITIVE, and a vector proves it", async () => {
  // If it were not, the closure commitment's explicit sort would be decoration and the root would
  // depend on readdirSync order — a byte-stability claim that holds on one machine and not the next.
  const pair = doc.vectors.find((v) => v.id === "merkle-02-pair");
  const reversed = doc.vectors.find((v) => v.id === "merkle-05-order-matters");
  assert.notEqual(
    await portable.merkleRootHex(pair.leaves),
    await portable.merkleRootHex(reversed.leaves)
  );
});

test("a tenth field does not move a closure leaf — the projection is exactly nine", async () => {
  const a = doc.vectors.find((v) => v.id === "leaf-01");
  const b = doc.vectors.find((v) => v.id === "leaf-02-extra-field-ignored");
  assert.equal(await portable.closureLeafHash(a.row), await portable.closureLeafHash(b.row));
});

// ------------------------------------------------------------------------------------------------
// The comparison itself.
// ------------------------------------------------------------------------------------------------

test("key order is NOT a divergence", () => {
  // The first version compared with JSON.stringify and reported `fid-03` as a cross-runtime
  // divergence because Python sorted the keys of an object whose values were identical. A
  // comparison sensitive to key order measures the serialiser.
  const a = { x: { stageId: "5o", modulePath: "p", symbol: "s" } };
  const b = { x: { modulePath: "p", symbol: "s", stageId: "5o" } };
  assert.deepEqual(disagreements(a, b), []);
});

test("a real difference IS a divergence", () => {
  assert.deepEqual(disagreements({ x: 1 }, { x: 2 }), ["x"]);
  // And a key present in one side only, which is how a runtime silently skipping a vector shows up.
  assert.deepEqual(disagreements({ x: 1 }, {}), ["x"]);
});

// ------------------------------------------------------------------------------------------------
// The browser page.
// ------------------------------------------------------------------------------------------------

test("the page cannot fetch anything: default-src none, no connect-src", () => {
  const html = readFileSync(PAGE, "utf8");
  const csp = /Content-Security-Policy"\s*\n?\s*content="([^"]+)"/.exec(html)?.[1] ?? "";
  assert.match(csp, /default-src 'none'/);
  assert.equal(/connect-src/.test(csp), false);
});

test("an unprepared page fails LOUDLY rather than evaluating an empty surface", () => {
  const html = readFileSync(PAGE, "utf8");
  assert.match(html, /__VSR_PORTABLE__/);
  assert.match(html, /startsWith\("__VSR"\)/);
});

test("the portable module uses no Node built-ins", () => {
  // It has to run in a browser. `node:crypto` and `Buffer` exist in neither direction, and a
  // module that imported one would work in the test and fail in the runtime it exists for.
  const src = readFileSync(PORTABLE, "utf8");
  assert.equal(/from "node:/.test(src), false);
  assert.equal(/\bBuffer\./.test(src), false);
});

// ------------------------------------------------------------------------------------------------
// The committed receipt.
// ------------------------------------------------------------------------------------------------

test("the receipt never claims three-runtime parity without three runtimes", () => {
  if (!existsSync(RECEIPT)) return;
  const r = JSON.parse(readFileSync(RECEIPT, "utf8"));
  const allRan = Object.values(r.runtimes).every((x) => x.ran === true);
  // The implication, both ways round. A missing browser is not a pass, and a claimed pass with a
  // missing browser is the exact overclaim gauntlet P1-32 named.
  if (!allRan) assert.equal(r.three_runtime_parity, false);
  if (r.three_runtime_parity === true) {
    assert.equal(allRan, true);
    assert.equal(r.browser_parity_proven, true);
    for (const c of r.comparisons) assert.deepEqual(c.differing, []);
  }
});

test("the receipt is bound to the vector bytes it was produced from", () => {
  if (!existsSync(RECEIPT)) return;
  const r = JSON.parse(readFileSync(RECEIPT, "utf8"));
  const digest = createHash("sha256").update(readFileSync(VECTORS)).digest("hex");
  assert.equal(r.vectors_digest, digest, "the receipt describes a different vector set");
  assert.equal(r.vector_count, doc.vectors.length);
});
