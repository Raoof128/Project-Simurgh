// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 7.6 — the precommitted historical function closure (Annex A3).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  historicalClosure,
  historicalMemberKey,
  checkTagPins,
  STAGE5_RELEASE_TAGS,
  INVENTORY_FAILURE_REASONS,
} from "../../../../tools/simurgh-attestation/stage5q/core/historicalClosure.mjs";

const rec = (tag, sha, members) => ({ tag_name: tag, commit_sha: sha, members });
const m = (id, digest, category = "exported_function") => ({
  function_id: id,
  source_digest: digest,
  category,
});

test("the tag closure is exactly the sixteen Stage 5 releases; head is NOT a tag", () => {
  assert.equal(STAGE5_RELEASE_TAGS.length, 16);
  assert.equal(STAGE5_RELEASE_TAGS[0], "v2.36.0-stage-5a-vnc");
  assert.equal(STAGE5_RELEASE_TAGS[15], "v2.51.0-stage-5p-vsi");
  assert.ok(!STAGE5_RELEASE_TAGS.includes("HEAD"), "current head is a separate campaign target");
});

test("members are keyed by (tag_name, function_id) — the SAME id in two tags is TWO members", () => {
  // The load-bearing test of the annex. A verifier that was strict at one release and permissive at
  // another is one function_id with two behaviours; collapsing them loses exactly the drift that
  // R12 (historical downgrade) exists to find.
  const r = historicalClosure({
    tagRecords: [
      rec("v2.40.0-stage-5e-vda", "aaa", [m("5e:core/v.mjs:verify", "digest-STRICT")]),
      rec("v2.48.0-stage-5m-vtc-quorum", "bbb", [m("5e:core/v.mjs:verify", "digest-LOOSE")]),
    ],
  });
  assert.equal(r.members.length, 2, "one member per (tag, function), never one per function");
  assert.deepEqual(
    r.members.map((x) => x.source_digest).sort(),
    ["digest-LOOSE", "digest-STRICT"],
    "both digests survive; the drift is visible"
  );
  assert.notEqual(
    historicalMemberKey("v2.40.0-stage-5e-vda", "x"),
    historicalMemberKey("v2.48.0-stage-5m-vtc-quorum", "x")
  );
});

test("still_trusted_by names every tag carrying the BYTE-IDENTICAL function", () => {
  const r = historicalClosure({
    tagRecords: [
      rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "same")]),
      rec("v2.37.0-stage-5b-var", "b", [m("5a:x.mjs:f", "same")]),
      rec("v2.38.0-stage-5c-vsb", "c", [m("5a:x.mjs:f", "changed")]),
    ],
  });
  const first = r.members.find((x) => x.tag_name === "v2.36.0-stage-5a-vnc");
  assert.deepEqual(first.still_trusted_by, ["v2.36.0-stage-5a-vnc", "v2.37.0-stage-5b-var"]);
  const third = r.members.find((x) => x.tag_name === "v2.38.0-stage-5c-vsb");
  assert.deepEqual(third.still_trusted_by, ["v2.38.0-stage-5c-vsb"], "a changed body stands alone");
});

test("a tag that cannot be checked out produces NO members — the failure is a SEPARATE list", () => {
  // Second gauntlet B5. An earlier version emitted `environment_unreproducible` "as a member-level
  // record", inventing a member-shaped object for an inventory that does not exist. A phantom
  // member is worse than an absent one, because it COUNTS: it lands in denominators, in coverage
  // ratios and in completeness claims.
  const r = historicalClosure({
    tagRecords: [
      rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d")]),
      { tag_name: "v2.37.0-stage-5b-var", commit_sha: "b", failure: { reason: "checkout_failed" } },
    ],
  });
  assert.equal(r.members.length, 1, "the failed tag contributes zero members");
  assert.ok(!r.members.some((x) => x.tag_name === "v2.37.0-stage-5b-var"));
  assert.equal(r.historical_inventory_failures.length, 1);
  assert.equal(r.historical_inventory_failures[0].tag_name, "v2.37.0-stage-5b-var");
  assert.equal(r.historical_inventory_failures[0].reason, "checkout_failed");
});

