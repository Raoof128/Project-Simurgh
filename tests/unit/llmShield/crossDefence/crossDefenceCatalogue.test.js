// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  attestationDigest,
  buildCatalogue,
  checkSilentDrop,
  verifyCatalogueBinding,
  evaluateSelfProofFixture,
} from "../../../../tools/simurgh-benchmark/crossDefenceCatalogue.mjs";

function targetAtt(id) {
  return {
    type: "simurgh.cross_defence.target_attestation.v1",
    stage: "3P",
    target: {
      target_id: id,
      display_name: id,
      provenance: "reference_replica",
      execution_trust: "project_generated",
      real_product_claimed: false,
      brand_reference_allowed: false,
    },
    corpus: {
      corpus_type: "canary_discrimination_matrix",
      corpus_digest: "sha256:CORPUS",
      matrix_shape: { total_cases: 180 },
    },
    coverage_profile: {
      full_coverage_claimed: false,
      numeric_summary_exported: false,
      ordering_metric_exported: false,
      cells: {},
    },
    non_claims: ["This attestation does not rank defences."],
  };
}

test("attestationDigest is canonical and stable", () => {
  const a = targetAtt("t1");
  const b = JSON.parse(JSON.stringify(a));
  assert.equal(attestationDigest(a), attestationDigest(b));
  assert.match(attestationDigest(a), /^sha256:/);
});

test("buildCatalogue binds digests and uses boring non-ranking fields", () => {
  const t1 = targetAtt("t1");
  const cat = buildCatalogue({
    corpusDigest: "sha256:CORPUS",
    matrixShape: { total_cases: 180 },
    targets: [
      {
        target_id: "t1",
        provenance: "reference_replica",
        execution_trust: "project_generated",
        attestation: t1,
      },
    ],
    excludedTargets: [],
  });
  assert.equal(cat.type, "simurgh.cross_defence.attestation_catalogue.v1");
  assert.equal(cat.campaign.catalogue_kind, "non_ranking_attestation_catalogue");
  assert.equal(cat.campaign.numeric_summary_exported, false);
  assert.equal(cat.targets[0].attestation_digest, attestationDigest(t1));
});

test("checkSilentDrop fires when a planned target is neither listed nor excluded", () => {
  const cat = buildCatalogue({
    corpusDigest: "sha256:CORPUS",
    matrixShape: { total_cases: 180 },
    targets: [
      {
        target_id: "t1",
        provenance: "reference_replica",
        execution_trust: "project_generated",
        attestation: targetAtt("t1"),
      },
    ],
    excludedTargets: [
      { target_id: "t2", reason_code: "not_executed", reason: "no signed attestation available" },
    ],
  });
  assert.equal(checkSilentDrop(cat, ["t1", "t2"]), null);
  assert.equal(checkSilentDrop(cat, ["t1", "t2", "t3"]), "catalogue_silent_drop");
});

test("verifyCatalogueBinding checks each indexed digest matches its file", () => {
  const t1 = targetAtt("t1");
  const cat = buildCatalogue({
    corpusDigest: "sha256:CORPUS",
    matrixShape: { total_cases: 180 },
    targets: [
      {
        target_id: "t1",
        provenance: "reference_replica",
        execution_trust: "project_generated",
        attestation: t1,
      },
    ],
    excludedTargets: [],
  });
  assert.equal(verifyCatalogueBinding(cat, { t1 }).ok, true);
  const tampered = JSON.parse(JSON.stringify(t1));
  tampered.coverage_profile.full_coverage_claimed = true;
  assert.equal(verifyCatalogueBinding(cat, { t1: tampered }).ok, false);
});

test("verifyCatalogueBinding catches matrix_shape tampering that preserves total", () => {
  const t1 = targetAtt("t1");
  t1.corpus.matrix_shape = { total_cases: 180, cases_per_cell: 6, evasions: 5 };
  const cat = buildCatalogue({
    corpusDigest: "sha256:CORPUS",
    matrixShape: { total_cases: 180, cases_per_cell: 6, evasions: 5 },
    targets: [
      {
        target_id: "t1",
        provenance: "reference_replica",
        execution_trust: "project_generated",
        attestation: t1,
      },
    ],
    excludedTargets: [],
  });
  // tamper evasions while keeping total 180 — must be caught by full-shape equality
  const tampered = JSON.parse(JSON.stringify(t1));
  tampered.corpus.matrix_shape.evasions = 6;
  assert.equal(verifyCatalogueBinding(cat, { t1: tampered }).ok, false);
});

test("evaluateSelfProofFixture dispatches each adversarial fixture to its detector", () => {
  const cases = [
    {
      fixture_id: "clean-baseline",
      kind: "target",
      expected_detector: null,
      payload: targetAtt("clean"),
    },
    {
      fixture_id: "brand-violator-replica",
      kind: "target",
      expected_detector: "provenance_brand_denylist_violation",
      payload: (() => {
        const a = targetAtt("llama-guard-replica");
        a.target.target_id = "llama-guard-replica";
        return a;
      })(),
    },
    {
      fixture_id: "ranking-overclaimer",
      kind: "target",
      expected_detector: "ranking_export_violation",
      payload: (() => {
        const a = targetAtt("ov");
        a.coverage_profile.aggregate_score = 0.99;
        return a;
      })(),
    },
    {
      fixture_id: "claim-conflict-liar",
      kind: "coverage",
      expected_detector: "claim_conflict",
      payload: {
        coverage_profile: {
          full_coverage_claimed: false,
          cells: { "direct_input::plain_marker": { result: "contained", observed_canary_leaked: true } },
        },
      },
    },
    {
      fixture_id: "false-full-coverage-claimer",
      kind: "coverage",
      expected_detector: "unverified_full_coverage_claim",
      payload: {
        coverage_profile: {
          full_coverage_claimed: true,
          cells: { "direct_input::plain_marker": { result: "allowed", observed_canary_leaked: true } },
        },
      },
    },
    {
      fixture_id: "silent-drop-catalogue",
      kind: "catalogue_silent_drop",
      expected_detector: "catalogue_silent_drop",
      payload: {
        catalogue: buildCatalogue({
          corpusDigest: "sha256:C",
          matrixShape: { total_cases: 180 },
          targets: [],
          excludedTargets: [],
        }),
        planned_ids: ["dropped-one"],
      },
    },
  ];
  for (const c of cases) {
    const r = evaluateSelfProofFixture(c);
    assert.equal(r.passed, true, `${c.fixture_id} should pass self-proof`);
    assert.equal(r.observed_detector, c.expected_detector);
  }
});
