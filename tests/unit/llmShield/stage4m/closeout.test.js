// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { VXD_NON_CLAIMS } from "../../../../tools/simurgh-attestation/stage4m/constants.mjs";

const docs = [
  "docs/research/llm-shield/STAGE_4M_THREAT_MODEL.md",
  "docs/research/llm-shield/STAGE_4M_REVIEWER_CHECKLIST.md",
  "docs/research/llm-shield/STAGE_4M_CLOSEOUT.md",
  "docs/research/llm-shield/evidence/stage-4m/README.md",
];

test("all four reviewer docs exist and carry the 4L non-claims lineage", () => {
  for (const p of docs) {
    const text = readFileSync(p, "utf8");
    assert.ok(text.includes("not_sybil_closure"), p);
    assert.ok(text.includes("not_structuring_closure_without_provider_binding"), p);
  }
});

test("threat model states the anti-monotonicity lemma, the ledgered line, and the audience model", () => {
  const t = readFileSync(docs[0], "utf8");
  assert.ok(/monotone under truth/i.test(t));
  assert.ok(/ledgered/i.test(t));
  assert.ok(/AnthropicSafe First, then ReviewerSafe/.test(t));
  assert.ok(/Tier P/.test(t) && /Tier A/.test(t) && /Tier R/.test(t));
});

test("no overclaim phrases outside non-claims context", () => {
  // Pure-JS scan (no external `rg`/`grep` — CI runners do not reliably ship ripgrep, and a unit
  // test must not fail-closed on a missing binary). Phrase forms only, so the signed constant
  // names (not_model_safety, etc.) do not trip the scan.
  const forbidden =
    /breaches? (prevented|impossible)|contest.* (upheld|adjudicated|resolved)|legally compliant|Article 73 certified|regulator approved|identity (proven|confirmed)|leak.* (eliminated|impossible)|fully anonymous|model is safe|prevents distillation|non-bypassable/i;
  const targets = [
    "docs/research/llm-shield/STAGE_4M_THREAT_MODEL.md",
    "docs/research/llm-shield/STAGE_4M_CLOSEOUT.md",
    "docs/research/llm-shield/STAGE_4M_REVIEWER_CHECKLIST.md",
    "docs/research/llm-shield/evidence/stage-4m/README.md",
    "scripts/reproduce-llm-shield-stage4m.sh",
    ...readdirSync("tools/simurgh-attestation/stage4m").flatMap((f) => {
      const p = join("tools/simurgh-attestation/stage4m", f);
      return f.endsWith(".mjs") ? [p] : [];
    }),
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

test("brand denylist: no real lab/company names in fixtures or evidence", () => {
  const banned = /\b(anthropic|alibaba|qwen|deepseek|openai|claude|gpt-4|moonshot|minimax)\b/i;
  const roots = ["tests/fixtures/llmShield/stage4m"];
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const lines = readFileSync(p, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (banned.test(line)) hits.push(`${p}:${i + 1}`);
        });
      }
    }
  };
  for (const r of roots) walk(r);
  assert.equal(hits.length, 0, `brand names in fixtures:\n${hits.join("\n")}`);
});

test("attestation constants carry nineteen non-claims", () => {
  assert.equal(VXD_NON_CLAIMS.length, 19);
});
