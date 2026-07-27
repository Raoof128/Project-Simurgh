// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 1.2 — the Q0 write-surface verifier.
//
// Matrix 1 claimed a "pre-commit path guard (Task 1)" that no task created. That is a false
// completeness claim sitting inside the coverage matrix of a stage whose blade is false completeness
// claims — the same defect class as F001. This module is the guard, so the row becomes true.
//
// Spec §6.1 declares the Q0 write surface EXHAUSTIVE. A declared-but-unenforced constraint is a
// comment, and this stage does not ship comments as controls.
//
// The scoping matters as much as the paths (second gauntlet B1): `package.json` is permitted for its
// `scripts` key and one pinned devDependency, NOT for arbitrary dependency changes. "I only touched
// package.json" must not cover swapping a crypto library.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Q0_WRITE_ALLOWLIST,
  checkPaths,
  checkPackageJsonMutation,
} from "../../../../tools/simurgh-attestation/stage5q/core/writeSurface.mjs";

test("the allowlist is frozen and non-empty", () => {
  assert.ok(Object.isFrozen(Q0_WRITE_ALLOWLIST));
  assert.ok(Q0_WRITE_ALLOWLIST.length >= 9, "spec §6.1 names at least nine entries");
});

test("stage5q code, tests, proofs and evidence are permitted", () => {
  const r = checkPaths([
    "tools/simurgh-attestation/stage5q/core/constants.mjs",
    "tests/unit/llmShield/stage5q/constants.test.js",
    "tests/e2e/llmShield/stage5q/k7AllFunctions.test.js",
    "proofs/stage5q/Vsr.lean",
    "docs/research/llm-shield/evidence/stage-5q/closure/function-closure.json",
  ]);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
  assert.equal(r.checked, 5, "the count is reported, so 'ok' is never mistaken for 'unchecked'");
});

test("a write into ANY attacked stage is a violation — 5P inclusive", () => {
  // The first draft of §6.1 wrote stage5{a..o}, leaving 5P mutable while it sat inside both the
  // closure and the attack target set. A campaign that can edit its own target measures nothing.
  for (const p of [
    "tools/simurgh-attestation/stage5a/core/claimCore.mjs",
    "tools/simurgh-attestation/stage5p/core/identityLattice.mjs",
  ]) {
    const r = checkPaths([p]);
    assert.equal(r.ok, false, `${p} must be refused`);
    assert.match(r.violations[0].reason, /read-only|closure/i);
  }
});

test("the F001 workflow is a violation — it is live evidence, not a file", () => {
  // §14.2 prohibits repairing it during Q0. Editing it would destroy the premise of an open finding.
  const r = checkPaths([".github/workflows/stage-4-lean-proofs.yml"]);
  assert.equal(r.ok, false);
  assert.match(r.violations[0].reason, /F001|evidence|frozen/i);
});

test("the ONE permitted CI addition is allowed, and only that one", () => {
  assert.equal(checkPaths([".github/workflows/stage-5q-checks.yml"]).ok, true);
  assert.equal(checkPaths([".github/workflows/stage-1-checks.yml"]).ok, false);
  assert.equal(checkPaths([".github/workflows/some-new-thing.yml"]).ok, false);
});

test("both named 5Q scripts are permitted, other scripts are not", () => {
  assert.equal(checkPaths(["scripts/check-stage5q-proofs.sh"]).ok, true);
  assert.equal(checkPaths(["scripts/reproduce-llm-shield-stage5q.sh"]).ok, true);
  // A prior stage's reproduce script is frozen history.
  assert.equal(checkPaths(["scripts/reproduce-llm-shield-stage5p.sh"]).ok, false);
  assert.equal(checkPaths(["scripts/check.sh"]).ok, false);
});

test("an EMPTY change set is ok but reports zero — 'nothing changed' is not 'nothing checked'", () => {
  const r = checkPaths([]);
  assert.equal(r.ok, true);
  assert.equal(r.checked, 0);
  // The count is the whole point: a guard that returns bare `true` for an empty input is
  // indistinguishable from a guard that never ran.
  assert.ok(Object.hasOwn(r, "checked"), "the verifier must report how many paths it examined");
});

