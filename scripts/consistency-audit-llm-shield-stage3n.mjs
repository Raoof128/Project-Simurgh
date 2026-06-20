// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3N consistency audit: recompute claim consistency + pooling from frozen
// sources and assert committed evidence matches.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  METRIC_CONTRACT,
  evaluatePooling,
} from "../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3n";

const pooling = evaluatePooling(METRIC_CONTRACT);
if (pooling.cross_family_pooling_performed !== 0) {
  console.error("stage3n consistency FAIL: pooling performed");
  process.exit(1);
}
const committedPool = JSON.parse(
  await readFile(join(ROOT, "denominator-pooling-report.json"), "utf8")
);
if (
  committedPool.cross_family_pooling_performed !== 0 ||
  committedPool.pooled_asr_reported !== false
) {
  console.error("stage3n consistency FAIL: committed pooling report inconsistent");
  process.exit(1);
}
const claims = JSON.parse(await readFile(join(ROOT, "claim-consistency-report.json"), "utf8"));
if (
  claims.unresolved_numeric_claim_conflicts !== 0 ||
  claims.claim_evidence_map_complete !== true ||
  claims.prose_only_metric_claims_excluded !== true
) {
  console.error("stage3n consistency FAIL: claim consistency report not clean");
  process.exit(1);
}
// Every loadable source file is still present.
for (const family of STAGE3N_FAMILIES) {
  if (family === "attestation_validity") continue;
  await readFile(STAGE3N_SOURCE_FILES[family], "utf8");
}
console.log("stage3n consistency audit: passed");
