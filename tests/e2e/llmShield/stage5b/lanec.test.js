// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — Lane C ceremony validation + torch-out-of-CI boundary (plan Task 2).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  validateCeremony,
  reconcileTensorRoot,
  tensorCommitment,
  tensorCommitmentRoot,
} from "../../../../tools/simurgh-attestation/stage5b/lanec/ceremonyCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const LANEC = join(ROOT, "tools/simurgh-attestation/stage5b/lanec");

const captured = {
  outcome: "captured",
  timestamp: "2026-07-08T00:00:00Z",
  model_id: "meta-llama/Llama-3.2-1B-Instruct",
  revision_digest: "sha256:abc",
  lens_digest: "sha256:def",
  position_rule_id: "all_positions",
  declaration_digest: "sha256:decl",
};

test("validateCeremony accepts a well-formed captured record", () => {
  assert.equal(validateCeremony(captured), null);
});

test("validateCeremony accepts a well-formed capture_failed record", () => {
  const failed = { ...captured, outcome: "capture_failed", reason: "cuda_oom" };
  delete failed.declaration_digest;
  assert.equal(validateCeremony(failed), null);
});

test("validateCeremony rejects non-finite, missing declaration, non-total rule, bad outcome", () => {
  assert.deepEqual(validateCeremony({ ...captured, non_finite: true }), {
    error: "captured_with_non_finite",
  });
  const noDecl = { ...captured };
  delete noDecl.declaration_digest;
  assert.deepEqual(validateCeremony(noDecl), { error: "captured_missing_declaration_digest" });
  assert.deepEqual(validateCeremony({ ...captured, position_rule_id: "last_token" }), {
    error: "position_rule_not_total",
  });
  assert.deepEqual(validateCeremony({ ...captured, outcome: "sorta" }), { error: "bad_outcome" });
});

test("reconcileTensorRoot accepts a matching root and rejects a tampered one", () => {
  const tensors = [
    { key: "act:p0:0:2", salt: "s0", bytes_b64: Buffer.from([1, 2, 3, 4]).toString("base64") },
    { key: "act:p0:1:2", salt: "s1", bytes_b64: Buffer.from([5, 6, 7, 8]).toString("base64") },
  ];
  const root = tensorCommitmentRoot(tensors.map((t) => tensorCommitment(t.salt, t.bytes_b64)));
  assert.equal(reconcileTensorRoot({ tensors, tensor_commitment_root: root }), null);
  assert.deepEqual(reconcileTensorRoot({ tensors, tensor_commitment_root: "sha256:lie" }), {
    error: "tensor_root_mismatch",
  });
});

test("BOUNDARY: torch harness files exist but are absent from CI globs and scripts/check.sh", () => {
  // The offline compute files exist...
  assert.ok(existsSync(join(LANEC, "capture-workspace-readout.py")));
  assert.ok(existsSync(join(LANEC, "run-var-ceremony.py")));
  // ...but scripts/check.sh must never invoke them (torch stays out of CI).
  const check = readFileSync(join(ROOT, "scripts/check.sh"), "utf8");
  assert.ok(!check.includes("capture-workspace-readout"), "check.sh must not run the capture");
  assert.ok(!check.includes("run-var-ceremony"), "check.sh must not run the ceremony");
  // ...and package.json test scripts must not glob the python files (they are .py, node ignores,
  // but assert no explicit reference sneaks in).
  const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
  assert.ok(!pkg.includes("capture-workspace-readout"));
});
