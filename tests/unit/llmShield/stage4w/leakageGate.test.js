import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scanLeakage,
  checkLeakage,
  uncoveredRegions,
} from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import { bodyBytes } from "../../../../tools/simurgh-attestation/stage4w/core/textCore.mjs";

const prose = (id, s, e) => ({ span_id: id, start_byte: s, end_byte: e, type: "unverified_prose" });

test("leakage: digits, number words, percent, months, quantifiers, capsule collision", () => {
  assert.deepEqual(scanLeakage("calm text only\n", [], []), []);
  assert.equal(scanLeakage("we saw 9 incidents\n", [], [])[0].rule, "digit");
  assert.equal(scanLeakage("a dozen problems\n", [], [])[0].rule, "number_word");
  assert.equal(scanLeakage("uptake grew percent-wise\n", [], [])[0].rule, "percent");
  assert.equal(scanLeakage("late in january it began\n", [], [])[0].rule, "month");
  assert.equal(scanLeakage("nearly everyone was fine\n", [], [])[0].rule, "quantifier");
  assert.deepEqual(scanLeakage("the range was fine\n", [], ["2026-07-01/2026-07-02"]), []);
  assert.equal(
    scanLeakage("range 2026-07-01/2026-07-02 leaked\n", [], ["2026-07-01/2026-07-02"])[0].rule,
    "digit" // digits fire first; collision rule also matches — first hit wins
  );
});

test("capsule_value_collision fires on a NON-numeric echoed value (reviewer P2 #12)", () => {
  // A capsule value like a consent scope serialises to a digit-free string; echoing it
  // undeclared must trip the collision rule specifically, not the digit rule.
  const hit = scanLeakage("we quietly mention mailread in passing\n", [], ["mailread"]);
  assert.equal(hit[0].rule, "capsule_value_collision");
  // And when it IS declared inside a prose span, no hit.
  const declaredEnd = bodyBytes("we quietly mention mailread").length;
  assert.equal(
    scanLeakage(
      "we quietly mention mailread in passing\n",
      [prose("p1", 0, declaredEnd)],
      ["mailread"]
    ).length,
    0
  );
});

test("declared prose spans are exempt; undeclared text is scanned", () => {
  const body = "we believe most users trust us. calm close.\n";
  const end = bodyBytes("we believe most users trust us.").length;
  assert.equal(scanLeakage(body, [prose("p1", 0, end)], []).length, 0);
  assert.equal(scanLeakage(body, [], [])[0].rule, "quantifier"); // "most" undeclared
  const r = checkLeakage(body, [], []);
  assert.equal(r.raw, 170);
  assert.equal(r.reason, "vsn_leakage_detected");
});

test("uncovered regions are exact byte complements of the span map", () => {
  const body = "abc def\n";
  const regions = uncoveredRegions(body, [prose("p1", 4, 7)]);
  assert.deepEqual(
    regions.map((r) => r.text),
    ["abc ", "\n"]
  );
});
