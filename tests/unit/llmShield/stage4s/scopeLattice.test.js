// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S scope lattice (4S spec §7): A ⊑ B iff A ⊆ B; path scope = intersection.
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeScope,
  scopeLeq,
  pathScope,
} from "../../../../tools/simurgh-attestation/stage4s/core/scopeLattice.mjs";

test("normalizeScope sorts, dedupes, lowercases, rejects junk", () => {
  assert.deepEqual(normalizeScope(["Mail.Read", "calendar.read", "mail.read"]), [
    "calendar.read",
    "mail.read",
  ]);
  assert.throws(() => normalizeScope("mail.read"), TypeError);
  assert.throws(() => normalizeScope([""]), TypeError);
  assert.throws(() => normalizeScope([42]), TypeError);
});

test("scopeLeq is subset order — narrower means fewer capabilities", () => {
  assert.ok(scopeLeq(["mail.read"], ["calendar.read", "mail.read"]));
  assert.ok(!scopeLeq(["mail.read", "mail.send"], ["mail.read"]));
  assert.ok(scopeLeq([], ["mail.read"])); // empty scope is bottom
  assert.ok(scopeLeq(["mail.read"], ["mail.read"])); // reflexive
});

test("pathScope is the running intersection along a path", () => {
  assert.deepEqual(
    pathScope([
      ["calendar.read", "mail.read", "mail.send"],
      ["mail.read", "mail.send"],
      ["mail.read"],
    ]),
    ["mail.read"]
  );
  assert.deepEqual(pathScope([["a"], ["b"]]), []); // disjoint collapses to bottom
  assert.throws(() => pathScope([]), TypeError);
});
