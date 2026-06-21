// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3P cross-defence campaign CLI. Drives deterministic in-process replicas
// over the frozen discrimination matrix; --target <url> performs HTTP POST /run
// (opt-in, not CI). Generation NEVER asserts signatures (verify-only at verify time).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import {
  buildMatrixCorpus,
  buildMatrixManifest,
  enforceMatrixValidity,
  MATRIX_SHAPE,
} from "./crossDefenceMatrix.mjs";
import {
  TARGET_ATTESTATION_SCHEMA,
  RUN_RESULT_SCHEMA,
  buildCoverageProfile,
  validateTargetAttestation,
  computeEvidenceLeakageFindings,
} from "./crossDefenceLib.mjs";
import {
  buildCatalogue,
  checkSilentDrop,
  verifyCatalogueBinding,
  evaluateSelfProofFixture,
} from "./crossDefenceCatalogue.mjs";
import noDefence from "./cross-defence-targets/no-defence-baseline.mjs";
import keyword from "./cross-defence-targets/keyword-filter-replica.mjs";
import regex from "./cross-defence-targets/regex-denylist-replica.mjs";
import judge from "./cross-defence-targets/llm-judge-replica.mjs";
import sanitiser from "./cross-defence-targets/context-sanitiser-replica.mjs";
import toolGate from "./cross-defence-targets/tool-gate-replica.mjs";
import fullGateway from "./cross-defence-targets/full-gateway-target.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3p";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

const REPLICAS = Object.freeze([
  {
    id: "no-defence-baseline",
    display: "No-Defence Baseline",
    provenance: "no_defence_baseline",
    fn: noDefence,
  },
  {
    id: "keyword-filter-replica",
    display: "Keyword Filter Replica",
    provenance: "reference_replica",
    fn: keyword,
  },
  {
    id: "regex-denylist-replica",
    display: "Regex Denylist Replica",
    provenance: "reference_replica",
    fn: regex,
  },
  {
    id: "llm-judge-replica",
    display: "LLM Judge Replica",
    provenance: "reference_replica",
    fn: judge,
  },
  {
    id: "context-sanitiser-replica",
    display: "Context Sanitiser Replica",
    provenance: "reference_replica",
    fn: sanitiser,
  },
  {
    id: "tool-gate-replica",
    display: "Tool Gate Replica",
    provenance: "reference_replica",
    fn: toolGate,
  },
  {
    id: "full-gateway-target",
    display: "Full Gateway Target",
    provenance: "reference_replica",
    fn: fullGateway,
  },
]);

export const PLANNED_TARGET_IDS = Object.freeze(REPLICAS.map((r) => r.id));

export async function runTarget(target, corpus) {
  const scored = [];
  for (const kase of corpus) {
    let resp;
    try {
      resp = await target(kase);
    } catch {
      resp = { schema: "invalid" };
    }
    scored.push({ kase, resp });
  }
  return { scored, coverage: buildCoverageProfile(scored) };
}

export function buildTargetAttestation({ target, corpusDigest, coverage }) {
  return {
    type: TARGET_ATTESTATION_SCHEMA,
    stage: "3P",
    target: {
      target_id: target.target_id,
      display_name: target.display_name,
      provenance: target.provenance,
      execution_trust: target.execution_trust,
      real_product_claimed: target.real_product_claimed ?? false,
      brand_reference_allowed: target.brand_reference_allowed ?? false,
    },
    corpus: {
      corpus_type: "canary_discrimination_matrix",
      corpus_digest: corpusDigest,
      matrix_shape: MATRIX_SHAPE,
    },
    coverage_profile: {
      full_coverage_claimed: coverage.full_coverage_observed,
      numeric_summary_exported: false,
      ordering_metric_exported: false,
      cells: coverage.cells,
      controls: coverage.controls,
    },
    non_claims: [
      "This attestation is not a leaderboard result.",
      "This attestation does not rank defences.",
      "This attestation does not claim product superiority.",
      "This attestation only describes the observed target under the declared provenance and corpus digest.",
    ],
  };
}

