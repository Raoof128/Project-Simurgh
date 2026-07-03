// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

test("no overclaim phrases outside non-claims context", () => {
  // Pure-JS scan (no external `rg`/`grep` dependency — CI runners do not reliably ship
  // ripgrep, and a unit test must not fail-closed on a missing binary).
  const forbidden =
    /sybil (solved|closed)|prevents distillation|capability transfer proven|identity truth proven|non-bypassable|model safe/i;
  const targets = [
    "docs/research/llm-shield/STAGE_4L_THREAT_MODEL.md",
    "docs/research/llm-shield/STAGE_4L_CLOSEOUT.md",
    "scripts/reproduce-llm-shield-stage4l.sh",
    ...readdirSync("tools/simurgh-attestation/stage4l").map((f) =>
      join("tools/simurgh-attestation/stage4l", f)
    ),
  ];
  const hits = [];
  for (const p of targets) {
    const lines = readFileSync(p, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (forbidden.test(line)) hits.push(`${p}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.equal(hits.length, 0, `overclaim phrases found:\n${hits.join("\n")}`);
});

test("attestation constants carry all thirteen non-claims", () => {
  assert.equal(CCB_NON_CLAIMS.length, 13);
});
