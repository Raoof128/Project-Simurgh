// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, constants } from "node:fs";
import { accessSync } from "node:fs";

const SCRIPT = "scripts/reproduce-llm-shield-stage4o.sh";

test("reproduce script exists and is executable", () => {
  const st = statSync(SCRIPT);
  assert.ok(st.isFile());
  accessSync(SCRIPT, constants.X_OK); // throws if not executable
});

test("reproduce script pins Node 26 and routes the final exit through the wrapper", () => {
  const src = readFileSync(SCRIPT, "utf8");
  assert.match(src, /node@26/);
  assert.match(src, />= 26/);
  assert.match(src, /stage4CodeForRawCode/);
  // Never a bare `exit 1`.
  assert.equal(/\bexit 1\b/.test(src), false);
});

test("reproduce script excludes non-regenerated fixtures from the cmp loop", () => {
  const src = readFileSync(SCRIPT, "utf8");
  assert.match(src, /grep -v "test-keys"/);
  assert.match(src, /grep -v "laneb"/);
});

const DOCS = "docs/research/llm-shield";
const DOC_SET = [
  "STAGE_4O_THREAT_MODEL.md",
  "STAGE_4O_VALIDATION_MATRIX.md",
  "STAGE_4O_REVIEWER_CHECKLIST.md",
  "STAGE_4O_CLOSEOUT.md",
];

test("all four reviewer docs exist and carry the motto header", () => {
  for (const doc of DOC_SET) {
    const content = readFileSync(`${DOCS}/${doc}`, "utf8");
    assert.ok(content.includes("AnthropicSafe First, then ReviewerSafe"), `${doc} missing motto`);
  }
});

test("closeout carries every non-claim and known limitation verbatim", () => {
  const att = JSON.parse(
    readFileSync("docs/research/llm-shield/evidence/stage-4o/vtsa-attestation.json", "utf8")
  );
  const closeout = readFileSync(`${DOCS}/STAGE_4O_CLOSEOUT.md`, "utf8");
  for (const nc of att.non_claims) assert.ok(closeout.includes(nc), nc);
  for (const kl of att.known_limitations) assert.ok(closeout.includes(kl), kl);
});

test("validation matrix documents every committed arm and its raw code", () => {
  const matrixDoc = readFileSync(`${DOCS}/STAGE_4O_VALIDATION_MATRIX.md`, "utf8");
  const matrix = JSON.parse(
    readFileSync("tests/fixtures/llmShield/stage4o/expected-results/vtsa-matrix.json", "utf8")
  );
  for (const row of matrix) {
    assert.ok(matrixDoc.includes(row.arm), `matrix doc missing ${row.arm}`);
    if (row.expected_raw !== 0) {
      assert.ok(
        matrixDoc.includes(String(row.expected_raw)),
        `matrix doc missing raw ${row.expected_raw}`
      );
    }
  }
  assert.ok(matrixDoc.includes("55 → 56 → 57 → 64 → 65 → 58 → 59 → 60 → 61 → 62 → 63 → 66"));
});

test("no forbidden overclaims anywhere in the 4O docs", () => {
  for (const doc of DOC_SET) {
    const content = readFileSync(`${DOCS}/${doc}`, "utf8").toLowerCase();
    assert.equal(content.includes("tools are safe"), false, doc);
    assert.equal(content.includes("prevents rug pulls"), false, doc);
    assert.equal(
      content.includes("constitutional compliance") &&
        !content.includes("not claim constitutional compliance") &&
        !content.includes("not_constitutional_compliance_claim"),
      false,
      doc
    );
  }
});
