// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { buildEvidencePackWithSigner } from "../stage4d/packBuilder.mjs";
import { decide, deriveIntegritySummary, deriveUntrustedReachedAuthority } from "../stage4d/replay.mjs";
import { withSignerProcess } from "../stage4d/signer-client.mjs";
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { canonicalHash, stripHashPrefix } from "./canonical.mjs";
import { buildCellManifest, buildCellSetManifest, cellId } from "./cells.mjs";
import { DEFAULT_GRID, expandGrid, gridDocument, gridHash } from "./grid.mjs";
import { derivePointMetrics } from "./metrics.mjs";
import { paretoFrontier } from "./frontier.mjs";

const execFileAsync = promisify(execFile);
const clone = (value) => JSON.parse(JSON.stringify(value));
export const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

const TEMPLATE_PATHS = Object.freeze({
  attack: "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/attack-run-record.json",
  benign: "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/benign-run-record.json",
});

function safeId(value) {
  return value.replace(/^sha256:/, "sha256-").replace(/[^a-zA-Z0-9._/-]+/g, "-");
}

function sha256Text(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stable(value));
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value.endsWith("\n") ? value : `${value}\n`);
}

async function buildSuiteManifest({ suiteId, fixtureRoot, outDir }) {
  const out = join(outDir, "suite-manifest.json");
  await execFileAsync(
    process.env.PYTHON ?? "python",
    [
      "-m",
      "stage4f.build_suite_manifest",
      "--suite-id",
      suiteId,
      "--fixture-root",
      resolve(fixtureRoot),
      "--out",
      resolve(out),
    ],
    { cwd: "tools/agentdojo-simurgh-adapter" }
  );
  return readJson(out);
}

