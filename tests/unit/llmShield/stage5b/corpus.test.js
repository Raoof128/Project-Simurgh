// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — 46-attack corpus + integrity gate + charter freeze (plan Task 10/10B/10C).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCorpus,
  assertCorpusIntegrity,
  charterFacts,
  residueSlipTable,
} from "../../../../tools/simurgh-attestation/stage5b/node/build-stage5b-corpus.mjs";
import {
  tallies,
  computeAsr,
} from "../../../../tools/simurgh-attestation/stage5b/core/asrCore.mjs";
import {
  VAR_FAMILY_COUNTS,
  VAR_ATTACK_MANIFEST_ROOT,
  VAR_EXPECTED_ATTACK_TOTAL,
} from "../../../../tools/simurgh-attestation/stage5b/constants.mjs";

const findings = buildCorpus();

test("the corpus is 46 attacks driving all six frozen verifiers, integrity-gated", () => {
  assert.equal(findings.length, VAR_EXPECTED_ATTACK_TOTAL);
  assert.equal(assertCorpusIntegrity(findings), true); // re-drive == recorded (exact code)
});

test("every attack trips a REAL non-zero code at its target (8 distinct codes across 4V→5A)", () => {
  const codes = [...new Set(findings.map((f) => f.target_raw))].sort((a, b) => a - b);
  assert.deepEqual(codes, [152, 163, 174, 182, 191, 200, 205, 214]);
  assert.ok(
    findings.every((f) => f.target_raw !== 0),
    "no bypass in this corpus"
  );
});

test("per-family counts equal the frozen charter counts (Task 10B)", () => {
  const t = tallies(findings);
  assert.deepEqual(t.per_family, VAR_FAMILY_COUNTS);
});

test("ASR is an honest 0/46 (every declared attack was survived)", () => {
  assert.equal(computeAsr(findings), "0/46");
});

test("charter manifest root recomputes to the FROZEN constant (Task 10C parity)", () => {
  assert.equal(charterFacts().attack_manifest_root, VAR_ATTACK_MANIFEST_ROOT);
  const sum = Object.values(VAR_FAMILY_COUNTS).reduce((a, b) => a + b, 0);
  assert.equal(sum, VAR_EXPECTED_ATTACK_TOTAL);
});

test("Signed-Floor: residue bypasses reconcile ≤ 4X/4Y signed floors (corroborated)", () => {
  const { floors, reconciliation } = residueSlipTable(findings);
  assert.equal(floors["4x"], 1);
  assert.equal(reconciliation["4x"].status, "corroborated");
  assert.equal(reconciliation["4y"].status, "corroborated");
});
