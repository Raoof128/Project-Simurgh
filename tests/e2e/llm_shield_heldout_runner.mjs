// SPDX-License-Identifier: AGPL-3.0-or-later
// Held-out generalization probe: NEW obfuscation variants the detector was not
// developed against. Reports detection as a distinct number (overfitting estimate).
// Measurement only — no pass/fail threshold, so it never becomes a second goalpost.
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalisePrompt, hashPrompt } from "../../src/llmShield/promptNormalise.js";
import { classifyPrompt } from "../../src/llmShield/promptFirewall.js";
import { computeMetrics } from "./llm_shield_bench_lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(
  here,
  "..",
  "..",
  "docs",
  "research",
  "llm-shield",
  "evidence",
  "stage-3c",
  "heldout"
);

const fixtures = [];
for (const f of (await readdir(ROOT)).sort()) {
  if (!f.endsWith(".json")) continue;
  const fx = JSON.parse(await readFile(join(ROOT, f), "utf8"));
  if (fx.payload_hash !== hashPrompt(fx.payload)) {
    console.error(`payload_hash mismatch ${fx.case_id}`);
    process.exit(1);
  }
  fixtures.push(fx);
}
const observed = {};
for (const fx of fixtures)
  observed[fx.case_id] = classifyPrompt(normalisePrompt(fx.payload)).verdict;
const m = computeMetrics(fixtures, observed);
console.log("=== Stage 3C held-out generalization ===");
console.log(JSON.stringify(m, null, 2));
