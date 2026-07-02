// SPDX-License-Identifier: AGPL-3.0-or-later
// Evidence-refusal rule: if ANY observed verdict diverges from the expected matrix, exit
// non-zero WITHOUT writing — evidence contradicting the contract is never emitted.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runEbaCore } from "./verify-stage4k-eba.mjs";

// Test-only overrides (K7): exercise the divergence-refusal path against a corrupted
// TEMP matrix without touching committed fixtures or evidence. Defaults unchanged.
const FIX = process.env.STAGE4K_FIXTURE_ROOT || "tests/fixtures/llmShield/stage4k";
const OUT = process.env.STAGE4K_EVIDENCE_OUT || "docs/research/llm-shield/evidence/stage-4k";
const MATRIX = JSON.parse(readFileSync(`${FIX}/expected-results/exposure-matrix.json`, "utf8"));

const results = {};
for (const [name, expected] of Object.entries(MATRIX)) {
  const r = await runEbaCore({
    bundleDir: `${FIX}/bundles/${name}`,
    pinnedPubkeyPath: `${FIX}/eba-signer.pub`,
  });
  if (r.rawCode !== expected.raw || r.typed !== expected.typed) {
    console.error(
      `evidence refused: ${name} observed raw=${r.rawCode} typed=${r.typed}, expected raw=${expected.raw} typed=${expected.typed}`
    );
    process.exit(1);
  }
  results[name] = { raw: r.rawCode, typed: r.typed, reason: r.reason };
}

mkdirSync(OUT, { recursive: true });
for (const f of [
  "extraction-ledger.json",
  "budget-policy.json",
  "extraction-attestation.json",
  "eba-manifest.json",
]) {
  copyFileSync(`${FIX}/bundles/under-budget/${f}`, `${OUT}/${f}`);
}
const summary = {
  stage: "4K",
  gate: "Q8",
  matrix_rows: Object.keys(MATRIX).length,
  results,
  conjunction: {
    clean_run_all_under_budget: results["under-budget"].raw === 0,
    over_budget_double_caught: results["over-budget"].raw === 30,
    over_budget_double_raw_code: results["over-budget"].raw,
    q8_status: "pass",
  },
};
writeFileSync(`${OUT}/extraction-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`stage4k evidence written to ${OUT}`);
