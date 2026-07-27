// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 1: the write-surface verifier.
//
// Frozen §2.3 declares the write surface EXHAUSTIVE: a stage-owned list where any write is allowed,
// and six shared files where the FILE is permitted but the EDIT is not. 5Q shipped one unrepaired
// violation of exactly that second shape — a prior stage's test widened first and named afterwards —
// so this verifier exists before anything else in 5R writes a file.
//
// The load-bearing design choice: the six shared entries are checked by PARSED BEFORE/AFTER
// STRUCTURE, never by path. "I only touched package.json" must not cover swapping a crypto library,
// and "I only touched check-e2e.sh" must not cover editing a prior stage's reproduce invocation.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyPath,
  checkChange,
  checkChangeSet,
  STAGE_OWNED_PATTERNS,
  SHARED_FILES,
  EVIDENCE_IGNORE_LINE,
} from "../../../../tools/simurgh-attestation/stage5r/core/writeSurface.mjs";

// ---- path classification -----------------------------------------------------------------------

test("the stage-owned list covers exactly the paths frozen §2.3 names", () => {
  const owned = [
    "tools/simurgh-attestation/stage5r/core/writeSurface.mjs",
    "tests/unit/llmShield/stage5r/writeSurface.test.js",
    "tests/e2e/llmShield/stage5r/k7AllFunctions.test.js",
    "tests/fixtures/llmShield/stage5r/altered-family/control.mjs",
    "proofs/stage5r/NoPromotion.lean",
    "docs/research/llm-shield/evidence/stage-5r/universe/family-universe.json",
    "docs/research/llm-shield/STAGE_5R_CLOSEOUT.md",
    "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md",
    "docs/superpowers/plans/2026-07-27-stage-5r-vpf-implementation-plan.md",
    "scripts/check-stage5r-proofs.sh",
    "scripts/reproduce-llm-shield-stage5r.sh",
    ".github/workflows/stage-5r-checks.yml",
  ];
  for (const p of owned) assert.equal(classifyPath(p), "stage_owned", p);
  assert.ok(STAGE_OWNED_PATTERNS.length > 0);
});

test("the shared list is exactly six files — five wiring, plus package.json", () => {
  assert.deepEqual(Object.keys(SHARED_FILES).sort(), [
    ".prettierignore",
    "README.md",
    "package.json",
    "scripts/check-e2e.sh",
    "scripts/security-audit-llm-shield-stage3m.sh",
    "scripts/security-audit-llm-shield-stage3o.sh",
  ]);
  for (const p of Object.keys(SHARED_FILES)) assert.equal(classifyPath(p), "shared", p);
});

test("a predecessor's tooling and evidence are OUTSIDE the surface", () => {
  assert.equal(classifyPath("tools/simurgh-attestation/stage5q/core/transition.mjs"), "outside");
  assert.equal(
    classifyPath("docs/research/llm-shield/evidence/stage-5q/closure/x.json"),
    "outside"
  );
  assert.equal(classifyPath("tools/simurgh-attestation/stage5a/core/x.mjs"), "outside");
  assert.equal(classifyPath("src/llmShield.js"), "outside");
  assert.equal(classifyPath("tests/unit/llmShield/stage5p/independentBundle.test.js"), "outside");
});

test("a stage5r-LOOKING path outside the owned roots is still outside", () => {
  // Prefix matching is where this kind of check quietly goes wrong: `stage5rx` is not `stage5r`,
  // and a path that merely mentions the stage is not owned by it.
  assert.equal(classifyPath("tools/simurgh-attestation/stage5rx/core/x.mjs"), "outside");
  assert.equal(classifyPath("docs/notes/stage5r-scratch.md"), "outside");
});