test("an unrecognised failure reason is normalised into the closed vocabulary, not passed through", () => {
  const r = historicalClosure({
    tagRecords: [
      { tag_name: "v2.36.0-stage-5a-vnc", commit_sha: "a", failure: { reason: "vibes" } },
    ],
  });
  assert.ok(INVENTORY_FAILURE_REASONS.includes(r.historical_inventory_failures[0].reason));
});

test("the digest is byte-stable across two runs of the same input", () => {
  const input = {
    tagRecords: [
      rec("v2.37.0-stage-5b-var", "b", [m("5b:y.mjs:g", "d2"), m("5b:x.mjs:f", "d1")]),
      rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d0")]),
    ],
  };
  assert.equal(
    historicalClosure(input).historical_function_closure_digest,
    historicalClosure(input).historical_function_closure_digest
  );
});

test("the digest is INDEPENDENT of the order the driver walked the tags in", () => {
  // Otherwise the digest is a fact about the traversal, not about the closure.
  const a = [
    rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d0")]),
    rec("v2.37.0-stage-5b-var", "b", [m("5b:y.mjs:g", "d1")]),
  ];
  assert.equal(
    historicalClosure({ tagRecords: a }).historical_function_closure_digest,
    historicalClosure({ tagRecords: [...a].reverse() }).historical_function_closure_digest
  );
});

test("the digest CHANGES when one source_digest changes — it is not a count", () => {
  const base = [rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d0")])];
  const drift = [rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d0-CHANGED")])];
  assert.notEqual(
    historicalClosure({ tagRecords: base }).historical_function_closure_digest,
    historicalClosure({ tagRecords: drift }).historical_function_closure_digest
  );
});

test("the digest COVERS the failure list — a gap cannot be added silently", () => {
  const clean = [rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d0")])];
  const withGap = [
    ...clean,
    { tag_name: "v2.37.0-stage-5b-var", commit_sha: "b", failure: { reason: "tag_absent" } },
  ];
  assert.notEqual(
    historicalClosure({ tagRecords: clean }).historical_function_closure_digest,
    historicalClosure({ tagRecords: withGap }).historical_function_closure_digest,
    "a committed gap must move the digest, or the receipt could hide it"
  );
});

test("ENUMERATION RUNS NO ATTACK — the pack runner is never invoked", () => {
  // Annex A3 is explicit: this task enumerates, it does not attack. Enumerating and attacking in
  // one pass is how a universe ends up sized to the attacks that happened to work.
  let packRunnerCalls = 0;
  const runPack = () => {
    packRunnerCalls += 1;
  };
  globalThis.__vsrPackRunner = runPack;
  try {
    historicalClosure({
      tagRecords: [rec("v2.36.0-stage-5a-vnc", "a", [m("5a:x.mjs:f", "d0")])],
    });
  } finally {
    delete globalThis.__vsrPackRunner;
  }
  assert.equal(packRunnerCalls, 0);
});

test("an empty tag list is a valid closure of zero with a stable digest, not an error", () => {
  const r = historicalClosure({ tagRecords: [] });
  assert.deepEqual(r.members, []);
  assert.deepEqual(r.historical_inventory_failures, []);
  assert.match(r.historical_function_closure_digest, /^[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------------------------
// §3.1 — "A tag that moves is itself a finding"
// ---------------------------------------------------------------------------------------------

test("a tag repointed to a different commit is caught", () => {
  const r = checkTagPins({
    pinned: { "v2.36.0-stage-5a-vnc": "aaa" },
    observed: { "v2.36.0-stage-5a-vnc": "bbb" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "tag_moved");
  assert.equal(r.problems[0].pinned_sha, "aaa");
  assert.equal(r.problems[0].observed_sha, "bbb");
});

test("a missing tag and an unpinned extra tag are both caught", () => {
  const r = checkTagPins({
    pinned: { a: "1", b: "2" },
    observed: { a: "1", c: "3" },
  });
  const kinds = r.problems.map((p) => p.kind).sort();
  assert.deepEqual(kinds, ["tag_absent", "tag_unpinned"]);
});

test("matching pins are clean", () => {
  assert.equal(checkTagPins({ pinned: { a: "1" }, observed: { a: "1" } }).ok, true);
});
