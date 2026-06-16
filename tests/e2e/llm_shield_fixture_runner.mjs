// Loads every fixture, runs it through a live /api/llm-shield server, asserts the
// observed verdict/reason codes match expectations, and prints a metrics summary.
// Exit code is non-zero on any mismatch. Used by scripts/smoke-llm-shield.sh.
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(
  here,
  "..",
  "..",
  "docs",
  "research",
  "llm-shield",
  "evidence",
  "stage-3a",
  "fixtures"
);
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33041";
const api = `${base}/api/llm-shield`;

async function loadFixtures() {
  const out = [];
  for (const cls of await readdir(FIXTURE_ROOT)) {
    const dir = join(FIXTURE_ROOT, cls);
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json")) continue;
      out.push(JSON.parse(await readFile(join(dir, file), "utf8")));
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

async function run() {
  const fixtures = await loadFixtures();
  const sess = await newSession();
  let attackTotal = 0,
    attackBlocked = 0,
    benignTotal = 0,
    benignSafe = 0,
    benignBlocked = 0;
  const failures = [];

  for (const fx of fixtures) {
    const body = { task_type: "summarise", input: fx.payload };
    if (Object.hasOwn(fx, "contexts")) body.contexts = fx.contexts;
    const res = await fetch(`${api}/${sess.session_id}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session_token}`,
      },
      body: JSON.stringify(body),
    });
    const out = await res.json();
    const expected = fx.expected;
    const isAttack = expected.verdict === "blocked";
    if (isAttack) {
      attackTotal++;
      if (out.verdict === "blocked") attackBlocked++;
    } else {
      benignTotal++;
      if (out.verdict === "safe") benignSafe++;
      else if (out.verdict === "blocked") benignBlocked++;
    }

    if (out.verdict !== expected.verdict) {
      failures.push(`${fx.case_id}: expected ${expected.verdict}, got ${out.verdict}`);
      continue;
    }
    for (const rc of expected.reason_codes ?? []) {
      if (!(out.reason_codes ?? []).includes(rc)) {
        failures.push(`${fx.case_id}: missing reason_code ${rc}`);
      }
    }
    if (Object.hasOwn(expected, "model_called") && out.model_called !== expected.model_called) {
      failures.push(
        `${fx.case_id}: expected model_called ${expected.model_called}, got ${out.model_called}`
      );
    }
  }

  const pct = (n, d) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);
  console.log("=== Stage 3A-alpha LLM Shield metrics ===");
  console.log(`fixtures:            ${fixtures.length}`);
  console.log(
    `attack_block_rate:   ${pct(attackBlocked, attackTotal)} (${attackBlocked}/${attackTotal})`
  );
  console.log(
    `benign_pass_rate:    ${pct(benignSafe, benignTotal)} (${benignSafe}/${benignTotal})`
  );
  console.log(
    `false_positive_rate: ${pct(benignBlocked, benignTotal)} (${benignBlocked}/${benignTotal})`
  );

  if (failures.length > 0) {
    console.error("\nFAILURES:");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log("\nAll fixtures matched expectations.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
