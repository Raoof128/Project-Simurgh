#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3X external reviewer command. Verifies the signed VCA timeline, then for each rung:
#   - re-resolves tag->commit and compares to the signed merge_commit;
#   - CHAIN-LEVEL: recomputes sha256 of the stage's evidence-hashes.json and compares to the signed
#     evidence_root_digest (format-independent; applies to all 10 evidence-root rungs);
#   - DEEP: runs the strict generic evidence-hashes verifier ONLY on current-format manifests;
#   - REPRODUCE: runs the stage's own reproduce script for reproduce-tier rungs.
# Emits a reproduction-results artifact. Offline; no network. Run from the repo root.
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Stage 3X — VCA chain external reproduction"
if ! node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce >/dev/null; then
  echo "timeline verify FAILED" >&2
  exit 1
fi

if node --input-type=module - <<'NODE'
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { sha256Hex } from "./tools/simurgh-attestation/canonicalise.mjs";
import { verifyEvidenceHashes } from "./tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3x";
const idx = JSON.parse(fs.readFileSync(`${EV}/timeline.index.json`, "utf8"));
const results = [];
for (const r of idx.rungs) {
  const out = {
    stage: r.stage,
    replay_tier: r.replay_tier,
    tag_commit_pinned: false,
    evidence_root_digest_matched: null,
    deep_rewalk_passed: null,
    reproduce_passed: null,
  };
  try {
    const commit = execFileSync("git", ["rev-parse", `${r.tag}^{commit}`], { encoding: "utf8" }).trim();
    out.tag_commit_pinned = commit === r.merge_commit;
  } catch {
    out.tag_commit_pinned = false;
  }
  // Chain-level: recompute the manifest digest (format-independent) vs the signed value.
  if (r.evidence_hashes_available) {
    try {
      const live = sha256Hex(fs.readFileSync(`${r.evidence_dir}/evidence-hashes.json`, "utf8"));
      out.evidence_root_digest_matched = live === r.evidence_root_digest;
    } catch {
      out.evidence_root_digest_matched = false;
    }
  }
  // Deep per-file re-walk: strict generic verifier, current-format manifests only.
  if (r.deep_rewalk_mode === "strict_current_format") {
    out.deep_rewalk_passed = verifyEvidenceHashes(r.evidence_dir).ok;
  }
  // Full reproduce: reproduce-tier rungs run their own stage script.
  if (r.replay_tier === "reproduce") {
    try {
      execFileSync("bash", [r.reproduce_command], { stdio: "ignore" });
      out.reproduce_passed = true;
    } catch {
      out.reproduce_passed = false;
    }
  }
  results.push(out);
}
const ok = (v) => v === null || v === true;
const passed = (x) =>
  x.tag_commit_pinned && ok(x.evidence_root_digest_matched) && ok(x.deep_rewalk_passed) && ok(x.reproduce_passed);
const tier = (t) => results.filter((x) => x.replay_tier === t);
const tierSummary = (t) => ({ total: tier(t).length, passed: tier(t).filter(passed).length });
const rootRungs = results.filter((x) => x.evidence_root_digest_matched !== null);
const deepRungs = results.filter((x) => x.deep_rewalk_passed !== null);
const artifact = {
  schema: "simurgh.vca.chain_reproduction_results.v1",
  timeline_verified: true,
  rungs_total: results.length,
  rungs_passed: results.filter(passed).length,
  rungs_failed: results.filter((x) => !passed(x)).length,
  offline_only: true,
  network_required: false,
  // Replay-tier counts and the evidence-root/deep surfaces are kept SEPARATE (no double-counting).
  tier_summary: {
    reproduce: tierSummary("reproduce"),
    evidence_hashes: tierSummary("evidence_hashes"),
    index_only: tierSummary("index_only"),
  },
  evidence_root_pinned_summary: {
    total: rootRungs.length,
    passed: rootRungs.filter((x) => x.evidence_root_digest_matched === true).length,
  },
  deep_per_file_rewalk_summary: {
    total: deepRungs.length,
    passed: deepRungs.filter((x) => x.deep_rewalk_passed === true).length,
  },
  results,
  non_claims: [
    "does_not_reexecute_live_models",
    "does_not_prove_original_gpu_capture",
    "does_not_reduce_live_capture_origin_self_reported",
    "does_not_claim_production_readiness",
    "does_not_claim_general_jailbreak_resistance",
    "does_not_claim_uniform_12_12_full_reproduction",
  ],
};
fs.writeFileSync(`${EV}/vca-chain-reproduction-results.json`, JSON.stringify(artifact, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      rungs_passed: artifact.rungs_passed,
      rungs_failed: artifact.rungs_failed,
      tier_summary: artifact.tier_summary,
      evidence_root_pinned_summary: artifact.evidence_root_pinned_summary,
      deep_per_file_rewalk_summary: artifact.deep_per_file_rewalk_summary,
    },
    null,
    2
  )
);
if (artifact.rungs_failed > 0) process.exit(1);
NODE
then
  echo "Stage 3X VCA chain reproduction: PASS"
else
  echo "Stage 3X VCA chain reproduction: FAIL" >&2
  exit 1
fi