test("every violation names the path AND the reason", () => {
  const r = checkPaths(["tools/simurgh-attestation/stage5c/core/slipLedger.mjs", "README.md"]);
  assert.equal(r.ok, false);
  assert.equal(r.violations.length, 2);
  for (const v of r.violations) {
    assert.ok(v.path, "a violation without a path cannot be acted on");
    assert.ok(v.reason && v.reason.length > 8, "a reason must be a reason, not a code");
  }
});

// ---- package.json is path-permitted but MUTATION-scoped ------------------------------------------

test("package.json: adding stage5q scripts is permitted", () => {
  const before = { scripts: { test: "x" }, devDependencies: { prettier: "^3.8.3" } };
  const after = {
    scripts: { test: "x", "test:stage5q": "y" },
    devDependencies: { prettier: "^3.8.3" },
  };
  assert.equal(checkPackageJsonMutation(before, after).ok, true);
});

test("package.json: the ONE pinned devDependency is permitted", () => {
  const before = { scripts: {}, devDependencies: { prettier: "^3.8.3" } };
  const after = { scripts: {}, devDependencies: { prettier: "^3.8.3", acorn: "8.17.0" } };
  assert.equal(checkPackageJsonMutation(before, after).ok, true);
});

test("package.json: ANY other dependency change is refused", () => {
  // This is the mutation that "I only touched package.json" would otherwise have covered.
  const before = { scripts: {}, devDependencies: { prettier: "^3.8.3" } };
  for (const after of [
    { scripts: {}, devDependencies: { prettier: "^3.8.3", lodash: "4.0.0" } },
    { scripts: {}, devDependencies: { prettier: "^4.0.0" } },
    { scripts: {}, devDependencies: {}, dependencies: { express: "5.0.0" } },
  ]) {
    const r = checkPackageJsonMutation(before, after);
    assert.equal(r.ok, false, `must refuse: ${JSON.stringify(after)}`);
  }
});

test("package.json: acorn at a DIFFERENT version is refused — the pin is the point", () => {
  const before = { scripts: {}, devDependencies: {} };
  const after = { scripts: {}, devDependencies: { acorn: "^8.0.0" } };
  const r = checkPackageJsonMutation(before, after);
  assert.equal(r.ok, false, "a range is not a pin; the parser version enters the closure");
});

test("package.json: removing an existing script is refused", () => {
  const before = { scripts: { test: "x", build: "y" }, devDependencies: {} };
  const after = { scripts: { test: "x" }, devDependencies: {} };
  assert.equal(checkPackageJsonMutation(before, after).ok, false);
});

// ------------------------------------------------------------------------------------------------
// The closeout, named the right way round.
// ------------------------------------------------------------------------------------------------

test("the closeout path is permitted, and nothing else under docs/research/llm-shield/ is", () => {
  // §6.1 says: if a path is needed, it is named here or it is not written. The closeout was added
  // to the allowlist BEFORE a byte of it existed — the opposite of the one unrepaired violation
  // this stage carries, where a prior-stage test was widened first and named afterwards. Naming in
  // advance is the permitted route; naming afterwards is what L5 forbids.
  assert.equal(checkPaths(["docs/research/llm-shield/STAGE_5Q_CLOSEOUT.md"]).ok, true);
  assert.equal(checkPaths(["docs/research/llm-shield/STAGE_5P_CLOSEOUT.md"]).ok, false);
  assert.equal(checkPaths(["docs/research/llm-shield/NORTH_STAR.md"]).ok, false);
});

test("the closeout entry does NOT open the whole docs tree", () => {
  // An allowlist entry is a permission for one path, not a directory. A prefix match here would
  // have made every prior stage's closeout writable during Q0.
  for (const path of [
    "docs/research/llm-shield/STAGE_5Q_CLOSEOUT.md.bak",
    "docs/research/llm-shield/evidence/stage-5m/x.json",
    "docs/research/other.md",
  ]) {
    assert.equal(checkPaths([path]).ok, false, `${path} must not be writable`);
  }
});
