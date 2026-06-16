// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3B benchmark runner.
//   default (CI):       assert frozen baseline + payload_hash + metrics; write nothing.
//   --update-baseline:  the only writer (payload_hash, baseline_*, metrics.json).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPrompt } from "../../src/llmShield/promptNormalise.js";
import { validateCorpus, sortReasonCodes, computeMetrics } from "./llm_shield_bench_lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..", "docs", "research", "llm-shield", "evidence", "stage-3b");
const FIXTURE_ROOT = join(ROOT, "fixtures");
const METRICS_PATH = join(ROOT, "metrics.json");
const UPDATE = process.argv.includes("--update-baseline");
const base =
  process.argv.find((a) => a.startsWith("http")) ||
  process.env.SIMURGH_BASE_URL ||
  "http://127.0.0.1:33042";
const api = `${base}/api/llm-shield`;

function die(msg, detail) {
  console.error(`FAIL: ${msg}${detail ? " " + JSON.stringify(detail) : ""}`);
  process.exit(1);
}

async function loadFixtures() {
  const out = [];
  for (const cls of await readdir(FIXTURE_ROOT)) {
    const dir = join(FIXTURE_ROOT, cls);
    for (const file of (await readdir(dir)).sort()) {
      if (!file.endsWith(".json")) continue;
      const path = join(dir, file);
      out.push({ path, fx: JSON.parse(await readFile(path, "utf8")) });
    }
  }
  return out;
}

async function newSession() {
  const res = await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return res.json();
}

async function runOne(sess, payload) {
  const res = await fetch(`${api}/${sess.session_id}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session_token}` },
    body: JSON.stringify({ task_type: "summarise", input: payload }),
  });
  return res.json();
}

async function main() {
  const entries = await loadFixtures();
  const fixtures = entries.map((e) => e.fx);

  // Corpus validation (both modes). Skip payload_hash check in update mode (we rewrite it).
  const toValidate = UPDATE ? fixtures.map(({ payload_hash, ...rest }) => rest) : fixtures;
  const v = validateCorpus(toValidate);
  if (!v.ok) die("corpus validation", v.errors);

  const sess = await newSession();
  const observed = {};

  for (const { path, fx } of entries) {
    if (UPDATE) fx.payload_hash = hashPrompt(fx.payload);
    else if (fx.payload_hash !== hashPrompt(fx.payload)) die(`payload_hash mismatch ${fx.case_id}`);

    const out = await runOne(sess, fx.payload);
    const verdict = out.verdict;
    const reasonCodes = sortReasonCodes(out.reason_codes);
    observed[fx.case_id] = verdict;

    if (UPDATE) {
      fx.baseline_verdict = verdict;
      fx.baseline_reason_codes = reasonCodes;
      await writeFile(path, JSON.stringify(fx, null, 2) + "\n");
    } else {
      if (verdict !== fx.baseline_verdict) {
        die(`baseline drift ${fx.case_id}`, { expected: fx.baseline_verdict, got: verdict });
      }
      if (
        JSON.stringify(reasonCodes) !== JSON.stringify(sortReasonCodes(fx.baseline_reason_codes))
      ) {
        die(`reason_codes drift ${fx.case_id}`, {
          expected: fx.baseline_reason_codes,
          got: reasonCodes,
        });
      }
    }
  }

  const metrics = computeMetrics(fixtures, observed);
  const metricsStr = JSON.stringify(metrics, null, 2) + "\n";

  if (UPDATE) {
    await writeFile(METRICS_PATH, metricsStr);
  } else {
    const committed = await readFile(METRICS_PATH, "utf8");
    if (committed !== metricsStr) die("metrics.json drift", metrics);
    const [pass, total] = metrics.clean_benign_pass_rate.split("/").map(Number);
    if (pass !== total) die("clean_benign_pass_rate < 100%", metrics.clean_benign_pass_rate);
  }

  console.log("=== Stage 3B benchmark ===");
  console.log(JSON.stringify(metrics, null, 2));
  console.log(UPDATE ? "\nBaseline + metrics updated." : "\nBaseline frozen — no drift.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
