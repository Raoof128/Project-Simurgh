// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { INTEGRITY_LABELS } from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  allowedKeysByPath,
  covertCapacityBits,
  privacyGate,
} from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  validateDfiCertificate,
  validateJsonTextNoDuplicateKeys,
} from "../../../../tools/simurgh-attestation/stage4h/schema.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function cleanCert() {
  return JSON.parse(
    readFileSync(`${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`, "utf8")
  );
}

test("Q7 auxiliary allowlist includes the top-level certificate keys", () => {
  assert.deepEqual(allowedKeysByPath.certificate, [
    "type",
    "proof_system",
    "claim",
    "scope",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
    "checker_version",
    "summary",
    "derivation",
  ]);
});

test("Q7 positive control accepts a typed-shape clean certificate", () => {
  const result = privacyGate(cleanCert());
  assert.equal(result.ok, true);
  assert.equal(result.code, 0);
  assert.equal(Number.isFinite(result.covert_capacity_bits), true);
});

test("Q7 capacity counts only integrity enum labels", () => {
  const cert = cleanCert();
  const enumFieldCount =
    cert.derivation.derived_node_labels.length + cert.derivation.sink_safety_claims.length;
  assert.equal(covertCapacityBits(cert), enumFieldCount * Math.log2(INTEGRITY_LABELS.length));
});

for (const [name, mutate, reason] of [
  [
    "raw prompt smuggled into a node label",
    (cert) => {
      cert.derivation.derived_node_labels[0].label = "IGNORE PREVIOUS";
    },
    "non_enum_label",
  ],
  [
    "raw output smuggled into summary",
    (cert) => {
      cert.summary.sources_checked = "secret-blob";
    },
    "raw_text_in_summary",
  ],
  [
    "raw text smuggled into node id value",
    (cert) => {
      cert.derivation.derived_node_labels[0].node = "action:ssn=123";
    },
    "raw_text_in_key",
  ],
  [
    "freeform smuggled into premise ref",
    (cert) => {
      cert.derivation.premise_refs.push("premise:leak:not-a-digest");
    },
    "raw_text_in_premise_ref",
  ],
  [
    "arbitrary lattice label",
    (cert) => {
      cert.derivation.sink_safety_claims[0].node_label = "sideways";
    },
    "unknown_label_not_in_lattice_enum",
  ],
  [
    "freeform lattice op",
    (cert) => {
      cert.derivation.lattice_steps[0].op = "combine_and_leak";
    },
    "opaque_or_freeform_field",
  ],
  [
    "raw lattice step node",
    (cert) => {
      cert.derivation.lattice_steps[0].node = "action:ssn=123";
    },
    "raw_text_in_key",
  ],
  [
    "raw lattice input",
    (cert) => {
      cert.derivation.lattice_steps[0].inputs = ["secret-blob"];
    },
    "unknown_label_not_in_lattice_enum",
  ],
  [
    "non-boolean sink safety flag",
    (cert) => {
      cert.derivation.sink_safety_claims[0].safe = "true but leak";
    },
    "opaque_or_freeform_field",
  ],
  [
    "over-length node id",
    (cert) => {
      cert.derivation.derived_node_labels[0].node = `source:${"a".repeat(80)}`;
    },
    "over_length_field",
  ],
]) {
  test(`Q7 rejects ${name} as 27/${reason}`, () => {
    const cert = cleanCert();
    mutate(cert);
    const result = privacyGate(cert);
    assert.equal(result.ok, false);
    assert.equal(result.code, 27);
    assert.equal(result.reason, reason);
  });
}

test("Q7 duplicate-key detector catches same object-scope keys before JSON.parse", () => {
  const raw = `{"summary":{"sources_checked":1,"sources_checked":2}}`;
  assert.deepEqual(validateJsonTextNoDuplicateKeys(raw), {
    ok: false,
    reason: "duplicate_key",
    key: "sources_checked",
  });
});

test("Q7 auxiliary unknown-field flag does not override schema ownership", () => {
  const cert = cleanCert();
  cert.derivation.tool_args = "{raw}";
  const result = privacyGate(cert);
  assert.equal(result.ok, true);
  assert.equal(result.auxiliaryFlags.includes("freeform_field_present"), true);
});

test("schema rejects nested unknown keys as 20/unknown_field before Q7 owns values", () => {
  const cert = cleanCert();
  cert.derivation.lattice_steps[0].leak = "raw";
  const schema = validateDfiCertificate(cert);
  assert.equal(schema.ok, false);
  assert.equal(schema.reason, "unknown_field");
  assert.equal(schema.field, "derivation.lattice_steps[].leak");
});

test("duplicate-key scanner ignores key-like text inside string values", () => {
  const raw = `{"summary":{"note":"not a key: {sources_checked:2}"}}`;
  assert.deepEqual(validateJsonTextNoDuplicateKeys(raw), { ok: true });
});
