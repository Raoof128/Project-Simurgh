// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("no overclaim wording outside non-claims/deferral notes", () => {
  const banned =
    "reference monitor|gateway|blocks the tool|prevents|non-bypassable|first proof-carrying|kernel.sandbox";
  // rg exits 1 when no matches; we only fail on matches that are NOT inside a non_claims/deferral line.
  let out = "";
  try {
    out = execFileSync(
      "rg",
      [
        "-n",
        "-i",
        banned,
        "docs/research/llm-shield/STAGE_4J_CLOSEOUT.md",
        "docs/research/llm-shield/STAGE_4J_THREAT_MODEL.md",
      ],
      { encoding: "utf8" }
    );
  } catch (e) {
    out = e.stdout || "";
  }
  const offending = out
    .split("\n")
    .filter((l) => l && !/non.claim|defer|R6|4M|not a|never/i.test(l));
  assert.deepEqual(offending, [], `overclaim wording:\n${offending.join("\n")}`);
});

test("validation matrix names all eight gates P1..P8 plus P4-pre and every code 31..38", () => {
  const m = readFileSync("docs/research/llm-shield/STAGE_4J_VALIDATION_MATRIX.md", "utf8");
  for (const g of ["P1", "P2", "P3", "P4-pre", "P4", "P5", "P6", "P7", "P8"]) {
    assert.equal(m.includes(g), true, `matrix missing ${g}`);
  }
  for (const code of ["31", "32", "33", "34", "35", "36", "37", "38", "24"]) {
    assert.equal(m.includes(code), true, `matrix missing code ${code}`);
  }
});

test("reviewer checklist covers T1-T7", () => {
  const c = readFileSync("docs/research/llm-shield/STAGE_4J_REVIEWER_CHECKLIST.md", "utf8");
  for (const t of ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]) {
    assert.equal(c.includes(t), true, `missing ${t}`);
  }
});

test("threat model documents the 38-over-34 precedence as a chosen semantic", () => {
  const tm = readFileSync("docs/research/llm-shield/STAGE_4J_THREAT_MODEL.md", "utf8");
  assert.equal(
    /38.{0,40}(over|before|precedence).{0,40}34|P8.{0,60}before.{0,20}P4/is.test(tm),
    true
  );
});

test("positioning brief measured column is filled from evidence, no pending cells remain", () => {
  const brief = readFileSync("docs/research/llm-shield/STAGE_4J_POSITIONING_BRIEF.md", "utf8");
  assert.equal(
    brief.includes("pending build"),
    false,
    "brief still carries pending Measured cells"
  );
  const ev = JSON.parse(
    readFileSync("docs/research/llm-shield/evidence/stage-4j/p-gate-results.json", "utf8")
  );
  for (const g of ev.gates) {
    assert.equal(
      brief.includes(`${g.rawCode} → ${g.typedCode}`),
      true,
      `brief missing observed ${g.gate} result ${g.rawCode} → ${g.typedCode}`
    );
  }
});