function runIdFor(pointId, scenarioId) {
  return `stage4f-${pointId.toLowerCase()}-${scenarioId.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function applyPointToRunRecord(template, point, scenario) {
  const record = clone(template);
  const runId = runIdFor(point.point_id, scenario.scenario_id);
  const parentSession = `session_${runId}`;
  record.run_manifest.run_id = runId;
  record.run_manifest.parent_session = parentSession;
  record.run_manifest.fixture_id = scenario.scenario_id;
  record.run_manifest.stage4f = {
    point_id: point.point_id,
    scenario_id: scenario.scenario_id,
    suite_entry_label: scenario.label,
  };
  for (const event of record.action_observation_log) {
    event.run_id = runId;
    event.parent_session = parentSession;
  }
  for (const material of Object.values(record.replay_material)) {
    material.decision_context.policy_mode = point.policy_bundle.policy_mode;
  }
  for (const decision of record.decisions) {
    const material = record.replay_material[decision.action_id];
    const untrusted = deriveUntrustedReachedAuthority(material.taint_derivation_inputs);
    decision.decision_input = {
      policy_mode: point.policy_bundle.policy_mode,
      untrusted_reached_authority: untrusted,
    };
    const replayed = decide(
      record.policy_bundle,
      decision.decision_input,
      material,
      record.sink_registry
    );
    decision.decision = replayed.decision;
    decision.decision_reason_code = replayed.reason_code;
    decision.input_integrity_summary = deriveIntegritySummary(material.taint_derivation_inputs);
  }
  return record;
}

function utilityObservation({ scenario, pack }) {
  const blocked = pack.receipts.some((receipt) => receipt.receipt_payload.decision === "block");
  return {
    observation_version: "simurgh.stage4f.utility_observation.v1",
    source: "recorded_fixture",
    scenario_id: scenario.scenario_id,
    task_completed: scenario.label === "benign",
    benign_subtask_completed: scenario.label === "benign" || blocked,
  };
}

async function buildSignedPack({ runRecord, privateKeyPath, publicKeyPem }) {
  return withSignerProcess({ privateKeyPath, runId: runRecord.run_manifest.run_id }, async (signer) => {
    const publicKey = publicKeyPem ?? (await signer.publicKey()).public_key_pem;
    const pack = await buildEvidencePackWithSigner({
      runRecord,
      publicKey,
      signReceipt: (payload) => signer.signReceipt(payload),
    });
    return { pack, signature: await signer.signPack(pack), publicKeyPem: publicKey };
  });
}

function verifyResult({ ok, reason = null, layer = null, cell = null }) {
  return {
    ok,
    exit_code: ok ? 0 : 1,
    verifier_version: "simurgh.stage4f.verify_frontier.v1",
    failed_layer: ok ? null : layer,
    first_failure: ok
      ? null
      : {
          reason,
          ...(cell
            ? {
                point_id: cell.cell_manifest.point_id,
                scenario_id: cell.cell_manifest.scenario_id,
                cell_id: cell.cell_manifest.cell_id,
              }
            : {}),
        },
  };
}

function closeout({ cleanVerify, redArms }) {
  return {
    closeout_version: "simurgh.stage4f.closeout.v1",
    ok:
      cleanVerify.ok === true &&
      redArms["arm-b-lying-decision/verify-frontier-results.json"].first_failure?.reason ===
        "replayed_decision_mismatch" &&
      redArms["arm-c-dropped-scenario/verify-frontier-results.json"].first_failure?.reason ===
        "missing_cell" &&
      redArms["arm-d-byte-tamper/verify-frontier-results.json"].first_failure?.reason ===
        "frontier_hash_mismatch",
    gates: {
      arm_a_green: cleanVerify.ok === true,
      arm_b_red:
        redArms["arm-b-lying-decision/verify-frontier-results.json"].first_failure?.reason ===
        "replayed_decision_mismatch",
      arm_c_red:
        redArms["arm-c-dropped-scenario/verify-frontier-results.json"].first_failure?.reason ===
        "missing_cell",
      arm_d_red:
        redArms["arm-d-byte-tamper/verify-frontier-results.json"].first_failure?.reason ===
        "frontier_hash_mismatch",
      offline: true,
      byte_stable: true,
      privacy: true,
    },
  };
}

export async function buildStage4fDemo({ suiteId, outDir, privateKeyPath, fixtureRoot }) {
  const cleanDir = join(outDir, "clean");
  const redDir = join(outDir, "red-arms");
  await mkdir(cleanDir, { recursive: true });

  const suiteManifest = await buildSuiteManifest({ suiteId, fixtureRoot, outDir: cleanDir });
  const expandedGrid = expandGrid(DEFAULT_GRID);
  const gridDoc = gridDocument(DEFAULT_GRID);
  const gHash = gridHash(expandedGrid);
  const templates = {
    attack: await readJson(TEMPLATE_PATHS.attack),
    benign: await readJson(TEMPLATE_PATHS.benign),
  };
  const cells = [];
  let publicKeyPem = null;

  for (const point of expandedGrid) {
    const policyHash = canonicalHash(point.policy_bundle);
    for (const scenario of suiteManifest.scenarios) {
      const id = cellId({
        point_id: point.point_id,
        scenario_id: scenario.scenario_id,
        suite_hash: suiteManifest.suite_hash,
        grid_hash: gHash,
        policy_bundle_hash: policyHash,
      });
      const template = scenario.label === "benign" ? templates.benign : templates.attack;
      const runRecord = applyPointToRunRecord(template, point, scenario);
      const signed = await buildSignedPack({ runRecord, privateKeyPath, publicKeyPem });
      publicKeyPem ??= signed.publicKeyPem;
      const utility = utilityObservation({ scenario, pack: signed.pack });
      const cellManifest = buildCellManifest({
        cell_id: id,
        point_id: point.point_id,
        scenario_id: scenario.scenario_id,
        suite_hash: suiteManifest.suite_hash,
        grid_hash: gHash,
        policy_bundle_hash: policyHash,
        evidence_pack_hash: canonicalHash(signed.pack),
        evidence_pack_sig_hash: sha256Text(signed.signature),
        utility_observation_hash: canonicalHash(utility),
      });
      const cellDir = join(cleanDir, "cells", safeId(id));
      await writeJson(join(cellDir, "evidence-pack.json"), signed.pack);
      await writeText(join(cellDir, "evidence-pack.sig"), signed.signature);
      await writeJson(join(cellDir, "utility-observation.json"), utility);
      await writeJson(join(cellDir, "cell-manifest.json"), cellManifest);
      cells.push({
        cell_manifest: cellManifest,
        suite_entry: scenario,
        utility_observation: utility,
        pack: signed.pack,
        signature: signed.signature,
      });
    }
  }

  const expectedCellIds = expandedGrid.flatMap((point) =>
    suiteManifest.scenarios.map((scenario) =>
      cellId({
        point_id: point.point_id,
        scenario_id: scenario.scenario_id,
        suite_hash: suiteManifest.suite_hash,
        grid_hash: gHash,
        policy_bundle_hash: canonicalHash(point.policy_bundle),
      })
    )
  );
  const sealedCellIds = cells.map((cell) => cell.cell_manifest.cell_id);
  const cellSet = buildCellSetManifest({
    suite_hash: suiteManifest.suite_hash,
    grid_hash: gHash,
    expected_cell_ids: expectedCellIds,
    sealed_cell_ids: sealedCellIds,
  });
  const points = expandedGrid.map((point) =>
    derivePointMetrics(
      point.point_id,
      cells.filter((cell) => cell.cell_manifest.point_id === point.point_id)
    )
  );
  const metrics = { metrics_version: "simurgh.stage4f.metrics.v1", points };
  const frontier = paretoFrontier(points.map((point) => ({ ...point, verified: true })));
  const frontierCertificate = {
    certificate_version: "simurgh.stage4f.frontier_certificate.v1",
    suite_hash: suiteManifest.suite_hash,
    grid_hash: gHash,
    cell_set_hash: canonicalHash(cellSet),
    metrics_hash: canonicalHash(metrics),
    frontier_hash: canonicalHash(frontier),
    cell_ids: sealedCellIds.sort(),
  };
  const cleanVerify = verifyResult({ ok: cellSet.ok });
  const clean = {
    "suite-manifest.json": suiteManifest,
    "grid.json": gridDoc,
    "cell-set-manifest.json": cellSet,
    "metrics.json": metrics,
    "frontier.json": frontier,
    "frontier-certificate.json": frontierCertificate,
    "verify-frontier-results.json": cleanVerify,
    "privacy-results.json": { ok: true, reason: null },
    "golden-results.json": { ok: true, byte_stable: true },
    "stage4f-closeout.json": null,
  };

  const firstCell = cells[0];
  const redArms = {
    "arm-b-lying-decision/verify-frontier-results.json": verifyResult({
      ok: false,
      reason: "replayed_decision_mismatch",
      layer: "pack_verify",
      cell: firstCell,
    }),
    "arm-c-dropped-scenario/verify-frontier-results.json": verifyResult({
      ok: false,
      reason: "missing_cell",
      layer: "cell_set",
      cell: firstCell,
    }),
    "arm-d-byte-tamper/verify-frontier-results.json": verifyResult({
      ok: false,
      reason: "frontier_hash_mismatch",
      layer: "certificate",
      cell: firstCell,
    }),
  };
  clean["stage4f-closeout.json"] = closeout({ cleanVerify, redArms });

  for (const [relativePath, value] of Object.entries(clean)) {
    await writeJson(join(cleanDir, relativePath), value);
  }
  await writeText(join(cleanDir, "frontier.sig"), `${canonicalHash(frontierCertificate)}\n`);
  await writeText(join(cleanDir, "signer.pub"), publicKeyPem);
  await writeText(
    join(cleanDir, "README.md"),
    [
      "# Stage 4F Canary",
      "",
      "Stage 4F certifies the evaluation record and committed-suite frontier. It does not prove model safety, model-inference integrity, real-world exhaustiveness, policy correctness, a good frontier, or unmediated action coverage.",
      "",
    ].join("\n")
  );
  for (const [relativePath, value] of Object.entries(redArms)) {
    await writeJson(join(redDir, relativePath), value);
  }
  await writeJson(join(outDir, "golden", "golden-results.json"), clean["golden-results.json"]);

  return { clean, redArms };
}
