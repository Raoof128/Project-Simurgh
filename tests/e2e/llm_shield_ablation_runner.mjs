// SPDX-License-Identifier: AGPL-3.0-or-later
// Ablation: detection contribution per detector stage against the FROZEN 3B corpus.
// Read-only; imports the pure classifier and flips its stages toggle. Writes nothing.
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalisePrompt } from "../../src/llmShield/promptNormalise.js";
import { classifyPrompt } from "../../src/llmShield/promptFirewall.js";
import { computeMetrics } from "./llm_shield_bench_lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(
  here,
  "..",
  "..",
  "docs",
  "research",
  "llm-shield",
  "evidence",
  "stage-3b",
  "fixtures"
);

async function load() {
  const out = [];
  for (const cls of await readdir(FIXTURE_ROOT)) {
    const dir = join(FIXTURE_ROOT, cls);
    for (const f of (await readdir(dir)).sort()) {
      if (f.endsWith(".json")) out.push(JSON.parse(await readFile(join(dir, f), "utf8")));
    }
  }
  return out;
}

// Note: the first row is spaced-phrase-match-only using the 3C phrase set, so it
// need not equal the literal frozen 3A 2/30 (the frozen baseline is reported
// separately in the findings from the digests). The rows show MARGINAL detection
// added by each stage on a common phrase set — that is the ablation's purpose.
const CONFIGS = [
  [
    "spaced phrase-match only (no canonicalisation)",
    { canonical: false, heuristics: false, contextGuard: false },
  ],
  [
    "+ canonicalisation (homoglyph/leet/compact/base64)",
    { canonical: true, heuristics: false, contextGuard: false },
  ],
  [
    "+ heuristics (role-play/structured/translate)",
    { canonical: true, heuristics: true, contextGuard: false },
  ],
  ["+ context guard (full 3C)", { canonical: true, heuristics: true, contextGuard: true }],
];

const fixtures = await load();
console.log("=== Stage 3C ablation (frozen 3B corpus) ===");
for (const [label, stages] of CONFIGS) {
  const observed = {};
  for (const fx of fixtures)
    observed[fx.case_id] = classifyPrompt(normalisePrompt(fx.payload), { stages }).verdict;
  const m = computeMetrics(fixtures, observed);
  console.log(
    `${label.padEnd(52)} detection=${m.adversarial_detection_rate} clean=${m.clean_benign_pass_rate} hardFP=${m.hard_negative_false_positive_rate}`
  );
}
