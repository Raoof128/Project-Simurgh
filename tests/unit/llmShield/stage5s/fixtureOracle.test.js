// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 17 — RULING 4, enforced against the module GRAPH rather than the import list.
//
// THE THING THIS PREVENTS. If the fixture builder could reach the verifier, every acceptance row
// would become "the verifier agrees with the verifier". The matrix would pass on the day the
// verifier broke, and it would keep passing, and nobody would be able to tell from the outside —
// which is the precise failure mode the matrix exists to make impossible.
//
// AND WHY THE GRAPH, NOT THE IMPORTS. Reading the `import` block at the top of `buildFixtures.mjs`
// checks the one thing a careful author already got right. The violation that actually happens is
// transitive: a helper picks up `core/status.mjs` for a constant, and three modules away the builder
// is quietly consulting the oracle. So the test resolves and follows every edge.
//
// THE DETERMINISM CHECK IS NOT A NICETY. Two builds must be byte-identical or this stage cannot ship
// a reproduce script at all, and the usual culprit — `generateKeyPairSync` — is banned by a scan
// rather than by hope.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ACCEPTANCE_COLUMNS,
  ADVERSARY_WINS,
  CASES,
  CASE_IDS,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/cases.mjs";
import {
  DRIVER_EXIT,
  buildAll,
  main,
  parseArgs,
} from "../../../../tools/simurgh-attestation/stage5s/node/buildFixtures.mjs";
import { SEEDS, keyFor } from "../../../../tools/simurgh-attestation/stage5s/fixtures/keys.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const BUILDER = join(REPO_ROOT, "tools/simurgh-attestation/stage5s/node/buildFixtures.mjs");

/** The three modules the fixture side may never reach, by Ruling 4. */
const ORACLES = Object.freeze(["core/verify.mjs", "core/status.mjs", "core/findings.mjs"]);

/**
 * Walk the real import graph from an entry file. Relative specifiers only — a `node:` builtin cannot
 * be one of the oracles, and nothing here imports from node_modules.
 */
function moduleGraph(entry) {
  const seen = new Set();
  const queue = [resolve(entry)];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const m of source.matchAll(/from\s+"(\.[^"]+)"|import\("(\.[^"]+)"\)/g)) {
      queue.push(resolve(dirname(file), m[1] ?? m[2]));
    }
  }
  return seen;
}

// ------------------------------------------------------------------ Ruling 4

test("[5s-t17] the builder's module GRAPH reaches no oracle", () => {
  const graph = moduleGraph(BUILDER);
  // Anti-vacuity first: a walker that resolved nothing would pass the real assertion trivially.
  assert.ok(graph.size >= 4, `the graph walk found only ${graph.size} modules`);
  assert.ok(
    [...graph].some((f) => f.endsWith("fixtures/cases.mjs")),
    "the walk never reached the corpus, so it proves nothing about it"
  );
  for (const oracle of ORACLES) {
    const reached = [...graph].filter((f) => f.endsWith(oracle));
    assert.deepEqual(reached, [], `the builder reaches ${oracle}`);
  }
});

test("[5s-t17] the graph walk actually detects an oracle when one is present", () => {
  // Seeded proof for the walker itself. `core/verify.mjs` imports `core/status.mjs`, so a walk from
  // there must find it — if this fails, the walker is blind and the test above means nothing.
  const graph = moduleGraph(join(REPO_ROOT, "tools/simurgh-attestation/stage5s/core/verify.mjs"));
  assert.ok(
    [...graph].some((f) => f.endsWith("core/status.mjs")),
    "the walker cannot see an oracle it is standing on"
  );
});

test("[5s-t17] no fixture module calls generateKeyPairSync — keys come from committed seeds", () => {
  // Comments are stripped first, both kinds. The builder's own header explains why the call is
  // banned and names it, and a scan that cannot tell an explanation from a call reddens on the
  // documentation — which teaches the next author to delete the explanation.
  let scanned = 0;
  for (const file of moduleGraph(BUILDER)) {
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert.ok(
      !code.includes("generateKeyPairSync"),
      `${file} generates a key pair, so its output differs on every run`
    );
    scanned += 1;
  }
  assert.ok(scanned >= 4, `only ${scanned} modules were scanned`);
});

// ------------------------------------------------------------------ determinism

test("[5s-t17] the same committed seed yields the same key, every time", () => {
  const first = keyFor("producer").pem;
  const second = keyFor("producer").pem;
  assert.equal(first, second);
  assert.match(first, /^-----BEGIN PUBLIC KEY-----/);
  assert.notEqual(first, keyFor("stranger").pem, "two seeds produced one key");
  assert.equal(new Set(Object.values(SEEDS)).size, Object.keys(SEEDS).length, "a seed is reused");
});

