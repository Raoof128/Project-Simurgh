// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 3 — evidence-path isolation.
//
// The collision this prevents is paid-for: adding any file under `evidence/stage-5q/` failed 5R's
// reproduce (it gates `git status --porcelain` over the whole inherited tree), and adding it outside
// failed 5Q's own gates — which is why Q1's artifacts ended up in a sibling directory.
//
// This is the honest branch-time check. Running a PRIOR stage's reproduce script from a successor
// branch does not test the prior stage: 5Q's gate 2 diffs MERGE_BASE..HEAD against a surface that
// knows nothing about 5S and refuses every 5S file (finding 5S-F001). Those scripts verify sealed
// history, so their subject is main, and they run there at Task 38.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import test from "node:test";

const EVIDENCE = "docs/research/llm-shield/evidence";
const OURS = "stage-5s";

test("[5s-t3] the 5S evidence directory exists and is ours alone", () => {
  assert.ok(existsSync(`${EVIDENCE}/${OURS}`), "5S evidence directory is missing");
});

test("[5s-t3] no 5S path is nested inside another stage's evidence tree", () => {
  const dirs = readdirSync(EVIDENCE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== OURS)
    .map((d) => d.name);
  assert.ok(dirs.length > 0, "no prior evidence directories found — the test would be vacuous");
  for (const d of dirs) {
    const nested = readdirSync(`${EVIDENCE}/${d}`, { recursive: true, withFileTypes: true }).filter(
      (e) => e.name.includes("5s") || e.name.includes("vwq")
    );
    assert.deepEqual(
      nested.map((e) => e.name),
      [],
      `5S artifacts found under ${d}`
    );
  }
});

test("[5s-t3] the fixture and evidence directories are prettier-ignored", () => {
  // 4K's gotcha: evidence dirs must be ignored or byte-stability `cmp` breaks after a format run.
  const ignore = readFileSync(".prettierignore", "utf8");
  assert.match(ignore, /tools\/simurgh-attestation\/stage5s\/fixtures\//);
  assert.match(ignore, /docs\/research\/llm-shield\/evidence\/stage-5s\//);
});
