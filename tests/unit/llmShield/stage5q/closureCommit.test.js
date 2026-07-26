// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 8 — the closure commitment, the L2 boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commitClosure,
  validateTagClosure,
  validateOverlay,
  joinCommitmentAndOverlay,
  sortedLeavesAreLoadBearing,
  COMMITMENT_FIELDS,
  OVERLAY_FIELDS,
} from "../../../../tools/simurgh-attestation/stage5q/core/closureCommit.mjs";
import {
  leafHash,
  merkleRoot,
} from "../../../../tools/simurgh-attestation/stage5k/core/merkle.mjs";
import { STAGE5_RELEASE_TAGS } from "../../../../tools/simurgh-attestation/stage5q/core/historicalClosure.mjs";

const SHA = "a".repeat(40);

const member = (id, extra = {}) => ({
  function_id: id,
  stage_id: "5a",
  module_path: "tools/simurgh-attestation/stage5a/core/x.mjs",
  export_name_or_internal_symbol: id.split(":").pop(),
  source_digest: `digest-${id}`,
  category: "exported_function",
  ...extra,
});

const rolesFor = (...ids) => Object.fromEntries(ids.map((id) => [id, "schema_gate"]));

const tags = STAGE5_RELEASE_TAGS.map((tag_name, i) => ({
  tag_name,
  commit_sha: String(i).repeat(8),
}));

const commit = (ids, over = {}) =>
  commitClosure({
    members: ids.map((id) => member(id)),
    roles: rolesFor(...ids),
    tagClosure: tags,
    closureSourceCommit: SHA,
    ...over,
  });

// ---------------------------------------------------------------------------------------------
// THE MERKLE ORDER MEASUREMENT — the plan pinned the opposite of the truth
// ---------------------------------------------------------------------------------------------

test("merkleRoot is order-SENSITIVE, so the explicit sort in commitClosure is load-bearing", () => {
  // The plan recorded as a measured fact that `merkleRoot` is SELF-SORTING and instructed
  // implementers NOT to sort. It is not, and it cannot be: nodeHash concatenates left||right, which
  // is not commutative. Following that instruction would have produced a commitment whose root
  // depended on readdirSync order — a byte-stability claim that holds on one machine and fails on
  // the next, discovered long after the universe froze.
  const leaves = ["a", "b", "c"].map((id) =>
    leafHash({ leaf_id: id, leaf_type: "t", subject_digest: `sha256:${"0".repeat(64)}` })
  );
  assert.notEqual(
    merkleRoot(leaves).toString("hex"),
    merkleRoot([...leaves].reverse()).toString("hex"),
    "if this ever becomes equal, the sort is redundant and this comment is wrong"
  );
  assert.equal(sortedLeavesAreLoadBearing(leaves), true);
});

test("merkleRoot([]) throws — an empty universe is impossible to commit", () => {
  // A stage that could commit an empty universe could report 100% coverage of nothing.
  assert.throws(() => merkleRoot([]), /empty merkle tree/);
  assert.throws(
    () => commit([]),
    /empty closure|100% coverage of nothing/,
    "commitClosure must refuse before it ever reaches the Merkle builder"
  );
});

// ---------------------------------------------------------------------------------------------
// Byte-stability and the four digest properties
// ---------------------------------------------------------------------------------------------

test("two builds of the same closure produce identical digests", () => {
  const a = commit(["5a:x.mjs:f", "5a:x.mjs:g"]);
  const b = commit(["5a:x.mjs:f", "5a:x.mjs:g"]);
  assert.equal(a.merkle_root, b.merkle_root);
  assert.equal(a.closure_member_commitment_digest, b.closure_member_commitment_digest);
});

test("ADDING one member changes the digest", () => {
  const a = commit(["5a:x.mjs:f"]);
  const b = commit(["5a:x.mjs:f", "5a:x.mjs:g"]);
  assert.notEqual(a.merkle_root, b.merkle_root);
  assert.notEqual(a.closure_member_commitment_digest, b.closure_member_commitment_digest);
});

test("REMOVING one member changes the digest — the gerrymandering direction, tested explicitly", () => {
  // Additions are the direction everyone tests. Quietly dropping a member is the one that turns a
  // coverage ratio into a lie, and it is the cheaper attack.
  const a = commit(["5a:x.mjs:f", "5a:x.mjs:g", "5a:x.mjs:h"]);
  const b = commit(["5a:x.mjs:f", "5a:x.mjs:g"]);
  assert.notEqual(a.merkle_root, b.merkle_root);
  assert.equal(a.member_count, 3);
  assert.equal(b.member_count, 2);
});

test("REORDERING members does NOT change the digest — it describes the set, not the listing", () => {
  const a = commit(["5a:x.mjs:f", "5a:x.mjs:g", "5a:x.mjs:h"]);
  const b = commit(["5a:x.mjs:h", "5a:x.mjs:f", "5a:x.mjs:g"]);
  assert.equal(a.merkle_root, b.merkle_root);
  assert.equal(a.closure_member_commitment_digest, b.closure_member_commitment_digest);
});