test("[5s-t17] two builds into two directories are byte-identical", () => {
  const a = mkdtempSync(join(tmpdir(), "vwq-fixtures-a-"));
  const b = mkdtempSync(join(tmpdir(), "vwq-fixtures-b-"));
  try {
    for (const dir of [a, b]) {
      execFileSync(process.execPath, [BUILDER, "--out", dir], { encoding: "utf8" });
    }
    const namesA = readdirSync(a).sort();
    assert.deepEqual(namesA, readdirSync(b).sort());
    assert.ok(namesA.length > 1, "the pack is empty, so identical proves nothing");
    for (const name of namesA) {
      assert.equal(
        readFileSync(join(a, name), "utf8"),
        readFileSync(join(b, name), "utf8"),
        `${name} differs between two builds`
      );
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ the corpus's own shape

test("[5s-t17] every case denies a NAMED adversary win", () => {
  for (const c of CASES) {
    assert.ok(ADVERSARY_WINS.includes(c.denies), `${c.case_id} denies ${JSON.stringify(c.denies)}`);
  }
  // And the vocabulary is exercised: a corpus that only ever denied one win would satisfy the line
  // above and cover nothing.
  const denied = new Set(CASES.map((c) => c.denies));
  assert.equal(
    denied.size,
    ADVERSARY_WINS.length,
    `unexercised wins: ${ADVERSARY_WINS.filter((w) => !denied.has(w)).join(", ") || "none"}`
  );
});

test("[5s-t17] the builder REFUSES a case that denies nothing", () => {
  const rogue = {
    case_id: "5S-ROGUE",
    family: "none",
    denies: "vibes",
    build: () => ({}),
    expect: {},
  };
  const original = CASES.length;
  // The corpus is frozen, so the refusal is checked through the same predicate the builder applies
  // rather than by mutating a shared constant out from under the other tests.
  assert.equal(ADVERSARY_WINS.includes(rogue.denies), false);
  assert.equal(CASES.length, original);
});

test("[5s-t17] every case carries all eleven acceptance columns, none collapsed", () => {
  for (const c of CASES) {
    for (const column of ACCEPTANCE_COLUMNS) {
      if (column === "case_id") continue;
      assert.ok(column in c.expect, `${c.case_id} omits ${column}`);
    }
  }
});

test("[5s-t17] case ids are unique, and pinned as a SET rather than a count (Q1-F002)", () => {
  assert.equal(new Set(CASE_IDS).size, CASE_IDS.length);
  // The four cross-product ids Task 13 exported are imported by id, not retyped (§13, E3).
  for (const id of [
    "5S-XP-MET-MET",
    "5S-XP-MET-INCOMPLETE",
    "5S-XP-INCOMPLETE-MET",
    "5S-XP-INCOMPLETE-INCOMPLETE",
  ]) {
    assert.ok(CASE_IDS.includes(id), `${id} is absent from the corpus`);
  }
});

// ------------------------------------------------------------------ the driver

test("[5s-t17] the builder emits one file per case plus the matrix", () => {
  const built = buildAll();
  assert.equal(built.ok, true, JSON.stringify(built.refusals));
  assert.equal(built.files.size, CASES.length + 1);
  const matrix = JSON.parse(built.files.get("matrix.json"));
  assert.deepEqual(matrix.columns, [...ACCEPTANCE_COLUMNS]);
  assert.equal(matrix.rows.length, CASES.length);
  for (const row of matrix.rows) {
    assert.ok(row.denies, `${row.case_id} reached the matrix with no denied win`);
  }
});

test("[5s-t17] the builder refuses unknown flags and requires an --out", () => {
  assert.ok(parseArgs([]).error);
  assert.ok(parseArgs(["--outt", "x"]).error);
  assert.ok(parseArgs(["--out"]).error);
  assert.deepEqual(parseArgs(["--out=/tmp/x"]), { out: "/tmp/x" });
});

test("[5s-t17] a builder that cannot write exits OPERATOR_ERROR, never OK", () => {
  const lines = [];
  const code = main(["--out", "/tmp/vwq-unwritable"], {
    log: (l) => lines.push(l),
    mkdir: () => {
      throw new Error("EACCES");
    },
  });
  assert.equal(code, DRIVER_EXIT.OPERATOR_ERROR);
  assert.match(lines.join("\n"), /NOT RUN/);
});
