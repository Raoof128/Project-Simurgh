// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 18: the eight declared signals, tested as predicates about DEFECTS.
//
// The detector this stage shipped through Task 17 decided by looking for a marker comment naming the
// declared signal. That is an answer key written into the exam paper: the control's author places the
// marker, so `vulnerable → detected` and `safe → not detected` hold by construction and say nothing
// about whether anything was detected. It is §1.4's failure exactly — a detector that "can appear
// brilliant while understanding nothing" — reached from the other direction.
//
// So a signal is now a predicate over the SOURCE, in two parts, and both parts are load-bearing:
//
//   applies(source)   the construct the signal is about is present at all
//   defective(source) that construct carries the defect the class names
//
// `applies` is what makes a safe control's not-detected mean something (§4.3: it must exercise the
// signal path, or it is not-detected for the wrong reason), and what lets the campaign say
// `premise_not_applicable` about a member instead of pretending it probed one.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SIGNALS,
  SIGNAL_IDS,
  evaluateSignal,
  stripNonCode,
} from "../../../../tools/simurgh-attestation/stage5r/core/signals.mjs";
import { FORBIDDEN_SURROGATE_SIGNALS } from "../../../../tools/simurgh-attestation/stage5r/core/familyContract.mjs";
import { TRANCHE_T1 } from "../../../../tools/simurgh-attestation/stage5r/core/archetypes.mjs";

test("there are eight signals, one per T1 family, ids unique", () => {
  assert.equal(SIGNAL_IDS.length, 8);
  assert.equal(new Set(SIGNAL_IDS).size, 8);
  const families = SIGNAL_IDS.map((id) => SIGNALS[id].family).sort();
  assert.deepEqual(families, TRANCHE_T1.map((t) => t.family).sort());
});

test("every signal names exactly one property — a disjunction is not a choice (§3.3)", () => {
  for (const id of SIGNAL_IDS) {
    assert.ok(!/\bor\b|\|\||,/.test(id), `${id} reads as a disjunction`);
    assert.ok(!FORBIDDEN_SURROGATE_SIGNALS.includes(id), `${id} is a forbidden surrogate`);
  }
});

test("an unknown signal id FAILS CLOSED rather than returning not_detected", () => {
  // A detector that answers "not detected" for a signal it does not implement reports a clean bill of
  // health for a check that never ran.
  assert.throws(() => evaluateSignal("no such signal", "anything"), /not a declared signal/);
});

test("each signal fires on its own defect specimen and stays silent on the repaired twin", () => {
  for (const id of SIGNAL_IDS) {
    const s = SIGNALS[id];
    const bad = evaluateSignal(id, s.specimens.defective);
    const good = evaluateSignal(id, s.specimens.repaired);
    assert.equal(bad.verdict, "detected", `${id}: defect specimen not detected`);
    assert.equal(bad.applies, true, `${id}: defect specimen does not even reach the signal path`);
    assert.ok(bad.evidence.length > 0, `${id}: detected with no evidence locator`);
    assert.equal(good.verdict, "not_detected", `${id}: repaired twin was flagged`);
    assert.equal(
      good.applies,
      true,
      `${id}: the repaired twin must still EXERCISE the signal path, or its not-detected is the wrong kind`
    );
    assert.equal(good.evidence, "", `${id}: not-detected must carry no evidence`);
  }
});

test("a source with no such construct reports applies=false, not a silent pass", () => {
  for (const id of SIGNAL_IDS) {
    const r = evaluateSignal(id, "const unrelated = 1;\n");
    assert.equal(r.applies, false, id);
    assert.equal(r.verdict, "not_detected", id);
  }
});

test("no signal fires from a COMMENT or a STRING literal", () => {
  // Three 5Q gates matched their own explanations. A detector that reads its target's prose is the
  // same defect wearing the detector's hat.
  for (const id of SIGNAL_IDS) {
    const s = SIGNALS[id];
    const commented = s.specimens.defective
      .split("\n")
      .map((l) => (s.language === "lean" ? `-- ${l}` : `// ${l}`))
      .join("\n");
    assert.equal(
      evaluateSignal(id, commented).verdict,
      "not_detected",
      `${id}: fired in a comment`
    );
    const quoted = `const doc = ${JSON.stringify(s.specimens.defective)};\n`;
    assert.equal(evaluateSignal(id, quoted).verdict, "not_detected", `${id}: fired in a string`);
  }
});

test("stripping cannot make the scan vacuous", () => {
  // §6.3's rule, applied to the detector: if comment-stripping removed everything, the source is
  // unsupported rather than clean.
  const r = evaluateSignal(SIGNAL_IDS[0], "// nothing but a comment\n");
  assert.equal(r.applies, false);
  assert.equal(r.unsupported, true);
  assert.equal(r.verdict, "not_detected");
});

test("stripNonCode removes comments and string CONTENT, and keeps the code", () => {
  const js = stripNonCode('const a = "hidden"; // tail\nconst b = 2; /* block */\n', "js");
  assert.ok(!js.includes("hidden"));
  assert.ok(!js.includes("tail"));
  assert.ok(!js.includes("block"));
  assert.ok(js.includes("const a ="));
  assert.ok(js.includes("const b = 2"));
  const lean = stripNonCode("theorem t : P := by\n-- hidden\n/- also hidden -/\n", "lean");
  assert.ok(!lean.includes("hidden"));
  assert.ok(lean.includes("theorem t"));
});

test("a string containing a comment opener does not swallow the code after it", () => {
  // The classic tokeniser bug: treating `"http://x"` as the start of a line comment blinds the
  // scanner to everything below it, and a blinded scanner reports not-detected.
  const s = SIGNALS[SIGNAL_IDS[0]];
  const src = `const url = "http://example.invalid"; // note\n${s.specimens.defective}`;
  assert.equal(evaluateSignal(SIGNAL_IDS[0], src).verdict, "detected");
});

test("signal evaluation is pure — same bytes, same answer, and no I/O", () => {
  for (const id of SIGNAL_IDS) {
    const a = evaluateSignal(id, SIGNALS[id].specimens.defective);
    const b = evaluateSignal(id, SIGNALS[id].specimens.defective);
    assert.deepEqual(a, b);
    const src = String(SIGNALS[id].applies) + String(SIGNALS[id].defective);
    for (const forbidden of ["readFile", "process.env", "Date.now", "Math.random", "execSync"]) {
      assert.ok(!src.includes(forbidden), `${id}: predicate touches ${forbidden}`);
    }
  }
});

test("EVERY signal declares the language it reads, and lean is not read as JavaScript", () => {
  for (const id of SIGNAL_IDS) {
    assert.ok(["js", "lean"].includes(SIGNALS[id].language), id);
  }
  const leanIds = SIGNAL_IDS.filter((id) => SIGNALS[id].language === "lean");
  assert.ok(leanIds.length >= 1, "the formal_statement family targets Lean, not JavaScript");
});
