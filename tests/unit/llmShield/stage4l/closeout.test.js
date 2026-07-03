// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CCB_NON_CLAIMS } from "../../../../tools/simurgh-attestation/stage4l/constants.mjs";

const docs = [
  "docs/research/llm-shield/STAGE_4L_THREAT_MODEL.md",
  "docs/research/llm-shield/STAGE_4L_REVIEWER_CHECKLIST.md",
  "docs/research/llm-shield/STAGE_4L_CLOSEOUT.md",
  "docs/research/llm-shield/evidence/stage-4l/README.md",
];

test("all four reviewer docs exist and carry the non-claims", () => {
  for (const p of docs) {
    const text = readFileSync(p, "utf8");
    assert.ok(text.includes("not_sybil_closure"), p);
    assert.ok(text.includes("not_structuring_closure_without_provider_binding"), p);
  }
});

test("threat model states the anti-monotonicity lemma and the ledgered-evasion line", () => {
  const t = readFileSync(docs[0], "utf8");
  assert.ok(/monotone under truth/i.test(t));
  assert.ok(/ledgered/i.test(t));
});

test("overclaim grep finds nothing outside non-claims context", () => {
  // rg exits 1 when nothing matches: that is the PASSING case for forbidden phrases
  const forbidden =
    "sybil (solved|closed)|prevents distillation|capability transfer proven|identity truth proven|non-bypassable|model safe";
  let out = "";
  try {
    out = execFileSync(
      "rg",
      [
        "-n",
        "-i",
        forbidden,
        "docs/research/llm-shield/STAGE_4L_THREAT_MODEL.md",
        "docs/research/llm-shield/STAGE_4L_CLOSEOUT.md",
        "tools/simurgh-attestation/stage4l",
        "scripts/reproduce-llm-shield-stage4l.sh",
      ],
      { encoding: "utf8" }
    );
  } catch (e) {
    if (e.status === 1) return; // no matches: pass
    throw e;
  }
  assert.fail(`overclaim phrases found:\n${out}`);
});

test("attestation constants carry all thirteen non-claims", () => {
  assert.equal(CCB_NON_CLAIMS.length, 13);
});
