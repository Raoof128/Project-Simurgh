import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  VPC_RAW_CODES,
  VPC_PUBLIC_CHECK_ORDER,
  VPC_AUDIT_ONLY_CODES,
  VPC_POLICY_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

// Stage 5I — VPC: Verifiable Panel Coverage. Additive raw codes 316–331.
const EXPECTED = {
  VPC_MALFORMED_BUNDLE: 316,
  VPC_EXTERNAL_CONFIG_INVALID: 317,
  VPC_EMPTY_PANEL: 318,
  VPC_SIGNATURE_OR_ROLE_BINDING_INVALID: 319,
  VPC_PARTITION_COMMITMENT_INVALID: 320,
  VPC_OBJECT_GRAPH_OR_REFERENCE_INVALID: 321,
  VPC_GRANT_EXCEEDS_PARTITION: 322,
  VPC_RECEIPT_EXCEEDS_GRANT: 323,
  VPC_NON_EVALUATION_RECEIPT: 324,
  VPC_UNDER_SEPARATED_PRINCIPAL: 325,
  VPC_SELF_VOUCHED_AFFILIATION: 326,
  VPC_SECTION_LEFT_UNREVIEWED: 327,
  VPC_ADEQUACY_CLAIMED: 328,
  VPC_ATTESTATION_MISMATCH: 329,
  VPC_POLICY_REJECTED: 330,
  INTERNAL_OR_ENV_UNAVAILABLE_VPC: 331,
};

test("VPC_RAW_CODES: exact names→ints, unique, contiguous 316–331", () => {
  for (const [name, code] of Object.entries(EXPECTED)) {
    assert.equal(VPC_RAW_CODES[name], code, `${name} must be ${code}`);
  }
  const ints = Object.values(EXPECTED);
  assert.equal(new Set(ints).size, ints.length, "codes unique");
  assert.deepEqual(
    ints.slice().sort((a, b) => a - b),
    Array.from({ length: 16 }, (_, i) => 316 + i),
    "contiguous 316–331"
  );
});

test("house partition: public 316–328, audit-only [329], policy [330], wrapper 331", () => {
  assert.deepEqual(
    VPC_PUBLIC_CHECK_ORDER,
    Array.from({ length: 13 }, (_, i) => 316 + i)
  );
  assert.deepEqual(VPC_AUDIT_ONLY_CODES, [329]);
  assert.deepEqual(VPC_POLICY_CODES, [330]);
  assert.equal(VPC_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VPC, 331);
});

test("all defined codes 316–331 map to run-level 1 (VSD 315→1 precedent)", () => {
  for (let c = 316; c <= 331; c++) {
    assert.equal(stage4CodeForRawCode(c), 1, `raw ${c} → 1`);
  }
});

test("both exit-map goldens carry 316–331 → 1", () => {
  const goldens = [
    "tests/fixtures/llmShield/stage4h/expected-results/exit-map.json",
    "docs/research/llm-shield/evidence/stage-4h/exit-map.json",
  ];
  for (const rel of goldens) {
    const m = JSON.parse(readFileSync(join(ROOT, rel), "utf8")).run_level_by_raw;
    for (let c = 316; c <= 331; c++) {
      assert.equal(m[String(c)], 1, `${rel}: ${c} → 1`);
    }
  }
});
