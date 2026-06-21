// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure logic for the Stage 3P hash-bound catalogue index and self-proof dispatch.
// No Merkle tree is computed: the catalogue stores each target attestation's
// canonical digest and binds the set by listing those digests.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import {
  CATALOGUE_SCHEMA,
  checkProvenanceBrand,
  checkRankingOverclaim,
  evaluateCoverageClaims,
} from "./crossDefenceLib.mjs";

export function attestationDigest(att) {
  return sha256Hex(canonicalJson(att));
}

export function buildCatalogue({ corpusDigest, matrixShape, targets, excludedTargets }) {
  return {
    type: CATALOGUE_SCHEMA,
    stage: "3P",
    campaign: {
      campaign_id: "stage-3p-cross-defence-containment-attestation",
      catalogue_kind: "non_ranking_attestation_catalogue",
      ordering_metric_exported: false,
      numeric_summary_exported: false,
    },
    corpus: { corpus_digest: corpusDigest, matrix_shape: matrixShape },
    targets: targets.map((t) => ({
      target_id: t.target_id,
      provenance: t.provenance,
      execution_trust: t.execution_trust,
      attestation_digest: attestationDigest(t.attestation),
      attestation_path: `targets/${t.target_id}/containment-attestation.json`,
    })),
    excluded_targets: excludedTargets ?? [],
    catalogue_non_claims: [
      "Attestation catalogue, not leaderboard.",
      "The catalogue binds target attestations by digest.",
      "The catalogue does not rank targets.",
      "The catalogue does not declare a best defence.",
    ],
  };
}

export function checkSilentDrop(catalogue, plannedIds) {
  const listed = new Set((catalogue.targets ?? []).map((t) => t.target_id));
  const excluded = new Set((catalogue.excluded_targets ?? []).map((t) => t.target_id));
  for (const id of plannedIds)
    if (!listed.has(id) && !excluded.has(id)) return "catalogue_silent_drop";
  // an exclusion entry must carry reason_code + reason
  for (const x of catalogue.excluded_targets ?? [])
    if (!x.reason_code || !x.reason) return "catalogue_silent_drop";
  return null;
}

export function verifyCatalogueBinding(catalogue, attestationsById) {
  const errors = [];
  if (catalogue.type !== CATALOGUE_SCHEMA) errors.push("bad catalogue type");
  if (checkRankingOverclaim(catalogue)) errors.push("catalogue ranking overclaim");
  for (const entry of catalogue.targets ?? []) {
    const att = attestationsById[entry.target_id];
    if (!att) {
      errors.push(`missing attestation for ${entry.target_id}`);
      continue;
    }
    if (attestationDigest(att) !== entry.attestation_digest)
      errors.push(`digest mismatch for ${entry.target_id}`);
    const corpusDigest = catalogue.corpus?.corpus_digest;
    if (att.corpus?.corpus_digest !== corpusDigest)
      errors.push(`corpus digest mismatch for ${entry.target_id}`);
    // full matrix-shape equality: total alone can't catch cases_per_cell/evasions tampering
    if (canonicalJson(att.corpus?.matrix_shape) !== canonicalJson(catalogue.corpus?.matrix_shape))
      errors.push(`matrix shape mismatch for ${entry.target_id}`);
  }
  return { ok: errors.length === 0, errors };
}

// Dispatch a crafted self-proof fixture to the gate it is meant to trip and
// report the observed detector. clean-baseline must trip nothing.
export function evaluateSelfProofFixture(fixture) {
  let observed = null;
  if (fixture.kind === "target") {
    observed =
      checkProvenanceBrand(fixture.payload.target, fixture.payload.non_claims) ??
      checkRankingOverclaim(fixture.payload);
  } else if (fixture.kind === "coverage") {
    const r = evaluateCoverageClaims(fixture.payload);
    if (r.claim_conflict.length > 0) observed = "claim_conflict";
    else if (r.full_coverage_violation) observed = "unverified_full_coverage_claim";
  } else if (fixture.kind === "catalogue_silent_drop") {
    observed = checkSilentDrop(fixture.payload.catalogue, fixture.payload.planned_ids);
  }
  return {
    fixture_id: fixture.fixture_id,
    expected_detector: fixture.expected_detector,
    observed_detector: observed,
    passed: observed === fixture.expected_detector,
  };
}
