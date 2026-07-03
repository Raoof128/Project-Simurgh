// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stage4CodeForRawCode } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { runEbaCore } from "../../../../tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs";
import { runCcbCore } from "../../../../tools/simurgh-attestation/stage4l/verify-stage4l.mjs";

const T = mkdtempSync(join(tmpdir(), "ccb-e2e-"));
execFileSync(process.execPath, ["tools/simurgh-attestation/stage4l/build-stage4l-fixtures.mjs"], {
  env: { ...process.env, STAGE4L_FIXTURE_OUT: T },
});
const PUB = `${T}/ccb-signer.pub`;
const run = (b) => runCcbCore({ bundleDir: b, pinnedPubkeyPath: PUB });
const editJson = (p, fn) => {
  const j = JSON.parse(readFileSync(p, "utf8"));
  fn(j);
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
};

test("compose-everything: freshly built matrix verifies end-to-end", async () => {
  const matrix = JSON.parse(readFileSync(`${T}/expected-results/cluster-matrix.json`, "utf8"));
  for (const [name, expected] of Object.entries(matrix)) {
    const r = await run(`${T}/bundles/${name}`);
    assert.equal(r.rawCode, expected.raw, `${name}: ${r.reason}`);
  }
});

test("tamper matrix: every artifact file is load-bearing", async () => {
  const MUTATIONS = {
    "events.json": {
      fn: (j) => j.push({ ...j[0], event_id: "ev_smuggled_999" }),
      expect: [22, 29, 40],
    },
    "cluster-assignments.json": {
      fn: (j) => {
        j[0].graph_version_digest = `sha256:${"9".repeat(64)}`;
      },
      expect: [42],
    },
    "cluster-budget-policy.json": {
      fn: (j) => {
        j.window = "2026-08";
      },
      expect: [22, 29],
    },
    "cluster-assignment-ledger.json": {
      fn: (j) => {
        j.entries.reverse();
      },
      expect: [42],
    },
    "cluster-cardinality.json": {
      fn: (j) => {
        j.consumer_count = 999;
      },
      expect: [42],
    },
    "ccb-attestation.json": {
      fn: (j) => {
        j.q9_status = "over_budget";
      },
      expect: [22],
    },
    "ccb-manifest.json": {
      fn: (j) => {
        j.signature = j.signature.slice(0, -4) + "AAA=";
      },
      expect: [25],
    },
  };
  for (const [file, { fn, expect }] of Object.entries(MUTATIONS)) {
    const dir = mkdtempSync(join(tmpdir(), "ccb-mut-"));
    execFileSync("cp", ["-r", `${T}/bundles/clean-under/.`, dir]);
    editJson(`${dir}/${file}`, fn);
    const r = await run(dir);
    assert.ok(expect.includes(r.rawCode), `${file}: got ${r.rawCode} (${r.reason})`);
    assert.notEqual(r.rawCode, 0, file);
  }
});

test("cross-stage: Q8 untouched, src/llmShield untouched, wrapper total", async () => {
  const q8 = await runEbaCore({
    bundleDir: "tests/fixtures/llmShield/stage4k/bundles/under-budget",
    pinnedPubkeyPath: "tests/fixtures/llmShield/stage4k/eba-signer.pub",
  });
  assert.equal(q8.rawCode, 0);
  // Zero-product-change guard. Resolve a real base ref (local branch vs shallow CI checkout may
  // expose different ones); if none is fetched — e.g. a single-branch quality-gate checkout —
  // the git-history invariant is un-checkable here, so skip rather than fail closed. The
  // reproduce script and PR review cover it. Mirrors the repo policy-drift guard convention.
  const base = ["origin/main", "main"].find((ref) => {
    try {
      execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      return true;
    } catch {
      return false;
    }
  });
  if (base) {
    const diff = execFileSync("git", ["diff", `${base}...HEAD`, "--stat", "--", "src/llmShield"], {
      encoding: "utf8",
    });
    assert.equal(diff.trim(), "", `src/llmShield changed vs ${base}`);
  }
  for (const [code, level] of [
    [0, 0],
    [28, 2],
    [29, 3],
    [30, 1],
    [38, 1],
    [40, 1],
    [41, 1],
    [42, 1],
    // Stage 4M VXD codes are now mapped (43-46 -> 1); 39 stays reserved, 47 stays unknown.
    [43, 1],
    [44, 1],
    [45, 1],
    [46, 1],
    [39, 3],
    [47, 3],
  ]) {
    assert.equal(stage4CodeForRawCode(code), level, `code ${code}`);
  }
});

test("export surface lock", async () => {
  const surface = {
    "clusterCommitment.mjs": ["CcbSchemaError", "clusterCommitmentDigest", "validateAssignment"],
    "clusterAssignmentLedger.mjs": [
      "assignmentLedgerDigest",
      "buildAssignmentLedger",
      "cardinalityDigest",
      "checkCompleteness",
      "computeClusterCardinality",
    ],
    "clusterBudgetGate.mjs": ["aggregateClusterExposure", "checkClusterBudgets"],
    "build-stage4l-attestation.mjs": [
      "buildCcbAttestation",
      "buildCcbManifest",
      "ccbAttestationDigest",
      "ccbPolicyDigest",
      "verifyCcbManifest",
    ],
  };
  for (const [file, expected] of Object.entries(surface)) {
    const mod = await import(`../../../../tools/simurgh-attestation/stage4l/${file}`);
    assert.deepEqual(Object.keys(mod).sort(), expected, file);
  }
});
