// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Q1-F001 — the repaired Lean gate, and the guards that stop the by-name list from regrowing.
//
// THE DEFECT THIS FILE EXISTS TO PREVENT. `stage-4-lean-proofs.yml` listed proof files BY NAME.
// The list drifted: 27 named, 38 on disk, 11 never type-checked in CI — including all five of
// Stage 5R's own proofs and `stage5q/Vsr.lean`, the file whose stage DISCOVERED the defect.
// Every stage from 5I onward published "Lean theorems, zero sorry" against a camera pointed at
// the wrong wall. The repair is the camera, never the photograph: adding the eleven filenames
// was explicitly prohibited.
//
// A gate is only as honest as its ability to go red, so the seeded-omission witness (W3) is a
// permanent test rather than a one-time demonstration. It builds a scratch corpus, poisons it,
// and asserts the exact refusal reason.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  GATE_REASONS,
  auditCorpus,
  enumerateProofs,
  stripLeanComments,
} from "../../scripts/lib/leanProofGate.mjs";

const WF_PATH = ".github/workflows/stage-4-lean-proofs.yml";

/** A scratch proof corpus. Poison never touches the real tree. */
function withCorpus(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "simurgh-lean-gate-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const abs = join(root, rel);
      mkdirSync(join(abs, ".."), { recursive: true });
      writeFileSync(abs, body);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const GOOD = "theorem good_one : True := trivial\n";

// ---- the workflow may never name a proof again ---------------------------------------------

test("[q1-f001] the workflow contains no literal .lean path", () => {
  // §6.3's lesson, arriving inside the check written to honour it: the first version of this test
  // failed on the workflow's own comment explaining which proofs the by-name list had missed. So
  // the scan reads EXECUTABLE yaml only — and asserts that stripping left the gate invocation
  // standing, so a stripper that ate the whole file could never produce a vacuous pass.
  const raw = readFileSync(WF_PATH, "utf8");
  const src = raw
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
  assert.match(
    src,
    /check-lean-proofs\.mjs/,
    "comment-stripping hollowed the workflow; scan is vacuous"
  );
  const named = src.match(/[\w./-]+\.lean\b/g) ?? [];
  assert.deepEqual(
    named,
    [],
    `the by-name list has regrown: ${named.join(", ")}. The gate must discover its proofs, ` +
      `never list them — that is the whole of Q1-F001.`
  );
});

test("[q1-f001] the workflow delegates to the self-enumerating gate", () => {
  const src = readFileSync(WF_PATH, "utf8");
  assert.match(src, /scripts\/check-lean-proofs\.mjs/, "the workflow does not invoke the gate");
});

// ---- enumeration: everything on disk, in a deterministic order -------------------------------

test("[q1-f001] enumeration finds every .lean on disk and is deterministic", () => {
  const found = enumerateProofs("proofs");
  const shell = execFileSync("find", ["proofs", "-type", "f", "-name", "*.lean"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .sort();
  assert.deepEqual(found, shell, "the gate's enumeration disagrees with find(1)");
  assert.deepEqual(found, enumerateProofs("proofs"), "enumeration is not stable across calls");
  assert.ok(found.length >= 38, `only ${found.length} proofs enumerated`);
});

// ---- the comment stripper, as a state machine --------------------------------------------------

test("[q1-f001] stripper removes line and block comments", () => {
  const { code, error } = stripLeanComments("theorem a : True := trivial -- sorry\n/- sorry -/\n");
  assert.equal(error, null);
  assert.ok(!/\bsorry\b/.test(code), "a commented sorry survived stripping");
  assert.match(code, /theorem a/, "real code was stripped away");
});

test("[q1-f001] stripper handles NESTED block comments", () => {
  // 5R's stripper closed at the first `-/`, so the tail of an outer comment was read as code —
  // a legitimate proof carrying a nested comment failed the gate.
  const { code, error } = stripLeanComments(
    "/- outer /- inner -/ sorry -/\ntheorem real : True := trivial\n"
  );
  assert.equal(error, null);
  assert.ok(!/\bsorry\b/.test(code), "nested block comment not tracked; outer tail read as code");
  assert.match(code, /theorem real/);
});

test("[q1-f001] an unterminated block comment is an ERROR, never a silent strip", () => {
  // The false negative: everything after an unterminated `/-` vanished, so a sorry below it
  // was invisible AND the file did not strip to nothing, so the vacuity guard stayed quiet.
  const { code, error } = stripLeanComments(
    "theorem a : True := trivial\n/- open forever\nsorry\n"
  );
  assert.equal(
    error,
    "unterminated_comment",
    `unterminated /- accepted; code=${JSON.stringify(code)}`
  );
});

test("[q1-f001] a primed identifier is not a string delimiter", () => {
  // Lean identifiers legally carry `'`. Treating it as a quote dropped everything between two
  // primed names — `sorry` included — while the file still stripped to plausible code.
  const src = "theorem t : True := by\n  have a' : Nat := 1\n  sorry\n  have b' : Nat := 2\n";
  const { code, error } = stripLeanComments(src);
  assert.equal(error, null);
  assert.ok(/\bsorry\b/.test(code), "a sorry between two primed identifiers was dropped");
});

test("[q1-f001] string contents are dropped but the file is not truncated", () => {
  const { code, error } = stripLeanComments('theorem a : True := trivial\ndef s := "sorry"\n');
  assert.equal(error, null);
  assert.ok(!/\bsorry\b/.test(code), "a word inside a string literal was read as an escape hatch");
  assert.match(code, /def s/, "code after the string was lost");
});

test("[q1-f001] an unterminated string literal is an ERROR", () => {
  const { error } = stripLeanComments('theorem a : True := trivial\ndef s := "open forever\n');
  assert.equal(error, "unterminated_string");
});

// ---- W3: the permanent seeded-omission witness -------------------------------------------------

test("[q1-f001][W3] the gate REJECTS a seeded sorry in a directory no list names", () => {
  const verdict = withCorpus(
    { "stage4/Good.lean": GOOD, "stage5r/Seeded.lean": "theorem seeded : True := by\n  sorry\n" },
    (root) => auditCorpus({ root, floor: 2, typecheck: false })
  );
  assert.equal(verdict.ok, false, "the seeded escape hatch was not caught");
  assert.deepEqual(
    verdict.failures.map((f) => f.reason),
    [GATE_REASONS.ESCAPE_HATCH],
    JSON.stringify(verdict.failures)
  );
  assert.match(verdict.failures[0].file, /stage5r\/Seeded\.lean$/);
  assert.equal(verdict.failures[0].detail, "sorry");
});

test("[q1-f001][W3] the gate rejects every escape hatch family", () => {
  for (const [hatch, body] of [
    ["sorry", "theorem t : True := by\n  sorry\n"],
    ["admit", "theorem t : True := by\n  admit\n"],
    ["native_decide", "theorem t : True := by\n  native_decide\n"],
    ["axiom", "axiom cheat : False\n"],
  ]) {
    const verdict = withCorpus({ "stage4/Bad.lean": body }, (root) =>
      auditCorpus({ root, floor: 1, typecheck: false })
    );
    assert.equal(verdict.ok, false, `${hatch} was not caught`);
    assert.equal(verdict.failures[0].reason, GATE_REASONS.ESCAPE_HATCH);
  }
});

// ---- both anti-vacuity guards ------------------------------------------------------------------

test("[q1-f001] guard 1: a corpus below the floor is refused", () => {
  const verdict = withCorpus({ "stage4/Good.lean": GOOD }, (root) =>
    auditCorpus({ root, floor: 38, typecheck: false })
  );
  assert.equal(verdict.ok, false, "a deleted-proof corpus passed");
  assert.equal(verdict.failures[0].reason, GATE_REASONS.BELOW_FLOOR);
});

test("[q1-f001] guard 1: an empty corpus is refused, never a vacuous pass", () => {
  const verdict = withCorpus({ "README.md": "no proofs here\n" }, (root) =>
    auditCorpus({ root, floor: 0, typecheck: false })
  );
  assert.equal(verdict.ok, false, "zero proofs and zero invocations reported success");
  assert.equal(verdict.failures[0].reason, GATE_REASONS.ENUMERATION_EMPTY);
});

test("[q1-f001] guard 2: a directory skipped by the enumeration is refused", () => {
  // The failure mode a count floor cannot see: the glob is intact, the count is healthy, and one
  // whole stage directory is invisible. Coverage is recomputed against the directory walk.
  const verdict = withCorpus({ "stage4/A.lean": GOOD, "stage5x/B.lean": GOOD }, (root) =>
    auditCorpus({
      root,
      floor: 1,
      typecheck: false,
      enumerate: (r) => enumerateProofs(r).filter((p) => !p.includes("stage5x")),
    })
  );
  assert.equal(verdict.ok, false, "an entire skipped directory passed unnoticed");
  assert.equal(verdict.failures[0].reason, GATE_REASONS.DIRECTORY_UNCOVERED);
  assert.match(verdict.failures[0].file, /stage5x/);
});

test("[q1-f001] a file that strips to nothing is refused", () => {
  const verdict = withCorpus({ "stage4/Empty.lean": "-- only a comment\n" }, (root) =>
    auditCorpus({ root, floor: 1, typecheck: false })
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failures[0].reason, GATE_REASONS.STRIPS_TO_NOTHING);
});

test("[q1-f001] a file with no declaration is refused", () => {
  const verdict = withCorpus({ "stage4/NoDecl.lean": "#eval 1 + 1\n" }, (root) =>
    auditCorpus({ root, floor: 1, typecheck: false })
  );
  assert.equal(verdict.ok, false, "a file carrying no declaration passed the vacuity guard");
  assert.equal(verdict.failures[0].reason, GATE_REASONS.NO_DECLARATION);
});

test("[q1-f001] a corpus of declarations with no theorem or lemma is refused", () => {
  const verdict = withCorpus({ "stage4/Defs.lean": "def x : Nat := 1\n" }, (root) =>
    auditCorpus({ root, floor: 1, typecheck: false })
  );
  assert.equal(verdict.ok, false, "a corpus that proves nothing satisfied the proof gate");
  assert.equal(verdict.failures[0].reason, GATE_REASONS.CORPUS_PROVES_NOTHING);
});

// ---- and the real corpus passes ------------------------------------------------------------------

test("[q1-f001] the committed corpus passes every non-Lean check", () => {
  const verdict = auditCorpus({ root: "proofs", typecheck: false });
  assert.deepEqual(verdict.failures, [], "the committed proofs fail the repaired gate");
  assert.ok(verdict.ok);
  assert.ok(verdict.count >= 38, `only ${verdict.count} proofs audited`);
});

test("[q1-f001] the exported reasons are deep-frozen", () => {
  // 5Q-F004..F012: eight exported constants across four stages were shallow-frozen, so any
  // importer could rewrite their nested data. This one is checked, not assumed.
  assert.throws(() => {
    GATE_REASONS.ESCAPE_HATCH = "tampered";
  });
  assert.equal(Object.isFrozen(GATE_REASONS), true);
});
