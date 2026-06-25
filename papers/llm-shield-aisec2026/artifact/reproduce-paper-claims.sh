#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "[1/6] Checking Stage 3L metrics and benign false-positive rate"
node - <<'NODE'
const fs = require("fs");
const m = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3l/metrics.json", "utf8"));
const checks = [
  ["total_cases", m.total_cases === 180],
  ["input_miss_downstream_contained", m.input_miss_downstream_contained === 120],
  ["direct_input_blocked", m.direct_input_blocked === 30],
  ["malicious_targeted_asr", m.malicious_targeted_asr === 0 && m.malicious_total === 150],
  ["benign false-positive rate 0/30", m.benign_hard_negative_passed === 30 && m.benign_total === 30],
  ["unsafe consequences", m.unauthorised_tool_execution === 0 && m.unsafe_output_export === 0 && m.context_authority_escalation === 0],
  ["receipt/audit", m.receipt_coverage === 180 && m.audit_chain_valid === 180],
];
for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Stage 3L check failed: ${name}`);
}
NODE

echo "[2/6] Checking Stage 3L per-boundary ablation (Table 4)"
node - <<'NODE'
const fs = require("fs");
const b = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3l/boundary-breakdown.json", "utf8"));
const im = b.by_case_mode.input_miss_downstream;
if (im.context_guard !== 72 || im.tool_gate !== 24 || im.output_firewall !== 24 || im.input_firewall !== 0) {
  throw new Error("Stage 3L ablation mismatch");
}
if (im.context_guard + im.tool_gate + im.output_firewall !== 120) throw new Error("ablation does not sum to 120");
NODE

echo "[3/6] Checking Stage 3M verifier output"
grep -q "simurgh attestation verify: PASS" docs/research/llm-shield/evidence/stage-3m/verifier-output.txt
grep -q "signature_valid: true" docs/research/llm-shield/evidence/stage-3m/verifier-output.txt
grep -q "evidence_leakage_zero: true" docs/research/llm-shield/evidence/stage-3m/verifier-output.txt

echo "[4/6] Checking Stage 3V-A advisory-invariance fixture (synthetic; no detection claim)"
node - <<'NODE'
const fs = require("fs");
const man = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3v/corpus-manifest.json", "utf8"));
const c = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3v/containment-summary.json", "utf8"));
// Fixture must be declared synthetic so the paper makes no detection/guardrail claim from it.
if (man.adapter_config.fixture_provenance !== "synthetic_deterministic") throw new Error("3V-A fixture not declared synthetic");
// Advisory-invariance: every case contained regardless of the (allow/warn/block) verdict.
if (c.external_miss_but_contained_rate !== "80/80") throw new Error("unexpected 3V-A containment");
if (c.unsafe_tool_execution !== 0 || c.unsafe_output_export !== 0 || c.context_authority_escalation !== 0) throw new Error("3V-A unsafe outcome");
NODE

echo "[5/6] Checking Stage 3V-B real external guardrail (Llama Guard 4 12B)"
node - <<'NODE'
const fs = require("fs");
const m = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3v-b/metrics.json", "utf8"));
if (m.external.external_allow_rate !== "168/180") throw new Error("unexpected external allow rate");
if (m.external.external_block_rate !== "12/180") throw new Error("unexpected external block rate");
if (m.comparative.external_only_targeted_asr !== "138/150") throw new Error("unexpected external-only ASR");
if (m.comparative.external_plus_simurgh_targeted_asr !== "0/150") throw new Error("unexpected external-plus ASR");
NODE

echo "[6/6] Checking Stage 3X reproduction result"
node - <<'NODE'
const fs = require("fs");
const r = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3x/vca-chain-reproduction-results.json", "utf8"));
if (!r.timeline_verified || r.rungs_passed !== 12 || r.rungs_failed !== 0) throw new Error("Stage 3X chain result mismatch");
if (r.tier_summary.reproduce.passed !== 3 || r.tier_summary.evidence_hashes.passed !== 7 || r.tier_summary.index_only.passed !== 2) throw new Error("Stage 3X tier summary mismatch");
NODE

echo "paper claim artifact checks: PASS"
