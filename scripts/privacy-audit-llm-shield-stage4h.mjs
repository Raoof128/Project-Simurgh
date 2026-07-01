#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { privacyGate } from "../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import { RAW_VERIFIER_CODES } from "../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  validateDfiCertificate,
  validateJsonTextNoDuplicateKeys,
} from "../tools/simurgh-attestation/stage4h/schema.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function cleanCert() {
  return JSON.parse(
    readFileSync(`${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`, "utf8")
  );
}

function runPrivacy(cert, { schemaOwned = false } = {}) {
  if (!schemaOwned) return privacyGate(cert);
  const schema = validateDfiCertificate(cert);
  if (!schema.ok) {
    return {
      ok: false,
      code: RAW_VERIFIER_CODES.SCHEMA_INVALID,
      reason: schema.reason,
    };
  }
  return privacyGate(cert);
}

const cases = [
  {
    name: "clean",
    expected_code: 0,
    expected_reason: null,
    mutate: (cert) => cert,
  },
  {
    name: "raw-label",
    expected_code: 27,
    expected_reason: "non_enum_label",
    mutate: (cert) => {
      cert.derivation.derived_node_labels[0].label = "raw prompt text";
      return cert;
    },
  },
  {
    name: "raw-summary",
    expected_code: 27,
    expected_reason: "raw_text_in_summary",
    mutate: (cert) => {
      cert.summary.violations = "raw transcript";
      return cert;
    },
  },
  {
    name: "raw-node-id",
    expected_code: 27,
    expected_reason: "raw_text_in_key",
    mutate: (cert) => {
      cert.derivation.derived_node_labels[0].node = "source:raw prompt text with spaces";
      return cert;
    },
  },
  {
    name: "raw-premise-ref",
    expected_code: 27,
    expected_reason: "raw_text_in_premise_ref",
    mutate: (cert) => {
      cert.derivation.premise_refs[0] = "premise:raw prompt";
      return cert;
    },
  },
  {
    name: "non-enum-label",
    expected_code: 27,
    expected_reason: "unknown_label_not_in_lattice_enum",
    mutate: (cert) => {
      cert.derivation.derived_node_labels[0].label = "maybe";
      return cert;
    },
  },
  {
    name: "unknown-field",
    expected_code: 20,
    expected_reason: "unknown_field",
    schemaOwned: true,
    mutate: (cert) => {
      cert.derivation.lattice_steps[0].leak = "raw";
      return cert;
    },
  },
];

const results = cases.map((testCase) => {
  const result = runPrivacy(testCase.mutate(structuredClone(cleanCert())), {
    schemaOwned: testCase.schemaOwned,
  });
  return {
    name: testCase.name,
    expected_code: testCase.expected_code,
    expected_reason: testCase.expected_reason,
    code: result.code,
    reason: result.reason ?? null,
    accepted: result.ok,
  };
});

const duplicate = validateJsonTextNoDuplicateKeys(
  '{"summary":{"sources_checked":1,"sources_checked":2,"note":"not a key: {sources_checked:2}"}}'
);
results.push({
  name: "duplicate-key",
  expected_code: 20,
  expected_reason: "duplicate_key",
  code: duplicate.ok ? 0 : 20,
  reason: duplicate.reason ?? null,
  accepted: duplicate.ok,
});

const failures = results.filter(
  (result) =>
    result.code !== result.expected_code ||
    result.reason !== result.expected_reason ||
    (result.name !== "clean" && result.accepted)
);

if (failures.length > 0) {
  console.error("stage4h q7 privacy audit FAIL:", JSON.stringify({ results, failures }, null, 2));
  process.exit(1);
}

console.log("stage4h q7 privacy audit: PASS");
