// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O (VSC) — K7 all-functions e2e net (MANDATORY before tag).
//
// Every export in tools/simurgh-attestation/stage5o is invoked or asserted at least once, and the
// LAST test is a generated census that FAILS if any export is untouched. That census is the point:
// a hand-maintained coverage claim records the last time someone remembered to look, which is this
// stage's own recurring defect. Add an export without exercising it and this net goes red.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { globSync, readFileSync } from "node:fs";

import * as constants from "../../../../tools/simurgh-attestation/stage5o/core/constants.mjs";
import * as shape from "../../../../tools/simurgh-attestation/stage5o/core/challengeArtifactShape.mjs";
import * as leaf from "../../../../tools/simurgh-attestation/stage5o/core/leafConstruction.mjs";
import * as merkle from "../../../../tools/simurgh-attestation/stage5o/core/merkleTree.mjs";
import * as disclosure from "../../../../tools/simurgh-attestation/stage5o/core/disclosurePolicy.mjs";
import * as universe from "../../../../tools/simurgh-attestation/stage5o/core/committedUniverseContext.mjs";
import * as s8 from "../../../../tools/simurgh-attestation/stage5o/core/section8Verifier.mjs";
import * as rational from "../../../../tools/simurgh-attestation/stage5o/core/probabilityRational.mjs";
import * as policy from "../../../../tools/simurgh-attestation/stage5o/core/probabilityPolicy.mjs";
import * as lane from "../../../../tools/simurgh-attestation/stage5o/core/laneProfile.mjs";
import * as descriptors from "../../../../tools/simurgh-attestation/stage5o/core/section7AuthorityDescriptors.mjs";
import * as portable from "../../../../tools/simurgh-attestation/stage5o/browser/vsc-portable.mjs";
import * as censusMaxima from "../../../../tools/simurgh-attestation/stage5o/node/measureCensusMaxima.mjs";
import * as scopeMax from "../../../../tools/simurgh-attestation/stage5o/node/measureScopeManifestMaximum.mjs";
import * as openingMax from "../../../../tools/simurgh-attestation/stage5o/node/measureOpeningMaximum.mjs";
import * as s9census from "../../../../tools/simurgh-attestation/stage5o/node/measureSection9Censuses.mjs";
import { POLICY as S8_POLICY } from "../../../unit/llmShield/stage5o/section8Fixture.mjs";

const sha256 = (b) => createHash("sha256").update(b).digest();

test("K7 constants: every pinned Stage 5O constant is present and well-formed", () => {
  assert.equal(constants.HEADER_HEX_CHARS, 160);
  assert.equal(constants.RETARGET_INTERVAL, 2016);
  assert.equal(constants.BEACON_MIN_LEAD_BLOCKS_V1, 6);
  assert.match(constants.STAGE5L_CHECKPOINT_DEPTH_CONVENTION, /^simurgh\./);
});

test("K7 shape: the checkpoint-shape checker and the width table are live", () => {
  assert.equal(typeof shape.checkVerifiedClosureBitcoinCheckpointShape, "function");
  // the shape checkers are THROWING validators: a non-object is refused at the door
  assert.throws(() => shape.checkVerifiedClosureBitcoinCheckpointShape(null), /not_an_object/);
  assert.equal(typeof shape.SHAPE_WIDTHS, "object");
  assert.ok(Object.keys(shape.SHAPE_WIDTHS).length > 0);
});

test("K7 leaf/merkle: the three domains are distinct and merkleNode composes", () => {
  const doms = [leaf.CASE_DOMAIN, leaf.LEAF_DOMAIN, leaf.EXECUTION_CASE_LINK_DOMAIN];
  assert.equal(new Set(doms).size, 3, "domain separation must be real");
  for (const d of doms) assert.match(d, /^simurgh\.vsc\./);
  const a = sha256("a");
  const b = sha256("b");
  const n = merkle.merkleNode(a, b);
  assert.equal(n.length, 32);
  assert.notDeepEqual(n, merkle.merkleNode(b, a), "node order must matter");
});

test("K7 disclosure policy: canonicalisation and its domain", () => {
  assert.match(disclosure.DISCLOSURE_POLICY_DOMAIN, /^simurgh\.vsc\.disclosure_policy/);
  const canon = disclosure.canonicalDisclosurePolicy(S8_POLICY);
  assert.deepEqual(Object.keys(canon).sort(), [...disclosure.DISCLOSURE_POLICY_LIMITS].sort());
  assert.throws(() => disclosure.canonicalDisclosurePolicy({}), /exact_key_schema/);
});

test("K7 opaque contexts: a lookalike is never a capability", () => {
  assert.equal(universe.isCommittedUniverseContext({ N: 4 }), false);
  assert.equal(universe.isCommittedUniverseContext(null), false);
});

test("K7 §8 factory: makeEvaluateSection8Safe wraps an arbitrary relation fail-closed", () => {
  const safe = s8.makeEvaluateSection8Safe(() => {
    throw new Error("boom");
  });
  // the §8 wrapper reports fail-closed as { fail_closed, raw_code } — its own frozen shape
  const v = safe({}, "{}");
  assert.equal(v.fail_closed, true);
  assert.equal(v.raw_code, 29, "an unexpected throw becomes raw 29, never a symbolic reason");
  assert.equal(v.reason, undefined, "a fail-closed result carries no symbolic reason");
  const passthrough = s8.makeEvaluateSection8Safe(() => ({ accept: true }));
  assert.deepEqual(passthrough({}, "{}"), { accept: true });
});

