// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  readPath,
  METRIC_CONTRACT,
  evaluatePooling,
  normaliseSources,
  buildPerFamilyPanels,
  computeLedgerHashBinding,
  STAGE3M_ATTESTATION_FILES,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const SAMPLE_SOURCES = {
  agentdojo_layer2: {
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 10 } },
    utility_preserved_rate: { numerator: 10, denominator: 10 },
  },
  agentdojo_full: {
    agentdojo_native_metrics: { defended: { targeted_asr: { numerator: 0, denominator: 949 } } },
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 97 } },
  },
  adaptive_readiness: {
    agentdojo_native_metrics: { defended: { targeted_asr: { numerator: 0, denominator: 385 } } },
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 97 } },
  },
  fable5_reference_containment: {
    malicious_targeted_asr: 0,
    malicious_total: 150,
    benign_hard_negative_passed: 30,
    benign_total: 30,
  },
  attestation_validity: { verifier_pass: true },
};

test("STAGE3N_FAMILIES is the five frozen families", () => {
  assert.deepEqual(STAGE3N_FAMILIES, [
    "agentdojo_layer2",
    "agentdojo_full",
    "adaptive_readiness",
    "fable5_reference_containment",
    "attestation_validity",
  ]);
  assert.throws(() => STAGE3N_FAMILIES.push("x"));
});

test("STAGE3N_SOURCE_FILES maps every family to a path", () => {
  for (const f of STAGE3N_FAMILIES) {
    assert.equal(typeof STAGE3N_SOURCE_FILES[f], "string");
  }
});

test("readPath reads nested dotted paths and returns undefined on miss", () => {
  const obj = { a: { b: { c: 7 } } };
  assert.equal(readPath(obj, "a.b.c"), 7);
  assert.equal(readPath(obj, "a.b.x"), undefined);
  assert.equal(readPath(obj, "a.z.c"), undefined);
});

test("METRIC_CONTRACT has one entry per family with required keys", () => {
  assert.equal(METRIC_CONTRACT.length, 5);
  for (const e of METRIC_CONTRACT) {
    for (const k of [
      "source_stage",
      "metric_family",
      "denominator_basis",
      "security_denominator",
      "utility_denominator",
      "pooling_group",
      "pooling_allowed_with",
    ]) {
      assert.ok(k in e, `missing ${k}`);
    }
  }
});

test("evaluatePooling refuses all mismatched denominators and pools none", () => {
  const r = evaluatePooling(METRIC_CONTRACT);
  assert.equal(r.cross_family_pooling_performed, 0);
  assert.equal(r.mismatched_denominator_pooling_refusal_test_passed, true);
  assert.ok(r.refusals.length >= 1);
});

test("normaliseSources produces one row per family with correct roles", () => {
  const rows = normaliseSources(SAMPLE_SOURCES);
  assert.equal(rows.length, 5);
  const att = rows.find((r) => r.family === "attestation_validity");
  assert.equal(att.role, "attestation");
  assert.equal(att.attestation_valid, true);
  assert.deepEqual(att.source_files, STAGE3M_ATTESTATION_FILES);
  const full = rows.find((r) => r.family === "agentdojo_full");
  assert.equal(full.role, "held_line");
  assert.equal(full.security.targeted_asr_denominator, 949);
  assert.equal(full.utility.over_defence_numerator, 0);
  assert.equal(full.source_files.length, 1);
});

test("buildPerFamilyPanels yields one panel per family and no pooled total", () => {
  const panels = buildPerFamilyPanels(normaliseSources(SAMPLE_SOURCES));
  assert.equal(panels.length, 5);
  assert.ok(!panels.some((p) => p.family === "pooled" || p.family === "total"));
});

test("computeLedgerHashBinding is true only when every row file has a hash", () => {
  const rows = normaliseSources(SAMPLE_SOURCES);
  const allFiles = {};
  for (const row of rows) for (const f of row.source_files) allFiles[f] = "sha256:abc";
  assert.equal(computeLedgerHashBinding(rows, allFiles), true);
  delete allFiles[STAGE3M_ATTESTATION_FILES[0]];
  assert.equal(computeLedgerHashBinding(rows, allFiles), false);
});
