// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure timeline library for Stage 3X. Builds the signed public VCA timeline index from a frozen
// rung table + committed evidence on disk. Resolves tag->commit via git (offline). No network,
// no model, no src/llmShield. index_only rungs are bound by tag/commit/headline/fingerprint only.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence";

// Columns: stage, tag, headline, replay_tier, evidence_subdir, full_reproduce_available,
// evidence_hashes_available, reproduce_command, index_only_reason, replay_surface_reason,
// deep_rewalk_mode. deep_rewalk_mode "strict_current_format" rungs are deep-walkable by the strict
// generic verifier; legacy/cross-stage manifests are chain-pinned by evidence_root_digest only.
export const VCA_RUNGS = Object.freeze(
  [
    [
      "3M",
      "v1.6.0-stage-3m-verifiable-containment-attestation",
      "Offline-verifiable provider-agnostic containment attestation",
      "index_only",
      "stage-3m",
      false,
      false,
      null,
      "index_only_for_3x_chain_hashing",
      "Stage 3M predates the project-wide evidence-hashes.json pattern; 3X binds its tag, merge commit, headline, public key fingerprint, and available attestation metadata, but does not claim generic evidence-hash replay for this rung.",
      "not_applicable_index_only",
    ],
    [
      "3N",
      "v1.7.0-stage-3n-claim-checked-security-utility-ledger",
      "Claim-checked security/utility ledger",
      "evidence_hashes",
      "stage-3n",
      false,
      true,
      null,
      null,
      "Stage 3N exposes an evidence-hashes.json that 3X root-pins and chain-checks; its manifest intentionally references cross-stage artifacts, so 3X does not relax containment guards to deep-walk this historical format.",
      "not_applicable_cross_stage_manifest",
    ],
    [
      "3O",
      "v1.8.0-stage-3o-byo-gateway-containment-benchmark",
      "BYO-gateway containment benchmark",
      "evidence_hashes",
      "stage-3o",
      false,
      true,
      null,
      null,
      "Stage 3O exposes an evidence-hashes.json that 3X root-pins and chain-checks; its manifest uses stage-relative legacy paths, so deep per-file re-walk is not claimed.",
      "not_applicable_stage_relative_legacy_manifest",
    ],
    [
      "3P",
      "v1.9.0-stage-3p-cross-defence-containment-attestation",
      "Cross-defence containment attestation",
      "evidence_hashes",
      "stage-3p",
      false,
      true,
      null,
      null,
      "Stage 3P exposes an evidence-hashes.json that 3X root-pins and chain-checks; its manifest uses stage-relative legacy paths, so deep per-file re-walk is not claimed.",
      "not_applicable_stage_relative_legacy_manifest",
    ],
    [
      "3Q",
      "v2.0.0-stage-3q-attestation-registry-regression-diff",
      "Attestation registry + regression diff",
      "evidence_hashes",
      "stage-3q",
      false,
      true,
      null,
      null,
      "Stage 3Q exposes an evidence-hashes.json that 3X root-pins and chain-checks; its manifest uses stage-relative legacy paths, so deep per-file re-walk is not claimed.",
      "not_applicable_stage_relative_legacy_manifest",
    ],
    [
      "3R",
      "v2.1.0-stage-3r-trust-preserving-provider-fallback",
      "Trust-preserving provider fallback",
      "index_only",
      null,
      false,
      false,
      null,
      "index_only_source_feature_stage_no_evidence_directory",
      "Stage 3R was a source feature stage under src/llmShield/gateway rather than an evidence-directory stage; 3X binds its tag, merge commit, and headline but does not claim evidence-directory replay.",
      "not_applicable_index_only",
    ],
    [
      "3S",
      "v2.2.0-stage-3s-verifiable-defensive-narrative",
      "Verifiable defensive narrative",
      "evidence_hashes",
      "stage-3s",
      false,
      true,
      null,
      null,
      "Stage 3S exposes an evidence-hashes.json that 3X root-pins and chain-checks; its manifest uses stage-relative legacy paths, so deep per-file re-walk is not claimed.",
      "not_applicable_stage_relative_legacy_manifest",
    ],
    [
      "3T",
      "v2.3.0-stage-3t-offline-capability-extraction-attestation",
      "Offline capability-extraction attestation",
      "evidence_hashes",
      "stage-3t",
      false,
      true,
      null,
      null,
      "Stage 3T exposes a current-format evidence-hashes.json; 3X root-pins it and deep-walks every listed digest under strict containment.",
      "strict_current_format",
    ],
    [
      "3U",
      "v2.4.0-stage-3u-red-team-hardened-extraction-attestation",
      "Red-team-hardened extraction attestation",
      "evidence_hashes",
      "stage-3u",
      false,
      true,
      null,
      null,
      "Stage 3U exposes a current-format evidence-hashes.json; 3X root-pins it and deep-walks every listed digest under strict containment.",
      "strict_current_format",
    ],
    [
      "3V",
      "v2.5.0-stage-3v-a-recorded-external-signal-attestation",
      "Recorded external-signal containment attestation",
      "reproduce",
      "stage-3v",
      true,
      true,
      "scripts/reproduce-llm-shield-stage3v.sh",
      null,
      "Stage 3V exposes a full offline reproduce script; 3X delegates replay to it and deep-walks its current-format manifest.",
      "strict_current_format",
    ],
    [
      "3V-B",
      "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
      "Live Llama Guard 4 external-defence containment attestation",
      "reproduce",
      "stage-3v-b",
      true,
      true,
      "scripts/reproduce-llm-shield-stage3vb.sh",
      null,
      "Stage 3V-B exposes a full offline reproduce script; 3X delegates replay to it and deep-walks its current-format manifest.",
      "strict_current_format",
    ],
    [
      "3W",
      "v2.7.0-stage-3w-witnessed-vca-release-provenance",
      "Witnessed VCA release provenance",
      "reproduce",
      "stage-3w",
      true,
      true,
      "scripts/reproduce-llm-shield-stage3w.sh",
      null,
      "Stage 3W exposes a full offline reproduce script; 3X delegates replay to it and deep-walks its current-format manifest.",
      "strict_current_format",
    ],
  ].map((r) =>
    Object.freeze({
      stage: r[0],
      tag: r[1],
      headline: r[2],
      replay_tier: r[3],
      evidence_dir: r[4] ? `${EV}/${r[4]}` : null,
      full_reproduce_available: r[5],
      evidence_hashes_available: r[6],
      reproduce_command: r[7],
      index_only_reason: r[8],
      replay_surface_reason: r[9],
      deep_rewalk_mode: r[10],
    })
  )
);