test("K7 rationals: ratEquals agrees with exact comparison", () => {
  assert.equal(rational.ratEquals({ n: 1n, d: 3n }, { n: 2n, d: 6n }), true);
  assert.equal(rational.ratEquals({ n: 1n, d: 3n }, { n: 1n, d: 4n }), false);
});

test("K7 probability policy: the three closed enums/limit lists are pinned", () => {
  assert.deepEqual([...policy.PROBABILITY_POLICY_BASES], ["absolute_count", "fraction"]);
  assert.deepEqual([...policy.PROBABILITY_CLAIM_TYPES], ["exact", "at_least"]);
  assert.equal(policy.PROBABILITY_POLICY_LIMITS.length, 5);
});

test("K7 lane profile: laneVerdict and the two-value enum", () => {
  assert.deepEqual([...lane.LANE_VALUES], [lane.LANES.A, lane.LANES.B]);
  assert.equal(lane.laneVerdict("not_a_lane", {}, []).ok, false);
  const keys = ["k/a", "k/b"];
  const salts = { "k/a": "0".repeat(64), "k/b": "1".repeat(64) };
  assert.equal(lane.laneVerdict(lane.LANES.B, salts, keys).ok, true);
  assert.equal(lane.laneVerdict(lane.LANES.B, { "k/a": salts["k/a"] }, keys).ok, false);
});

test("K7 authority descriptors: the four digest domains are distinct", () => {
  const d = [
    descriptors.SCHEMA_DESCRIPTOR_DIGEST_DOMAIN,
    descriptors.PROFILE_DESCRIPTOR_DIGEST_DOMAIN,
    descriptors.CHECKPOINT_INSTANCE_DIGEST_DOMAIN,
    descriptors.CHALLENGE_SEED_DIGEST_DOMAIN,
  ];
  assert.equal(
    new Set(d).size,
    4,
    "a shared digest domain would be a cross-construction collision"
  );
  for (const x of d) assert.match(x, /^simurgh\./);
});

test("K7 portable surface: framedDigestHex and ratReduce behave in the browser module", async () => {
  const h = await portable.framedDigestHex("dom", "body");
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(await portable.framedDigestHex("do", "mbody"), h, "framing must be injective");
  assert.deepEqual(portable.ratReduce(4n, 8n), { n: 1n, d: 2n });
  assert.deepEqual(portable.ratReduce(0n, 9n), { n: 0n, d: 1n });
});

test("K7 generators: census, scope-manifest and opening maxima are live and byte-stable", () => {
  assert.ok(censusMaxima.N_MAX > 0);
  assert.match(censusMaxima.EXECUTION_CENSUS_SCHEMA_ID, /^simurgh\.vsc\./);
  assert.match(censusMaxima.RESULT_CENSUS_SCHEMA_ID, /^simurgh\.vsc\./);
  const ex = censusMaxima.buildMaximalExecutionCensus(4);
  const re = censusMaxima.buildMaximalResultCensus(4);
  assert.ok(ex && re);
  assert.deepEqual(ex, censusMaxima.buildMaximalExecutionCensus(4), "byte-stable");

  assert.equal(typeof scopeMax.structuralBytes("x"), "number");
  assert.ok(scopeMax.MAX_SCOPE_CARDINALITY > 0);
  assert.ok(scopeMax.MAX_SCOPE_CANONICAL_BYTES > 0);
  assert.ok(scopeMax.EPOCH_DESCRIPTOR_KEYS.length > 0);
  assert.ok(scopeMax.POLICY_BINDINGS_KEYS.length > 0);
  const manifest = scopeMax.buildMaximalScopeManifest({ N: 2 });
  assert.ok(scopeMax.fieldLedger(manifest));

  const bundle = openingMax.maximalOpeningBundle({ k: 2, maxCaseBytes: 32, N: 8 });
  assert.ok(bundle && typeof bundle === "object");

  assert.ok(s9census.SECTION9_GRID_SIZES.length > 0);
});

test("K7 cross-stage invariant: Stage 5O's band collides with no prior stage", async () => {
  const E = await import("../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs");
  const vsc = Object.values(E.VSC_RAW_CODES).filter((c) => c !== 0);
  const prior = Object.keys(E.RUN_LEVEL_BY_RAW)
    .map(Number)
    .filter((n) => n < 420);
  assert.equal(vsc.filter((c) => prior.includes(c)).length, 0, "no collision with 0..419");
  assert.equal(Math.min(...vsc), 420);
  assert.equal(Math.max(...vsc), 463);
});

// ---------------------------------------------------------------------------------------------
// The census that makes this net self-enforcing.
// ---------------------------------------------------------------------------------------------
test("K7 CENSUS: every Stage 5O export is exercised by the test corpus (100%, derived)", () => {
  const modules = globSync("tools/simurgh-attestation/stage5o/**/*.mjs");
  const exports = [];
  for (const f of modules) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)) {
      exports.push({ file: f, name: m[1] });
    }
    for (const m of src.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)/gm)) {
      exports.push({ file: f, name: m[1] });
    }
  }
  const corpus = [
    ...globSync("tests/unit/llmShield/stage5o/**/*.{js,mjs}"),
    ...globSync("tests/e2e/llmShield/stage5o/**/*.{js,mjs}"),
  ]
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  const uncovered = exports.filter((e) => !new RegExp(`\\b${e.name}\\b`).test(corpus));
  assert.deepEqual(
    uncovered.map((e) => `${e.name}  (${e.file})`),
    [],
    `${uncovered.length} of ${exports.length} Stage 5O exports are never exercised`
  );
  assert.ok(exports.length > 200, `census must see the whole surface (saw ${exports.length})`);
});