test("changing one member's SOURCE DIGEST changes the commitment", () => {
  const base = commitClosure({
    members: [member("5a:x.mjs:f")],
    roles: rolesFor("5a:x.mjs:f"),
    tagClosure: tags,
    closureSourceCommit: SHA,
  });
  const drift = commitClosure({
    members: [member("5a:x.mjs:f", { source_digest: "CHANGED" })],
    roles: rolesFor("5a:x.mjs:f"),
    tagClosure: tags,
    closureSourceCommit: SHA,
  });
  assert.notEqual(base.merkle_root, drift.merkle_root);
});

test("a DUPLICATE function_id fails BEFORE Merkle construction", () => {
  // Canonical sorting would place the two records adjacently, and a downstream de-dupe would
  // collapse them into one — shrinking the universe without changing anything a reader could see.
  assert.throws(
    () =>
      commitClosure({
        members: [member("5a:x.mjs:f"), member("5a:x.mjs:f")],
        roles: rolesFor("5a:x.mjs:f"),
        tagClosure: tags,
        closureSourceCommit: SHA,
      }),
    /duplicate function_id/
  );
});

test("a member with no frozen security_role cannot be committed", () => {
  assert.throws(
    () =>
      commitClosure({
        members: [member("5a:x.mjs:f")],
        roles: {},
        tagClosure: tags,
        closureSourceCommit: SHA,
      }),
    /no frozen security_role/
  );
});

// ---------------------------------------------------------------------------------------------
// closure_source_commit — passed in, never read from HEAD (gauntlet P1-16)
// ---------------------------------------------------------------------------------------------

test("closure_source_commit is REQUIRED and must be a 40-hex sha", () => {
  for (const bad of [undefined, "", "HEAD", "abc", "A".repeat(40)]) {
    assert.throws(
      () => commit(["5a:x.mjs:f"], { closureSourceCommit: bad }),
      /closure_source_commit/,
      `${JSON.stringify(bad)} must be refused`
    );
  }
});

test("the same closure with a DIFFERENT source commit keeps the same merkle root", () => {
  // The commit sha records provenance; it is not part of what the universe IS. Mixing them would
  // make an unchanged closure look changed after every rebase.
  const a = commit(["5a:x.mjs:f"]);
  const b = commit(["5a:x.mjs:f"], { closureSourceCommit: "b".repeat(40) });
  assert.equal(a.merkle_root, b.merkle_root);
  assert.notEqual(a.closure_source_commit, b.closure_source_commit);
});

// ---------------------------------------------------------------------------------------------
// The tag closure — rejecting only additions catches the least likely attack (gauntlet P1-19)
// ---------------------------------------------------------------------------------------------

test("the tag closure holds exactly the sixteen tags of §3.1", () => {
  const r = validateTagClosure({ tags, expectedNames: STAGE5_RELEASE_TAGS });
  assert.deepEqual(r.problems, []);
  assert.equal(tags.length, 16);
});

test("a SEVENTEENTH tag is rejected", () => {
  const r = validateTagClosure({
    tags: [...tags, { tag_name: "v2.52.0-stage-5q-vsr", commit_sha: "z" }],
    expectedNames: STAGE5_RELEASE_TAGS,
  });
  assert.equal(r.problems[0].kind, "unexpected_tag");
});

test("a MISSING tag is rejected", () => {
  const r = validateTagClosure({ tags: tags.slice(1), expectedNames: STAGE5_RELEASE_TAGS });
  assert.ok(r.problems.some((p) => p.kind === "missing_tag"));
});

test("a tag whose SHA CHANGED is rejected", () => {
  const expectedShas = Object.fromEntries(tags.map((t) => [t.tag_name, t.commit_sha]));
  const moved = tags.map((t, i) => (i === 0 ? { ...t, commit_sha: "moved" } : t));
  const r = validateTagClosure({ tags: moved, expectedNames: STAGE5_RELEASE_TAGS, expectedShas });
  const p = r.problems.find((x) => x.kind === "tag_sha_changed");
  assert.ok(p);
  assert.equal(p.observed, "moved");
});

test("a DUPLICATE tag name is rejected", () => {
  const r = validateTagClosure({
    tags: [...tags, tags[0]],
    expectedNames: STAGE5_RELEASE_TAGS,
  });
  assert.ok(r.problems.some((p) => p.kind === "duplicate_tag_name"));
});

// ---------------------------------------------------------------------------------------------
// Annex A2 — the commitment / overlay split
// ---------------------------------------------------------------------------------------------

test("the commitment carries the NINE immutable fields and neither overlay field", () => {
  const c = commit(["5a:x.mjs:f"]);
  assert.deepEqual(Object.keys(c.rows[0]).sort(), [...COMMITMENT_FIELDS].sort());
  assert.ok(!("coverage_status" in c.rows[0]), "coverage_status does not exist until Task 19");
  assert.ok(!("attack_pack_ids" in c.rows[0]), "attack_pack_ids do not exist until Task 19");
});

