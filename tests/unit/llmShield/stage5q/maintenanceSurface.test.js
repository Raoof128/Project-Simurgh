// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Annex A5 — the maintenance write surface.
//
// The deadlock this resolves: §14.2 assigns 5Q-F001's repair to Q1, §6.1 refuses the file because
// "repairing it is Q1's job", and the transition validator refuses Q1 today. The annex authorises
// one bounded repair by exact path — and the rule that keeps it from becoming a blank cheque is
// that AUTHORITY MUST PRECEDE ACTION, checked against commit ancestry rather than asserted.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MAINTENANCE_REFUSALS as R,
  judgeMaintenance,
  parseMaintenanceSurface,
} from "../../../../tools/simurgh-attestation/stage5q/core/maintenanceSurface.mjs";

const SPEC = "docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md";
const ENTRIES = [
  { path: "a/one.mjs", op: "add", purpose: "p", id: "Q1-F001" },
  { path: "b/two.yml", op: "modify", purpose: "p", id: "Q1-F001" },
];
const base = (over = {}) => ({
  entries: ENTRIES,
  outsideQ0: [{ path: "a/one.mjs", op: "add" }],
  rangeCommitCount: 2,
  ...over,
});
const reasons = (v) => v.refusals.map((r) => r.reason);

test("[a5] the surface is PARSED from the spec, not re-declared in code", () => {
  const { present, entries } = parseMaintenanceSurface(readFileSync(SPEC, "utf8"));
  assert.equal(present, true, "Annex A5 is absent from the spec");
  assert.equal(entries.length, 8, `expected 8 authorised paths, parsed ${entries.length}`);
  for (const e of entries) {
    assert.ok(["add", "modify"].includes(e.op), `${e.path} has op ${e.op}`);
    assert.match(e.id, /^Q1-F\d{3}$/, `${e.path} carries no finding id`);
    assert.notEqual(e.purpose.trim(), "", `${e.path} has no stated purpose`);
  }
  assert.ok(
    entries.some((e) => e.path === ".github/workflows/stage-4-lean-proofs.yml" && e.op === "modify")
  );
});

test("[a5] parsing is bounded to A5's own section", () => {
  const { present } = parseMaintenanceSurface("## Annex A4\n\n| `x` | add | p | Q1-F001 |\n");
  assert.equal(present, false, "a table outside A5 was read as A5's authority");
});

test("[a5] an absent annex authorises nothing", () => {
  const v = judgeMaintenance({ ...base(), entries: [] });
  assert.equal(v.ok, false);
  assert.deepEqual(reasons(v), [R.ANNEX_ABSENT]);
});

test("[a5] a change confined to the named paths and operations is accepted", () => {
  assert.equal(judgeMaintenance(base()).ok, true);
});

test("[a5] a path not named is refused, however obviously intended", () => {
  const v = judgeMaintenance(base({ outsideQ0: [{ path: "c/sneaky.mjs", op: "add" }] }));
  assert.equal(v.ok, false);
  assert.deepEqual(reasons(v), [R.PATH_NOT_IN_SURFACE]);
});

test("[a5] a named path edited with an UNPERMITTED operation is refused", () => {
  // An allowlist of files alone would permit unrelated edits inside an authorised file.
  const v = judgeMaintenance(base({ outsideQ0: [{ path: "a/one.mjs", op: "modify" }] }));
  assert.equal(v.ok, false);
  assert.deepEqual(reasons(v), [R.OPERATION_NOT_PERMITTED]);
  assert.match(v.refusals[0].detail, /annex permits add/);
});

test("[a5] AUTHORITY MUST PRECEDE ACTION", () => {
  const v = judgeMaintenance(base({ authorityPrecedes: false }));
  assert.equal(v.ok, false, "a permission written after the crossing was accepted");
  assert.deepEqual(reasons(v), [R.AUTHORITY_DOES_NOT_PRECEDE]);
});

test("[a5] an empty commit range is a refusal, not a pass", () => {
  // The vacuity this repair actually hit: the §6.1 gate diffs MERGE_BASE..HEAD, was run with the
  // work uncommitted, evaluated nothing, and printed a pass.
  const v = judgeMaintenance(base({ rangeCommitCount: 0 }));
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(R.EMPTY_RANGE));
});

test("[a5] uncommitted work on an authorised path is never silently unevaluated", () => {
  const v = judgeMaintenance(base({ uncommittedPaths: ["a/one.mjs"] }));
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(R.UNCOMMITTED_NOT_EVALUATED));
});

test("[a5] maintenance may not reopen the frozen sections", () => {
  const v = judgeMaintenance(base({ frozenSectionsIntact: false }));
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(R.FROZEN_SECTIONS_MODIFIED));
});

test("[a5] maintenance may not touch the transition it declines to claim", () => {
  const v = judgeMaintenance(base({ transitionIntact: false }));
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(R.TRANSITION_MODIFIED));
});

test("[a5] maintenance may not claim Q1 authorisation", () => {
  const v = judgeMaintenance(base({ q1Authorised: true }));
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(R.Q1_CLAIMED));
});

test("[a5] every refusal is reported, not just the first", () => {
  const v = judgeMaintenance(
    base({ rangeCommitCount: 0, authorityPrecedes: false, q1Authorised: true })
  );
  assert.equal(v.ok, false);
  for (const r of [R.EMPTY_RANGE, R.AUTHORITY_DOES_NOT_PRECEDE, R.Q1_CLAIMED]) {
    assert.ok(reasons(v).includes(r), `${r} was swallowed`);
  }
});

test("[a5] the annex does not claim Q1, in its own words", () => {
  const spec = readFileSync(SPEC, "utf8");
  const a5 = spec.slice(spec.indexOf("## Annex A5"));
  assert.match(a5, /`maintenance` is \*\*not Q1\*\*/);
  assert.match(a5, /T1–T7 are untouched/);
});