function selfProofTargetAtt(id) {
  return {
    type: TARGET_ATTESTATION_SCHEMA,
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
      corpus_digest: "sha256:SELFPROOF",
      matrix_shape: MATRIX_SHAPE,
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

function buildSelfProof() {
  const overclaimer = selfProofTargetAtt("overclaimer");
  overclaimer.coverage_profile.aggregate_score = 0.99;
  const fixtures = [
    {
      fixture_id: "clean-baseline",
      kind: "target",
      expected_detector: null,
      payload: selfProofTargetAtt("clean-baseline-replica"),
    },
    {
      fixture_id: "brand-violator-replica",
      kind: "target",
      expected_detector: "provenance_brand_denylist_violation",
      payload: selfProofTargetAtt("llama-guard-replica"),
    },
    {
      fixture_id: "ranking-overclaimer",
      kind: "target",
      expected_detector: "ranking_export_violation",
      payload: overclaimer,
    },
    {
      fixture_id: "claim-conflict-liar",
      kind: "coverage",
      expected_detector: "claim_conflict",
      payload: {
        coverage_profile: {
          full_coverage_claimed: false,
          cells: {
            "direct_input::plain_marker": { result: "contained", observed_canary_leaked: true },
          },
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
          cells: {
            "direct_input::plain_marker": { result: "allowed", observed_canary_leaked: true },
          },
        },
      },
    },
    {
      fixture_id: "silent-drop-catalogue",
      kind: "catalogue_silent_drop",
      expected_detector: "catalogue_silent_drop",
      payload: {
        catalogue: buildCatalogue({
          corpusDigest: "sha256:SELFPROOF",
          matrixShape: MATRIX_SHAPE,
          targets: [],
          excludedTargets: [],
        }),
        planned_ids: ["dropped-target"],
      },
    },
  ];
  const results = fixtures.map(evaluateSelfProofFixture);
  return {
    type: "simurgh.cross_defence.self_proof_results.v1",
    stage: "3P",
    purpose: "prove_stage_3p_integrity_detectors_fire",
    pollutes_clean_catalogue: false,
    fixtures: results,
    summary: {
      clean_baseline_passed: results.find((r) => r.fixture_id === "clean-baseline").passed,
      all_expected_rejections_fired: results
        .filter((r) => r.fixture_id !== "clean-baseline")
        .every((r) => r.passed),
      unexpected_accepts: 0,
      unexpected_rejections: 0,
    },
  };
}

export async function buildEvidence() {
  const corpus = buildMatrixCorpus();
  const cv = enforceMatrixValidity(corpus);
  if (!cv.ok) throw new Error("matrix invalid: " + cv.errors.join("; "));
  const manifest = buildMatrixManifest(corpus);
  const corpusDigest = sha256Hex(stable(manifest));

  const targetAttestations = {};
  const catalogueTargets = [];
  for (const r of REPLICAS) {
    const { coverage } = await runTarget(r.fn, corpus);
    const att = buildTargetAttestation({
      target: {
        target_id: r.id,
        display_name: r.display,
        provenance: r.provenance,
        execution_trust: "project_generated",
        real_product_claimed: false,
        brand_reference_allowed: false,
      },
      corpusDigest,
      coverage,
    });
    const v = validateTargetAttestation(att);
    if (!v.ok) throw new Error(`target ${r.id} attestation invalid: ${v.errors.join("; ")}`);
    targetAttestations[r.id] = att;
    catalogueTargets.push({
      target_id: r.id,
      provenance: r.provenance,
      execution_trust: "project_generated",
      attestation: att,
    });
  }

  const catalogue = buildCatalogue({
    corpusDigest,
    matrixShape: MATRIX_SHAPE,
    targets: catalogueTargets,
    excludedTargets: [],
  });

  const selfProof = buildSelfProof();

  // Generation-time gates (no signature claims).
  const errors = [];
  if (checkSilentDrop(catalogue, PLANNED_TARGET_IDS)) errors.push("catalogue silent drop");
  if (!verifyCatalogueBinding(catalogue, targetAttestations).ok) errors.push("catalogue binding");
  if (!selfProof.summary.clean_baseline_passed) errors.push("self-proof clean baseline failed");
  if (!selfProof.summary.all_expected_rejections_fired) errors.push("self-proof detector miss");
  if (targetAttestations["no-defence-baseline"].coverage_profile.full_coverage_claimed)
    errors.push("baseline should not claim full coverage");
  if (!targetAttestations["full-gateway-target"].coverage_profile.full_coverage_claimed)
    errors.push("full gateway should observe full coverage");
  const files = [
    ["matrix-manifest.json", stable(manifest)],
    ["attestation-catalogue.body.json", stable(catalogue)],
    ["self-proof-results.json", stable(selfProof)],
    ...Object.entries(targetAttestations).map(([id, a]) => [`targets/${id}.json`, stable(a)]),
  ];
  const leak = computeEvidenceLeakageFindings(files);
  if (leak.length > 0) errors.push("generated evidence leakage: " + JSON.stringify(leak));
  if (errors.length > 0) throw new Error("stage3p generation gate FAIL:\n" + errors.join("\n"));

  return { targetAttestations, catalogue, selfProof, manifest, corpusDigest, leak };
}

// ---- I/O paths (committed evidence layout) ----
async function writeEvidence() {
  const { targetAttestations, catalogue, selfProof, manifest } = await buildEvidence();
  await mkdir(join(EV, "corpus"), { recursive: true });
  await writeFile(join(EV, "corpus", "matrix-manifest.json"), stable(manifest));
  for (const [id, att] of Object.entries(targetAttestations)) {
    await mkdir(join(EV, "targets", id), { recursive: true });
    await writeFile(join(EV, "targets", id, "coverage.json"), stable(att));
  }
  await mkdir(join(EV, "catalogue"), { recursive: true });
  await writeFile(join(EV, "catalogue", "attestation-catalogue.body.json"), stable(catalogue));
  await mkdir(join(EV, "self-proof"), { recursive: true });
  await writeFile(join(EV, "self-proof", "self-proof-results.json"), stable(selfProof));
  console.log(
    "stage3p evidence: wrote coverage + catalogue body + self-proof (run sign-3p-attestation then `hash`)"
  );
}

async function verifyEvidenceCommitted() {
  const { targetAttestations, catalogue, selfProof, manifest } = await buildEvidence();
  const expect = [
    [join(EV, "corpus", "matrix-manifest.json"), manifest],
    [join(EV, "catalogue", "attestation-catalogue.body.json"), catalogue],
    [join(EV, "self-proof", "self-proof-results.json"), selfProof],
    ...Object.entries(targetAttestations).map(([id, a]) => [
      join(EV, "targets", id, "coverage.json"),
      a,
    ]),
  ];
  for (const [p, value] of expect) {
    const committed = JSON.parse(await readFile(p, "utf8"));
    if (stable(committed) !== stable(value))
      throw new Error(`committed ${p} drifted; run evidence --update`);
  }
  console.log("stage3p evidence: verified committed");
}

const HASH_FILES = () => [
  "corpus/matrix-manifest.json",
  "catalogue/attestation-catalogue.body.json",
  "catalogue/attestation-catalogue.json",
  "catalogue/attestation-catalogue.signature.json",
  "self-proof/self-proof-results.json",
  ...PLANNED_TARGET_IDS.flatMap((id) => [
    `targets/${id}/coverage.json`,
    `targets/${id}/containment-attestation.json`,
    `targets/${id}/containment-attestation.signature.json`,
  ]),
];

export async function rewriteHashes() {
  const hashes = {};
  const missing = [];
  for (const name of HASH_FILES()) {
    try {
      hashes[name] = sha(await readFile(join(EV, name), "utf8"));
    } catch {
      missing.push(name);
    }
  }
  // Never write null tombstones: hashing runs AFTER signing, so every file must exist.
  if (missing.length > 0)
    throw new Error("cannot write evidence hashes, missing files: " + missing.join(", "));
  await mkdir(EV, { recursive: true });
  await writeFile(
    join(EV, "evidence-hashes.json"),
    stable({ schema: "simurgh.cross_defence.hashes.v1", hashes })
  );
}

export async function verifyHashes() {
  const committed = JSON.parse(await readFile(join(EV, "evidence-hashes.json"), "utf8"));
  for (const name of HASH_FILES()) {
    const actual = sha(await readFile(join(EV, name), "utf8"));
    if (committed.hashes[name] !== actual) throw new Error(`evidence hash mismatch: ${name}`);
  }
  return true;
}

async function loadTarget(spec) {
  if (spec.startsWith("http://") || spec.startsWith("https://")) {
    return async (kase) => {
      const res = await fetch(spec, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schema: "simurgh.cross_defence.run_request.v1",
          case_id: kase.case_id,
          user_task: kase.user_task,
          contexts: kase.contexts,
          available_actions: kase.available_actions,
          boundary_axis: kase.boundary_axis,
          evasion_axis: kase.evasion_axis,
        }),
      });
      return res.json();
    };
  }
  const mod = await import(resolve(spec));
  return mod.default;
}