test("an overlay row whose function_id is NOT in the commitment is rejected", () => {
  // The gerrymandering direction the split creates: an overlay that could introduce a member would
  // let Task 19 choose its own denominator after seeing the results.
  const c = commit(["5a:x.mjs:f"]);
  const r = validateOverlay({
    commitment: c,
    overlay: [
      { function_id: "5a:x.mjs:f", attack_pack_ids: [], coverage_status: "attacked_pass" },
      { function_id: "5a:ghost.mjs:z", attack_pack_ids: [], coverage_status: "attacked_pass" },
    ],
  });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "overlay_member_not_in_commitment");
});

test("the overlay cannot DROP a member — cardinality is fixed at L2", () => {
  const c = commit(["5a:x.mjs:f", "5a:x.mjs:g"]);
  const r = validateOverlay({
    commitment: c,
    overlay: [{ function_id: "5a:x.mjs:f", attack_pack_ids: [], coverage_status: "attacked_pass" }],
  });
  const p = r.problems.find((x) => x.kind === "overlay_missing_member");
  assert.ok(p);
  assert.equal(p.function_id, "5a:x.mjs:g");
});

test("the overlay cannot RE-KEY a member with a duplicate row", () => {
  const c = commit(["5a:x.mjs:f"]);
  const r = validateOverlay({
    commitment: c,
    overlay: [
      { function_id: "5a:x.mjs:f", attack_pack_ids: [], coverage_status: "attacked_pass" },
      { function_id: "5a:x.mjs:f", attack_pack_ids: [], coverage_status: "finding_frozen" },
    ],
  });
  assert.ok(r.problems.some((p) => p.kind === "overlay_duplicate_row"));
});

test("the overlay cannot smuggle an IMMUTABLE field back in", () => {
  const c = commit(["5a:x.mjs:f"]);
  const r = validateOverlay({
    commitment: c,
    overlay: [
      {
        function_id: "5a:x.mjs:f",
        attack_pack_ids: [],
        coverage_status: "attacked_pass",
        source_digest: "REWRITTEN",
      },
    ],
  });
  const p = r.problems.find((x) => x.kind === "overlay_field_not_permitted");
  assert.ok(p, "an overlay that can rewrite source_digest can rewrite the universe");
  assert.equal(p.field, "source_digest");
  assert.deepEqual([...OVERLAY_FIELDS], ["function_id", "attack_pack_ids", "coverage_status"]);
});

test("the JOINED view reproduces §2.3 exactly, field for field", () => {
  const c = commit(["5a:x.mjs:f"]);
  const joined = joinCommitmentAndOverlay({
    commitment: c,
    overlay: [
      { function_id: "5a:x.mjs:f", attack_pack_ids: ["p1"], coverage_status: "attacked_pass" },
    ],
  });
  assert.deepEqual(
    Object.keys(joined[0]).sort(),
    [...COMMITMENT_FIELDS, "attack_pack_ids", "coverage_status"].sort()
  );
  assert.equal(joined[0].coverage_status, "attacked_pass");
  assert.deepEqual(joined[0].attack_pack_ids, ["p1"]);
});

test("a member with no overlay row joins to NULL status, never to a comfortable default", () => {
  const c = commit(["5a:x.mjs:f"]);
  const joined = joinCommitmentAndOverlay({ commitment: c, overlay: [] });
  assert.equal(joined[0].coverage_status, null);
  assert.equal(joined[0].attack_pack_ids, null);
});

// ---------------------------------------------------------------------------------------------
// reachable_from
// ---------------------------------------------------------------------------------------------

test("reachable_from lists direct callers and EXCLUDES unresolved edges", () => {
  const c = commitClosure({
    members: [member("5a:x.mjs:caller"), member("5a:x.mjs:callee")],
    roles: rolesFor("5a:x.mjs:caller", "5a:x.mjs:callee"),
    edges: [
      { from_function_id: "5a:x.mjs:caller", to_function_id: "5a:x.mjs:callee" },
      { from_function_id: "5a:x.mjs:caller", to_unresolved: "<bare-specifier>acorn:parse" },
    ],
    tagClosure: tags,
    closureSourceCommit: SHA,
  });
  const callee = c.rows.find((r) => r.function_id === "5a:x.mjs:callee");
  assert.deepEqual(callee.reachable_from, ["5a:x.mjs:caller"]);
  const caller = c.rows.find((r) => r.function_id === "5a:x.mjs:caller");
  assert.deepEqual(caller.reachable_from, [], "an unresolved edge names no caller");
});

test("historical_tags are carried onto the committed member", () => {
  const c = commitClosure({
    members: [member("5a:x.mjs:f")],
    roles: rolesFor("5a:x.mjs:f"),
    tagClosure: tags,
    historicalTagsByFunction: new Map([
      ["5a:x.mjs:f", ["v2.37.0-stage-5b-var", "v2.36.0-stage-5a-vnc"]],
    ]),
    closureSourceCommit: SHA,
  });
  assert.deepEqual(c.rows[0].historical_tags, ["v2.36.0-stage-5a-vnc", "v2.37.0-stage-5b-var"]);
});