test("a write outside the surface is a violation that NAMES the path", () => {
  const r = checkChange({ path: "tools/simurgh-attestation/stage5q/core/transition.mjs" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /stage5q/);
  assert.match(r.reason, /outside the 5R write surface/i);
});

// ---- package.json: scripts key only --------------------------------------------------------------

const PKG_BEFORE = JSON.stringify(
  {
    name: "p",
    version: "1.0.0",
    scripts: { test: "node --test" },
    dependencies: { acorn: "8.17.0" },
  },
  null,
  2
);

test("package.json: adding a scripts entry is permitted", () => {
  const after = JSON.stringify(
    {
      name: "p",
      version: "1.0.0",
      scripts: { test: "node --test", "stage5r:universe": "node tools/…" },
      dependencies: { acorn: "8.17.0" },
    },
    null,
    2
  );
  assert.equal(checkChange({ path: "package.json", before: PKG_BEFORE, after }).ok, true);
});

test("package.json: a DEPENDENCY change is refused even though the file is permitted", () => {
  const after = JSON.stringify(
    {
      name: "p",
      version: "1.0.0",
      scripts: { test: "node --test" },
      dependencies: { acorn: "8.17.0", "left-pad": "1.3.0" },
    },
    null,
    2
  );
  const r = checkChange({ path: "package.json", before: PKG_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /dependencies/i);
});

test("package.json: any non-scripts key change is refused, not just dependencies", () => {
  const after = PKG_BEFORE.replace('"version": "1.0.0"', '"version": "2.0.0"');
  const r = checkChange({ path: "package.json", before: PKG_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /version/);
});

test("package.json: unparseable after-state fails closed", () => {
  const r = checkChange({ path: "package.json", before: PKG_BEFORE, after: "{ not json" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /parse/i);
});

// ---- .prettierignore: one evidence line ----------------------------------------------------------

const PI_BEFORE = ["# stage 5Q evidence", "docs/research/llm-shield/evidence/stage-5q/", ""].join(
  "\n"
);

test(".prettierignore: adding the 5R evidence directory (with a comment) is permitted", () => {
  const after = `${PI_BEFORE}\n# Stage 5R evidence — canonical JSON\n${EVIDENCE_IGNORE_LINE}\n`;
  assert.equal(checkChange({ path: ".prettierignore", before: PI_BEFORE, after }).ok, true);
});

test(".prettierignore: a SECOND content line is refused", () => {
  const after = `${PI_BEFORE}\n${EVIDENCE_IGNORE_LINE}\ndocs/research/llm-shield/evidence/stage-5x/\n`;
  const r = checkChange({ path: ".prettierignore", before: PI_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /one/i);
});

test(".prettierignore: a REMOVED line is refused — this file also protects other stages", () => {
  const after = `# stage 5Q evidence\n${EVIDENCE_IGNORE_LINE}\n`;
  const r = checkChange({ path: ".prettierignore", before: PI_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /remov/i);
});

test(".prettierignore: adding some OTHER directory is refused", () => {
  const after = `${PI_BEFORE}\nsrc/\n`;
  const r = checkChange({ path: ".prettierignore", before: PI_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /stage-5r/);
});

// ---- check-e2e.sh: one REPRODUCE entry -----------------------------------------------------------

const E2E_BEFORE = [
  "declare -a REPRODUCE=(",
  '  "Stage 5P VSI|scripts/reproduce-llm-shield-stage5p.sh"',
  '  "Stage 5Q VSR|scripts/reproduce-llm-shield-stage5q.sh"',
  ")",
].join("\n");

test("check-e2e.sh: adding one 5R REPRODUCE entry is permitted", () => {
  const after = E2E_BEFORE.replace(
    ")",
    '  "Stage 5R VPF|scripts/reproduce-llm-shield-stage5r.sh"\n)'
  );
  assert.equal(checkChange({ path: "scripts/check-e2e.sh", before: E2E_BEFORE, after }).ok, true);
});

test("check-e2e.sh: editing a PRIOR stage's entry is refused", () => {
  const after = E2E_BEFORE.replace("stage5q.sh", "stage5q-disabled.sh");
  const r = checkChange({ path: "scripts/check-e2e.sh", before: E2E_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /remov|prior/i);
});

test("check-e2e.sh: an added line that is not a 5R REPRODUCE entry is refused", () => {
  const after = `${E2E_BEFORE}\nrm -rf /\n`;
  const r = checkChange({ path: "scripts/check-e2e.sh", before: E2E_BEFORE, after });
  assert.equal(r.ok, false);
});

// ---- the audit allowlists: one line, and no digits in the filename class -------------------------

const AUDIT_BEFORE = [
  "  git ls-files '*.pem' \\",
  '    | grep -v -E "^tests/fixtures/llmShield/stage5q/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\\.pem$" \\',
  "    | sort",
].join("\n");

const goodAllowline =
  '    | grep -v -E "^tests/fixtures/llmShield/stage5r/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\\.pem$" \\';

test("audit allowlist: one 5R line whose filename class excludes digits is permitted", () => {
  const after = AUDIT_BEFORE.replace("    | sort", `${goodAllowline}\n    | sort`);
  const r = checkChange({
    path: "scripts/security-audit-llm-shield-stage3m.sh",
    before: AUDIT_BEFORE,
    after,
  });
  assert.equal(r.ok, true, r.reason);
});

test("audit allowlist: a filename class that ADMITS DIGITS is refused", () => {
  // A digit-admitting class lets a key named for another stage slip through the exemption.
  const bad = goodAllowline.replace("[A-Za-z-]+", "[A-Za-z0-9-]+");
  const after = AUDIT_BEFORE.replace("    | sort", `${bad}\n    | sort`);
  const r = checkChange({
    path: "scripts/security-audit-llm-shield-stage3o.sh",
    before: AUDIT_BEFORE,
    after,
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /digit/i);
});

test("audit allowlist: `\\w+` and `.` are refused for the same reason", () => {
  for (const cls of ["\\w+", ".+", "[^/]+"]) {
    const bad = goodAllowline.replace("[A-Za-z-]+", cls);
    const after = AUDIT_BEFORE.replace("    | sort", `${bad}\n    | sort`);
    const r = checkChange({
      path: "scripts/security-audit-llm-shield-stage3m.sh",
      before: AUDIT_BEFORE,
      after,
    });
    assert.equal(r.ok, false, `class ${cls} should be refused`);
  }
});

test("audit allowlist: removing an existing exemption is refused", () => {
  const after = AUDIT_BEFORE.split("\n")
    .filter((l) => !l.includes("grep -v"))
    .join("\n");
  const r = checkChange({
    path: "scripts/security-audit-llm-shield-stage3m.sh",
    before: AUDIT_BEFORE,
    after,
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /remov/i);
});

// ---- README: banner only -------------------------------------------------------------------------

const README_BEFORE = [
  "# Project Simurgh",
  "[![Latest](https://img.shields.io/badge/release-v2.52.0-blue)](…/tag/v2.52.0-stage-5q-vsr)",
  "",
  "> 🆕 **Latest — Stage 5Q · VSR (`v2.52.0-stage-5q-vsr`).**",
  "",
  "Some unrelated prose about the project.",
].join("\n");

test("README: a release-banner edit is permitted", () => {
  const after = README_BEFORE.replace(
    "> 🆕 **Latest — Stage 5Q · VSR (`v2.52.0-stage-5q-vsr`).**",
    "> 🆕 **Latest — Stage 5R · VPF (`v2.53.0-stage-5r-vpf`).**"
  );
  assert.equal(checkChange({ path: "README.md", before: README_BEFORE, after }).ok, true);
});

test("README: an unrelated prose edit is refused", () => {
  const after = README_BEFORE.replace(
    "Some unrelated prose about the project.",
    "Some unrelated prose about the project, plus a claim nobody reviewed."
  );
  const r = checkChange({ path: "README.md", before: README_BEFORE, after });
  assert.equal(r.ok, false);
  assert.match(r.reason, /banner/i);
});

// ---- the change set ------------------------------------------------------------------------------

test("checkChangeSet passes a clean stage-owned change set", () => {
  const r = checkChangeSet([
    { path: "tools/simurgh-attestation/stage5r/core/writeSurface.mjs" },
    { path: "tests/unit/llmShield/stage5r/writeSurface.test.js" },
  ]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test("checkChangeSet reports EVERY violation, not merely the first", () => {
  const r = checkChangeSet([
    { path: "tools/simurgh-attestation/stage5q/core/transition.mjs" },
    { path: "src/llmShield.js" },
    { path: "tools/simurgh-attestation/stage5r/core/ok.mjs" },
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.violations.length, 2);
  assert.deepEqual(r.violations.map((v) => v.path).sort(), [
    "src/llmShield.js",
    "tools/simurgh-attestation/stage5q/core/transition.mjs",
  ]);
});

test("a shared file with no before/after content fails closed rather than passing on its path", () => {
  // The whole point is that permission attaches to the EDIT, not the file. A checker that green-lights
  // a shared path when it cannot see the diff has silently become a path check.
  const r = checkChange({ path: "package.json" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /content|structur/i);
});
