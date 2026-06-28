// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  evaluateWrongKeyResult,
  requireKeySubstitutionCoverage,
} from "../../../../tools/simurgh-attestation/stage4d-to-4f/keySubstitution.mjs";

async function writeJson(root, rel, value) {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("evaluateWrongKeyResult requires observed verifier failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-wrong-key-"));
  await writeJson(root, "wrong-key.json", {
    ok: false,
    exit_code: 1,
    first_failure: { reason: "external_pubkey_mismatch" },
  });
  const result = await evaluateWrongKeyResult({
    root,
    klass: "stage4d_pack",
    path: "wrong-key.json",
  });
  assert.equal(result.ok, true);
  assert.equal(result.class, "stage4d_pack");
  assert.equal(result.observed_reason, "external_pubkey_mismatch");
});

test("requireKeySubstitutionCoverage fails when a class is missing", () => {
  const result = requireKeySubstitutionCoverage([
    { class: "stage4d_pack", ok: true },
    { class: "stage4e_scenario_pack", ok: true },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "key_substitution_not_tested");
  assert.equal(result.failures[0].class, "stage4f_cell_frontier");
});
