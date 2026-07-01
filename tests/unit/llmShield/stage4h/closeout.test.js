// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildProofDeletionClosureFixture } from "../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs";

const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("Stage 4H.5 evidence pack contains final Q3 and closeout files", () => {
  for (const path of [
    `${evidenceRoot}/certificate.json`,
    `${evidenceRoot}/signed-pack-manifest.json`,
    `${evidenceRoot}/verifier-results.json`,
    `${evidenceRoot}/q-gate-results.json`,
    `${evidenceRoot}/tamper-results.json`,
    `${evidenceRoot}/privacy-report.json`,
    `${evidenceRoot}/offline-report.json`,
    `${evidenceRoot}/hermeticity-attestation.json`,
    `${evidenceRoot}/exit-map.json`,
    `${evidenceRoot}/reproduce-summary.json`,
  ]) {
    assert.equal(existsSync(path), true, `${path} exists`);
  }
});

test("Stage 4H.5 Q3 pass is a conjunction, not a single green flag", () => {
  const qGate = readJson(`${evidenceRoot}/q-gate-results.json`);
  assert.equal(qGate.gates.Q3.status, "pass");
  assert.equal(qGate.gates.Q3.clean_run_hits, 0);
  assert.equal(qGate.gates.Q3.egress_double_caught, true);
  assert.equal(qGate.gates.Q3.egress_double_raw_code, 28);
});

test("Stage 4H.5 hermeticity attestation is acyclic and manifest-owned", () => {
  const attestation = readJson(`${evidenceRoot}/hermeticity-attestation.json`);
  const offline = readJson(`${evidenceRoot}/offline-report.json`);
  const manifest = readJson(`${evidenceRoot}/signed-pack-manifest.json`);
  assert.equal("hermeticity_attestation_digest" in attestation, false);
  assert.equal(manifest.hermeticity_attestation_digest, offline.hermeticity_attestation_digest);
});

test("Stage 4H.5 anti-theatre deletion rejects missing proof material", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h-delete-"));
  try {
    const outPath = join(tmp, "deleted-proof-result.json");
    const deleted = buildProofDeletionClosureFixture({ outputDir: tmp });
    const result = spawnSync(process.execPath, [
      "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
      "--base-pack",
      deleted.basePackPath,
      "--base-pack-sig",
      deleted.basePackSigPath,
      "--base-pack-pubkey",
      deleted.basePackPubkeyPath,
      "--certificate",
      deleted.certificatePath,
      "--manifest",
      deleted.manifestPath,
      "--manifest-pubkey",
      deleted.manifestPubkeyPath,
      "--out",
      outPath,
    ]);
    assert.notEqual(result.status, 0);
    const json = readJson(outPath);
    assert.equal([24, 26].includes(json.code), true, `code ${json.code}`);
    assert.notEqual(json.code, 25, "proof deletion must repair earlier bindings");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("Stage 4H.5 reproduce summary uses typed wrapper exit", () => {
  const summary = readJson(`${evidenceRoot}/reproduce-summary.json`);
  assert.equal(summary.raw_code, 0);
  assert.equal(summary.run_level_exit, 0);
  assert.equal(summary.typed_exit_source, "stage4CodeForRawCode");
});