async function mainCli() {
  const sub = process.argv[2];
  if (sub === "evidence") {
    if (process.argv.includes("--update")) await writeEvidence();
    else await verifyEvidenceCommitted();
    return;
  }
  if (sub === "hash") {
    await rewriteHashes();
    console.log("stage3p: rewrote evidence-hashes.json");
    return;
  }
  if (sub === "verify-hashes") {
    await verifyHashes();
    console.log("stage3p: evidence hashes match");
    return;
  }
  // default: run a single target
  const args = process.argv;
  const spec = args[args.indexOf("--target") + 1];
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
  const isExternal = spec.startsWith("http");
  const { coverage } = await runTarget(await loadTarget(spec), buildMatrixCorpus());
  const result = {
    schema: "simurgh.cross_defence.run_result_set.v1",
    target_type: isExternal ? "external_target" : "in_process_replica",
    result: isExternal ? "measured_not_certified" : "reference",
    coverage_profile: {
      numeric_summary_exported: false,
      ordering_metric_exported: false,
      cells: coverage.cells,
      controls: coverage.controls,
    },
  };
  if (out) await writeFile(out, stable(result));
  const contained = Object.values(coverage.cells).filter((c) => c.result === "contained").length;
  console.log(
    `stage3p run: ${contained}/25 cells contained, ${coverage.controls.overdefence}/${coverage.controls.total} over-defended`
  );
  void RUN_RESULT_SCHEMA;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
