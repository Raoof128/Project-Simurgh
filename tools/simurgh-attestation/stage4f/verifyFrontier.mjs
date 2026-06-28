// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { canonicalHash } from "./canonical.mjs";
import { buildCellSetManifest, cellId } from "./cells.mjs";
import { FAILURE_REASONS, STAGE4F_VERSIONS } from "./constants.mjs";
import { derivePointMetrics } from "./metrics.mjs";
import { paretoFrontier } from "./frontier.mjs";

const FORBIDDEN_KEYS = new Set([
  "raw_prompt",
  "raw_model_output",
  "secret",
  "api_key",
  "hidden_instruction",
  "private_key",
  "raw_page_text",
  "raw_email_body",
  "private_user_content",
]);

const FORBIDDEN_VALUE_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/,
  /\b(?:api[_-]?key|hidden instruction|raw prompt|raw model output)\b/i,
  /\b(?:raw page text|raw email body|private user content)\b/i,
];

const MAX_FREE_TEXT_LENGTH = 512;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function result({ ok, failed_layer = null, first_failure = null }) {
  return {
    ok,
    exit_code: ok ? 0 : 1,
    verifier_version: STAGE4F_VERSIONS.verifyFrontier,
    failed_layer,
    first_failure,
  };
}

function fail(failed_layer, reason, context = {}) {
  return result({ ok: false, failed_layer, first_failure: { reason, ...context } });
}

export function privacyAuditObject(value) {
  const stack = [{ path: "$", value }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current && typeof current.value === "object") {
      for (const [key, child] of Object.entries(current.value)) {
        const nextPath = `${current.path}.${key}`;
        if (FORBIDDEN_KEYS.has(key)) {
          return { ok: false, reason: FAILURE_REASONS.privacy_leak_detected, path: nextPath };
        }
        stack.push({ path: nextPath, value: child });
      }
    } else if (typeof current.value === "string") {
      if (current.value.length > MAX_FREE_TEXT_LENGTH) {
        return { ok: false, reason: FAILURE_REASONS.privacy_leak_detected, path: current.path };
      }
      if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(current.value))) {
        return { ok: false, reason: FAILURE_REASONS.privacy_leak_detected, path: current.path };
      }
    }
  }
  return { ok: true };
}

function gridHashFromDocument(grid) {
  return canonicalHash({
    grid_version: grid.grid_version,
    points: grid.points,
  });
}

function expectedCells({ suite, grid, suiteHash, gridHash }) {
  return grid.points.flatMap((point) =>
    suite.scenarios.map((scenario) =>
      cellId({
        point_id: point.point_id,
        scenario_id: scenario.scenario_id,
        suite_hash: suiteHash,
        grid_hash: gridHash,
        policy_bundle_hash: canonicalHash(point.policy_bundle),
      })
    )
  );
}

