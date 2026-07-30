// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the write-surface DRIVER, and the fail-opens found in it during Task 11 (5S-F006).
//
// Two of them, both the vacuous-green species that Q1-F001 paid for:
//
//   1. an unrecognised flag was ignored, so `--base origin/main` silently became `--staged`,
//      examined zero paths against a clean tree, and printed OK;
//   2. every git call was wrapped in a swallow-and-return-"" helper, so a bogus revision range
//      produced zero changed paths — and zero changed paths read as "nothing violated the surface".
//
// A gate that reports green because it could not run has not passed. It has not run. Both paths now
// return exit 2, which is neither pass nor refusal but OPERATOR ERROR, and the distinction is the
// point: exit 1 means the surface refused a change, exit 2 means nobody checked anything.
//
// The git dependency is INJECTED so these assertions need no repository state — a unit test that
// depends on clone depth is a flake waiting for a shallow checkout.

import assert from "node:assert/strict";
import test from "node:test";

import {
  DRIVER_EXIT,
  main,
  parseArgs,
} from "../../../../tools/simurgh-attestation/stage5s/node/checkWriteSurface.mjs";

/** A git stub: returns the mapped output, or throws for a command it was told to fail. */
const fakeGit = (map) => (args) => {
  const key = args.join(" ");
  const value = map[key];
  if (value === undefined) throw new Error(`git failed: ${key}`);
  return value;
};

test("[5s-t11] the exit codes are three distinct meanings, not two", () => {
  assert.deepEqual(DRIVER_EXIT, { OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });
});

test("[5s-t11] an unrecognised flag is an ERROR, never a silent fallback to staged", () => {
  // The exact mistyped invocation that printed "paths examined: 0 — OK" during Task 11.
  for (const argv of [["--base", "origin/main"], ["--rangee"], ["-r"], ["origin/main"]]) {
    const parsed = parseArgs(argv);
    assert.ok(parsed.error, `${JSON.stringify(argv)} was accepted`);
    assert.equal(main(argv, { runGit: fakeGit({}) }), DRIVER_EXIT.OPERATOR_ERROR);
  }
});

test("[5s-t11] --range without a value is an error, not an empty range", () => {
  assert.ok(parseArgs(["--range"]).error);
  assert.ok(parseArgs(["--range="]).error);
  assert.equal(main(["--range"], { runGit: fakeGit({}) }), DRIVER_EXIT.OPERATOR_ERROR);
});

test("[5s-t11] the recognised forms parse to the mode they name", () => {
  assert.deepEqual(parseArgs([]), { mode: "staged", range: null });
  assert.deepEqual(parseArgs(["--staged"]), { mode: "staged", range: null });
  assert.deepEqual(parseArgs(["--working"]), { mode: "working", range: null });
  assert.deepEqual(parseArgs(["--range", "a..b"]), { mode: "range", range: "a..b" });
  assert.deepEqual(parseArgs(["--range=a..b"]), { mode: "range", range: "a..b" });
});

test("[5s-t11] a git failure is an ERROR — an unrunnable diff is not an empty diff", () => {
  // The bogus-range fail-open: git exits non-zero, the old helper returned "", and "" parsed to zero
  // changed paths, which the rule correctly judged as violating nothing.
  const r = main(["--range", "not-a-rev..HEAD"], {
    runGit: fakeGit({ "status --porcelain": "" }),
  });
  assert.equal(r, DRIVER_EXIT.OPERATOR_ERROR);
});

test("[5s-t11] a failing `git status` is an error too — the anti-vacuity guard must not go blind", () => {
  // `dirty` is what makes "zero paths examined" a refusal rather than a pass. If the status call
  // silently returned "", an empty range over a dirty tree would read as clean.
  const r = main(["--staged"], {
    runGit: fakeGit({ "diff --cached --name-status": "" }),
  });
  assert.equal(r, DRIVER_EXIT.OPERATOR_ERROR);
});

test("[5s-t11] a clean staged set over a clean tree passes", () => {
  const r = main(["--staged"], {
    runGit: fakeGit({
      "diff --cached --name-status": "M\ttools/simurgh-attestation/stage5s/core/quorum.mjs",
      "status --porcelain": "",
    }),
  });
  assert.equal(r, DRIVER_EXIT.OK);
});

test("[5s-t11] a path outside the surface is REFUSED, and that is exit 1, not exit 2", () => {
  const r = main(["--staged"], {
    runGit: fakeGit({
      "diff --cached --name-status": "M\tsrc/llmShield.js",
      "status --porcelain": "",
    }),
  });
  assert.equal(r, DRIVER_EXIT.REFUSED);
});

test("[5s-t11] an empty range over a DIRTY tree is refused, never passed", () => {
  const r = main(["--range", "a..b"], {
    runGit: fakeGit({
      "diff --name-status a..b": "",
      "status --porcelain": " M tools/simurgh-attestation/stage5s/core/quorum.mjs",
    }),
  });
  assert.equal(r, DRIVER_EXIT.REFUSED);
});
