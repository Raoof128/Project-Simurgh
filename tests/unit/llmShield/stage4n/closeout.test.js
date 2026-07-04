// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  SEISMOGRAPH_KNOWN_LIMITATIONS,
  SEISMOGRAPH_NON_CLAIMS,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";

const DOCS = "docs/research/llm-shield";
const read = (p) => readFile(p, "utf8");

test("all five reviewer docs exist and carry the motto header", async () => {
  for (const doc of [
    "STAGE_4N_THREAT_MODEL.md",
    "STAGE_4N_VALIDATION_MATRIX.md",
    "STAGE_4N_REVIEWER_CHECKLIST.md",
    "STAGE_4N_CLOSEOUT.md",
    "STAGE_4N_C9_ARTICLE73_PROJECTION.md",
  ]) {
    const content = await read(`${DOCS}/${doc}`);
    assert.ok(content.includes("AnthropicSafe First, then ReviewerSafe"), `${doc} missing motto`);
  }
});

test("closeout carries every non-claim and known limitation verbatim", async () => {
  const closeout = await read(`${DOCS}/STAGE_4N_CLOSEOUT.md`);
  for (const nc of SEISMOGRAPH_NON_CLAIMS) assert.ok(closeout.includes(nc), nc);
  for (const kl of SEISMOGRAPH_KNOWN_LIMITATIONS) assert.ok(closeout.includes(kl), kl);
});

test("no forbidden overclaims anywhere in the 4N docs", async () => {
  for (const doc of [
    "STAGE_4N_THREAT_MODEL.md",
    "STAGE_4N_VALIDATION_MATRIX.md",
    "STAGE_4N_REVIEWER_CHECKLIST.md",
    "STAGE_4N_CLOSEOUT.md",
    "STAGE_4N_C9_ARTICLE73_PROJECTION.md",
  ]) {
    const content = (await read(`${DOCS}/${doc}`)).toLowerCase();
    assert.equal(content.includes("first transparency log"), false, doc);
    assert.equal(content.includes("model is safe"), false, doc);
    assert.equal(content.includes("prevents extraction"), false, doc);
  }
});

test("validation matrix documents the frozen answers and pinned gate order", async () => {
  const matrixDoc = await read(`${DOCS}/STAGE_4N_VALIDATION_MATRIX.md`);
  assert.ok(matrixDoc.includes("Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17"));
  const frozen = JSON.parse(
    await read("tests/fixtures/llmShield/stage4n/expected-results/seismograph-matrix.json")
  );
  for (const [arm, { raw }] of Object.entries(frozen)) {
    assert.ok(matrixDoc.includes(arm), `matrix doc missing ${arm}`);
    if (raw !== 0) assert.ok(matrixDoc.includes(String(raw)), `matrix doc missing raw ${raw}`);
  }
});

test("projection doc carries the compliance non-claim verbatim", async () => {
  const projection = await read(`${DOCS}/STAGE_4N_C9_ARTICLE73_PROJECTION.md`);
  assert.ok(projection.includes("not_legal_compliance_certification"));
  assert.ok(projection.includes("2605.08192")); // related-work anchor
});