async function readCells({ evidenceDir, suiteById, publicKeyPem }) {
  const cellsDir = join(evidenceDir, "cells");
  const dirs = (await readdir(cellsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const cells = [];
  for (const dir of dirs) {
    const base = join(cellsDir, dir);
    const cell_manifest = await readJson(join(base, "cell-manifest.json"));
    const pack = await readJson(join(base, "evidence-pack.json"));
    const signature = (await readFile(join(base, "evidence-pack.sig"), "utf8")).trim();
    const utility_observation = await readJson(join(base, "utility-observation.json"));
    const packVerify = verifyEvidencePack({ pack, signature, publicKeyPem });
    if (!packVerify.ok) {
      return {
        ok: false,
        failure: fail("pack_verify", FAILURE_REASONS.pack_verify_failed, {
          cell_id: cell_manifest.cell_id,
          point_id: cell_manifest.point_id,
          scenario_id: cell_manifest.scenario_id,
          pack_reason: packVerify.first_failure?.reason,
        }),
      };
    }
    if (cell_manifest.evidence_pack_hash !== canonicalHash(pack)) {
      return {
        ok: false,
        failure: fail("cell_binding", FAILURE_REASONS.cell_binding_mismatch, {
          cell_id: cell_manifest.cell_id,
        }),
      };
    }
    if (cell_manifest.utility_observation_hash !== canonicalHash(utility_observation)) {
      return {
        ok: false,
        failure: fail("cell_binding", FAILURE_REASONS.cell_binding_mismatch, {
          cell_id: cell_manifest.cell_id,
        }),
      };
    }
    cells.push({
      cell_manifest,
      pack,
      signature,
      suite_entry: suiteById.get(cell_manifest.scenario_id),
      utility_observation,
    });
  }
  return { ok: true, cells };
}

export async function verifyFrontier({ evidenceDir, suitePath, gridPath, pubkeyPath, outPath = null }) {
  try {
    const [suite, grid, pubkey] = await Promise.all([
      readJson(suitePath),
      readJson(gridPath),
      readFile(pubkeyPath, "utf8"),
    ]);
    const suiteHash = suite.suite_hash;
    const gHash = gridHashFromDocument(grid);
    const [cellSet, metrics, frontier, certificate, frontierSig] = await Promise.all([
      readJson(join(evidenceDir, "cell-set-manifest.json")),
      readJson(join(evidenceDir, "metrics.json")),
      readJson(join(evidenceDir, "frontier.json")),
      readJson(join(evidenceDir, "frontier-certificate.json")),
      readFile(join(evidenceDir, "frontier.sig"), "utf8"),
    ]);

    if (cellSet.suite_hash !== suiteHash || certificate.suite_hash !== suiteHash) {
      return fail("external_anchors", FAILURE_REASONS.suite_hash_mismatch);
    }
    if (cellSet.grid_hash !== gHash || certificate.grid_hash !== gHash) {
      return fail("external_anchors", FAILURE_REASONS.grid_hash_mismatch);
    }

    const suiteById = new Map(suite.scenarios.map((scenario) => [scenario.scenario_id, scenario]));
    const expected = expectedCells({ suite, grid, suiteHash, gridHash: gHash });
    const read = await readCells({ evidenceDir, suiteById, publicKeyPem: pubkey });
    if (!read.ok) return read.failure;
    const sealed = read.cells.map((cell) => cell.cell_manifest.cell_id);
    const recomputedCellSet = buildCellSetManifest({
      suite_hash: suiteHash,
      grid_hash: gHash,
      expected_cell_ids: expected,
      sealed_cell_ids: sealed,
    });
    if (!recomputedCellSet.ok) {
      const reason =
        recomputedCellSet.missing_cell_ids.length > 0
          ? FAILURE_REASONS.missing_cell
          : recomputedCellSet.extra_cell_ids.length > 0
            ? FAILURE_REASONS.extra_cell
            : FAILURE_REASONS.duplicate_cell;
      return fail("cell_set", reason);
    }
    if (canonicalHash(recomputedCellSet) !== canonicalHash(cellSet)) {
      return fail("cell_set", FAILURE_REASONS.cell_binding_mismatch);
    }

    for (const cell of read.cells) {
      const point = grid.points.find((entry) => entry.point_id === cell.cell_manifest.point_id);
      const recomputedCellId = cellId({
        point_id: cell.cell_manifest.point_id,
        scenario_id: cell.cell_manifest.scenario_id,
        suite_hash: suiteHash,
        grid_hash: gHash,
        policy_bundle_hash: canonicalHash(point.policy_bundle),
      });
      if (recomputedCellId !== cell.cell_manifest.cell_id) {
        return fail("cell_binding", FAILURE_REASONS.cell_binding_mismatch, {
          cell_id: cell.cell_manifest.cell_id,
        });
      }
    }

    const points = grid.points.map((point) =>
      derivePointMetrics(
        point.point_id,
        read.cells.filter((cell) => cell.cell_manifest.point_id === point.point_id)
      )
    );
    const recomputedMetrics = { metrics_version: "simurgh.stage4f.metrics.v1", points };
    if (canonicalHash(recomputedMetrics) !== canonicalHash(metrics)) {
      return fail("metrics", FAILURE_REASONS.metric_digest_mismatch);
    }
    const recomputedFrontier = paretoFrontier(points.map((point) => ({ ...point, verified: true })));
    if (canonicalHash(recomputedFrontier) !== canonicalHash(frontier)) {
      return fail("frontier", FAILURE_REASONS.frontier_hash_mismatch);
    }
    if (
      certificate.cell_set_hash !== canonicalHash(cellSet) ||
      certificate.metrics_hash !== canonicalHash(metrics) ||
      certificate.frontier_hash !== canonicalHash(frontier)
    ) {
      return fail("certificate", FAILURE_REASONS.frontier_hash_mismatch);
    }
    if (frontierSig.trim() !== canonicalHash(certificate)) {
      return fail("certificate", FAILURE_REASONS.frontier_signature_invalid);
    }
    const privacy = privacyAuditObject({ cellSet, metrics, frontier, certificate });
    if (!privacy.ok) {
      return fail("privacy", privacy.reason, { path: privacy.path });
    }
    const ok = result({ ok: true });
    if (outPath) await writeFile(outPath, `${JSON.stringify(ok, null, 2)}\n`);
    return ok;
  } catch (error) {
    return fail("external_anchors", error?.code === "ENOENT" ? "missing_file" : "schema_invalid");
  }
}