const NON_CLAIMS = Object.freeze([
  "does_not_reexecute_live_models",
  "does_not_prove_original_gpu_capture",
  "does_not_reduce_live_capture_origin_self_reported",
  "does_not_claim_production_readiness",
  "does_not_claim_general_jailbreak_resistance",
  "does_not_claim_uniform_12_12_full_reproduction",
]);

export function resolveMergeCommit(tag) {
  return execFileSync("git", ["rev-parse", `${tag}^{commit}`], { encoding: "utf8" }).trim();
}

export function resolveFingerprint(rung) {
  if (!rung.evidence_dir) return null;
  const keysDir = join(rung.evidence_dir, "keys");
  let pem = null;
  if (existsSync(keysDir)) {
    const f = readdirSync(keysDir).find((n) => n.endsWith("public-key.json"));
    if (f) pem = JSON.parse(readFileSync(join(keysDir, f), "utf8")).public_key_pem;
  }
  if (!pem) {
    const alt = join(rung.evidence_dir, "attestation.public-key.json");
    if (existsSync(alt)) pem = JSON.parse(readFileSync(alt, "utf8")).public_key_pem;
  }
  return pem ? fingerprintPublicKey(pem) : null;
}

export function evidenceRootDigest(rung) {
  if (!rung.evidence_hashes_available || !rung.evidence_dir) return null;
  return sha256Hex(readFileSync(join(rung.evidence_dir, "evidence-hashes.json"), "utf8"));
}

export function buildChainSummary() {
  return {
    rungs_total: VCA_RUNGS.length,
    tag_commit_pinned: VCA_RUNGS.length,
    evidence_root_pinned: VCA_RUNGS.filter((r) => r.evidence_hashes_available).length,
    deep_per_file_rewalk_available: VCA_RUNGS.filter(
      (r) => r.deep_rewalk_mode === "strict_current_format"
    ).length,
    full_reproduce_available: VCA_RUNGS.filter((r) => r.full_reproduce_available).length,
    index_only: VCA_RUNGS.filter((r) => r.replay_tier === "index_only").length,
  };
}

export function buildTimelineIndex() {
  const rungs = VCA_RUNGS.map((r) => ({
    stage: r.stage,
    tag: r.tag,
    merge_commit: resolveMergeCommit(r.tag),
    headline: r.headline,
    replay_tier: r.replay_tier,
    evidence_dir: r.evidence_dir,
    evidence_root_digest: evidenceRootDigest(r),
    public_key_fingerprint: resolveFingerprint(r),
    full_reproduce_available: r.full_reproduce_available,
    evidence_hashes_available: r.evidence_hashes_available,
    chain_integrity_mode: r.evidence_hashes_available ? "evidence_root_digest" : "tag_commit_only",
    deep_rewalk_mode: r.deep_rewalk_mode,
    reproduce_command: r.reproduce_command,
    index_only_reason: r.index_only_reason,
    replay_surface_reason: r.replay_surface_reason,
  }));
  return {
    schema: "simurgh.vca.public_timeline.v1",
    stage: "3X",
    chain_summary: buildChainSummary(),
    claim_summary: {
      claims_uniform_full_reproduction: false,
      claims_new_containment_capability: false,
      claims_live_model_reexecution: false,
      claims_external_origin_truth: false,
    },
    rungs,
    non_claims: [...NON_CLAIMS],
  };
}
